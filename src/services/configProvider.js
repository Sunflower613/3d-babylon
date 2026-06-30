import { siteConfig as localSiteConfig } from '../../../site-config.js';
import { THEMES, DEFAULT_THEME } from '../data/theme.js';
import { SHOP_CATALOG } from '../data/shopCatalog.js';

/**
 * 配置 Provider（Task 2.1 + data 层简化）。
 *
 * 配置数据优先来自 3D 模块内部 data 层（src/data/*），属于构建期数据，
 * 配置变更重新部署即可生效，因此不再支持 `window.__SITE_CONFIG__` 运行时注入。
 * 保留 `site-config.js` 作为兼容 fallback：当 data 层缺失对应主题/商品时回退。
 *
 * 构造参数为主题键（themeKey）；缺省时取 site-config.activeTheme 或默认主题。
 */
export class ConfigProvider {
  constructor(themeKey = null) {
    this.fallback = localSiteConfig;
    this.themeKey = themeKey
      || (this.fallback && this.fallback.activeTheme)
      || DEFAULT_THEME;
  }

  /** 兼容旧引用：暴露 site-config 作为 fallback 视图。 */
  get siteConfig() {
    return this.fallback;
  }

  get activeTheme() {
    return this.themeKey;
  }

  getThemeConfig() {
    return THEMES[this.activeTheme]
      || (this.fallback.themes && this.fallback.themes[this.activeTheme])
      || THEMES[DEFAULT_THEME];
  }

  get shopGoods() {
    return SHOP_CATALOG || this.fallback.shopGoods || {};
  }
}
