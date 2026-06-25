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

export class HouseGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.colliders = []; // 存储地板碰撞体
    this.interactables = []; // 存储交互点
    this.shadowCasters = []; // 阴影投射网格
    this.group = new BABYLON.TransformNode("houseGroup", this.scene);
    
    // 材质定义
    this.materials = {
      wood: this.createFlatMaterial("woodMat", 0x795548), // 深褐木
      woodLight: this.createFlatMaterial("woodLightMat", 0xd7ccc8), // 浅木
      wall: this.createFlatMaterial("wallMat", 0xfafafa), // 暖白墙
      wallTrim: this.createFlatMaterial("wallTrimMat", 0xefebe9),
      
      glass: (() => {
        const mat = new BABYLON.StandardMaterial("glassMat", this.scene);
        mat.diffuseColor = convertColor(0xe0f7fa);
        mat.alpha = 0.25;
        mat.backFaceCulling = false;
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),
      
      leaves: this.createFlatMaterial("leavesMat", 0x43a047), // 绿叶
      coconut: this.createFlatMaterial("coconutMat", 0x3e2723), // 椰果深褐
      carpet: this.createFlatMaterial("carpetMat", 0xffecb3), // 暖黄地毯
      sofaBody: this.createFlatMaterial("sofaBodyMat", 0xbbd6fb), // 淡蓝沙发身
      sofaCushion: this.createFlatMaterial("sofaCushionMat", 0xe3f2fd), // 浅蓝坐垫
      metalGold: this.createFlatMaterial("metalGoldMat", 0xffca28), // 金色金属
      white: this.createFlatMaterial("whiteMat", 0xffffff),
      
      paintingSun: (() => {
        const mat = new BABYLON.StandardMaterial("paintingSunMat", this.scene);
        mat.diffuseColor = convertColor(0xffeb3b);
        mat.emissiveColor = convertColor(0xffeb3b);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),
      
      paintingArt: (() => {
        const mat = new BABYLON.StandardMaterial("paintingArtMat", this.scene);
        mat.diffuseColor = convertColor(0xff7043);
        mat.emissiveColor = convertColor(0xff7043);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        return mat;
      })(),
      
      bedSpread: this.createFlatMaterial("bedSpreadMat", 0xff8a80) // 粉红床单
    };

    this.buildHouseMap();
  }

  createFlatMaterial(name, colorHex) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = convertColor(colorHex);
    mat.specularColor = new BABYLON.Color3(0, 0, 0); // Lambert 扁平风格
    mat.flatShading = true;
    return mat;
  }

  buildHouseMap() {
    // 1. 大型木质地板拼块 (24.0 x 0.12 x 24.0)
    const floorMesh = BABYLON.MeshBuilder.CreateBox("houseFloor", { width: 24.0, height: 0.12, depth: 24.0 }, this.scene);
    floorMesh.position.y = 0.06;
    floorMesh.parent = this.group;
    floorMesh.receiveShadows = true;
    floorMesh.material = this.materials.woodLight;
    this.shadowCasters.push(floorMesh);

    // 注册地板碰撞区 (物理表面在 Y = 0.12)
    this.colliders.push({
      mesh: floorMesh,
      radius: 16.0,
      worldX: 0,
      worldZ: 0,
      worldY: 0.12,
      type: 'floor'
    });

    // 2. 四角柱支架 (0.4 x 5.5 x 0.4)
    const pillarOffsets = [
      { x: -11.8, z: -11.8 },
      { x: 11.8, z: -11.8 },
      { x: -11.8, z: 11.8 },
      { x: 11.8, z: 11.8 }
    ];
    pillarOffsets.forEach((offset, idx) => {
      const pillar = BABYLON.MeshBuilder.CreateBox("pillar_" + idx, { width: 0.4, height: 5.5, depth: 0.4 }, this.scene);
      pillar.position.set(offset.x, 2.75, offset.z);
      pillar.parent = this.group;
      pillar.material = this.materials.wood;
      this.shadowCasters.push(pillar);
    });

    // 3. 装饰用天花板横梁架
    for (let i = -10; i <= 10; i += 5) {
      const beam = BABYLON.MeshBuilder.CreateBox("ceilingBeam", { width: 23.6, height: 0.15, depth: 0.25 }, this.scene);
      beam.position.set(0, 5.4, i);
      beam.parent = this.group;
      beam.material = this.materials.wood;
      this.shadowCasters.push(beam);
    }

    // 4. 墙体
    // 后墙
    const backWall = BABYLON.MeshBuilder.CreateBox("wallBack", { width: 23.6, height: 5.5, depth: 0.1 }, this.scene);
    backWall.position.set(0, 2.75, -11.8);
    backWall.parent = this.group;
    backWall.receiveShadows = true;
    backWall.material = this.materials.wall;
    this.shadowCasters.push(backWall);

    // 右墙
    const rightWall = BABYLON.MeshBuilder.CreateBox("wallRight", { width: 0.1, height: 5.5, depth: 23.6 }, this.scene);
    rightWall.position.set(11.8, 2.75, 0);
    rightWall.parent = this.group;
    rightWall.receiveShadows = true;
    rightWall.material = this.materials.wall;
    this.shadowCasters.push(rightWall);

    // 左墙（带大窗户开口，Z 轴从 -6 到 +6）
    const leftWallBack = BABYLON.MeshBuilder.CreateBox("wallLeftBack", { width: 0.1, height: 5.5, depth: 5.8 }, this.scene);
    leftWallBack.position.set(-11.8, 2.75, -8.9);
    leftWallBack.parent = this.group;
    leftWallBack.material = this.materials.wall;
    this.shadowCasters.push(leftWallBack);

    const leftWallFront = BABYLON.MeshBuilder.CreateBox("wallLeftFront", { width: 0.1, height: 5.5, depth: 5.8 }, this.scene);
    leftWallFront.position.set(-11.8, 2.75, 8.9);
    leftWallFront.parent = this.group;
    leftWallFront.material = this.materials.wall;
    this.shadowCasters.push(leftWallFront);

    const leftWallBottom = BABYLON.MeshBuilder.CreateBox("wallLeftBottom", { width: 0.1, height: 1.6, depth: 12.0 }, this.scene);
    leftWallBottom.position.set(-11.8, 0.8, 0);
    leftWallBottom.parent = this.group;
    leftWallBottom.material = this.materials.wall;
    this.shadowCasters.push(leftWallBottom);

    const leftWallTop = BABYLON.MeshBuilder.CreateBox("wallLeftTop", { width: 0.1, height: 1.4, depth: 12.0 }, this.scene);
    leftWallTop.position.set(-11.8, 4.8, 0);
    leftWallTop.parent = this.group;
    leftWallTop.material = this.materials.wall;
    this.shadowCasters.push(leftWallTop);

    // 落地窗淡蓝色玻璃
    const windowGlass = BABYLON.MeshBuilder.CreateBox("windowGlass", { width: 0.04, height: 2.4, depth: 12.0 }, this.scene);
    windowGlass.position.set(-11.8, 2.8, 0);
    windowGlass.parent = this.group;
    windowGlass.material = this.materials.glass;

    // 前墙（留出中间 X 从 -1.2 到 1.2 的门洞）
    const frontWallLeft = BABYLON.MeshBuilder.CreateBox("wallFrontL", { width: 10.6, height: 5.5, depth: 0.1 }, this.scene);
    frontWallLeft.position.set(-6.5, 2.75, 11.8);
    frontWallLeft.parent = this.group;
    frontWallLeft.material = this.materials.wall;
    this.shadowCasters.push(frontWallLeft);

    const frontWallRight = BABYLON.MeshBuilder.CreateBox("wallFrontR", { width: 10.6, height: 5.5, depth: 0.1 }, this.scene);
    frontWallRight.position.set(6.5, 2.75, 11.8);
    frontWallRight.parent = this.group;
    frontWallRight.material = this.materials.wall;
    this.shadowCasters.push(frontWallRight);

    const frontWallTop = BABYLON.MeshBuilder.CreateBox("wallFrontT", { width: 2.4, height: 2.5, depth: 0.1 }, this.scene);
    frontWallTop.position.set(0, 4.25, 11.8);
    frontWallTop.parent = this.group;
    frontWallTop.material = this.materials.wall;
    this.shadowCasters.push(frontWallTop);

    // 门口木框与招牌板
    const doorFrame = BABYLON.MeshBuilder.CreateBox("doorFrame", { width: 2.5, height: 3.1, depth: 0.2 }, this.scene);
    doorFrame.position.set(0, 1.5, 11.8);
    doorFrame.parent = this.group;
    doorFrame.material = this.materials.wood;

    const signBoard = BABYLON.MeshBuilder.CreateBox("doorSignBoard", { width: 1.3, height: 0.35, depth: 0.05 }, this.scene);
    signBoard.position.set(0, 3.25, 11.68);
    signBoard.parent = this.group;
    signBoard.material = this.materials.wood;
    this.shadowCasters.push(signBoard);

    const signTextMat = this.createFlatMaterial("doorSignTextMat", 0xff5252);
    const signText = BABYLON.MeshBuilder.CreateBox("doorSignText", { width: 0.8, height: 0.12, depth: 0.06 }, this.scene);
    signText.position.set(0, 3.25, 11.7);
    signText.parent = this.group;
    signText.material = signTextMat;

    // 注册返回大厅的传送区
    this.interactables.push({
      id: 'exit_house',
      name: '离开房子',
      x: 0,
      y: 0.12,
      z: 11.2,
      triggerRadius: 1.6
    });

    // 5. 温馨大双人床 (交互点：后左侧)
    this.createBed(-8.0, -7.0);

    // 6. 写生画架 (交互点：后右侧)
    this.createEasel(8.0, -8.0);

    // 7. 衣柜与换装镜 (右侧墙壁处)
    this.createWardrobe(11.0, 0);

    // 8. 双人沙发和茶几 (中左区域)
    this.createSofaLounge(0, -2.0);

    // 9. 临窗书桌椅及花瓶 (靠落地窗)
    this.createDiningTable(-10.5, 0);

    // 10. 盆栽琴叶榕 (左前角)
    this.createMonstera(-9.5, 9.5);

    // 11. 地毯 (中前区圆形装饰)
    const carpet = BABYLON.MeshBuilder.CreateCylinder("centerCarpet", { diameterTop: 8.0, diameterBottom: 8.0, height: 0.01, tessellation: 24 }, this.scene);
    carpet.position.set(0, 0.125, 3.0);
    carpet.parent = this.group;
    carpet.receiveShadows = true;
    carpet.material = this.materials.carpet;

    // 12. 挂墙夕阳画 (居中挂在后墙上)
    this.createSunsetPainting(0, -11.73);

    // 13. 保留开发空地 (右前侧)
    this.createReservedSpot(8.5, 8.5);

    // 14. 吊灯
    this.createCeilingLight();

    // 15. 窗外微缩浮岛背景
    this.createWindowScenery();

    // 16. 沙发旁的温馨落地灯
    this.createFloorLamp(1.8, -3.2);
  }

  createBed(x, z) {
    const bedGroup = new BABYLON.TransformNode("bedGroup", this.scene);
    bedGroup.position.set(x, 0.12, z);
    bedGroup.parent = this.group;

    const bedFrame = BABYLON.MeshBuilder.CreateBox("bedFrame", { width: 2.6, height: 0.32, depth: 3.0 }, this.scene);
    bedFrame.parent = bedGroup;
    bedFrame.material = this.materials.wood;
    this.shadowCasters.push(bedFrame);

    const mattress = BABYLON.MeshBuilder.CreateBox("mattress", { width: 2.4, height: 0.28, depth: 2.8 }, this.scene);
    mattress.position.y = 0.24;
    mattress.parent = bedGroup;
    mattress.material = this.materials.white;

    const blanket = BABYLON.MeshBuilder.CreateBox("blanket", { width: 2.42, height: 0.29, depth: 2.0 }, this.scene);
    blanket.position.set(0, 0.26, 0.4);
    blanket.parent = bedGroup;
    blanket.material = this.materials.bedSpread;
    this.shadowCasters.push(blanket);

    const pillowL = BABYLON.MeshBuilder.CreateBox("pillowL", { width: 0.9, height: 0.16, depth: 0.5 }, this.scene);
    pillowL.position.set(-0.55, 0.4, -1.0);
    pillowL.parent = bedGroup;
    pillowL.material = this.materials.white;

    const pillowR = BABYLON.MeshBuilder.CreateBox("pillowR", { width: 0.9, height: 0.16, depth: 0.5 }, this.scene);
    pillowR.position.set(0.55, 0.4, -1.0);
    pillowR.parent = bedGroup;
    pillowR.material = this.materials.white;

    // 床头柜
    const drawerL = BABYLON.MeshBuilder.CreateBox("drawerL", { width: 0.7, height: 0.5, depth: 0.7 }, this.scene);
    drawerL.position.set(-1.8, 0.1, -1.0);
    drawerL.parent = bedGroup;
    drawerL.material = this.materials.wood;
    this.shadowCasters.push(drawerL);

    const drawerR = BABYLON.MeshBuilder.CreateBox("drawerR", { width: 0.7, height: 0.5, depth: 0.7 }, this.scene);
    drawerR.position.set(1.8, 0.1, -1.0);
    drawerR.parent = bedGroup;
    drawerR.material = this.materials.wood;
    this.shadowCasters.push(drawerR);

    // 左柜头灯台
    const lampBase = BABYLON.MeshBuilder.CreateCylinder("lampBase", { diameterTop: 0.16, diameterBottom: 0.16, height: 0.18, tessellation: 4 }, this.scene);
    lampBase.position.set(-1.8, 0.44, -1.0);
    lampBase.parent = bedGroup;
    lampBase.material = this.materials.metalGold;

    const lampShade = BABYLON.MeshBuilder.CreateCylinder("lampShade", { diameterTop: 0.24, diameterBottom: 0.36, height: 0.2, tessellation: 8 }, this.scene);
    lampShade.position.set(-1.8, 0.62, -1.0);
    lampShade.parent = bedGroup;
    lampShade.material = this.materials.white;

    // 床头小暖光点光源
    const bedsideLight = new BABYLON.PointLight("bedsideLight", new BABYLON.Vector3(-1.8, 0.77, -1.0), this.scene);
    bedsideLight.diffuse = convertColor(0xffb74d);
    bedsideLight.specular = new BABYLON.Color3(0, 0, 0);
    bedsideLight.intensity = 0.9;
    bedsideLight.range = 8;
    bedsideLight.parent = bedGroup;

    // 注册躺床交互
    this.interactables.push({
      id: 'house_bed',
      name: '躺下',
      x: x,
      y: 0.12,
      z: z,
      triggerRadius: 2.0
    });
  }

  createEasel(x, z) {
    const easelGroup = new BABYLON.TransformNode("easelGroup", this.scene);
    easelGroup.position.set(x, 0.12, z);
    easelGroup.rotation.y = -Math.PI / 4;
    easelGroup.parent = this.group;

    const leg1 = BABYLON.MeshBuilder.CreateCylinder("easelLeg1", { diameterTop: 0.07, diameterBottom: 0.07, height: 2.4, tessellation: 4 }, this.scene);
    leg1.position.set(-0.5, 1.15, 0);
    leg1.rotation.z = -0.15;
    leg1.parent = easelGroup;
    leg1.material = this.materials.wood;
    this.shadowCasters.push(leg1);

    const leg2 = BABYLON.MeshBuilder.CreateCylinder("easelLeg2", { diameterTop: 0.07, diameterBottom: 0.07, height: 2.4, tessellation: 4 }, this.scene);
    leg2.position.set(0.5, 1.15, 0);
    leg2.rotation.z = 0.15;
    leg2.parent = easelGroup;
    leg2.material = this.materials.wood;
    this.shadowCasters.push(leg2);

    const leg3 = BABYLON.MeshBuilder.CreateCylinder("easelLeg3", { diameterTop: 0.07, diameterBottom: 0.07, height: 2.4, tessellation: 4 }, this.scene);
    leg3.position.set(0, 1.15, -0.5);
    leg3.rotation.x = 0.22; 
    leg3.parent = easelGroup;
    leg3.material = this.materials.wood;
    this.shadowCasters.push(leg3);

    const shelf = BABYLON.MeshBuilder.CreateBox("easelShelf", { width: 1.4, height: 0.07, depth: 0.14 }, this.scene);
    shelf.position.set(0, 1.05, 0.08);
    shelf.parent = easelGroup;
    shelf.material = this.materials.wood;
    this.shadowCasters.push(shelf);

    const canvasMesh = BABYLON.MeshBuilder.CreateBox("easelCanvas", { width: 1.2, height: 0.9, depth: 0.04 }, this.scene);
    canvasMesh.position.set(0, 1.5, 0.08);
    canvasMesh.rotation.x = -0.08;
    canvasMesh.parent = easelGroup;
    canvasMesh.material = this.materials.white;
    this.shadowCasters.push(canvasMesh);

    // 迷你画作拼块
    const artSkyMat = new BABYLON.StandardMaterial("artSkyMat", this.scene);
    artSkyMat.diffuseColor = convertColor(0xb2ebf2);
    artSkyMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const pSky = BABYLON.MeshBuilder.CreatePlane("paintingSky", { width: 1.14, height: 0.84 }, this.scene);
    pSky.position.set(0, 1.5, 0.11);
    pSky.rotation.x = -0.08;
    pSky.parent = easelGroup;
    pSky.material = artSkyMat;

    const pSun = BABYLON.MeshBuilder.CreateSphere("paintingSunSphere", { diameter: 0.22, segments: 6 }, this.scene);
    pSun.position.set(0.2, 1.62, 0.12);
    pSun.parent = easelGroup;
    pSun.material = this.materials.paintingSun;

    const artSeaMat = new BABYLON.StandardMaterial("artSeaMat", this.scene);
    artSeaMat.diffuseColor = convertColor(0x00bcd4);
    artSeaMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const pSea = BABYLON.MeshBuilder.CreatePlane("paintingSea", { width: 1.14, height: 0.35 }, this.scene);
    pSea.position.set(0, 1.28, 0.12);
    pSea.rotation.x = -0.08;
    pSea.parent = easelGroup;
    pSea.material = artSeaMat;

    // 注册写生交互
    this.interactables.push({
      id: 'house_easel',
      name: '写生',
      x: x,
      y: 0.12,
      z: z,
      triggerRadius: 1.8
    });
  }

  createWardrobe(x, z) {
    const wardrobeGroup = new BABYLON.TransformNode("wardrobeGroup", this.scene);
    wardrobeGroup.position.set(x, 0.12, z);
    wardrobeGroup.parent = this.group;

    const wBody = BABYLON.MeshBuilder.CreateBox("wardrobeBody", { width: 0.9, height: 2.8, depth: 1.8 }, this.scene);
    wBody.position.y = 1.4;
    wBody.parent = wardrobeGroup;
    wBody.material = this.materials.wood;
    wBody.receiveShadows = true;
    this.shadowCasters.push(wBody);

    const wDoorL = BABYLON.MeshBuilder.CreateBox("wardrobeDoorL", { width: 0.06, height: 2.5, depth: 0.82 }, this.scene);
    wDoorL.position.set(-0.46, 1.4, -0.42);
    wDoorL.parent = wardrobeGroup;
    wDoorL.material = this.materials.woodLight;

    const wDoorR = BABYLON.MeshBuilder.CreateBox("wardrobeDoorR", { width: 0.06, height: 2.5, depth: 0.82 }, this.scene);
    wDoorR.position.set(-0.46, 1.4, 0.42);
    wDoorR.parent = wardrobeGroup;
    wDoorR.material = this.materials.woodLight;

    const wHandleL = BABYLON.MeshBuilder.CreateSphere("wardrobeHandleL", { diameter: 0.12, segments: 4 }, this.scene);
    wHandleL.position.set(-0.52, 1.4, -0.08);
    wHandleL.parent = wardrobeGroup;
    wHandleL.material = this.materials.metalGold;

    const wHandleR = BABYLON.MeshBuilder.CreateSphere("wardrobeHandleR", { diameter: 0.12, segments: 4 }, this.scene);
    wHandleR.position.set(-0.52, 1.4, 0.08);
    wHandleR.parent = wardrobeGroup;
    wHandleR.material = this.materials.metalGold;

    // 柜子前小地毯
    const wCarpet = BABYLON.MeshBuilder.CreateBox("wardrobeCarpet", { width: 2.0, height: 0.01, depth: 1.8 }, this.scene);
    wCarpet.position.set(-1.4, 0.005, 0);
    wCarpet.parent = wardrobeGroup;
    wCarpet.receiveShadows = true;
    wCarpet.material = this.materials.carpet;

    // 落地展示灯 (用于衣柜试衣间玩家侧打光)
    const wLampGroup = new BABYLON.TransformNode("wardrobeLamp", this.scene);
    wLampGroup.position.set(-2.4, 0.0, 1.0);
    wLampGroup.parent = wardrobeGroup;

    const lampBase = BABYLON.MeshBuilder.CreateCylinder("wLampBase", { diameterTop: 0.5, diameterBottom: 0.5, height: 0.05, tessellation: 6 }, this.scene);
    lampBase.position.y = 0.025;
    lampBase.parent = wLampGroup;
    lampBase.material = this.materials.metalGold;
    this.shadowCasters.push(lampBase);

    const pole = BABYLON.MeshBuilder.CreateCylinder("wLampPole", { diameterTop: 0.07, diameterBottom: 0.07, height: 2.0, tessellation: 4 }, this.scene);
    pole.position.y = 1.0;
    pole.parent = wLampGroup;
    pole.material = this.materials.wood;
    this.shadowCasters.push(pole);

    const shade = BABYLON.MeshBuilder.CreateCylinder("wLampShade", { diameterTop: 0.36, diameterBottom: 0.6, height: 0.35, tessellation: 8 }, this.scene);
    shade.position.y = 2.0;
    shade.parent = wLampGroup;
    shade.material = this.materials.white;
    this.shadowCasters.push(shade);

    const bulbMat = new BABYLON.StandardMaterial("wLampBulbMat", this.scene);
    bulbMat.diffuseColor = convertColor(0xfff59d);
    bulbMat.emissiveColor = convertColor(0xfff59d);
    bulbMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const bulb = BABYLON.MeshBuilder.CreateSphere("wLampBulb", { diameter: 0.14, segments: 6 }, this.scene);
    bulb.position.y = 1.9;
    bulb.parent = wLampGroup;
    bulb.material = bulbMat;

    const wardrobeLight = new BABYLON.PointLight("wardrobeLight", new BABYLON.Vector3(-2.4, 1.9, 1.0), this.scene);
    wardrobeLight.diffuse = convertColor(0xffecc2);
    wardrobeLight.specular = new BABYLON.Color3(0, 0, 0);
    wardrobeLight.intensity = 2.2;
    wardrobeLight.range = 10;
    wardrobeLight.parent = wardrobeGroup;

    // 注册衣柜交互
    this.interactables.push({
      id: 'house_wardrobe',
      name: '衣柜换装',
      x: x - 1.4,
      y: 0.12,
      z: z,
      triggerRadius: 2.0
    });
  }

  createSofaLounge(x, z) {
    const loungeGroup = new BABYLON.TransformNode("sofaLounge", this.scene);
    loungeGroup.position.set(x, 0.12, z);
    loungeGroup.parent = this.group;

    // 沙发小毯
    const rug = BABYLON.MeshBuilder.CreateBox("sofaRug", { width: 4.2, height: 0.01, depth: 2.8 }, this.scene);
    rug.position.y = 0.005;
    rug.parent = loungeGroup;
    rug.material = this.materials.carpet;

    // 沙发底座
    const base = BABYLON.MeshBuilder.CreateBox("sofaBase", { width: 3.0, height: 0.28, depth: 1.2 }, this.scene);
    base.position.y = 0.24;
    base.parent = loungeGroup;
    base.material = this.materials.sofaBody;
    this.shadowCasters.push(base);

    // 靠背
    const backrest = BABYLON.MeshBuilder.CreateBox("sofaBackrest", { width: 3.0, height: 0.8, depth: 0.25 }, this.scene);
    backrest.position.set(0, 0.72, -0.475);
    backrest.parent = loungeGroup;
    backrest.material = this.materials.sofaBody;
    this.shadowCasters.push(backrest);

    // 扶手
    const armL = BABYLON.MeshBuilder.CreateBox("sofaArmL", { width: 0.25, height: 0.55, depth: 1.2 }, this.scene);
    armL.position.set(-1.375, 0.42, 0);
    armL.parent = loungeGroup;
    armL.material = this.materials.sofaBody;
    this.shadowCasters.push(armL);

    const armR = BABYLON.MeshBuilder.CreateBox("sofaArmR", { width: 0.25, height: 0.55, depth: 1.2 }, this.scene);
    armR.position.set(1.375, 0.42, 0);
    armR.parent = loungeGroup;
    armR.material = this.materials.sofaBody;
    this.shadowCasters.push(armR);

    // 坐垫
    for (let i = 0; i < 3; i++) {
      const cushion = BABYLON.MeshBuilder.CreateBox("sofaCushion_" + i, { width: 0.82, height: 0.15, depth: 0.85 }, this.scene);
      cushion.position.set(-0.82 + i * 0.82, 0.38, 0.05);
      cushion.parent = loungeGroup;
      cushion.material = this.materials.sofaCushion;
      this.shadowCasters.push(cushion);
    }

    // 茶几
    const tableGroup = new BABYLON.TransformNode("coffeeTable", this.scene);
    tableGroup.position.set(0, 0, 0.9);
    tableGroup.parent = loungeGroup;

    const top = BABYLON.MeshBuilder.CreateBox("coffeeTableTop", { width: 1.6, height: 0.06, depth: 0.8 }, this.scene);
    top.position.y = 0.35;
    top.parent = tableGroup;
    top.material = this.materials.wood;
    this.shadowCasters.push(top);

    const legGeo = { diameterTop: 0.08, diameterBottom: 0.08, height: 0.35, tessellation: 4 };
    const legL = BABYLON.MeshBuilder.CreateCylinder("coffeeTableLegL", legGeo, this.scene);
    legL.position.set(-0.7, 0.175, 0);
    legL.parent = tableGroup;
    legL.material = this.materials.wood;
    this.shadowCasters.push(legL);

    const legR = BABYLON.MeshBuilder.CreateCylinder("coffeeTableLegR", legGeo, this.scene);
    legR.position.set(0.7, 0.175, 0);
    legR.parent = tableGroup;
    legR.material = this.materials.wood;
    this.shadowCasters.push(legR);

    // 桌面小花盆
    const pot = BABYLON.MeshBuilder.CreateCylinder("coffeeTablePot", { diameterTop: 0.16, diameterBottom: 0.12, height: 0.12, tessellation: 5 }, this.scene);
    pot.position.set(0, 0.44, 0);
    pot.parent = tableGroup;
    pot.material = this.materials.coconut;

    const potPlant = BABYLON.MeshBuilder.CreateSphere("coffeeTablePlant", { diameter: 0.2, segments: 5 }, this.scene);
    potPlant.position.set(0, 0.52, 0);
    potPlant.parent = tableGroup;
    potPlant.material = this.materials.leaves;
  }

  createDiningTable(x, z) {
    const tableGroup = new BABYLON.TransformNode("diningTableGroup", this.scene);
    tableGroup.position.set(x, 0.12, z);
    tableGroup.parent = this.group;

    const tabletop = BABYLON.MeshBuilder.CreateBox("diningTableTop", { width: 0.9, height: 0.08, depth: 2.5 }, this.scene);
    tabletop.position.y = 1.0;
    tabletop.parent = tableGroup;
    tabletop.material = this.materials.wood;
    this.shadowCasters.push(tabletop);

    const tLegGeo = { diameterTop: 0.07, diameterBottom: 0.07, height: 1.0, tessellation: 4 };
    const tLegOffsets = [
      { x: -0.38, z: -1.1 },
      { x: 0.38, z: -1.1 },
      { x: -0.38, z: 1.1 },
      { x: 0.38, z: 1.1 }
    ];
    tLegOffsets.forEach((offset, idx) => {
      const leg = BABYLON.MeshBuilder.CreateCylinder("diningTableLeg_" + idx, tLegGeo, this.scene);
      leg.position.set(offset.x, 0.5, offset.z);
      leg.parent = tableGroup;
      leg.material = this.materials.wood;
      this.shadowCasters.push(leg);
    });

    // 书桌椅
    const chairGeo = { width: 0.42, height: 0.06, depth: 0.42 };
    const chairLegGeo = { diameterTop: 0.04, diameterBottom: 0.04, height: 0.5, tessellation: 4 };

    for (let side = -1; side <= 1; side += 2) {
      const chairGroup = new BABYLON.TransformNode("diningChair_" + side, this.scene);
      chairGroup.position.set(0.68 * side, 0, 0);
      chairGroup.parent = tableGroup;
      
      const seat = BABYLON.MeshBuilder.CreateBox("chairSeat", chairGeo, this.scene);
      seat.position.y = 0.53;
      seat.parent = chairGroup;
      seat.material = this.materials.wood;
      this.shadowCasters.push(seat);

      let lIdx = 0;
      for (let cx = -1; cx <= 1; cx += 2) {
        for (let cz = -1; cz <= 1; cz += 2) {
          const leg = BABYLON.MeshBuilder.CreateCylinder("chairLeg_" + lIdx++, chairLegGeo, this.scene);
          leg.position.set(0.16 * cx, 0.25, 0.16 * cz);
          leg.parent = chairGroup;
          leg.material = this.materials.wood;
          this.shadowCasters.push(leg);
        }
      }

      const back = BABYLON.MeshBuilder.CreateBox("chairBack", { width: 0.06, height: 0.5, depth: 0.42 }, this.scene);
      back.position.set(0.18 * side, 0.78, 0);
      back.parent = chairGroup;
      back.material = this.materials.wood;
      this.shadowCasters.push(back);
    }

    // 桌上叠放书籍
    const bookColors = [0xd50000, 0x1e88e5, 0xffb300];
    for (let i = 0; i < 3; i++) {
      const bookMat = this.createFlatMaterial("bookMat_" + i, bookColors[i]);
      const book = BABYLON.MeshBuilder.CreateBox("book", { width: 0.38, height: 0.06, depth: 0.3 }, this.scene);
      book.position.set(-0.06, 1.07 + i * 0.062, 0.3);
      book.rotation.y = 0.12 * i - 0.08;
      book.parent = tableGroup;
      book.material = bookMat;
      this.shadowCasters.push(book);
    }

    // 桌面小盆栽
    const pot = BABYLON.MeshBuilder.CreateCylinder("tablePot", { diameterTop: 0.24, diameterBottom: 0.18, height: 0.22, tessellation: 5 }, this.scene);
    pot.position.set(0, 1.15, -0.5);
    pot.parent = tableGroup;
    pot.material = this.materials.white;
    this.shadowCasters.push(pot);

    const leaves = BABYLON.MeshBuilder.CreateSphere("tablePlant", { diameter: 0.32, segments: 6 }, this.scene);
    leaves.position.set(0, 1.3, -0.5);
    leaves.parent = tableGroup;
    leaves.material = this.materials.leaves;

    // 桌上护眼小台灯
    const tableLampBase = BABYLON.MeshBuilder.CreateCylinder("tableLampBase", { diameterTop: 0.16, diameterBottom: 0.16, height: 0.04, tessellation: 4 }, this.scene);
    tableLampBase.position.set(0.2, 1.06, 0.8);
    tableLampBase.parent = tableGroup;
    tableLampBase.material = this.materials.metalGold;

    const tableLampStem = BABYLON.MeshBuilder.CreateCylinder("tableLampStem", { diameterTop: 0.03, diameterBottom: 0.03, height: 0.35, tessellation: 4 }, this.scene);
    tableLampStem.position.set(0.2, 1.22, 0.8);
    tableLampStem.rotation.z = -0.2;
    tableLampStem.parent = tableGroup;
    tableLampStem.material = this.materials.metalGold;

    const tableLampShade = BABYLON.MeshBuilder.CreateCylinder("tableLampShade", { diameterTop: 0.16, diameterBottom: 0.28, height: 0.16, tessellation: 6 }, this.scene);
    tableLampShade.position.set(0.13, 1.38, 0.8);
    tableLampShade.parent = tableGroup;
    tableLampShade.material = this.materials.white;

    const tableLampLight = new BABYLON.PointLight("tableLampLight", new BABYLON.Vector3(x + 0.13, 1.34 + 0.12, z + 0.8), this.scene);
    tableLampLight.diffuse = convertColor(0xffffe0);
    tableLampLight.specular = new BABYLON.Color3(0, 0, 0);
    tableLampLight.intensity = 0.8;
    tableLampLight.range = 6;
    tableLampLight.parent = this.group;
  }

  createMonstera(x, z) {
    const monstera = new BABYLON.TransformNode("monstera", this.scene);
    monstera.position.set(x, 0.12, z);
    monstera.parent = this.group;

    const bigPot = BABYLON.MeshBuilder.CreateCylinder("monsteraPot", { diameterTop: 0.7, diameterBottom: 0.56, height: 0.6, tessellation: 6 }, this.scene);
    bigPot.position.y = 0.3;
    bigPot.parent = monstera;
    bigPot.material = this.materials.carpet;
    this.shadowCasters.push(bigPot);

    const stemGeo = { diameterTop: 0.06, diameterBottom: 0.06, height: 0.9, tessellation: 4 };
    for (let i = 0; i < 5; i++) {
      const stem = BABYLON.MeshBuilder.CreateCylinder("monsteraStem_" + i, stemGeo, this.scene);
      const angle = (i / 5) * Math.PI * 2;
      stem.position.set(Math.cos(angle) * 0.14, 0.6, Math.sin(angle) * 0.14);
      stem.rotation.z = Math.cos(angle) * 0.45;
      stem.rotation.x = Math.sin(angle) * 0.45;
      stem.parent = monstera;
      stem.material = this.materials.wood;

      const leaf = BABYLON.MeshBuilder.CreateSphere("monsteraLeaf_" + i, { diameter: 0.7, segments: 5 }, this.scene);
      leaf.scaling.set(1.3, 0.2, 1.8);
      leaf.position.set(Math.cos(angle) * 0.52, 0.96, Math.sin(angle) * 0.52);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.45;
      leaf.parent = monstera;
      leaf.material = this.materials.leaves;
      this.shadowCasters.push(leaf);
    }
  }

  createSunsetPainting(x, z) {
    const frame = BABYLON.MeshBuilder.CreateBox("paintingFrame", { width: 4.2, height: 2.0, depth: 0.05 }, this.scene);
    frame.position.set(x, 3.0, z);
    frame.parent = this.group;
    frame.material = this.materials.wood;
    this.shadowCasters.push(frame);

    const art = BABYLON.MeshBuilder.CreateBox("paintingArtPlate", { width: 3.8, height: 1.6, depth: 0.02 }, this.scene);
    art.position.set(x, 3.0, z + 0.035);
    art.parent = this.group;
    art.material = this.materials.paintingArt;

    const sun = BABYLON.MeshBuilder.CreateSphere("paintingSunSphere", { diameter: 0.48, segments: 6 }, this.scene);
    sun.position.set(x + 0.8, 3.2, z + 0.05);
    sun.parent = this.group;
    sun.material = this.materials.paintingSun;
  }

  createReservedSpot(x, z) {
    const reserveGroup = new BABYLON.TransformNode("reserveSpot", this.scene);
    reserveGroup.position.set(x, 0.12, z);
    reserveGroup.parent = this.group;

    const borderMat = new BABYLON.StandardMaterial("reserveBorderMat", this.scene);
    borderMat.diffuseColor = convertColor(0x90a4ae);
    borderMat.alpha = 0.5;
    borderMat.backFaceCulling = false;
    borderMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const border = BABYLON.MeshBuilder.CreateBox("reserveBorder", { width: 3.0, height: 0.02, depth: 3.0 }, this.scene);
    border.position.y = 0.01;
    border.parent = reserveGroup;
    border.material = borderMat;

    const post = BABYLON.MeshBuilder.CreateCylinder("reservePost", { diameterTop: 0.04, diameterBottom: 0.04, height: 0.45, tessellation: 4 }, this.scene);
    post.position.set(0, 0.22, 0);
    post.parent = reserveGroup;
    post.material = this.materials.wood;
    this.shadowCasters.push(post);

    const signBoard = BABYLON.MeshBuilder.CreateBox("reserveSign", { width: 0.6, height: 0.25, depth: 0.03 }, this.scene);
    signBoard.position.set(0, 0.44, 0);
    signBoard.parent = reserveGroup;
    signBoard.material = this.materials.wood;
    this.shadowCasters.push(signBoard);
  }

  createCeilingLight() {
    const ceilGroup = new BABYLON.TransformNode("ceilingLightGroup", this.scene);
    ceilGroup.position.set(0, 5.4, 0);
    ceilGroup.parent = this.group;

    // 吸顶盖
    const cap = BABYLON.MeshBuilder.CreateCylinder("ceilCap", { diameterTop: 0.4, diameterBottom: 0.4, height: 0.06, tessellation: 6 }, this.scene);
    cap.parent = ceilGroup;
    cap.material = this.materials.wood;

    // 细电线
    const cordMat = this.createFlatMaterial("ceilCordMat", 0x111111);
    const cord = BABYLON.MeshBuilder.CreateCylinder("ceilCord", { diameterTop: 0.03, diameterBottom: 0.03, height: 1.2, tessellation: 4 }, this.scene);
    cord.position.y = -0.6;
    cord.parent = ceilGroup;
    cord.material = cordMat;

    // 金属灯罩
    const shade = BABYLON.MeshBuilder.CreateCylinder("ceilShade", { diameterTop: 0.16, diameterBottom: 0.7, height: 0.28, tessellation: 8 }, this.scene);
    shade.position.y = -1.34;
    shade.parent = ceilGroup;
    shade.material = this.materials.metalGold;
    this.shadowCasters.push(shade);

    // 自发光灯泡
    const bulbMat = new BABYLON.StandardMaterial("ceilBulbMat", this.scene);
    bulbMat.diffuseColor = convertColor(0xfff9c4);
    bulbMat.emissiveColor = convertColor(0xfff9c4);
    bulbMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const bulb = BABYLON.MeshBuilder.CreateSphere("ceilBulb", { diameter: 0.24, segments: 6 }, this.scene);
    bulb.position.y = -1.48;
    bulb.parent = ceilGroup;
    bulb.material = bulbMat;

    // 主室内吊灯光源 (大范围暖光)
    const light = new BABYLON.PointLight("indoorCeilingLight", new BABYLON.Vector3(0, 3.82, 0), this.scene);
    light.diffuse = convertColor(0xffecc2);
    light.specular = new BABYLON.Color3(0, 0, 0);
    light.intensity = 1.7;
    light.range = 28;
    light.parent = this.group;
  }

  createWindowScenery() {
    const sceneGroup = new BABYLON.TransformNode("windowSceneryGroup", this.scene);
    sceneGroup.position.set(-17.5, -1.2, 0.0);
    sceneGroup.parent = this.group;

    // 1. 浮空岩岛底座
    const baseMesh = BABYLON.MeshBuilder.CreateCylinder("sceneryBase", { diameterTop: 7.0, diameterBottom: 5.0, height: 1.5, tessellation: 8 }, this.scene);
    baseMesh.parent = sceneGroup;
    baseMesh.material = this.materials.wood;
    baseMesh.receiveShadows = true;

    const sandTop = BABYLON.MeshBuilder.CreateCylinder("scenerySand", { diameterTop: 7.0, diameterBottom: 6.8, height: 0.2, tessellation: 8 }, this.scene);
    sandTop.position.y = 0.85;
    sandTop.parent = sceneGroup;
    sandTop.material = this.materials.woodLight;
    sandTop.receiveShadows = true;

    // 2. 迷你椰子树
    const tree = new BABYLON.TransformNode("sceneryTree", this.scene);
    tree.position.set(0, 0.95, -0.6);
    tree.scaling.set(0.65, 0.65, 0.65);
    tree.parent = sceneGroup;

    const trunk = BABYLON.MeshBuilder.CreateCylinder("sceneryTreeTrunk", { diameterTop: 0.36, diameterBottom: 0.5, height: 2.5, tessellation: 5 }, this.scene);
    trunk.position.y = 1.25;
    trunk.rotation.z = -0.12;
    trunk.parent = tree;
    trunk.material = this.materials.wood;

    const leaves = new BABYLON.TransformNode("sceneryTreeLeaves", this.scene);
    leaves.position.set(-0.15, 2.5, 0);
    leaves.parent = tree;

    for (let i = 0; i < 6; i++) {
      const leaf = BABYLON.MeshBuilder.CreateBox("sceneryLeaf", { width: 1.4, height: 0.02, depth: 0.35 }, this.scene);
      leaf.setPivotPoint(new BABYLON.Vector3(-0.7, 0, 0));
      leaf.position.set(0.7, 0, 0);

      const leafPivot = new BABYLON.TransformNode("sceneryLeafPivot_" + i, this.scene);
      leafPivot.parent = leaves;
      leaf.parent = leafPivot;

      leafPivot.rotation.y = (i / 6) * Math.PI * 2;
      leafPivot.rotation.z = -0.2;

      leaf.material = this.materials.leaves;
    }

    // 3. 悬挂明月 (自发光金色球体)
    const moonMat = new BABYLON.StandardMaterial("sceneryMoonMat", this.scene);
    moonMat.diffuseColor = convertColor(0xffe082);
    moonMat.emissiveColor = convertColor(0xffe082);
    moonMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const moon = BABYLON.MeshBuilder.CreateSphere("sceneryMoon", { diameter: 2.4, segments: 10 }, this.scene);
    moon.position.set(-4.5, 7.8, -4.5);
    moon.parent = sceneGroup;
    moon.material = moonMat;

    // 4. 小云朵
    const cloud = new BABYLON.TransformNode("sceneryCloud", this.scene);
    cloud.position.set(1.5, 4.0, 3.0);
    cloud.parent = sceneGroup;

    const cloudMat = this.createFlatMaterial("sceneryCloudMat", 0xfafafa);
    for (let i = 0; i < 3; i++) {
      const puff = BABYLON.MeshBuilder.CreateSphere("cloudPuff_" + i, { diameter: (0.7 + i * 0.2), segments: 5 }, this.scene);
      puff.position.set(i * 0.4 - 0.4, 0, (i % 2) * 0.1);
      puff.parent = cloud;
      puff.material = cloudMat;
    }

    // 5. 皎洁的青蓝色月光点光源 (用来照亮悬浮外景)
    const moonLight = new BABYLON.PointLight("sceneryMoonLight", new BABYLON.Vector3(-18.5, 2.0, -1.0), this.scene);
    moonLight.diffuse = convertColor(0x80deea);
    moonLight.specular = new BABYLON.Color3(0, 0, 0);
    moonLight.intensity = 1.5;
    moonLight.range = 12;
    moonLight.parent = this.group;

    // 6. 稀疏的背景挂载小星星
    const starMat = new BABYLON.StandardMaterial("sceneryStarMat", this.scene);
    starMat.diffuseColor = convertColor(0xffecb3);
    starMat.emissiveColor = convertColor(0xffecb3);
    starMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const starGeo = { diameter: 0.12, segments: 4 };
    const starCoords = [
      { x: -3.5, y: 5.5, z: -2.0 },
      { x: -2.0, y: 6.5, z: 2.0 },
      { x: 1.5, y: 5.2, z: -3.0 },
      { x: 2.5, y: 7.0, z: 1.0 },
      { x: -1.2, y: 4.5, z: 3.5 },
      { x: -5.0, y: 6.0, z: 0.0 }
    ];
    starCoords.forEach((coord, idx) => {
      const star = BABYLON.MeshBuilder.CreateSphere("sceneryStar_" + idx, starGeo, this.scene);
      star.position.set(coord.x, coord.y, coord.z);
      star.parent = sceneGroup;
      star.material = starMat;
    });
  }

  createFloorLamp(x, z) {
    const lampGroup = new BABYLON.TransformNode("floorLamp", this.scene);
    lampGroup.position.set(x, 0.12, z);
    lampGroup.parent = this.group;

    // 底座
    const base = BABYLON.MeshBuilder.CreateCylinder("floorLampBase", { diameterTop: 0.6, diameterBottom: 0.6, height: 0.05, tessellation: 6 }, this.scene);
    base.parent = lampGroup;
    base.material = this.materials.metalGold;
    this.shadowCasters.push(base);

    // 支撑立柱
    const pole = BABYLON.MeshBuilder.CreateCylinder("floorLampPole", { diameterTop: 0.08, diameterBottom: 0.08, height: 2.2, tessellation: 4 }, this.scene);
    pole.position.y = 1.1;
    pole.parent = lampGroup;
    pole.material = this.materials.wood;
    this.shadowCasters.push(pole);

    // 灯罩
    const shade = BABYLON.MeshBuilder.CreateCylinder("floorLampShade", { diameterTop: 0.4, diameterBottom: 0.7, height: 0.4, tessellation: 8 }, this.scene);
    shade.position.y = 2.2;
    shade.parent = lampGroup;
    shade.material = this.materials.white;
    this.shadowCasters.push(shade);

    // 灯泡
    const bulbMat = new BABYLON.StandardMaterial("floorLampBulbMat", this.scene);
    bulbMat.diffuseColor = convertColor(0xffeb3b);
    bulbMat.emissiveColor = convertColor(0xffeb3b);
    bulbMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const bulb = BABYLON.MeshBuilder.CreateSphere("floorLampBulb", { diameter: 0.16, segments: 6 }, this.scene);
    bulb.position.y = 2.1;
    bulb.parent = lampGroup;
    bulb.material = bulbMat;

    // 灯光光源
    const floorLampLight = new BABYLON.PointLight("floorLampLight", new BABYLON.Vector3(x, 2.12, z), this.scene);
    floorLampLight.diffuse = convertColor(0xffd180);
    floorLampLight.specular = new BABYLON.Color3(0, 0, 0);
    floorLampLight.intensity = 1.2;
    floorLampLight.range = 12;
    floorLampLight.parent = this.group;
  }

  getShadowCasters() {
    return this.shadowCasters;
  }
}
