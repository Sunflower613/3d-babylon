import * as THREE from 'three';
import { siteConfig } from '../site-config.js';
import { ModalManager } from './src/ui/Modal.js';
import { Environment } from './src/world/Environment.js';
import { IslandGenerator } from './src/world/Island.js';
import { HouseGenerator } from './src/world/House.js';
import { Player } from './src/world/Player.js';
import { InteractsManager } from './src/world/Interacts.js';
import { BeachBall } from './src/world/BeachBall.js';

class GameApp {
  constructor() {
    // Prevent double click selection / zoom and dictionary translation popups
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('selectstart', (e) => {
      // Allow select in input fields if any, but prevent globally
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    });

    // Detect mobile touch capability and add class to body
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
    this.clock = new THREE.Clock();
    
    // Core game components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.player = null;
    this.environment = null;
    this.islandGen = null;
    this.modalMgr = null;
    this.interactMgr = null;
    this.beachBallsList = [];
    this.activeBombs = [];
    this.activeExplosions = [];
    this.bombCooldownActive = false;

    // Load active theme configuration
    const activeThemeKey = siteConfig.activeTheme || 'beach';
    this.themeConfig = siteConfig.themes[activeThemeKey];

    // Audio synthesizer properties
    this.audioCtx = null;
    this.isPlayingMusic = false;
    this.synthInterval = null;

    this.initEngine();
    this.initWorld();
    this.initSSO();
    this.initGameSystems();
    this.animate();
  }

  initSSO() {
    // 自动检查 URL Query 中的 SSO Token 并保存
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('sso_access_token');
    const userStr = urlParams.get('sso_user');
    if (token && userStr) {
      localStorage.setItem('sso_access_token', token);
      localStorage.setItem('sso_user', userStr);
      
      // 清理 URL 参数
      urlParams.delete('sso_access_token');
      urlParams.delete('sso_user');
      const cleanQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';

    const ssoLoginBtn = document.getElementById('sso-login-btn');
    const ssoUserInfo = document.getElementById('sso-user-info');
    const ssoAvatar = document.getElementById('sso-avatar');
    
    // 侧边栏节点
    const sidebar = document.getElementById('sso-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close-btn');
    
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarStatus = document.getElementById('sidebar-user-status');
    
    const sidebarLogin = document.getElementById('sidebar-login-btn');
    const sidebarLogout = document.getElementById('sidebar-logout-btn');

    // 飘窗提示方法
    window.showMockToast = function(name) {
      let existing = document.querySelector('.mock-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'mock-toast';
      toast.textContent = `${name} 功能正在开发中，敬请期待！😊`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 50);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2200);
    };

    // 侧边栏展开与收起
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

    const handleSidebarOpen = (e) => {
      e.stopPropagation();
      openSidebar();
    };

    if (ssoLoginBtn) {
      ssoLoginBtn.addEventListener('click', handleSidebarOpen);
    }
    if (ssoUserInfo) {
      ssoUserInfo.addEventListener('click', handleSidebarOpen);
    }
    if (sidebarClose) {
      sidebarClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSidebar();
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSidebar();
      });
    }

    // SSO 状态初始化
    const initSSOState = () => {
      const token = localStorage.getItem('sso_access_token');
      const userStr = localStorage.getItem('sso_user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
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
          console.error('Parse user failed', e);
        }
      } else {
        if (ssoLoginBtn) ssoLoginBtn.style.display = 'flex';
        if (ssoUserInfo) ssoUserInfo.style.display = 'none';
        
        if (sidebarAvatar) sidebarAvatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"%3E%3C/path%3E%3C/svg%3E';
        if (sidebarUsername) sidebarUsername.textContent = '未登录';
        if (sidebarStatus) {
          sidebarStatus.textContent = '游客';
          sidebarStatus.style.borderColor = 'rgba(255, 140, 105, 0.25)';
          sidebarStatus.style.color = 'var(--primary)';
        }

        if (sidebarLogin) sidebarLogin.style.display = 'inline-block';
        if (sidebarLogout) sidebarLogout.style.display = 'none';
      }
    };

    const sidebarBack2d = document.getElementById('sidebar-back-2d-btn');
    if (sidebarBack2d) {
      const handleBack2d = (e) => {
        e.stopPropagation();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && window.location.port === '3000') {
          window.location.href = 'http://127.0.0.1:8000/index.html';
        } else {
          window.location.href = '/index.html';
        }
      };
      sidebarBack2d.addEventListener('click', handleBack2d);
    }

    if (sidebarLogin) {
      sidebarLogin.addEventListener('click', (e) => {
        e.preventDefault();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let homeUrl = isLocal ? 'http://127.0.0.1:8000/index.html' : '/index.html';
        if (document.referrer && (document.referrer.includes('index.html') || document.referrer.endsWith('/'))) {
          try {
            const refUrl = new URL(document.referrer);
            if (refUrl.pathname === '/' || refUrl.pathname.endsWith('/index.html')) {
              homeUrl = refUrl.origin + refUrl.pathname;
            }
          } catch(e) {}
        }
        
        const returnUrl = window.location.href;
        window.location.href = `${homeUrl}?sso_return_url=${encodeURIComponent(returnUrl)}`;
      });
    }

    if (sidebarLogout) {
      sidebarLogout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('sso_access_token');
        localStorage.removeItem('sso_user');
        initSSOState();
        closeSidebar();
        window.location.reload();
      });
    }

    // 脱离卡死绑定
    const sidebarStuck = document.getElementById('sidebar-stuck-btn');
    if (sidebarStuck) {
      sidebarStuck.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unstuckPlayer();
        closeSidebar();
      });
    }

    // 地图切换绑定
    const btnMapIsland = document.getElementById('btn-map-island');
    const btnMapHouse = document.getElementById('btn-map-house');
    if (btnMapIsland) {
      btnMapIsland.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchMap('island');
        closeSidebar();
      });
    }
    if (btnMapHouse) {
      btnMapHouse.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchMap('house');
        closeSidebar();
      });
    }

    // 绑定侧边栏功能面板
    const sidebarButtons = [
      { id: 'btn-sidebar-leaderboard', name: 'leaderboard' },
      { id: 'btn-sidebar-tasks', name: 'tasks' },
      { id: 'btn-sidebar-farm', name: 'farm' },
      { id: 'btn-sidebar-pk', name: 'pk' },
      { id: 'btn-sidebar-bag', name: 'bag' },
      { id: 'btn-sidebar-home', name: 'home' }
    ];
    sidebarButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          closeSidebar();
          if (btn.name === 'farm') {
            this.switchMap('farm');
            setTimeout(() => {
              if (window.showMockToast) {
                let existing = document.querySelector('.mock-toast');
                if (existing) existing.remove();

                const toast = document.createElement('div');
                toast.className = 'mock-toast';
                toast.textContent = `已传送至您的 3D 农场岛！走近泥地格按 E 种植/收割 🌾`;
                document.body.appendChild(toast);

                setTimeout(() => toast.classList.add('show'), 50);
                setTimeout(() => {
                  toast.classList.remove('show');
                  setTimeout(() => toast.remove(), 300);
                }, 2200);
              }
            }, this.currentMap === 'house' ? 600 : 50);
          } else if (btn.name === 'pk') {
            this.switchMap('pk_arena', new THREE.Vector3(0, 0.6 + 0.1, -6.5));
            setTimeout(() => {
              if (window.showMockToast) {
                let existing = document.querySelector('.mock-toast');
                if (existing) existing.remove();

                const toast = document.createElement('div');
                toast.className = 'mock-toast';
                toast.textContent = `已传送至 3D 竞技大厅！走近前方蓝色的“决斗水晶”按 E 开启匹配决斗 ⚔️`;
                document.body.appendChild(toast);

                setTimeout(() => toast.classList.add('show'), 50);
                setTimeout(() => {
                  toast.classList.remove('show');
                  setTimeout(() => toast.remove(), 300);
                }, 2500);
              }
            }, this.currentMap === 'house' ? 600 : 50);
          } else {
            if (this.modalMgr) {
              this.modalMgr.openModal(btn.name);
            }
          }
        });
      }
    });

    initSSOState();

    // 监听 Esc 键控制侧边栏菜单开关（防冲突与高容错机制）
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
          return;
        }

        // 1. 如果当前处于决斗结算面板，按 Esc 应该等同于点击“返回群岛”以防状态冲突
        const settleCloseBtn = document.getElementById('btn-settle-close');
        if (settleCloseBtn) {
          e.preventDefault();
          settleCloseBtn.click();
          return;
        }

        // 2. 如果当前有任何 2D 模态弹窗打开，按 Esc 键应该只关闭弹窗而不开启侧边栏
        if (this.modalMgr && this.modalMgr.isAnyModalOpen) {
          e.preventDefault();
          this.modalMgr.closeAllModals();
          return;
        }

        // 3. 否则，如果是运行在 iframe 内部，委托给父级 AppShell 实例处理侧边栏开关
        if (window.self !== window.top && window.parent && window.parent.appShell && typeof window.parent.appShell.toggleSidebar === 'function') {
          e.preventDefault();
          window.parent.appShell.toggleSidebar();
          return;
        }

        // 4. 普通状态下（SPA 回退），toggle 本地侧边栏
        const activeSidebar = document.getElementById('sso-sidebar');
        if (activeSidebar) {
          e.preventDefault();
          const isOpen = activeSidebar.classList.contains('open');
          if (isOpen) {
            closeSidebar();
          } else {
            openSidebar();
          }
        }
      }
    });

    // 禁用移动端左右滑动返回、下拉刷新等默认手势，但保留特定滚动容器的正常滚动
    document.addEventListener('touchmove', (e) => {
      // 允许在关于我、技术栈、项目展示、衣柜侧栏、街机大厅等滚动区域内正常滚动
      if (e.target.closest('.scrollable') || e.target.closest('.wardrobe-sidebar') || e.target.closest('.modal-body') || e.target.closest('.sso-sidebar')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  initEngine() {
    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // Set a matching background color based on theme config
    const skyColor = this.themeConfig.colors.sky || 0xb2ebf2;
    this.scene.background = new THREE.Color(skyColor);

    // 2. Create Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    // 3. Create WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.35) : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 4. Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    // 根据 document.body.id 识别当前地图类型
    this.currentMap = 'island'; // 默认
    if (document.body.id === 'page-lobby') this.currentMap = 'island';
    else if (document.body.id === 'page-house') this.currentMap = 'house';
    else if (document.body.id === 'page-farm') this.currentMap = 'farm';
    else if (document.body.id === 'page-pvp') this.currentMap = 'pk_arena';

    // 实例化弹窗管理器与环境
    this.modalMgr = new ModalManager();
    this.environment = new Environment(this.scene, this.themeConfig);

    // 根据地图只生成对应的地图与碰撞体
    if (this.currentMap === 'island') {
      this.islandGen = new IslandGenerator(this.scene, this.themeConfig);
      this.player = new Player(this.scene, this.camera, this.islandGen.colliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.islandGen, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    } else if (this.currentMap === 'house') {
      this.houseGen = new HouseGenerator(this.scene, this.themeConfig);
      this.houseGen.group.visible = true; // 小屋直接可见
      this.player = new Player(this.scene, this.camera, this.houseGen.colliders, this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, this.houseGen, this.modalMgr, this);
      this.environment.setIndoorMode(true);
    } else if (this.currentMap === 'farm') {
      this.farmGroup = new THREE.Group();
      this.scene.add(this.farmGroup);
      this.farmGroup.visible = true;
      this.buildFarmPlatform();
      this.player = new Player(this.scene, this.camera, this.farmColliders || [], this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, { interactables: this.farmInteractables || [] }, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    } else if (this.currentMap === 'pk_arena') {
      this.pkArenaGroup = new THREE.Group();
      this.scene.add(this.pkArenaGroup);
      this.pkArenaGroup.visible = true;
      this.buildPKPlatform();
      this.player = new Player(this.scene, this.camera, this.pkArenaColliders || [], this.themeConfig);
      this.interactMgr = new InteractsManager(this.player, { interactables: this.pkArenaInteractables || [] }, this.modalMgr, this);
      this.environment.setIndoorMode(false);
    }

    this.player.app = this; // 共享引用

    // 从 URL 提取并还原出生点坐标
    const urlParams = new URLSearchParams(window.location.search);
    const spawnParam = urlParams.get('spawn');
    if (spawnParam) {
      const parts = spawnParam.split(',').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        this.player.position.set(parts[0], parts[1], parts[2]);
        this.player.group.position.copy(this.player.position);
        
        // 合理朝向
        if (this.currentMap === 'house' || this.currentMap === 'farm') {
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
        } else if (this.currentMap === 'island') {
          this.player.group.rotation.y = 0;
          this.player.cameraAngleH = 0;
        }
      }
    } else {
      // 默认位置设置
      if (this.currentMap === 'house') {
        this.player.position.set(0, 0.12 + 0.1, 9.5);
        this.player.group.position.copy(this.player.position);
        this.player.group.rotation.y = Math.PI;
        this.player.cameraAngleH = Math.PI;
      } else if (this.currentMap === 'farm') {
        this.player.position.set(0, 0.6 + 0.1, -8.0);
        this.player.group.position.copy(this.player.position);
        this.player.group.rotation.y = Math.PI;
        this.player.cameraAngleH = Math.PI;
      } else if (this.currentMap === 'pk_arena') {
        this.player.position.set(-5.0, 0.6 + 0.1, 0);
        this.player.group.position.copy(this.player.position);
        this.player.group.rotation.y = -Math.PI / 2;
        this.player.cameraAngleH = -Math.PI / 2;
      } else {
        // 大厅岛默认
        this.player.position.set(0, 4, 0);
        this.player.group.position.copy(this.player.position);
      }
    }

    const isChristmas = siteConfig.activeTheme === 'christmas';

    // 监听生成雪球事件
    window.addEventListener('spawn-ball', (e) => {
      if (this.currentMap !== 'island') return;
      
      const spawnX = e.detail.x;
      const spawnZ = e.detail.z + 0.6;
      const colors = isChristmas ? [0xffffff, 0xe0f7fa, 0xf5fafd] : [0xff5252, 0x40c4ff, 0xffeb3b, 0xff8a80, 0x00e676];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const ball = new BeachBall(this.scene, spawnX, 1.3, spawnZ, color);
      ball.app = this;
      this.beachBallsList.push(ball);

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

    // 监听踢球声音事件
    window.addEventListener('kick-sound', (e) => {
      this.playCustomSound(isChristmas ? e.detail.freq * 0.6 : e.detail.freq, 0.16, isChristmas ? 'sine' : 'triangle', 0.18);
    });

    // 绑定衣柜 UI 选择器
    this.initWardrobeUI();

    // 绑定本地的天空时间切换
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

    // 绑定起立按钮
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

    // 页面加载完成后通知父页面外壳
    if (window.parent && window.parent.appShell && typeof window.parent.appShell.onMapLoaded === 'function') {
      window.parent.appShell.onMapLoaded(this.currentMap);
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
      console.warn('Play custom sound failed', e);
    }
  }

  initMobileJoystick() {
    // 移动端控制已被 app-shell.js 代理接管，此子页面内设为空操作防事件冲突
  }

  initAudioSynth() {
    // 背景音乐合成已被 app-shell.js 代理接管，此子页面内设为空操作防声音重叠
  }

  playMelodyLoop() {
    // 背景音乐合成已被 app-shell.js 代理接管
  }

  playMelodyLoop() {
    const isChristmas = siteConfig.activeTheme === 'christmas';
    
    // Cozy Pentatonic chord scale arpeggio notes (Frequencies in Hz)
    // C Major Pentatonic cozy sunset chords: C, D, E, G, A
    // (If winter, transposed up slightly for a dreamy chimes feel)
    const baseOctave = isChristmas ? 1.2 : 1.0;
    const chords = [
      [130.81, 196.00, 261.63, 329.63, 392.00].map(n => n * baseOctave), 
      [146.83, 220.00, 293.66, 349.23, 440.00].map(n => n * baseOctave), 
      [164.81, 246.94, 329.63, 392.00, 493.88].map(n => n * baseOctave), 
      [116.54, 174.61, 233.08, 293.66, 349.23].map(n => n * baseOctave)  
    ];

    let chordIdx = 0;
    let step = 0;

    const playNote = (freq, duration, type = 'sine', vol = 0.05) => {
      if (!this.isPlayingMusic || !this.audioCtx) return;
      
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
    };

    // Every 320ms, play a note from the current arpeggiated chord
    this.synthInterval = setInterval(() => {
      const currentChord = chords[chordIdx];
      const pattern = [0, 2, 1, 3, 2, 4, 3, 1];
      const noteIdx = pattern[step % pattern.length];
      const frequency = currentChord[noteIdx];

      // Play soft arpeggio note (Christmas uses high chimes, summer uses warm sine)
      const noteVol = isChristmas ? 0.05 : 0.08;
      playNote(frequency, 0.9, 'sine', noteVol);

      // Add a higher bell tone randomly for winter ambient chime texture
      if (step % 4 === 0 && Math.random() > 0.3) {
        const bellFreq = frequency * 2.0;
        playNote(bellFreq, 1.6, 'sine', isChristmas ? 0.04 : 0.03);
      }

      step++;
      
      if (step % 16 === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }
    }, 320);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  switchMap(targetMap, spawnPoint = null, autoOpenModal = null, action = null) {
    let targetUrl = '';
    if (targetMap === 'island') targetUrl = 'lobby.html';
    else if (targetMap === 'house') targetUrl = 'house.html';
    else if (targetMap === 'farm') targetUrl = 'farm.html';
    else if (targetMap === 'pk_arena') targetUrl = 'pvp.html';

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

    // 450毫秒后执行跳转（匹配CSS黑屏淡出过渡时间）
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 450);
  }

  unstuckPlayer() {
    if (!this.player) return;
    
    // 若正处于坐着或躺着的状态，先重置其姿态起立
    if (this.player.isSitting || this.player.isLyingDown) {
      this.player.standUp();
    }
    
    if (this.currentMap === 'house') {
      this.player.position.set(0, 0.12 + 0.1, 9.5);
    } else {
      this.player.position.set(-10.0, 0.6 + 0.1, -5.2);
    }
    this.player.velocity.set(0, 0, 0);
    this.player.group.position.copy(this.player.position);
    this.player.group.rotation.y = this.currentMap === 'house' ? Math.PI : 0;
    this.player.cameraAngleH = this.currentMap === 'house' ? Math.PI : 0;
    
    if (window.showMockToast) {
      let existing = document.querySelector('.mock-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'mock-toast';
      toast.textContent = `重置成功！角色已脱离卡死 🌀`;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 50);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2200);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 外壳攻击按键边缘触发同步 (防止长按在子页面导致无限连续攻击)
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

    // Update game components
    if (this.player) this.player.update(delta, time);
    if (this.environment) this.environment.update(time);
    if (this.islandGen) this.islandGen.update(time, this.environment);
    if (this.interactMgr) this.interactMgr.update();

    // Update beach/snow balls
    if (this.beachBallsList && this.player) {
      this.beachBallsList.forEach((ball) => ball.update(delta, this.player));
    }

    // 每帧更新新侧边栏系统 (包括农田作物、PK人机及摆放等)
    this.updateGameSystemsFrame(delta, time);

    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ==========================================================================
  // 6个全新系统：数据逻辑、渲染、3D场景交互与物理 AI
  // ==========================================================================

  getInitialGameData() {
    return {
      coins: 200,
      level: 1,
      exp: 0,
      pkPoints: 1000,
      pkWins: 0,
      pkLoses: 0,
      onlineTime: 0,
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
        { id: 'play_billiards', name: '游玩 1 局弹射台球游戏', progress: 0, target: 1, reward: 80, status: 'ongoing', type: 'game_billiards' },
        { id: 'play_poker', name: '游玩 1 局 21点纸牌游戏', progress: 0, target: 1, reward: 80, status: 'ongoing', type: 'game_poker' },
        { id: 'crop_harvest', name: '收割成熟的农地作物 3 次', progress: 0, target: 3, reward: 100, status: 'ongoing', type: 'harvest' }
      ],
      dailyChestClaimed: false,
      lastTaskResetDate: new Date().toLocaleDateString()
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
        if (res.success && res.data && res.data.save_data) {
          loadedData = res.data.save_data;
        }
      } catch (e) {
        console.error('从云端加载存档失败，采用本地缓存', e);
      }
    }

    if (!loadedData) {
      const localStr = localStorage.getItem('player_game_data');
      if (localStr) {
        try {
          loadedData = JSON.parse(localStr);
        } catch (e) {
          console.error('本地存档解析失败', e);
        }
      }
    }

    if (!loadedData) {
      loadedData = this.getInitialGameData();
    } else {
      const defaults = this.getInitialGameData();
      loadedData = Object.assign({}, defaults, loadedData);
    }

    this.gameData = loadedData;

    // 检查是否重置每日任务
    const today = new Date().toLocaleDateString();
    if (this.gameData.lastTaskResetDate !== today) {
      this.gameData.tasks = this.getInitialGameData().tasks;
      this.gameData.dailyChestClaimed = false;
      this.gameData.lastTaskResetDate = today;
      this.saveGameData();
    }

    this.updateBaseUI();
  }

  async saveGameData() {
    localStorage.setItem('player_game_data', JSON.stringify(this.gameData));

    const token = localStorage.getItem('sso_access_token');
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';

    if (token) {
      try {
        await fetch(`${apiHost}/api/game/score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            game_id: '3d-home-all',
            score: this.gameData.level,
            save_data: this.gameData
          })
        });

        // 联合上报排行榜参数
        fetch(`${apiHost}/api/game/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ game_id: 'pkPoints', score: this.gameData.pkPoints })
        }).catch(() => {});

        fetch(`${apiHost}/api/game/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ game_id: 'coins', score: this.gameData.coins })
        }).catch(() => {});

        fetch(`${apiHost}/api/game/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ game_id: 'level', score: this.gameData.level })
        }).catch(() => {});

      } catch (e) {
        console.error('云端存档同步失败', e);
      }
    }

    this.updateBaseUI();
  }

  updateBaseUI() {
    // 渲染主页及小面板内的金币数
    const fCoins = document.getElementById('farm-coins');
    const hCoins = document.getElementById('home-coins');
    const fLevel = document.getElementById('farm-level');
    const fExp = document.getElementById('farm-exp');
    const bCoins = document.querySelector('#modal-bag .bag-coins-val');
    
    if (fCoins) fCoins.textContent = this.gameData.coins;
    if (hCoins) hCoins.textContent = this.gameData.coins;
    if (fLevel) fLevel.textContent = this.gameData.level;
    if (fExp) fExp.textContent = this.gameData.exp;
    if (bCoins) bCoins.textContent = this.gameData.coins;
  }

  initGameSystems() {
    this.gameData = this.getInitialGameData();

    // 1. 加载存档
    this.loadGameData();

    // 2. 在线时间与经验累加 (每分钟 +1 经验)
    setInterval(() => {
      this.gameData.onlineTime++;
      if (this.gameData.onlineTime % 60 === 0) {
        this.gameData.exp += 15; // 满 1分钟 +15 经验
        if (this.gameData.exp >= 100) {
          this.gameData.level++;
          this.gameData.exp -= 100;
          this.playCustomSound(523.25, 0.4, 'triangle', 0.1); // 升级音效
        }
        this.saveGameData();
      }
    }, 1000);

    // 3. 拦截 3D 游玩中的特定动作更新任务
    window.addEventListener('spawn-ball', () => {
      this.updateTaskProgress('kick', 1);
    });

    // 4. 注册 Modal 开启刷新监听器
    window.addEventListener('modal-opened', (e) => {
      const id = e.detail.modalId;
      if (id === 'leaderboard') this.refreshLeaderboard();
      if (id === 'tasks') this.refreshTasks();
      if (id === 'farm') this.refreshFarm();
      if (id === 'pk') this.refreshPK();
      if (id === 'bag') this.refreshBag();
      if (id === 'home') this.refreshHome();
      if (id === 'shop') {
        this.updateShopCoins();
        this.renderShopItems(this.getActiveShopTab());
      }
    });

    // 5. 初始化子模块事件绑定
    this.initLeaderboardUI();
    this.initTasksUI();
    this.initFarmUI();
    this.initPKUI();
    this.initBagUI();
    this.initHomeUI();
    this.initMapUI();
    this.initShopUI();
    this.initRadialSeedMenu();

    // 6. 自动状态恢复 (URL modal/action 继承) 与 PK 自动开启
    const urlParams = new URLSearchParams(window.location.search);
    const modalParam = urlParams.get('modal');
    if (modalParam && this.modalMgr) {
      setTimeout(() => {
        this.modalMgr.openModal(modalParam);
      }, 500);
    }

    const actionParam = urlParams.get('action');
    if (actionParam === 'edit') {
      setTimeout(() => {
        this.enterHomeEditMode();
      }, 500);
    }

    if (this.currentMap === 'pk_arena') {
      setTimeout(() => {
        if (this.modalMgr) {
          this.modalMgr.openModal('pk'); // 进入竞技场自动打开匹配房间面板
        }
      }, 500);
    }

    // 7. 在 DOM 节点创建作物气泡层容器 (只有在农场页面才需要)
    if (this.currentMap === 'farm') {
      const container = document.createElement('div');
      container.id = 'farm-bubbles-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '10';
      document.body.appendChild(container);
    }

    // 8. 绑定踢球/抱球/躺下任务监听
    window.addEventListener('kick-sound', () => {
      this.updateTaskProgress('kick', 1);
    });

    // 9. 小屋场景已放置家具加载绘制与出门传送选择绑定
    if (this.currentMap === 'house') {
      if (typeof this.renderHomeFurnitures === 'function') {
        this.renderHomeFurnitures();
      }
      this.initExitChoicesUI();
    }

    // 10. 注册键盘快捷键监听：B-背包，J-任务，P-排行榜，M-地图/侧边栏
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        if (this.modalMgr) {
          if (this.modalMgr.modals.bag.classList.contains('open')) {
            this.modalMgr.closeModal('bag');
          } else {
            this.modalMgr.closeAllModals();
            this.modalMgr.openModal('bag');
          }
        }
      } else if (key === 'j') {
        e.preventDefault();
        if (this.currentMap === 'farm') {
          if (this.isRadialMenuOpen) {
            this.closeRadialSeedMenu();
          } else {
            this.openRadialSeedMenu();
          }
        } else {
          if (this.modalMgr) {
            if (this.modalMgr.modals.tasks.classList.contains('open')) {
              this.modalMgr.closeModal('tasks');
            } else {
              this.modalMgr.closeAllModals();
              this.modalMgr.openModal('tasks');
            }
          }
        }
      } else if (key === 'p') {
        e.preventDefault();
        if (this.modalMgr) {
          if (this.modalMgr.modals.leaderboard.classList.contains('open')) {
            this.modalMgr.closeModal('leaderboard');
          } else {
            this.modalMgr.closeAllModals();
            this.modalMgr.openModal('leaderboard');
          }
        }
      } else if (key === 'm') {
        e.preventDefault();
        if (this.modalMgr) {
          if (this.modalMgr.modals.map.classList.contains('open')) {
            this.modalMgr.closeModal('map');
          } else {
            this.modalMgr.closeAllModals();
            this.modalMgr.openModal('map');
          }
        }
      } else if (key === 'g') {
        e.preventDefault();
        if (this.modalMgr) {
          if (this.modalMgr.modals.shop.classList.contains('open')) {
            this.modalMgr.closeModal('shop');
          } else {
            this.modalMgr.closeAllModals();
            this.modalMgr.openModal('shop');
          }
        }
      }
    });
  }

  // ==================== 排行榜 (Leaderboard) 逻辑 ====================
  initLeaderboardUI() {
    const tabs = document.querySelectorAll('#modal-leaderboard .tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.refreshLeaderboard(tab.getAttribute('data-tab'));
      });
    });
  }

  getMockLeaderboard(type) {
    const mockNames = ['浮云行者', '琴海微风', '金色沙滩', '椰子冰沙', '派蒙小跟班', '晨曦守护', '月见草', '落樱纷飞', '温馨秋千', '大锤王二'];
    const mockList = [];
    let baseScore = type === 'pkPoints' ? 1000 : (type === 'coins' ? 200 : 1);
    let step = type === 'pkPoints' ? 60 : (type === 'coins' ? 50 : 2);

    for (let i = 0; i < 9; i++) {
      mockList.push({
        username: mockNames[i],
        avatar: '',
        score: baseScore + (9 - i) * step
      });
    }

    // 加入玩家自己
    let myValue = this.gameData.pkPoints;
    if (type === 'coins') myValue = this.gameData.coins;
    if (type === 'level') myValue = this.gameData.level;
    
    const ssoUserStr = localStorage.getItem('sso_user');
    let myName = '您自己';
    let myAvatar = '';
    if (ssoUserStr) {
      try {
        const u = JSON.parse(ssoUserStr);
        myName = u.username;
        myAvatar = u.avatar;
      } catch(e) {}
    }

    mockList.push({
      username: myName,
      avatar: myAvatar,
      score: myValue,
      isMe: true
    });

    mockList.sort((a, b) => b.score - a.score);
    return mockList.slice(0, 10);
  }

  async refreshLeaderboard(tab = 'pkPoints') {
    const listView = document.getElementById('leaderboard-list-view');
    const myRankEl = document.getElementById('leaderboard-my-rank');
    if (!listView) return;

    listView.innerHTML = '<div style="text-align:center; padding: 20px; font-size: 0.85rem; color: var(--text-muted);">数据加载中...</div>';

    const token = localStorage.getItem('sso_access_token');
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';

    let list = [];
    let success = false;

    if (token) {
      try {
        const res = await fetch(`${apiHost}/api/game/leaderboard?game_id=${tab}`).then(r => r.json());
        if (res.success && res.leaderboard && res.leaderboard.length > 0) {
          list = res.leaderboard;
          success = true;
        }
      } catch (e) {
        console.error('加载服务端排行榜失败', e);
      }
    }

    if (!success) {
      list = this.getMockLeaderboard(tab);
    }

    listView.innerHTML = '';
    
    // 获取我自己的用户名
    const ssoUserStr = localStorage.getItem('sso_user');
    let myName = '您自己';
    if (ssoUserStr) {
      try { myName = JSON.parse(ssoUserStr).username; } catch(e) {}
    }

    list.forEach((item, index) => {
      const isMe = item.username === myName || item.isMe;
      const itemEl = document.createElement('div');
      itemEl.className = `leaderboard-item rank-${index + 1}`;
      if (isMe) {
        itemEl.style.background = 'rgba(255, 140, 105, 0.15)';
        itemEl.style.borderColor = 'rgba(255, 140, 105, 0.3)';
      }
      
      const avatarUrl = item.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Ccircle cx="12" cy="8" r="4"%3E%3C/circle%3E%3Cpath d="M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z"%3E%3C/path%3E%3C/svg%3E';
      const suffix = tab === 'pkPoints' ? ' 积分' : (tab === 'coins' ? ' 金币' : ' 级');
      
      itemEl.innerHTML = `
        <div class="leaderboard-rank" style="font-weight: bold; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${index + 1}</div>
        <img class="leaderboard-avatar" src="${avatarUrl}" alt="头像" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.2);">
        <div class="leaderboard-name" style="flex: 1; margin-left: 10px; font-size: 0.9rem; font-weight: 600;">${item.username}</div>
        <div class="leaderboard-score" style="font-size: 0.95rem; font-weight: bold; color: var(--primary);">${item.score}${suffix}</div>
      `;
      listView.appendChild(itemEl);
    });

    let myValue = this.gameData.pkPoints;
    if (tab === 'coins') myValue = this.gameData.coins;
    if (tab === 'level') myValue = this.gameData.level;

    let myRank = '未上榜';
    const foundIdx = list.findIndex(item => item.username === myName || item.isMe);
    if (foundIdx !== -1) {
      myRank = `第 ${foundIdx + 1} 名`;
    }

    if (myRankEl) {
      myRankEl.innerHTML = `
        <span>当前名次: <strong style="color: var(--primary);">${myRank}</strong></span>
        <span style="margin-left: 20px;">我的数值: <strong style="color: var(--secondary);">${myValue}</strong></span>
      `;
    }
  }

  // ==================== 每日任务 (Tasks) 逻辑 ====================
  initTasksUI() {
    const claimChestBtn = document.getElementById('btn-tasks-claim-chest');
    const chestIconBtn = document.getElementById('tasks-chest-btn');

    const handleClaimDailyChest = (e) => {
      e.stopPropagation();
      const completedCount = this.gameData.tasks.filter(t => t.progress >= t.target).length;
      if (completedCount === 5 && !this.gameData.dailyChestClaimed) {
        this.gameData.dailyChestClaimed = true;
        
        // 奖励 300 金币
        this.gameData.coins += 300;
        this.showCoinFloatText(300, e.clientX, e.clientY);

        // 奖励 100 经验
        this.gameData.exp += 100;
        let isLevelUp = false;
        if (this.gameData.exp >= 100) {
          this.gameData.level++;
          this.gameData.exp -= 100;
          isLevelUp = true;
        }

        this.saveGameData();
        this.updateBaseUI();
        this.refreshTasks();

        if (isLevelUp) {
          setTimeout(() => {
            this.playCustomSound(523.25, 0.4, 'triangle', 0.1); // 升级音效
            this.showToast('恭喜升级啦！✨ 等级提升！');
          }, 300);
        } else {
          this.playCustomSound(880, 0.1, 'sine', 0.05);
          setTimeout(() => this.playCustomSound(1200, 0.2, 'sine', 0.05), 100);
        }
      }
    };

    if (claimChestBtn) {
      claimChestBtn.addEventListener('click', handleClaimDailyChest);
    }
    if (chestIconBtn) {
      chestIconBtn.addEventListener('click', handleClaimDailyChest);
    }
  }

  updateTaskProgress(type, amount = 1) {
    let changed = false;
    this.gameData.tasks.forEach(task => {
      if (task.type === type && task.status === 'ongoing') {
        task.progress = Math.min(task.target, task.progress + amount);
        if (task.progress >= task.target) {
          task.status = 'claimable';
        }
        changed = true;
      }
    });
    if (changed) {
      this.saveGameData();
    }
  }

  refreshTasks() {
    const listEl = document.getElementById('tasks-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    // 1. 统计任务完成进度
    const completedCount = this.gameData.tasks.filter(t => t.progress >= t.target).length;
    
    // 2. 更新进度宝箱相关的 DOM 状态
    const progressText = document.getElementById('tasks-progress-text');
    const progressBar = document.getElementById('tasks-progress-bar');
    const chestIconBtn = document.getElementById('tasks-chest-btn');
    const chestTips = document.getElementById('tasks-chest-tips');
    const claimChestBtn = document.getElementById('btn-tasks-claim-chest');

    if (progressText) {
      progressText.textContent = `${completedCount} / 5`;
    }
    if (progressBar) {
      progressBar.style.width = `${(completedCount / 5) * 100}%`;
    }

    if (this.gameData.dailyChestClaimed) {
      if (chestIconBtn) {
        chestIconBtn.textContent = '📦';
        chestIconBtn.style.animation = 'none';
        chestIconBtn.style.cursor = 'default';
      }
      if (chestTips) {
        chestTips.innerHTML = `<span style="color: #4caf50; font-weight: bold;">每日宝箱奖励已领取！📯</span><br><span style="font-size: 0.68rem;">获得了 300金币 + 100经验。明天再来吧！🌟</span>`;
      }
      if (claimChestBtn) {
        claimChestBtn.textContent = '已领取';
        claimChestBtn.disabled = true;
        claimChestBtn.style.background = 'rgba(255,255,255,0.08)';
        claimChestBtn.style.color = 'var(--text-muted)';
        claimChestBtn.style.borderColor = 'transparent';
      }
    } else {
      if (completedCount === 5) {
        if (chestIconBtn) {
          chestIconBtn.textContent = '🎁';
          chestIconBtn.style.animation = 'chestBounce 1.2s infinite alternate ease-in-out';
          chestIconBtn.style.cursor = 'pointer';
        }
        if (chestTips) {
          chestTips.innerHTML = `<span style="color: #ffd700; font-weight: bold;">今日任务已全部达成！✨</span><br><span style="font-size: 0.68rem; color: #fff;">快点击宝箱或下方按钮领取额外大奖！</span>`;
        }
        if (claimChestBtn) {
          claimChestBtn.textContent = '开启宝箱';
          claimChestBtn.disabled = false;
          claimChestBtn.style.background = 'linear-gradient(135deg, #ffd700 0%, #ff9800 100%)';
          claimChestBtn.style.color = '#000';
          claimChestBtn.style.borderColor = '#ffd700';
        }
      } else {
        if (chestIconBtn) {
          chestIconBtn.textContent = '🎁';
          chestIconBtn.style.animation = 'none';
          chestIconBtn.style.cursor = 'default';
        }
        if (chestTips) {
          chestTips.textContent = '完成今日全部 5 个任务即可开启宝箱，获得 300 金币与 100 经验！';
        }
        if (claimChestBtn) {
          claimChestBtn.textContent = '未达成';
          claimChestBtn.disabled = true;
          claimChestBtn.style.background = 'rgba(255,255,255,0.04)';
          claimChestBtn.style.color = 'var(--text-muted)';
          claimChestBtn.style.borderColor = 'transparent';
        }
      }
    }

    this.gameData.tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card-item ${task.status === 'claimed' ? 'task-completed' : ''}`;
      
      let btnHtml = '';
      if (task.status === 'ongoing') {
        btnHtml = `<button class="task-btn-action" data-action="go" data-type="${task.type}">去完成</button>`;
      } else if (task.status === 'claimable') {
        btnHtml = `<button class="task-btn-action task-btn-claim" data-action="claim" data-id="${task.id}">领取奖励</button>`;
      } else {
        btnHtml = `<button class="task-btn-action task-btn-done">已领取</button>`;
      }

      const progressPercent = Math.min(100, Math.floor((task.progress / task.target) * 100));

      card.innerHTML = `
        <div class="task-meta">
          <span class="task-title">${task.name}</span>
          <span class="task-reward">🎁 +${task.reward}金币</span>
        </div>
        <div class="task-progress-wrap" style="margin-top: 10px;">
          <div class="task-progress-bar">
            <div class="task-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span class="task-progress-text">${task.progress}/${task.target}</span>
          ${btnHtml}
        </div>
      `;

      // 绑定领取和去完成逻辑
      const claimBtn = card.querySelector('.task-btn-claim');
      if (claimBtn) {
        claimBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.claimTaskReward(task.id, e.clientX, e.clientY);
        });
      }

      const goBtn = card.querySelector('.task-btn-action[data-action="go"]');
      if (goBtn) {
        goBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.modalMgr.closeAllModals();
          
          if (task.type === 'game_billiards') {
            // 自动拉起台球
            const billiard = siteConfig.games.find(g => g.id === 'billiards');
            if (billiard) this.modalMgr.launchGame(billiard);
            this.updateTaskProgress('game_billiards', 1);
          } else if (task.type === 'game_poker') {
            // 自动拉起21点
            const poker = siteConfig.games.find(g => g.id === '21dian');
            if (poker) this.modalMgr.launchGame(poker);
            this.updateTaskProgress('game_poker', 1);
          } else if (task.type === 'kick') {
            this.switchMap('island', new THREE.Vector3(-5.0, 0.7, 5.0));
          } else if (task.type === 'rest') {
            this.switchMap('house', new THREE.Vector3(2.8, 0.22, 4.0));
          } else if (task.type === 'harvest') {
            this.switchMap('farm', new THREE.Vector3(0, 0.7, -8.0));
          }
        });
      }

      listEl.appendChild(card);
    });
  }

  claimTaskReward(taskId, clickX, clickY) {
    const task = this.gameData.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'claimable') return;

    task.status = 'claimed';
    this.gameData.coins += task.reward;
    this.saveGameData();
    this.showCoinFloatText(task.reward, clickX, clickY);
    this.refreshTasks();
  }

  showCoinFloatText(val, clickX, clickY) {
    const el = document.createElement('div');
    el.className = 'coin-float-text';
    
    const x = clickX !== undefined ? clickX : window.innerWidth / 2;
    const y = clickY !== undefined ? clickY : window.innerHeight / 2;
    
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    
    const isPositive = val > 0;
    el.innerHTML = `${isPositive ? '+' : ''}${val} <span style="font-size: 1.1em; margin-left: 2px;">🪙</span>`;
    el.style.color = isPositive ? '#ffd700' : '#ff8a80';
    el.style.textShadow = isPositive ? '0 0 10px rgba(255,215,0,0.6)' : '0 0 10px rgba(255,138,128,0.6)';
    
    document.body.appendChild(el);
    
    // 播放 8-bit 金币音效
    if (isPositive) {
      this.playCustomSound(987.77, 0.08, 'square', 0.03);
      setTimeout(() => this.playCustomSound(1318.51, 0.25, 'square', 0.03), 80);
    } else {
      this.playCustomSound(329.63, 0.15, 'sawtooth', 0.04);
    }
    
    setTimeout(() => {
      el.remove();
    }, 1000);
  }

  showToast(message) {
    let existing = document.querySelector('.mock-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mock-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  triggerPlotInteraction(plotIndex) {
    const plot = this.gameData.farmPlots[plotIndex];
    if (!plot) return;

    if (plot.status === 'empty') {
      this.activePlotIndex = plotIndex;
      this.openRadialSeedMenu();
    } else if (plot.status === 'ready') {
      this.harvestCrop(plotIndex);
    } else {
      const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
      const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
      const remaining = Math.max(0, matureTime - elapsed);
      const cropName = plot.seedId === 'sunflower_seed' ? '向日葵' : '草莓';
      this.showToast(`${cropName} 正在生长中，还需等待 ${remaining} 秒 ⏳`);
    }
  }

  // ==================== 我的农田 (Farm) 逻辑 ====================
  initFarmUI() {
    this.refreshFarm();
  }

  refreshFarm() {
    const grid = document.getElementById('farm-grid');
    if (!grid) return;

    grid.innerHTML = '';
    this.gameData.farmPlots.forEach((plot, index) => {
      const el = document.createElement('div');
      el.className = 'farm-plot';
      
      if (!plot.unlocked) {
        el.classList.add('locked');
        el.innerHTML = `
          <div style="font-size: 1.5rem; opacity: 0.4;">🔒</div>
          <span style="font-size: 0.65rem; color: #ff8a80; margin-top: 4px;">未解锁</span>
        `;
      } else if (plot.status === 'empty') {
        el.innerHTML = `
          <div style="font-size: 1.8rem; color: #2ecc71;">➕</div>
          <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">空地</span>
        `;
        el.addEventListener('click', () => {
          this.activePlotIndex = index;
          this.openRadialSeedMenu();
        });
      } else {
        const isReady = plot.status === 'ready';
        const icon = plot.seedId === 'sunflower_seed' ? '🌻' : '🍓';
        const cropName = plot.seedId === 'sunflower_seed' ? '向日葵' : '草莓';
        
        let timerHtml = '';
        if (!isReady) {
          const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
          const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
          const remaining = Math.max(0, matureTime - elapsed);
          timerHtml = `<span class="plot-crop-timer">⏳ ${remaining}s</span>`;
        } else {
          timerHtml = `<span class="plot-crop-ready">🌾 可收割</span>`;
        }

        el.innerHTML = `
          <span class="plot-crop-icon">${icon}</span>
          <span class="plot-crop-name">${cropName}</span>
          ${timerHtml}
        `;

        if (isReady) {
          el.addEventListener('click', () => {
            this.harvestCrop(index);
          });
        }
      }

      grid.appendChild(el);
    });
  }

  buyAndPlant(seedId) {
    const cost = seedId === 'sunflower_seed' ? 10 : 20;
    if (this.gameData.coins < cost) {
      alert('金币不足，无法购买种子！');
      return;
    }

    this.gameData.coins -= cost;
    const plot = this.gameData.farmPlots[this.activePlotIndex];
    plot.status = 'growing';
    plot.seedId = seedId;
    plot.plantTime = Date.now();
    
    this.saveGameData();
    document.getElementById('sub-modal-seed-shop').style.display = 'none';
    if (this.player) {
      this.player.controlsLocked = false;
    }
    this.refreshFarm();

    // 播放种植成功音效
    this.playCustomSound(330, 0.25, 'sine', 0.1);

    // 重新在 3D 中渲染植物实体
    this.recreateCrop3D(this.activePlotIndex);

    // 飘字提示
    const cropName = seedId === 'sunflower_seed' ? '向日葵' : '草莓';
    this.showToast(`成功播种了 ${cropName} 种子 🌱`);
  }

  harvestCrop(plotIndex) {
    const plot = this.gameData.farmPlots[plotIndex];
    if (!plot || plot.status !== 'ready') return;

    const cropId = plot.seedId === 'sunflower_seed' ? 'sunflower_crop' : 'strawberry_crop';
    const cropName = plot.seedId === 'sunflower_seed' ? '新鲜向日葵' : '多汁草莓';
    const seedType = plot.seedId;
    const rewardExp = plot.seedId === 'sunflower_seed' ? 15 : 35;

    // 清空格子
    plot.status = 'empty';
    plot.seedId = null;
    plot.plantTime = 0;

    // 放入背包
    const bagItem = this.gameData.backpack.find(item => item.id === cropId);
    if (bagItem) {
      bagItem.count++;
    } else {
      this.gameData.backpack.push({
        id: cropId,
        name: cropName,
        type: 'collect',
        count: 1,
        quality: seedType === 'sunflower_seed' ? 'green' : 'blue',
        desc: `在自家农田收获的优质作物，可直接在背包中出售以换取游戏币。`
      });
    }

    // 增加经验
    this.gameData.exp += rewardExp;
    if (this.gameData.exp >= 100) {
      this.gameData.level++;
      this.gameData.exp -= 100;
      this.playCustomSound(523.25, 0.4, 'triangle', 0.1); // 升级音效
    }

    this.saveGameData();
    this.refreshFarm();
    this.updateTaskProgress('harvest', 1);

    // 播放收获音效并清空 3D 挂载点
    this.playCustomSound(440, 0.2, 'sine', 0.1);
    this.recreateCrop3D(plotIndex);

    // 飘字提示
    const shortName = seedType === 'sunflower_seed' ? '向日葵' : '草莓';
    this.showToast(`成功收割了 ${shortName} 🌾！已存入背包`);
  }

  recreateCrop3D(plotIndex) {
    if (!this.farmPlots3D) return;
    const plot3D = this.farmPlots3D[plotIndex];
    if (!plot3D) return;

    plot3D.plantGroup.clear(); // 清空

    const plot = this.gameData.farmPlots[plotIndex];
    if (plot.status === 'empty' || !plot.seedId) return;

    // 根据作物种类生成 3D 植物实体
    const plant = new THREE.Group();
    const isSunflower = plot.seedId === 'sunflower_seed';

    if (isSunflower) {
      // 向日葵 (Low-poly)
      // 茎
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6);
      const greenMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
      const stem = new THREE.Mesh(stemGeo, greenMat);
      stem.position.y = 0.35;
      stem.castShadow = true;
      plant.add(stem);

      // 花盘
      const headGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8);
      const yellowMat = new THREE.MeshLambertMaterial({ color: 0xffeb3b });
      const head = new THREE.Mesh(headGeo, yellowMat);
      head.position.set(0, 0.7, 0.05);
      head.rotation.x = Math.PI / 4; // 微倾斜
      plant.add(head);

      const centerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 8);
      const brownMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
      const center = new THREE.Mesh(centerGeo, brownMat);
      center.position.set(0, 0.72, 0.07);
      center.rotation.x = Math.PI / 4;
      plant.add(center);
    } else {
      // 草莓
      // 绿座
      const leafGeo = new THREE.BoxGeometry(0.25, 0.04, 0.25);
      const greenMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
      const leaf = new THREE.Mesh(leafGeo, greenMat);
      leaf.position.y = 0.04;
      plant.add(leaf);

      // 红色果实 (Cone)
      const fruitGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
      const redMat = new THREE.MeshLambertMaterial({ color: 0xff1744 });
      const fruit = new THREE.Mesh(fruitGeo, redMat);
      fruit.rotation.x = Math.PI; // 倒挂
      fruit.position.y = 0.25;
      fruit.castShadow = true;
      plant.add(fruit);
    }

    plot3D.plantGroup.add(plant);
    if (plot.status === 'ready') {
      plot3D.plantGroup.scale.set(1.0, 1.0, 1.0);
    } else {
      plot3D.plantGroup.scale.set(0.15, 0.15, 0.15); // 初始为幼苗
    }
  }

  // ==================== PK 匹配大厅逻辑 ====================
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
        alert('正在努力创建房间中... 暂无其他联机对手，已为您指派了机器人。');
        this.modalMgr.closeAllModals();
        this.triggerPKMatching();
      });
    }

    // 攻击按钮点击 (移动端)
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

    // 键盘 J 键与鼠标左键点击攻击
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'j') {
        this.playerPerformAttack();
      }
    });

    window.addEventListener('mousedown', (e) => {
      // 必须是鼠标左键点击，PK 必须是激活状态，且没有点中任何 UI 容器
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

  refreshPK() {
    const pointsVal = document.getElementById('pk-points-val');
    const badgeEl = document.getElementById('pk-rank-badge');
    const winRateEl = document.getElementById('pk-win-rate');
    const totalEl = document.getElementById('pk-total-battles');

    if (pointsVal) pointsVal.textContent = this.gameData.pkPoints;
    
    // 段位判定
    const pts = this.gameData.pkPoints;
    let rankName = '🥉 皇家青铜';
    if (pts >= 1200 && pts < 1500) rankName = '🥈 璀璨白银';
    if (pts >= 1500 && pts < 1800) rankName = '🥇 荣耀黄金';
    if (pts >= 1800) rankName = '👑 傲世战神';

    if (badgeEl) badgeEl.textContent = rankName;

    const total = this.gameData.pkWins + this.gameData.pkLoses;
    if (totalEl) totalEl.textContent = total;
    if (winRateEl) {
      const rate = total > 0 ? Math.floor((this.gameData.pkWins / total) * 100) : 0;
      winRateEl.textContent = `${rate}%`;
    }

    // 刷新房间列表
    const roomList = document.getElementById('room-list');
    if (roomList) {
      roomList.innerHTML = `
        <div class="room-card">
          <span>🎮 浮空挑战赛房 #102</span>
          <span style="color: #2ecc71;">在线匹配中...</span>
        </div>
        <div class="room-card">
          <span>🤖 人机搏击训练室 #001</span>
          <span style="color: var(--primary);">常驻训练</span>
        </div>
      `;
    }
  }

  triggerPKMatching() {
    const radar = document.getElementById('radar-overlay');
    if (!radar) return;

    radar.style.display = 'flex';
    this.modalMgr.closeAllModals();

    this.radarTimerVal = 0;
    const timerText = document.getElementById('radar-timer');
    if (timerText) timerText.textContent = '0';

    this.matchingInterval = setInterval(() => {
      this.radarTimerVal++;
      if (timerText) timerText.textContent = this.radarTimerVal;

      if (this.radarTimerVal >= 3) {
        // 3秒后保底进入机器人对决
        this.cancelPKMatching();
        this.startPKMatch(true); // true 代表机器人对决
      }
    }, 1000);
  }

  cancelPKMatching() {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
    const radar = document.getElementById('radar-overlay');
    if (radar) radar.style.display = 'none';
  }

  startPKMatch(isRobot = true) {
    if (this.currentMap !== 'pk_arena') {
      this.switchMap('pk_arena');
      return;
    }

    // 强制退出家园编辑模式，防止UI和状态在PK大厅中重叠
    if (this.isHomeBuildActive || (document.getElementById('home-edit-hud') && document.getElementById('home-edit-hud').style.display === 'flex')) {
      this.exitHomeEditMode(false);
    }

    this.isPKActive = true;
    this.pkOpponentType = isRobot ? 'robot' : 'player';

    // 建立 PK 平台 3D 实例
    if (!this.pkArenaColliders || this.pkArenaColliders.length === 0) {
      this.buildPKPlatform();
    }

    if (this.player) {
      this.player.colliders = this.pkArenaColliders || [];
    }

    // 隐藏决斗水晶并清除其交互，防止战斗中误触
    if (this.pkCrystalMesh) this.pkCrystalMesh.visible = false;
    this.interactMgr.generator = { interactables: [] };

    // 显示 PK 专用的 HUD 节点
    document.getElementById('pk-hud').style.display = 'flex';
    
    // 初始化血量
    this.playerHP = 100;
    this.opponentHP = 100;
    this.updatePKHPUI();

    // 清除玩家装备并移除3D幽灵武器，确保必须去武器架重新拿取
    this.playerEquippedWeapon = null;
    if (this.playerWeapon3D) {
      this.player.group.remove(this.playerWeapon3D);
      this.playerWeapon3D = null;
    }
    this.activeBombs = [];
    this.activeExplosions = [];
    this.bombCooldownActive = false;
    const parentAtkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
    if (parentAtkBtn) parentAtkBtn.style.display = 'none';

    // 开启调试面板
    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      debugEl.style.display = 'block';
      debugEl.textContent = '准备战斗，请先走向擂台周边的武器架拾取武器...';
    }

    // 生成机器人 3D 实例
    if (isRobot) {
      if (this.opponent3D) {
        this.pkArenaGroup.remove(this.opponent3D);
        this.opponent3D = null;
      }
      const robotGroup = new THREE.Group();
      
      // 头部
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
      head.position.y = 1.35;
      robotGroup.add(head);

      // 身体
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
      body.position.y = 0.8;
      robotGroup.add(body);

      // 脚
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8);
      const legL = new THREE.Mesh(legGeo, new THREE.MeshLambertMaterial({ color: 0x34495e }));
      legL.position.set(-0.16, 0.225, 0);
      robotGroup.add(legL);

      const legR = legL.clone();
      legR.position.x = 0.16;
      robotGroup.add(legR);

      robotGroup.position.set(5.5, 0.6, 0);
      this.pkArenaGroup.add(robotGroup);

      this.opponent3D = robotGroup;
      this.opponentVelocity = new THREE.Vector3(0,0,0);
      this.opponentIsGrounded = true;
      this.opponentEquippedWeapon = 'sword'; // 机器人默认持剑

      // 给机器人画个剑
      const sword = this.createSword3D();
      sword.position.set(0.35, 0.8, 0.1);
      sword.rotation.x = Math.PI / 2;
      this.opponent3D.add(sword);
      this.opponentWeapon3D = sword;
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
      const worldPos = position.clone().add(new THREE.Vector3(0, isPlayer ? 1.0 : 1.3, 0));
      worldPos.project(this.camera);
      const screenX = (worldPos.x * .5 + .5) * window.innerWidth;
      const screenY = (-(worldPos.y * .5) + .5) * window.innerHeight;
      bubble.style.left = `${screenX}px`;
      bubble.style.top = `${screenY}px`;
    };
    updatePos();

    setTimeout(() => {
      bubble.classList.add('fade-up');
    }, 30);

    setTimeout(() => {
      bubble.remove();
    }, 750);
  }

  showScreenFlash() {
    let flash = document.getElementById('player-hurt-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'player-hurt-flash';
      document.body.appendChild(flash);
    }
    flash.style.opacity = '1';
    setTimeout(() => {
      flash.style.opacity = '0';
    }, 120);
  }

  playerPerformAttack() {
    if (!this.isPKActive || this.playerHP <= 0 || !this.playerEquippedWeapon) return;

    if (this.playerEquippedWeapon === 'bomb') {
      if (this.bombCooldownActive) {
        this.playCustomSound(150, 0.1, 'sine', 0.1);
        if (window.showMockToast) {
          let existing = document.querySelector('.mock-toast');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.className = 'mock-toast';
          toast.textContent = `炸弹正在冷却中！💣`;
          document.body.appendChild(toast);

          setTimeout(() => toast.classList.add('show'), 50);
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }, 1200);
        }
        return;
      }
      
      this.triggerBombCooldown();
      this.throwBomb();
    } else {
      // 物理攻击动画动作（近战武器）
      if (this.playerWeapon3D) {
        this.playerWeapon3D.rotation.z = -Math.PI / 2;
        setTimeout(() => {
          if (this.playerWeapon3D) this.playerWeapon3D.rotation.z = 0;
        }, 150);
      }
      this.playCustomSound(260, 0.1, 'triangle', 0.15);
      this.performMeleeAttack();
    }
  }

  performMeleeAttack() {
    // 伤害与碰撞判定
    const playerPos = this.player.position;
    const oppPos = this.opponent3D.position;
    
    // 平面 XZ 轴距离算法，排除高度差，拓宽打击角度
    const dx = playerPos.x - oppPos.x;
    const dz = playerPos.z - oppPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    console.log(`[PK Damage Check] Player: (${playerPos.x.toFixed(2)}, ${playerPos.z.toFixed(2)}), Robot: (${oppPos.x.toFixed(2)}, ${oppPos.z.toFixed(2)}), Plane Distance: ${distance.toFixed(2)}`);

    if (distance <= 4.5) {
      // 伤害值判定
      let dmg = 20;
      let knockbackForce = 1.8;

      if (this.playerEquippedWeapon === 'sword') {
        dmg = 20;
        knockbackForce = 2.0;
      } else if (this.playerEquippedWeapon === 'hammer') {
        dmg = 10;
        knockbackForce = 7.5; // 大锤击飞！
      }

      this.opponentHP = Math.max(0, this.opponentHP - dmg);
      this.updatePKHPUI();

      // 飘血伤害反馈
      this.playDamageBubble(oppPos, dmg, false);

      // 机器人受击闪红特效
      if (this.opponent3D) {
        this.opponent3D.traverse(child => {
          if (child.isMesh && child.material) {
            if (child.userData.origColor === undefined) {
              child.userData.origColor = child.material.color.getHex();
            }
            child.material.color.setHex(0xff3333);
          }
        });
        setTimeout(() => {
          if (this.opponent3D) {
            this.opponent3D.traverse(child => {
              if (child.isMesh && child.material && child.userData.origColor !== undefined) {
                child.material.color.setHex(child.userData.origColor);
              }
            });
          }
        }, 150);
      }

      // 受击击退冲量
      const direction = new THREE.Vector3().subVectors(oppPos, playerPos).normalize();
      direction.y = 0.4; // 微微上浮
      this.opponentVelocity.addScaledVector(direction, knockbackForce * 2.8);

      // 受击声效
      this.playCustomSound(120, 0.15, 'sawtooth', 0.1);

      if (this.opponentHP <= 0) {
        this.endPKBattle(true);
      }
    } else {
      console.log(`[PK Damage Check] MISS - Distance ${distance.toFixed(2)}m is greater than 4.5m`);
      const debugEl = document.getElementById('pk-debug-info');
      if (debugEl) {
        const missSpan = document.createElement('span');
        missSpan.style.color = '#ff5722';
        missSpan.style.fontWeight = 'bold';
        missSpan.style.marginLeft = '10px';
        missSpan.textContent = '[MISS - 距离过远]';
        debugEl.appendChild(missSpan);
        setTimeout(() => missSpan.remove(), 1200);
      }
    }
  }

  triggerBombCooldown() {
    this.bombCooldownActive = true;
    let cdLeft = 5;
    
    const parentAttackBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
    
    const updateCDUI = () => {
      if (parentAttackBtn) {
        parentAttackBtn.disabled = true;
        parentAttackBtn.style.opacity = '0.5';
        parentAttackBtn.innerHTML = `<span style="font-size: 1.1rem; font-weight: bold; color: #ffeb3b; font-family: system-ui; display: flex; align-items: center; justify-content: center;">💣 ${cdLeft}s</span>`;
      }
    };

    updateCDUI();

    const cdInterval = setInterval(() => {
      // 若倒计时期间玩家换了武器，则终止定时器并将按钮状态恢复（新武器不需要 CD）
      if (this.playerEquippedWeapon !== 'bomb') {
        clearInterval(cdInterval);
        this.bombCooldownActive = false;
        if (parentAttackBtn) {
          parentAttackBtn.disabled = false;
          parentAttackBtn.style.opacity = '1';
        }
        return;
      }

      cdLeft--;
      if (cdLeft <= 0) {
        clearInterval(cdInterval);
        this.bombCooldownActive = false;
        
        // 恢复武器可见
        if (this.playerEquippedWeapon === 'bomb' && this.playerWeapon3D) {
          this.playerWeapon3D.visible = true;
        }

        if (parentAttackBtn) {
          parentAttackBtn.disabled = false;
          parentAttackBtn.style.opacity = '1';
          parentAttackBtn.innerHTML = `
<svg style="display: flex;" class="lucide lucide-bomb" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="13" r="9" />
  <path d="m19.5 4.5-3.5 3.5" />
  <path d="m21 3-2.5 2.5" />
  <path d="M19 8.5c.5-.5 1-1.5.5-2.5-.5-.5-1.5 0-2 .5" />
</svg>`;
        }
      } else {
        updateCDUI();
      }
    }, 1000);
  }

  throwBomb() {
    if (!this.player) return;

    this.playCustomSound(350, 0.1, 'sine', 0.1);

    if (this.playerWeapon3D) {
      this.playerWeapon3D.visible = false;
    }

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.group.quaternion).normalize();
    const bombMesh = this.createBomb3D();
    
    const spawnPos = this.player.position.clone().add(forward.clone().multiplyScalar(0.5));
    spawnPos.y += 1.0;
    bombMesh.position.copy(spawnPos);
    
    this.scene.add(bombMesh);

    const throwSpeed = 9.0;
    const velocity = forward.clone().multiplyScalar(throwSpeed);
    velocity.y = 4.0; // 向上抛出初速度

    const bombObj = {
      mesh: bombMesh,
      velocity: velocity,
      position: spawnPos,
      timeElapsed: 0,
      maxLifetime: 1.5
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
      bomb.position.addScaledVector(bomb.velocity, delta);
      bomb.mesh.position.copy(bomb.position);

      bomb.mesh.rotation.x += 0.05;
      bomb.mesh.rotation.y += 0.05;

      let triggerExplode = false;

      if (bomb.position.y <= platformY) {
        const distToCenter = Math.sqrt(bomb.position.x * bomb.position.x + bomb.position.z * bomb.position.z);
        if (distToCenter < 8.0) {
          bomb.position.y = platformY;
          triggerExplode = true;
        }
      }

      if (this.opponent3D && !triggerExplode) {
        const oppPos = this.opponent3D.position;
        const distToOpp = bomb.position.distanceTo(oppPos);
        if (distToOpp < 0.8) {
          triggerExplode = true;
        }
      }

      if (bomb.timeElapsed >= bomb.maxLifetime) {
        triggerExplode = true;
      }

      if (triggerExplode) {
        this.explodeBomb(bomb.position);
        this.scene.remove(bomb.mesh);
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

    if (this.opponent3D && this.isPKActive) {
      const oppPos = this.opponent3D.position;
      const distance = position.distanceTo(oppPos);
      const explosionRadius = 3.5;

      if (distance <= explosionRadius) {
        const dmg = 50;
        
        const knockbackDir = oppPos.clone().sub(position);
        knockbackDir.y = 0;
        knockbackDir.normalize();
        
        const knockbackForce = 6.0;
        this.opponentVelocity.addScaledVector(knockbackDir, knockbackForce);
        this.opponentVelocity.y = 3.5;
        this.opponentIsGrounded = false;

        this.opponentHP = Math.max(0, this.opponentHP - dmg);
        this.updatePKHPUI();

        this.playDamageBubble(oppPos, dmg, false);

        this.opponent3D.traverse(child => {
          if (child.isMesh && child.material) {
            if (child.userData.origColor === undefined) {
              child.userData.origColor = child.material.color.getHex();
            }
            child.material.color.setHex(0xff3333);
          }
        });
        setTimeout(() => {
          if (this.opponent3D) {
            this.opponent3D.traverse(child => {
              if (child.isMesh && child.material && child.userData.origColor !== undefined) {
                child.material.color.setHex(child.userData.origColor);
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
    const sphereGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffa726,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const fireBall = new THREE.Mesh(sphereGeo, sphereMat);
    fireBall.position.copy(position);
    this.scene.add(fireBall);

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

    const particleCount = 12;
    const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const particleColors = [0xff3d00, 0xffc107, 0x757575];
    
    for (let i = 0; i < particleCount; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const partMat = new THREE.MeshLambertMaterial({ 
        color: color, 
        transparent: true,
        opacity: 0.9,
        flatShading: true
      });
      const particle = new THREE.Mesh(particleGeo, partMat);
      particle.position.copy(position);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      this.scene.add(particle);

      const partObj = {
        mesh: particle,
        type: 'particle',
        velocity: velocity,
        opacity: 0.9,
        rotationSpeed: new THREE.Vector3(
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
        
        exp.mesh.scale.set(exp.scale, exp.scale, exp.scale);
        exp.mesh.material.opacity = Math.max(0, exp.opacity);

        if (exp.opacity <= 0) {
          this.scene.remove(exp.mesh);
          exp.mesh.geometry.dispose();
          exp.mesh.material.dispose();
          this.activeExplosions.splice(i, 1);
        }
      } else if (exp.type === 'particle') {
        exp.velocity.y -= gravity * delta;
        exp.mesh.position.addScaledVector(exp.velocity, delta);
        
        exp.mesh.rotation.x += exp.rotationSpeed.x * delta;
        exp.mesh.rotation.y += exp.rotationSpeed.y * delta;
        exp.mesh.rotation.z += exp.rotationSpeed.z * delta;

        exp.opacity -= 1.8 * delta;
        exp.mesh.material.opacity = Math.max(0, exp.opacity);

        if (exp.opacity <= 0) {
          this.scene.remove(exp.mesh);
          exp.mesh.geometry.dispose();
          exp.mesh.material.dispose();
          this.activeExplosions.splice(i, 1);
        }
      }
    }
  }

  endPKBattle(isPlayerWinner = true) {
    if (!this.isPKActive) return;
    this.isPKActive = false;

    // 立即重置玩家位置和速度，防止结算时在物理上无限下坠
    if (this.player) {
      this.player.position.set(0, 0.6 + 0.1, -6.0);
      this.player.velocity.set(0, 0, 0);
      this.player.group.position.copy(this.player.position);
    }

    // 恢复决斗水晶可见
    if (this.pkCrystalMesh) this.pkCrystalMesh.visible = true;

    // 清除武器 HUD
    const parentAtkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
    if (parentAtkBtn) parentAtkBtn.style.display = 'none';

    // 计算分数变化
    let scoreChange = isPlayerWinner ? 20 : -10;
    if (this.gameData.pkPoints + scoreChange < 0) scoreChange = -this.gameData.pkPoints;

    this.gameData.pkPoints += scoreChange;
    if (isPlayerWinner) this.gameData.pkWins++;
    else this.gameData.pkLoses++;

    this.saveGameData();

    // 弹出毛玻璃结算面板
    const title = isPlayerWinner ? '🎉 荣耀胜利！' : '💀 惜败对手';
    const sub = isPlayerWinner ? `成功击败挑战者，天梯积分 +20！` : `不幸败于挑战者，天梯积分 -10。`;

    const settlement = document.createElement('div');
    settlement.style.position = 'fixed';
    settlement.style.inset = '0';
    settlement.style.zIndex = '500';
    settlement.style.background = 'rgba(15,17,21,0.85)';
    settlement.style.backdropFilter = 'blur(20px)';
    settlement.style.webkitBackdropFilter = 'blur(20px)';
    settlement.style.display = 'flex';
    settlement.style.alignItems = 'center';
    settlement.style.justifyContent = 'center';
    settlement.style.color = 'white';

    settlement.innerHTML = `
      <div class="modal-card settle-card">
        <h2 class="settle-title" style="color: ${isPlayerWinner ? '#d97706' : '#e74c3c'};">${title}</h2>
        <p class="settle-desc">${sub}</p>
        <div class="settle-score-box">
          <span>当前天梯积分: <strong class="settle-score-val">${this.gameData.pkPoints}</strong></span>
        </div>
        <div class="settle-buttons">
          <button class="hud-btn settle-btn-action" id="btn-settle-retry">继续挑战 ⚔️</button>
          <button class="hud-btn settle-btn-secondary" id="btn-settle-close">返回群岛 🏝️</button>
        </div>
      </div>
    `;

    document.body.appendChild(settlement);

    // 通知外壳隐藏 HUD 遮挡
    if (window.parent && window.parent.appShell && typeof window.parent.appShell.onModalOpened === 'function') {
      window.parent.appShell.onModalOpened('pk_settle');
    }

    const closeBtn = settlement.querySelector('#btn-settle-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settlement.remove();
        if (window.parent && window.parent.appShell && typeof window.parent.appShell.onModalClosed === 'function') {
          window.parent.appShell.onModalClosed('pk_settle');
        }
        this.switchMap('island');
        document.getElementById('pk-hud').style.display = 'none';
        if (document.getElementById('pk-debug-info')) {
          document.getElementById('pk-debug-info').style.display = 'none';
        }
      });
    }

    const retryBtn = settlement.querySelector('#btn-settle-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        settlement.remove();
        if (window.parent && window.parent.appShell && typeof window.parent.appShell.onModalClosed === 'function') {
          window.parent.appShell.onModalClosed('pk_settle');
        }
        // 重新开启战斗匹配
        this.startPKMatch(true);
      });
    }
  }

  // ==================== 2D 世界地图 (World Map) 逻辑 ====================
  initMapUI() {
    const nodes = document.querySelectorAll('#modal-map .map-node');
    nodes.forEach(node => {
      node.addEventListener('click', () => {
        const targetMap = node.getAttribute('data-map');
        if (targetMap) {
          // 播放Mario吃金币音效
          this.playCustomSound(440.0, 0.08, 'sine', 0.15);
          setTimeout(() => {
            this.playCustomSound(554.37, 0.08, 'sine', 0.15);
          }, 80);
          
          if (this.modalMgr) {
            this.modalMgr.closeModal('map');
          }
          this.switchMap(targetMap);
        }
      });
    });
  }

  // ==================== 我的背包 (Backpack) 逻辑 ====================
  initBagUI() {
    const tabs = document.querySelectorAll('#modal-bag .bag-tabactive');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.refreshBag(tab.getAttribute('data-tab'));
      });
    });
  }

  refreshBag(tab = 'seed') {
    this.updateBaseUI();
    const grid = document.getElementById('bag-grid');
    const detail = document.getElementById('bag-item-detail');
    if (!grid || !detail) return;

    grid.innerHTML = '';
    
    // 按 Tab 过滤背包数据
    // 兼容之前写在 implementation_plan 里的 tab: seed, decor, collect
    const filtered = this.gameData.backpack.filter(item => item.type === tab);

    // 渲染 10x4 = 40 个格子，如果有物品则放入，没有物品保持空盒
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'bag-item-box';
      
      const item = filtered[i];
      if (item && item.count > 0) {
        const qualityClass = `q-${item.quality || 'white'}`;
        el.classList.add(qualityClass);
        
        let emoji = '📦';
        if (item.id.includes('seed')) emoji = '🌱';
        else if (item.id === 'sunflower_crop') emoji = '🌻';
        else if (item.id === 'strawberry_crop') emoji = '🍓';
        else if (item.id.includes('painting')) emoji = '🖼️';
        else if (item.id.includes('tree')) emoji = '🎄';
        else if (item.id.includes('sofa')) emoji = '🛋️';
        else if (item.id.includes('swing')) emoji = '🎪';

        el.innerHTML = `
          <span style="font-size: 1.8rem;">${emoji}</span>
          <span class="bag-item-count">${item.count}</span>
        `;
        el.addEventListener('click', () => {
          // 清除原有激活
          document.querySelectorAll('.bag-item-box.active').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
          this.showBagItemDetail(item);
        });
      } else {
        el.innerHTML = '';
      }
      grid.appendChild(el);
    }

    // 默认右侧空
    detail.querySelector('.item-detail-empty').style.display = 'flex';
    detail.querySelector('.item-detail-content').style.display = 'none';
  }

  showBagItemDetail(item) {
    const detail = document.getElementById('bag-item-detail');
    const empty = detail.querySelector('.item-detail-empty');
    const content = detail.querySelector('.item-detail-content');

    empty.style.display = 'none';
    content.style.display = 'flex';

    let emoji = '📦';
    if (item.id.includes('seed')) emoji = '🌱';
    else if (item.id === 'sunflower_crop') emoji = '🌻';
    else if (item.id === 'strawberry_crop') emoji = '🍓';
    else if (item.id.includes('painting')) emoji = '🖼️';
    else if (item.id.includes('tree')) emoji = '🎄';
    else if (item.id.includes('sofa')) emoji = '🛋️';
    else if (item.id.includes('swing')) emoji = '🎪';

    const qualityLabelMap = { 'white': '普普通通', 'green': '翠绿新生', 'blue': '蔚蓝奇迹', 'purple': '秘境紫光', 'gold': '傲视至尊' };
    const qClass = `bq-${item.quality || 'white'}`;
    const qText = qualityLabelMap[item.quality || 'white'];

    let useBtnText = '出售';
    let showUse = false;
    let sellPrice = 10;
    if (item.id === 'sunflower_crop') { sellPrice = 20; showUse = false; }
    else if (item.id === 'strawberry_crop') { sellPrice = 45; showUse = false; }
    else if (item.id.includes('seed')) { showUse = true; useBtnText = '去农田种植'; }
    else { showUse = true; useBtnText = '摆放家具'; }

    const showRangeSlider = item.count > 1;
    const rangeSliderHtml = showRangeSlider ? `
      <div class="bag-sell-range-container" style="display: flex; flex-direction: column; gap: 4px; width: 100%; margin-bottom: 6px; padding: 0 10px; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted);">
          <span>选择出售数量</span>
          <span class="range-val" style="font-weight: bold; color: var(--primary);"><strong id="sell-count-label">1</strong> / ${item.count}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
          <button class="bag-range-btn" id="btn-range-minus">-</button>
          <input type="range" id="sell-count-range" min="1" max="${item.count}" value="1" style="flex: 1; height: 6px; background: rgba(0,0,0,0.1); border-radius: 4px; outline: none; cursor: pointer; accent-color: var(--primary);" />
          <button class="bag-range-btn" id="btn-range-plus">+</button>
        </div>
      </div>
    ` : '';

    content.innerHTML = `
      <div style="font-size: 3.5rem; margin-top: 20px;">${emoji}</div>
      <h3 style="font-size: 1.1rem; font-weight: bold; color: white; margin-top: 10px;">${item.name}</h3>
      <span class="bag-right-quality-badge ${qClass}">${qText}</span>
      <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; padding: 0 10px; margin-top: 12px; flex-grow: 1;">${item.desc}</p>
      
      <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top: auto;">
        ${rangeSliderHtml}
        ${showUse ? `<button class="hud-btn" id="btn-bag-use" style="width: 100%; padding: 8px 0; background: rgba(100, 255, 100, 0.15); border-color: rgba(100,255,100,0.3); color: #fff;">${useBtnText}</button>` : ''}
        <button class="hud-btn" id="btn-bag-sell" style="width: 100%; padding: 8px 0; background: rgba(255, 140, 105, 0.1); border-color: rgba(255, 140, 105, 0.3); color: #fff;">出售 (获得 ${sellPrice}金币)</button>
      </div>
    `;

    // 绑定事件
    const sellBtn = content.querySelector('#btn-bag-sell');
    const rangeInput = content.querySelector('#sell-count-range');
    const countLabel = content.querySelector('#sell-count-label');
    const minusBtn = content.querySelector('#btn-range-minus');
    const plusBtn = content.querySelector('#btn-range-plus');
    
    let currentSellCount = 1;

    const updateSellUI = (newVal) => {
      currentSellCount = Math.max(1, Math.min(item.count, newVal));
      if (rangeInput) {
        rangeInput.value = currentSellCount;
      }
      if (countLabel) {
        countLabel.textContent = currentSellCount;
      }
      if (sellBtn) {
        sellBtn.textContent = `出售 (获得 ${currentSellCount * sellPrice}金币)`;
      }
    };

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        updateSellUI(parseInt(e.target.value) || 1);
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSellUI(currentSellCount - 1);
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSellUI(currentSellCount + 1);
      });
    }

    if (sellBtn) {
      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sellBagItem(item.id, sellPrice, currentSellCount, e.clientX, e.clientY);
      });
    }

    const useBtn = content.querySelector('#btn-bag-use');
    if (useBtn) {
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.modalMgr.closeAllModals();
        if (item.id.includes('seed')) {
          this.switchMap('farm', new THREE.Vector3(0, 0.7, -8.0));
        } else {
          // 家具，进入家园编辑
          this.switchMap('house', null, 'home');
        }
      });
    }
  }

  sellBagItem(itemId, price, count, clickX, clickY) {
    const item = this.gameData.backpack.find(i => i.id === itemId);
    if (!item || item.count < count) return;

    item.count -= count;
    const totalGains = price * count;
    this.gameData.coins += totalGains;
    this.saveGameData();
    this.showCoinFloatText(totalGains, clickX, clickY);
    this.refreshBag(document.querySelector('#modal-bag .bag-tabactive.active').getAttribute('data-tab'));
  }

  // ==================== 我的家园 (Home) 逻辑 ====================
  initHomeUI() {
    const editBtn = document.getElementById('btn-enter-edit-mode');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.modalMgr.closeAllModals();
        this.enterHomeEditMode();
      });
    }

    // 编辑 HUD 按钮
    const cancelBtn = document.getElementById('btn-edit-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitHomeEditMode(false);
      });
    }

    const saveBtn = document.getElementById('btn-edit-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitHomeEditMode(true);
      });
    }

    const rotateBtn = document.getElementById('btn-edit-rotate');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotateEditFurniture();
      });
    }

    // R 键旋转快捷键
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r') {
        this.rotateEditFurniture();
      }
    });
  }

  // 出门选择目的地 UI 绑定
  initExitChoicesUI() {
    const exitChoiceBtns = document.querySelectorAll('.exit-choice-btn');
    exitChoiceBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = btn.getAttribute('data-target');
        this.modalMgr.closeModal('exit');
        if (target === 'island') {
          this.switchMap('island');
        } else if (target === 'farm') {
          this.switchMap('farm');
        } else if (target === 'pk') {
          this.switchMap('pk_arena');
        }
      });
    });
  }

  refreshHome() {
    const grid = document.getElementById('furniture-shop-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const furnitures = [
      { id: 'painting_1', type: 'painting', name: '浮空岛日落挂画', price: 50, emoji: '🖼️' },
      { id: 'tree_1', type: 'christmas_tree', name: '闪烁圣诞树', price: 100, emoji: '🎄' },
      { id: 'sofa_1', type: 'rabbit_sofa', name: '粉嫩兔子沙发', price: 150, emoji: '🛋️' },
      { id: 'swing_1', type: 'swing_chair', name: '室内网兜秋千', price: 200, emoji: '🎪' }
    ];

    furnitures.forEach(item => {
      const card = document.createElement('div');
      card.className = 'furniture-shop-card';
      
      const isOwned = this.gameData.ownedFurnitures.includes(item.id);
      let btnHtml = '';
      if (isOwned) {
        btnHtml = `<button class="hud-btn" data-action="place" data-id="${item.id}" style="width: 100%; font-size: 0.75rem; background: rgba(100, 255, 100, 0.15); border-color: rgba(100,255,100,0.3);">摆放家具</button>`;
      } else {
        btnHtml = `<button class="hud-btn" data-action="buy" data-id="${item.id}" style="width: 100%; font-size: 0.75rem;">购买 (${item.price}金币)</button>`;
      }

      card.innerHTML = `
        <div style="font-size: 2.2rem;">${item.emoji}</div>
        <div style="font-size: 0.8rem; font-weight: bold; color: #fff;">${item.name}</div>
        ${btnHtml}
      `;

      // 绑定购买 / 摆放事件
      const buyBtn = card.querySelector('button[data-action="buy"]');
      if (buyBtn) {
        buyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.buyFurniture(item, e.clientX, e.clientY);
        });
      }

      const placeBtn = card.querySelector('button[data-action="place"]');
      if (placeBtn) {
        placeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.modalMgr.closeAllModals();
          this.startPlacingFurniture(item.type, item.id);
        });
      }

      grid.appendChild(card);
    });
  }

  buyFurniture(item, clickX, clickY) {
    if (this.gameData.coins < item.price) {
      alert('金币不足，无法购买该家具！');
      return;
    }

    this.gameData.coins -= item.price;
    this.gameData.ownedFurnitures.push(item.id);
    
    // 放入背包
    this.gameData.backpack.push({
      id: item.id,
      name: item.name,
      type: 'decor',
      count: 1,
      quality: 'purple',
      desc: `购买于家园工坊的精美家具模型。进入家园编辑模式即可随意定位摆放它！`
    });

    this.saveGameData();
    this.refreshHome();
    this.showCoinFloatText(-item.price, clickX, clickY);
  }

  enterHomeEditMode() {
    if (this.currentMap !== 'house') {
      this.switchMap('house', null, null, 'edit');
      return;
    }

    this.isHomeBuildActive = true;
    this.player.controlsLocked = true;
    this.player.resetInputs();

    // 1. 正交/垂直俯看视角调节
    this.cameraSavedState = {
      distance: this.player.cameraDistance,
      angleH: this.player.cameraAngleH,
      angleV: this.player.cameraAngleV,
      position: this.camera.position.clone()
    };

    // 锁定俯视坐标 (在小屋天花板 y = 9.0 俯视 y = 0)
    this.player.cameraDistance = 8.5;
    this.player.cameraAngleV = Math.PI / 2.1; // 几乎垂直俯视
    this.player.cameraAngleH = Math.PI; // 锁定方向

    // 2. 绘制 GridHelper
    this.editGrid = new THREE.GridHelper(12, 24, 0x4fc3f7, 0x444444);
    this.editGrid.position.set(0, 0.13, 5.0); // 浮在木地板上一点点
    this.scene.add(this.editGrid);

    // 3. 打开 HUD
    document.getElementById('home-edit-hud').style.display = 'flex';
  }

  startPlacingFurniture(type, id) {
    this.enterHomeEditMode();

    this.pendingFurnitureId = id;
    this.pendingFurnitureType = type;

    // 创建半透明全息预览体
    this.editPreviewGroup = this.createFurnitureModel(type);
    this.editPreviewGroup.position.set(0, 0.12, 5.0);
    
    // 半透明化所有 Mesh 材质
    this.editPreviewGroup.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.55;
        child.material.color.setHex(0x4fc3f7); // 全息绿光
      }
    });

    this.scene.add(this.editPreviewGroup);
    this.editFurnitureRotationY = 0;
  }

  rotateEditFurniture() {
    if (!this.isHomeBuildActive || !this.editPreviewGroup) return;
    this.editFurnitureRotationY += Math.PI / 2;
    this.editPreviewGroup.rotation.y = this.editFurnitureRotationY;
    this.playCustomSound(400, 0.08, 'sine', 0.05);
  }

  exitHomeEditMode(isSave = true) {
    if (!this.isHomeBuildActive) return;
    this.isHomeBuildActive = false;

    // 1. 恢复 Camera
    if (this.cameraSavedState) {
      this.player.cameraDistance = this.cameraSavedState.distance;
      this.player.cameraAngleH = this.cameraSavedState.angleH;
      this.player.cameraAngleV = this.cameraSavedState.angleV;
      this.player.controlsLocked = false;
    }

    // 2. 移除 Grid
    if (this.editGrid) {
      this.scene.remove(this.editGrid);
      this.editGrid = null;
    }

    // 3. 如果保存，添加家具
    if (isSave && this.editPreviewGroup && this.pendingFurnitureId) {
      const pos = this.editPreviewGroup.position;
      
      // 添加到数据数组
      this.gameData.homeFurnitures.push({
        id: this.pendingFurnitureId + '_' + Date.now(),
        type: this.pendingFurnitureType,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        ry: this.editFurnitureRotationY
      });

      // 扣减背包对应的家具 count
      const bagItem = this.gameData.backpack.find(i => i.id === this.pendingFurnitureId);
      if (bagItem) {
        bagItem.count--;
        if (bagItem.count <= 0) {
          this.gameData.backpack = this.gameData.backpack.filter(i => i.id !== this.pendingFurnitureId);
        }
      }

      this.saveGameData();

      // 在温馨小屋模型中生成实体
      this.renderHomeFurnitures();
      
      this.playCustomSound(494, 0.2, 'sine', 0.1);
    }

    // 4. 清除预览模型
    if (this.editPreviewGroup) {
      this.scene.remove(this.editPreviewGroup);
      this.editPreviewGroup = null;
    }

    this.pendingFurnitureId = null;
    this.pendingFurnitureType = null;

    document.getElementById('home-edit-hud').style.display = 'none';
  }

  renderHomeFurnitures() {
    // 寻找 House 的家具 Group 并重构
    if (!this.houseGen) return;
    
    if (!this.houseGen.furnituresGroup) {
      this.houseGen.furnituresGroup = new THREE.Group();
      this.houseGen.group.add(this.houseGen.furnituresGroup);
    }

    this.houseGen.furnituresGroup.clear(); // 清空原有已放置家具

    this.gameData.homeFurnitures.forEach(item => {
      const fModel = this.createFurnitureModel(item.type);
      fModel.position.set(item.x, item.y, item.z);
      fModel.rotation.y = item.ry;
      this.houseGen.furnituresGroup.add(fModel);
    });
  }

  // ==================== 每帧高频运动与气泡定位更新 (animate) ====================
  updateGameSystemsFrame(delta, time) {
    // 0. 更新种植菜单地块的同步锁定状态
    this.updateActivePlotForRadialMenu();

    // 1. 农田气泡每帧 3D 投射定位与生长缩放
    this.updateFarmPlotsFrame();

    // 2. PK战斗物理运动与机器人 AI
    this.updatePKBattleFrame(delta);

    // 3. 家园建造摆放射线检测
    this.updateHomeBuildFrame();

    // 4. PK大厅发光水晶/武器动画与防坠落传送
    this.updatePKHallAnimations(delta, time);

    // 5. 农场小岛坠落传送保护
    if (this.currentMap === 'farm') {
      if (this.player && this.player.position.y < -3.5) {
        this.player.position.set(0, 0.6 + 0.1, -8.0);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copy(this.player.position);
        
        if (window.showMockToast) {
          let existing = document.querySelector('.mock-toast');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.className = 'mock-toast';
          toast.textContent = `小心！不要掉入农场外的浮空深渊哦 ☁️`;
          document.body.appendChild(toast);

          setTimeout(() => toast.classList.add('show'), 50);
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }, 2000);
        }
      }
    }
  }

  updatePKHallAnimations(delta, time) {
    if (this.currentMap !== 'pk_arena') return;

    // 1. 水晶自转与正弦浮动
    if (this.pkCrystalMesh && this.pkCrystalMesh.visible) {
      this.pkCrystalMesh.rotation.y += 0.015;
      this.pkCrystalMesh.position.y = 1.35 + Math.sin(time * 0.002) * 0.12;
    }

    // 2. 武器预览自转与轻微上下浮动
    if (this.swordPreview) {
      this.swordPreview.rotation.y += 0.015;
      this.swordPreview.position.y = 1.45 + Math.sin(time * 0.0025) * 0.06;
    }
    if (this.hammerPreview) {
      this.hammerPreview.rotation.y += 0.015;
      this.hammerPreview.position.y = 1.45 + Math.cos(time * 0.0025) * 0.06;
    }
    if (this.bombPreview) {
      this.bombPreview.rotation.y += 0.015;
      this.bombPreview.position.y = 1.45 + Math.sin(time * 0.0025 + 1) * 0.06;
    }

    // 3. 非PK状态防坠落传送
    if (!this.isPKActive) {
      // 保持决斗水晶可见
      if (this.pkCrystalMesh) this.pkCrystalMesh.visible = true;

      if (this.player && this.player.position.y < -3.5) {
        this.player.position.set(0, 0.6 + 0.1, -6.0);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copy(this.player.position);
        
        if (window.showMockToast) {
          let existing = document.querySelector('.mock-toast');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.className = 'mock-toast';
          toast.textContent = `小心！不要跌落入云海深渊哦 ☁️`;
          document.body.appendChild(toast);

          setTimeout(() => toast.classList.add('show'), 50);
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }, 2200);
        }
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

    // 遍历格子数据更新 3D
    this.gameData.farmPlots.forEach((plot, idx) => {
      const plot3D = plots3D[idx];
      if (!plot3D) return;

      // 仅在首次需要时重建
      if (plot.status !== 'empty' && plot3D.plantGroup.children.length === 0) {
        this.recreateCrop3D(idx);
      }

      if (plot.status === 'growing') {
        const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
        const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
        
        if (elapsed >= matureTime) {
          plot.status = 'ready';
          this.saveGameData();
          this.refreshFarm();
          this.recreateCrop3D(idx);
        } else {
          // 生长缩放 (0.15 到 1.0)
          const ratio = elapsed / matureTime;
          const sc = 0.15 + ratio * 0.85;
          plot3D.plantGroup.scale.set(sc, sc, sc);
        }
      }

      // 如果有植物，投影气泡
      if (plot.status !== 'empty' && plot.seedId) {
        let bubbleEl = document.getElementById(`crop-bubble-${idx}`);
        if (!bubbleEl) {
          bubbleEl = document.createElement('div');
          bubbleEl.id = `crop-bubble-${idx}`;
          bubbleEl.className = 'farm-crop-bubble';
          container.appendChild(bubbleEl);
        }

        const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
        const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
        const remaining = Math.max(0, matureTime - elapsed);

        if (plot.status === 'ready') {
          bubbleEl.innerHTML = `🌾 可收割`;
          bubbleEl.style.background = 'linear-gradient(135deg, #27ae60, #1e824c)';
          bubbleEl.style.borderColor = 'rgba(255,255,255,0.3)';
        } else {
          const emoji = plot.seedId === 'sunflower_seed' ? '🌻' : '🍓';
          bubbleEl.innerHTML = `${emoji} ⏳ ${remaining}s`;
          bubbleEl.style.background = 'rgba(15,17,21,0.85)';
          bubbleEl.style.borderColor = 'rgba(255,255,255,0.12)';
        }

        // 计算 3D 投影坐标
        const worldPos = new THREE.Vector3(plot3D.x, 1.3, plot3D.z);
        worldPos.project(this.camera);

        const screenX = (worldPos.x * .5 + .5) * window.innerWidth;
        const screenY = (-(worldPos.y * .5) + .5) * window.innerHeight;

        bubbleEl.style.left = `${screenX}px`;
        bubbleEl.style.top = `${screenY}px`;
        bubbleEl.style.opacity = '1';
      } else {
        const bubbleEl = document.getElementById(`crop-bubble-${idx}`);
        if (bubbleEl) bubbleEl.remove();
      }
    });
  }

  updatePKBattleFrame(delta) {
    // 更新物理炸弹和爆炸特效运动
    this.updateActiveBombs(delta);
    this.updateExplosionEffects(delta);

    if (!this.isPKActive || !this.opponent3D) return;

    // 1. 虚空跌落判定
    if (this.player.position.y < -3.5) {
      this.endPKBattle(false);
      return;
    }
    if (this.opponent3D.position.y < -3.5) {
      this.endPKBattle(true);
      return;
    }

    // 2. 机器人运动与物理击退模拟
    const opp = this.opponent3D;
    const playerPos = this.player.position;

    // 重力模拟
    if (!this.opponentIsGrounded) {
      this.opponentVelocity.y -= 9.8 * delta;
    }

    opp.position.addScaledVector(this.opponentVelocity, delta);

    // 水平摩阻力衰减
    this.opponentVelocity.x *= 0.88;
    this.opponentVelocity.z *= 0.88;

    // 擂台碰撞检测
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

    // 3. 机器人 AI 朝玩家移动
    if (this.opponentIsGrounded && this.playerHP > 0) {
      const dist = opp.position.distanceTo(playerPos);
      
      // 面向玩家
      const dx = playerPos.x - opp.position.x;
      const dz = playerPos.z - opp.position.z;
      const angle = Math.atan2(dx, dz);
      opp.rotation.y = angle;

      if (dist > 1.8) {
        // 跑步朝玩家移动
        const moveSpeed = 2.4;
        opp.translateZ(moveSpeed * delta);
      } else {
        // 机器人攻击判定 (每帧 1.8% 概率)
        if (Math.random() < 0.018) {
          this.opponentPerformAttack();
        }
      }
    }

    // 实时调试面板数据输出
    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      if (this.playerEquippedWeapon) {
        // 已装备武器，直接隐藏防止挡住屏幕
        debugEl.style.display = 'none';
      } else {
        debugEl.style.display = 'block';
        debugEl.innerHTML = `<span style="font-weight: bold; color: #ffeb3b; animation: settleBlink 1.2s infinite;">⚠️ 尚未装备武器！请走向擂台周边的武器架拾取武器 ⚔️</span>`;
      }
    }

    // 4. 自动拾取/替换武器 (玩家接近对应的武器架)
    const pPos = this.player.position;
    const rackConfigs = [
      { x: -7.5, z: 0, weapon: 'sword' },
      { x: 7.5, z: 0, weapon: 'hammer' },
      { x: 0, z: 6.8, weapon: 'bomb' }
    ];

    rackConfigs.forEach(cfg => {
      const dist = pPos.distanceTo(new THREE.Vector3(cfg.x, 0.6, cfg.z));
      // 若走近，且当前装备的武器不是该架子对应的武器，自动替换！
      if (dist < 1.6 && this.playerEquippedWeapon !== cfg.weapon) {
        const chosen = cfg.weapon;
        this.playerEquippedWeapon = chosen;

        // 显示并更新移动端攻击按钮
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

        // 绑定一把 3D 武器到玩家身上
        if (this.playerWeapon3D) this.player.group.remove(this.playerWeapon3D);
        
        let weaponModel;
        if (chosen === 'sword') weaponModel = this.createSword3D();
        else if (chosen === 'hammer') weaponModel = this.createHammer3D();
        else weaponModel = this.createBomb3D();

        weaponModel.position.set(0.32, 0.8, 0.1);
        weaponModel.rotation.x = Math.PI / 2;
        this.player.group.add(weaponModel);
        this.playerWeapon3D = weaponModel;

        this.playCustomSound(600, 0.15, 'sine', 0.1);

        // 飘字提示换武器
        if (window.showMockToast) {
          let existing = document.querySelector('.mock-toast');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.className = 'mock-toast';
          const weaponChinese = { 'sword': '长剑 ⚔️', 'hammer': '大锤 🔨', 'bomb': '炸弹 💣' };
          toast.textContent = `已装备武器：${weaponChinese[chosen]}！`;
          document.body.appendChild(toast);

          setTimeout(() => toast.classList.add('show'), 50);
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }, 1800);
        }
      }
    });
  }

  opponentPerformAttack() {
    if (this.opponentHP <= 0 || this.playerHP <= 0) return;

    // 挥舞动画
    if (this.opponentWeapon3D) {
      this.opponentWeapon3D.rotation.z = -Math.PI / 2;
      setTimeout(() => {
        if (this.opponentWeapon3D) this.opponentWeapon3D.rotation.z = 0;
      }, 150);
    }

    this.playCustomSound(220, 0.1, 'sawtooth', 0.1);

    const dist = this.opponent3D.position.distanceTo(this.player.position);
    if (dist <= 2.2) {
      // 玩家扣血并产生击退
      const dmg = 15;
      this.playerHP = Math.max(0, this.playerHP - dmg);
      this.updatePKHPUI();

      // 受伤红屏闪烁和飘血数值提示
      this.showScreenFlash();
      this.playDamageBubble(this.player.position, dmg, true);

      // 给玩家水平方向受击冲量
      const direction = new THREE.Vector3().subVectors(this.player.position, this.opponent3D.position).normalize();
      direction.y = 0.35;
      
      this.player.velocity.addScaledVector(direction, 4.2);

      // 受击声效
      this.playCustomSound(100, 0.2, 'sine', 0.15);

      if (this.playerHP <= 0) {
        this.endPKBattle(false);
      }
    }
  }

  updateHomeBuildFrame() {
    if (!this.isHomeBuildActive || !this.editPreviewGroup) return;

    // 拖动摆放射线检测地面 (X: [-4.5, 4.5], Z: [0.5, 9.5])
    const pointer = new THREE.Vector2(0, 0); // 取屏幕中心为射线源
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    let floorPoint = null;

    for (let i = 0; i < intersects.length; i++) {
      // 检查是否交于小屋地板 (HouseGenerator 上的 floor Y=0.12)
      const hit = intersects[i];
      if (hit.point && Math.abs(hit.point.y - 0.12) < 0.2) {
        floorPoint = hit.point;
        break;
      }
    }

    if (floorPoint) {
      // 0.5米网格对齐
      let targetX = Math.round(floorPoint.x * 2) / 2;
      let targetZ = Math.round(floorPoint.z * 2) / 2;

      // 区域边界安全限制
      targetX = Math.max(-4.0, Math.min(4.0, targetX));
      targetZ = Math.max(1.0, Math.min(9.0, targetZ));

      this.editPreviewGroup.position.set(targetX, 0.12, targetZ);
    }
  }

  buildFarmPlatform() {
    this.farmGroup.clear();

    // 1. 浮空草地主岛 (半径 12.0)
    const islandGeo = new THREE.CylinderGeometry(12.0, 12.5, 1.2, 32);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x4caf50, flatShading: true }); // 绿色草地
    const island = new THREE.Mesh(islandGeo, grassMat);
    island.position.y = 0.0; // 表面 Y = 0.6
    island.receiveShadow = true;
    island.castShadow = true;
    this.farmGroup.add(island);

    // 2. 泥土层地基底座 (Cylinder，偏褐色)
    const dirtGeo = new THREE.CylinderGeometry(12.5, 12.0, 1.5, 32);
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.position.y = -1.35;
    this.farmGroup.add(dirt);

    // 3. 散落的 6 块农田泥地格子 (Y = 0.61)
    // 排成 2x3 网格排开
    this.farmPlots3D = [];
    const plotMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true }); // 深褐泥土色
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true }); // 木框色
    
    // 坐标配置
    const plotConfigs = [
      { x: -3.6, z: -2.2 }, { x: 0, z: -2.2 }, { x: 3.6, z: -2.2 },
      { x: -3.6, z: 2.2 },  { x: 0, z: 2.2 },  { x: 3.6, z: 2.2 }
    ];

    plotConfigs.forEach((cfg, idx) => {
      const plotGroup = new THREE.Group();
      plotGroup.position.set(cfg.x, 0.6, cfg.z);

      // 泥土中心
      const dirtMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 2.4), plotMat);
      dirtMesh.receiveShadow = true;
      plotGroup.add(dirtMesh);

      // 木质边缘框 (4根)
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), borderMat);
      w1.position.set(0, 0.05, 1.25);
      w1.castShadow = true;
      plotGroup.add(w1);

      const w2 = w1.clone();
      w2.position.z = -1.25;
      plotGroup.add(w2);

      const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.4), borderMat);
      w3.position.set(1.25, 0.05, 0);
      w3.castShadow = true;
      plotGroup.add(w3);

      const w4 = w3.clone();
      w4.position.x = -1.25;
      plotGroup.add(w4);

      // 植物生长挂载节点
      const plantGroup = new THREE.Group();
      plantGroup.position.set(0, 0, 0);
      plotGroup.add(plantGroup);

      this.farmGroup.add(plotGroup);

      // 存入引用
      this.farmPlots3D.push({
        x: cfg.x,
        z: cfg.z,
        plantGroup: plantGroup
      });
    });

    // 4. 周围木栅栏与树木装饰，丰富农场小岛视觉
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 1.0, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
    const leavesGeo = new THREE.DodecahedronGeometry(0.6);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20, flatShading: true });
    
    const treePositions = [
      { x: -8.0, z: -8.0 }, { x: 8.0, z: -8.0 }, { x: -8.0, z: 8.0 }, { x: 8.0, z: 8.0 }
    ];
    treePositions.forEach(pos => {
      const tree = new THREE.Group();
      tree.position.set(pos.x, 0.6, pos.z);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.5;
      trunk.castShadow = true;
      tree.add(trunk);

      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 1.1;
      leaves.castShadow = true;
      tree.add(leaves);

      this.farmGroup.add(tree);
    });

    // 5. 农场地图碰撞体与交互点数据
    this.farmColliders = [
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 12.0 }
    ];

    this.farmInteractables = plotConfigs.map((cfg, idx) => {
      return {
        id: `farm_plot_${idx}`,
        name: '农田格子',
        x: cfg.x,
        y: 0.6,
        z: cfg.z,
        triggerRadius: 1.8
      };
    });
  }

  buildPKPlatform() {
    this.pkArenaGroup.clear(); // 清空

    // 1. 擂台地基 (半径 8.0, 表面在 Y = 0.6)
    const platformGeo = new THREE.CylinderGeometry(8.0, 8.2, 0.4, 32);
    const platformMat = new THREE.MeshLambertMaterial({ 
      color: 0x1b2845, 
      flatShading: true,
      emissive: 0x070b19
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.4;
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.pkArenaGroup.add(platform);

    // 2. 环绕红蓝发光条
    const ringGeoBlue = new THREE.TorusGeometry(8.02, 0.05, 8, 48);
    ringGeoBlue.rotateX(Math.PI / 2);
    const ringMatBlue = new THREE.MeshBasicMaterial({ color: 0x29b6f6 });
    const ringBlue = new THREE.Mesh(ringGeoBlue, ringMatBlue);
    ringBlue.position.y = 0.58;
    this.pkArenaGroup.add(ringBlue);

    const ringGeoRed = new THREE.TorusGeometry(8.1, 0.03, 8, 48);
    ringGeoRed.rotateX(Math.PI / 2);
    const ringMatRed = new THREE.MeshBasicMaterial({ color: 0xef5350 });
    const ringRed = new THREE.Mesh(ringGeoRed, ringMatRed);
    ringRed.position.y = 0.55;
    this.pkArenaGroup.add(ringRed);

    // 3. 擂台中心的发光十字星魔法阵纹路
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.65 });
    const barGeo1 = new THREE.BoxGeometry(3.6, 0.01, 0.16);
    const bar1 = new THREE.Mesh(barGeo1, lineMat);
    bar1.position.set(0, 0.605, 0);
    this.pkArenaGroup.add(bar1);
    
    const barGeo2 = new THREE.BoxGeometry(0.16, 0.01, 3.6);
    const bar2 = new THREE.Mesh(barGeo2, lineMat);
    bar2.position.set(0, 0.605, 0);
    this.pkArenaGroup.add(bar2);
    
    const centerRingGeo = new THREE.TorusGeometry(0.6, 0.04, 4, 24);
    centerRingGeo.rotateX(Math.PI / 2);
    const centerRing = new THREE.Mesh(centerRingGeo, lineMat);
    centerRing.position.set(0, 0.605, 0);
    this.pkArenaGroup.add(centerRing);

    // 4. 外围神殿柱子 (6根，红蓝发光火炬交替)
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x78909c, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const radius = 10.5; // 放在擂台外围
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(px, 0.4, pz);
      
      // 柱底座
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 8);
      const baseMesh = new THREE.Mesh(baseGeo, pillarMat);
      baseMesh.position.y = 0.2;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      pillarGroup.add(baseMesh);
      
      // 柱身
      const shaftGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.8, 8);
      const shaftMesh = new THREE.Mesh(shaftGeo, pillarMat);
      shaftMesh.position.y = 2.1;
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = true;
      pillarGroup.add(shaftMesh);
      
      // 柱头
      const capGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.3, 8);
      const capMesh = new THREE.Mesh(capGeo, pillarMat);
      capMesh.position.y = 4.15;
      capMesh.castShadow = true;
      pillarGroup.add(capMesh);
      
      // 顶部发光水晶能量火炬
      const fireGeo = new THREE.OctahedronGeometry(0.25);
      const fireMesh = new THREE.Mesh(fireGeo, new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x29b6f6 : 0xef5350,
        transparent: true,
        opacity: 0.95
      }));
      fireMesh.position.y = 4.65;
      pillarGroup.add(fireMesh);
      
      this.pkArenaGroup.add(pillarGroup);
    }

    // 5. 高空漂浮 3D 云海 (围绕四周)
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.random() * 0.2;
      const dist = 21.0 + Math.random() * 5.0;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = -2.5 - Math.random() * 2.0;
      
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(cx, cy, cz);
      
      const count = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < count; j++) {
        const size = 2.5 + Math.random() * 3.5;
        const cloudPartGeo = new THREE.SphereGeometry(size, 6, 6);
        const cloudPart = new THREE.Mesh(cloudPartGeo, cloudMat);
        cloudPart.position.set(
          (Math.random() - 0.5) * size * 1.6,
          (Math.random() - 0.5) * size * 0.6,
          (Math.random() - 0.5) * size * 1.6
        );
        cloudGroup.add(cloudPart);
      }
      this.pkArenaGroup.add(cloudGroup);
    }

    // 6. 浮空废墟碎石
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x455a64, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 9.5 + Math.random() * 4.0;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = 0.2 + Math.random() * 2.2;
      
      const rockGeo = new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.45);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(rx, ry, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this.pkArenaGroup.add(rock);
    }

    // 7. 发光决斗水晶 (在 Y = 0.6, Z = -5.0)
    const crystalBaseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8);
    const crystalBase = new THREE.Mesh(crystalBaseGeo, pillarMat);
    crystalBase.position.set(0, 0.8, -5.0); // 地表是 0.6，柱中心 0.8，高 0.4
    crystalBase.castShadow = true;
    crystalBase.receiveShadow = true;
    this.pkArenaGroup.add(crystalBase);
    
    const crystalGeo = new THREE.OctahedronGeometry(0.3);
    const crystalMeshMat = new THREE.MeshBasicMaterial({ 
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.88
    });
    this.pkCrystalMesh = new THREE.Mesh(crystalGeo, crystalMeshMat);
    this.pkCrystalMesh.scale.set(1.0, 2.0, 1.0); // 拉伸成双锥水晶
    this.pkCrystalMesh.position.set(0, 1.45, -5.0);
    this.pkArenaGroup.add(this.pkCrystalMesh);

    // 8. 三个武器架 (左-剑, 右-锤, 北-炸弹)
    const rackConfigs = [
      { x: -7.5, z: 0, weapon: 'sword' },
      { x: 7.5, z: 0, weapon: 'hammer' },
      { x: 0, z: 6.8, weapon: 'bomb' }
    ];

    this.swordPreview = null;
    this.hammerPreview = null;
    this.bombPreview = null;

    rackConfigs.forEach(cfg => {
      const rackGroup = new THREE.Group();
      rackGroup.position.set(cfg.x, 0.6, cfg.z);

      // 朝向微调：北侧的武器架需要面向南
      if (cfg.z > 0) {
        rackGroup.rotation.y = Math.PI;
      }

      // 两根支撑柱
      const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8);
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
      
      const p1 = new THREE.Mesh(pillarGeo, woodMat);
      p1.position.set(0, 0.65, -0.4);
      p1.castShadow = true;
      rackGroup.add(p1);

      const p2 = new THREE.Mesh(pillarGeo, woodMat);
      p2.position.set(0, 0.65, 0.4);
      p2.castShadow = true;
      rackGroup.add(p2);

      // 横梁
      const beamGeo = new THREE.BoxGeometry(0.06, 0.06, 1.0);
      const beam = new THREE.Mesh(beamGeo, woodMat);
      beam.position.set(0, 1.15, 0);
      beam.castShadow = true;
      rackGroup.add(beam);

      // 武器架底座
      const baseGeo = new THREE.BoxGeometry(0.2, 0.08, 1.1);
      const base = new THREE.Mesh(baseGeo, new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true }));
      base.position.set(0, 0.04, 0);
      base.receiveShadow = true;
      rackGroup.add(base);

      // 浮空自转的微型武器预览
      let weaponPreview;
      if (cfg.weapon === 'sword') {
        weaponPreview = this.createSword3D();
        this.swordPreview = weaponPreview;
      } else if (cfg.weapon === 'hammer') {
        weaponPreview = this.createHammer3D();
        this.hammerPreview = weaponPreview;
      } else {
        weaponPreview = this.createBomb3D();
        this.bombPreview = weaponPreview;
      }
      weaponPreview.scale.set(0.65, 0.65, 0.65);
      weaponPreview.position.set(0, 1.45, 0);
      rackGroup.add(weaponPreview);

      this.pkArenaGroup.add(rackGroup);
    });

    // 9. PK 地图碰撞体与大厅交互点数据
    this.pkArenaColliders = [
      { type: 'floor', worldX: 0, worldZ: 0, worldY: 0.6, radius: 8.0 }
    ];

    this.pkArenaInteractables = [
      {
        id: 'pk_crystal',
        name: '决斗匹配',
        x: 0,
        y: 0.6,
        z: -5.0,
        triggerRadius: 1.8
      }
    ];
  }

  createSword3D() {
    const sword = new THREE.Group();

    const hiltGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6);
    const hiltMat = new THREE.MeshLambertMaterial({ color: 0x3e2723, flatShading: true });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.2;
    hilt.castShadow = true;
    sword.add(hilt);

    const guardGeo = new THREE.BoxGeometry(0.14, 0.04, 0.04);
    const guardMat = new THREE.MeshLambertMaterial({ color: 0xffb300, flatShading: true });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = -0.1;
    guard.castShadow = true;
    sword.add(guard);

    const bladeGeo = new THREE.BoxGeometry(0.06, 0.55, 0.018);
    const bladeMat = new THREE.MeshLambertMaterial({ 
      color: 0xcfd8dc, 
      emissive: 0x111111,
      flatShading: true 
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.22;
    blade.castShadow = true;
    sword.add(blade);

    const tipGeo = new THREE.ConeGeometry(0.042, 0.08, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.525;
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    sword.add(tip);

    return sword;
  }

  createHammer3D() {
    const hammer = new THREE.Group();

    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x212121, flatShading: true });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.1;
    handle.castShadow = true;
    hammer.add(handle);

    const headGeo = new THREE.BoxGeometry(0.24, 0.32, 0.24);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x455a64, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.38;
    head.castShadow = true;
    hammer.add(head);

    const bandGeo = new THREE.BoxGeometry(0.25, 0.06, 0.25);
    const bandMat = new THREE.MeshLambertMaterial({ color: 0xffb300, flatShading: true });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.38;
    hammer.add(band);

    return hammer;
  }

  createBomb3D() {
    const bomb = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(0.18, 10, 10);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x263238, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.1;
    body.castShadow = true;
    bomb.add(body);

    const capGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.06, 8);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x546e7a, flatShading: true });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.28;
    cap.castShadow = true;
    bomb.add(cap);

    const fuseGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4);
    const fuseMat = new THREE.MeshLambertMaterial({ color: 0xffd54f, flatShading: true });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    fuse.position.set(0.02, 0.35, 0);
    fuse.rotation.z = -0.3;
    bomb.add(fuse);

    const sparkGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.set(0.05, 0.4, 0);
    bomb.add(spark);

    return bomb;
  }

  createFurnitureModel(type) {
    const modelGroup = new THREE.Group();

    if (type === 'painting') {
      const frameGeo = new THREE.BoxGeometry(1.2, 0.8, 0.06);
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e342e, flatShading: true });
      const frame = new THREE.Mesh(frameGeo, woodMat);
      frame.castShadow = true;
      modelGroup.add(frame);

      const canvasGeo = new THREE.BoxGeometry(1.1, 0.7, 0.01);
      const canvasMat = new THREE.MeshLambertMaterial({ color: 0xfff3e0, flatShading: true });
      const canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.z = 0.031;
      modelGroup.add(canvas);

      const sunGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.01, 12);
      sunGeo.rotateX(Math.PI / 2);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xff7043 });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(0, 0.1, 0.038);
      modelGroup.add(sun);

      const seaGeo = new THREE.BoxGeometry(1.1, 0.25, 0.01);
      const seaMat = new THREE.MeshLambertMaterial({ color: 0x29b6f6, flatShading: true });
      const sea = new THREE.Mesh(seaGeo, seaMat);
      sea.position.set(0, -0.2, 0.038);
      modelGroup.add(sea);

    } else if (type === 'christmas_tree') {
      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8);
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
      const trunk = new THREE.Mesh(trunkGeo, woodMat);
      trunk.position.y = 0.2;
      trunk.castShadow = true;
      modelGroup.add(trunk);

      const greenMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20, flatShading: true });
      
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.65, 8), greenMat);
      c1.position.y = 0.65;
      c1.castShadow = true;
      modelGroup.add(c1);

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.52, 8), greenMat);
      c2.position.y = 1.05;
      c2.castShadow = true;
      modelGroup.add(c2);

      const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.38, 8), greenMat);
      c3.position.y = 1.4;
      c3.castShadow = true;
      modelGroup.add(c3);

      const colors = [0xff1744, 0xffeb3b, 0x00e676, 0x29b6f6, 0xe040fb];
      for (let i = 0; i < 12; i++) {
        const sphereGeo = new THREE.SphereGeometry(0.045, 4, 4);
        const sphereMat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
        const ball = new THREE.Mesh(sphereGeo, sphereMat);
        
        const height = 0.4 + Math.random() * 1.1;
        const radius = 0.55 * (1.5 - height) / 1.5;
        const angle = Math.random() * Math.PI * 2;
        ball.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        modelGroup.add(ball);
      }

    } else if (type === 'rabbit_sofa') {
      const pinkMat = new THREE.MeshLambertMaterial({ color: 0xff80ab, flatShading: true });
      const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

      const baseGeo = new THREE.BoxGeometry(1.2, 0.3, 0.6);
      const base = new THREE.Mesh(baseGeo, pinkMat);
      base.position.y = 0.15;
      base.castShadow = true;
      modelGroup.add(base);

      const backGeo = new THREE.BoxGeometry(1.2, 0.55, 0.15);
      const back = new THREE.Mesh(backGeo, pinkMat);
      back.position.set(0, 0.5, -0.22);
      back.castShadow = true;
      modelGroup.add(back);

      const earGeo = new THREE.BoxGeometry(0.14, 0.35, 0.08);
      const earL = new THREE.Mesh(earGeo, pinkMat);
      earL.position.set(-0.25, 0.9, -0.22);
      earL.rotation.z = 0.12;
      modelGroup.add(earL);

      const earLIn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.01), whiteMat);
      earLIn.position.set(-0.25, 0.9, -0.179);
      earLIn.rotation.z = 0.12;
      modelGroup.add(earLIn);

      const earR = new THREE.Mesh(earGeo, pinkMat);
      earR.position.set(0.25, 0.9, -0.22);
      earR.rotation.z = -0.12;
      modelGroup.add(earR);

      const earRIn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.01), whiteMat);
      earRIn.position.set(0.25, 0.9, -0.179);
      earRIn.rotation.z = -0.12;
      modelGroup.add(earRIn);

      const cushionGeo = new THREE.BoxGeometry(1.02, 0.1, 0.48);
      const cushion = new THREE.Mesh(cushionGeo, whiteMat);
      cushion.position.set(0, 0.32, 0.03);
      modelGroup.add(cushion);

      const armGeo = new THREE.BoxGeometry(0.12, 0.38, 0.55);
      const armL = new THREE.Mesh(armGeo, pinkMat);
      armL.position.set(-0.54, 0.34, 0.02);
      armL.castShadow = true;
      modelGroup.add(armL);

      const armR = armL.clone();
      armR.position.x = 0.54;
      modelGroup.add(armR);

    } else if (type === 'swing_chair') {
      const ironMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae, flatShading: true });
      const ropeMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0, flatShading: true });
      const seatMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, flatShading: true });

      const baseGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 24);
      baseGeo.rotateX(Math.PI / 2);
      const base = new THREE.Mesh(baseGeo, ironMat);
      base.position.y = 0.03;
      modelGroup.add(base);

      const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8);
      const post = new THREE.Mesh(postGeo, ironMat);
      post.position.set(0, 0.85, -0.32);
      post.rotation.x = -0.05;
      post.castShadow = true;
      modelGroup.add(post);

      const hookGeo = new THREE.BoxGeometry(0.06, 0.06, 0.38);
      const hook = new THREE.Mesh(hookGeo, ironMat);
      hook.position.set(0, 1.7, -0.16);
      modelGroup.add(hook);

      const ropeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4);
      const ropeL = new THREE.Mesh(ropeGeo, ropeMat);
      ropeL.position.set(-0.16, 1.25, 0.02);
      ropeL.rotation.z = 0.15;
      modelGroup.add(ropeL);

      const ropeR = new THREE.Mesh(ropeGeo, ropeMat);
      ropeR.position.set(0.16, 1.25, 0.02);
      ropeR.rotation.z = -0.15;
      modelGroup.add(ropeR);

      const basketGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.12, 12);
      const basket = new THREE.Mesh(basketGeo, seatMat);
      basket.position.set(0, 0.82, 0.02);
      basket.castShadow = true;
      modelGroup.add(basket);

      const domeGeo = new THREE.SphereGeometry(0.28, 8, 8, 0, Math.PI, 0, Math.PI / 2);
      domeGeo.rotateX(Math.PI / 2);
      const domeMat = new THREE.MeshLambertMaterial({ 
        color: 0x4fc3f7, 
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        flatShading: true 
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(0, 1.05, 0.02);
      dome.rotation.y = Math.PI;
      modelGroup.add(dome);
    }

    return modelGroup;
  }

  // ==================== 全局大市集商店及快捷种植菜单系统 ====================

  initShopUI() {
    // 监听 Tab 切换
    const tabs = document.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = tab.getAttribute('data-tab');
        this.switchShopTab(tabName);
      });
    });

    // 默认展示农业 Tab
    this.switchShopTab('agriculture');

    // 绑定右侧购买调节器事件
    const minusBtn = document.getElementById('btn-shop-count-minus');
    const plusBtn = document.getElementById('btn-shop-count-plus');
    const plus10Btn = document.getElementById('btn-shop-count-plus10');
    const slider = document.getElementById('shop-buy-count-slider');
    const executeBtn = document.getElementById('btn-shop-execute-buy');

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
      slider.addEventListener('input', () => {
        this.updateShopBuyCountUI();
      });
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
    const tabs = document.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.borderLeftColor = 'transparent';
          t.style.color = 'var(--text-muted)';
        });
        tab.classList.add('active');
        tab.style.borderLeftColor = '#27ae60';
        tab.style.color = '#fff';
        this.renderShopItems(tabName);
      }
    });
  }

  getActiveShopTab() {
    const activeTab = document.querySelector('#modal-shop .shop-tabactive.active');
    return activeTab ? activeTab.getAttribute('data-tab') : 'agriculture';
  }

  getActiveBagTab() {
    const activeTab = document.querySelector('#modal-bag .bag-tabactive.active');
    return activeTab ? activeTab.getAttribute('data-tab') : 'seed';
  }

  updateShopCoins() {
    const coinEl = document.querySelector('#modal-shop .shop-coins-val');
    if (coinEl) {
      coinEl.textContent = this.gameData.coins;
    }
  }

  updateShopBuyCountUI() {
    const slider = document.getElementById('shop-buy-count-slider');
    const countText = document.getElementById('shop-buy-count-text');
    const totalText = document.querySelector('#shop-item-detail .shop-detail-total-price');

    if (!slider || !this.selectedShopItem) return;

    const count = parseInt(slider.value) || 1;
    if (countText) {
      countText.textContent = count;
    }

    if (totalText) {
      if (this.selectedShopItem.id.startsWith('coin_')) {
        totalText.textContent = '免费';
      } else {
        const total = this.selectedShopItem.price * count;
        totalText.textContent = `🪙 ${total}`;
      }
    }
  }

  showShopItemDetail(item) {
    this.selectedShopItem = item;
    const detail = document.getElementById('shop-item-detail');
    if (!detail) return;

    const empty = detail.querySelector('.shop-detail-empty');
    const content = detail.querySelector('.shop-detail-content');

    if (empty) empty.style.display = 'none';
    if (content) content.style.display = 'flex';

    // 1. 设置 Icon
    const iconEl = detail.querySelector('.shop-detail-icon');
    if (iconEl) {
      const emoji = item.name.split(' ').pop() || '📦';
      iconEl.textContent = emoji;
    }

    // 2. 设置 Title
    const titleEl = detail.querySelector('.shop-detail-title');
    if (titleEl) {
      titleEl.textContent = item.name.replace(/ 🌻| 🍓| 🖼️| 🎄| 🛋️| 🎪| 🪙| 🎁| 💎/, '');
    }

    // 3. 设置已持有数
    const ownedEl = detail.querySelector('.shop-detail-owned');
    if (ownedEl) {
      if (item.type === 'seed') {
        const bItem = this.gameData.backpack.find(b => b.id === item.id && b.type === 'seed');
        ownedEl.textContent = `已持有: ${bItem ? bItem.count : 0}`;
      } else if (item.type === 'decor') {
        const isOwned = this.gameData.ownedFurnitures.includes(item.id);
        ownedEl.textContent = isOwned ? '✅ 已解锁' : '🔒 未拥有';
      } else {
        ownedEl.textContent = '★ 免费福利';
      }
    }

    // 4. 设置描述
    const descEl = detail.querySelector('.shop-detail-desc');
    if (descEl) {
      descEl.textContent = item.desc;
    }

    // 5. 设置单价
    const unitPriceEl = detail.querySelector('.shop-detail-unit-price');
    if (unitPriceEl) {
      if (item.id.startsWith('coin_')) {
        unitPriceEl.textContent = '￥0.00';
      } else {
        unitPriceEl.textContent = `🪙 ${item.price}`;
      }
    }

    // 6. 重置数量调节器
    const slider = document.getElementById('shop-buy-count-slider');
    if (slider) {
      slider.value = 1;
    }

    this.updateShopBuyCountUI();
  }

  renderShopItems(tabName) {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;

    grid.innerHTML = '';

    let items = [];
    if (tabName === 'agriculture') {
      items = [
        {
          id: 'sunflower_seed',
          name: '向日葵种子 🌻',
          price: 10,
          desc: '成熟需要 30 秒。收割可获得 20 金币 + 15 经验。',
          quality: 'green',
          type: 'seed'
        },
        {
          id: 'strawberry_seed',
          name: '草莓种子 🍓',
          price: 20,
          desc: '成熟需要 60 秒。收割可获得 45 金币 + 35 经验。',
          quality: 'blue',
          type: 'seed'
        }
      ];
    } else if (tabName === 'decorations') {
      items = [
        { id: 'painting_1', name: '浮空岛日落挂画 🖼️', price: 50, desc: '悬挂在墙壁上的精美装饰，带来悠闲的落日余晖。', type: 'decor', quality: 'purple' },
        { id: 'tree_1', name: '闪烁圣诞树 🎄', price: 100, desc: '闪耀着七彩微光的圣诞树，散发节日温馨氛围。', type: 'decor', quality: 'purple' },
        { id: 'sofa_1', name: '粉嫩兔子沙发 🛋️', price: 150, desc: '兔耳设计的粉色单人沙发，触感松软，极度舒适。', type: 'decor', quality: 'purple' },
        { id: 'swing_1', name: '室内网兜秋千 🎪', price: 200, desc: '挂在天花板上的编织网秋千，轻轻摇曳，治愈满满。', type: 'decor', quality: 'purple' }
      ];
    } else if (tabName === 'topup') {
      items = [
        { id: 'coin_100', name: '免费金币充值包 🪙', amount: 100, desc: '白嫖小包。免费充值 100 金币，附赠吃到金币声效！', type: 'topup', quality: 'gold', price: 0 },
        { id: 'coin_500', name: '金币充值礼包 🎁', amount: 500, desc: '免费大包。点击即刻免费充值 500 金币！', type: 'topup', quality: 'gold', price: 0 },
        { id: 'coin_1000', name: '超级金币充值包 💎', amount: 1000, desc: '免费巨包！狂揽 1000 金币，金币爆屏！', type: 'topup', quality: 'gold', price: 0 }
      ];
    }

    // 渲染网格
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'shop-item-box';
      
      const item = items[i];
      if (item) {
        const qualityClass = `q-${item.quality || 'white'}`;
        el.classList.add(qualityClass);
        if (this.selectedShopItem && this.selectedShopItem.id === item.id) {
          el.classList.add('active');
        }

        const emoji = item.name.split(' ').pop() || '📦';

        el.innerHTML = `
          <span style="font-size: 1.8rem;">${emoji}</span>
          <span class="shop-item-box-price">${item.id.startsWith('coin_') ? '免费' : '🪙' + item.price}</span>
        `;

        el.addEventListener('click', () => {
          document.querySelectorAll('.shop-item-box.active').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
          this.showShopItemDetail(item);
        });
      } else {
        el.innerHTML = '';
      }
      grid.appendChild(el);
    }

    const currentHasSelected = items.some(item => this.selectedShopItem && item.id === this.selectedShopItem.id);
    if (!currentHasSelected) {
      this.selectedShopItem = null;
      const detail = document.getElementById('shop-item-detail');
      if (detail) {
        const empty = detail.querySelector('.shop-detail-empty');
        const content = detail.querySelector('.shop-detail-content');
        if (empty) empty.style.display = 'flex';
        if (content) content.style.display = 'none';
      }
    } else {
      this.showShopItemDetail(this.selectedShopItem);
    }
  }

  executeShopBuy(item, count, clickX, clickY) {
    if (item.id.startsWith('coin_')) {
      const totalAmount = item.amount * count;
      this.gameData.coins += totalAmount;
      this.saveGameData();
      this.updateShopCoins();
      this.updateBaseUI();
      this.showCoinFloatText(totalAmount, clickX, clickY);

      this.showShopItemDetail(item);
      setTimeout(() => {
        this.refreshBag(this.getActiveBagTab());
      }, 50);
      return;
    }

    const totalPrice = item.price * count;
    if (this.gameData.coins < totalPrice) {
      alert('金币不足，无法购买！');
      return;
    }

    this.gameData.coins -= totalPrice;

    if (item.type === 'seed') {
      const backpackItem = this.gameData.backpack.find(b => b.id === item.id && b.type === 'seed');
      if (backpackItem) {
        backpackItem.count += count;
      } else {
        this.gameData.backpack.push({
          id: item.id,
          name: item.name.replace(/ 🌻| 🍓/, ''),
          type: 'seed',
          count: count,
          quality: item.quality,
          desc: item.desc
        });
      }
      this.saveGameData();
      this.updateShopCoins();
      this.updateBaseUI();
      this.showCoinFloatText(-totalPrice, clickX, clickY);

      this.showShopItemDetail(item);
      this.refreshFarm();
      this.refreshBag('seed');

    } else if (item.type === 'decor') {
      if (!this.gameData.ownedFurnitures.includes(item.id)) {
        this.gameData.ownedFurnitures.push(item.id);
      }
      const backpackItem = this.gameData.backpack.find(b => b.id === item.id && b.type === 'decor');
      if (backpackItem) {
        backpackItem.count += count;
      } else {
        this.gameData.backpack.push({
          id: item.id,
          name: item.name.replace(/ 🖼️| 🎄| 🛋️| 🎪/, ''),
          type: 'decor',
          count: count,
          quality: 'purple',
          desc: `购买于家园工坊的精美家具模型。进入家园编辑模式即可随意定位摆放它！`
        });
      }
      this.saveGameData();
      this.updateShopCoins();
      this.updateBaseUI();
      this.showCoinFloatText(-totalPrice, clickX, clickY);

      this.showShopItemDetail(item);
      this.refreshHome();
      this.refreshBag('decor');
    }
  }

  initRadialSeedMenu() {
    const closeBtn = document.getElementById('btn-close-radial');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeRadialSeedMenu();
      });
    }

    const seedBtns = document.querySelectorAll('#radial-seed-menu .radial-item-btn');
    seedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('disabled') || btn.style.opacity === '0.5') {
          this.showToast('请走近空农地后再种植！');
          return;
        }
        const seedId = btn.getAttribute('data-seed');
        this.plantCropFromRadialMenu(seedId);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isRadialMenuOpen) return;

      if (e.key === '1') {
        const btn = document.getElementById('radial-seed-sunflower');
        if (btn) btn.click();
      } else if (e.key === '2') {
        const btn = document.getElementById('radial-seed-strawberry');
        if (btn) btn.click();
      } else if (e.key === 'Escape') {
        this.closeRadialSeedMenu();
      }
    });
  }

  openRadialSeedMenu() {
    const menuEl = document.getElementById('radial-seed-menu');
    if (!menuEl) return;

    this.isRadialMenuOpen = true;
    if (window.parent) {
      window.parent.isRadialMenuOpen = true;
    }

    menuEl.classList.add('open');
    menuEl.style.display = 'block';

    this.updateRadialCounts();
    this.updateActivePlotForRadialMenu();
  }

  closeRadialSeedMenu() {
    const menuEl = document.getElementById('radial-seed-menu');
    if (!menuEl) return;

    this.isRadialMenuOpen = false;
    if (window.parent) {
      window.parent.isRadialMenuOpen = false;
    }

    menuEl.classList.remove('open');
    setTimeout(() => {
      if (!this.isRadialMenuOpen) {
        menuEl.style.display = 'none';
      }
    }, 300);
  }

  updateRadialCounts() {
    const sunflowerCountEl = document.querySelector('#radial-seed-sunflower .radial-count');
    const strawberryCountEl = document.querySelector('#radial-seed-strawberry .radial-count');

    const sunflowerItem = this.gameData.backpack.find(item => item.id === 'sunflower_seed' && item.type === 'seed');
    const strawberryItem = this.gameData.backpack.find(item => item.id === 'strawberry_seed' && item.type === 'seed');

    if (sunflowerCountEl) {
      sunflowerCountEl.textContent = sunflowerItem ? sunflowerItem.count : 0;
    }
    if (strawberryCountEl) {
      strawberryCountEl.textContent = strawberryItem ? strawberryItem.count : 0;
    }
  }

  updateActivePlotForRadialMenu() {
    if (!this.isRadialMenuOpen || this.currentMap !== 'farm' || !this.player || !this.farmPlots3D) return;

    let nearestPlotIndex = null;
    let minDistance = Infinity;

    this.gameData.farmPlots.forEach((plot, index) => {
      if (plot.unlocked && plot.status === 'empty') {
        const plot3D = this.farmPlots3D[index];
        if (plot3D) {
          const dx = this.player.position.x - plot3D.x;
          const dz = this.player.position.z - plot3D.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDistance) {
            minDistance = dist;
            nearestPlotIndex = index;
          }
        }
      }
    });

    const menuEl = document.getElementById('radial-seed-menu');
    if (!menuEl) return;

    if (nearestPlotIndex !== null && minDistance < 2.2) {
      this.activePlotIndex = nearestPlotIndex;
      menuEl.querySelectorAll('.radial-item-btn').forEach(btn => {
        btn.classList.remove('disabled');
        btn.style.opacity = '1';
      });
    } else {
      this.activePlotIndex = null;
      menuEl.querySelectorAll('.radial-item-btn').forEach(btn => {
        btn.classList.add('disabled');
        btn.style.opacity = '0.5';
      });
    }
  }

  plantCropFromRadialMenu(seedId) {
    if (this.activePlotIndex === null) {
      this.showToast('请靠近空农地后再种植！');
      return;
    }

    const backpackItem = this.gameData.backpack.find(item => item.id === seedId && item.type === 'seed');
    if (!backpackItem || backpackItem.count <= 0) {
      this.showToast(`${seedId === 'sunflower_seed' ? '向日葵' : '草莓'}种子数量不足！正为您打开市集商店...`);
      this.closeRadialSeedMenu();
      this.modalMgr.openModal('shop');
      this.switchShopTab('agriculture');
      return;
    }

    backpackItem.count--;
    
    const plot = this.gameData.farmPlots[this.activePlotIndex];
    plot.status = 'growing';
    plot.seedId = seedId;
    plot.plantTime = Date.now();

    this.saveGameData();
    this.refreshFarm();
    this.updateRadialCounts();

    this.playCustomSound(330, 0.25, 'sine', 0.1);
    this.recreateCrop3D(this.activePlotIndex);

    const cropName = seedId === 'sunflower_seed' ? '向日葵' : '草莓';
    this.showToast(`成功播种了 1 颗 ${cropName} 种子 🌱`);
  }
}

// Start application
window.gameApp = new GameApp();
