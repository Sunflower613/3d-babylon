import { MAP_REGISTRY } from './mapRegistry.js';

/**
 * 地图 Resolver（Task 4.2）。
 * 基于 `document.body.id` 识别当前地图键，替代 `main.js` 中的 if-else 链。
 * 未匹配时回退到 'island'（与原行为一致）。
 */
export function resolveCurrentMap(doc = document) {
  const bodyId = doc.body && doc.body.id;
  for (const key in MAP_REGISTRY) {
    if (MAP_REGISTRY[key].pageId === bodyId) return key;
  }
  return 'island';
}
