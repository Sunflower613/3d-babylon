import * as THREE from 'three';

export class HouseGenerator {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.colliders = []; // Store floor colliders for map physics
    this.interactables = []; // Store interactive zones
    this.group = new THREE.Group();
    
    // Materials
    this.materials = {
      wood: new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true }), // dark brown wood
      woodLight: new THREE.MeshLambertMaterial({ color: 0xd7ccc8, flatShading: true }), // light wood
      wall: new THREE.MeshLambertMaterial({ color: 0xfafafa, flatShading: true }), // clean warm walls
      wallTrim: new THREE.MeshLambertMaterial({ color: 0xefebe9, flatShading: true }),
      glass: new THREE.MeshBasicMaterial({ color: 0xe0f7fa, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
      leaves: new THREE.MeshLambertMaterial({ color: 0x43a047, flatShading: true }), // green leaves
      coconut: new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true }),
      carpet: new THREE.MeshLambertMaterial({ color: 0xffecb3, flatShading: true }), // warm gold carpet
      sofaBody: new THREE.MeshLambertMaterial({ color: 0xbbd6fb, flatShading: true }), // light blue sofa
      sofaCushion: new THREE.MeshLambertMaterial({ color: 0xe3f2fd, flatShading: true }),
      metalGold: new THREE.MeshLambertMaterial({ color: 0xffca28, flatShading: true }),
      white: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      paintingSun: new THREE.MeshBasicMaterial({ color: 0xffeb3b }),
      paintingArt: new THREE.MeshBasicMaterial({ color: 0xff7043 }),
      bedSpread: new THREE.MeshLambertMaterial({ color: 0xff8a80, flatShading: true })
    };

    this.buildHouseMap();
    this.scene.add(this.group);
  }

  buildHouseMap() {
    // 1. Large Tiled Wooden Floor (24.0 x 0.12 x 24.0)
    const floorGeo = new THREE.BoxGeometry(24.0, 0.12, 24.0);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.woodLight);
    floorMesh.position.y = 0.06;
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    this.group.add(floorMesh);

    // Register floor collider (stands at Y = 0.12)
    this.colliders.push({
      mesh: floorMesh,
      radius: 16.0,
      worldX: 0,
      worldZ: 0,
      worldY: 0.12,
      type: 'floor'
    });

    // 2. Corner Pillars (0.4 x 5.5 x 0.4)
    const pillarGeo = new THREE.BoxGeometry(0.4, 5.5, 0.4);
    const pillarOffsets = [
      { x: -11.8, z: -11.8 },
      { x: 11.8, z: -11.8 },
      { x: -11.8, z: 11.8 },
      { x: 11.8, z: 11.8 }
    ];
    pillarOffsets.forEach(offset => {
      const pillar = new THREE.Mesh(pillarGeo, this.materials.wood);
      pillar.position.set(offset.x, 2.75, offset.z);
      pillar.castShadow = true;
      this.group.add(pillar);
    });

    // 3. Wood ceiling cross beams (Visual aesthetics)
    for (let i = -10; i <= 10; i += 5) {
      const beamGeo = new THREE.BoxGeometry(23.6, 0.15, 0.25);
      const beam = new THREE.Mesh(beamGeo, this.materials.wood);
      beam.position.set(0, 5.4, i);
      this.group.add(beam);
    }

    // 4. Walls
    // Back Wall (width 23.6, height 5.5)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(23.6, 5.5, 0.1), this.materials.wall);
    backWall.position.set(0, 2.75, -11.8);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Right Wall (solid)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.5, 23.6), this.materials.wall);
    rightWall.position.set(11.8, 2.75, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // Left Wall with large window cutout (z from -6 to +6)
    const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.5, 5.8), this.materials.wall);
    leftWallBack.position.set(-11.8, 2.75, -8.9);
    leftWallBack.castShadow = true;
    this.group.add(leftWallBack);

    const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.5, 5.8), this.materials.wall);
    leftWallFront.position.set(-11.8, 2.75, 8.9);
    leftWallFront.castShadow = true;
    this.group.add(leftWallFront);

    const leftWallBottom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 12.0), this.materials.wall);
    leftWallBottom.position.set(-11.8, 0.8, 0);
    leftWallBottom.castShadow = true;
    this.group.add(leftWallBottom);

    const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 12.0), this.materials.wall);
    leftWallTop.position.set(-11.8, 4.8, 0);
    leftWallTop.castShadow = true;
    this.group.add(leftWallTop);

    // Cyan window glass pane
    const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 12.0), this.materials.glass);
    windowGlass.position.set(-11.8, 2.8, 0);
    this.group.add(windowGlass);

    // Front Wall with doorway in middle (x from -1.2 to 1.2)
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(10.6, 5.5, 0.1), this.materials.wall);
    frontWallLeft.position.set(-6.5, 2.75, 11.8);
    frontWallLeft.castShadow = true;
    this.group.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(10.6, 5.5, 0.1), this.materials.wall);
    frontWallRight.position.set(6.5, 2.75, 11.8);
    frontWallRight.castShadow = true;
    this.group.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 0.1), this.materials.wall);
    frontWallTop.position.set(0, 4.25, 11.8);
    frontWallTop.castShadow = true;
    this.group.add(frontWallTop);

    // Exit Door frame & sign board
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.2), this.materials.wood);
    doorFrame.position.set(0, 1.5, 11.8);
    this.group.add(doorFrame);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.05), this.materials.wood);
    signBoard.position.set(0, 3.25, 11.68);
    signBoard.castShadow = true;
    this.group.add(signBoard);

    const signText = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.06), new THREE.MeshLambertMaterial({ color: 0xff5252 }));
    signText.position.set(0, 3.25, 11.7);
    this.group.add(signText);

    // Register exit doorway trigger zone
    this.interactables.push({
      id: 'exit_house',
      name: '离开房子',
      x: 0,
      y: 0.12,
      z: 11.2,
      triggerRadius: 1.6
    });

    // 5. Cozy Bed (Interactive, Back-left corner)
    this.createBed(-8.0, -7.0);

    // 6. Artist Easel (Interactive, Back-right corner)
    this.createEasel(8.0, -8.0);

    // 7. Wardrobe Customizer (Against right wall)
    this.createWardrobe(11.0, 0);

    // 8. Sofa Lounge setup (Center-left area)
    this.createSofaLounge(0, -2.0);

    // 9. Dining Table and Plant (Under the Window)
    this.createDiningTable(-10.5, 0);

    // 10. Potted Monstera Plant (Front-left corner)
    this.createMonstera(-9.5, 9.5);

    // 11. Large Center Area Carpet
    const carpetGeo = new THREE.CylinderGeometry(4.0, 4.0, 0.01, 24);
    const carpet = new THREE.Mesh(carpetGeo, this.materials.carpet);
    carpet.position.set(0, 0.125, 3.0);
    carpet.receiveShadow = true;
    this.group.add(carpet);

    // 12. Hanging Sunset Painting (Centered on back wall)
    this.createSunsetPainting(0, -11.73);

    // 13. Reserved spot for future furniture (Front-right corner)
    this.createReservedSpot(8.5, 8.5);

    // 14. Ceiling Light
    this.createCeilingLight();

    // 15. Scenery outside the window
    this.createWindowScenery();

    // 16. Cozy floor lamp next to the sofa
    this.createFloorLamp(1.8, -3.2);
  }

  createBed(x, z) {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(x, 0.12, z);

    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 3.0), this.materials.wood);
    bedFrame.castShadow = true;
    bedGroup.add(bedFrame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.8), this.materials.white);
    mattress.position.y = 0.24;
    bedGroup.add(mattress);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.29, 2.0), this.materials.bedSpread);
    blanket.position.set(0, 0.26, 0.4);
    blanket.castShadow = true;
    bedGroup.add(blanket);

    const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.5), this.materials.white);
    pillowL.position.set(-0.55, 0.4, -1.0);
    bedGroup.add(pillowL);

    const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.5), this.materials.white);
    pillowR.position.set(0.55, 0.4, -1.0);
    bedGroup.add(pillowR);

    // Bedside tables (low-poly drawers)
    const drawerL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), this.materials.wood);
    drawerL.position.set(-1.8, 0.1, -1.0);
    drawerL.castShadow = true;
    bedGroup.add(drawerL);

    const drawerR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), this.materials.wood);
    drawerR.position.set(1.8, 0.1, -1.0);
    drawerR.castShadow = true;
    bedGroup.add(drawerR);

    // Small lamp on left drawer
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 4), this.materials.metalGold);
    lampBase.position.set(-1.8, 0.44, -1.0);
    bedGroup.add(lampBase);

    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 8), this.materials.white);
    lampShade.position.set(-1.8, 0.62, -1.0);
    bedGroup.add(lampShade);

    const bedsideLight = new THREE.PointLight(0xffb74d, 0.9, 8, 1.5);
    bedsideLight.position.set(-1.8, 0.65, -1.0);
    bedGroup.add(bedsideLight);

    this.group.add(bedGroup);

    // Register bed interaction
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
    const easelGroup = new THREE.Group();
    easelGroup.position.set(x, 0.12, z);
    easelGroup.rotation.y = -Math.PI / 4;

    const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 4), this.materials.wood);
    leg1.position.set(-0.5, 1.15, 0);
    leg1.rotation.z = -0.15;
    leg1.castShadow = true;
    easelGroup.add(leg1);

    const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 4), this.materials.wood);
    leg2.position.set(0.5, 1.15, 0);
    leg2.rotation.z = 0.15;
    leg2.castShadow = true;
    easelGroup.add(leg2);

    const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 4), this.materials.wood);
    leg3.position.set(0, 1.15, -0.5);
    leg3.rotation.x = -0.22;
    leg3.castShadow = true;
    easelGroup.add(leg3);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.14), this.materials.wood);
    shelf.position.set(0, 1.05, 0.08);
    shelf.castShadow = true;
    easelGroup.add(shelf);

    const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.04), this.materials.white);
    canvasMesh.position.set(0, 1.5, 0.08);
    canvasMesh.rotation.x = -0.08;
    canvasMesh.castShadow = true;
    easelGroup.add(canvasMesh);

    // Mini landscape painting
    const pSky = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.84), new THREE.MeshBasicMaterial({ color: 0xb2ebf2 }));
    pSky.position.set(0, 1.5, 0.11);
    pSky.rotation.x = -0.08;
    easelGroup.add(pSky);

    const pSun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), this.materials.paintingSun);
    pSun.position.set(0.2, 1.62, 0.12);
    easelGroup.add(pSun);

    const pSea = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.35), new THREE.MeshBasicMaterial({ color: 0x00bcd4 }));
    pSea.position.set(0, 1.28, 0.12);
    pSea.rotation.x = -0.08;
    easelGroup.add(pSea);

    this.group.add(easelGroup);

    // Register easel interaction
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
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(x, 0.12, z);

    const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.8, 1.8), this.materials.wood);
    wBody.position.y = 1.4;
    wBody.castShadow = true;
    wBody.receiveShadow = true;
    wardrobeGroup.add(wBody);

    const wDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.82), this.materials.woodLight);
    wDoorL.position.set(-0.46, 1.4, -0.42);
    wardrobeGroup.add(wDoorL);

    const wDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.82), this.materials.woodLight);
    wDoorR.position.set(-0.46, 1.4, 0.42);
    wardrobeGroup.add(wDoorR);

    const wHandleL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), this.materials.metalGold);
    wHandleL.position.set(-0.52, 1.4, -0.08);
    wardrobeGroup.add(wHandleL);

    const wHandleR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), this.materials.metalGold);
    wHandleR.position.set(-0.52, 1.4, 0.08);
    wardrobeGroup.add(wHandleR);

    this.group.add(wardrobeGroup);

    // Register wardrobe interaction (positioned in front of wardrobe)
    this.interactables.push({
      id: 'house_wardrobe',
      name: '衣柜换装',
      x: x - 1.2,
      y: 0.12,
      z: z,
      triggerRadius: 2.0
    });
  }

  createSofaLounge(x, z) {
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(x, 0.12, z);

    // Large floor rug under the sofa
    const rugGeo = new THREE.BoxGeometry(4.2, 0.01, 2.8);
    const rug = new THREE.Mesh(rugGeo, this.materials.carpet);
    rug.position.y = 0.005;
    loungeGroup.add(rug);

    // Sofa body base
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.28, 1.2), this.materials.sofaBody);
    base.position.y = 0.24;
    base.castShadow = true;
    loungeGroup.add(base);

    // Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 0.25), this.materials.sofaBody);
    backrest.position.set(0, 0.72, -0.475);
    backrest.castShadow = true;
    loungeGroup.add(backrest);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 1.2), this.materials.sofaBody);
    armL.position.set(-1.375, 0.42, 0);
    armL.castShadow = true;
    loungeGroup.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 1.2), this.materials.sofaBody);
    armR.position.set(1.375, 0.42, 0);
    armR.castShadow = true;
    loungeGroup.add(armR);

    // Cushions
    for (let i = 0; i < 3; i++) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.15, 0.85), this.materials.sofaCushion);
      cushion.position.set(-0.82 + i * 0.82, 0.38, 0.05);
      cushion.castShadow = true;
      loungeGroup.add(cushion);
    }

    // Coffee table
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0, 0.9);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), this.materials.wood);
    top.position.y = 0.35;
    top.castShadow = true;
    tableGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 4);
    const legL = new THREE.Mesh(legGeo, this.materials.wood);
    legL.position.set(-0.7, 0.175, 0);
    legL.castShadow = true;
    tableGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, this.materials.wood);
    legR.position.set(0.7, 0.175, 0);
    legR.castShadow = true;
    tableGroup.add(legR);

    // Table flower pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.12, 5), this.materials.coconut);
    pot.position.set(0, 0.44, 0);
    pot.castShadow = true;
    tableGroup.add(pot);

    const potPlant = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), this.materials.leaves);
    potPlant.position.set(0, 0.52, 0);
    tableGroup.add(potPlant);

    loungeGroup.add(tableGroup);
    this.group.add(loungeGroup);
  }

  createDiningTable(x, z) {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, 0.12, z);

    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 2.5), this.materials.wood);
    tabletop.position.y = 1.0;
    tabletop.castShadow = true;
    tableGroup.add(tabletop);

    const tLegGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 4);
    const tLegOffsets = [
      { x: -0.38, z: -1.1 },
      { x: 0.38, z: -1.1 },
      { x: -0.38, z: 1.1 },
      { x: 0.38, z: 1.1 }
    ];
    tLegOffsets.forEach(offset => {
      const leg = new THREE.Mesh(tLegGeo, this.materials.wood);
      leg.position.set(offset.x, 0.5, offset.z);
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    // Chairs
    const chairGeo = new THREE.BoxGeometry(0.42, 0.06, 0.42);
    const chairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);

    for (let side = -1; side <= 1; side += 2) {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(0.68 * side, 0, 0);
      
      const seat = new THREE.Mesh(chairGeo, this.materials.wood);
      seat.position.y = 0.53;
      seat.castShadow = true;
      chairGroup.add(seat);

      for (let cx = -1; cx <= 1; cx += 2) {
        for (let cz = -1; cz <= 1; cz += 2) {
          const leg = new THREE.Mesh(chairLegGeo, this.materials.wood);
          leg.position.set(0.16 * cx, 0.25, 0.16 * cz);
          leg.castShadow = true;
          chairGroup.add(leg);
        }
      }

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.42), this.materials.wood);
      back.position.set(0.18 * side, 0.78, 0);
      back.castShadow = true;
      chairGroup.add(back);

      tableGroup.add(chairGroup);
    }

    // Books on table
    const bookColors = [0xd50000, 0x1e88e5, 0xffb300];
    for (let i = 0; i < 3; i++) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.3), new THREE.MeshLambertMaterial({ color: bookColors[i], flatShading: true }));
      book.position.set(-0.06, 1.07 + i * 0.062, 0.3);
      book.rotation.y = 0.12 * i - 0.08;
      book.castShadow = true;
      tableGroup.add(book);
    }

    // Vase plant on table
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 5), this.materials.white);
    pot.position.set(0, 1.15, -0.5);
    pot.castShadow = true;
    tableGroup.add(pot);

    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), this.materials.leaves);
    leaves.position.set(0, 1.3, -0.5);
    tableGroup.add(leaves);

    // Small cozy table lamp on dining table
    const tableLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 4), this.materials.metalGold);
    tableLampBase.position.set(0.2, 1.06, 0.8);
    tableGroup.add(tableLampBase);

    const tableLampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), this.materials.metalGold);
    tableLampStem.position.set(0.2, 1.22, 0.8);
    tableLampStem.rotation.z = -0.2;
    tableGroup.add(tableLampStem);

    const tableLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.16, 6), this.materials.white);
    tableLampShade.position.set(0.13, 1.38, 0.8);
    tableGroup.add(tableLampShade);

    const tableLampLight = new THREE.PointLight(0xffffe0, 0.8, 6, 1.2);
    tableLampLight.position.set(0.13, 1.34, 0.8);
    tableGroup.add(tableLampLight);

    this.group.add(tableGroup);
  }

  createMonstera(x, z) {
    const monstera = new THREE.Group();
    monstera.position.set(x, 0.12, z);

    const bigPot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 6), this.materials.carpet);
    bigPot.position.y = 0.3;
    bigPot.castShadow = true;
    monstera.add(bigPot);

    const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4);
    for (let i = 0; i < 5; i++) {
      const stem = new THREE.Mesh(stemGeo, this.materials.wood);
      const angle = (i / 5) * Math.PI * 2;
      stem.position.set(Math.cos(angle) * 0.14, 0.6, Math.sin(angle) * 0.14);
      stem.rotation.z = Math.cos(angle) * 0.45;
      stem.rotation.x = Math.sin(angle) * 0.45;
      monstera.add(stem);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 5), this.materials.leaves);
      leaf.scale.set(1.3, 0.2, 1.8);
      leaf.position.set(Math.cos(angle) * 0.52, 0.96, Math.sin(angle) * 0.52);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.45;
      leaf.castShadow = true;
      monstera.add(leaf);
    }
    this.group.add(monstera);
  }

  createSunsetPainting(x, z) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.0, 0.05), this.materials.wood);
    frame.position.set(x, 3.0, z);
    frame.castShadow = true;
    this.group.add(frame);

    const art = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.6, 0.02), this.materials.paintingArt);
    art.position.set(x, 3.0, z + 0.035);
    this.group.add(art);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), this.materials.paintingSun);
    sun.position.set(x + 0.8, 3.2, z + 0.05);
    this.group.add(sun);
  }

  createReservedSpot(x, z) {
    const reserveGroup = new THREE.Group();
    reserveGroup.position.set(x, 0.12, z);

    const border = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 3.0), new THREE.MeshLambertMaterial({ color: 0x90a4ae, flatShading: true, transparent: true, opacity: 0.5 }));
    border.position.y = 0.01;
    reserveGroup.add(border);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), this.materials.wood);
    post.position.set(0, 0.22, 0);
    post.castShadow = true;
    reserveGroup.add(post);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.03), this.materials.wood);
    signBoard.position.set(0, 0.44, 0);
    signBoard.castShadow = true;
    reserveGroup.add(signBoard);
 
    this.group.add(reserveGroup);
  }

  createCeilingLight() {
    // Hang lamp from the middle beam (X = 0, Y = 5.4, Z = 0)
    const ceilGroup = new THREE.Group();
    ceilGroup.position.set(0, 5.4, 0);

    // Ceiling rose cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 6), this.materials.wood);
    ceilGroup.add(cap);

    // Thin black cord
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    cord.position.y = -0.6;
    ceilGroup.add(cord);

    // Golden socket & shade
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.35, 0.28, 8), this.materials.metalGold);
    shade.position.y = -1.34;
    shade.castShadow = true;
    ceilGroup.add(shade);

    // Small glowing yellow bulb inside
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfff9c4 }));
    bulb.position.y = -1.48;
    ceilGroup.add(bulb);

    this.group.add(ceilGroup);

    // Point Light source (warm gold tone, made brighter and larger range)
    const light = new THREE.PointLight(0xffecc2, 1.7, 28, 1.2);
    light.position.set(0, 3.82, 0); // slightly below bulb
    light.castShadow = true;
    light.shadow.bias = -0.003;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    this.group.add(light);
  }

  createWindowScenery() {
    const sceneGroup = new THREE.Group();
    sceneGroup.position.set(-17.5, -1.2, 0.0);

    // 1. Floating Rock Island Base
    const baseGeo = new THREE.CylinderGeometry(3.5, 2.5, 1.5, 8);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.wood); // use wood color for dirt rock
    baseMesh.receiveShadow = true;
    sceneGroup.add(baseMesh);

    const sandTop = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.4, 0.2, 8), this.materials.woodLight); // light sand top
    sandTop.position.y = 0.85;
    sandTop.receiveShadow = true;
    sceneGroup.add(sandTop);

    // 2. Mini Palm Tree
    const tree = new THREE.Group();
    tree.position.set(0, 0.95, -0.6);
    tree.scale.set(0.65, 0.65, 0.65);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.5, 5), this.materials.wood);
    trunk.position.y = 1.25;
    trunk.rotation.z = -0.12;
    tree.add(trunk);

    const leaves = new THREE.Group();
    leaves.position.set(-0.15, 2.5, 0);
    const leafGeo = new THREE.BoxGeometry(1.4, 0.02, 0.35);
    leafGeo.translate(0.7, 0, 0);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(leafGeo, this.materials.leaves);
      leaf.rotation.y = (i / 6) * Math.PI * 2;
      leaf.rotation.z = -0.2;
      leaves.add(leaf);
    }
    tree.add(leaves);
    sceneGroup.add(tree);

    // 3. Glowing crescent moon/sphere higher in the dark sky
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe082 }));
    moon.position.set(-4.5, 7.8, -4.5);
    sceneGroup.add(moon);

    // Small cloud
    const cloud = new THREE.Group();
    cloud.position.set(1.5, 4.0, 3.0);
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfafafa, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35 + i * 0.1, 5, 5), cloudMat);
      puff.position.set(i * 0.4 - 0.4, 0, (i % 2) * 0.1);
      cloud.add(puff);
    }
    sceneGroup.add(cloud);

    // Soft cyan/blue moonlight point light to illuminate the floating island and palm tree
    const moonLight = new THREE.PointLight(0x80deea, 1.5, 12, 1.2);
    moonLight.position.set(-1.0, 3.2, -1.0);
    sceneGroup.add(moonLight);

    // Tiny glowing stars suspended in the dark sky
    const starGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });
    const starCoords = [
      { x: -3.5, y: 5.5, z: -2.0 },
      { x: -2.0, y: 6.5, z: 2.0 },
      { x: 1.5, y: 5.2, z: -3.0 },
      { x: 2.5, y: 7.0, z: 1.0 },
      { x: -1.2, y: 4.5, z: 3.5 },
      { x: -5.0, y: 6.0, z: 0.0 }
    ];
    starCoords.forEach(coord => {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(coord.x, coord.y, coord.z);
      sceneGroup.add(star);
    });

    this.group.add(sceneGroup);
  }

  createFloorLamp(x, z) {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, 0.12, z);

    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 6), this.materials.metalGold);
    base.castShadow = true;
    lampGroup.add(base);

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), this.materials.wood);
    pole.position.y = 1.1;
    pole.castShadow = true;
    lampGroup.add(pole);

    // Shade
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 0.4, 8), this.materials.white);
    shade.position.y = 2.2;
    shade.castShadow = true;
    lampGroup.add(shade);

    // Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
    bulb.position.y = 2.1;
    lampGroup.add(bulb);

    // Light
    const floorLampLight = new THREE.PointLight(0xffd180, 1.2, 12, 1.2);
    floorLampLight.position.set(0, 2.0, 0);
    floorLampLight.castShadow = true;
    lampGroup.add(floorLampLight);

    this.group.add(lampGroup);
  }
}
