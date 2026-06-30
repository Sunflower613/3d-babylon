import * as BABYLON from '@babylonjs/core';
import { createGlowEmissiveSelector } from '../rendering/helpers.js';

/**
 * 引擎运行时（Task 3.1）。
 * 封装 Babylon engine、scene、camera、glow layer 与 resize 处理，
 * 从 `main.js` 抽出引擎启动职责。行为与原 `initEngine` 一致。
 */
export class EngineRuntime {
  constructor(container) {
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
    }
    this.canvas = canvas;

    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    // 自发光辉光层（霓虹光晕），并排除水体/天气等非霓虹装饰
    this.glowLayer = new BABYLON.GlowLayer("glowLayer", this.scene);
    this.glowLayer.intensity = 1.0;
    this.glowLayer.customEmissiveColorSelector = createGlowEmissiveSelector();

    // 通用目标跟镜相机
    this.camera = new BABYLON.TargetCamera("mainCamera", BABYLON.Vector3.Zero(), this.scene);

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }
}
