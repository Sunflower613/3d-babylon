/**
 * Toast 服务（Task 2.3）。
 *
 * 统一状态消息提示，替代玩法逻辑中手动创建 DOM toast 节点。
 * 行为与原 `showToast` / `showStuckToast` / `window.showMockToast` 一致。
 */
export class ToastService {
  /** 常规 toast（原 showToast）。 */
  show(msg) {
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

  /** "卡住"提示（原 showStuckToast），仅在宿主注册 showMockToast 时显示。 */
  showStuck(msg) {
    if (!window.showMockToast) return;
    this._mockToast(msg, 2000);
  }

  /** "功能开发中"提示（原 window.showMockToast）。 */
  showMock(name) {
    this._mockToast(`${name} 功能正在开发中，敬请期待！😊`, 2200);
  }

  _mockToast(text, holdMs) {
    const existing = document.querySelector('.mock-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mock-toast';
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, holdMs);
  }
}
