/**
 * 排行榜面板（Task 6.5 / 8.4）。
 *
 * 拥有排行榜标签切换与渲染，从 `main.js` 抽取。读取 `app.gameData` 计算
 * 玩家自身排名，通过 `app.shell` 解析父级/独立文档。
 */
export class LeaderboardPanel {
  constructor(app) {
    this.app = app;
  }

  init() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const tabs = pDoc.querySelectorAll('#modal-leaderboard .tab-btn');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.render(tab.getAttribute('data-tab'));
      });
    });
    this.render('pkPoints');
  }

  render(tabName) {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const grid = pDoc.getElementById('leaderboard-list-view');
    const myRankEl = pDoc.getElementById('leaderboard-my-rank');
    if (!grid) return;
    grid.innerHTML = '';

    const otherPlayers = [
      { name: '派蒙', coins: 99999, level: 90, pkPoints: 12000, avatar: '🧚' },
      { name: '爱丽丝', coins: 15000, level: 45, pkPoints: 6200, avatar: '👩‍🎨' },
      { name: '戴因斯雷布', coins: 8800, level: 60, pkPoints: 8500, avatar: '⚔️' },
      { name: '刻晴', coins: 25000, level: 50, pkPoints: 5400, avatar: '⚡' },
      { name: '芭芭拉', coins: 1200, level: 12, pkPoints: 1500, avatar: '🎤' }
    ];

    const username = localStorage.getItem('sso_username') || '旅行者';
    const playerSelf = {
      name: username + ' (我)',
      coins: app.gameData.coins,
      level: app.gameData.level,
      pkPoints: app.gameData.level * 150 + 400,
      avatar: '🐱',
      isSelf: true
    };

    const allPlayers = [...otherPlayers, playerSelf];
    allPlayers.sort((a, b) => b[tabName] - a[tabName]);

    allPlayers.forEach((player, index) => {
      const rank = index + 1;
      let rankBadge = rank;
      if (rank === 1) rankBadge = '🥇';
      else if (rank === 2) rankBadge = '🥈';
      else if (rank === 3) rankBadge = '🥉';

      const unit = tabName === 'coins' ? '金币' : (tabName === 'level' ? '级' : '战力');
      const val = player[tabName];

      const item = pDoc.createElement('div');
      item.className = `leaderboard-item ${player.isSelf ? 'self' : ''}`;
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.padding = '10px 14px';
      item.style.margin = '6px 0';
      item.style.background = player.isSelf ? 'rgba(39, 174, 96, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      item.style.border = player.isSelf ? '1px solid #27ae60' : '1px solid rgba(255,255,255,0.05)';
      item.style.borderRadius = '10px';
      item.style.gap = '14px';
      item.style.boxSizing = 'border-box';
      item.style.width = '100%';

      item.innerHTML = `
        <div class="rank-num" style="font-size: 1.1rem; font-weight: bold; min-width: 24px; text-align: center;">${rankBadge}</div>
        <div class="rank-avatar" style="font-size: 1.5rem; user-select: none;">${player.avatar}</div>
        <div class="rank-name" style="flex: 1; font-weight: 600; color: ${player.isSelf ? '#2dcc71' : '#fff'};">${player.name}</div>
        <div class="rank-val" style="font-weight: bold; color: #ffd700;">${val} <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-muted);">${unit}</span></div>
      `;

      grid.appendChild(item);

      if (player.isSelf && myRankEl) {
        myRankEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 20px; background: rgba(0,0,0,0.25); border-top: 1px solid var(--glass-border); font-size: 0.9rem; box-sizing: border-box;">
            <span style="color: var(--text-muted);">我的排名: <strong style="color: #2dcc71; font-size: 1rem;">第 ${rank} 名</strong></span>
            <span style="color: var(--text-muted);">${unit}: <strong style="color: #ffd700; font-size: 1rem;">${val}</strong></span>
          </div>
        `;
      }
    });
  }

  getActiveTab() {
    const app = this.app;
    const pDoc = app.shell.getParentDoc();
    const activeTabEl = pDoc.querySelector('#modal-leaderboard .tab-btn.active');
    return activeTabEl ? activeTabEl.getAttribute('data-tab') : 'pkPoints';
  }
}
