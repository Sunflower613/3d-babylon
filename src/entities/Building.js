import { BaseEntity } from './BaseEntity.js';
import { Collidable, ShadowCaster } from '../components/capabilities.js';
import { BlueprintBuildingRenderer } from '../generators/blueprint/BlueprintBuildingRenderer.js';

/**
 * Building 实体（Task 7.5）。
 *
 * 将蓝图渲染出的结构包装为带生命周期的 `Building` 实体，对外暴露生命周期、
 * 碰撞体、交互体与阴影投射体，使地图代码通过实体合同与其交互，而不直接接触
 * 子模块渲染器内部（见 blueprint-building-integration 规格）。
 */
export class Building extends BaseEntity {
  /**
   * @param {object} blueprintMap Blueprint3DTestMap 运行时实例（含 root / dispose）
   * @param {object} [options]
   */
  constructor(blueprintMap, options = {}) {
    super({ name: options.name || 'Building', node: blueprintMap.root });
    this.blueprintMap = blueprintMap;

    const meshes = (this.node && typeof this.node.getChildMeshes === 'function')
      ? this.node.getChildMeshes()
      : [];

    // 蓝图建筑结构默认作为碰撞体与阴影投射体；交互体留空供地图按需注册。
    this.colliders = meshes;
    this.interactables = options.interactables || [];
    this.shadowCasters = meshes;

    this.addComponent('collidable', new Collidable(meshes));
    this.addComponent('shadowCaster', new ShadowCaster(meshes));
  }

  /**
   * 通过 floorplan 在场景中创建 Building 实体（蓝图渲染路径）。
   * @param {import('@babylonjs/core').Scene} scene
   * @param {object} floorplan 已解析 floorplan
   * @param {object} [options]
   * @returns {Promise<Building>}
   */
  static async fromBlueprint(scene, floorplan, options = {}) {
    const renderer = new BlueprintBuildingRenderer(scene);
    const blueprintMap = await renderer.render(floorplan, options);
    return new Building(blueprintMap, options);
  }

  init(ctx) {
    // 将建筑结构注册为阴影投射体（环境缺省阴影生成器时静默跳过）。
    const environment = ctx && ctx.environment;
    if (environment) {
      this.getComponent('shadowCaster').register(environment, true);
    }
  }

  update(dt, t) {}

  dispose() {
    if (this.blueprintMap && typeof this.blueprintMap.dispose === 'function') {
      this.blueprintMap.dispose();
    }
    this.blueprintMap = null;
    this.node = null;
    this.colliders = [];
    this.interactables = [];
    this.shadowCasters = [];
    this.alive = false;
    this.components = {};
  }
}
