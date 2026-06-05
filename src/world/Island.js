import * as THREE from 'three';

export class IslandGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.colliders = []; // Store floor colliders
    this.interactables = []; // Store trigger zones

    const colors = this.themeConfig.colors;
    const isChristmas = colors.sky === 0x050c18;

    // Materials Palette derived from site configuration
    this.materials = {
      sand: new THREE.MeshLambertMaterial({ color: colors.sand, flatShading: true }), 
      dirt: new THREE.MeshLambertMaterial({ color: colors.dirt, flatShading: true }), 
      stone: new THREE.MeshLambertMaterial({ color: isChristmas ? 0x90a4ae : 0xcfcfcf, flatShading: true }), 
      wood: new THREE.MeshLambertMaterial({ color: isChristmas ? 0x4e342e : 0xa1887f, flatShading: true }), 
      leaves: new THREE.MeshLambertMaterial({ color: isChristmas ? 0x1b5e20 : 0x4caf50, flatShading: true }), 
      coconut: new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true }), 
      umbrellaRed: new THREE.MeshLambertMaterial({ color: isChristmas ? 0xd50000 : 0xff5252, flatShading: true }), 
      umbrellaWhite: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 
      seaWater: new THREE.MeshBasicMaterial({ color: colors.seaWater, transparent: true, opacity: isChristmas ? 0.72 : 0.58, side: THREE.DoubleSide }), 
      arcadeBody: new THREE.MeshLambertMaterial({ color: isChristmas ? 0x3e2723 : 0x263238, flatShading: true }), 
      arcadeScreen: new THREE.MeshBasicMaterial({ color: isChristmas ? 0x29b6f6 : 0x00e676 }), 
      neonRed: new THREE.MeshBasicMaterial({ color: 0xff5252 }),
      neonBlue: new THREE.MeshBasicMaterial({ color: 0x40c4ff })
    };

    this.buildWorld();
  }

  buildWorld() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // 1. Create the main ground (Circle of sand/snow)
    this.createMainGround(0, 0, 0, 22);

    // 2. Create the vast ocean water plane
    this.createVastOcean();

    // 3. Add boundaries (Palm trees for beach, Pine trees for Christmas)
    this.createOuterBoundaries();

    // 4. Decorate zones
    this.decorateAboutZone();
    this.decorateSkillsZone();
    this.decorateProjectsZone();
    this.decorateArcadeZone();

    // 5. Add extra decorations (foam/ice crust, shells/snow heaps, stars)
    this.createBeachDecorations();

    // 6. Create the interactive swing
    this.createSwing(4.5, 0.6, 6.0);

    // 7. Create the toy vendor stall (Balls vendor vs Snowballs vendor)
    this.createBallVendor(-5.0, 0.6, 6.0);

    // 8. Create float rings / icebergs & balloons
    this.createSummerDecorations();
  }

  createMainGround(x, y, z, radius) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Sand/Snow top cylinder
    const topGeo = new THREE.CylinderGeometry(radius, radius - 0.2, 0.6, 12);
    const topMesh = new THREE.Mesh(topGeo, this.materials.sand);
    topMesh.position.y = 0.3;
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    group.add(topMesh);

    // Island base depth
    const baseGeo = new THREE.CylinderGeometry(radius - 0.2, radius - 1.5, 1.8, 12);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.dirt);
    baseMesh.position.y = -0.9;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    this.scene.add(group);

    // Register ground collider (surface Y = 0.6)
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
    const waterGeo = new THREE.PlaneGeometry(160, 160);
    const waterMesh = new THREE.Mesh(waterGeo, this.materials.seaWater);
    waterMesh.rotation.x = -Math.PI / 2; 
    waterMesh.position.y = 0.18; 
    waterMesh.receiveShadow = true;
    this.scene.add(waterMesh);
  }

  createOuterBoundaries() {
    const boundaryRadius = 21.2;
    const itemsCount = 20;
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    for (let i = 0; i < itemsCount; i++) {
      const angle = (i / itemsCount) * Math.PI * 2;
      
      // Skip entry pathways
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
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.scale.set(scale, scale, scale);

    const trunkGroup = new THREE.Group();
    const segmentsCount = 5;
    let currentY = 0;
    let currentX = 0;

    const segmentGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 5);

    for (let i = 0; i < segmentsCount; i++) {
      const seg = new THREE.Mesh(segmentGeo, this.materials.wood);
      seg.position.set(currentX, currentY + 0.2, 0);
      const angle = 0.08 * i;
      seg.rotation.z = angle;
      seg.castShadow = true;
      trunkGroup.add(seg);
      
      currentY += 0.36 * Math.cos(angle);
      currentX -= 0.36 * Math.sin(angle);
    }
    tree.add(trunkGroup);

    const leavesGroup = new THREE.Group();
    leavesGroup.position.set(currentX, currentY, 0);
    
    const leafGeo = new THREE.BoxGeometry(0.8, 0.02, 0.25);
    leafGeo.translate(0.4, 0, 0); 

    const leafCount = 6;
    for (let j = 0; j < leafCount; j++) {
      const leaf = new THREE.Mesh(leafGeo, this.materials.leaves);
      leaf.rotation.y = (j / leafCount) * Math.PI * 2;
      leaf.rotation.z = -0.22; 
      leaf.castShadow = true;
      leavesGroup.add(leaf);
    }
    tree.add(leavesGroup);

    this.scene.add(tree);
  }

  createPineTree(x, y, z, scale) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.6, 5);
    const trunk = new THREE.Mesh(trunkGeo, this.materials.wood);
    trunk.position.y = 0.3;
    trunk.castShadow = true;
    tree.add(trunk);

    // Stacked pine layers (cone segments)
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(0.55 - i * 0.12, 0.6, 6);
      const cone = new THREE.Mesh(coneGeo, this.materials.leaves);
      cone.position.y = 0.7 + i * 0.4;
      cone.castShadow = true;
      tree.add(cone);
    }

    // Little snow cap star/sphere on top
    const starGeo = new THREE.SphereGeometry(0.06, 5, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfffde7 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.y = 1.7;
    tree.add(star);

    this.scene.add(tree);
  }

  decorateAboutZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 0.6, 0);

    // Beach/Snow Campfire
    const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 5);
    logGeo.rotateZ(Math.PI / 3);
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(logGeo, this.materials.wood);
      log.position.set(-1.8, 0, 1.8);
      log.rotation.y = (i * Math.PI) / 3;
      log.castShadow = true;
      centerGroup.add(log);
    }

    if (isChristmas) {
      // Christmas Zone: Cozy Snowman and festive wooden bench
      this.createSnowman(1.8, 0.6, -1.3);

      // Simple wooden bench
      const benchGroup = new THREE.Group();
      benchGroup.position.set(1.5, 0.04, -2.2);
      benchGroup.rotation.y = -0.45;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), this.materials.wood);
      seat.position.y = 0.25;
      seat.castShadow = true;
      benchGroup.add(seat);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.35), this.materials.wood);
      legL.position.set(-0.5, 0.125, 0);
      legL.castShadow = true;
      benchGroup.add(legL);

      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.35), this.materials.wood);
      legR.position.set(0.5, 0.125, 0);
      legR.castShadow = true;
      benchGroup.add(legR);

      centerGroup.add(benchGroup);
    } else {
      // Summer deck sunbed chair
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.1), this.materials.umbrellaWhite);
      bedFrame.position.set(1.5, 0.04, -1.2);
      bedFrame.rotation.y = -0.4;
      bedFrame.castShadow = true;
      centerGroup.add(bedFrame);

      const bedPillow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.25), this.materials.umbrellaRed);
      bedPillow.position.set(1.5, 0.12, -1.6);
      bedPillow.rotation.y = -0.4;
      centerGroup.add(bedPillow);

      // Striped Beach Umbrella
      const umbrella = new THREE.Group();
      umbrella.position.set(2.4, 0, -2.4);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), this.materials.wood);
      pole.position.y = 1.1;
      pole.castShadow = true;
      umbrella.add(pole);

      const domeGeo = new THREE.ConeGeometry(1.2, 0.5, 8);
      const domeRed = new THREE.Mesh(domeGeo, this.materials.umbrellaRed);
      domeRed.position.y = 2.1;
      domeRed.castShadow = true;
      umbrella.add(domeRed);

      const domeWhite = new THREE.Mesh(new THREE.ConeGeometry(1.22, 0.48, 8), this.materials.umbrellaWhite);
      domeWhite.position.y = 2.1;
      domeWhite.rotation.y = Math.PI / 8;
      umbrella.add(domeWhite);

      centerGroup.add(umbrella);
    }

    this.scene.add(centerGroup);

    this.interactables.push({
      id: 'about',
      name: '关于我',
      x: 0,
      y: 0.6,
      z: 0,
      triggerRadius: 3.5
    });
  }

  createSnowman(x, y, z) {
    const snowman = new THREE.Group();
    snowman.position.set(x, y, z);

    // Body bottom
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), this.materials.umbrellaWhite);
    bodyB.position.y = 0.4;
    bodyB.castShadow = true;
    snowman.add(bodyB);

    // Body top
    const bodyT = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), this.materials.umbrellaWhite);
    bodyT.position.y = 0.9;
    bodyT.castShadow = true;
    snowman.add(bodyT);

    // Carrot nose
    const noseGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, new THREE.MeshLambertMaterial({ color: 0xffa726 }));
    nose.position.set(0, 0.9, 0.26);
    snowman.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.08, 0.96, 0.23);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.08, 0.96, 0.23);
    snowman.add(eyeL);
    snowman.add(eyeR);

    // Scarf
    const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8), this.materials.umbrellaRed);
    scarf.position.y = 0.7;
    snowman.add(scarf);

    // Top Hat (cylinder)
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.2, 8), this.materials.arcadeBody);
    hat.position.y = 1.18;
    hat.castShadow = true;
    snowman.add(hat);

    this.scene.add(snowman);
  }

  decorateSkillsZone() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const treeX = -12;
    const treeZ = -3;
    const treeY = 0.6;

    if (isChristmas) {
      // Christmas decorated Pine Tree
      const treeGroup = new THREE.Group();
      treeGroup.position.set(treeX, treeY, treeZ);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.8, 8), this.materials.wood);
      trunk.position.y = 0.9;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Multiple foliage cones
      for (let i = 0; i < 4; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - i * 0.35, 1.6, 8), this.materials.leaves);
        cone.position.y = 1.8 + i * 0.9;
        cone.castShadow = true;
        treeGroup.add(cone);
      }

      // Yellow top star
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
      star.position.y = 5.2;
      treeGroup.add(star);

      // Colorful round ornaments
      const orbColors = [0xff5252, 0x40c4ff, 0xffeb3b, 0xe040fb];
      for (let i = 0; i < 12; i++) {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), new THREE.MeshBasicMaterial({ color: orbColors[i % orbColors.length] }));
        const height = 1.8 + Math.floor(i / 3) * 0.9;
        const radius = 1.3 - Math.floor(i / 3) * 0.3;
        const angle = (i % 3) * (Math.PI * 2 / 3) + height * 0.5;
        orb.position.set(Math.cos(angle) * radius, height + 0.2, Math.sin(angle) * radius);
        treeGroup.add(orb);
      }

      // Gift boxes at the base
      const giftColors = [0xff5252, 0x40c4ff, 0xe040fb];
      for (let i = 0; i < 3; i++) {
        const gift = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: giftColors[i], flatShading: true }));
        gift.position.set(0.6 - i * 0.5, 0.2, 0.5 + i * 0.2);
        gift.rotation.y = i * 0.4;
        gift.castShadow = true;
        treeGroup.add(gift);
      }

      this.scene.add(treeGroup);
    } else {
      // Giant Coconut Palm tree on the Left
      const treeGroup = new THREE.Group();
      treeGroup.position.set(treeX, treeY, treeZ);

      const trunkGeo = new THREE.CylinderGeometry(0.24, 0.4, 4.2, 7);
      const trunk = new THREE.Mesh(trunkGeo, this.materials.wood);
      trunk.position.y = 2.1;
      trunk.rotation.z = -0.1;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const leavesGroup = new THREE.Group();
      leavesGroup.position.set(-0.2, 4.1, 0);

      const leafGeo = new THREE.BoxGeometry(2.0, 0.02, 0.45);
      leafGeo.translate(1.0, 0, 0); 

      const leafCount = 8;
      for (let i = 0; i < leafCount; i++) {
        const leaf = new THREE.Mesh(leafGeo, this.materials.leaves);
        leaf.rotation.y = (i / leafCount) * Math.PI * 2;
        leaf.rotation.z = -0.25; 
        leaf.castShadow = true;
        leavesGroup.add(leaf);
      }
      treeGroup.add(leavesGroup);

      const cocoGeo = new THREE.SphereGeometry(0.24, 5, 5);
      for (let i = 0; i < 3; i++) {
        const coco = new THREE.Mesh(cocoGeo, this.materials.coconut);
        const angle = (i / 3) * Math.PI * 2;
        coco.position.set(
          -0.2 + Math.cos(angle) * 0.3,
          3.8,
          Math.sin(angle) * 0.3
        );
        coco.castShadow = true;
        treeGroup.add(coco);
      }

      this.scene.add(treeGroup);
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

    const cinemaGroup = new THREE.Group();
    cinemaGroup.position.set(projX, projY, projZ);

    // Screen Pillars
    const pillGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 5);
    const pillL = new THREE.Mesh(pillGeo, this.materials.wood);
    pillL.position.set(-1.8, 1.25, 0);
    pillL.castShadow = true;
    cinemaGroup.add(pillL);

    const pillR = new THREE.Mesh(pillGeo, this.materials.wood);
    pillR.position.set(1.8, 1.25, 0);
    pillR.castShadow = true;
    cinemaGroup.add(pillR);

    // Screen Board
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 0.15), this.materials.wood);
    screenFrame.position.y = 2.25;
    screenFrame.castShadow = true;
    cinemaGroup.add(screenFrame);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.7, 0.08), this.materials.stone);
    screen.position.set(0, 2.25, 0.06);
    cinemaGroup.add(screen);

    // Surfboards vs Snowboards
    const boardMat1 = new THREE.MeshLambertMaterial({ color: isChristmas ? 0xd50000 : 0x40c4ff, flatShading: true }); // Red vs Blue
    const boardMat2 = new THREE.MeshLambertMaterial({ color: isChristmas ? 0x2e7d32 : 0xffa726, flatShading: true }); // Green vs Orange

    const boardGeo = new THREE.SphereGeometry(0.32, 8, 8);
    boardGeo.scale(1, 2.4, 0.12);

    const board1 = new THREE.Mesh(boardGeo, boardMat1);
    board1.position.set(-1.2, 0.6, 0.2);
    board1.rotation.set(0.1, 0.2, -0.15);
    board1.castShadow = true;
    cinemaGroup.add(board1);

    const board2 = new THREE.Mesh(boardGeo, boardMat2);
    board2.position.set(1.2, 0.6, 0.2);
    board2.rotation.set(0.1, -0.2, 0.15);
    board2.castShadow = true;
    cinemaGroup.add(board2);

    this.scene.add(cinemaGroup);

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

    const arcadeGroup = new THREE.Group();
    arcadeGroup.position.set(arcX, arcY, arcZ);

    // Cabinet Body
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), this.materials.arcadeBody);
    base.position.y = 0.5;
    base.castShadow = true;
    arcadeGroup.add(base);

    // Upper Screen Housing
    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.8), this.materials.arcadeBody);
    upper.position.set(0, 1.4, -0.1);
    upper.castShadow = true;
    arcadeGroup.add(upper);

    // Screen
    const screenGeo = new THREE.PlaneGeometry(0.95, 0.72);
    screenGeo.rotateX(-0.1);
    const screen = new THREE.Mesh(screenGeo, this.materials.arcadeScreen);
    screen.position.set(0, 1.4, 0.31);
    arcadeGroup.add(screen);

    // Control Panel
    const cp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.5), this.materials.arcadeBody);
    cp.position.set(0, 0.95, 0.3);
    cp.rotation.x = 0.15;
    cp.castShadow = true;
    arcadeGroup.add(cp);

    // Joysticks & Buttons
    const joyStick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), this.materials.stone);
    joyStick.position.set(-0.3, 1.05, 0.4);
    joyStick.rotation.x = 0.15;
    arcadeGroup.add(joyStick);

    const joyBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), this.materials.neonRed);
    joyBall.position.set(-0.3, 1.14, 0.42);
    arcadeGroup.add(joyBall);

    const btnGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 5);
    btnGeo.rotateX(0.15);
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(btnGeo, (i % 2 === 0) ? this.materials.neonRed : this.materials.neonBlue);
      btn.position.set(0.15 + i * 0.12, 1.0, 0.4);
      arcadeGroup.add(btn);
    }

    // Glowing Header Marquee
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.85), this.materials.arcadeBody);
    marquee.position.set(0, 2.05, -0.05);
    arcadeGroup.add(marquee);

    const marqueePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.18), new THREE.MeshBasicMaterial({ color: isChristmas ? 0x29b6f6 : 0xffa726 }));
    marqueePlate.position.set(0, 2.05, 0.38);
    arcadeGroup.add(marqueePlate);

    // Decorative side posts (tiki torches vs candy canes/logs)
    const torchGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 5);
    const torchL = new THREE.Mesh(torchGeo, this.materials.wood);
    torchL.position.set(-0.9, 0.75, 0.2);
    torchL.castShadow = true;
    arcadeGroup.add(torchL);

    const torchR = new THREE.Mesh(torchGeo, this.materials.wood);
    torchR.position.set(0.9, 0.75, 0.2);
    torchR.castShadow = true;
    arcadeGroup.add(torchR);

    this.scene.add(arcadeGroup);

    // Spotlight
    const spotLightColor = isChristmas ? 0x29b6f6 : 0x00ff00; // Blue vs Green glow
    const spotLight = new THREE.SpotLight(spotLightColor, 2.0, 6, Math.PI / 6, 0.5, 1.0);
    spotLight.position.set(0, 4, -12);
    spotLight.target = base;
    this.scene.add(spotLight);

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

    // 1. Shoreline Ring (Wave foam for beach, Ice crust ring for Christmas)
    const foamGeo = new THREE.RingGeometry(21.8, 22.2, 32);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isChristmas ? 0.95 : 0.8,
      side: THREE.DoubleSide
    });
    const foam = new THREE.Mesh(foamGeo, foamMat);
    foam.position.y = 0.22; 
    this.scene.add(foam);

    // 2. Beach/Snow Balls
    this.createBeachBall(0.6, 0.6, -1.8, 0.24, isChristmas ? 0xffffff : 0xff5252); 
    this.createBeachBall(10.0, 0.6, -1.5, 0.26, isChristmas ? 0xffffff : 0x40c4ff); 

    // 3. Ambient details (Starfishes & shells vs mini snow heaps)
    if (isChristmas) {
      // White snow heaps
      this.createSnowHeap(3.5, 0.61, 2.5, 0.2);
      this.createSnowHeap(-10.5, 0.61, 1.5, 0.28);
      this.createSnowHeap(-3.5, 0.61, -1.5, 0.18);
      this.createSnowHeap(8.5, 0.61, 3.5, 0.24);
    } else {
      // Starfishes and Shells
      this.createStarfish(3.5, 0.61, 2.5, 0xff7043); 
      this.createStarfish(-10.5, 0.61, 1.5, 0xff7043);
      this.createShell(-3.5, 0.61, -1.5, 0xfff9c4); 
      this.createShell(8.5, 0.61, 3.5, 0xfff9c4);

      // Extra Beach Umbrellas
      this.createExtraUmbrella(-8, 0.6, -7, 0x40c4ff); 
      this.createExtraUmbrella(8, 0.6, -7, 0xffeb3b); 
    }
  }

  createBeachBall(x, y, z, radius, colorHex) {
    const ballGroup = new THREE.Group();
    ballGroup.position.set(x, y + radius, z);

    // Ball Base Sphere
    const ballGeo = new THREE.SphereGeometry(radius, 8, 8);
    const mainMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    const ball = new THREE.Mesh(ballGeo, mainMat);
    ball.castShadow = true;
    ballGroup.add(ball);

    // Stripe
    const beltGeo = new THREE.CylinderGeometry(radius + 0.005, radius + 0.005, radius * 0.4, 8, 1, true);
    const stripeColor = (colorHex === 0xffffff) ? 0xd50000 : 0xffffff; // Red stripe on snowballs vs white on beach balls
    const beltMat = new THREE.MeshLambertMaterial({ color: stripeColor, flatShading: true });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.rotation.z = Math.PI / 4;
    ballGroup.add(belt);

    this.scene.add(ballGroup);
  }

  createStarfish(x, y, z, colorHex) {
    const fishGeo = new THREE.ConeGeometry(0.18, 0.05, 5);
    const fishMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    const starfish = new THREE.Mesh(fishGeo, fishMat);
    starfish.position.set(x, y, z);
    starfish.rotation.x = Math.PI / 2; 
    starfish.rotation.z = Math.random() * Math.PI;
    starfish.castShadow = true;
    this.scene.add(starfish);
  }

  createShell(x, y, z, colorHex) {
    const shellGeo = new THREE.TetrahedronGeometry(0.12, 1);
    shellGeo.scale(1.2, 0.8, 0.8);
    const shellMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(x, y, z);
    shell.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    shell.castShadow = true;
    this.scene.add(shell);
  }

  createSnowHeap(x, y, z, radius) {
    // Low poly snow heap
    const heapGeo = new THREE.SphereGeometry(radius, 5, 4);
    heapGeo.scale(1.2, 0.5, 1.2);
    const heap = new THREE.Mesh(heapGeo, this.materials.umbrellaWhite);
    heap.position.set(x, y + radius * 0.25, z);
    heap.castShadow = true;
    this.scene.add(heap);
  }

  createExtraUmbrella(x, y, z, colorHex) {
    const umbrella = new THREE.Group();
    umbrella.position.set(x, y, z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 5), this.materials.wood);
    pole.position.y = 0.9;
    pole.castShadow = true;
    umbrella.add(pole);

    const colorMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

    const domeRed = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.4, 8), colorMat);
    domeRed.position.y = 1.7;
    domeRed.castShadow = true;
    umbrella.add(domeRed);

    const domeWhite = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.38, 8), whiteMat);
    domeWhite.position.y = 1.7;
    domeWhite.rotation.y = Math.PI / 8;
    umbrella.add(domeWhite);

    this.scene.add(umbrella);
  }

  createSwing(x, y, z) {
    const swingGroup = new THREE.Group();
    swingGroup.position.set(x, y, z);

    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6);
    legGeo.translate(0, -1.05, 0);

    // Left A-frame
    const frameL1 = new THREE.Mesh(legGeo, this.materials.wood);
    frameL1.position.set(-1.0, 2.05, 0);
    frameL1.rotation.set(-0.19, 0, -0.15);
    frameL1.castShadow = true;
    swingGroup.add(frameL1);

    const frameL2 = new THREE.Mesh(legGeo, this.materials.wood);
    frameL2.position.set(-1.0, 2.05, 0);
    frameL2.rotation.set(0.19, 0, -0.15);
    frameL2.castShadow = true;
    swingGroup.add(frameL2);

    // Right A-frame
    const frameR1 = new THREE.Mesh(legGeo, this.materials.wood);
    frameR1.position.set(1.0, 2.05, 0);
    frameR1.rotation.set(-0.19, 0, 0.15);
    frameR1.castShadow = true;
    swingGroup.add(frameR1);

    const frameR2 = new THREE.Mesh(legGeo, this.materials.wood);
    frameR2.position.set(1.0, 2.05, 0);
    frameR2.rotation.set(0.19, 0, 0.15);
    frameR2.castShadow = true;
    swingGroup.add(frameR2);

    // Crossbar
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.25, 6), this.materials.wood);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.05, 0);
    topBar.castShadow = true;
    swingGroup.add(topBar);

    // Swing Seat Group
    this.swingSeat = new THREE.Group();
    this.swingSeat.position.set(0, 2.05, 0);

    const seatBoard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.22), this.materials.wood);
    seatBoard.position.set(0, -1.1, 0); 
    seatBoard.castShadow = true;
    this.swingSeat.add(seatBoard);

    const ropeL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.1), this.materials.stone);
    ropeL.position.set(-0.24, -0.55, 0);
    this.swingSeat.add(ropeL);

    const ropeR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.1), this.materials.stone);
    ropeR.position.set(0.24, -0.55, 0);
    this.swingSeat.add(ropeR);

    swingGroup.add(this.swingSeat);
    this.scene.add(swingGroup);

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
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.8), this.materials.wood);
    counter.position.y = 0.4;
    counter.castShadow = true;
    counter.receiveShadow = true;
    group.add(counter);

    // Tabletop
    const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.9), this.materials.sand);
    topMesh.position.y = 0.84;
    topMesh.castShadow = true;
    group.add(topMesh);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5);
    const pillarL = new THREE.Mesh(pillarGeo, this.materials.wood);
    pillarL.position.set(-0.7, 1.4, -0.3);
    pillarL.castShadow = true;
    group.add(pillarL);

    const pillarR = new THREE.Mesh(pillarGeo, this.materials.wood);
    pillarR.position.set(0.7, 1.4, -0.3);
    pillarR.castShadow = true;
    group.add(pillarR);

    // Awning/Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.1), this.materials.umbrellaRed);
    roof.position.set(0, 2.15, 0.1);
    roof.rotation.x = 0.28;
    roof.castShadow = true;
    group.add(roof);

    const roofWhite = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.05, 0.3), this.materials.umbrellaWhite);
    roofWhite.position.set(0, 2.15, 0.1);
    roofWhite.rotation.x = 0.28;
    group.add(roofWhite);

    // Toy Basket
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.5), this.materials.coconut);
    basket.position.set(-0.35, 0.98, 0.05);
    basket.castShadow = true;
    group.add(basket);

    // Miniature balls inside basket
    const ballMiniGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const mColors = isChristmas ? [0xffffff, 0xffffff, 0xffffff] : [0xff5252, 0x40c4ff, 0xffeb3b]; // Snowballs vs beach balls
    for (let i = 0; i < 3; i++) {
      const ballMini = new THREE.Mesh(ballMiniGeo, new THREE.MeshLambertMaterial({ color: mColors[i], flatShading: true }));
      ballMini.position.set(-0.42 + i * 0.12, 1.08, 0.05 + (i % 2) * 0.05);
      group.add(ballMini);
    }

    // Signboard
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.05), this.materials.umbrellaWhite);
    sign.position.set(0.35, 1.2, 0.15);
    sign.rotation.y = -0.15;
    sign.castShadow = true;
    group.add(sign);

    const textSim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.06), new THREE.MeshLambertMaterial({ color: isChristmas ? 0xd50000 : 0x4caf50 }));
    textSim.position.set(0.35, 1.2, 0.16);
    textSim.rotation.y = -0.15;
    group.add(textSim);

    this.scene.add(group);

    this.interactables.push({
      id: 'ball_vendor',
      name: isChristmas ? '领雪球' : '领沙滩球',
      x: x,
      y: y,
      z: z + 0.8,
      triggerRadius: 1.8
    });
  }

  createSummerDecorations() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    this.swimRings = []; 

    if (isChristmas) {
      // Floating small icebergs bobbing in icy ocean
      const iceGeo = new THREE.BoxGeometry(0.8, 0.38, 0.8);
      const iceMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5, flatShading: true });
      
      const ice1 = new THREE.Mesh(iceGeo, iceMat);
      ice1.position.set(13.0, 0.18, 13.0);
      ice1.castShadow = true;
      this.scene.add(ice1);
      this.swimRings.push({ mesh: ice1, baseX: 13.0, baseZ: 13.0, phase: 0 });

      const ice2 = new THREE.Mesh(iceGeo, iceMat);
      ice2.position.set(-13.0, 0.18, 12.0);
      ice2.castShadow = true;
      this.scene.add(ice2);
      this.swimRings.push({ mesh: ice2, baseX: -13.0, baseZ: 12.0, phase: Math.PI });
    } else {
      // Floating Swim Rings
      const ringGeo = new THREE.TorusGeometry(0.3, 0.08, 6, 12);
      ringGeo.rotateX(Math.PI / 2);
      
      const ringMat1 = new THREE.MeshLambertMaterial({ color: 0xff4081, flatShading: true }); 
      const ringMat2 = new THREE.MeshLambertMaterial({ color: 0xffeb3b, flatShading: true }); 

      const ringOnBeach = new THREE.Mesh(ringGeo, ringMat1);
      ringOnBeach.position.set(-2.2, 0.62, -2.5);
      ringOnBeach.rotation.set(0.1, 0, 0.15);
      ringOnBeach.castShadow = true;
      this.scene.add(ringOnBeach);

      const ringInOcean1 = new THREE.Mesh(ringGeo, ringMat2);
      ringInOcean1.position.set(13.0, 0.18, 13.0);
      this.scene.add(ringInOcean1);
      this.swimRings.push({ mesh: ringInOcean1, baseX: 13.0, baseZ: 13.0, phase: 0 });

      const ringInOcean2 = new THREE.Mesh(ringGeo, ringMat1);
      ringInOcean2.position.set(-13.0, 0.18, 12.0);
      this.scene.add(ringInOcean2);
      this.swimRings.push({ mesh: ringInOcean2, baseX: -13.0, baseZ: 12.0, phase: Math.PI });
    }

    // Balloons or Christmas lights hanging
    const balGroup = new THREE.Group();
    balGroup.position.set(2.4, 0, -2.4); 

    const colors = isChristmas ? [0xff5252, 0x4caf50, 0xffeb3b] : [0xff5252, 0x40c4ff, 0xffeb3b]; 
    const balGeo = new THREE.SphereGeometry(0.18, 6, 6);
    balGeo.scale(1, 1.25, 1);
    const ropeGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.8, 4);

    for (let i = 0; i < 3; i++) {
      const balMat = new THREE.MeshLambertMaterial({ color: colors[i], flatShading: true });
      const balloon = new THREE.Mesh(balGeo, balMat);
      
      const angle = (i / 3) * Math.PI * 2;
      const bx = Math.cos(angle) * 0.22;
      const bz = Math.sin(angle) * 0.22;
      const by = 1.3 + Math.random() * 0.25;

      balloon.position.set(bx, by, bz);
      balloon.rotation.z = (Math.random() - 0.5) * 0.2;
      balloon.castShadow = true;
      balGroup.add(balloon);

      const rope = new THREE.Mesh(ropeGeo, this.materials.stone);
      rope.position.set(bx / 2, by - 0.4, bz / 2);
      rope.lookAt(new THREE.Vector3(bx, by, bz));
      rope.rotateX(Math.PI / 2);
      balGroup.add(rope);
    }
    this.scene.add(balGroup);
    this.balloons = balGroup; 
  }

  update(time) {
    // 1. Sway swing seat
    if (this.swingSeat) {
      this.swingSeat.rotation.x = Math.sin(time * 0.002) * 0.18;
    }

    // 2. Bob swim rings/icebergs
    if (this.swimRings) {
      this.swimRings.forEach(ring => {
        ring.mesh.position.y = 0.18 + Math.sin(time * 0.0016 + ring.phase) * 0.04;
        ring.mesh.rotation.y = time * 0.0003 + ring.phase;
      });
    }

    // 3. Balloons sway
    if (this.balloons) {
      this.balloons.rotation.z = Math.sin(time * 0.0015) * 0.06;
      this.balloons.rotation.x = Math.cos(time * 0.001) * 0.04;
    }
  }
}
