/**
 * 主题数据（data 层）。
 *
 * 集中主题颜色与角色配色，替代 `site-config.themes` 作为 3D 模块内部的
 * 主题数据源。配置项变更属于构建期数据，重新部署即可生效，无需运行时注入。
 *
 * 结构保持与原 `site-config.themes[key]` 一致：{ colors, player }，
 * 供 Environment / Player / ConfigProvider 直接消费。
 */
export const DEFAULT_THEME = 'beach';

export const THEMES = {
  beach: {
    colors: {
      sky: 0xb2ebf2,
      fog: 0xe0f7fa,
      sand: 0xf5deb3,
      dirt: 0x8b4513,
      seaWater: 0x40c4ff
    },
    player: {
      hairColor: 0xff8a80,
      clothingColor: 0xffffff,
      hatColor: 0xffd180
    }
  },
  christmas: {
    colors: {
      sky: 0x050c18,
      fog: 0xe0f7fa,
      sand: 0xffffff,
      dirt: 0x4e342e,
      seaWater: 0x29b6f6
    },
    player: {
      hairColor: 0xff8a80,
      clothingColor: 0xffffff,
      hatColor: 0xffd180
    }
  }
};
