import { Clock } from './clock.js';

/**
 * 游戏循环（Task 3.2）。
 * 拥有时钟并驱动每帧 update 调度：通过 Babylon render loop 计算
 * delta（封顶 0.1s）与毫秒级 elapsed time，交给帧回调。
 * 行为与原 `runRenderLoop(() => animate())` + 内联 clock 一致。
 */
export class GameLoop {
  constructor(engine, clock = new Clock()) {
    this.engine = engine;
    this.clock = clock;
    this._onFrame = null;
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this.engine.runRenderLoop(() => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const time = this.clock.getElapsedTime() * 1000;
      this._onFrame(delta, time);
    });
  }
}
