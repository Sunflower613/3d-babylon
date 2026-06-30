import { BeachBall } from '../../world/BeachBall.js';

/**
 * 沙滩球玩法（Task 5.5）。
 *
 * 拥有沙滩球的生成、上限淘汰与每帧物理更新，将相关逻辑从 `main.js` 移出。
 * 通过 `app`（兼容上下文）访问 `scene`、`player`、`currentMap` 与音频服务，
 * 不直接读取 `main.js` 内部细节之外的玩法状态。
 */
export class BallGameplay {
  /**
   * @param {object} app GameApp 兼容上下文
   * @param {boolean} isChristmas 圣诞主题（雪球配色与音效）
   */
  constructor(app, isChristmas) {
    this.app = app;
    this.isChristmas = isChristmas;
    this.balls = [];
    // 兼容旧引用：保持 app.beachBallsList 指向同一数组
    this.app.beachBallsList = this.balls;
  }

  /** 绑定生成/踢球音效事件监听（仅群岛地图生成）。 */
  init() {
    window.addEventListener('spawn-ball', (e) => this.spawnBall(e));
    window.addEventListener('kick-sound', (e) => {
      this.app.playCustomSound(
        this.isChristmas ? e.detail.freq * 0.6 : e.detail.freq,
        0.16,
        this.isChristmas ? 'sine' : 'triangle',
        0.18
      );
    });
  }

  spawnBall(e) {
    if (this.app.currentMap !== 'island') return;

    const spawnX = e.detail.x;
    const spawnZ = e.detail.z + 0.6;
    const colors = this.isChristmas
      ? [0xffffff, 0xe0f7fa, 0xf5fafd]
      : [0xff5252, 0x40c4ff, 0xffeb3b, 0xff8a80, 0x00e676];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const ball = new BeachBall(this.app.scene, spawnX, 1.3, spawnZ, color);
    ball.app = this.app;
    this.balls.push(ball);

    // 上限 5 个球，清除最老的那颗（未被抱起的）
    if (this.balls.length > 5) {
      let oldestIndex = -1;
      for (let i = 0; i < this.balls.length; i++) {
        if (!this.balls[i].isCarried) {
          oldestIndex = i;
          break;
        }
      }
      if (oldestIndex !== -1) {
        const oldBall = this.balls.splice(oldestIndex, 1)[0];
        oldBall.dispose();
      }
    }

    this.app.playCustomSound(this.isChristmas ? 320 : 450, 0.12, 'sine', 0.08);
  }

  /** 每帧更新全部沙滩球物理。 */
  update(delta) {
    const player = this.app.player;
    if (!player) return;
    this.balls.forEach((ball) => ball.update(delta, player));
  }
}
