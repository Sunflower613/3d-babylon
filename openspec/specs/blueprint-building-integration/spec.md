# blueprint-building-integration Specification

## Purpose
定义主 3D 模块如何消费 `blueprint3d-babylon` 的建筑 JSON 与运行时渲染器，并将其呈现为 `Building` 实体，同时隔离对子模块 API 的直接使用。

## 需求

### 需求：主 3D 模块可以加载蓝图建筑文件
3D 模块必须为 `blueprint3d-babylon` 的 `*.b3dbuilding.json` 数据提供建筑文件加载路径。

#### 场景：加载有效建筑文件
- **当** 主 3D 模块收到有效的 `blueprint3d-babylon.building.v1` 建筑文件时
- **则** 它必须解析 floorplan 数据，并在 Babylon 场景中创建可渲染的建筑表现

#### 场景：加载旧式 floorplan 数据
- **当** 主 3D 模块收到包含房间和墙体的兼容原始 floorplan 数据时
- **则** 它必须支持与包装后建筑文件相同的渲染路径

### 需求：蓝图建筑表现为 Building 实体
3D 模块必须将蓝图渲染出的结构包装为 `Building` 实体，而不是在地图代码中暴露子模块渲染器内部实现。

#### 场景：将蓝图建筑加入地图
- **当** 将蓝图创建的建筑加入小屋、城堡或测试地图时
- **则** 地图必须通过 `Building` 实体合同与其交互，该合同暴露生命周期、碰撞体、交互体和阴影投射体

### 需求：蓝图渲染器集成必须隔离
3D 模块必须将对 `blueprint3d-babylon` API 的直接使用隔离在加载器或渲染器适配器之后。

#### 场景：使用子模块 API
- **当** 主 3D 模块导入 `Blueprint3DTestMap`、`PinkCastleGenerator` 或建筑文件辅助函数等 class 时
- **则** 这些导入必须被限制在蓝图集成模块中，而不是散布在 `main.js` 或无关玩法领域中

### 需求：蓝图编辑器与运行时加载分离
3D 模块必须将蓝图编辑器页面视为建筑文件生产者，而不是场景内运行循环的一部分。

#### 场景：用户在编辑器中创建建筑
- **当** 编辑器导出 `*.b3dbuilding.json` 文件时
- **则** 主 3D 模块必须能将该文件作为运行时建筑内容消费，而不需要把完整编辑器 UI 嵌入游戏场景
