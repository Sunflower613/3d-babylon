/**
 * 背包面板（Task 6.5 / 8.4）。
 *
 * 拥有背包标签、物品渲染与使用逻辑，从 `main.js` 抽取。种子使用在农场地图
 * 会触发径向种植菜单（委托 app 农场玩法），保持原行为。
 */
export class BagPanel {
  constructor(app) {
    this.app = app;
  }

  init() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const tabs = pDoc.querySelectorAll('#modal-bag .bag-tabactive');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderItems(tab.getAttribute('data-tab'));
      });
    });

    this.renderItems('seed');
  }

  renderItems(tabName) {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const grid = pDoc.getElementById('bag-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const shopGoods = app.config.shopGoods || {};
    const list = app.gameData.backpack.filter((b) => b.type === tabName) || [];
    list.forEach((item) => {
      if (item.count <= 0) return;
      const card = pDoc.createElement('div');
      card.className = `bag-item-card ${item.quality || 'green'}`;
      card.innerHTML = `
        <div class="item-icon">${(shopGoods.agriculture && shopGoods.agriculture.find((g) => g.id === item.id)?.icon) || '🌻'}</div>
        <div class="item-info">
          <h4>${item.name}</h4>
          <span class="count">拥有: ${item.count}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        app.selectedBagItem = item;
        this.useItem(item);
      });
      grid.appendChild(card);
    });
  }

  useItem(item) {
    const app = this.app;
    if (item.type === 'seed' && app.currentMap === 'farm') {
      app.modalMgr.closeAllModals();
      app.showPlotRadialMenu();
    }
  }
}
