/**
 * 生成器所有权聚合导出（Task 7.1）。
 *
 * 地图生成器实现当前位于 `src/world/*`。为体现“生成器创建地图内容与实体”的
 * 所有权边界（见 design.md），此处提供 generator 视角的聚合导出，供 world
 * manager 与 map registry 通过 generators 命名空间引用，而无需移动现有文件、
 * 规避大范围导入路径变更带来的回归风险。
 *
 * 蓝图驱动的建筑生成见 generators/blueprint/。
 */
export { IslandGenerator } from '../world/Island.js';
export { HouseGenerator } from '../world/House.js';
export { FarmGenerator } from '../world/Farm.js';
export { PKArenaGenerator } from '../world/PKArena.js';
export { LakeGenerator } from '../world/Lake.js';
export { CastleGenerator } from '../world/Castle.js';
