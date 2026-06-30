/**
 * 商店面板（Task 6.5 / 8.4）。
 *
 * 拥有农场商店的标签切换、商品渲染、选择、购买数量与购买执行，从 `main.js` 抽取。
 * 通过 `app.shell` 解析父级/独立文档，通过 `app.config` 读取商品数据，
 * 通过 `app` 的经济/提示服务变更状态（Task 8.5：优先服务与外壳桥接）。
 */
export class ShopPanel {
  constructor(app) {
    this.app = app;
  }

  init() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const tabs = pDoc.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.getAttribute('data-tab'));
      });
    });

    this.switchTab('agriculture');

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
          this.updateBuyCountUI();
        }
      });
    }

    if (plusBtn && slider) {
      plusBtn.addEventListener('click', () => {
        let val = parseInt(slider.value) || 1;
        if (val < 99) {
          slider.value = val + 1;
          this.updateBuyCountUI();
        }
      });
    }

    if (plus10Btn && slider) {
      plus10Btn.addEventListener('click', () => {
        let val = parseInt(slider.value) || 1;
        slider.value = Math.min(99, val + 10);
        this.updateBuyCountUI();
      });
    }

    if (slider) {
      slider.addEventListener('input', () => this.updateBuyCountUI());
    }

    if (executeBtn) {
      executeBtn.addEventListener('click', (e) => {
        if (!app.selectedShopItem) return;
        const count = parseInt(slider ? slider.value : 1) || 1;
        this.executeBuy(app.selectedShopItem, count, e.clientX, e.clientY);
      });
    }
  }

  switchTab(tabName) {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const tabs = pDoc.querySelectorAll('#modal-shop .shop-tabactive');
    tabs.forEach((tab) => {
      if (tab.getAttribute('data-tab') === tabName) {
        tabs.forEach((t) => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = 'var(--text-muted)';
        });
        tab.classList.add('active');
        tab.style.borderBottomColor = 'var(--primary)';
        tab.style.color = '#fff';
        this.renderItems(tabName);
      }
    });
  }

  renderItems(tabName) {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const grid = pDoc.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const items = (app.config.shopGoods && app.config.shopGoods[tabName]) || [];
    items.forEach((item) => {
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
        this.selectItem(item);
      });
      grid.appendChild(card);
    });

    app.selectedShopItem = null;
    const detailEmpty = pDoc.querySelector('#shop-item-detail .shop-detail-empty');
    const detailContent = pDoc.querySelector('#shop-item-detail .shop-detail-content');
    if (detailEmpty) detailEmpty.style.display = 'flex';
    if (detailContent) detailContent.style.display = 'none';
  }

  selectItem(item) {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    app.selectedShopItem = item;
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
      ownedCount = app.gameData.ownedFurnitures.includes(item.id) ? 1 : 0;
    } else {
      const bagItem = app.gameData.backpack.find((b) => b.id === item.id);
      ownedCount = bagItem ? bagItem.count : 0;
    }
    if (dOwned) dOwned.textContent = `已拥有: ${ownedCount}`;

    const slider = pDoc.getElementById('shop-buy-count-slider');
    if (slider) slider.value = 1;
    this.updateBuyCountUI();
  }

  updateShopCoins() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const coinEl = pDoc.querySelector('#modal-shop .shop-coins-val');
    if (coinEl) coinEl.textContent = app.gameData.coins;
    const bagCoinEl = pDoc.querySelector('#modal-bag .bag-coins-val');
    if (bagCoinEl) bagCoinEl.textContent = app.gameData.coins;
  }

  updateBuyCountUI() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const slider = pDoc.getElementById('shop-buy-count-slider');
    const countText = pDoc.getElementById('shop-buy-count-text');
    const totalText = pDoc.querySelector('#shop-item-detail .shop-detail-total-price');

    if (!slider || !app.selectedShopItem) return;

    const count = parseInt(slider.value) || 1;
    if (countText) countText.textContent = count;
    if (totalText) {
      totalText.textContent = `🪙 ${app.selectedShopItem.price * count}`;
    }
  }

  executeBuy(item, count, x, y) {
    const app = this.app;
    const totalCost = item.price * count;
    if (app.gameData.coins < totalCost) {
      app.showToast('金币不足，快去每日签到或者收割作物赚取金币吧！🪙');
      return;
    }

    app.updateCoins(-totalCost);

    if (item.type === 'furniture') {
      if (!app.gameData.ownedFurnitures.includes(item.id)) {
        app.gameData.ownedFurnitures.push(item.id);
      }
    } else {
      let bagItem = app.gameData.backpack.find((b) => b.id === item.id);
      if (bagItem) {
        bagItem.count += count;
      } else {
        app.gameData.backpack.push({
          id: item.id,
          name: item.name,
          type: item.type,
          count: count,
          quality: item.quality,
          desc: item.desc
        });
      }
    }

    app.saveGameData();
    this.selectItem(item);
    app.showToast(`成功购买了 ${count} 个 ${item.name} 🛍️！`);
    app.playCustomSound(440, 0.15, 'sine', 0.05);
  }
}
