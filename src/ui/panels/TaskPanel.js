/**
 * 每日任务面板（Task 6.5 / 8.4）。
 *
 * 拥有任务渲染、进度推进与活跃宝箱领取，从 `main.js` 抽取。前往按钮通过
 * `app.switchMap` 路由服务跳转地图，奖励通过经济服务发放，保持原行为。
 */
export class TaskPanel {
  constructor(app) {
    this.app = app;
  }

  init() {
    this.render();
  }

  render() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const listContainer = pDoc.getElementById('tasks-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let completedCount = 0;
    app.gameData.tasks.forEach((task) => {
      if (task.progress >= task.target) {
        completedCount++;
      }
    });

    app.gameData.tasks.forEach((task) => {
      const pct = Math.min(100, Math.floor((task.progress / task.target) * 100));
      const isDone = task.status === 'completed';

      const item = pDoc.createElement('div');
      item.className = `task-item ${isDone ? 'done' : ''}`;
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '12px 16px';
      item.style.margin = '4px 0';
      item.style.background = 'rgba(255, 255, 255, 0.02)';
      item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      item.style.borderRadius = '12px';
      item.style.width = '100%';
      item.style.boxSizing = 'border-box';

      item.innerHTML = `
        <div class="task-info" style="display: flex; flex-direction: column; gap: 4px;">
          <h4 style="margin: 0; font-size: 0.95rem; color: #fff;">${task.name}</h4>
          <span class="progress" style="font-size: 0.8rem; color: var(--text-muted);">${task.progress}/${task.target}</span>
        </div>
        <div class="task-action" style="pointer-events: auto;">
          ${isDone
            ? '<button class="task-btn claim-btn hud-btn" style="padding: 6px 12px; font-size: 0.75rem;" disabled>已完成</button>'
            : `<button class="task-btn claim-btn hud-btn" id="task-btn-${task.id}" style="padding: 6px 12px; font-size: 0.75rem; cursor: pointer;">${pct === 100 ? '领取奖励' : '前往'}</button>`}
        </div>
      `;
      listContainer.appendChild(item);

      const btn = pDoc.getElementById(`task-btn-${task.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (pct === 100) {
            task.status = 'completed';
            app.updateCoins(task.reward);
            app.gainExp(30);
            app.showToast(`领取了任务奖励：获得 🪙 ${task.reward} 金币 + 30 经验！`);
            this.render();
          } else {
            app.modalMgr.closeAllModals();
            if (task.type === 'kick') app.switchMap('island');
            else if (task.type === 'rest') app.switchMap('house');
            else if (task.type === 'harvest') app.switchMap('farm');
          }
        });
      }
    });

    const progressText = pDoc.getElementById('tasks-progress-text');
    const progressBar = pDoc.getElementById('tasks-progress-bar');
    const claimChestBtn = pDoc.getElementById('btn-tasks-claim-chest');
    const chestIcon = pDoc.getElementById('tasks-chest-btn');

    if (progressText) progressText.textContent = `${completedCount} / 5`;
    if (progressBar) progressBar.style.width = `${(completedCount / 5) * 100}%`;

    if (claimChestBtn) {
      const today = new Date().toDateString();
      const chestKey = `tasks_chest_claimed_${today}`;
      const hasClaimed = localStorage.getItem(chestKey) === 'true';

      if (hasClaimed) {
        claimChestBtn.textContent = '已领取今日大奖';
        claimChestBtn.disabled = true;
        if (chestIcon) chestIcon.textContent = '📦';
      } else if (completedCount >= 5) {
        claimChestBtn.textContent = '领取活跃宝箱';
        claimChestBtn.disabled = false;
        if (chestIcon) chestIcon.textContent = '🎁';
        claimChestBtn.onclick = () => {
          localStorage.setItem(chestKey, 'true');
          app.updateCoins(300);
          app.gainExp(100);
          app.showToast('🎉 成功开启活跃度宝箱！获得 🪙 300 金币 + 100 经验大奖！');
          this.render();
        };
      } else {
        claimChestBtn.textContent = '未达成要求';
        claimChestBtn.disabled = true;
        if (chestIcon) chestIcon.textContent = '🎁';
      }
    }
  }

  triggerProgress(type) {
    const app = this.app;
    app.gameData.tasks.forEach((task) => {
      if (task.type === type && task.status === 'ongoing' && task.progress < task.target) {
        task.progress++;
        app.saveGameData();
        this.render();
        if (task.progress === task.target) {
          app.showToast(`🔔 每日任务【${task.name}】已可领取奖励！`);
        }
      }
    });
  }
}
