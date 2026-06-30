/**
 * BuildingFileLoader（Task 7.3）。
 *
 * 为 `*.b3dbuilding.json`（`blueprint3d-babylon.building.v1`）与兼容原始
 * floorplan 数据提供加载/解析路径，输出标准 floorplan 供 BlueprintBuildingRenderer
 * 渲染。对 `blueprint3d-babylon` 的解析 API 采用动态导入隔离，避免无关玩法
 * 静态依赖整个子模块（见 blueprint-building-integration 规格）。
 */
export class BuildingFileLoader {
  /**
   * 从 URL 加载建筑文件并解析为 floorplan。
   * @param {string} url `*.b3dbuilding.json` 地址
   * @returns {Promise<object>} floorplan
   */
  async loadFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`BuildingFileLoader: 无法加载建筑文件 ${url} (${response.status})`);
    }
    const text = await response.text();
    return this.parse(text);
  }

  /**
   * 解析建筑文件或原始 floorplan 数据。
   * @param {string|object} input 建筑文件 JSON 字符串/对象，或兼容原始 floorplan
   * @returns {Promise<object>} floorplan
   */
  async parse(input) {
    const { parseBuildingFile } = await import('../../../blueprint3d-babylon/src/index.js');
    return parseBuildingFile(input);
  }
}
