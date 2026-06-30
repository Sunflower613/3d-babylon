/**
 * 地图 Bundle 合同（Task 7.2）。
 *
 * 定义生成器输出的统一结构，供 world manager 消费：实体、碰撞体、交互体、
 * 阴影投射体、出生点数据与可选每帧更新钩子。
 *
 * 迁移期生成器仍可直接在 app 上设置运行时引用（见 worldManager），此合同
 * 为后续逐步收敛为“返回 bundle”提供目标形态，不强制立即改造现有生成器。
 *
 * @typedef {Object} MapBundle
 * @property {Array<object>} entities       已创建实体（含生命周期的世界对象）
 * @property {Array<object>} colliders      碰撞体网格
 * @property {Array<object>} interactables  交互区/可交互体
 * @property {Array<object>} shadowCasters  阴影投射体网格
 * @property {object} [spawn]               默认出生点数据 { position, rotationY }
 * @property {(dt:number, t:number)=>void} [update] 可选地图特定每帧更新钩子
 */

/** 创建标准化 MapBundle（缺省字段填充为空集合）。 */
export function createMapBundle(parts = {}) {
  return {
    entities: parts.entities || [],
    colliders: parts.colliders || [],
    interactables: parts.interactables || [],
    shadowCasters: parts.shadowCasters || [],
    spawn: parts.spawn || null,
    update: typeof parts.update === 'function' ? parts.update : null
  };
}

/** 校验对象是否符合 MapBundle 合同（用于调试/集成断言）。 */
export function isMapBundle(obj) {
  return !!obj
    && Array.isArray(obj.entities)
    && Array.isArray(obj.colliders)
    && Array.isArray(obj.interactables)
    && Array.isArray(obj.shadowCasters);
}
