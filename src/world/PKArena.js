import * as BABYLON from '@babylonjs/core';

export class PKArenaGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.group = new BABYLON.TransformNode("pkArenaGroup", this.scene);

    this.colliders = [];
    this.interactables = [];
    this.shadowCasters = [];

    // 自转动画引用 (对应原 main.js 成员变量)
    this.pkCrystalMesh = null;
    this.swordPreview = null;
    this.hammerPreview = null;
    this.bombPreview = null;

    this.buildWorld();
  }

  buildWorld() {
    // 1. 擂台地基 (半径 8.0, 表面在 Y = 0.6)
    const platform = BABYLON.MeshBuilder.CreateCylinder("pkPlatform", {
      diameterTop: 16.0,
      diameterBottom: 16.4,
      height: 0.4,
      tessellation: 32
    }, this.scene);
    platform.position.y = 0.4;
    platform.parent = this.group;
    platform.receiveShadows = true;
    this.shadowCasters.push(platform);

    const platformMat = new BABYLON.StandardMaterial("pkPlatformMat", this.scene);
    platformMat.diffuseColor = BABYLON.Color3.FromHexString("#1b2845");
    platformMat.emissiveColor = BABYLON.Color3.FromHexString("#070b19");
    platformMat.specularColor = new BABYLON.Color3(0, 0, 0);
    platformMat.flatShading = true;
    platform.material = platformMat;

    // 2. 环绕红蓝发光条 (Torus 默认在 XZ 平面)
    const ringMatBlue = new BABYLON.StandardMaterial("ringMatBlue", this.scene);
    ringMatBlue.emissiveColor = BABYLON.Color3.FromHexString("#29b6f6");
    ringMatBlue.disableLighting = true; // 纯发光，不受光照影响

    const ringBlue = BABYLON.MeshBuilder.CreateTorus("ringBlue", {
      diameter: 16.04,
      thickness: 0.1,
      tessellation: 48
    }, this.scene);
    ringBlue.position.y = 0.58;
    ringBlue.parent = this.group;
    ringBlue.material = ringMatBlue;

    const ringMatRed = new BABYLON.StandardMaterial("ringMatRed", this.scene);
    ringMatRed.emissiveColor = BABYLON.Color3.FromHexString("#ef5350");
    ringMatRed.disableLighting = true;

    const ringRed = BABYLON.MeshBuilder.CreateTorus("ringRed", {
      diameter: 16.2,
      thickness: 0.06,
      tessellation: 48
    }, this.scene);
    ringRed.position.y = 0.55;
    ringRed.parent = this.group;
    ringRed.material = ringMatRed;

    // 3. 擂台中心的发光十字星魔法阵纹路
    const lineMat = new BABYLON.StandardMaterial("magicLineMat", this.scene);
    lineMat.emissiveColor = BABYLON.Color3.FromHexString("#00e5ff");
    lineMat.alpha = 0.65;
    lineMat.disableLighting = true;

    const bar1 = BABYLON.MeshBuilder.CreateBox("magicBar1", {
      width: 3.6,
      height: 0.01,
      depth: 0.16
    }, this.scene);
    bar1.position.set(0, 0.605, 0);
    bar1.parent = this.group;
    bar1.material = lineMat;

    const bar2 = BABYLON.MeshBuilder.CreateBox("magicBar2", {
      width: 0.16,
      height: 0.01,
      depth: 3.6
    }, this.scene);
    bar2.position.set(0, 0.605, 0);
    bar2.parent = this.group;
    bar2.material = lineMat;

    const centerRing = BABYLON.MeshBuilder.CreateTorus("magicCenterRing", {
      diameter: 1.2,
      thickness: 0.08,
      tessellation: 24
    }, this.scene);
    centerRing.position.set(0, 0.605, 0);
    centerRing.parent = this.group;
    centerRing.material = lineMat;

    // 4. 外围神殿柱子 (6根，红蓝发光火炬交替)
    const pillarMat = new BABYLON.StandardMaterial("pkPillarMat", this.scene);
    pillarMat.diffuseColor = BABYLON.Color3.FromHexString("#78909c");
    pillarMat.specularColor = new BABYLON.Color3(0, 0, 0);
    pillarMat.flatShading = true;

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const radius = 10.5;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      const pillarGroup = new BABYLON.TransformNode(`pillarGroup_${i}`, this.scene);
      pillarGroup.position.set(px, 0.4, pz);
      pillarGroup.parent = this.group;

      // 柱底座
      const base = BABYLON.MeshBuilder.CreateCylinder("pillarBase", {
        diameterTop: 1.0,
        diameterBottom: 1.2,
        height: 0.4,
        tessellation: 8
      }, this.scene);
      base.position.y = 0.2;
      base.parent = pillarGroup;
      base.material = pillarMat;
      base.receiveShadows = true;
      this.shadowCasters.push(base);

      // 柱身
      const shaft = BABYLON.MeshBuilder.CreateCylinder("pillarShaft", {
        diameterTop: 0.7,
        diameterBottom: 0.7,
        height: 3.8,
        tessellation: 8
      }, this.scene);
      shaft.position.y = 2.1;
      shaft.parent = pillarGroup;
      shaft.material = pillarMat;
      shaft.receiveShadows = true;
      this.shadowCasters.push(shaft);

      // 柱头
      const cap = BABYLON.MeshBuilder.CreateCylinder("pillarCap", {
        diameterTop: 1.0,
        diameterBottom: 0.8,
        height: 0.3,
        tessellation: 8
      }, this.scene);
      cap.position.y = 4.15;
      cap.parent = pillarGroup;
      cap.material = pillarMat;
      this.shadowCasters.push(cap);

      // 顶部发光水晶能量火炬 (八面体)
      const fire = BABYLON.MeshBuilder.CreatePolyhedron("pillarFire", {
        type: 0,
        size: 0.25
      }, this.scene);
      fire.position.y = 4.65;
      fire.parent = pillarGroup;
      
      const fireMat = new BABYLON.StandardMaterial(`fireMat_${i}`, this.scene);
      fireMat.emissiveColor = BABYLON.Color3.FromHexString(i % 2 === 0 ? "#29b6f6" : "#ef5350");
      fireMat.alpha = 0.95;
      fireMat.disableLighting = true;
      fire.material = fireMat;
    }

    // 5. 高空漂浮 3D 云海 (围绕四周)
    const cloudMat = new BABYLON.StandardMaterial("pkCloudMat", this.scene);
    cloudMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    cloudMat.specularColor = new BABYLON.Color3(0, 0, 0);
    cloudMat.flatShading = true;
    cloudMat.alpha = 0.88;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.random() * 0.2;
      const dist = 21.0 + Math.random() * 5.0;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = -2.5 - Math.random() * 2.0;

      const cloudGroup = new BABYLON.TransformNode(`cloudGroup_${i}`, this.scene);
      cloudGroup.position.set(cx, cy, cz);
      cloudGroup.parent = this.group;

      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        const size = 2.5 + Math.random() * 3.5;
        const cloudPart = BABYLON.MeshBuilder.CreateSphere(`cloudPart_${i}_${j}`, {
          diameter: size * 2,
          segments: 6
        }, this.scene);
        cloudPart.position.set(
          (Math.random() - 0.5) * size * 1.6,
          (Math.random() - 0.5) * size * 0.6,
          (Math.random() - 0.5) * size * 1.6
        );
        cloudPart.parent = cloudGroup;
        cloudPart.material = cloudMat;
      }
    }

    // 6. 浮空废墟碎石 (Dodecahedron 十二面体)
    const rockMat = new BABYLON.StandardMaterial("pkRockMat", this.scene);
    rockMat.diffuseColor = BABYLON.Color3.FromHexString("#455a64");
    rockMat.specularColor = new BABYLON.Color3(0, 0, 0);
    rockMat.flatShading = true;

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 9.5 + Math.random() * 4.0;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = 0.2 + Math.random() * 2.2;

      const size = 0.25 + Math.random() * 0.45;
      const rock = BABYLON.MeshBuilder.CreatePolyhedron(`rock_${i}`, {
        type: 1,
        size: size
      }, this.scene);
      rock.position.set(rx, ry, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.parent = this.group;
      rock.material = rockMat;
      this.shadowCasters.push(rock);
    }

    // 7. 发光决斗水晶
    const crystalBase = BABYLON.MeshBuilder.CreateCylinder("crystalBase", {
      diameterTop: 0.6,
      diameterBottom: 0.8,
      height: 0.4,
      tessellation: 8
    }, this.scene);
    crystalBase.position.set(0, 0.8, -5.0);
    crystalBase.parent = this.group;
    crystalBase.material = pillarMat;
    crystalBase.receiveShadows = true;
    this.shadowCasters.push(crystalBase);

    const crystalMat = new BABYLON.StandardMaterial("crystalMat", this.scene);
    crystalMat.emissiveColor = BABYLON.Color3.FromHexString("#00e5ff");
    crystalMat.alpha = 0.88;
    crystalMat.disableLighting = true;

    this.pkCrystalMesh = BABYLON.MeshBuilder.CreatePolyhedron("pkCrystal", {
      type: 0, // 八面体
      size: 0.3
    }, this.scene);
    this.pkCrystalMesh.scaling.set(1.0, 2.0, 1.0);
    this.pkCrystalMesh.position.set(0, 1.45, -5.0);
    this.pkCrystalMesh.parent = this.group;
    this.pkCrystalMesh.material = crystalMat;

    // 8. 三个武器架
    const rackConfigs = [
      { x: -7.5, z: 0, weapon: 'sword' },
      { x: 7.5, z: 0, weapon: 'hammer' },
      { x: 0, z: 6.8, weapon: 'bomb' }
    ];

    const woodMat = new BABYLON.StandardMaterial("rackWoodMat", this.scene);
    woodMat.diffuseColor = BABYLON.Color3.FromHexString("#4e342e");
    woodMat.specularColor = new BABYLON.Color3(0, 0, 0);
    woodMat.flatShading = true;

    const baseMat = new BABYLON.StandardMaterial("rackBaseMat", this.scene);
    baseMat.diffuseColor = BABYLON.Color3.FromHexString("#3e2723");
    baseMat.specularColor = new BABYLON.Color3(0, 0, 0);
    baseMat.flatShading = true;

    rackConfigs.forEach((cfg, idx) => {
      const rackGroup = new BABYLON.TransformNode(`rackGroup_${idx}`, this.scene);
      rackGroup.position.set(cfg.x, 0.6, cfg.z);
      rackGroup.parent = this.group;

      if (cfg.z > 0) {
        rackGroup.rotation.y = Math.PI;
      }

      // 两根支撑柱
      const p1 = BABYLON.MeshBuilder.CreateCylinder("rackPillar1", {
        diameterTop: 0.1,
        diameterBottom: 0.1,
        height: 1.3,
        tessellation: 8
      }, this.scene);
      p1.position.set(0, 0.65, -0.4);
      p1.parent = rackGroup;
      p1.material = woodMat;
      this.shadowCasters.push(p1);

      const p2 = p1.clone("rackPillar2");
      p2.position.z = 0.4;
      p2.parent = rackGroup;
      this.shadowCasters.push(p2);

      // 横梁
      const beam = BABYLON.MeshBuilder.CreateBox("rackBeam", {
        width: 0.06,
        height: 0.06,
        depth: 1.0
      }, this.scene);
      beam.position.set(0, 1.15, 0);
      beam.parent = rackGroup;
      beam.material = woodMat;
      this.shadowCasters.push(beam);

      // 武器架底座
      const base = BABYLON.MeshBuilder.CreateBox("rackBase", {
        width: 0.2,
        height: 0.08,
        depth: 1.1
      }, this.scene);
      base.position.set(0, 0.04, 0);
      base.parent = rackGroup;
      base.material = baseMat;
      base.receiveShadows = true;

      // 浮空武器预览
      let weaponPreview;
      if (cfg.weapon === 'sword') {
        weaponPreview = this.createSword3D();
        this.swordPreview = weaponPreview;
      } else if (cfg.weapon === 'hammer') {
        weaponPreview = this.createHammer3D();
        this.hammerPreview = weaponPreview;
      } else {
        weaponPreview = this.createBomb3D();
        this.bombPreview = weaponPreview;
      }
      weaponPreview.scaling.set(0.65, 0.65, 0.65);
      weaponPreview.position.set(0, 1.45, 0);
      weaponPreview.parent = rackGroup;
    });

    // 9. PK 地图碰撞体与大厅交互点数据
    this.colliders = [
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 8.0 }
    ];

    this.interactables = [
      {
        id: 'pk_crystal',
        name: '决斗匹配',
        x: 0,
        y: 0.6,
        z: -5.0,
        triggerRadius: 1.8
      }
    ];
  }

  createSword3D() {
    return createSword3D(this.scene, this.shadowCasters);
  }

  createHammer3D() {
    return createHammer3D(this.scene, this.shadowCasters);
  }

  createBomb3D() {
    return createBomb3D(this.scene, this.shadowCasters);
  }

  // 每帧由 main.js 调用更新武器和水晶自转
  update(time) {
    if (this.pkCrystalMesh) {
      this.pkCrystalMesh.rotation.y = time * 0.001;
      this.pkCrystalMesh.position.y = 1.45 + Math.sin(time * 0.003) * 0.08;
    }
    if (this.swordPreview) {
      this.swordPreview.rotation.y = time * 0.0012;
      this.swordPreview.position.y = 1.45 + Math.sin(time * 0.0025) * 0.05;
    }
    if (this.hammerPreview) {
      this.hammerPreview.rotation.y = time * 0.0008;
      this.hammerPreview.position.y = 1.45 + Math.sin(time * 0.002) * 0.05;
    }
    if (this.bombPreview) {
      this.bombPreview.rotation.y = time * 0.0015;
      this.bombPreview.position.y = 1.45 + Math.sin(time * 0.0035) * 0.05;
    }
  }

  getShadowCasters() {
    return this.shadowCasters;
  }
}

export function createSword3D(scene, shadowCasters = []) {
  const sword = new BABYLON.TransformNode("sword", scene);

  const hilt = BABYLON.MeshBuilder.CreateCylinder("hilt", {
    diameterTop: 0.04,
    diameterBottom: 0.04,
    height: 0.18,
    tessellation: 6
  }, scene);
  hilt.position.y = -0.2;
  hilt.parent = sword;
  shadowCasters.push(hilt);

  const hiltMat = new BABYLON.StandardMaterial("hiltMat", scene);
  hiltMat.diffuseColor = BABYLON.Color3.FromHexString("#3e2723");
  hiltMat.specularColor = new BABYLON.Color3(0, 0, 0);
  hilt.material = hiltMat;

  const guard = BABYLON.MeshBuilder.CreateBox("guard", {
    width: 0.14,
    height: 0.04,
    depth: 0.04
  }, scene);
  guard.position.y = -0.1;
  guard.parent = sword;
  shadowCasters.push(guard);

  const guardMat = new BABYLON.StandardMaterial("guardMat", scene);
  guardMat.diffuseColor = BABYLON.Color3.FromHexString("#ffb300");
  guardMat.specularColor = new BABYLON.Color3(0, 0, 0);
  guard.material = guardMat;

  const blade = BABYLON.MeshBuilder.CreateBox("blade", {
    width: 0.06,
    height: 0.55,
    depth: 0.018
  }, scene);
  blade.position.y = 0.22;
  blade.parent = sword;
  shadowCasters.push(blade);

  const bladeMat = new BABYLON.StandardMaterial("bladeMat", scene);
  bladeMat.diffuseColor = BABYLON.Color3.FromHexString("#cfd8dc");
  bladeMat.emissiveColor = BABYLON.Color3.FromHexString("#111111");
  bladeMat.specularColor = new BABYLON.Color3(0, 0, 0);
  bladeMat.flatShading = true;
  blade.material = bladeMat;

  // 剑尖 (四面椎体)
  const tip = BABYLON.MeshBuilder.CreateCylinder("tip", {
    diameterTop: 0,
    diameterBottom: 0.084,
    height: 0.08,
    tessellation: 4
  }, scene);
  tip.position.y = 0.525;
  tip.rotation.y = Math.PI / 4;
  tip.parent = sword;
  tip.material = bladeMat;
  shadowCasters.push(tip);

  return sword;
}

export function createHammer3D(scene, shadowCasters = []) {
  const hammer = new BABYLON.TransformNode("hammer", scene);

  const handle = BABYLON.MeshBuilder.CreateCylinder("handle", {
    diameterTop: 0.04,
    diameterBottom: 0.04,
    height: 0.8,
    tessellation: 6
  }, scene);
  handle.position.y = -0.1;
  handle.parent = hammer;
  shadowCasters.push(handle);

  const handleMat = new BABYLON.StandardMaterial("handleMat", scene);
  handleMat.diffuseColor = BABYLON.Color3.FromHexString("#212121");
  handleMat.specularColor = new BABYLON.Color3(0, 0, 0);
  handle.material = handleMat;

  const head = BABYLON.MeshBuilder.CreateBox("head", {
    width: 0.24,
    height: 0.32,
    depth: 0.24
  }, scene);
  head.position.y = 0.38;
  head.parent = hammer;
  shadowCasters.push(head);

  const headMat = new BABYLON.StandardMaterial("headMat", scene);
  headMat.diffuseColor = BABYLON.Color3.FromHexString("#455a64");
  headMat.specularColor = new BABYLON.Color3(0, 0, 0);
  headMat.flatShading = true;
  head.material = headMat;

  const band = BABYLON.MeshBuilder.CreateBox("band", {
    width: 0.25,
    height: 0.06,
    depth: 0.25
  }, scene);
  band.position.y = 0.38;
  band.parent = hammer;
  
  const bandMat = new BABYLON.StandardMaterial("bandMat", scene);
  bandMat.diffuseColor = BABYLON.Color3.FromHexString("#ffb300");
  bandMat.specularColor = new BABYLON.Color3(0, 0, 0);
  band.material = bandMat;

  return hammer;
}

export function createBomb3D(scene, shadowCasters = []) {
  const bomb = new BABYLON.TransformNode("bomb", scene);

  const body = BABYLON.MeshBuilder.CreateSphere("body", {
    diameter: 0.36,
    segments: 10
  }, scene);
  body.position.y = 0.1;
  body.parent = bomb;
  shadowCasters.push(body);

  const bodyMat = new BABYLON.StandardMaterial("bodyMat", scene);
  bodyMat.diffuseColor = BABYLON.Color3.FromHexString("#263238");
  bodyMat.specularColor = new BABYLON.Color3(0, 0, 0);
  bodyMat.flatShading = true;
  body.material = bodyMat;

  const cap = BABYLON.MeshBuilder.CreateCylinder("cap", {
    diameterTop: 0.08,
    diameterBottom: 0.1,
    height: 0.06,
    tessellation: 8
  }, scene);
  cap.position.y = 0.28;
  cap.parent = bomb;
  shadowCasters.push(cap);

  const capMat = new BABYLON.StandardMaterial("capMat", scene);
  capMat.diffuseColor = BABYLON.Color3.FromHexString("#546e7a");
  capMat.specularColor = new BABYLON.Color3(0, 0, 0);
  cap.material = capMat;

  const fuse = BABYLON.MeshBuilder.CreateCylinder("fuse", {
    diameterTop: 0.016,
    diameterBottom: 0.016,
    height: 0.1,
    tessellation: 4
  }, scene);
  fuse.position.set(0.02, 0.35, 0);
  fuse.rotation.z = -0.3;
  fuse.parent = bomb;

  const fuseMat = new BABYLON.StandardMaterial("fuseMat", scene);
  fuseMat.diffuseColor = BABYLON.Color3.FromHexString("#ffd54f");
  fuseMat.specularColor = new BABYLON.Color3(0, 0, 0);
  fuse.material = fuseMat;

  const spark = BABYLON.MeshBuilder.CreateSphere("spark", {
    diameter: 0.05,
    segments: 4
  }, scene);
  spark.position.set(0.05, 0.4, 0);
  spark.parent = bomb;

  const sparkMat = new BABYLON.StandardMaterial("sparkMat", scene);
  sparkMat.emissiveColor = BABYLON.Color3.FromHexString("#ff3d00");
  sparkMat.disableLighting = true;
  spark.material = sparkMat;

  return bomb;
}
