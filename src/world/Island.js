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

export class IslandGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.colliders = []; // 存储地板碰撞区
    this.interactables = []; // 存储交互触发区
    this.streetlights = []; // 存储路灯点光源
    this.shadowCasters = []; // 用于收集投射阴影的网格
    this.group = new BABYLON.TransformNode("islandGroup", this.scene);

    const colors = this.themeConfig.colors;
    const isChristmas = colors.sky === 0x050c18;

    // 材质调色板
    this.materials = {
      sand: this.createFlatMaterial("sandMat", colors.sand),
      dirt: this.createFlatMaterial("dirtMat", colors.dirt),
      stone: this.createFlatMaterial("stoneMat", isChristmas ? 0x90a4ae : 0xcfcfcf),
      wood: this.createFlatMaterial("woodMat", isChristmas ? 0x4e342e : 0xa1887f),
      leaves: this.createFlatMaterial("leavesMat", isChristmas ? 0x1b5e20 : 0x4caf50),
      coconut: this.createFlatMaterial("coconutMat", 0x5d4037),
      umbrellaRed: this.createFlatMaterial("umbrellaRedMat", isChristmas ? 0xd50000 : 0xff5252),
      umbrellaWhite: this.createFlatMaterial("umbrellaWhiteMat", 0xffffff),
      
      seaWater: (() => {
        const mat = new BABYLON.StandardMaterial("seaWaterMat", this.scene);
        mat.diffuseColor = convertColor(colors.seaWater);
        mat.alpha = isChristmas ? 0.72 : 0.92;
        mat.backFaceCulling = false;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),
      
      arcadeBody: this.createFlatMaterial("arcadeBodyMat", isChristmas ? 0x3e2723 : 0x263238),
      
      arcadeScreen: (() => {
        const mat = new BABYLON.StandardMaterial("arcadeScreenMat", this.scene);
        mat.diffuseColor = convertColor(isChristmas ? 0x29b6f6 : 0x00e676);
        mat.emissiveColor = convertColor(isChristmas ? 0x29b6f6 : 0x00e676);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),

      neonRed: (() => {
        const mat = new BABYLON.StandardMaterial("neonRedMat", this.scene);
        mat.diffuseColor = convertColor(0xff5252);
        mat.emissiveColor = convertColor(0xff5252);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),

      neonBlue: (() => {
        const mat = new BABYLON.StandardMaterial("neonBlueMat", this.scene);
        mat.diffuseColor = convertColor(0x40c4ff);
        mat.emissiveColor = convertColor(0x40c4ff);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })()
    };

    this.buildWorld();
  }

  createFlatMaterial(name, colorHex) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = convertColor(colorHex);
    mat.specularColor = new BABYLON.Color3(0, 0, 0); // 关掉高光，呈低多边形 Lambert 风格
    mat.flatShading = true;
    return mat;
  }

  buildWorld() {
    // 1. 创建主岛地面（沙滩或雪地圆柱体）
    this.createMainGround(0, 0, 0, 22);

    // 2. 创建广阔的海水面
    this.createVastOcean();

    // 3. 添加外围边界（夏天是椰子树，圣诞节是松树）
    this.createOuterBoundaries();

    // 4. 装饰各功能分区
    this.decorateAboutZone();
    this.decorateSkillsZone();
    this.decorateProjectsZone();
    this.decorateArcadeZone();

    // 5. 添加地面细节装饰（波浪泡沫/冰壳环、贝壳/小雪堆、星星等）
    this.createBeachDecorations();

    // 6. 创建交互式秋千
    this.createSwing(4.5, 0.6, 6.0);

    // 7. 创建玩具商贩小摊（领沙滩球 vs 领雪球）
    this.createBallVendor(-5.0, 0.6, 6.0);

    // 8. 创建漂浮的救生圈 / 冰山 与 气球
    this.createSummerDecorations();

    // 9. 创建温馨小木屋（西北角）
    this.createCozyHouse(-10.0, 0.6, -9.0);

    // 10. 创建路灯及霓虹灯（夜间发光）
    this.createStreetlamps();

    // 11. 创建派盟引导 NPC
    this.createPaimon(2.5, 2.5);

    // 12. 创建云顶天池传送门（西南）
    this.createLakePortal(-6.5, 0.6, -1.5);

    // 13. 创建粉色庄园传送门（西北）
    this.createCastlePortal(-7.5, 0.6, 7.5);
  }

  createFarmField(startX, y, startZ) {
    this.farmGroup = new BABYLON.TransformNode("farmGroup", this.scene);
    this.farmGroup.position.set(startX, y, startZ);
    this.farmGroup.parent = this.group;

    const spacingX = 1.8;
    const spacingZ = 1.8;

    this.farmPlots3D = [];

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const plotX = (c - 1) * spacingX;
        const plotZ = (r - 0.5) * spacingZ;

        // 泥土地基 (Low-poly 盒子)
        const plotMesh = BABYLON.MeshBuilder.CreateBox("plotDirt", {
          width: 1.4,
          height: 0.12,
          depth: 1.4
        }, this.scene);
        plotMesh.position.set(plotX, 0.06, plotZ);
        plotMesh.parent = this.farmGroup;
        plotMesh.receiveShadows = true;
        this.shadowCasters.push(plotMesh);

        // 边缘石框
        const borderMat = this.materials.stone;

        const b1 = BABYLON.MeshBuilder.CreateBox("border1", { width: 1.5, height: 0.08, depth: 0.08 }, this.scene);
        b1.position.set(plotX, 0.12, plotZ - 0.7);
        b1.parent = this.farmGroup;
        b1.material = borderMat;

        const b2 = BABYLON.MeshBuilder.CreateBox("border2", { width: 1.5, height: 0.08, depth: 0.08 }, this.scene);
        b2.position.set(plotX, 0.12, plotZ + 0.7);
        b2.parent = this.farmGroup;
        b2.material = borderMat;

        const b3 = BABYLON.MeshBuilder.CreateBox("border3", { width: 0.08, height: 0.08, depth: 1.4 }, this.scene);
        b3.position.set(plotX - 0.7, 0.12, plotZ);
        b3.parent = this.farmGroup;
        b3.material = borderMat;

        const b4 = BABYLON.MeshBuilder.CreateBox("border4", { width: 0.08, height: 0.08, depth: 1.4 }, this.scene);
        b4.position.set(plotX + 0.7, 0.12, plotZ);
        b4.parent = this.farmGroup;
        b4.material = borderMat;

        // 植物模型挂载点
        const plantGroup = new BABYLON.TransformNode("plantGroup", this.scene);
        plantGroup.position.set(plotX, 0.12, plotZ);
        plantGroup.parent = this.farmGroup;

        this.farmPlots3D.push({
          row: r,
          col: c,
          index: r * 3 + c,
          mesh: plotMesh,
          plantGroup: plantGroup,
          x: startX + plotX,
          z: startZ + plotZ
        });

        // 注册独立格子的感应触发区
        this.interactables.push({
          id: `farm_plot_${r * 3 + c}`,
          name: '农田格子',
          x: startX + plotX,
          y: y,
          z: startZ + plotZ,
          triggerRadius: 1.2
        });
      }
    }
  }

  createMainGround(x, y, z, radius) {
    const mainGroundGroup = new BABYLON.TransformNode("mainGroundGroup", this.scene);
    mainGroundGroup.position.set(x, y, z);
    mainGroundGroup.parent = this.group;

    // 上层沙滩/雪地圆柱
    const topMesh = BABYLON.MeshBuilder.CreateCylinder("topGround", {
      diameterTop: radius * 2,
      diameterBottom: (radius + 2) * 2,
      height: 0.6,
      tessellation: 12
    }, this.scene);
    topMesh.position.y = 0.3;
    topMesh.parent = mainGroundGroup;
    topMesh.receiveShadows = true;
    topMesh.material = this.materials.sand;
    this.shadowCasters.push(topMesh);

    // 岛屿泥土地基底座
    const baseMesh = BABYLON.MeshBuilder.CreateCylinder("baseGround", {
      diameterTop: (radius + 2) * 2,
      diameterBottom: (radius + 5) * 2,
      height: 1.8,
      tessellation: 12
    }, this.scene);
    baseMesh.position.y = -0.9;
    baseMesh.parent = mainGroundGroup;
    baseMesh.material = this.materials.dirt;
    this.shadowCasters.push(baseMesh);

    // 注册地板碰撞区 (高度在 Y = 0.6)
    this.colliders.push({
      mesh: topMesh,
      radius: radius,
      worldX: x,
      worldZ: z,
      worldY: 0.6,
      type: 'floor'
    });
  }

  createVastOcean() {
    const waterMesh = BABYLON.MeshBuilder.CreateGround("oceanWater", { width: 160, height: 160 }, this.scene);
    waterMesh.position.y = 0.18;
    waterMesh.parent = this.group;
    waterMesh.receiveShadows = true;
    waterMesh.material = this.materials.seaWater;
  }

  createOuterBoundaries() {
    const boundaryRadius = 21.2;
    const itemsCount = 20;
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    for (let i = 0; i < itemsCount; i++) {
      const angle = (i / itemsCount) * Math.PI * 2;
      
      // 跳过传送入口通道
      if (Math.abs(angle) < 0.2 || Math.abs(angle - Math.PI) < 0.2 || Math.abs(angle - Math.PI/2) < 0.2) {
        continue; 
      }

      const x = Math.sin(angle) * boundaryRadius;
      const z = Math.cos(angle) * boundaryRadius;

      if (isChristmas) {
        this.createPineTree(x, 0.6, z, 1.1 + Math.random() * 0.3);
      } else {
        this.createPalmTree(x, 0.6, z, 1.2 + Math.random() * 0.4);
      }
    }
  }

  createPalmTree(x, y, z, scale) {
    const tree = new BABYLON.TransformNode("palmTree", this.scene);
    tree.position.set(x, y, z);
    tree.scaling.set(scale, scale, scale);
    tree.parent = this.group;

    const trunkGroup = new BABYLON.TransformNode("trunkGroup", this.scene);
    trunkGroup.parent = tree;
    const segmentsCount = 5;
    let currentY = 0;
    let currentX = 0;

    for (let i = 0; i < segmentsCount; i++) {
      const seg = BABYLON.MeshBuilder.CreateCylinder("trunkSeg", {
        diameterTop: 0.16,
        diameterBottom: 0.24,
        height: 0.4,
        tessellation: 5
      }, this.scene);
      seg.position.set(currentX, currentY + 0.2, 0);
      const angle = 0.08 * i;
      seg.rotation.z = angle;
      seg.parent = trunkGroup;
      seg.material = this.materials.wood;
      this.shadowCasters.push(seg);
      
      currentY += 0.36 * Math.cos(angle);
      currentX -= 0.36 * Math.sin(angle);
    }

    const leavesGroup = new BABYLON.TransformNode("leavesGroup", this.scene);
    leavesGroup.position.set(currentX, currentY, 0);
    leavesGroup.parent = tree;
    
    const leafCount = 6;
    for (let j = 0; j < leafCount; j++) {
      // 创建叶片（长方体）并偏移中心点以从旋转中心向外延伸
      const leaf = BABYLON.MeshBuilder.CreateBox("leaf", { width: 0.8, height: 0.02, depth: 0.25 }, this.scene);
      
      // 模拟 pivot 偏移：将顶点向外移 0.4
      leaf.setPivotPoint(new BABYLON.Vector3(-0.4, 0, 0));
      leaf.position.set(0.4, 0, 0); // 相对偏移

      const leafPivotNode = new BABYLON.TransformNode("leafPivot", this.scene);
      leafPivotNode.parent = leavesGroup;
      leaf.parent = leafPivotNode;

      leafPivotNode.rotation.y = (j / leafCount) * Math.PI * 2;
      leafPivotNode.rotation.z = -0.22;
      
      leaf.material = this.materials.leaves;
      this.shadowCasters.push(leaf);
    }
  }

  createPineTree(x, y, z, scale) {
    const tree = new BABYLON.TransformNode("pineTree", this.scene);
    tree.position.set(x, y, z);
    tree.scaling.set(scale, scale, scale);
    tree.parent = this.group;

    // 树干
    const trunk = BABYLON.MeshBuilder.CreateCylinder("pineTrunk", {
      diameterTop: 0.24,
      diameterBottom: 0.36,
      height: 0.6,
      tessellation: 5
    }, this.scene);
    trunk.position.y = 0.3;
    trunk.parent = tree;
    trunk.material = this.materials.wood;
    this.shadowCasters.push(trunk);

    // 叠加锥体层
    for (let i = 0; i < 3; i++) {
      const baseRadius = 0.55 - i * 0.12;
      const cone = BABYLON.MeshBuilder.CreateCylinder("pineCone", {
        diameterTop: 0,
        diameterBottom: baseRadius * 2,
        height: 0.6,
        tessellation: 6
      }, this.scene);
      cone.position.y = 0.7 + i * 0.4;
      cone.parent = tree;
      cone.material = this.materials.leaves;
      this.shadowCasters.push(cone);
    }

    // 顶部小球（雪帽装饰）
    const starMat = new BABYLON.StandardMaterial("starMat", this.scene);
    starMat.diffuseColor = convertColor(0xfffde7);
    starMat.emissiveColor = convertColor(0xfffde7);
    starMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const star = BABYLON.MeshBuilder.CreateSphere("snowCap", { diameter: 0.12, segments: 5 }, this.scene);
    star.position.y = 1.7;
    star.parent = tree;
    star.material = starMat;
  }

  decorateAboutZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const centerGroup = new BABYLON.TransformNode("aboutZoneGroup", this.scene);
    centerGroup.position.set(0, 0.6, 0);
    centerGroup.parent = this.group;

    // 1. 篝火木材（交叉搭起）
    for (let i = 0; i < 3; i++) {
      const log = BABYLON.MeshBuilder.CreateCylinder("fireLog", {
        diameterTop: 0.14,
        diameterBottom: 0.14,
        height: 0.6,
        tessellation: 5
      }, this.scene);
      
      // 设置轴心在顶端，并向内倾斜
      log.setPivotPoint(new BABYLON.Vector3(0, 0.3, 0));
      log.position.set(-1.8, 0.35, 1.8);
      log.rotation.z = 0.95;
      
      const logPivot = new BABYLON.TransformNode("logPivot", this.scene);
      logPivot.position.set(-1.8, 0.35, 1.8);
      logPivot.parent = centerGroup;
      log.parent = logPivot;

      logPivot.rotation.y = (i * Math.PI * 2) / 3;
      log.material = this.materials.wood;
      this.shadowCasters.push(log);
    }

    // 2. 篝火火焰
    const fireGroup = new BABYLON.TransformNode("fireGroup", this.scene);
    fireGroup.position.set(-1.8, 0.15, 1.8);
    fireGroup.parent = centerGroup;
    
    const flameMat1 = new BABYLON.StandardMaterial("flameMat1", this.scene);
    flameMat1.diffuseColor = convertColor(0xff5722);
    flameMat1.emissiveColor = convertColor(0xff5722);
    flameMat1.specularColor = new BABYLON.Color3(0, 0, 0);

    const flameMat2 = new BABYLON.StandardMaterial("flameMat2", this.scene);
    flameMat2.diffuseColor = convertColor(0xff9100);
    flameMat2.emissiveColor = convertColor(0xff9100);
    flameMat2.specularColor = new BABYLON.Color3(0, 0, 0);

    const flameMat3 = new BABYLON.StandardMaterial("flameMat3", this.scene);
    flameMat3.diffuseColor = convertColor(0xffd600);
    flameMat3.emissiveColor = convertColor(0xffd600);
    flameMat3.specularColor = new BABYLON.Color3(0, 0, 0);

    const f1 = BABYLON.MeshBuilder.CreateCylinder("flame1", { diameterTop: 0, diameterBottom: 0.36, height: 0.45, tessellation: 5 }, this.scene);
    f1.position.set(0, 0.2, 0);
    f1.parent = fireGroup;
    f1.material = flameMat1;

    const f2 = BABYLON.MeshBuilder.CreateCylinder("flame2", { diameterTop: 0, diameterBottom: 0.36, height: 0.45, tessellation: 5 }, this.scene);
    f2.position.set(0.08, 0.15, -0.05);
    f2.rotation.z = 0.2;
    f2.scaling.set(0.8, 0.8, 0.8);
    f2.parent = fireGroup;
    f2.material = flameMat2;

    const f3 = BABYLON.MeshBuilder.CreateCylinder("flame3", { diameterTop: 0, diameterBottom: 0.36, height: 0.45, tessellation: 5 }, this.scene);
    f3.position.set(-0.08, 0.12, 0.06);
    f3.rotation.z = -0.2;
    f3.scaling.set(0.7, 0.7, 0.7);
    f3.parent = fireGroup;
    f3.material = flameMat3;

    // 篝火光晕灯光 (夜间闪烁)
    const fireLight = new BABYLON.PointLight("campfireLight", new BABYLON.Vector3(-1.8, 0.8, 1.8), this.scene);
    fireLight.diffuse = convertColor(0xff5722);
    fireLight.specular = new BABYLON.Color3(0, 0, 0);
    fireLight.intensity = 0.0;
    fireLight.range = 10;
    this.streetlights.push(fireLight);

    if (isChristmas) {
      // 圣诞区：雪人与长椅
      this.createSnowman(1.8, 0.6, -1.3, centerGroup);

      const benchGroup = new BABYLON.TransformNode("benchGroup", this.scene);
      benchGroup.position.set(1.5, 0.04, -2.2);
      benchGroup.rotation.y = -0.45;
      benchGroup.parent = centerGroup;

      const seat = BABYLON.MeshBuilder.CreateBox("benchSeat", { width: 1.2, height: 0.08, depth: 0.4 }, this.scene);
      seat.position.y = 0.25;
      seat.parent = benchGroup;
      seat.material = this.materials.wood;
      this.shadowCasters.push(seat);

      const legL = BABYLON.MeshBuilder.CreateBox("benchLegL", { width: 0.08, height: 0.25, depth: 0.35 }, this.scene);
      legL.position.set(-0.5, 0.125, 0);
      legL.parent = benchGroup;
      legL.material = this.materials.wood;
      this.shadowCasters.push(legL);

      const legR = BABYLON.MeshBuilder.CreateBox("benchLegR", { width: 0.08, height: 0.25, depth: 0.35 }, this.scene);
      legR.position.set(0.5, 0.125, 0);
      legR.parent = benchGroup;
      legR.material = this.materials.wood;
      this.shadowCasters.push(legR);
    } else {
      // 夏日区：日光躺椅与遮阳伞
      const bedFrame = BABYLON.MeshBuilder.CreateBox("bedFrame", { width: 0.5, height: 0.08, depth: 1.1 }, this.scene);
      bedFrame.position.set(1.5, 0.04, -1.2);
      bedFrame.rotation.y = -0.4;
      bedFrame.parent = centerGroup;
      bedFrame.material = this.materials.umbrellaWhite;
      this.shadowCasters.push(bedFrame);

      const bedPillow = BABYLON.MeshBuilder.CreateBox("bedPillow", { width: 0.48, height: 0.1, depth: 0.25 }, this.scene);
      bedPillow.position.set(1.5, 0.12, -1.6);
      bedPillow.rotation.y = -0.4;
      bedPillow.parent = centerGroup;
      bedPillow.material = this.materials.umbrellaRed;

      // 遮阳伞
      const umbrella = new BABYLON.TransformNode("umbrella", this.scene);
      umbrella.position.set(2.4, 0, -2.4);
      umbrella.parent = centerGroup;

      const pole = BABYLON.MeshBuilder.CreateCylinder("umbrellaPole", { diameterTop: 0.08, diameterBottom: 0.08, height: 2.2, tessellation: 5 }, this.scene);
      pole.position.y = 1.1;
      pole.parent = umbrella;
      pole.material = this.materials.wood;
      this.shadowCasters.push(pole);

      const domeRed = BABYLON.MeshBuilder.CreateCylinder("umbrellaDomeRed", { diameterTop: 0, diameterBottom: 2.4, height: 0.5, tessellation: 8 }, this.scene);
      domeRed.position.y = 2.1;
      domeRed.parent = umbrella;
      domeRed.material = this.materials.umbrellaRed;
      this.shadowCasters.push(domeRed);

      const domeWhite = BABYLON.MeshBuilder.CreateCylinder("umbrellaDomeWhite", { diameterTop: 0, diameterBottom: 2.44, height: 0.48, tessellation: 8 }, this.scene);
      domeWhite.position.y = 2.1;
      domeWhite.rotation.y = Math.PI / 8;
      domeWhite.parent = umbrella;
      domeWhite.material = this.materials.umbrellaWhite;
      this.shadowCasters.push(domeWhite);
    }

    this.interactables.push({
      id: 'about',
      name: '关于我',
      x: 0,
      y: 0.6,
      z: 0,
      triggerRadius: 3.5
    });
  }

  createSnowman(x, y, z, parentNode) {
    const snowman = new BABYLON.TransformNode("snowman", this.scene);
    snowman.position.set(x, y, z);
    snowman.parent = parentNode;

    // 下半身球
    const bodyB = BABYLON.MeshBuilder.CreateSphere("snowmanBodyB", { diameter: 0.8, segments: 8 }, this.scene);
    bodyB.position.y = 0.4;
    bodyB.parent = snowman;
    bodyB.material = this.materials.umbrellaWhite;
    this.shadowCasters.push(bodyB);

    // 上半身球
    const bodyT = BABYLON.MeshBuilder.CreateSphere("snowmanBodyT", { diameter: 0.52, segments: 8 }, this.scene);
    bodyT.position.y = 0.9;
    bodyT.parent = snowman;
    bodyT.material = this.materials.umbrellaWhite;
    this.shadowCasters.push(bodyT);

    // 胡萝卜鼻子
    const noseMat = new BABYLON.StandardMaterial("noseMat", this.scene);
    noseMat.diffuseColor = convertColor(0xffa726);
    noseMat.specularColor = new BABYLON.Color3(0, 0, 0);
    noseMat.flatShading = true;

    const nose = BABYLON.MeshBuilder.CreateCylinder("snowmanNose", { diameterTop: 0, diameterBottom: 0.08, height: 0.12, tessellation: 4 }, this.scene);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.9, 0.26);
    nose.parent = snowman;
    nose.material = noseMat;

    // 眼睛
    const eyeMat = new BABYLON.StandardMaterial("eyeMat", this.scene);
    eyeMat.diffuseColor = convertColor(0x111111);
    eyeMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const eyeL = BABYLON.MeshBuilder.CreateSphere("snowmanEyeL", { diameter: 0.06, segments: 4 }, this.scene);
    eyeL.position.set(-0.08, 0.96, 0.23);
    eyeL.parent = snowman;
    eyeL.material = eyeMat;

    const eyeR = BABYLON.MeshBuilder.CreateSphere("snowmanEyeR", { diameter: 0.06, segments: 4 }, this.scene);
    eyeR.position.set(0.08, 0.96, 0.23);
    eyeR.parent = snowman;
    eyeR.material = eyeMat;

    // 围巾
    const scarf = BABYLON.MeshBuilder.CreateCylinder("snowmanScarf", { diameterTop: 0.48, diameterBottom: 0.48, height: 0.08, tessellation: 8 }, this.scene);
    scarf.position.y = 0.7;
    scarf.parent = snowman;
    scarf.material = this.materials.umbrellaRed;

    // 帽子
    const hat = BABYLON.MeshBuilder.CreateCylinder("snowmanHat", { diameterTop: 0.3, diameterBottom: 0.36, height: 0.2, tessellation: 8 }, this.scene);
    hat.position.y = 1.18;
    hat.parent = snowman;
    hat.material = this.materials.arcadeBody;
    this.shadowCasters.push(hat);
  }

  decorateSkillsZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const treeX = -12;
    const treeZ = -3;
    const treeY = 0.6;

    const treeGroup = new BABYLON.TransformNode("skillsZoneTree", this.scene);
    treeGroup.position.set(treeX, treeY, treeZ);
    treeGroup.parent = this.group;

    if (isChristmas) {
      // 圣诞装饰松树
      const trunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { diameterTop: 0.6, diameterBottom: 0.8, height: 1.8, tessellation: 8 }, this.scene);
      trunk.position.y = 0.9;
      trunk.parent = treeGroup;
      trunk.material = this.materials.wood;
      this.shadowCasters.push(trunk);

      for (let i = 0; i < 4; i++) {
        const baseRadius = 1.6 - i * 0.35;
        const cone = BABYLON.MeshBuilder.CreateCylinder("treeCone", { diameterTop: 0, diameterBottom: baseRadius * 2, height: 1.6, tessellation: 8 }, this.scene);
        cone.position.y = 1.8 + i * 0.9;
        cone.parent = treeGroup;
        cone.material = this.materials.leaves;
        this.shadowCasters.push(cone);
      }

      // 星星
      const starMat = new BABYLON.StandardMaterial("treeStarMat", this.scene);
      starMat.diffuseColor = convertColor(0xffeb3b);
      starMat.emissiveColor = convertColor(0xffeb3b);
      starMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const star = BABYLON.MeshBuilder.CreateSphere("treeStar", { diameter: 0.36, segments: 6 }, this.scene);
      star.position.y = 5.2;
      star.parent = treeGroup;
      star.material = starMat;

      // 彩球装饰
      const orbColors = [0xff5252, 0x40c4ff, 0xffeb3b, 0xe040fb];
      for (let i = 0; i < 12; i++) {
        const color = orbColors[i % orbColors.length];
        const orbMat = new BABYLON.StandardMaterial("orbMat_" + i, this.scene);
        orbMat.diffuseColor = convertColor(color);
        orbMat.emissiveColor = convertColor(color);
        orbMat.specularColor = new BABYLON.Color3(0, 0, 0);

        const orb = BABYLON.MeshBuilder.CreateSphere("treeOrb", { diameter: 0.24, segments: 5 }, this.scene);
        const height = 1.8 + Math.floor(i / 3) * 0.9;
        const radius = 1.3 - Math.floor(i / 3) * 0.3;
        const angle = (i % 3) * (Math.PI * 2 / 3) + height * 0.5;
        orb.position.set(Math.cos(angle) * radius, height + 0.2, Math.sin(angle) * radius);
        orb.parent = treeGroup;
        orb.material = orbMat;
      }

      // 树底礼物盒
      const giftColors = [0xff5252, 0x40c4ff, 0xe040fb];
      for (let i = 0; i < 3; i++) {
        const giftMat = new BABYLON.StandardMaterial("giftMat_" + i, this.scene);
        giftMat.diffuseColor = convertColor(giftColors[i]);
        giftMat.specularColor = new BABYLON.Color3(0, 0, 0);
        giftMat.flatShading = true;

        const gift = BABYLON.MeshBuilder.CreateBox("giftBox", { width: 0.4, height: 0.4, depth: 0.4 }, this.scene);
        gift.position.set(0.6 - i * 0.5, 0.2, 0.5 + i * 0.2);
        gift.rotation.y = i * 0.4;
        gift.parent = treeGroup;
        gift.material = giftMat;
        this.shadowCasters.push(gift);
      }
    } else {
      // 巨型夏日椰子树
      const trunk = BABYLON.MeshBuilder.CreateCylinder("palmTrunk", { diameterTop: 0.48, diameterBottom: 0.8, height: 4.2, tessellation: 7 }, this.scene);
      trunk.position.y = 2.1;
      trunk.rotation.z = -0.1;
      trunk.parent = treeGroup;
      trunk.material = this.materials.wood;
      this.shadowCasters.push(trunk);

      const leavesGroup = new BABYLON.TransformNode("leavesGroup", this.scene);
      leavesGroup.position.set(-0.2, 4.1, 0);
      leavesGroup.parent = treeGroup;

      const leafCount = 8;
      for (let i = 0; i < leafCount; i++) {
        const leaf = BABYLON.MeshBuilder.CreateBox("palmLeaf", { width: 2.0, height: 0.02, depth: 0.45 }, this.scene);
        leaf.setPivotPoint(new BABYLON.Vector3(-1.0, 0, 0));
        leaf.position.set(1.0, 0, 0);

        const leafPivot = new BABYLON.TransformNode("leafPivot", this.scene);
        leafPivot.parent = leavesGroup;
        leaf.parent = leafPivot;

        leafPivot.rotation.y = (i / leafCount) * Math.PI * 2;
        leafPivot.rotation.z = -0.25;

        leaf.material = this.materials.leaves;
        this.shadowCasters.push(leaf);
      }

      // 椰子
      const cocoGeo = { diameter: 0.48, segments: 5 };
      for (let i = 0; i < 3; i++) {
        const coco = BABYLON.MeshBuilder.CreateSphere("coconut", cocoGeo, this.scene);
        const angle = (i / 3) * Math.PI * 2;
        coco.position.set(
          -0.2 + Math.cos(angle) * 0.3,
          3.8,
          Math.sin(angle) * 0.3
        );
        coco.parent = treeGroup;
        coco.material = this.materials.coconut;
        this.shadowCasters.push(coco);
      }
    }

    this.interactables.push({
      id: 'skills',
      name: '技术栈',
      x: -12,
      y: 0.6,
      z: -1,
      triggerRadius: 3.0
    });
  }

  decorateProjectsZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const projX = 12;
    const projZ = -3;
    const projY = 0.6;

    const cinemaGroup = new BABYLON.TransformNode("projectsZoneGroup", this.scene);
    cinemaGroup.position.set(projX, projY, projZ);
    cinemaGroup.parent = this.group;

    // 屏幕立柱
    const pillL = BABYLON.MeshBuilder.CreateCylinder("pillL", { diameterTop: 0.16, diameterBottom: 0.16, height: 2.5, tessellation: 5 }, this.scene);
    pillL.position.set(-1.8, 1.25, 0);
    pillL.parent = cinemaGroup;
    pillL.material = this.materials.wood;
    this.shadowCasters.push(pillL);

    const pillR = BABYLON.MeshBuilder.CreateCylinder("pillR", { diameterTop: 0.16, diameterBottom: 0.16, height: 2.5, tessellation: 5 }, this.scene);
    pillR.position.set(1.8, 1.25, 0);
    pillR.parent = cinemaGroup;
    pillR.material = this.materials.wood;
    this.shadowCasters.push(pillR);

    // 投影木板框
    const screenFrame = BABYLON.MeshBuilder.CreateBox("screenFrame", { width: 3.6, height: 2.0, depth: 0.15 }, this.scene);
    screenFrame.position.y = 2.25;
    screenFrame.parent = cinemaGroup;
    screenFrame.material = this.materials.wood;
    this.shadowCasters.push(screenFrame);

    // 屏幕
    const screen = BABYLON.MeshBuilder.CreateBox("screen", { width: 3.2, height: 1.7, depth: 0.08 }, this.scene);
    screen.position.set(0, 2.25, 0.06);
    screen.parent = cinemaGroup;
    screen.material = this.materials.stone;

    // 冲浪板 / 滑雪板
    const boardMat1 = this.createFlatMaterial("boardMat1", isChristmas ? 0xd50000 : 0x40c4ff);
    const boardMat2 = this.createFlatMaterial("boardMat2", isChristmas ? 0x2e7d32 : 0xffa726);

    const board1 = BABYLON.MeshBuilder.CreateSphere("board1", { diameter: 0.64, segments: 8 }, this.scene);
    board1.scaling.set(1, 2.4, 0.12);
    board1.position.set(-1.2, 0.6, 0.2);
    board1.rotation.set(0.1, 0.2, -0.15);
    board1.parent = cinemaGroup;
    board1.material = boardMat1;
    this.shadowCasters.push(board1);

    const board2 = BABYLON.MeshBuilder.CreateSphere("board2", { diameter: 0.64, segments: 8 }, this.scene);
    board2.scaling.set(1, 2.4, 0.12);
    board2.position.set(1.2, 0.6, 0.2);
    board2.rotation.set(0.1, -0.2, 0.15);
    board2.parent = cinemaGroup;
    board2.material = boardMat2;
    this.shadowCasters.push(board2);

    // 屏幕彩灯装饰（小黄色亮灯泡）
    const projBulbMat = new BABYLON.StandardMaterial("projBulbMat", this.scene);
    projBulbMat.diffuseColor = convertColor(0xfff59d);
    projBulbMat.emissiveColor = convertColor(0xfff59d);
    projBulbMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const projBulbL = BABYLON.MeshBuilder.CreateSphere("projBulbL", { diameter: 0.16, segments: 5 }, this.scene);
    projBulbL.position.set(-1.8, 3.3, 0.1);
    projBulbL.parent = cinemaGroup;
    projBulbL.material = projBulbMat;

    const projBulbR = BABYLON.MeshBuilder.CreateSphere("projBulbR", { diameter: 0.16, segments: 5 }, this.scene);
    projBulbR.position.set(1.8, 3.3, 0.1);
    projBulbR.parent = cinemaGroup;
    projBulbR.material = projBulbMat;

    // 投影板路灯 (点光源夜间自动淡入/淡出)
    const projLightL = new BABYLON.PointLight("projLightL", new BABYLON.Vector3(projX - 1.8, projY + 3.3, projZ + 0.1), this.scene);
    projLightL.diffuse = convertColor(0xfff59d);
    projLightL.specular = new BABYLON.Color3(0, 0, 0);
    projLightL.intensity = 0.0;
    projLightL.range = 6;
    this.streetlights.push(projLightL);

    const projLightR = new BABYLON.PointLight("projLightR", new BABYLON.Vector3(projX + 1.8, projY + 3.3, projZ + 0.1), this.scene);
    projLightR.diffuse = convertColor(0xfff59d);
    projLightR.specular = new BABYLON.Color3(0, 0, 0);
    projLightR.intensity = 0.0;
    projLightR.range = 6;
    this.streetlights.push(projLightR);

    this.interactables.push({
      id: 'projects',
      name: '项目展示',
      x: 12,
      y: 0.6,
      z: -1,
      triggerRadius: 3.0
    });
  }

  decorateArcadeZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const arcX = 0;
    const arcZ = -12;
    const arcY = 0.6;

    const arcadeGroup = new BABYLON.TransformNode("arcadeZoneGroup", this.scene);
    arcadeGroup.position.set(arcX, arcY, arcZ);
    arcadeGroup.parent = this.group;

    // 机身下座
    const base = BABYLON.MeshBuilder.CreateBox("arcadeBase", { width: 1.2, height: 1.0, depth: 1.0 }, this.scene);
    base.position.y = 0.5;
    base.parent = arcadeGroup;
    base.material = this.materials.arcadeBody;
    this.shadowCasters.push(base);

    // 上部屏幕箱体
    const upper = BABYLON.MeshBuilder.CreateBox("arcadeUpper", { width: 1.2, height: 1.2, depth: 0.8 }, this.scene);
    upper.position.set(0, 1.4, -0.1);
    upper.parent = arcadeGroup;
    upper.material = this.materials.arcadeBody;
    this.shadowCasters.push(upper);

    // 屏幕
    const screen = BABYLON.MeshBuilder.CreatePlane("arcadeScreenMesh", { width: 0.95, height: 0.72 }, this.scene);
    screen.rotation.x = -0.1;
    screen.position.set(0, 1.4, 0.31);
    screen.parent = arcadeGroup;
    screen.material = this.materials.arcadeScreen;

    // 操作面板
    const cp = BABYLON.MeshBuilder.CreateBox("arcadeCp", { width: 1.3, height: 0.2, depth: 0.5 }, this.scene);
    cp.position.set(0, 0.95, 0.3);
    cp.rotation.x = 0.15;
    cp.parent = arcadeGroup;
    cp.material = this.materials.arcadeBody;
    this.shadowCasters.push(cp);

    // 摇杆和按钮
    const joyStick = BABYLON.MeshBuilder.CreateCylinder("joystick", { diameterTop: 0.03, diameterBottom: 0.03, height: 0.18, tessellation: 4 }, this.scene);
    joyStick.position.set(-0.3, 1.05, 0.4);
    joyStick.rotation.x = 0.15;
    joyStick.parent = arcadeGroup;
    joyStick.material = this.materials.stone;

    const joyBall = BABYLON.MeshBuilder.CreateSphere("joystickBall", { diameter: 0.1, segments: 5 }, this.scene);
    joyBall.position.set(-0.3, 1.14, 0.42);
    joyBall.parent = arcadeGroup;
    joyBall.material = this.materials.neonRed;

    for (let i = 0; i < 3; i++) {
      const btn = BABYLON.MeshBuilder.CreateCylinder("arcadeBtn_" + i, { diameterTop: 0.07, diameterBottom: 0.07, height: 0.03, tessellation: 5 }, this.scene);
      btn.rotation.x = 0.15;
      btn.position.set(0.15 + i * 0.12, 1.0, 0.4);
      btn.parent = arcadeGroup;
      btn.material = (i % 2 === 0) ? this.materials.neonRed : this.materials.neonBlue;
    }

    // 顶部发光招牌箱
    const marquee = BABYLON.MeshBuilder.CreateBox("marquee", { width: 1.2, height: 0.25, depth: 0.85 }, this.scene);
    marquee.position.set(0, 2.05, -0.05);
    marquee.parent = arcadeGroup;
    marquee.material = this.materials.arcadeBody;

    const marqueePlateMat = new BABYLON.StandardMaterial("marqueePlateMat", this.scene);
    marqueePlateMat.diffuseColor = convertColor(isChristmas ? 0x29b6f6 : 0xffa726);
    marqueePlateMat.emissiveColor = convertColor(isChristmas ? 0x29b6f6 : 0xffa726);
    marqueePlateMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const marqueePlate = BABYLON.MeshBuilder.CreatePlane("marqueePlate", { width: 1.0, height: 0.18 }, this.scene);
    marqueePlate.position.set(0, 2.05, 0.38);
    marqueePlate.parent = arcadeGroup;
    marqueePlate.material = marqueePlateMat;

    // 两侧装饰火炬杆 (冬天是红白糖果罐/木头柱)
    const torchL = BABYLON.MeshBuilder.CreateCylinder("torchL", { diameterTop: 0.08, diameterBottom: 0.08, height: 1.5, tessellation: 5 }, this.scene);
    torchL.position.set(-0.9, 0.75, 0.2);
    torchL.parent = arcadeGroup;
    torchL.material = this.materials.wood;
    this.shadowCasters.push(torchL);

    const torchR = BABYLON.MeshBuilder.CreateCylinder("torchR", { diameterTop: 0.08, diameterBottom: 0.08, height: 1.5, tessellation: 5 }, this.scene);
    torchR.position.set(0.9, 0.75, 0.2);
    torchR.parent = arcadeGroup;
    torchR.material = this.materials.wood;
    this.shadowCasters.push(torchR);

    // 火炬火焰 (发光橙红)
    const torchFlameMat = new BABYLON.StandardMaterial("torchFlameMat", this.scene);
    torchFlameMat.diffuseColor = convertColor(0xff7043);
    torchFlameMat.emissiveColor = convertColor(0xff7043);
    torchFlameMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const torchFlameL = BABYLON.MeshBuilder.CreateCylinder("torchFlameL", { diameterTop: 0, diameterBottom: 0.16, height: 0.22, tessellation: 5 }, this.scene);
    torchFlameL.position.set(-0.9, 1.62, 0.2);
    torchFlameL.parent = arcadeGroup;
    torchFlameL.material = torchFlameMat;

    const torchFlameR = BABYLON.MeshBuilder.CreateCylinder("torchFlameR", { diameterTop: 0, diameterBottom: 0.16, height: 0.22, tessellation: 5 }, this.scene);
    torchFlameR.position.set(0.9, 1.62, 0.2);
    torchFlameR.parent = arcadeGroup;
    torchFlameR.material = torchFlameMat;

    // 火炬光晕灯光 (夜间发光闪烁)
    const torchLightL = new BABYLON.PointLight("torchLightL", new BABYLON.Vector3(arcX - 0.9, arcY + 1.62, arcZ + 0.2), this.scene);
    torchLightL.diffuse = convertColor(0xff5722);
    torchLightL.specular = new BABYLON.Color3(0, 0, 0);
    torchLightL.intensity = 0.0;
    torchLightL.range = 5;
    this.streetlights.push(torchLightL);

    const torchLightR = new BABYLON.PointLight("torchLightR", new BABYLON.Vector3(arcX + 0.9, arcY + 1.62, arcZ + 0.2), this.scene);
    torchLightR.diffuse = convertColor(0xff5722);
    torchLightR.specular = new BABYLON.Color3(0, 0, 0);
    torchLightR.intensity = 0.0;
    torchLightR.range = 5;
    this.streetlights.push(torchLightR);

    // 街机聚光灯 SpotLight
    const spotLightColor = isChristmas ? 0x29b6f6 : 0x00ff00;
    const spotLight = new BABYLON.SpotLight(
      "arcadeSpot",
      new BABYLON.Vector3(0, 4, -12),
      new BABYLON.Vector3(0, -1, 0),
      Math.PI / 3, // 锥角
      2,           // 衰减系数 exponent
      this.scene
    );
    spotLight.diffuse = convertColor(spotLightColor);
    spotLight.specular = new BABYLON.Color3(0, 0, 0);
    spotLight.intensity = 3.0;
    spotLight.range = 6;
    // 街机聚光灯不放入 streetlights 数组，它是常开的聚光灯

    this.interactables.push({
      id: 'arcade',
      name: '复古街机',
      x: 0,
      y: 0.6,
      z: -10.4,
      triggerRadius: 2.2
    });
  }

  createBeachDecorations() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // 1. 边缘环绕白浪泡沫 (圣诞是冰层)
    const foam = BABYLON.MeshBuilder.CreateTorus("oceanFoam", {
      diameter: 44.0,
      thickness: 0.4,
      tessellation: 32
    }, this.scene);
    foam.scaling.y = 0.05; // 压扁
    foam.position.y = 0.22;
    foam.parent = this.group;

    const foamMat = new BABYLON.StandardMaterial("foamMat", this.scene);
    foamMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    foamMat.alpha = isChristmas ? 0.95 : 0.8;
    foamMat.specularColor = new BABYLON.Color3(0, 0, 0);
    foam.material = foamMat;

    // 2. 地面小彩球 (雪天是白雪球)
    this.createBeachBallMesh(0.6, 0.6, -1.8, 0.24, isChristmas ? 0xffffff : 0xff5252); 
    this.createBeachBallMesh(10.0, 0.6, -1.5, 0.26, isChristmas ? 0xffffff : 0x40c4ff); 

    // 3. 散落细节装饰 (海星 & 贝壳 vs 小雪堆)
    if (isChristmas) {
      this.createSnowHeap(3.5, 0.61, 2.5, 0.2);
      this.createSnowHeap(-10.5, 0.61, 1.5, 0.28);
      this.createSnowHeap(-3.5, 0.61, -1.5, 0.18);
      this.createSnowHeap(8.5, 0.61, 3.5, 0.24);
    } else {
      this.createStarfish(3.5, 0.61, 2.5, 0xff7043); 
      this.createStarfish(-10.5, 0.61, 1.5, 0xff7043);
      this.createShell(-3.5, 0.61, -1.5, 0xfff9c4); 
      this.createShell(8.5, 0.61, 3.5, 0xfff9c4);

      // 额外的海滩小洋伞
      this.createExtraUmbrella(-5.8, 0.6, -5.0, 0x40c4ff); 
      this.createExtraUmbrella(8.0, 0.6, -7.0, 0xffeb3b); 
    }
  }

  createBeachBallMesh(x, y, z, radius, colorHex) {
    const ballGroup = new BABYLON.TransformNode("beachBallDecor", this.scene);
    ballGroup.position.set(x, y + radius, z);
    ballGroup.parent = this.group;

    const ball = BABYLON.MeshBuilder.CreateSphere("ballSphere", { diameter: radius * 2, segments: 8 }, this.scene);
    ball.parent = ballGroup;
    ball.material = this.createFlatMaterial("decorBallMat_" + colorHex, colorHex);
    this.shadowCasters.push(ball);

    // 环带
    const stripeColor = (colorHex === 0xffffff) ? 0xd50000 : 0xffffff;
    const stripeMat = this.createFlatMaterial("decorBallStripeMat_" + colorHex, stripeColor);
    
    const belt = BABYLON.MeshBuilder.CreateCylinder("ballBelt", {
      diameterTop: (radius + 0.005) * 2,
      diameterBottom: (radius + 0.005) * 2,
      height: radius * 0.4,
      tessellation: 8
    }, this.scene);
    belt.rotation.z = Math.PI / 4;
    belt.parent = ballGroup;
    belt.material = stripeMat;
    this.shadowCasters.push(belt);
  }

  createStarfish(x, y, z, colorHex) {
    const starfish = BABYLON.MeshBuilder.CreateCylinder("starfish", {
      diameterTop: 0,
      diameterBottom: 0.36,
      height: 0.05,
      tessellation: 5
    }, this.scene);
    starfish.position.set(x, y, z);
    starfish.rotation.x = Math.PI / 2;
    starfish.rotation.z = Math.random() * Math.PI;
    starfish.parent = this.group;
    starfish.material = this.createFlatMaterial("starfishMat", colorHex);
    this.shadowCasters.push(starfish);
  }

  createShell(x, y, z, colorHex) {
    // 使用四面体（低面数球体）模拟贝壳
    const shell = BABYLON.MeshBuilder.CreateSphere("shell", { diameter: 0.24, segments: 4 }, this.scene);
    shell.scaling.set(1.2, 0.8, 0.8);
    shell.position.set(x, y, z);
    shell.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    shell.parent = this.group;
    shell.material = this.createFlatMaterial("shellMat", colorHex);
    this.shadowCasters.push(shell);
  }

  createSnowHeap(x, y, z, radius) {
    const heap = BABYLON.MeshBuilder.CreateSphere("snowHeap", { diameter: radius * 2, segments: 5 }, this.scene);
    heap.scaling.set(1.2, 0.5, 1.2);
    heap.position.set(x, y + radius * 0.25, z);
    heap.parent = this.group;
    heap.material = this.materials.umbrellaWhite;
    this.shadowCasters.push(heap);
  }

  createExtraUmbrella(x, y, z, colorHex) {
    const umbrella = new BABYLON.TransformNode("extraUmbrella", this.scene);
    umbrella.position.set(x, y, z);
    umbrella.parent = this.group;

    const pole = BABYLON.MeshBuilder.CreateCylinder("extraUmbrellaPole", { diameterTop: 0.06, diameterBottom: 0.06, height: 1.8, tessellation: 5 }, this.scene);
    pole.position.y = 0.9;
    pole.parent = umbrella;
    pole.material = this.materials.wood;
    this.shadowCasters.push(pole);

    const domeColorMat = this.createFlatMaterial("exUmbrellaMat_" + colorHex, colorHex);

    const domeRed = BABYLON.MeshBuilder.CreateCylinder("extraUmbrellaDomeRed", { diameterTop: 0, diameterBottom: 1.8, height: 0.4, tessellation: 8 }, this.scene);
    domeRed.position.y = 1.7;
    domeRed.parent = umbrella;
    domeRed.material = domeColorMat;
    this.shadowCasters.push(domeRed);

    const domeWhite = BABYLON.MeshBuilder.CreateCylinder("extraUmbrellaDomeWhite", { diameterTop: 0, diameterBottom: 1.84, height: 0.38, tessellation: 8 }, this.scene);
    domeWhite.position.y = 1.7;
    domeWhite.rotation.y = Math.PI / 8;
    domeWhite.parent = umbrella;
    domeWhite.material = this.materials.umbrellaWhite;
  }

  createSwing(x, y, z) {
    const swingGroup = new BABYLON.TransformNode("swingGroup", this.scene);
    swingGroup.position.set(x, y, z);
    swingGroup.parent = this.group;

    // 两侧人字形架
    for (let side = -1; side <= 1; side += 2) {
      const legPivot = new BABYLON.TransformNode("legPivot_" + side, this.scene);
      legPivot.position.set(side * 1.0, 2.05, 0);
      legPivot.parent = swingGroup;

      for (let dir = -1; dir <= 1; dir += 2) {
        const leg = BABYLON.MeshBuilder.CreateCylinder("swingLeg", { diameterTop: 0.1, diameterBottom: 0.1, height: 2.1, tessellation: 6 }, this.scene);
        leg.setPivotPoint(new BABYLON.Vector3(0, 1.05, 0)); // 设置中心在顶部
        leg.position.set(0, -1.05, 0);
        leg.rotation.set(dir * 0.19, 0, side * 0.15);
        leg.parent = legPivot;
        leg.material = this.materials.wood;
        this.shadowCasters.push(leg);
      }
    }

    // 横梁
    const topBar = BABYLON.MeshBuilder.CreateCylinder("swingTopBar", { diameterTop: 0.1, diameterBottom: 0.1, height: 2.25, tessellation: 6 }, this.scene);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.05, 0);
    topBar.parent = swingGroup;
    topBar.material = this.materials.wood;
    this.shadowCasters.push(topBar);

    // 可摆动的秋千吊椅
    this.swingSeat = new BABYLON.TransformNode("swingSeat", this.scene);
    this.swingSeat.position.set(0, 2.05, 0);
    this.swingSeat.parent = swingGroup;

    const seatBoard = BABYLON.MeshBuilder.CreateBox("swingSeatBoard", { width: 0.6, height: 0.03, depth: 0.22 }, this.scene);
    seatBoard.position.set(0, -1.1, 0); 
    seatBoard.parent = this.swingSeat;
    seatBoard.material = this.materials.wood;
    this.shadowCasters.push(seatBoard);

    const ropeL = BABYLON.MeshBuilder.CreateCylinder("swingRopeL", { diameterTop: 0.02, diameterBottom: 0.02, height: 1.1, tessellation: 4 }, this.scene);
    ropeL.position.set(-0.24, -0.55, 0);
    ropeL.parent = this.swingSeat;
    ropeL.material = this.materials.stone;

    const ropeR = BABYLON.MeshBuilder.CreateCylinder("swingRopeR", { diameterTop: 0.02, diameterBottom: 0.02, height: 1.1, tessellation: 4 }, this.scene);
    ropeR.position.set(0.24, -0.55, 0);
    ropeR.parent = this.swingSeat;
    ropeR.material = this.materials.stone;

    this.interactables.push({
      id: 'swing',
      name: '秋千',
      x: x,
      y: y,
      z: z + 0.6,
      triggerRadius: 1.8
    });
  }

  createBallVendor(x, y, z) {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const vendorGroup = new BABYLON.TransformNode("ballVendor", this.scene);
    vendorGroup.position.set(x, y, z);
    vendorGroup.parent = this.group;

    // 柜台柜身
    const counter = BABYLON.MeshBuilder.CreateBox("vendorCounter", { width: 1.6, height: 0.8, depth: 0.8 }, this.scene);
    counter.position.y = 0.4;
    counter.parent = vendorGroup;
    counter.material = this.materials.wood;
    this.shadowCasters.push(counter);

    // 柜台面板
    const topMesh = BABYLON.MeshBuilder.CreateBox("vendorTop", { width: 1.7, height: 0.08, depth: 0.9 }, this.scene);
    topMesh.position.y = 0.84;
    topMesh.parent = vendorGroup;
    topMesh.material = this.materials.sand;
    this.shadowCasters.push(topMesh);

    // 支柱
    const pillarL = BABYLON.MeshBuilder.CreateCylinder("vendorPillarL", { diameterTop: 0.06, diameterBottom: 0.06, height: 1.4, tessellation: 5 }, this.scene);
    pillarL.position.set(-0.7, 1.4, -0.3);
    pillarL.parent = vendorGroup;
    pillarL.material = this.materials.wood;
    this.shadowCasters.push(pillarL);

    const pillarR = BABYLON.MeshBuilder.CreateCylinder("vendorPillarR", { diameterTop: 0.06, diameterBottom: 0.06, height: 1.4, tessellation: 5 }, this.scene);
    pillarR.position.set(0.7, 1.4, -0.3);
    pillarR.parent = vendorGroup;
    pillarR.material = this.materials.wood;
    this.shadowCasters.push(pillarR);

    // 遮阳篷/屋顶
    const roof = BABYLON.MeshBuilder.CreateBox("vendorRoof", { width: 1.8, height: 0.06, depth: 1.1 }, this.scene);
    roof.position.set(0, 2.15, 0.1);
    roof.rotation.x = 0.28;
    roof.parent = vendorGroup;
    roof.material = this.materials.umbrellaRed;
    this.shadowCasters.push(roof);

    const roofWhite = BABYLON.MeshBuilder.CreateBox("vendorRoofWhite", { width: 1.82, height: 0.05, depth: 0.3 }, this.scene);
    roofWhite.position.set(0, 2.15, 0.1);
    roofWhite.rotation.x = 0.28;
    roofWhite.parent = vendorGroup;
    roofWhite.material = this.materials.umbrellaWhite;

    // 玩具收纳篮
    const basket = BABYLON.MeshBuilder.CreateBox("vendorBasket", { width: 0.6, height: 0.25, depth: 0.5 }, this.scene);
    basket.position.set(-0.35, 0.98, 0.05);
    basket.parent = vendorGroup;
    basket.material = this.materials.coconut;
    this.shadowCasters.push(basket);

    // 篮子里的小球
    const ballMiniGeo = { diameter: 0.24, segments: 6 };
    const mColors = isChristmas ? [0xffffff, 0xffffff, 0xffffff] : [0xff5252, 0x40c4ff, 0xffeb3b];
    for (let i = 0; i < 3; i++) {
      const ballMini = BABYLON.MeshBuilder.CreateSphere("vendorBall_" + i, ballMiniGeo, this.scene);
      ballMini.position.set(-0.42 + i * 0.12, 1.08, 0.05 + (i % 2) * 0.05);
      ballMini.parent = vendorGroup;
      ballMini.material = this.createFlatMaterial("vendorMiniBallMat_" + i, mColors[i]);
    }

    // 招牌板
    const sign = BABYLON.MeshBuilder.CreateBox("vendorSign", { width: 0.6, height: 0.25, depth: 0.05 }, this.scene);
    sign.position.set(0.35, 1.2, 0.15);
    sign.rotation.y = -0.15;
    sign.parent = vendorGroup;
    sign.material = this.materials.umbrellaWhite;
    this.shadowCasters.push(sign);

    const signTextMat = this.createFlatMaterial("vendorSignTextMat", isChristmas ? 0xd50000 : 0x4caf50);
    const textSim = BABYLON.MeshBuilder.CreateBox("vendorSignTextSim", { width: 0.4, height: 0.08, depth: 0.06 }, this.scene);
    textSim.position.set(0.35, 1.2, 0.16);
    textSim.rotation.y = -0.15;
    textSim.parent = vendorGroup;
    textSim.material = signTextMat;

    this.interactables.push({
      id: 'ball_vendor',
      name: isChristmas ? '领雪球' : '领沙滩球',
      x: x,
      y: y,
      z: z + 0.8,
      triggerRadius: 1.8
    });
  }

  createCozyHouse(x, y, z) {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const houseGroup = new BABYLON.TransformNode("cozyHouse", this.scene);
    houseGroup.position.set(x, y, z);
    houseGroup.parent = this.group;

    // 1. 地板露台
    const floorMesh = BABYLON.MeshBuilder.CreateBox("houseFloor", { width: 4.0, height: 0.12, depth: 4.0 }, this.scene);
    floorMesh.position.y = 0.06;
    floorMesh.parent = houseGroup;
    floorMesh.material = this.materials.wood;
    floorMesh.receiveShadows = true;
    this.shadowCasters.push(floorMesh);

    // 注册木屋露台碰撞区 (Y = y + 0.12 = 0.72)
    this.colliders.push({
      mesh: floorMesh,
      radius: 2.2,
      worldX: x,
      worldZ: z,
      worldY: y + 0.12,
      type: 'floor'
    });

    // 2. 四角支柱
    const pillarOffsets = [
      { x: -1.9, z: -1.9 },
      { x: 1.9, z: -1.9 },
      { x: -1.9, z: 1.9 },
      { x: 1.9, z: 1.9 }
    ];
    pillarOffsets.forEach((offset, idx) => {
      const pillar = BABYLON.MeshBuilder.CreateBox("housePillar_" + idx, { width: 0.2, height: 3.2, depth: 0.2 }, this.scene);
      pillar.position.set(offset.x, 1.6, offset.z);
      pillar.parent = houseGroup;
      pillar.material = this.materials.wood;
      this.shadowCasters.push(pillar);
    });

    // 3. 墙体
    const wallMat = this.createFlatMaterial("houseWallMat", isChristmas ? 0x607d8b : 0xe0f2f1);

    // 后墙
    const backWall = BABYLON.MeshBuilder.CreateBox("houseBackWall", { width: 3.8, height: 3.2, depth: 0.08 }, this.scene);
    backWall.position.set(0, 1.6, -1.9);
    backWall.parent = houseGroup;
    backWall.material = wallMat;
    this.shadowCasters.push(backWall);

    // 左墙
    const leftWall = BABYLON.MeshBuilder.CreateBox("houseLeftWall", { width: 0.08, height: 3.2, depth: 3.8 }, this.scene);
    leftWall.position.set(-1.9, 1.6, 0);
    leftWall.parent = houseGroup;
    leftWall.material = wallMat;
    this.shadowCasters.push(leftWall);

    // 右墙
    const rightWall = BABYLON.MeshBuilder.CreateBox("houseRightWall", { width: 0.08, height: 3.2, depth: 3.8 }, this.scene);
    rightWall.position.set(1.9, 1.6, 0);
    rightWall.parent = houseGroup;
    rightWall.material = wallMat;
    this.shadowCasters.push(rightWall);

    // 前墙（左、右、顶门梁）
    const frontWallLeft = BABYLON.MeshBuilder.CreateBox("houseFrontWallL", { width: 1.3, height: 3.2, depth: 0.08 }, this.scene);
    frontWallLeft.position.set(-1.25, 1.6, 1.9);
    frontWallLeft.parent = houseGroup;
    frontWallLeft.material = wallMat;
    this.shadowCasters.push(frontWallLeft);

    const frontWallRight = BABYLON.MeshBuilder.CreateBox("houseFrontWallR", { width: 1.3, height: 3.2, depth: 0.08 }, this.scene);
    frontWallRight.position.set(1.25, 1.6, 1.9);
    frontWallRight.parent = houseGroup;
    frontWallRight.material = wallMat;
    this.shadowCasters.push(frontWallRight);

    const frontWallTop = BABYLON.MeshBuilder.CreateBox("houseFrontWallT", { width: 1.2, height: 1.0, depth: 0.08 }, this.scene);
    frontWallTop.position.set(0, 2.7, 1.9);
    frontWallTop.parent = houseGroup;
    frontWallTop.material = wallMat;
    this.shadowCasters.push(frontWallTop);

    // 3.5. 山墙 (屋顶下前后面三角挡板)
    // 在 Babylon.js 中可以通过 PolygonMeshBuilder，但既然是 Low-poly，直接拼一个倾斜旋转的 Box，或者拼成两个小三角也可以。
    // 为了极致性能与平滑兼容，我们可以使用极薄的 Cylinder（tessellation: 3）来模拟等腰三角形，极其精简！
    // 等腰三角形底宽 3.8，高 0.95（在 y = 3.2 到 4.15）。
    // 在这里我们用极其巧妙的几何拼法：用一个 Cylinder 压扁旋转成三角形，或者用一个极扁的 Box 旋转对切。
    // 其实我们也可以用 Babylon.js 的 PolygonMeshBuilder，但它需要引入 earcut 依赖，可能会报未定义错误。
    // 为了完全无依赖并且纯粹，我们可以直接用一个极扁的 Cylinder (tessellation=3，三棱柱) 来作为三角山墙！
    // 一个三棱柱：diameter: 2.2(高度 scale 调整), height: 0.08.
    // 让我们用一个三棱柱来作山墙：
    const createGable = (name) => {
      const gable = BABYLON.MeshBuilder.CreateCylinder(name, {
        diameterTop: 0,
        diameterBottom: 2.2, // 旋转缩放后拼凑
        height: 0.08,
        tessellation: 3
      }, this.scene);
      gable.rotation.x = Math.PI / 2; // 平铺
      gable.rotation.z = Math.PI;     // 尖端朝上
      gable.scaling.set(1.8, 1.0, 0.9); // 调整等腰三角形的长宽比以契合屋顶
      gable.position.y = 3.65;
      return gable;
    };

    const frontGable = createGable("frontGable");
    frontGable.position.z = 1.9 - 0.04;
    frontGable.parent = houseGroup;
    frontGable.material = wallMat;
    this.shadowCasters.push(frontGable);

    const backGable = createGable("backGable");
    backGable.position.z = -1.9 + 0.04;
    backGable.parent = houseGroup;
    backGable.material = wallMat;
    this.shadowCasters.push(backGable);

    // 4. 双坡斜屋顶 (A-frame)
    const roofColor = isChristmas ? 0xd50000 : 0xff7043;
    const roofMat = this.createFlatMaterial("houseRoofMat", roofColor);

    const roofL = BABYLON.MeshBuilder.CreateBox("houseRoofL", { width: 2.5, height: 0.08, depth: 4.0 }, this.scene);
    roofL.position.set(-1.05, 3.68, 0); 
    roofL.rotation.z = 0.48;
    roofL.parent = houseGroup;
    roofL.material = roofMat;
    this.shadowCasters.push(roofL);

    const roofR = BABYLON.MeshBuilder.CreateBox("houseRoofR", { width: 2.5, height: 0.08, depth: 4.0 }, this.scene);
    roofR.position.set(1.05, 3.68, 0);
    roofR.rotation.z = -0.48;
    roofR.parent = houseGroup;
    roofR.material = roofMat;
    this.shadowCasters.push(roofR);

    // 5. 门口挂牌
    const signBoard = BABYLON.MeshBuilder.CreateBox("houseSignBoard", { width: 0.7, height: 0.22, depth: 0.03 }, this.scene);
    signBoard.position.set(0, 2.4, 1.92);
    signBoard.parent = houseGroup;
    signBoard.material = this.materials.wood;

    const signTextMat = this.createFlatMaterial("houseSignTextMat", 0x4caf50);
    const signText = BABYLON.MeshBuilder.CreateBox("houseSignText", { width: 0.4, height: 0.08, depth: 0.04 }, this.scene);
    signText.position.set(0, 2.4, 1.94);
    signText.parent = houseGroup;
    signText.material = signTextMat;

    // 注册进入木屋传送感应区
    this.interactables.push({
      id: 'enter_house',
      name: '进入房子',
      x: x,
      y: y + 0.12,
      z: z + 1.9, 
      triggerRadius: 1.5
    });
  }

  createSummerDecorations() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    this.swimRings = []; 

    if (isChristmas) {
      // 圣诞冰山浮游物
      const iceMat = this.createFlatMaterial("icebergMat", 0xf5f5f5);
      
      const ice1 = BABYLON.MeshBuilder.CreateBox("iceberg1", { width: 0.8, height: 0.38, depth: 0.8 }, this.scene);
      ice1.position.set(13.0, 0.18, 13.0);
      ice1.parent = this.group;
      ice1.material = iceMat;
      this.shadowCasters.push(ice1);
      this.swimRings.push({ mesh: ice1, baseX: 13.0, baseZ: 13.0, phase: 0 });

      const ice2 = BABYLON.MeshBuilder.CreateBox("iceberg2", { width: 0.8, height: 0.38, depth: 0.8 }, this.scene);
      ice2.position.set(-13.0, 0.18, 12.0);
      ice2.parent = this.group;
      ice2.material = iceMat;
      this.shadowCasters.push(ice2);
      this.swimRings.push({ mesh: ice2, baseX: -13.0, baseZ: 12.0, phase: Math.PI });
    } else {
      // 夏日漂浮救生圈
      const ringMat1 = this.createFlatMaterial("swimRingMat1", 0xff4081);
      const ringMat2 = this.createFlatMaterial("swimRingMat2", 0xffeb3b);

      const ringOnBeach = BABYLON.MeshBuilder.CreateTorus("ringBeach", { diameter: 0.6, thickness: 0.16, tessellation: 12 }, this.scene);
      ringOnBeach.position.set(-2.2, 0.62, -2.5);
      ringOnBeach.rotation.set(0.1, 0, 0.15);
      ringOnBeach.parent = this.group;
      ringOnBeach.material = ringMat1;
      this.shadowCasters.push(ringOnBeach);

      const ringInOcean1 = BABYLON.MeshBuilder.CreateTorus("ringOcean1", { diameter: 0.6, thickness: 0.16, tessellation: 12 }, this.scene);
      ringInOcean1.position.set(13.0, 0.18, 13.0);
      ringInOcean1.parent = this.group;
      ringInOcean1.material = ringMat2;
      this.swimRings.push({ mesh: ringInOcean1, baseX: 13.0, baseZ: 13.0, phase: 0 });

      const ringInOcean2 = BABYLON.MeshBuilder.CreateTorus("ringOcean2", { diameter: 0.6, thickness: 0.16, tessellation: 12 }, this.scene);
      ringInOcean2.position.set(-13.0, 0.18, 12.0);
      ringInOcean2.parent = this.group;
      ringInOcean2.material = ringMat1;
      this.swimRings.push({ mesh: ringInOcean2, baseX: -13.0, baseZ: 12.0, phase: Math.PI });
    }

    // 漂浮气球组
    const balGroup = new BABYLON.TransformNode("balloonsGroup", this.scene);
    balGroup.position.set(2.4, 0, -2.4); 
    balGroup.parent = this.group;

    const colors = isChristmas ? [0xff5252, 0x4caf50, 0xffeb3b] : [0xff5252, 0x40c4ff, 0xffeb3b]; 

    for (let i = 0; i < 3; i++) {
      const balMat = this.createFlatMaterial("balloonMat_" + i, colors[i]);
      
      const balloon = BABYLON.MeshBuilder.CreateSphere("balloonSphere", { diameter: 0.36, segments: 6 }, this.scene);
      balloon.scaling.set(1, 1.25, 1); // 气球微椭圆
      
      const angle = (i / 3) * Math.PI * 2;
      const bx = Math.cos(angle) * 0.22;
      const bz = Math.sin(angle) * 0.22;
      const by = 1.3 + Math.random() * 0.25;

      balloon.position.set(bx, by, bz);
      balloon.rotation.z = (Math.random() - 0.5) * 0.2;
      balloon.parent = balGroup;
      balloon.material = balMat;
      this.shadowCasters.push(balloon);

      // 气球牵线
      const rope = BABYLON.MeshBuilder.CreateCylinder("balloonRope", { diameterTop: 0.01, diameterBottom: 0.01, height: 0.8, tessellation: 4 }, this.scene);
      rope.position.set(bx / 2, by - 0.4, bz / 2);
      
      // 让吊绳对齐牵引方向
      rope.parent = balGroup;
      rope.lookAt(new BABYLON.Vector3(bx, by, bz));
      rope.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.LOCAL);
      rope.material = this.materials.stone;
    }
    this.balloons = balGroup; 
  }

  createStreetlamps() {
    this.streetlights = [];
    
    // 彩色霓虹路灯：小木屋旁粉色，街机旁青色，秋千旁绿色
    this.createStreetlamp(-8.0, -4.0, 0xff007f); 
    this.createStreetlamp(-4.0, -11.0, 0x00f5ff); 
    this.createStreetlamp(2.0, 4.0, 0x39ff14); 

    // 创建节日仙女彩灯灯串
    this.createFairyLightsDecoration();
  }

  createStreetlamp(x, z, colorHex = 0xffeb3b) {
    const lampGroup = new BABYLON.TransformNode("streetlamp", this.scene);
    lampGroup.position.set(x, 0.6, z);
    lampGroup.parent = this.group;

    // 1. 木质立柱杆
    const post = BABYLON.MeshBuilder.CreateCylinder("lampPost", { diameterTop: 0.12, diameterBottom: 0.16, height: 2.2, tessellation: 4 }, this.scene);
    post.position.y = 1.1;
    post.parent = lampGroup;
    post.material = this.materials.wood;
    this.shadowCasters.push(post);

    // 2. 彩色发光悬挂横臂
    const hangerMat = new BABYLON.StandardMaterial("lampHangerMat", this.scene);
    hangerMat.diffuseColor = convertColor(colorHex);
    hangerMat.emissiveColor = convertColor(colorHex);
    hangerMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const hanger = BABYLON.MeshBuilder.CreateBox("lampHanger", { width: 0.4, height: 0.06, depth: 0.06 }, this.scene);
    hanger.position.set(0.18, 2.1, 0);
    hanger.parent = lampGroup;
    hanger.material = hangerMat;

    // 3. 灯罩
    const shade = BABYLON.MeshBuilder.CreateCylinder("lampShade", { diameterTop: 0.2, diameterBottom: 0.32, height: 0.28, tessellation: 5 }, this.scene);
    shade.position.set(0.36, 1.9, 0);
    shade.parent = lampGroup;
    shade.material = this.materials.arcadeBody;
    this.shadowCasters.push(shade);

    // 4. 灯泡
    const bulb = BABYLON.MeshBuilder.CreateSphere("lampBulb", { diameter: 0.16, segments: 5 }, this.scene);
    bulb.position.set(0.36, 1.76, 0);
    bulb.parent = lampGroup;
    bulb.material = hangerMat;

    // 5. 点光源 PointLight (初始 0 亮度，动态在 update 中昼夜渐变)
    const light = new BABYLON.PointLight("lampLight", new BABYLON.Vector3(x + 0.36, 2.3, z), this.scene);
    light.diffuse = convertColor(colorHex);
    light.specular = new BABYLON.Color3(0, 0, 0);
    light.intensity = 0.0;
    light.range = 9;
    this.streetlights.push(light);
  }

  createFairyLightString(p1, p2, bulbCount = 12, sag = 0.4) {
    const colors = [0xff0055, 0x00f5ff, 0x39ff14, 0xffeb3b, 0xbd00ff, 0xff9100];
    
    // 利用 CatmullRom 曲线生成悬挂灯丝线段
    const points = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = p1.x + (p2.x - p1.x) * t;
      const z = p1.z + (p2.z - p1.z) * t;
      const y = p1.y + (p2.y - p1.y) * t - sag * Math.sin(t * Math.PI);
      points.push(new BABYLON.Vector3(x, y, z));
    }
    
    const spline = BABYLON.Curve3.CreateCatmullRomSpline(points, 20);
    const splinePoints = spline.getPoints();

    const wire = BABYLON.MeshBuilder.CreateTube("fairyWire", {
      path: splinePoints,
      radius: 0.012,
      tessellation: 4,
      updatable: false
    }, this.scene);
    wire.parent = this.group;

    const wireMat = new BABYLON.StandardMaterial("wireMat", this.scene);
    wireMat.diffuseColor = new BABYLON.Color3(0.13, 0.13, 0.13);
    wireMat.specularColor = new BABYLON.Color3(0, 0, 0);
    wire.material = wireMat;

    // 沿灯线悬挂自发光小彩灯泡
    const bulbGeo = { diameter: 0.12, segments: 5 };
    
    for (let i = 0; i < bulbCount; i++) {
      const t = (i + 0.5) / bulbCount;
      const idx = Math.min(Math.floor(t * splinePoints.length), splinePoints.length - 1);
      const pos = splinePoints[idx];
      const color = colors[i % colors.length];
      
      const bulbMat = new BABYLON.StandardMaterial("fairyBulbMat_" + i, this.scene);
      bulbMat.diffuseColor = convertColor(color);
      bulbMat.emissiveColor = convertColor(color);
      bulbMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const bulbMesh = BABYLON.MeshBuilder.CreateSphere("fairyBulb", bulbGeo, this.scene);
      bulbMesh.position.copyFrom(pos);
      bulbMesh.parent = this.group;
      bulbMesh.material = bulbMat;

      // 隔 3 个灯泡绑定一个真实的微弱点光源，增强夜间照明拟真感
      if (i % 3 === 1) {
        const pLight = new BABYLON.PointLight("fairyLight_" + i, pos, this.scene);
        pLight.diffuse = convertColor(color);
        pLight.specular = new BABYLON.Color3(0, 0, 0);
        pLight.intensity = 0.0;
        pLight.range = 4;
        pLight.metadata = { maxIntensity: 0.85 }; // 借用 metadata 记录最大强度
        this.streetlights.push(pLight);
      }
    }
  }

  createFairyLightsDecoration() {
    // 灯串 1：悬挂在小木屋门口两侧立柱上方
    this.createFairyLightString(
      new BABYLON.Vector3(-11.9, 3.8, -7.1),
      new BABYLON.Vector3(-8.1, 3.8, -7.1),
      10, 
      0.35 
    );

    // 灯串 2：从小木屋檐右前角斜拉到木屋路灯顶端
    this.createFairyLightString(
      new BABYLON.Vector3(-8.1, 3.65, -6.9),
      new BABYLON.Vector3(-8.0, 2.8, -4.0),
      12, 
      0.5 
    );

    // 灯串 3：悬挂在秋千横梁下方
    this.createFairyLightString(
      new BABYLON.Vector3(3.5, 2.65, 6.0),
      new BABYLON.Vector3(5.5, 2.65, 6.0),
      8, 
      0.25 
    );
  }

  createPaimon(x, z) {
    const paimonGroup = new BABYLON.TransformNode("paimon", this.scene);
    paimonGroup.position.set(x, 1.25, z); // 悬浮高 Y = 1.25
    paimonGroup.parent = this.group;

    // 1. 头
    const headMat = this.createFlatMaterial("paimonHeadMat", 0xffe0b2);
    const head = BABYLON.MeshBuilder.CreateSphere("paimonHead", { diameter: 0.36, segments: 8 }, this.scene);
    head.position.y = 0.18;
    head.parent = paimonGroup;
    head.material = headMat;
    this.shadowCasters.push(head);

    // 2. 头发 (奶油白)
    const hairMat = this.createFlatMaterial("paimonHairMat", 0xfffcf0);
    const hairTop = BABYLON.MeshBuilder.CreateSphere("paimonHairTop", { diameter: 0.4, segments: 6 }, this.scene);
    hairTop.position.set(0, 0.22, -0.02);
    hairTop.parent = paimonGroup;
    hairTop.material = hairMat;

    // 经典双马尾
    const pigtailL = BABYLON.MeshBuilder.CreateCylinder("pigtailL", { diameterTop: 0, diameterBottom: 0.12, height: 0.25, tessellation: 4 }, this.scene);
    pigtailL.position.set(-0.16, 0.08, -0.04);
    pigtailL.rotation.set(Math.PI / 6, 0, 0.3);
    pigtailL.parent = paimonGroup;
    pigtailL.material = hairMat;
    this.shadowCasters.push(pigtailL);

    const pigtailR = BABYLON.MeshBuilder.CreateCylinder("pigtailR", { diameterTop: 0, diameterBottom: 0.12, height: 0.25, tessellation: 4 }, this.scene);
    pigtailR.position.set(0.16, 0.08, -0.04);
    pigtailR.rotation.set(Math.PI / 6, 0, -0.3);
    pigtailR.parent = paimonGroup;
    pigtailR.material = hairMat;
    this.shadowCasters.push(pigtailR);

    // 3. 头饰黑皇冠
    const crownMat = new BABYLON.StandardMaterial("paimonCrownMat", this.scene);
    crownMat.diffuseColor = convertColor(0x1a1a1a);
    crownMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const crown = BABYLON.MeshBuilder.CreateCylinder("paimonCrown", { diameterTop: 0.16, diameterBottom: 0.2, height: 0.05, tessellation: 5 }, this.scene);
    crown.position.y = 0.36;
    crown.parent = paimonGroup;
    crown.material = crownMat;

    // 4. 身体 (白金连身裙，倒锥体)
    const bodyMat = this.createFlatMaterial("paimonBodyMat", 0xffffff);
    const body = BABYLON.MeshBuilder.CreateCylinder("paimonBody", { diameterTop: 0.24, diameterBottom: 0, height: 0.32, tessellation: 5 }, this.scene);
    body.position.y = -0.08;
    body.rotation.x = Math.PI; // 倒转
    body.parent = paimonGroup;
    body.material = bodyMat;
    this.shadowCasters.push(body);

    // 领口小领结
    const ribbonMat = new BABYLON.StandardMaterial("paimonRibbonMat", this.scene);
    ribbonMat.diffuseColor = convertColor(0x0d47a1);
    ribbonMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const ribbon = BABYLON.MeshBuilder.CreateBox("paimonRibbon", { width: 0.14, height: 0.04, depth: 0.04 }, this.scene);
    ribbon.position.set(0, 0.06, 0.1);
    ribbon.parent = paimonGroup;
    ribbon.material = ribbonMat;

    // 背部深色小披风
    const capeMat = this.createFlatMaterial("paimonCapeMat", 0x263238);
    const cape = BABYLON.MeshBuilder.CreateBox("paimonCape", { width: 0.24, height: 0.35, depth: 0.04 }, this.scene);
    cape.position.set(0, -0.1, -0.1);
    cape.rotation.x = 0.1;
    cape.parent = paimonGroup;
    cape.material = capeMat;

    this.paimon = paimonGroup;

    // 注册派蒙对话交互区
    this.interactables.push({
      id: 'paimon',
      name: '派蒙 (打开菜单)',
      x: x,
      y: 0.6,
      z: z,
      triggerRadius: 2.2
    });
  }

  createLakePortal(x, y, z) {
    const portalGroup = new BABYLON.TransformNode("lakePortal", this.scene);
    portalGroup.position.set(x, y, z);
    portalGroup.parent = this.group;

    const stoneMat = this.createFlatMaterial("portalStoneMat", 0xb0bec5);

    // 下层大底盆
    const bottomBasin = BABYLON.MeshBuilder.CreateCylinder("lakePortalBottom", { diameterTop: 1.8, diameterBottom: 2.0, height: 0.22, tessellation: 12 }, this.scene);
    bottomBasin.position.y = 0.11;
    bottomBasin.parent = portalGroup;
    bottomBasin.material = stoneMat;
    bottomBasin.receiveShadows = true;
    this.shadowCasters.push(bottomBasin);

    // 上层水盆
    const topBasin = BABYLON.MeshBuilder.CreateCylinder("lakePortalTop", { diameterTop: 1.5, diameterBottom: 1.3, height: 0.35, tessellation: 12 }, this.scene);
    topBasin.position.y = 0.38;
    topBasin.parent = portalGroup;
    topBasin.material = stoneMat;
    topBasin.receiveShadows = true;
    this.shadowCasters.push(topBasin);

    // 传送盆内积水
    const poolWaterMat = new BABYLON.StandardMaterial("lakePortalWaterMat", this.scene);
    poolWaterMat.diffuseColor = convertColor(0x00b0ff);
    poolWaterMat.alpha = 0.65;
    poolWaterMat.backFaceCulling = false;
    poolWaterMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const poolWater = BABYLON.MeshBuilder.CreateDisc("lakePortalWater", { radius: 0.7, tessellation: 12 }, this.scene);
    poolWater.rotation.x = Math.PI / 2;
    poolWater.position.y = 0.54;
    poolWater.parent = portalGroup;
    poolWater.material = poolWaterMat;

    // 涌泉水柱
    const waterSpoutMat = new BABYLON.StandardMaterial("lakePortalSpoutMat", this.scene);
    waterSpoutMat.diffuseColor = convertColor(0xe0f7fa);
    waterSpoutMat.alpha = 0.82;
    waterSpoutMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const waterSpout = BABYLON.MeshBuilder.CreateCylinder("lakePortalSpout", { diameterTop: 0.16, diameterBottom: 0.32, height: 0.9, tessellation: 8 }, this.scene);
    waterSpout.position.y = 0.95;
    waterSpout.parent = portalGroup;
    waterSpout.material = waterSpoutMat;

    // 飞溅的水滴 Low-poly 颗粒
    const particleMat = new BABYLON.StandardMaterial("spoutParticleMat", this.scene);
    particleMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    particleMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const p1 = BABYLON.MeshBuilder.CreateBox("drop1", { width: 0.08, height: 0.08, depth: 0.08 }, this.scene);
    p1.position.set(0.12, 1.35, 0.08);
    p1.parent = portalGroup;
    p1.material = particleMat;

    const p2 = p1.clone("drop2");
    p2.position.set(-0.14, 1.4, -0.1);
    p2.parent = portalGroup;

    const p3 = p1.clone("drop3");
    p3.position.set(0.05, 1.25, -0.15);
    p3.parent = portalGroup;

    // 治愈系木制指示牌 (前往云顶天池)
    const signPost = BABYLON.MeshBuilder.CreateCylinder("lakeSignPost", { diameterTop: 0.06, diameterBottom: 0.06, height: 0.8, tessellation: 8 }, this.scene);
    signPost.position.set(1.0, 0.4, 0.4);
    signPost.rotation.z = 0.15;
    signPost.parent = portalGroup;
    signPost.material = this.createFlatMaterial("signWood1Mat", 0x4e342e);
    this.shadowCasters.push(signPost);

    const signBoard = BABYLON.MeshBuilder.CreateBox("lakeSignBoard", { width: 0.55, height: 0.16, depth: 0.03 }, this.scene);
    signBoard.position.set(1.05, 0.72, 0.4);
    signBoard.rotation.set(0, 0.2, 0.15);
    signBoard.parent = portalGroup;
    signBoard.material = this.createFlatMaterial("signWood2Mat", 0x8d6e63);
    this.shadowCasters.push(signBoard);

    // 蓝色指示发光条
    const signTextMat = new BABYLON.StandardMaterial("lakeSignTextMat", this.scene);
    signTextMat.diffuseColor = convertColor(0x00e5ff);
    signTextMat.emissiveColor = convertColor(0x00e5ff);
    signTextMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const signText = BABYLON.MeshBuilder.CreateBox("lakeSignText", { width: 0.38, height: 0.06, depth: 0.04 }, this.scene);
    signText.position.set(1.04, 0.72, 0.42);
    signText.rotation.set(0, 0.2, 0.15);
    signText.parent = portalGroup;
    signText.material = signTextMat;

    this.interactables.push({
      id: 'enter_lake',
      name: '前往云顶天池',
      x: x,
      y: y,
      z: z,
      triggerRadius: 1.8
    });
  }

  createCastlePortal(x, y, z) {
    const portalGroup = new BABYLON.TransformNode("castlePortal", this.scene);
    portalGroup.position.set(x, y, z);
    portalGroup.parent = this.group;

    const stoneMat = this.createFlatMaterial("castlePortalStoneMat", 0xffccd5); // 梦幻樱花粉底座

    // 下层大底盆
    const bottomBasin = BABYLON.MeshBuilder.CreateCylinder("castlePortalBottom", { diameterTop: 1.8, diameterBottom: 2.0, height: 0.22, tessellation: 12 }, this.scene);
    bottomBasin.position.y = 0.11;
    bottomBasin.parent = portalGroup;
    bottomBasin.material = stoneMat;
    bottomBasin.receiveShadows = true;
    this.shadowCasters.push(bottomBasin);

    // 上层水盆
    const topBasin = BABYLON.MeshBuilder.CreateCylinder("castlePortalTop", { diameterTop: 1.5, diameterBottom: 1.3, height: 0.35, tessellation: 12 }, this.scene);
    topBasin.position.y = 0.38;
    topBasin.parent = portalGroup;
    topBasin.material = stoneMat;
    topBasin.receiveShadows = true;
    this.shadowCasters.push(topBasin);

    // 传送盆内积水 (治愈粉红色)
    const poolWaterMat = new BABYLON.StandardMaterial("castlePortalWaterMat", this.scene);
    poolWaterMat.diffuseColor = convertColor(0xff6b8b);
    poolWaterMat.alpha = 0.7;
    poolWaterMat.backFaceCulling = false;
    poolWaterMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const poolWater = BABYLON.MeshBuilder.CreateDisc("castlePortalWater", { radius: 0.7, tessellation: 12 }, this.scene);
    poolWater.rotation.x = Math.PI / 2;
    poolWater.position.y = 0.54;
    poolWater.parent = portalGroup;
    poolWater.material = poolWaterMat;

    // 涌泉水柱 (奶粉色)
    const waterSpoutMat = new BABYLON.StandardMaterial("castlePortalSpoutMat", this.scene);
    waterSpoutMat.diffuseColor = convertColor(0xfff0f3);
    waterSpoutMat.alpha = 0.85;
    waterSpoutMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const waterSpout = BABYLON.MeshBuilder.CreateCylinder("castlePortalSpout", { diameterTop: 0.16, diameterBottom: 0.32, height: 0.9, tessellation: 8 }, this.scene);
    waterSpout.position.y = 0.95;
    waterSpout.parent = portalGroup;
    waterSpout.material = waterSpoutMat;

    // 飞溅颗粒
    const particleMat = new BABYLON.StandardMaterial("castleSpoutParticleMat", this.scene);
    particleMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    particleMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const p1 = BABYLON.MeshBuilder.CreateBox("drop1", { width: 0.08, height: 0.08, depth: 0.08 }, this.scene);
    p1.position.set(0.12, 1.35, 0.08);
    p1.parent = portalGroup;
    p1.material = particleMat;

    const p2 = p1.clone("drop2");
    p2.position.set(-0.14, 1.4, -0.1);
    p2.parent = portalGroup;

    const p3 = p1.clone("drop3");
    p3.position.set(0.05, 1.25, -0.15);
    p3.parent = portalGroup;

    // 指示牌 (前往粉色庄园)
    const signPost = BABYLON.MeshBuilder.CreateCylinder("castleSignPost", { diameterTop: 0.06, diameterBottom: 0.06, height: 0.8, tessellation: 8 }, this.scene);
    signPost.position.set(1.0, 0.4, 0.4);
    signPost.rotation.z = 0.15;
    signPost.parent = portalGroup;
    signPost.material = this.createFlatMaterial("signWood1Mat_c", 0x5d4037);
    this.shadowCasters.push(signPost);

    const signBoard = BABYLON.MeshBuilder.CreateBox("castleSignBoard", { width: 0.55, height: 0.16, depth: 0.03 }, this.scene);
    signBoard.position.set(1.05, 0.72, 0.4);
    signBoard.rotation.set(0, 0.2, 0.15);
    signBoard.parent = portalGroup;
    signBoard.material = this.createFlatMaterial("signWood2Mat_c", 0xff8da1);
    this.shadowCasters.push(signBoard);

    // 粉色发光指示条
    const signTextMat = new BABYLON.StandardMaterial("castleSignTextMat", this.scene);
    signTextMat.diffuseColor = convertColor(0xff4081);
    signTextMat.emissiveColor = convertColor(0xff4081);
    signTextMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const signText = BABYLON.MeshBuilder.CreateBox("castleSignText", { width: 0.38, height: 0.06, depth: 0.04 }, this.scene);
    signText.position.set(1.04, 0.72, 0.42);
    signText.rotation.set(0, 0.2, 0.15);
    signText.parent = portalGroup;
    signText.material = signTextMat;

    this.interactables.push({
      id: 'enter_castle',
      name: '前往粉色庄园',
      x: x,
      y: y,
      z: z,
      triggerRadius: 1.8
    });
  }

  getShadowCasters() {
    return this.shadowCasters;
  }

  update(time, environment) {
    // 1. 秋千吊椅前后轻微晃动
    if (this.swingSeat) {
      this.swingSeat.rotation.x = Math.sin(time * 0.002) * 0.18;
    }

    // 2. 漂浮圈 / 冰山随波浪上下慢速浮沉与转动
    if (this.swimRings) {
      this.swimRings.forEach(ring => {
        ring.mesh.position.y = 0.18 + Math.sin(time * 0.0016 + ring.phase) * 0.04;
        ring.mesh.rotation.y = time * 0.0003 + ring.phase;
      });
    }

    // 3. 气球随风微微左右摆动
    if (this.balloons) {
      this.balloons.rotation.z = Math.sin(time * 0.0015) * 0.06;
      this.balloons.rotation.x = Math.cos(time * 0.001) * 0.04;
    }

    // 4. 夜间控制点光源发光亮度平滑过渡，篝火/火把有随机微小闪烁
    if (this.streetlights) {
      const targetIntensity = (environment && environment.isNight) ? 1.4 : 0.0;
      this.streetlights.forEach(light => {
        let currentTarget = targetIntensity;
        // 篝火与火炬的颜色是 0xff5722 / orange-red，在夜间有闪烁动画
        const isFire = (light.diffuse.r > 0.9 && light.diffuse.g < 0.4 && light.diffuse.b < 0.1); 
        
        if (isFire && environment && environment.isNight) {
          currentTarget = 1.4 + Math.sin(time * 0.02) * 0.25 + (Math.random() - 0.5) * 0.12;
        } else if (light.metadata && light.metadata.maxIntensity !== undefined) {
          // 彩灯串点光源
          currentTarget = (environment && environment.isNight) ? light.metadata.maxIntensity : 0.0;
        }
        light.intensity += (currentTarget - light.intensity) * 0.08;
      });
    }

    // 5. 派蒙慢速自转及浮沉
    if (this.paimon) {
      this.paimon.position.y = 1.25 + Math.sin(time * 0.0025) * 0.08;
      this.paimon.rotation.y = time * 0.0006;
    }
  }
}
