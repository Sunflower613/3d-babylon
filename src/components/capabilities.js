import { registerShadowCaster } from '../rendering/helpers.js';

/**
 * 组件式可复用能力（Task 5.3）。
 *
 * 采用简单 class 组合而非重量级 ECS（见 design.md 决策）。每个组件封装一种
 * 可在多种实体间复用的能力，已抽取的实体/玩法模块按需挂载：
 * - Renderable    : 可渲染（持有根节点）
 * - Collidable     : 可碰撞（持有碰撞体集合）
 * - Interactable   : 可交互（持有触发回调）
 * - ShadowCaster   : 可投射阴影（注册到环境阴影生成器）
 * - Health         : 生命值 / 可受伤（Damageable 行为）
 * - Pickupable     : 可拾取
 * - Plantable      : 可种植（农田地块能力）
 */

/** 可渲染：持有 Babylon 根节点。 */
export class Renderable {
  constructor(node = null) {
    this.node = node;
  }
  setVisible(visible) {
    if (this.node && typeof this.node.setEnabled === 'function') {
      this.node.setEnabled(visible);
    }
  }
}

/** 可碰撞：持有碰撞体网格集合。 */
export class Collidable {
  constructor(colliders = []) {
    this.colliders = colliders;
  }
  add(collider) {
    this.colliders.push(collider);
  }
}

/** 可交互：持有触发回调与可选范围。 */
export class Interactable {
  constructor(onInteract = null, options = {}) {
    this.onInteract = onInteract;
    this.range = options.range != null ? options.range : 1.6;
    this.icon = options.icon || 'interact';
    this.enabled = true;
  }
  trigger(...args) {
    if (this.enabled && typeof this.onInteract === 'function') {
      return this.onInteract(...args);
    }
  }
}

/** 可投射阴影：将网格注册到环境阴影生成器。 */
export class ShadowCaster {
  constructor(meshes = []) {
    this.meshes = Array.isArray(meshes) ? meshes : [meshes];
  }
  register(environment, includeDescendants = true) {
    this.meshes.forEach((mesh) => registerShadowCaster(environment, mesh, includeDescendants));
  }
}

/** 生命值 / 可受伤能力。 */
export class Health {
  constructor(max = 100) {
    this.max = max;
    this.current = max;
  }
  damage(amount) {
    this.current = Math.max(0, this.current - amount);
    return this.current;
  }
  heal(amount) {
    this.current = Math.min(this.max, this.current + amount);
    return this.current;
  }
  isDead() {
    return this.current <= 0;
  }
  reset() {
    this.current = this.max;
  }
}

/** 可拾取能力。 */
export class Pickupable {
  constructor(itemId = null) {
    this.itemId = itemId;
    this.isCarried = false;
  }
}

/** 可种植能力（农田地块）。 */
export class Plantable {
  constructor() {
    this.status = 'empty'; // empty | growing | ready
    this.seedId = null;
    this.plantTime = 0;
  }
  plant(seedId, plantTime = Date.now()) {
    this.status = 'growing';
    this.seedId = seedId;
    this.plantTime = plantTime;
  }
  harvest() {
    const seedId = this.seedId;
    this.status = 'empty';
    this.seedId = null;
    this.plantTime = 0;
    return seedId;
  }
}
