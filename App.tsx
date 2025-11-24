
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Inventory from './components/Inventory';
import LevelUpModal from './components/LevelUpModal';
import SettingsModal from './components/SettingsModal';
import EncyclopediaModal from './components/EncyclopediaModal';
import { AVAILABLE_SKILLS, BASE_STATS, CANVAS_HEIGHT, CANVAS_WIDTH, XP_SCALING_FACTOR, ENEMY_TYPES, DEFAULT_SETTINGS, TRANSLATIONS, GAME_ASSETS, TIME_SCALING_FACTOR, KINETIC_MAX_CHARGE, KINETIC_CHARGE_PER_PIXEL, GEM_BASE_XP, KINETIC_RANGE, BASIC_ATTACK_SKILL, MONSTER_AFFIXES, MAX_SKILL_LEVEL, BOSS_SPAWN_KILLS } from './constants';
import { Enemy, Entity, GameState, Item, ItemSlot, PlayerStats, Projectile, Skill, DamageNumber, Rarity, VisualEffect, WorldItem, EnemyType, Settings, EnemyAffix } from './types';
import { generateItem } from './utils/itemGenerator';
import { audioManager } from './utils/audioManager';
import { preloadImages } from './utils/imageLoader';
import { Backpack, Pause, Play, Settings as SettingsIcon, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  // --- Refs for High Frequency Game Loop State ---
  const playerRef = useRef<Entity>({ id: 0, x: 0, y: 0, width: 30, height: 30, color: 'red' });
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const gemsRef = useRef<Entity[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const visualEffectsRef = useRef<VisualEffect[]>([]); 
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  
  // Mechanics Refs
  const playerStatsRef = useRef<PlayerStats>({ ...BASE_STATS, hp: BASE_STATS.maxHp });
  const invulnTimerRef = useRef<number>(0);
  const playerVelocityRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const cameraRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const bvRotationRef = useRef<number>(0); // Global rotation tracker for Blade Vortex
  
  // Track last facing direction for idle attacks
  const facingRightRef = useRef<boolean>(true);

  // Kinetic Capacitor Skill Refs
  const kineticChargeRef = useRef<number>(0);
  const wasMovingRef = useRef<boolean>(false);
  
  // Boss Logic Refs
  const bossSpawnedRef = useRef<boolean>(false);
  const arenaConstraintsRef = useRef<{minX: number, maxX: number, minY: number, maxY: number} | null>(null);

  // --- React State for UI & Low Frequency Updates ---
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    gold: 0,
    time: 0,
    killCount: 0
  });

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [encyclopediaOpen, setEncyclopediaOpen] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [equipped, setEquipped] = useState<{ [key: string]: Item }>({});
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]); 
  const [levelUpOptions, setLevelUpOptions] = useState<Skill[] | null>(null);
  
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  
  const [uiStats, setUiStats] = useState<PlayerStats>({ ...BASE_STATS, hp: BASE_STATS.maxHp });

  const t = TRANSLATIONS[settings.language];

  // --- Init Assets ---
  useEffect(() => {
      preloadImages(GAME_ASSETS).then(() => {
          console.log("Assets loaded");
          setAssetsLoaded(true);
      });
  }, []);

  // --- Audio & Settings Sync ---
  useEffect(() => {
      audioManager.updateSettings(settings);
  }, [settings]);

  const recalculateStats = useCallback(() => {
    let newMaxHp = BASE_STATS.maxHp;
    let newArmor = BASE_STATS.armor;
    let newSpeed = BASE_STATS.speed;
    let dmgMult = BASE_STATS.damageMultiplier;
    let atkSpeedMult = BASE_STATS.attackSpeedMultiplier;
    let critChance = BASE_STATS.critChance;

    let incMaxHp = 0; 
    let incArmor = 0;
    let incSpeed = 0;
    let flatMaxHp = 0;
    let flatArmor = 0;
    let flatSpeed = 0;

    (Object.values(equipped) as Item[]).forEach(item => {
        if (!item) return;
        
        const allMods = [
            ...(item.implicit ? [item.implicit] : []),
            ...item.prefixes.flatMap(p => p.modifiers),
            ...item.suffixes.flatMap(p => p.modifiers),
            ...(item.modifiers || []) 
        ];

        allMods.forEach(mod => {
             if (mod.stat === 'maxHp') {
                 if (mod.isPercentage) incMaxHp += mod.value; 
                 else flatMaxHp += mod.value;
             } else if (mod.stat === 'armor') {
                 if (mod.isPercentage) incArmor += mod.value;
                 else flatArmor += mod.value;
             } else if (mod.stat === 'speed') {
                 if (mod.isPercentage) incSpeed += mod.value;
                 else flatSpeed += mod.value;
             } else if (mod.stat === 'damageMultiplier') {
                 dmgMult += mod.value; 
             } else if (mod.stat === 'attackSpeedMultiplier') {
                 atkSpeedMult += mod.value;
             } else if (mod.stat === 'critChance') {
                 critChance += mod.value;
             }
        });
    });

    newMaxHp = (newMaxHp + flatMaxHp) * (1 + incMaxHp);
    newArmor = (newArmor + flatArmor) * (1 + incArmor);
    newSpeed = (newSpeed + flatSpeed) * (1 + incSpeed);

    let currentHp = playerStatsRef.current.hp;
    if (currentHp > newMaxHp) currentHp = newMaxHp;
    
    const newStats = {
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
    };

    playerStatsRef.current = newStats;
    setUiStats(newStats); 
    
  }, [equipped]);

  useEffect(() => {
    recalculateStats();
  }, [equipped, recalculateStats]);

  const update = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver || levelUpOptions || inventoryOpen || settingsOpen || encyclopediaOpen) return;

    const stats = playerStatsRef.current;
    frameRef.current++;
    
    // --- PLAYER MOVEMENT ---
    let inputDx = 0;
    let inputDy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) inputDy -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) inputDy += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) inputDx -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) inputDx += 1;

    if (inputDx !== 0 || inputDy !== 0) {
        const len = Math.hypot(inputDx, inputDy);
        inputDx /= len;
        inputDy /= len;
    }

    const isMoving = inputDx !== 0 || inputDy !== 0;
    const accel = stats.speed * 0.15; 
    const friction = 0.85;
    
    if (isMoving) {
        playerVelocityRef.current.x += inputDx * accel;
        playerVelocityRef.current.y += inputDy * accel;
        
        const currentSpeed = Math.hypot(playerVelocityRef.current.x, playerVelocityRef.current.y);
        if (currentSpeed > stats.speed) {
            playerVelocityRef.current.x = (playerVelocityRef.current.x / currentSpeed) * stats.speed;
            playerVelocityRef.current.y = (playerVelocityRef.current.y / currentSpeed) * stats.speed;
        }
        if (inputDx > 0) facingRightRef.current = true;
        else if (inputDx < 0) facingRightRef.current = false;

    } else {
        playerVelocityRef.current.x *= friction;
        playerVelocityRef.current.y *= friction;
    }
    
    let nextX = playerRef.current.x + playerVelocityRef.current.x;
    let nextY = playerRef.current.y + playerVelocityRef.current.y;

    // --- ARENA CLAMP (If Boss Fighting) ---
    if (arenaConstraintsRef.current) {
        const { minX, maxX, minY, maxY } = arenaConstraintsRef.current;
        const padding = 20; 
        if (nextX < minX + padding) nextX = minX + padding;
        if (nextX > maxX - padding) nextX = maxX - padding;
        if (nextY < minY + padding) nextY = minY + padding;
        if (nextY > maxY - padding) nextY = maxY - padding;
        // Stop velocity if hitting wall
        if (nextX === minX + padding || nextX === maxX - padding) playerVelocityRef.current.x = 0;
        if (nextY === minY + padding || nextY === maxY - padding) playerVelocityRef.current.y = 0;
    }
    
    const oldX = playerRef.current.x;
    const oldY = playerRef.current.y;
    playerRef.current.x = nextX;
    playerRef.current.y = nextY;
    
    const movedDist = Math.hypot(playerRef.current.x - oldX, playerRef.current.y - oldY);

    // --- KINETIC CAPACITOR ---
    const kineticSkill = activeSkills.find(s => s.type === 'kinetic');
    if (kineticSkill) {
        const chargeBonus = (kineticSkill.statsPerLevel?.damage || 0) * (kineticSkill.level - 1) * 3;
        const maxCharge = KINETIC_MAX_CHARGE + chargeBonus;
        const chargeRate = kineticSkill.level >= MAX_SKILL_LEVEL ? KINETIC_CHARGE_PER_PIXEL * 5 : KINETIC_CHARGE_PER_PIXEL;

        if (isMoving) {
             const chargeGain = movedDist * chargeRate;
             kineticChargeRef.current = Math.min(maxCharge, kineticChargeRef.current + chargeGain);
             const isMaxCharge = kineticChargeRef.current >= maxCharge;
             
             if (isMaxCharge && kineticSkill.level >= MAX_SKILL_LEVEL && frameRef.current % 10 === 0) {
                 wasMovingRef.current = true; 
             }
             if (frameRef.current % 5 === 0) {
                 visualEffectsRef.current.push({
                     id: `spark_${Math.random()}`,
                     type: 'hit',
                     x: playerRef.current.x + (Math.random() - 0.5) * 40,
                     y: playerRef.current.y + (Math.random() - 0.5) * 40,
                     color: isMaxCharge ? `rgba(255, 50, 50, 0.8)` : `rgba(14, 165, 233, ${kineticChargeRef.current / maxCharge})`,
                     duration: 15, maxDuration: 15, scale: isMaxCharge ? 0.8 : 0.5
                 });
             }
        } else if (wasMovingRef.current || (kineticSkill.level >= MAX_SKILL_LEVEL && kineticChargeRef.current >= maxCharge)) {
             if (kineticChargeRef.current > maxCharge * 0.3) {
                 const chargePct = kineticChargeRef.current / maxCharge;
                 const bolts = Math.floor(3 + chargePct * 6); 
                 const lvlDmg = (kineticSkill.statsPerLevel?.damage || 0) * (kineticSkill.level - 1);
                 const damage = (kineticSkill.damage + lvlDmg) * stats.damageMultiplier * (0.8 + chargePct * 1.2); 
                 if (chargePct > 0.8) {
                    visualEffectsRef.current.push({ id: `dim_${frameRef.current}`, type: 'screen_dim', x: 0, y: 0, color: 'black', duration: 15, maxDuration: 15 });
                 }
                 audioManager.playShoot(); 
                 const range = KINETIC_RANGE + (kineticSkill.statsPerLevel?.area || 0) * (kineticSkill.level - 1);
                 for (let i = 0; i < bolts; i++) {
                     let targetX, targetY;
                     const validEnemies = enemiesRef.current.filter(e => Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y) < range && !e.isBoss);
                     if (validEnemies.length > 0 && Math.random() > 0.3) {
                         const randomEnemy = validEnemies[Math.floor(Math.random() * validEnemies.length)];
                         targetX = randomEnemy.x; targetY = randomEnemy.y;
                         randomEnemy.hp -= damage;
                         randomEnemy.hitFlash = 5;
                         damageNumbersRef.current.push({ id: Math.random(), x: targetX, y: targetY - 30, value: damage, life: 40, isCrit: true });
                     } else {
                         const angle = Math.random() * Math.PI * 2;
                         const dist = Math.random() * (range * 0.8);
                         targetX = playerRef.current.x + Math.cos(angle) * dist;
                         targetY = playerRef.current.y + Math.sin(angle) * dist;
                     }
                     setTimeout(() => {
                         visualEffectsRef.current.push({ id: `storm_${Math.random()}`, type: 'lightning', x: targetX, y: targetY - 300, targetX: targetX, targetY: targetY, color: chargePct > 0.8 ? '#f87171' : '#0ea5e9', scale: 3 + chargePct * 2, duration: 15, maxDuration: 15 });
                         visualEffectsRef.current.push({ id: `storm_expl_${Math.random()}`, type: 'explosion', x: targetX, y: targetY, color: chargePct > 0.8 ? '#ef4444' : '#bae6fd', scale: 40, duration: 10, maxDuration: 10 });
                     }, Math.random() * 200); 
                 }
                 kineticChargeRef.current = 0;
             }
        }
    }
    wasMovingRef.current = isMoving;

    // --- SPAWNING LOGIC ---
    if (!bossSpawnedRef.current && gameState.killCount >= BOSS_SPAWN_KILLS) {
        // SPAWN BOSS
        bossSpawnedRef.current = true;
        
        // LOCK ARENA
        const camX = cameraRef.current.x;
        const camY = cameraRef.current.y;
        arenaConstraintsRef.current = {
            minX: camX,
            maxX: camX + CANVAS_WIDTH,
            minY: camY,
            maxY: camY + CANVAS_HEIGHT
        };

        const angle = Math.random() * Math.PI * 2;
        const dist = 300; // Spawn closer within arena
        // Clamp spawn to arena so he doesn't spawn outside
        let bx = playerRef.current.x + Math.cos(angle) * dist;
        let by = playerRef.current.y + Math.sin(angle) * dist;
        
        bx = Math.max(arenaConstraintsRef.current.minX + 50, Math.min(arenaConstraintsRef.current.maxX - 50, bx));
        by = Math.max(arenaConstraintsRef.current.minY + 50, Math.min(arenaConstraintsRef.current.maxY - 50, by));

        const typeStats = ENEMY_TYPES['boss_valos'];
        
        enemiesRef.current.push({
            id: Math.random(), x: bx, y: by,
            width: typeStats.width, height: typeStats.width,
            color: typeStats.color,
            hp: typeStats.hp, maxHp: typeStats.hp,
            speed: typeStats.speed, damage: typeStats.damage,
            type: 'boss_valos', isBoss: true,
            hitFlash: 0, animationOffset: 0, affixes: [],
            phase: 1, mirrorStack: 0, prismIds: [], attackTimer: 180
        });
        
        // Clear non-boss enemies to focus on the fight
        enemiesRef.current = enemiesRef.current.filter(e => e.isBoss);
    } 
    else if (!bossSpawnedRef.current && frameRef.current - lastSpawnRef.current > Math.max(20, 60 - gameState.level * 2)) {
      const angle = Math.random() * Math.PI * 2;
      const dist = CANVAS_WIDTH / 1.5 + Math.random() * 200; 
      const ex = playerRef.current.x + Math.cos(angle) * dist;
      const ey = playerRef.current.y + Math.sin(angle) * dist;

      const isElite = Math.random() < 0.05;
      const types: EnemyType[] = ['zombie', 'skeleton', 'bat'];
      if (gameState.level > 3) types.push('golem');
      const typeKey = types[Math.floor(Math.random() * types.length)];
      const typeStats = ENEMY_TYPES[typeKey];
      const timeScaling = 1 + (gameState.time / 60) * TIME_SCALING_FACTOR;

      const numAffixes = Math.min(5, Math.floor(gameState.time / 60));
      const affixes: EnemyAffix[] = [];
      if (numAffixes > 0) {
          const pool = [...MONSTER_AFFIXES];
          for(let i=0; i<numAffixes; i++) {
              if (pool.length === 0) break;
              const idx = Math.floor(Math.random() * pool.length);
              affixes.push(pool[idx]);
              pool.splice(idx, 1); 
          }
      }

      let hp = (typeStats.hp + gameState.level * 5) * (isElite ? 5 : 1) * timeScaling;
      let speed = (typeStats.speed * (0.8 + Math.random() * 0.4)) * (isElite ? 1.2 : 1);
      let damage = (typeStats.damage + gameState.level) * timeScaling;
      let width = isElite ? typeStats.width * 1.4 : typeStats.width;
      
      affixes.forEach(aff => {
          if (aff.statMod.maxHp) hp *= aff.statMod.maxHp;
          if (aff.statMod.speed) speed *= aff.statMod.speed;
          if (aff.statMod.damage) damage *= aff.statMod.damage;
          if (aff.statMod.width) width *= aff.statMod.width;
      });

      enemiesRef.current.push({
        id: Math.random(), x: ex, y: ey, width: width, height: width,
        color: typeStats.color, hp: hp, maxHp: hp, speed: speed, damage: damage,
        type: typeKey as EnemyType, isBoss: false, isElite: isElite, hitFlash: 0, animationOffset: Math.random() * Math.PI * 2, affixes: affixes
      });
      lastSpawnRef.current = frameRef.current;
    }

    // --- SKILL CASTING ---
    activeSkills.forEach(skill => {
        if (skill.type === 'kinetic') return;
        let cd = skill.cooldown;
        if (skill.statsPerLevel?.cooldown) cd += skill.statsPerLevel.cooldown * (skill.level - 1);
        const cooldownReady = frameRef.current % Math.ceil(Math.max(5, cd) / stats.attackSpeedMultiplier) === 0;

        if (skill.type === 'orbit') {
            const existingBlades = projectilesRef.current.filter(p => p.sourceSkillId === skill.id && !p.isEnemy);
            const activeCount = existingBlades.length;
            const bladeBonus = (skill.statsPerLevel?.projectileCount || 0) * (skill.level - 1);
            const bladeCap = (skill.projectileCount || 2) + bladeBonus;

            if (activeCount < bladeCap) {
                const missing = bladeCap - activeCount;
                for(let i=0; i<missing; i++) {
                    projectilesRef.current.push({
                        id: Math.random(), x: playerRef.current.x, y: playerRef.current.y, width: 40, height: 10,
                        color: skill.color, vx: 0, vy: 0,
                        damage: (skill.damage + (skill.statsPerLevel?.damage || 0)*(skill.level-1)) * stats.damageMultiplier,
                        duration: 9999999, penetration: 9999, sourceSkillId: skill.id,
                        isOrbit: true, orbitAngle: 0, orbitRadius: 70 + skill.level * 5, orbitIndex: 0 
                    });
                }
                if (missing > 0 && cooldownReady) audioManager.playSFX('sfx'); 
            }
            const speedMult = (skill.level >= MAX_SKILL_LEVEL) ? 3 : (1 + skill.level * 0.1);
            const rotSpeed = 0.02 * stats.attackSpeedMultiplier * speedMult;
            bvRotationRef.current += rotSpeed;
            const currentBlades = projectilesRef.current.filter(p => p.sourceSkillId === skill.id && !p.isEnemy);
            currentBlades.forEach((p, index) => {
                 p.damage = (skill.damage + (skill.statsPerLevel?.damage || 0)*(skill.level-1)) * stats.damageMultiplier;
                 p.orbitRadius = 70 + skill.level * 5;
                 const goldenOffset = index * 2.39996;
                 p.orbitAngle = bvRotationRef.current + goldenOffset;
                 p.x = playerRef.current.x + Math.cos(p.orbitAngle) * p.orbitRadius;
                 p.y = playerRef.current.y + Math.sin(p.orbitAngle) * p.orbitRadius;
            });
        }
        else if (cooldownReady) {
            if (skill.type === 'melee') {
                let angle = 0;
                if (isMoving) angle = Math.atan2(playerVelocityRef.current.y, playerVelocityRef.current.x);
                else {
                    const closest = enemiesRef.current.reduce((prev, curr) => {
                         const d = Math.hypot(curr.x - playerRef.current.x, curr.y - playerRef.current.y);
                         return d < 300 && d < (prev ? Math.hypot(prev.x - playerRef.current.x, prev.y - playerRef.current.y) : Infinity) ? curr : prev;
                    }, null as Enemy | null);
                    if (closest) angle = Math.atan2(closest.y - playerRef.current.y, closest.x - playerRef.current.x);
                    else angle = facingRightRef.current ? 0 : Math.PI;
                }
                const areaBonus = (skill.statsPerLevel?.area || 0) * (skill.level - 1);
                const masteryArea = skill.level >= MAX_SKILL_LEVEL ? 2 : 1;
                const levelScale = (1.0 + areaBonus) * masteryArea;

                visualEffectsRef.current.push({
                    id: `slash_${Math.random()}`, type: 'melee_slash', x: playerRef.current.x, y: playerRef.current.y,
                    rotation: angle, color: '#e2e8f0', duration: 12, maxDuration: 12, scale: levelScale
                });
                audioManager.playHit(true); 

                const range = 130 * levelScale;
                const arc = Math.PI / 1.5; 
                const dmgBonus = (skill.statsPerLevel?.damage || 0) * (skill.level - 1);
                const finalDmg = (skill.damage + dmgBonus) * stats.damageMultiplier;

                enemiesRef.current.forEach(e => {
                    const dx = e.x - playerRef.current.x; const dy = e.y - playerRef.current.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < range) {
                        const angleToEnemy = Math.atan2(dy, dx);
                        let angleDiff = angleToEnemy - angle;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI*2;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
                        if (Math.abs(angleDiff) < arc / 2) {
                            const isCrit = Math.random() < stats.critChance;
                            const dmg = finalDmg * (isCrit ? stats.critMultiplier : 1);
                            e.hp -= dmg; e.hitFlash = 5;
                            damageNumbersRef.current.push({ id: Math.random(), x: e.x, y: e.y - 20, value: dmg, life: 30, isCrit });
                            visualEffectsRef.current.push({ id: `hit_${Math.random()}`, type: 'hit', x: e.x, y: e.y, color: '#f8fafc', duration: 8, maxDuration: 8 });
                        }
                    }
                });
            }
            else {
                let target = null;
                let minDist = Infinity;
                enemiesRef.current.forEach(e => {
                    const dist = Math.hypot(e.x - playerRef.current.x, e.y - playerRef.current.y);
                    if (dist < minDist) { minDist = dist; target = e; }
                });
                if (skill.type === 'projectile') {
                    let angle = 0;
                    if (target) angle = Math.atan2(target.y - playerRef.current.y, target.x - playerRef.current.x);
                    else if (isMoving) angle = Math.atan2(playerVelocityRef.current.y, playerVelocityRef.current.x);
                    else return; 
                    audioManager.playShoot();

                    let projCount = 1;
                    if (skill.id === 'icebolt') {
                         if (skill.level >= 3) projCount = 3;
                         if (skill.level >= 5) projCount = 5;
                         if (skill.level >= MAX_SKILL_LEVEL) projCount = 16;
                    }
                    for (let i = 0; i < projCount; i++) {
                        let finalAngle = angle;
                        if (skill.level >= MAX_SKILL_LEVEL && skill.id === 'icebolt') finalAngle = (Math.PI * 2 / projCount) * i;
                        else { const spread = (i - (projCount - 1) / 2) * 0.3; finalAngle = angle + spread; }
                        projectilesRef.current.push({
                            id: Math.random(), x: playerRef.current.x, y: playerRef.current.y, width: 15, height: 15, color: skill.color,
                            vx: Math.cos(finalAngle) * (skill.projectileSpeed || 5), vy: Math.sin(finalAngle) * (skill.projectileSpeed || 5),
                            damage: (skill.damage + (skill.statsPerLevel?.damage || 0) * (skill.level - 1)) * stats.damageMultiplier,
                            duration: 120, penetration: 1, sourceSkillId: skill.id
                        });
                    }
                } else if (skill.type === 'aoe' && target) {
                     const rangeBonus = (skill.statsPerLevel?.range || 0) * (skill.level - 1);
                     if (minDist > (skill.range || 300) + rangeBonus) return;
                     const damage = (skill.damage + (skill.statsPerLevel?.damage || 0) * (skill.level - 1)) * stats.damageMultiplier;
                     target.hp -= damage; target.hitFlash = 5;
                     audioManager.playShoot();
                     damageNumbersRef.current.push({ id: Math.random(), x: target.x, y: target.y - 20, value: damage, life: 30, isCrit: true });
                     visualEffectsRef.current.push({ id: `arc_${Math.random()}`, type: 'lightning', x: playerRef.current.x, y: playerRef.current.y, targetX: target.x, targetY: target.y, color: '#60a5fa', duration: 15, maxDuration: 15 });
                     
                     let maxChains = 1 + Math.floor(skill.level / 2);
                     if (skill.level >= MAX_SKILL_LEVEL) maxChains = 99; 
                     let currentSource = target;
                     const chainHistory = [target];
                     for(let c=0; c<maxChains; c++) {
                         let nextTarget = null;
                         for (const e of enemiesRef.current) {
                             if (chainHistory.includes(e)) continue;
                             if (Math.hypot(e.x - currentSource.x, e.y - currentSource.y) < 200) { nextTarget = e; break; }
                         }
                         if (nextTarget) {
                             nextTarget.hp -= damage * 0.8; nextTarget.hitFlash = 5;
                             visualEffectsRef.current.push({ id: `arc_chain_${Math.random()}`, type: 'lightning', x: currentSource.x, y: currentSource.y, targetX: nextTarget.x, targetY: nextTarget.y, color: '#60a5fa', duration: 15, maxDuration: 15 });
                             currentSource = nextTarget; chainHistory.push(nextTarget);
                         } else break;
                     }
                }
            }
        }
    });

    if (invulnTimerRef.current > 0) invulnTimerRef.current--;

    // --- ENEMY & BOSS LOGIC ---
    enemiesRef.current.forEach(enemy => {
       // --- BOSS AI ---
       if (enemy.isBoss && enemy.type === 'boss_valos') {
           enemy.attackTimer = (enemy.attackTimer || 0) - 1;
           const prisms = enemiesRef.current.filter(e => e.type === 'prism');

           // Phase Transition to 3 (Doppelganger)
           if (enemy.hp < enemy.maxHp * 0.4 && enemy.phase !== 3) {
               enemy.phase = 3;
               // Kill prisms
               prisms.forEach(p => p.hp = 0);
               // Spawn Doppelgangers
               for(let i=0; i<2; i++) {
                   const typeStats = ENEMY_TYPES['doppelganger'];
                   enemiesRef.current.push({
                        id: Math.random(), x: enemy.x + Math.cos(i*Math.PI)*100, y: enemy.y + Math.sin(i*Math.PI)*100,
                        width: 30, height: 30, color: typeStats.color,
                        hp: typeStats.hp, maxHp: typeStats.hp, speed: typeStats.speed, damage: typeStats.damage,
                        type: 'doppelganger', hitFlash: 0, animationOffset: 0, affixes: []
                   });
               }
           }
           // Phase Transition to 2 (Cage)
           else if (enemy.hp < enemy.maxHp * 0.6 && enemy.phase === 1) {
               enemy.phase = 2;
           }

           // Phase 1: Spawn Prisms & Shoot Beam
           if (enemy.phase === 1) {
               if (prisms.length < 4 && Math.random() < 0.02) {
                   const px = playerRef.current.x + (Math.random() - 0.5) * 800;
                   const py = playerRef.current.y + (Math.random() - 0.5) * 800;
                   // Clamp prisms to arena if needed, but boss keeps player near anyway
                   const ps = ENEMY_TYPES['prism'];
                   enemiesRef.current.push({
                        id: Math.random(), x: px, y: py, width: ps.width, height: ps.width, color: ps.color,
                        hp: ps.hp, maxHp: ps.hp, speed: 0, damage: 0, type: 'prism', hitFlash: 0, animationOffset: 0, affixes: []
                   });
               }
               // Beam Attack
               if (enemy.attackTimer <= 0 && prisms.length > 0) {
                   enemy.attackTimer = 180; // Reset
                   const targetPrism = prisms[Math.floor(Math.random() * prisms.length)];
                   // Fire Beam Visual
                   visualEffectsRef.current.push({
                       id: `beam_main_${Math.random()}`, type: 'laser_beam', x: enemy.x, y: enemy.y, targetX: targetPrism.x, targetY: targetPrism.y,
                       color: '#a78bfa', duration: 20, maxDuration: 20, scale: 5, isEnemy: true
                   });
                   // Check Player Hit on Main Beam
                   // (Simplified: Line Segment Collision)
                   // Split Beams
                   setTimeout(() => {
                       for(let i=0; i<3; i++) {
                           const angle = (Math.PI * 2 / 3) * i + Math.random();
                           const tx = targetPrism.x + Math.cos(angle) * 1000;
                           const ty = targetPrism.y + Math.sin(angle) * 1000;
                           visualEffectsRef.current.push({
                               id: `beam_split_${Math.random()}`, type: 'laser_beam', x: targetPrism.x, y: targetPrism.y, targetX: tx, targetY: ty,
                               color: '#a78bfa', duration: 20, maxDuration: 20, scale: 3, isEnemy: true
                           });
                           // Create invisible projectiles along the beam for damage
                           projectilesRef.current.push({
                               id: Math.random(), x: targetPrism.x, y: targetPrism.y, width: 20, height: 20, color: 'transparent',
                               vx: Math.cos(angle) * 15, vy: Math.sin(angle) * 15, damage: 25, duration: 60, penetration: 99, 
                               sourceSkillId: 'boss_beam', isEnemy: true
                           });
                       }
                   }, 300);
               }
           }
           // Phase 2: Kaleidoscope Cage
           else if (enemy.phase === 2) {
               if (prisms.length < 3) return; // Need prisms
               // Draw visual
               const points = prisms.map(p => ({x: p.x, y: p.y}));
               visualEffectsRef.current.push({
                   id: `cage_${frameRef.current}`, type: 'cage_polygon', x: 0, y: 0, points: points, color: 'purple', duration: 1, maxDuration: 1
               });
               
               // Check if player is inside polygon (Point in Polygon)
               let inside = false;
               for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const xi = points[i].x, yi = points[i].y;
                    const xj = points[j].x, yj = points[j].y;
                    const intersect = ((yi > playerRef.current.y) !== (yj > playerRef.current.y))
                        && (playerRef.current.x < (xj - xi) * (playerRef.current.y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
               }
               
               // Safe zone check (near prism)
               let safe = false;
               prisms.forEach(p => {
                   if (Math.hypot(p.x - playerRef.current.x, p.y - playerRef.current.y) < 100) safe = true;
               });

               if (inside && !safe && frameRef.current % 30 === 0) {
                   // Void Damage
                   playerStatsRef.current.hp -= 15;
                   visualEffectsRef.current.push({ id: `void_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: '#4c1d95', duration: 20, maxDuration: 20});
                   setUiStats({...playerStatsRef.current});
               }
           }
       }
       // --- DOPPELGANGER AI ---
       else if (enemy.type === 'doppelganger') {
           enemy.attackTimer = (enemy.attackTimer || 0) - 1;
           if ((enemy.attackTimer || 0) <= 0) {
               enemy.attackTimer = 120;
               // Mimic a player skill
               const skill = activeSkills[Math.floor(Math.random() * activeSkills.length)];
               if (skill.type === 'projectile') {
                    const angle = Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x);
                    projectilesRef.current.push({
                        id: Math.random(), x: enemy.x, y: enemy.y, width: 15, height: 15, color: '#ef4444',
                        vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, damage: 15, duration: 120, penetration: 1, 
                        sourceSkillId: 'mimic', isEnemy: true
                    });
               } else if (skill.type === 'melee') {
                    if (Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y) < 150) {
                        visualEffectsRef.current.push({
                            id: `slash_bad_${Math.random()}`, type: 'melee_slash', x: enemy.x, y: enemy.y,
                            rotation: Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x), color: '#ef4444', duration: 12, maxDuration: 12, scale: 1
                        });
                        // Direct damage handled in collision if possible, or simple check here
                        if (Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y) < 100) {
                            playerStatsRef.current.hp -= 20;
                            setUiStats({...playerStatsRef.current});
                        }
                    }
               }
           }
       }

       // Regular Movement
       let moveSpeed = enemy.speed;
       if (enemy.slowTimer && enemy.slowTimer > 0) {
           moveSpeed *= 0.5;
           enemy.slowTimer--;
       }
       // Regenerating Affix
       if (enemy.affixes.some(a => a.name === "Regenerating") && frameRef.current % 60 === 0) {
           enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.05);
       }
       
       if (enemy.type !== 'prism') {
           const angle = Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x);
           enemy.x += Math.cos(angle) * moveSpeed;
           enemy.y += Math.sin(angle) * moveSpeed;
           
           // Keep Boss inside Arena if active
           if (enemy.isBoss && arenaConstraintsRef.current) {
                const { minX, maxX, minY, maxY } = arenaConstraintsRef.current;
                const p = 50;
                if (enemy.x < minX + p) enemy.x = minX + p;
                if (enemy.x > maxX - p) enemy.x = maxX - p;
                if (enemy.y < minY + p) enemy.y = minY + p;
                if (enemy.y > maxY - p) enemy.y = maxY - p;
           }
       }
       if (enemy.hitFlash > 0) enemy.hitFlash--;

       // Collision with Player
       const distToPlayer = Math.hypot(playerRef.current.x - enemy.x, playerRef.current.y - enemy.y);
       if (enemy.damage > 0 && distToPlayer < (playerRef.current.width/2 + enemy.width/2)) {
           if (invulnTimerRef.current <= 0) {
                playerStatsRef.current.hp -= Math.max(1, enemy.damage - stats.armor * 0.1);
                invulnTimerRef.current = 30; 
                audioManager.playHit(true); 
                visualEffectsRef.current.push({ id: `blood_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: 'red', duration: 10, maxDuration: 10 });
           }
       }
    });

    if (invulnTimerRef.current === 30) { 
         setUiStats({...playerStatsRef.current});
    }


    // --- PROJECTILE UPDATE & COLLISION ---
    projectilesRef.current.forEach(p => {
        if (!p.isOrbit) {
             p.x += p.vx; p.y += p.vy; p.duration--;
        }
    });

    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const p = projectilesRef.current[i];
        let hit = false;
        
        // ENEMY PROJECTILES -> HIT PLAYER
        if (p.isEnemy) {
            const dist = Math.hypot(p.x - playerRef.current.x, p.y - playerRef.current.y);
            if (dist < (playerRef.current.width/2 + p.width/2)) {
                if (invulnTimerRef.current <= 0) {
                    playerStatsRef.current.hp -= Math.max(1, p.damage - stats.armor * 0.1);
                    setUiStats({...playerStatsRef.current});
                    invulnTimerRef.current = 20;
                    visualEffectsRef.current.push({ id: `hit_p_${Math.random()}`, type: 'hit', x: playerRef.current.x, y: playerRef.current.y, color: '#ef4444', duration: 10, maxDuration: 10 });
                    hit = true;
                }
            }
        } 
        // PLAYER PROJECTILES -> HIT ENEMIES
        else {
            for (const e of enemiesRef.current) {
                const pRadius = p.sourceSkillId === 'icebolt' ? 25 : p.isOrbit ? 25 : p.width/2;
                if (Math.hypot(p.x - e.x, p.y - e.y) < (e.width/2 + pRadius)) { 
                    if (p.isOrbit && e.hitFlash > 0) continue;
                    
                    // Boss Mirror Carapace
                    if (e.isBoss && e.type === 'boss_valos') {
                        e.mirrorStack = (e.mirrorStack || 0) + 1;
                        if (e.mirrorStack >= 10) {
                            e.mirrorStack = 0;
                            // Burst Shards
                            for(let k=0; k<3; k++) {
                                const ang = (Math.PI*2/3)*k;
                                projectilesRef.current.push({
                                    id: Math.random(), x: e.x, y: e.y, width: 15, height: 15, color: '#c4b5fd',
                                    vx: Math.cos(ang)*6, vy: Math.sin(ang)*6, damage: 15, duration: 60, penetration: 1, sourceSkillId: 'shard', isEnemy: true
                                });
                            }
                        }
                    }

                    const isCrit = Math.random() < stats.critChance;
                    const dmg = p.damage * (isCrit ? stats.critMultiplier : 1);
                    e.hp -= dmg;
                    e.hitFlash = 5; 
                    audioManager.playHit();
                    
                    damageNumbersRef.current.push({ id: Math.random(), x: e.x, y: e.y - 20, value: dmg, life: 30, isCrit });
                    
                    if (p.sourceSkillId === 'icebolt') {
                         audioManager.playHit(true); 
                         visualEffectsRef.current.push({ id: `expl_${Math.random()}`, type: 'explosion', x: e.x, y: e.y, color: '#06b6d4', duration: 20, maxDuration: 20, scale: 60 });
                         enemiesRef.current.forEach(nearby => {
                             if (Math.hypot(nearby.x - e.x, nearby.y - e.y) < 80) { 
                                 nearby.hp -= dmg * 0.5; nearby.hitFlash = 5;
                             }
                         });
                         const skill = activeSkills.find(s => s.id === 'icebolt');
                         if (skill && skill.level >= 5) e.slowTimer = 180; 
                         hit = true; 
                    } else if (p.isOrbit) {
                         visualEffectsRef.current.push({ id: `slice_${Math.random()}`, type: 'hit', x: e.x, y: e.y, color: '#a7f3d0', duration: 5, maxDuration: 5 });
                    } else {
                         visualEffectsRef.current.push({ id: `hit_${Math.random()}`, type: 'hit', x: e.x, y: e.y, color: '#ef4444', duration: 10, maxDuration: 10 });
                         hit = true;
                    }
                    if (hit) break;
                }
            }
        }
        if (hit && !p.isOrbit) projectilesRef.current.splice(i, 1);
        else if (!p.isOrbit && p.duration <= 0) projectilesRef.current.splice(i, 1);
    }

    // Cleanup & Death
    const livingEnemies: Enemy[] = [];
    enemiesRef.current.forEach(e => {
        if (e.hp > 0) livingEnemies.push(e);
        else {
            if (e.type === 'prism') {
                // Prism destroyed visual
                visualEffectsRef.current.push({ id: `shatter_${Math.random()}`, type: 'explosion', x: e.x, y: e.y, color: '#a78bfa', duration: 20, maxDuration: 20, scale: 50 });
                return;
            }

            if (!e.isBoss && !e.type.startsWith('boss_')) {
                 setGameState(prev => ({ ...prev, killCount: prev.killCount + 1 }));
            } else if (e.type === 'boss_valos') {
                 // Boss Win Condition or just tons of loot?
                 for(let i=0; i<10; i++) {
                     gemsRef.current.push({ id: Math.random(), x: e.x + (Math.random()-0.5)*100, y: e.y + (Math.random()-0.5)*100, width: 14, height: 14, color: 'purple', xpValue: 200 });
                 }
                 setWorldItems(prev => [...prev, { id: `boss_drop_${Math.random()}`, x: e.x, y: e.y, item: generateItem(gameState.level, Rarity.Unique), frameCreated: frameRef.current }]);
                 bossSpawnedRef.current = false; // Allow respawn later?
                 arenaConstraintsRef.current = null; // Free movement
            }

            let deathColor = '#4c5c48'; 
            if (e.type === 'skeleton') deathColor = '#d4d4d4'; 
            if (e.type === 'bat') deathColor = '#312e81'; 
            if (e.type === 'golem') deathColor = '#57534e'; 
            visualEffectsRef.current.push({
                 id: `death_${Math.random()}`, type: 'death_poof', x: e.x, y: e.y, color: deathColor, duration: 30, maxDuration: 30, scale: e.width
            });

            const gameMinutes = gameState.time / 60;
            let xpType = 'low'; 
            const roll = Math.random();
            if (gameMinutes < 1) { if (roll < 0.05) xpType = 'mid'; } 
            else if (gameMinutes < 3) { if (roll < 0.20) xpType = 'mid'; if (roll < 0.02) xpType = 'high'; } 
            else { if (roll < 0.50) xpType = 'mid'; if (roll < 0.15) xpType = 'high'; }
            if (e.isBoss) xpType = 'high';

            let baseXP = GEM_BASE_XP;
            let colorCode = 'blue';
            if (xpType === 'mid') { baseXP = 25; colorCode = 'gold'; }
            if (xpType === 'high') { baseXP = 50; colorCode = 'purple'; }
            baseXP *= (1 + e.affixes.length * 0.5);
            const gemSize = xpType === 'high' ? 14 : xpType === 'mid' ? 10 : 8;
            gemsRef.current.push({ id: Math.random(), x: e.x, y: e.y, width: gemSize, height: gemSize, color: colorCode, xpValue: baseXP });
            
            let dropChance = 0.005; 
            if (e.isBoss) dropChance = 1.0;
            else if (e.width > 30) dropChance = 0.08; 

            if (Math.random() < dropChance) {
                const newItem = generateItem(gameState.level, e.isBoss ? Rarity.Rare : undefined);
                setWorldItems(prev => [...prev, { id: `world_${Math.random()}`, x: e.x, y: e.y, item: newItem, frameCreated: frameRef.current }]);
            }
        }
    });
    enemiesRef.current = livingEnemies;
    
    visualEffectsRef.current = visualEffectsRef.current.filter(effect => {
        effect.duration--;
        return effect.duration > 0;
    });

    const remainingGems: Entity[] = [];
    let xpGained = 0;
    gemsRef.current.forEach(g => {
        const dist = Math.hypot(playerRef.current.x - g.x, playerRef.current.y - g.y);
        if (dist < stats.pickupRange) {
            g.x += (playerRef.current.x - g.x) * 0.15;
            g.y += (playerRef.current.y - g.y) * 0.15;
            if (dist < 20) {
                xpGained += (g.xpValue || 10);
            } else {
                remainingGems.push(g);
            }
        } else {
            remainingGems.push(g);
        }
    });
    gemsRef.current = remainingGems;

    if (xpGained > 0) {
        setGameState(prev => {
            let newXp = prev.xp + xpGained;
            let newLevel = prev.level;
            let newXpToNext = prev.xpToNextLevel;
            let levelledUp = false;
            if (newXp >= newXpToNext) {
                newXp -= newXpToNext;
                newLevel++;
                newXpToNext = Math.floor(newXpToNext * XP_SCALING_FACTOR);
                levelledUp = true;
            }
            if (levelledUp) {
                audioManager.playLevelUp();
                
                const allOptions = [...AVAILABLE_SKILLS]; 
                const availableOptions = allOptions.filter(opt => {
                     const existing = activeSkills.find(s => s.id === opt.id);
                     if (existing && existing.level >= MAX_SKILL_LEVEL) return false;
                     return true;
                });

                if (availableOptions.length === 0) {
                    setLevelUpOptions(null); 
                } else {
                    const randomOptions = availableOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
                    const optionsWithContext = randomOptions.map(opt => {
                        const existing = activeSkills.find(s => s.id === opt.id);
                        if (existing) { return { ...opt, level: existing.level }; }
                        return { ...opt, level: 0 }; 
                    });
                    setLevelUpOptions(optionsWithContext);
                }
            }
            return { ...prev, xp: newXp, level: newLevel, xpToNextLevel: newXpToNext };
        });
    }

    damageNumbersRef.current = damageNumbersRef.current.filter(dn => {
        dn.y -= 0.5; dn.life--; return dn.life > 0;
    });

    if (playerStatsRef.current.hp <= 0) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        audioManager.stopMusic();
    }

    if (frameRef.current % 60 === 0) {
        setGameState(prev => ({ ...prev, time: prev.time + 1 }));
    }

  }, [gameState, activeSkills, levelUpOptions, inventoryOpen, settingsOpen, encyclopediaOpen]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      update();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [update]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = true;
        keysPressed.current[e.key] = true;
        if (e.key === 'i' || e.key === 'I') {
            setInventoryOpen(prev => !prev);
            if (!inventoryOpen) audioManager.playUI('hover');
        } 
        if (e.key === 'Escape') {
             setInventoryOpen(false);
             setSettingsOpen(false);
             setEncyclopediaOpen(false);
        }
        if (e.key === 'p') setGameState(prev => ({...prev, isPaused: !prev.isPaused}));
    };
    const handleUp = (e: KeyboardEvent) => {
        keysPressed.current[e.key.toLowerCase()] = false;
        keysPressed.current[e.key] = false;
    };
    const handleBlur = () => { keysPressed.current = {}; };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('blur', handleBlur);
    return () => {
        window.removeEventListener('keydown', handleDown);
        window.removeEventListener('keyup', handleUp);
        window.removeEventListener('blur', handleBlur);
    };
  }, [inventoryOpen]);

  const startGame = () => {
    audioManager.init();
    audioManager.startMusic();
    audioManager.playUI('click');

    playerRef.current = { id: 0, x: 0, y: 0, width: 30, height: 30, color: 'red' };
    enemiesRef.current = [];
    projectilesRef.current = [];
    gemsRef.current = [];
    damageNumbersRef.current = [];
    visualEffectsRef.current = [];
    
    cameraRef.current = { x: -CANVAS_WIDTH/2, y: -CANVAS_HEIGHT/2};
    arenaConstraintsRef.current = null;
    
    setWorldItems([]);
    bossSpawnedRef.current = false;
    
    playerStatsRef.current = { ...BASE_STATS, hp: BASE_STATS.maxHp };
    setUiStats({ ...BASE_STATS, hp: BASE_STATS.maxHp });
    
    setInventory([]);
    setEquipped({});
    
    const startingSkill = {...BASIC_ATTACK_SKILL, level: 1};
    setActiveSkills([startingSkill]); 
    
    kineticChargeRef.current = 0;
    
    setGameState({
        isPlaying: true, isPaused: false, isGameOver: false,
        level: 1, xp: 0, xpToNextLevel: 100, gold: 0, time: 0, killCount: 0
    });
    setInventory([generateItem(1, Rarity.Magic)]);
  };

  const handleSkillSelect = (skillOption: Skill) => {
      setActiveSkills(prev => {
          const existingIndex = prev.findIndex(s => s.id === skillOption.id);
          if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], level: updated[existingIndex].level + 1 };
              return updated;
          } else {
              return [...prev, {...skillOption, level: 1}];
          }
      });
      setLevelUpOptions(null);
      playerStatsRef.current.hp = playerStatsRef.current.maxHp; 
      setUiStats(prev => ({...prev, hp: prev.maxHp}));
      audioManager.playUI('click');
  };

  const handleEquip = (item: Item) => {
      audioManager.playUI('click');
      let targetSlot = item.slot as string;
      if (item.slot === ItemSlot.Ring) {
          if (!equipped['Ring1']) targetSlot = 'Ring1';
          else if (!equipped['Ring2']) targetSlot = 'Ring2';
          else targetSlot = 'Ring1';
      }
      const currentEquipped = equipped[targetSlot];
      const newEquipped = { ...equipped, [targetSlot]: item };
      let newInventory = inventory.filter(i => i.id !== item.id);
      if (currentEquipped) newInventory.push(currentEquipped);
      setEquipped(newEquipped);
      setInventory(newInventory);
  };

  const handleUnequip = (slotKey: string) => {
      audioManager.playUI('click');
      const item = equipped[slotKey];
      if (item) {
          const newEquipped = { ...equipped };
          delete newEquipped[slotKey];
          setEquipped(newEquipped);
          setInventory([...inventory, item]);
      }
  };

  const handleLootPickup = (worldItem: WorldItem) => {
      audioManager.playUI('hover'); 
      setInventory(prev => [...prev, worldItem.item]);
      setWorldItems(prev => prev.filter(i => i.id !== worldItem.id));
  };

  const handleInventorySort = () => {
      audioManager.playUI('click');
      const rarityWeight = { [Rarity.Unique]: 4, [Rarity.Rare]: 3, [Rarity.Magic]: 2, [Rarity.Normal]: 1 };
      setInventory(prev => {
          const sorted = [...prev].sort((a, b) => rarityWeight[b.rarity] - rarityWeight[a.rarity]);
          return sorted;
      });
  };

  const handleInventoryDiscard = (itemId: string) => {
      audioManager.playUI('trash');
      setInventory(prev => prev.filter(i => i.id !== itemId));
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden">
      
      {gameState.isPlaying && (
          <div className="relative w-full max-w-7xl aspect-video shadow-2xl">
            <GameCanvas 
                player={playerRef.current} enemies={enemiesRef.current} projectiles={projectilesRef.current}
                damageNumbers={damageNumbersRef.current} gems={gemsRef.current} visualEffects={visualEffectsRef.current}
                activeSkills={activeSkills} worldItems={worldItems} gameOver={gameState.isGameOver}
                onLootClick={handleLootPickup} settings={settings} cameraRef={cameraRef}
            />
            <HUD stats={uiStats} gameState={gameState} />
            <div className="absolute bottom-4 right-4 text-slate-500 text-xs font-mono bg-black/50 p-2 rounded">{t.controlHint}</div>

            <div className="absolute top-20 right-4 flex flex-col gap-2">
                <button onClick={() => setInventoryOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-amber-500 shadow-lg relative group" title={t.inventory}>
                    <Backpack />
                </button>
                <button onClick={() => setSettingsOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-slate-400 shadow-lg relative group" title={t.settings}>
                    <SettingsIcon />
                </button>
                <button onClick={() => setEncyclopediaOpen(true)} className="p-3 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 text-blue-400 shadow-lg relative group" title={t.encyclopedia}>
                    <BookOpen />
                </button>
            </div>

            {/* BOSS HP BAR OVERLAY */}
            {enemiesRef.current.some(e => e.isBoss && e.type === 'boss_valos') && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 w-1/2">
                    <div className="text-center font-serif text-amber-500 font-bold mb-1 text-shadow-glow">
                        {t.bossName}
                    </div>
                    <div className="h-4 bg-slate-900 border border-amber-900 rounded-full overflow-hidden relative">
                         <div 
                            className="h-full bg-gradient-to-r from-purple-800 via-purple-600 to-amber-600 transition-all duration-200"
                            style={{ width: `${(enemiesRef.current.find(e => e.isBoss)?.hp || 0) / (enemiesRef.current.find(e => e.isBoss)?.maxHp || 1) * 100}%` }}
                         ></div>
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-1 uppercase tracking-widest">{t.bossTitle}</div>
                </div>
            )}
          </div>
      )}

      {!gameState.isPlaying && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center space-y-6 z-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
              <h1 className="text-7xl font-serif text-amber-600 tracking-widest uppercase border-b-4 border-amber-900 pb-4 drop-shadow-[0_5px_5px_rgba(0,0,0,1)]">Exile Survivors</h1>
              <p className="text-slate-400 text-xl font-light tracking-wide">Endless hordes. Infinite power. No escape.</p>
              
              <button onClick={startGame} disabled={!assetsLoaded} className={`px-10 py-4 border-2 font-serif text-2xl rounded shadow-[0_0_20px_rgba(180,83,9,0.3)] transition-all flex items-center gap-3 ${assetsLoaded ? 'bg-amber-800/80 hover:bg-amber-700 border-amber-600 text-amber-100 hover:scale-105' : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'}`}>
                {assetsLoaded ? <><Play fill="currentColor" /> {t.startGame}</> : "Loading Assets..."}
              </button>
              <div className="flex gap-4">
                  <button onClick={() => setSettingsOpen(true)} className="text-slate-500 hover:text-slate-300 flex items-center gap-2 mt-4"><SettingsIcon size={20} /> {t.settings}</button>
                  <button onClick={() => setEncyclopediaOpen(true)} className="text-slate-500 hover:text-blue-400 flex items-center gap-2 mt-4"><BookOpen size={20} /> {t.encyclopedia}</button>
              </div>
          </div>
      )}

      {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-in fade-in duration-1000">
               <h2 className="text-6xl text-red-700 font-serif mb-4 drop-shadow-[0_0_10px_rgba(185,28,28,0.8)]">{t.youDied}</h2>
               <p className="text-slate-400 mb-8 font-mono">{t.survived}: {gameState.time}s | {t.level}: {gameState.level}</p>
               <button onClick={startGame} className="px-8 py-3 border border-red-800 text-red-500 hover:bg-red-950 transition-colors uppercase tracking-widest font-bold">{t.resurrect}</button>
          </div>
      )}

      {inventoryOpen && (
        <Inventory inventory={inventory} equipped={equipped} onEquip={handleEquip} onUnequip={handleUnequip} onClose={() => setInventoryOpen(false)} onSort={handleInventorySort} onDiscard={handleInventoryDiscard} stats={uiStats} language={settings.language} />
      )}
      {levelUpOptions && <LevelUpModal options={levelUpOptions} onSelect={handleSkillSelect} language={settings.language} />}
      {settingsOpen && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setSettingsOpen(false)} />}
      {encyclopediaOpen && <EncyclopediaModal settings={settings} onClose={() => setEncyclopediaOpen(false)} />}
      {gameState.isPaused && !inventoryOpen && !gameState.isGameOver && !settingsOpen && !encyclopediaOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6">
                  <div className="text-5xl font-serif text-amber-100 flex items-center gap-4 border-b-2 border-amber-500 pb-2"><Pause size={48} /> {t.paused}</div>
                  <div className="flex gap-4">
                      <button onClick={() => setSettingsOpen(true)} className="px-6 py-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded">{t.settings}</button>
                      <button onClick={() => setEncyclopediaOpen(true)} className="px-6 py-2 bg-slate-800 border border-slate-600 text-blue-300 hover:bg-slate-700 rounded">{t.encyclopedia}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
