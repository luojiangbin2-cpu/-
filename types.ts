
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
export type Element = 'physical' | 'cold' | 'lightning' | 'void';

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
  isPickedUp?: boolean; // New flag for animation
}

export interface Camera {
  x: number;
  y: number;
}

// --- SKILL TREE TYPES ---

export interface SkillNodeEffect {
    damage?: number; // Flat or % based on context
    cooldown?: number; // In frames (or negative frames)
    area?: number; // %
    duration?: number; // frames
    projectileCount?: number;
    projectileSpeed?: number;
    range?: number;
    
    // Mechanics
    pierce?: number;
    critChance?: number;
    
    // Triggers / Ultimates
    unlockAugment?: string; // ID of the augment (e.g. 'aug_coc')
}

export interface SkillNode {
    id: string;
    name: string;
    nameZh: string;
    description: string;
    descriptionZh: string;
    icon: string; // emoji or key
    
    // Grid Position for UI (0-4 columns, 0-6 rows)
    col: number; 
    row: number;
    
    maxPoints: number;
    prerequisites: string[]; // IDs of nodes that must be maxed or have points
    
    statsPerPoint: SkillNodeEffect;
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
  level: number; // Represents "Rank" or "Unlocked status"
  maxLevel: number;
  type: 'projectile' | 'aura' | 'aoe' | 'kinetic' | 'orbit' | 'basic' | 'melee';
  
  // Mechanics
  element?: Element;
  isAugment?: boolean; // Tactical Augment (Purple Card)
  triggerSkillId?: string; // For augments, what skill they trigger

  // SKILL TREE DATA
  tree: SkillNode[]; // The definition of the tree
  allocatedPoints: Record<string, number>; // { nodeId: pointsInvested }
  
  // Dynamic Calcs
  statsPerLevel?: SkillStats; // Keeping for compatibility, but mainly using tree now
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

export interface StatusEffect {
    type: 'frozen' | 'shocked' | 'bleed';
    duration: number; // in frames
    value?: number; // e.g. bleed damage per tick
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
  
  // Slow Mechanics (Legacy, migrating to Status)
  slowTimer?: number; 
  
  // New Status System
  statuses: {
      frozen?: number; // duration
      shocked?: number; // duration
      bleed?: { duration: number, damage: number };
  };

  // Affixes
  affixes: EnemyAffix[];
  // Boss Mechanics
  phase?: number;
  mirrorStack?: number;
  prismIds?: number[];
  attackTimer?: number;

  // HIT THROTTLING (Fixes BV lag)
  immuneTimers: Record<string, number>; // Key: SkillID, Value: Frames until next hit
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  duration: number;
  penetration: number;
  sourceSkillId: string;
  element?: Element; // Passed from skill
  isEnemy?: boolean; // True if it hurts the player
  // Orbit Mechanics
  isOrbit?: boolean;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitIndex?: number; // For golden angle distribution
  
  // For Blade Storm Augment
  stationary?: boolean;
}

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  life: number;
  isCrit: boolean;
  isReaction?: boolean; // Text styling for reaction dmg
  text?: string; // Override value with text (e.g. "SHATTER")
}

export interface VisualEffect {
  id: string;
  type: 'explosion' | 'lightning' | 'hit' | 'screen_dim' | 'melee_slash' | 'death_poof' | 'laser_beam' | 'cage_polygon' | 'shatter_nova' | 'thermal_burst';
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
  
  // Specific Elemental Multipliers (For Equipment depth)
  physDamageMult: number;
  coldDamageMult: number;
  lightningDamageMult: number;
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
  
  // Skill System
  skillPoints: number; // Points available to spend in trees
  skillSlotsUnlocked: number; // How many active skills can we have?
  
  // Boss Logic
  nextBossThreshold: number;
  bossKillCount: number;

  // Stats Tracking
  damageDealtBySkill: Record<string, number>;
  killCounts: Record<string, number>;
}
