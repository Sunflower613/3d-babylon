import * as BABYLON from '@babylonjs/core';
import { BaseEntity } from './BaseEntity.js';
import { Health, Plantable, Pickupable, Interactable } from '../components/capabilities.js';

/**
 * 后续玩法抽取的实体边界（Task 5.6）。
 *
 * 这些类定义可交互世界对象的所有权与生命周期边界，供 gameplay 模块逐步
 * 收敛使用（农场、PK、家园、传送门）。迁移期允许包装现有 Babylon 节点与
 * 生成器输出，不要求纯数据对象（见 design.md 决策）。
 *
 * 命名遵循“简单且领域明确”规则：FarmPlot / Crop / Weapon / Bomb /
 * Explosion / NPC / Portal。`Building` 见 entities/Building.js（蓝图集成）。
 */

/** 农田地块：拥有 3D 地块节点与可种植能力。 */
export class FarmPlot extends BaseEntity {
  constructor({ index, x, z, plantGroup, node } = {}) {
    super({ name: `FarmPlot_${index}`, node: node || plantGroup });
    this.index = index;
    this.x = x;
    this.z = z;
    this.plantGroup = plantGroup;
    this.addComponent('plantable', new Plantable());
  }
}

/** 作物：地块上生长的可收割对象。 */
export class Crop extends BaseEntity {
  constructor({ seedId, node } = {}) {
    super({ name: `Crop_${seedId || 'unknown'}`, node });
    this.seedId = seedId;
  }
}

/** 武器：PK 中可拾取并挂载到角色的对象（剑/锤/炸弹载具）。 */
export class Weapon extends BaseEntity {
  constructor({ weaponType, node } = {}) {
    super({ name: `Weapon_${weaponType || 'unknown'}`, node });
    this.weaponType = weaponType;
    this.addComponent('pickupable', new Pickupable(weaponType));
  }
}

/** 炸弹：具备抛物线物理与生命周期的投射物。 */
export class Bomb extends BaseEntity {
  constructor({ node, position, velocity, maxLifetime = 2.2 } = {}) {
    super({ name: 'Bomb', node });
    this.position = position || new BABYLON.Vector3();
    this.velocity = velocity || new BABYLON.Vector3();
    this.timeElapsed = 0;
    this.maxLifetime = maxLifetime;
  }
}

/** 爆炸效果：火球与碎片粒子的临时视觉实体。 */
export class Explosion extends BaseEntity {
  constructor({ node, type = 'ball' } = {}) {
    super({ name: 'Explosion', node });
    this.type = type;
  }
}

/** NPC：非玩家角色（PK 对手机器人等），具备生命值。 */
export class NPC extends BaseEntity {
  constructor({ node, maxHp = 100 } = {}) {
    super({ name: 'NPC', node });
    this.addComponent('health', new Health(maxHp));
  }
}

/** 传送门：触发地图切换的可交互对象。 */
export class Portal extends BaseEntity {
  constructor({ node, targetMap, onInteract } = {}) {
    super({ name: `Portal_${targetMap || 'unknown'}`, node });
    this.targetMap = targetMap;
    this.addComponent('interactable', new Interactable(onInteract));
  }
}
