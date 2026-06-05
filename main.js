import * as THREE from 'three';
import { siteConfig } from '../site-config.js';
import { ModalManager } from './src/ui/Modal.js';
import { Environment } from './src/world/Environment.js';
import { IslandGenerator } from './src/world/Island.js';
import { HouseGenerator } from './src/world/House.js';
import { Player } from './src/world/Player.js';
import { InteractsManager } from './src/world/Interacts.js';
import { BeachBall } from './src/world/BeachBall.js';

class GameApp {
  constructor() {
    // Detect mobile touch capability and add class to body
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    if (isTouchDevice) {
      document.body.classList.add('is-mobile');
    } else {
      const detectTouch = () => {
        document.body.classList.add('is-mobile');
        window.removeEventListener('touchstart', detectTouch);
      };
      window.addEventListener('touchstart', detectTouch);
    }

    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();
    
    // Core game components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.player = null;
    this.environment = null;
    this.islandGen = null;
    this.modalMgr = null;
    this.interactMgr = null;
    this.beachBallsList = [];

    // Load active theme configuration
    const activeThemeKey = siteConfig.activeTheme || 'beach';
    this.themeConfig = siteConfig.themes[activeThemeKey];

    // Audio synthesizer properties
    this.audioCtx = null;
    this.isPlayingMusic = false;
    this.synthInterval = null;

    this.initEngine();
    this.initWorld();
    this.initMobileJoystick();
    this.initAudioSynth();
    this.animate();
  }

  initEngine() {
    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // Set a matching background color based on theme config
    const skyColor = this.themeConfig.colors.sky || 0xb2ebf2;
    this.scene.background = new THREE.Color(skyColor);

    // 2. Create Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    // 3. Create WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.35) : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 4. Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    this.currentMap = 'island';

    // Instantiate managers with theme config injection
    this.modalMgr = new ModalManager();
    this.environment = new Environment(this.scene, this.themeConfig);
    this.islandGen = new IslandGenerator(this.scene, this.themeConfig);
    
    // Instantiate house generator
    this.houseGen = new HouseGenerator(this.scene, this.themeConfig);
    this.houseGen.group.visible = false; // Start with island map visible

    // Player controller (requires colliders list for physics and themeConfig for styling)
    this.player = new Player(this.scene, this.camera, this.islandGen.colliders, this.themeConfig);
    this.player.app = this; // Share app reference
    
    // Interaction prompt sensor
    this.interactMgr = new InteractsManager(this.player, this.islandGen, this.modalMgr, this);

    const isChristmas = siteConfig.activeTheme === 'christmas';

    // Listen to spawn-ball events from interactions
    window.addEventListener('spawn-ball', (e) => {
      const spawnX = e.detail.x;
      const spawnZ = e.detail.z + 0.6; // Spawn slightly in front of vendor
      
      // Color choices: Snowball white variants for Christmas vs bright beach ball colors
      const colors = isChristmas ? [0xffffff, 0xe0f7fa, 0xf5fafd] : [0xff5252, 0x40c4ff, 0xffeb3b, 0xff8a80, 0x00e676];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const ball = new BeachBall(this.scene, spawnX, 1.3, spawnZ, color);
      ball.app = this;
      this.beachBallsList.push(ball);

      // Keep at most 5 balls on screen (FIFO, excluding carried ones)
      if (this.beachBallsList.length > 5) {
        let oldestIndex = -1;
        for (let i = 0; i < this.beachBallsList.length; i++) {
          if (!this.beachBallsList[i].isCarried) {
            oldestIndex = i;
            break;
          }
        }
        if (oldestIndex !== -1) {
          const oldBall = this.beachBallsList.splice(oldestIndex, 1)[0];
          oldBall.destroy();
        }
      }

      // Play cute bubble pop / snowball sound
      if (this.isPlayingMusic && this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        
        // Slightly lower frequency puff for snowball generation
        const startFreq = isChristmas ? 240 : 320;
        const endFreq = isChristmas ? 420 : 580;

        osc.frequency.setValueAtTime(startFreq, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.12);
      }
    });

    // Listen to kick-sound events
    window.addEventListener('kick-sound', (e) => {
      if (this.isPlayingMusic && this.audioCtx) {
        const freq = e.detail.freq;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = isChristmas ? 'sine' : 'triangle'; // triangle pop for beach ball, soft sine muff for snowball
        
        // Lower sound frequency for snowball hits
        const finalFreq = isChristmas ? freq * 0.6 : freq;

        osc.frequency.setValueAtTime(finalFreq, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.audioCtx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.16);
      }
    });

    // Wardrobe Outfit selection listeners
    const setupWardrobeSection = (sectionId, type) => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      
      const buttons = section.querySelectorAll('.color-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          section.querySelector('.color-btn.active')?.classList.remove('active');
          btn.classList.add('active');
          const color = btn.getAttribute('data-color');
          if (this.player) {
            this.player.updateOutfit(type, color);
          }
        });
      });
    };

    setupWardrobeSection('wardrobe-hair', 'hair');
    setupWardrobeSection('wardrobe-clothes', 'clothing');
    setupWardrobeSection('wardrobe-hat', 'hat');

    // Model selection listeners
    const modelBtns = document.querySelectorAll('.model-btn');
    modelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.model-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        const modelType = btn.getAttribute('data-model');
        if (this.player) {
          this.player.updateModel(modelType);
          
          // Dynamically change title descriptions for model specific colors
          const hairTitle = document.getElementById('wardrobe-hair-title');
          const clothingTitle = document.getElementById('wardrobe-clothing-title');
          const hatTitle = document.getElementById('wardrobe-hat-title');
          
          if (modelType === 'kitty') {
            if (hairTitle) hairTitle.textContent = '毛皮颜色 (Fur Color)';
            if (clothingTitle) clothingTitle.textContent = '小猫背心 (Vest Color)';
            if (hatTitle) hatTitle.textContent = '金铃铛颜色 (Bell Color)';
          } else {
            if (hairTitle) hairTitle.textContent = '发发 / 毛毛';
            if (clothingTitle) clothingTitle.textContent = '服装颜色';
            if (hatTitle) hatTitle.textContent = '配饰 / 铃铛颜色';
          }

          // Trigger a sound effect
          if (this.isPlayingMusic && this.audioCtx) {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(360, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(720, this.audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.15);
          }
        }
      });
    });

    // Day/Night toggle listener
    const btnToggleTime = document.getElementById('btn-toggle-time');
    if (btnToggleTime) {
      btnToggleTime.addEventListener('click', () => {
        if (this.environment) {
          this.environment.isNight = !this.environment.isNight;
          
          // Play soft chime sound
          if (this.isPlayingMusic && this.audioCtx) {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(this.environment.isNight ? 220 : 440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.4);
          }
        }
      });
    }

    // Bed dismount stand-up listener
    const btnStandUp = document.getElementById('btn-stand-up');
    if (btnStandUp) {
      btnStandUp.addEventListener('click', () => {
        if (this.player && this.player.isLyingDown) {
          this.player.standUp();
        }
      });
    }
  }

  initMobileJoystick() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickWrapper = document.querySelector('.joystick-wrapper');
    if (!joystickZone || !joystickWrapper) return;

    // Create the joystick handle dynamically
    const joystickHandle = document.createElement('div');
    joystickHandle.classList.add('joystick-handle');
    joystickWrapper.appendChild(joystickHandle);

    let isTouching = false;
    let joystickTouchId = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 40; // Max drag distance

    const handleTouchStart = (e) => {
      if (this.player.controlsLocked) return;
      
      // Find the touch that landed on the left side of the screen
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const isLeftHalf = touch.clientX < window.innerWidth * 0.45;
        
        const targetEl = touch.target && touch.target.closest ? touch.target : null;
        const isUI = targetEl ? (
                     targetEl.closest('.hud-header') || 
                     targetEl.closest('.modal-overlay') || 
                     targetEl.closest('.modal-card') || 
                     targetEl.closest('.action-buttons') || 
                     targetEl.id === 'audio-btn' ||
                     targetEl.id === 'btn-back-2d'
                    ) : false;
                     
        if (isLeftHalf && !isUI && joystickTouchId === null) {
          isTouching = true;
          joystickTouchId = touch.identifier;
          
          joystickWrapper.style.left = `${touch.clientX - 55}px`;
          joystickWrapper.style.top = `${touch.clientY - 55}px`;
          joystickWrapper.style.bottom = 'auto'; 
          joystickWrapper.style.opacity = '0.9'; 
          
          startX = touch.clientX;
          startY = touch.clientY;
          break;
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!isTouching || this.player.controlsLocked || joystickTouchId === null) return;
      
      let joystickTouch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === joystickTouchId) {
          joystickTouch = e.touches[i];
          break;
        }
      }
      
      if (!joystickTouch) return;
      e.preventDefault();
      
      const deltaX = joystickTouch.clientX - startX;
      const deltaY = joystickTouch.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      const angle = Math.atan2(deltaY, deltaX);
      const clampedDist = Math.min(distance, maxRadius);
      
      const moveX = Math.cos(angle) * clampedDist;
      const moveY = Math.sin(angle) * clampedDist;

      joystickHandle.style.transform = `translate(${moveX}px, ${moveY}px)`;

      const threshold = 12;
      this.player.keys.d = deltaX > threshold;
      this.player.keys.a = deltaX < -threshold;
      this.player.keys.s = deltaY > threshold;
      this.player.keys.w = deltaY < -threshold;
    };

    const handleTouchEnd = (e) => {
      if (!isTouching || joystickTouchId === null) return;
      
      let ended = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          ended = true;
          break;
        }
      }
      
      if (ended) {
        isTouching = false;
        joystickTouchId = null;
        joystickHandle.style.transform = 'translate(0, 0)';
        
        joystickWrapper.style.left = '';
        joystickWrapper.style.bottom = '';
        joystickWrapper.style.top = '';
        joystickWrapper.style.opacity = '';
        
        this.player.keys.w = false;
        this.player.keys.s = false;
        this.player.keys.a = false;
        this.player.keys.d = false;
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }

  initAudioSynth() {
    const audioBtn = document.getElementById('audio-btn');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.isPlayingMusic) {
        this.isPlayingMusic = false;
        audioBtn.querySelector('.audio-icon').textContent = '🔈';
        if (this.synthInterval) {
          clearInterval(this.synthInterval);
          this.synthInterval = null;
        }
      } else {
        this.isPlayingMusic = true;
        audioBtn.querySelector('.audio-icon').textContent = '🔊';
        this.audioCtx.resume();
        this.playMelodyLoop();
      }
    });
  }

  playMelodyLoop() {
    const isChristmas = siteConfig.activeTheme === 'christmas';
    
    // Cozy Pentatonic chord scale arpeggio notes (Frequencies in Hz)
    // C Major Pentatonic cozy sunset chords: C, D, E, G, A
    // (If winter, transposed up slightly for a dreamy chimes feel)
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
      if (!this.isPlayingMusic || !this.audioCtx) return;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    };

    // Every 320ms, play a note from the current arpeggiated chord
    this.synthInterval = setInterval(() => {
      const currentChord = chords[chordIdx];
      const pattern = [0, 2, 1, 3, 2, 4, 3, 1];
      const noteIdx = pattern[step % pattern.length];
      const frequency = currentChord[noteIdx];

      // Play soft arpeggio note (Christmas uses high chimes, summer uses warm sine)
      const noteVol = isChristmas ? 0.05 : 0.08;
      playNote(frequency, 0.9, 'sine', noteVol);

      // Add a higher bell tone randomly for winter ambient chime texture
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

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  switchMap(targetMap) {
    if (this.currentMap === targetMap) return;

    const fadeOverlay = document.getElementById('fade-overlay');
    if (!fadeOverlay) return;

    // Lock player controls during transition
    this.player.controlsLocked = true;
    this.player.resetInputs();

    // 1. Fade to black
    fadeOverlay.classList.add('fade-in');

    setTimeout(() => {
      // 2. Perform map visibility toggle & collider swapping
      this.currentMap = targetMap;

      // Clear any beach balls
      this.beachBallsList.forEach(ball => ball.destroy());
      this.beachBallsList = [];

      if (targetMap === 'house') {
        // Toggle visibility
        this.islandGen.group.visible = false;
        this.houseGen.group.visible = true;

        // Swap colliders & interactables
        this.player.colliders = this.houseGen.colliders;
        this.interactMgr.generator = this.houseGen;

        // Teleport player inside house (spawn position in front of exit door)
        // exit door is at (0, 0.12, 11.2)
        this.player.position.set(0, 0.12 + 0.1, 9.5);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copy(this.player.position);

        // Face north (away from the door)
        this.player.group.rotation.y = Math.PI; // 180 degrees
        this.player.cameraAngleH = Math.PI; // camera looks north

        // Update environment lighting
        this.environment.setIndoorMode(true);
      } else {
        // Toggle visibility
        this.islandGen.group.visible = true;
        this.houseGen.group.visible = false;

        // Swap colliders & interactables
        this.player.colliders = this.islandGen.colliders;
        this.interactMgr.generator = this.islandGen;

        // Teleport player in front of cottage door
        // Cottage door is at (-10.0, 0.6, -9.0 + 1.9 = -7.1)
        this.player.position.set(-10.0, 0.6 + 0.1, -5.2);
        this.player.velocity.set(0, 0, 0);
        this.player.group.position.copy(this.player.position);

        // Face south/southeast (away from the cottage)
        this.player.group.rotation.y = 0;
        this.player.cameraAngleH = 0;

        // Update environment lighting
        this.environment.setIndoorMode(false);
      }

      // 3. Fade out
      setTimeout(() => {
        fadeOverlay.classList.remove('fade-in');
        this.player.controlsLocked = false;
      }, 300);

    }, 450); // wait for fade to black (matches CSS opacity transition)
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1); 
    const time = this.clock.getElapsedTime() * 1000;

    // Update game components
    if (this.player) this.player.update(delta, time);
    if (this.environment) this.environment.update(time);
    if (this.islandGen) this.islandGen.update(time, this.environment);
    if (this.interactMgr) this.interactMgr.update();

    // Update beach/snow balls
    if (this.beachBallsList && this.player) {
      this.beachBallsList.forEach((ball) => ball.update(delta, this.player));
    }

    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Start application
new GameApp();
