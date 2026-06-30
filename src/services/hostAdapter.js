/**
 * 宿主/平台适配器（Task 2.4）。
 *
 * 将 SSO token、用户身份与 API host 解析视为宿主提供的平台数据，
 * 集中于此适配器之后，避免父站 SSO 逻辑散布在核心运行时模块中。
 * 独立运行时回退到本地 localStorage + 本地 API host。
 * 行为与原 `initSSO` token 处理、`loadGameData`/`saveGameData` 一致。
 */
export class HostAdapter {
  /** 从 URL 捕获 SSO 凭证并持久化，随后清理 URL（原 initSSO 头部逻辑）。 */
  consumeUrlSSO() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('sso_access_token');
    const userStr = urlParams.get('sso_user');
    if (token && userStr) {
      localStorage.setItem('sso_access_token', token);
      localStorage.setItem('sso_user', userStr);

      urlParams.delete('sso_access_token');
      urlParams.delete('sso_user');
      const cleanQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  getToken() {
    return localStorage.getItem('sso_access_token');
  }

  /** 解析当前登录用户，未登录或解析失败返回 null。 */
  getUser() {
    const userStr = localStorage.getItem('sso_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  isLoggedIn() {
    return !!(this.getToken() && localStorage.getItem('sso_user'));
  }

  /** 后端 API host（本地开发回退到本机 3001）。 */
  getApiHost() {
    return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `http://${window.location.hostname}:3001`
      : 'http://111.229.107.228:3001';
  }
}
