import { callLifecycle } from '../core/lifecycle.js';

/**
 * EntityManager（Task 5.2）。
 *
 * 负责注册、逐帧更新与释放实体。实体只需实现 core/lifecycle 约定中的
 * 任意子集（init / update / dispose），缺省方法会被静默跳过。
 *
 * 迁移期可与 GameApp 上散落的实体列表并存，逐步收敛所有权。
 */
export class EntityManager {
  constructor() {
    this.entities = [];
  }

  /** 注册实体并可选地立即初始化。 */
  add(entity, ctx) {
    if (!entity) return entity;
    this.entities.push(entity);
    if (ctx) callLifecycle(entity, 'init', ctx);
    return entity;
  }

  /** 移除并释放单个实体。 */
  remove(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
    }
    callLifecycle(entity, 'dispose');
  }

  /** 逐帧更新全部实体。 */
  update(dt, t) {
    for (let i = 0; i < this.entities.length; i++) {
      callLifecycle(this.entities[i], 'update', dt, t);
    }
  }

  /** 释放全部实体并清空注册表。 */
  disposeAll() {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      callLifecycle(this.entities[i], 'dispose');
    }
    this.entities = [];
  }
}
