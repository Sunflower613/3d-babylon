import * as THREE from 'three';

export class Environment {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.particles = null;
    this.particleCount = 150;
    this.particleGeometry = null;
    this.particleMaterial = null;

    this.initLights();
    this.initFog();
    this.initParticles();
  }

  initLights() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // Sky colors based on theme
    const skyLightColor = isChristmas ? 0xddeeff : 0xffffff;
    const groundLightColor = isChristmas ? 0x001020 : 0x00e5ff;
    const intensity = isChristmas ? 0.75 : 1.1;

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(skyLightColor, groundLightColor, intensity);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Directional Sun/Moon Light
    const sunColor = isChristmas ? 0xd9e8f5 : 0xfffde7;
    const sunIntensity = isChristmas ? 0.95 : 1.75;

    const dirLight = new THREE.DirectionalLight(sunColor, sunIntensity);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    
    // Shadows
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
    
    this.sun = dirLight;
  }

  initFog() {
    const fogColor = this.themeConfig.colors.fog || 0xe0f7fa;
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const density = isChristmas ? 0.012 : 0.009;

    this.scene.fog = new THREE.FogExp2(fogColor, density);
  }

  initParticles() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const speeds = [];

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      // In summer, bubbles rise from bottom. In winter, snow falls from top.
      positions[i * 3 + 1] = Math.random() * (isChristmas ? 30 : 22);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

      speeds.push({
        y: isChristmas ? (0.08 + Math.random() * 0.08) : (0.05 + Math.random() * 0.05), // Falling vs Rising speed
        x: (Math.random() - 0.5) * 0.04,
        z: (Math.random() - 0.5) * 0.04
      });
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    // Use Canvas to generate a particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    
    if (isChristmas) {
      // White soft snowflake core
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      // Cyan summer bubble core
      grad.addColorStop(0, 'rgba(128, 222, 234, 0.85)');
      grad.addColorStop(1, 'rgba(128, 222, 234, 0)');
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);

    const texture = new THREE.CanvasTexture(canvas);

    this.particleMaterial = new THREE.PointsMaterial({
      size: isChristmas ? 0.45 : 0.6,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  update(time) {
    if (!this.particles) return;

    const positions = this.particleGeometry.attributes.position.array;
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const speed = this.particleSpeeds[i];

      if (isChristmas) {
        // SNOW: Fall downwards (drift slightly left/right)
        positions[idx] += speed.x + Math.sin(time * 0.0005 + i) * 0.01;
        positions[idx + 1] -= speed.y * 0.5; // fall speed
        positions[idx + 2] += speed.z + Math.cos(time * 0.0005 + i) * 0.01;

        // Respawn snow at the top if it falls below ground (Y = 0.5)
        if (positions[idx + 1] < 0.5) {
          positions[idx] = (Math.random() - 0.5) * 60;
          positions[idx + 1] = 25.0;
          positions[idx + 2] = (Math.random() - 0.5) * 60;
        }
      } else {
        // BUBBLES: Float upwards
        positions[idx] += speed.x + Math.sin(time * 0.001 + i) * 0.015;
        positions[idx + 1] += speed.y * 0.4;
        positions[idx + 2] += speed.z;

        // Respawn bubble at bottom if it floats too high (Y = 22)
        if (positions[idx + 1] > 22) {
          positions[idx] = (Math.random() - 0.5) * 60;
          positions[idx + 1] = -1.0;
          positions[idx + 2] = (Math.random() - 0.5) * 60;
        }
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;

    // Slow rotate the sun light for dynamic shadows (subtle effect)
    const angle = time * 0.00005;
    this.sun.position.x = Math.cos(angle) * 30 + 10;
    this.sun.position.z = Math.sin(angle) * 30 + 10;
  }
}
