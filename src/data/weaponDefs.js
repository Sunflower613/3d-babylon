/**
 * 武器与爆炸参数数据（data 层）。
 *
 * 集中 PK 战斗的伤害、击退与爆炸参数，替代散落在 PKGameplay 中的硬编码
 * （伤害 12/25/15/50、爆炸半径 3.5、击退力等），便于统一调参。
 */

/** 玩家近战武器：伤害 + 击退（knockbackForce 水平推力，knockbackUp 抬升）。 */
export const WEAPON_DEFS = {
  sword: { damage: 12, knockbackForce: 3.2, knockbackUp: 0.28 },
  hammer: { damage: 25, knockbackForce: 6.2, knockbackUp: 0.48 }
};

/** 对手 AI 近战攻击参数。 */
export const OPPONENT_ATTACK = { damage: 15, knockbackForce: 4.2, knockbackUp: 0.35 };

/** 炸弹投掷物理参数。 */
export const BOMB_DEF = { throwSpeed: 7.5, throwUp: 4.2, maxLifetime: 2.2 };

/** 爆炸参数：半径、伤害与击退。 */
export const EXPLOSION_DEF = { radius: 3.5, damage: 50, knockbackForce: 6.0, knockbackUp: 3.5 };
