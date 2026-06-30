import { MAP_REGISTRY } from './mapRegistry.js';

/**
 * 出生点 Resolver（Task 4.3）。
 * 解析 URL `spawn` 查询参数与默认出生点选择，并应用到 player。
 * 完整保留原 `main.js` 出生点与朝向逻辑（含 pk_arena 条件朝向、lake 差异）。
 */

/** 解析 URL spawn 参数，返回 {x,y,z} 或 null。 */
export function parseSpawnParam(search = window.location.search) {
  const urlParams = new URLSearchParams(search);
  const spawnParam = urlParams.get('spawn');
  if (!spawnParam) return null;
  const parts = spawnParam.split(',').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return { x: parts[0], y: parts[1], z: parts[2] };
  }
  return null;
}

/** URL 出生点对应的朝向规则（与默认朝向不同，尤其 pk_arena / lake）。 */
function urlOrientationFor(currentMap, z) {
  if (currentMap === 'house' || currentMap === 'farm' || currentMap === 'castle') {
    return Math.PI;
  }
  if (currentMap === 'pk_arena') {
    return z < 0 ? Math.PI : -Math.PI / 2;
  }
  if (currentMap === 'island' || currentMap === 'lake') {
    return 0;
  }
  return null;
}

/** 将出生点与朝向应用到 player（行为等价于原 initWorld 出生点块）。 */
export function applySpawn(player, currentMap, search = window.location.search) {
  const urlSpawn = parseSpawnParam(search);
  if (urlSpawn) {
    player.position.set(urlSpawn.x, urlSpawn.y, urlSpawn.z);
    player.group.position.copyFrom(player.position);
    const rotY = urlOrientationFor(currentMap, urlSpawn.z);
    if (rotY !== null) {
      player.group.rotation.y = rotY;
      player.cameraAngleH = rotY;
    }
    return;
  }

  const entry = MAP_REGISTRY[currentMap];
  const spawn = entry ? entry.defaultSpawn : { x: 0, y: 4, z: 0 };
  player.position.set(spawn.x, spawn.y, spawn.z);
  player.group.position.copyFrom(player.position);
  if (entry && entry.defaultRotationY !== null) {
    player.group.rotation.y = entry.defaultRotationY;
    player.cameraAngleH = entry.defaultRotationY;
  }
}
