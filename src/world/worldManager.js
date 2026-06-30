import { ModalManager } from '../ui/Modal.js';
import { Environment } from './Environment.js';
import { IslandGenerator } from './Island.js';
import { HouseGenerator } from './House.js';
import { FarmGenerator } from './Farm.js';
import { PKArenaGenerator } from './PKArena.js';
import { LakeGenerator } from './Lake.js';
import { CastleGenerator } from './Castle.js';
import { Player } from './Player.js';
import { InteractsManager } from './Interacts.js';
import { registerShadowCaster } from '../rendering/helpers.js';

/**
 * World Manager（Task 4.5）。
 * 负责创建当前地图：modal 管理器、环境、地图生成器、玩家、交互管理器、
 * 室内模式与阴影注册，并保留地图特定挂钩（lake 钢琴音符粒子）。
 *
 * 迁移期直接在传入的 `app`（GameApp 实例）上设置运行时引用，保持与原
 * `initWorld` 完全一致的行为；后续阶段可逐步收敛为返回 bundle。
 */
export class WorldManager {
  createWorld(app) {
    const currentMap = app.currentMap;

    app.modalMgr = new ModalManager();
    app.environment = new Environment(app.scene, app.themeConfig);

    if (currentMap === 'island') {
      app.islandGen = new IslandGenerator(app.scene, app.themeConfig);
      app.player = new Player(app.scene, app.camera, app.islandGen.colliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.islandGen, app.modalMgr, app);
      app.environment.setIndoorMode(false);
    } else if (currentMap === 'house') {
      app.houseGen = new HouseGenerator(app.scene, app.themeConfig);
      app.player = new Player(app.scene, app.camera, app.houseGen.colliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.houseGen, app.modalMgr, app);
      app.environment.setIndoorMode(true);
    } else if (currentMap === 'farm') {
      app.farmGen = new FarmGenerator(app.scene, app.themeConfig);
      app.farmPlots3D = app.farmGen.farmPlots3D;
      app.farmInteractables = app.farmGen.interactables;
      app.farmColliders = app.farmGen.colliders;

      app.player = new Player(app.scene, app.camera, app.farmColliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.farmGen, app.modalMgr, app);
      app.environment.setIndoorMode(false);
    } else if (currentMap === 'pk_arena') {
      app.pkArenaGen = new PKArenaGenerator(app.scene, app.themeConfig);
      app.pkArenaInteractables = app.pkArenaGen.interactables;
      app.pkArenaColliders = app.pkArenaGen.colliders;
      app.pkCrystalMesh = app.pkArenaGen.pkCrystalMesh;
      app.swordPreview = app.pkArenaGen.swordPreview;
      app.hammerPreview = app.pkArenaGen.hammerPreview;
      app.bombPreview = app.pkArenaGen.bombPreview;

      app.player = new Player(app.scene, app.camera, app.pkArenaColliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.pkArenaGen, app.modalMgr, app);
      app.environment.setIndoorMode(false);
    } else if (currentMap === 'lake') {
      app.lakeGen = new LakeGenerator(app.scene, app.themeConfig, app);
      app.lakeInteractables = app.lakeGen.interactables;
      app.lakeColliders = app.lakeGen.colliders;

      app.player = new Player(app.scene, app.camera, app.lakeColliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.lakeGen, app.modalMgr, app);
      app.environment.setIndoorMode(false);

      // 监听弹钢琴音符发光粒子特效
      window.addEventListener('piano-note-played', (e) => {
        if (app.currentMap === 'lake' && app.lakeGen) {
          app.lakeGen.spawnNoteParticle(e.detail.note);
        }
      });
    } else if (currentMap === 'castle') {
      app.castleGen = new CastleGenerator(app.scene, app.themeConfig, app);
      app.castleInteractables = app.castleGen.interactables;
      app.castleColliders = app.castleGen.colliders;

      app.player = new Player(app.scene, app.camera, app.castleColliders, app.themeConfig);
      app.interactMgr = new InteractsManager(app.player, app.castleGen, app.modalMgr, app);
      app.environment.setIndoorMode(false);
    }

    app.player.app = app; // 共享 App 引用

    // 收集子场景中的 shadowCasters 并统一开启阴影投射
    let sceneShadowCasters = [];
    if (app.islandGen) sceneShadowCasters = app.islandGen.getShadowCasters();
    else if (app.houseGen) sceneShadowCasters = app.houseGen.getShadowCasters();
    else if (app.farmGen) sceneShadowCasters = app.farmGen.getShadowCasters();
    else if (app.pkArenaGen) sceneShadowCasters = app.pkArenaGen.getShadowCasters();
    else if (app.lakeGen) sceneShadowCasters = app.lakeGen.getShadowCasters();
    else if (app.castleGen) sceneShadowCasters = app.castleGen.getShadowCasters();

    if (app.environment && app.environment.shadowGenerator && sceneShadowCasters.length > 0) {
      sceneShadowCasters.forEach(mesh => {
        registerShadowCaster(app.environment, mesh, true);
      });
    }

    // 蓝图建筑最小集成路径（Task 7.6）：仅在小屋/城堡/群岛测试路由且 URL 提供
    // `?blueprint=<url>` 时按需加载蓝图建筑，默认不改变现有地图可见行为。
    this.maybeLoadBlueprintBuilding(app);
  }

  /** 检测 `?blueprint=` 查询并在受支持的路由中懒加载蓝图建筑（不嵌入编辑器 UI）。 */
  maybeLoadBlueprintBuilding(app) {
    const supported = ['house', 'castle', 'island'];
    if (!supported.includes(app.currentMap)) return;

    import('../generators/blueprint/loadBlueprintBuilding.js')
      .then(({ resolveBlueprintQuery, loadBlueprintBuilding }) => {
        const source = resolveBlueprintQuery();
        if (!source) return;
        return loadBlueprintBuilding(app, source).catch((e) => {
          console.warn('[WorldManager] 蓝图建筑加载失败:', e);
        });
      })
      .catch((e) => console.warn('[WorldManager] 蓝图集成模块加载失败:', e));
  }
}
