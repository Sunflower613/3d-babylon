import * as BABYLON from '@babylonjs/core';
import { registerShadowCaster, projectToScreen } from '../../rendering/helpers.js';
import { SEED_CATALOG } from '../../data/seedCatalog.js';

/**
 * 农场玩法（Task 6.1）。
 *
 * 拥有农田状态读写、作物 3D 渲染、径向种植菜单 hook、种植、收获与农场每帧更新，
 * 从 `main.js` 抽取而来。通过 `app`（兼容上下文）访问 scene/camera/gameData/
 * 经济与提示服务，不在玩法外重复实现这些基础设施。
 *
 * 共享运行时状态（farmPlots3D / gameData / activePlotIndex）仍挂在 app 上，
 * 以保持与 Interacts、背包等模块的现有交互不变。
 */
export class FarmGameplay {
  constructor(app) {
    this.app = app;
  }

  /** 绑定径向种植菜单选项事件。 */
  initRadialMenu() {
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

  updateFarmPlotsFrame() {
    const app = this.app;
    const container = document.getElementById('farm-bubbles-container');
    if (!container) return;

    const plots3D = app.farmPlots3D;
    if (!plots3D || !app.gameData || app.currentMap !== 'farm') {
      container.innerHTML = '';
      return;
    }

    app.gameData.farmPlots.forEach((plot, idx) => {
      const plot3D = plots3D[idx];
      if (!plot3D) return;

      const hasMesh = plot3D.plantGroup.getChildren().length > 0;
      if (plot.status !== 'empty' && !hasMesh) {
        this.recreateCrop3D(idx);
      }

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

      const worldPos = new BABYLON.Vector3(plot3D.x, 1.4, plot3D.z);
      const screenPos = projectToScreen(app.scene, app.camera, worldPos);

      bubble.style.left = `${screenPos.x}px`;
      bubble.style.top = `${screenPos.y}px`;

      const matureTime = (SEED_CATALOG[plot.seedId] && SEED_CATALOG[plot.seedId].matureTime) || 60;
      const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
      const remaining = Math.max(0, matureTime - elapsed);

      if (remaining === 0) {
        if (plot.status !== 'ready') {
          plot.status = 'ready';
          plot3D.plantGroup.scaling.set(1.0, 1.0, 1.0);
        }
        bubble.innerHTML = `<span class="emoji">🌾</span> 可收割`;
        bubble.classList.add('ready');
      } else {
        const percent = Math.min(100, Math.floor((elapsed / matureTime) * 100));
        bubble.innerHTML = `<span class="timer">${remaining}s</span> 生长中`;
        bubble.classList.remove('ready');

        const scaleVal = 0.15 + (percent / 100) * 0.85;
        plot3D.plantGroup.scaling.set(scaleVal, scaleVal, scaleVal);
      }
    });
  }

  recreateCrop3D(plotIndex) {
    const app = this.app;
    if (!app.farmPlots3D) return;
    const plot3D = app.farmPlots3D[plotIndex];
    if (!plot3D) return;

    plot3D.plantGroup.getChildren().forEach((child) => child.dispose());

    const plot = app.gameData.farmPlots[plotIndex];
    if (plot.status === 'empty' || !plot.seedId) return;

    const plant = new BABYLON.TransformNode('cropEntity', app.scene);
    const isSunflower = plot.seedId === 'sunflower_seed';

    if (isSunflower) {
      const stem = BABYLON.MeshBuilder.CreateCylinder('stem', { diameterTop: 0.08, diameterBottom: 0.08, height: 0.7, tessellation: 6 }, app.scene);
      stem.position.y = 0.35;
      stem.parent = plant;
      stem.material = app.createFlatMaterial('stemGreen', 0x2e7d32);
      registerShadowCaster(app.environment, stem, true);

      const head = BABYLON.MeshBuilder.CreateCylinder('head', { diameterTop: 0.4, diameterBottom: 0.4, height: 0.06, tessellation: 8 }, app.scene);
      head.position.set(0, 0.7, 0.05);
      head.rotation.x = Math.PI / 4;
      head.parent = plant;
      head.material = app.createFlatMaterial('headYellow', 0xffeb3b);

      const center = BABYLON.MeshBuilder.CreateCylinder('center', { diameterTop: 0.2, diameterBottom: 0.2, height: 0.08, tessellation: 8 }, app.scene);
      center.position.set(0, 0.72, 0.07);
      center.rotation.x = Math.PI / 4;
      center.parent = plant;
      center.material = app.createFlatMaterial('headBrown', 0x5d4037);
    } else {
      const leaf = BABYLON.MeshBuilder.CreateBox('strawberryLeaf', { width: 0.25, height: 0.04, depth: 0.25 }, app.scene);
      leaf.position.y = 0.04;
      leaf.parent = plant;
      leaf.material = app.createFlatMaterial('leafGreen', 0x27ae60);

      const fruit = BABYLON.MeshBuilder.CreateCylinder('strawberryFruit', { diameterTop: 0, diameterBottom: 0.36, height: 0.35, tessellation: 6 }, app.scene);
      fruit.rotation.x = Math.PI;
      fruit.position.y = 0.25;
      fruit.parent = plant;
      fruit.material = app.createFlatMaterial('fruitRed', 0xff1744);
      registerShadowCaster(app.environment, fruit, true);
    }

    plant.parent = plot3D.plantGroup;
    if (plot.status === 'ready') {
      plot3D.plantGroup.scaling.set(1.0, 1.0, 1.0);
    } else {
      plot3D.plantGroup.scaling.set(0.15, 0.15, 0.15);
    }
  }

  showPlotRadialMenu() {
    const app = this.app;
    let closestIdx = -1;
    let minDist = 999;

    if (app.farmPlots3D) {
      app.farmPlots3D.forEach((plot, idx) => {
        const dist = BABYLON.Vector3.Distance(app.player.position, new BABYLON.Vector3(plot.x, 0.6, plot.z));
        if (dist < 2.0 && dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
    }

    if (closestIdx === -1) {
      app.showToast('请走到任一泥土农田附近以开启种植！🌱');
      return;
    }

    app.activePlotIndex = closestIdx;

    const radial = document.getElementById('radial-menu-container');
    if (radial) radial.style.display = 'block';
  }

  updateActivePlotForRadialMenu() {
    const app = this.app;
    const radial = document.getElementById('radial-menu-container');
    if (!radial || radial.style.display !== 'block' || app.activePlotIndex === undefined) return;

    const plot3D = app.farmPlots3D[app.activePlotIndex];
    if (!plot3D) return;

    const worldPos = new BABYLON.Vector3(plot3D.x, 0.72, plot3D.z);
    const screenPos = projectToScreen(app.scene, app.camera, worldPos);

    radial.style.left = `${screenPos.x}px`;
    radial.style.top = `${screenPos.y}px`;
  }

  /** 农场坠落保护：玩家跌出浮空地形时传送回出生点（从 main.js 抽取的农场玩法）。 */
  updateFallGuard() {
    const app = this.app;
    if (app.currentMap !== 'farm') return;
    if (app.player && app.player.position.y < -3.5) {
      app.player.position.set(0, 0.6 + 0.1, -8.0);
      app.player.velocity.set(0, 0, 0);
      app.player.group.position.copyFrom(app.player.position);
      app.showStuckToast('小心！不要掉入农场外的浮空深渊哦 ☁️');
    }
  }

  triggerPlotInteraction(plotIndex) {
    const app = this.app;
    const plot = app.gameData.farmPlots[plotIndex];
    if (plot.status === 'ready') {
      plot.status = 'empty';
      const seedType = plot.seedId;
      plot.seedId = null;
      plot.plantTime = 0;

      const plot3D = app.farmPlots3D[plotIndex];
      if (plot3D) {
        plot3D.plantGroup.getChildren().forEach((child) => child.dispose());
      }

      const rew = SEED_CATALOG[seedType] || { coins: 20, exp: 15 };
      app.updateCoins(rew.coins);
      app.gainExp(rew.exp);
      app.triggerTaskProgress('harvest');

      const shortName = (SEED_CATALOG[seedType] && SEED_CATALOG[seedType].shortName) || '作物';
      app.showToast(`成功收割了 ${shortName} 🌾！已存入背包`);
    } else {
      app.activePlotIndex = plotIndex;
      const radial = document.getElementById('radial-menu-container');
      if (radial) radial.style.display = 'block';
    }
  }

  executePlantSeed(seedId) {
    const app = this.app;
    const radialMenu = document.getElementById('radial-menu-container');
    if (radialMenu) radialMenu.style.display = 'none';

    if (app.activePlotIndex === undefined) return;

    const plot = app.gameData.farmPlots[app.activePlotIndex];
    if (plot.status !== 'empty') return;

    const bagItem = app.gameData.backpack.find((b) => b.id === seedId);
    if (!bagItem || bagItem.count <= 0) {
      const chName = (SEED_CATALOG[seedId] && SEED_CATALOG[seedId].shortName) || '种';
      app.showToast(`背包里没有 ${chName}种子，请走向房屋前的自动货商购买 🛍️`);
      return;
    }

    bagItem.count--;
    plot.status = 'growing';
    plot.seedId = seedId;
    plot.plantTime = Date.now();

    app.saveGameData();
    this.recreateCrop3D(app.activePlotIndex);
    app.showToast('种植成功 🌱！作物正在茁壮成长中...');
    app.playCustomSound(320, 0.2, 'sine', 0.05);
  }
}
