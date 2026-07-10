/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Bullet, Enemy, Boss, Particle, Upgrade, WeaponType, WEAPONS_CONFIG, GameStats } from '../types';
import { sfx } from '../audio';
import { Shield, Sparkles, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (stats: GameStats) => void;
  onVictory: (stats: GameStats) => void;
  isMuted: boolean;
  onScoreUpdate: (score: number) => void;
}

// Fixed game arena virtual resolution (independent of screen size)
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;

export default function GameCanvas({
  onGameOver,
  onVictory,
  isMuted,
  onScoreUpdate,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core Game State Refs to bypass React re-render lag in the animation loop
  const stateRef = useRef({
    player: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 100,
      vx: 0,
      vy: 0,
      width: 44,
      height: 44,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 100,
      speed: 6.5,
      acceleration: 0.8,
      friction: 0.88,
      dashCooldown: 0,
      dashDuration: 0,
      dashVx: 0,
      dashVy: 0,
      weapon: 'BLASTER' as WeaponType,
      weaponLevels: {
        BLASTER: 1,
        LASER: 0,
        ROCKET: 0,
        RAILGUN: 0,
      } as Record<WeaponType, number>,
      shootCooldown: 0,
      invulnerable: 0, // frame ticks
      angle: 0,
    },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    boss: null as Boss | null,
    particles: [] as Particle[],
    upgrades: [] as Upgrade[],
    keys: {} as Record<string, boolean>,
    stats: {
      score: 0,
      enemiesKilled: 0,
      damageDealt: 0,
      timePlayed: 0,
      currentLevel: 1,
    } as GameStats,
    spawnTimer: 0,
    bossSpawned: false,
    screenShake: 0,
    levelTimer: 0,
    levelKills: 0,
    isVictoryTriggered: false,
    isGameOverTriggered: false,
  });

  const [uiHp, setUiHp] = useState(100);
  const [uiShield, setUiShield] = useState(50);
  const [uiWeapon, setUiWeapon] = useState<WeaponType>('BLASTER');
  const [uiWeaponLevels, setUiWeaponLevels] = useState<Record<WeaponType, number>>({ BLASTER: 1, LASER: 0, ROCKET: 0, RAILGUN: 0 });
  const [uiScore, setUiScore] = useState(0);
  const [uiLevel, setUiLevel] = useState(1);
  const [bossHpPercent, setBossHpPercent] = useState<number | null>(null);
  const [bossName, setBossName] = useState<string>('');
  const [isBossActive, setIsBossActive] = useState(false);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // Handle keys and resize
  useEffect(() => {
    sfx.setMuted(isMuted);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent standard browser scrolling with space & arrow keys inside the game frame
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      stateRef.current.keys[e.code] = true;
      
      // Tap Shift or C to dash
      if (e.code === 'ShiftLeft' || e.code === 'KeyC') {
        triggerDash();
      }

      // Tap E or Q or number keys to switch weapons
      if (e.code === 'KeyE' || e.code === 'KeyQ') {
        cycleWeapon();
      }
      if (e.code === 'Digit1') switchWeapon('BLASTER');
      if (e.code === 'Digit2') switchWeapon('LASER');
      if (e.code === 'Digit3') switchWeapon('ROCKET');
      if (e.code === 'Digit4') switchWeapon('RAILGUN');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Monitor gamepads
    const handleGamepadConnected = () => setIsGamepadConnected(true);
    const handleGamepadDisconnected = () => setIsGamepadConnected(false);
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, [isMuted]);

  // Weapon systems helper functions
  const switchWeapon = (type: WeaponType) => {
    const s = stateRef.current;
    if (s.player.weaponLevels[type] > 0) {
      s.player.weapon = type;
      setUiWeapon(type);
    }
  };

  const cycleWeapon = () => {
    const s = stateRef.current;
    const list: WeaponType[] = ['BLASTER', 'LASER', 'ROCKET', 'RAILGUN'];
    const currentIdx = list.indexOf(s.player.weapon);
    // Find next unlocked weapon
    for (let i = 1; i <= 4; i++) {
      const nextType = list[(currentIdx + i) % 4];
      if (s.player.weaponLevels[nextType] > 0) {
        s.player.weapon = nextType;
        setUiWeapon(nextType);
        break;
      }
    }
  };

  const triggerDash = () => {
    const s = stateRef.current;
    const p = s.player;
    if (p.dashCooldown > 0 || p.dashDuration > 0) return;

    // Get input direction
    let dx = 0;
    let dy = 0;
    if (s.keys['KeyA'] || s.keys['ArrowLeft']) dx = -1;
    if (s.keys['KeyD'] || s.keys['ArrowRight']) dx = 1;
    if (s.keys['KeyW'] || s.keys['ArrowUp']) dy = -1;
    if (s.keys['KeyS'] || s.keys['ArrowDown']) dy = 1;

    // Gamepad dpad or analog stick
    const gamepad = navigator.getGamepads()[0];
    if (gamepad) {
      const gpX = gamepad.axes[0];
      const gpY = gamepad.axes[1];
      if (Math.abs(gpX) > 0.2) dx = gpX;
      if (Math.abs(gpY) > 0.2) dy = gpY;
    }

    // Default to forward if no keys pressed
    if (dx === 0 && dy === 0) dy = -1;

    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    p.dashDuration = 12; // active for 12 frames
    p.dashCooldown = 45; // 45 frames cooldown (~0.75s)
    p.dashVx = dx * 16;
    p.dashVy = dy * 16;
    p.invulnerable = 15; // invulnerable during dash

    // Trigger visual particles
    spawnSparks(p.x, p.y, '#00ffff', 15);
    sfx.playShoot('LASER'); // cool dash whip sound
  };

  const spawnSparks = (x: number, y: number, color: string, count: number = 8) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      s.particles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
        type: 'spark',
      });
    }
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let isMounted = true;

    // Reset loop context
    stateRef.current.player.hp = 100;
    stateRef.current.player.shield = 50;
    stateRef.current.player.weapon = 'BLASTER';
    stateRef.current.player.weaponLevels = { BLASTER: 1, LASER: 0, ROCKET: 0, RAILGUN: 0 };
    stateRef.current.bullets = [];
    stateRef.current.enemies = [];
    stateRef.current.boss = null;
    stateRef.current.particles = [];
    stateRef.current.upgrades = [];
    stateRef.current.stats = { score: 0, enemiesKilled: 0, damageDealt: 0, timePlayed: 0, currentLevel: 1 };
    stateRef.current.bossSpawned = false;
    stateRef.current.levelTimer = 0;
    stateRef.current.levelKills = 0;
    stateRef.current.isVictoryTriggered = false;
    stateRef.current.isGameOverTriggered = false;

    // Background Stars setup for space illusion
    const stars: { x: number; y: number; size: number; speed: number }[] = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 3 + 0.5,
      });
    }

    // Grid details for Level 3
    const gridLines: number[] = [];
    for (let i = 0; i < GAME_HEIGHT; i += 40) {
      gridLines.push(i);
    }

    const gameTick = () => {
      if (!isMounted) return;

      const s = stateRef.current;
      const p = s.player;

      // Ensure stats time ticks up
      s.levelTimer++;
      if (s.levelTimer % 60 === 0) {
        s.stats.timePlayed++;
      }

      // Handle Screen Shake reduction
      if (s.screenShake > 0) s.screenShake *= 0.9;

      // GAMEPAD API READING
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      let gpLeftX = 0;
      let gpLeftY = 0;
      let gpShootPressed = false;
      let gpDashPressed = false;
      let gpPrevWeaponPressed = false;
      let gpNextWeaponPressed = false;

      if (gp) {
        gpLeftX = gp.axes[0];
        gpLeftY = gp.axes[1];
        // Buttons
        gpShootPressed = gp.buttons[0].pressed || gp.buttons[7].pressed; // A or RT
        gpDashPressed = gp.buttons[1].pressed || gp.buttons[5].pressed; // B or RB
        gpPrevWeaponPressed = gp.buttons[4].pressed; // LB
        gpNextWeaponPressed = gp.buttons[5].pressed; // RB
      }

      // --- PLAYER VELOCITY UPDATE ---
      let ax = 0;
      let ay = 0;

      // Keyboard Inputs
      if (s.keys['KeyA'] || s.keys['ArrowLeft']) ax -= 1;
      if (s.keys['KeyD'] || s.keys['ArrowRight']) ax += 1;
      if (s.keys['KeyW'] || s.keys['ArrowUp']) ay -= 1;
      if (s.keys['KeyS'] || s.keys['ArrowDown']) ay += 1;

      // Gamepad analog override
      if (Math.abs(gpLeftX) > 0.15) ax = gpLeftX;
      if (Math.abs(gpLeftY) > 0.15) ay = gpLeftY;

      // Normalize acceleration so diagonal speed isn't crazy
      const accelLen = Math.sqrt(ax * ax + ay * ay);
      if (accelLen > 0.1) {
        ax = (ax / accelLen) * p.acceleration;
        ay = (ay / accelLen) * p.acceleration;
        
        // Tilt player slightly based on horizontal movement direction
        p.angle = ax * 0.2;
      } else {
        p.angle *= 0.85; // return back to upright
      }

      if (p.dashDuration > 0) {
        // Active Dashing
        p.vx = p.dashVx;
        p.vy = p.dashVy;
        p.dashDuration--;

        // Leave pixel shadow particles
        if (s.levelTimer % 2 === 0) {
          s.particles.push({
            id: Math.random().toString(),
            x: p.x,
            y: p.y,
            vx: -p.vx * 0.2,
            vy: -p.vy * 0.2,
            color: '#00ffff',
            size: 6,
            life: 0,
            maxLife: 10,
            type: 'ring',
          });
        }
      } else {
        // Standard fluid movement physics
        p.vx = (p.vx + ax) * p.friction;
        p.vy = (p.vy + ay) * p.friction;
      }

      // Apply positions & clamping within boundary walls
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < p.width / 2) { p.x = p.width / 2; p.vx = 0; }
      if (p.x > GAME_WIDTH - p.width / 2) { p.x = GAME_WIDTH - p.width / 2; p.vx = 0; }
      if (p.y < p.height / 2) { p.y = p.height / 2; p.vy = 0; }
      if (p.y > GAME_HEIGHT - p.height / 2) { p.y = GAME_HEIGHT - p.height / 2; p.vy = 0; }

      // Timers
      if (p.dashCooldown > 0) p.dashCooldown--;
      if (p.invulnerable > 0) p.invulnerable--;
      if (p.shootCooldown > 0) p.shootCooldown--;

      // Shield regeneration
      if (p.shield < p.maxShield && s.levelTimer % 90 === 0 && p.hp > 0) {
        p.shield = Math.min(p.maxShield, p.shield + 2);
      }

      // Handle weapon fire trigger
      const isShootingInput = s.keys['Space'] || s.keys['KeyJ'] || gpShootPressed;
      if (isShootingInput && p.shootCooldown === 0 && p.hp > 0) {
        firePlayerWeapon();
      }

      // Gamepad dash button trigger helper
      if (gpDashPressed && p.dashCooldown === 0) {
        triggerDash();
      }

      // Game over state triggers
      if (p.hp <= 0 && !s.isGameOverTriggered) {
        s.isGameOverTriggered = true;
        sfx.playGameOverTheme();
        setTimeout(() => {
          onGameOver(s.stats);
        }, 1500);
      }

      // --- SPAWNING SYSTEM ---
      if (!s.bossSpawned) {
        s.spawnTimer++;
        const spawnDelay = Math.max(45, 120 - s.stats.currentLevel * 25);
        if (s.spawnTimer >= spawnDelay) {
          s.spawnTimer = 0;
          // Spawn enemies up to 8 max active
          if (s.enemies.length < 5 + s.stats.currentLevel * 2) {
            spawnEnemyShip();
          }
        }

        // Level threshold to trigger boss: kill 10 enemies in this level, or 30 seconds elapsed in this level
        const requiredKills = 10;
        const requiredTime = 30 * 60; // 30 seconds (at 60 FPS)
        if (s.levelKills >= requiredKills || s.levelTimer > requiredTime) {
          spawnBossCruiser();
        }
      }

      // --- MOVEMENT AND GAME SYSTEM UPDATES ---

      // Update background stars
      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * GAME_WIDTH;
        }
      });

      // Update bullets
      s.bullets.forEach((b, idx) => {
        // Homing Rocket Tracking logic
        if (b.type === 'ROCKET' && !b.isEnemy) {
          let target: Enemy | Boss | null = null;
          if (s.boss) {
            target = s.boss;
          } else if (s.enemies.length > 0) {
            // Find closest enemy
            let closestDist = Infinity;
            s.enemies.forEach(e => {
              const dx = e.x - b.x;
              const dy = e.y - b.y;
              const dist = dx * dx + dy * dy;
              if (dist < closestDist) {
                closestDist = dist;
                target = e;
              }
            });
          }

          if (target) {
            const tx = (target as any).x;
            const ty = (target as any).y;
            const dx = tx - b.x;
            const dy = ty - b.y;
            const angle = Math.atan2(dy, dx);
            const targetVx = Math.cos(angle) * 7.5;
            const targetVy = Math.sin(angle) * 7.5;

            // Smooth interpolation to steer rocket
            b.vx = b.vx * 0.88 + targetVx * 0.12;
            b.vy = b.vy * 0.88 + targetVy * 0.12;
          }

          // Rocket smoke exhaust
          if (s.levelTimer % 3 === 0) {
            s.particles.push({
              id: Math.random().toString(),
              x: b.x,
              y: b.y,
              vx: -b.vx * 0.3 + (Math.random() - 0.5) * 1,
              vy: -b.vy * 0.3 + (Math.random() - 0.5) * 1,
              color: '#ff8800',
              size: Math.random() * 4 + 2,
              life: 0,
              maxLife: 20,
              type: 'smoke',
            });
          }
        }

        b.x += b.vx;
        b.y += b.vy;
      });

      // Filter out bullets off-screen
      s.bullets = s.bullets.filter(b => b.x > -50 && b.x < GAME_WIDTH + 50 && b.y > -50 && b.y < GAME_HEIGHT + 50);

      // Update enemies
      s.enemies.forEach(e => {
        // AI movement pattern
        if (e.type === 'scout') {
          // Sine wave movement
          e.x += Math.sin(s.levelTimer * 0.05 + e.patternTimer) * 2;
          e.y += e.vy;
        } else if (e.type === 'bomber') {
          // Slow patrol
          if (e.x < 100) e.vx = Math.abs(e.vx);
          if (e.x > GAME_WIDTH - 100) e.vx = -Math.abs(e.vx);
          e.x += e.vx;
          e.y += e.vy;
        } else if (e.type === 'shield') {
          // Back-and-forth cover shield
          e.x += e.vx;
          if (e.x < 50) e.vx = Math.abs(e.vx);
          if (e.x > GAME_WIDTH - 50) e.vx = -Math.abs(e.vx);
          if (e.y < 120) e.y += 0.5;
        } else if (e.type === 'kamikaze') {
          // Direct tracking rushing attack!
          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 5) {
            e.vx = (dx / len) * 3.8;
            e.vy = (dy / len) * 3.8;
          }
          e.x += e.vx;
          e.y += e.vy;
        }

        // Clamp screen boundaries for certain types
        if (e.x < e.width) e.x = e.width;
        if (e.x > GAME_WIDTH - e.width) e.x = GAME_WIDTH - e.width;

        // Shoot logic for enemies
        if (e.shootCooldown > 0) {
          e.shootCooldown--;
        } else if (e.y > 50 && e.y < GAME_HEIGHT - 100) {
          triggerEnemyShoot(e);
        }
      });

      // Filter out enemies that are dead or escape off screen
      s.enemies = s.enemies.filter(e => {
        if (e.hp <= 0) return false;
        if (e.y > GAME_HEIGHT + 50) return false;
        return true;
      });

      // Update upgrades
      s.upgrades.forEach(u => {
        u.y += u.vy;
        u.x += u.vx;
        if (u.x < u.size) u.vx = Math.abs(u.vx);
        if (u.x > GAME_WIDTH - u.size) u.vx = -Math.abs(u.vx);
        u.pulseTimer += 0.1;
      });
      s.upgrades = s.upgrades.filter(u => u.y < GAME_HEIGHT + 50);

      // Update particles
      s.particles.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
      });
      s.particles = s.particles.filter(pt => pt.life < pt.maxLife);

      // Update boss cruiser
      if (s.boss) {
        updateBossCruiser(s.boss);
      }

      // --- COLLISION DETECTIONS ---
      handleCollisions();

      // Update UI variables
      setUiHp(Math.max(0, Math.round(p.hp)));
      setUiShield(Math.max(0, Math.round(p.shield)));
      setUiScore(s.stats.score);
      setUiLevel(s.stats.currentLevel);

      // --- RENDERING CANVAS ---
      ctx.fillStyle = '#020410'; // deep space canvas
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Stars
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
        ctx.globalAlpha = star.speed / 3.5;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
      ctx.globalAlpha = 1.0;

      // Draw background grid under grid level
      if (s.stats.currentLevel >= 3) {
        let gridColor = 'rgba(153, 51, 255, 0.08)';
        if (s.stats.currentLevel === 4) {
          gridColor = 'rgba(16, 185, 129, 0.06)';
        } else if (s.stats.currentLevel === 5) {
          gridColor = 'rgba(239, 68, 68, 0.1)';
        }
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        gridLines.forEach(y => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(GAME_WIDTH, y);
          ctx.stroke();
        });
        for (let x = 0; x < GAME_WIDTH; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, GAME_HEIGHT);
          ctx.stroke();
        }
      }

      // Apply screen shake translation
      if (s.screenShake > 1) {
        ctx.save();
        const dx = (Math.random() - 0.5) * s.screenShake;
        const dy = (Math.random() - 0.5) * s.screenShake;
        ctx.translate(dx, dy);
      }

      // Draw Upgrades
      s.upgrades.forEach(u => drawUpgradeBox(ctx, u));

      // Draw Bullets
      s.bullets.forEach(b => drawLaserBolt(ctx, b));

      // Draw Enemies
      s.enemies.forEach(e => drawEnemyShip(ctx, e));

      // Draw Boss
      if (s.boss) {
        drawBossCruiser(ctx, s.boss);
      }

      // Draw Particles
      s.particles.forEach(pt => drawParticle(ctx, pt));

      // Draw Player Ship
      if (p.hp > 0) {
        drawPlayer(ctx, p);
      }

      // Restore screen shake
      if (s.screenShake > 1) {
        ctx.restore();
      }

      // Level Title splash
      if (s.levelTimer < 180) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        
        let lvlName = 'ASTEROID OUTPOST';
        if (s.stats.currentLevel === 2) lvlName = 'PLASMA NEBULA';
        else if (s.stats.currentLevel === 3) lvlName = 'CORE HYPERION';
        else if (s.stats.currentLevel === 4) lvlName = 'QUANTUM VOID';
        else if (s.stats.currentLevel === 5) lvlName = 'OMEGA ECLIPSE STATION';

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '900 24px monospace';
        ctx.fillText(`LEVEL ${s.stats.currentLevel}: ${lvlName}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('MOVE: WASD/ARROWS | SHOOT: SPACE/J | DASH: SHIFT/C | WEAPONS: E/Q or [1-4]', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
        ctx.restore();
      }

      // Proceed with next frame
      animFrameId = requestAnimationFrame(gameTick);
    };

    // --- GAME ENGINE HELPER IMPLEMENTATIONS ---

    const firePlayerWeapon = () => {
      const s = stateRef.current;
      const p = s.player;
      const wStats = WEAPONS_CONFIG[p.weapon];
      const level = p.weaponLevels[p.weapon];

      sfx.playShoot(p.weapon);
      p.shootCooldown = Math.round(wStats.fireRate / 16.6); // convert to frame counts

      const bulletId = () => Math.random().toString();

      if (p.weapon === 'BLASTER') {
        // Spreads out based on upgrade level
        if (level === 1) {
          s.bullets.push({
            id: bulletId(),
            x: p.x,
            y: p.y - p.height / 2,
            vx: 0,
            vy: -10,
            type: 'BLASTER',
            damage: wStats.damage,
            color: wStats.color,
            radius: 4,
            isEnemy: false,
          });
        } else if (level === 2) {
          s.bullets.push(
            { id: bulletId(), x: p.x - 8, y: p.y - p.height / 2, vx: 0, vy: -10, type: 'BLASTER', damage: wStats.damage, color: wStats.color, radius: 4, isEnemy: false },
            { id: bulletId(), x: p.x + 8, y: p.y - p.height / 2, vx: 0, vy: -10, type: 'BLASTER', damage: wStats.damage, color: wStats.color, radius: 4, isEnemy: false }
          );
        } else {
          // Triple fan layout
          s.bullets.push(
            { id: bulletId(), x: p.x, y: p.y - p.height / 2, vx: 0, vy: -10, type: 'BLASTER', damage: wStats.damage, color: wStats.color, radius: 4, isEnemy: false },
            { id: bulletId(), x: p.x - 12, y: p.y - 10, vx: -2, vy: -9.5, type: 'BLASTER', damage: wStats.damage, color: wStats.color, radius: 4, isEnemy: false },
            { id: bulletId(), x: p.x + 12, y: p.y - 10, vx: 2, vy: -9.5, type: 'BLASTER', damage: wStats.damage, color: wStats.color, radius: 4, isEnemy: false }
          );
        }
      } else if (p.weapon === 'LASER') {
        // Laser continuous fire line
        const spreadCount = level >= 3 ? 3 : level === 2 ? 2 : 1;
        if (spreadCount === 1) {
          s.bullets.push({
            id: bulletId(),
            x: p.x,
            y: p.y - p.height / 2,
            vx: 0,
            vy: -14,
            type: 'LASER',
            damage: wStats.damage,
            color: wStats.color,
            radius: 2.5,
            isEnemy: false,
          });
        } else if (spreadCount === 2) {
          s.bullets.push(
            { id: bulletId(), x: p.x - 6, y: p.y - p.height / 2, vx: 0, vy: -14, type: 'LASER', damage: wStats.damage, color: wStats.color, radius: 2.5, isEnemy: false },
            { id: bulletId(), x: p.x + 6, y: p.y - p.height / 2, vx: 0, vy: -14, type: 'LASER', damage: wStats.damage, color: wStats.color, radius: 2.5, isEnemy: false }
          );
        } else {
          s.bullets.push(
            { id: bulletId(), x: p.x, y: p.y - p.height / 2, vx: 0, vy: -15, type: 'LASER', damage: wStats.damage, color: wStats.color, radius: 3, isEnemy: false },
            { id: bulletId(), x: p.x - 12, y: p.y - p.height / 2, vx: -0.5, vy: -15, type: 'LASER', damage: wStats.damage, color: wStats.color, radius: 2.5, isEnemy: false },
            { id: bulletId(), x: p.x + 12, y: p.y - p.height / 2, vx: 0.5, vy: -15, type: 'LASER', damage: wStats.damage, color: wStats.color, radius: 2.5, isEnemy: false }
          );
        }
      } else if (p.weapon === 'ROCKET') {
        // Rocket counts increase
        const count = level >= 3 ? 3 : level === 2 ? 2 : 1;
        if (count === 1) {
          s.bullets.push({
            id: bulletId(),
            x: p.x,
            y: p.y - 15,
            vx: 0,
            vy: -4,
            type: 'ROCKET',
            damage: wStats.damage,
            color: wStats.color,
            radius: 6,
            isEnemy: false,
          });
        } else if (count === 2) {
          s.bullets.push(
            { id: bulletId(), x: p.x - 14, y: p.y, vx: -1.5, vy: -4, type: 'ROCKET', damage: wStats.damage, color: wStats.color, radius: 5, isEnemy: false },
            { id: bulletId(), x: p.x + 14, y: p.y, vx: 1.5, vy: -4, type: 'ROCKET', damage: wStats.damage, color: wStats.color, radius: 5, isEnemy: false }
          );
        } else {
          s.bullets.push(
            { id: bulletId(), x: p.x, y: p.y - 18, vx: 0, vy: -5, type: 'ROCKET', damage: wStats.damage, color: wStats.color, radius: 6, isEnemy: false },
            { id: bulletId(), x: p.x - 16, y: p.y, vx: -2, vy: -3.5, type: 'ROCKET', damage: wStats.damage, color: wStats.color, radius: 5, isEnemy: false },
            { id: bulletId(), x: p.x + 16, y: p.y, vx: 2, vy: -3.5, type: 'ROCKET', damage: wStats.damage, color: wStats.color, radius: 5, isEnemy: false }
          );
        }
      } else if (p.weapon === 'RAILGUN') {
        // Direct light strike beams
        const chargeOffset = level >= 3 ? 16 : level === 2 ? 10 : 0;
        s.bullets.push({
          id: bulletId(),
          x: p.x,
          y: p.y - p.height / 2,
          vx: 0,
          vy: -20, // super fast
          type: 'RAILGUN',
          damage: wStats.damage + (level * 15),
          color: wStats.color,
          radius: 8 + level * 2,
          isEnemy: false,
          chainCount: level + 1, // chain electricity count
        });

        if (level >= 3) {
          // Double rail beam
          s.bullets.push(
            { id: bulletId(), x: p.x - 20, y: p.y - 10, vx: -1, vy: -20, type: 'RAILGUN', damage: wStats.damage / 2, color: wStats.color, radius: 5, isEnemy: false, chainCount: 1 },
            { id: bulletId(), x: p.x + 20, y: p.y - 10, vx: 1, vy: -20, type: 'RAILGUN', damage: wStats.damage / 2, color: wStats.color, radius: 5, isEnemy: false, chainCount: 1 }
          );
        }
      }
    };

    const spawnEnemyShip = () => {
      const s = stateRef.current;
      const typeRand = Math.random();
      let type: 'scout' | 'bomber' | 'shield' | 'kamikaze' = 'scout';
      let hp = 15 + s.stats.currentLevel * 5;
      let width = 32;
      let height = 32;
      let color = '#ea580c';
      let vy = Math.random() * 1.5 + 1;
      let vx = 0;
      let scoreValue = 100;

      if (typeRand > 0.85) {
        type = 'kamikaze';
        hp = 10 + s.stats.currentLevel * 3;
        color = '#dc2626';
        vy = 2.5;
        scoreValue = 150;
      } else if (typeRand > 0.6) {
        type = 'bomber';
        hp = 45 + s.stats.currentLevel * 15;
        width = 44;
        height = 40;
        color = '#ef4444';
        vy = 0.8;
        vx = Math.random() > 0.5 ? 1.2 : -1.2;
        scoreValue = 250;
      } else if (typeRand > 0.4 && s.stats.currentLevel >= 2) {
        type = 'shield';
        hp = 60 + s.stats.currentLevel * 20;
        width = 40;
        height = 36;
        color = '#a855f7';
        vy = 0.5;
        vx = Math.random() > 0.5 ? 0.8 : -0.8;
        scoreValue = 300;
      }

      s.enemies.push({
        id: Math.random().toString(),
        x: Math.random() * (GAME_WIDTH - 100) + 50,
        y: -50,
        vx,
        vy,
        hp,
        maxHp: hp,
        type,
        width,
        height,
        color,
        shootCooldown: Math.random() * 120 + 40,
        scoreValue,
        patternTimer: Math.random() * 100,
      });
    };

    const triggerEnemyShoot = (e: Enemy) => {
      const s = stateRef.current;
      e.shootCooldown = Math.random() * 150 + 100 - s.stats.currentLevel * 15;

      const bulletId = () => Math.random().toString();

      if (e.type === 'scout') {
        s.bullets.push({
          id: bulletId(),
          x: e.x,
          y: e.y + e.height / 2,
          vx: 0,
          vy: 4.5,
          type: 'BLASTER',
          damage: 10,
          color: '#ff3333',
          radius: 3,
          isEnemy: true,
        });
      } else if (e.type === 'bomber') {
        // Double diagonal fire
        s.bullets.push(
          { id: bulletId(), x: e.x - 10, y: e.y + e.height / 2, vx: -1.2, vy: 3.8, type: 'BLASTER', damage: 15, color: '#ff2222', radius: 4, isEnemy: true },
          { id: bulletId(), x: e.x + 10, y: e.y + e.height / 2, vx: 1.2, vy: 3.8, type: 'BLASTER', damage: 15, color: '#ff2222', radius: 4, isEnemy: true }
        );
      } else if (e.type === 'shield') {
        // High-speed electrical orb that drifts down
        s.bullets.push({
          id: bulletId(),
          x: e.x,
          y: e.y + e.height / 2,
          vx: (s.player.x - e.x) * 0.005, // micro guide
          vy: 3.2,
          type: 'RAILGUN',
          damage: 20,
          color: '#a855f7',
          radius: 5,
          isEnemy: true,
        });
      }
    };

    const spawnBossCruiser = () => {
      const s = stateRef.current;
      s.bossSpawned = true;
      s.enemies = []; // clear small screen enemies for the boss duel!
      sfx.playBossAlert();

      let hp = 1000 + s.stats.currentLevel * 800;
      let name = 'VANGUARD ALPHA';
      let color = '#f97316';

      if (s.stats.currentLevel === 2) {
        name = 'LEVIATHAN CORE';
        color = '#3b82f6';
      } else if (s.stats.currentLevel === 3) {
        name = 'OMNI DESTROYER';
        color = '#ec4899';
      } else if (s.stats.currentLevel === 4) {
        name = 'QUANTUM SINGULARITY';
        color = '#10b981';
      } else if (s.stats.currentLevel === 5) {
        name = 'OMEGA ECLIPSE';
        color = '#ef4444';
      }

      s.boss = {
        x: GAME_WIDTH / 2,
        y: -150, // fly down
        vx: 1.5,
        vy: 1.0,
        hp,
        maxHp: hp,
        width: 140,
        height: 100,
        shootCooldown: 80,
        state: 'entering',
        stateTimer: 0,
        shield: 300 * s.stats.currentLevel,
        maxShield: 300 * s.stats.currentLevel,
        color,
        name,
        level: s.stats.currentLevel,
      };

      setBossName(name);
      setBossHpPercent(100);
      setIsBossActive(true);
    };

    const updateBossCruiser = (b: Boss) => {
      const s = stateRef.current;
      const p = s.player;
      b.stateTimer++;

      if (b.state === 'entering') {
        b.y += 1.5;
        if (b.y >= 130) {
          b.state = 'active';
          b.stateTimer = 0;
          b.vy = 0;
        }
        return;
      }

      // Check health triggers phase change to angry
      if (b.hp < b.maxHp * 0.45 && b.state !== 'angry' && b.state !== 'defeated') {
        b.state = 'angry';
        b.color = '#ef4444'; // turns hot crimson
        sfx.playBossAlert();
        // Spawn ring visual flash
        s.particles.push({
          id: Math.random().toString(),
          x: b.x,
          y: b.y,
          vx: 0, vy: 0,
          color: '#ef4444',
          size: 80,
          life: 0, maxLife: 30,
          type: 'ring',
        });
      }

      // Movement pattern (Horizontal sweeping)
      b.x += b.vx;
      if (b.x < 150) b.vx = Math.abs(b.vx);
      if (b.x > GAME_WIDTH - 150) b.vx = -Math.abs(b.vx);

      // Micro hover vertical swing
      b.y = 130 + Math.sin(b.stateTimer * 0.02) * 20;

      // Shoot pattern triggers
      if (b.shootCooldown > 0) {
        b.shootCooldown--;
      } else {
        triggerBossAttack(b);
      }

      // Keep Shield visual charging occasionally
      if (b.shield < b.maxShield && b.stateTimer % 240 === 0 && b.state !== 'angry') {
        b.shield = Math.min(b.maxShield, b.shield + 60);
        // Visual shield sparks
        spawnSparks(b.x, b.y, '#3b82f6', 15);
      }

      // Update UI percent display
      const percent = Math.round((b.hp / b.maxHp) * 100);
      setBossHpPercent(percent);
    };

    const triggerBossAttack = (b: Boss) => {
      const s = stateRef.current;
      const p = s.player;
      const bulletId = () => Math.random().toString();

      if (b.level === 1) {
        // BOSS 1: Vanguard Alpha pattern
        if (b.state === 'angry') {
          // Hyper spiral bullet rings
          b.shootCooldown = 40;
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) + (b.stateTimer * 0.1);
            s.bullets.push({
              id: bulletId(),
              x: b.x,
              y: b.y + 20,
              vx: Math.cos(angle) * 3.8,
              vy: Math.sin(angle) * 3.8,
              type: 'BLASTER',
              damage: 10,
              color: '#f97316',
              radius: 4,
              isEnemy: true,
            });
          }
        } else {
          // Standard sweeping double shots
          b.shootCooldown = 70;
          s.bullets.push(
            { id: bulletId(), x: b.x - 30, y: b.y + 30, vx: -0.5, vy: 4, type: 'BLASTER', damage: 12, color: b.color, radius: 4, isEnemy: true },
            { id: bulletId(), x: b.x + 30, y: b.y + 30, vx: 0.5, vy: 4, type: 'BLASTER', damage: 12, color: b.color, radius: 4, isEnemy: true },
            { id: bulletId(), x: b.x, y: b.y + 35, vx: 0, vy: 4.8, type: 'BLASTER', damage: 15, color: '#ffffff', radius: 5, isEnemy: true }
          );
        }
      } else if (b.level === 2) {
        // BOSS 2: Leviathan Core pattern (Homing orbs + Mega Laser sweeps)
        if (b.state === 'angry') {
          b.shootCooldown = 55;
          // Fire 3 homing slow energy globes towards player
          const angle = Math.atan2(p.y - b.y, p.x - b.x);
          s.bullets.push(
            { id: bulletId(), x: b.x, y: b.y + 20, vx: Math.cos(angle) * 3.0, vy: Math.sin(angle) * 3.0, type: 'ROCKET', damage: 18, color: '#3b82f6', radius: 6, isEnemy: true },
            { id: bulletId(), x: b.x - 40, y: b.y, vx: Math.cos(angle - 0.25) * 3.0, vy: Math.sin(angle - 0.25) * 3.0, type: 'ROCKET', damage: 18, color: '#3b82f6', radius: 6, isEnemy: true },
            { id: bulletId(), x: b.x + 40, y: b.y, vx: Math.cos(angle + 0.25) * 3.0, vy: Math.sin(angle + 0.25) * 3.0, type: 'ROCKET', damage: 18, color: '#3b82f6', radius: 6, isEnemy: true }
          );
        } else {
          // sweeping rail-beam line indicators
          b.shootCooldown = 90;
          s.bullets.push(
            { id: bulletId(), x: b.x - 20, y: b.y + 30, vx: 0, vy: 5, type: 'RAILGUN', damage: 14, color: '#00ffff', radius: 4, isEnemy: true },
            { id: bulletId(), x: b.x + 20, y: b.y + 30, vx: 0, vy: 5, type: 'RAILGUN', damage: 14, color: '#00ffff', radius: 4, isEnemy: true }
          );
          // Spawn kamikaze adds occasionally
          if (s.enemies.length < 2) {
            s.enemies.push({
              id: Math.random().toString(),
              x: b.x + (Math.random() - 0.5) * 100,
              y: b.y + 40,
              vx: (Math.random() - 0.5) * 4,
              vy: 2.2,
              hp: 12, maxHp: 12,
              type: 'kamikaze',
              width: 26, height: 26, color: '#dc2626',
              shootCooldown: 999, scoreValue: 50, patternTimer: 0,
            });
          }
        }
      } else if (b.level === 3) {
        // BOSS 3: Omni Destroyer (The Ultimate Challenge!)
        b.shootCooldown = b.state === 'angry' ? 30 : 50;
        
        // Massive spiral fan + fast electric beams
        for (let i = 0; i < (b.state === 'angry' ? 12 : 6); i++) {
          const angle = (i * Math.PI * 2 / (b.state === 'angry' ? 12 : 6)) + (b.stateTimer * 0.15);
          s.bullets.push({
            id: bulletId(),
            x: b.x,
            y: b.y + 10,
            vx: Math.cos(angle) * (b.state === 'angry' ? 4.5 : 3.5),
            vy: Math.sin(angle) * (b.state === 'angry' ? 4.5 : 3.5),
            type: 'BLASTER',
            damage: 10,
            color: '#ec4899',
            radius: 4,
            isEnemy: true,
          });
        }

        // Fire straight lightning rail down
        s.bullets.push({
          id: bulletId(),
          x: b.x + (Math.random() - 0.5) * 60,
          y: b.y + 30,
          vx: 0,
          vy: 8,
          type: 'RAILGUN',
          damage: 22,
          color: '#ffffff',
          radius: 5,
          isEnemy: true,
        });
      } else if (b.level === 4) {
        // BOSS 4: Quantum Singularity (Fast emerald bouncing shots or rapid crossing lasers)
        b.shootCooldown = b.state === 'angry' ? 35 : 55;
        // Sweeping cross shots
        for (let i = -2; i <= 2; i++) {
          s.bullets.push({
            id: bulletId(),
            x: b.x + i * 25,
            y: b.y + 20,
            vx: i * 1.5,
            vy: 4.5,
            type: 'LASER',
            damage: 12,
            color: '#10b981',
            radius: 3,
            isEnemy: true,
          });
        }
        // Occasional homing green rockets
        if (b.stateTimer % 90 === 0) {
          const angle = Math.atan2(p.y - b.y, p.x - b.x);
          s.bullets.push({
            id: bulletId(),
            x: b.x,
            y: b.y + 30,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            type: 'ROCKET',
            damage: 20,
            color: '#10b981',
            radius: 5,
            isEnemy: true,
          });
        }
      } else {
        // BOSS 5: Omega Eclipse (The Ultimate Overlord!)
        b.shootCooldown = b.state === 'angry' ? 25 : 45;
        
        // Massive spiral cross fan of death
        const count = b.state === 'angry' ? 16 : 8;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2 / count) + (b.stateTimer * 0.2);
          s.bullets.push({
            id: bulletId(),
            x: b.x,
            y: b.y + 10,
            vx: Math.cos(angle) * (b.state === 'angry' ? 5.2 : 4.0),
            vy: Math.sin(angle) * (b.state === 'angry' ? 5.2 : 4.0),
            type: 'BLASTER',
            damage: 10,
            color: '#ef4444',
            radius: 4,
            isEnemy: true,
          });
        }

        // Heavy central rail beams
        s.bullets.push(
          { id: bulletId(), x: b.x - 40, y: b.y + 30, vx: -0.5, vy: 9, type: 'RAILGUN', damage: 25, color: '#ffffff', radius: 5, isEnemy: true },
          { id: bulletId(), x: b.x + 40, y: b.y + 30, vx: 0.5, vy: 9, type: 'RAILGUN', damage: 25, color: '#ffffff', radius: 5, isEnemy: true }
        );
      }
    };

    const handleCollisions = () => {
      const s = stateRef.current;
      const p = s.player;

      // 1. BULLETS vs ENEMIES / BOSSES
      s.bullets.forEach((b) => {
        if (b.isEnemy) return; // ignore player's own bullets

        // vs regular enemies
        s.enemies.forEach((e) => {
          if (e.hp <= 0) return;
          const distSq = (b.x - e.x) * (b.x - e.x) + (b.y - e.y) * (b.y - e.y);
          const hitRadius = (e.width + e.height) / 4 + b.radius;
          
          if (distSq < hitRadius * hitRadius) {
            // Bullet Hit!
            e.hp -= b.damage;
            s.stats.damageDealt += b.damage;
            
            // Remove regular bullets immediately, but LASERS pierce!
            if (b.type !== 'LASER') {
              b.x = -9999; // mark to clean up
            }

            sfx.playHit();
            spawnSparks(e.x, e.y, b.color, 4);

            // Railgun electrochain chaining logic
            if (b.type === 'RAILGUN' && b.chainCount && b.chainCount > 0) {
              const chainLimit = b.chainCount;
              b.chainCount = 0; // avoid loop
              // Find another nearby enemy
              let chained = 0;
              s.enemies.forEach(other => {
                if (other.id !== e.id && other.hp > 0 && chained < chainLimit) {
                  const oDist = Math.sqrt((e.x - other.x) * (e.x - other.x) + (e.y - other.y) * (e.y - other.y));
                  if (oDist < 180) { // maximum lightning reach range
                    other.hp -= b.damage * 0.7; // soft cascade
                    chained++;
                    // Spawn lightning spark bridge line
                    s.particles.push({
                      id: Math.random().toString(),
                      x: e.x, y: e.y,
                      vx: (other.x - e.x) / 10,
                      vy: (other.y - e.y) / 10,
                      color: '#a855f7',
                      size: 4,
                      life: 0, maxLife: 10,
                      type: 'electric',
                    });
                  }
                }
              });
            }

            // Check enemy death
            if (e.hp <= 0) {
              sfx.playExplosion('small');
              s.screenShake = Math.max(s.screenShake, 5);
              s.stats.score += e.scoreValue;
              s.stats.enemiesKilled++;
              s.levelKills++;
              onScoreUpdate(s.stats.score);
              spawnSparks(e.x, e.y, e.color, 15);
              triggerChanceUpgradeDrop(e.x, e.y);
            }
          }
        });

        // vs Boss
        if (s.boss && s.boss.hp > 0) {
          const bss = s.boss;
          const distSq = (b.x - bss.x) * (b.x - bss.x) + (b.y - bss.y) * (b.y - bss.y);
          const hitRadius = (bss.width + bss.height) / 4 + b.radius;

          if (distSq < hitRadius * hitRadius) {
            // Boss Hit!
            if (bss.shield > 0) {
              bss.shield -= b.damage;
              spawnSparks(b.x, b.y, '#3b82f6', 6);
            } else {
              bss.hp -= b.damage;
              spawnSparks(b.x, b.y, bss.color, 4);
            }

            s.stats.damageDealt += b.damage;

            if (b.type !== 'LASER') {
              b.x = -9999; // destroy bullet
            }
            sfx.playHit();

            // Check Boss death
            if (bss.hp <= 0 && bss.state !== 'defeated') {
              bss.state = 'defeated';
              sfx.playExplosion('boss');
              s.screenShake = 30;
              s.stats.score += 5000 * bss.level;
              onScoreUpdate(s.stats.score);
              
              // Mega shockwave rings
              s.particles.push({
                id: Math.random().toString(),
                x: bss.x, y: bss.y,
                vx: 0, vy: 0,
                color: '#ffffff',
                size: 200,
                life: 0, maxLife: 60,
                type: 'ring',
              });

              spawnSparks(bss.x, bss.y, bss.color, 50);

              // Trigger victory or next level
              setTimeout(() => {
                triggerBossVictory();
              }, 1800);
            }
          }
        }
      });

      // Clear destroyed bullets marked off-screen
      s.bullets = s.bullets.filter(b => b.x !== -9999);

      // 2. BULLETS vs PLAYER (Player taking damage)
      if (p.hp > 0 && p.invulnerable === 0) {
        s.bullets.forEach((b) => {
          if (!b.isEnemy) return; // ignore player bullets

          const distSq = (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y);
          const hitRadius = p.width / 3 + b.radius;

          if (distSq < hitRadius * hitRadius) {
            // Player hit!
            takeDamage(b.damage);
            b.x = -9999; // destroy bullet
          }
        });
        s.bullets = s.bullets.filter(b => b.x !== -9999);

        // Enemies direct body crash vs Player
        s.enemies.forEach((e) => {
          if (e.hp <= 0) return;
          const distSq = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
          const crashRadius = (e.width + p.width) * 0.4;

          if (distSq < crashRadius * crashRadius) {
            // Crash take heavy damage
            takeDamage(30);
            e.hp = 0; // destroy enemy
            sfx.playExplosion('medium');
            spawnSparks(e.x, e.y, e.color, 12);
          }
        });
      }

      // 3. PLAYER vs UPGRADES (Collecting weapons)
      s.upgrades.forEach((u) => {
        const distSq = (u.x - p.x) * (u.x - p.x) + (u.y - p.y) * (u.y - p.y);
        const collectRadius = (u.size + p.width) * 0.6;

        if (distSq < collectRadius * collectRadius) {
          // Collect Upgrade!
          sfx.playPowerup();
          u.y = 9999; // destroy

          if (u.type === 'HEAL') {
            p.hp = Math.min(p.maxHp, p.hp + 35);
            spawnSparks(p.x, p.y, '#10b981', 12);
          } else if (u.type === 'SHIELD') {
            p.shield = Math.min(p.maxShield, p.shield + 50);
            spawnSparks(p.x, p.y, '#3b82f6', 12);
          } else {
            // Weapon upgrades
            const weaponType = u.type as WeaponType;
            if (p.weaponLevels[weaponType] === 0) {
              p.weaponLevels[weaponType] = 1;
              p.weapon = weaponType; // auto equip new weapon type
            } else {
              p.weaponLevels[weaponType] = Math.min(3, p.weaponLevels[weaponType] + 1);
            }
            setUiWeaponLevels({ ...p.weaponLevels });
            setUiWeapon(p.weapon);
            spawnSparks(p.x, p.y, WEAPONS_CONFIG[weaponType].color, 20);
          }

          // Visual glowing expansion circle
          s.particles.push({
            id: Math.random().toString(),
            x: p.x, y: p.y,
            vx: 0, vy: 0,
            color: '#ffffff',
            size: 40,
            life: 0, maxLife: 15,
            type: 'ring',
          });
        }
      });
      s.upgrades = s.upgrades.filter(u => u.y !== 9999);
    };

    const takeDamage = (amount: number) => {
      const s = stateRef.current;
      const p = s.player;
      p.invulnerable = 25; // 25 frames flash shield
      s.screenShake = 15;

      if (p.shield > 0) {
        const excess = amount - p.shield;
        p.shield = Math.max(0, p.shield - amount);
        if (excess > 0) {
          p.hp = Math.max(0, p.hp - excess);
        }
      } else {
        p.hp = Math.max(0, p.hp - amount);
      }

      sfx.playHit();
      spawnSparks(p.x, p.y, '#ff4444', 10);
    };

    const triggerChanceUpgradeDrop = (x: number, y: number) => {
      const s = stateRef.current;
      const dropChance = Math.random();

      // 28% drop rate
      if (dropChance < 0.28) {
        const types: (WeaponType | 'HEAL' | 'SHIELD')[] = ['HEAL', 'SHIELD', 'LASER', 'ROCKET', 'RAILGUN'];
        
        // Pick an item. If player has basic blaster, highly offer weapon unblocks
        let pickedType = types[Math.floor(Math.random() * types.length)];
        
        s.upgrades.push({
          id: Math.random().toString(),
          x,
          y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 1.2,
          type: pickedType,
          size: 16,
          pulseTimer: 0,
        });
      }
    };

    const triggerBossVictory = () => {
      const s = stateRef.current;
      if (s.isVictoryTriggered) return;

      if (s.stats.currentLevel < 5) {
        // Progress to next Level!
        s.stats.currentLevel++;
        s.bossSpawned = false;
        s.boss = null;
        setIsBossActive(false);
        setBossHpPercent(null);
        s.levelTimer = 0; // reset for level banner splash
        s.levelKills = 0; // reset level kills for new level
        sfx.playVictoryTheme();
        
        // Boost user shield/hp slightly on clear
        s.player.hp = Math.min(100, s.player.hp + 20);
        s.player.shield = Math.min(100, s.player.shield + 40);
      } else {
        // Complete Game! Full Victory!
        s.isVictoryTriggered = true;
        sfx.playVictoryTheme();
        onVictory(s.stats);
      }
    };

    // Begin Loop
    animFrameId = requestAnimationFrame(gameTick);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animFrameId);
    };
  }, [onGameOver, onVictory, onScoreUpdate]);

  // --- CANVAS SPRITE PROCEDURAL DRAWINGS ---

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: any) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Dynamic Flash if invulnerable
    if (p.invulnerable > 0 && Math.floor(p.invulnerable / 3) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    // Engine thruster flames
    const flameHeight = 12 + Math.sin(Date.now() * 0.04) * 8;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(-8, p.height / 2);
    ctx.lineTo(0, p.height / 2 + flameHeight);
    ctx.lineTo(8, p.height / 2);
    ctx.fill();

    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(-4, p.height / 2);
    ctx.lineTo(0, p.height / 2 + flameHeight * 0.6);
    ctx.lineTo(4, p.height / 2);
    ctx.fill();

    // Metallic main body structure (pixelated spaceship feel)
    ctx.fillStyle = '#475569'; // slate grey metal
    ctx.beginPath();
    ctx.moveTo(0, -p.height / 2); // Nose
    ctx.lineTo(16, p.height / 6); // Right wing joints
    ctx.lineTo(22, p.height / 2); // Right wing tip
    ctx.lineTo(8, p.height / 3);
    ctx.lineTo(-8, p.height / 3);
    ctx.lineTo(-22, p.height / 2); // Left wing tip
    ctx.lineTo(-16, p.height / 6); // Left wing joints
    ctx.closePath();
    ctx.fill();

    // Cockpit neon canopy
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, -p.height / 4);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, p.height / 5);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();

    // Wing cannons based on weapon equipped
    ctx.fillStyle = WEAPONS_CONFIG[p.weapon].color;
    ctx.fillRect(-18, 0, 4, 12);
    ctx.fillRect(14, 0, 4, 12);

    // Active weapon charging particles visual
    if (p.shootCooldown < 2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-17, -2, 2, 2);
      ctx.fillRect(15, -2, 2, 2);
    }

    // Hexagonal active shield visual bubble
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(0, 191, 255, ' + (0.15 + (p.shield / p.maxShield) * 0.3) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const rx = Math.cos(angle) * (p.width * 0.8);
        const ry = Math.sin(angle) * (p.height * 0.8);
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawEnemyShip = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    ctx.save();
    ctx.translate(e.x, e.y);

    const timeScale = Date.now() * 0.01 + e.patternTimer;

    if (e.type === 'scout') {
      // Small swift insectoid wings
      const wingSweep = Math.sin(timeScale) * 8;
      
      ctx.fillStyle = '#f97316'; // wing flame backing
      ctx.beginPath();
      ctx.moveTo(-16, wingSweep);
      ctx.lineTo(16, wingSweep);
      ctx.lineTo(0, 16);
      ctx.fill();

      // Bug body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();

      // glowing eye dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -5, 4, 4);

    } else if (e.type === 'bomber') {
      // Big mechanical floating saucer
      ctx.fillStyle = '#1e293b'; // backing
      ctx.beginPath();
      ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
      ctx.fill();

      // Outer revolving metal rim segments
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.width / 2 - 4, timeScale * 0.2, timeScale * 0.2 + Math.PI * 1.5);
      ctx.stroke();

      // Bomb bay charging
      const glow = Math.abs(Math.sin(timeScale * 0.5)) * 255;
      ctx.fillStyle = `rgb(${glow}, 0, 0)`;
      ctx.fillRect(-6, -6, 12, 12);

    } else if (e.type === 'shield') {
      // Heavy hexagonal shell block
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(18, -12);
      ctx.lineTo(24, 6);
      ctx.lineTo(0, 16);
      ctx.lineTo(-24, 6);
      ctx.closePath();
      ctx.fill();

      // Hex core grid
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(14, -6);
      ctx.lineTo(18, 4);
      ctx.lineTo(0, 10);
      ctx.lineTo(-18, 4);
      ctx.closePath();
      ctx.stroke();

    } else if (e.type === 'kamikaze') {
      // Pointy explosive hazard spear
      const spin = timeScale * 0.6;
      ctx.rotate(spin);

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(12, 12);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();

      // Pulsing yellow volatile core
      const pulseSize = 4 + Math.sin(timeScale * 1.5) * 3;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, 2, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini visual healthbar on top of damaged enemies
    if (e.hp < e.maxHp) {
      const barW = e.width * 0.8;
      const barH = 3;
      const xOffset = -barW / 2;
      const yOffset = -e.height / 2 - 8;
      
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(xOffset, yOffset, barW, barH);
      
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(xOffset, yOffset, barW * (e.hp / e.maxHp), barH);
    }

    ctx.restore();
  };

  const drawBossCruiser = (ctx: CanvasRenderingContext2D, b: Boss) => {
    ctx.save();
    ctx.translate(b.x, b.y);

    const flash = b.state === 'entering' || b.state === 'defeated';
    const isAngry = b.state === 'angry';

    // Engines thrusters
    const tCount = 4;
    ctx.fillStyle = isAngry ? '#ef4444' : '#f97316';
    for (let i = 0; i < tCount; i++) {
      const tx = -50 + i * 33;
      const fH = 15 + Math.sin(Date.now() * 0.05 + i) * 12;
      ctx.fillRect(tx - 6, -b.height / 2, 12, fH);
    }

    // Massive armored hull
    ctx.fillStyle = '#334155'; // dark heavy steel
    ctx.beginPath();
    ctx.moveTo(0, b.height / 2); // giant nose
    ctx.lineTo(b.width / 2, b.height / 12); // wing right mid
    ctx.lineTo(b.width / 2 - 10, -b.height / 2);
    ctx.lineTo(-b.width / 2 + 10, -b.height / 2);
    ctx.lineTo(-b.width / 2, b.height / 12); // wing left mid
    ctx.closePath();
    ctx.fill();

    // Glowing energy decals
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-b.width / 4, -b.height / 6);
    ctx.lineTo(0, b.height / 3);
    ctx.lineTo(b.width / 4, -b.height / 6);
    ctx.stroke();

    // Central core reactor
    const pulseRadius = 12 + Math.sin(Date.now() * 0.02) * 4;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff'; // hot white center
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Weapon Turrets flanking
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-45, 10, 16, 20);
    ctx.fillRect(29, 10, 16, 20);

    ctx.fillStyle = b.color;
    ctx.fillRect(-41, 24, 8, 12);
    ctx.fillRect(33, 24, 8, 12);

    // Boss Active energy shields
    if (b.shield > 0) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.width * 0.7, b.height * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawLaserBolt = (ctx: CanvasRenderingContext2D, b: Bullet) => {
    ctx.save();
    ctx.translate(b.x, b.y);

    if (b.type === 'BLASTER') {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // small heat glow tail
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, b.isEnemy ? -4 : 4, b.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

    } else if (b.type === 'LASER') {
      // glowing neon spear
      const gradient = ctx.createLinearGradient(0, -12, 0, 12);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, b.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(-b.radius, -12, b.radius * 2, 24);

    } else if (b.type === 'ROCKET') {
      // Rocket chassis
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4, -8, 8, 16);

      // warhead cone
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(0, -15);
      ctx.lineTo(4, -8);
      ctx.closePath();
      ctx.fill();

      // rocket fins
      ctx.fillStyle = '#475569';
      ctx.fillRect(-6, 4, 2, 4);
      ctx.fillRect(4, 4, 2, 4);

    } else if (b.type === 'RAILGUN') {
      // Big plasma charge lightning sphere
      const rad = b.radius + Math.sin(Date.now() * 0.08) * 3;
      ctx.fillStyle = 'rgba(153, 51, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // jagged electric bolts surrounding
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rx = Math.cos(angle) * rad;
        const ry = Math.sin(angle) * rad;
        ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawUpgradeBox = (ctx: CanvasRenderingContext2D, u: Upgrade) => {
    ctx.save();
    ctx.translate(u.x, u.y);

    const spin = u.pulseTimer;
    ctx.rotate(spin);

    let boxColor = '#10b981'; // default green healing
    let icon = '+';

    if (u.type === 'SHIELD') {
      boxColor = '#3b82f6'; // blue shield
      icon = 'S';
    } else if (u.type === 'BLASTER') {
      boxColor = WEAPONS_CONFIG.BLASTER.color;
      icon = 'P';
    } else if (u.type === 'LASER') {
      boxColor = WEAPONS_CONFIG.LASER.color;
      icon = 'L';
    } else if (u.type === 'ROCKET') {
      boxColor = WEAPONS_CONFIG.ROCKET.color;
      icon = 'R';
    } else if (u.type === 'RAILGUN') {
      boxColor = WEAPONS_CONFIG.RAILGUN.color;
      icon = 'E'; // electrified
    }

    // Floating glowing box aura
    const bloom = u.size + Math.sin(Date.now() * 0.01) * 3;
    ctx.fillStyle = boxColor;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(-bloom, -bloom, bloom * 2, bloom * 2);
    ctx.globalAlpha = 1.0;

    // Solid inner pixel container
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#020410';
    ctx.fillRect(-u.size, -u.size, u.size * 2, u.size * 2);
    ctx.strokeRect(-u.size, -u.size, u.size * 2, u.size * 2);

    // Icon text centered inside box
    ctx.rotate(-spin); // make text stay upright
    ctx.fillStyle = boxColor;
    ctx.font = '900 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, pt: Particle) => {
    ctx.save();
    const lifeRatio = 1 - (pt.life / pt.maxLife);

    if (pt.type === 'spark') {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = lifeRatio;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    } else if (pt.type === 'smoke') {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = lifeRatio * 0.4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 + (1 - lifeRatio)), 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.type === 'ring') {
      // expanding hollow ring shockwave
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = lifeRatio * 0.7;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - lifeRatio), 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.type === 'electric') {
      // jagged line connecting coordinates
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = pt.size * lifeRatio;
      ctx.globalAlpha = lifeRatio;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + pt.vx, pt.y + pt.vy);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-[3/2] max-w-4xl mx-auto rounded-xl overflow-hidden border-4 border-zinc-800 bg-[#08080c] shadow-[0_0_50px_rgba(34,211,238,0.04)]">
      {/* Dynamic Pixelated Canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="w-full h-full block bg-[radial-gradient(circle_at_center,_#121218_0%,_#08080c_100%)]"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Arcade Visual HUD Panel */}
      <div className="absolute top-3 left-4 right-4 flex justify-between pointer-events-none font-mono text-xs select-none">
        
        {/* Left Stats Side */}
        <div className="flex flex-col gap-1.5 p-2 bg-[#0c0c14]/90 border border-zinc-800 rounded-lg backdrop-blur-sm shadow-md pointer-events-auto">
          {/* Health and Shield bar blocks */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-500 font-bold w-12 uppercase tracking-wider">HULL</span>
            <div className="w-24 bg-[#08080c] border border-zinc-800 h-3 rounded overflow-hidden flex">
              <div className="bg-gradient-to-r from-red-600 to-emerald-500 h-full transition-all duration-150" style={{ width: `${uiHp}%` }} />
            </div>
            <span className="text-zinc-300 text-[10px] font-bold w-8">{uiHp}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 font-bold w-12 uppercase tracking-wider">SHIELD</span>
            <div className="w-24 bg-[#08080c] border border-zinc-800 h-3 rounded overflow-hidden">
              <div className="bg-blue-500 h-full transition-all duration-150" style={{ width: `${uiShield}%` }} />
            </div>
            <span className="text-zinc-300 text-[10px] font-bold w-8">{uiShield}</span>
          </div>
        </div>

        {/* Level & Score Center */}
        <div className="flex flex-col items-center justify-center p-2 px-4 bg-[#0c0c14]/90 border border-zinc-800 rounded-lg backdrop-blur-sm shadow-md text-center pointer-events-auto">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">STAGE 0{uiLevel}</div>
          <div className="text-xl font-black text-yellow-400 tracking-wider font-mono">{uiScore.toLocaleString()}</div>
        </div>

        {/* Right Active Weapon Upgrade Level Slot */}
        <div className="flex items-center gap-3 p-2 bg-[#0c0c14]/90 border border-zinc-800 rounded-lg backdrop-blur-sm shadow-md pointer-events-auto">
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">WEAPON SYSTEM</span>
            <span className="text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">{WEAPONS_CONFIG[uiWeapon].name}</span>
          </div>
          
          <div className="flex gap-1">
            {[1, 2, 3].map((starIdx) => {
              const active = uiWeaponLevels[uiWeapon] >= starIdx;
              return (
                <Zap
                  key={starIdx}
                  className={`w-4 h-4 ${active ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-800'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Boss Active Duel Header Alert Banner */}
      {isBossActive && bossHpPercent !== null && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-md p-2 bg-[#0c0c14]/95 border-2 border-red-600/40 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.15)] backdrop-blur-md pointer-events-auto flex flex-col gap-1 text-center animate-fade-in select-none">
          <div className="flex justify-center items-center gap-1.5 text-xs font-black text-red-500 uppercase tracking-widest">
            <AlertCircle className="w-4 h-4 animate-pulse text-red-500" />
            WARNING: BOSS DETECTED
            <AlertCircle className="w-4 h-4 animate-pulse text-red-500" />
          </div>
          <div className="text-sm font-black tracking-widest text-white uppercase">{bossName}</div>
          <div className="w-full bg-[#08080c] border border-zinc-800 h-2.5 rounded-full overflow-hidden mt-0.5">
            <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-500 h-full transition-all duration-150" style={{ width: `${bossHpPercent}%` }} />
          </div>
        </div>
      )}

      {/* Gamepad Connected Visual Badge Indicator */}
      {isGamepadConnected && (
        <div className="absolute bottom-3 right-4 p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 tracking-wider pointer-events-auto uppercase shadow-sm animate-pulse">
          <Zap className="w-3 h-3 fill-emerald-400" />
          GAMEPAD CONNECTED
        </div>
      )}

    </div>
  );
}
