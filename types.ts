
export enum Rarity {
  Normal = 'Normal',
  Magic = 'Magic',
  Rare = 'Rare',
  Unique = 'Unique',
}

export enum ItemSlot {
  Helm = 'Helm',
  Body = 'Body',
  Gloves = 'Gloves',
  Boots = 'Boots',
  Weapon = 'Weapon',
  Ring = 'Ring', 
}

export type Language = 'en' | 'zh';

export interface Settings {
  language: Language;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface StatModifier {
  stat: string;
  value: number;
  isPercentage: boolean;
  text: string;
}

export interface TierDefinition {
    tier: number;
    name: string;
    nameZh: string;
    min: number;
    max: number;
}

export interface AffixTemplate {
    stat: string;
    isPct: boolean;
    text: string;
    tiers: TierDefinition[];
    allowedSlots?: ItemSlot[]; 
}

export interface Affix {
  name: string;
  nameZh?: string; 
  type: 'prefix' | 'suffix';
  tier?: number; // 1 is highest, 5 is lowest
  modifiers: StatModifier[];
}

export interface Item {
  id: string;
  name: string;
  nameZh?: string; 
  baseName: string;
  baseNameZh?: string; 
  slot: ItemSlot;
  rarity: Rarity;
  image: string; // Can be an Emoji OR an Asset Key
  assetKey?: string; // Specific key for image loader
  implicit?: StatModifier;
  prefixes: Affix[];
  suffixes: Affix[];
  uniqueEffect?: string; 
  modifiers?: StatModifier[];
  levelReq: number;
}

export interface WorldItem {
  id: string;
  x: number;
  y: number;
  item: Item;
  frameCreated: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface SkillStats {
    damage?: number;
    cooldown?: number;
    duration?: number;
    range?: number;
    projectileCount?: number;
    area?: number;
    projectileSpeed?: number;
}

export interface Skill {
  id: string;
  name: string;
  nameZh?: string; 
  description: string;
  descriptionZh?: string; 
  
  // Base Stats
  cooldown: number; 
  damage: number;
  duration?: number;
  range?: number;
  projectileSpeed?: number;
  projectileCount?: number;
  
  // Visuals
  color: string;
  icon: string; // Emoji or fallback
  assetKey?: string; // Key for image loader
  
  // State
  level: number;
  maxLevel: number;
  type: 'projectile' | 'aura' | 'aoe' | 'kinetic' | 'orbit' | 'basic' | 'melee';

  // Progression Data for Encyclopedia/LevelUp
  statsPerLevel?: SkillStats;
  masteryEffect?: string;
  masteryEffectZh?: string;
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  // For Gems
  xpValue?: number;
}

export type EnemyType = 'zombie' | 'skeleton' | 'bat' | 'golem' | 'boss_valos' | 'doppelganger' | 'prism';

export interface EnemyAffix {
    name: string;
    nameZh: string;
    statMod: Partial<Enemy>; // Modifications to base stats
    colorMod?: string;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: EnemyType;
  isBoss?: boolean; // For HP Bar Logic
  isElite?: boolean; // New flag for Rare Mobs (Not Bosses)
  hitFlash: number; 
  animationOffset: number;
  // Slow Mechanics
  slowed?: boolean;
  slowTimer?: number; 
  // Affixes
  affixes: EnemyAffix[];
  // Boss Mechanics
  phase?: number;
  mirrorStack?: number;
  prismIds?: number[];
  attackTimer?: number;
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  duration: number;
  penetration: number;
  sourceSkillId: string;
  isEnemy?: boolean; // True if it hurts the player
  // Orbit Mechanics
  isOrbit?: boolean;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitIndex?: number; // For golden angle distribution
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  life: number;
  isCrit: boolean;
}

export interface VisualEffect {
  id: string;
  type: 'explosion' | 'lightning' | 'hit' | 'screen_dim' | 'melee_slash' | 'death_poof' | 'laser_beam' | 'cage_polygon';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  color: string;
  duration: number;
  maxDuration: number;
  scale?: number;
  rotation?: number;
  points?: {x: number, y: number}[]; // For complex shapes like polygon
  isEnemy?: boolean;
}

export interface PlayerStats {
  maxHp: number;
  hp: number;
  speed: number;
  pickupRange: number;
  damageMultiplier: number;
  attackSpeedMultiplier: number;
  critChance: number;
  critMultiplier: number;
  armor: number;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  time: number; 
  killCount: number;
}
