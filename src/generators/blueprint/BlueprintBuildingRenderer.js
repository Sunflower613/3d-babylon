/**
 * BlueprintBuildingRenderer（Task 7.4）。
 *
 * 围绕 `blueprint3d-babylon` 运行时/渲染 API（`Blueprint3DTestMap`）的适配器，
 * 将 floorplan 渲染为 Babylon 场景中的建筑结构。对子模块 API 的直接使用被
 * 限制在本模块与 BuildingFileLoader 中（见 blueprint-building-integration 规格：
 * “蓝图渲染器集成必须隔离”）。采用动态导入避免静态依赖整个子模块。
 */
export class BlueprintBuildingRenderer {
  /**
   * @param {import('@babylonjs/core').Scene} scene Babylon 场景
   */
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 渲染 floorplan，返回子模块的运行时地图实例（含 root 节点、build/dispose）。
   * @param {object} floorplan 已解析的 floorplan
   * @param {object} [options] 透传给 Blueprint3DTestMap 的选项（name/palette 等）
   * @returns {Promise<object>} Blueprint3DTestMap 实例
   */
  async render(floorplan, options = {}) {
    const { Blueprint3DTestMap } = await import('../../../blueprint3d-babylon/src/index.js');
    return new Blueprint3DTestMap(this.scene, { ...options, floorplan });
  }
}
