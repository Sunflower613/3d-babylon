/**
 * 每日任务定义数据（data 层）。
 *
 * 集中初始每日任务列表，替代 gameDataService 中的硬编码，作为存档初始化数据源。
 * 函数返回新数组，避免存档间共享引用。
 */
export function createInitialTasks() {
  return [
    { id: 'kick_ball', name: '在群岛领取沙滩球或踢球 1 次', progress: 0, target: 1, reward: 50, status: 'ongoing', type: 'kick' },
    { id: 'rest_bed', name: '在温馨小屋床上休息 1 次', progress: 0, target: 1, reward: 50, status: 'ongoing', type: 'rest' },
    { id: 'play_poker', name: '游玩 1 局 21点纸牌游戏', progress: 0, target: 1, reward: 80, status: 'ongoing', type: 'game_poker' },
    { id: 'crop_harvest', name: '收割成熟的农地作物 3 次', progress: 0, target: 3, reward: 100, status: 'ongoing', type: 'harvest' }
  ];
}
