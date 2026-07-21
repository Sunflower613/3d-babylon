## 1. 基线与脚手架

- [x] 1.1 梳理当前 `main.js` 职责，并创建抽取清单，将每个方法映射到 `app/`、`core/`、`services/`、`entities/`、`components/`、`gameplay/`、`generators/`、`rendering/` 或 `ui/`。
- [x] 1.2 创建目标源码目录，暂不移动行为。
- [x] 1.3 为应用模块、实体、玩法模块和服务添加轻量生命周期合同。
- [x] 1.4 添加兼容上下文对象，向已抽取模块暴露现有 `scene`、`camera`、`player`、`environment`、`modalMgr`、配置和宿主适配器。

## 2. 宿主与平台边界

- [x] 2.1 实现配置 provider，接收注入的父站配置，并回退到本地开发配置。
- [x] 2.2 实现 shell bridge，处理父级/侧边栏/导航/iframe 行为，并提供独立运行 fallback。
- [x] 2.3 实现音频和 toast 服务，并将现有 sound/toast 调用路由到这些服务。
- [x] 2.4 将 SSO/用户状态访问移动到宿主/平台适配器之后，同时保留当前登录/登出行为。
- [x] 2.5 在新抽取代码中，用 bridge/service 调用替代散落的 `window.parent` 和父级 document 访问。

## 3. 核心运行时与渲染辅助工具

- [x] 3.1 将 Babylon engine、scene、camera、resize、glow layer 和 render-loop 设置从 `main.js` 抽取到 core/runtime 模块。
- [x] 3.2 将 clock 和每帧 update 调度抽取到 game loop 模块。
- [x] 3.3 抽取共享 Babylon 辅助工具，包括颜色转换、flat material、mesh 释放、阴影注册、glow 过滤和 3D 到屏幕投影。
- [x] 3.4 在被触碰文件中，用共享渲染辅助工具替换重复的 `convertColor` 和材质辅助实现。

## 4. 世界与地图管理

- [x] 4.1 为 `lobby`、`house`、`farm`、`pvp`、`lake` 和 `castle` 添加地图注册表，包含 page ID、URL、生成器 class、室内模式、默认出生点和默认朝向。
- [x] 4.2 将当前基于 `document.body.id` 的地图检测抽取到 world/map resolver。
- [x] 4.3 将 spawn query 解析和默认出生点选择抽取到 spawn resolver。
- [x] 4.4 使用地图注册表将 `switchMap` 抽取到 router service。
- [x] 4.5 添加 world manager，用于创建当前地图、玩家、环境、交互管理器、阴影注册和地图特定 update hook。

## 5. 实体与组件

- [x] 5.1 添加简单的 `BaseEntity`，包含 `init`、`update` 和 `dispose` 生命周期方法。
- [x] 5.2 添加 entity manager，用于注册、更新和释放实体。
- [x] 5.3 按已抽取代码需要，添加组件式辅助能力：可渲染、可碰撞、可交互、可投射阴影、生命值/可受伤、可拾取、可种植。
- [x] 5.4 适配现有 `Player` 参与实体生命周期，同时保留 `Player` 命名。
- [x] 5.5 将 `BeachBall` 适配为实体化对象，并将球生成/更新从 `main.js` 移出。
- [x] 5.6 为后续玩法抽取定义 `Building`、`FarmPlot`、`Crop`、`Weapon`、`Bomb`、`Explosion`、`NPC` 和 `Portal` 实体边界。

## 6. 玩法模块

- [x] 6.1 将农田状态、作物渲染、径向种植菜单 hook、种植、收获和农场每帧更新抽取到 `gameplay/farm/`。
- [x] 6.2 将 PK 战斗状态、对手 AI、武器拾取、攻击、炸弹、爆炸、伤害气泡、HP UI hook 和战斗结算抽取到 `gameplay/pk/`。
- [x] 6.3 将家园/建筑放置每帧逻辑抽取到 `gameplay/building/` 或 `gameplay/home/`，并明确实体/服务依赖。
- [x] 6.4 将扑克/21 点状态和动作抽取到 `gameplay/arcade/` 或 `games/`，同时保留现有 UI 行为。
- [x] 6.5 根据当前所有权，将商店、背包、任务和排行榜行为抽取到玩法/UI 模块或面向宿主的面板适配器。
- [x] 6.6 确保玩法模块通过实体、服务和上下文对象与世界交互，而不是直接访问 `main.js` 内部。

## 7. 生成器与蓝图集成

- [x] 7.1 将地图生成器文件移动到 generator/world 结构，或添加包装导出来体现生成器所有权。
- [x] 7.2 为生成器输出定义地图 bundle 合同，包含实体、碰撞体、交互体、阴影投射体、出生点数据和可选更新钩子。
- [x] 7.3 为 `*.b3dbuilding.json` 和兼容原始 floorplan 数据添加 `BuildingFileLoader`。
- [x] 7.4 围绕 `blueprint3d-babylon` 运行时/渲染 API 添加 `BlueprintBuildingRenderer` 或等价适配器。
- [x] 7.5 为蓝图渲染出的结构添加 `Building` 实体包装，暴露生命周期、碰撞体、交互体和阴影投射体。
- [x] 7.6 在测试地图、小屋或城堡路由中添加蓝图创建建筑的最小集成路径，不嵌入编辑器 UI。

## 8. UI 抽取

- [x] 8.1 将移动端控制抽取到专门的 UI/input 模块，并保留 `nipplejs` 行为。
- [x] 8.2 删除或隔离已禁用的 Babylon GUI HUD 路径，避免干扰当前有效的移动端控制实现。
- [x] 8.3 将衣柜 UI 绑定抽取到专门面板模块。
- [x] 8.4 将 PK HUD、农场 overlay/径向菜单、商店、背包、任务、排行榜和 modal 相关绑定抽取到专门 UI 模块（若它们仍留在 3D 模块中）。
- [x] 8.5 确保 UI 模块尽量使用服务和 shell bridge 抽象，而不是直接修改玩法状态。

## 9. 主入口缩减与验证

- [x] 9.1 将 `main.js` 缩减为使用挂载节点、配置 provider、host bridge 和运行时选项创建应用。
- [x] 9.2 仅在现有页面或调试流程仍需要时保留 `window.gameApp` 兼容。
- [x] 9.3 在 `3d-babylon` 中运行 `npm run build` 并修复构建错误。
- [ ] 9.4 手动冒烟测试 `lobby.html`、`house.html`、`farm.html`、`pvp.html`、`lake.html` 和 `castle.html`。（需在浏览器中人工验证）
- [ ] 9.5 冒烟测试父站/独立配置 fallback、SSO/侧边栏行为、移动端控制、地图切换、农场交互、PK 交互和蓝图建筑加载路径。（需在浏览器中人工验证）

## 10. 内部 data 层与配置简化

- [x] 10.1 新增 data 层目录 `src/data/`：`theme.js`（主题颜色/角色配色）、`shopCatalog.js`（商品列表）、`seedCatalog.js`（种子成熟时间/奖励 + 初始背包）、`taskDefs.js`（初始任务）、`weaponDefs.js`（武器伤害/击退、爆炸参数）。
- [x] 10.2 将 `FarmGameplay` 的种子成熟时间与收割奖励硬编码改为读取 `seedCatalog`。
- [x] 10.3 将 `PKGameplay` 的武器伤害、击退、炸弹与爆炸参数硬编码改为读取 `weaponDefs`。
- [x] 10.4 将 `gameDataService` 的初始背包与初始任务硬编码改为读取 `seedCatalog` / `taskDefs`。
- [x] 10.5 简化 `ConfigProvider`：移除 `window.__SITE_CONFIG__` 运行时注入，优先消费 data 层（`theme` / `shopCatalog`），保留 `site-config.js` 作为兼容 fallback；构造参数改为主题键。
- [x] 10.6 复查 `main.js` 剩余业务逻辑，将农场坠落保护等冗余玩法逻辑整合进对应模块（`FarmGameplay`）。
- [x] 10.7 运行 `npm run build` 验证 data 层重构无构建错误。
