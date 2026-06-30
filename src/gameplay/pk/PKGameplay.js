import * as BABYLON from '@babylonjs/core';
import { convertColor, projectToScreen } from '../../rendering/helpers.js';
import { createSword3D, createHammer3D, createBomb3D } from '../../world/PKArena.js';
import { WEAPON_DEFS, OPPONENT_ATTACK, BOMB_DEF, EXPLOSION_DEF } from '../../data/weaponDefs.js';

/**
 * PK 战斗玩法（Task 6.2）。
 *
 * 拥有 PK 战斗状态、对手 AI、武器拾取、攻击、炸弹、爆炸、伤害气泡、HP UI hook
 * 与战斗结算，从 `main.js` 抽取而来。武器/炸弹/爆炸/对手的实体边界见
 * entities/boundaries.js（Weapon / Bomb / Explosion / NPC）。
 *
 * 共享运行时战斗状态仍挂在 app 上，以保持与移动端攻击键、Interacts 与
 * modal 行为的现有交互不变。
 */
export class PKGameplay {
  constructor(app) {
    this.app = app;
  }

  // ==================== 事件绑定 ====================
  initPKUI() {
    const app = this.app;
    const matchBtn = document.getElementById('btn-pk-match');
    if (matchBtn) {
      matchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerPKMatching();
      });
    }

    const cancelMatchBtn = document.getElementById('btn-cancel-match');
    if (cancelMatchBtn) {
      cancelMatchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelPKMatching();
      });
    }

    const createRoomBtn = document.getElementById('btn-create-room');
    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        app.modalMgr.closeAllModals();
        this.triggerPKMatching();
      });
    }

    const attackBtn = document.getElementById('btn-pk-attack');
    if (attackBtn) {
      attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playerPerformAttack();
      }, { passive: false });
      attackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playerPerformAttack();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'j') {
        this.playerPerformAttack();
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && app.isPKActive) {
        const tagName = e.target.tagName.toLowerCase();
        if (
          tagName === 'button' ||
          tagName === 'a' ||
          e.target.closest('.sidebar-container') ||
          e.target.closest('.modal-card') ||
          e.target.closest('.pk-hud') ||
          e.target.closest('.action-buttons')
        ) {
          return;
        }
        this.playerPerformAttack();
      }
    });
  }

  // ==================== 每帧 ====================
  updatePKHallAnimations(delta, time) {
    const app = this.app;
    if (app.currentMap !== 'pk_arena') return;

    if (!app.isPKActive) {
      if (app.pkCrystalMesh) app.pkCrystalMesh.setEnabled(true);

      if (app.player && app.player.position.y < -3.5) {
        app.player.position.set(0, 0.6 + 0.1, -6.0);
        app.player.velocity.set(0, 0, 0);
        app.player.group.position.copyFrom(app.player.position);
        app.showStuckToast('小心！不要跌落入云海深渊哦 ☁️');
      }
    }
  }

  updatePKBattleFrame(delta) {
    const app = this.app;
    this.updateActiveBombs(delta);
    this.updateExplosionEffects(delta);

    if (!app.isPKActive || !app.opponent3D) return;

    if (app.player.position.y < -3.5) {
      this.endPKBattle(false);
      return;
    }
    if (app.opponent3D.position.y < -3.5) {
      this.endPKBattle(true);
      return;
    }

    const opp = app.opponent3D;
    const playerPos = app.player.position;

    if (!app.opponentIsGrounded) {
      app.opponentVelocity.y -= 9.8 * delta;
    }

    opp.position.addInPlace(app.opponentVelocity.scale(delta));

    app.opponentVelocity.x *= 0.88;
    app.opponentVelocity.z *= 0.88;

    if (opp.position.y <= 0.6) {
      const distToCenter = Math.sqrt(opp.position.x * opp.position.x + opp.position.z * opp.position.z);
      if (distToCenter < 8.0) {
        opp.position.y = 0.6;
        app.opponentVelocity.y = 0;
        app.opponentIsGrounded = true;
      } else {
        app.opponentIsGrounded = false;
      }
    } else {
      app.opponentIsGrounded = false;
    }

    if (app.opponentIsGrounded && app.playerHP > 0) {
      const dist = BABYLON.Vector3.Distance(opp.position, playerPos);

      const dx = playerPos.x - opp.position.x;
      const dz = playerPos.z - opp.position.z;
      const angle = Math.atan2(dx, dz);
      opp.rotation.y = angle;

      if (dist > 1.8) {
        const moveSpeed = 2.4;
        opp.translate(BABYLON.Axis.Z, moveSpeed * delta, BABYLON.Space.LOCAL);
      } else {
        if (Math.random() < 0.018) {
          this.opponentPerformAttack();
        }
      }
    }

    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      if (app.playerEquippedWeapon) {
        debugEl.style.display = 'none';
      } else {
        debugEl.style.display = 'block';
        debugEl.innerHTML = `<span style="font-weight: bold; color: #ffeb3b; animation: settleBlink 1.2s infinite;">⚠️ 尚未装备武器！请走向擂台周边的武器架拾取武器 ⚔️</span>`;
      }
    }

    const pPos = app.player.position;
    const rackConfigs = [
      { x: -7.5, z: 0, weapon: 'sword' },
      { x: 7.5, z: 0, weapon: 'hammer' },
      { x: 0, z: 6.8, weapon: 'bomb' }
    ];

    rackConfigs.forEach((cfg) => {
      const dist = BABYLON.Vector3.Distance(pPos, new BABYLON.Vector3(cfg.x, 0.6, cfg.z));
      if (dist < 1.6 && app.playerEquippedWeapon !== cfg.weapon) {
        const chosen = cfg.weapon;
        app.playerEquippedWeapon = chosen;

        const atkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
        if (atkBtn) {
          atkBtn.style.display = 'flex';
          const weaponSVGMap = {
            sword: `
<svg style="display: flex;" class="lucide lucide-swords" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
  <line x1="13" x2="19" y1="19" y2="13" />
  <line x1="16" x2="20" y1="16" y2="20" />
  <line x1="19" x2="21" y1="21" y2="19" />
  <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
  <line x1="5" x2="9" y1="14" y2="18" />
  <line x1="7" x2="4" y1="17" y2="20" />
  <line x1="3" x2="5" y1="19" y2="21" />
</svg>`,
            hammer: `
<svg style="display: flex;" class="lucide lucide-hammer" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m15 5 4 4" />
  <path d="M21.5 12H16c-.5 0-1-.5-1-1V4.5L9 9.5c-.5.5-.5 1.5 0 2l11 11c.5.5 1.5.5 2 0z" />
  <path d="m2.1 21.9 10.3-10.3" />
</svg>`,
            bomb: `
<svg style="display: flex;" class="lucide lucide-bomb" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="13" r="9" />
  <path d="m19.5 4.5-3.5 3.5" />
  <path d="m21 3-2.5 2.5" />
  <path d="M19 8.5c.5-.5 1-1.5.5-2.5-.5-.5-1.5 0-2 .5" />
</svg>`
          };
          atkBtn.innerHTML = weaponSVGMap[chosen] || weaponSVGMap['sword'];
        }

        if (app.playerWeapon3D) {
          app.playerWeapon3D.dispose();
        }

        let weaponModel;
        if (chosen === 'sword') weaponModel = createSword3D(app.scene);
        else if (chosen === 'hammer') weaponModel = createHammer3D(app.scene);
        else weaponModel = createBomb3D(app.scene);

        weaponModel.position.set(0.32, 0.8, 0.1);
        weaponModel.rotation.x = Math.PI / 2;
        weaponModel.parent = app.player.group;
        app.playerWeapon3D = weaponModel;

        app.playCustomSound(600, 0.15, 'sine', 0.1);

        const weaponChinese = { sword: '长剑 ⚔️', hammer: '大锤 🔨', bomb: '炸弹 💣' };
        app.showStuckToast(`已装备武器：${weaponChinese[chosen]}！`);
      }
    });
  }

  opponentPerformAttack() {
    const app = this.app;
    if (app.opponentHP <= 0 || app.playerHP <= 0) return;

    if (app.opponentWeapon3D) {
      app.opponentWeapon3D.rotation.z = -Math.PI / 2;
      setTimeout(() => {
        if (app.opponentWeapon3D) app.opponentWeapon3D.rotation.z = 0;
      }, 150);
    }

    app.playCustomSound(220, 0.1, 'sawtooth', 0.1);

    const dist = BABYLON.Vector3.Distance(app.opponent3D.position, app.player.position);
    if (dist <= 2.2) {
      const dmg = OPPONENT_ATTACK.damage;
      app.playerHP = Math.max(0, app.playerHP - dmg);
      this.updatePKHPUI();

      this.showScreenFlash();
      this.playDamageBubble(app.player.position, dmg, true);

      const direction = app.player.position.subtract(app.opponent3D.position);
      direction.y = 0;
      direction.normalize();
      direction.y = OPPONENT_ATTACK.knockbackUp;

      app.player.velocity.addInPlace(direction.scale(OPPONENT_ATTACK.knockbackForce));
      app.playCustomSound(100, 0.2, 'sine', 0.15);

      if (app.playerHP <= 0) {
        this.endPKBattle(false);
      }
    }
  }

  playerPerformAttack() {
    const app = this.app;
    if (!app.isPKActive || app.playerHP <= 0 || app.opponentHP <= 0) return;

    if (app.playerWeapon3D && app.playerEquippedWeapon !== 'bomb') {
      app.playerWeapon3D.rotation.z = -Math.PI / 2;
      setTimeout(() => {
        if (app.playerWeapon3D) app.playerWeapon3D.rotation.z = 0;
      }, 120);
    }

    if (app.playerEquippedWeapon === 'bomb') {
      if (app.bombCooldownActive) return;
      app.bombCooldownActive = true;
      setTimeout(() => { app.bombCooldownActive = false; }, 850);

      this.throwBombPhysics();
      return;
    }

    app.playCustomSound(380, 0.08, 'triangle', 0.05);

    const dist = BABYLON.Vector3.Distance(app.player.position, app.opponent3D.position);
    if (dist <= 2.4) {
      const isHammer = app.playerEquippedWeapon === 'hammer';
      const weapon = isHammer ? WEAPON_DEFS.hammer : WEAPON_DEFS.sword;
      const dmg = weapon.damage;
      app.opponentHP = Math.max(0, app.opponentHP - dmg);
      this.updatePKHPUI();

      this.playDamageBubble(app.opponent3D.position, dmg, false);

      app.opponent3D.getChildMeshes().forEach((child) => {
        if (child.material) {
          if (!child.metadata) child.metadata = {};
          if (child.metadata.origColor === undefined) {
            child.metadata.origColor = child.material.diffuseColor.clone();
          }
          child.material.diffuseColor = BABYLON.Color3.FromHexString('#ff3333');
        }
      });
      setTimeout(() => {
        if (app.opponent3D) {
          app.opponent3D.getChildMeshes().forEach((child) => {
            if (child.material && child.metadata && child.metadata.origColor) {
              child.material.diffuseColor = child.metadata.origColor;
            }
          });
        }
      }, 150);

      const direction = app.opponent3D.position.subtract(app.player.position);
      direction.y = 0;
      direction.normalize();
      direction.y = weapon.knockbackUp;

      const pushForce = weapon.knockbackForce;
      app.opponentVelocity.addInPlace(direction.scale(pushForce));
      app.opponentIsGrounded = false;

      app.playCustomSound(180, 0.15, 'sine', 0.1);

      if (app.opponentHP <= 0) {
        this.endPKBattle(true);
      }
    }
  }

  throwBombPhysics() {
    const app = this.app;
    app.playCustomSound(280, 0.1, 'sine', 0.06);

    const bombMesh = createBomb3D(app.scene);

    const forward = app.player.group.forward;
    const spawnPos = app.player.position.clone();
    spawnPos.y += 0.8;
    spawnPos.addInPlace(forward.scale(0.5));

    bombMesh.position.copyFrom(spawnPos);

    const speed = BOMB_DEF.throwSpeed;
    const bombVel = forward.scale(speed);
    bombVel.y = BOMB_DEF.throwUp;

    const bombObj = {
      mesh: bombMesh,
      position: spawnPos,
      velocity: bombVel,
      timeElapsed: 0,
      maxLifetime: BOMB_DEF.maxLifetime
    };

    if (!app.activeBombs) app.activeBombs = [];
    app.activeBombs.push(bombObj);
  }

  updateActiveBombs(delta) {
    const app = this.app;
    if (!app.activeBombs || app.activeBombs.length === 0) return;

    const gravity = 9.8;
    const platformY = 0.6;

    for (let i = app.activeBombs.length - 1; i >= 0; i--) {
      const bomb = app.activeBombs[i];
      bomb.timeElapsed += delta;

      bomb.velocity.y -= gravity * delta;
      bomb.position.addInPlace(bomb.velocity.scale(delta));
      bomb.mesh.position.copyFrom(bomb.position);

      bomb.mesh.rotation.x += 0.05;
      bomb.mesh.rotation.y += 0.05;

      let triggerExplode = false;

      if (bomb.position.y <= platformY) {
        const distToCenter = Math.sqrt(bomb.position.x * bomb.position.x + bomb.position.z * bomb.position.z);
        if (distToCenter < 8.0) {
          bomb.position.y = platformY;
          triggerExplode = true;
        }
      }

      if (app.opponent3D && !triggerExplode) {
        const oppPos = app.opponent3D.position;
        const distToOpp = BABYLON.Vector3.Distance(bomb.position, oppPos);
        if (distToOpp < 0.8) {
          triggerExplode = true;
        }
      }

      if (bomb.timeElapsed >= bomb.maxLifetime) {
        triggerExplode = true;
      }

      if (triggerExplode) {
        this.explodeBomb(bomb.position);
        bomb.mesh.dispose();
        app.activeBombs.splice(i, 1);
      }
    }
  }

  explodeBomb(position) {
    const app = this.app;
    app.playCustomSound(180, 0.35, 'sawtooth', 0.25);
    setTimeout(() => {
      app.playCustomSound(60, 0.2, 'sine', 0.3);
    }, 50);

    this.createExplosionEffects(position);

    if (app.opponent3D && app.isPKActive) {
      const oppPos = app.opponent3D.position;
      const distance = BABYLON.Vector3.Distance(position, oppPos);
      const explosionRadius = EXPLOSION_DEF.radius;

      if (distance <= explosionRadius) {
        const dmg = EXPLOSION_DEF.damage;

        const knockbackDir = oppPos.subtract(position);
        knockbackDir.y = 0;
        knockbackDir.normalize();

        const knockbackForce = EXPLOSION_DEF.knockbackForce;
        app.opponentVelocity.addInPlace(knockbackDir.scale(knockbackForce));
        app.opponentVelocity.y = EXPLOSION_DEF.knockbackUp;
        app.opponentIsGrounded = false;

        app.opponentHP = Math.max(0, app.opponentHP - dmg);
        this.updatePKHPUI();

        this.playDamageBubble(oppPos, dmg, false);

        app.opponent3D.getChildMeshes().forEach((child) => {
          if (child.material) {
            if (!child.metadata) child.metadata = {};
            if (child.metadata.origColor === undefined) {
              child.metadata.origColor = child.material.diffuseColor.clone();
            }
            child.material.diffuseColor = BABYLON.Color3.FromHexString('#ff3333');
          }
        });
        setTimeout(() => {
          if (app.opponent3D) {
            app.opponent3D.getChildMeshes().forEach((child) => {
              if (child.material && child.metadata && child.metadata.origColor) {
                child.material.diffuseColor = child.metadata.origColor;
              }
            });
          }
        }, 150);

        if (app.opponentHP <= 0) {
          this.endPKBattle(true);
        }
      }
    }
  }

  createExplosionEffects(position) {
    const app = this.app;
    const fireBall = BABYLON.MeshBuilder.CreateSphere('fireBall', { diameter: 0.4, segments: 8 }, app.scene);
    fireBall.position.copyFrom(position);

    const sphereMat = new BABYLON.StandardMaterial('fireBallMat', app.scene);
    sphereMat.diffuseColor = convertColor(0xffa726);
    sphereMat.emissiveColor = convertColor(0xffa726);
    sphereMat.alpha = 0.9;
    sphereMat.disableLighting = true;
    fireBall.material = sphereMat;

    const ballObj = {
      mesh: fireBall,
      type: 'ball',
      scaleSpeed: 9.0,
      opacitySpeed: 2.2,
      scale: 1.0,
      opacity: 0.9
    };

    if (!app.activeExplosions) app.activeExplosions = [];
    app.activeExplosions.push(ballObj);

    const particleCount = 12;
    const particleColors = [0xff3d00, 0xffc107, 0x757575];

    for (let i = 0; i < particleCount; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const partMat = new BABYLON.StandardMaterial('partMat_' + i, app.scene);
      partMat.diffuseColor = convertColor(color);
      partMat.alpha = 0.9;
      partMat.flatShading = true;
      partMat.specularColor = new BABYLON.Color3(0, 0, 0);

      const particle = BABYLON.MeshBuilder.CreateBox('expPart', { size: 0.08 }, app.scene);
      particle.position.copyFrom(position);
      particle.material = partMat;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      const velocity = new BABYLON.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      const partObj = {
        mesh: particle,
        type: 'particle',
        velocity: velocity,
        opacity: 0.9,
        rotationSpeed: new BABYLON.Vector3(
          Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10
        )
      };
      app.activeExplosions.push(partObj);
    }
  }

  updateExplosionEffects(delta) {
    const app = this.app;
    if (!app.activeExplosions || app.activeExplosions.length === 0) return;

    const gravity = 9.8;

    for (let i = app.activeExplosions.length - 1; i >= 0; i--) {
      const exp = app.activeExplosions[i];

      if (exp.type === 'ball') {
        exp.scale += exp.scaleSpeed * delta;
        exp.opacity -= exp.opacitySpeed * delta;

        exp.mesh.scaling.set(exp.scale, exp.scale, exp.scale);
        if (exp.mesh.material) {
          exp.mesh.material.alpha = Math.max(0, exp.opacity);
        }

        if (exp.opacity <= 0) {
          exp.mesh.dispose();
          app.activeExplosions.splice(i, 1);
        }
      } else if (exp.type === 'particle') {
        exp.velocity.y -= gravity * delta;
        exp.mesh.position.addInPlace(exp.velocity.scale(delta));

        exp.mesh.rotation.x += exp.rotationSpeed.x * delta;
        exp.mesh.rotation.y += exp.rotationSpeed.y * delta;
        exp.mesh.rotation.z += exp.rotationSpeed.z * delta;

        exp.opacity -= 1.8 * delta;
        if (exp.mesh.material) {
          exp.mesh.material.alpha = Math.max(0, exp.opacity);
        }

        if (exp.opacity <= 0) {
          exp.mesh.dispose();
          app.activeExplosions.splice(i, 1);
        }
      }
    }
  }

  showScreenFlash() {
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.classList.add('fade');
      setTimeout(() => flash.remove(), 250);
    }, 50);
  }

  triggerPKMatching() {
    const app = this.app;
    const card = document.getElementById('pk-matching-card');
    if (card) card.style.display = 'flex';

    app.matchingTimer = setTimeout(() => {
      if (card) card.style.display = 'none';
      app.modalMgr.closeAllModals();
      this.startPKBattle(true);
    }, 2800);
  }

  cancelPKMatching() {
    const app = this.app;
    if (app.matchingTimer) {
      clearTimeout(app.matchingTimer);
    }
    const card = document.getElementById('pk-matching-card');
    if (card) card.style.display = 'none';
  }

  startPKBattle(isRobot = true) {
    const app = this.app;
    app.isPKActive = true;
    app.playerHP = 100;
    app.opponentHP = 100;
    app.playerEquippedWeapon = null;
    this.updatePKHPUI();

    const hud = document.getElementById('pk-hud-panel');
    if (hud) hud.style.display = 'flex';

    if (app.playerWeapon3D) {
      app.playerWeapon3D.dispose();
      app.playerWeapon3D = null;
    }
    app.activeBombs = [];
    app.activeExplosions = [];
    app.bombCooldownActive = false;

    const parentAtkBtn = document.getElementById('btn-pk-attack') || (window.parent && window.parent.document.getElementById('btn-pk-attack'));
    if (parentAtkBtn) parentAtkBtn.style.display = 'none';

    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) {
      debugEl.style.display = 'block';
      debugEl.textContent = '准备战斗，请先走向擂台周边的武器架拾取武器...';
    }

    if (isRobot) {
      if (app.opponent3D) {
        app.opponent3D.dispose();
        app.opponent3D = null;
      }
      const robotGroup = new BABYLON.TransformNode('robotOpponent', app.scene);

      const head = BABYLON.MeshBuilder.CreateBox('robotHead', { size: 0.4 }, app.scene);
      head.position.y = 1.35;
      head.parent = robotGroup;
      head.material = app.createFlatMaterial('robotHeadMat', 0xe74c3c);

      const body = BABYLON.MeshBuilder.CreateBox('robotBody', { width: 0.5, height: 0.7, depth: 0.3 }, app.scene);
      body.position.y = 0.8;
      body.parent = robotGroup;
      body.material = app.createFlatMaterial('robotBodyMat', 0x2c3e50);

      const legL = BABYLON.MeshBuilder.CreateCylinder('robotLegL', { diameterTop: 0.16, diameterBottom: 0.16, height: 0.45, tessellation: 8 }, app.scene);
      legL.position.set(-0.16, 0.225, 0);
      legL.parent = robotGroup;
      legL.material = app.createFlatMaterial('robotLegMat', 0x34495e);

      const legR = legL.clone('robotLegR');
      legR.position.x = 0.16;
      legR.parent = robotGroup;

      robotGroup.position.set(5.5, 0.6, 0);
      app.opponent3D = robotGroup;
      app.opponentVelocity = new BABYLON.Vector3(0, 0, 0);
      app.opponentIsGrounded = true;
      app.opponentEquippedWeapon = 'sword';

      const sword = createSword3D(app.scene);
      sword.position.set(0.35, 0.8, 0.1);
      sword.rotation.x = Math.PI / 2;
      sword.parent = app.opponent3D;
      app.opponentWeapon3D = sword;

      if (app.pkCrystalMesh) app.pkCrystalMesh.setEnabled(false);
    }
  }

  updatePKHPUI() {
    const app = this.app;
    const p1Hp = document.getElementById('pk-hud-p1-hp');
    const p2Hp = document.getElementById('pk-hud-p2-hp');
    const p1Txt = document.getElementById('pk-hud-p1-hp-text');
    const p2Txt = document.getElementById('pk-hud-p2-hp-text');

    if (p1Hp) p1Hp.style.width = `${app.playerHP}%`;
    if (p2Hp) p2Hp.style.width = `${app.opponentHP}%`;

    if (p1Txt) p1Txt.textContent = `${app.playerHP} / 100`;
    if (p2Txt) p2Txt.textContent = `${app.opponentHP} / 100`;
  }

  playDamageBubble(position, dmg, isPlayer = false) {
    const app = this.app;
    const bubble = document.createElement('div');
    bubble.className = 'damage-bubble';
    if (isPlayer) {
      bubble.style.color = '#ff1744';
      bubble.textContent = `-${dmg} HP`;
    } else {
      bubble.style.color = '#ffeb3b';
      bubble.textContent = `-${dmg}`;
    }
    document.body.appendChild(bubble);

    const updatePos = () => {
      if (!app.camera || !bubble.parentElement) return;
      const worldPos = position.add(new BABYLON.Vector3(0, isPlayer ? 1.0 : 1.3, 0));

      const screenPos = projectToScreen(app.scene, app.camera, worldPos);

      bubble.style.left = `${screenPos.x}px`;
      bubble.style.top = `${screenPos.y}px`;
    };

    updatePos();
    const posTimer = setInterval(updatePos, 16);

    setTimeout(() => {
      clearInterval(posTimer);
      bubble.remove();
    }, 1200);
  }

  endPKBattle(isWin) {
    const app = this.app;
    app.isPKActive = false;

    if (app.playerWeapon3D) {
      app.playerWeapon3D.dispose();
      app.playerWeapon3D = null;
    }
    if (app.opponent3D) {
      app.opponent3D.dispose();
      app.opponent3D = null;
    }

    const hud = document.getElementById('pk-hud-panel');
    if (hud) hud.style.display = 'none';

    const debugEl = document.getElementById('pk-debug-info');
    if (debugEl) debugEl.style.display = 'none';

    const settle = document.getElementById('pk-settlement-card');
    const title = document.getElementById('pk-settle-title');
    const desc = document.getElementById('pk-settle-desc');
    const closeBtn = document.getElementById('btn-pk-settle-close');

    if (settle) {
      settle.style.display = 'flex';
      if (isWin) {
        title.textContent = '🎉 挑战胜利！';
        title.style.color = '#ffeb3b';
        desc.textContent = '您完美地击败了对手！奖励金币: 🪙 50';
        app.updateCoins(50);
      } else {
        title.textContent = '💀 挑战失败';
        title.style.color = '#ff1744';
        desc.textContent = '遗憾落败，差一点就能击败他了。奖励安慰金: 🪙 10';
        app.updateCoins(10);
      }
    }

    if (closeBtn) {
      const handleClose = () => {
        if (settle) settle.style.display = 'none';
        app.modalMgr.closeAllModals();
        closeBtn.removeEventListener('click', handleClose);
      };
      closeBtn.addEventListener('click', handleClose);
    }
  }
}
