import * as THREE from 'three';

export class InteractsManager {
  constructor(player, generator, modalManager) {
    this.player = player;
    this.generator = generator;
    this.modalManager = modalManager;
    
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

  triggerActiveInteraction() {
    if (!this.activeInteractZone) return;

    const zone = this.activeInteractZone;

    if (zone.id === 'swing') {
      if (this.player.isSitting) {
        this.player.standUp();
      } else {
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
