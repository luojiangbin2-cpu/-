
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Inventory from './components/Inventory';
import NewSkillModal from './components/NewSkillModal';
import SkillTreeModal from './components/SkillTreeModal';
import SettingsModal from './components/SettingsModal';
import EncyclopediaModal from './components/EncyclopediaModal';
import GameOverModal from './components/GameOverModal';
import { AVAILABLE_SKILLS, BASE_STATS, CANVAS_HEIGHT, CANVAS_WIDTH, XP_SCALING_FACTOR, ENEMY_TYPES, DEFAULT_SETTINGS, TRANSLATIONS, GAME_ASSETS, TIME_SCALING_FACTOR, KINETIC_MAX_CHARGE, KINETIC_CHARGE_PER_PIXEL, GEM_BASE_XP, KINETIC_RANGE, BASIC_ATTACK_SKILL, MONSTER_AFFIXES, MAX_SKILL_LEVEL, BOSS_SPAWN_KILLS, BOSS_RESPAWN_KILLS, SKILL_UNLOCK_LEVELS, GEM_TIERS } from './constants';
import { Enemy, Entity, GameState, Item, ItemSlot, PlayerStats, Projectile, Skill, DamageNumber, Rarity, VisualEffect, WorldItem, EnemyType, Settings, EnemyAffix, StatusEffect, SkillNode } from './types';
import { generateItem } from './utils/itemGenerator';
import { audioManager } from './utils/audioManager';
import { preloadImages } from './utils/imageLoader';
import { Backpack, Settings as SettingsIcon, BookOpen, Network, Play } from 'lucide-react';

const App: React.FC = () => {
  // --- Refs ---
  const playerRef = useRef<Entity>({ id: 0, x: 0, y: 0, width: 30, height: 30, color: 'red' });
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const gemsRef = useRef<Entity[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const visualEffectsRef = useRef<VisualEffect[]>([]); 
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  
  const playerStatsRef = useRef<PlayerStats>({ ...BASE_STATS, hp: BASE_STATS.maxHp });
  const invulnTimerRef = useRef<number>(0);
  const playerVelocityRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const cameraRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const bvRotationRef = useRef<number>(0); 
  const facingRightRef = useRef<boolean>(true);

  const kineticChargeRef = useRef<number>(0);
  const wasMovingRef = useRef<boolean>(false);
  
  const bossSpawnedRef = useRef<boolean>(false);
  const arenaConstraintsRef = useRef<{minX: number, maxX: number, minY: number, maxY: number} | null>(null);

  const worldItemsRef = useRef<WorldItem[]>([]);

  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    time: 0,
    killCount: 0,
    nextBossThreshold: BOSS_SPAWN_KILLS,
    bossKillCount: 0,
    damageDealtBySkill: {},
    killCounts: {},
    skillPoints: 1, // Start with 1 point
    skillSlotsUnlocked: 1
  });

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [encyclopediaOpen, setEncyclopediaOpen] = useState(false);
  const [skillTreeOpen, setSkillTreeOpen] = useState(false);
  
  const [inventory, setInventory] = useState<Item[]>([]);
  const [equipped, setEquipped] = useState<{ [key: string]: Item }>({});
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]); 
  const [newSkillOptions, setNewSkillOptions] = useState<Skill[] | null>(null);
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [uiStats, setUiStats] = useState<PlayerStats>({ ...BASE_STATS, hp: BASE_STATS.maxHp });
  const [worldItemsState, setWorldItemsState] = useState<WorldItem[]>([]);

  const t = TRANSLATIONS[settings.language];

  // --- Init ---
  useEffect(() => {
      preloadImages(GAME_ASSETS).then(() => {
          setAssetsLoaded(true);
      });
      
      const handleBlur = () => {
          keysPressed.current = {};
      };
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
      audioManager.updateSettings(settings);
  }, [settings]);

  // --- INPUT HANDLING ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (gameState.isPlaying && !gameState.isGameOver) {
        if (e.key.toLowerCase() === 'i') setInventoryOpen(prev => !prev);
        if (e.key.toLowerCase() === 'p') setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPlaying, gameState.isGameOver]);


  // --- STATS CALCULATION (Items) ---
  const recalculateStats = useCallback(() => {
    let newMaxHp = BASE_STATS.maxHp;
    let newArmor = BASE_STATS.armor;
    let newSpeed = BASE_STATS.speed;
    let dmgMult = BASE_STATS.damageMultiplier;
    let atkSpeedMult = BASE_STATS.attackSpeedMultiplier;
    let critChance = BASE_STATS.critChance;
    
    // Elemental Mults
    let physMult = BASE_STATS.physDamageMult;
    let coldMult = BASE_STATS.coldDamageMult;
    let lightMult = BASE_STATS.lightningDamageMult;

    let incMaxHp = 0; let incArmor = 0; let incSpeed = 0;
    let flatMaxHp = 0; let flatArmor = 0; let flatSpeed = 0;

    (Object.values(equipped) as Item[]).forEach(item => {
        if (!item) return;
        const allMods = [...(item.implicit ? [item.implicit] : []), ...item.prefixes.flatMap(p => p.modifiers), ...item.suffixes.flatMap(p => p.modifiers), ...(item.modifiers || [])];
        allMods.forEach(mod => {
             if (mod.stat === 'maxHp') { if (mod.isPercentage) incMaxHp += mod.value; else flatMaxHp += mod.value; }
             else if (mod.stat === 'armor') { if (mod.isPercentage) incArmor += mod.value; else flatArmor += mod.value; }
             else if (mod.stat === 'speed') { if (mod.isPercentage) incSpeed += mod.value; else flatSpeed += mod.value; }
             else if (mod.stat === 'damageMultiplier') dmgMult += mod.value; 
             else if (mod.stat === 'attackSpeedMultiplier') atkSpeedMult += mod.value;
             else if (mod.stat === 'critChance') critChance += mod.value;
             else if (mod.stat === 'physDamageMult') physMult += mod.value;
             else if (mod.stat === 'coldDamageMult') coldMult += mod.value;
             else if (mod.stat === 'lightningDamageMult') lightMult += mod.value;
        });
    });

    newMaxHp = (newMaxHp + flatMaxHp) * (1 + incMaxHp);
    newArmor = (newArmor + flatArmor) * (1 + incArmor);
    newSpeed = (newSpeed + flatSpeed) * (1 + incSpeed);

    let currentHp = playerStatsRef.current.hp;
    if (currentHp > newMaxHp) currentHp = newMaxHp;
    
    const newStats: PlayerStats = { 
        ...BASE_STATS, 
        maxHp: newMaxHp, 
        hp: currentHp, 
        armor: newArmor, 
        speed: newSpeed, 
        damageMultiplier: dmgMult, 
        attackSpeedMultiplier: atkSpeedMult, 
        critChance: critChance, 
        pickupRange: BASE_STATS.pickupRange, 
        critMultiplier: BASE_STATS.critMultiplier,
        physDamageMult: physMult,
        coldDamageMult: coldMult,
        lightningDamageMult: lightMult
    };
    playerStatsRef.current = newStats;
    setUiStats(newStats); 
  }, [equipped]);

  useEffect(() => { recalculateStats(); }, [equipped, recalculateStats]);

  // --- HELPERS ---
  const applyStatus = (enemy: Enemy, type: 'frozen' | 'shocked' | 'bleed', duration: number, value?: number) => {
      if (!enemy.statuses) enemy.statuses = {};
      if (type === 'frozen') enemy.statuses.frozen = Math.max(enemy.statuses.frozen || 0, duration);
      else if (type === 'shocked') enemy.statuses.shocked = Math.max(enemy.statuses.shocked || 0, duration);
      else if (type === 'bleed') {
          enemy.statuses.bleed = {
              duration: Math.max(enemy.statuses.bleed?.duration || 0, duration),
              damage: Math.max(enemy.statuses.bleed?.damage || 0, value || 5)
          };
      }
  };

  const updateEnemyStatuses = () => {
      enemiesRef.current.forEach(e => {
          if (e.immuneTimers) {
              Object.keys(e.immuneTimers).forEach(key => {
                  if (e.immuneTimers[key] > 0) e.immuneTimers[key]--;
              });
          } else {
              e.immuneTimers = {};
          }

          if (!e.statuses) return;
          if (e.statuses.frozen && e.statuses.frozen > 0) e.statuses.frozen--;
          if (e.statuses.shocked && e.statuses.shocked > 0) e.statuses.shocked--;
          if (e.statuses.bleed && e.statuses.bleed.duration > 0) {
              e.statuses.bleed.duration--;
              if (frameRef.current % 30 === 0) {
                   const dmg = e.statuses.bleed.damage;
                   e.hp -= dmg;
                   damageNumbersRef.current.push({ id: Math.random(), x: e.x, y: e.y - 15, value: dmg, life: 20, isCrit: false, text: "BLEED" });
              }
          }
      });
  };

  const recordDamage = (skillId: string, amount: number) => {
      setGameState(prev => ({
          ...prev,
          damageDealtBySkill: {
              ...prev.damageDealtBySkill,
              [skillId]: (prev.damageDealtBySkill[skillId] || 0) + amount
          }
      }));
  };

  // --- SKILL STAT CALCULATION ---
  const getSkillEffectiveStats = (skill: Skill) => {
      const stats = {
          damage: skill.damage,
          cooldown: skill.cooldown,
          projectileCount: skill.projectileCount || 1,
          duration: skill.duration || 0,
          range: skill.range || 0,
          area: 1, 
          projectileSpeed: skill.projectileSpeed || 0,
          critChanceBonus: 0,
          augments: [] as string[]
      };

      if (skill.tree && skill.allocatedPoints) {
          Object.entries(skill.allocatedPoints).forEach(([nodeId, points]) => {
              const node = skill.tree.find(n => n.id === nodeId);
              if (node && points > 0) {
                  const s = node.statsPerPoint;
                  if (s.damage) stats.damage += s.damage * points;
                  if (s.cooldown) stats.cooldown += s.cooldown * points; 
                  if (s.projectileCount) stats.projectileCount += s.projectileCount * points;
                  if (s.duration) stats.duration += s.duration * points;
                  if (s.range) stats.range += s.range * points;
                  if (s.area) stats.area += s.area * points;
                  if (s.projectileSpeed) stats.projectileSpeed += s.projectileSpeed * points;
                  if (s.critChance) stats.critChanceBonus += s.critChance * points;
                  if (s.unlockAugment) stats.augments.push(s.unlockAugment);
              }
          });
      }
      return stats;
  };

  const update = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver || newSkillOptions || inventoryOpen || settingsOpen || encyclopediaOpen || skillTreeOpen) return;

    const stats = playerStatsRef.current;
    frameRef.current++;
    
    // --- PLAYER MOVEMENT ---
    let inputDx = 0; let inputDy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) inputDy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) inputDy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) inputDx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) inputDx += 1;

    if (inputDx !== 0 || inputDy !== 0) {
        const len = Math.hypot(inputDx, inputDy); inputDx /= len; inputDy /= len;
    }
    const isMoving = inputDx !== 0 || inputDy !== 0;
    const accel = stats.speed * 0.15; const friction = 0.85;
    
    if (isMoving) {
        playerVelocityRef.current.x += inputDx * accel; 
        playerVelocityRef.current.y += inputDy * accel;
        if (inputDx > 0) facingRightRef.current = true; else if (inputDx < 0) facingRightRef.current = false;
    } else {
        playerVelocityRef.current.x *= friction; 
        playerVelocityRef.current.y *= friction;
    }

    // STRICT SPEED CLAMP (Fixes pickup surge/lag spikes)
    const currentSpeed = Math.hypot(playerVelocityRef.current.x, playerVelocityRef.current.y);
    if (currentSpeed > stats.speed) {
        const scale = stats.speed / currentSpeed;
        playerVelocityRef.current.x *= scale;
        playerVelocityRef.current.y *= scale;
    }
    
    let nextX = playerRef.current.x + playerVelocityRef.current.x;
    let nextY = playerRef.current.y + playerVelocityRef.current.y;

    if (arenaConstraintsRef.current) {
        const { minX, maxX, minY, maxY } = arenaConstraintsRef.current; const padding = 20; 
        if (nextX < minX + padding) nextX = minX + padding; if (nextX > maxX - padding) nextX = maxX - padding;
        if (nextY < minY + padding) nextY = minY + padding; if (nextY > maxY - padding) nextY = maxY - padding;
        if (nextX === minX + padding || nextX === maxX - padding) playerVelocityRef.current.x = 0;
        if (nextY === minY + padding || nextY === maxY - padding) playerVelocityRef.current.y = 0;
    }
    
    const oldX = playerRef.current.x; const oldY = playerRef.current.y;
    playerRef.current.x = nextX; playerRef.current.y = nextY;
    const movedDist = Math.hypot(playerRef.current.x - oldX, playerRef.current.y - oldY);

    // --- STATUS UPDATES ---
    updateEnemyStatuses();

    // --- SKILL EXECUTION ---
    activeSkills.forEach(skill => {
        // Element Damage Multiplier Selection
        let elemMult = 1;
        if (skill.element === 'physical') elemMult = stats.physDamageMult;
        else if (skill.element === 'cold') elemMult = stats.coldDamageMult;
        else if (skill.element === 'lightning') elemMult = stats.lightningDamageMult;

        if (skill.type === 'kinetic') {
            const effStats = getSkillEffectiveStats(skill);
            const maxCharge = KINETIC_MAX_CHARGE; 
            const chargeRate = KINETIC_CHARGE_PER_PIXEL + (effStats.cooldown * 10); 

            // LOGIC FIX: Charge while moving, Discharge when stopping
            if (isMoving) {
                const chargeGain = movedDist * chargeRate;
                kineticChargeRef.current = Math.min(maxCharge, kineticChargeRef.current + chargeGain);
                if (frameRef.current % 5 === 0) {
                     visualEffectsRef.current.push({ id: `spark_${Math.random()}`, type: 'hit', x: playerRef.current.x + (Math.random() - 0.5) * 40, y: playerRef.current.y + (Math.random() - 0.5) * 40, color: `rgba(14, 165, 233, 0.5)`, duration: 15, maxDuration: 15, scale: 0.5 });
                }
            } else {
                // Not moving, check if we JUST stopped and have charge
                if (wasMovingRef.current && kineticChargeRef.current > maxCharge * 0.3) {
                     // AUGMENT: Static Discharge
                     if (effStats.augments.includes('aug_static')) {
                         const validEnemies = enemiesRef.current.filter(e => Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y) < 600);
                         for(let k=0; k<3; k++) {
                             if(validEnemies.length > 0) {
                                 const target = validEnemies[Math.floor(Math.random()*validEnemies.length)];
                                 visualEffectsRef.current.push({ id: `static_arc_${Math.random()}`, type: 'lightning', x: playerRef.current.x, y: playerRef.current.y, targetX: target.x, targetY: target.y, color: '#c084fc', duration: 15, maxDuration: 15 });
                                 const dmg = 30 * stats.damageMultiplier * elemMult;
                                 target.hp -= dmg; 
                                 recordDamage(skill.id, dmg);
                                 applyStatus(target, 'shocked', 180); 
                             }
                         }
                     }

                     const range = KINETIC_RANGE + (effStats.area - 1) * 100;
                     const validEnemies = enemiesRef.current.filter(e => Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y) < range && !e.isBoss);
                     if (validEnemies.length > 0 && Math.random() > 0.3) {
                         const randomEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)];
                         applyStatus(randomEnemy, 'shocked', 300);
                     }
                     // Dim Screen
                     visualEffectsRef.current.push({ id: `dim_${Math.random()}`, type: 'screen_dim', x: 0, y: 0, color: 'black', duration: 10, maxDuration: 10 });
                     
                     // Damage logic for Kinetic (AoE Lightning Storm)
                     const stormDmg = effStats.damage * stats.damageMultiplier * elemMult * (kineticChargeRef.current / maxCharge);
                     // Lightning strikes
                     const strikeCount = Math.floor(3 + (kineticChargeRef.current / maxCharge) * 5);
                     for(let i=0; i<strikeCount; i++) {
                         const angle = Math.random() * Math.PI * 2;
                         const dist = Math.random() * range;
                         const tx = playerRef.current.x + Math.cos(angle) * dist;
                         const ty = playerRef.current.y + Math.sin(angle) * dist;
                         visualEffectsRef.current.push({ id: `k_bolt_${Math.random()}`, type: 'lightning', x: tx, y: ty - 300, targetX: tx, targetY: ty, color: '#0ea5e9', duration: 10, maxDuration: 10, scale: 3 });
                         
                         // Area Damage at strike point
                         enemiesRef.current.forEach(e => {
                             if (Math.hypot(e.x - tx, e.y - ty) < 60) {
                                 e.hp -= stormDmg;
                                 recordDamage(skill.id, stormDmg);
                             }
                         });
                     }

                     kineticChargeRef.current = 0;
                }
            }
            return; 
        }

        const effStats = getSkillEffectiveStats(skill);
        const cooldownReady = frameRef.current % Math.ceil(Math.max(5, effStats.cooldown) / stats.attackSpeedMultiplier) === 0;

        if (skill.type === 'orbit') {
             const bladeCap = effStats.projectileCount;
             const existingBlades = projectilesRef.current.filter(p => p.sourceSkillId === skill.id && !p.isEnemy && !p.stationary);
             const activeCount = existingBlades.length;
             
             if (activeCount < bladeCap) {
                 const missing = bladeCap - activeCount;
                 for(let i=0; i<missing; i++) {
                     projectilesRef.current.push({
                         id: Math.random(), x: playerRef.current.x, y: playerRef.current.y, width: 40, height: 10,
                         color: skill.color, vx: 0, vy: 0,
                         damage: effStats.damage * stats.damageMultiplier * elemMult,
                         duration: 9999999, penetration: 9999, sourceSkillId: skill.id, element: skill.element,
                         isOrbit: true, orbitAngle: 0, orbitRadius: 70 + (effStats.range * 1), orbitIndex: 0 
                     });
                 }
             }
             // Rotation
             const rotSpeed = 0.02 * stats.attackSpeedMultiplier * (1 + effStats.projectileSpeed);
             bvRotationRef.current += rotSpeed;
             const currentBlades = projectilesRef.current.filter(p => p.sourceSkillId === skill.id && !p.isEnemy && !p.stationary);
             const totalBlades = currentBlades.length;
             const angleStep = (Math.PI * 2) / totalBlades;
             currentBlades.forEach((p, index) => {
                 p.damage = effStats.damage * stats.damageMultiplier * elemMult; // Update damage real-time
                 p.orbitRadius = 70 + (effStats.range);
                 p.orbitAngle = bvRotationRef.current + index * angleStep;
                 p.x = playerRef.current.x + Math.cos(p.orbitAngle) * p.orbitRadius;
                 p.y = playerRef.current.y + Math.sin(p.orbitAngle) * p.orbitRadius;
             });

        } else if (cooldownReady) {
            if (skill.type === 'melee') {
                 // AUTO TARGETING LOGIC
                 let angle = 0;
                 let targetInRange = null;
                 let minDist = Infinity;
                 
                 // Find closest enemy within a reasonable range
                 enemiesRef.current.forEach(e => {
                     const dist = Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y);
                     if (dist < 300 && dist < minDist) {
                         minDist = dist;
                         targetInRange = e;
                     }
                 });

                 if (targetInRange) {
                     angle = Math.atan2(targetInRange.y - playerRef.current.y, targetInRange.x - playerRef.current.x);
                 } else if (isMoving) {
                     angle = Math.atan2(playerVelocityRef.current.y, playerVelocityRef.current.x);
                 } else {
                     angle = facingRightRef.current ? 0 : Math.PI;
                 }

                 visualEffectsRef.current.push({ id: `slash_${Math.random()}`, type: 'melee_slash', x: playerRef.current.x, y: playerRef.current.y, rotation: angle, color: '#e2e8f0', duration: 12, maxDuration: 12, scale: effStats.area });
                 audioManager.playHit(true); 

                 const range = 130 * effStats.area;
                 const arc = Math.PI / 1.5; 
                 const closeRange = 40; 

                 enemiesRef.current.forEach(e => {
                     const dx = e.x - playerRef.current.x; const dy = e.y - playerRef.current.y;
                     const dist = Math.hypot(dx, dy);
                     if (dist < range) {
                         const angleToEnemy = Math.atan2(dy, dx);
                         let angleDiff = angleToEnemy - angle;
                         while (angleDiff < -Math.PI) angleDiff += Math.PI*2; while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
                         
                         if (Math.abs(angleDiff) < arc / 2 || dist < closeRange) {
                             const isCrit = Math.random() < (stats.critChance + effStats.critChanceBonus);
                             const dmg = effStats.damage * stats.damageMultiplier * elemMult * (isCrit ? stats.critMultiplier : 1);
                             e.hp -= dmg; 
                             recordDamage(skill.id, dmg);
                             applyStatus(e, 'bleed', 180, dmg * 0.1);

                             // AUGMENT: Cast on Crit
                             if (isCrit && effStats.augments.includes('aug_coc')) {
                                 const iceSkill = activeSkills.find(s => s.id === 'icebolt');
                                 // Use basic stats if Ice Bolt not learned, or learned stats if available
                                 const iceStats = iceSkill ? getSkillEffectiveStats(iceSkill) : { damage: 30, projectileSpeed: 0, element: 'cold' as const };
                                 projectilesRef.current.push({
                                     id: Math.random(), x: playerRef.current.x, y: playerRef.current.y, width: 15, height: 15, color: '#06b6d4',
                                     vx: Math.cos(angleToEnemy) * 5, vy: Math.sin(angleToEnemy) * 5,
                                     damage: iceStats.damage * stats.damageMultiplier * stats.coldDamageMult, duration: 120, penetration: 1, sourceSkillId: 'icebolt', element: 'cold'
                                 });
                             }
                             
                             if (e.statuses?.frozen && e.statuses.frozen > 0) {
                                 const shatterDmg = dmg * 3;
                                 e.hp -= shatterDmg;
                                 recordDamage(skill.id, shatterDmg);
                                 damageNumbersRef.current.push({ id: Math.random(), x: e.x, y: e.y - 40, value: shatterDmg, life: 40, isCrit: true, isReaction: true, text: t.reaction_shatter });
                                 visualEffectsRef.current.push({ id: `shatter_${Math.random()}`, type: 'shatter_nova', x: e.x, y: e.y, color: '#22d3ee', duration: 20, maxDuration: 20, scale: 40 });
                                 e.statuses.frozen = 0;
                             }
                             damageNumbersRef.current.push({ id: Math.random(), x: e.x, y: e.y - 20, value: dmg, life: 30, isCrit });
                             visualEffectsRef.current.push({ id: `hit_${Math.random()}`, type: 'hit', x: e.x, y: e.y, color: '#f8fafc', duration: 8, maxDuration: 8 });
                         }
                     }
                 });
            } else if (skill.type === 'projectile') {
                 let target = null; let minDist = Infinity;
                 enemiesRef.current.forEach(e => { const dist = Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y); if(dist<minDist){minDist=dist; target=e;} });
                 let baseAngle = 0;
                 if (target) baseAngle = Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x);
                 else if (isMoving) baseAngle = Math.atan2(playerVelocityRef.current.y, playerVelocityRef.current.x);
                 else baseAngle = facingRightRef.current ? 0 : Math.PI;
                 
                 const count = effStats.projectileCount;
                 const spread = 0.2; 
                 
                 for(let i=0; i<count; i++) {
                     const angle = baseAngle + (i - (count-1)/2) * spread;
                     projectilesRef.current.push({
                         id: Math.random(), x: playerRef.current.x, y: playerRef.current.y, width: 15, height: 15, color: skill.color,
                         vx: Math.cos(angle) * (4.5 + effStats.projectileSpeed), vy: Math.sin(angle) * (4.5 + effStats.projectileSpeed),
                         damage: effStats.damage * stats.damageMultiplier * elemMult,
                         duration: 120, penetration: 1, sourceSkillId: skill.id, element: skill.element
                     });
                 }
            } else if (skill.type === 'aoe') {
                const range = effStats.range;
                let target = null;
                enemiesRef.current.forEach(e => { if(Math.hypot(e.x-playerRef.current.x,e.y-playerRef.current.y)<range) target=e; });
                if(target) {
                    const dmg = effStats.damage * stats.damageMultiplier * elemMult;
                    target.hp -= dmg;
                    recordDamage(skill.id, dmg);
                    applyStatus(target, 'shocked', 300);
                    
                    // REACTION: Superconduct
                    if (target.statuses?.bleed && target.statuses.bleed.duration > 0) {
                         // Chain to 3 nearby
                         const neighbors = enemiesRef.current.filter(n => n.id !== target!.id && Math.hypot(n.x - target!.x, n.y - target!.y) < 200).slice(0, 3);
                         neighbors.forEach(n => {
                             n.hp -= dmg * 0.5;
                             visualEffectsRef.current.push({ id: `chain_${Math.random()}`, type: 'lightning', x: target!.x, y: target!.y, targetX: n.x, targetY: n.y, color: '#a78bfa', duration: 10, maxDuration: 10 });
                         });
                         damageNumbersRef.current.push({ id: Math.random(), x: target.x, y: target.y - 40, value: dmg, life: 40, isCrit: true, isReaction: true, text: t.reaction_superconduct });
                    }
                    
                    damageNumbersRef.current.push({ id: Math.random(), x: target.x, y: target.y - 20, value: dmg, life: 30, isCrit: true });
                    visualEffectsRef.current.push({ id: `arc_${Math.random()}`, type: 'lightning', x: playerRef.current.x, y: playerRef.current.y, targetX: target.x, targetY: target.y, color: '#60a5fa', duration: 15, maxDuration: 15 });
                }
            }
        }
    });
    
    wasMovingRef.current = isMoving;

    // --- ENEMY SPAWN & LOGIC ---
    if (!bossSpawnedRef.current && gameState.killCount >= gameState.nextBossThreshold) {
         bossSpawnedRef.current = true;
         // Spawn Boss
         const typeStats = ENEMY_TYPES['boss_valos'];
         const mult = Math.max(1, gameState.bossKillCount * 1.2);
         enemiesRef.current.push({
            id: Math.random(), x: playerRef.current.x + 300, y: playerRef.current.y, width: 60, height: 60, color: 'purple',
            hp: typeStats.hp * mult, maxHp: typeStats.hp * mult, speed: 1.5, damage: 40 * mult, type: 'boss_valos', isBoss: true, hitFlash: 0, animationOffset: 0, affixes: [], statuses: {}, immuneTimers: {}
         });
         const camX = cameraRef.current.x; const camY = cameraRef.current.y;
         arenaConstraintsRef.current = { minX: camX, maxX: camX + CANVAS_WIDTH, minY: camY, maxY: camY + CANVAS_HEIGHT };
    } 
    else if (!bossSpawnedRef.current && frameRef.current - lastSpawnRef.current > Math.max(20, 60 - gameState.level * 2)) {
         // Spawn Mobs
         const types: EnemyType[] = ['zombie', 'skeleton', 'bat', 'golem'];
         const typeKey = types[Math.floor(Math.random() * types.length)];
         const typeStats = ENEMY_TYPES[typeKey];
         
         const angle = Math.random() * Math.PI * 2;
         const dist = 600 + Math.random() * 200; // Spawn outside
         const ex = playerRef.current.x + Math.cos(angle) * dist;
         const ey = playerRef.current.y + Math.sin(angle) * dist;

         // Monster Affixes (Delayed ramp)
         const numAffixes = Math.max(0, Math.floor((gameState.time - 60) / 90)); // Start after 60s, then every 90s
         const appliedAffixes: EnemyAffix[] = [];
         if (numAffixes > 0) {
             const pool = [...MONSTER_AFFIXES];
             for(let k=0; k<Math.min(numAffixes, 5); k++) {
                 if (pool.length === 0) break;
                 const idx = Math.floor(Math.random() * pool.length);
                 appliedAffixes.push(pool[idx]);
                 pool.splice(idx, 1);
             }
         }

         // Elite Chance
         const isElite = Math.random() < 0.05;
         const hpMult = (1 + gameState.time * 0.05) * (isElite ? 3 : 1);
         const dmgMult = (1 + gameState.time * 0.02) * (isElite ? 2 : 1);

         const enemy: Enemy = {
             id: Math.random(), x: ex, y: ey, width: typeStats.width, height: typeStats.width, color: typeStats.color,
             hp: typeStats.hp * hpMult, maxHp: typeStats.hp * hpMult, speed: typeStats.speed, damage: typeStats.damage * dmgMult,
             type: typeKey, isBoss: false, isElite, hitFlash: 0, animationOffset: Math.random() * 100, affixes: appliedAffixes, statuses: {}, immuneTimers: {}
         };
         
         // Apply Affix Stats
         appliedAffixes.forEach(aff => {
             if (aff.statMod.hp) { enemy.maxHp *= aff.statMod.hp; enemy.hp = enemy.maxHp; }
             if (aff.statMod.damage) enemy.damage *= aff.statMod.damage;
             if (aff.statMod.speed) enemy.speed *= aff.statMod.speed;
             if (aff.statMod.width) { enemy.width *= aff.statMod.width; enemy.height = enemy.width; }
         });

         enemiesRef.current.push(enemy);
         lastSpawnRef.current = frameRef.current;
    }

    // --- ENEMY AI Loop (Movement & Attack) ---
    enemiesRef.current.forEach(enemy => {
        // Freeze check
        if (enemy.statuses?.frozen && enemy.statuses.frozen > 0) return;

        const dx = playerRef.current.x - enemy.x;
        const dy = playerRef.current.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        // BOSS LOGIC
        if (enemy.type === 'boss_valos') {
            if (!enemy.phase) enemy.phase = 1;
            enemy.attackTimer = (enemy.attackTimer || 0) + 1;
            
            // Phase Transitions
            const hpPct = enemy.hp / enemy.maxHp;
            if (hpPct < 0.6 && enemy.phase === 1) enemy.phase = 2;
            if (hpPct < 0.3 && enemy.phase === 2) {
                enemy.phase = 3;
                // Destroy Prisms -> Spawn Doppelgangers
                const prisms = enemiesRef.current.filter(e => e.type === 'prism');
                prisms.forEach(p => p.hp = 0);
                
                // Spawn 2 Doppelgangers
                for(let k=0; k<2; k++) {
                    const dStats = ENEMY_TYPES['doppelganger'];
                    enemiesRef.current.push({
                        id: Math.random(), x: enemy.x + (k===0?-50:50), y: enemy.y, width: 30, height: 30, color: dStats.color,
                        hp: dStats.hp, maxHp: dStats.hp, speed: dStats.speed, damage: dStats.damage, type: 'doppelganger',
                        isBoss: false, isElite: true, hitFlash: 0, animationOffset: 0, affixes: [], statuses: {}, immuneTimers: {}
                    });
                }
            }

            // Phase 1: Prisms & Beams
            if (enemy.phase === 1) {
                if (enemy.attackTimer % 300 === 0) {
                    // Spawn Prism
                    const currentPrisms = enemiesRef.current.filter(e => e.type === 'prism');
                    if (currentPrisms.length < 6) {
                        let px = 0, py = 0;
                        let valid = false;
                        let attempts = 0;
                        while(!valid && attempts < 10) {
                            px = playerRef.current.x + (Math.random()-0.5)*800;
                            py = playerRef.current.y + (Math.random()-0.5)*500;
                            // Check distance from others
                            const tooClose = currentPrisms.some(cp => Math.hypot(cp.x - px, cp.y - py) < 250);
                            if (!tooClose) valid = true;
                            attempts++;
                        }
                        const pStats = ENEMY_TYPES['prism'];
                        enemiesRef.current.push({
                            id: Math.random(), x: px, y: py, width: pStats.width, height: pStats.width, color: pStats.color,
                            hp: pStats.hp, maxHp: pStats.hp, speed: 0, damage: 0, type: 'prism', isBoss: false, hitFlash: 0, animationOffset: 0, affixes: [], statuses: {}, immuneTimers: {}
                        });
                    }
                }
                if (enemy.attackTimer % 180 === 0) {
                    // Refraction Beam
                    const prisms = enemiesRef.current.filter(e => e.type === 'prism');
                    if (prisms.length > 0) {
                        const targetPrism = prisms[Math.floor(Math.random()*prisms.length)];
                        visualEffectsRef.current.push({ id: `beam_${Math.random()}`, type: 'laser_beam', x: enemy.x, y: enemy.y, targetX: targetPrism.x, targetY: targetPrism.y, color: '#a78bfa', duration: 40, maxDuration: 40, scale: 8 });
                        
                        // Bounce logic (Create projectiles from prism)
                        for(let k=0; k<3; k++) {
                            const angle = Math.random() * Math.PI * 2;
                            projectilesRef.current.push({
                                id: Math.random(), x: targetPrism.x, y: targetPrism.y, width: 10, height: 10, color: '#a78bfa',
                                vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, damage: 45, duration: 120, penetration: 99,
                                sourceSkillId: 'boss_beam', isEnemy: true
                            });
                        }
                    }
                }
            }
            
            // Movement (Blink)
            if (frameRef.current % 120 === 0) {
                 const angle = Math.random() * Math.PI * 2;
                 enemy.x = playerRef.current.x + Math.cos(angle) * 300;
                 enemy.y = playerRef.current.y + Math.sin(angle) * 200;
            }
            return;
        }

        // DOPPELGANGER LOGIC
        if (enemy.type === 'doppelganger') {
            if (dist > 200) { enemy.x += (dx/dist)*enemy.speed; enemy.y += (dy/dist)*enemy.speed; } // Kite
            
            if (frameRef.current % 120 === 0) {
                 // Mimic Skill
                 const mimicSkill = activeSkills.find(s => s.type === 'projectile' || s.type === 'melee');
                 if (mimicSkill) {
                     if (mimicSkill.type === 'projectile') {
                         const stats = getSkillEffectiveStats(mimicSkill);
                         const angle = Math.atan2(dy, dx);
                         const count = stats.projectileCount || 1;
                         for(let i=0; i<count; i++) {
                             const spread = 0.2;
                             const fireAngle = angle + (i - (count-1)/2)*spread;
                             projectilesRef.current.push({
                                 id: Math.random(), x: enemy.x, y: enemy.y, width: 15, height: 15, color: '#ef4444',
                                 vx: Math.cos(fireAngle) * 4, vy: Math.sin(fireAngle) * 4, damage: 30 + gameState.time * 0.1, duration: 100, penetration: 1,
                                 sourceSkillId: 'mimic_projectile', isEnemy: true
                             });
                         }
                     } else if (mimicSkill.type === 'melee') {
                         // Melee slash visual
                         const angle = Math.atan2(dy, dx);
                         visualEffectsRef.current.push({ id: `mimic_slash_${Math.random()}`, type: 'melee_slash', x: enemy.x, y: enemy.y, rotation: angle, color: '#ef4444', duration: 12, maxDuration: 12, scale: 1 });
                         if (dist < 130) {
                             if (invulnTimerRef.current <= 0) {
                                 playerStatsRef.current.hp -= 30;
                                 invulnTimerRef.current = 30;
                                 visualEffectsRef.current.push({ id: `phit_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: 'red', duration: 10, maxDuration: 10 });
                             }
                         }
                     }
                 }
            }
            return;
        }

        if (enemy.type === 'prism') return; // Stationary

        // Standard Movement
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
        
        // Player Collision
        if (dist < 20) {
            if (invulnTimerRef.current <= 0) {
                const armorReduc = playerStatsRef.current.armor / (playerStatsRef.current.armor + 50);
                const dmgTaken = enemy.damage * (1 - armorReduc);
                playerStatsRef.current.hp -= dmgTaken;
                invulnTimerRef.current = 30; // iFrames
                visualEffectsRef.current.push({ id: `phit_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: 'red', duration: 10, maxDuration: 10 });
                audioManager.playHit();
            }
        }
    });

    if (invulnTimerRef.current > 0) invulnTimerRef.current--;

    // --- FULL PROJECTILE COLLISION LOOP ---
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const p = projectilesRef.current[i];
        
        // Move if not stationary/orbiting
        if (!p.isOrbit && !p.stationary) {
            p.x += p.vx; p.y += p.vy;
        }
        
        // Stationary Rotation (for Blade Storm)
        if (p.stationary && p.isOrbit && p.orbitAngle !== undefined) {
             p.orbitAngle += 0.1;
        }

        let hit = false;
        
        if (p.isEnemy) {
            // Check Player Collision
            const dist = Math.hypot(p.x - playerRef.current.x, p.y - playerRef.current.y);
            if (dist < playerRef.current.width) {
                 if (invulnTimerRef.current <= 0) {
                     playerStatsRef.current.hp -= p.damage;
                     invulnTimerRef.current = 30;
                     visualEffectsRef.current.push({ id: `phit_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: 'red', duration: 10, maxDuration: 10 });
                 }
                 hit = true;
            }
        } else {
            // Check Enemy Collision
            for (const enemy of enemiesRef.current) {
                // HIT THROTTLING: If this enemy was hit by this skill recently, SKIP
                // For orbiting skills (BV), throttle is important. For projectiles, usually 1 hit max anyway.
                if (p.isOrbit) {
                    if (enemy.immuneTimers[p.sourceSkillId] > 0) continue;
                }

                const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
                if (dist < enemy.width + (p.width/2)) {
                    // HIT!
                    const isCrit = Math.random() < stats.critChance;
                    const dmg = p.damage * (isCrit ? stats.critMultiplier : 1);
                    
                    enemy.hp -= dmg;
                    enemy.hitFlash = 5;
                    recordDamage(p.sourceSkillId, dmg);

                    // Set immunity timer for this skill on this enemy (20 frames = 0.33s)
                    if (p.isOrbit) {
                        enemy.immuneTimers[p.sourceSkillId] = 20; 
                    }

                    // --- STATUS & REACTIONS ---
                    
                    // 1. Apply Status based on Element
                    if (p.element === 'cold') applyStatus(enemy, 'frozen', 120); // 2s freeze
                    if (p.element === 'lightning') applyStatus(enemy, 'shocked', 180); // 3s shock
                    if (p.element === 'physical') applyStatus(enemy, 'bleed', 180, dmg * 0.1);

                    // 2. Elemental Reactions
                    // Shatter (Phys hit Frozen)
                    if (p.element === 'physical' && enemy.statuses?.frozen && enemy.statuses.frozen > 0) {
                         const shatterDmg = dmg * 3;
                         enemy.hp -= shatterDmg;
                         recordDamage(p.sourceSkillId, shatterDmg);
                         damageNumbersRef.current.push({ id: Math.random(), x: enemy.x, y: enemy.y - 40, value: shatterDmg, life: 40, isCrit: true, isReaction: true, text: t.reaction_shatter });
                         visualEffectsRef.current.push({ id: `shatter_${Math.random()}`, type: 'shatter_nova', x: enemy.x, y: enemy.y, color: '#22d3ee', duration: 20, maxDuration: 20, scale: 40 });
                         enemy.statuses.frozen = 0; // Consume freeze
                    }
                    
                    // Thermal Shock (Cold hit Shocked)
                    if (p.element === 'cold' && enemy.statuses?.shocked && enemy.statuses.shocked > 0) {
                        const thermalDmg = dmg * 2; // True damage conceptually
                        enemy.hp -= thermalDmg;
                        recordDamage(p.sourceSkillId, thermalDmg);
                        damageNumbersRef.current.push({ id: Math.random(), x: enemy.x, y: enemy.y - 40, value: thermalDmg, life: 40, isCrit: true, isReaction: true, text: t.reaction_thermal });
                        visualEffectsRef.current.push({ id: `thermal_${Math.random()}`, type: 'thermal_burst', x: enemy.x, y: enemy.y, color: '#fff', duration: 15, maxDuration: 15, scale: 30 });
                    }

                    // 3. AUGMENT TRIGGERS
                    // Blade Storm (Ice Bolt hits -> Stationary BV)
                    if (p.sourceSkillId === 'icebolt' && !p.stationary) {
                        const iceSkill = activeSkills.find(s => s.id === 'icebolt');
                        const hasAugment = iceSkill && iceSkill.tree && iceSkill.allocatedPoints['aug_storm'] > 0;
                        if (hasAugment && Math.random() < 0.3) {
                             // Spawn stationary blade
                             projectilesRef.current.push({
                                 id: Math.random(), x: enemy.x, y: enemy.y, width: 40, height: 10,
                                 color: '#10b981', vx: 0, vy: 0, damage: p.damage * 0.5, duration: 240, penetration: 999,
                                 sourceSkillId: 'icebolt', element: 'physical', stationary: true, isOrbit: true, orbitAngle: 0, orbitRadius: 40
                             });
                        }
                    }

                    damageNumbersRef.current.push({ id: Math.random(), x: enemy.x, y: enemy.y - 20, value: dmg, life: 30, isCrit });
                    visualEffectsRef.current.push({ id: `hit_${Math.random()}`, type: 'hit', x: enemy.x, y: enemy.y, color: p.color, duration: 8, maxDuration: 8 });
                    audioManager.playHit();

                    p.penetration--;
                    if (p.penetration <= 0) hit = true;
                }
            }
        }
        
        if (hit || (!p.isOrbit && !p.stationary && p.duration-- <= 0)) {
            if (!p.isOrbit && !p.stationary) projectilesRef.current.splice(i, 1);
        }
    }

    // Death Check
    const livingEnemies: Enemy[] = [];
    enemiesRef.current.forEach(e => {
        if (e.hp > 0) livingEnemies.push(e);
        else {
             setGameState(prev => {
                 const newKills = { ...prev.killCounts };
                 newKills[e.type] = (newKills[e.type] || 0) + 1;
                 return { ...prev, killCount: prev.killCount + 1, killCounts: newKills };
             });
             visualEffectsRef.current.push({ id: `death_${Math.random()}`, type: 'death_poof', x: e.x, y: e.y, color: '#4c5c48', duration: 30, maxDuration: 30, scale: e.width });
             // Drop Items based on Elite/Boss
             let dropChance = e.isElite ? 0.4 : 0.05;
             if (e.isBoss) dropChance = 1.0;
             if (Math.random() < dropChance) {
                 const item = generateItem(gameState.level);
                 worldItemsRef.current.push({ id: Math.random().toString(), x: e.x, y: e.y, item, frameCreated: frameRef.current });
             }

             // Gem Tiers Logic
             let gemColor = 'blue';
             let xpVal = GEM_BASE_XP + gameState.level;
             
             if (gameState.time > 180) {
                 gemColor = 'purple';
                 xpVal *= 5;
             } else if (gameState.time > 60) {
                 gemColor = 'gold';
                 xpVal *= 2;
             }
             
             gemsRef.current.push({ id: Math.random(), x: e.x, y: e.y, width: 10, height: 10, color: gemColor, xpValue: xpVal });

             if (e.isBoss) {
                 bossSpawnedRef.current = false;
                 arenaConstraintsRef.current = null;
                 setGameState(prev => ({...prev, nextBossThreshold: prev.nextBossThreshold + BOSS_RESPAWN_KILLS, bossKillCount: prev.bossKillCount + 1}));
             }
        }
    });
    enemiesRef.current = livingEnemies;

    // Loot & Gem Magnet
    [...gemsRef.current, ...worldItemsRef.current.map(w => ({ ...w, type: 'item' }))].forEach(obj => {
        // @ts-ignore
        const dist = Math.hypot(playerRef.current.x - obj.x, playerRef.current.y - obj.y);
        if (dist < 100) { // Increased from 40
             // FIX GEM LERP: Increase interpolation for Gems/Items to match player speed
             // If gem, speed is faster
             const speedFactor = (obj as any).xpValue ? 0.25 : 0.15; // Gems move faster
             obj.x += (playerRef.current.x - obj.x) * speedFactor;
             obj.y += (playerRef.current.y - obj.y) * speedFactor;
        }
    });

    // Gem Pickup
    gemsRef.current.forEach(g => {
        if(Math.hypot(playerRef.current.x - g.x, playerRef.current.y - g.y) < 50) { // SNAP DISTANCE increased to 50
             setGameState(prev => {
                 let newXp = prev.xp + (g.xpValue || 10);
                 let newLevel = prev.level;
                 let newXpToNext = prev.xpToNextLevel;
                 
                 let leveledUp = false;
                 if(newXp >= newXpToNext) {
                      newXp -= newXpToNext; 
                      newLevel++; 
                      newXpToNext = Math.floor(newXpToNext * XP_SCALING_FACTOR);
                      leveledUp = true;
                      audioManager.playLevelUp();
                 }
                 if (leveledUp) {
                     if (SKILL_UNLOCK_LEVELS.includes(newLevel)) {
                         const allOptions = AVAILABLE_SKILLS.filter(s => !activeSkills.some(as => as.id === s.id));
                         if (allOptions.length > 0) setNewSkillOptions(allOptions);
                         else return { ...prev, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext, skillPoints: prev.skillPoints + 1 };
                     } else {
                         return { ...prev, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext, skillPoints: prev.skillPoints + 1 };
                     }
                 }
                 return { ...prev, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext };
             });
             g.xpValue = 0;
        }
    });
    gemsRef.current = gemsRef.current.filter(g => (g.xpValue || 0) > 0);

    // Item Pickup (Proximity & Animation)
    const remainingItems: WorldItem[] = [];
    worldItemsRef.current.forEach(w => {
        const dist = Math.hypot(playerRef.current.x - w.x, playerRef.current.y - w.y);
        
        if (w.isPickedUp) {
            // Animating towards player
            w.x += (playerRef.current.x - w.x) * 0.5;
            w.y += (playerRef.current.y - w.y) * 0.5;
            if (dist < 10) {
                 handleLootPickup(w); // Actually add to inventory
            } else {
                 remainingItems.push(w); // Keep animating
            }
        } else if (dist < 50) { 
            // Trigger Animation
            w.isPickedUp = true;
            remainingItems.push(w);
        } else {
            remainingItems.push(w);
        }
    });
    worldItemsRef.current = remainingItems;
    setWorldItemsState(remainingItems); 
    
    // Check Game Over
    if (playerStatsRef.current.hp <= 0) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        audioManager.stopMusic();
    }

    damageNumbersRef.current = damageNumbersRef.current.filter(dn => { dn.y -= 0.5; dn.life--; return dn.life > 0; });
    visualEffectsRef.current = visualEffectsRef.current.filter(v => v.duration-- > 0);
    if (frameRef.current % 60 === 0) setGameState(prev => ({ ...prev, time: prev.time + 1 }));

  }, [gameState, activeSkills, newSkillOptions, inventoryOpen, settingsOpen, encyclopediaOpen, skillTreeOpen]);

  // --- LOOT HANDLERS ---
  const handleLootPickup = (w: WorldItem) => {
      setInventory(prev => [...prev, w.item]);
      audioManager.playUI('hover'); 
  };

  const handleInventoryDiscard = (itemId: string) => {
      setInventory(prev => prev.filter(i => i.id !== itemId));
      audioManager.playUI('trash');
  };
  
  const handleInventorySort = () => {
      setInventory(prev => [...prev].sort((a, b) => {
          const rarityOrder = { [Rarity.Unique]: 4, [Rarity.Rare]: 3, [Rarity.Magic]: 2, [Rarity.Normal]: 1 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      }));
  };

  const handleEquip = (item: Item) => {
      // Unequip current if exists
      let slotKey = item.slot as string;
      if (item.slot === ItemSlot.Ring) {
          if (!equipped['Ring1']) slotKey = 'Ring1';
          else if (!equipped['Ring2']) slotKey = 'Ring2';
          else slotKey = 'Ring1'; // Swap Ring 1 default
      }
      
      const current = equipped[slotKey];
      if (current) {
          setInventory(prev => [...prev, current]);
      }
      setEquipped(prev => ({ ...prev, [slotKey]: item }));
      setInventory(prev => prev.filter(i => i.id !== item.id));
      audioManager.playUI('click');
  };

  const handleUnequip = (slotKey: string) => {
      const item = equipped[slotKey];
      if (item) {
          setInventory(prev => [...prev, item]);
          setEquipped(prev => {
              const next = { ...prev };
              delete next[slotKey];
              return next;
          });
          audioManager.playUI('click');
      }
  };

  // --- LOOP ---
  useEffect(() => {
    let animId: number;
    const loop = () => { update(); animId = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [update]);

  // --- HANDLERS ---
  const returnToTitle = () => {
      setGameState(prev => ({ ...prev, isPlaying: false, isGameOver: false, isPaused: false }));
      setNewSkillOptions(null);
      setInventoryOpen(false);
      setSettingsOpen(false);
      setEncyclopediaOpen(false);
      setSkillTreeOpen(false);
      audioManager.stopMusic();
  };

  const startGame = () => {
    // Reset Refs
    playerRef.current = { id: 0, x: 0, y: 0, width: 30, height: 30, color: 'red' };
    playerStatsRef.current = { ...BASE_STATS, hp: BASE_STATS.maxHp }; // CRITICAL FIX: Reset HP
    playerVelocityRef.current = { x: 0, y: 0 }; // Reset Velocity
    enemiesRef.current = []; projectilesRef.current = []; gemsRef.current = []; damageNumbersRef.current = [];
    visualEffectsRef.current = [];
    worldItemsRef.current = [];
    
    // Reset State
    setInventory([]);
    setEquipped({});
    setActiveSkills([{ ...BASIC_ATTACK_SKILL, level: 1, allocatedPoints: {} }]); // AUTO START WITH BASIC
    
    setGameState({ 
        isPlaying: true, 
        isPaused: false, 
        isGameOver: false, 
        level: 1, 
        xp: 0, 
        xpToNextLevel: 100, 
        gold: 0, 
        time: 0, 
        killCount: 0, 
        nextBossThreshold: BOSS_SPAWN_KILLS, 
        bossKillCount: 0, 
        damageDealtBySkill: {}, 
        killCounts: {}, 
        skillPoints: 1, // Start with 1 point for the tree
        skillSlotsUnlocked: 1 
    });
    
    setNewSkillOptions(null); // Don't show options at start
    audioManager.startMusic();
  };

  const handleNewSkillSelect = (skill: Skill) => {
      setActiveSkills(prev => [...prev, { ...skill, level: 1, allocatedPoints: {} }]);
      setNewSkillOptions(null);
      // Grant a point for the new skill
      setGameState(prev => ({...prev, skillPoints: prev.skillPoints + 1}));
      audioManager.playUI('click');
  };

  const handleAllocateNode = (skillId: string, nodeId: string) => {
      if (gameState.skillPoints <= 0) return;
      
      setActiveSkills(prev => prev.map(s => {
          if (s.id === skillId) {
              const current = s.allocatedPoints[nodeId] || 0;
              const node = s.tree.find(n => n.id === nodeId);
              if (node && current < node.maxPoints) {
                  setGameState(st => ({...st, skillPoints: st.skillPoints - 1}));
                  return { ...s, allocatedPoints: { ...s.allocatedPoints, [nodeId]: current + 1 } };
              }
          }
          return s;
      }));
  };

  return (
    <div className="relative w-screen h-[100dvh] bg-slate-950 flex items-center justify-center overflow-hidden">
      {gameState.isPlaying && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full">
                <GameCanvas 
                    player={playerRef.current} enemies={enemiesRef.current} projectiles={projectilesRef.current}
                    damageNumbers={damageNumbersRef.current} gems={gemsRef.current} visualEffects={visualEffectsRef.current}
                    activeSkills={activeSkills} worldItems={worldItemsState} gameOver={gameState.isGameOver}
                    settings={settings} cameraRef={cameraRef}
                />
            </div>
            <HUD stats={uiStats} gameState={gameState} />
            
            {/* Control Buttons */}
            <div className="absolute bottom-24 right-4 md:top-20 md:right-4 md:bottom-auto flex flex-col gap-2 z-30">
                <button onClick={() => setInventoryOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-amber-500 shadow-lg relative group"><Backpack /></button>
                <button onClick={() => setSkillTreeOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-green-400 shadow-lg relative group">
                    <Network />
                    {gameState.skillPoints > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white animate-pulse">{gameState.skillPoints}</span>}
                </button>
                <button onClick={() => setSettingsOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-slate-400 shadow-lg relative group"><SettingsIcon /></button>
                <button onClick={() => setEncyclopediaOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-blue-400 shadow-lg relative group"><BookOpen /></button>
            </div>
          </div>
      )}
      {!gameState.isPlaying && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center space-y-6 z-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black px-4 text-center">
              <h1 className="text-5xl md:text-7xl font-serif text-amber-600 tracking-widest uppercase border-b-4 border-amber-900 pb-4 drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">Exile Survivors</h1>
              <p className="text-slate-400 text-lg md:text-xl font-light">{t.tagline}</p>
              <button onClick={startGame} disabled={!assetsLoaded} className={`px-10 py-4 border-2 font-serif text-xl md:text-2xl rounded shadow-[0_0_20px_rgba(180,83,9,0.3)] transition-all flex items-center gap-3 ${assetsLoaded ? 'bg-amber-800/80 hover:bg-amber-700 border-amber-600 text-amber-100 hover:scale-105' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}>
                {assetsLoaded ? <><Play fill="currentColor" /> {t.startGame}</> : t.loading}
              </button>
              <div className="flex gap-4">
                  <button onClick={() => setSettingsOpen(true)} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 mt-4"><SettingsIcon size={20} /> {t.settings}</button>
                  <button onClick={() => setEncyclopediaOpen(true)} className="text-slate-500 hover:text-blue-400 flex items-center gap-2 mt-4"><BookOpen size={20} /> {t.encyclopedia}</button>
              </div>
          </div>
      )}
      {gameState.isGameOver && <GameOverModal gameState={gameState} settings={settings} onRestart={returnToTitle} />}
      {inventoryOpen && <Inventory inventory={inventory} equipped={equipped} onEquip={handleEquip} onUnequip={handleUnequip} onClose={() => setInventoryOpen(false)} onSort={handleInventorySort} onDiscard={handleInventoryDiscard} stats={uiStats} language={settings.language} />}
      
      {/* NEW UI MODALS */}
      {newSkillOptions && <NewSkillModal options={newSkillOptions} onSelect={handleNewSkillSelect} language={settings.language} />}
      {skillTreeOpen && <SkillTreeModal skills={activeSkills} availablePoints={gameState.skillPoints} onAllocate={handleAllocateNode} onClose={() => setSkillTreeOpen(false)} language={settings.language} />}
      
      {settingsOpen && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setSettingsOpen(false)} />}
      {encyclopediaOpen && <EncyclopediaModal settings={settings} onClose={() => setEncyclopediaOpen(false)} />}
    </div>
  );
};

export default App;
