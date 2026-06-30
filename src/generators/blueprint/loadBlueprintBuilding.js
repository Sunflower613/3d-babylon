import { BuildingFileLoader } from './BuildingFileLoader.js';
import { Building } from '../../entities/Building.js';

/**
 * 蓝图建筑集成路径（Task 7.6）。
 *
 * 提供测试地图 / 小屋 / 城堡路由中“蓝图创建建筑”的最小集成路径：
 * 加载 `*.b3dbuilding.json`（或原始 floorplan）→ 解析 → 渲染 → 包装为
 * Building 实体 → 注册阴影。不嵌入编辑器 UI，仅消费建筑文件作为运行时内容。
 *
 * 默认不自动执行；由 world manager 在检测到 `?blueprint=<url>` 查询参数时
 * 按需调用，从而不改变现有地图的可见行为。
 *
 * @param {object} app GameApp 兼容上下文（提供 scene / environment / entityManager）
 * @param {string|object} source 建筑文件 URL、JSON 字符串/对象或原始 floorplan
 * @param {object} [options] 透传渲染选项 + { position }
 * @returns {Promise<Building>}
 */
export async function loadBlueprintBuilding(app, source, options = {}) {
  const loader = new BuildingFileLoader();
  const floorplan = typeof source === 'string' && /^https?:|\.json$|\.b3dbuilding\.json$/i.test(source)
    ? await loader.loadFromUrl(source)
    : await loader.parse(source);

  const building = await Building.fromBlueprint(app.scene, floorplan, options);

  if (options.position && building.node && building.node.position) {
    building.node.position.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
  }

  building.init(app.ctx || { environment: app.environment });

  if (app.entityManager && typeof app.entityManager.add === 'function') {
    app.entityManager.add(building);
  }

  return building;
}

/** 从 URL 查询解析蓝图建筑文件地址（`?blueprint=<url>`）。 */
export function resolveBlueprintQuery() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('blueprint');
  } catch (e) {
    return null;
  }
}
