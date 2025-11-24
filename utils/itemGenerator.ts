
import { ITEM_BASES, PREFIX_TEMPLATES, SUFFIX_TEMPLATES, UNIQUE_ITEMS, RARE_NAMES, RARE_SUFFIXES } from '../constants';
import { Item, Rarity, Affix, StatModifier, ItemSlot, AffixTemplate } from '../types';

let idCounter = 0;

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateItem = (level: number, forceRarity?: Rarity): Item => {
  // 1. Roll Rarity (if not forced)
  let rarity = forceRarity || Rarity.Magic; // Default to Magic
  if (!forceRarity) {
    const roll = Math.random();
    if (roll < 0.01) rarity = Rarity.Unique;
    else if (roll < 0.20) rarity = Rarity.Rare;
    else rarity = Rarity.Magic; // 79% chance for Magic
  }

  // 2. Handle Unique
  if (rarity === Rarity.Unique) {
    const uniqueBase = getRandom(UNIQUE_ITEMS);
    return {
      id: `item_${++idCounter}`,
      name: uniqueBase.name,
      nameZh: uniqueBase.nameZh,
      baseName: uniqueBase.baseName,
      baseNameZh: uniqueBase.baseNameZh,
      slot: uniqueBase.slot,
      rarity: Rarity.Unique,
      image: uniqueBase.image,
      assetKey: uniqueBase.assetKey,
      prefixes: [],
      suffixes: [],
      uniqueEffect: uniqueBase.uniqueEffect,
      modifiers: uniqueBase.modifiers,
      levelReq: 1,
    };
  }

  // 3. Pick Base
  const base = getRandom(ITEM_BASES);
  
  // 4. Generate Affixes
  const prefixes: Affix[] = [];
  const suffixes: Affix[] = [];

  let prefixCount = 0;
  let suffixCount = 0;

  if (rarity === Rarity.Magic) {
    // Magic: 1 prefix OR 1 suffix OR 1 of both
    if (Math.random() > 0.5) prefixCount = 1;
    if (Math.random() > 0.5 || prefixCount === 0) suffixCount = 1;
  } else if (rarity === Rarity.Rare) {
    // Rare: 1-3 prefixes, 1-3 suffixes
    prefixCount = Math.floor(randRange(1, 4));
    suffixCount = Math.floor(randRange(1, 4));
  }

  // Keep track of used stats to avoid duplicate modifiers
  const usedStats = new Set<string>();

  const rollAffix = (pool: AffixTemplate[], type: 'prefix' | 'suffix', attempts = 0): Affix | null => {
    if (attempts > 10) return null; 

    const template = getRandom(pool);
    
    // VALIDATION: Check if this affix is allowed on this slot
    if (template.allowedSlots && !template.allowedSlots.includes(base.slot)) {
        // If we picked a restricted affix (like Speed) on wrong slot, retry.
        return rollAffix(pool, type, attempts + 1);
    }
    
    // VALIDATION: If this slot *only* allows specific affixes (not implemented strictly, but for logic)
    // Basic dup check
    if (usedStats.has(template.stat)) {
        return rollAffix(pool, type, attempts + 1);
    }
    
    usedStats.add(template.stat);

    // Roll Tier (Weighted)
    const tierRoll = Math.random();
    let selectedTierLevel = 5;
    if (tierRoll > 0.90) selectedTierLevel = 1;
    else if (tierRoll > 0.75) selectedTierLevel = 2;
    else if (tierRoll > 0.55) selectedTierLevel = 3;
    else if (tierRoll > 0.30) selectedTierLevel = 4;
    
    const tierDef = template.tiers.find((t: any) => t.tier === selectedTierLevel) || template.tiers[4]; 

    const val = randRange(tierDef.min, tierDef.max);
    
    // BUG FIX: Movement Speed is NOT percentage (isPct=false) but has small float values (0.1 - 0.7).
    // Math.floor(0.1) is 0, which breaks the item. 
    // We allow decimals if isPct OR if stat is speed.
    const allowDecimal = template.isPct || template.stat === 'speed';
    // Use toFixed to avoid precision errors, but parse back to number
    const roundedVal = allowDecimal ? parseFloat(val.toFixed(2)) : Math.floor(val);
    
    if (roundedVal <= 0 && !allowDecimal && tierDef.min > 0) {
        // Retry if we got 0 on a non-pct stat that should have value
        return rollAffix(pool, type, attempts + 1);
    }

    const modifier: StatModifier = {
      stat: template.stat,
      value: roundedVal,
      isPercentage: template.isPct,
      text: `${template.isPct ? '+' + Math.round(roundedVal * 100) + '%' : (roundedVal > 0 ? '+' : '') + roundedVal} ${template.text}`
    };

    return {
      name: tierDef.name,
      nameZh: tierDef.nameZh,
      type,
      tier: selectedTierLevel,
      modifiers: [modifier]
    };
  };

  for (let i = 0; i < prefixCount; i++) {
      const aff = rollAffix(PREFIX_TEMPLATES, 'prefix');
      if (aff) prefixes.push(aff);
  }
  for (let i = 0; i < suffixCount; i++) {
      const aff = rollAffix(SUFFIX_TEMPLATES, 'suffix');
      if (aff) suffixes.push(aff);
  }

  // 5. Construct Name
  let name = base.name;
  let nameZh = base.nameZh || base.name;

  if (rarity === Rarity.Magic) {
    const pre = prefixes.length > 0 ? prefixes[0].name : '';
    const preZh = prefixes.length > 0 ? prefixes[0].nameZh : '';
    
    const suf = suffixes.length > 0 ? suffixes[0].name : '';
    const sufZh = suffixes.length > 0 ? suffixes[0].nameZh : '';

    name = `${pre} ${base.name} ${suf}`.trim();
    nameZh = `${preZh}${base.nameZh}${sufZh}`.trim();

  } else if (rarity === Rarity.Rare) {
    const index = Math.floor(Math.random() * RARE_NAMES.en.length);
    const sufIndex = Math.floor(Math.random() * RARE_SUFFIXES.en.length);

    name = `${RARE_NAMES.en[index]} ${RARE_SUFFIXES.en[sufIndex]}`;
    nameZh = `${RARE_NAMES.zh[index]}${RARE_SUFFIXES.zh[sufIndex]}`;
  }

  return {
    id: `item_${++idCounter}`,
    name,
    nameZh,
    baseName: base.name,
    baseNameZh: base.nameZh,
    slot: base.slot,
    rarity,
    image: base.icon,
    assetKey: base.assetKey,
    prefixes,
    suffixes,
    levelReq: Math.max(1, level),
  };
};
