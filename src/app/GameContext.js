/**
 * 兼容上下文对象（迁移期桥接）。
 *
 * 在重构过渡阶段，已抽取的服务 / 实体 / 玩法模块通过此对象访问运行时引用，
 * 而不直接读取 `main.js`（GameApp）内部字段。它对现有 GameApp 实例做薄封装，
 * 因此始终反映最新引用，无需在 GameApp 重新赋值时同步。
 *
 * 随着重构推进，这些引用将逐步由 core/runtime、world manager、服务容器拥有，
 * 届时本桥接可逐字段移除。
 */
export class GameContext {
  /**
   * @param {object} app GameApp 实例
   * @param {object} [adapters] 宿主适配器集合（config / shell / audio / toast / sso 等），后续阶段填充
   */
  constructor(app, adapters = {}) {
    this._app = app;
    this.adapters = adapters;
  }

  get engine() { return this._app.engine; }
  get scene() { return this._app.scene; }
  get camera() { return this._app.camera; }
  get player() { return this._app.player; }
  get environment() { return this._app.environment; }
  get modalMgr() { return this._app.modalMgr; }
  get interactMgr() { return this._app.interactMgr; }
  get clock() { return this._app.clock; }

  /** 当前激活主题配置（迁移完成后改由 config provider 提供）。 */
  get config() { return this._app.themeConfig; }
  get themeConfig() { return this._app.themeConfig; }

  /** 注册宿主适配器（config / shell / audio / toast / sso）。 */
  registerAdapter(name, adapter) {
    this.adapters[name] = adapter;
    return adapter;
  }

  getAdapter(name) {
    return this.adapters[name];
  }
}
