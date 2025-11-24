
import React, { useEffect, useRef, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, STAT_TRANSLATIONS, UNIQUE_EFFECT_TRANSLATIONS, ENEMY_TYPES } from '../constants';
import { Enemy, Entity, Projectile, DamageNumber, VisualEffect, Skill, WorldItem, Camera, Rarity, Item, Settings, StatModifier } from '../types';
import { getImage } from '../utils/imageLoader';

interface GameCanvasProps {
  player: Entity;
  enemies: Enemy[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  gems: Entity[];
  visualEffects: VisualEffect[];
  activeSkills: Skill[];
  worldItems: WorldItem[];
  gameOver: boolean;
  onLootClick: (item: WorldItem) => void;
  settings: Settings; 
  cameraRef: React.MutableRefObject<{x: number, y: number}>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  player, 
  enemies, 
  projectiles, 
  damageNumbers,
  gems,
  visualEffects,
  activeSkills,
  worldItems,
  gameOver,
  onLootClick,
  settings,
  cameraRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const [hoveredItem, setHoveredItem] = useState<WorldItem | null>(null);
  const mousePosRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  
  const prevPlayerPos = useRef({ x: player.x, y: player.y });
  const facingRight = useRef(true);
  const isMovingRef = useRef(false);

  const language = settings.language;

  const getRarityColor = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.Unique: return '#d97706';
      case Rarity.Rare: return '#facc15';
      case Rarity.Magic: return '#60a5fa';
      default: return '#f8fafc';
    }
  };

  const getRarityBg = (rarity: Rarity) => {
      switch (rarity) {
        case Rarity.Unique: return 'rgba(67, 20, 7, 0.9)';
        case Rarity.Rare: return 'rgba(66, 32, 6, 0.9)';
        case Rarity.Magic: return 'rgba(23, 37, 84, 0.9)';
        default: return 'rgba(15, 23, 42, 0.9)';
      }
  };

  const getItemName = (item: Item) => {
      return language === 'zh' && item.nameZh ? item.nameZh : item.name;
  };

  const getLocalizedStat = (mod: StatModifier) => {
      const label = STAT_TRANSLATIONS[mod.stat]?.[language] || mod.stat;
      const valStr = mod.isPercentage ? `${Math.round(mod.value * 100)}%` : Math.round(mod.value);
      const sign = mod.value > 0 ? '+' : '';
      if (language === 'zh') return `${sign}${valStr} ${label}`;
      return `${sign}${valStr} ${mod.isPercentage ? '' : 'to '}${label}`;
  };

  const getLocalizedUniqueEffect = (item: Item) => {
      const trans = UNIQUE_EFFECT_TRANSLATIONS[item.baseName];
      if (trans) return trans[language];
      return item.uniqueEffect;
  };

  const drawProceduralFloor = (ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera) => {
      // Dark Stone Tiles
      const tileSize = 64;
      
      const startCol = Math.floor(camera.x / tileSize);
      const endCol = startCol + (width / tileSize) + 1;
      const startRow = Math.floor(camera.y / tileSize);
      const endRow = startRow + (height / tileSize) + 1;

      const offsetX = -camera.x + startCol * tileSize;
      const offsetY = -camera.y + startRow * tileSize;

      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, 0, width, height);

      for (let c = 0; c < (endCol - startCol + 1); c++) {
          for (let r = 0; r < (endRow - startRow + 1); r++) {
              const x = offsetX + c * tileSize;
              const y = offsetY + r * tileSize;
              
              // Pseudo-random based on position
              const seed = Math.sin((startCol + c) * 12.9898 + (startRow + r) * 78.233) * 43758.5453;
              const val = Math.abs(seed - Math.floor(seed));
              
              ctx.fillStyle = val > 0.8 ? '#1c1917' : '#171717';
              ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
              
              if (val > 0.95) {
                  ctx.fillStyle = '#292524';
                  ctx.fillRect(x + 10, y + 10, 5, 5);
              }
          }
      }
      
      // Vignette
      const gradient = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, width);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
  };

  const toScreenX = (worldX: number) => worldX - cameraRef.current.x;
  const toScreenY = (worldY: number) => worldY - cameraRef.current.y;

  const drawPlayer = (ctx: CanvasRenderingContext2D, entity: Entity, isDoppelganger = false) => {
      const screenX = toScreenX(entity.x);
      const screenY = toScreenY(entity.y);
      
      // Determine movement state based on actual position change
      const dx = entity.x - prevPlayerPos.current.x;
      const dy = entity.y - prevPlayerPos.current.y;
      
      // Threshold to consider moving
      let moving = Math.hypot(dx, dy) > 0.5;
      
      if (isDoppelganger) moving = true; // Clones always look busy

      if (!isDoppelganger) {
          if (dx > 0) facingRight.current = true;
          if (dx < 0) facingRight.current = false;
          prevPlayerPos.current = { x: entity.x, y: entity.y };
      }

      ctx.save();
      ctx.translate(screenX, screenY);
      
      if (isDoppelganger) {
          // Tint for doppelganger
          ctx.filter = 'hue-rotate(270deg) contrast(1.2)';
      }

      const playerImg = getImage('player_idle');

      if (playerImg) {
          if (!facingRight.current && !isDoppelganger) ctx.scale(-1, 1);
          // Simple flip for doppelganger if we tracked its direction
          const size = entity.width * 2.5; 
          ctx.drawImage(playerImg, -size/2, -size/2 - 10, size, size);
      } else {
          // PROCEDURAL HUMANOID
          const dirScale = (!isDoppelganger && !facingRight.current) ? -1 : 1;
          ctx.scale(dirScale, 1);

          const skinColor = '#d4a373'; 
          const armorColor = isDoppelganger ? '#4c1d95' : '#334155'; 
          const armorHighlight = isDoppelganger ? '#8b5cf6' : '#64748b';
          const clothColor = isDoppelganger ? '#000' : '#7f1d1d'; 
          
          const walkCycle = moving ? Math.sin(frameRef.current * 0.4) : 0;
          const armCycle = moving ? Math.cos(frameRef.current * 0.4) : 0;
          const bounce = moving ? Math.abs(Math.sin(frameRef.current * 0.8)) * 2 : 0;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 16, 12, 6, 0, 0, Math.PI*2);
          ctx.fill();

          // Back Leg
          ctx.fillStyle = isDoppelganger ? '#1e1b4b' : '#1e293b';
          ctx.save();
          ctx.translate(-4, 8); 
          ctx.rotate(walkCycle * 0.5);
          ctx.fillRect(-3, 0, 6, 14);
          ctx.restore();

          // Cape/Cloth
          ctx.fillStyle = clothColor;
          ctx.beginPath();
          ctx.moveTo(-6, -8 + bounce);
          ctx.lineTo(-10, 12 + bounce);
          ctx.lineTo(6, 12 + bounce);
          ctx.lineTo(6, -8 + bounce);
          ctx.fill();

          // Front Leg
          ctx.fillStyle = isDoppelganger ? '#2e1065' : '#334155';
          ctx.save();
          ctx.translate(4, 8);
          ctx.rotate(-walkCycle * 0.5);
          ctx.fillRect(-3, 0, 6, 14);
          ctx.restore();

          // Body/Armor
          ctx.fillStyle = armorColor;
          ctx.beginPath();
          ctx.arc(-8, -8 + bounce, 5, 0, Math.PI*2); 
          ctx.arc(8, -8 + bounce, 5, 0, Math.PI*2);
          ctx.fill();
          ctx.fillRect(-8, -8 + bounce, 16, 18);
          ctx.fillStyle = armorHighlight;
          ctx.fillRect(-5, -4 + bounce, 10, 8);

          // Back Arm
          ctx.fillStyle = skinColor;
          ctx.save();
          ctx.translate(-9, -6 + bounce);
          ctx.rotate(armCycle * 0.8);
          ctx.fillRect(-2, 0, 4, 12); 
          ctx.fillStyle = '#525252'; 
          ctx.fillRect(-2.5, 8, 5, 5); 
          ctx.restore();

          // Head
          ctx.fillStyle = skinColor;
          ctx.beginPath();
          ctx.arc(0, -14 + bounce, 7, 0, Math.PI*2);
          ctx.fill();

          // Helmet
          ctx.fillStyle = isDoppelganger ? '#0f172a' : '#0f172a'; 
          ctx.beginPath();
          ctx.arc(0, -16 + bounce, 7.5, Math.PI, 0); 
          ctx.lineTo(7.5, -14 + bounce);
          ctx.lineTo(2, -10 + bounce); 
          ctx.lineTo(-2, -10 + bounce);
          ctx.lineTo(-7.5, -14 + bounce);
          ctx.fill();
          
          ctx.fillStyle = isDoppelganger ? '#ef4444' : '#fbbf24';
          ctx.fillRect(2, -13 + bounce, 2, 2);

          // Front Arm
          ctx.fillStyle = skinColor;
          ctx.save();
          ctx.translate(9, -6 + bounce);
          ctx.rotate(-armCycle * 0.8);
          ctx.fillRect(-2, 0, 4, 12);
          ctx.fillStyle = '#525252'; 
          ctx.fillRect(-2.5, 8, 5, 5);
          ctx.restore();
      }

      ctx.restore();
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    const screenX = toScreenX(enemy.x);
    const screenY = toScreenY(enemy.y);

    if (screenX < -50 || screenX > CANVAS_WIDTH + 50 || screenY < -50 || screenY > CANVAS_HEIGHT + 50) return;

    ctx.save();
    
    // HIT SHAKE: Vibrate the context randomly if hit recently
    if (enemy.hitFlash > 0) {
        ctx.translate(screenX + (Math.random() - 0.5) * 4, screenY + (Math.random() - 0.5) * 4);
    } else {
        ctx.translate(screenX, screenY);
    }
    
    // Scale slightly by affixes count to show "power"
    const scaleFactor = 1 + (enemy.affixes?.length || 0) * 0.1;
    ctx.scale(scaleFactor, scaleFactor);
    
    // Slow effect visualization (Ice Crystals at feet)
    if (enemy.slowTimer && enemy.slowTimer > 0) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
        for(let i=0; i<3; i++) {
             ctx.save();
             ctx.rotate((Math.PI*2/3)*i + frameRef.current * 0.05);
             ctx.translate(enemy.width/2, 0);
             ctx.beginPath();
             ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
             ctx.fill();
             ctx.restore();
        }
    }

    if (enemy.type === 'doppelganger') {
        ctx.restore(); // Undo the translate to call drawPlayer
        drawPlayer(ctx, enemy, true);
        ctx.save();
        ctx.translate(screenX, screenY); // Re-apply for health bar
    } else if (enemy.type === 'prism') {
         // CRYSTAL PRISM
         ctx.shadowBlur = 10;
         ctx.shadowColor = '#a78bfa';
         const grad = ctx.createLinearGradient(-10, -30, 10, 30);
         grad.addColorStop(0, '#ddd6fe');
         grad.addColorStop(0.5, '#8b5cf6');
         grad.addColorStop(1, '#4c1d95');
         ctx.fillStyle = grad;
         
         ctx.beginPath();
         ctx.moveTo(0, -40);
         ctx.lineTo(15, -10);
         ctx.lineTo(15, 30);
         ctx.lineTo(0, 40);
         ctx.lineTo(-15, 30);
         ctx.lineTo(-15, -10);
         ctx.closePath();
         ctx.fill();
         
         ctx.strokeStyle = '#c4b5fd';
         ctx.lineWidth = 1;
         ctx.stroke();
         ctx.shadowBlur = 0;

    } else if (enemy.type === 'boss_valos') {
        // BOSS VALOS: Floating Shards and Core
        const pulsate = Math.sin(frameRef.current * 0.05) * 5;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#8b5cf6';
        
        // Rotating Shards
        for(let i=0; i<6; i++) {
            ctx.save();
            ctx.rotate(frameRef.current * 0.02 + (i * Math.PI / 3));
            ctx.translate(40 + pulsate, 0);
            ctx.fillStyle = '#c4b5fd';
            ctx.beginPath();
            ctx.moveTo(0, -10); ctx.lineTo(5, 0); ctx.lineTo(0, 10); ctx.lineTo(-5, 0);
            ctx.fill();
            ctx.restore();
        }

        // Core
        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI*2);
        ctx.fill();
        
        // Inner Light
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.moveTo(-5, -15); ctx.lineTo(5, -15); ctx.lineTo(0, 15);
        ctx.fill();

        ctx.shadowBlur = 0;
    } else {
        const typeStats = ENEMY_TYPES[enemy.type];
        // @ts-ignore
        const assetKey = typeStats.assetKey;
        const enemyImg = getImage(assetKey);

        if (enemyImg) {
            if (player.x < enemy.x) ctx.scale(-1, 1);
            const size = enemy.width * 2;
            ctx.drawImage(enemyImg, -size/2, -size/2, size, size);
        } else {
            if (player.x < enemy.x) ctx.scale(-1, 1);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 10, enemy.width/3, 5, 0, 0, Math.PI*2);
            ctx.fill();

            switch (enemy.type) {
                case 'zombie':
                    const zWobble = Math.sin(frameRef.current * 0.1) * 2;
                    ctx.fillStyle = '#3f4d3b';
                    ctx.beginPath();
                    ctx.moveTo(0, -5);
                    ctx.lineTo(15, -5 + zWobble);
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = '#3f4d3b';
                    ctx.stroke();
                    ctx.fillStyle = '#2e382b';
                    ctx.fillRect(-5, 0, 5, 12); 
                    ctx.fillRect(0, 0, 5, 12 + Math.sin(frameRef.current * 0.2)*3); 
                    ctx.fillStyle = '#4c5c48'; 
                    ctx.beginPath();
                    ctx.ellipse(-2, -8 + zWobble, 10, 12, 0.2, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#5e7059';
                    ctx.beginPath();
                    ctx.arc(2, -22 + zWobble, 7, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(4, -24 + zWobble, 2, 2);
                    ctx.strokeStyle = '#4c5c48';
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(0, -10 + zWobble);
                    ctx.lineTo(18, -12 + zWobble);
                    ctx.stroke();
                    break;
                case 'skeleton':
                    const sBob = Math.abs(Math.sin(frameRef.current * 0.15)) * 2;
                    ctx.strokeStyle = '#d4d4d4';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-4, 0); ctx.lineTo(-6, 12);
                    ctx.moveTo(4, 0); ctx.lineTo(2, 12 - sBob);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.lineTo(0, -15);
                    ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
                    ctx.moveTo(-4, -8); ctx.lineTo(4, -8);
                    ctx.moveTo(-3, -4); ctx.lineTo(3, -4);
                    ctx.stroke();
                    ctx.fillStyle = '#e5e5e5';
                    ctx.beginPath();
                    ctx.arc(0, -19 + sBob, 6, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillRect(-3, -15 + sBob, 6, 3);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(1, -20 + sBob, 2, 2);
                    ctx.fillRect(-2, -20 + sBob, 2, 2);
                    ctx.strokeStyle = '#d4d4d4';
                    ctx.beginPath();
                    ctx.moveTo(2, -14); ctx.lineTo(12, -8);
                    ctx.moveTo(-2, -14); ctx.lineTo(-8, -5);
                    ctx.stroke();
                    ctx.strokeStyle = '#78350f';
                    ctx.beginPath();
                    ctx.moveTo(12, -8); ctx.lineTo(10, 5);
                    ctx.stroke();
                    break;
                case 'bat':
                    const wingCycle = Math.sin(frameRef.current * 0.4);
                    ctx.fillStyle = '#1e1b4b'; 
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI*2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(-2, -4);
                    ctx.quadraticCurveTo(-15, -15 + wingCycle * 10, -25, -5);
                    ctx.quadraticCurveTo(-15, 5, -2, 2);
                    ctx.moveTo(2, -4);
                    ctx.quadraticCurveTo(15, -15 + wingCycle * 10, 25, -5);
                    ctx.quadraticCurveTo(15, 5, 2, 2);
                    ctx.fill();
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(-2, -2, 1, 1);
                    ctx.fillRect(2, -2, 1, 1);
                    break;
                case 'golem':
                    ctx.fillStyle = '#57534e';
                    ctx.strokeStyle = '#292524';
                    ctx.lineWidth = 2;
                    const gShift = Math.sin(frameRef.current * 0.05) * 1;
                    ctx.beginPath();
                    ctx.arc(0, -10 + gShift, 14, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(-16, -12 + gShift, 10, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(16, -12 + gShift, 10, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#78716c';
                    ctx.beginPath();
                    ctx.arc(0, -25 + gShift, 8, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.strokeStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.moveTo(-3, -25 + gShift); ctx.lineTo(3, -25 + gShift);
                    ctx.stroke();
                    break;
            }
        }
    }
    
    // RED TINT FLASH on hit (replaces white circle)
    if (enemy.hitFlash > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -10, enemy.width/1.5, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Health Bar and Affix Labels
    if (enemy.hp < enemy.maxHp || enemy.isBoss || enemy.isElite || enemy.affixes.length > 0) {
        // Reset scale flip for UI text
        if (player.x < enemy.x && enemy.type !== 'prism') ctx.scale(-1, 1); 
        
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-15, -enemy.height/2 - 20, 30, 4);
        ctx.fillStyle = enemy.isBoss ? '#f59e0b' : enemy.isElite ? '#facc15' : '#ef4444';
        ctx.fillRect(-15, -enemy.height/2 - 20, 30 * hpPct, 4);

        // Affixes / Boss Name
        if (enemy.type === 'boss_valos') {
            ctx.font = 'bold 12px Cinzel';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(language === 'zh' ? "瓦洛斯" : "VALOS", 0, -enemy.height/2 - 25);
        }
        else if (enemy.affixes.length > 0) {
            ctx.font = 'bold 10px Roboto';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 2;
            const affStr = enemy.affixes.map(a => language === 'zh' ? a.nameZh : a.name).join(' ');
            ctx.fillText(affStr, 0, -enemy.height/2 - 25);
        }
    }
    ctx.restore();
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, proj: Projectile) => {
    const screenX = toScreenX(proj.x);
    const screenY = toScreenY(proj.y);
    if (screenX < -50 || screenX > CANVAS_WIDTH + 50 || screenY < -50 || screenY > CANVAS_HEIGHT + 50) return;

    ctx.save();
    ctx.translate(screenX, screenY);
    
    let angle = 0;
    if (proj.isOrbit && proj.orbitAngle !== undefined) {
         angle = proj.orbitAngle + Math.PI / 2; 
    } else {
         angle = Math.atan2(proj.vy, proj.vx);
    }
    ctx.rotate(angle);
    
    // ENEMY PROJECTILES TINT
    if (proj.isEnemy) {
        ctx.filter = 'hue-rotate(240deg) saturate(2)'; 
    }

    if (proj.sourceSkillId === 'icebolt') {
        const fireballImg = getImage('proj_fireball'); 
        if (fireballImg) {
             ctx.drawImage(fireballImg, -30, -30, 60, 60);
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#22d3ee';
            ctx.fillStyle = 'rgba(165, 243, 252, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-30, 5);
            ctx.lineTo(-30, -5);
            ctx.fill();
            ctx.fillStyle = '#ecfeff'; 
            ctx.beginPath();
            ctx.moveTo(15, 0); 
            ctx.lineTo(-5, 6);
            ctx.lineTo(-5, -6);
            ctx.fill();
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-2, 3);
            ctx.lineTo(-2, -3);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    } 
    else if (proj.isOrbit) {
        const bladeImg = getImage('skill_blade_vortex');
        if (bladeImg) {
             ctx.drawImage(bladeImg, -20, -20, 40, 40);
        } else {
             // Metallic Curved Blade
             ctx.shadowBlur = 8;
             ctx.shadowColor = '#10b981';
             
             // Gradient for metal
             const grad = ctx.createLinearGradient(0, -30, 0, 30);
             grad.addColorStop(0, '#e2e8f0'); 
             grad.addColorStop(0.5, '#94a3b8'); 
             grad.addColorStop(1, '#0f172a'); 
             ctx.fillStyle = grad;
             
             ctx.beginPath();
             ctx.moveTo(0, -35); 
             ctx.quadraticCurveTo(15, 0, 0, 35); 
             ctx.quadraticCurveTo(8, 0, 0, -35); 
             ctx.fill();
             
             // Edge highlight
             ctx.strokeStyle = '#86efac';
             ctx.lineWidth = 1;
             ctx.stroke();
             ctx.shadowBlur = 0;
        }
    }
    else {
        const arrowImg = getImage('proj_arrow');
        if (arrowImg) {
            ctx.drawImage(arrowImg, -15, -5, 30, 10);
        } else {
            ctx.fillStyle = '#bfdbfe';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-5, -5);
            ctx.fill();
        }
    }
    ctx.restore();
  };

  const drawVisualEffect = (ctx: CanvasRenderingContext2D, effect: VisualEffect) => {
      if (effect.type === 'screen_dim') {
          const lifePct = effect.duration / effect.maxDuration;
          const alpha = lifePct > 0.5 ? (1 - lifePct) * 1.6 : lifePct * 1.6; 
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.7, alpha)})`;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
          return;
      }

      if (effect.type === 'laser_beam' && effect.targetX !== undefined && effect.targetY !== undefined) {
          const sx = toScreenX(effect.x);
          const sy = toScreenY(effect.y);
          const tx = toScreenX(effect.targetX);
          const ty = toScreenY(effect.targetY);
          
          const lifePct = effect.duration / effect.maxDuration;
          ctx.save();
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = (effect.scale || 3) * lifePct;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#8b5cf6';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          return;
      }
      
      if (effect.type === 'cage_polygon' && effect.points) {
          ctx.save();
          ctx.translate(-cameraRef.current.x, -cameraRef.current.y); // Points are world space
          ctx.fillStyle = 'rgba(76, 29, 149, 0.2)';
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          effect.points.forEach((p, i) => {
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Pattern inside
          ctx.clip();
          ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
          for(let i=0; i<100; i++) {
              ctx.beginPath();
              ctx.arc(
                  effect.points[0].x + Math.sin(i)*1000, 
                  effect.points[0].y + Math.cos(i)*1000, 
                  50, 0, Math.PI*2
              );
              ctx.fill();
          }
          
          ctx.restore();
          return;
      }

      const screenX = toScreenX(effect.x);
      const screenY = toScreenY(effect.y);
      
      ctx.save();
      ctx.translate(screenX, screenY);

      if (effect.type === 'melee_slash') {
          // MOON BLADE VISUAL (White Crescent)
          const lifePct = 1 - (effect.duration / effect.maxDuration);
          if (effect.rotation !== undefined) ctx.rotate(effect.rotation);
          
          const baseSize = effect.scale || 1.0; 
          ctx.scale(baseSize, baseSize);

          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f8fafc';
          ctx.globalAlpha = Math.max(0, 1 - lifePct * 1.5);
          
          // Outer Glow
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(5, 0, 95, -Math.PI/3, Math.PI/3); 
          ctx.arc(-20, 0, 80, Math.PI/3, -Math.PI/3, true);
          ctx.fill();

          // Core Blade
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 90, -Math.PI/3, Math.PI/3);
          ctx.arc(-15, 0, 80, Math.PI/3, -Math.PI/3, true);
          ctx.fill();

          ctx.shadowBlur = 0;
      } 
      else if (effect.type === 'death_poof') {
          const lifePct = 1 - (effect.duration / effect.maxDuration);
          const count = 6;
          ctx.fillStyle = effect.color;
          ctx.globalAlpha = (1 - lifePct); 
          
          for(let i=0; i<count; i++) {
              const angle = (Math.PI * 2 * i) / count + Math.sin(i + frameRef.current);
              const dist = (effect.scale || 20) * (0.5 + lifePct * 1.5);
              const size = (1 - lifePct) * 15;
              
              ctx.save();
              ctx.translate(Math.cos(angle)*dist, Math.sin(angle)*dist);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.moveTo(0, -size/2);
              ctx.lineTo(size, 0);
              ctx.lineTo(0, size/2);
              ctx.lineTo(-size/2, 0);
              ctx.fill();
              ctx.restore();
          }
      }
      else if (effect.type === 'hit') {
          // BLOOD/SPARK SPLATTER
          const lifePct = effect.duration / effect.maxDuration;
          const decay = 1 - lifePct; // 0 to 1
          
          ctx.globalAlpha = lifePct;
          
          const count = 6;
          for(let i=0; i<count; i++) {
              ctx.save();
              const angle = (Math.PI*2/count)*i + Math.random() * 0.5;
              const speed = (effect.scale || 1.0) * 20;
              const dist = speed * decay;
              
              ctx.translate(Math.cos(angle)*dist, Math.sin(angle)*dist);
              ctx.rotate(angle);
              
              if (effect.color === '#ef4444' || effect.color === 'red') {
                  // Blood Drop shape
                  ctx.fillStyle = effect.color;
                  ctx.beginPath();
                  ctx.arc(0, 0, 3 * lifePct, 0, Math.PI*2);
                  ctx.fill();
              } else {
                  // Spark Line
                  ctx.strokeStyle = effect.color;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(0, 0);
                  ctx.lineTo(5 + lifePct*5, 0);
                  ctx.stroke();
              }
              ctx.restore();
          }
      }
      else if (effect.type === 'explosion') {
          const explImg = getImage('vfx_explosion');
          if (explImg) {
               const lifePct = 1 - (effect.duration / effect.maxDuration);
               const size = (effect.scale || 40);
               ctx.globalAlpha = 1 - lifePct;
               const scale = 0.5 + lifePct;
               ctx.scale(scale, scale);
               ctx.drawImage(explImg, -size/2, -size/2, size, size);
          } else {
              const lifePct = 1 - (effect.duration / effect.maxDuration);
              const maxRadius = effect.scale || 60;
              const currentRadius = maxRadius * lifePct;
              
              ctx.strokeStyle = `rgba(165, 243, 252, ${1 - lifePct})`; 
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
              ctx.stroke();

              const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 0.8);
              grad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * (1-lifePct)})`);
              grad.addColorStop(0.5, `rgba(6, 182, 212, ${0.4 * (1-lifePct)})`);
              grad.addColorStop(1, `rgba(0,0,0,0)`);
              
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
              ctx.fill();
          }
      } else if (effect.type === 'lightning') {
          if (effect.targetX !== undefined && effect.targetY !== undefined) {
              const screenTX = toScreenX(effect.targetX);
              const screenTY = toScreenY(effect.targetY);
              ctx.translate(-screenX, -screenY);
              ctx.globalAlpha = effect.duration / effect.maxDuration;
              ctx.strokeStyle = effect.color || '#93c5fd'; 
              ctx.lineWidth = (effect.scale || 2) + Math.random() * 2;
              ctx.shadowBlur = 15;
              ctx.shadowColor = effect.color || '#3b82f6';
              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              const dist = Math.hypot(screenTX - screenX, screenTY - screenY);
              const steps = Math.floor(dist / 20);
              const dx = (screenTX - screenX) / steps;
              const dy = (screenTY - screenY) / steps;
              let currX = screenX;
              let currY = screenY;
              for (let i = 1; i < steps; i++) {
                  currX += dx;
                  currY += dy;
                  const jitter = (Math.random() - 0.5) * 30;
                  ctx.lineTo(currX + jitter, currY + jitter);
              }
              ctx.lineTo(screenTX, screenTY);
              ctx.stroke();
          }
      }
      ctx.restore();
  };

  const drawWorldItems = (ctx: CanvasRenderingContext2D) => {
      let hovered: WorldItem | null = null;

      worldItems.forEach(item => {
          const sx = toScreenX(item.x);
          const sy = toScreenY(item.y);
          if (sx < -100 || sx > CANVAS_WIDTH + 100 || sy < -100 || sy > CANVAS_HEIGHT + 100) return;

          const labelWidth = 160;
          const labelHeight = 32;
          const labelX = sx - labelWidth / 2;
          const labelY = sy - labelHeight / 2;

          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;
          const isHovered = mx >= labelX && mx <= labelX + labelWidth && my >= labelY && my <= labelY + labelHeight;
          if (isHovered) hovered = item;

          if (item.item.rarity === Rarity.Unique || item.item.rarity === Rarity.Rare) {
              ctx.save();
              ctx.globalAlpha = 0.2 + Math.sin(frameRef.current * 0.05) * 0.1;
              ctx.fillStyle = getRarityColor(item.item.rarity);
              ctx.fillRect(sx - 1, sy - 150, 2, 150);
              ctx.restore();
          }

          ctx.save();
          ctx.fillStyle = isHovered ? '#1e293b' : getRarityBg(item.item.rarity);
          ctx.strokeStyle = getRarityColor(item.item.rarity);
          ctx.lineWidth = isHovered ? 2 : 1;
          ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
          ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
          
          ctx.fillStyle = getRarityColor(item.item.rarity);
          ctx.font = 'bold 14px Roboto';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 2;
          ctx.fillText(getItemName(item.item), sx, sy);
          
          if (item.item.assetKey) {
             const icon = getImage(item.item.assetKey);
             if (icon) {
                 ctx.drawImage(icon, labelX + 5, labelY + 4, 24, 24);
             }
          }
          ctx.restore();
      });
      setHoveredItem(hovered);
  };

  const drawGem = (ctx: CanvasRenderingContext2D, gem: Entity) => {
      const sx = toScreenX(gem.x);
      const sy = toScreenY(gem.y);
      if (sx < -20 || sx > CANVAS_WIDTH + 20 || sy < -20 || sy > CANVAS_HEIGHT + 20) return;

      ctx.save();
      ctx.translate(sx, sy);
      
      const gemImg = getImage('gem_xp');
      if (gemImg) {
           ctx.drawImage(gemImg, -8, -8, 16, 16);
      } else {
          let baseColor = '#60a5fa'; 
          let darkColor = '#1d4ed8';
          let lightColor = '#93c5fd';

          if (gem.color === 'gold') {
              baseColor = '#facc15'; darkColor = '#a16207'; lightColor = '#fde047';
          } else if (gem.color === 'purple') {
              baseColor = '#a855f7'; darkColor = '#7e22ce'; lightColor = '#d8b4fe';
          } else if (gem.color === 'red') {
               baseColor = '#ef4444'; darkColor = '#b91c1c'; lightColor = '#fca5a5';
          }

          const size = gem.width || 10;
          ctx.shadowBlur = 8;
          ctx.shadowColor = baseColor;

          ctx.fillStyle = darkColor;
          ctx.beginPath();
          ctx.moveTo(0, size);
          ctx.lineTo(size/1.5, 0);
          ctx.lineTo(-size/1.5, 0);
          ctx.fill();

          ctx.fillStyle = lightColor;
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size/1.5, 0);
          ctx.lineTo(-size/1.5, 0);
          ctx.fill();

          ctx.fillStyle = 'white';
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(0, -size + 2);
          ctx.lineTo(2, 0);
          ctx.lineTo(0, size - 2);
          ctx.lineTo(-2, 0);
          ctx.fill();
      }
      ctx.restore();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
          mousePosRef.current = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          };
      }
  };

  const handleClick = () => {
      if (hoveredItem) {
          onLootClick(hoveredItem);
      }
  };

  // Tooltip Render
  const Tooltip = () => {
      if (!hoveredItem) return null;
      const item = hoveredItem.item;
      const sx = toScreenX(hoveredItem.x);
      const sy = toScreenY(hoveredItem.y);
      
      return (
          <div 
            className="absolute z-50 bg-black/95 border-2 p-3 w-72 pointer-events-none shadow-2xl rounded-sm"
            style={{ 
                left: sx + 20, 
                top: sy - 50,
                borderColor: getRarityColor(item.rarity)
            }}
          >
               <div className={`text-center font-serif border-b pb-1 mb-2`} style={{ color: getRarityColor(item.rarity), borderColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="text-xl font-bold tracking-wide">{getItemName(item)}</div>
                    <div className="text-sm text-slate-400 uppercase tracking-wider">{item.rarity === 'Unique' ? (language === 'zh' ? '暗金' : 'Unique') : item.rarity} {language === 'zh' && item.baseNameZh ? item.baseNameZh : item.baseName}</div>
                </div>
                <div className="text-sm space-y-1 font-medium" style={{ color: '#88a0c4'}}>
                     {item.implicit && <div className="text-slate-300 py-1 border-t border-slate-800">{getLocalizedStat(item.implicit)} <span className="text-slate-600">({language === 'zh' ? '基底' : 'Implicit'})</span></div>}
                     
                     <div className="border-t border-slate-800 pt-1 mt-1 space-y-1">
                        {item.prefixes.map((p, i) => (p.modifiers[0].value !== 0 ? <div key={`p-${i}`} className="text-blue-300">{getLocalizedStat(p.modifiers[0])} <span className="text-slate-500 text-xs">{p.tier ? `(T${p.tier})` : ''}</span></div> : null))}
                        {item.suffixes.map((s, i) => (s.modifiers[0].value !== 0 ? <div key={`s-${i}`} className="text-blue-300">{getLocalizedStat(s.modifiers[0])} <span className="text-slate-500 text-xs">{s.tier ? `(T${s.tier})` : ''}</span></div> : null))}
                        {item.rarity === Rarity.Unique && item.modifiers && item.modifiers.map((m, i) => (
                             <div key={`mod-${i}`} className="text-blue-300">{getLocalizedStat(m)}</div>
                        ))}
                     </div>
                     
                     {item.uniqueEffect && (
                       <div className="mt-3 text-orange-400 italic">"{getLocalizedUniqueEffect(item)}"</div>
                     )}
                     
                     {item.levelReq > 1 && (
                       <div className="text-slate-500 mt-2 text-xs border-t border-slate-800 pt-1">{language === 'zh' ? '需求等级' : 'Requires Level'} {item.levelReq}</div>
                     )}
                </div>
          </div>
      );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      frameRef.current++;
      
      const targetCamX = player.x - CANVAS_WIDTH / 2;
      const targetCamY = player.y - CANVAS_HEIGHT / 2;
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

      const width = CANVAS_WIDTH;
      const height = CANVAS_HEIGHT;

      ctx.clearRect(0, 0, width, height);
      drawProceduralFloor(ctx, width, height, cameraRef.current);
      
      // Draw Cage Floor (Behind entities)
      visualEffects.filter(v => v.type === 'cage_polygon').forEach(v => drawVisualEffect(ctx, v));
      
      drawWorldItems(ctx);

      gems.forEach(gem => drawGem(ctx, gem));

      // Draw Hits first (behind)
      visualEffects.filter(v => v.type === 'hit' && v.id.startsWith('spark_')).forEach(v => drawVisualEffect(ctx, v));

      drawPlayer(ctx, player);

      const sortedEnemies = [...enemies].sort((a, b) => a.y - b.y);
      sortedEnemies.forEach(enemy => drawEnemy(ctx, enemy));

      projectiles.forEach(proj => drawProjectile(ctx, proj));
      
      visualEffects.filter(v => v.type === 'screen_dim').forEach(v => drawVisualEffect(ctx, v));
      visualEffects.filter(v => v.type === 'laser_beam').forEach(v => drawVisualEffect(ctx, v));
      visualEffects.filter(v => v.type !== 'screen_dim' && v.type !== 'laser_beam' && v.type !== 'cage_polygon' && !v.id.startsWith('spark_')).forEach(v => drawVisualEffect(ctx, v));

      damageNumbers.forEach(dn => {
          const sx = toScreenX(dn.x);
          const sy = toScreenY(dn.y);
          ctx.save();
          const scale = Math.min(1.5, 1 + (30 - dn.life) / 30); 
          ctx.translate(sx, sy - (30 - dn.life));
          ctx.scale(scale, scale);
          ctx.font = dn.isCrit ? 'bold 28px Cinzel' : '16px Roboto';
          ctx.fillStyle = dn.isCrit ? '#fbbf24' : '#e2e8f0'; 
          
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          const text = Math.floor(dn.value).toString();
          ctx.strokeText(text, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
      });

      if (gameOver) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#991b1b';
          ctx.font = '80px Cinzel';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'black';
          ctx.fillText("YOU DIED", width / 2, height / 2 - 20);
          ctx.font = '24px Cinzel';
          ctx.fillStyle = '#94a3b8';
          ctx.shadowBlur = 0;
          ctx.fillText("Resurrect in Town...", width / 2, height / 2 + 40);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [player, enemies, projectiles, damageNumbers, gems, visualEffects, activeSkills, gameOver, worldItems, hoveredItem, language]);

  return (
    <div className="relative w-full h-full select-none">
        <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="block bg-black shadow-2xl border border-slate-800 rounded cursor-crosshair"
        style={{ width: '100%', maxWidth: '1280px', height: 'auto', aspectRatio: '16/9' }}
        />
        <Tooltip />
    </div>
  );
};

export default GameCanvas;
