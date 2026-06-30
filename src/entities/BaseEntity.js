import { Lifecycle } from '../core/lifecycle.js';

/**
 * BaseEntity（Task 5.1）。
 *
 * 可交互世界对象的最小基类，遵循 core/lifecycle 约定：
 * - init(ctx):    一次性初始化（接收兼容上下文对象）。
 * - update(dt, t): 每帧更新。
 * - dispose():    释放 Babylon 节点与外部引用。
 *
 * 迁移期允许包装现有 Babylon mesh group 或生成器输出，不要求纯数据对象。
 * 子类可通过 `addComponent` / `getComponent` 组合可复用能力（见 components/）。
 */
export class BaseEntity extends Lifecycle {
  /**
   * @param {object} [options]
   * @param {string} [options.name] 实体名称（便于调试与查询）
   * @param {import('@babylonjs/core').TransformNode} [options.node] 实体根节点
   */
  constructor(options = {}) {
    super();
    this.name = options.name || this.constructor.name;
    this.node = options.node || null;
    this.alive = true;
    this.components = {};
  }

  /** 挂载一个组件能力实例。 */
  addComponent(key, component) {
    this.components[key] = component;
    return component;
  }

  getComponent(key) {
    return this.components[key];
  }

  hasComponent(key) {
    return !!this.components[key];
  }

  init(ctx) {}

  update(dt, t) {}

  dispose() {
    if (this.node && typeof this.node.dispose === 'function') {
      this.node.dispose();
    }
    this.node = null;
    this.alive = false;
    this.components = {};
  }
}
