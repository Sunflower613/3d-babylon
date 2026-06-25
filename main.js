import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import nipplejs from 'nipplejs';
import { siteConfig } from '../site-config.js';
import { ModalManager } from './src/ui/Modal.js';
import { Environment } from './src/world/Environment.js';
import { IslandGenerator } from './src/world/Island.js';
import { HouseGenerator } from './src/world/House.js';
import { Player } from './src/world/Player.js';
import { InteractsManager } from './src/world/Interacts.js';
import { BeachBall } from './src/world/BeachBall.js';
import { FarmGenerator } from './src/world/Farm.js';
import { PKArenaGenerator, createSword3D, createHammer3D, createBomb3D } from './src/world/PKArena.js';
import { LakeGenerator } from './src/world/Lake.js';
import { CastleGenerator } from './src/world/Castle.js';
const SVG_ICONS = {
  jump: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 11-5-5-5 5" /><path d="m17 18-5-5-5 5" /></svg>`),
  run: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>`),
  interact: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>`),
  attack: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" x2="19" y1="19" y2="13" /><line x1="16" x2="20" y1="16" y2="20" /><line x1="19" x2="21" y1="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" x2="9" y1="14" y2="18" /><line x1="7" x2="4" y1="17" y2="20" /><line x1="3" x2="5" y1="19" y2="21" /></svg>`),
  sprout: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10" /><path d="M10 20c5.5-2.5 8-6.4 8-12a4 4 0 0 0-8 0c0 5.5 2.5 9.5 8 12Z" /><path d="M10 20c-5.5-2.5-8-6.4-8-12a4 4 0 0 1 8 0c0 5.5-2.5 9.5-8 12Z" /></svg>`),
  drop: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`)
};

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

class GameApp {
  constructor() {
    // 阻止移动端双击放大及长按翻译
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('selectstart', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    });

    // 移动端环境检测
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    if (isTouchDevice) {
      document.body.classList.add('is-mobile');
    } else {
      const detectTouch = () => {
        document.body.classList.add('is-mobile');
        window.removeEventListener('touchstart', detectTouch);
      };
      window.addEventListener('touchstart', detectTouch);
    }

    this.container = document.getElementById('canvas-container');
    
    // 初始化自制 Clock 模块（解除对 Three.js Clock 的依赖）
    this.clock = {
      lastTime: performance.now(),
      startTime: performance.now(),
      getDelta: function() {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;
        return delta;
      },
      getElapsedTime: function() {
        return (performance.now() - this.startTime) / 1000;
      }
    };

    // 核心运行组件
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.player = null;
    this.environment = null;
    
    this.islandGen = null;
    this.houseGen = null;
    this.farmGen = null;
    this.pkArenaGen = null;
    this.lakeGen = null;
    this.castleGen = null;

    this.modalMgr = null;
    this.interactMgr = null;
    this.beachBallsList = [];
    this.activeBombs = [];
    this.activeExplosions = [];
    this.bombCooldownActive = false;

    // 获取当前活动的主题
    const activeThemeKey = siteConfig.activeTheme || 'beach';
    this.themeConfig = siteConfig.themes[activeThemeKey];

    // 音频合成器属性
    this.audioCtx = null;
    this.isPlayingMusic = false;
    this.synthInterval = null;

    this.initEngine();
    this.initWorld();
    this.initSSO();
    this.initGameSystems();
    
    // 启动渲染循环
    this.engine.runRenderLoop(() => {
      this.animate();
    });
  }

  createFlatMaterial(name, colorHex) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = convertColor(colorHex);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.flatShading = true;
    return mat;
  }

  initEngine() {
    // 自动寻找或创建 canvas 画布
    let canvas = this.container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      this.container.appendChild(canvas);
    }

    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    
    // 开启极低开销的自发光辉光层（GlowLayer）实现华丽霓虹光晕效果
    this.glowLayer = new BABYLON.GlowLayer("glowLayer", this.scene);
    this.glowLayer.intensity = 1.0;

    // 选择性辉光：排除水体、天气粒子、踩水波纹、樱花瓣和胡须等非霓虹装饰，防止其在大面积渲染时产生刺眼的发光
    this.glowLayer.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
      if (material) {
        const matName = material.name.toLowerCase();
        const isExcluded = 
          matName.indexOf("water") !== -1 ||
          matName.indexOf("sea") !== -1 ||
          matName.indexOf("ocean") !== -1 ||
          matName.indexOf("spout") !== -1 ||
          matName.indexOf("ripple") !== -1 ||
          matName.indexOf("sakura") !== -1 ||
          matName.indexOf("petal") !== -1 ||
          matName.indexOf("whisker") !== -1 ||
          matName.indexOf("particle") !== -1 ||
          matName.indexOf("bubble") !== -1 ||
          matName.indexOf("snow") !== -1 ||
          matName.indexOf("fountain") !== -1;

        if (!isExcluded) {
          result.copyFrom(material.emissiveColor || material.diffuseColor);
          return;
        }
      }
      result.set(0, 0, 0); // 排除的对象在辉光通道中无发光贡献
    };

    // 初始化通用目标跟镜相机
    this.camera = new BABYLON.TargetCamera("mainCamera", BABYLON.Vector3.Zero(), this.scene);
    
    // 绑定大小变化监听
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  initWorld() {
    // 根据 DOM id 识别当前所在子场景
    this.currentMap = 'island';
    if (document.body.id === 'page-lobby') this.currentMap = 'island';
    else if (document.body.id === 'page-house') this.currentMap = 'house';
    else if (document.body.id === 'page-farm') this.currentMap = 'farm';
    else if (document.body.id === 'page-pvp') this.currentMap = 'pk_arena';
    else if (document.body.id === 'page-lake') this.currentMap = 'lake';
    else if (document.body.id === 'page-castle') this.currentMap = 'castle';

    this.modalMgr = new ModalManager();
    this.environment = new Environment(this.scene, this.themeConfig);

    // 根据子场景类型分别加载对应的场景生成器
    if (this.currentMap === 'island') {
      this.islandGen = new IslandGenerator(this.scene, this.themeConfig);
      this.player = new Player(this.scene, this.camera, this.islandGen.colliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.islandGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    } else if (this.currentMap === 'house') {
      this.houseGen = new HouseGenerator(this.scene, this.themeConfig);
      this.player = new Player(this.scene, this.camera, this.houseGen.colliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.houseGen, this.modalMgr, this);
      this.environment.setIndoorMode(true);
    } else if (this.currentMap === 'farm') {
      this.farmGen = new FarmGenerator(this.scene, this.themeConfig);
      this.farmPlots3D = this.farmGen.farmPlots3D;
      this.farmInteractables = this.farmGen.interactables;
      this.farmColliders = this.farmGen.colliders;

      this.player = new Player(this.scene, this.camera, this.farmColliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.farmGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    } else if (this.currentMap === 'pk_arena') {
      this.pkArenaGen = new PKArenaGenerator(this.scene, this.themeConfig);
      this.pkArenaInteractables = this.pkArenaGen.interactables;
      this.pkArenaColliders = this.pkArenaGen.colliders;
      this.pkCrystalMesh = this.pkArenaGen.pkCrystalMesh;
      this.swordPreview = this.pkArenaGen.swordPreview;
      this.hammerPreview = this.pkArenaGen.hammerPreview;
      this.bombPreview = this.pkArenaGen.bombPreview;

      this.player = new Player(this.scene, this.camera, this.pkArenaColliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.pkArenaGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    } else if (this.currentMap === 'lake') {
      this.lakeGen = new LakeGenerator(this.scene, this.themeConfig, this);
      this.lakeInteractables = this.lakeGen.interactables;
      this.lakeColliders = this.lakeGen.colliders;

      this.player = new Player(this.scene, this.camera, this.lakeColliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.lakeGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);

      // 监听弹钢琴音符发光粒子特效
      window.addEventListener('piano-note-played', (e) => {
        if (this.currentMap === 'lake' && this.lakeGen) {
          this.lakeGen.spawnNoteParticle(e.detail.note);
        }
      });
    } else if (this.currentMap === 'castle') {
      this.castleGen = new CastleGenerator(this.scene, this.themeConfig, this);
      this.castleInteractables = this.castleGen.interactables;
      this.castleColliders = this.castleGen.colliders;

      this.player = new Player(this.scene, this.camera, this.castleColliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.castleGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    }

    this.player.app = this; // 共享 App 引用

    // 收集子场景中的 shadowCasters 并统一开启阴影投射
    let sceneShadowCasters = [];
    if (this.islandGen) sceneShadowCasters = this.islandGen.getShadowCasters();
    else if (this.houseGen) sceneShadowCasters = this.houseGen.getShadowCasters();
    else if (this.farmGen) sceneShadowCasters = this.farmGen.getShadowCasters();
    else if (this.pkArenaGen) sceneShadowCasters = this.pkArenaGen.getShadowCasters();
    else if (this.lakeGen) sceneShadowCasters = this.lakeGen.getShadowCasters();
    else if (this.castleGen) sceneShadowCasters = this.castleGen.getShadowCasters();

    if (this.environment && this.environment.shadowGenerator && sceneShadowCasters.length > 0) {
      sceneShadowCasters.forEach(mesh => {
        this.environment.shadowGenerator.addShadowCaster(mesh, true);
      });
    }

    // 从 URL 提取并还原出生点坐标
    const urlParams = new URLSearchParams(window.location.search);
    const spawnParam = urlParams.get('spawn');
    if (spawnParam) {
      const parts = spawnParam.split(',').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        this.player.position.set(parts[0], parts[1], parts[2]);
        this.player.group.position.copyFrom(this.player.position);
        
        // 合理朝向设定
        if (this.currentMap === 'house' || this.currentMap === 'farm' || this.currentMap === 'castle') {
          this.player.group.rotation.y = Math.PI;
          this.player.cameraAngleH = Math.PI;
        } else if (this.currentMap === 'pk_arena') {
          if (parts[2] < 0) {
            this.player.group.rotation.y = Math.PI; 
            this.player.cameraAngleH = Math.PI; 
          } else {
            this.player.group.rotation.y = -Math.PI / 2;
            this.player.cameraAngleH = -Math.PI / 2;
          }
        } else if (this.currentMap === 'island' || this.currentMap === 'lake') {
          this.player.group.rotation.y = 0;
          this.player.cameraAngleH = 0;
        }
      }
    } else {
      // 默认位置设置
      if (this.currentMap === 'house') {
        this.player.position.set(0, 0.12 + 0.1, 9.5);
        this.player.group.position.copyFrom(this.player.position);
        this.player.group.rotation.y = Math.PI;
        this.player.cameraAngleH = Math.PI;
      } else if (this.currentMap === 'farm') {
        this.player.position.set(0, 0.6 + 0.1, -8.0);
        this.player.group.position.copyFrom(this.player.position);
        this.player.group.rotation.y = Math.PI;
        this.player.cameraAngleH = Math.PI;
      } else if (this.currentMap === 'pk_arena') {
        this.player.position.set(-5.0, 0.6 + 0.1, 0);
        this.player.group.position.copyFrom(this.player.position);
        this.player.group.rotation.y = -Math.PI / 2;
        this.player.cameraAngleH = -Math.PI / 2;
      } else if (this.currentMap === 'lake') {
        this.player.position.set(0, 0.6 + 0.1, 8.5);
        this.player.group.position.copyFrom(this.player.position);
        this.player.group.rotation.y = Math.PI; 
        this.player.cameraAngleH = Math.PI;
      } else if (this.currentMap === 'castle') {
        this.player.position.set(-2.5, 0.6 + 0.1, 11.5);
        this.player.group.position.copyFrom(this.player.position);
        this.player.group.rotation.y = Math.PI; 
        this.player.cameraAngleH = Math.PI;
      } else {
        // 大厅岛默认出生点
        this.player.position.set(0, 4, 0);
        this.player.group.position.copyFrom(this.player.position);
      }
    }

    const isChristmas = siteConfig.activeTheme === 'christmas';

    // 监听生成雪球/沙滩球事件
    window.addEventListener('spawn-ball', (e) => {
      if (this.currentMap !== 'island') return;
      
      const spawnX = e.detail.x;
      const spawnZ = e.detail.z + 0.6;
      const colors = isChristmas ? [0xffffff, 0xe0f7fa, 0xf5fafd] : [0xff5252, 0x40c4ff, 0xffeb3b, 0xff8a80, 0x00e676];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const ball = new BeachBall(this.scene, spawnX, 1.3, spawnZ, color);
      ball.app = this;
      this.beachBallsList.push(ball);

      // 上限 5 个球，清除最老的那颗
      if (this.beachBallsList.length > 5) {
        let oldestIndex = -1;
        for (let i = 0; i < this.beachBallsList.length; i++) {
          if (!this.beachBallsList[i].isCarried) {
            oldestIndex = i;
            break;
          }
        }
        if (oldestIndex !== -1) {
          const oldBall = this.beachBallsList.splice(oldestIndex, 1)[0];
          oldBall.destroy();
        }
      }

      this.playCustomSound(isChristmas ? 320 : 450, 0.12, 'sine', 0.08);
    });

    // 监听脚踢沙滩球音效事件
    window.addEventListener('kick-sound', (e) => {
      this.playCustomSound(isChristmas ? e.detail.freq * 0.6 : e.detail.freq, 0.16, isChristmas ? 'sine' : 'triangle', 0.18);
    });

    // 绑定衣柜换装颜色选择面板
    this.initWardrobeUI();

    // 绑定右上角昼夜模式时间切换按钮
    const btnToggleTime = document.getElementById('btn-toggle-time');
    if (btnToggleTime) {
      const handleToggleTime = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (this.environment) {
          this.environment.isNight = !this.environment.isNight;
          this.playCustomSound(this.environment.isNight ? 220 : 440, 0.4, 'sine', 0.08);
        }
      };
      btnToggleTime.addEventListener('touchstart', handleToggleTime, { passive: false });
      btnToggleTime.addEventListener('click', handleToggleTime);
    }

    // 躺下起立控制绑定
    const btnStandUp = document.getElementById('btn-stand-up');
    if (btnStandUp) {
      const handleStandUp = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (this.player && this.player.isLyingDown) {
          this.player.standUp();
        }
      };
      btnStandUp.addEventListener('touchstart', handleStandUp, { passive: false });
      btnStandUp.addEventListener('click', handleStandUp);
    }

    this.initHUDGUI();
    this.initMobileControls();

    // 触发外壳页面加载回调
    const appShell = window.appShell || (window.parent && window.parent.appShell);
    if (appShell && typeof appShell.onMapLoaded === 'function') {
      appShell.onMapLoaded(this.currentMap);
    }
  }

  initMobileControls() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 1024);
    const mobileControls = document.getElementById('mobile-controls');
    if (!mobileControls) return;
    if (!isTouch) {
      mobileControls.style.display = 'none';
      return;
    }
    mobileControls.style.display = 'block';

    // 兜底防御性初始化全局输入对象
    window.joystickDir = window.joystickDir || { x: 0, y: 0 };
    window.keys = window.keys || { space: false, shift: false, j: false };

    // 初始化 nipplejs 摇杆
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) {
      if (this.joystick) {
        this.joystick.destroy();
      }
      this.joystick = nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '55px', top: '55px' }, // 使用确切像素值（110px几何中心）避免百分比导致的内部 NaN 几何计算错误
        color: 'rgba(255, 255, 255, 0.4)',
        size: 110
      });

      this.joystick.on('move', (evt, data) => {
        // 双重保险接收 data 或是 evt.data
        const moveData = data || evt.data;
        if (moveData && moveData.vector) {
          window.joystickDir.x = moveData.vector.x;
          window.joystickDir.y = moveData.vector.y;
        }
      });

      this.joystick.on('end', () => {
        window.joystickDir.x = 0;
        window.joystickDir.y = 0;
      });
    }

    // 绑定加速和跳跃按钮
    const btnRun = document.getElementById('btn-run');
    if (btnRun) {
      btnRun.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.keys.shift = true;
        btnRun.classList.add('active');
      });
      btnRun.addEventListener('pointerup', (e) => {
        e.preventDefault();
        window.keys.shift = false;
        btnRun.classList.remove('active');
      });
      btnRun.addEventListener('pointercancel', (e) => {
        window.keys.shift = false;
        btnRun.classList.remove('active');
      });
    }

    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.keys.space = true;
        btnJump.classList.add('active');
      });
      btnJump.addEventListener('pointerup', (e) => {
        e.preventDefault();
        window.keys.space = false;
        btnJump.classList.remove('active');
      });
      btnJump.addEventListener('pointercancel', (e) => {
        window.keys.space = false;
        btnJump.classList.remove('active');
      });
    }
  }

  initHUDGUI() {
    return; // 禁用 3D 摇杆和按钮渲染，改用 HTML 绝对定位悬浮控制
    // 只有在检测到触摸设备或视口较小时才渲染移动端 HUD
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobile = isTouch || (window.innerWidth < 1024);
    if (!isMobile) return;

    // 动态缩放系数：根据当前屏幕宽度自适应，PC 浏览器小视口下防止偏大，移动端高 DPI 下防小
    const viewWidth = window.innerWidth;
    let baseScale = 1.0;
    if (viewWidth < 768) {
      // 移动端：适当放大以便指尖触控
      baseScale = 1.15;
    } else {
      // PC 端：根据视口宽度收缩，最大 1.0，最低不低于 0.85，确保调试时清晰可见
      baseScale = Math.min(1.0, viewWidth / 1366);
      baseScale = Math.max(0.85, baseScale);
    }

    // 创建 Fullscreen UI
    this.hudUI = GUI.AdvancedDynamicTexture.CreateFullscreenUI("HUD", true, this.scene);

    const localJoystick = (window.parent && window.parent.joystickDir) ? window.parent.joystickDir : window.joystickDir;
    const localKeys = (window.parent && window.parent.keys) ? window.parent.keys : window.keys;

    // ==========================================
    // 1. 左下角虚拟摇杆
    // ==========================================
    const joystickContainer = new GUI.Ellipse();
    joystickContainer.name = "joystick-container";
    joystickContainer.width = Math.floor(120 * baseScale) + "px";
    joystickContainer.height = Math.floor(120 * baseScale) + "px";
    joystickContainer.color = "rgba(255, 255, 255, 0.4)";
    joystickContainer.thickness = 4;
    joystickContainer.background = "rgba(0, 0, 0, 0.15)";
    joystickContainer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    joystickContainer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    joystickContainer.left = Math.floor(40 * baseScale) + "px";
    joystickContainer.top = Math.floor(-40 * baseScale) + "px";
    joystickContainer.isPointerBlocker = true;
    this.hudUI.addControl(joystickContainer);

    const joystickPuck = new GUI.Ellipse();
    joystickPuck.name = "joystick-puck";
    joystickPuck.width = Math.floor(50 * baseScale) + "px";
    joystickPuck.height = Math.floor(50 * baseScale) + "px";
    joystickPuck.color = "rgba(255, 255, 255, 0.7)";
    joystickPuck.thickness = 2;
    joystickPuck.background = "rgba(255, 255, 255, 0.4)";
    joystickContainer.addControl(joystickPuck);

    // 拖动交互逻辑
    let isDragging = false;
    const maxLimit = 40 * baseScale; // 摇杆最大偏移像素自适应

    const pointerDown = (coordinates) => {
      isDragging = true;
      updatePuckPosition(coordinates);
    };

    const pointerMove = (coordinates) => {
      if (!isDragging) return;
      updatePuckPosition(coordinates);
    };

    const pointerUp = () => {
      isDragging = false;
      joystickPuck.left = "0px";
      joystickPuck.top = "0px";
      if (localJoystick) {
        localJoystick.x = 0;
        localJoystick.y = 0;
      }
    };

    const updatePuckPosition = (coordinates) => {
      const hostHeight = this.engine.getRenderHeight();
      const centerX = (40 + 60) * baseScale; // left + width / 2
      const centerY = hostHeight - (40 + 60) * baseScale; // hostHeight - bottom - height / 2
      
      let dx = coordinates.x - centerX;
      let dy = coordinates.y - centerY;
      
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > maxLimit) {
        dx = dx * (maxLimit / distance);
        dy = dy * (maxLimit / distance);
        distance = maxLimit;
      }

      joystickPuck.left = dx + "px";
      joystickPuck.top = dy + "px";

      if (localJoystick) {
        localJoystick.x = dx / maxLimit;
        localJoystick.y = -dy / maxLimit; // Y轴取反：上推dy为负，取反为正，表示Z轴向前
      }
    };

    joystickContainer.onPointerDownObservable.add((coordinates) => {
      pointerDown(coordinates);
    });

    // 摇杆需要全局监听 pointermove 和 pointerup 以防止手指划出容器导致卡死
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (!isDragging) return;
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
        pointerMove({ x: pointerInfo.event.clientX, y: pointerInfo.event.clientY });
      } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
        pointerUp();
      }
    });

    // ==========================================
    // 2. 右下角动作按键 (100% 本地渲染 of SVG 矢量图标效果)
    // ==========================================
    const actionContainer = new GUI.Rectangle("actionContainer");
    actionContainer.thickness = 0;
    actionContainer.background = "";
    actionContainer.height = Math.floor(190 * baseScale) + "px";
    actionContainer.width = Math.floor(190 * baseScale) + "px";
    actionContainer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    actionContainer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    actionContainer.left = Math.floor(-32 * baseScale) + "px";
    actionContainer.top = Math.floor(-32 * baseScale) + "px";
    this.hudUI.addControl(actionContainer);

    // 辅助创建漂亮的圆形 GUI 按钮 (支持 SVG 图标本地渲染与普通字符)
    const createActionButton = (iconUrl, bgColor, borderColor, size, left, top, onPress, onRelease) => {
      const btn = new GUI.Ellipse();
      btn.width = Math.floor(size * baseScale) + "px";
      btn.height = Math.floor(size * baseScale) + "px";
      btn.color = borderColor || "rgba(255, 255, 255, 0.4)";
      btn.thickness = 2;
      btn.background = bgColor || "rgba(0, 0, 0, 0.3)";
      btn.isPointerBlocker = true;
      btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      btn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
      btn.left = Math.floor(left * baseScale) + "px";
      btn.top = Math.floor(top * baseScale) + "px";

      // 统一内缩边距 (用百分比确保绝对居中，杜绝任何对齐继承带来的偏心 bug)
      const padValue = "20%"; // 20% 的 padding 让内容大小刚好占 60%

      // 文本框支持 Emoji 或简短文本 (通过 100% 宽高 + padding 强行在中心拉伸)
      const textBlock = new GUI.TextBlock("text", "");
      textBlock.width = "100%";
      textBlock.height = "100%";
      textBlock.paddingTop = padValue;
      textBlock.paddingBottom = padValue;
      textBlock.paddingLeft = padValue;
      textBlock.paddingRight = padValue;
      textBlock.fontSize = Math.floor(size * 0.6 * baseScale) + "px";
      textBlock.color = "white";
      textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
      textBlock.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      textBlock.isVisible = false;
      btn.addControl(textBlock);

      // 图标 Image (通过 100% 宽高 + padding 强行在中心拉伸，彻底杜绝偏心且尺寸完美自适应)
      const image = new GUI.Image("icon", "");
      image.width = "100%";
      image.height = "100%";
      image.paddingTop = padValue;
      image.paddingBottom = padValue;
      image.paddingLeft = padValue;
      image.paddingRight = padValue;
      image.stretch = GUI.Image.STRETCH_UNIFORM;
      image.isVisible = false;
      btn.addControl(image);

      // 更新内容的辅助函数
      const updateContent = (content) => {
        if (!content) return;
        if (content.startsWith("data:image") || content.startsWith("http") || content.startsWith("./") || content.startsWith("/")) {
          image.source = content;
          image.isVisible = true;
          textBlock.isVisible = false;
        } else {
          textBlock.text = content;
          textBlock.isVisible = true;
          image.isVisible = false;
        }
      };

      if (iconUrl) {
        updateContent(iconUrl);
      }

      btn.onPointerDownObservable.add(() => {
        btn.scaleX = 0.9;
        btn.scaleY = 0.9;
        btn.background = "rgba(255, 255, 255, 0.3)";
        if (onPress) onPress();
      });

      btn.onPointerUpObservable.add(() => {
        btn.scaleX = 1.0;
        btn.scaleY = 1.0;
        btn.background = bgColor || "rgba(0, 0, 0, 0.3)";
        if (onRelease) onRelease();
      });

      // 保存更新内容的函数以便后续调用
      btn.updateContent = updateContent;

      return btn;
    };

    // 2.1 跳跃键 (chevrons-up 向上双箭头)
    // 尺寸 80px，定位右下角
    const jumpBtn = createActionButton(SVG_ICONS.jump, "rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.4)", 80, -10, -10, () => {
      localKeys.space = true;
    }, () => {
      localKeys.space = false;
    });
    actionContainer.addControl(jumpBtn);

    // 2.2 加慢跑/加速键 (zap 闪电)
    // 尺寸 60px，定位在跳跃键上方
    const runBtn = createActionButton(SVG_ICONS.run, "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.4)", 60, -20, -106, () => {
      localKeys.shift = true;
    }, () => {
      localKeys.shift = false;
    });
    actionContainer.addControl(runBtn);

    // 2.3 交互键 (sparkles 闪烁星光)
    // 尺寸 60px，定位在跳跃键左方
    const interactBtn = createActionButton(SVG_ICONS.interact, "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.4)", 60, -106, -20, () => {
      if (this.interactMgr) {
        this.interactMgr.triggerActiveInteraction();
      }
    });
    interactBtn.isVisible = false;
    this.guiInteractBtn = interactBtn; // 供外部（如 InteractsManager）调用以更改显示状态与图标
    actionContainer.addControl(interactBtn);

    // 2.4 特定场景专属按钮 (如 PK 擂台攻击 ⚔️ / 农场种植 🌱)
    // 尺寸 60px，定位在跳跃键左上方
    if (this.currentMap === 'pk_arena') {
      const attackBtn = createActionButton(SVG_ICONS.attack, "rgba(239, 83, 80, 0.18)", "rgba(239, 83, 80, 0.35)", 60, -98, -106, () => {
        localKeys.j = true;
        if (typeof this.playerPerformAttack === 'function') {
          this.playerPerformAttack();
        }
      }, () => {
        localKeys.j = false;
      });
      actionContainer.addControl(attackBtn);
    } else if (this.currentMap === 'farm') {
      const farmBtn = createActionButton(SVG_ICONS.sprout, "rgba(46, 204, 113, 0.18)", "rgba(46, 204, 113, 0.35)", 60, -98, -106, () => {
        if (this.isRadialMenuOpen) {
          this.closeRadialSeedMenu();
        } else {
          this.openRadialSeedMenu();
        }
      });
      actionContainer.addControl(farmBtn);
    }
  }

  setGuiInteractBtnVisible(visible, iconType = 'interact') {
    if (!this.guiInteractBtn) return;
    this.guiInteractBtn.isVisible = visible;
    if (visible) {
      if (iconType === 'sprout') {
        this.guiInteractBtn.updateContent(SVG_ICONS.sprout);
      } else if (iconType === 'drop') {
        this.guiInteractBtn.updateContent(SVG_ICONS.drop);
      } else if (iconType === 'interact') {
        this.guiInteractBtn.updateContent(SVG_ICONS.interact);
      } else {
        this.guiInteractBtn.updateContent(iconType);
      }
    }

  }

  animate() {
    // 监听移动端外壳攻击同步键
    if (window.parent && window.parent.keys) {
      const parentJ = !!window.parent.keys.j;
      if (parentJ && !this.lastParentJ) {
        if (typeof this.playerPerformAttack === 'function') {
          this.playerPerformAttack();
        }
      }
      this.lastParentJ = parentJ;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1); 
    const time = this.clock.getElapsedTime() * 1000;

    // 1. 每帧刷新游戏角色、环境和交互区
    if (this.player) this.player.update(delta, time);
    if (this.environment) this.environment.update(time);
    if (this.islandGen) this.islandGen.update(time, this.environment);
    if (this.interactMgr) this.interactMgr.update();

    // 2. 每帧更新沙滩球物理碰撞
    if (this.beachBallsList && this.player) {
      this.beachBallsList.forEach((ball) => ball.update(delta, this.player));
    }

    // 3. 运行种植地块、PK 战斗、家具摆放等辅助每帧控制流
    this.updateGameSystemsFrame(delta, time);

    // 4. 云顶天池每帧物理浮沉、涟漪与金符更新
    if (this.currentMap === 'lake' && this.lakeGen) {
      this.lakeGen.update(delta, time, this.player);
    }

    // 5. 粉色庄园叠水与池塘物理下陷更新
    if (this.currentMap === 'castle' && this.castleGen) {
      this.castleGen.update(delta, time, this.player);
    }

    // 6. 执行三维场景渲染
    if (this.scene && this.camera) {
      this.scene.render();
    }
  }

  // ==================== 每帧高频运动与定位更新 ====================
  updateGameSystemsFrame(delta, time) {
    // 0. 同步地块上快捷圆环种植菜单的位置
    this.updateActivePlotForRadialMenu();

    // 1. 农田气泡 2D UI 投影定位与生长缩放
    this.updateFarmPlotsFrame();

    // 2. PK 擂台物理运动及机器人追踪 AI
    this.updatePKBattleFrame(delta);

    // 3. 家居摆放家具射线放置检测
    this.updateHomeBuildFrame();

    // 4. PK大厅发光水晶/武器动画与非PK状态防坠落
    this.updatePKHallAnimations(delta, time);

    // 5. 农场外坠深渊传送保护
    if (this.currentMap === 'farm') {
      if (this.player && this.player.position.y < -3.5) {
        this.player.position.set(0, 0.6 + 0.1, -8.0);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copyFrom(this.player.position);
        this.showStuckToast("小心！不要掉入农场外的浮空深渊哦 ☁️");
      }
    }
  }

  showStuckToast(msg) {
    if (window.showMockToast) {
      let existing = document.querySelector('.mock-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'mock-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 50);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  updatePKHallAnimations(delta, time) {
    if (this.currentMap !== 'pk_arena') return;

    // 武器架预览自转与轻微上下浮动 (由 PKArenaGenerator 自带处理，非PK状态不进行干预)
    // 3. 非PK状态防坠落传送
    if (!this.isPKActive) {
      if (this.pkCrystalMesh) this.pkCrystalMesh.setEnabled(true);

      if (this.player && this.player.position.y < -3.5) {
        this.player.position.set(0, 0.6 + 0.1, -6.0);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copyFrom(this.player.position);
        this.showStuckToast("小心！不要跌落入云海深渊哦 ☁️");
      }
    }
  }

  updateFarmPlotsFrame() {
    const container = document.getElementById('farm-bubbles-container');
    if (!container) return;

    const plots3D = this.farmPlots3D;
    if (!plots3D || !this.gameData || this.currentMap !== 'farm') {
      container.innerHTML = '';
      return;
    }

    // 遍历地块状态并更新模型
    this.gameData.farmPlots.forEach((plot, idx) => {
      const plot3D = plots3D[idx];
      if (!plot3D) return;

      // 仅在状态改变时重建作物
      const hasMesh = plot3D.plantGroup.getChildren().length > 0;
      if (plot.status !== 'empty' && !hasMesh) {
        this.recreateCrop3D(idx);
      }

      // 动态更新气泡 UI 位置与文本
      let bubble = document.getElementById(`plot-bubble-${idx}`);
      if (plot.status === 'empty') {
        if (bubble) bubble.remove();
        return;
      }

      if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = `plot-bubble-${idx}`;
        bubble.className = 'plot-bubble';
        container.appendChild(bubble);
      }

      // 计算气泡 3D 投影
      const worldPos = new BABYLON.Vector3(plot3D.x, 1.4, plot3D.z);
      const screenPos = BABYLON.Vector3.Project(
        worldPos,
        BABYLON.Matrix.Identity(),
        this.scene.getTransformMatrix(),
        this.camera.viewport.toGlobal(window.innerWidth, window.innerHeight)
      );

      bubble.style.left = `${screenPos.x}px`;
      bubble.style.top = `${screenPos.y}px`;

      const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
      const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
      const remaining = Math.max(0, matureTime - elapsed);

      if (remaining === 0) {
        if (plot.status !== 'ready') {
          plot.status = 'ready';
          plot3D.plantGroup.scaling.set(1.0, 1.0, 1.0); // 生长至最大尺寸
        }
        bubble.innerHTML = `<span class="emoji">🌾</span> 可收割`;
        bubble.classList.add('ready');
      } else {
        const percent = Math.min(100, Math.floor((elapsed / matureTime) * 100));
        bubble.innerHTML = `<span class="timer">${remaining}s</span> 生长中`;
        bubble.classList.remove('ready');

        // 幼苗线性生长缩放
        const scaleVal = 0.15 + (percent / 100) * 0.85;
        plot3D.plantGroup.scaling.set(scaleVal, scaleVal, scaleVal);
      }
    });
  }

  recreateCrop3D(plotIndex) {
    if (!this.farmPlots3D) return;
    const plot3D = this.farmPlots3D[plotIndex];
    if (!plot3D) return;

    // 清空旧模型子网格
    plot3D.plantGroup.getChildren().forEach(child => child.dispose());

    const plot = this.gameData.farmPlots[plotIndex];
    if (plot.status === 'empty' || !plot.seedId) return;

    // 根据作物种类拼装 Low-poly 模型
    const plant = new BABYLON.TransformNode("cropEntity", this.scene);
    const isSunflower = plot.seedId === 'sunflower_seed';

    if (isSunflower) {
      // 茎
      const stem = BABYLON.MeshBuilder.CreateCylinder("stem", { diameterTop: 0.08, diameterBottom: 0.08, height: 0.7, tessellation: 6 }, this.scene);
      stem.position.y = 0.35;
      stem.parent = plant;
      stem.material = this.createFlatMaterial("stemGreen", 0x2e7d32);
      if (this.environment && this.environment.shadowGenerator) {
        this.environment.shadowGenerator.addShadowCaster(stem, true);
      }

      // 花盘
      const head = BABYLON.MeshBuilder.CreateCylinder("head", { diameterTop: 0.4, diameterBottom: 0.4, height: 0.06, tessellation: 8 }, this.scene);
      head.position.set(0, 0.7, 0.05);
      head.rotation.x = Math.PI / 4;
      head.parent = plant;
      head.material = this.createFlatMaterial("headYellow", 0xffeb3b);

      const center = BABYLON.MeshBuilder.CreateCylinder("center", { diameterTop: 0.2, diameterBottom: 0.2, height: 0.08, tessellation: 8 }, this.scene);
      center.position.set(0, 0.72, 0.07);
      center.rotation.x = Math.PI / 4;
      center.parent = plant;
      center.material = this.createFlatMaterial("headBrown", 0x5d4037);
    } else {
      // 草莓
      const leaf = BABYLON.MeshBuilder.CreateBox("strawberryLeaf", { width: 0.25, height: 0.04, depth: 0.25 }, this.scene);
      leaf.position.y = 0.04;
      leaf.parent = plant;
      leaf.material = this.createFlatMaterial("leafGreen", 0x27ae60);

      const fruit = BABYLON.MeshBuilder.CreateCylinder("strawberryFruit", { diameterTop: 0, diameterBottom: 0.36, height: 0.35, tessellation: 6 }, this.scene);
      fruit.rotation.x = Math.PI; // 倒悬果实
      fruit.position.y = 0.25;
      fruit.parent = plant;
      fruit.material = this.createFlatMaterial("fruitRed", 0xff1744);
      if (this.environment && this.environment.shadowGenerator) {
        this.environment.shadowGenerator.addShadowCaster(fruit, true);
      }
    }

    plant.parent = plot3D.plantGroup;
    if (plot.status === 'ready') {
      plot3D.plantGroup.scaling.set(1.0, 1.0, 1.0);
    } else {
      plot3D.plantGroup.scaling.set(0.15, 0.15, 0.15); 
    }
  }

  // ==================== PK 对战物理与机器人 AI ====================
  updatePKBattleFrame(delta) {
    this.updateActiveBombs(delta);
    this.updateExplosionEffects(delta);

    if (!this.isPKActive || !this.opponent3D) return;

    // 1. 出界/掉落判定
    if (this.player.position.y < -3.5) {
      this.endPKBattle(false);
      return;
    }
    if (this.opponent3D.position.y < -3.5) {
      this.endPKBattle(true);
      return;
    }

    // 2. 机器人重力与速度更新
    const opp = this.opponent3D;
    const playerPos = this.player.position;

    if (!this.opponentIsGrounded) {
      this.opponentVelocity.y -= 9.8 * delta;
    }

    opp.position.addInPlace(this.opponentVelocity.scale(delta));

    // 水平风阻力衰减
    this.opponentVelocity.x *= 0.88;
    this.opponentVelocity.z *= 0.88;

    // 擂台圆形碰撞 (Y=0.6, 半径 8.0)
    if (opp.position.y <= 0.6) {
      const distToCenter = Math.sqrt(opp.position.x * opp.position.x + opp.position.z * opp.position.z);
      if (distToCenter < 8.0) {
        opp.position.y = 0.6;
        this.opponentVelocity.y = 0;
        this.opponentIsGrounded = true;
      } else {
        this.opponentIsGrounded = false;
      }
    } else {
      this.opponentIsGrounded = false;
    }

    // 3. 机器人追踪 AI
    if (this.opponentIsGrounded && this.playerHP > 0) {
      const dist = BABYLON.Vector3.Distance(opp.position, playerPos);
      
      const dx = playerPos.x - opp.position.x;
      const dz = playerPos.z - opp.position.z;
      const angle = Math.atan2(dx, dz);
      opp.rotation.y = angle;

      if (dist > 1.8) {
        const moveSpeed = 2.4;
        opp.translate(BABYLON.Axis.Z, moveSpeed * delta, BABYLON.Space.LOCAL);
      } else {
        // 1.8% 概率发动反击
        if (Math.random() < 0.018) {
          this.opponentPerformAttack();
        }
      }
    }

    // 4. 调试提示面板 (提示尚未拾取武器)
    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      if (this.playerEquippedWeapon) {
        debugEl.style.display = 'none';
      } else {
        debugEl.style.display = 'block';
        debugEl.innerHTML = `<span style="font-weight: bold; color: #ffeb3b; animation: settleBlink 1.2s infinite;">⚠️ 尚未装备武器！请走向擂台周边的武器架拾取武器 ⚔️</span>`;
      }
    }

    // 5. 走向架子自动装载武器
    const pPos = this.player.position;
    const rackConfigs = [
      { x: -7.5, z: 0, weapon: 'sword' },
      { x: 7.5, z: 0, weapon: 'hammer' },
      { x: 0, z: 6.8, weapon: 'bomb' }
    ];

    rackConfigs.forEach(cfg => {
      const dist = BABYLON.Vector3.Distance(pPos, new BABYLON.Vector3(cfg.x, 0.6, cfg.z));
      if (dist < 1.6 && this.playerEquippedWeapon !== cfg.weapon) {
        const chosen = cfg.weapon;
        this.playerEquippedWeapon = chosen;

        // 更新移动端 UI 攻击图标
        const atkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
        if (atkBtn) {
          atkBtn.style.display = 'flex';
          const weaponSVGMap = {
            'sword': `
<svg style="display: flex;" class="lucide lucide-swords" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
  <line x1="13" x2="19" y1="19" y2="13" />
  <line x1="16" x2="20" y1="16" y2="20" />
  <line x1="19" x2="21" y1="21" y2="19" />
  <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
  <line x1="5" x2="9" y1="14" y2="18" />
  <line x1="7" x2="4" y1="17" y2="20" />
  <line x1="3" x2="5" y1="19" y2="21" />
</svg>`,
            'hammer': `
<svg style="display: flex;" class="lucide lucide-hammer" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m15 5 4 4" />
  <path d="M21.5 12H16c-.5 0-1-.5-1-1V4.5L9 9.5c-.5.5-.5 1.5 0 2l11 11c.5.5 1.5.5 2 0z" />
  <path d="m2.1 21.9 10.3-10.3" />
</svg>`,
            'bomb': `
<svg style="display: flex;" class="lucide lucide-bomb" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="13" r="9" />
  <path d="m19.5 4.5-3.5 3.5" />
  <path d="m21 3-2.5 2.5" />
  <path d="M19 8.5c.5-.5 1-1.5.5-2.5-.5-.5-1.5 0-2 .5" />
</svg>`
          };
          atkBtn.innerHTML = weaponSVGMap[chosen] || weaponSVGMap['sword'];
        }

        // 把 3D 武器挂载到玩家 TransformNode 上
        if (this.playerWeapon3D) {
          this.playerWeapon3D.dispose();
        }
        
        let weaponModel;
        if (chosen === 'sword') weaponModel = createSword3D(this.scene);
        else if (chosen === 'hammer') weaponModel = createHammer3D(this.scene);
        else weaponModel = createBomb3D(this.scene);

        weaponModel.position.set(0.32, 0.8, 0.1);
        weaponModel.rotation.x = Math.PI / 2;
        weaponModel.parent = this.player.group;
        this.playerWeapon3D = weaponModel;

        this.playCustomSound(600, 0.15, 'sine', 0.1);
        
        const weaponChinese = { 'sword': '长剑 ⚔️', 'hammer': '大锤 🔨', 'bomb': '炸弹 💣' };
        this.showStuckToast(`已装备武器：${weaponChinese[chosen]}！`);
      }
    });
  }

  opponentPerformAttack() {
    if (this.opponentHP <= 0 || this.playerHP <= 0) return;

    // 挥动武器动效
    if (this.opponentWeapon3D) {
      this.opponentWeapon3D.rotation.z = -Math.PI / 2;
      setTimeout(() => {
        if (this.opponentWeapon3D) this.opponentWeapon3D.rotation.z = 0;
      }, 150);
    }

    this.playCustomSound(220, 0.1, 'sawtooth', 0.1);

    const dist = BABYLON.Vector3.Distance(this.opponent3D.position, this.player.position);
    if (dist <= 2.2) {
      const dmg = 15;
      this.playerHP = Math.max(0, this.playerHP - dmg);
      this.updatePKHPUI();

      this.showScreenFlash();
      this.playDamageBubble(this.player.position, dmg, true);

      // 受击击退
      const direction = this.player.position.subtract(this.opponent3D.position);
      direction.y = 0;
      direction.normalize();
      direction.y = 0.35;
      
      this.player.velocity.addInPlace(direction.scale(4.2));
      this.playCustomSound(100, 0.2, 'sine', 0.15);

      if (this.playerHP <= 0) {
        this.endPKBattle(false);
      }
    }
  }

  playerPerformAttack() {
    if (!this.isPKActive || this.playerHP <= 0 || this.opponentHP <= 0) return;

    // 剑/锤挥舞动画
    if (this.playerWeapon3D && this.playerEquippedWeapon !== 'bomb') {
      this.playerWeapon3D.rotation.z = -Math.PI / 2;
      setTimeout(() => {
        if (this.playerWeapon3D) this.playerWeapon3D.rotation.z = 0;
      }, 120);
    }

    if (this.playerEquippedWeapon === 'bomb') {
      // 投掷物理炸弹
      if (this.bombCooldownActive) return;
      this.bombCooldownActive = true;
      setTimeout(() => { this.bombCooldownActive = false; }, 850);

      this.throwBombPhysics();
      return;
    }

    this.playCustomSound(380, 0.08, 'triangle', 0.05);

    const dist = BABYLON.Vector3.Distance(this.player.position, this.opponent3D.position);
    if (dist <= 2.4) {
      const isHammer = this.playerEquippedWeapon === 'hammer';
      const dmg = isHammer ? 25 : 12;
      this.opponentHP = Math.max(0, this.opponentHP - dmg);
      this.updatePKHPUI();

      this.playDamageBubble(this.opponent3D.position, dmg, false);

      // 红框闪烁提示受伤
      this.opponent3D.getChildMeshes().forEach(child => {
        if (child.material) {
          if (!child.metadata) child.metadata = {};
          if (child.metadata.origColor === undefined) {
            child.metadata.origColor = child.material.diffuseColor.clone();
          }
          child.material.diffuseColor = BABYLON.Color3.FromHexString("#ff3333");
        }
      });
      setTimeout(() => {
        if (this.opponent3D) {
          this.opponent3D.getChildMeshes().forEach(child => {
            if (child.material && child.metadata && child.metadata.origColor) {
              child.material.diffuseColor = child.metadata.origColor;
            }
          });
        }
      }, 150);

      // 强击退
      const direction = this.opponent3D.position.subtract(this.player.position);
      direction.y = 0;
      direction.normalize();
      direction.y = isHammer ? 0.48 : 0.28;

      const pushForce = isHammer ? 6.2 : 3.2;
      this.opponentVelocity.addInPlace(direction.scale(pushForce));
      this.opponentIsGrounded = false;

      this.playCustomSound(180, 0.15, 'sine', 0.1);

      if (this.opponentHP <= 0) {
        this.endPKBattle(true);
      }
    }
  }

  throwBombPhysics() {
    this.playCustomSound(280, 0.1, 'sine', 0.06);

    const bombMesh = createBomb3D(this.scene);
    
    // 获取玩家前向朝向
    const forward = this.player.group.forward;
    const spawnPos = this.player.position.clone();
    spawnPos.y += 0.8;
    spawnPos.addInPlace(forward.scale(0.5));

    bombMesh.position.copyFrom(spawnPos);
    
    const speed = 7.5;
    const bombVel = forward.scale(speed);
    bombVel.y = 4.2;

    const bombObj = {
      mesh: bombMesh,
      position: spawnPos,
      velocity: bombVel,
      timeElapsed: 0,
      maxLifetime: 2.2
    };

    if (!this.activeBombs) this.activeBombs = [];
    this.activeBombs.push(bombObj);
  }

  updateActiveBombs(delta) {
    if (!this.activeBombs || this.activeBombs.length === 0) return;

    const gravity = 9.8;
    const platformY = 0.6;

    for (let i = this.activeBombs.length - 1; i >= 0; i--) {
      const bomb = this.activeBombs[i];
      bomb.timeElapsed += delta;

      bomb.velocity.y -= gravity * delta;
      bomb.position.addInPlace(bomb.velocity.scale(delta));
      bomb.mesh.position.copyFrom(bomb.position);

      bomb.mesh.rotation.x += 0.05;
      bomb.mesh.rotation.y += 0.05;

      let triggerExplode = false;

      // 触地判定
      if (bomb.position.y <= platformY) {
        const distToCenter = Math.sqrt(bomb.position.x * bomb.position.x + bomb.position.z * bomb.position.z);
        if (distToCenter < 8.0) {
          bomb.position.y = platformY;
          triggerExplode = true;
        }
      }

      // 撞击判定
      if (this.opponent3D && !triggerExplode) {
        const oppPos = this.opponent3D.position;
        const distToOpp = BABYLON.Vector3.Distance(bomb.position, oppPos);
        if (distToOpp < 0.8) {
          triggerExplode = true;
        }
      }

      if (bomb.timeElapsed >= bomb.maxLifetime) {
        triggerExplode = true;
      }

      if (triggerExplode) {
        this.explodeBomb(bomb.position);
        bomb.mesh.dispose();
        this.activeBombs.splice(i, 1);
      }
    }
  }

  explodeBomb(position) {
    this.playCustomSound(180, 0.35, 'sawtooth', 0.25);
    setTimeout(() => {
      this.playCustomSound(60, 0.2, 'sine', 0.3);
    }, 50);

    this.createExplosionEffects(position);

    // 炸弹爆炸击退判定
    if (this.opponent3D && this.isPKActive) {
      const oppPos = this.opponent3D.position;
      const distance = BABYLON.Vector3.Distance(position, oppPos);
      const explosionRadius = 3.5;

      if (distance <= explosionRadius) {
        const dmg = 50;
        
        const knockbackDir = oppPos.subtract(position);
        knockbackDir.y = 0;
        knockbackDir.normalize();
        
        const knockbackForce = 6.0;
        this.opponentVelocity.addInPlace(knockbackDir.scale(knockbackForce));
        this.opponentVelocity.y = 3.5;
        this.opponentIsGrounded = false;

        this.opponentHP = Math.max(0, this.opponentHP - dmg);
        this.updatePKHPUI();

        this.playDamageBubble(oppPos, dmg, false);

        this.opponent3D.getChildMeshes().forEach(child => {
          if (child.material) {
            if (!child.metadata) child.metadata = {};
            if (child.metadata.origColor === undefined) {
              child.metadata.origColor = child.material.diffuseColor.clone();
            }
            child.material.diffuseColor = BABYLON.Color3.FromHexString("#ff3333");
          }
        });
        setTimeout(() => {
          if (this.opponent3D) {
            this.opponent3D.getChildMeshes().forEach(child => {
              if (child.material && child.metadata && child.metadata.origColor) {
                child.material.diffuseColor = child.metadata.origColor;
              }
            });
          }
        }, 150);

        if (this.opponentHP <= 0) {
          this.endPKBattle(true);
        }
      }
    }
  }

  createExplosionEffects(position) {
    // 1. 中心膨胀火球
    const fireBall = BABYLON.MeshBuilder.CreateSphere("fireBall", { diameter: 0.4, segments: 8 }, this.scene);
    fireBall.position.copyFrom(position);
    
    const sphereMat = new BABYLON.StandardMaterial("fireBallMat", this.scene);
    sphereMat.diffuseColor = convertColor(0xffa726);
    sphereMat.emissiveColor = convertColor(0xffa726);
    sphereMat.alpha = 0.9;
    sphereMat.disableLighting = true;
    fireBall.material = sphereMat;

    const ballObj = {
      mesh: fireBall,
      type: 'ball',
      scaleSpeed: 9.0,
      opacitySpeed: 2.2,
      scale: 1.0,
      opacity: 0.9
    };

    if (!this.activeExplosions) this.activeExplosions = [];
    this.activeExplosions.push(ballObj);

    // 2. 溅射小碎片
    const particleCount = 12;
    const particleColors = [0xff3d00, 0xffc107, 0x757575];
    
    for (let i = 0; i < particleCount; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const partMat = new BABYLON.StandardMaterial("partMat_" + i, this.scene);
      partMat.diffuseColor = convertColor(color);
      partMat.alpha = 0.9;
      partMat.flatShading = true;
      partMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const particle = BABYLON.MeshBuilder.CreateBox("expPart", { size: 0.08 }, this.scene);
      particle.position.copyFrom(position);
      particle.material = partMat;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      const velocity = new BABYLON.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      const partObj = {
        mesh: particle,
        type: 'particle',
        velocity: velocity,
        opacity: 0.9,
        rotationSpeed: new BABYLON.Vector3(
          Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10
        )
      };
      this.activeExplosions.push(partObj);
    }
  }

  updateExplosionEffects(delta) {
    if (!this.activeExplosions || this.activeExplosions.length === 0) return;

    const gravity = 9.8;

    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];

      if (exp.type === 'ball') {
        exp.scale += exp.scaleSpeed * delta;
        exp.opacity -= exp.opacitySpeed * delta;
        
        exp.mesh.scaling.set(exp.scale, exp.scale, exp.scale);
        if (exp.mesh.material) {
          exp.mesh.material.alpha = Math.max(0, exp.opacity);
        }

        if (exp.opacity <= 0) {
          exp.mesh.dispose();
          this.activeExplosions.splice(i, 1);
        }
      } else if (exp.type === 'particle') {
        exp.velocity.y -= gravity * delta;
        exp.mesh.position.addInPlace(exp.velocity.scale(delta));
        
        exp.mesh.rotation.x += exp.rotationSpeed.x * delta;
        exp.mesh.rotation.y += exp.rotationSpeed.y * delta;
        exp.mesh.rotation.z += exp.rotationSpeed.z * delta;

        exp.opacity -= 1.8 * delta;
        if (exp.mesh.material) {
          exp.mesh.material.alpha = Math.max(0, exp.opacity);
        }

        if (exp.opacity <= 0) {
          exp.mesh.dispose();
          this.activeExplosions.splice(i, 1);
        }
      }
    }
  }

  showScreenFlash() {
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.classList.add('fade');
      setTimeout(() => flash.remove(), 250);
    }, 50);
  }

  // ==================== 家园编辑家具射线检测摆放 ====================
  updateHomeBuildFrame() {
    if (!this.isHomeBuildActive || !this.editPreviewGroup) return;

    // 取屏幕中心为射线源拾取木屋地板位置
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    const pickInfo = this.scene.pick(width / 2, height / 2);

    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
      const hitPoint = pickInfo.pickedPoint;
      
      // 0.5米网格对齐
      let targetX = Math.round(hitPoint.x * 2) / 2;
      let targetZ = Math.round(hitPoint.z * 2) / 2;

      // 区域边界限制安全防呆
      targetX = Math.max(-4.0, Math.min(4.0, targetX));
      targetZ = Math.max(1.0, Math.min(9.0, targetZ));

      this.editPreviewGroup.position.set(targetX, 0.12, targetZ);
    }
  }

  // ==================== 以下为完全平移的 SSO 与 UI 系统 ====================
  initSSO() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('sso_access_token');
    const userStr = urlParams.get('sso_user');
    if (token && userStr) {
      localStorage.setItem('sso_access_token', token);
      localStorage.setItem('sso_user', userStr);
      
      urlParams.delete('sso_access_token');
      urlParams.delete('sso_user');
      const cleanQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const ssoLoginBtn = document.getElementById('sso-login-btn');
    const ssoUserInfo = document.getElementById('sso-user-info');
    const ssoAvatar = document.getElementById('sso-avatar');
    
    const sidebarClose = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarStatus = document.getElementById('sidebar-user-status');
    const sidebarLogin = document.getElementById('sidebar-login-btn');
    const sidebarLogout = document.getElementById('sidebar-logout-btn');

    window.showMockToast = (name) => {
      let existing = document.querySelector('.mock-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'mock-toast';
      toast.textContent = `${name} 功能正在开发中，敬请期待！😊`;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 50);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2200);
    };

    const openSidebar = () => {
      const activeSidebar = document.getElementById('sso-sidebar');
      const activeOverlay = document.getElementById('sidebar-overlay');
      if (activeSidebar) activeSidebar.classList.add('open');
      if (activeOverlay) activeOverlay.classList.add('visible');
      if (this.player) {
        this.player.controlsLocked = true;
        this.player.resetInputs();
      }
    };

    window.openSSOSidebar = () => {
      openSidebar();
    };

    const closeSidebar = () => {
      const activeSidebar = document.getElementById('sso-sidebar');
      const activeOverlay = document.getElementById('sidebar-overlay');
      if (activeSidebar) activeSidebar.classList.remove('open');
      if (activeOverlay) activeOverlay.classList.remove('visible');
      if (this.player) {
        this.player.controlsLocked = false;
      }
    };

    if (ssoLoginBtn) ssoLoginBtn.addEventListener('click', (e) => { e.stopPropagation(); openSidebar(); });
    if (ssoUserInfo) ssoUserInfo.addEventListener('click', (e) => { e.stopPropagation(); openSidebar(); });
    if (sidebarClose) sidebarClose.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });

    const tokenLocal = localStorage.getItem('sso_access_token');
    const userStrLocal = localStorage.getItem('sso_user');

    if (tokenLocal && userStrLocal) {
      try {
        const user = JSON.parse(userStrLocal);
        if (ssoLoginBtn) ssoLoginBtn.style.display = 'none';
        if (ssoUserInfo) ssoUserInfo.style.display = 'flex';
        
        const avatarUrl = user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"%3E%3C/path%3E%3C/svg%3E';
        if (ssoAvatar) ssoAvatar.src = avatarUrl;
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (sidebarUsername) sidebarUsername.textContent = user.username;
        if (sidebarStatus) {
          sidebarStatus.textContent = '已登录';
          sidebarStatus.style.borderColor = 'rgba(100, 255, 150, 0.4)';
          sidebarStatus.style.color = '#5aff8a';
        }
        if (sidebarLogin) sidebarLogin.style.display = 'none';
        if (sidebarLogout) sidebarLogout.style.display = 'flex';
      } catch (e) {
        console.error(e);
      }
    }
  }

  getInitialGameData() {
    return {
      coins: 200,
      level: 1,
      exp: 0,
      pkPoints: 1000,
      pkWins: 0,
      pkLoses: 0,
      backpack: [
        { id: 'sunflower_seed', name: '向日葵种子', type: 'seed', count: 5, quality: 'green', desc: '可在农田里种植，成熟后收割获得丰厚金币。' },
        { id: 'strawberry_seed', name: '草莓种子', type: 'seed', count: 2, quality: 'blue', desc: '可在农田里种植，成熟收割获得巨额回报。' }
      ],
      farmPlots: [
        { id: 0, status: 'empty', seedId: null, plantTime: 0, unlocked: true },
        { id: 1, status: 'empty', seedId: null, plantTime: 0, unlocked: true },
        { id: 2, status: 'empty', seedId: null, plantTime: 0, unlocked: true },
        { id: 3, status: 'empty', seedId: null, plantTime: 0, unlocked: true },
        { id: 4, status: 'empty', seedId: null, plantTime: 0, unlocked: true },
        { id: 5, status: 'empty', seedId: null, plantTime: 0, unlocked: true }
      ],
      homeFurnitures: [],
      ownedFurnitures: ['painting_1', 'tree_1'],
      tasks: [
        { id: 'kick_ball', name: '在群岛领取沙滩球或踢球 1 次', progress: 0, target: 1, reward: 50, status: 'ongoing', type: 'kick' },
        { id: 'rest_bed', name: '在温馨小屋床上休息 1 次', progress: 0, target: 1, reward: 50, status: 'ongoing', type: 'rest' },
        { id: 'play_poker', name: '游玩 1 局 21点纸牌游戏', progress: 0, target: 1, reward: 80, status: 'ongoing', type: 'game_poker' },
        { id: 'crop_harvest', name: '收割成熟的农地作物 3 次', progress: 0, target: 3, reward: 100, status: 'ongoing', type: 'harvest' }
      ],
      dailyChestClaimed: false
    };
  }

  async loadGameData() {
    const token = localStorage.getItem('sso_access_token');
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';

    let loadedData = null;
    if (token) {
      try {
        const response = await fetch(`${apiHost}/api/game/data?game_id=3d-home-all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const res = await response.json();
        if (res.code === 200 && res.data) {
          loadedData = JSON.parse(res.data.data_value);
        }
      } catch (e) {
        console.warn('Load game data failed', e);
      }
    }

    if (!loadedData) {
      const local = localStorage.getItem('game_data_3d_home');
      if (local) {
        try { loadedData = JSON.parse(local); } catch (e) {}
      }
    }

    this.gameData = loadedData || this.getInitialGameData();
    this.updateCoinsDisplay();
    this.updateLevelProgress();
  }

  async saveGameData() {
    const dataStr = JSON.stringify(this.gameData);
    localStorage.setItem('game_data_3d_home', dataStr);

    const token = localStorage.getItem('sso_access_token');
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';

    if (token) {
      try {
        await fetch(`${apiHost}/api/game/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            game_id: '3d-home-all',
            data_value: dataStr
          })
        });
      } catch (e) {
        console.warn('Save game data failed', e);
      }
    }
  }

  updateCoinsDisplay() {
    const els = document.querySelectorAll('.coins-val');
    els.forEach(el => { el.textContent = this.gameData.coins; });
    this.updateShopCoins();
  }

  updateLevelProgress() {
    const levelVal = document.getElementById('level-val');
    const expFill = document.getElementById('exp-fill');
    if (levelVal) levelVal.textContent = this.gameData.level;
    if (expFill) {
      const levelUpNeed = this.gameData.level * 100;
      const pct = Math.min(100, Math.floor((this.gameData.exp / levelUpNeed) * 100));
      expFill.style.width = `${pct}%`;
    }
  }

  gainExp(amount) {
    this.gameData.exp += amount;
    let needed = this.gameData.level * 100;
    while (this.gameData.exp >= needed) {
      this.gameData.exp -= needed;
      this.gameData.level++;
      needed = this.gameData.level * 100;
      this.showToast(`🎉 恭喜升级！当前等级: Lv.${this.gameData.level}`);
      this.playCustomSound(520, 0.4, 'sine', 0.12);
    }
    this.updateLevelProgress();
    this.saveGameData();
    // 经验/等级提升时也刷新排行榜
    if (typeof this.renderLeaderboard === 'function') {
      const activeTab = this.getActiveLeaderboardTab();
      this.renderLeaderboard(activeTab);
    }
  }

  updateCoins(change) {
    this.gameData.coins = Math.max(0, this.gameData.coins + change);
    this.updateCoinsDisplay();
    this.saveGameData();
    // 金币数值更新时刷新排行榜
    if (typeof this.renderLeaderboard === 'function') {
      const activeTab = this.getActiveLeaderboardTab();
      this.renderLeaderboard(activeTab);
    }
  }

  getActiveLeaderboardTab() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const activeTabEl = pDoc.querySelector('#modal-leaderboard .tab-btn.active');
    return activeTabEl ? activeTabEl.getAttribute('data-tab') : 'pkPoints';
  }

  showToast(msg) {
    const container = document.getElementById('toast-container') || (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  initGameSystems() {
    this.loadGameData();
    this.initShopUI();
    this.initBagUI();
    this.initTaskUI();
    this.initLeaderboardUI();
    this.initPKUI();
    this.initPokerGame();

    // 签到宝箱
    const signBox = document.getElementById('daily-chest-btn');
    if (signBox) {
      signBox.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.gameData.dailyChestClaimed) {
          this.showToast('今天已经领取过每日福利啦，明天再来吧！🌟');
          return;
        }
        this.gameData.dailyChestClaimed = true;
        this.updateCoins(100);
        this.showToast('🎁 成功开启每日宝箱！获得 🪙 100 金币！');
        this.playCustomSound(440, 0.25, 'sine', 0.08);
      });
    }

    // 菜单栏事件监听
    const resetBtn = document.getElementById('menu-action-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unstuckPlayer();
      });
    }
  }

  // ==================== 农场商店系统 ====================
  initShopUI() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const tabs = pDoc.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchShopTab(tab.getAttribute('data-tab'));
      });
    });

    this.switchShopTab('agriculture');

    const minusBtn = pDoc.getElementById('btn-shop-count-minus');
    const plusBtn = pDoc.getElementById('btn-shop-count-plus');
    const plus10Btn = pDoc.getElementById('btn-shop-count-plus10');
    const slider = pDoc.getElementById('shop-buy-count-slider');
    const executeBtn = pDoc.getElementById('btn-shop-execute-buy');

    if (minusBtn && slider) {
      minusBtn.addEventListener('click', () => {
        let val = parseInt(slider.value) || 1;
        if (val > 1) {
          slider.value = val - 1;
          this.updateShopBuyCountUI();
        }
      });
    }

    if (plusBtn && slider) {
      plusBtn.addEventListener('click', () => {
        let val = parseInt(slider.value) || 1;
        if (val < 99) {
          slider.value = val + 1;
          this.updateShopBuyCountUI();
        }
      });
    }

    if (plus10Btn && slider) {
      plus10Btn.addEventListener('click', () => {
        let val = parseInt(slider.value) || 1;
        slider.value = Math.min(99, val + 10);
        this.updateShopBuyCountUI();
      });
    }

    if (slider) {
      slider.addEventListener('input', () => this.updateShopBuyCountUI());
    }

    if (executeBtn) {
      executeBtn.addEventListener('click', (e) => {
        if (!this.selectedShopItem) return;
        const count = parseInt(slider ? slider.value : 1) || 1;
        this.executeShopBuy(this.selectedShopItem, count, e.clientX, e.clientY);
      });
    }
  }

  switchShopTab(tabName) {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const tabs = pDoc.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = 'var(--text-muted)';
        });
        tab.classList.add('active');
        tab.style.borderBottomColor = 'var(--primary)';
        tab.style.color = '#fff';
        this.renderShopItems(tabName);
      }
    });
  }

  renderShopItems(tabName) {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const grid = pDoc.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const items = siteConfig.shopGoods[tabName] || [];
    items.forEach(item => {
      const card = pDoc.createElement('div');
      card.className = `shop-item-card ${item.quality || 'green'}`;
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-info">
          <h4>${item.name}</h4>
          <span class="price">🪙 ${item.price}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        grid.querySelector('.shop-item-card.active')?.classList.remove('active');
        card.classList.add('active');
        this.selectShopItem(item);
      });
      grid.appendChild(card);
    });

    this.selectedShopItem = null;
    const detailEmpty = pDoc.querySelector('#shop-item-detail .shop-detail-empty');
    const detailContent = pDoc.querySelector('#shop-item-detail .shop-detail-content');
    if (detailEmpty) detailEmpty.style.display = 'flex';
    if (detailContent) detailContent.style.display = 'none';
  }

  selectShopItem(item) {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    this.selectedShopItem = item;
    const detailEmpty = pDoc.querySelector('#shop-item-detail .shop-detail-empty');
    const detailContent = pDoc.querySelector('#shop-item-detail .shop-detail-content');

    if (detailEmpty) detailEmpty.style.display = 'none';
    if (detailContent) detailContent.style.display = 'flex';

    const dIcon = pDoc.querySelector('#shop-item-detail .shop-detail-icon');
    const dTitle = pDoc.querySelector('#shop-item-detail .shop-detail-title');
    const dOwned = pDoc.querySelector('#shop-item-detail .shop-detail-owned');
    const dDesc = pDoc.querySelector('#shop-item-detail .shop-detail-desc');
    const dPrice = pDoc.querySelector('#shop-item-detail .shop-detail-unit-price');

    if (dIcon) dIcon.textContent = item.icon;
    if (dTitle) dTitle.textContent = item.name;
    if (dDesc) dDesc.textContent = item.desc;
    if (dPrice) dPrice.textContent = `🪙 ${item.price}`;

    let ownedCount = 0;
    if (item.type === 'furniture') {
      ownedCount = this.gameData.ownedFurnitures.includes(item.id) ? 1 : 0;
    } else {
      const bagItem = this.gameData.backpack.find(b => b.id === item.id);
      ownedCount = bagItem ? bagItem.count : 0;
    }
    if (dOwned) dOwned.textContent = `已拥有: ${ownedCount}`;

    const slider = pDoc.getElementById('shop-buy-count-slider');
    if (slider) slider.value = 1;
    this.updateShopBuyCountUI();
  }

  updateShopCoins() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const coinEl = pDoc.querySelector('#modal-shop .shop-coins-val');
    if (coinEl) coinEl.textContent = this.gameData.coins;
    const bagCoinEl = pDoc.querySelector('#modal-bag .bag-coins-val');
    if (bagCoinEl) bagCoinEl.textContent = this.gameData.coins;
  }

  updateShopBuyCountUI() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const slider = pDoc.getElementById('shop-buy-count-slider');
    const countText = pDoc.getElementById('shop-buy-count-text');
    const totalText = pDoc.querySelector('#shop-item-detail .shop-detail-total-price');

    if (!slider || !this.selectedShopItem) return;

    const count = parseInt(slider.value) || 1;
    if (countText) countText.textContent = count;
    if (totalText) {
      totalText.textContent = `🪙 ${this.selectedShopItem.price * count}`;
    }
  }

  executeShopBuy(item, count, x, y) {
    const totalCost = item.price * count;
    if (this.gameData.coins < totalCost) {
      this.showToast('金币不足，快去每日签到或者收割作物赚取金币吧！🪙');
      return;
    }

    this.updateCoins(-totalCost);

    if (item.type === 'furniture') {
      if (!this.gameData.ownedFurnitures.includes(item.id)) {
        this.gameData.ownedFurnitures.push(item.id);
      }
    } else {
      let bagItem = this.gameData.backpack.find(b => b.id === item.id);
      if (bagItem) {
        bagItem.count += count;
      } else {
        this.gameData.backpack.push({
          id: item.id,
          name: item.name,
          type: item.type,
          count: count,
          quality: item.quality,
          desc: item.desc
        });
      }
    }

    this.saveGameData();
    this.selectShopItem(item); // 刷新已持有数量
    this.showToast(`成功购买了 ${count} 个 ${item.name} 🛍️！`);
    this.playCustomSound(440, 0.15, 'sine', 0.05);
  }

  // ==================== 背包系统 ====================
  initBagUI() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const tabs = pDoc.querySelectorAll('#modal-bag .bag-tabactive');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderBagItems(tab.getAttribute('data-tab'));
      });
    });

    this.renderBagItems('seed');
  }

  renderBagItems(tabName) {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const grid = pDoc.getElementById('bag-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = this.gameData.backpack.filter(b => b.type === tabName) || [];
    list.forEach(item => {
      if (item.count <= 0) return;
      const card = pDoc.createElement('div');
      card.className = `bag-item-card ${item.quality || 'green'}`;
      card.innerHTML = `
        <div class="item-icon">${siteConfig.shopGoods.agriculture.find(g => g.id === item.id)?.icon || '🌻'}</div>
        <div class="item-info">
          <h4>${item.name}</h4>
          <span class="count">拥有: ${item.count}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.selectedBagItem = item;
        this.useBagItem(item);
      });
      grid.appendChild(card);
    });
  }

  useBagItem(item) {
    if (item.type === 'seed' && this.currentMap === 'farm') {
      // 开启种植小地块流程
      this.modalMgr.closeAllModals();
      this.showPlotRadialMenu();
    }
  }

  // ==================== 每日任务系统 ====================
  initTaskUI() {
    this.renderTasks();
  }

  renderTasks() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const listContainer = pDoc.getElementById('tasks-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // 计算已完成的任务数（不管有没有领奖，只要满足进度 target 就算完成）
    let completedCount = 0;
    this.gameData.tasks.forEach(task => {
      if (task.progress >= task.target) {
        completedCount++;
      }
    });

    // 渲染任务列表
    this.gameData.tasks.forEach(task => {
      const pct = Math.min(100, Math.floor((task.progress / task.target) * 100));
      const isDone = task.status === 'completed';
      
      const item = pDoc.createElement('div');
      item.className = `task-item ${isDone ? 'done' : ''}`;
      // 给任务行加样式
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '12px 16px';
      item.style.margin = '4px 0';
      item.style.background = 'rgba(255, 255, 255, 0.02)';
      item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      item.style.borderRadius = '12px';
      item.style.width = '100%';
      item.style.boxSizing = 'border-box';

      item.innerHTML = `
        <div class="task-info" style="display: flex; flex-direction: column; gap: 4px;">
          <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${task.name}</h4>
          <span class="progress" style="font-size: 0.8rem; color: var(--text-muted);">${task.progress}/${task.target}</span>
        </div>
        <div class="task-action" style="pointer-events: auto;">
          ${isDone 
            ? '<button class="task-btn claim-btn hud-btn" style="padding: 6px 12px; font-size: 0.75rem;" disabled>已完成</button>' 
            : `<button class="task-btn claim-btn hud-btn" id="task-btn-${task.id}" style="padding: 6px 12px; font-size: 0.75rem; cursor: pointer;">${pct === 100 ? '领取奖励' : '前往'}</button>`}
        </div>
      `;
      listContainer.appendChild(item);

      const btn = pDoc.getElementById(`task-btn-${task.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (pct === 100) {
            task.status = 'completed';
            this.updateCoins(task.reward);
            this.gainExp(30);
            this.showToast(`领取了任务奖励：获得 🪙 ${task.reward} 金币 + 30 经验！`);
            this.renderTasks();
          } else {
            // 引导前往相应场景
            this.modalMgr.closeAllModals();
            if (task.type === 'kick') this.switchMap('island');
            else if (task.type === 'rest') this.switchMap('house');
            else if (task.type === 'harvest') this.switchMap('farm');
          }
        });
      }
    });

    // 更新左侧的进度和宝箱状态
    const progressText = pDoc.getElementById('tasks-progress-text');
    const progressBar = pDoc.getElementById('tasks-progress-bar');
    const claimChestBtn = pDoc.getElementById('btn-tasks-claim-chest');
    const chestIcon = pDoc.getElementById('tasks-chest-btn');

    if (progressText) progressText.textContent = `${completedCount} / 5`;
    if (progressBar) progressBar.style.width = `${(completedCount / 5) * 100}%`;

    // 领取今日大宝箱的奖励逻辑
    if (claimChestBtn) {
      const today = new Date().toDateString();
      const chestKey = `tasks_chest_claimed_${today}`;
      const hasClaimed = localStorage.getItem(chestKey) === 'true';

      if (hasClaimed) {
        claimChestBtn.textContent = '已领取今日大奖';
        claimChestBtn.disabled = true;
        if (chestIcon) chestIcon.textContent = '📦';
      } else if (completedCount >= 5) {
        claimChestBtn.textContent = '领取活跃宝箱';
        claimChestBtn.disabled = false;
        if (chestIcon) chestIcon.textContent = '🎁';
        claimChestBtn.onclick = () => {
          localStorage.setItem(chestKey, 'true');
          this.updateCoins(300);
          this.gainExp(100);
          this.showToast('🎉 成功开启活跃度宝箱！获得 🪙 300 金币 + 100 经验大奖！');
          this.renderTasks();
        };
      } else {
        claimChestBtn.textContent = '未达成要求';
        claimChestBtn.disabled = true;
        if (chestIcon) chestIcon.textContent = '🎁';
      }
    }
  }

  // ==================== 排行榜系统 ====================
  initLeaderboardUI() {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const tabs = pDoc.querySelectorAll('#modal-leaderboard .tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderLeaderboard(tab.getAttribute('data-tab'));
      });
    });
    this.renderLeaderboard('pkPoints');
  }

  renderLeaderboard(tabName) {
    const pDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
    const grid = pDoc.getElementById('leaderboard-list-view');
    const myRankEl = pDoc.getElementById('leaderboard-my-rank');
    if (!grid) return;
    grid.innerHTML = '';

    const otherPlayers = [
      { name: '派蒙', coins: 99999, level: 90, pkPoints: 12000, avatar: '🧚' },
      { name: '爱丽丝', coins: 15000, level: 45, pkPoints: 6200, avatar: '👩‍🎨' },
      { name: '戴因斯雷布', coins: 8800, level: 60, pkPoints: 8500, avatar: '⚔️' },
      { name: '刻晴', coins: 25000, level: 50, pkPoints: 5400, avatar: '⚡' },
      { name: '芭芭拉', coins: 1200, level: 12, pkPoints: 1500, avatar: '🎤' }
    ];

    const username = localStorage.getItem('sso_username') || '旅行者';
    const playerSelf = {
      name: username + ' (我)',
      coins: this.gameData.coins,
      level: this.gameData.level,
      pkPoints: this.gameData.level * 150 + 400,
      avatar: '🐱',
      isSelf: true
    };

    const allPlayers = [...otherPlayers, playerSelf];
    allPlayers.sort((a, b) => b[tabName] - a[tabName]);

    allPlayers.forEach((player, index) => {
      const rank = index + 1;
      let rankBadge = rank;
      if (rank === 1) rankBadge = '🥇';
      else if (rank === 2) rankBadge = '🥈';
      else if (rank === 3) rankBadge = '🥉';

      const unit = tabName === 'coins' ? '金币' : (tabName === 'level' ? '级' : '战力');
      const val = player[tabName];

      const item = pDoc.createElement('div');
      item.className = `leaderboard-item ${player.isSelf ? 'self' : ''}`;
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.padding = '10px 14px';
      item.style.margin = '6px 0';
      item.style.background = player.isSelf ? 'rgba(39, 174, 96, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      item.style.border = player.isSelf ? '1px solid #27ae60' : '1px solid rgba(255,255,255,0.05)';
      item.style.borderRadius = '10px';
      item.style.gap = '14px';
      item.style.boxSizing = 'border-box';
      item.style.width = '100%';

      item.innerHTML = `
        <div class="rank-num" style="font-size: 1.1rem; font-weight: bold; min-width: 24px; text-align: center;">${rankBadge}</div>
        <div class="rank-avatar" style="font-size: 1.5rem; user-select: none;">${player.avatar}</div>
        <div class="rank-name" style="flex: 1; font-weight: 600; color: ${player.isSelf ? '#2dcc71' : '#fff'};">${player.name}</div>
        <div class="rank-val" style="font-weight: bold; color: #ffd700;">${val} <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">${unit}</span></div>
      `;

      grid.appendChild(item);

      if (player.isSelf && myRankEl) {
        myRankEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 20px; background: rgba(0,0,0,0.25); border-top: 1px solid var(--glass-border); font-size: 0.9rem; box-sizing: border-box;">
            <span style="color: var(--text-muted);">我的排名: <strong style="color: #2dcc71; font-size: 1rem;">第 ${rank} 名</strong></span>
            <span style="color: var(--text-muted);">${unit}: <strong style="color: #ffd700; font-size: 1rem;">${val}</strong></span>
          </div>
        `;
      }
    });
  }

  triggerTaskProgress(type) {
    this.gameData.tasks.forEach(task => {
      if (task.type === type && task.status === 'ongoing' && task.progress < task.target) {
        task.progress++;
        this.saveGameData();
        this.renderTasks();
        if (task.progress === task.target) {
          this.showToast(`🔔 每日任务【${task.name}】已可领取奖励！`);
        }
      }
    });
  }

  // ==================== PVP 匹配与结算面板 ====================
  initPKUI() {
    const matchBtn = document.getElementById('btn-pk-match');
    if (matchBtn) {
      matchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerPKMatching();
      });
    }

    const cancelMatchBtn = document.getElementById('btn-cancel-match');
    if (cancelMatchBtn) {
      cancelMatchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelPKMatching();
      });
    }

    const createRoomBtn = document.getElementById('btn-create-room');
    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.modalMgr.closeAllModals();
        this.triggerPKMatching();
      });
    }

    const attackBtn = document.getElementById('btn-pk-attack');
    if (attackBtn) {
      attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playerPerformAttack();
      }, { passive: false });
      attackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playerPerformAttack();
      });
    }

    // 键盘 J 键触发攻击
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'j') {
        this.playerPerformAttack();
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isPKActive) {
        const tagName = e.target.tagName.toLowerCase();
        if (
          tagName === 'button' || 
          tagName === 'a' || 
          e.target.closest('.sidebar-container') || 
          e.target.closest('.modal-card') || 
          e.target.closest('.pk-hud') || 
          e.target.closest('.action-buttons')
        ) {
          return;
        }
        this.playerPerformAttack();
      }
    });
  }

  triggerPKMatching() {
    const card = document.getElementById('pk-matching-card');
    if (card) card.style.display = 'flex';

    this.matchingTimer = setTimeout(() => {
      if (card) card.style.display = 'none';
      this.modalMgr.closeAllModals();
      this.startPKBattle(true);
    }, 2800); // 2.8s 后为玩家匹配到 AI 对手
  }

  cancelPKMatching() {
    if (this.matchingTimer) {
      clearTimeout(this.matchingTimer);
    }
    const card = document.getElementById('pk-matching-card');
    if (card) card.style.display = 'none';
  }

  startPKBattle(isRobot = true) {
    this.isPKActive = true;
    this.playerHP = 100;
    this.opponentHP = 100;
    this.playerEquippedWeapon = null;
    this.updatePKHPUI();

    // 显示对决血条 HUD
    const hud = document.getElementById('pk-hud-panel');
    if (hud) hud.style.display = 'flex';

    // 重置物理条件
    if (this.playerWeapon3D) {
      this.playerWeapon3D.dispose();
      this.playerWeapon3D = null;
    }
    this.activeBombs = [];
    this.activeExplosions = [];
    this.bombCooldownActive = false;

    const parentAtkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
    if (parentAtkBtn) parentAtkBtn.style.display = 'none';

    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      debugEl.style.display = 'block';
      debugEl.textContent = '准备战斗，请先走向擂台周边的武器架拾取武器...';
    }

    if (isRobot) {
      if (this.opponent3D) {
        this.opponent3D.dispose();
        this.opponent3D = null;
      }
      // 生成机器人外观网格模型
      const robotGroup = new BABYLON.TransformNode("robotOpponent", this.scene);
      
      const head = BABYLON.MeshBuilder.CreateBox("robotHead", { size: 0.4 }, this.scene);
      head.position.y = 1.35;
      head.parent = robotGroup;
      head.material = this.createFlatMaterial("robotHeadMat", 0xe74c3c);

      const body = BABYLON.MeshBuilder.CreateBox("robotBody", { width: 0.5, height: 0.7, depth: 0.3 }, this.scene);
      body.position.y = 0.8;
      body.parent = robotGroup;
      body.material = this.createFlatMaterial("robotBodyMat", 0x2c3e50);

      const legL = BABYLON.MeshBuilder.CreateCylinder("robotLegL", { diameterTop: 0.16, diameterBottom: 0.16, height: 0.45, tessellation: 8 }, this.scene);
      legL.position.set(-0.16, 0.225, 0);
      legL.parent = robotGroup;
      legL.material = this.createFlatMaterial("robotLegMat", 0x34495e);

      const legR = legL.clone("robotLegR");
      legR.position.x = 0.16;
      legR.parent = robotGroup;

      robotGroup.position.set(5.5, 0.6, 0);
      this.opponent3D = robotGroup;
      this.opponentVelocity = new BABYLON.Vector3(0, 0, 0);
      this.opponentIsGrounded = true;
      this.opponentEquippedWeapon = 'sword';

      const sword = createSword3D(this.scene);
      sword.position.set(0.35, 0.8, 0.1);
      sword.rotation.x = Math.PI / 2;
      sword.parent = this.opponent3D;
      this.opponentWeapon3D = sword;

      // 擂台水晶隐退
      if (this.pkCrystalMesh) this.pkCrystalMesh.setEnabled(false);
    }
  }

  updatePKHPUI() {
    const p1Hp = document.getElementById('pk-hud-p1-hp');
    const p2Hp = document.getElementById('pk-hud-p2-hp');
    const p1Txt = document.getElementById('pk-hud-p1-hp-text');
    const p2Txt = document.getElementById('pk-hud-p2-hp-text');

    if (p1Hp) p1Hp.style.width = `${this.playerHP}%`;
    if (p2Hp) p2Hp.style.width = `${this.opponentHP}%`;
    
    if (p1Txt) p1Txt.textContent = `${this.playerHP} / 100`;
    if (p2Txt) p2Txt.textContent = `${this.opponentHP} / 100`;
  }

  playDamageBubble(position, dmg, isPlayer = false) {
    const bubble = document.createElement('div');
    bubble.className = 'damage-bubble';
    if (isPlayer) {
      bubble.style.color = '#ff1744';
      bubble.textContent = `-${dmg} HP`;
    } else {
      bubble.style.color = '#ffeb3b';
      bubble.textContent = `-${dmg}`;
    }
    document.body.appendChild(bubble);

    const updatePos = () => {
      if (!this.camera || !bubble.parentElement) return;
      const worldPos = position.add(new BABYLON.Vector3(0, isPlayer ? 1.0 : 1.3, 0));
      
      const screenPos = BABYLON.Vector3.Project(
        worldPos,
        BABYLON.Matrix.Identity(),
        this.scene.getTransformMatrix(),
        this.camera.viewport.toGlobal(window.innerWidth, window.innerHeight)
      );

      bubble.style.left = `${screenPos.x}px`;
      bubble.style.top = `${screenPos.y}px`;
    };

    updatePos();
    const posTimer = setInterval(updatePos, 16);

    setTimeout(() => {
      clearInterval(posTimer);
      bubble.remove();
    }, 1200);
  }

  endPKBattle(isWin) {
    this.isPKActive = false;

    // 清理 3D 武器和对手
    if (this.playerWeapon3D) {
      this.playerWeapon3D.dispose();
      this.playerWeapon3D = null;
    }
    if (this.opponent3D) {
      this.opponent3D.dispose();
      this.opponent3D = null;
    }

    const hud = document.getElementById('pk-hud-panel');
    if (hud) hud.style.display = 'none';

    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) debugEl.style.display = 'none';

    // 展现结算面板
    const settle = document.getElementById('pk-settlement-card');
    const title = document.getElementById('pk-settle-title');
    const desc = document.getElementById('pk-settle-desc');
    const closeBtn = document.getElementById('btn-pk-settle-close');

    if (settle) {
      settle.style.display = 'flex';
      if (isWin) {
        title.textContent = '🎉 挑战胜利！';
        title.style.color = '#ffeb3b';
        desc.textContent = '您完美地击败了对手！奖励金币: 🪙 50';
        this.updateCoins(50);
      } else {
        title.textContent = '💀 挑战失败';
        title.style.color = '#ff1744';
        desc.textContent = '遗憾落败，差一点就能击败他了。奖励安慰金: 🪙 10';
        this.updateCoins(10);
      }
    }

    if (closeBtn) {
      const handleClose = () => {
        if (settle) settle.style.display = 'none';
        this.modalMgr.closeAllModals();
        closeBtn.removeEventListener('click', handleClose);
      };
      closeBtn.addEventListener('click', handleClose);
    }
  }

  // ==================== 快捷圆环种植菜单逻辑 ====================
  showPlotRadialMenu() {
    // 找出玩家当前最近的地块
    let closestIdx = -1;
    let minDist = 999;
    
    if (this.farmPlots3D) {
      this.farmPlots3D.forEach((plot, idx) => {
        const dist = BABYLON.Vector3.Distance(this.player.position, new BABYLON.Vector3(plot.x, 0.6, plot.z));
        if (dist < 2.0 && dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
    }

    if (closestIdx === -1) {
      this.showToast('请走到任一泥土农田附近以开启种植！🌱');
      return;
    }

    this.activePlotIndex = closestIdx;

    // 显示地块种植环形面板
    const radial = document.getElementById('radial-menu-container');
    if (radial) radial.style.display = 'block';
  }

  updateActivePlotForRadialMenu() {
    const radial = document.getElementById('radial-menu-container');
    if (!radial || radial.style.display !== 'block' || this.activePlotIndex === undefined) return;

    const plot3D = this.farmPlots3D[this.activePlotIndex];
    if (!plot3D) return;

    // 将 3D 地块中心位置投射到 2D 网页屏幕上
    const worldPos = new BABYLON.Vector3(plot3D.x, 0.72, plot3D.z);
    const screenPos = BABYLON.Vector3.Project(
      worldPos,
      BABYLON.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(window.innerWidth, window.innerHeight)
    );

    radial.style.left = `${screenPos.x}px`;
    radial.style.top = `${screenPos.y}px`;
  }

  triggerPlotInteraction(plotIndex) {
    const plot = this.gameData.farmPlots[plotIndex];
    if (plot.status === 'ready') {
      // 执行收割
      plot.status = 'empty';
      const seedType = plot.seedId;
      plot.seedId = null;
      plot.plantTime = 0;

      // 销毁 3D 作物模型
      const plot3D = this.farmPlots3D[plotIndex];
      if (plot3D) {
        plot3D.plantGroup.getChildren().forEach(child => child.dispose());
      }

      const rewardMap = {
        'sunflower_seed': { coins: 20, exp: 15 },
        'strawberry_seed': { coins: 50, exp: 30 }
      };

      const rew = rewardMap[seedType] || { coins: 20, exp: 15 };
      this.updateCoins(rew.coins);
      this.gainExp(rew.exp);
      this.triggerTaskProgress('harvest');

      const shortName = seedType === 'sunflower_seed' ? '向日葵' : '草莓';
      this.showToast(`成功收割了 ${shortName} 🌾！已存入背包`);
    } else {
      // 开启种植菜单
      this.activePlotIndex = plotIndex;
      const radial = document.getElementById('radial-menu-container');
      if (radial) radial.style.display = 'block';
    }
  }

  // ==================== 纸牌 21点街机游戏 ====================
  initPokerGame() {
    const container = document.getElementById('modal-arcade');
    if (!container) return;

    // 绑定开始与控制按钮
    const dealBtn = document.getElementById('btn-poker-deal');
    const hitBtn = document.getElementById('btn-poker-hit');
    const standBtn = document.getElementById('btn-poker-stand');
    const restartBtn = document.getElementById('btn-poker-restart');

    const handleDeal = () => this.pokerGameAction('deal');
    const handleHit = () => this.pokerGameAction('hit');
    const handleStand = () => this.pokerGameAction('stand');
    const handleRestart = () => this.pokerGameAction('restart');

    if (dealBtn) dealBtn.addEventListener('click', handleDeal);
    if (hitBtn) hitBtn.addEventListener('click', handleHit);
    if (standBtn) standBtn.addEventListener('click', handleStand);
    if (restartBtn) restartBtn.addEventListener('click', handleRestart);

    // 种植圆环菜单选项事件绑定
    const radialSeedSun = document.getElementById('radial-opt-sunflower');
    const radialSeedStraw = document.getElementById('radial-opt-strawberry');
    const radialCancel = document.getElementById('radial-opt-cancel');

    if (radialSeedSun) {
      radialSeedSun.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executePlantSeed('sunflower_seed');
      });
    }
    if (radialSeedStraw) {
      radialSeedStraw.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executePlantSeed('strawberry_seed');
      });
    }
    if (radialCancel) {
      radialCancel.addEventListener('click', (e) => {
        e.stopPropagation();
        const radialMenu = document.getElementById('radial-menu-container');
        if (radialMenu) radialMenu.style.display = 'none';
      });
    }
  }

  executePlantSeed(seedId) {
    const radialMenu = document.getElementById('radial-menu-container');
    if (radialMenu) radialMenu.style.display = 'none';

    if (this.activePlotIndex === undefined) return;

    const plot = this.gameData.farmPlots[this.activePlotIndex];
    if (plot.status !== 'empty') return;

    const bagItem = this.gameData.backpack.find(b => b.id === seedId);
    if (!bagItem || bagItem.count <= 0) {
      const chName = seedId === 'sunflower_seed' ? '向日葵种子' : '草莓种子';
      this.showToast(`背包里没有 ${chName}，请走向房屋前的自动货商购买 🛍️`);
      return;
    }

    // 扣除种子
    bagItem.count--;
    plot.status = 'growing';
    plot.seedId = seedId;
    plot.plantTime = Date.now();

    this.saveGameData();
    this.recreateCrop3D(this.activePlotIndex);
    this.showToast('种植成功 🌱！作物正在茁壮成长中...');
    this.playCustomSound(320, 0.2, 'sine', 0.05);
  }

  pokerGameAction(action) {
    const playPanel = document.getElementById('poker-play-panel');
    const startPanel = document.getElementById('poker-start-panel');
    const infoText = document.getElementById('poker-info-text');

    if (action === 'deal') {
      const bet = parseInt(document.getElementById('poker-bet-input')?.value || 10) || 10;
      if (this.gameData.coins < bet) {
        alert('您的金币不足，无法开始下注！🪙');
        return;
      }
      this.updateCoins(-bet);
      this.pokerBet = bet;

      if (startPanel) startPanel.style.display = 'none';
      if (playPanel) playPanel.style.display = 'flex';

      // 扑克发牌初始化
      this.pokerDeck = this.createPokerDeck();
      this.playerHand = [this.drawPokerCard(), this.drawPokerCard()];
      this.dealerHand = [this.drawPokerCard(), this.drawPokerCard()];

      this.updatePokerCardsUI();
      
      const pScore = this.getPokerScore(this.playerHand);
      if (pScore === 21) {
        this.pokerGameAction('stand');
      }
    } else if (action === 'hit') {
      this.playerHand.push(this.drawPokerCard());
      this.updatePokerCardsUI();
      
      if (this.getPokerScore(this.playerHand) > 21) {
        this.endPokerGame('dealer_win', '爆牌！您输掉了这局对局 😢');
      }
    } else if (action === 'stand') {
      let dScore = this.getPokerScore(this.dealerHand);
      while (dScore < 17) {
        this.dealerHand.push(this.drawPokerCard());
        dScore = this.getPokerScore(this.dealerHand);
      }
      this.updatePokerCardsUI(true);

      const pScore = this.getPokerScore(this.playerHand);
      if (dScore > 21) {
        this.endPokerGame('player_win', '庄家爆牌！恭喜您获得胜利 🎉');
      } else if (pScore > dScore) {
        this.endPokerGame('player_win', '您的点数比庄家更大，恭喜胜出 🎉');
      } else if (pScore < dScore) {
        this.endPokerGame('dealer_win', '庄家点数更大，您输了 😢');
      } else {
        this.endPokerGame('push', '双方点数平手 ⚖️');
      }
    } else if (action === 'restart') {
      if (startPanel) startPanel.style.display = 'flex';
      if (playPanel) playPanel.style.display = 'none';
      if (infoText) infoText.textContent = '';
    }
  }

  createPokerDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const deck = [];
    for (const s of suits) {
      for (const v of values) {
        deck.push({ suit: s, value: v });
      }
    }
    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  drawPokerCard() {
    return this.pokerDeck.pop();
  }

  getPokerScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.value === 'A') {
        aces++;
        score += 11;
      } else if (['J','Q','K'].includes(card.value)) {
        score += 10;
      } else {
        score += parseInt(card.value);
      }
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  }

  updatePokerCardsUI(revealDealer = false) {
    const pContainer = document.getElementById('poker-player-cards');
    const dContainer = document.getElementById('poker-dealer-cards');
    const pScoreEl = document.getElementById('poker-player-score');
    const dScoreEl = document.getElementById('poker-dealer-score');

    if (pContainer) {
      pContainer.innerHTML = this.playerHand.map(c => `<div class="poker-card ${['♥','♦'].includes(c.suit) ? 'red' : ''}">${c.value}<br>${c.suit}</div>`).join('');
    }

    if (dContainer) {
      if (revealDealer) {
        dContainer.innerHTML = this.dealerHand.map(c => `<div class="poker-card ${['♥','♦'].includes(c.suit) ? 'red' : ''}">${c.value}<br>${c.suit}</div>`).join('');
      } else {
        dContainer.innerHTML = `<div class="poker-card ${['♥','♦'].includes(this.dealerHand[0].suit) ? 'red' : ''}">${this.dealerHand[0].value}<br>${this.dealerHand[0].suit}</div><div class="poker-card back">?</div>`;
      }
    }

    if (pScoreEl) pScoreEl.textContent = `点数: ${this.getPokerScore(this.playerHand)}`;
    if (dScoreEl) {
      dScoreEl.textContent = revealDealer ? `点数: ${this.getPokerScore(this.dealerHand)}` : '点数: ?';
    }
  }

  endPokerGame(result, message) {
    const infoText = document.getElementById('poker-info-text');
    if (infoText) infoText.textContent = message;

    const hitBtn = document.getElementById('btn-poker-hit');
    const standBtn = document.getElementById('btn-poker-stand');
    const restartBtn = document.getElementById('btn-poker-restart');

    if (hitBtn) hitBtn.style.display = 'none';
    if (standBtn) standBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';

    if (result === 'player_win') {
      this.updateCoins(this.pokerBet * 2);
      this.gainExp(15);
      this.triggerTaskProgress('game_poker');
      this.playCustomSound(520, 0.35, 'sine', 0.08);
    } else if (result === 'push') {
      this.updateCoins(this.pokerBet);
      this.playCustomSound(330, 0.2, 'sine', 0.05);
    } else {
      this.playCustomSound(120, 0.4, 'sawtooth', 0.1);
    }
  }

  // ==================== 自定义简易声音合成 ====================
  playCustomSound(freq, duration, type = 'sine', vol = 0.05) {
    if (window.parent && typeof window.parent.playCustomSound === 'function') {
      window.parent.playCustomSound(freq, duration, type, vol);
      return;
    }
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Play sound failed', e);
    }
  }

  initWardrobeUI() {
    const setupWardrobeSection = (sectionId, type) => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      
      const buttons = section.querySelectorAll('.color-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          section.querySelector('.color-btn.active')?.classList.remove('active');
          btn.classList.add('active');
          const color = btn.getAttribute('data-color');
          if (this.player) {
            this.player.updateOutfit(type, color);
          }
        });
      });
    };

    setupWardrobeSection('wardrobe-hair', 'hair');
    setupWardrobeSection('wardrobe-clothes', 'clothing');
    setupWardrobeSection('wardrobe-hat', 'hat');

    const modelBtns = document.querySelectorAll('.model-btn');
    modelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.model-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        const modelType = btn.getAttribute('data-model');
        if (this.player) {
          this.player.updateModel(modelType);
          
          const hairTitle = document.getElementById('wardrobe-hair-title');
          const clothingTitle = document.getElementById('wardrobe-clothing-title');
          const hatTitle = document.getElementById('wardrobe-hat-title');
          
          if (modelType === 'kitty') {
            if (hairTitle) hairTitle.textContent = '毛皮颜色 (Fur Color)';
            if (clothingTitle) clothingTitle.textContent = '小猫背心 (Vest Color)';
            if (hatTitle) hatTitle.textContent = '金铃铛颜色 (Bell Color)';
          } else {
            if (hairTitle) hairTitle.textContent = '发发 / 毛毛';
            if (clothingTitle) clothingTitle.textContent = '服装颜色';
            if (hatTitle) hatTitle.textContent = '配饰 / 铃铛颜色';
          }
          this.playCustomSound(440, 0.15, 'triangle', 0.06);
        }
      });
    });
  }

  switchMap(targetMap, spawnPoint = null, autoOpenModal = null, action = null) {
    console.log('[GameApp] switchMap called with targetMap:', targetMap);
    console.trace('[GameApp] switchMap call trace:');
    let targetUrl = '';
    if (targetMap === 'island') targetUrl = 'lobby.html';
    else if (targetMap === 'house') targetUrl = 'house.html';
    else if (targetMap === 'farm') targetUrl = 'farm.html';
    else if (targetMap === 'pk_arena') targetUrl = 'pvp.html';
    else if (targetMap === 'lake') targetUrl = 'lake.html';
    else if (targetMap === 'castle') targetUrl = 'castle.html';

    const params = [];
    if (spawnPoint) {
      params.push(`spawn=${spawnPoint.x.toFixed(2)},${spawnPoint.y.toFixed(2)},${spawnPoint.z.toFixed(2)}`);
    }
    if (autoOpenModal) {
      params.push(`modal=${autoOpenModal}`);
    }
    if (action) {
      params.push(`action=${action}`);
    }
    if (params.length > 0) {
      targetUrl += '?' + params.join('&');
    }

    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
      fadeOverlay.classList.add('fade-in');
    }

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 450);
  }

  unstuckPlayer() {
    if (!this.player) return;
    
    if (this.player.isSitting || this.player.isLyingDown) {
      this.player.standUp();
    }
    
    if (this.currentMap === 'house') {
      this.player.position.set(0, 0.12 + 0.1, 9.5);
    } else {
      this.player.position.set(-10.0, 0.6 + 0.1, -5.2);
    }
    this.player.velocity.set(0, 0, 0);
    this.player.group.position.copyFrom(this.player.position);
    this.player.group.rotation.y = this.currentMap === 'house' ? Math.PI : 0;
    this.player.cameraAngleH = this.currentMap === 'house' ? Math.PI : 0;
    
    this.showStuckToast("重置成功！角色已脱离卡死 🌀");
  }
}

// 绑定 DOM 载入完成初始化
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});
