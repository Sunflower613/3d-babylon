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
    
    this.initMesh();
    this.initControls();
  }

  initMesh() {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const hairColorHex = this.themeConfig.player.hairColor || 0xff8a80;
    const clothingColorHex = this.themeConfig.player.clothingColor || 0xffffff;
    const hatColorHex = this.themeConfig.player.hatColor || 0xffd180;

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd, flatShading: true }); // skin
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }); // white details
    const hairMat = new THREE.MeshLambertMaterial({ color: hairColorHex, flatShading: true }); // hair
    
    // 1. Torso & Clothes
    // Upper body top
    const topGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.35, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: clothingColorHex, flatShading: true });
    this.body = new THREE.Mesh(topGeo, topMat);
    this.body.position.y = 0.55;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Lower body (Denim shorts for summer, warm dark grey pants for winter)
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

    // 3. Hair (helm, bangs, twin-tails)
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
      // White Snowflake star clip
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.04), whiteMat);
      clip.position.set(0.24, 1.12, 0.24);
      clip.rotation.z = Math.PI / 4;
      this.group.add(clip);
    } else {
      // Watermelon Clip
      const clipRind = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
      clipRind.position.set(0.24, 1.12, 0.24);
      clipRind.rotation.z = -0.4;
      const clipFlesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), new THREE.MeshLambertMaterial({ color: 0xff5252 }));
      clipFlesh.position.set(0.24, 1.14, 0.26);
      clipFlesh.rotation.z = -0.4;
      this.group.add(clipRind);
      this.group.add(clipFlesh);
    }

    // 4. Headwear (Santa Hat vs Straw Hat)
    if (isChristmas) {
      // Santa Hat
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 1.25, -0.04);

      // Red Cone
      const coneGeo = new THREE.ConeGeometry(0.35, 0.6, 8);
      coneGeo.translate(0, 0.3, 0); // Offset center to base
      const redMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
      const cone = new THREE.Mesh(coneGeo, redMat);
      cone.rotation.z = -0.15; // Slanted slightly
      cone.rotation.x = -0.1;
      cone.castShadow = true;
      hatGroup.add(cone);

      // White fluffy band at base
      const bandGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 8);
      const band = new THREE.Mesh(bandGeo, whiteMat);
      band.position.y = 0.05;
      hatGroup.add(band);

      // White Pom-pom sphere at the top tip
      const pomGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const pom = new THREE.Mesh(pomGeo, whiteMat);
      pom.position.set(0.08, 0.62, -0.04);
      hatGroup.add(pom);

      this.group.add(hatGroup);
    } else {
      // Straw Beach Hat
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 1.28, -0.04);
      
      const brimGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.04, 10);
      const strawMat = new THREE.MeshLambertMaterial({ color: hatColorHex, flatShading: true });
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

    // 5. Glasses (Snow Goggles vs Flower Sunglasses)
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, 1.22, 0.3);
    glassGroup.rotation.x = -0.15;

    // Sunglasses lenses (dark circles)
    const lensGeo = new THREE.SphereGeometry(0.12, 6, 6);
    lensGeo.scale(1, 1, 0.2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.x = -0.16;
    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.x = 0.16;
    glassGroup.add(lensL);
    glassGroup.add(lensR);

    // Frames
    const frameColor = isChristmas ? 0xffffff : 0xff80ab; // White ski frame vs Pink flower frame
    const frameMat = new THREE.MeshLambertMaterial({ color: frameColor, flatShading: true });
    
    if (isChristmas) {
      // Ski Goggles strap/frame (connected box)
      const frameGeo = new THREE.BoxGeometry(0.48, 0.2, 0.06);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0, 0.02);
      glassGroup.add(frame);
    } else {
      // Flower shape frames
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

    // 6. Hamster on Head
    const hamster = new THREE.Group();
    hamster.position.set(0.1, isChristmas ? 1.55 : 1.48, -0.06);

    const hamBodyGeo = new THREE.SphereGeometry(0.14, 6, 6);
    hamBodyGeo.scale(1, 0.9, 1.1);
    const hamColor = isChristmas ? 0xb0bec5 : 0xffd180; // White-grey hamster vs orange hamster
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

    // Tiny pink cheeks for hamster
    const hamBlush = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshLambertMaterial({ color: 0xff8a80 }));
    hamBlush.position.set(0.08, 0, 0.11);
    hamster.add(hamBlush);

    if (isChristmas) {
      // Cozy tiny red neck scarf on the hamster
      const scarfGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 6);
      const scarf = new THREE.Mesh(scarfGeo, new THREE.MeshLambertMaterial({ color: 0xc62828 }));
      scarf.position.y = -0.06;
      hamster.add(scarf);
    } else {
      // Flower on ear
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), whiteMat);
      flower.position.set(0.06, 0.12, 0.08);
      hamster.add(flower);
    }

    this.group.add(hamster);

    // 7. Interactive Toy in Hands (Gift Box vs Watermelon slice)
    if (isChristmas) {
      // Green present box with red ribbon
      const giftGroup = new THREE.Group();
      giftGroup.position.set(0, 0.58, 0.3);

      const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true }));
      boxMesh.castShadow = true;
      giftGroup.add(boxMesh);

      const ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.27), new THREE.MeshLambertMaterial({ color: 0xd50000, flatShading: true }));
      giftGroup.add(ribbonMesh);

      this.group.add(giftGroup);
    } else {
      // Watermelon Slice
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

    // 8. Eyes and Cheeks
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

    // 9. Sandals / Boots
    const sandalColor = isChristmas ? 0x5d4037 : 0xffffff; // Brown winter boots vs white summer sandals
    const sandalMat = new THREE.MeshLambertMaterial({ color: sandalColor, flatShading: true });
    const footGeo = new THREE.SphereGeometry(0.09, 6, 6);
    footGeo.scale(1, isChristmas ? 1.0 : 0.7, 1.3);

    this.footL = new THREE.Mesh(footGeo, sandalMat);
    this.footL.position.set(-0.16, 0.04, 0);
    this.footR = new THREE.Mesh(footGeo, sandalMat);
    this.footR.position.set(0.16, 0.04, 0);
    
    if (!isChristmas) {
      // Add sandal bows for summer
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

    // 10. Cardigan / Scarf (White cardigan for summer, warm red winter scarf for Christmas)
    const capeColor = isChristmas ? 0xd50000 : 0xffffff;
    const capeMat = new THREE.MeshLambertMaterial({
      color: capeColor,
      transparent: !isChristmas, // transparent crop cardigan for summer
      opacity: isChristmas ? 1.0 : 0.8,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    if (isChristmas) {
      // Winter neck scarf representation (wrapped around neck, waving ends)
      const capeGeo = new THREE.PlaneGeometry(0.55, 0.7, 2, 4);
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0.05, 0.62, -0.22);
      this.cape.rotation.x = 0.12;
      this.cape.rotation.y = 0.05;
      this.cape.castShadow = true;
      this.group.add(this.cape);
    } else {
      // Summer Cardigan
      const capeGeo = new THREE.PlaneGeometry(0.65, 0.75, 3, 5);
      this.cape = new THREE.Mesh(capeGeo, capeMat);
      this.cape.position.set(0, 0.48, -0.32);
      this.cape.rotation.x = 0.15;
      this.cape.castShadow = true;
      this.group.add(this.cape);
    }

    this.scene.add(this.group);
  }

  initControls() {
    const handleKey = (e, isDown) => {
      if (this.isSitting) {
        if (isDown) this.standUp();
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

    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        const isUI = touch.target.closest('#mobile-controls') || 
                     touch.target.closest('.hud-header') || 
                     touch.target.closest('.modal-overlay') || 
                     touch.target.closest('.modal-card') ||
                     touch.target.id === 'audio-btn';
                     
        const isLeftHalf = touch.clientX < window.innerWidth * 0.45;
                     
        if (!isUI && !isLeftHalf && cameraTouchId === null) {
          isDragging = true;
          cameraTouchId = touch.identifier;
          previousMousePosition = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || cameraTouchId === null) return;
      
      let cameraTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === cameraTouchId) {
          cameraTouch = e.touches[i];
          break;
        }
      }
      
      if (!cameraTouch) return;
      
      const deltaX = cameraTouch.clientX - previousMousePosition.x;
      const deltaY = cameraTouch.clientY - previousMousePosition.y;

      this.cameraAngleH -= deltaX * 0.005;
      this.cameraAngleV = Math.max(0.1, Math.min(1.2, this.cameraAngleV + deltaY * 0.005));

      previousMousePosition = { x: cameraTouch.clientX, y: cameraTouch.clientY };
    });

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

    window.addEventListener('touchend', handleCameraTouchEnd);
    window.addEventListener('touchcancel', handleCameraTouchEnd);

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
        if (!this.controlsLocked) this.keys.space = true;
      });
      btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys.space = false;
      });
    }
  }

  resetInputs() {
    this.keys = { w: false, a: false, s: false, d: false, space: false };
    this.velocity.set(0, this.velocity.y, 0);
  }

  update(delta, time) {
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

      this.tailL.rotation.z = -0.2 - Math.sin(time * 0.002) * 0.1;
      this.tailR.rotation.z = 0.2 + Math.sin(time * 0.002) * 0.1;

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
    const maxRadius = 21.2;
    const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (distFromCenter > maxRadius) {
      this.position.x = (this.position.x / distFromCenter) * maxRadius;
      this.position.z = (this.position.z / distFromCenter) * maxRadius;
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

      this.tailL.rotation.z = -0.2 - Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.18;
      this.tailR.rotation.z = 0.2 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.18;

      this.body.rotation.x = this.keys.shift ? 0.22 : 0.1;

      this.body.position.y = 0.38 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.06;
      this.head.position.y = 0.88 + Math.abs(Math.sin(time * 0.001 * feetSpeed)) * 0.04;
    } else {
      this.body.rotation.x = 0;
      this.footL.position.set(-0.16, 0.05, 0);
      this.footR.position.set(0.16, 0.05, 0);
      this.body.position.y = 0.38 + Math.sin(time * 0.003) * 0.02;
      this.head.position.y = 0.88 + Math.sin(time * 0.003) * 0.02;

      this.tailL.rotation.z = -0.2 + Math.sin(time * 0.003) * 0.04;
      this.tailR.rotation.z = 0.2 - Math.sin(time * 0.003) * 0.04;
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

  standUp() {
    this.isSitting = false;
    this.swingRef = null;
    this.controlsLocked = false;
    this.position.z += 1.2;
    this.position.y = 0.8;
  }
}
