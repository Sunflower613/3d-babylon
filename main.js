import * as THREE from 'three';
import { siteConfig } from '../site-config.js';
import { ModalManager } from './src/ui/Modal.js';
import { Environment } from './src/world/Environment.js';
import { IslandGenerator } from './src/world/Island.js';
import { Player } from './src/world/Player.js';
import { InteractsManager } from './src/world/Interacts.js';
import { BeachBall } from './src/world/BeachBall.js';

class GameApp {
  constructor() {
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.container.appendChild(this.renderer.domElement);

    // 4. Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    // Instantiate managers with theme config injection
    this.modalMgr = new ModalManager();
    this.environment = new Environment(this.scene, this.themeConfig);
    this.islandGen = new IslandGenerator(this.scene, this.themeConfig);
    
    // Player controller (requires colliders list for physics and themeConfig for styling)
    this.player = new Player(this.scene, this.camera, this.islandGen.colliders, this.themeConfig);
    
    // Interaction prompt sensor
    this.interactMgr = new InteractsManager(this.player, this.islandGen, this.modalMgr);

    const isChristmas = siteConfig.activeTheme === 'christmas';

    // Listen to spawn-ball events from interactions
    window.addEventListener('spawn-ball', (e) => {
      const spawnX = e.detail.x;
      const spawnZ = e.detail.z + 0.6; // Spawn slightly in front of vendor
      
      // Color choices: Snowball white variants for Christmas vs bright beach ball colors
      const colors = isChristmas ? [0xffffff, 0xe0f7fa, 0xf5fafd] : [0xff5252, 0x40c4ff, 0xffeb3b, 0xff8a80, 0x00e676];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const ball = new BeachBall(this.scene, spawnX, 1.3, spawnZ, color);
      this.beachBallsList.push(ball);

      // Keep at most 5 balls on screen (FIFO)
      if (this.beachBallsList.length > 5) {
        const oldBall = this.beachBallsList.shift();
        oldBall.destroy();
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
        
        const isUI = touch.target.closest('.hud-header') || 
                     touch.target.closest('.modal-overlay') || 
                     touch.target.closest('.modal-card') || 
                     touch.target.closest('.action-buttons') || 
                     touch.target.id === 'audio-btn' ||
                     touch.target.id === 'btn-back-2d';
                     
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
        
        joystickWrapper.style.left = '48px';
        joystickWrapper.style.bottom = '48px';
        joystickWrapper.style.top = 'auto';
        joystickWrapper.style.opacity = '0.55';
        
        this.player.keys.w = false;
        this.player.keys.s = false;
        this.player.keys.a = false;
        this.player.keys.d = false;
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
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

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1); 
    const time = this.clock.getElapsedTime() * 1000;

    // Update game components
    if (this.player) this.player.update(delta, time);
    if (this.environment) this.environment.update(time);
    if (this.islandGen) this.islandGen.update(time);
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
