/**
 * 自制时钟（Task 3.2）。
 * 解除对 Three.js Clock 的依赖，提供秒级 delta 与累计经过时间。
 */
export class Clock {
  constructor() {
    this.lastTime = performance.now();
    this.startTime = performance.now();
  }

  getDelta() {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    return delta;
  }

  getElapsedTime() {
    return (performance.now() - this.startTime) / 1000;
  }
}
