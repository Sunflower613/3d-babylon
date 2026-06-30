/**
 * 种子目录数据（data 层）。
 *
 * 集中可种植作物的成熟时间、收割奖励与展示名，替代散落在 FarmGameplay 中的
 * 硬编码（成熟 30/60s、奖励金币 20/50、经验 15/30）。键为玩法内种子 id。
 *
 * 同时提供初始背包种子（INITIAL_BACKPACK），替代 gameDataService 中的硬编码，
 * 作为存档初始化数据源。
 */
export const SEED_CATALOG = {
  sunflower_seed: { shortName: '向日葵', matureTime: 30, coins: 20, exp: 15 },
  strawberry_seed: { shortName: '草莓', matureTime: 60, coins: 50, exp: 30 }
};

/** 存档初始背包种子。 */
export const INITIAL_BACKPACK = [
  { id: 'sunflower_seed', name: '向日葵种子', type: 'seed', count: 5, quality: 'green', desc: '可在农田里种植，成熟后收割获得丰厚金币。' },
  { id: 'strawberry_seed', name: '草莓种子', type: 'seed', count: 2, quality: 'blue', desc: '可在农田里种植，成熟收割获得巨额回报。' }
];
