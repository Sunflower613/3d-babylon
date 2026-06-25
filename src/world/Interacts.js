import * as BABYLON from '@babylonjs/core';

export class InteractsManager {
  constructor(player, generator, modalManager, app) {
    this.player = player;
    this.generator = generator;
    this.modalManager = modalManager;
    this.app = app;
    
    this.promptEl = document.getElementById('interact-prompt');
    this.promptTextEl = this.promptEl ? this.promptEl.querySelector('.prompt-text') : null;
    this.mobileInteractBtn = document.getElementById('btn-interact') || (window.parent && window.parent.document.getElementById('btn-interact'));

    this.activeInteractZone = null;
    this.isTransitioningCamera = false;
    this.cameraSavedState = null;

    this.init();
  }

  init() {
    // 监听键盘按键 E 触发交互
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'e') {
        this.triggerActiveInteraction();
      }
    });

    // 移动端交互按钮事件绑定
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerActiveInteraction();
      }, { passive: false });
      this.mobileInteractBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerActiveInteraction();
      });
    }

    // 当网页弹窗关闭时，恢复玩家相机参数
    window.addEventListener('modal-closed', () => {
      if (this.isTransitioningCamera && this.cameraSavedState) {
        this.isTransitioningCamera = false;
        
        // 重置玩家相机轨道追踪参数
        this.player.cameraDistance = this.cameraSavedState.distance;
        this.player.cameraAngleH = this.cameraSavedState.angleH;
        this.player.cameraAngleV = this.cameraSavedState.angleV;
        
        if (this.cameraSavedState.rotationY !== undefined) {
          this.player.group.rotation.y = this.cameraSavedState.rotationY;
        }
        if (this.cameraSavedState.controlsLocked !== undefined) {
          this.player.controlsLocked = this.cameraSavedState.controlsLocked;
        }
        
        this.activeInteractZone = null;
      }
    });
  }

  update() {
    // 如果玩家抱着沙滩球，可以在任何位置执行放下！
    if (this.player.carriedBall) {
      this.activeInteractZone = { id: 'drop_ball', name: '放下' };
      this.showPrompt('放下');
      return;
    }

    if (this.player.controlsLocked) return;

    let closestZone = null;
    let minDistance = 999;

    const playerPos = this.player.position;

    // 搜索最近的感应触发区域
    for (const zone of this.generator.interactables) {
      if (zone.id.startsWith('farm_plot_') && this.app && this.app.gameData) {
        const idx = parseInt(zone.id.replace('farm_plot_', ''));
        const plot = this.app.gameData.farmPlots[idx];
        if (plot && plot.status !== 'ready') {
          continue;
        }
      }
      const dx = playerPos.x - zone.x;
      const dy = playerPos.y - zone.y;
      const dz = playerPos.z - zone.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < zone.triggerRadius) {
        if (distance < minDistance) {
          minDistance = distance;
          closestZone = zone;

          // 动态更新农田交互状态文字提示
          if (zone.id.startsWith('farm_plot_') && this.app && this.app.gameData) {
            const idx = parseInt(zone.id.replace('farm_plot_', ''));
            const plot = this.app.gameData.farmPlots[idx];
            if (plot) {
              if (plot.status === 'empty') {
                zone.name = '种植农作物';
              } else if (plot.status === 'ready') {
                zone.name = '收割作物';
              } else {
                const matureTime = plot.seedId === 'sunflower_seed' ? 30 : 60;
                const elapsed = Math.floor((Date.now() - plot.plantTime) / 1000);
                const remaining = Math.max(0, matureTime - elapsed);
                zone.name = `作物生长中 (${remaining}s)`;
              }
            }
          }
        }
      }
    }

    // 搜索最近可抱起的沙滩球
    if (this.app && this.app.beachBallsList) {
      for (const ball of this.app.beachBallsList) {
        if (ball.isCarried) continue;
        const dx = playerPos.x - ball.position.x;
        const dy = playerPos.y - ball.position.y;
        const dz = playerPos.z - ball.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1.6) { // 抱起半径范围
          if (distance < minDistance) {
            minDistance = distance;
            closestZone = {
              id: 'pick_ball',
              name: '抱起',
              ball: ball
            };
          }
        }
      }
    }

    // 根据检测到的最近交互区，渲染或隐藏 HUD 提示
    if (closestZone) {
      this.activeInteractZone = closestZone;
      this.showPrompt(closestZone.name);
    } else {
      this.activeInteractZone = null;
      this.hidePrompt();
    }
  }

  showPrompt(name) {
    if (this.promptTextEl) {
      this.promptTextEl.textContent = name;
    }
    if (this.promptEl) {
      this.promptEl.classList.add('visible');
    }

    // 决定交互按钮的内容类型
    let iconType = 'interact';
    if (this.activeInteractZone) {
      if (this.activeInteractZone.id === 'drop_ball') {
        iconType = 'drop'; // 放下沙滩球使用向下箭头 SVG
      } else if (this.activeInteractZone.id.startsWith('farm_plot_') && this.app && this.app.gameData) {
        const idx = parseInt(this.activeInteractZone.id.replace('farm_plot_', ''));
        const plot = this.app.gameData.farmPlots[idx];
        if (plot && plot.status === 'empty') {
          iconType = 'sprout'; // 种植时使用发芽 SVG
        }
      }
    }

    // 联动 Canvas 控制层中的 3D GUI 交互按键
    if (this.app && typeof this.app.setGuiInteractBtnVisible === 'function') {
      this.app.setGuiInteractBtnVisible(true, iconType);
    }

    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.style.display = 'flex';
      
      const defaultSVG = `
<svg style="display: flex;" class="lucide lucide-sparkles" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275z"/>
  <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z"/>
  <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>
</svg>`;

      const sproutSVG = `
<svg style="display: flex;" class="lucide lucide-sprout" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M7 20h10" />
  <path d="M10 20V12h4v8" />
  <path d="M12 12a5 5 0 0 0-5-5H4v2h3a3 3 0 0 1 3 3v0" />
  <path d="M12 8a5 5 0 0 1 5-5h3v2h-3a3 3 0 0 0-3 3v0" />
</svg>`;

      const dropSVG = `
<svg style="display: flex;" class="lucide lucide-arrow-down" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5v14" />
  <polyline points="19 12 12 19 5 12" />
</svg>`;

      if (iconType === 'sprout') {
        this.mobileInteractBtn.innerHTML = sproutSVG;
      } else if (iconType === 'drop') {
        this.mobileInteractBtn.innerHTML = dropSVG;
      } else {
        this.mobileInteractBtn.innerHTML = defaultSVG;
      }
    }
  }

  hidePrompt() {
    if (this.promptEl) {
      this.promptEl.classList.remove('visible');
    }
    // 联动 Canvas 控制层中的 3D GUI 交互按键
    if (this.app && typeof this.app.setGuiInteractBtnVisible === 'function') {
      this.app.setGuiInteractBtnVisible(false);
    }
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.style.display = 'none';
    }
  }

  pickUpBall(ball) {
    ball.isCarried = true;
    this.player.carriedBall = ball;
    this.hidePrompt();
    // 联动 3D GUI 按钮
    if (this.app && typeof this.app.setGuiInteractBtnVisible === 'function') {
      this.app.setGuiInteractBtnVisible(true, 'drop');
    }
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.textContent = '▼';
    }
  }

  dropCarriedBall() {
    const ball = this.player.carriedBall;
    if (!ball) return;

    ball.isCarried = false;
    this.player.carriedBall = null;

    // 设置碰撞免疫，防止扔下的瞬间球又被踢飞
    ball.throwNoCollideTimer = 0.4; 

    // 获取玩家当前的朝向向量（前向向量）
    const playerForward = this.player.group.forward;
    
    // 继承角色当前的行进速度
    ball.velocity.copyFrom(this.player.velocity);
    // 加上朝前抛出的力
    ball.velocity.addInPlace(playerForward.scale(5.5)); 
    ball.velocity.y = 2.8; // 微微向上弹跳抛出
    ball.isGrounded = false;

    this.hidePrompt();
    // 放下球后将交互按键状态重置为可用
    if (this.app && typeof this.app.setGuiInteractBtnVisible === 'function') {
      this.app.setGuiInteractBtnVisible(true, 'interact');
    }
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.textContent = '✨';
    }
  }

  triggerActiveInteraction() {
    if (!this.activeInteractZone) return;

    const zone = this.activeInteractZone;

    if (zone.id === 'drop_ball') {
      this.dropCarriedBall();
      return;
    }

    if (zone.id === 'pick_ball') {
      this.pickUpBall(zone.ball);
      return;
    }

    if (zone.id === 'paimon') {
      try {
        if (window.parent && window.parent.appShell && typeof window.parent.appShell.toggleSidebar === 'function') {
          window.parent.appShell.toggleSidebar();
        } else if (typeof window.openSSOSidebar === 'function') {
          window.openSSOSidebar();
        }
      } catch (e) {
        console.warn('[交互] 打开侧边栏失败:', e);
      }
      this.hidePrompt();
      return;
    }

    if (zone.id === 'enter_house') {
      if (this.player.carriedBall) {
        this.dropCarriedBall();
      }
      this.app.switchMap('house');
      return;
    }

    if (zone.id === 'enter_castle') {
      if (this.player.carriedBall) {
        this.dropCarriedBall();
      }
      this.app.switchMap('castle');
      return;
    }

    if (zone.id === 'exit_castle' || zone.id === 'exit_portal') {
      if (this.player.carriedBall) {
        this.dropCarriedBall();
      }
      this.app.switchMap('island');
      return;
    }

    if (zone.id === 'exit_house') {
      if (this.player.carriedBall) {
        this.dropCarriedBall();
      }
      if (this.app.modalMgr) {
        this.app.modalMgr.openModal('exit');
      } else {
        this.app.switchMap('island');
      }
      return;
    }

    if (zone.id === 'swing') {
      if (this.player.isSitting) {
        this.player.standUp();
      } else {
        if (this.player.carriedBall) {
          this.dropCarriedBall();
        }
        this.player.sit(this.generator.swingSeat);
        this.hidePrompt();
      }
      return;
    }

    if (zone.id === 'ball_vendor') {
      window.dispatchEvent(new CustomEvent('spawn-ball', { 
        detail: { x: zone.x, z: zone.z } 
      }));
      return;
    }

    if (zone.id === 'house_bed' || zone.id === 'lie_bed') {
      if (this.player.isLyingDown) {
        this.player.standUp();
      } else {
        if (this.player.carriedBall) {
          this.dropCarriedBall();
        }
        const bedPos = new BABYLON.Vector3(zone.x, zone.y, zone.z);
        this.player.lieDown(bedPos);
        this.hidePrompt();
        
        // 显示躺床时的 HUD 控制面板
        const bedHud = document.getElementById('bed-hud') || document.getElementById('exit-sitting-hud');
        if (bedHud) bedHud.style.display = 'flex';
      }
      return;
    }

    if (zone.id === 'lake_seat_1' || zone.id === 'lake_seat_2') {
      if (this.player.isSitting) {
        this.player.standUp();
      } else {
        if (this.player.carriedBall) {
          this.dropCarriedBall();
        }
        const isSeat1 = zone.id === 'lake_seat_1';
        const seatObj = {
          isStatic: true,
          position: new BABYLON.Vector3(isSeat1 ? 7.5 : -7.5, 0.78, 0),
          rotationY: isSeat1 ? -Math.PI / 2 : Math.PI / 2
        };
        this.player.sit(seatObj);
        
        const exitSittingHud = document.getElementById('exit-sitting-hud');
        if (exitSittingHud) {
          const textEl = document.getElementById('exit-sitting-hud-text');
          if (textEl) textEl.textContent = '🧘 您正在静坐观赏中';
          exitSittingHud.style.display = 'flex';
        }
        this.hidePrompt();
      }
      return;
    }

    if (zone.id === 'sit_sofa') {
      if (this.player.isSitting) {
        this.player.standUp();
      } else {
        if (this.player.carriedBall) {
          this.dropCarriedBall();
        }
        const seatObj = {
          isStatic: true,
          position: new BABYLON.Vector3(0, 0.72 + 0.1, -8.7),
          rotationY: Math.PI // 面向南面
        };
        this.player.sit(seatObj);
        
        const exitSittingHud = document.getElementById('exit-sitting-hud');
        if (exitSittingHud) {
          const textEl = document.getElementById('exit-sitting-hud-text');
          if (textEl) textEl.textContent = '🧘 您正在沙发小憩中';
          exitSittingHud.style.display = 'flex';
        }
        this.hidePrompt();
      }
      return;
    }

    if (zone.id === 'lie_lounger_1' || zone.id === 'lie_lounger_2') {
      if (this.player.isLyingDown) {
        this.player.standUp();
      } else {
        if (this.player.carriedBall) {
          this.dropCarriedBall();
        }
        const loungerPos = new BABYLON.Vector3(zone.x, zone.y, zone.z);
        const chairRot = { x: -Math.PI / 6, y: -Math.PI / 2, z: 0 }; 
        this.player.lieDown(loungerPos, chairRot);
        
        const exitSittingHud = document.getElementById('exit-sitting-hud');
        if (exitSittingHud) {
          const textEl = document.getElementById('exit-sitting-hud-text');
          if (textEl) textEl.textContent = '☀️ 您正在享受日光浴中';
          exitSittingHud.style.display = 'flex';
        }
        this.hidePrompt();
      }
      return;
    }

    if (zone.id.startsWith('farm_plot_')) {
      const idx = parseInt(zone.id.replace('farm_plot_', ''));
      if (this.app && typeof this.app.triggerPlotInteraction === 'function') {
        this.app.triggerPlotInteraction(idx);
      }
      this.hidePrompt();
      return;
    }

    if (zone.id === 'pk_crystal') {
      this.modalManager.openModal('pk');
      this.hidePrompt();
      return;
    }

    if (zone.id === 'house_easel') {
      this.modalManager.openModal('easel');
      this.hidePrompt();
      return;
    }

    if (zone.id === 'house_wardrobe' || zone.id === 'wardrobe') {
      // 记录关闭换衣间时需要恢复的相机位置
      this.cameraSavedState = {
        distance: this.player.cameraDistance,
        angleH: this.player.cameraAngleH,
        angleV: this.player.cameraAngleV,
        rotationY: this.player.group.rotation.y,
        controlsLocked: this.player.controlsLocked
      };
      this.isTransitioningCamera = true;
      this.player.controlsLocked = true;
      
      // 相机推进至角色正前方近距离
      this.player.cameraDistance = 2.4;
      this.player.cameraAngleH = 0; 
      this.player.cameraAngleV = 0.08; 
      this.player.group.rotation.y = 0; 

      setTimeout(() => {
        this.modalManager.openModal('wardrobe');
        this.hidePrompt();
      }, 450);
      return;
    }

    if (this.player.controlsLocked) return;

    // 记录日常弹窗关闭时需要恢复的相机设置
    this.cameraSavedState = {
      distance: this.player.cameraDistance,
      angleH: this.player.cameraAngleH,
      angleV: this.player.cameraAngleV
    };

    this.isTransitioningCamera = true;
    
    // 针对特定三维物体，动态缩放聚焦相机视角以实现沉浸感
    if (zone.id === 'arcade') {
      this.player.cameraDistance = 2.4;
      this.player.cameraAngleH = 0; // 朝向正北
      this.player.cameraAngleV = 0.15;
    } else if (zone.id === 'skills') {
      this.player.cameraDistance = 9.5;
      this.player.cameraAngleV = 0.5;
    } else if (zone.id === 'projects') {
      this.player.cameraDistance = 7.0;
      this.player.cameraAngleH = -Math.PI / 2; // 朝向正东
      this.player.cameraAngleV = 0.25;
    }

    // 延迟打开弹窗让相机滑行过渡完毕
    setTimeout(() => {
      this.modalManager.openModal(zone.id);
      this.hidePrompt();
    }, 450);
  }
}
