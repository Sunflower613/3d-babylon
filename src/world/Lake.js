import * as BABYLON from '@babylonjs/core';

export class LakeGenerator {
  constructor(scene, themeConfig, app) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.app = app; // GameApp 引用，用于播放音效和共享状态
    
    this.group = new BABYLON.TransformNode("lakeGroup", this.scene);
    this.colliders = [];
    this.interactables = [];
    this.shadowCasters = [];

    // 动态模拟列表
    this.bowlsList = [];
    this.ripplesList = [];
    this.noteParticles = [];
    
    this.lastWaterStepTime = 0;

    this.buildWorld();
  }

  buildWorld() {
    this.colliders = [
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 12.0 }
    ];

    this.interactables = [
      {
        id: 'piano',
        name: '弹奏钢琴',
        x: 0,
        y: 0.6,
        z: -7.0,
        triggerRadius: 1.6
      },
      {
        id: 'lake_seat_1',
        name: '坐下静赏',
        x: 7.5,
        y: 0.6,
        z: 0,
        triggerRadius: 1.5
      },
      {
        id: 'lake_seat_2',
        name: '坐下静赏',
        x: -7.5,
        y: 0.6,
        z: 0,
        triggerRadius: 1.5
      },
      {
        id: 'exit_house', // 返回大厅交互 ID
        name: '返回海岛大厅',
        x: 0,
        y: 0.6,
        z: 8.5,
        triggerRadius: 1.5
      }
    ];

    // 1. 浮空大岛基座 (半径 12.0，高度 1.2)
    const island = BABYLON.MeshBuilder.CreateCylinder("lakeIsland", {
      diameterTop: 24.0,
      diameterBottom: 25.0,
      height: 1.2,
      tessellation: 32
    }, this.scene);
    island.position.y = 0.0;
    island.parent = this.group;
    island.receiveShadows = true;
    this.shadowCasters.push(island);

    const islandMat = new BABYLON.StandardMaterial("lakeIslandMat", this.scene);
    islandMat.diffuseColor = BABYLON.Color3.FromHexString("#efeff4");
    islandMat.specularColor = new BABYLON.Color3(0, 0, 0);
    islandMat.flatShading = true;
    island.material = islandMat;

    // 2. 泥土与底部基座 (深灰泥土色)
    const dirt = BABYLON.MeshBuilder.CreateCylinder("lakeDirt", {
      diameterTop: 25.0,
      diameterBottom: 23.6,
      height: 1.8,
      tessellation: 32
    }, this.scene);
    dirt.position.y = -1.5;
    dirt.parent = this.group;

    const dirtMat = new BABYLON.StandardMaterial("lakeDirtMat", this.scene);
    dirtMat.diffuseColor = BABYLON.Color3.FromHexString("#455a64");
    dirtMat.specularColor = new BABYLON.Color3(0, 0, 0);
    dirtMat.flatShading = true;
    dirt.material = dirtMat;

    // 3. 极简禅意水池 - 池底与水面 (Radius 6.0)
    // 池底
    const poolBottom = BABYLON.MeshBuilder.CreateDisc("poolBottom", {
      radius: 6.0,
      tessellation: 32
    }, this.scene);
    poolBottom.rotation.x = Math.PI / 2;
    poolBottom.position.y = 0.602;
    poolBottom.parent = this.group;

    const poolBottomMat = new BABYLON.StandardMaterial("poolBottomMat", this.scene);
    poolBottomMat.diffuseColor = BABYLON.Color3.FromHexString("#00acc1");
    poolBottomMat.specularColor = new BABYLON.Color3(0, 0, 0);
    poolBottomMat.disableLighting = true;
    poolBottomMat.emissiveColor = poolBottomMat.diffuseColor;
    poolBottom.material = poolBottomMat;

    // 水面
    const water = BABYLON.MeshBuilder.CreateDisc("waterSurface", {
      radius: 6.0,
      tessellation: 32
    }, this.scene);
    water.rotation.x = Math.PI / 2;
    water.position.y = 0.61;
    water.parent = this.group;

    const waterMat = new BABYLON.StandardMaterial("waterSurfaceMat", this.scene);
    waterMat.diffuseColor = BABYLON.Color3.FromHexString("#4fc3f7");
    waterMat.specularColor = new BABYLON.Color3(0, 0, 0);
    waterMat.alpha = 0.55;
    waterMat.disableLighting = true;
    waterMat.emissiveColor = waterMat.diffuseColor;
    waterMat.backFaceCulling = false;
    water.material = waterMat;

    // 4. 池塘堤岸石围边框 (24块围墙石)
    const borderMat = new BABYLON.StandardMaterial("lakeBorderMat", this.scene);
    borderMat.diffuseColor = BABYLON.Color3.FromHexString("#e0e0e0");
    borderMat.specularColor = new BABYLON.Color3(0, 0, 0);
    borderMat.flatShading = true;

    const stoneCount = 24;
    const borderRadius = 6.1;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i * Math.PI * 2) / stoneCount;
      const sx = Math.cos(angle) * borderRadius;
      const sz = Math.sin(angle) * borderRadius;

      const stone = BABYLON.MeshBuilder.CreateBox(`borderStone_${i}`, {
        width: 1.6,
        height: 0.22,
        depth: 0.4
      }, this.scene);
      stone.position.set(sx, 0.65, sz);
      stone.rotation.y = -angle + Math.PI / 2;
      stone.parent = this.group;
      stone.material = borderMat;
      stone.receiveShadows = true;
      this.shadowCasters.push(stone);
    }

    // 5. 漂浮的 6 个白瓷碗 (Cylinder 无盖，外宽内窄)
    const bowlMat = new BABYLON.StandardMaterial("bowlMat", this.scene);
    bowlMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    bowlMat.emissiveColor = BABYLON.Color3.FromHexString("#111111");
    bowlMat.specularColor = new BABYLON.Color3(0, 0, 0);
    bowlMat.flatShading = true;
    bowlMat.backFaceCulling = false; // 碗内外都可见

    for (let i = 0; i < 6; i++) {
      const bowlGroup = new BABYLON.TransformNode(`bowlGroup_${i}`, this.scene);
      
      const angle = (i * Math.PI * 2) / 6 + (Math.random() - 0.5) * 0.5;
      const radius = 2.0 + Math.random() * 2.8;
      const bx = Math.cos(angle) * radius;
      const bz = Math.sin(angle) * radius;
      
      bowlGroup.position.set(bx, 0.61, bz);
      bowlGroup.parent = this.group;

      // 碗壁 Mesh (设置 openEnded 为 true 类似无盖圆柱)
      const bowlWall = BABYLON.MeshBuilder.CreateCylinder(`bowlWall_${i}`, {
        diameterTop: 0.84,
        diameterBottom: 0.56,
        height: 0.22,
        tessellation: 12,
        openEnded: true
      }, this.scene);
      bowlWall.parent = bowlGroup;
      bowlWall.material = bowlMat;
      this.shadowCasters.push(bowlWall);

      // 碗底 Mesh
      const bowlBottom = BABYLON.MeshBuilder.CreateCylinder(`bowlBottom_${i}`, {
        diameterTop: 0.56,
        diameterBottom: 0.56,
        height: 0.02,
        tessellation: 12
      }, this.scene);
      bowlBottom.position.y = -0.1;
      bowlBottom.parent = bowlGroup;
      bowlBottom.material = bowlMat;
      this.shadowCasters.push(bowlBottom);

      this.bowlsList.push({
        group: bowlGroup,
        position: bowlGroup.position,
        rotation: bowlGroup.rotation,
        velocity: new BABYLON.Vector3(
          (Math.random() - 0.5) * 0.35,
          0,
          (Math.random() - 0.5) * 0.35
        ),
        phase: Math.random() * Math.PI * 2
      });
    }

    // 6. 湖畔的立式 3D 钢琴 (放置在 x = 0, z = -8.0 处)
    const pianoGroup = new BABYLON.TransformNode("pianoGroup", this.scene);
    pianoGroup.position.set(0, 0.6, -8.0);
    pianoGroup.parent = this.group;

    const blackWood = new BABYLON.StandardMaterial("pianoBlackWood", this.scene);
    blackWood.diffuseColor = BABYLON.Color3.FromHexString("#1a1a1a");
    blackWood.specularColor = new BABYLON.Color3(0, 0, 0);
    blackWood.flatShading = true;

    const whiteIvory = new BABYLON.StandardMaterial("pianoWhiteIvory", this.scene);
    whiteIvory.diffuseColor = BABYLON.Color3.FromHexString("#fafafa");
    whiteIvory.specularColor = new BABYLON.Color3(0, 0, 0);
    whiteIvory.flatShading = true;

    // 钢琴琴身
    const pianoBody = BABYLON.MeshBuilder.CreateBox("pianoBody", {
      width: 1.6,
      height: 0.82,
      depth: 0.65
    }, this.scene);
    pianoBody.position.y = 0.41;
    pianoBody.parent = pianoGroup;
    pianoBody.material = blackWood;
    pianoBody.receiveShadows = true;
    this.shadowCasters.push(pianoBody);

    // 钢琴背板
    const pianoBack = BABYLON.MeshBuilder.CreateBox("pianoBack", {
      width: 1.6,
      height: 0.6,
      depth: 0.2
    }, this.scene);
    pianoBack.position.set(0, 1.12, -0.225);
    pianoBack.parent = pianoGroup;
    pianoBack.material = blackWood;
    this.shadowCasters.push(pianoBack);

    // 钢琴白琴键区
    const keysPanel = BABYLON.MeshBuilder.CreateBox("keysPanel", {
      width: 1.5,
      height: 0.05,
      depth: 0.25
    }, this.scene);
    keysPanel.position.set(0, 0.81, 0.22);
    keysPanel.parent = pianoGroup;
    keysPanel.material = whiteIvory;
    this.shadowCasters.push(keysPanel);

    // 键盘侧盖
    const keyCapL = BABYLON.MeshBuilder.CreateBox("keyCapL", {
      width: 0.05,
      height: 0.12,
      depth: 0.27
    }, this.scene);
    keyCapL.position.set(-0.775, 0.85, 0.22);
    keyCapL.parent = pianoGroup;
    keyCapL.material = blackWood;
    this.shadowCasters.push(keyCapL);

    const keyCapR = keyCapL.clone("keyCapR");
    keyCapR.position.x = 0.775;
    keyCapR.parent = pianoGroup;
    this.shadowCasters.push(keyCapR);

    // 钢琴琴凳
    const bench = BABYLON.MeshBuilder.CreateBox("pianoBench", {
      width: 0.65,
      height: 0.45,
      depth: 0.3
    }, this.scene);
    bench.position.set(0, 0.225, 0.65);
    bench.parent = pianoGroup;
    bench.material = blackWood;
    bench.receiveShadows = true;
    this.shadowCasters.push(bench);

    // 7. 湖畔两个极简白石凳 (可交互坐下，X=7.5 和 X=-7.5，朝向池塘中心)
    const seatMat = new BABYLON.StandardMaterial("lakeSeatMat", this.scene);
    seatMat.diffuseColor = BABYLON.Color3.FromHexString("#eeeeee");
    seatMat.specularColor = new BABYLON.Color3(0, 0, 0);
    seatMat.flatShading = true;

    const seat1 = BABYLON.MeshBuilder.CreateBox("lakeSeat1", {
      width: 0.8,
      height: 0.36,
      depth: 0.45
    }, this.scene);
    seat1.position.set(7.5, 0.78, 0);
    seat1.parent = this.group;
    seat1.material = seatMat;
    seat1.receiveShadows = true;
    this.shadowCasters.push(seat1);

    const seat2 = seat1.clone("lakeSeat2");
    seat2.position.set(-7.5, 0.78, 0);
    seat2.parent = this.group;
    this.shadowCasters.push(seat2);

    // 8. 返回大厅传送石碑 (x = 0, z = 9.5)
    const exitPortalGroup = new BABYLON.TransformNode("exitPortalGroup", this.scene);
    exitPortalGroup.position.set(0, 0.6, 9.5);
    exitPortalGroup.parent = this.group;

    const stoneMat = borderMat;

    // 下层大底座
    const bottomBasin = BABYLON.MeshBuilder.CreateCylinder("bottomBasin", {
      diameterTop: 1.6,
      diameterBottom: 1.8,
      height: 0.22,
      tessellation: 12
    }, this.scene);
    bottomBasin.position.y = 0.11;
    bottomBasin.parent = exitPortalGroup;
    bottomBasin.material = stoneMat;
    bottomBasin.receiveShadows = true;
    this.shadowCasters.push(bottomBasin);

    // 上层水盆
    const topBasin = BABYLON.MeshBuilder.CreateCylinder("topBasin", {
      diameterTop: 1.36,
      diameterBottom: 1.16,
      height: 0.35,
      tessellation: 12
    }, this.scene);
    topBasin.position.y = 0.38;
    topBasin.parent = exitPortalGroup;
    topBasin.material = stoneMat;
    topBasin.receiveShadows = true;
    this.shadowCasters.push(topBasin);

    // 水盆中的积水面 (治愈半透明蓝色)
    const poolWater = BABYLON.MeshBuilder.CreateDisc("poolWater", {
      radius: 0.64,
      tessellation: 12
    }, this.scene);
    poolWater.rotation.x = Math.PI / 2;
    poolWater.position.y = 0.54;
    poolWater.parent = exitPortalGroup;

    const poolWaterMat = new BABYLON.StandardMaterial("poolWaterMat", this.scene);
    poolWaterMat.diffuseColor = BABYLON.Color3.FromHexString("#00b0ff");
    poolWaterMat.specularColor = new BABYLON.Color3(0, 0, 0);
    poolWaterMat.alpha = 0.65;
    poolWaterMat.disableLighting = true;
    poolWaterMat.emissiveColor = poolWaterMat.diffuseColor;
    poolWater.material = poolWaterMat;

    // 涌泉水柱
    const waterSpout = BABYLON.MeshBuilder.CreateCylinder("waterSpout", {
      diameterTop: 0.14,
      diameterBottom: 0.28,
      height: 0.8,
      tessellation: 8
    }, this.scene);
    waterSpout.position.y = 0.9;
    waterSpout.parent = exitPortalGroup;

    const waterSpoutMat = new BABYLON.StandardMaterial("waterSpoutMat", this.scene);
    waterSpoutMat.diffuseColor = BABYLON.Color3.FromHexString("#e0f7fa");
    waterSpoutMat.specularColor = new BABYLON.Color3(0, 0, 0);
    waterSpoutMat.alpha = 0.82;
    waterSpoutMat.disableLighting = true;
    waterSpoutMat.emissiveColor = waterSpoutMat.diffuseColor;
    waterSpout.material = waterSpoutMat;

    // 涌泉飞溅微颗粒 (3个)
    const particleMat = new BABYLON.StandardMaterial("fountainParticleMat", this.scene);
    particleMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    particleMat.specularColor = new BABYLON.Color3(0, 0, 0);
    particleMat.disableLighting = true;
    particleMat.emissiveColor = particleMat.diffuseColor;

    const p1 = BABYLON.MeshBuilder.CreateBox("fountainP1", { size: 0.07 }, this.scene);
    p1.position.set(0.1, 1.25, 0.07);
    p1.parent = exitPortalGroup;
    p1.material = particleMat;

    const p2 = p1.clone("fountainP2");
    p2.position.set(-0.12, 1.3, -0.09);
    p2.parent = exitPortalGroup;

    const p3 = p1.clone("fountainP3");
    p3.position.set(0.04, 1.15, -0.13);
    p3.parent = exitPortalGroup;

    // 指示牌
    const signPost = BABYLON.MeshBuilder.CreateCylinder("signPost", {
      diameterTop: 0.06,
      diameterBottom: 0.06,
      height: 0.8,
      tessellation: 8
    }, this.scene);
    signPost.position.set(0.9, 0.4, 0.4);
    signPost.rotation.z = -0.15;
    signPost.parent = exitPortalGroup;
    
    const postMat = new BABYLON.StandardMaterial("signPostMat", this.scene);
    postMat.diffuseColor = BABYLON.Color3.FromHexString("#4e342e");
    postMat.specularColor = new BABYLON.Color3(0, 0, 0);
    signPost.material = postMat;
    this.shadowCasters.push(signPost);

    const signBoard = BABYLON.MeshBuilder.CreateBox("signBoard", {
      width: 0.55,
      height: 0.16,
      depth: 0.03
    }, this.scene);
    signBoard.position.set(0.85, 0.72, 0.4);
    signBoard.rotation.z = -0.15;
    signBoard.rotation.y = -0.2;
    signBoard.parent = exitPortalGroup;

    const boardMat = new BABYLON.StandardMaterial("signBoardMat", this.scene);
    boardMat.diffuseColor = BABYLON.Color3.FromHexString("#8d6e63");
    boardMat.specularColor = new BABYLON.Color3(0, 0, 0);
    signBoard.material = boardMat;
    this.shadowCasters.push(signBoard);

    // 蓝色指示条
    const signText = BABYLON.MeshBuilder.CreateBox("signText", {
      width: 0.38,
      height: 0.06,
      depth: 0.04
    }, this.scene);
    signText.position.set(0.86, 0.72, 0.42);
    signText.rotation.z = -0.15;
    signText.rotation.y = -0.2;
    signText.parent = exitPortalGroup;

    const signTextMat = new BABYLON.StandardMaterial("signTextMat", this.scene);
    signTextMat.emissiveColor = BABYLON.Color3.FromHexString("#00e5ff");
    signTextMat.disableLighting = true;
    signText.material = signTextMat;

    // 9. 摆放一些盆景松树 (四角)
    const treeTrunkMat = postMat;
    const leavesMat = new BABYLON.StandardMaterial("lakeLeavesMat", this.scene);
    leavesMat.diffuseColor = BABYLON.Color3.FromHexString("#2e7d32");
    leavesMat.specularColor = new BABYLON.Color3(0, 0, 0);
    leavesMat.flatShading = true;

    const treePositions = [
      { x: -9.5, z: -9.5 },
      { x: 9.5, z: -9.5 },
      { x: -9.5, z: 9.5 },
      { x: 9.5, z: 9.5 }
    ];

    treePositions.forEach((pos, idx) => {
      const tree = new BABYLON.TransformNode(`lakeTree_${idx}`, this.scene);
      tree.position.set(pos.x, 0.6, pos.z);
      tree.parent = this.group;

      const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
        diameterTop: 0.2,
        diameterBottom: 0.28,
        height: 0.8,
        tessellation: 6
      }, this.scene);
      trunk.position.y = 0.4;
      trunk.parent = tree;
      trunk.material = treeTrunkMat;
      this.shadowCasters.push(trunk);

      const leaves = BABYLON.MeshBuilder.CreatePolyhedron("leaves", {
        type: 1,
        size: 0.55
      }, this.scene);
      leaves.position.y = 0.95;
      leaves.parent = tree;
      leaves.material = leavesMat;
      this.shadowCasters.push(leaves);
    });
  }

  // 10. 创建水面扩散波纹
  createRipple(x, y, z) {
    const ripple = BABYLON.MeshBuilder.CreateDisc(`ripple_${Date.now()}`, {
      radius: 0.1,
      tessellation: 24
    }, this.scene);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.set(x, y, z);
    ripple.parent = this.group;

    const rippleMat = new BABYLON.StandardMaterial("rippleMat", this.scene);
    rippleMat.diffuseColor = BABYLON.Color3.FromHexString("#b2ebf2");
    rippleMat.specularColor = new BABYLON.Color3(0, 0, 0);
    rippleMat.alpha = 0.45;
    rippleMat.disableLighting = true;
    rippleMat.emissiveColor = rippleMat.diffuseColor;
    rippleMat.backFaceCulling = false;
    ripple.material = rippleMat;

    this.ripplesList.push({
      mesh: ripple,
      material: rippleMat,
      size: 0.1,
      maxSize: 0.8,
      speed: 0.82,
      maxOpacity: 0.45
    });
  }

  // 11. 向上派发漂浮音符粒子
  spawnNoteParticle(note) {
    // 钢琴凳子和键盘中央上方 (钢琴中心 x = 0, y = 0.6, z = -8.0)
    const px = (Math.random() - 0.5) * 0.9;
    const pz = -7.5 + (Math.random() - 0.5) * 0.3;

    // 创建 DynamicTexture 绘制音符符号
    const width = 64;
    const height = 64;
    const dynamicTexture = new BABYLON.DynamicTexture(`noteTex_${Date.now()}`, { width, height }, this.scene, true);
    const ctx = dynamicTexture.getContext();
    
    // 金色发光音符
    ctx.fillStyle = '#ffd700'; 
    ctx.font = 'bold 44px Outfit, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const symbols = ['🎵', '🎶', '楽', '✨', '♩', '♪'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    ctx.fillText(sym, 32, 32);
    dynamicTexture.update();

    const notePlane = BABYLON.MeshBuilder.CreatePlane("notePlane", { size: 0.5 }, this.scene);
    notePlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    notePlane.position.set(px, 1.45, pz);
    notePlane.parent = this.group;

    const noteMat = new BABYLON.StandardMaterial("noteMat", this.scene);
    noteMat.emissiveTexture = dynamicTexture;
    noteMat.opacityTexture = dynamicTexture;
    noteMat.opacityTexture.getAlphaFromRGB = true;
    noteMat.specularColor = new BABYLON.Color3(0, 0, 0);
    noteMat.disableLighting = true;
    
    // 开启 Additive Blending 营造极佳发光质感
    noteMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
    notePlane.material = noteMat;

    this.noteParticles.push({
      plane: notePlane,
      texture: dynamicTexture,
      material: noteMat,
      velocity: new BABYLON.Vector3(
        (Math.random() - 0.5) * 0.7,
        1.1 + Math.random() * 0.7,
        (Math.random() - 0.5) * 0.5
      ),
      age: 0,
      maxAge: 1.6 + Math.random() * 0.8
    });
  }

  // 12. 更新水流物理、涟漪与音符 (由主引擎 main.js 调用)
  update(dt, time, player) {
    if (!player) return;

    const playerX = player.position.x;
    const playerZ = player.position.z;
    const playerDist = Math.sqrt(playerX * playerX + playerZ * playerZ);

    // 1. 涉水小涟漪生成
    const isWaterZone = playerDist < 6.0;
    if (isWaterZone) {
      // 降低玩家在水里的步行高度，模拟涉水浸没 (地表原本 0.6，涉水陷下一些 Y = 0.52)
      player.position.y = 0.52;
      player.velocity.y = 0;
      player.isGrounded = true;

      const parentJoystick = window.parent && window.parent.joystickDir ? window.parent.joystickDir : window.joystickDir;
      const keysPressed = player.keys.w || player.keys.s || player.keys.a || player.keys.d || 
                           (parentJoystick && (parentJoystick.x !== 0 || parentJoystick.y !== 0));
      if (keysPressed) {
        const now = Date.now();
        if (now - this.lastWaterStepTime > 320) {
          this.createRipple(playerX, 0.612, playerZ);
          this.lastWaterStepTime = now;
          if (this.app && this.app.playCustomSound) {
            this.app.playCustomSound(120, 0.18, 'sine', 0.03);
          }
        }
      }

      // 2. 玩家推动漂浮瓷碗
      this.bowlsList.forEach(bowl => {
        const dx = bowl.position.x - playerX;
        const dz = bowl.position.z - playerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const touchRadius = 0.82;

        if (dist < touchRadius) {
          const nx = dist > 0 ? dx / dist : 1;
          const nz = dist > 0 ? dz / dist : 0;
          
          const pushForce = 1.35;
          bowl.velocity.x += nx * pushForce;
          bowl.velocity.z += nz * pushForce;

          const speed = bowl.velocity.length();
          if (speed > 2.2) {
            bowl.velocity.normalize().scaleInPlace(2.2);
          }

          bowl.position.x = playerX + nx * 0.83;
          bowl.position.z = playerZ + nz * 0.83;

          if (this.app && this.app.playBowlCollisionSound) {
            this.app.playBowlCollisionSound(bowl.position, 1.1);
          }
          this.createRipple(bowl.position.x, 0.612, bowl.position.z);
        }
      });
    }

    // 3. 玩家边缘限制 (高空浮岛防坠落阻挡)
    if (playerDist > 11.8) {
      const nx = playerX / playerDist;
      const nz = playerZ / playerDist;
      player.position.x = nx * 11.8;
      player.position.z = nz * 11.8;
      if (player.group) {
        player.group.position.copyFrom(player.position);
      }
      player.velocity.set(0, 0, 0);
    }

    // 4. 漂浮白瓷碗自身漫游与碰壁
    this.bowlsList.forEach(bowl => {
      // 物理位移
      bowl.position.x += bowl.velocity.x * dt;
      bowl.position.z += bowl.velocity.z * dt;

      // 粘滞阻力衰减
      bowl.velocity.scaleInPlace(0.982);

      // 背景微风扰动
      bowl.velocity.x += (Math.random() - 0.5) * 0.08 * dt;
      bowl.velocity.z += (Math.random() - 0.5) * 0.08 * dt;

      // y 轴波澜沉浮与微晃
      bowl.position.y = 0.61 + Math.sin(time * 0.0022 + bowl.phase) * 0.018;
      bowl.rotation.x = Math.sin(time * 0.0018 + bowl.phase) * 0.038;
      bowl.rotation.z = Math.cos(time * 0.0024 + bowl.phase) * 0.038;

      // 圆形池塘边界碰撞 (半径 6.0，碗半径 0.42，安全壁 5.58)
      const bowlDist = Math.sqrt(bowl.position.x * bowl.position.x + bowl.position.z * bowl.position.z);
      if (bowlDist > 5.58) {
        const nx = bowl.position.x / bowlDist;
        const nz = bowl.position.z / bowlDist;

        // 反弹速度
        const dot = bowl.velocity.x * nx + bowl.velocity.z * nz;
        bowl.velocity.x -= 2 * dot * nx;
        bowl.velocity.z -= 2 * dot * nz;

        bowl.position.x = nx * 5.56;
        bowl.position.z = nz * 5.56;

        if (this.app && this.app.playBowlCollisionSound) {
          this.app.playBowlCollisionSound(bowl.position, 0.45);
        }
        this.createRipple(bowl.position.x, 0.612, bowl.position.z);
      }
    });

    // 5. 碗与碗之间的弹性碰撞检测
    for (let i = 0; i < this.bowlsList.length; i++) {
      for (let j = i + 1; j < this.bowlsList.length; j++) {
        const b1 = this.bowlsList[i];
        const b2 = this.bowlsList[j];
        
        const dx = b2.position.x - b1.position.x;
        const dz = b2.position.z - b1.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = 0.84;

        if (dist < minDist) {
          const nx = dx / dist;
          const nz = dz / dist;
          
          const rvx = b2.velocity.x - b1.velocity.x;
          const rvz = b2.velocity.z - b1.velocity.z;
          const velAlongNormal = rvx * nx + rvz * nz;

          if (velAlongNormal < 0) {
            const impulse = -1.05 * velAlongNormal;
            b1.velocity.x -= impulse * nx * 0.5;
            b1.velocity.z -= impulse * nz * 0.5;
            b2.velocity.x += impulse * nx * 0.5;
            b2.velocity.z += impulse * nz * 0.5;
          }

          const overlap = minDist - dist;
          b1.position.x -= nx * overlap * 0.5;
          b1.position.z -= nz * overlap * 0.5;
          b2.position.x += nx * overlap * 0.5;
          b2.position.z += nz * overlap * 0.5;

          const cx = (b1.position.x + b2.position.x) / 2;
          const cz = (b1.position.z + b2.position.z) / 2;
          
          if (this.app && this.app.playBowlCollisionSound) {
            this.app.playBowlCollisionSound(new BABYLON.Vector3(cx, 0.61, cz), 1.0);
          }
          this.createRipple(cx, 0.612, cz);
        }
      }
    }

    // 6. 更新并渐渐淡化水纹涟漪
    for (let i = this.ripplesList.length - 1; i >= 0; i--) {
      const r = this.ripplesList[i];
      r.size += r.speed * dt;
      r.mesh.scaling.set(r.size * 10, r.size * 10, 1); // Disc 缩放 Y=1，缩放 X和Z (但在 Disc 的局部 XY 平面是 X 和 Y)
      r.material.alpha = r.maxOpacity * (1 - r.size / r.maxSize);

      if (r.size >= r.maxSize) {
        r.mesh.dispose();
        r.material.dispose();
        this.ripplesList.splice(i, 1);
      }
    }

    // 7. 更新音符粒子漂浮
    for (let i = this.noteParticles.length - 1; i >= 0; i--) {
      const p = this.noteParticles[i];
      p.age += dt;

      // 向上及随速度漂动
      p.plane.position.addInPlace(p.velocity.scale(dt));
      // 风阻晃动
      p.plane.position.x += Math.sin(p.age * 6.0) * 0.012;

      const pct = p.age / p.maxAge;
      p.material.alpha = 0.95 * (1 - pct);

      const sc = (0.32 + Math.sin(p.age * 2.0) * 0.05) * (1 - pct * 0.4);
      p.plane.scaling.set(sc, sc, sc);

      if (p.age >= p.maxAge) {
        p.plane.dispose();
        p.texture.dispose();
        p.material.dispose();
        this.noteParticles.splice(i, 1);
      }
    }
  }

  getShadowCasters() {
    return this.shadowCasters;
  }
}
