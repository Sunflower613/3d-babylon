import * as THREE from 'three';

export class BeachBall {
  constructor(scene, x, y, z, colorHex) {
    this.scene = scene;
    this.radius = 0.36; // Nice play size

    // Physics state
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5, // Spawn drift
      3.2,                          // Hop on spawn
      (Math.random() - 0.5) * 1.5
    );
    this.gravity = 15.0;
    this.friction = 0.985;        // Rolling resistance
    this.bounceElasticity = 0.65; // Ground bounce dampener
    this.isGrounded = false;

    this.initMesh(colorHex);
  }

  initMesh(colorHex) {
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Ball Base Sphere
    const ballGeo = new THREE.SphereGeometry(this.radius, 12, 12);
    const mainMat = new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true });
    this.ballMesh = new THREE.Mesh(ballGeo, mainMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.receiveShadow = true;
    this.group.add(this.ballMesh);

    // Stripes to visualize rolling rotation
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

    // Vertical stripe ring
    const stripeLGeo = new THREE.CylinderGeometry(this.radius + 0.005, this.radius + 0.005, this.radius * 0.25, 12, 1, true);
    const stripeL = new THREE.Mesh(stripeLGeo, stripeMat);
    stripeL.rotation.x = Math.PI / 2;
    this.group.add(stripeL);

    // Horizontal stripe ring
    const stripeRGeo = new THREE.CylinderGeometry(this.radius + 0.004, this.radius + 0.004, this.radius * 0.25, 12, 1, true);
    const stripeR = new THREE.Mesh(stripeRGeo, stripeMat);
    stripeR.rotation.z = Math.PI / 2;
    this.group.add(stripeR);

    this.scene.add(this.group);
  }

  update(delta, player) {
    // 1. Apply gravity if in the air
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // Apply rolling friction to horizontal velocity
    this.velocity.x *= Math.pow(this.friction, delta * 60);
    this.velocity.z *= Math.pow(this.friction, delta * 60);

    // Update position
    this.position.addScaledVector(this.velocity, delta);

    // 2. Island sand floor collision (Ground height Y = 0.6)
    const floorY = 0.6;
    if (this.position.y - this.radius <= floorY) {
      this.position.y = floorY + this.radius;

      // Bounce if velocity is downwards
      if (this.velocity.y < -1.5) {
        this.velocity.y = -this.velocity.y * this.bounceElasticity;
      } else {
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      this.isGrounded = false;
    }

    // 3. Circular island boundary bounce (Outer radius 21.8)
    const maxRadius = 21.5;
    const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);

    if (distFromCenter + this.radius > maxRadius) {
      const nx = this.position.x / distFromCenter;
      const nz = this.position.z / distFromCenter;

      // Reflect horizontal velocity off boundary wall
      const dot = this.velocity.x * nx + this.velocity.z * nz;
      if (dot > 0) {
        this.velocity.x -= 2 * dot * nx;
        this.velocity.z -= 2 * dot * nz;
        this.velocity.x *= 0.68;
        this.velocity.z *= 0.68;
      }

      // Clamp position to boundary
      this.position.x = nx * (maxRadius - this.radius);
      this.position.z = nz * (maxRadius - this.radius);
    }

    // 4. Collision/Kick interaction with the player
    const dx = this.position.x - player.position.x;
    const dz = this.position.z - player.position.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);
    const kickDistance = (player.radius || 0.6) + this.radius - 0.05;

    // Check if player overlaps the ball in 2D and is vertically close
    if (dist2D < kickDistance && Math.abs(this.position.y - player.position.y) < 1.3) {
      const angle = Math.atan2(dx, dz);
      const kickDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));

      // Push ball slightly out of intersection to prevent sticking
      const overlap = kickDistance - dist2D;
      this.position.x += kickDir.x * overlap;
      this.position.z += kickDir.z * overlap;

      // Get player speed
      const playerSpeed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
      const baseForce = 4.8;
      const speedBonus = playerSpeed * 1.3;
      const totalForce = baseForce + speedBonus;

      // Set velocity: kick forward + pop up
      this.velocity.x = kickDir.x * totalForce;
      this.velocity.z = kickDir.z * totalForce;
      this.velocity.y = 2.4 + speedBonus * 0.45;
      this.isGrounded = false;

      // Trigger kick sound
      this.playKickSound();
    }

    // 5. Visual rolling rotation
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (speed > 0.08) {
      // Perpendicular axis for rolling
      const rx = -this.velocity.z / speed;
      const rz = this.velocity.x / speed;
      const rollAngle = (speed / this.radius) * delta;

      this.ballMesh.rotateOnWorldAxis(new THREE.Vector3(rx, 0, rz), rollAngle);
    }

    // Sync group position
    this.group.position.copy(this.position);
  }

  playKickSound() {
    window.dispatchEvent(new CustomEvent('kick-sound', {
      detail: { freq: 140 + Math.random() * 60 }
    }));
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material && child.material.dispose) {
          child.material.dispose();
        }
      }
    });
  }
}
