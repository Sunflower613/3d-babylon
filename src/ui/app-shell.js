import nipplejs from 'nipplejs';

// 初始化全局输入状态，供 iframe 内部的 3D Player 实时同步
window.keys = { space: false, shift: false, j: false };
window.isRadialMenuOpen = false;
window.joystickDir = { x: 0, y: 0 };
window.isPlayingMusic = false;
window.audioCtx = null;

// 提供给 iframe 子页面调用的公共音效发声方法
window.playCustomSound = function(freq, duration, type = 'sine', vol = 0.05) {
  try {
    if (!window.audioCtx) {
      window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx.state === 'suspended') {
      window.audioCtx.resume();
    }
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, window.audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, window.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, window.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    
    osc.start();
    osc.stop(window.audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Play custom sound failed', e);
  }
};

class AppShell {
  constructor() {
    this.iframe = document.getElementById('game-frame');
    this.synthInterval = null;
    this.activeTheme = 'summer'; // 默认夏季主题，可通过子页面载入时更新
    
    this.init();
  }

  async init() {
    // 动态获取 parent 的统一配置文件
    try {
      const module = await import('../../../site-config.js');
      const siteConfig = module.siteConfig;
      if (siteConfig && siteConfig.activeTheme) {
        this.activeTheme = siteConfig.activeTheme;
      }
    } catch (e) {
      console.warn('Fail to import site-config in app-shell', e);
    }

    this.initSSO();
    this.initSidebar();
    this.initControls();
    this.initAudio();
    this.initFullscreen();
    this.initHotkeys();
  }

  // 1. SSO 统一登录/用户状态初始化
  initSSO() {
    const ssoLoginBtn = document.getElementById('sso-login-btn');
    const ssoUserInfo = document.getElementById('sso-user-info');
    const ssoAvatar = document.getElementById('sso-avatar');
    
    const sidebarLogin = document.getElementById('sidebar-login-btn');
    const sidebarLogout = document.getElementById('sidebar-logout-btn');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarStatus = document.getElementById('sidebar-user-status');

    // 解析 URL Query 中的 SSO Token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('sso_access_token');
    const userStr = urlParams.get('sso_user');
    if (token && userStr) {
      localStorage.setItem('sso_access_token', token);
      localStorage.setItem('sso_user', userStr);
      
      urlParams.delete('sso_access_token');
      urlParams.delete('sso_user');
      const cleanQuery = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const initSSOState = () => {
      const savedToken = localStorage.getItem('sso_access_token');
      const savedUser = localStorage.getItem('sso_user');

      if (savedToken && savedUser) {
        try {
          const user = JSON.parse(savedUser);
          
          if (ssoLoginBtn) ssoLoginBtn.style.display = 'none';
          if (ssoUserInfo) ssoUserInfo.style.display = 'flex';
          if (ssoAvatar) ssoAvatar.src = user.avatar || '';

          if (sidebarAvatar) sidebarAvatar.src = user.avatar || '';
          if (sidebarUsername) sidebarUsername.textContent = user.username || '未知用户';
          if (sidebarStatus) {
            sidebarStatus.textContent = user.role === 'admin' ? '管理员' : '正式会员';
            sidebarStatus.className = 'status-badge member';
          }
          if (sidebarLogin) sidebarLogin.style.display = 'none';
          if (sidebarLogout) sidebarLogout.style.display = 'flex';
        } catch (e) {
          console.error('SSO parse failed', e);
        }
      } else {
        if (ssoLoginBtn) ssoLoginBtn.style.display = 'flex';
        if (ssoUserInfo) ssoUserInfo.style.display = 'none';

        if (sidebarAvatar) sidebarAvatar.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z'/%3E%3C/svg%3E";
        if (sidebarUsername) sidebarUsername.textContent = '未登录';
        if (sidebarStatus) {
          sidebarStatus.textContent = '游客';
          sidebarStatus.className = 'status-badge';
        }
        if (sidebarLogin) sidebarLogin.style.display = 'inline-block';
        if (sidebarLogout) sidebarLogout.style.display = 'none';
      }
    };

    initSSOState();

    if (sidebarLogin) {
      sidebarLogin.addEventListener('click', (e) => {
        e.preventDefault();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && window.location.port === '3000') {
          window.location.href = 'http://127.0.0.1:8000/login/index.html?redirect=' + encodeURIComponent(window.location.href);
        } else {
          window.location.href = '/login/index.html?redirect=' + encodeURIComponent(window.location.href);
        }
      });
    }

    if (sidebarLogout) {
      sidebarLogout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('sso_access_token');
        localStorage.removeItem('sso_user');
        initSSOState();
        this.closeSidebar();
      });
    }
  }

  // 2. 侧边栏菜单管理
  initSidebar() {
    const ssoLoginBtn = document.getElementById('sso-login-btn');
    const ssoUserInfo = document.getElementById('sso-user-info');
    const sidebar = document.getElementById('sso-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close-btn');
    const sidebarBack2d = document.getElementById('sidebar-back-2d-btn');
    const sidebarStuck = document.getElementById('sidebar-stuck-btn');

    const handleSidebarOpen = (e) => {
      e.stopPropagation();
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('visible');
      const subApp = this.getSubApp();
      if (subApp && subApp.player) {
        subApp.player.controlsLocked = true;
        subApp.player.resetInputs();
      }
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
      const subApp = this.getSubApp();
      if (subApp && subApp.player) {
        subApp.player.controlsLocked = false;
      }
    };

    const toggleSidebar = () => {
      const isOpen = sidebar.classList.contains('open');
      if (isOpen) {
        closeSidebar();
      } else {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('visible');
        const subApp = this.getSubApp();
        if (subApp && subApp.player) {
          subApp.player.controlsLocked = true;
          subApp.player.resetInputs();
        }
      }
    };

    this.closeSidebar = closeSidebar;
    this.toggleSidebar = toggleSidebar;

    if (ssoLoginBtn) ssoLoginBtn.addEventListener('click', handleSidebarOpen);
    if (ssoUserInfo) ssoUserInfo.addEventListener('click', handleSidebarOpen);
    if (sidebarClose) sidebarClose.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', (e) => { e.stopPropagation(); closeSidebar(); });

    // 返回 2D 页面跳转逻辑
    if (sidebarBack2d) {
      sidebarBack2d.addEventListener('click', (e) => {
        e.preventDefault();
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && window.location.port === '3000') {
          window.location.href = 'http://127.0.0.1:8000/index.html';
        } else {
          window.location.href = '/index.html';
        }
      });
    }

    // 脱离卡死
    if (sidebarStuck) {
      sidebarStuck.addEventListener('click', (e) => {
        e.stopPropagation();
        const subApp = this.getSubApp();
        if (subApp && typeof subApp.unstuckPlayer === 'function') {
          subApp.unstuckPlayer();
        }
        closeSidebar();
      });
    }

    // 地图选择与功能项点击分流
    const btnMapIsland = document.getElementById('btn-map-island');
    const btnMapHouse = document.getElementById('btn-map-house');

    if (btnMapIsland) {
      btnMapIsland.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchMap('island');
        closeSidebar();
      });
    }
    if (btnMapHouse) {
      btnMapHouse.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchMap('house');
        closeSidebar();
      });
    }

    const sidebarButtons = [
      { id: 'btn-sidebar-leaderboard', name: 'leaderboard' },
      { id: 'btn-sidebar-tasks', name: 'tasks' },
      { id: 'btn-sidebar-farm', name: 'farm' },
      { id: 'btn-sidebar-pk', name: 'pk' },
      { id: 'btn-sidebar-bag', name: 'bag' },
      { id: 'btn-sidebar-home', name: 'home' },
      { id: 'btn-sidebar-shop', name: 'shop' }
    ];

    sidebarButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          closeSidebar();
          
          if (btn.name === 'farm') {
            this.switchMap('farm');
          } else if (btn.name === 'pk') {
            // 直接进入 PVP 擂台子页面
            this.switchMap('pk_arena');
          } else {
            // 在子页面对应的 modalMgr 中打开弹窗 (如 bag, home, leaderboard, tasks)
            const subApp = this.getSubApp();
            if (subApp && subApp.modalMgr) {
              subApp.modalMgr.openModal(btn.name);
            }
          }
        });
      }
    });

    // 绑定键盘 Esc 键常驻控制
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const subApp = this.getSubApp();
        
        // 1. 如果子页面里有结算面板
        const subDoc = this.iframe.contentDocument;
        if (subDoc) {
          const settleCloseBtn = subDoc.getElementById('btn-settle-close');
          if (settleCloseBtn) {
            e.preventDefault();
            settleCloseBtn.click();
            return;
          }
        }

        // 2. 如果子页面里有任何 2D 模态弹窗打开，优先关闭
        if (subApp && subApp.modalMgr && subApp.modalMgr.isAnyModalOpen) {
          e.preventDefault();
          subApp.modalMgr.closeAllModals();
          return;
        }

        // 3. 否则，开关侧边栏
        e.preventDefault();
        toggleSidebar();
      }
    });
  }

  // 3. 移动端摇杆和虚拟动作按钮控制
  initControls() {
    // 动作按钮事件绑定，直接同步到 window.keys 状态上供 iframe 子页面同步
    const actionBtns = [
      { id: 'btn-jump', key: 'space' },
      { id: 'btn-run', key: 'shift' },
      { id: 'btn-pk-attack', key: 'j' },
      { id: 'btn-interact', action: () => {
        const subApp = this.getSubApp();
        if (subApp && subApp.interactMgr) {
          subApp.interactMgr.triggerActiveInteraction();
        }
      }}
    ];

    actionBtns.forEach(cfg => {
      const btn = document.getElementById(cfg.id);
      if (btn) {
        if (cfg.key) {
          btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (cfg.key === 'space' && window.isRadialMenuOpen) return;
            
            if (cfg.key === 'j') {
              const subApp = this.getSubApp();
              if (subApp && subApp.currentMap === 'farm') {
                if (subApp.isRadialMenuOpen) {
                  subApp.closeRadialSeedMenu();
                } else {
                  subApp.openRadialSeedMenu();
                }
                return;
              }
            }
            
            window.keys[cfg.key] = true;
          }, { passive: false });
          btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (cfg.key === 'j') {
              const subApp = this.getSubApp();
              if (subApp && subApp.currentMap === 'farm') {
                return;
              }
            }
            window.keys[cfg.key] = false;
          }, { passive: false });
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (cfg.key === 'j') {
              const subApp = this.getSubApp();
              if (subApp && subApp.currentMap === 'farm') {
                if (subApp.isRadialMenuOpen) {
                  subApp.closeRadialSeedMenu();
                } else {
                  subApp.openRadialSeedMenu();
                }
              }
            }
          });
        } else if (cfg.action) {
          btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            cfg.action();
          }, { passive: false });
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            cfg.action();
          });
        }
      }
    });

    // 虚拟摇杆初始化
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) {
      const options = {
        zone: joystickZone,
        mode: 'static',
        position: { left: '50px', bottom: '50px' },
        color: 'white',
        size: 96
      };

      const manager = nipplejs.create(options);
      manager.on('move', (evt, data) => {
        if (data.vector) {
          // NippleJS y轴向上为正，ThreeJS相差180度，需将y取反
          window.joystickDir.x = data.vector.x;
          window.joystickDir.y = -data.vector.y;
        }
      });

      manager.on('end', () => {
        window.joystickDir.x = 0;
        window.joystickDir.y = 0;
      });
    }
  }

  // 4. 背景音乐常驻播放器
  initAudio() {
    const audioBtn = document.getElementById('sidebar-audio-btn');
    const audioMuteIcon = document.getElementById('sidebar-audio-icon-mute');
    const audioOnIcon = document.getElementById('sidebar-audio-icon-on');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => {
      if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (window.isPlayingMusic) {
        window.isPlayingMusic = false;
        if (audioMuteIcon) audioMuteIcon.style.display = 'flex';
        if (audioOnIcon) audioOnIcon.style.display = 'none';
        if (this.synthInterval) {
          clearInterval(this.synthInterval);
          this.synthInterval = null;
        }
      } else {
        window.isPlayingMusic = true;
        if (audioMuteIcon) audioMuteIcon.style.display = 'none';
        if (audioOnIcon) audioOnIcon.style.display = 'flex';
        window.audioCtx.resume();
        this.playMelodyLoop();
      }
    });
  }

  playMelodyLoop() {
    const isChristmas = this.activeTheme === 'christmas';
    const baseOctave = isChristmas ? 1.2 : 1.0;
    const chords = [
      [130.81, 196.00, 261.63, 329.63, 392.00].map(n => n * baseOctave), 
      [146.83, 220.00, 293.66, 349.23, 440.00].map(n => n * baseOctave), 
      [164.81, 246.94, 329.63, 392.00, 493.88].map(n => n * baseOctave), 
      [116.54, 174.61, 233.08, 293.66, 349.23].map(n => n * baseOctave)  
    ];

    let chordIdx = 0;
    let step = 0;

    const playNote = (freq, duration, type = 'sine', vol = 0.05) => {
      if (!window.isPlayingMusic || !window.audioCtx) return;
      window.playCustomSound(freq, duration, type, vol);
    };

    this.synthInterval = setInterval(() => {
      const currentChord = chords[chordIdx];
      const pattern = [0, 2, 1, 3, 2, 4, 3, 1];
      const noteIdx = pattern[step % pattern.length];
      const frequency = currentChord[noteIdx];

      const noteVol = isChristmas ? 0.05 : 0.08;
      playNote(frequency, 0.9, 'sine', noteVol);

      if (step % 4 === 0 && Math.random() > 0.3) {
        const bellFreq = frequency * 2.0;
        playNote(bellFreq, 1.6, 'sine', isChristmas ? 0.04 : 0.03);
      }

      step++;
      
      if (step % 16 === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }
    }, 320);
  }

  // 5. 辅助方法：获取 iframe 内部子页面的 app 实例
  getSubApp() {
    if (this.iframe && this.iframe.contentWindow) {
      return this.iframe.contentWindow.gameApp;
    }
    return null;
  }

  // 6. iframe 地图页面载入时的回调方法
  onMapLoaded(mapName) {
    console.log(`地图已加载到 iframe: ${mapName}`);
    
    // 动态调整动作按钮状态
    const interactBtn = document.getElementById('btn-interact');
    const attackBtn = document.getElementById('btn-pk-attack');
    
    // 大厅/岛屿不显示，在农场显示“种植”，在 PVP 擂台时显式呈现攻击按键
    if (attackBtn) {
      if (mapName === 'pk_arena') {
        attackBtn.style.display = 'flex';
        attackBtn.setAttribute('title', '攻击');
        attackBtn.setAttribute('aria-label', '攻击');
        attackBtn.innerHTML = `
<svg style="display: flex;" class="lucide lucide-swords" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
  <line x1="13" x2="19" y1="19" y2="13" />
  <line x1="16" x2="20" y1="16" y2="20" />
  <line x1="19" x2="21" y1="21" y2="19" />
  <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
  <line x1="5" x2="9" y1="14" y2="18" />
  <line x1="7" x2="4" y1="17" y2="20" />
  <line x1="3" x2="5" y1="19" y2="21" />
</svg>`;
      } else if (mapName === 'farm') {
        attackBtn.style.display = 'flex';
        attackBtn.setAttribute('title', '种植');
        attackBtn.setAttribute('aria-label', '种植');
        attackBtn.innerHTML = `
<svg style="display: flex;" class="lucide lucide-sprout" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M7 20h10" />
  <path d="M10 20V12h4v8" />
  <path d="M12 12a5 5 0 0 0-5-5H4v2h3a3 3 0 0 1 3 3v0" />
  <path d="M12 8a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0-3 3v0" />
</svg>`;
      } else {
        attackBtn.style.display = 'none';
      }
    }

    // 同步把声音状态告知子页面 (如有必要)
    if (window.isPlayingMusic && window.audioCtx) {
      window.audioCtx.resume();
    }
  }

  // 7. 外层转场跳转
  switchMap(targetMap) {
    const subApp = this.getSubApp();
    if (subApp && typeof subApp.switchMap === 'function') {
      subApp.switchMap(targetMap);
    }
  }

  // 8. 移动端全屏模式管理 (由外壳接管，保证UI层不丢失)
  initFullscreen() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    if (isTouchDevice) {
      const enableAutoFullscreen = () => {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
          
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        }
      };
      
      document.addEventListener('touchstart', enableAutoFullscreen, { once: true });
      document.addEventListener('click', enableAutoFullscreen, { once: true });
    }
  }

  // 9. 注册键盘快捷键监听：B-背包，J-任务，P-排行榜，M-地图/侧边栏
  initHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toLowerCase();
      const subApp = this.getSubApp();
      
      if (key === 'b') {
        e.preventDefault();
        if (subApp && subApp.modalMgr) {
          if (subApp.modalMgr.modals.bag.classList.contains('open')) {
            subApp.modalMgr.closeModal('bag');
          } else {
            subApp.modalMgr.closeAllModals();
            subApp.modalMgr.openModal('bag');
          }
        }
      } else if (key === 'j') {
        e.preventDefault();
        if (subApp && subApp.modalMgr) {
          if (subApp.modalMgr.modals.tasks.classList.contains('open')) {
            subApp.modalMgr.closeModal('tasks');
          } else {
            subApp.modalMgr.closeAllModals();
            subApp.modalMgr.openModal('tasks');
          }
        }
      } else if (key === 'p') {
        e.preventDefault();
        if (subApp && subApp.modalMgr) {
          if (subApp.modalMgr.modals.leaderboard.classList.contains('open')) {
            subApp.modalMgr.closeModal('leaderboard');
          } else {
            subApp.modalMgr.closeAllModals();
            subApp.modalMgr.openModal('leaderboard');
          }
        }
      } else if (key === 'm') {
        e.preventDefault();
        if (subApp && subApp.modalMgr) {
          if (subApp.modalMgr.modals.map.classList.contains('open')) {
            subApp.modalMgr.closeModal('map');
          } else {
            subApp.modalMgr.closeAllModals();
            subApp.modalMgr.openModal('map');
          }
        }
      } else if (key === 'g') {
        e.preventDefault();
        if (subApp && subApp.modalMgr) {
          if (subApp.modalMgr.modals.shop.classList.contains('open')) {
            subApp.modalMgr.closeModal('shop');
          } else {
            subApp.modalMgr.closeAllModals();
            subApp.modalMgr.openModal('shop');
          }
        }
      }
    });
  }

  // 10. 弹窗打开/关闭时隐藏/显示常驻 HUD，解决 UI 挡住面板的问题
  onModalOpened(modalId) {
    const ssoProfile = document.getElementById('sso-profile-container');
    const mobileControls = document.getElementById('mobile-controls');
    if (ssoProfile) {
      ssoProfile.style.opacity = '0';
      ssoProfile.style.pointerEvents = 'none';
    }
    if (mobileControls) {
      mobileControls.style.opacity = '0';
      mobileControls.style.pointerEvents = 'none';
    }
  }

  onModalClosed(modalId) {
    const ssoProfile = document.getElementById('sso-profile-container');
    const mobileControls = document.getElementById('mobile-controls');
    if (ssoProfile) {
      ssoProfile.style.opacity = '1';
      ssoProfile.style.pointerEvents = 'auto';
    }
    if (mobileControls) {
      mobileControls.style.opacity = '1';
      mobileControls.style.pointerEvents = 'auto';
    }
  }
}

// 绑定外层 AppShell 实例到全局以供子页面引用
window.addEventListener('DOMContentLoaded', () => {
  window.appShell = new AppShell();
});