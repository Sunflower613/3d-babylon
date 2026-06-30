/**
 * 经济与等级进度（Task 6.5 / 抽取清单 economy）。
 *
 * 拥有金币、经验、等级的更新与显示刷新，从 `main.js` 抽取。通过 `app`
 * （兼容上下文）访问 gameData、提示/音频服务、存档保存与商店/排行榜面板刷新。
 */
export class Economy {
  constructor(app) {
    this.app = app;
  }

  updateCoinsDisplay() {
    const app = this.app;
    const els = document.querySelectorAll('.coins-val');
    els.forEach((el) => { el.textContent = app.gameData.coins; });
    app.updateShopCoins();
  }

  updateLevelProgress() {
    const app = this.app;
    const levelVal = document.getElementById('level-val');
    const expFill = document.getElementById('exp-fill');
    if (levelVal) levelVal.textContent = app.gameData.level;
    if (expFill) {
      const levelUpNeed = app.gameData.level * 100;
      const pct = Math.min(100, Math.floor((app.gameData.exp / levelUpNeed) * 100));
      expFill.style.width = `${pct}%`;
    }
  }

  gainExp(amount) {
    const app = this.app;
    app.gameData.exp += amount;
    let needed = app.gameData.level * 100;
    while (app.gameData.exp >= needed) {
      app.gameData.exp -= needed;
      app.gameData.level++;
      needed = app.gameData.level * 100;
      app.showToast(`🎉 恭喜升级！当前等级: Lv.${app.gameData.level}`);
      app.playCustomSound(520, 0.4, 'sine', 0.12);
    }
    this.updateLevelProgress();
    app.saveGameData();
    if (typeof app.renderLeaderboard === 'function') {
      const activeTab = app.getActiveLeaderboardTab();
      app.renderLeaderboard(activeTab);
    }
  }

  updateCoins(change) {
    const app = this.app;
    app.gameData.coins = Math.max(0, app.gameData.coins + change);
    this.updateCoinsDisplay();
    app.saveGameData();
    if (typeof app.renderLeaderboard === 'function') {
      const activeTab = app.getActiveLeaderboardTab();
      app.renderLeaderboard(activeTab);
    }
  }
}
