## 背景

`3d-babylon` 当前使用 Babylon.js 渲染，并且已经将许多地图生成器拆分到 `src/world/*.js`。但是，`main.js` 仍然负责引擎启动、世界选择、地图路由、出生点处理、SSO、外壳/侧边栏行为、移动端控制、音频、商店、背包、任务、排行榜、农场、PK、扑克、衣柜以及每帧玩法更新。

该项目是一个预期挂载在更大父站下的 3D 模块。`site-config.js` 等文件属于父站关注点，不应该定义该模块的内部架构。当前本地副本只是开发时临时使用。

`blueprint3d-babylon` 现在已作为子模块可用。它不只是 JSON 生产器：它包含编辑器示例、建筑文件序列化、Babylon 渲染器、家具/门窗/材质原语，以及 `PinkCastleGenerator` 等运行时适配器。主 3D 模块当前尚未导入它。

## 目标 / 非目标

**目标：**

- 让 `main.js` 成为小型启动/组合入口，而不是玩法和 UI 容器。
- 使用简单命名。优先使用 `Player`、`Building`、`FarmPlot`、`Weapon`、`NPC`，避免 `PlayerAvatar` 这类过度具体的名称。
- 建立清晰架构分类：
  - `app/`：应用启动与组合。
  - `core/`：Babylon 运行时、时钟、循环和生命周期基础。
  - `services/`：可复用运行时服务。
  - `entities/`：带生命周期和可选组件的世界对象。
  - `components/`：可复用实体能力。
  - `gameplay/`：领域规则和玩法编排。
  - `generators/`：从布局、配置或蓝图数据生成地图/实体。
  - `rendering/`：Babylon 材质、网格、阴影、辉光和投影辅助工具。
  - `ui/`：DOM/HUD 面板和面向外壳的 UI 适配器。
- 定义将 `*.b3dbuilding.json` 加载到主 3D 场景中并作为 `Building` 实体呈现的路径。
- 移动代码时保持现有可见行为不变。

**非目标：**

- 不重设计农场、PK、扑克、商店、背包、任务或排行榜玩法。
- 不从 Babylon.js 迁移到其他渲染器。
- 不重写 `blueprint3d-babylon` 内部实现。
- 首次实现不要求把每个对象都转换成完整 ECS。
- 不强依赖父站的精确目录布局。

## 决策

### 决策：使用实体 + 玩法 + 服务架构，而不是宽泛的 `systems/` 桶

农场、PK、建筑等玩法领域不是通用系统。它们拥有规则、状态转移和一组实体。输入、音频、路由、交互检测、实体生命周期和宿主配置等通用关注点属于服务。

备选方案：保留 `systems/` 目录，并放入 `FarmSystem`、`PKSystem`、`BallSystem`。拒绝原因：它会隐藏领域边界，并鼓励产生另一个大型编排层。

### 决策：实体拥有可交互世界对象

实体表示存在于 3D 世界中的对象，可以被更新、交互、碰撞、渲染、释放，或者被某个玩法领域拥有。例如：`Player`、`NPC`、`Building`、`FarmPlot`、`Crop`、`Weapon`、`Bomb`、`Portal` 和 `BeachBall`。

迁移期间，实体可以包装现有 Babylon mesh group 或现有生成器输出。首次迁移不要求它们是纯数据对象。

备选方案：继续让生成器返回裸 `colliders`、`interactables` 和 `shadowCasters`。拒绝原因：长期来看会把所有权分散到 `main.js` 中，让生命周期/释放逻辑不清晰。

### 决策：组件提供可复用能力，但暂不引入重量级 ECS

组件应该是小型可复用能力，例如 `Renderable`、`Collidable`、`Interactable`、`ShadowCaster`、`Health`、`Inventory`、`Plantable`、`Pickupable` 和 `Damageable`。

首次实现可以使用普通 class 组合，而不是注册表很重的 ECS。这样能保持 JS 代码可读，避免对仍在演化的项目过度抽象。

备选方案：实现完整 ECS，包含 entity ID、component store 和 query system。暂缓原因：当前代码是 class-based，Babylon 对象生命周期很直接，立即风险是过度工程化。

### 决策：生成器创建实体或实体化地图包

生成器对于过程化或硬编码构建仍然有价值。它们的角色从拥有行为转变为从以下来源创建场景内容和实体：

- 硬编码地图布局，
- 主题配置，
- 蓝图 floorplan / 建筑 JSON，
- 预设场景定义。

地图生成器可以返回 `MapBundle`，其中包含实体、碰撞体、交互体、阴影投射体、出生点和可选更新钩子。

备选方案：删除生成器，并把所有 mesh 创建都移入实体构造函数。拒绝原因：岛屿、湖、城堡、蓝图建筑等复杂地图需要 builder-style 编排。

### 决策：蓝图集成通过 `Building` 实体和加载器/渲染器适配器完成

`blueprint3d-babylon` 可以通过 `core/buildingFile.js` 导出 `*.b3dbuilding.json` 文件。主模块应通过 `BuildingFileLoader` 加载这些文件，然后通过 `BlueprintBuildingRenderer` 或围绕 `Blueprint3DTestMap`/运行时生成器类的包装器渲染。

主模块应将结果视为一个带碰撞体、交互体、阴影投射体和生命周期方法的 `Building` 实体。

备选方案：在地图代码中到处直接导入 `Blueprint3DTestMap`。拒绝原因：这会让地图耦合到子模块 API，并绕过实体生命周期。

### 决策：父站集成通过宿主适配器完成

3D 模块不应直接导入 `../site-config.js` 等父级文件作为核心配置路径。宿主应用可以注入配置、外壳函数、SSO 状态、音频、资源 base URL 和导航回调。

默认开发适配器仍可加载本地 fallback 配置，用于独立测试。

备选方案：保留直接导入和 Vite 父级资源中间件。拒绝原因：该模块目标是可移植的，而当前本地设置是临时的。

### 决策：游戏内容数据集中于内部 data 层，移除运行时全局注入

主题、商品、种子（成熟时间/奖励）、初始任务、初始背包与武器/爆炸参数等游戏内容数据集中在模块内部的 `src/data/*`，作为单一构建期数据源，替代散落在 `FarmGameplay`、`PKGameplay`、`gameDataService` 等模块中的硬编码字面量。配置 provider 优先消费 data 层，并保留 `site-config.js` 作为兼容 fallback。

移除 `window.__SITE_CONFIG__` 运行时注入：配置项的值会变，但属于构建期数据，修改后重新部署即可生效，并非需要“热更新”的场景，运行时全局注入属过度设计。

备选方案：维持 `site-config.js` + 运行时注入 + 各模块硬编码并存。拒绝原因：数据散落难以维护与调参，且运行时注入增加了不必要的全局耦合面。

### 决策：用保持行为的包装器渐进式重构

首次实现应该在保持现有行为的同时抽取模块。可以先包装现有代码，再逐步重设计内部。例如，`PKGameplay` 可以先拥有从 `main.js` 抽出的函数，之后再拆成 `Weapon`、`Bomb`、`Explosion` 和 `NPC` 实体。

备选方案：一次性完整重写。拒绝原因：地图、控制、UI 和 iframe/父级交互存在较高回归风险。

## 风险 / 取舍

- 现有 `main.js` 状态高度耦合 → 缓解：一次抽取一个领域，使用兼容方法包装，并在每次移动后保持页面可冒烟测试。
- UI 代码依赖父级/iframe 文档 → 缓解：移动单个面板前先引入 `ShellBridge` 和 `DomService`。
- 蓝图子模块 API 可能变化 → 缓解：通过 `BuildingFileLoader` 和 `BlueprintBuildingRenderer` 隔离使用。
- 架构太多会拖慢实现 → 缓解：使用简单 class 组合，先迁移当前痛点。
- 命名变动可能让后续贡献者困惑 → 缓解：保持名称简短且领域明确，并在规格中记录所有权规则。
- 移动端控制、PK 输入或地图路由可能回归 → 缓解：每个阶段后验证所有页面入口（`lobby.html`、`house.html`、`farm.html`、`pvp.html`、`lake.html`、`castle.html`）。

## 迁移计划

1. 添加新目录结构和基础接口/class，不改变行为。
2. 抽取平台和宿主关注点：配置 provider、shell bridge、音频、toast 和路由服务。
3. 抽取引擎/运行时关注点：engine host、clock、game loop、渲染辅助工具。
4. 将世界/地图管理抽取为地图注册表、出生点解析器和 world manager。
5. 引入实体基类和实体管理器，然后优先适配 `Player` 和 `BeachBall` 等简单对象。
6. 渐进式抽取玩法领域：农场、PK、建筑/家园、扑克/街机、任务/商店/背包/排行榜 UI 面板。
7. 添加蓝图建筑加载器/渲染器适配器，并连接为 `Building` 实体路径。
8. 将 `main.js` 缩减为启动/组合入口。
9. 运行构建并手动验证所有 HTML 页面入口。

回滚策略：由于这是结构性重构，保持增量且行为不变。如果某个抽取领域失败，将该领域接线恢复到之前的 `GameApp` 方法，同时保留其他无关已抽取服务。

## 待定问题

- `blueprint3d-babylon` 应通过相对子模块导入、包别名，还是 workspace/package dependency 消费？
- 第一个蓝图建筑集成目标应该是 `house`、`castle`，还是单独测试地图？
- 商店/背包/任务/排行榜应该留在 3D 模块内，还是成为通过 `ShellBridge` 暴露的父站面板？
- 当前 SSO 行为有多少属于 3D 模块，又有多少应属于宿主站？

## 抽取清单（Task 1.1）

`main.js` 当前 `GameApp`（~2632 行，~70 方法）按目标分类映射如下：

### app/（启动与组合）
- `constructor`、`initGameSystems`（启动编排）

### core/（运行时、时钟、循环）
- `initEngine`（engine/scene/camera/resize/glow）
- `clock`（构造函数内时钟对象）
- `animate`（render loop）、`updateGameSystemsFrame`（每帧调度）

### rendering/（材质、颜色、投影辅助）
- `convertColor`、`createFlatMaterial`

### services/（可复用基础设施）
- `playCustomSound` → audio service
- `showToast`、`showStuckToast` → toast service
- `switchMap` → router service
- `initSSO` → sso/host adapter
- `getInitialGameData`、`loadGameData`、`saveGameData` → game-data/host service
- `themeConfig`/`siteConfig` 访问 → config provider

### world/（地图管理与生成器，已部分在 src/world/*）
- `initWorld`（世界选择/地图路由/出生点）、`unstuckPlayer`

### entities/（可交互世界对象）
- `Player`（src/world/Player.js）、`BeachBall`（src/world/BeachBall.js）
- 后续边界：`Building`、`FarmPlot`、`Crop`、`Weapon`、`Bomb`、`Explosion`、`NPC`、`Portal`

### gameplay/farm/
- `updateFarmPlotsFrame`、`showPlotRadialMenu`、`updateActivePlotForRadialMenu`、`triggerPlotInteraction`、`executePlantSeed`

### gameplay/pk/
- `updatePKHallAnimations`、`updatePKBattleFrame`、`opponentPerformAttack`、`playerPerformAttack`、`throwBombPhysics`、`updateActiveBombs`、`explodeBomb`、`createExplosionEffects`、`updateExplosionEffects`、`showScreenFlash`、`updatePKHPUI`、`playDamageBubble`、`endPKBattle`、`initPKUI`、`triggerPKMatching`、`cancelPKMatching`、`startPKBattle`

### gameplay/building/（home）
- `updateHomeBuildFrame`

### gameplay/arcade/（poker）
- `initPokerGame`、`pokerGameAction`、`createPokerDeck`、`drawPokerCard`、`getPokerScore`、`updatePokerCardsUI`、`endPokerGame`

### gameplay/economy/（或 services）
- `updateCoinsDisplay`、`updateLevelProgress`、`gainExp`、`updateCoins`

### ui/（DOM/HUD 面板）
- `initMobileControls`（→ ui/input，保留 nipplejs）
- `initHUDGUI`、`setGuiInteractBtnVisible`（已禁用 Babylon GUI HUD，待隔离）
- `initShopUI`、`switchShopTab`、`renderShopItems`、`selectShopItem`、`updateShopCoins`、`updateShopBuyCountUI`、`executeShopBuy`
- `initBagUI`、`renderBagItems`、`useBagItem`
- `initTaskUI`、`renderTasks`、`triggerTaskProgress`
- `initLeaderboardUI`、`renderLeaderboard`、`getActiveLeaderboardTab`
- `initWardrobeUI`
