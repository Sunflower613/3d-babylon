import { GameContext } from './src/app/GameContext.js';
import { ConfigProvider } from './src/services/configProvider.js';
import { ShellBridge } from './src/services/shellBridge.js';
import { AudioService } from './src/services/audioService.js';
import { ToastService } from './src/services/toastService.js';
import { HostAdapter } from './src/services/hostAdapter.js';
import { RouterService } from './src/services/router.js';
import { GameDataService } from './src/services/gameDataService.js';
import { resolveCurrentMap } from './src/world/mapResolver.js';
import { applySpawn } from './src/world/spawnResolver.js';
import { WorldManager } from './src/world/worldManager.js';
import { EngineRuntime } from './src/core/runtime.js';
import { Clock } from './src/core/clock.js';
import { GameLoop } from './src/core/gameLoop.js';
import { createFlatMaterial } from './src/rendering/helpers.js';
import { EntityManager } from './src/entities/EntityManager.js';
import { BallGameplay } from './src/gameplay/ball/BallGameplay.js';
import { FarmGameplay } from './src/gameplay/farm/FarmGameplay.js';
import { PKGameplay } from './src/gameplay/pk/PKGameplay.js';
import { HomeBuildGameplay } from './src/gameplay/home/HomeBuildGameplay.js';
import { PokerGame } from './src/gameplay/arcade/PokerGame.js';
import { Economy } from './src/gameplay/economy/Economy.js';
import { ShopPanel } from './src/ui/panels/ShopPanel.js';
import { BagPanel } from './src/ui/panels/BagPanel.js';
import { TaskPanel } from './src/ui/panels/TaskPanel.js';
import { LeaderboardPanel } from './src/ui/panels/LeaderboardPanel.js';
import { WardrobePanel } from './src/ui/panels/WardrobePanel.js';
import { MobileControls } from './src/ui/input/MobileControls.js';
import { HudGui } from './src/ui/HudGui.js';

/**
 * GameApp：3D 模块的启动与组合入口（Task 9.1）。
 *
 * `main.js` 仅负责：创建运行时（engine/scene/camera/loop）、配置 provider 与
 * 宿主桥接、世界加载、实体管理器、服务与玩法/UI 模块的组合接线。具体的引擎、
 * 世界、实体、玩法、UI 与宿主集成逻辑均委托给 `src/` 下的专门模块。
 *
 * GameApp 同时作为迁移期的兼容上下文：已抽取模块通过 `app.*` 访问共享运行时
 * 引用与状态，外部模块（Interacts / app-shell / Modal）通过 `app` 的薄委托方法
 * 调用玩法行为，保持现有可见行为不变。
 */
class GameApp {
  constructor(options = {}) {
    this.bindDeviceGuards();

    this.container = options.container || document.getElementById('canvas-container');

    // 时钟（解除对 Three.js Clock 的依赖）
    this.clock = new Clock();

    // 核心运行组件（由 EngineRuntime 在 initEngine 中创建）
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.player = null;
    this.environment = null;

    // 地图生成器引用（由 WorldManager 按当前地图设置）
    this.islandGen = null;
    this.houseGen = null;
    this.farmGen = null;
    this.pkArenaGen = null;
    this.lakeGen = null;
    this.castleGen = null;

    this.modalMgr = null;
    this.interactMgr = null;
    this.activeBombs = [];
    this.activeExplosions = [];
    this.bombCooldownActive = false;

    // 配置 provider（数据来自内部 data 层，site-config 作为 fallback）
    this.config = new ConfigProvider(options.theme || null);
    this.themeConfig = this.config.getThemeConfig();

    // 宿主与平台服务
    this.shell = new ShellBridge();
    this.audio = new AudioService();
    this.toast = new ToastService();
    this.host = new HostAdapter();
    this.router = new RouterService(this.shell);
    this.gameDataService = new GameDataService(this);

    // 世界管理器与实体管理器
    this.world = new WorldManager();
    this.entityManager = new EntityManager();

    // 玩法模块
    this.economy = new Economy(this);
    this.farm = new FarmGameplay(this);
    this.pk = new PKGameplay(this);
    this.homeBuild = new HomeBuildGameplay(this);
    this.poker = new PokerGame(this);
    this.ballGameplay = new BallGameplay(this, this.config.activeTheme === 'christmas');

    // UI 模块
    this.shopPanel = new ShopPanel(this);
    this.bagPanel = new BagPanel(this);
    this.taskPanel = new TaskPanel(this);
    this.leaderboardPanel = new LeaderboardPanel(this);
    this.wardrobePanel = new WardrobePanel(this);
    this.mobileControls = new MobileControls(this);
    this.hudGui = new HudGui(this);

    // 兼容上下文对象（向已抽取模块暴露运行时引用与宿主适配器）
    this.ctx = new GameContext(this, {
      config: this.config,
      shell: this.shell,
      audio: this.audio,
      toast: this.toast,
      host: this.host,
    });

    this.initEngine();
    this.initWorld();
    this.initSSO();
    this.initGameSystems();

    // 启动渲染循环
    this.loop = new GameLoop(this.engine, this.clock);
    this.loop.start((delta, time) => {
      this.animate(delta, time);
    });
  }

  bindDeviceGuards() {
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
  }

  initEngine() {
    this.runtime = new EngineRuntime(this.container);
    this.engine = this.runtime.engine;
    this.scene = this.runtime.scene;
    this.glowLayer = this.runtime.glowLayer;
    this.camera = this.runtime.camera;
  }

  initWorld() {
    // 根据 DOM id 识别当前所在子场景
    this.currentMap = resolveCurrentMap();

    // 创建当前地图：生成器、玩家、环境、交互管理器、阴影注册与地图特定挂钩
    this.world.createWorld(this);

    // 从 URL 提取并还原出生点坐标，或选择默认出生点与朝向
    applySpawn(this.player, this.currentMap);

    // 沙滩球生成/踢球音效（仅群岛地图生成）
    this.ballGameplay.init();

    // 衣柜换装绑定
    this.wardrobePanel.init();

    // 右上角昼夜模式切换
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

    this.hudGui.init();
    this.mobileControls.init();

    // 触发外壳页面加载回调
    const appShell = this.shell.getAppShell();
    if (appShell && typeof appShell.onMapLoaded === 'function') {
      appShell.onMapLoaded(this.currentMap);
    }
  }

  // ==================== SSO 与侧边栏 ====================
  initSSO() {
    this.host.consumeUrlSSO();

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
      this.toast.showMock(name);
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

    const user = this.host.isLoggedIn() ? this.host.getUser() : null;
    if (user) {
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
    }
  }

  // ==================== 游戏系统组合 ====================
  initGameSystems() {
    this.loadGameData();
    this.shopPanel.init();
    this.bagPanel.init();
    this.taskPanel.init();
    this.leaderboardPanel.init();
    this.pk.initPKUI();
    this.poker.init();
    this.farm.initRadialMenu();

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

    // 重置/脱困
    const resetBtn = document.getElementById('menu-action-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unstuckPlayer();
      });
    }
  }

  // ==================== 每帧 ====================
  animate(delta, time) {
    // 移动端外壳攻击同步键
    if (window.parent && window.parent.keys) {
      const parentJ = !!window.parent.keys.j;
      if (parentJ && !this.lastParentJ) {
        this.playerPerformAttack();
      }
      this.lastParentJ = parentJ;
    }

    if (this.player) this.player.update(delta, time);
    if (this.environment) this.environment.update(time);
    if (this.islandGen) this.islandGen.update(time, this.environment);
    if (this.interactMgr) this.interactMgr.update();

    // 沙滩球物理
    this.ballGameplay.update(delta);

    // 种植地块、PK 战斗、家具摆放等每帧控制流
    this.updateGameSystemsFrame(delta, time);

    // 云顶天池物理
    if (this.currentMap === 'lake' && this.lakeGen) {
      this.lakeGen.update(delta, time, this.player);
    }

    // 粉色庄园叠水与池塘下陷
    if (this.currentMap === 'castle' && this.castleGen) {
      this.castleGen.update(delta, time, this.player);
    }

    if (this.scene && this.camera) {
      this.scene.render();
    }
  }

  updateGameSystemsFrame(delta, time) {
    this.farm.updateActivePlotForRadialMenu();
    this.farm.updateFarmPlotsFrame();
    this.farm.updateFallGuard();
    this.pk.updatePKBattleFrame(delta);
    this.homeBuild.updateHomeBuildFrame();
    this.pk.updatePKHallAnimations(delta, time);
  }

  // ==================== 薄委托方法（保持外部/模块调用契约）====================
  createFlatMaterial(name, colorHex) {
    return createFlatMaterial(this.scene, name, colorHex);
  }

  playCustomSound(freq, duration, type = 'sine', vol = 0.05) {
    this.audio.play(freq, duration, type, vol);
  }

  showToast(msg) {
    this.toast.show(msg);
  }

  showStuckToast(msg) {
    this.toast.showStuck(msg);
  }

  switchMap(targetMap, spawnPoint = null, autoOpenModal = null, action = null) {
    this.router.switchMap(targetMap, spawnPoint, autoOpenModal, action);
  }

  // 存档
  getInitialGameData() {
    return this.gameDataService.getInitialGameData();
  }
  loadGameData() {
    return this.gameDataService.loadGameData();
  }
  saveGameData() {
    return this.gameDataService.saveGameData();
  }

  // 经济
  updateCoins(change) {
    this.economy.updateCoins(change);
  }
  gainExp(amount) {
    this.economy.gainExp(amount);
  }
  updateCoinsDisplay() {
    this.economy.updateCoinsDisplay();
  }
  updateLevelProgress() {
    this.economy.updateLevelProgress();
  }

  // 农场
  triggerPlotInteraction(plotIndex) {
    this.farm.triggerPlotInteraction(plotIndex);
  }
  showPlotRadialMenu() {
    this.farm.showPlotRadialMenu();
  }
  recreateCrop3D(plotIndex) {
    this.farm.recreateCrop3D(plotIndex);
  }

  // PK
  playerPerformAttack() {
    this.pk.playerPerformAttack();
  }

  // UI 面板
  setGuiInteractBtnVisible(visible, iconType = 'interact') {
    this.hudGui.setInteractBtnVisible(visible, iconType);
  }
  updateShopCoins() {
    this.shopPanel.updateShopCoins();
  }
  triggerTaskProgress(type) {
    this.taskPanel.triggerProgress(type);
  }
  renderLeaderboard(tabName) {
    this.leaderboardPanel.render(tabName);
  }
  getActiveLeaderboardTab() {
    return this.leaderboardPanel.getActiveTab();
  }

  // 脱困重置
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

    this.showStuckToast('重置成功！角色已脱离卡死 🌀');
  }
}

// 绑定 DOM 载入完成初始化（保留 window.gameApp 兼容，供退出/调试流程使用）
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});

export { GameApp };
