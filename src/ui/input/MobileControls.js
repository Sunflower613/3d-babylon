import nipplejs from 'nipplejs';

/**
 * 移动端控制（Task 8.1）。
 *
 * 拥有触摸设备检测、nipplejs 摇杆与加速/跳跃按钮绑定，从 `main.js` 抽取，
 * 完整保留 `nipplejs` 行为。通过 `app`（兼容上下文）保存摇杆引用，
 * 输入状态仍写入 `window.joystickDir` / `window.keys` 供 Player 读取。
 */
export class MobileControls {
  constructor(app) {
    this.app = app;
  }

  init() {
    const app = this.app;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 1024);
    const mobileControls = document.getElementById('mobile-controls');
    if (!mobileControls) return;
    if (!isTouch) {
      mobileControls.style.display = 'none';
      return;
    }
    mobileControls.style.display = 'block';

    window.joystickDir = window.joystickDir || { x: 0, y: 0 };
    window.keys = window.keys || { space: false, shift: false, j: false };

    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) {
      if (app.joystick) {
        app.joystick.destroy();
      }
      app.joystick = nipplejs.create({
        zone: joystickZone,
        mode: 'static',
        position: { left: '55px', top: '55px' },
        color: 'rgba(255, 255, 255, 0.4)',
        size: 110
      });

      app.joystick.on('move', (evt, data) => {
        const moveData = data || evt.data;
        if (moveData && moveData.vector) {
          window.joystickDir.x = moveData.vector.x;
          window.joystickDir.y = moveData.vector.y;
        }
      });

      app.joystick.on('end', () => {
        window.joystickDir.x = 0;
        window.joystickDir.y = 0;
      });
    }

    const btnRun = document.getElementById('btn-run');
    if (btnRun) {
      btnRun.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.keys.shift = true;
        btnRun.classList.add('active');
      });
      btnRun.addEventListener('pointerup', (e) => {
        e.preventDefault();
        window.keys.shift = false;
        btnRun.classList.remove('active');
      });
      btnRun.addEventListener('pointercancel', () => {
        window.keys.shift = false;
        btnRun.classList.remove('active');
      });
    }

    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
      btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.keys.space = true;
        btnJump.classList.add('active');
      });
      btnJump.addEventListener('pointerup', (e) => {
        e.preventDefault();
        window.keys.space = false;
        btnJump.classList.remove('active');
      });
      btnJump.addEventListener('pointercancel', () => {
        window.keys.space = false;
        btnJump.classList.remove('active');
      });
    }
  }
}
