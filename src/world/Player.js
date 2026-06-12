import * as THREE from 'three';

export class Player {
  constructor(scene, camera, colliders, themeConfig) {
    this.scene = scene;
    this.camera = camera;
    this.colliders = colliders;
    this.themeConfig = themeConfig;
    
    // Physics and Movement state
    this.position = new THREE.Vector3(0, 4, 0); // Spawn slightly in the air
    this.velocity = new THREE.Vector3();
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
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.activeModel = 'girl'; // Default model is girl

    const hairColorHex = this.themeConfig.player.hairColor || 0xff8a80;
    const clothingColorHex = this.themeConfig.player.clothingColor || 0xffffff;
    const hatColorHex = this.themeConfig.player.hatColor || 0xffd180;

    this.rebuildMesh(hairColorHex, clothingColorHex, hatColorHex);
  }

  rebuildMesh(hairColorHex, clothingColorHex, hatColorHex) {
    // Clear all children of this.group to rebuild
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    // Clear old animation references
    this.tailL = null;
    this.tailR = null;
    this.catTail = null;

    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd, flatShading: true }); // skin
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }); // white details
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColorHex, flatShading: true }); // hair / fur
    this.hairMat = hairMat;

    // 1. Torso & Clothes
    const topGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.35, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: clothingColorHex, flatShading: true });
    this.clothingMat = topMat;
    this.body = new THREE.Mesh(topGeo, topMat);
    this.body.position.y = 0.55;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Lower body (shorts/pants)
    const lowerBodyColor = isChristmas ? 0x263238 : 0x3f51b5;
    const shortsGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.3, 8);
    const lowerMat = new THREE.MeshLambertMaterial({ color: lowerBodyColor, flatShading: true });
    const shorts = new THREE.Mesh(shortsGeo, lowerMat);
    shorts.position.y = 0.25;
    shorts.castShadow = true;
    this.group.add(shorts);

    // 2. Head & Neck
    const headGeo = new THREE.SphereGeometry(0.34, 8, 8);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.94;
    this.head.castShadow = true;
    this.group.add(this.head);

    const neckGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 6);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.75;
    this.group.add(neck);

    // 3. Sandals / Boots / Shoes
    const sandalColor = isChristmas ? 0x5d4037 : (this.activeModel === 'boy' ? 0xff5252 : 0xffffff); // Red sneakers for boy, white sandals for girl
    const sandalMat = new THREE.MeshLambertMaterial({ color: sandalColor, flatShading: true });
    const footGeo = new THREE.SphereGeometry(0.09, 6, 6);
    footGeo.scale(1, isChristmas ? 1.0 : 0.7, 1.3);

    this.footL = new THREE.Mesh(footGeo, sandalMat);
    this.footL.position.set(-0.16, 0.04, 0);
    this.footR = new THREE.Mesh(footGeo, sandalMat);
    this.footR.position.set(0.16, 0.04, 0);

    if (!isChristmas && this.activeModel === 'girl') {
      const sandalBowGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
      const sBowL = new THREE.Mesh(sandalBowGeo, sandalMat);
      sBowL.position.set(-0.16, 0.06, 0.08);
      const sBowR = new THREE.Mesh(sandalBowGeo, sandalMat);
      sBowR.position.set(0.16, 0.06, 0.08);
      this.group.add(sBowL);
      this.group.add(sBowR);
    }
    this.group.add(this.footL);
    this.group.add(this.footR);

    // Build model specific features
    if (this.activeModel === 'girl') {
      this.buildGirlModel(hairMat, whiteMat, hatColorHex, isChristmas);
    } else if (this.activeModel === 'boy') {
      this.buildBoyModel(hairMat, whiteMat, hatColorHex, isChristmas);
    } else if (this.activeModel === 'kitty') {
      this.buildKittyModel(hairMat, whiteMat, hatColorHex, isChristmas);
    }

    // 4. Cardigan / Scarf (waving cape)
    const capeColor = isChristmas ? 0xd50000 : 0xffffff;
    const capeMat = new THREE.MeshLambertMaterial({
      color: capeColor,
      transparent: !isChristmas,
      opacity: isChristmas ? 1.0 : 0.8,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    if (isChristmas) {
      const capeGeo = new THREE.PlaneGeometry(0.55, 0.7, 2, 4);
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0.05, 0.62, -0.22);
      this.cape.rotation.x = 0.12;
      this.cape.rotation.y = 0.05;
      this.cape.castShadow = true;
      this.group.add(this.cape);
    } else {
      const capeGeo = new THREE.PlaneGeometry(0.65, 0.75, 3, 5);
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0, 0.48, -0.32);
      this.cape.rotation.x = 0.15;
      this.cape.castShadow = true;
      this.group.add(this.cape);
    }

    this.scene.add(this.group);
  }

  buildGirlModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    // Hair (helm, bangs, twin-tails)
    const hairHelmGeo = new THREE.SphereGeometry(0.36, 8, 8);
    const hairHelm = new THREE.Mesh(hairHelmGeo, hairMat);
    hairHelm.position.set(0, 0.98, -0.04);
    this.group.add(hairHelm);

    const bangGeo = new THREE.BoxGeometry(0.18, 0.18, 0.12);
    const bangL = new THREE.Mesh(bangGeo, hairMat);
    bangL.position.set(-0.12, 1.05, 0.26);
    bangL.rotation.z = -0.2;
    bangL.rotation.y = 0.1;
    this.group.add(bangL);

    const bangR = new THREE.Mesh(bangGeo, hairMat);
    bangR.position.set(0.12, 1.05, 0.26);
    bangR.rotation.z = 0.2;
    bangR.rotation.y = -0.1;
    this.group.add(bangR);

    const tailGeo = new THREE.ConeGeometry(0.1, 0.52, 6);
    tailGeo.rotateX(Math.PI);
    
    this.tailL = new THREE.Mesh(tailGeo, hairMat);
    this.tailL.position.set(-0.35, 0.94, -0.05);
    this.tailL.rotation.z = -0.25;
    this.group.add(this.tailL);

    this.tailR = new THREE.Mesh(tailGeo, hairMat);
    this.tailR.position.set(0.35, 0.94, -0.05);
    this.tailR.rotation.z = 0.25;
    this.group.add(this.tailR);

    // Hair Clip
    if (isChristmas) {
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), whiteMat);
      clip.position.set(0.24, 1.12, 0.24);
      clip.rotation.z = Math.PI / 4;
      this.group.add(clip);
    } else {
      const clipRind = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
      clipRind.position.set(0.24, 1.12, 0.24);
      clipRind.rotation.z = -0.4;
      const clipFlesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), new THREE.MeshLambertMaterial({ color: 0xff5252 }));
      clipFlesh.position.set(0.24, 1.14, 0.26);
      clipFlesh.rotation.z = -0.4;
      this.group.add(clipRind);
      this.group.add(clipFlesh);
    }

    // Headwear (Santa Hat vs Straw Hat)
    if (isChristmas) {
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 1.25, -0.04);

      const coneGeo = new THREE.ConeGeometry(0.35, 0.6, 8);
      coneGeo.translate(0, 0.3, 0);
      const redMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
      this.hatMat = redMat;
      const cone = new THREE.Mesh(coneGeo, redMat);
      cone.rotation.z = -0.15;
      cone.rotation.x = -0.1;
      cone.castShadow = true;
      hatGroup.add(cone);

      const bandGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 8);
      const band = new THREE.Mesh(bandGeo, whiteMat);
      band.position.y = 0.05;
      hatGroup.add(band);

      const pomGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const pom = new THREE.Mesh(pomGeo, whiteMat);
      pom.position.set(0.08, 0.62, -0.04);
      hatGroup.add(pom);

      this.group.add(hatGroup);
    } else {
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 1.28, -0.04);
      
      const brimGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.04, 10);
      const strawMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
      this.hatMat = strawMat;
      const brim = new THREE.Mesh(brimGeo, strawMat);
      brim.castShadow = true;
      hatGroup.add(brim);

      const crownGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.25, 8);
      const crown = new THREE.Mesh(crownGeo, strawMat);
      crown.position.y = 0.14;
      crown.castShadow = true;
      hatGroup.add(crown);

      const ribbonGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.06, 8);
      const ribbon = new THREE.Mesh(ribbonGeo, whiteMat);
      ribbon.position.y = 0.05;
      hatGroup.add(ribbon);

      this.group.add(hatGroup);
    }

    // Glasses
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 1.22, 0.3);
    glassGroup.rotation.x = -0.15;

    const lensGeo = new THREE.SphereGeometry(0.12, 6, 6);
    lensGeo.scale(1, 1, 0.2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.x = -0.16;
    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.x = 0.16;
    glassGroup.add(lensL);
    glassGroup.add(lensR);

    const frameColor = isChristmas ? 0xffffff : 0xff80ab;
    const frameMat = new THREE.MeshLambertMaterial({ color: frameColor, flatShading: true });
    
    if (isChristmas) {
      const frameGeo = new THREE.BoxGeometry(0.48, 0.2, 0.06);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0, 0.02);
      glassGroup.add(frame);
    } else {
      const frameGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
      frameGeo.rotateX(Math.PI / 2);
      const frameL = new THREE.Mesh(frameGeo, frameMat);
      frameL.position.set(-0.16, 0, 0.02);
      const frameR = new THREE.Mesh(frameGeo, frameMat);
      frameR.position.set(0.16, 0, 0.02);
      glassGroup.add(frameL);
      glassGroup.add(frameR);
    }
    this.group.add(glassGroup);

    // Hamster on Head
    const hamster = new THREE.Group();
    hamster.position.set(0.1, isChristmas ? 1.55 : 1.48, -0.06);
    const hamBodyGeo = new THREE.SphereGeometry(0.14, 6, 6);
    hamBodyGeo.scale(1, 0.9, 1.1);
    const hamColor = isChristmas ? 0xb0bec5 : 0xffd180;
    const hamMat = new THREE.MeshLambertMaterial({ color: hamColor, flatShading: true });
    const hamBody = new THREE.Mesh(hamBodyGeo, hamMat);
    hamster.add(hamBody);

    const earGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const earL = new THREE.Mesh(earGeo, hamMat);
    earL.position.set(-0.06, 0.09, 0.05);
    const earR = new THREE.Mesh(earGeo, hamMat);
    earR.position.set(0.06, 0.09, 0.05);
    hamster.add(earL);
    hamster.add(earR);

    const hamBlush = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshLambertMaterial({ color: 0xff8a80 }));
    hamBlush.position.set(0.08, 0, 0.11);
    hamster.add(hamBlush);

    if (isChristmas) {
      const scarfGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 6);
      const scarf = new THREE.Mesh(scarfGeo, new THREE.MeshLambertMaterial({ color: 0xc62828 }));
      scarf.position.y = -0.06;
      hamster.add(scarf);
    } else {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), whiteMat);
      flower.position.set(0.06, 0.12, 0.08);
      hamster.add(flower);
    }
    this.group.add(hamster);

    // Interactive Toy in Hands
    if (isChristmas) {
      const giftGroup = new THREE.Group();
      giftGroup.position.set(0, 0.58, 0.3);
      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true }));
      boxMesh.castShadow = true;
      giftGroup.add(boxMesh);
      const ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.27), new THREE.MeshLambertMaterial({ color: 0xd50000, flatShading: true }));
      giftGroup.add(ribbonMesh);
      this.group.add(giftGroup);
    } else {
      const wmGroup = new THREE.Group();
      wmGroup.position.set(0, 0.58, 0.35);
      const fleshGeo = new THREE.BoxGeometry(0.3, 0.16, 0.06);
      const wmFlesh = new THREE.Mesh(fleshGeo, new THREE.MeshLambertMaterial({ color: 0xff5252 }));
      wmGroup.add(wmFlesh);
      const rindGeo = new THREE.BoxGeometry(0.32, 0.04, 0.08);
      const wmrind = new THREE.Mesh(rindGeo, new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
      wmrind.position.y = -0.09;
      wmGroup.add(wmrind);
      this.group.add(wmGroup);
    }

    this.buildFaceDetails();
  }

  buildBoyModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    // Spiky Hair
    const hairHelmGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const hairHelm = new THREE.Mesh(hairHelmGeo, hairMat);
    hairHelm.position.set(0, 0.98, -0.04);
    this.group.add(hairHelm);

    // Spiky Bangs
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
    spikeGeo.rotateX(Math.PI / 1.8);
    
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(spikeGeo, hairMat);
      const offset = -0.15 + i * 0.1;
      spike.position.set(offset, 1.08, 0.26);
      spike.rotation.y = offset * 0.5;
      spike.castShadow = true;
      this.group.add(spike);
    }

    // Top spiky tufts
    const topSpikeGeo = new THREE.ConeGeometry(0.07, 0.22, 4);
    topSpikeGeo.rotateX(-0.3);
    const topSpikeOffsets = [
      { x: -0.14, y: 1.25, z: -0.08 },
      { x: 0.14, y: 1.25, z: -0.08 },
      { x: 0, y: 1.28, z: -0.04 },
      { x: -0.08, y: 1.24, z: -0.2 },
      { x: 0.08, y: 1.24, z: -0.2 }
    ];
    topSpikeOffsets.forEach(offset => {
      const tSpike = new THREE.Mesh(topSpikeGeo, hairMat);
      tSpike.position.set(offset.x, offset.y, offset.z);
      tSpike.castShadow = true;
      this.group.add(tSpike);
    });

    // Baseball Cap
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.24, -0.04);
    const capMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
    this.hatMat = capMat;

    const crownGeo = new THREE.CylinderGeometry(0.35, 0.36, 0.22, 8);
    const crown = new THREE.Mesh(crownGeo, capMat);
    crown.castShadow = true;
    hatGroup.add(crown);

    const visorGeo = new THREE.BoxGeometry(0.46, 0.02, 0.35);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, -0.06, 0.28);
    visor.rotation.x = 0.14;
    visor.castShadow = true;
    hatGroup.add(visor);

    const btnGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const button = new THREE.Mesh(btnGeo, whiteMat);
    button.position.y = 0.12;
    hatGroup.add(button);
    this.group.add(hatGroup);

    // Sunglasses
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 1.22, 0.3);
    
    const lensGeo = new THREE.BoxGeometry(0.14, 0.09, 0.02);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.x = -0.16;
    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.x = 0.16;
    glassGroup.add(lensL);
    glassGroup.add(lensR);

    const frameMat = new THREE.MeshLambertMaterial({ color: isChristmas ? 0xffffff : 0x2196f3, flatShading: true });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.03), frameMat);
    bridge.position.set(0, 0, 0.01);
    glassGroup.add(bridge);

    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.04), frameMat);
    sideL.position.set(-0.24, 0, 0.01);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.04), frameMat);
    sideR.position.set(0.24, 0, 0.01);
    glassGroup.add(sideL);
    glassGroup.add(sideR);
    this.group.add(glassGroup);

    // Crab on Shoulder
    const crab = new THREE.Group();
    crab.position.set(-0.35, 0.65, 0.05);
    crab.scale.set(0.8, 0.8, 0.8);
    const crabMat = new THREE.MeshLambertMaterial({ color: 0xff5252, flatShading: true });
    const crabBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.15), crabMat);
    crabBody.castShadow = true;
    crab.add(crabBody);

    const cEyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const cEyeL = new THREE.Mesh(cEyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cEyeL.position.set(-0.05, 0.08, 0.08);
    const cEyeR = new THREE.Mesh(cEyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cEyeR.position.set(0.05, 0.08, 0.08);
    crab.add(cEyeL);
    crab.add(cEyeR);

    const clawGeo = new THREE.SphereGeometry(0.06, 5, 5);
    clawGeo.scale(1.2, 0.8, 1);
    const clawL = new THREE.Mesh(clawGeo, crabMat);
    clawL.position.set(-0.14, 0.04, 0.08);
    const clawR = new THREE.Mesh(clawGeo, crabMat);
    clawR.position.set(0.14, 0.04, 0.08);
    crab.add(clawL);
    crab.add(clawR);
    this.group.add(crab);

    // Toy (surfboard)
    const surfGroup = new THREE.Group();
    surfGroup.position.set(0.25, 0.52, 0.28);
    surfGroup.rotation.set(-0.15, -0.4, 0.35);
    const surfMat = new THREE.MeshLambertMaterial({ color: 0x00e676, flatShading: true });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.04), surfMat);
    board.castShadow = true;
    surfGroup.add(board);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), new THREE.MeshLambertMaterial({ color: 0xffeb3b, flatShading: true }));
    stripe.position.y = 0.05;
    surfGroup.add(stripe);
    this.group.add(surfGroup);

    this.buildFaceDetails();
  }

  buildKittyModel(hairMat, whiteMat, hatColorHex, isChristmas) {
    const furMat = hairMat;

    // Cat Snout
    const snoutGeo = new THREE.SphereGeometry(0.07, 6, 6);
    snoutGeo.scale(1.3, 0.8, 1);
    const snout = new THREE.Mesh(snoutGeo, whiteMat);
    snout.position.set(0, 0.86, 0.29);
    this.group.add(snout);

    const noseGeo = new THREE.SphereGeometry(0.035, 4, 4);
    const noseMat = new THREE.MeshLambertMaterial({ color: 0xff8a80 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.89, 0.35);
    this.group.add(nose);

    // Cat Whiskers
    const whiskerGeo = new THREE.BoxGeometry(0.26, 0.015, 0.015);
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (let i = 0; i < 3; i++) {
      const wL = new THREE.Mesh(whiskerGeo, whiskerMat);
      wL.position.set(-0.26, 0.86 + (i - 1) * 0.04, 0.25);
      wL.rotation.z = -(i - 1) * 0.12 - 0.05;
      wL.rotation.y = 0.2;
      this.group.add(wL);

      const wR = new THREE.Mesh(whiskerGeo, whiskerMat);
      wR.position.set(0.26, 0.86 + (i - 1) * 0.04, 0.25);
      wR.rotation.z = (i - 1) * 0.12 + 0.05;
      wR.rotation.y = -0.2;
      this.group.add(wR);
    }

    // Cat Ears
    const earGeo = new THREE.ConeGeometry(0.12, 0.28, 4);
    earGeo.rotateX(0.1);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.22, 1.2, 0.06);
    earL.rotation.z = 0.25;
    earL.castShadow = true;
    this.group.add(earL);

    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.22, 1.2, 0.06);
    earR.rotation.z = -0.25;
    earR.castShadow = true;
    this.group.add(earR);

    // Inner Ears
    const innerEarMat = new THREE.MeshLambertMaterial({ color: 0xff8a80, flatShading: true });
    const innerEarGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
    innerEarGeo.rotateX(0.1);
    const innerEarL = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEarL.position.set(-0.21, 1.21, 0.09);
    innerEarL.rotation.z = 0.25;
    this.group.add(innerEarL);

    const innerEarR = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEarR.position.set(0.21, 1.21, 0.09);
    innerEarR.rotation.z = -0.25;
    this.group.add(innerEarR);

    // Collar
    const collarColor = isChristmas ? 0x2e7d32 : 0xd50000;
    const collarMat = new THREE.MeshLambertMaterial({ color: collarColor, flatShading: true });
    const collarGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.06, 8);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 0.73;
    this.group.add(collar);

    // Gold Bell (bound to hat color customization)
    const bellMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
    this.hatMat = bellMat;
    const bellGeo = new THREE.SphereGeometry(0.07, 6, 6);
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(0, 0.69, 0.28);
    this.group.add(bell);

    const loopGeo = new THREE.TorusGeometry(0.03, 0.01, 4, 8);
    const loop = new THREE.Mesh(loopGeo, bellMat);
    loop.position.set(0, 0.74, 0.25);
    this.group.add(loop);

    // Cat Tail
    this.catTail = new THREE.Group();
    this.catTail.position.set(0, 0.22, -0.28);
    let prevSegment = this.catTail;
    const segCount = 4;
    const segGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 5);
    segGeo.translate(0, 0.09, 0);
    for (let i = 0; i < segCount; i++) {
      const seg = new THREE.Mesh(segGeo, furMat);
      seg.position.set(0, i === 0 ? 0 : 0.15, i === 0 ? 0 : -0.05);
      seg.rotation.x = -0.3;
      seg.castShadow = true;
      prevSegment.add(seg);
      prevSegment = seg;
    }
    this.group.add(this.catTail);

    // Little Toy (blue fish)
    const fishGroup = new THREE.Group();
    fishGroup.position.set(0, 0.56, 0.32);
    fishGroup.rotation.set(0.1, -0.4, 0.2);
    const fishMat = new THREE.MeshLambertMaterial({ color: 0x00bcd4, flatShading: true });
    const fishBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.05), fishMat);
    fishBody.castShadow = true;
    fishGroup.add(fishBody);

    const tailGeoF = new THREE.ConeGeometry(0.05, 0.08, 3);
    tailGeoF.rotateX(Math.PI / 2);
    const fishTail = new THREE.Mesh(tailGeoF, fishMat);
    fishTail.position.set(-0.11, 0, 0);
    fishGroup.add(fishTail);

    const eyeF = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eyeF.position.set(0.06, 0.02, 0.03);
    fishGroup.add(eyeF);
    this.group.add(fishGroup);

    this.buildFaceDetails();
  }

  buildFaceDetails() {
    const eyeGeo = new THREE.SphereGeometry(0.06, 5, 5);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x4e342e });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.11, 0.94, 0.27);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.11, 0.94, 0.27);
    this.group.add(eyeL);
    this.group.add(eyeR);

    const blushGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const blushMat = new THREE.MeshLambertMaterial({ color: 0xff8a80, flatShading: true });
    const blushL = new THREE.Mesh(blushGeo, blushMat);
    blushL.position.set(-0.19, 0.87, 0.25);
    const blushR = new THREE.Mesh(blushGeo, blushMat);
    blushR.position.set(0.19, 0.87, 0.25);
    this.group.add(blushL);
    this.group.add(blushR);
  }

  updateModel(modelType) {
    if (this.activeModel === modelType) return;
    this.activeModel = modelType;

    // Preserve current colors
    const hairColor = this.hairMat ? this.hairMat.color.getHex() : (this.themeConfig.player.hairColor || 0xff8a80);
    const clothingColor = this.clothingMat ? this.clothingMat.color.getHex() : (this.themeConfig.player.clothingColor || 0xffffff);
    const hatColor = this.hatMat ? this.hatMat.color.getHex() : (this.themeConfig.player.hatColor || 0xffd180);

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
      if (e.key === ' ' || e.key === 'Spacebar') this.keys.space = isDown;
      if (e.key === 'Shift') this.keys.shift = isDown;
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
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

      this.cameraAngleH -= deltaX * 0.005;
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
      
      // 阻止默认行为以防触发移动端手势返回上一页
      e.preventDefault();
      
      const deltaX = cameraTouch.clientX - previousMousePosition.x;
      const deltaY = cameraTouch.clientY - previousMousePosition.y;

      this.cameraAngleH -= deltaX * 0.005;
      this.cameraAngleV = Math.max(0.1, Math.min(1.2, this.cameraAngleV + deltaY * 0.005));

      previousMousePosition = { x: cameraTouch.clientX, y: cameraTouch.clientY };
    }, { passive: false });

    const handleCameraTouchEnd = (e) => {
      if (cameraTouchId === null) return;
      
      let ended = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === cameraTouchId) {
          ended = true;
          break;
        }
      }
      
      if (ended) {
        isDragging = false;
        cameraTouchId = null;
      }
    };

    document.addEventListener('touchend', handleCameraTouchEnd);
    document.addEventListener('touchcancel', handleCameraTouchEnd);

    // Lock/Unlock controls based on modal popups
    window.addEventListener('modal-opened', () => {
      this.controlsLocked = true;
      this.resetInputs();
    });

    window.addEventListener('modal-closed', () => {
      this.controlsLocked = false;
    });

    // Mobile Virtual buttons
    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.isSitting || this.isLyingDown) {
          this.standUp();
          return;
        }
        if (!this.controlsLocked) this.keys.space = true;
      });
      btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.space = false;
      });
    }

    const btnRun = document.getElementById('btn-run');
    if (btnRun) {
      btnRun.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this.controlsLocked) this.keys.shift = true;
      });
      btnRun.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.shift = false;
      });
    }
  }

  resetInputs() {
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    this.velocity.set(0, this.velocity.y, 0);
  }

  update(delta, time) {
    // 1. 同步外层 Iframe 的输入状态
    if (window.self !== window.top && window.parent && window.parent.keys) {
      this.keys.space = window.parent.keys.space;
      this.keys.shift = window.parent.keys.shift;
      this.keys.j = window.parent.keys.j;
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
      this.group.position.copy(this.position);
      
      this.group.rotation.x = -Math.PI / 2; // Lie flat
      this.group.rotation.y = 0; 
      this.group.rotation.z = 0;

      this.body.rotation.x = 0;
      this.footL.position.set(-0.16, 0.05, 0);
      this.footR.position.set(0.16, 0.05, 0);
      this.body.position.y = 0.38;
      this.head.position.y = 0.88;

      this.cape.rotation.x = 0.15;
      const capePositions = this.cape.geometry.attributes.position;
      for (let i = 0; i < capePositions.count; i++) {
        capePositions.setZ(i, 0);
      }
      capePositions.needsUpdate = true;

      const targetCamX = this.position.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
      const targetCamY = this.position.y + Math.sin(this.cameraAngleV) * this.cameraDistance + 0.8;
      const targetCamZ = this.position.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

      const lookAtTarget = this.position.clone().add(new THREE.Vector3(0, 0.4, 0));
      this.camera.lookAt(lookAtTarget);
      return;
    }

    if (this.isSitting && this.swingRef) {
      const rotationX = this.swingRef.rotation.x;
      const seatLength = 1.1;
      this.position.x = this.swingRef.parent.position.x + this.swingRef.position.x;
      this.position.y = (this.swingRef.parent.position.y + this.swingRef.position.y) - (seatLength * Math.cos(rotationX)) - 0.28;
      this.position.z = this.swingRef.parent.position.z + this.swingRef.position.z - (seatLength * Math.sin(rotationX));

      this.velocity.set(0, 0, 0);
      this.isGrounded = true;
      this.group.position.copy(this.position);
      this.group.rotation.y = 0; // Face Z axis

      // Sitting pose
      this.footL.position.set(-0.16, 0.15, 0.18);
      this.footR.position.set(0.16, 0.15, 0.18);
      this.body.position.y = 0.3; 
      this.head.position.y = 0.8;

      // Cape and twins sway with swing
      this.cape.rotation.x = -0.1 + Math.sin(time * 0.002) * 0.05;
      const capePositions = this.cape.geometry.attributes.position;
      for (let i = 0; i < capePositions.count; i++) {
        capePositions.setZ(i, 0);
      }
      capePositions.needsUpdate = true;

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

      const lookAtTarget = this.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      this.camera.lookAt(lookAtTarget);

      return;
    }

    // 1. Movement vector relative to camera direction
    let moveX = 0;
    let moveZ = 0;

    if (!this.controlsLocked) {
      if (this.keys.w) moveZ -= 1;
      if (this.keys.s) moveZ += 1;
      if (this.keys.a) moveX -= 1;
      if (this.keys.d) moveX += 1;

      // 融合外壳的虚拟摇杆方向
      if (window.self !== window.top && window.parent && window.parent.joystickDir) {
        const joy = window.parent.joystickDir;
        if (joy.x !== 0 || joy.y !== 0) {
          moveX += joy.x;
          moveZ += joy.y;
        }
      }
    }

    const direction = new THREE.Vector3(moveX, 0, moveZ).normalize();
    const rotatedDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngleH);

    const currentSpeed = this.keys.shift ? this.speed * 1.6 : this.speed;
    this.velocity.x = rotatedDirection.x * currentSpeed;
    this.velocity.z = rotatedDirection.z * currentSpeed;

    // 2. Physics & Gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    this.position.addScaledVector(this.velocity, delta);

    // Clamp coordinates
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

    // 3. Collisions
    let onFloor = false;
    let highestFloorY = -999;

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

    // 4. Jump
    if (this.keys.space && this.isGrounded && !this.controlsLocked) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.keys.space = false;
      if (window.parent && window.parent.keys) {
        window.parent.keys.space = false;
      }
    }

    // 5. Update character rotations & animations
    this.group.position.copy(this.position);

    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    if (horizontalSpeed > 0.1) {
      this.targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      
      let diff = this.targetRotation - this.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += diff * 0.15;

      const feetSpeed = this.keys.shift ? 24 : 16;
      this.footL.position.z = Math.sin(time * 0.001 * feetSpeed) * 0.25;
      this.footL.position.y = 0.05 + Math.max(0, Math.cos(time * 0.001 * feetSpeed)) * 0.12;
      
      this.footR.position.z = -Math.sin(time * 0.001 * feetSpeed) * 0.25;
      this.footR.position.y = 0.05 + Math.max(0, -Math.cos(time * 0.001 * feetSpeed)) * 0.12;

      if (this.tailL) this.tailL.rotation.z = -0.2 - Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.18;
      if (this.tailR) this.tailR.rotation.z = 0.2 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.18;

      if (this.catTail) {
        this.catTail.rotation.y = Math.sin(time * 0.001 * feetSpeed * 1.5) * 0.35;
        this.catTail.rotation.z = Math.cos(time * 0.001 * feetSpeed * 1.5) * 0.06;
      }

      this.body.rotation.x = this.keys.shift ? 0.22 : 0.1;

      this.body.position.y = 0.38 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.06;
      this.head.position.y = 0.88 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.04;
    } else {
      this.body.rotation.x = 0;
      this.footL.position.set(-0.16, 0.05, 0);
      this.footR.position.set(0.16, 0.05, 0);
      this.body.position.y = 0.38 + Math.sin(time * 0.003) * 0.02;
      this.head.position.y = 0.88 + Math.sin(time * 0.003) * 0.02;

      if (this.tailL) this.tailL.rotation.z = -0.2 + Math.sin(time * 0.003) * 0.04;
      if (this.tailR) this.tailR.rotation.z = 0.2 - Math.sin(time * 0.003) * 0.04;

      if (this.catTail) {
        this.catTail.rotation.y = Math.sin(time * 0.003) * 0.15;
        this.catTail.rotation.z = Math.cos(time * 0.003) * 0.03;
      }
    }

    // 6. Cape/Scarf wave wave wave
    const capePositions = this.cape.geometry.attributes.position;
    const waveSpeed = 18;
    const waveFrequency = 2.2;
    const waveAmplitude = 0.08 + (horizontalSpeed * 0.03);

    for (let i = 0; i < capePositions.count; i++) {
      const x = capePositions.getX(i);
      const y = capePositions.getY(i);
      const distFromTop = 0.4 - y; 
      const zOffset = Math.sin((time * 0.001 * waveSpeed) - (distFromTop * waveFrequency)) * waveAmplitude * (distFromTop / 0.8);
      
      capePositions.setZ(i, zOffset);
    }
    capePositions.needsUpdate = true;

    // 7. Update camera horizontal & vertical angles
    const targetCamX = this.position.x + Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
    const targetCamY = this.position.y + Math.sin(this.cameraAngleV) * this.cameraDistance + 0.8;
    const targetCamZ = this.position.z + Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;

    this.camera.position.x += (targetCamX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 0.08;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.08;

    const lookAtTarget = this.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    this.camera.lookAt(lookAtTarget);
  }

  sit(swingSeatGroup) {
    this.isSitting = true;
    this.swingRef = swingSeatGroup;
    this.controlsLocked = true;
  }

  lieDown(bedPos) {
    this.isLyingDown = true;
    this.controlsLocked = true;
    this.position.copy(bedPos);
    this.position.y = bedPos.y + 0.58; // relative bed elevation (lies on top of mattress)
  }

  updateOutfit(type, colorHex) {
    const color = parseInt(colorHex);
    if (type === 'hair' && this.hairMat) {
      this.hairMat.color.setHex(color);
    } else if (type === 'clothing' && this.clothingMat) {
      this.clothingMat.color.setHex(color);
    } else if (type === 'hat' && this.hatMat) {
      this.hatMat.color.setHex(color);
    }
  }

  standUp() {
    if (this.isLyingDown) {
      this.isLyingDown = false;
      this.controlsLocked = false;
      this.group.rotation.x = 0;
      this.group.rotation.z = 0;
      this.position.z += 1.4; // Dismount forward from bed
      this.position.y = 0.8; // Set standing height directly to indoor floor level
      
      const bedHud = document.getElementById('bed-hud');
      if (bedHud) bedHud.style.display = 'none';
      return;
    }

    this.isSitting = false;
    this.swingRef = null;
    this.controlsLocked = false;
    this.position.z += 1.2;
    this.position.y = 0.8;
  }
}
