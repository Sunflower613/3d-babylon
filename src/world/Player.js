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

export class Player {
  constructor(scene, camera, colliders, themeConfig) {
    this.scene = scene;
    this.camera = camera;
    this.colliders = colliders;
    this.themeConfig = themeConfig;
    
    // Physics and Movement state
    this.position = new BABYLON.Vector3(0, 4, 0); // Spawn slightly in the air
    this.velocity = new BABYLON.Vector3();
    this.speed = 8.0;
    this.jumpForce = 7.0;
    this.gravity = 18.0;
    this.isGrounded = false;
    this.radius = 0.6;
    this.controlsLocked = false;
    
    // Rotation targets
    this.targetRotation = 0;
    
    // Setup inputs
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    
    // Mouse orbit states
    this.cameraAngleH = Math.PI / 2; // Horizontal angle (orbit)
    this.cameraAngleV = 0.35; // Vertical angle
    this.cameraDistance = 8.5;

    this.isSitting = false;
    this.swingRef = null;
    this.isLyingDown = false; // Add state for bed interaction
    
    this.initMesh();
    this.initControls();
  }

  initMesh() {
    this.group = new BABYLON.TransformNode("playerGroup", this.scene);
    this.group.position.copyFrom(this.position);
    this.activeModel = 'girl'; // Default model is girl

    const hairColorHex = this.themeConfig.player.hairColor || 0xff8a80;
    const clothingColorHex = this.themeConfig.player.clothingColor || 0xffffff;
    const hatColorHex = this.themeConfig.player.hatColor || 0xffd180;

    this.rebuildMesh(hairColorHex, clothingColorHex, hatColorHex);
  }

  rebuildMesh(hairColorHex, clothingColorHex, hatColorHex) {
    // Clear all children of this.group to rebuild
    const children = this.group.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].dispose();
    }

    // Clear old animation references
    this.tailL = null;
    this.tailR = null;
    this.catTail = null;

    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // Materials
    const skinMat = new BABYLON.StandardMaterial("playerSkinMat", this.scene);
    skinMat.diffuseColor = BABYLON.Color3.FromHexString("#ffe0bd");
    skinMat.specularColor = new BABYLON.Color3(0, 0, 0);
    skinMat.flatShading = true;

    const whiteMat = new BABYLON.StandardMaterial("playerWhiteMat", this.scene);
    whiteMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    whiteMat.specularColor = new BABYLON.Color3(0, 0, 0);
    whiteMat.flatShading = true;

    const hairMat = new BABYLON.StandardMaterial("playerHairMat", this.scene);
    hairMat.diffuseColor = convertColor(hairColorHex);
    hairMat.specularColor = new BABYLON.Color3(0, 0, 0);
    hairMat.flatShading = true;
    this.hairMat = hairMat;

    // 1. Torso & Clothes
    const topMat = new BABYLON.StandardMaterial("playerTopMat", this.scene);
    topMat.diffuseColor = convertColor(clothingColorHex);
    topMat.specularColor = new BABYLON.Color3(0, 0, 0);
    topMat.flatShading = true;
    this.clothingMat = topMat;

    this.body = BABYLON.MeshBuilder.CreateCylinder("playerBody", {
      diameterTop: 0.4,
      diameterBottom: 0.48,
      height: 0.35,
      tessellation: 8
    }, this.scene);
    this.body.position.y = 0.55;
    this.body.parent = this.group;
    this.body.material = topMat;

    // Lower body (shorts/pants)
    const lowerBodyColor = isChristmas ? "#263238" : "#3f51b5";
    const lowerMat = new BABYLON.StandardMaterial("playerLowerMat", this.scene);
    lowerMat.diffuseColor = BABYLON.Color3.FromHexString(lowerBodyColor);
    lowerMat.specularColor = new BABYLON.Color3(0, 0, 0);
    lowerMat.flatShading = true;

    const shorts = BABYLON.MeshBuilder.CreateCylinder("playerShorts", {
      diameterTop: 0.48,
      diameterBottom: 0.6,
      height: 0.3,
      tessellation: 8
    }, this.scene);
    shorts.position.y = 0.25;
    shorts.parent = this.group;
    shorts.material = lowerMat;

    // 2. Head & Neck
    this.head = BABYLON.MeshBuilder.CreateSphere("playerHead", {
      diameter: 0.68,
      segments: 8
    }, this.scene);
    this.head.position.y = 0.94;
    this.head.parent = this.group;
    this.head.material = skinMat;

    const neck = BABYLON.MeshBuilder.CreateCylinder("playerNeck", {
      diameterTop: 0.16,
      diameterBottom: 0.16,
      height: 0.15,
      tessellation: 6
    }, this.scene);
    neck.position.y = 0.75;
    neck.parent = this.group;
    neck.material = skinMat;

    // 3. Sandals / Boots / Shoes
    const sandalColor = isChristmas ? "#5d4037" : (this.activeModel === 'boy' ? "#ff5252" : "#ffffff");
    const sandalMat = new BABYLON.StandardMaterial("playerSandalMat", this.scene);
    sandalMat.diffuseColor = BABYLON.Color3.FromHexString(sandalColor);
    sandalMat.specularColor = new BABYLON.Color3(0, 0, 0);
    sandalMat.flatShading = true;

    // Foot L (拉扁的 Sphere 模拟鞋)
    this.footL = BABYLON.MeshBuilder.CreateSphere("playerFootL", {
      diameter: 0.18,
      segments: 6
    }, this.scene);
    this.footL.scaling.set(1.0, isChristmas ? 1.0 : 0.7, 1.3);
    this.footL.position.set(-0.16, 0.04, 0);
    this.footL.parent = this.group;
    this.footL.material = sandalMat;

    this.footR = BABYLON.MeshBuilder.CreateSphere("playerFootR", {
      diameter: 0.18,
      segments: 6
    }, this.scene);
    this.footR.scaling.set(1.0, isChristmas ? 1.0 : 0.7, 1.3);
    this.footR.position.set(0.16, 0.04, 0);
    this.footR.parent = this.group;
    this.footR.material = sandalMat;

    if (!isChristmas && this.activeModel === 'girl') {
      const sBowL = BABYLON.MeshBuilder.CreateBox("sBowL", {
        width: 0.12,
        height: 0.04,
        depth: 0.08
      }, this.scene);
      sBowL.position.set(-0.16, 0.06, 0.08);
      sBowL.parent = this.group;
      sBowL.material = sandalMat;

      const sBowR = sBowL.clone("sBowR");
      sBowR.position.set(0.16, 0.06, 0.08);
      sBowR.parent = this.group;
    }

    // Build model specific features
    if (this.activeModel === 'girl') {
      this.buildGirlModel(hairMat, whiteMat, hatColorHex, isChristmas);
    } else if (this.activeModel === 'boy') {
      this.buildBoyModel(hairMat, whiteMat, hatColorHex, isChristmas);
    } else if (this.activeModel === 'kitty') {
      this.buildKittyModel(hairMat, whiteMat, hatColorHex, isChristmas);
    }

    // 4. Cardigan / Scarf (waving cape)
    const capeColor = isChristmas ? "#d50000" : "#ffffff";
    const capeMat = new BABYLON.StandardMaterial("playerCapeMat", this.scene);
    capeMat.diffuseColor = BABYLON.Color3.FromHexString(capeColor);
    capeMat.specularColor = new BABYLON.Color3(0, 0, 0);
    capeMat.alpha = isChristmas ? 1.0 : 0.8;
    capeMat.backFaceCulling = false; // 双面可见
    capeMat.flatShading = true;

    if (isChristmas) {
      // 圣诞斗篷用 subdivisions 模拟，用 CreateGround 代替并旋转
      this.cape = BABYLON.MeshBuilder.CreateGround("playerCape", {
        width: 0.55,
        height: 0.7,
        subdivisionsX: 2,
        subdivisionsY: 4
      }, this.scene);
      this.cape.rotation.x = Math.PI / 2 + 0.12; // 沿 X 轴翻转，使之竖直并轻微向后偏
      this.cape.rotation.y = 0.05;
      this.cape.position.set(0.05, 0.62, -0.22);
      this.cape.parent = this.group;
      this.cape.material = capeMat;
    } else {
      this.cape = BABYLON.MeshBuilder.CreateGround("playerCape", {
        width: 0.65,
        height: 0.75,
        subdivisionsX: 3,
        subdivisionsY: 5
      }, this.scene);
      this.cape.rotation.x = Math.PI / 2 + 0.15;
      this.cape.position.set(0, 0.48, -0.32);
      this.cape.parent = this.group;
      this.cape.material = capeMat;
    }

    // 统一配置阴影 (如果有 shadowGenerator 另行添加)
    const allMeshes = this.group.getChildMeshes();
    allMeshes.forEach(mesh => {
      mesh.receiveShadows = true;
    });
  }

  buildGirlModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    // Hair (helm, bangs, twin-tails)
    const hairHelm = BABYLON.MeshBuilder.CreateSphere("hairHelm", {
      diameter: 0.72,
      segments: 8
    }, this.scene);
    hairHelm.position.set(0, 0.98, -0.04);
    hairHelm.parent = this.group;
    hairHelm.material = hairMat;

    const bangL = BABYLON.MeshBuilder.CreateBox("bangL", {
      width: 0.18,
      height: 0.18,
      depth: 0.12
    }, this.scene);
    bangL.position.set(-0.12, 1.05, 0.26);
    bangL.rotation.z = -0.2;
    bangL.rotation.y = 0.1;
    bangL.parent = this.group;
    bangL.material = hairMat;

    const bangR = BABYLON.MeshBuilder.CreateBox("bangR", {
      width: 0.18,
      height: 0.18,
      depth: 0.12
    }, this.scene);
    bangR.position.set(0.12, 1.05, 0.26);
    bangR.rotation.z = 0.2;
    bangR.rotation.y = -0.1;
    bangR.parent = this.group;
    bangR.material = hairMat;

    // 女孩双马尾 (圆锥)
    // 注意：圆锥在 Babylon 中尖端向上，原本 Three 倒转 rotateX(Math.PI) 尖端向下
    this.tailL = BABYLON.MeshBuilder.CreateCylinder("tailL", {
      diameterTop: 0,
      diameterBottom: 0.2,
      height: 0.52,
      tessellation: 6
    }, this.scene);
    this.tailL.rotation.x = Math.PI;
    this.tailL.position.set(-0.35, 0.94, -0.05);
    this.tailL.rotation.z = -0.25;
    this.tailL.parent = this.group;
    this.tailL.material = hairMat;

    this.tailR = BABYLON.MeshBuilder.CreateCylinder("tailR", {
      diameterTop: 0,
      diameterBottom: 0.2,
      height: 0.52,
      tessellation: 6
    }, this.scene);
    this.tailR.rotation.x = Math.PI;
    this.tailR.position.set(0.35, 0.94, -0.05);
    this.tailR.rotation.z = 0.25;
    this.tailR.parent = this.group;
    this.tailR.material = hairMat;

    // Hair Clip
    if (isChristmas) {
      const clip = BABYLON.MeshBuilder.CreateBox("clip", {
        width: 0.07,
        height: 0.07,
        depth: 0.04
      }, this.scene);
      clip.position.set(0.24, 1.12, 0.24);
      clip.rotation.z = Math.PI / 4;
      clip.parent = this.group;
      clip.material = whiteMat;
    } else {
      const greenClipMat = new BABYLON.StandardMaterial("clipGreenMat", this.scene);
      greenClipMat.diffuseColor = BABYLON.Color3.FromHexString("#4caf50");
      greenClipMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const redClipMat = new BABYLON.StandardMaterial("clipRedMat", this.scene);
      redClipMat.diffuseColor = BABYLON.Color3.FromHexString("#ff5252");
      redClipMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const clipRind = BABYLON.MeshBuilder.CreateBox("clipRind", {
        width: 0.08,
        height: 0.08,
        depth: 0.04
      }, this.scene);
      clipRind.position.set(0.24, 1.12, 0.24);
      clipRind.rotation.z = -0.4;
      clipRind.parent = this.group;
      clipRind.material = greenClipMat;

      const clipFlesh = BABYLON.MeshBuilder.CreateBox("clipFlesh", {
        width: 0.06,
        height: 0.06,
        depth: 0.04
      }, this.scene);
      clipFlesh.position.set(0.24, 1.14, 0.26);
      clipFlesh.rotation.z = -0.4;
      clipFlesh.parent = this.group;
      clipFlesh.material = redClipMat;
    }

    // Headwear (Santa Hat vs Straw Hat)
    const hatGroup = new BABYLON.TransformNode("hatGroup", this.scene);
    hatGroup.parent = this.group;

    const strawMat = new BABYLON.StandardMaterial("playerHatMat", this.scene);
    strawMat.diffuseColor = convertColor(hatColorHex);
    strawMat.specularColor = new BABYLON.Color3(0, 0, 0);
    strawMat.flatShading = true;
    this.hatMat = strawMat;

    if (isChristmas) {
      hatGroup.position.set(0, 1.25, -0.04);
      
      const cone = BABYLON.MeshBuilder.CreateCylinder("santaCone", {
        diameterTop: 0,
        diameterBottom: 0.7,
        height: 0.6,
        tessellation: 8
      }, this.scene);
      cone.position.y = 0.3; // 原来 translate(0, 0.3, 0)
      cone.rotation.z = -0.15;
      cone.rotation.x = -0.1;
      cone.parent = hatGroup;
      cone.material = strawMat;

      const band = BABYLON.MeshBuilder.CreateCylinder("santaBand", {
        diameterTop: 0.72,
        diameterBottom: 0.72,
        height: 0.12,
        tessellation: 8
      }, this.scene);
      band.position.y = 0.05;
      band.parent = hatGroup;
      band.material = whiteMat;

      const pom = BABYLON.MeshBuilder.CreateSphere("santaPom", {
        diameter: 0.16,
        segments: 6
      }, this.scene);
      pom.position.set(0.08, 0.62, -0.04);
      pom.parent = hatGroup;
      pom.material = whiteMat;

    } else {
      hatGroup.position.set(0, 1.28, -0.04);

      const brim = BABYLON.MeshBuilder.CreateCylinder("brim", {
        diameterTop: 1.44,
        diameterBottom: 1.44,
        height: 0.04,
        tessellation: 10
      }, this.scene);
      brim.parent = hatGroup;
      brim.material = strawMat;

      const crown = BABYLON.MeshBuilder.CreateCylinder("crown", {
        diameterTop: 0.64,
        diameterBottom: 0.76,
        height: 0.25,
        tessellation: 8
      }, this.scene);
      crown.position.y = 0.14;
      crown.parent = hatGroup;
      crown.material = strawMat;

      const ribbon = BABYLON.MeshBuilder.CreateCylinder("ribbon", {
        diameterTop: 0.78,
        diameterBottom: 0.78,
        height: 0.06,
        tessellation: 8
      }, this.scene);
      ribbon.position.y = 0.05;
      ribbon.parent = hatGroup;
      ribbon.material = whiteMat;
    }

    // Glasses
    const glassGroup = new BABYLON.TransformNode("glassGroup", this.scene);
    glassGroup.position.set(0, 1.22, 0.3);
    glassGroup.rotation.x = -0.15;
    glassGroup.parent = this.group;

    const lensMat = new BABYLON.StandardMaterial("lensMat", this.scene);
    lensMat.diffuseColor = BABYLON.Color3.FromHexString("#1a1a1a");
    lensMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const lensL = BABYLON.MeshBuilder.CreateSphere("lensL", {
      diameter: 0.24,
      segments: 6
    }, this.scene);
    lensL.scaling.set(1.0, 1.0, 0.2);
    lensL.position.x = -0.16;
    lensL.parent = glassGroup;
    lensL.material = lensMat;

    const lensR = lensL.clone("lensR");
    lensR.position.x = 0.16;
    lensR.parent = glassGroup;

    const frameColor = isChristmas ? "#ffffff" : "#ff80ab";
    const frameMat = new BABYLON.StandardMaterial("glassesFrameMat", this.scene);
    frameMat.diffuseColor = BABYLON.Color3.FromHexString(frameColor);
    frameMat.specularColor = new BABYLON.Color3(0, 0, 0);
    frameMat.flatShading = true;

    if (isChristmas) {
      const frame = BABYLON.MeshBuilder.CreateBox("frameBar", {
        width: 0.48,
        height: 0.2,
        depth: 0.06
      }, this.scene);
      frame.position.set(0, 0, 0.02);
      frame.parent = glassGroup;
      frame.material = frameMat;
    } else {
      const frameL = BABYLON.MeshBuilder.CreateCylinder("frameL", {
        diameterTop: 0.3,
        diameterBottom: 0.3,
        height: 0.05,
        tessellation: 8
      }, this.scene);
      frameL.rotation.x = Math.PI / 2;
      frameL.position.set(-0.16, 0, 0.02);
      frameL.parent = glassGroup;
      frameL.material = frameMat;

      const frameR = frameL.clone("frameR");
      frameR.position.set(0.16, 0, 0.02);
      frameR.parent = glassGroup;
    }

    // Hamster on Head
    const hamster = new BABYLON.TransformNode("hamster", this.scene);
    hamster.position.set(0.1, isChristmas ? 1.55 : 1.48, -0.06);
    hamster.parent = this.group;

    const hamColor = isChristmas ? "#b0bec5" : "#ffd180";
    const hamMat = new BABYLON.StandardMaterial("hamsterMat", this.scene);
    hamMat.diffuseColor = BABYLON.Color3.FromHexString(hamColor);
    hamMat.specularColor = new BABYLON.Color3(0, 0, 0);
    hamMat.flatShading = true;

    const hamBody = BABYLON.MeshBuilder.CreateSphere("hamBody", {
      diameter: 0.28,
      segments: 6
    }, this.scene);
    hamBody.scaling.set(1, 0.9, 1.1);
    hamBody.parent = hamster;
    hamBody.material = hamMat;

    const earL = BABYLON.MeshBuilder.CreateSphere("hamEarL", {
      diameter: 0.08,
      segments: 4
    }, this.scene);
    earL.position.set(-0.06, 0.09, 0.05);
    earL.parent = hamster;
    earL.material = hamMat;

    const earR = earL.clone("hamEarR");
    earR.position.x = 0.06;
    earR.parent = hamster;

    const blushMat = new BABYLON.StandardMaterial("hamBlushMat", this.scene);
    blushMat.diffuseColor = BABYLON.Color3.FromHexString("#ff8a80");
    blushMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const hamBlush = BABYLON.MeshBuilder.CreateSphere("hamBlush", {
      diameter: 0.04,
      segments: 4
    }, this.scene);
    hamBlush.position.set(0.08, 0, 0.11);
    hamBlush.parent = hamster;
    hamBlush.material = blushMat;

    if (isChristmas) {
      const redScarfMat = new BABYLON.StandardMaterial("hamScarfMat", this.scene);
      redScarfMat.diffuseColor = BABYLON.Color3.FromHexString("#c62828");
      redScarfMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const scarf = BABYLON.MeshBuilder.CreateCylinder("hamScarf", {
        diameterTop: 0.22,
        diameterBottom: 0.22,
        height: 0.04,
        tessellation: 6
      }, this.scene);
      scarf.position.y = -0.06;
      scarf.parent = hamster;
      scarf.material = redScarfMat;
    } else {
      const flower = BABYLON.MeshBuilder.CreateSphere("hamFlower", {
        diameter: 0.04,
        segments: 4
      }, this.scene);
      flower.position.set(0.06, 0.12, 0.08);
      flower.parent = hamster;
      flower.material = whiteMat;
    }

    // Toy in Hands
    if (isChristmas) {
      const giftGroup = new BABYLON.TransformNode("giftGroup", this.scene);
      giftGroup.position.set(0, 0.58, 0.3);
      giftGroup.parent = this.group;

      const greenBoxMat = new BABYLON.StandardMaterial("giftBoxMat", this.scene);
      greenBoxMat.diffuseColor = BABYLON.Color3.FromHexString("#2e7d32");
      greenBoxMat.specularColor = new BABYLON.Color3(0, 0, 0);
      greenBoxMat.flatShading = true;

      const boxMesh = BABYLON.MeshBuilder.CreateBox("giftBox", {
        width: 0.25,
        height: 0.25,
        depth: 0.25
      }, this.scene);
      boxMesh.parent = giftGroup;
      boxMesh.material = greenBoxMat;

      const redRibbonMat = new BABYLON.StandardMaterial("giftRibMat", this.scene);
      redRibbonMat.diffuseColor = BABYLON.Color3.FromHexString("#d50000");
      redRibbonMat.specularColor = new BABYLON.Color3(0, 0, 0);
      redRibbonMat.flatShading = true;

      const ribbonMesh = BABYLON.MeshBuilder.CreateBox("giftRibbon", {
        width: 0.27,
        height: 0.05,
        depth: 0.27
      }, this.scene);
      ribbonMesh.parent = giftGroup;
      ribbonMesh.material = redRibbonMat;
    } else {
      const wmGroup = new BABYLON.TransformNode("wmGroup", this.scene);
      wmGroup.position.set(0, 0.58, 0.35);
      wmGroup.parent = this.group;

      const redMat = new BABYLON.StandardMaterial("melonRedMat", this.scene);
      redMat.diffuseColor = BABYLON.Color3.FromHexString("#ff5252");

      const greenMat = new BABYLON.StandardMaterial("melonGreenMat", this.scene);
      greenMat.diffuseColor = BABYLON.Color3.FromHexString("#4caf50");

      const wmFlesh = BABYLON.MeshBuilder.CreateBox("wmFlesh", {
        width: 0.3,
        height: 0.16,
        depth: 0.06
      }, this.scene);
      wmFlesh.parent = wmGroup;
      wmFlesh.material = redMat;

      const wmrind = BABYLON.MeshBuilder.CreateBox("wmrind", {
        width: 0.32,
        height: 0.04,
        depth: 0.08
      }, this.scene);
      wmrind.position.y = -0.09;
      wmrind.parent = wmGroup;
      wmrind.material = greenMat;
    }

    this.buildFaceDetails();
  }

  buildBoyModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    // Boy Hair (Spiky short hair)
    const hairGroup = new BABYLON.TransformNode("boyHair", this.scene);
    hairGroup.parent = this.group;

    const baseHelm = BABYLON.MeshBuilder.CreateSphere("boyHairBase", {
      diameter: 0.72,
      segments: 8
    }, this.scene);
    baseHelm.position.set(0, 0.98, -0.04);
    baseHelm.parent = hairGroup;
    baseHelm.material = hairMat;

    // Spiky bits (Cones)
    const spikeGeoOpts = { diameterTop: 0, diameterBottom: 0.14, height: 0.24, tessellation: 4 };
    const spikePositions = [
      { x: -0.16, y: 1.25, z: 0.06, rx: -0.3, rz: 0.2 },
      { x: 0.16, y: 1.25, z: 0.06, rx: -0.3, rz: -0.2 },
      { x: 0, y: 1.3, z: -0.08, rx: 0.1, rz: 0 },
      { x: -0.24, y: 1.15, z: -0.12, rx: 0.3, rz: 0.5 },
      { x: 0.24, y: 1.15, z: -0.12, rx: 0.3, rz: -0.5 }
    ];

    spikePositions.forEach((pos, idx) => {
      const spike = BABYLON.MeshBuilder.CreateCylinder(`spike_${idx}`, spikeGeoOpts, this.scene);
      spike.position.set(pos.x, pos.y, pos.z);
      spike.rotation.set(pos.rx, 0, pos.rz);
      spike.parent = hairGroup;
      spike.material = hairMat;
    });

    const bangGeo = { width: 0.16, height: 0.15, depth: 0.1 };
    const bangL = BABYLON.MeshBuilder.CreateBox("boyBangL", bangGeo, this.scene);
    bangL.position.set(-0.1, 1.08, 0.26);
    bangL.rotation.z = -0.15;
    bangL.parent = hairGroup;
    bangL.material = hairMat;

    const bangR = bangL.clone("boyBangR");
    bangR.position.x = 0.1;
    bangR.rotation.z = 0.15;
    bangR.parent = hairGroup;

    // Headwear (Baseball Cap vs Santa Hat)
    const hatGroup = new BABYLON.TransformNode("boyHatGroup", this.scene);
    hatGroup.parent = this.group;

    const capMat = new BABYLON.StandardMaterial("boyCapMat", this.scene);
    capMat.diffuseColor = convertColor(hatColorHex);
    capMat.specularColor = new BABYLON.Color3(0, 0, 0);
    capMat.flatShading = true;
    this.hatMat = capMat;

    if (isChristmas) {
      hatGroup.position.set(0, 1.25, -0.04);
      const cone = BABYLON.MeshBuilder.CreateCylinder("boySantaCone", {
        diameterTop: 0,
        diameterBottom: 0.7,
        height: 0.6,
        tessellation: 8
      }, this.scene);
      cone.position.y = 0.3;
      cone.rotation.z = -0.15;
      cone.parent = hatGroup;
      cone.material = capMat;

      const band = BABYLON.MeshBuilder.CreateCylinder("boySantaBand", {
        diameterTop: 0.72,
        diameterBottom: 0.72,
        height: 0.12,
        tessellation: 8
      }, this.scene);
      band.position.y = 0.05;
      band.parent = hatGroup;
      band.material = whiteMat;

      const pom = BABYLON.MeshBuilder.CreateSphere("boySantaPom", {
        diameter: 0.16,
        segments: 6
      }, this.scene);
      pom.position.set(0.08, 0.62, -0.04);
      pom.parent = hatGroup;
      pom.material = whiteMat;
    } else {
      hatGroup.position.set(0, 1.22, -0.04);
      
      const capDome = BABYLON.MeshBuilder.CreateSphere("capDome", {
        diameter: 0.76,
        segments: 8
      }, this.scene);
      // 压扁一半作为鸭舌帽顶
      capDome.scaling.set(1.0, 0.72, 1.0);
      capDome.parent = hatGroup;
      capDome.material = capMat;

      const visor = BABYLON.MeshBuilder.CreateBox("visor", {
        width: 0.44,
        height: 0.03,
        depth: 0.36
      }, this.scene);
      visor.position.set(0, -0.1, 0.42);
      visor.rotation.x = 0.1;
      visor.parent = hatGroup;
      visor.material = capMat;
    }

    // Toy in Hands (Snowball vs Wooden Sword)
    if (isChristmas) {
      const snow = BABYLON.MeshBuilder.CreateSphere("handSnowball", {
        diameter: 0.18,
        segments: 6
      }, this.scene);
      snow.position.set(0, 0.58, 0.3);
      snow.parent = this.group;
      snow.material = whiteMat;
    } else {
      // 极简木剑
      const sword = new BABYLON.TransformNode("handWoodSword", this.scene);
      sword.position.set(0, 0.58, 0.3);
      sword.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      sword.parent = this.group;

      const hiltMat = new BABYLON.StandardMaterial("woodHiltMat", this.scene);
      hiltMat.diffuseColor = BABYLON.Color3.FromHexString("#8d6e63");
      const hilt = BABYLON.MeshBuilder.CreateCylinder("wHilt", {
        diameterTop: 0.04,
        diameterBottom: 0.04,
        height: 0.15,
        tessellation: 4
      }, this.scene);
      hilt.position.y = -0.12;
      hilt.parent = sword;
      hilt.material = hiltMat;

      const bladeMat = new BABYLON.StandardMaterial("woodBladeMat", this.scene);
      bladeMat.diffuseColor = BABYLON.Color3.FromHexString("#ffd180");
      const blade = BABYLON.MeshBuilder.CreateBox("wBlade", {
        width: 0.06,
        height: 0.45,
        depth: 0.02
      }, this.scene);
      blade.parent = sword;
      blade.material = bladeMat;
    }

    this.buildFaceDetails();
  }

  buildKittyModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    // Fur color is hairColorHex
    const furMat = hairMat;

    // Cat Ears
    const earL = BABYLON.MeshBuilder.CreateCylinder("catEarL", {
      diameterTop: 0,
      diameterBottom: 0.18,
      height: 0.28,
      tessellation: 4
    }, this.scene);
    earL.position.set(-0.24, 1.25, 0.08);
    earL.rotation.set(0.1, 0, 0.38);
    earL.parent = this.group;
    earL.material = furMat;

    const earR = BABYLON.MeshBuilder.CreateCylinder("catEarR", {
      diameterTop: 0,
      diameterBottom: 0.18,
      height: 0.28,
      tessellation: 4
    }, this.scene);
    earR.position.set(0.24, 1.25, 0.08);
    earR.rotation.set(0.1, 0, -0.38);
    earR.parent = this.group;
    earR.material = furMat;

    // Cat Tail (Cylinder chain or smooth segment)
    // 建立单独猫尾节点用于摆动
    this.catTail = new BABYLON.TransformNode("catTail", this.scene);
    this.catTail.position.set(0, 0.24, -0.28);
    this.catTail.rotation.x = -0.6;
    this.catTail.parent = this.group;

    const tailPart = BABYLON.MeshBuilder.CreateCylinder("tailPart", {
      diameterTop: 0.08,
      diameterBottom: 0.08,
      height: 0.55,
      tessellation: 6
    }, this.scene);
    tailPart.position.y = -0.22;
    tailPart.parent = this.catTail;
    tailPart.material = furMat;

    const bellMat = new BABYLON.StandardMaterial("bellMat", this.scene);
    bellMat.diffuseColor = convertColor(hatColorHex);
    bellMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0);
    this.hatMat = bellMat;

    if (isChristmas) {
      // 圣诞帽
      const hatGroup = new BABYLON.TransformNode("catHat", this.scene);
      hatGroup.position.set(0, 1.25, -0.04);
      hatGroup.parent = this.group;

      const cone = BABYLON.MeshBuilder.CreateCylinder("santaCone", {
        diameterTop: 0,
        diameterBottom: 0.65,
        height: 0.52,
        tessellation: 8
      }, this.scene);
      cone.position.y = 0.26;
      cone.rotation.z = -0.12;
      cone.parent = hatGroup;
      cone.material = new BABYLON.StandardMaterial("santaRed", this.scene);
      cone.material.diffuseColor = BABYLON.Color3.FromHexString("#d50000");

      const band = BABYLON.MeshBuilder.CreateCylinder("santaBand", {
        diameterTop: 0.68,
        diameterBottom: 0.68,
        height: 0.1,
        tessellation: 8
      }, this.scene);
      band.position.y = 0.04;
      band.parent = hatGroup;
      band.material = whiteMat;
    } else {
      // 胸前金铃铛
      const collarMat = new BABYLON.StandardMaterial("collarMat", this.scene);
      collarMat.diffuseColor = BABYLON.Color3.FromHexString("#d50000");

      const collar = BABYLON.MeshBuilder.CreateCylinder("catCollar", {
        diameterTop: 0.44,
        diameterBottom: 0.44,
        height: 0.05,
        tessellation: 8
      }, this.scene);
      collar.position.y = 0.72;
      collar.parent = this.group;
      collar.material = collarMat;

      const bell = BABYLON.MeshBuilder.CreateSphere("catBell", {
        diameter: 0.12,
        segments: 6
      }, this.scene);
      bell.position.set(0, 0.66, 0.22);
      bell.parent = this.group;
      bell.material = bellMat;
    }

    // Cat Whiskers
    const whiskerMat = new BABYLON.StandardMaterial("whiskerMat", this.scene);
    whiskerMat.diffuseColor = BABYLON.Color3.FromHexString("#757575");
    whiskerMat.disableLighting = true;
    whiskerMat.emissiveColor = whiskerMat.diffuseColor;

    const wGeoOpts = { width: 0.28, height: 0.016, depth: 0.01 };
    
    // Whiskers Left (3根)
    for (let i = 0; i < 3; i++) {
      const wL = BABYLON.MeshBuilder.CreateBox(`whiskerL_${i}`, wGeoOpts, this.scene);
      wL.position.set(-0.25, 0.88 + (i - 1) * 0.05, 0.26);
      wL.rotation.z = -0.15 + i * 0.15;
      wL.rotation.y = -0.2;
      wL.parent = this.group;
      wL.material = whiskerMat;

      const wR = BABYLON.MeshBuilder.CreateBox(`whiskerR_${i}`, wGeoOpts, this.scene);
      wR.position.set(0.25, 0.88 + (i - 1) * 0.05, 0.26);
      wR.rotation.z = 0.15 - i * 0.15;
      wR.rotation.y = 0.2;
      wR.parent = this.group;
      wR.material = whiskerMat;
    }

    this.buildFaceDetails();
  }

  buildFaceDetails() {
    const eyeMat = new BABYLON.StandardMaterial("eyeMat", this.scene);
    eyeMat.diffuseColor = BABYLON.Color3.FromHexString("#4e342e");
    eyeMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const eyeL = BABYLON.MeshBuilder.CreateSphere("eyeL", {
      diameter: 0.12,
      segments: 5
    }, this.scene);
    eyeL.position.set(-0.11, 0.94, 0.27);
    eyeL.parent = this.group;
    eyeL.material = eyeMat;

    const eyeR = eyeL.clone("eyeR");
    eyeR.position.set(0.11, 0.94, 0.27);
    eyeR.parent = this.group;

    const blushMat = new BABYLON.StandardMaterial("blushMat", this.scene);
    blushMat.diffuseColor = BABYLON.Color3.FromHexString("#ff8a80");
    blushMat.specularColor = new BABYLON.Color3(0, 0, 0);
    blushMat.flatShading = true;

    const blushL = BABYLON.MeshBuilder.CreateSphere("blushL", {
      diameter: 0.1,
      segments: 4
    }, this.scene);
    blushL.position.set(-0.19, 0.87, 0.25);
    blushL.parent = this.group;
    blushL.material = blushMat;

    const blushR = blushL.clone("blushR");
    blushR.position.set(0.19, 0.87, 0.25);
    blushR.parent = this.group;
  }

  updateModel(modelType) {
    if (this.activeModel === modelType) return;
    this.activeModel = modelType;

    const hairColor = this.hairMat ? this.hairMat.diffuseColor.toHexString() : (this.themeConfig.player.hairColor || 0xff8a80);
    const clothingColor = this.clothingMat ? this.clothingMat.diffuseColor.toHexString() : (this.themeConfig.player.clothingColor || 0xffffff);
    const hatColor = this.hatMat ? this.hatMat.diffuseColor.toHexString() : (this.themeConfig.player.hatColor || 0xffd180);

    this.rebuildMesh(hairColor, clothingColor, hatColor);
  }

  initControls() {
    const handleKey = (e, isDown) => {
      if (this.isSitting || this.isLyingDown) {
        if (isDown && (e.key === ' ' || e.key === 'Spacebar')) {
          this.standUp();
        }
        return;
      }
      if (this.controlsLocked) return;
      
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') this.keys.w = isDown;
      if (key === 's' || e.key === 'ArrowDown') this.keys.s = isDown;
      if (key === 'a' || e.key === 'ArrowLeft') this.keys.a = isDown;
      if (key === 'd' || e.key === 'ArrowRight') this.keys.d = isDown;
      if (e.key === ' ' || e.key === 'Spacebar') {
        const isRadialOpen = window.parent && window.parent.isRadialMenuOpen;
        this.keys.space = isRadialOpen ? false : isDown;
      }
      if (e.key === 'Shift') this.keys.shift = isDown;
    };

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (window.parent && window.parent !== window) {
          const evt = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
          window.parent.dispatchEvent(evt);
        }
      }
      handleKey(e, true);
    });
    window.addEventListener('keyup', (e) => handleKey(e, false));

    // Mouse drag Orbit Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    window.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      this.cameraAngleH += deltaX * 0.005;
      this.cameraAngleV = Math.max(0.1, Math.min(1.2, this.cameraAngleV + deltaY * 0.005));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobile camera look
    let cameraTouchId = null;

    document.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        const targetEl = touch.target && touch.target.closest ? touch.target : null;
        const isUI = targetEl ? (
                     targetEl.closest('#mobile-controls') || 
                     targetEl.closest('.hud-header') || 
                     targetEl.closest('.modal-overlay') || 
                     targetEl.closest('.modal-card') ||
                     targetEl.closest('.sso-sidebar') || 
                     targetEl.closest('.sidebar-overlay') || 
                     targetEl.id === 'audio-btn'
                    ) : false;
                     
        const isLeftHalf = touch.clientX < window.innerWidth * 0.45;
                     
        if (!isUI && !isLeftHalf && cameraTouchId === null) {
          isDragging = true;
          cameraTouchId = touch.identifier;
          previousMousePosition = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isDragging || cameraTouchId === null) return;
      
      let cameraTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === cameraTouchId) {
          cameraTouch = e.touches[i];
          break;
        }
      }
      
      if (!cameraTouch) return;
      
      e.preventDefault();
      
      const deltaX = cameraTouch.clientX - previousMousePosition.x;
      const deltaY = cameraTouch.clientY - previousMousePosition.y;

      this.cameraAngleH += deltaX * 0.005;
      this.cameraAngleV = Math.max(0.1, Math.min(1.2, this.cameraAngleV + deltaY * 0.005));

      previousMousePosition = { x: cameraTouch.clientX, y: cameraTouch.clientY };
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
          isDragging = false;
          cameraTouchId = null;
          break;
        }
      }
    });
  }

  resetInputs() {
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    const parentJoystick = window.parent && window.parent.joystickDir ? window.parent.joystickDir : window.joystickDir;
    if (parentJoystick) {
      parentJoystick.x = 0;
      parentJoystick.y = 0;
    }
  }

  update(delta, time) {
    // 1. 同步外层 Iframe 的输入状态
    if (window.self !== window.top && window.parent) {
      if (window.parent.isRadialMenuOpen) {
        this.keys.space = false;
        if (window.parent.keys) window.parent.keys.space = false;
      } else if (window.parent.keys) {
        this.keys.space = this.keys.space || window.parent.keys.space;
      }
      if (window.parent.keys) {
        this.keys.shift = this.keys.shift || window.parent.keys.shift;
        this.keys.j = this.keys.j || window.parent.keys.j;
      }
    }

    // 2. 躺着或坐着时，若按了跳跃键，触发站立
    if (this.isSitting || this.isLyingDown) {
      if (this.keys.space) {
        this.standUp();
        if (window.parent && window.parent.keys) {
          window.parent.keys.space = false;
        }
        this.keys.space = false;
      }
    }

    if (this.isLyingDown) {
      this.velocity.set(0, 0, 0);
      this.isGrounded = true;
      this.group.position.copyFrom(this.position);
      
      if (this.lyingRotation) {
        this.group.rotation.x = this.lyingRotation.x;
        this.group.rotation.y = this.lyingRotation.y;
        this.group.rotation.z = this.lyingRotation.z;
      } else {
        this.group.rotation.x = -Math.PI / 2; // Lie flat
        this.group.rotation.y = 0; 
        this.group.rotation.z = 0;
      }

      this.body.rotation.x = 0;
      this.footL.position.set(-0.16, 0.05, 0);
      this.footR.position.set(0.16, 0.05, 0);
      this.body.position.y = 0.38;
      this.head.position.y = 0.88;

      this.cape.rotation.x = 0.15;
      
      // 平整化更新披风位置 (在躺下时披风放平)
      const positions = this.cape.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (positions) {
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 2] = 0;
        }
        this.cape.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      }

      // 相机平滑跟随
      const targetCamX = this.position.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
      const targetCamY = this.position.y + Math.sin(this.cameraAngleV) * this.cameraDistance + 0.8;
      const targetCamZ = this.position.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

      const lookAtTarget = this.position.add(new BABYLON.Vector3(0, 0.4, 0));
      this.camera.setTarget(lookAtTarget);
      return;
    }

    if (this.isSitting && this.swingRef) {
      if (this.swingRef.isStatic) {
        this.position.copyFrom(this.swingRef.position);
        this.position.y += 0.22; // 贴合石凳高度
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.group.position.copyFrom(this.position);
        this.group.rotation.y = this.swingRef.rotationY;
      } else {
        const rotationX = this.swingRef.rotation.x;
        const seatLength = 1.1;
        this.position.x = this.swingRef.parent.position.x + this.swingRef.position.x;
        this.position.y = (this.swingRef.parent.position.y + this.swingRef.position.y) - (seatLength * Math.cos(rotationX)) - 0.28;
        this.position.z = this.swingRef.parent.position.z + this.swingRef.position.z - (seatLength * Math.sin(rotationX));

        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
        this.group.position.copyFrom(this.position);
        this.group.rotation.y = 0; // Face Z axis
      }

      // Sitting pose
      this.footL.position.set(-0.16, 0.15, 0.18);
      this.footR.position.set(0.16, 0.15, 0.18);
      this.body.position.y = 0.3; 
      this.head.position.y = 0.8;

      // Cape and twins sway with swing
      this.cape.rotation.x = -0.1 + Math.sin(time * 0.002) * 0.05;
      
      const positions = this.cape.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (positions) {
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 2] = 0;
        }
        this.cape.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      }

      if (this.tailL) this.tailL.rotation.z = -0.2 - Math.sin(time * 0.002) * 0.1;
      if (this.tailR) this.tailR.rotation.z = 0.2 + Math.sin(time * 0.002) * 0.1;

      if (this.catTail) {
        this.catTail.rotation.y = Math.sin(time * 0.003) * 0.15;
      }

      // Camera follow sitting
      const targetCamX = this.position.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
      const targetCamY = this.position.y + Math.sin(this.cameraAngleV) * this.cameraDistance + 0.8;
      const targetCamZ = this.position.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

      const lookAtTarget = this.position.add(new BABYLON.Vector3(0, 0.8, 0));
      this.camera.setTarget(lookAtTarget);

      return;
    }

    // 1. Movement vector relative to camera direction
    let moveX = 0;
    let moveZ = 0;

    const parentJoystick = window.parent && window.parent.joystickDir ? window.parent.joystickDir : window.joystickDir;

    if (!this.controlsLocked) {
      if (this.keys.w) moveZ += 1;
      if (this.keys.s) moveZ -= 1;
      if (this.keys.a) moveX -= 1;
      if (this.keys.d) moveX += 1;

      // Joystick input override (joystickDir has x, y in [-1, 1])
      if (parentJoystick && (parentJoystick.x !== 0 || parentJoystick.y !== 0)) {
        moveX = parentJoystick.x;
        moveZ = parentJoystick.y; // 摇杆上推为前，统一为正方向
      }
    }

    // Apply camera rotation to movement vector (使用相机的前向与右向正交计算)
    const cameraForward = this.camera.getForwardRay().direction;
    const forwardX = cameraForward.x;
    const forwardZ = cameraForward.z;
    const lenF = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
    
    let fX = 0;
    let fZ = 0;
    if (lenF > 0.001) {
      fX = forwardX / lenF;
      fZ = forwardZ / lenF;
    }
    
    // 右向量 (Y 轴与前向量叉乘在左手系下为 [fZ, 0, -fX])
    const rX = fZ;
    const rZ = -fX;

    const directionX = fX * moveZ + rX * moveX;
    const directionZ = fZ * moveZ + rZ * moveX;

    const isRunning = this.keys.shift;
    const currentSpeed = isRunning ? this.speed * 1.55 : this.speed;

    // Normalize movement vector if length > 0
    const len = Math.sqrt(directionX * directionX + directionZ * directionZ);
    if (len > 0.01) {
      // If using joystick, don't force full speed unless fully tilted
      const hasJoystick = parentJoystick && (parentJoystick.x !== 0 || parentJoystick.y !== 0);
      const speedScale = hasJoystick ? Math.min(Math.sqrt(parentJoystick.x * parentJoystick.x + parentJoystick.y * parentJoystick.y), 1.0) : 1.0;
      this.velocity.x = (directionX / len) * currentSpeed * speedScale;
      this.velocity.z = (directionZ / len) * currentSpeed * speedScale;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 2. Apply Gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Boundaries check
    if (this.app && this.app.currentMap === 'house') {
      const boundary = 11.5;
      if (this.position.x < -boundary) this.position.x = -boundary;
      if (this.position.x > boundary) this.position.x = boundary;
      if (this.position.z < -boundary) this.position.z = -boundary;
      if (this.position.z > boundary) this.position.z = boundary;
    } else {
      const maxRadius = 21.2;
      const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
      if (distFromCenter > maxRadius) {
        this.position.x = (this.position.x / distFromCenter) * maxRadius;
        this.position.z = (this.position.z / distFromCenter) * maxRadius;
      }
    }

    // 3. Floor Collisions
    let onFloor = false;
    let highestFloorY = -999;

    if (this.colliders) {
      for (const col of this.colliders) {
        if (col.type === 'floor') {
          const dx = this.position.x - col.worldX;
          const dz = this.position.z - col.worldZ;
          const dist2D = Math.sqrt(dx * dx + dz * dz);

          if (dist2D < col.radius + 0.1) {
            if (this.position.y >= col.worldY - 0.8 && this.position.y <= col.worldY + 0.1) {
              highestFloorY = Math.max(highestFloorY, col.worldY);
              onFloor = true;
            }
          }
        }
      }
    }

    if (onFloor) {
      if (this.velocity.y <= 0) {
        this.position.y = highestFloorY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // Fall zone reset
    if (this.position.y < -10) {
      this.position.set(0, 4, 0);
      this.velocity.set(0, 0, 0);
      this.isGrounded = false;
    }

    const isRadialOpen = window.parent && window.parent.isRadialMenuOpen;
    
    // 4. Jump
    if (this.keys.space && this.isGrounded && !this.controlsLocked && !isRadialOpen) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.keys.space = false;
      if (window.parent && window.parent.keys) {
        window.parent.keys.space = false;
      }
    }

    // 5. Update character rotations & animations
    this.group.position.copyFrom(this.position);

    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    if (horizontalSpeed > 0.1) {
      this.targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      
      let diff = this.targetRotation - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * 0.25;

      // Running / Walking bounce animations
      const bounceSpeed = isRunning ? 16 : 10;
      const angleBounce = Math.sin(time * 0.001 * bounceSpeed);

      this.body.position.y = 0.55 + Math.abs(angleBounce) * 0.04;
      this.head.position.y = 0.94 + Math.abs(angleBounce) * 0.035;

      this.footL.position.y = 0.04 + Math.max(0, angleBounce) * 0.12;
      this.footR.position.y = 0.04 + Math.max(0, -angleBounce) * 0.12;
      this.footL.position.z = Math.max(0, -angleBounce) * 0.12;
      this.footR.position.z = Math.max(0, angleBounce) * 0.12;

      this.body.rotation.y = Math.sin(time * 0.001 * bounceSpeed) * 0.08;

      if (this.tailL) this.tailL.rotation.z = -0.25 - Math.abs(angleBounce) * 0.15;
      if (this.tailR) this.tailR.rotation.z = 0.25 + Math.abs(angleBounce) * 0.15;

      if (this.catTail) {
        this.catTail.rotation.y = Math.sin(time * 0.004) * 0.28;
        this.catTail.rotation.x = -0.6 + Math.cos(time * 0.004) * 0.12;
      }
    } else {
      // Idle breathing animations
      this.footL.position.set(-0.16, 0.04, 0);
      this.footR.position.set(0.16, 0.04, 0);
      this.body.position.y = 0.55 + Math.sin(time * 0.003) * 0.015;
      this.head.position.y = 0.94 + Math.sin(time * 0.003) * 0.012;

      if (this.tailL) this.tailL.rotation.z = -0.25 - Math.sin(time * 0.003) * 0.05;
      if (this.tailR) this.tailR.rotation.z = 0.25 + Math.sin(time * 0.003) * 0.05;

      if (this.catTail) {
        this.catTail.rotation.y = Math.sin(time * 0.003) * 0.15;
        this.catTail.rotation.z = Math.cos(time * 0.003) * 0.03;
      }
    }

    // 6. Cape/Scarf wave wave wave
    const positions = this.cape.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (positions) {
      const waveSpeed = 18;
      const waveFrequency = 2.2;
      const waveAmplitude = 0.08 + (horizontalSpeed * 0.03);

      for (let i = 0; i < positions.length / 3; i++) {
        // 由于 CreateGround 在 XZ 平面，我们用 Z 轴旋转 90度 + X 轴旋转 90度后，
        // 原本的 y 对应高低，x 对应左右
        const lx = positions[i * 3];     // X 坐标
        const ly = positions[i * 3 + 1]; // Y 坐标 (在 Ground 里是 Z，但在平面里是垂直方向高度)
        const distFromTop = 0.4 - ly;
        const zOffset = Math.sin((time * 0.001 * waveSpeed) - (distFromTop * waveFrequency)) * waveAmplitude * (distFromTop / 0.8);
        
        // 我们通过修改 Z 轴坐标来产生波浪
        positions[i * 3 + 2] = zOffset;
      }
      this.cape.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    }

    // 7. Update camera horizontal & vertical angles (Orbit)
    const targetCamX = this.position.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const targetCamY = this.position.y + Math.sin(this.cameraAngleV) * this.cameraDistance + 0.8;
    const targetCamZ = this.position.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;

    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

    const lookAtTarget = this.position.add(new BABYLON.Vector3(0, 0.8, 0));
    this.camera.setTarget(lookAtTarget);
  }

  sit(swingSeatGroup) {
    this.isSitting = true;
    this.swingRef = swingSeatGroup;
    this.controlsLocked = true;
  }

  lieDown(bedPos, customRotation) {
    this.isLyingDown = true;
    this.controlsLocked = true;
    this.position.copyFrom(bedPos);
    this.position.y = bedPos.y + 0.58; // relative bed elevation
    
    if (customRotation) {
      this.lyingRotation = customRotation;
    } else {
      this.lyingRotation = null;
    }

    if (window.parent && window.parent.appShell && typeof window.parent.appShell.hideMobileControls === 'function') {
      window.parent.appShell.hideMobileControls();
    }
    if (window.gameApp && typeof window.gameApp.updateTaskProgress === 'function') {
      window.gameApp.updateTaskProgress('rest', 1);
    }
  }

  updateOutfit(type, colorHex) {
    const color = convertColor(colorHex);
    if (type === 'hair' && this.hairMat) {
      this.hairMat.diffuseColor = color;
    } else if (type === 'clothing' && this.clothingMat) {
      this.clothingMat.diffuseColor = color;
    } else if (type === 'hat' && this.hatMat) {
      this.hatMat.diffuseColor = color;
    }
  }

  standUp() {
    if (this.isLyingDown) {
      this.isLyingDown = false;
      this.controlsLocked = false;
      this.group.rotation.x = 0;
      this.group.rotation.y = 0;
      this.group.rotation.z = 0;
      if (this.lyingRotation) {
        this.lyingRotation = null;
        this.position.x += 1.0;
      } else {
        this.position.z += 1.4;
      }
      this.position.y = 0.8;
      
      const bedHud = document.getElementById('bed-hud');
      if (bedHud) bedHud.style.display = 'none';

      if (window.parent && window.parent.appShell && typeof window.parent.appShell.showMobileControls === 'function') {
        window.parent.appShell.showMobileControls();
      }
      return;
    }

    const isStaticSeat = this.swingRef && this.swingRef.isStatic;

    this.isSitting = false;
    this.swingRef = null;
    this.controlsLocked = false;
    
    if (isStaticSeat) {
      if (this.position.x > 0) {
        this.position.x += 0.9;
      } else {
        this.position.x -= 0.9;
      }
      this.position.y = 0.6;
    } else {
      this.position.z += 1.2;
      this.position.y = 0.8;
    }

    const exitSittingHud = document.getElementById('exit-sitting-hud');
    if (exitSittingHud) {
      exitSittingHud.style.display = 'none';
    }
  }

  // ==================== 实体生命周期合同（Task 5.4）====================
  // Player 参与 core/lifecycle 约定（init / update / dispose），保留 `Player` 命名。
  // update(delta, time) 已在上方实现；init 为兼容上下文挂钩，dispose 释放根节点。
  init(ctx) {
    // 运行时引用由 WorldManager 在构造后注入（app/scene/camera），此处保留扩展位。
  }

  dispose() {
    if (this.group && typeof this.group.dispose === 'function') {
      this.group.dispose();
    }
    this.group = null;
  }
}
