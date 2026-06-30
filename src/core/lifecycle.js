/**
 * 轻量生命周期合同。
 *
 * 应用模块、实体、玩法模块与服务统一遵循此合同，便于 world manager /
 * entity manager / app bootstrap 以一致方式初始化、逐帧更新与释放。
 *
 * 约定（均为可选实现，缺省为 no-op）：
 * - init(ctx):    一次性初始化。接收兼容上下文对象（见 app/GameContext.js）。
 * - update(dt, t): 每帧更新。dt 为秒级 delta，t 为累计经过秒数。
 * - dispose():    释放 Babylon 节点、事件监听与外部引用。
 *
 * 首次迁移阶段允许包装现有代码，不要求纯数据对象。
 */
export class Lifecycle {
  /** @param {import('../app/GameContext.js').GameContext} [ctx] */
  init(ctx) {}

  /**
   * @param {number} dt 秒级 delta
   * @param {number} t  累计经过秒数
   */
  update(dt, t) {}

  dispose() {}
}

/** 判断对象是否实现了某个生命周期方法。 */
export function hasLifecycle(obj, method) {
  return !!obj && typeof obj[method] === 'function';
}

/** 安全调用生命周期方法，缺省静默跳过。 */
export function callLifecycle(obj, method, ...args) {
  if (hasLifecycle(obj, method)) {
    return obj[method](...args);
  }
  return undefined;
}
