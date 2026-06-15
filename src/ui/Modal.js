/* ==========================================================================
   UI Modal Management
   ========================================================================== */

export class ModalManager {
  constructor() {
    this.modals = {
      about: document.getElementById('modal-about'),
      skills: document.getElementById('modal-skills'),
      projects: document.getElementById('modal-projects'),
      arcade: document.getElementById('modal-arcade'),
      easel: document.getElementById('modal-easel'),
      wardrobe: document.getElementById('modal-wardrobe'),
      leaderboard: document.getElementById('modal-leaderboard'),
      tasks: document.getElementById('modal-tasks'),
      farm: document.getElementById('modal-farm'),
      pk: document.getElementById('modal-pk'),
      bag: document.getElementById('modal-bag'),
      home: document.getElementById('modal-home'),
      exit: document.getElementById('modal-exit')
    };
    
    this.iframe = document.getElementById('arcade-iframe');
    this.arcadeLobby = document.getElementById('arcade-lobby');
    this.arcadeTitle = document.getElementById('arcade-title');
    this.arcadeBackBtn = document.getElementById('btn-arcade-back');
    this.closeButtons = document.querySelectorAll('.modal-close');
    this.overlayList = document.querySelectorAll('.modal-overlay');
    this.isAnyModalOpen = false;

    this.init();
    this.hydrateFromConfig();
  }

  init() {
    // Bind close events
    this.closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        let modalId = btn.getAttribute('data-close');
        if (modalId && modalId.startsWith('modal-')) {
          modalId = modalId.replace('modal-', '');
        }
        this.closeModal(modalId);
      });
    });

    // Close on clicking overlay background
    this.overlayList.forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          const modalId = overlay.id.replace('modal-', '');
          this.closeModal(modalId);
        }
      });
    });

    // ESC key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isAnyModalOpen) {
        this.closeAllModals();
      }
    });
  }

  async hydrateFromConfig() {
    try {
      // Dynamically import the unified configuration from parent directory
      const module = await import('../../../site-config.js');
      const siteConfig = module.siteConfig;

      // 1. Hydrate "About Me" Modal Info
      if (siteConfig.developer) {
        const dev = siteConfig.developer;
        
        const avatarEl = document.querySelector('#modal-about .avatar-placeholder');
        if (avatarEl) avatarEl.textContent = dev.avatar || '🌻';

        const profileInfoEl = document.querySelector('#modal-about .profile-info');
        if (profileInfoEl) {
          profileInfoEl.innerHTML = `
            <h3>${dev.name}</h3>
            <p class="tagline">${dev.tagline}</p>
          `;
        }

        const bioTextEl = document.querySelector('#modal-about .bio-text');
        if (bioTextEl) {
          bioTextEl.innerHTML = `
            <p>${dev.bio}</p>
            <p><strong>联系邮箱:</strong> ${dev.email}</p>
            <div style="margin-top: 20px; display: flex; gap: 12px; pointer-events: auto;">
              <a href="../../class.html" class="hud-btn" style="padding: 8px 16px; font-size: 0.8rem; text-decoration: none;">我的课表</a>
              <a href="../../album.html" class="hud-btn" style="padding: 8px 16px; font-size: 0.8rem; text-decoration: none;">我的相册</a>
            </div>
          `;
        }
      }

      // 2. Hydrate "Projects" Modal Info
      const projectsGrid = document.querySelector('#modal-projects .projects-grid');
      if (projectsGrid && siteConfig.games) {
        projectsGrid.innerHTML = '';
        // Map the first few games or items as demonstration projects
        siteConfig.games.forEach(game => {
          const projCard = document.createElement('div');
          projCard.className = 'project-item';
          projCard.innerHTML = `
            <div class="project-img">${game.emoji || '🎮'}</div>
            <div class="project-detail">
              <h3>${game.name}</h3>
              <p>运行于网页主页“韭菜盒子”工具箱板块下的经典互动小游戏，适配桌面端与移动端。</p>
              <button class="tag play-btn" style="margin-top: 6px; display: inline-block; text-decoration: none; cursor: pointer; border: none; background: none; color: inherit; padding: 0; font-family: inherit; text-align: left;">直接游玩</button>
            </div>
          `;
          const playBtn = projCard.querySelector('.play-btn');
          if (playBtn) {
            playBtn.addEventListener('click', (e) => {
              e.preventDefault();
              this.launchGame(game);
            });
          }
          projectsGrid.appendChild(projCard);
        });
      }

      // 3. Hydrate "Arcade Lobby" Games dynamically
      const gamesGrid = document.querySelector('.arcade-games-grid');
      if (gamesGrid && siteConfig.games) {
        gamesGrid.innerHTML = '';
        siteConfig.games.forEach(game => {
          const card = document.createElement('div');
          card.className = 'arcade-game-card';
          card.innerHTML = `
            <div class="arcade-game-icon">${game.emoji || '🕹️'}</div>
            <div class="arcade-game-title">${game.name}</div>
          `;
          card.addEventListener('click', () => {
            this.launchGame(game);
          });
          gamesGrid.appendChild(card);
        });
      }

      // 4. Hook up arcade back button
      if (this.arcadeBackBtn) {
        this.arcadeBackBtn.addEventListener('click', () => {
          this.showLobby();
        });
      }

    } catch (err) {
      console.error('Failed to dynamically import site config:', err);
    }
  }

  launchGame(game) {
    let targetPath = game.path;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (game.id === '21dian') {
      targetPath = isLocal ? `http://${window.location.hostname}:8080/games/21dian/index.html` : game.path;
    }

    let gameUrl;
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
      gameUrl = targetPath;
    } else {
      // 相对路径，往上走两级
      gameUrl = '../../' + targetPath.replace(/^\.\//, '');
    }

    // 携带 SSO 统一登录态跳转
    const token = localStorage.getItem('sso_access_token');
    const user = localStorage.getItem('sso_user');
    if (token && user) {
      try {
        const urlObj = new URL(gameUrl, window.location.href);
        urlObj.searchParams.set('sso_access_token', token);
        urlObj.searchParams.set('sso_user', user);
        gameUrl = urlObj.toString();
      } catch (e) {
        if (gameUrl.includes('?')) {
          gameUrl += `&sso_access_token=${token}&sso_user=${encodeURIComponent(user)}`;
        } else {
          gameUrl += `?sso_access_token=${token}&sso_user=${encodeURIComponent(user)}`;
        }
      }
    }

    window.open(gameUrl, '_blank');
  }

  showLobby() {
    // Keep lobby visible, clean iframe
    if (this.iframe) {
      this.iframe.src = '';
      this.iframe.style.display = 'none';
    }
    if (this.arcadeLobby) {
      this.arcadeLobby.style.display = 'block';
    }
    if (this.arcadeTitle) {
      this.arcadeTitle.textContent = '复古街机 · 游戏大厅';
    }
    if (this.arcadeBackBtn) {
      this.arcadeBackBtn.style.display = 'none';
    }
  }

  openModal(id) {
    const modal = this.modals[id];
    if (!modal) return;

    // Reset lobby state on opening arcade modal
    if (id === 'arcade') {
      this.showLobby();
    }

    // Load paint game on opening easel modal
    if (id === 'easel') {
      const easelIframe = document.getElementById('easel-iframe');
      if (easelIframe) {
        easelIframe.src = './paint.html';
      }
    }

    modal.classList.add('open');
    this.isAnyModalOpen = true;

    // Dispatch custom event to lock player controls
    window.dispatchEvent(new CustomEvent('modal-opened', { detail: { modalId: id } }));

    // Notify parent window appShell to hide HUD UI
    if (window.parent && window.parent.appShell && typeof window.parent.appShell.onModalOpened === 'function') {
      window.parent.appShell.onModalOpened(id);
    }
  }

  closeModal(id) {
    const modal = this.modals[id];
    if (!modal) return;

    modal.classList.remove('open');
    
    // Clear iframe to stop sounds and release resources
    if (id === 'arcade' && this.iframe) {
      this.iframe.src = '';
    }
    if (id === 'easel') {
      const easelIframe = document.getElementById('easel-iframe');
      if (easelIframe) {
        easelIframe.src = '';
      }
    }

    // Check if any other modals are open
    this.isAnyModalOpen = Array.from(this.overlayList).some(overlay => 
      overlay.classList.contains('open')
    );

    if (!this.isAnyModalOpen) {
      window.dispatchEvent(new CustomEvent('modal-closed', { detail: { modalId: id } }));
      
      // Notify parent window appShell to restore HUD UI
      if (window.parent && window.parent.appShell && typeof window.parent.appShell.onModalClosed === 'function') {
        window.parent.appShell.onModalClosed(id);
      }
    }
  }

  closeAllModals() {
    Object.keys(this.modals).forEach(id => this.closeModal(id));
  }
}
