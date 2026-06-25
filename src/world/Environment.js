import * as BABYLON from '@babylonjs/core';

export class Environment {
  constructor(scene, themeConfig) {
    this.scene = scene;
    this.themeConfig = themeConfig;
    this.particlesList = [];
    this.particleCount = 150;
    this.isNight = false; // 昼夜状态
    this.isIndoor = false; // 是否在室内

    this.initLights();
    this.initFog();
    this.initParticles();
  }

  setIndoorMode(isIndoor) {
    this.isIndoor = isIndoor;
    // 室内隐藏室外天气粒子
    this.particlesList.forEach(p => {
      p.mesh.setEnabled(!isIndoor);
    });
  }

  initLights() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;

    // 半球环境光
    const skyLightColor = convertColor(isChristmas ? 0xddeeff : 0xddeeff);
    const groundLightColor = convertColor(isChristmas ? 0x001020 : 0x795548);
    const intensity = isChristmas ? 0.42 : 0.62;

    this.hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    this.hemiLight.diffuse = skyLightColor;
    this.hemiLight.groundColor = groundLightColor;
    this.hemiLight.intensity = intensity;

    // 方向太阳/月亮光 (影子投影光)
    const sunColor = convertColor(isChristmas ? 0xd9e8f5 : 0xfffde7);
    const sunIntensity = isChristmas ? 0.55 : 0.85;

    this.sun = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-20, -40, -20).normalize(), this.scene);
    this.sun.position = new BABYLON.Vector3(20, 40, 20);
    this.sun.diffuse = sunColor;
    this.sun.intensity = sunIntensity;

    // 创建阴影生成器
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const shadowMapSize = isMobile ? 1024 : 2048;
    this.shadowGenerator = new BABYLON.ShadowGenerator(shadowMapSize, this.sun);
    this.shadowGenerator.usePoissonSampling = true; // 开启软阴影以平滑边缘
    this.shadowGenerator.bias = -0.0005;

    // 将阴影生成器挂在 scene 上，方便其它 Generator 拿去 addShadowCaster
    this.scene.shadowGenerator = this.shadowGenerator;
  }

  initFog() {
    const fogColor = convertColor(this.themeConfig.colors.fog || 0xe0f7fa);
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const density = isChristmas ? 0.012 : 0.009;

    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogColor = fogColor;
    this.scene.fogDensity = density;
  }

  initParticles() {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    
    // 1. 创建种子源网格 (用极低面数的网格保证实例化性能)
    let sourceMesh;
    const pMat = new BABYLON.StandardMaterial("envParticleMat", this.scene);
    pMat.specularColor = new BABYLON.Color3(0, 0, 0);
    pMat.disableLighting = true; // 不受光照，发光质感

    if (isChristmas) {
      // 圣诞节用扁平的小 Box 模拟雪花网格
      sourceMesh = BABYLON.MeshBuilder.CreateBox("snowSource", { size: 0.15 }, this.scene);
      pMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
      pMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    } else {
      // 夏日沙滩用 4 面球模拟气泡
      sourceMesh = BABYLON.MeshBuilder.CreateSphere("bubbleSource", { diameter: 0.15, segments: 4 }, this.scene);
      pMat.diffuseColor = BABYLON.Color3.FromHexString("#80deea");
      pMat.emissiveColor = BABYLON.Color3.FromHexString("#80deea");
      pMat.alpha = 0.72;
    }
    sourceMesh.material = pMat;
    sourceMesh.setEnabled(false); // 隐藏种子网格

    // 2. 利用 GPU 实例化机制创建 150 个天气粒子，极度节省渲染 Draw Call
    for (let i = 0; i < this.particleCount; i++) {
      const inst = sourceMesh.createInstance(`weatherPet_${i}`);
      
      const px = (Math.random() - 0.5) * 60;
      const py = Math.random() * (isChristmas ? 30 : 22);
      const pz = (Math.random() - 0.5) * 60;
      inst.position.set(px, py, pz);

      const speed = {
        y: isChristmas ? (0.08 + Math.random() * 0.08) : (0.05 + Math.random() * 0.05),
        x: (Math.random() - 0.5) * 0.04,
        z: (Math.random() - 0.5) * 0.04
      };

      this.particlesList.push({
        mesh: inst,
        speed: speed,
        initialY: py
      });
    }

    this.sourceMesh = sourceMesh; // 保持引用以便销毁
  }

  update(time) {
    const isChristmas = this.themeConfig.colors.sky === 0x050c18;
    const dt = 1.0; // 对应原本 delta-free 的 time 驱动公式

    // 1. 更新粒子物理运动
    if (!this.isIndoor && this.particlesList.length > 0) {
      this.particlesList.forEach((p, idx) => {
        const mesh = p.mesh;
        const speed = p.speed;

        if (isChristmas) {
          // 下雪：向下漂落并左右偏移
          mesh.position.x += speed.x + Math.sin(time * 0.0005 + idx) * 0.01;
          mesh.position.y -= speed.y * 0.5;
          mesh.position.z += speed.z + Math.cos(time * 0.0005 + idx) * 0.01;

          // 若落到地面（Y = 0.5），在顶部重生
          if (mesh.position.y < 0.5) {
            mesh.position.set(
              (Math.random() - 0.5) * 60,
              25.0,
              (Math.random() - 0.5) * 60
            );
          }
        } else {
          // 夏日气泡：向上漂浮并伴有轻微抖动
          mesh.position.x += speed.x + Math.sin(time * 0.001 + idx) * 0.015;
          mesh.position.y += speed.y * 0.4;
          mesh.position.z += speed.z;

          // 若飘得太高（Y = 22），在底部重生
          if (mesh.position.y > 22.0) {
            mesh.position.set(
              (Math.random() - 0.5) * 60,
              -1.0,
              (Math.random() - 0.5) * 60
            );
          }
        }
      });
    }

    // 2. 昼夜交替及室内过渡光源 Lerp
    let targetHemiIntensity, targetSunIntensity, targetSunColor, targetSkyColor, targetFogColor;

    if (this.isIndoor) {
      targetHemiIntensity = 0.75;
      targetSunIntensity = 0.05;
      targetSunColor = BABYLON.Color3.FromHexString("#ffd180");
      targetSkyColor = BABYLON.Color3.FromHexString("#0c0e14");
      targetFogColor = BABYLON.Color3.FromHexString("#0c0e14");
    } else {
      targetHemiIntensity = this.isNight ? 0.18 : (isChristmas ? 0.75 : 1.1);
      targetSunIntensity = this.isNight ? 0.22 : (isChristmas ? 0.95 : 1.75);
      
      const sunHex = this.isNight ? "#90a4ae" : (isChristmas ? "#d9e8f5" : "#fffde7");
      targetSunColor = BABYLON.Color3.FromHexString(sunHex);

      const skyHex = this.isNight ? "#070b12" : "#" + this.themeConfig.colors.sky.toString(16).padStart(6, '0');
      targetSkyColor = BABYLON.Color3.FromHexString(skyHex);

      const fogHex = this.isNight ? "#070b12" : "#" + this.themeConfig.colors.fog.toString(16).padStart(6, '0');
      targetFogColor = BABYLON.Color3.FromHexString(fogHex);
    }

    // 缓动应用到光源和雾化
    if (this.hemiLight) {
      this.hemiLight.intensity += (targetHemiIntensity - this.hemiLight.intensity) * 0.04;
    }
    if (this.sun) {
      this.sun.intensity += (targetSunIntensity - this.sun.intensity) * 0.04;
      this.sun.diffuse = BABYLON.Color3.Lerp(this.sun.diffuse, targetSunColor, 0.04);
    }

    // 更新天空背景色 (Clear Color)
    const currentSky = new BABYLON.Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b);
    this.scene.clearColor = BABYLON.Color4.FromColor3(
      BABYLON.Color3.Lerp(currentSky, targetSkyColor, 0.04),
      1.0
    );

    // 更新雾的颜色
    this.scene.fogColor = BABYLON.Color3.Lerp(this.scene.fogColor, targetFogColor, 0.04);
  }
}

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
