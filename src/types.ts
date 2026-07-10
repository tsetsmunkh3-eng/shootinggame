/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeaponType = 'BLASTER' | 'LASER' | 'ROCKET' | 'RAILGUN';

export interface WeaponStats {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // millisecond delay between shots
  color: string;
  description: string;
}

export const WEAPONS_CONFIG: Record<WeaponType, WeaponStats> = {
  BLASTER: {
    type: 'BLASTER',
    name: 'Plasma Blaster',
    damage: 15,
    fireRate: 200,
    color: '#ff4444',
    description: 'Rapid-fire energy bolts. Reliable and balanced.',
  },
  LASER: {
    type: 'LASER',
    name: 'Quantum Laser',
    damage: 5, // low damage but ticks extremely fast
    fireRate: 50,
    color: '#00ffff',
    description: 'Continuous concentrated heat beam that pierces through targets.',
  },
  ROCKET: {
    type: 'ROCKET',
    name: 'Homing Rocket',
    damage: 40,
    fireRate: 600,
    color: '#ffaa00',
    description: 'Fires tracking missiles that target the nearest threat.',
  },
  RAILGUN: {
    type: 'RAILGUN',
    name: 'Arc Railgun',
    damage: 75,
    fireRate: 1000,
    color: '#9933ff',
    description: 'High-voltage electric bolt that chains damage to multiple enemies.',
  },
};

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: WeaponType;
  damage: number;
  color: string;
  radius: number;
  angle?: number;
  targetId?: string; // for rockets
  isEnemy: boolean;
  chainCount?: number; // for railgun chain lightning
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: 'scout' | 'bomber' | 'shield' | 'kamikaze';
  width: number;
  height: number;
  color: string;
  shootCooldown: number;
  scoreValue: number;
  patternTimer: number;
  phase?: number;
}

export interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  shootCooldown: number;
  state: 'entering' | 'active' | 'angry' | 'charging' | 'shielded' | 'defeated';
  stateTimer: number;
  shield: number;
  maxShield: number;
  color: string;
  name: string;
  level: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'smoke' | 'shockwave' | 'ring' | 'electric';
}

export interface Upgrade {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: WeaponType | 'HEAL' | 'SHIELD';
  size: number;
  pulseTimer: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  levelReached: number;
  weaponUsed: WeaponType;
  date: string;
}

export type GameScene = 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY' | 'LEADERBOARD' | 'HELP';

export interface GameStats {
  score: number;
  enemiesKilled: number;
  damageDealt: number;
  timePlayed: number; // in seconds
  currentLevel: number;
}
