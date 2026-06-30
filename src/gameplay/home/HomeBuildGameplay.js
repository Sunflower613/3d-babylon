/**
 * 家园建筑摆放玩法（Task 6.3）。
 *
 * 拥有家具射线放置的每帧逻辑，从 `main.js` 抽取而来。依赖通过 `app`
 * （兼容上下文）暴露的 engine / scene 与编辑预览组，不直接访问内部细节。
 * 后续可与 entities/Building.js 的建筑实体路径协同。
 */
export class HomeBuildGameplay {
  constructor(app) {
    this.app = app;
  }

  updateHomeBuildFrame() {
    const app = this.app;
    if (!app.isHomeBuildActive || !app.editPreviewGroup) return;

    const width = app.engine.getRenderWidth();
    const height = app.engine.getRenderHeight();
    const pickInfo = app.scene.pick(width / 2, height / 2);

    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
      const hitPoint = pickInfo.pickedPoint;

      let targetX = Math.round(hitPoint.x * 2) / 2;
      let targetZ = Math.round(hitPoint.z * 2) / 2;

      targetX = Math.max(-4.0, Math.min(4.0, targetX));
      targetZ = Math.max(1.0, Math.min(9.0, targetZ));

      app.editPreviewGroup.position.set(targetX, 0.12, targetZ);
    }
  }
}
