/**
 * Babylon GUI HUD（Task 8.2）。
 *
 * 项目当前禁用 Babylon GUI 摇杆/按钮渲染，改用 HTML 绝对定位悬浮控制
 * （见 ui/input/MobileControls.js）。此模块隔离已禁用的 GUI HUD 路径，
 * 避免其干扰当前有效的移动端控制实现。
 *
 * `init()` 保持禁用（直接返回），与原 `initHUDGUI` 的禁用行为一致；
 * `setInteractBtnVisible` 仅在 GUI 交互按钮存在时生效（当前恒为 no-op），
 * 保留契约以备未来重新启用 GUI HUD。
 */

const INTERACT_ICONS = {
  interact: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>`),
  sprout: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10" /><path d="M10 20c5.5-2.5 8-6.4 8-12a4 4 0 0 0-8 0c0 5.5 2.5 9.5 8 12Z" /><path d="M10 20c-5.5-2.5-8-6.4-8-12a4 4 0 0 1 8 0c0 5.5-2.5 9.5-8 12Z" /></svg>`),
  drop: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`)
};

export class HudGui {
  constructor(app) {
    this.app = app;
  }

  /** 已禁用：保留禁用行为，改用 HTML 移动端控制。 */
  init() {
    return;
  }

  /** GUI 交互按钮可见性（仅在 GUI HUD 启用且按钮存在时生效）。 */
  setInteractBtnVisible(visible, iconType = 'interact') {
    const btn = this.app.guiInteractBtn;
    if (!btn) return;
    btn.isVisible = visible;
    if (visible) {
      if (iconType === 'sprout') btn.updateContent(INTERACT_ICONS.sprout);
      else if (iconType === 'drop') btn.updateContent(INTERACT_ICONS.drop);
      else if (iconType === 'interact') btn.updateContent(INTERACT_ICONS.interact);
      else btn.updateContent(iconType);
    }
  }
}
