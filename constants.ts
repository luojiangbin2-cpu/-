

import { ItemSlot, Rarity, Skill, Settings, AffixTemplate, EnemyAffix, SkillNode } from './types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const MAX_SKILL_LEVEL = 20; // Increased for tree depth
export const BOSS_SPAWN_KILLS = 300; 
export const BOSS_RESPAWN_KILLS = 300; 

// Levels where the player unlocks a NEW Active Skill Slot
// Removed Level 1 because we auto-grant Basic Attack now
export const SKILL_UNLOCK_LEVELS = [3, 6, 12, 20]; 

// --- 资源替换清单 / ASSET REPLACEMENT LIST ---
export const GAME_ASSETS: Record<string, string> = {
    // 1. 环境 / Environment
    'floor_tile': "", 

    // 2. 角色 / Character
    'player_idle': "", 

    // 3. 怪物 / Enemies
    'enemy_zombie': "", 
    'enemy_skeleton': "", 
    'enemy_bat': "", 
    'enemy_golem': "", 
    'boss_valos': "", 
    'enemy_prism': "",
    'enemy_doppelganger': "",

    // 4. 技能特效 / Skill VFX
    'proj_basic': "", 
    'proj_fireball': "", 
    'proj_arrow': "", 
    'vfx_explosion': "", 
    'skill_blade_vortex': "", 
    
    // 5. 掉落物 / Drops
    'gem_xp': "", 
    
    // 6. 技能图标 / Skill Icons (UI)
    'icon_skill_basic': "",
    'icon_skill_magma': "",
    'icon_skill_blade': "",
    'icon_skill_arc': "",
    'icon_skill_kinetic': "",
    
    // Augment Icons 
    'icon_aug_coc': "",
    'icon_aug_bladestorm': "",
    'icon_aug_static': "",

    // 7. 装备图标 (UI & Drop) / Equipment Icons
    'icon_weapon_sword': "",
    'icon_weapon_axe': "",
    'icon_weapon_mace': "",
    'icon_helm_sallet': "", 
    'icon_body_astral': "",
    'icon_body_tabula': "", 
    'icon_gloves_spiked': "",
    'icon_boots_titan': "",
    'icon_ring_diamond': "",
    'icon_ring_headhunter': "", 
};

export const DEFAULT_SETTINGS: Settings = {
  language: 'zh',
  masterVolume: 0.5,
  musicVolume: 0.4,
  sfxVolume: 0.6,
};

export const STAT_TRANSLATIONS: Record<string, { en: string, zh: string }> = {
  maxHp: { en: "Maximum Life", zh: "最大生命值" },
  damageMultiplier: { en: "Global Damage", zh: "全局伤害" },
  attackSpeedMultiplier: { en: "Attack Speed", zh: "攻击速度" },
  critChance: { en: "Critical Strike Chance", zh: "暴击率" },
  speed: { en: "Movement Speed", zh: "移动速度" },
  armor: { en: "Armor", zh: "护甲" },
  physDamageMult: { en: "Physical Damage", zh: "物理伤害" },
  coldDamageMult: { en: "Cold Damage", zh: "冰霜伤害" },
  lightningDamageMult: { en: "Lightning Damage", zh: "闪电伤害" }
};

export const SKILL_STAT_LABELS: Record<string, { en: string, zh: string }> = {
    damage: { en: "Damage", zh: "伤害" },
    cooldown: { en: "Cooldown", zh: "冷却" },
    duration: { en: "Duration", zh: "持续时间" },
    range: { en: "Range", zh: "范围" },
    projectileCount: { en: "Projectiles", zh: "投射物数量" },
    area: { en: "Area Scale", zh: "范围系数" },
    projectileSpeed: { en: "Proj. Speed", zh: "飞行速度" }
};

export const ENEMY_NAME_TRANSLATIONS: Record<string, { en: string, zh: string }> = {
    'enemy_zombie': { en: "Zombie", zh: "腐臭僵尸" },
    'enemy_skeleton': { en: "Skeleton", zh: "骷髅射手" },
    'enemy_bat': { en: "Bat", zh: "吸血蝙蝠" },
    'enemy_golem': { en: "Golem", zh: "岩石傀儡" },
    'boss_valos': { en: "Valos", zh: "瓦洛斯" },
    'enemy_doppelganger': { en: "Doppelgänger", zh: "暗影分身" },
    'enemy_prism': { en: "Prism", zh: "虚空棱镜" }
};

export const UNIQUE_EFFECT_TRANSLATIONS: Record<string, { en: string, zh: string }> = {
  'Simple Robe': { 
      en: "+50% Experience Gain, but -20% Max Life", 
      zh: "+50% 经验获取，但 -20% 最大生命" 
  },
  'Leather Belt': { 
      en: "Gain damage and size on kill", 
      zh: "击杀敌人时获得伤害与体型提升" 
  },
  'Rusted Axe': {
      en: "Attacks cause explosions on hit",
      zh: "攻击命中时引发爆炸"
  },
  'Carving Knife': {
      en: "100% Critical Strike Chance at Full Health",
      zh: "满血时 100% 暴击率"
  },
  'Driftwood Maul': {
      en: "Hits chain lightning to nearby enemies",
      zh: "攻击会向周围敌人弹射闪电"
  }
};

export const TRANSLATIONS = {
  en: {
    startGame: "Enter the Abyss",
    tagline: "Endless hordes. Infinite power. No escape.",
    loading: "Loading Assets...",
    resurrect: "Resurrect",
    youDied: "YOU DIED",
    survived: "Survived",
    level: "Level",
    paused: "PAUSED",
    inventory: "Inventory",
    equipment: "Equipment",
    stats: "Stats",
    maxLife: "Max Life",
    physDmg: "Phys Dmg",
    critChance: "Crit Chance",
    moveSpeed: "Move Speed",
    atkSpeed: "Atk Speed",
    sort: "Sort Rarity",
    trash: "Trash Item",
    clickToEquip: "Left Click to Equip. Shift + Click to Trash.",
    uniqueInfo: "Unique items have special glowing effects.",
    requiresLevel: "Requires Level",
    implicit: "(Implicit)",
    settings: "Settings",
    language: "Language",
    masterVol: "Master Volume",
    musicVol: "Music Volume",
    sfxVol: "SFX Volume",
    close: "Close",
    levelUp: "LEVEL UP!",
    choosePower: "Unlock New Skill",
    skillTree: "Skill Specialization",
    pointsAvailable: "Points Available",
    allocated: "Allocated",
    type: "Type",
    controlHint: "WASD to Move | 'I' for Inventory | 'P' to Pause",
    currentlyEquipped: "Currently Equipped",
    encyclopedia: "Encyclopedia",
    monsterAffixes: "Monster Affixes",
    skillDetails: "Skill Details",
    mastery: "MASTERY Reached!",
    bossEncounter: "BOSS ENCOUNTER",
    bossName: "Valos, The Prism Monarch",
    bossTitle: "Void Refractor",
    runSummary: "Run Summary",
    kills: "Kills",
    damageDealt: "Damage Dealt",
    restart: "Return to Menu",
    noKills: "No kills recorded...",
    pacifist: "Pacifist run?",
    synergy: "Synergy",
    augment: "Tactical Augment",
    reaction_shatter: "SHATTER!",
    reaction_superconduct: "ZAP!",
    reaction_thermal: "MELT!"
  },
  zh: {
    startGame: "进入深渊",
    tagline: "无尽的尸潮，无限的力量，无路可逃。",
    loading: "正在加载资源...",
    resurrect: "复活",
    youDied: "你挂了",
    survived: "生存时间",
    level: "等级",
    paused: "暂停",
    inventory: "背包",
    equipment: "装备",
    stats: "属性面板",
    maxLife: "最大生命",
    physDmg: "物理伤害",
    critChance: "暴击率",
    moveSpeed: "移动速度",
    atkSpeed: "攻击速度",
    sort: "按稀有度排序",
    trash: "丢弃物品",
    clickToEquip: "左键点击装备 | Shift+左键 丢弃物品",
    uniqueInfo: "暗金装备拥有特殊光效。",
    requiresLevel: "需求等级",
    implicit: "(基底)",
    settings: "设置",
    language: "语言 / Language",
    masterVol: "主音量",
    musicVol: "音乐音量",
    sfxVol: "音效音量",
    close: "关闭",
    levelUp: "等级提升!",
    choosePower: "解锁新技能",
    skillTree: "技能专精",
    pointsAvailable: "可用技能点",
    allocated: "已投入",
    type: "类型",
    controlHint: "WASD 移动 | 'I' 打开背包 | 'P' 暂停",
    currentlyEquipped: "当前已装备",
    encyclopedia: "游戏百科",
    monsterAffixes: "怪物词缀",
    skillDetails: "技能图鉴",
    mastery: "技能精通 (MAX)",
    bossEncounter: "BOSS 遭遇战",
    bossName: "折光君主·瓦洛斯",
    bossTitle: "虚空折射者 | 破碎维度的守门人",
    runSummary: "本次探险统计",
    kills: "击杀数",
    damageDealt: "技能伤害占比",
    restart: "返回菜单",
    noKills: "居然没有击杀记录...",
    pacifist: "和平主义者？",
    synergy: "技能连携",
    augment: "战术插件",
    reaction_shatter: "碎冰!",
    reaction_superconduct: "超导!",
    reaction_thermal: "热休克!"
  }
};

export const BASE_STATS = {
  maxHp: 150,
  speed: 3.5,
  pickupRange: 120,
  damageMultiplier: 1,
  attackSpeedMultiplier: 1,
  critChance: 0.05,
  critMultiplier: 1.5,
  armor: 0,
  physDamageMult: 1,
  coldDamageMult: 1,
  lightningDamageMult: 1
};

export const XP_SCALING_FACTOR = 1.25;
export const TIME_SCALING_FACTOR = 0.2; 
export const GEM_BASE_XP = 10;
export const GEM_TIERS = {
    blue: { xpMult: 1, color: '#60a5fa' },
    gold: { xpMult: 2, color: '#facc15' },
    purple: { xpMult: 5, color: '#a855f7' }
};

export const KINETIC_MAX_CHARGE = 300; 
export const KINETIC_CHARGE_PER_PIXEL = 0.2; 
export const KINETIC_RANGE = 350; 

export const ENEMY_TYPES = {
    zombie: { hp: 25, speed: 1.2, color: '#4c5c48', width: 28, damage: 8, assetKey: 'enemy_zombie' },
    skeleton: { hp: 18, speed: 1.8, color: '#d1d5db', width: 22, damage: 12, assetKey: 'enemy_skeleton' },
    bat: { hp: 12, speed: 3.0, color: '#312e81', width: 18, damage: 5, assetKey: 'enemy_bat' },
    golem: { hp: 120, speed: 0.7, color: '#57534e', width: 50, damage: 25, assetKey: 'enemy_golem' },
    boss_valos: { hp: 15000, speed: 1.5, color: '#8b5cf6', width: 60, damage: 40, assetKey: 'boss_valos' },
    prism: { hp: 5000, speed: 0, color: '#a78bfa', width: 30, damage: 0, assetKey: 'enemy_prism' },
    doppelganger: { hp: 5000, speed: 1.2, color: '#4c1d95', width: 30, damage: 30, assetKey: 'enemy_doppelganger' } // Reduced speed from 3.5 to 1.2
};

// MONSTER AFFIXES (Appears over time)
export const MONSTER_AFFIXES: EnemyAffix[] = [
    { name: "Aggressive", nameZh: "好战", statMod: { speed: 1.3, damage: 1.2 } },
    { name: "Tanky", nameZh: "重甲", statMod: { maxHp: 1.5, hp: 1.5 } },
    { name: "Giant", nameZh: "巨大", statMod: { width: 1.4, maxHp: 1.3 } },
    { name: "Deadly", nameZh: "致命", statMod: { damage: 1.5 } },
    { name: "Hasted", nameZh: "极速", statMod: { speed: 1.6 } },
    { name: "Regenerating", nameZh: "再生", statMod: { maxHp: 1.2 } }, 
    { name: "Vampiric", nameZh: "吸血", statMod: { damage: 1.2 } },
    { name: "Armored", nameZh: "硬皮", statMod: { maxHp: 1.2 } }
];

// --- SKILL TREES ---

const BASIC_TREE: SkillNode[] = [
    { id: 'dmg_1', name: 'Sharpness', nameZh: '锋利', description: 'Increases damage', descriptionZh: '增加基础伤害', icon: '⚔️', col: 2, row: 0, maxPoints: 5, prerequisites: [], statsPerPoint: { damage: 15 } },
    { id: 'spd_1', name: 'Agility', nameZh: '灵巧', description: 'Reduces cooldown', descriptionZh: '减少攻击冷却', icon: '🍃', col: 2, row: 1, maxPoints: 5, prerequisites: ['dmg_1'], statsPerPoint: { cooldown: -3 } },
    { id: 'area_1', name: 'Reach', nameZh: '延展', description: 'Increases area', descriptionZh: '增加攻击范围', icon: '📏', col: 1, row: 2, maxPoints: 3, prerequisites: ['spd_1'], statsPerPoint: { area: 0.2 } },
    { id: 'crit_1', name: 'Precision', nameZh: '弱点识破', description: 'Increases crit chance', descriptionZh: '增加暴击几率', icon: '🎯', col: 3, row: 2, maxPoints: 3, prerequisites: ['spd_1'], statsPerPoint: { critChance: 0.05 } },
    { id: 'aug_coc', name: 'Cast On Crit', nameZh: '暴击咏唱', description: 'Critical hits trigger Ice Bolt', descriptionZh: '暴击触发寒冰箭', icon: '✨', col: 2, row: 3, maxPoints: 1, prerequisites: ['crit_1'], statsPerPoint: { unlockAugment: 'aug_coc' } }
];

const ICE_TREE: SkillNode[] = [
    { id: 'dmg_1', name: 'Frostbite', nameZh: '冻伤', description: 'Increases damage', descriptionZh: '增加冰霜伤害', icon: '❄️', col: 2, row: 0, maxPoints: 5, prerequisites: [], statsPerPoint: { damage: 10 } },
    { id: 'count_1', name: 'Splinter', nameZh: '分裂', description: 'Additional projectiles', descriptionZh: '额外投射物', icon: '🏹', col: 1, row: 1, maxPoints: 3, prerequisites: ['dmg_1'], statsPerPoint: { projectileCount: 1 } },
    { id: 'dur_1', name: 'Permafrost', nameZh: '永冻', description: 'Freeze duration', descriptionZh: '冻结时间延长', icon: '🧊', col: 3, row: 1, maxPoints: 3, prerequisites: ['dmg_1'], statsPerPoint: { duration: 30 } },
    { id: 'aug_storm', name: 'Blade Storm', nameZh: '剑刃风暴', description: 'Hits summon Blade Vortex', descriptionZh: '命中生成刀刃漩涡', icon: '🌪️', col: 2, row: 3, maxPoints: 1, prerequisites: ['count_1', 'dur_1'], statsPerPoint: { unlockAugment: 'aug_bladestorm' } }
];

const BV_TREE: SkillNode[] = [
    { id: 'dur_1', name: 'Momentum', nameZh: '动量', description: 'Increases duration', descriptionZh: '增加持续时间', icon: '⏳', col: 2, row: 0, maxPoints: 5, prerequisites: [], statsPerPoint: { duration: 60 } },
    { id: 'spd_1', name: 'Centrifuge', nameZh: '离心力', description: 'Spin speed', descriptionZh: '旋转速度', icon: '🔄', col: 3, row: 1, maxPoints: 5, prerequisites: ['dur_1'], statsPerPoint: { projectileSpeed: 0.1 } },
    { id: 'count_1', name: 'More Blades', nameZh: '刀丛', description: 'More blades', descriptionZh: '更多刀刃', icon: '⚔️', col: 1, row: 1, maxPoints: 3, prerequisites: ['dur_1'], statsPerPoint: { projectileCount: 1 } },
    { id: 'area_1', name: 'Vortex', nameZh: '漩涡', description: 'Radius', descriptionZh: '旋转半径', icon: '⭕', col: 2, row: 2, maxPoints: 5, prerequisites: ['spd_1', 'count_1'], statsPerPoint: { range: 10 } }
];

const ARC_TREE: SkillNode[] = [
    { id: 'dmg_1', name: 'Voltage', nameZh: '高压', description: 'Increases damage', descriptionZh: '增加伤害', icon: '⚡', col: 2, row: 0, maxPoints: 5, prerequisites: [], statsPerPoint: { damage: 12 } },
    { id: 'range_1', name: 'Conductivity', nameZh: '传导', description: '弹射范围', descriptionZh: '增加弹射范围', icon: '🌐', col: 1, row: 1, maxPoints: 5, prerequisites: ['dmg_1'], statsPerPoint: { range: 40 } },
    { id: 'cd_1', name: 'Frequency', nameZh: '高频', description: 'Reduces cooldown', descriptionZh: '减少冷却', icon: '⏱️', col: 3, row: 1, maxPoints: 5, prerequisites: ['dmg_1'], statsPerPoint: { cooldown: -5 } },
    { id: 'aug_static', name: 'Static Discharge', nameZh: '静电释放', description: 'Kinetic triggers Arcs', descriptionZh: '动能释放触发闪电链', icon: '🌩️', col: 2, row: 3, maxPoints: 1, prerequisites: ['range_1', 'cd_1'], statsPerPoint: { unlockAugment: 'aug_static' } }
];

const KINETIC_TREE: SkillNode[] = [
    { id: 'area_1', name: 'Field', nameZh: '立场', description: 'Area of Effect', descriptionZh: '爆炸范围', icon: '💥', col: 2, row: 0, maxPoints: 5, prerequisites: [], statsPerPoint: { area: 20 } },
    { id: 'dmg_1', name: 'Overload', nameZh: '过载', description: 'Damage', descriptionZh: '伤害', icon: '💪', col: 1, row: 1, maxPoints: 5, prerequisites: ['area_1'], statsPerPoint: { damage: 20 } },
    { id: 'rate_1', name: 'Dynamo', nameZh: '发电机', description: 'Charge rate', descriptionZh: '充能速度', icon: '🏃', col: 3, row: 1, maxPoints: 3, prerequisites: ['area_1'], statsPerPoint: { cooldown: 0.1 } } // Cooldown reused for charge rate logic
];

export const BASIC_ATTACK_SKILL: Skill = {
    id: 'basic_attack',
    name: 'Moon Blade',
    nameZh: '月弧剑气',
    description: 'Unleash a crescent wave. Applies Bleed.',
    descriptionZh: '挥出白色弯月剑气。造成流血效果。',
    cooldown: 35, 
    damage: 60, 
    projectileSpeed: 0,
    projectileCount: 1,
    color: '#cbd5e1',
    icon: '🗡️',
    assetKey: 'icon_skill_basic',
    level: 1,
    maxLevel: MAX_SKILL_LEVEL,
    type: 'melee',
    element: 'physical',
    tree: BASIC_TREE,
    allocatedPoints: {}
};

// Skills
export const AVAILABLE_SKILLS: Skill[] = [
  BASIC_ATTACK_SKILL,
  {
    id: 'icebolt', 
    name: 'Ice Bolt',
    nameZh: '寒冰箭',
    description: 'Fires shards of ice. Freezes enemies.',
    descriptionZh: '发射冰凌。冻结敌人。',
    cooldown: 55,
    damage: 45, 
    projectileSpeed: 4.5, 
    projectileCount: 1,
    color: '#06b6d4', 
    icon: '❄️',
    assetKey: 'icon_skill_magma', 
    level: 0,
    maxLevel: MAX_SKILL_LEVEL,
    type: 'projectile',
    element: 'cold',
    tree: ICE_TREE,
    allocatedPoints: {}
  },
  {
    id: 'aura', 
    name: 'Blade Vortex',
    nameZh: '刀刃漩涡',
    description: 'Summons orbiting blades. Causes heavy Bleeding.',
    descriptionZh: '召唤旋转刀刃。造成严重流血。',
    cooldown: 60, 
    damage: 15,
    duration: 9999, 
    projectileCount: 2, 
    color: '#10b981',
    icon: '⚔️',
    assetKey: 'icon_skill_blade',
    level: 0,
    maxLevel: MAX_SKILL_LEVEL,
    type: 'orbit',
    element: 'physical',
    tree: BV_TREE,
    allocatedPoints: {}
  },
  {
    id: 'lightning',
    name: 'Arc',
    nameZh: '闪电链',
    description: 'Chains lightning. Shocks enemies.',
    descriptionZh: '弹射闪电链。感电敌人。',
    cooldown: 80,
    damage: 55,
    range: 380,
    color: '#3b82f6',
    icon: '⚡',
    assetKey: 'icon_skill_arc',
    level: 0,
    maxLevel: MAX_SKILL_LEVEL,
    type: 'aoe',
    element: 'lightning',
    tree: ARC_TREE,
    allocatedPoints: {}
  },
  {
    id: 'kinetic',
    name: 'Kinetic Capacitor',
    nameZh: '动能蓄电池',
    description: 'Charge by moving. Release massive Shock.',
    descriptionZh: '移动充能。释放强力感电场。',
    cooldown: 30,
    damage: 60, 
    range: KINETIC_RANGE,
    color: '#0ea5e9',
    icon: '🔋',
    assetKey: 'icon_skill_kinetic',
    level: 0,
    maxLevel: MAX_SKILL_LEVEL,
    type: 'kinetic',
    element: 'lightning',
    tree: KINETIC_TREE,
    allocatedPoints: {}
  },
];

export const ITEM_BASES = [
  { name: 'Broad Sword', nameZh: '阔剑', slot: ItemSlot.Weapon, icon: '⚔️', assetKey: 'icon_weapon_sword' },
  { name: 'Sallet', nameZh: '轻盔', slot: ItemSlot.Helm, icon: '🪖', assetKey: 'icon_helm_sallet' },
  { name: 'Astral Plate', nameZh: '星芒战铠', slot: ItemSlot.Body, icon: '🛡️', assetKey: 'icon_body_astral' },
  { name: 'Spiked Gloves', nameZh: '钉刺手套', slot: ItemSlot.Gloves, icon: '🧤', assetKey: 'icon_gloves_spiked' },
  { name: 'Titan Greaves', nameZh: '泰坦护胫', slot: ItemSlot.Boots, icon: '👢', assetKey: 'icon_boots_titan' },
  { name: 'Diamond Ring', nameZh: '钻石戒指', slot: ItemSlot.Ring, icon: '💍', assetKey: 'icon_ring_diamond' },
];

// DEFINING TIERS (T5 = Lowest, T1 = Highest)
export const PREFIX_TEMPLATES: AffixTemplate[] = [
  {
      stat: 'damageMultiplier', isPct: true, text: 'Increased Global Damage',
      tiers: [
          { tier: 5, name: "Heavy", nameZh: "沉重之", min: 0.10, max: 0.19 },
          { tier: 4, name: "Serrated", nameZh: "锯齿之", min: 0.20, max: 0.29 },
          { tier: 3, name: "Wicked", nameZh: "邪恶之", min: 0.30, max: 0.39 },
          { tier: 2, name: "Cruel", nameZh: "残暴之", min: 0.40, max: 0.49 },
          { tier: 1, name: "Tyrannical", nameZh: "暴君之", min: 0.50, max: 0.65 }
      ]
  },
  {
      stat: 'physDamageMult', isPct: true, text: 'Increased Physical Damage',
      tiers: [
          { tier: 5, name: "Sharpened", nameZh: "锐利之", min: 0.10, max: 0.19 },
          { tier: 4, name: "Honed", nameZh: "打磨之", min: 0.20, max: 0.29 },
          { tier: 3, name: "Razor", nameZh: "剃刀之", min: 0.30, max: 0.39 },
          { tier: 2, name: "Flaying", nameZh: "剥皮之", min: 0.40, max: 0.49 },
          { tier: 1, name: "Decapitator", nameZh: "断头之", min: 0.50, max: 0.70 }
      ]
  },
  {
      stat: 'coldDamageMult', isPct: true, text: 'Increased Cold Damage',
      tiers: [
          { tier: 5, name: "Chilled", nameZh: "寒冷之", min: 0.10, max: 0.19 },
          { tier: 4, name: "Frosted", nameZh: "结霜之", min: 0.20, max: 0.29 },
          { tier: 3, name: "Freezing", nameZh: "冻结之", min: 0.30, max: 0.39 },
          { tier: 2, name: "Glacial", nameZh: "冰河之", min: 0.40, max: 0.49 },
          { tier: 1, name: "Winter", nameZh: "凛冬之", min: 0.50, max: 0.70 }
      ]
  },
  {
      stat: 'lightningDamageMult', isPct: true, text: 'Increased Lightning Damage',
      tiers: [
          { tier: 5, name: "Static", nameZh: "静电之", min: 0.10, max: 0.19 },
          { tier: 4, name: "Sparking", nameZh: "火花之", min: 0.20, max: 0.29 },
          { tier: 3, name: "Arcing", nameZh: "弧光之", min: 0.30, max: 0.39 },
          { tier: 2, name: "Shocking", nameZh: "感电之", min: 0.40, max: 0.49 },
          { tier: 1, name: "Thunderous", nameZh: "雷霆之", min: 0.50, max: 0.70 }
      ]
  },
  {
      stat: 'maxHp', isPct: false, text: 'to Maximum Life',
      tiers: [
          { tier: 5, name: "Healthy", nameZh: "健康之", min: 10, max: 29 },
          { tier: 4, name: "Sanguine", nameZh: "多血之", min: 30, max: 49 },
          { tier: 3, name: "Stalwart", nameZh: "健壮之", min: 50, max: 69 },
          { tier: 2, name: "Robust", nameZh: "强健之", min: 70, max: 89 },
          { tier: 1, name: "Rapturous", nameZh: "狂喜之", min: 90, max: 120 }
      ]
  },
  {
      stat: 'armor', isPct: false, text: 'to Armor',
      tiers: [
          { tier: 5, name: "Thick", nameZh: "厚实之", min: 10, max: 20 },
          { tier: 4, name: "Reinforced", nameZh: "加固之", min: 21, max: 40 },
          { tier: 3, name: "Plated", nameZh: "板甲之", min: 41, max: 70 },
          { tier: 2, name: "Carapace", nameZh: "甲壳之", min: 71, max: 110 },
          { tier: 1, name: "Godly", nameZh: "神圣之", min: 111, max: 150 }
      ]
  }
];

export const SUFFIX_TEMPLATES: AffixTemplate[] = [
  {
      stat: 'speed', isPct: false, text: 'Movement Speed',
      allowedSlots: [ItemSlot.Boots], // ONLY ON BOOTS
      tiers: [
          { tier: 5, name: "of the Snail", nameZh: "之蜗牛", min: 0.1, max: 0.15 },
          { tier: 4, name: "of the Fox", nameZh: "之狐狸", min: 0.16, max: 0.25 },
          { tier: 3, name: "of the Falcon", nameZh: "之猎鹰", min: 0.26, max: 0.35 },
          { tier: 2, name: "of the Cheetah", nameZh: "之猎豹", min: 0.36, max: 0.50 },
          { tier: 1, name: "of the Wind", nameZh: "之疾风", min: 0.51, max: 0.70 }
      ]
  },
  {
      stat: 'attackSpeedMultiplier', isPct: true, text: 'Increased Attack Speed',
      tiers: [
          { tier: 5, name: "of Ease", nameZh: "之安逸", min: 0.05, max: 0.09 },
          { tier: 4, name: "of Haste", nameZh: "之极速", min: 0.10, max: 0.14 },
          { tier: 3, name: "of Speed", nameZh: "之速度", min: 0.15, max: 0.19 },
          { tier: 2, name: "of Velocity", nameZh: "之迅速", min: 0.20, max: 0.24 },
          { tier: 1, name: "of Alacrity", nameZh: "之敏捷", min: 0.25, max: 0.35 }
      ]
  },
  {
      stat: 'critChance', isPct: true, text: 'to Critical Strike Chance',
      tiers: [
          { tier: 5, name: "of Aim", nameZh: "之瞄准", min: 0.01, max: 0.02 },
          { tier: 4, name: "of Focus", nameZh: "之专注", min: 0.03, max: 0.04 },
          { tier: 3, name: "of Precision", nameZh: "之精准", min: 0.05, max: 0.07 },
          { tier: 2, name: "of Striking", nameZh: "之打击", min: 0.08, max: 0.10 },
          { tier: 1, name: "of Doom", nameZh: "之毁灭", min: 0.11, max: 0.15 }
      ]
  }
];

export const RARE_NAMES = {
    en: ['Vengeance', 'Storm', 'Honour', 'Soul', 'Blight', 'Rune'],
    zh: ['复仇', '风暴', '荣耀', '灵魂', '枯萎', '符文']
};
export const RARE_SUFFIXES = {
    en: ['Ward', 'Guard', 'Turn', 'Grasp', 'Stride', 'Hold'],
    zh: ['屏障', '守卫', '转变', '之握', '之步', '之牢']
};

export const UNIQUE_ITEMS = [
  {
    name: 'Tabula Rasa',
    nameZh: '无尽之衣',
    baseName: 'Simple Robe',
    baseNameZh: '简易长袍',
    slot: ItemSlot.Body,
    rarity: Rarity.Unique,
    image: '👕',
    assetKey: 'icon_body_tabula',
    uniqueEffect: '+50% Experience Gain, but -20% Max Life',
    modifiers: [
      { stat: 'maxHp', value: -20, isPercentage: false, text: 'Reduced Max Life' }, 
    ]
  },
  {
    name: 'Headhunter',
    nameZh: '猎首',
    baseName: 'Leather Belt', 
    baseNameZh: '皮革腰带',
    slot: ItemSlot.Ring,
    rarity: Rarity.Unique,
    image: '💀',
    assetKey: 'icon_ring_headhunter',
    uniqueEffect: 'Gain damage and size on kill',
    modifiers: [
        { stat: 'maxHp', value: 60, isPercentage: false, text: 'to Maximum Life' },
        { stat: 'damageMultiplier', value: 0.2, isPercentage: true, text: 'Increased Damage' }
    ]
  },
  {
      name: 'The Worldcarver',
      nameZh: '世界雕刻者',
      baseName: 'Rusted Axe',
      baseNameZh: '生锈斧',
      slot: ItemSlot.Weapon,
      rarity: Rarity.Unique,
      image: '🪓',
      assetKey: 'icon_weapon_axe',
      uniqueEffect: 'Attacks cause explosions on hit',
      modifiers: [
          { stat: 'damageMultiplier', value: 0.4, isPercentage: true, text: 'Increased Physical Damage' },
          { stat: 'maxHp', value: 30, isPercentage: false, text: 'to Maximum Life' }
      ]
  },
  {
      name: "Void's Edge",
      nameZh: "虚空之锋",
      baseName: 'Carving Knife',
      baseNameZh: '雕刻刀',
      slot: ItemSlot.Weapon,
      rarity: Rarity.Unique,
      image: '🗡️',
      assetKey: 'icon_weapon_sword',
      uniqueEffect: '100% Critical Strike Chance at Full Health',
      modifiers: [
          { stat: 'attackSpeedMultiplier', value: 0.5, isPercentage: true, text: 'Increased Attack Speed' },
          { stat: 'critChance', value: 0.1, isPercentage: true, text: 'to Critical Strike Chance' }
      ]
  },
  {
      name: "Mjolnir's Echo",
      nameZh: "雷神的回响",
      baseName: 'Driftwood Maul',
      baseNameZh: '漂流木槌',
      slot: ItemSlot.Weapon,
      rarity: Rarity.Unique,
      image: '🔨',
      assetKey: 'icon_weapon_mace',
      uniqueEffect: 'Hits chain lightning to nearby enemies',
      modifiers: [
          { stat: 'damageMultiplier', value: 0.3, isPercentage: true, text: 'Increased Physical Damage' },
          { stat: 'maxHp', value: 40, isPercentage: false, text: 'to Maximum Life' }
      ]
  }
];