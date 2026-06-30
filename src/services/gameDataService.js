import { INITIAL_BACKPACK } from '../data/seedCatalog.js';
import { createInitialTasks } from '../data/taskDefs.js';

/**
 * 游戏存档服务（Task 6.5 / 抽取清单 game-data）。
 *
 * 拥有初始存档、加载与保存逻辑，从 `main.js` 抽取。初始背包与任务定义改由
 * data 层（seedCatalog / taskDefs）提供。通过 `app.host`（HostAdapter）获取
 * token / apiHost，使宿主登录态访问位于平台适配器之后。加载完成后将存档写入
 * `app.gameData` 并触发金币/等级 UI 刷新，保持原行为。
 */
export class GameDataService {
  constructor(app) {
    this.app = app;
  }

  getInitialGameData() {
    return {
      coins: 200,
      level: 1,
      exp: 0,
      pkPoints: 1000,
      pkWins: 0,
      pkLoses: 0,
      backpack: INITIAL_BACKPACK.map((item) => ({ ...item })),
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
      tasks: createInitialTasks(),
      dailyChestClaimed: false
    };
  }

  async loadGameData() {
    const app = this.app;
    const token = app.host.getToken();
    const apiHost = app.host.getApiHost();

    let loadedData = null;
    if (token) {
      try {
        const response = await fetch(`${apiHost}/api/game/data?game_id=3d-home-all`, {
          headers: { Authorization: `Bearer ${token}` }
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

    app.gameData = loadedData || this.getInitialGameData();
    app.updateCoinsDisplay();
    app.updateLevelProgress();
  }

  async saveGameData() {
    const app = this.app;
    const dataStr = JSON.stringify(app.gameData);
    localStorage.setItem('game_data_3d_home', dataStr);

    const token = app.host.getToken();
    const apiHost = app.host.getApiHost();

    if (token) {
      try {
        await fetch(`${apiHost}/api/game/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
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
}
