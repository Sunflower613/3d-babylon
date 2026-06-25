import * as BABYLON from '@babylonjs/core';

export class CastleGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.group = new BABYLON.TransformNode("castleGroup", this.scene);

    this.colliders = [];
    this.interactables = [];
    this.shadowCasters = [];

    // 粒子与物理模拟列表
    this.sakuraList = [];
    this.castleRipples = [];
    this.lastCastleWaterStepTime = 0;

    this.buildWorld();
  }

  buildWorld() {
    this.colliders = [
      // 整个草地基盘物理碰撞体，Y = 0.6，半径 24.0
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 24.0 }
    ];

    this.interactables = [];

    // --- 材质与颜色定义 ---
    const wallMat = new BABYLON.StandardMaterial("castleWallMat", this.scene);
    wallMat.diffuseColor = BABYLON.Color3.FromHexString("#ff85a1"); // 芭比粉外墙
    wallMat.specularColor = new BABYLON.Color3(0, 0, 0);
    wallMat.flatShading = true;

    const trimMat = new BABYLON.StandardMaterial("castleTrimMat", this.scene);
    trimMat.diffuseColor = BABYLON.Color3.FromHexString("#ffffff"); // 白色装饰与柱子
    trimMat.specularColor = new BABYLON.Color3(0, 0, 0);
    trimMat.flatShading = true;

    const roofMat = new BABYLON.StandardMaterial("castleRoofMat", this.scene);
    roofMat.diffuseColor = BABYLON.Color3.FromHexString("#b71c1c"); // 西班牙红瓦顶
    roofMat.specularColor = new BABYLON.Color3(0, 0, 0);
    roofMat.flatShading = true;

    const grassMat = new BABYLON.StandardMaterial("castleGrassMat", this.scene);
    grassMat.diffuseColor = BABYLON.Color3.FromHexString("#81c784"); // 翠绿草坪
    grassMat.specularColor = new BABYLON.Color3(0, 0, 0);
    grassMat.flatShading = true;

    const roadMat = new BABYLON.StandardMaterial("castleRoadMat", this.scene);
    roadMat.diffuseColor = BABYLON.Color3.FromHexString("#d7ccc8"); // 温暖沙石色车道
    roadMat.specularColor = new BABYLON.Color3(0, 0, 0);
    roadMat.flatShading = true;

    const poolMat = new BABYLON.StandardMaterial("castlePoolMat", this.scene);
    poolMat.diffuseColor = BABYLON.Color3.FromHexString("#ff4d6d"); // 泳池粉红底
    poolMat.specularColor = new BABYLON.Color3(0, 0, 0);
    poolMat.flatShading = true;

    const waterMat = new BABYLON.StandardMaterial("castleWaterMat", this.scene);
    waterMat.diffuseColor = BABYLON.Color3.FromHexString("#80deea"); // 清凉水蓝色
    waterMat.specularColor = new BABYLON.Color3(0, 0, 0);
    waterMat.alpha = 0.65;
    waterMat.disableLighting = true;
    waterMat.emissiveColor = waterMat.diffuseColor;
    waterMat.backFaceCulling = false;

    const glassMat = new BABYLON.StandardMaterial("castleGlassMat", this.scene);
    glassMat.diffuseColor = BABYLON.Color3.FromHexString("#80deea");
    glassMat.specularColor = new BABYLON.Color3(0, 0, 0);
    glassMat.alpha = 0.7;
    glassMat.flatShading = true;

    // 长拱窗内发光材质
    const windowLightMat = new BABYLON.StandardMaterial("castleWinLightMat", this.scene);
    windowLightMat.diffuseColor = BABYLON.Color3.FromHexString("#e0f7fa");
    windowLightMat.emissiveColor = BABYLON.Color3.FromHexString("#80deea");
    windowLightMat.specularColor = new BABYLON.Color3(0, 0, 0);
    windowLightMat.alpha = 0.9;
    windowLightMat.flatShading = true;

    const barkMat = new BABYLON.StandardMaterial("castleBarkMat", this.scene);
    barkMat.diffuseColor = BABYLON.Color3.FromHexString("#5d4037"); // 树干棕
    barkMat.specularColor = new BABYLON.Color3(0, 0, 0);
    barkMat.flatShading = true;

    const leafMat = new BABYLON.StandardMaterial("castleLeafMat", this.scene);
    leafMat.diffuseColor = BABYLON.Color3.FromHexString("#2e7d32"); // 树叶深绿
    leafMat.specularColor = new BABYLON.Color3(0, 0, 0);
    leafMat.flatShading = true;

    const coconutMat = new BABYLON.StandardMaterial("castleCocoMat", this.scene);
    coconutMat.diffuseColor = BABYLON.Color3.FromHexString("#8d6e63");
    coconutMat.specularColor = new BABYLON.Color3(0, 0, 0);
    coconutMat.flatShading = true;

    const heartPinkMat = new BABYLON.StandardMaterial("castleHeartMat", this.scene);
    heartPinkMat.emissiveColor = BABYLON.Color3.FromHexString("#ff4081");
    heartPinkMat.disableLighting = true;

    const tilePink = new BABYLON.StandardMaterial("castleTilePink", this.scene);
    tilePink.diffuseColor = BABYLON.Color3.FromHexString("#ffb3c6");
    tilePink.specularColor = new BABYLON.Color3(0, 0, 0);
    tilePink.flatShading = true;

    const tileWhite = new BABYLON.StandardMaterial("castleTileWhite", this.scene);
    tileWhite.diffuseColor = BABYLON.Color3.FromHexString("#ffffff");
    tileWhite.specularColor = new BABYLON.Color3(0, 0, 0);
    tileWhite.flatShading = true;

    // =========================================================================
    // 1. 宽广庭院绿地基座 (33x33) 与粉色泥土底座
    // =========================================================================
    const baseWidth = 33.0;
    const baseDepth = 33.0;
    const halfW = baseWidth / 2 - 0.3;
    const halfD = baseDepth / 2 - 0.3;

    // 绿色草坪顶盖 Y=0.60 (底盘在 Y=0)
    const lawn = BABYLON.MeshBuilder.CreateBox("castleLawn", {
      width: baseWidth,
      height: 1.2,
      depth: baseDepth
    }, this.scene);
    lawn.position.set(0, 0, 0);
    lawn.parent = this.group;
    lawn.receiveShadows = true;
    lawn.material = grassMat;
    this.shadowCasters.push(lawn);

    // 紫色底泥土 (厚度 2.2)
    const dirtMat = new BABYLON.StandardMaterial("castlePurpleDirt", this.scene);
    dirtMat.diffuseColor = BABYLON.Color3.FromHexString("#9c27b0");
    dirtMat.specularColor = new BABYLON.Color3(0, 0, 0);
    dirtMat.flatShading = true;

    const dirt = BABYLON.MeshBuilder.CreateBox("castlePurpleDirtMesh", {
      width: baseWidth - 0.2,
      height: 2.2,
      depth: baseDepth - 0.2
    }, this.scene);
    dirt.position.set(0, -1.7, 0);
    dirt.parent = this.group;
    dirt.material = dirtMat;

    // =========================================================================
    // 2. 精确两点连线的欧式粉白铁艺围栏
    // =========================================================================
    const fenceHeight = 0.8;
    const pillarGeoOpts = {
      diameterTop: 0.32,
      diameterBottom: 0.32,
      height: fenceHeight + 0.2,
      tessellation: 8
    };

    const drawFenceLine = (x1, z1, x2, z2, step = 2.2) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const count = Math.round(dist / step);
      
      const posts = [];
      // 放置柱子
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        
        // 南侧开口大门：如果在南侧边缘，且横坐标在大门开口内 (-4 到 4)，则跳过柱子
        if (Math.abs(pz - halfD) < 0.5 && Math.abs(px) < 4.0) {
          continue;
        }

        const p = BABYLON.MeshBuilder.CreateCylinder("fencePillar", pillarGeoOpts, this.scene);
        p.position.set(px, 0.6 + (fenceHeight + 0.2) / 2, pz);
        p.parent = this.group;
        p.material = trimMat;
        this.shadowCasters.push(p);
        posts.push({ x: px, z: pz });
      }

      // 柱子间拉横栏
      for (let i = 0; i < posts.length - 1; i++) {
        const pA = posts[i];
        const pB = posts[i + 1];
        
        const gap = Math.sqrt((pB.x - pA.x) * (pB.x - pA.x) + (pB.z - pA.z) * (pB.z - pA.z));
        if (gap > step * 1.5) continue; // 跳过大门开口

        const mx = (pA.x + pB.x) / 2;
        const mz = (pA.z + pB.z) / 2;
        const angle = Math.atan2(pB.z - pA.z, pB.x - pA.x);

        const rGroup = new BABYLON.TransformNode("fenceRailGroup", this.scene);
        rGroup.position.set(mx, 0.6 + fenceHeight / 2, mz);
        rGroup.rotation.y = -angle; 
        rGroup.parent = this.group;

        const rail1 = BABYLON.MeshBuilder.CreateBox("fenceRail1", {
          width: gap - 0.1,
          height: 0.05,
          depth: 0.05
        }, this.scene);
        rail1.position.set(0, 0.16, 0);
        rail1.parent = rGroup;
        rail1.material = tilePink;
        this.shadowCasters.push(rail1);

        const rail2 = rail1.clone("fenceRail2");
        rail2.position.set(0, -0.16, 0);
        rail2.parent = rGroup;
        this.shadowCasters.push(rail2);

        // 中间的心形花纹 (用拉扁的圆锥代替)
        const heartDeco = BABYLON.MeshBuilder.CreateCylinder("heartDeco", {
          diameterTop: 0,
          diameterBottom: 0.24,
          height: 0.24,
          tessellation: 6
        }, this.scene);
        heartDeco.rotation.x = Math.PI;
        heartDeco.position.set(0, 0, 0);
        heartDeco.parent = rGroup;
        heartDeco.material = heartPinkMat;
      }
    };

    // 沿矩形四周拉围栏
    drawFenceLine(-halfW, -halfD, halfW, -halfD, 2.2); // 北侧
    drawFenceLine(-halfW, -halfD, -halfW, halfD, 2.2); // 左侧
    drawFenceLine(halfW, -halfD, halfW, halfD, 2.2);  // 右侧
    drawFenceLine(-halfW, halfD, halfW, halfD, 2.2);  // 南侧

    // =========================================================================
    // 新增：欧式紧闭粉白铁艺大门与金色柱头装饰 (位于南侧大门开口中心 x=0, z=halfD)
    // =========================================================================
    const gateGroup = new BABYLON.TransformNode("castleGateGroup", this.scene);
    gateGroup.position.set(0, 0.6, halfD);
    gateGroup.parent = this.group;

    // 金色材质用于大门装饰
    const goldMat = new BABYLON.StandardMaterial("gateGoldMat", this.scene);
    goldMat.diffuseColor = BABYLON.Color3.FromHexString("#ffd700");
    goldMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    goldMat.flatShading = true;

    // 1. 两根欧式门柱
    const postDistance = 2.0; // 左右柱子的横向距离
    const postHeight = 2.2;
    const postOpts = {
      width: 0.45,
      height: postHeight,
      depth: 0.45
    };

    const createGatePost = (posX) => {
      const post = BABYLON.MeshBuilder.CreateBox("gatePost", postOpts, this.scene);
      post.position.set(posX, postHeight / 2, 0);
      post.parent = gateGroup;
      post.material = trimMat;
      this.shadowCasters.push(post);

      // 柱头金色球体装饰
      const capBall = BABYLON.MeshBuilder.CreateSphere("gatePostCap", { diameter: 0.35, segments: 8 }, this.scene);
      capBall.position.set(posX, postHeight + 0.18, 0);
      capBall.parent = gateGroup;
      capBall.material = goldMat;
      this.shadowCasters.push(capBall);

      // 柱顶方座
      const capBase = BABYLON.MeshBuilder.CreateBox("gatePostCapBase", { width: 0.55, height: 0.1, depth: 0.55 }, this.scene);
      capBase.position.set(posX, postHeight + 0.05, 0);
      capBase.parent = gateGroup;
      capBase.material = trimMat;
      this.shadowCasters.push(capBase);
    };

    createGatePost(-postDistance);
    createGatePost(postDistance);

    // 2. 两扇紧闭的双开栅栏门
    const doorWidth = postDistance - 0.05; // 每扇门的宽度
    const doorHeight = 1.6;

    const createGateDoor = (side) => {
      const isLeft = side === 'left';
      const doorNode = new BABYLON.TransformNode(isLeft ? "leftDoorNode" : "rightDoorNode", this.scene);
      // 将旋转铰链定位在立柱内侧
      const hingeX = isLeft ? -postDistance + 0.225 : postDistance - 0.225;
      doorNode.position.set(hingeX, 0, 0);
      doorNode.parent = gateGroup;

      // 处于关闭状态 (用户指定关闭状态)
      doorNode.rotation.y = 0;

      // 门体容器（让旋转轴在 hinge 点，横向拉伸中心移动）
      const doorBody = new BABYLON.TransformNode("doorBody", this.scene);
      // 左门的门片向右伸展，右门的门片向左伸展
      doorBody.position.set(isLeft ? (doorWidth / 2) : (-doorWidth / 2), doorHeight / 2, 0);
      doorBody.parent = doorNode;

      // 门的外框 (粉色)
      const frameThickness = 0.06;
      const topBar = BABYLON.MeshBuilder.CreateBox("doorTop", { width: doorWidth, height: frameThickness, depth: frameThickness }, this.scene);
      topBar.position.set(0, doorHeight / 2 - frameThickness/2, 0);
      topBar.parent = doorBody;
      topBar.material = tilePink;
      this.shadowCasters.push(topBar);

      const bottomBar = BABYLON.MeshBuilder.CreateBox("doorBottom", { width: doorWidth, height: frameThickness, depth: frameThickness }, this.scene);
      bottomBar.position.set(0, -doorHeight / 2 + frameThickness/2, 0);
      bottomBar.parent = doorBody;
      bottomBar.material = tilePink;
      this.shadowCasters.push(bottomBar);

      const outerSideBar = BABYLON.MeshBuilder.CreateBox("doorSideOuter", { width: frameThickness, height: doorHeight, depth: frameThickness }, this.scene);
      outerSideBar.position.set(isLeft ? (doorWidth / 2 - frameThickness/2) : (-doorWidth / 2 + frameThickness/2), 0, 0);
      outerSideBar.parent = doorBody;
      outerSideBar.material = tilePink;
      this.shadowCasters.push(outerSideBar);

      const innerSideBar = BABYLON.MeshBuilder.CreateBox("doorSideInner", { width: frameThickness, height: doorHeight, depth: frameThickness }, this.scene);
      innerSideBar.position.set(isLeft ? (-doorWidth / 2 + frameThickness/2) : (doorWidth / 2 - frameThickness/2), 0, 0);
      innerSideBar.parent = doorBody;
      innerSideBar.material = tilePink;
      this.shadowCasters.push(innerSideBar);

      // 栅栏竖杆 (白色细圆柱)
      const barsCount = 6;
      const startX = -doorWidth / 2 + 0.20;
      const endX = doorWidth / 2 - 0.20;
      const stepX = (endX - startX) / (barsCount - 1);

      for (let i = 0; i < barsCount; i++) {
        const barX = startX + i * stepX;
        const bar = BABYLON.MeshBuilder.CreateCylinder("doorBar", {
          diameterTop: 0.03,
          diameterBottom: 0.03,
          height: doorHeight - 0.12,
          tessellation: 6
        }, this.scene);
        bar.position.set(barX, 0, 0);
        bar.parent = doorBody;
        bar.material = trimMat;
        this.shadowCasters.push(bar);
        
        // 竖杆顶端的小金色矛尖（Spike）
        const spike = BABYLON.MeshBuilder.CreateCylinder("doorSpike", {
          diameterTop: 0,
          diameterBottom: 0.05,
          height: 0.12,
          tessellation: 4
        }, this.scene);
        spike.position.set(barX, doorHeight / 2 - 0.02, 0);
        spike.parent = doorBody;
        spike.material = goldMat;
        this.shadowCasters.push(spike);
      }
    };

    createGateDoor('left');
    createGateDoor('right');

    // 3. 注册大门交互传送回小岛
    this.interactables.push({
      id: 'exit_castle',
      name: '城堡大门 (传送回小岛)',
      x: 0,
      y: 0.6,
      z: halfD,
      triggerRadius: 2.2
    });

    // =========================================================================
    // 3. 前院环形车道 与中央叠水大喷泉
    // =========================================================================
    const fountainX = 0;
    const fountainZ = 4.5;

    // 环形车道路面 (使用压扁的 Torus)
    const roadRing = BABYLON.MeshBuilder.CreateTorus("roadRing", {
      diameter: 12.6, // 外径大体对应 7.8，内径对应 4.8 左右
      thickness: 3.0,
      tessellation: 32
    }, this.scene);
    roadRing.scaling.y = 0.003; // 压平在地面
    roadRing.position.set(fountainX, 0.605, fountainZ);
    roadRing.parent = this.group;
    roadRing.receiveShadows = true;
    roadRing.material = roadMat;

    // 直通道连向南边入口
    const roadStraight = BABYLON.MeshBuilder.CreateBox("roadStraight", {
      width: 4.0,
      height: 0.01,
      depth: 9.0
    }, this.scene);
    roadStraight.position.set(0, 0.605, fountainZ + 6.3);
    roadStraight.parent = this.group;
    roadStraight.receiveShadows = true;
    roadStraight.material = roadMat;

    // 中央叠水大喷泉
    const fountainGroup = new BABYLON.TransformNode("fountain", this.scene);
    fountainGroup.position.set(fountainX, 0.6, fountainZ);
    fountainGroup.parent = this.group;

    const fBasin1 = BABYLON.MeshBuilder.CreateCylinder("fBasin1", {
      diameterTop: 4.4,
      diameterBottom: 4.8,
      height: 0.35,
      tessellation: 16
    }, this.scene);
    fBasin1.position.y = 0.175;
    fBasin1.parent = fountainGroup;
    fBasin1.material = trimMat;
    fBasin1.receiveShadows = true;
    this.shadowCasters.push(fBasin1);

    const fWater = BABYLON.MeshBuilder.CreateCylinder("fWater", {
      diameterTop: 4.0,
      diameterBottom: 4.0,
      height: 0.05,
      tessellation: 16
    }, this.scene);
    fWater.position.y = 0.28;
    fWater.parent = fountainGroup;
    fWater.material = waterMat;

    const fPillar = BABYLON.MeshBuilder.CreateCylinder("fPillar", {
      diameterTop: 0.7,
      diameterBottom: 0.9,
      height: 1.2,
      tessellation: 8
    }, this.scene);
    fPillar.position.y = 0.7;
    fPillar.parent = fountainGroup;
    fPillar.material = trimMat;
    this.shadowCasters.push(fPillar);

    const fBasin2 = BABYLON.MeshBuilder.CreateCylinder("fBasin2", {
      diameterTop: 2.4,
      diameterBottom: 2.6,
      height: 0.25,
      tessellation: 12
    }, this.scene);
    fBasin2.position.y = 1.325;
    fBasin2.parent = fountainGroup;
    fBasin2.material = trimMat;
    this.shadowCasters.push(fBasin2);

    const fSpout = BABYLON.MeshBuilder.CreateCylinder("fSpout", {
      diameterTop: 0.3,
      diameterBottom: 0.44,
      height: 0.4,
      tessellation: 8
    }, this.scene);
    fSpout.position.y = 1.6;
    fSpout.parent = fountainGroup;
    fSpout.material = trimMat;

    // 水流喷头喷出的涌泉
    const fWaterSpoutMat = new BABYLON.StandardMaterial("fWaterSpoutMat", this.scene);
    fWaterSpoutMat.diffuseColor = BABYLON.Color3.FromHexString("#fff0f3");
    fWaterSpoutMat.alpha = 0.75;
    fWaterSpoutMat.disableLighting = true;
    fWaterSpoutMat.emissiveColor = fWaterSpoutMat.diffuseColor;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const arcGroup = new BABYLON.TransformNode("fWaterArc", this.scene);
      arcGroup.rotation.y = angle;
      arcGroup.position.set(0, 1.6, 0);
      arcGroup.parent = fountainGroup;

      const wSeg1 = BABYLON.MeshBuilder.CreateCylinder("wSeg1", {
        diameterTop: 0.08,
        diameterBottom: 0.1,
        height: 0.6,
        tessellation: 6
      }, this.scene);
      wSeg1.rotation.z = -0.4;
      wSeg1.position.set(0.15, 0.25, 0);
      wSeg1.parent = arcGroup;
      wSeg1.material = fWaterSpoutMat;

      const wSeg2 = BABYLON.MeshBuilder.CreateCylinder("wSeg2", {
        diameterTop: 0.1,
        diameterBottom: 0.12,
        height: 1.2,
        tessellation: 6
      }, this.scene);
      wSeg2.rotation.z = -1.1;
      wSeg2.position.set(0.85, 0.05, 0);
      wSeg2.parent = arcGroup;
      wSeg2.material = fWaterSpoutMat;
    }

    // 喷泉局部水发光光源
    const fLight = new BABYLON.PointLight("fountainLight", new BABYLON.Vector3(0, 1.8, 0), this.scene);
    fLight.diffuse = BABYLON.Color3.FromHexString("#80deea");
    fLight.intensity = 1.5;
    fLight.range = 4.0;
    fLight.parent = fountainGroup;

    // 随机飞溅静态微颗粒
    const fParticleMat = new BABYLON.StandardMaterial("fountainPartMat", this.scene);
    fParticleMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    fParticleMat.disableLighting = true;
    fParticleMat.emissiveColor = fParticleMat.diffuseColor;

    for (let i = 0; i < 8; i++) {
      const p = BABYLON.MeshBuilder.CreateBox("fountainPart", { size: 0.08 }, this.scene);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 1.3;
      p.position.set(Math.cos(angle) * radius, 1.0 + Math.random() * 0.9, Math.sin(angle) * radius);
      p.parent = fountainGroup;
      p.material = fParticleMat;
    }

    this.interactables.push({
      id: 'exit_portal',
      name: '返航传送泉 (传送回海岛)',
      x: fountainX,
      y: 0.6,
      z: fountainZ,
      triggerRadius: 2.2
    });

    // =========================================================================
    // 4. 3D 热带椰子树生成
    // =========================================================================
    const createPalmTree = (tx, tz, treeScale = 1.0) => {
      const tree = new BABYLON.TransformNode("palmTree", this.scene);
      tree.position.set(tx, 0.6, tz);
      tree.scaling.set(treeScale, treeScale, treeScale);
      tree.parent = this.group;

      let currentY = 0;
      let currentX = 0;
      let currentZ = 0;
      const trunkSegments = 6;
      const segHeight = 1.0;
      
      for (let i = 0; i < trunkSegments; i++) {
        const seg = BABYLON.MeshBuilder.CreateCylinder("trunkSeg", {
          diameterTop: (0.18 - i * 0.018) * 2,
          diameterBottom: (0.22 - i * 0.018) * 2,
          height: segHeight,
          tessellation: 8
        }, this.scene);
        
        seg.position.set(currentX, currentY + segHeight / 2, currentZ);
        const tiltX = tx > 0 ? 0.07 : -0.07;
        const tiltZ = tz > 0 ? 0.07 : -0.07;
        seg.rotation.set(tiltZ * (i + 1), 0, -tiltX * (i + 1));
        
        seg.parent = tree;
        seg.material = barkMat;
        this.shadowCasters.push(seg);

        currentY += segHeight - 0.06;
        currentX += Math.sin(-tiltX * (i + 1)) * segHeight;
        currentZ += Math.sin(tiltZ * (i + 1)) * segHeight;
      }

      const leafCenterY = currentY;
      const leafCenterX = currentX;
      const leafCenterZ = currentZ;

      const leafCount = 8;
      for (let l = 0; l < leafCount; l++) {
        const angle = (l * Math.PI * 2) / leafCount;
        const leafGroup = new BABYLON.TransformNode("leafGroup", this.scene);
        leafGroup.position.set(leafCenterX, leafCenterY, leafCenterZ);
        leafGroup.rotation.y = angle;
        leafGroup.parent = tree;

        let lx = 0;
        let ly = 0;
        const sW = 0.26;
        
        const s1 = BABYLON.MeshBuilder.CreateBox("leafSeg1", {
          width: 0.8,
          height: 0.02,
          depth: sW
        }, this.scene);
        s1.rotation.z = 0.42;
        s1.rotation.x = (l % 2 === 0 ? 0.15 : -0.15);
        s1.position.set(0.36, 0.12, 0);
        s1.parent = leafGroup;
        s1.material = leafMat;
        this.shadowCasters.push(s1);
        lx += Math.cos(0.42) * 0.8;
        ly += Math.sin(0.42) * 0.8;

        const s2 = BABYLON.MeshBuilder.CreateBox("leafSeg2", {
          width: 0.8,
          height: 0.02,
          depth: sW - 0.04
        }, this.scene);
        s2.rotation.z = -0.18;
        s2.rotation.x = (l % 2 === 0 ? 0.1 : -0.1);
        s2.position.set(lx + 0.38, ly - 0.04, 0);
        s2.parent = leafGroup;
        s2.material = leafMat;
        this.shadowCasters.push(s2);
        lx += Math.cos(-0.18) * 0.8;
        ly += Math.sin(-0.18) * 0.8;

        const s3 = BABYLON.MeshBuilder.CreateBox("leafSeg3", {
          width: 0.8,
          height: 0.02,
          depth: sW - 0.08
        }, this.scene);
        s3.rotation.z = -0.85;
        s3.position.set(lx + 0.32, ly - 0.28, 0);
        s3.parent = leafGroup;
        s3.material = leafMat;
        this.shadowCasters.push(s3);
      }

      for (let c = 0; c < 3; c++) {
        const coco = BABYLON.MeshBuilder.CreateSphere("cocoSphere", {
          diameter: 0.36,
          segments: 6
        }, this.scene);
        const ca = (c * Math.PI * 2) / 3;
        coco.position.set(leafCenterX + Math.cos(ca) * 0.24, leafCenterY - 0.15, leafCenterZ + Math.sin(ca) * 0.24);
        coco.parent = tree;
        coco.material = coconutMat;
      }
    };

    createPalmTree(-14.0, 9.0, 1.15);
    createPalmTree(14.0, 9.0, 1.15);
    createPalmTree(-15.0, -1.0, 1.1);
    createPalmTree(15.0, -1.0, 1.1);
    createPalmTree(-13.0, -12.0, 1.0);
    createPalmTree(13.0, -12.0, 1.0);

    // =========================================================================
    // 5. 模块化构建多房间城堡主体
    // =========================================================================
    const mZ = -7.5;
    const f1Height = 4.2;
    const secondFloorY = 0.6 + f1Height; // 二楼地面 Y = 4.8

    // 辅助函数：创建拱窗
    const createArchWindow = (parentGroup, wx, wy, wz, rotY = 0) => {
      const wGroup = new BABYLON.TransformNode("windowGroup", this.scene);
      wGroup.position.set(wx, wy, wz);
      wGroup.rotation.y = rotY;
      wGroup.parent = parentGroup;

      const frameMain = BABYLON.MeshBuilder.CreateBox("winFrame", {
        width: 1.3,
        height: 1.7,
        depth: 0.25
      }, this.scene);
      frameMain.parent = wGroup;
      frameMain.material = trimMat;
      this.shadowCasters.push(frameMain);

      // 顶部拱券
      const frameTopArch = BABYLON.MeshBuilder.CreateCylinder("winArch", {
        diameterTop: 1.3,
        diameterBottom: 1.3,
        height: 0.25,
        tessellation: 10,
        arc: 0.5 // 半圆
      }, this.scene);
      frameTopArch.rotation.x = Math.PI / 2;
      frameTopArch.rotation.z = Math.PI; // 调转使拱门向上
      frameTopArch.position.y = 0.85;
      frameTopArch.parent = wGroup;
      frameTopArch.material = trimMat;
      this.shadowCasters.push(frameTopArch);

      const glass = BABYLON.MeshBuilder.CreateBox("winGlass", {
        width: 1.05,
        height: 1.45,
        depth: 0.12
      }, this.scene);
      glass.position.y = 0.05;
      glass.parent = wGroup;
      glass.material = windowLightMat;

      const sill = BABYLON.MeshBuilder.CreateBox("winSill", {
        width: 1.5,
        height: 0.1,
        depth: 0.35
      }, this.scene);
      sill.position.y = -0.9;
      sill.position.z = 0.05;
      sill.parent = wGroup;
      sill.material = trimMat;
      this.shadowCasters.push(sill);
    };

    // 5.1 一楼地板与后墙、前墙
    const mainFloorX = -3.5;
    const mainFloorWidth = 30.0;
    const mainFloorDepth = 7.5;

    const mainFloor = BABYLON.MeshBuilder.CreateBox("mainFloor", {
      width: mainFloorWidth,
      height: 0.12,
      depth: mainFloorDepth
    }, this.scene);
    mainFloor.position.set(mainFloorX, 0.6 + 0.06, mZ);
    mainFloor.parent = this.group;
    mainFloor.receiveShadows = true;
    mainFloor.material = tileWhite;
    this.shadowCasters.push(mainFloor);

    this.colliders.push({
      type: 'floor',
      worldX: mainFloorX,
      worldZ: mZ,
      worldY: 0.72,
      radius: mainFloorWidth / 2 + 1.0
    });

    const backWall = BABYLON.MeshBuilder.CreateBox("castleBackWall", {
      width: mainFloorWidth,
      height: f1Height,
      depth: 0.3
    }, this.scene);
    backWall.position.set(mainFloorX, 0.6 + f1Height / 2, mZ - mainFloorDepth / 2 + 0.15);
    backWall.parent = this.group;
    backWall.material = wallMat;
    this.shadowCasters.push(backWall);

    const frontWallLeft = BABYLON.MeshBuilder.CreateBox("castleFrontWallL", {
      width: 7.0,
      height: f1Height,
      depth: 0.3
    }, this.scene);
    frontWallLeft.position.set(-9.5, 0.6 + f1Height / 2, mZ + mainFloorDepth / 2 - 0.15);
    frontWallLeft.parent = this.group;
    frontWallLeft.material = wallMat;
    this.shadowCasters.push(frontWallLeft);

    const frontWallRight = BABYLON.MeshBuilder.CreateBox("castleFrontWallR", {
      width: 5.5,
      height: f1Height,
      depth: 0.3
    }, this.scene);
    frontWallRight.position.set(-0.25, 0.6 + f1Height / 2, mZ + mainFloorDepth / 2 - 0.15);
    frontWallRight.parent = this.group;
    frontWallRight.material = wallMat;
    this.shadowCasters.push(frontWallRight);

    // 大门廊两侧的墙垛
    const hallWallL = BABYLON.MeshBuilder.CreateBox("hallWallL", { width: 1.2, height: f1Height, depth: 0.3 }, this.scene);
    hallWallL.position.set(-6.9, 0.6 + f1Height / 2, mZ + mainFloorDepth / 2 - 0.15);
    hallWallL.parent = this.group;
    hallWallL.material = wallMat;

    const hallWallR = BABYLON.MeshBuilder.CreateBox("hallWallR", { width: 1.2, height: f1Height, depth: 0.3 }, this.scene);
    hallWallR.position.set(-4.1, 0.6 + f1Height / 2, mZ + mainFloorDepth / 2 - 0.15);
    hallWallR.parent = this.group;
    hallWallR.material = wallMat;

    // 5.2 大门廊
    const porchWidth = 2.4;
    const porchDepth = 1.6;
    const porchX = -5.5;
    const porchZ = mZ + mainFloorDepth / 2;

    const porchGroup = new BABYLON.TransformNode("porch", this.scene);
    porchGroup.position.set(porchX, 0.6, porchZ);
    porchGroup.parent = this.group;

    const colR = 0.12;
    const colH = f1Height;
    
    // 双立柱组
    const colL1 = BABYLON.MeshBuilder.CreateCylinder("porchColL1", {
      diameterTop: colR * 2,
      diameterBottom: colR * 2.4,
      height: colH,
      tessellation: 12
    }, this.scene);
    colL1.position.set(-porchWidth / 2 - 0.1, colH / 2, porchDepth - 0.3);
    colL1.parent = porchGroup;
    colL1.material = trimMat;
    this.shadowCasters.push(colL1);

    const colL2 = colL1.clone("porchColL2");
    colL2.position.z -= 0.45;
    colL2.parent = porchGroup;
    this.shadowCasters.push(colL2);

    const colR1 = BABYLON.MeshBuilder.CreateCylinder("porchColR1", {
      diameterTop: colR * 2,
      diameterBottom: colR * 2.4,
      height: colH,
      tessellation: 12
    }, this.scene);
    colR1.position.set(porchWidth / 2 + 0.1, colH / 2, porchDepth - 0.3);
    colR1.parent = porchGroup;
    colR1.material = trimMat;
    this.shadowCasters.push(colR1);

    const colR2 = colR1.clone("porchColR2");
    colR2.position.z -= 0.45;
    colR2.parent = porchGroup;
    this.shadowCasters.push(colR2);

    const capL = BABYLON.MeshBuilder.CreateBox("porchCapL", {
      width: 0.38,
      height: 0.12,
      depth: 0.85
    }, this.scene);
    capL.position.set(-porchWidth / 2 - 0.1, colH - 0.06, porchDepth - 0.52);
    capL.parent = porchGroup;
    capL.material = trimMat;

    const capR = capL.clone("porchCapR");
    capR.position.x = porchWidth / 2 + 0.1;
    capR.parent = porchGroup;

    const porchBeam = BABYLON.MeshBuilder.CreateBox("porchBeam", {
      width: porchWidth + 0.6,
      height: 0.45,
      depth: 1.2
    }, this.scene);
    porchBeam.position.set(0, colH + 0.225, porchDepth - 0.52);
    porchBeam.parent = porchGroup;
    porchBeam.material = trimMat;
    this.shadowCasters.push(porchBeam);

    const porchRoof = BABYLON.MeshBuilder.CreateBox("porchRoof", {
      width: porchWidth + 0.8,
      height: 0.18,
      depth: 1.4
    }, this.scene);
    porchRoof.rotation.x = 0.22;
    porchRoof.position.set(0, colH + 0.48, porchDepth - 0.42);
    porchRoof.parent = porchGroup;
    porchRoof.material = roofMat;
    this.shadowCasters.push(porchRoof);

    // 大门
    const doorFrame = BABYLON.MeshBuilder.CreateBox("doorFrame", {
      width: 2.4,
      height: 3.2,
      depth: 0.22
    }, this.scene);
    doorFrame.position.set(0, 1.6, -0.05);
    doorFrame.parent = porchGroup;
    doorFrame.material = trimMat;

    const f1Door = BABYLON.MeshBuilder.CreateBox("f1Door", {
      width: 2.0,
      height: 3.0,
      depth: 0.12
    }, this.scene);
    f1Door.position.set(0, 1.5, -0.05);
    f1Door.parent = porchGroup;
    f1Door.material = tilePink;
    this.shadowCasters.push(f1Door);
    
    // 金把手
    const brassMat = new BABYLON.StandardMaterial("brassMat", this.scene);
    brassMat.diffuseColor = BABYLON.Color3.FromHexString("#ffd700");
    brassMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    const handleL = BABYLON.MeshBuilder.CreateSphere("handleL", { diameter: 0.12 }, this.scene);
    handleL.position.set(-0.1, 1.45, 0.05);
    handleL.parent = porchGroup;
    handleL.material = brassMat;

    const handleR = handleL.clone("handleR");
    handleR.position.x = 0.1;
    handleR.parent = porchGroup;

    // 5.3 左侧起伏柱廊露台
    const terraceWidth = 3.0;
    const terraceDepth = 7.5;
    const terraceX = -14.5;

    const terraceGroup = new BABYLON.TransformNode("terrace", this.scene);
    terraceGroup.position.set(terraceX, 0.6, mZ);
    terraceGroup.parent = this.group;

    const terraceFloor = BABYLON.MeshBuilder.CreateBox("terraceFloor", {
      width: terraceWidth,
      height: 0.18,
      depth: terraceDepth
    }, this.scene);
    terraceFloor.position.y = 0.09;
    terraceFloor.parent = terraceGroup;
    terraceFloor.receiveShadows = true;
    terraceFloor.material = tileWhite;
    this.shadowCasters.push(terraceFloor);

    this.colliders.push({
      type: 'floor',
      worldX: terraceX,
      worldZ: mZ,
      worldY: 0.78,
      radius: terraceWidth / 2 + 0.5
    });

    const tColH = 3.2;
    for (let tz = -terraceDepth / 2 + 0.6; tz <= terraceDepth / 2 - 0.6; tz += 2.0) {
      const tc = BABYLON.MeshBuilder.CreateCylinder("terraceCol", {
        diameterTop: 0.2,
        diameterBottom: 0.2,
        height: tColH,
        tessellation: 8
      }, this.scene);
      tc.position.set(-terraceWidth / 2 + 0.2, 0.18 + tColH / 2, tz);
      tc.parent = terraceGroup;
      tc.material = trimMat;
      this.shadowCasters.push(tc);
    }

    const terraceBeam = BABYLON.MeshBuilder.CreateBox("terraceBeam", {
      width: terraceWidth + 0.2,
      height: 0.24,
      depth: terraceDepth + 0.2
    }, this.scene);
    terraceBeam.position.set(0, 0.18 + tColH + 0.12, 0);
    terraceBeam.parent = terraceGroup;
    terraceBeam.material = trimMat;

    // 露台白围栏
    const drawTerraceRail = (rx1, rz1, rx2, rz2) => {
      const rdx = rx2 - rx1;
      const rdz = rz2 - rz1;
      const rdist = Math.sqrt(rdx * rdx + rdz * rdz);
      const rstep = 0.5;
      const rcount = Math.round(rdist / rstep);
      for (let i = 0; i <= rcount; i++) {
        const rt = i / rcount;
        const rp = BABYLON.MeshBuilder.CreateCylinder("railPillar", {
          diameterTop: 0.1,
          diameterBottom: 0.1,
          height: 0.6,
          tessellation: 6
        }, this.scene);
        rp.position.set(rx1 + rdx * rt, 0.18 + 0.3, rz1 + rdz * rt);
        rp.parent = terraceGroup;
        rp.material = trimMat;
        this.shadowCasters.push(rp);
      }
      const railH = BABYLON.MeshBuilder.CreateBox("railH", {
        width: rdist + 0.1,
        height: 0.06,
        depth: 0.06
      }, this.scene);
      railH.position.set((rx1 + rx2) / 2, 0.18 + 0.6, (rz1 + rz2) / 2);
      railH.rotation.y = -Math.atan2(rz2 - rz1, rx2 - rx1);
      railH.parent = terraceGroup;
      railH.material = trimMat;
    };
    drawTerraceRail(-terraceWidth / 2 + 0.2, -terraceDepth / 2 + 0.2, -terraceWidth / 2 + 0.2, terraceDepth / 2 - 0.2); // 西
    drawTerraceRail(-terraceWidth / 2 + 0.2, terraceDepth / 2 - 0.2, terraceWidth / 2 - 0.2, terraceDepth / 2 - 0.2);  // 南
    drawTerraceRail(-terraceWidth / 2 + 0.2, -terraceDepth / 2 + 0.2, terraceWidth / 2 - 0.2, -terraceDepth / 2 + 0.2); // 北

    // 一楼正面开窗
    createArchWindow(this.group, -10.5, 0.6 + f1Height / 2 + 0.2, mZ + mainFloorDepth / 2 - 0.05); // 起居室窗
    createArchWindow(this.group, -1.5, 0.6 + f1Height / 2 + 0.2, mZ + mainFloorDepth / 2 - 0.05); // 餐厅窗

    // 5.4 楼梯正南：圆顶塔楼
    const towerX = 5.0;
    const towerZ = -4.5;
    const towerRadius = 1.35;
    const towerHeight = secondFloorY + 0.15 + 3.8;

    const towerGroup = new BABYLON.TransformNode("tower", this.scene);
    towerGroup.position.set(towerX, 0.6, towerZ);
    towerGroup.parent = this.group;

    const towerCylinder = BABYLON.MeshBuilder.CreateCylinder("towerCylinder", {
      diameterTop: towerRadius * 2,
      diameterBottom: towerRadius * 2,
      height: towerHeight,
      tessellation: 18
    }, this.scene);
    towerCylinder.position.y = towerHeight / 2;
    towerCylinder.parent = towerGroup;
    towerCylinder.material = wallMat;
    towerCylinder.receiveShadows = true;
    this.shadowCasters.push(towerCylinder);

    const createTowerRing = (ry) => {
      const ring = BABYLON.MeshBuilder.CreateCylinder("towerRing", {
        diameterTop: (towerRadius + 0.08) * 2,
        diameterBottom: (towerRadius + 0.08) * 2,
        height: 0.12,
        tessellation: 18
      }, this.scene);
      ring.position.y = ry;
      ring.parent = towerGroup;
      ring.material = trimMat;
    };
    createTowerRing(0.12);
    createTowerRing(secondFloorY - 0.05);
    createTowerRing(towerHeight - 0.06);

    // 塔楼长拱窗 (旋转 90度 面朝东)
    const towerWin = BABYLON.MeshBuilder.CreateCylinder("towerWin", {
      diameterTop: 0.88,
      diameterBottom: 0.88,
      height: 2.2,
      tessellation: 10
    }, this.scene);
    towerWin.position.set(0, secondFloorY + 1.2, towerRadius - 0.08);
    towerWin.rotation.y = Math.PI / 2;
    towerWin.parent = towerGroup;
    towerWin.material = windowLightMat;

    const towerWinFrame = BABYLON.MeshBuilder.CreateCylinder("towerWinFrame", {
      diameterTop: 0.96,
      diameterBottom: 0.96,
      height: 2.22,
      tessellation: 10,
      openEnded: true
    }, this.scene);
    towerWinFrame.position.set(0, secondFloorY + 1.2, towerRadius - 0.06);
    towerWinFrame.rotation.y = Math.PI / 2;
    towerWinFrame.parent = towerGroup;
    towerWinFrame.material = trimMat;

    // 塔顶圆盖
    const towerDome = BABYLON.MeshBuilder.CreateSphere("towerDome", {
      diameter: (towerRadius + 0.08) * 2,
      segments: 16
    }, this.scene);
    // 裁剪为半球 (通过 scaling.y 压扁，或者直接使用，因为有一半在塔楼内部)
    towerDome.position.y = towerHeight;
    towerDome.parent = towerGroup;
    towerDome.material = trimMat;
    this.shadowCasters.push(towerDome);

    const towerSpire = BABYLON.MeshBuilder.CreateCylinder("towerSpire", {
      diameterTop: 0.04,
      diameterBottom: 0.1,
      height: 1.6,
      tessellation: 8
    }, this.scene);
    towerSpire.position.set(0, 1.2, 0);
    towerSpire.parent = towerDome;
    towerSpire.material = brassMat;

    const spireBall = BABYLON.MeshBuilder.CreateSphere("spireBall", { diameter: 0.24 }, this.scene);
    spireBall.position.y = 0.8;
    spireBall.parent = towerSpire;
    spireBall.material = brassMat;

    // 5.5 厨房正南：一层客房
    const guestX = 10.0;
    const guestZ = -4.5;
    const guestWidth = 4.0;
    const guestDepth = 3.5;

    const guestGroup = new BABYLON.TransformNode("guestRoom", this.scene);
    guestGroup.position.set(guestX, 0.6, guestZ);
    guestGroup.parent = this.group;

    const guestFloor = BABYLON.MeshBuilder.CreateBox("guestFloor", {
      width: guestWidth,
      height: 0.12,
      depth: guestDepth
    }, this.scene);
    guestFloor.position.y = 0.06;
    guestFloor.parent = guestGroup;
    guestFloor.receiveShadows = true;
    guestFloor.material = tileWhite;
    this.shadowCasters.push(guestFloor);

    this.colliders.push({
      type: 'floor',
      worldX: guestX,
      worldZ: guestZ,
      worldY: 0.78,
      radius: guestWidth / 2 + 0.2
    });

    const guestWallL = BABYLON.MeshBuilder.CreateBox("guestWallL", { width: 0.3, height: f1Height, depth: guestDepth }, this.scene);
    guestWallL.position.set(-guestWidth / 2 + 0.15, f1Height / 2, 0);
    guestWallL.parent = guestGroup;
    guestWallL.material = wallMat;
    this.shadowCasters.push(guestWallL);

    const guestWallR = BABYLON.MeshBuilder.CreateBox("guestWallR", { width: 0.3, height: f1Height, depth: guestDepth }, this.scene);
    guestWallR.position.set(guestWidth / 2 - 0.15, f1Height / 2, 0);
    guestWallR.parent = guestGroup;
    guestWallR.material = wallMat;
    this.shadowCasters.push(guestWallR);

    const guestWallF = BABYLON.MeshBuilder.CreateBox("guestWallF", { width: guestWidth, height: f1Height, depth: 0.3 }, this.scene);
    guestWallF.position.set(0, f1Height / 2, guestDepth / 2 - 0.15);
    guestWallF.parent = guestGroup;
    guestWallF.material = wallMat;
    this.shadowCasters.push(guestWallF);

    createArchWindow(guestGroup, 0, f1Height / 2 + 0.2, guestDepth / 2 - 0.05);

    const guestRoof = BABYLON.MeshBuilder.CreateBox("guestRoof", { width: guestWidth + 0.4, height: 0.18, depth: guestDepth + 0.4 }, this.scene);
    guestRoof.rotation.x = -0.15;
    guestRoof.position.set(0, f1Height + 0.09, 0);
    guestRoof.parent = guestGroup;
    guestRoof.material = roofMat;
    this.shadowCasters.push(guestRoof);

    // =========================================================================
    // 6. 二楼平台与墙体、圆拱门廊露台
    // =========================================================================
    const f2FloorWidth = 24.0;
    const f2FloorDepth = 7.5;
    const f2FloorX = -6.5;

    const f2Floor = BABYLON.MeshBuilder.CreateBox("f2Floor", {
      width: f2FloorWidth,
      height: 0.15,
      depth: f2FloorDepth
    }, this.scene);
    f2Floor.position.set(f2FloorX, secondFloorY + 0.075, mZ);
    f2Floor.parent = this.group;
    f2Floor.receiveShadows = true;
    f2Floor.material = tileWhite;
    this.shadowCasters.push(f2Floor);

    this.colliders.push({
      type: 'floor',
      worldX: f2FloorX,
      worldZ: mZ,
      worldY: secondFloorY + 0.15,
      radius: f2FloorWidth / 2
    });

    const f2Height = 3.8;
    const f2BackWall = BABYLON.MeshBuilder.CreateBox("f2BackWall", {
      width: f2FloorWidth,
      height: f2Height,
      depth: 0.3
    }, this.scene);
    f2BackWall.position.set(f2FloorX, secondFloorY + 0.15 + f2Height / 2, mZ - f2FloorDepth / 2 + 0.15);
    f2BackWall.parent = this.group;
    f2BackWall.material = wallMat;
    this.shadowCasters.push(f2BackWall);

    const f2FrontL = BABYLON.MeshBuilder.CreateBox("f2FrontL", { width: 9.0, height: f2Height, depth: 0.3 }, this.scene);
    f2FrontL.position.set(f2FloorX - f2FloorWidth / 2 + 4.5, secondFloorY + 0.15 + f2Height / 2, mZ + f2FloorDepth / 2 - 0.15);
    f2FrontL.parent = this.group;
    f2FrontL.material = wallMat;
    this.shadowCasters.push(f2FrontL);

    const f2FrontR = BABYLON.MeshBuilder.CreateBox("f2FrontR", { width: 9.0, height: f2Height, depth: 0.3 }, this.scene);
    f2FrontR.position.set(f2FloorX + f2FloorWidth / 2 - 4.5, secondFloorY + 0.15 + f2Height / 2, mZ + f2FloorDepth / 2 - 0.15);
    f2FrontR.parent = this.group;
    f2FrontR.material = wallMat;
    this.shadowCasters.push(f2FrontR);

    // 露台白石柱门廊
    const f2PorchWidth = 6.0;
    const f2PorchX = -6.5;
    const f2PorchZ = mZ + f2FloorDepth / 2;

    const f2Porch = new BABYLON.TransformNode("f2Porch", this.scene);
    f2Porch.position.set(f2PorchX, secondFloorY + 0.15, f2PorchZ);
    f2Porch.parent = this.group;

    const f2ColH = f2Height;
    const f2Col = BABYLON.MeshBuilder.CreateCylinder("f2ColL", {
      diameterTop: colR * 1.8,
      diameterBottom: colR * 2.2,
      height: f2ColH,
      tessellation: 12
    }, this.scene);
    f2Col.position.set(-f2PorchWidth / 2 + 0.2, f2ColH / 2, 0.4);
    f2Col.parent = f2Porch;
    f2Col.material = trimMat;
    this.shadowCasters.push(f2Col);

    const f2ColR = f2Col.clone("f2ColR");
    f2ColR.position.x = f2PorchWidth / 2 - 0.2;
    f2ColR.parent = f2Porch;
    this.shadowCasters.push(f2ColR);

    const f2Beam = BABYLON.MeshBuilder.CreateBox("f2Beam", {
      width: f2PorchWidth,
      height: 0.35,
      depth: 1.0
    }, this.scene);
    f2Beam.position.set(0, f2ColH + 0.175, 0);
    f2Beam.parent = f2Porch;
    f2Beam.material = trimMat;

    const f2PorchRoof = BABYLON.MeshBuilder.CreateBox("f2PorchRoof", {
      width: f2PorchWidth + 0.4,
      height: 0.15,
      depth: 1.2
    }, this.scene);
    f2PorchRoof.rotation.x = 0.18;
    f2PorchRoof.position.set(0, f2ColH + 0.35, 0.1);
    f2PorchRoof.parent = f2Porch;
    f2PorchRoof.material = roofMat;
    this.shadowCasters.push(f2PorchRoof);

    // 二楼窗户
    createArchWindow(this.group, f2FloorX - 7.0, secondFloorY + 0.15 + f2Height / 2 + 0.2, mZ + f2FloorDepth / 2 - 0.05); // 阳台左窗
    createArchWindow(this.group, f2FloorX + 7.0, secondFloorY + 0.15 + f2Height / 2 + 0.2, mZ + f2FloorDepth / 2 - 0.05); // 阳台右窗

    // 二楼大阳台铁艺围栏
    const drawF2Rail = (rx1, rz1, rx2, rz2) => {
      const rdx = rx2 - rx1;
      const rdz = rz2 - rz1;
      const rdist = Math.sqrt(rdx * rdx + rdz * rdz);
      const rstep = 0.55;
      const rcount = Math.round(rdist / rstep);
      for (let i = 0; i <= rcount; i++) {
        const rt = i / rcount;
        const rp = BABYLON.MeshBuilder.CreateCylinder("f2RailP", {
          diameterTop: 0.06,
          diameterBottom: 0.06,
          height: 0.6,
          tessellation: 6
        }, this.scene);
        rp.position.set(rx1 + rdx * rt, secondFloorY + 0.15 + 0.3, rz1 + rdz * rt);
        rp.parent = this.group;
        rp.material = trimMat;
        this.shadowCasters.push(rp);
      }
      const railH = BABYLON.MeshBuilder.CreateBox("f2RailH", {
        width: rdist + 0.1,
        height: 0.05,
        depth: 0.05
      }, this.scene);
      railH.position.set((rx1 + rx2) / 2, secondFloorY + 0.15 + 0.6, (rz1 + rz2) / 2);
      railH.rotation.y = -Math.atan2(rz2 - rz1, rx2 - rx1);
      railH.parent = this.group;
      railH.material = trimMat;
    };
    drawF2Rail(f2FloorX - f2FloorWidth / 2 + 0.2, mZ + f2FloorDepth / 2 - 0.2, f2PorchX - f2PorchWidth / 2 + 0.2, mZ + f2FloorDepth / 2 - 0.2); // 左前
    drawF2Rail(f2PorchX + f2PorchWidth / 2 - 0.2, mZ + f2FloorDepth / 2 - 0.2, f2FloorX + f2FloorWidth / 2 - 0.2, mZ + f2FloorDepth / 2 - 0.2); // 右前
    drawF2Rail(f2FloorX - f2FloorWidth / 2 + 0.2, mZ - f2FloorDepth / 2 + 0.2, f2FloorX - f2FloorWidth / 2 + 0.2, mZ + f2FloorDepth / 2 - 0.2); // 左侧

    // =========================================================================
    // 7. 三楼尖顶塔楼阁楼 与旋转木质楼梯
    // =========================================================================
    const f3FloorWidth = 10.0;
    const f3FloorDepth = 7.5;
    const f3FloorX = -13.5;
    const thirdFloorY = secondFloorY + 0.15 + f2Height; // 三楼地面 Y = 8.75

    const f3Floor = BABYLON.MeshBuilder.CreateBox("f3Floor", {
      width: f3FloorWidth,
      height: 0.12,
      depth: f3FloorDepth
    }, this.scene);
    f3Floor.position.set(f3FloorX, thirdFloorY + 0.06, mZ);
    f3Floor.parent = this.group;
    f3Floor.receiveShadows = true;
    f3Floor.material = tileWhite;
    this.shadowCasters.push(f3Floor);

    this.colliders.push({
      type: 'floor',
      worldX: f3FloorX,
      worldZ: mZ,
      worldY: thirdFloorY + 0.12,
      radius: f3FloorWidth / 2 + 0.5
    });

    const f3Height = 3.2;
    const f3BackWall = BABYLON.MeshBuilder.CreateBox("f3BackWall", { width: f3FloorWidth, height: f3Height, depth: 0.3 }, this.scene);
    f3BackWall.position.set(f3FloorX, thirdFloorY + 0.12 + f3Height / 2, mZ - f3FloorDepth / 2 + 0.15);
    f3BackWall.parent = this.group;
    f3BackWall.material = wallMat;
    this.shadowCasters.push(f3BackWall);

    const f3LeftWall = BABYLON.MeshBuilder.CreateBox("f3LeftWall", { width: 0.3, height: f3Height, depth: f3FloorDepth }, this.scene);
    f3LeftWall.position.set(f3FloorX - f3FloorWidth / 2 + 0.15, thirdFloorY + 0.12 + f3Height / 2, mZ);
    f3LeftWall.parent = this.group;
    f3LeftWall.material = wallMat;
    this.shadowCasters.push(f3LeftWall);

    const f3RightWall = BABYLON.MeshBuilder.CreateBox("f3RightWall", { width: 0.3, height: f3Height, depth: f3FloorDepth }, this.scene);
    f3RightWall.position.set(f3FloorX + f3FloorWidth / 2 - 0.15, thirdFloorY + 0.12 + f3Height / 2, mZ);
    f3RightWall.parent = this.group;
    f3RightWall.material = wallMat;
    this.shadowCasters.push(f3RightWall);

    const f3FrontWall = BABYLON.MeshBuilder.CreateBox("f3FrontWall", { width: f3FloorWidth, height: f3Height, depth: 0.3 }, this.scene);
    f3FrontWall.position.set(f3FloorX, thirdFloorY + 0.12 + f3Height / 2, mZ + f3FloorDepth / 2 - 0.15);
    f3FrontWall.parent = this.group;
    f3FrontWall.material = wallMat;
    this.shadowCasters.push(f3FrontWall);

    createArchWindow(this.group, f3FloorX, thirdFloorY + 0.12 + f3Height / 2 + 0.15, mZ + f3FloorDepth / 2 - 0.05);

    // 三楼大锥形金字塔红瓦尖顶
    const f3Roof = BABYLON.MeshBuilder.CreateCylinder("f3Roof", {
      diameterTop: 0,
      diameterBottom: 11.2,
      height: 4.8,
      tessellation: 4 // 四面金字塔
    }, this.scene);
    f3Roof.rotation.y = Math.PI / 4;
    f3Roof.position.set(f3FloorX, thirdFloorY + 0.12 + f3Height + 2.4, mZ);
    f3Roof.parent = this.group;
    f3Roof.material = roofMat;
    this.shadowCasters.push(f3Roof);

    // 旋转楼梯
    const stairsX = 3.0;
    const stairsZ = mZ + 1.2;
    const stepCount = 20;
    const stepW = 1.35;
    const stepH = (secondFloorY + 0.15 - 0.72) / stepCount; // 每一级台阶上升高度

    const woodMat = new BABYLON.StandardMaterial("stairWoodMat", this.scene);
    woodMat.diffuseColor = BABYLON.Color3.FromHexString("#5d4037");
    woodMat.specularColor = new BABYLON.Color3(0, 0, 0);
    woodMat.flatShading = true;

    for (let i = 0; i < stepCount; i++) {
      const angle = (i * Math.PI * 0.95) / stepCount; // 旋转大约 170 度上楼
      const radius = 1.6;
      const sx = stairsX - Math.cos(angle) * radius;
      const sz = stairsZ - Math.sin(angle) * radius;
      const sy = 0.72 + i * stepH;

      const step = BABYLON.MeshBuilder.CreateBox("stairStep", {
        width: stepW,
        height: 0.1,
        depth: 0.32
      }, this.scene);
      step.position.set(sx, sy, sz);
      step.rotation.y = -angle;
      step.parent = this.group;
      step.material = woodMat;
      step.receiveShadows = true;

      // 注册台阶地板碰撞体 (只在某些关键高度放，或干脆全放)
      if (i % 3 === 0 || i === stepCount - 1) {
        this.colliders.push({
          type: 'floor',
          worldX: sx,
          worldZ: sz,
          worldY: sy + 0.05,
          radius: 0.65
        });
      }
    }

    // =========================================================================
    // 8. 室内家具：一楼大厅温馨双人沙发 与二楼奢华带幔公主床
    // =========================================================================
    // 一楼沙发
    const sofaGroup = new BABYLON.TransformNode("sofaGroup", this.scene);
    sofaGroup.position.set(-6.5, 0.72, mZ - 1.2);
    sofaGroup.parent = this.group;

    const sofaBase = BABYLON.MeshBuilder.CreateBox("sofaBase", { width: 1.8, height: 0.18, depth: 0.75 }, this.scene);
    sofaBase.position.y = 0.09;
    sofaBase.parent = sofaGroup;
    sofaBase.material = tilePink;
    this.shadowCasters.push(sofaBase);

    const sofaBack = BABYLON.MeshBuilder.CreateBox("sofaBack", { width: 1.8, height: 0.55, depth: 0.18 }, this.scene);
    sofaBack.position.set(0, 0.455, -0.285);
    sofaBack.parent = sofaGroup;
    sofaBack.material = tilePink;
    this.shadowCasters.push(sofaBack);

    const armL = BABYLON.MeshBuilder.CreateBox("sofaArmL", { width: 0.18, height: 0.36, depth: 0.75 }, this.scene);
    armL.position.set(-0.81, 0.27, 0);
    armL.parent = sofaGroup;
    armL.material = trimMat;
    this.shadowCasters.push(armL);

    const armR = armL.clone("sofaArmR");
    armR.position.x = 0.81;
    armR.parent = sofaGroup;
    this.shadowCasters.push(armR);

    // 二楼床
    const masterX = -12.5;
    const bedGroup = new BABYLON.TransformNode("princessBed", this.scene);
    bedGroup.position.set(masterX, secondFloorY + 0.15, mZ - 1.2);
    bedGroup.parent = this.group;

    const bedBase = BABYLON.MeshBuilder.CreateBox("bedBase", { width: 2.2, height: 0.32, depth: 2.4 }, this.scene);
    bedBase.position.y = 0.16;
    bedBase.parent = bedGroup;
    bedBase.material = tileWhite;
    this.shadowCasters.push(bedBase);

    const bedSheet = BABYLON.MeshBuilder.CreateBox("bedSheet", { width: 2.0, height: 0.12, depth: 2.2 }, this.scene);
    bedSheet.position.set(0, 0.28, 0.1);
    bedSheet.parent = bedGroup;
    bedSheet.material = tilePink;
    this.shadowCasters.push(bedSheet);

    const headboard = BABYLON.MeshBuilder.CreateBox("headboard", { width: 2.2, height: 0.95, depth: 0.18 }, this.scene);
    headboard.position.set(0, 0.475, -1.11);
    headboard.parent = bedGroup;
    headboard.material = trimMat;
    this.shadowCasters.push(headboard);

    // 四根立柱带床顶幔
    const bedColH = 2.3;
    const bedColR = 0.05;
    const bCol1 = BABYLON.MeshBuilder.CreateCylinder("bedCol1", {
      diameterTop: bedColR * 2,
      diameterBottom: bedColR * 2,
      height: bedColH,
      tessellation: 6
    }, this.scene);
    bCol1.position.set(-1.0, bedColH / 2, -1.1);
    bCol1.parent = bedGroup;
    bCol1.material = trimMat;
    this.shadowCasters.push(bCol1);

    const bCol2 = bCol1.clone("bedCol2"); bCol2.position.x = 1.0; bCol2.parent = bedGroup; this.shadowCasters.push(bCol2);
    const bCol3 = bCol1.clone("bedCol3"); bCol3.position.z = 1.1; bCol3.parent = bedGroup; this.shadowCasters.push(bCol3);
    const bCol4 = bCol3.clone("bedCol4"); bCol4.position.x = -1.0; bCol4.parent = bedGroup; this.shadowCasters.push(bCol4);

    const canopy = BABYLON.MeshBuilder.CreateBox("canopy", { width: 2.2, height: 0.08, depth: 2.4 }, this.scene);
    canopy.position.y = bedColH;
    canopy.parent = bedGroup;
    canopy.material = tilePink;
    this.shadowCasters.push(canopy);

    this.interactables.push({
      id: 'lie_bed',
      name: '小憩睡下 (公主床)',
      x: masterX,
      y: secondFloorY + 0.15,
      z: mZ - 1.2,
      triggerRadius: 1.6
    });

    // =========================================================================
    // 9. 精致粉红室外游泳池 与 白色沙滩躺椅
    // =========================================================================
    const poolX = -11.0;
    const poolZ = 2.0;

    const poolFrame = BABYLON.MeshBuilder.CreateBox("poolFrame", { width: 6.8, height: 0.1, depth: 6.8 }, this.scene);
    poolFrame.position.set(poolX, 0.605, poolZ);
    poolFrame.parent = this.group;
    poolFrame.material = trimMat;
    this.shadowCasters.push(poolFrame);

    const poolBottom = BABYLON.MeshBuilder.CreateBox("poolBottom", { width: 6.0, height: 0.02, depth: 6.0 }, this.scene);
    poolBottom.position.set(poolX, 0.601, poolZ);
    poolBottom.parent = this.group;
    poolBottom.material = poolMat;

    const poolWater = BABYLON.MeshBuilder.CreateBox("poolWater", { width: 6.0, height: 0.02, depth: 6.0 }, this.scene);
    poolWater.position.set(poolX, 0.608, poolZ);
    poolWater.parent = this.group;
    poolWater.material = waterMat;

    // 两把并排白色躺椅
    const createLoungeChair = (cx, cz) => {
      const chair = new BABYLON.TransformNode("loungeChair", this.scene);
      chair.position.set(cx, 0.612, cz);
      chair.rotation.y = Math.PI / 4;
      chair.parent = this.group;

      const seat = BABYLON.MeshBuilder.CreateBox("chairSeat", { width: 0.55, height: 0.04, depth: 1.2 }, this.scene);
      seat.rotation.x = -0.06;
      seat.position.set(0, 0.04, -0.15);
      seat.parent = chair;
      seat.material = tileWhite;
      this.shadowCasters.push(seat);

      const back = BABYLON.MeshBuilder.CreateBox("chairBack", { width: 0.55, height: 0.04, depth: 0.72 }, this.scene);
      back.rotation.x = -0.58;
      back.position.set(0, 0.28, -0.65);
      back.parent = chair;
      back.material = tileWhite;
      this.shadowCasters.push(back);

      const support1 = BABYLON.MeshBuilder.CreateCylinder("chairLeg1", {
        diameterTop: 0.04,
        diameterBottom: 0.04,
        height: 0.35,
        tessellation: 6
      }, this.scene);
      support1.position.set(-0.25, -0.05, 0.38);
      support1.parent = chair;
      support1.material = trimMat;

      const support2 = support1.clone("chairLeg2"); support2.position.x = 0.25; support2.parent = chair;
      const support3 = support1.clone("chairLeg3"); support3.position.set(-0.25, -0.08, -0.62); support3.parent = chair;
      const support4 = support3.clone("chairLeg4"); support4.position.x = 0.25; support4.parent = chair;
    };
    createLoungeChair(poolX + 4.8, poolZ + 1.2);
    createLoungeChair(poolX + 5.5, poolZ - 0.2);

    // =========================================================================
    // 10. 浪漫樱花飘落系统 (初始化 25 片樱花瓣)
    // =========================================================================
    const sakuraMat = new BABYLON.StandardMaterial("sakuraMat", this.scene);
    sakuraMat.diffuseColor = BABYLON.Color3.FromHexString("#ffb7c5");
    sakuraMat.specularColor = new BABYLON.Color3(0, 0, 0);
    sakuraMat.alpha = 0.85;
    sakuraMat.disableLighting = true;
    sakuraMat.emissiveColor = sakuraMat.diffuseColor;

    for (let i = 0; i < 25; i++) {
      const petal = BABYLON.MeshBuilder.CreateBox(`sakuraPetal_${i}`, {
        width: 0.18,
        height: 0.02,
        depth: 0.18
      }, this.scene);
      const px = (Math.random() - 0.5) * 26.0;
      const pz = (Math.random() - 0.5) * 26.0 - 2.0;
      const py = 1.0 + Math.random() * 11.0;
      petal.position.set(px, py, pz);
      petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      petal.parent = this.group;
      petal.material = sakuraMat;

      this.sakuraList.push({
        mesh: petal,
        velocity: new BABYLON.Vector3(
          (Math.random() - 0.5) * 0.4,
          -0.5 - Math.random() * 0.5,
          (Math.random() - 0.5) * 0.4
        ),
        rotSpeed: new BABYLON.Vector3(
          Math.random() * 1.2,
          Math.random() * 1.2,
          0
        ),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // 11. 创建游泳池粉色涟漪
  createRipple(x, y, z) {
    const ripple = BABYLON.MeshBuilder.CreateDisc(`castleRipple_${Date.now()}`, {
      radius: 0.01,
      tessellation: 12
    }, this.scene);
    ripple.rotation.x = Math.PI / 2;
    ripple.position.set(x, y, z);
    ripple.parent = this.group;

    const rippleMat = new BABYLON.StandardMaterial("castleRippleMat", this.scene);
    rippleMat.diffuseColor = BABYLON.Color3.FromHexString("#ff85a1");
    rippleMat.specularColor = new BABYLON.Color3(0, 0, 0);
    rippleMat.alpha = 0.6;
    rippleMat.disableLighting = true;
    rippleMat.emissiveColor = rippleMat.diffuseColor;
    rippleMat.backFaceCulling = false;
    ripple.material = rippleMat;

    this.castleRipples.push({
      mesh: ripple,
      material: rippleMat,
      size: 0.01,
      maxSize: 0.65,
      speed: 1.4,
      maxOpacity: 0.6
    });
  }

  // 12. 更新花瓣粒子与游泳池涉水物理 (由 main.js 调用)
  update(dt, time, player) {
    // 1. 更新樱花瓣
    if (this.sakuraList) {
      this.sakuraList.forEach(p => {
        p.mesh.position.addInPlace(p.velocity.scale(dt));
        p.mesh.rotation.x += p.rotSpeed.x * dt;
        p.mesh.rotation.y += p.rotSpeed.y * dt;
        p.mesh.position.x += Math.sin(time * 1.5 + p.phase) * 0.005;

        if (p.mesh.position.y <= 0.6) {
          p.mesh.position.y = 11.0 + Math.random() * 3.0;
          p.mesh.position.x = (Math.random() - 0.5) * 22.0;
          p.mesh.position.z = (Math.random() - 0.5) * 22.0 - 2.0;
        }
      });
    }

    // 2. 涉水物理与粉色涟漪
    if (player) {
      const px = player.position.x;
      const pz = player.position.z;
      
      // 检测距离泳池中心的距离 (游泳池中心在 (-11.0, 2.0)，半径范围为 3.0)
      const dx = px - (-11.0);
      const dz = pz - 2.0;
      const distToPool = Math.sqrt(dx * dx + dz * dz);

      if (distToPool < 3.0) {
        if (player.position.y >= 0.58) {
          player.position.y = 0.52;
          player.velocity.y = 0;
          player.isGrounded = true;
        }

        const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
        if (speed > 0.05 && (time - this.lastCastleWaterStepTime > 0.32)) {
          this.lastCastleWaterStepTime = time;
          this.createRipple(px, 0.612, pz);
        }
      }
    }

    // 3. 更新粉色涟漪
    for (let i = this.castleRipples.length - 1; i >= 0; i--) {
      const r = this.castleRipples[i];
      r.size += r.speed * dt;
      r.mesh.scaling.set(r.size * 5, r.size * 5, 1);
      r.material.alpha = r.maxOpacity * (1.0 - r.size / r.maxSize);

      if (r.size >= r.maxSize) {
        r.mesh.dispose();
        r.material.dispose();
        this.castleRipples.splice(i, 1);
      }
    }
  }

  getShadowCasters() {
    return this.shadowCasters;
  }
}
