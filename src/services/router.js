import { mapUrlFor } from '../world/mapRegistry.js';

/**
 * 路由服务（Task 4.4）。
 * 使用地图注册表将地图键解析为页面 URL，附加 spawn/modal/action 查询参数，
 * 淡出后导航。行为与原 `GameApp.switchMap` 一致。
 */
export class RouterService {
  constructor(shell) {
    this.shell = shell;
  }

  switchMap(targetMap, spawnPoint = null, autoOpenModal = null, action = null) {
    console.log('[Router] switchMap called with targetMap:', targetMap);
    console.trace('[Router] switchMap call trace:');

    let targetUrl = mapUrlFor(targetMap);

    const params = [];
    if (spawnPoint) {
      params.push(`spawn=${spawnPoint.x.toFixed(2)},${spawnPoint.y.toFixed(2)},${spawnPoint.z.toFixed(2)}`);
    }
    if (autoOpenModal) {
      params.push(`modal=${autoOpenModal}`);
    }
    if (action) {
      params.push(`action=${action}`);
    }
    if (params.length > 0) {
      targetUrl += '?' + params.join('&');
    }

    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) {
      fadeOverlay.classList.add('fade-in');
    }

    setTimeout(() => {
      this.shell.navigate(targetUrl);
    }, 450);
  }
}
