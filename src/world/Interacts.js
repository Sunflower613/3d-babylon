import * as THREE from 'three';

export class InteractsManager {
  constructor(player, generator, modalManager, app) {
    this.player = player;
    this.generator = generator;
    this.modalManager = modalManager;
    this.app = app;
    
    this.promptEl = document.getElementById('interact-prompt');
    this.promptTextEl = this.promptEl ? this.promptEl.querySelector('.prompt-text') : null;
    this.mobileInteractBtn = document.getElementById('btn-interact');

    this.activeInteractZone = null;
    this.isTransitioningCamera = false;
    this.cameraSavedState = null;

    this.init();
  }

  init() {
    // Keyboard key listeners
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'e') {
        this.triggerActiveInteraction();
      }
    });

    // Mobile screen button click
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.addEventListener('click', () => {
        this.triggerActiveInteraction();
      });
    }

    // Restore player camera focus state when modal is closed
    window.addEventListener('modal-closed', () => {
      if (this.isTransitioningCamera && this.cameraSavedState) {
        this.isTransitioningCamera = false;
        
        // Reset player orbit parameters
        this.player.cameraDistance = this.cameraSavedState.distance;
        this.player.cameraAngleH = this.cameraSavedState.angleH;
        this.player.cameraAngleV = this.cameraSavedState.angleV;
        
        this.activeInteractZone = null;
      }
    });
  }

  update() {
    // If the player is carrying a ball, they can drop it anywhere!
    if (this.player.carriedBall) {
      this.activeInteractZone = { id: 'drop_ball', name: '放下' };
      this.showPrompt('放下');
      return;
    }

    if (this.player.controlsLocked) return;

    let closestZone = null;
    let minDistance = 999;

    const playerPos = this.player.position;

    // Search for closest trigger zone
    for (const zone of this.generator.interactables) {
      const dx = playerPos.x - zone.x;
      const dy = playerPos.y - zone.y;
      const dz = playerPos.z - zone.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < zone.triggerRadius) {
        if (distance < minDistance) {
          minDistance = distance;
          closestZone = zone;
        }
      }
    }

    // Also search for closest beach ball to pick up
    if (this.app && this.app.beachBallsList) {
      for (const ball of this.app.beachBallsList) {
        if (ball.isCarried) continue;
        const dx = playerPos.x - ball.position.x;
        const dy = playerPos.y - ball.position.y;
        const dz = playerPos.z - ball.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1.6) { // Pick up radius
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

    // Set UI prompt state
    if (closestZone) {
      this.activeInteractZone = closestZone;
      this.showPrompt(closestZone.name);
    } else {
      this.activeInteractZone = null;
      this.hidePrompt();
    }
  }

  showPrompt(name) {
    if (this.promptEl) {
      this.promptEl.classList.add('visible');
    }
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.style.display = 'flex';
    }
  }

  hidePrompt() {
    if (this.promptEl) {
      this.promptEl.classList.remove('visible');
    }
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.style.display = 'none';
    }
  }

  pickUpBall(ball) {
    ball.isCarried = true;
    this.player.carriedBall = ball;
    this.hidePrompt();
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.textContent = '👐';
    }
  }

  dropCarriedBall() {
    const ball = this.player.carriedBall;
    if (!ball) return;

    ball.isCarried = false;
    this.player.carriedBall = null;

    // Toss forward slightly based on player facing direction
    const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.group.quaternion);
    ball.velocity.copy(playerForward).multiplyScalar(5.5); // Toss force
    ball.velocity.y = 2.8; // Hop up slightly on drop
    ball.isGrounded = false;

    this.hidePrompt();
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

    if (this.player.controlsLocked) return;

    // Save camera settings for restoration later
    this.cameraSavedState = {
      distance: this.player.cameraDistance,
      angleH: this.player.cameraAngleH,
      angleV: this.player.cameraAngleV
    };

    this.isTransitioningCamera = true;
    
    // Zoom/focus camera based on the zone type
    if (zone.id === 'arcade') {
      // Focus in closely on the arcade screen
      this.player.cameraDistance = 2.4;
      this.player.cameraAngleH = 0; // Look straight north
      this.player.cameraAngleV = 0.15;
    } else if (zone.id === 'skills') {
      // Zoom out to see the cherry tree
      this.player.cameraDistance = 9.5;
      this.player.cameraAngleV = 0.5;
    } else if (zone.id === 'projects') {
      // Center camera to project screen
      this.player.cameraDistance = 7.0;
      this.player.cameraAngleH = -Math.PI / 2; // Face east
      this.player.cameraAngleV = 0.25;
    }

    // Delay modal open slightly to allow camera glide transition to finish
    setTimeout(() => {
      this.modalManager.openModal(zone.id);
      this.hidePrompt();
    }, 450);
  }
}
