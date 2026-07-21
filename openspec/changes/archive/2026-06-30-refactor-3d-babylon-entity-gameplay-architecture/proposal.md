## 为什么

`3d-babylon` 已经从一个 Babylon 场景原型发展成包含地图、实体、玩法、UI 面板、外壳集成以及蓝图建筑编辑器子模块的 3D 模块。但大部分编排逻辑和玩法逻辑仍集中在 `main.js` 中，导致模块难以维护、扩展，也难以嵌入父站。

本变更建立更清晰的实体/玩法架构，采用简单命名，将生成出的世界内容与可交互实体分离，并定义主 3D 模块如何消费 `blueprint3d-babylon` 生成的建筑文件。

## 变更内容

- 将当前 `GameApp` 的职责拆分为应用启动、引擎/运行时服务、世界加载、实体、玩法模块、生成器、渲染辅助工具和 UI 面板。
- 用更清晰的分类替代模糊的 `systems/` 概念：
  - `services/`：可复用运行时服务，例如输入、音频、路由、实体生命周期、交互、配置和外壳桥接。
  - `entities/`：可交互世界对象，例如 `Player`、`NPC`、`Building`、`FarmPlot`、`Crop`、`Weapon`、`Bomb`、`Portal` 和 `BeachBall`。
  - `gameplay/`：玩法领域，例如农场、PK、建筑、家园编辑、街机/扑克和任务。
  - `generators/`：从硬编码布局、配置或蓝图数据创建地图或实体的代码。
- 保持命名简单易懂。除非需要避免歧义，否则使用 `Player` 而不是 `PlayerAvatar`。
- 定义主 3D 模块边界，使 `siteConfig`、SSO、外壳侧边栏和外部资源等父站概念通过适配器注入，而不是硬编码父目录导入。
- 新增模块内部 data 层（`src/data/*`），集中主题、商品、种子、任务与武器等游戏内容数据，替代散落在各玩法/服务模块中的硬编码；配置 provider 优先消费 data 层，保留 `site-config.js` 作为兼容 fallback，并移除 `window.__SITE_CONFIG__` 运行时注入（属过度设计）。
- 增加 `blueprint3d-babylon` 的集成路径：
  - 它的编辑器可以产出 `*.b3dbuilding.json` 文件。
  - 主 3D 模块可以通过蓝图渲染器/加载器将这些文件加载为 `Building` 实体。
  - 现有子模块运行时适配器可以为主模块的生成器/实体桥接提供参考。
- 重构期间保持当前用户可见行为不变。本变更是结构性工作，不是玩法重设计。

## 能力

### 新增能力
- `entity-gameplay-architecture`：定义 3D 模块中实体、玩法、生成器、服务和渲染边界，包括预期生命周期和所有权规则。
- `blueprint-building-integration`：定义主 3D 模块如何使用 `blueprint3d-babylon` 的建筑 JSON 和运行时渲染器。
- `host-config-boundary`：定义 3D 模块如何接收父站配置、外壳、SSO、音频和资源信息，而不是直接导入外层项目文件。

### 修改能力

无。

## 影响

- 受影响代码：
  - `3d-babylon/main.js`
  - `3d-babylon/src/world/*`
  - `3d-babylon/src/ui/*`
  - `3d-babylon/blueprint3d-babylon/src/*` 作为集成依赖，不作为本次重构代码
  - `3d-babylon/vite.config.js`，其中父级资源/配置假设后续可能逐步减少
- 新结构可能位于：
  - `3d-babylon/src/app/`
  - `3d-babylon/src/core/`
  - `3d-babylon/src/services/`
  - `3d-babylon/src/entities/`
  - `3d-babylon/src/components/`
  - `3d-babylon/src/gameplay/`
  - `3d-babylon/src/generators/`
  - `3d-babylon/src/rendering/`
- 受影响 API：
  - 内部模块导入和所有权边界。
  - 用于注入配置和宿主桥接的应用启动接口。
  - 用于加载蓝图建筑的建筑 JSON 加载路径。
- 依赖：
  - 继续使用 `@babylonjs/core`、`@babylonjs/gui` 和 `nipplejs`。
  - 继续将 `blueprint3d-babylon` 视为子模块/库依赖。
