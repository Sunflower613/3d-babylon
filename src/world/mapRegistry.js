import { IslandGenerator } from './Island.js';
import { HouseGenerator } from './House.js';
import { FarmGenerator } from './Farm.js';
import { PKArenaGenerator } from './PKArena.js';
import { LakeGenerator } from './Lake.js';
import { CastleGenerator } from './Castle.js';

/**
 * 地图注册表（Task 4.1）。
 *
 * 单一数据源：page DOM id、切换 URL、生成器 class、室内模式、
 * 默认出生点与默认朝向。供 map resolver / spawn resolver / router /
 * world manager 共同消费，替代散落在 `main.js` 的硬编码分支。
 *
 * 注意：URL 携带出生点时的朝向规则（尤其 pk_arena 的条件朝向、lake 的差异）
 * 由 spawnResolver 单独处理，见 spawnResolver.js。
 */
export const MAP_REGISTRY = {
  island: {
    key: 'island',
    pageId: 'page-lobby',
    url: 'lobby.html',
    Generator: IslandGenerator,
    indoor: false,
    defaultSpawn: { x: 0, y: 4, z: 0 },
    defaultRotationY: null,
  },
  house: {
    key: 'house',
    pageId: 'page-house',
    url: 'house.html',
    Generator: HouseGenerator,
    indoor: true,
    defaultSpawn: { x: 0, y: 0.12 + 0.1, z: 9.5 },
    defaultRotationY: Math.PI,
  },
  farm: {
    key: 'farm',
    pageId: 'page-farm',
    url: 'farm.html',
    Generator: FarmGenerator,
    indoor: false,
    defaultSpawn: { x: 0, y: 0.6 + 0.1, z: -8.0 },
    defaultRotationY: Math.PI,
  },
  pk_arena: {
    key: 'pk_arena',
    pageId: 'page-pvp',
    url: 'pvp.html',
    Generator: PKArenaGenerator,
    indoor: false,
    defaultSpawn: { x: -5.0, y: 0.6 + 0.1, z: 0 },
    defaultRotationY: -Math.PI / 2,
  },
  lake: {
    key: 'lake',
    pageId: 'page-lake',
    url: 'lake.html',
    Generator: LakeGenerator,
    indoor: false,
    defaultSpawn: { x: 0, y: 0.6 + 0.1, z: 8.5 },
    defaultRotationY: Math.PI,
  },
  castle: {
    key: 'castle',
    pageId: 'page-castle',
    url: 'castle.html',
    Generator: CastleGenerator,
    indoor: false,
    defaultSpawn: { x: -2.5, y: 0.6 + 0.1, z: 11.5 },
    defaultRotationY: Math.PI,
  },
};

/** switchMap 目标键 → URL（含历史别名映射）。 */
export function mapUrlFor(targetMap) {
  if (targetMap === 'island') return 'lobby.html';
  const entry = MAP_REGISTRY[targetMap];
  return entry ? entry.url : '';
}
