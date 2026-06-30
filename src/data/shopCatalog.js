/**
 * 商品目录数据（data 层）。
 *
 * 集中农场商店商品列表，替代 `site-config.shopGoods` 作为 3D 模块内部的
 * 商品数据源。供 ConfigProvider.shopGoods / ShopPanel / BagPanel 消费。
 */
export const SHOP_CATALOG = {
  agriculture: [
    { id: 'seed_wheat', name: '小麦种子', type: 'seed', icon: '🌾', price: 10, quality: 'green', desc: '基础作物，成熟后可收获金币。' },
    { id: 'seed_carrot', name: '胡萝卜种子', type: 'seed', icon: '🥕', price: 20, quality: 'green', desc: '中等收益作物，生长较快。' },
    { id: 'seed_strawberry', name: '草莓种子', type: 'seed', icon: '🍓', price: 35, quality: 'blue', desc: '高价值作物，收益可观。' },
    { id: 'fertilizer_basic', name: '基础肥料', type: 'consumable', icon: '🧪', price: 15, quality: 'green', desc: '加速作物生长。' }
  ],
  decorations: [
    { id: 'furn_lamp', name: '小台灯', type: 'furniture', icon: '💡', price: 50, quality: 'blue', desc: '温馨小屋家具。' },
    { id: 'furn_rug', name: '小地毯', type: 'furniture', icon: '🧶', price: 80, quality: 'blue', desc: '装饰地板。' },
    { id: 'furn_plant', name: '盆栽', type: 'furniture', icon: '🪴', price: 60, quality: 'green', desc: '绿色点缀。' }
  ],
  topup: [
    { id: 'coin_small', name: '小额金币包', type: 'topup', icon: '🪙', price: 0, quality: 'green', desc: '开发模式占位，实际充值由父站处理。' }
  ]
};
