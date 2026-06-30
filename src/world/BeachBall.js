import * as BABYLON from '@babylonjs/core';

function convertColor(hexVal) {
  if (typeof hexVal === 'number') {
    const hexStr = "#" + hexVal.toString(16).padStart(6, '0');
    return BABYLON.Color3.FromHexString(hexStr);
  }
  if (typeof hexVal === 'string') {
    if (!hexVal.startsWith('#')) return BABYLON.Color3.FromHexString('#' + hexVal);
    return BABYLON.Color3.FromHexString(hexVal);
  }
  return new BABYLON.Color3(1, 1, 1);
}

export class BeachBall {
  constructor(scene, x, y, z, colorHex) {
    this.scene = scene;
    this.radius = 0.36; // 沙滩球半径

    // 物理状态
    this.position = new BABYLON.Vector3(x, y, z);
    this.velocity = new BABYLON.Vector3(
      (Math.random() - 0.5) * 1.5, // 随机水平初速
      3.2,                          // 初始弹跳高度
      (Math.random() - 0.5) * 1.5
    );
    this.gravity = 15.0;
    this.friction = 0.985;        // 滚动阻力
    this.bounceElasticity = 0.65; // 弹力系数
    this.isGrounded = false;
    this.throwNoCollideTimer = 0; // 防止抛出瞬间被玩家踢飞的冷却时间
    this.app = null; // 由外部挂载 App 实例

    this.initMesh(colorHex);
  }

  initMesh(colorHex) {
    this.group = new BABYLON.TransformNode("beachBallGroup", this.scene);
    this.group.position.copyFrom(this.position);

    // 材质
    const mainMat = new BABYLON.StandardMaterial("ballMainMat", this.scene);
    mainMat.diffuseColor = convertColor(colorHex);
    mainMat.specularColor = new BABYLON.Color3(0, 0, 0);
    mainMat.flatShading = true;

    // 球体网格
    this.ballMesh = BABYLON.MeshBuilder.CreateSphere("ballMesh", { diameter: this.radius * 2, segments: 12 }, this.scene);
    this.ballMesh.parent = this.group;
    this.ballMesh.material = mainMat;

    // 滚条装饰（用于观察滚动效果）
    const stripeMat = new BABYLON.StandardMaterial("ballStripeMat", this.scene);
    stripeMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    stripeMat.specularColor = new BABYLON.Color3(0, 0, 0);
    stripeMat.flatShading = true;

    // 纵向色条
    const stripeL = BABYLON.MeshBuilder.CreateCylinder("stripeL", {
      diameterTop: (this.radius + 0.005) * 2,
      diameterBottom: (this.radius + 0.005) * 2,
      height: this.radius * 0.25,
      tessellation: 12
    }, this.scene);
    stripeL.rotation.x = Math.PI / 2;
    stripeL.parent = this.group;
    stripeL.material = stripeMat;

    // 横向色条
    const stripeR = BABYLON.MeshBuilder.CreateCylinder("stripeR", {
      diameterTop: (this.radius + 0.004) * 2,
      diameterBottom: (this.radius + 0.004) * 2,
      height: this.radius * 0.25,
      tessellation: 12
    }, this.scene);
    stripeR.rotation.z = Math.PI / 2;
    stripeR.parent = this.group;
    stripeR.material = stripeMat;
  }

  update(delta, player) {
    if (this.throwNoCollideTimer > 0) {
      this.throwNoCollideTimer -= delta;
    }

    if (this.isCarried) {
      // 抱着球时，将球绑定在玩家胸前 (前方向 0.65m，高度 +0.65m)
      const playerForward = player.group.forward;
      this.position.copyFrom(player.position).addInPlace(playerForward.scale(0.65));
      this.position.y += 0.65;
      
      this.velocity.set(0, 0, 0);
      this.isGrounded = false;
      this.group.position.copyFrom(this.position);
      return;
    }

    // 1. 在空中时应用重力
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // 应用水平滚动阻力
    this.velocity.x *= Math.pow(this.friction, delta * 60);
    this.velocity.z *= Math.pow(this.friction, delta * 60);

    // 位移更新
    this.position.addInPlace(this.velocity.scale(delta));

    // 2. 地板碰撞判定 (小木屋地板为 0.12，大厅及其他岛屿为 0.6)
    const floorY = (this.app && this.app.currentMap === 'house') ? 0.12 : 0.6;
    if (this.position.y - this.radius <= floorY) {
      this.position.y = floorY + this.radius;

      // 如果下坠速度足够，则反弹
      if (this.velocity.y < -1.5) {
        this.velocity.y = -this.velocity.y * this.bounceElasticity;
      } else {
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // 3. 边界碰撞 (小木屋是 11.8 的正方形墙面，大厅是半径 21.8 的圆形海滩边界)
    if (this.app && this.app.currentMap === 'house') {
      const limit = 11.8 - this.radius;
      // X 轴墙面判定
      if (this.position.x < -limit) {
        this.position.x = -limit;
        this.velocity.x = -this.velocity.x * this.bounceElasticity;
        this.playKickSound();
      } else if (this.position.x > limit) {
        this.position.x = limit;
        this.velocity.x = -this.velocity.x * this.bounceElasticity;
        this.playKickSound();
      }
      // Z 轴墙面判定
      if (this.position.z < -limit) {
        this.position.z = -limit;
        this.velocity.z = -this.velocity.z * this.bounceElasticity;
        this.playKickSound();
      } else if (this.position.z > limit) {
        this.position.z = limit;
        this.velocity.z = -this.velocity.z * this.bounceElasticity;
        this.playKickSound();
      }
    } else {
      // 圆形岛屿反弹
      const maxRadius = 21.5;
      const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);

      if (distFromCenter + this.radius > maxRadius) {
        const nx = this.position.x / distFromCenter;
        const nz = this.position.z / distFromCenter;

        // 反射水平行进方向
        const dot = this.velocity.x * nx + this.velocity.z * nz;
        if (dot > 0) {
          this.velocity.x -= 2 * dot * nx;
          this.velocity.z -= 2 * dot * nz;
          this.velocity.x *= 0.68;
          this.velocity.z *= 0.68;
        }

        this.position.x = nx * (maxRadius - this.radius);
        this.position.z = nz * (maxRadius - this.radius);
      }
    }

    // 4. 与玩家接触时触发踢球
    if (this.throwNoCollideTimer <= 0) {
      const dx = this.position.x - player.position.x;
      const dz = this.position.z - player.position.z;
      const dist2D = Math.sqrt(dx * dx + dz * dz);
      const kickDistance = (player.radius || 0.6) + this.radius - 0.05;

      // 判定 2D 重叠以及高度在脚踢感应区间内
      if (dist2D < kickDistance && Math.abs(this.position.y - player.position.y) < 1.3) {
        const angle = Math.atan2(dx, dz);
        const kickDir = new BABYLON.Vector3(Math.sin(angle), 0, Math.cos(angle));

        // 推出重叠区，防止粘滞
        const overlap = kickDistance - dist2D;
        this.position.x += kickDir.x * overlap;
        this.position.z += kickDir.z * overlap;

        // 获取玩家当前物理速度并赋予球体受力速度
        const playerSpeed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
        const baseForce = 4.8;
        const speedBonus = playerSpeed * 1.3;
        const totalForce = baseForce + speedBonus;

        this.velocity.x = kickDir.x * totalForce;
        this.velocity.z = kickDir.z * totalForce;
        this.velocity.y = 2.4 + speedBonus * 0.45;
        this.isGrounded = false;

        this.playKickSound();
      }
    }

    // 5. 滚动的动画旋转效果
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (speed > 0.08) {
      const rx = -this.velocity.z / speed;
      const rz = this.velocity.x / speed;
      const rollAngle = (speed / this.radius) * delta;

      // 在世界坐标空间下旋转球体内部 Mesh，展现逼真滚动
      this.ballMesh.rotate(new BABYLON.Vector3(rx, 0, rz), rollAngle, BABYLON.Space.WORLD);
    }

    // 同步节点位置
    this.group.position.copyFrom(this.position);
  }

  playKickSound() {
    window.dispatchEvent(new CustomEvent('kick-sound', {
      detail: { freq: 140 + Math.random() * 60 }
    }));
  }

  destroy() {
    this.group.dispose();
  }

  // 实体生命周期合同别名（Task 5.5）：统一 dispose() 释放入口。
  dispose() {
    this.destroy();
  }
}
