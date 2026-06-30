/**
 * 衣柜面板（Task 8.3）。
 *
 * 拥有衣柜换装颜色选择与模型切换绑定，从 `main.js` 抽取。通过 `app.player`
 * 的 `updateOutfit` / `updateModel` 应用换装，音效走 `app.playCustomSound`。
 */
export class WardrobePanel {
  constructor(app) {
    this.app = app;
  }

  init() {
    const app = this.app;

    const setupSection = (sectionId, type) => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const buttons = section.querySelectorAll('.color-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          section.querySelector('.color-btn.active')?.classList.remove('active');
          btn.classList.add('active');
          const color = btn.getAttribute('data-color');
          if (app.player) {
            app.player.updateOutfit(type, color);
          }
        });
      });
    };

    setupSection('wardrobe-hair', 'hair');
    setupSection('wardrobe-clothes', 'clothing');
    setupSection('wardrobe-hat', 'hat');

    const modelBtns = document.querySelectorAll('.model-btn');
    modelBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelector('.model-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        const modelType = btn.getAttribute('data-model');
        if (app.player) {
          app.player.updateModel(modelType);

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
          app.playCustomSound(440, 0.15, 'triangle', 0.06);
        }
      });
    });
  }
}
