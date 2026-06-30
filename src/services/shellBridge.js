/**
 * Shell Bridge（Task 2.2）。
 *
 * 封装宿主外壳/父级/iframe 行为，提供独立运行 fallback：
 * - 父级 document 解析（散落的 `window.parent.document` 访问统一走此处）
 * - appShell 句柄获取
 * - 侧边栏 DOM 开关
 * - 父级/独立导航
 *
 * 当无父级宿主时，所有访问回退到当前 window/document，保证独立运行。
 */
export class ShellBridge {
  get hasParent() {
    return typeof window !== 'undefined' && window.parent && window.parent !== window;
  }

  /** 父级 document（无父级时回退当前 document）。 */
  getParentDoc() {
    return this.hasParent ? window.parent.document : document;
  }

  /** 宿主 appShell 句柄（本窗口或父窗口）。 */
  getAppShell() {
    return window.appShell || (this.hasParent && window.parent.appShell) || null;
  }

  /** 父窗口对象（无父级时为当前 window）。 */
  getParentWindow() {
    return this.hasParent ? window.parent : window;
  }

  /** 在父级/独立环境中查找元素（优先本文档，回退父级文档）。 */
  getElement(id) {
    return document.getElementById(id) || (this.hasParent && window.parent.document.getElementById(id)) || null;
  }

  openSidebar() {
    const sidebar = document.getElementById('sso-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('visible');
  }

  closeSidebar() {
    const sidebar = document.getElementById('sso-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }

  /** 导航到目标地址（独立运行时走 window.location）。 */
  navigate(url) {
    window.location.href = url;
  }
}
