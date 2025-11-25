import React, { useState } from 'react';
import { Item, ItemSlot, PlayerStats, Rarity, Language, StatModifier } from '../types';
import { TRANSLATIONS, STAT_TRANSLATIONS, UNIQUE_EFFECT_TRANSLATIONS } from '../constants';
import { X, Shield, Trash2, ArrowDownUp } from 'lucide-react';
import { getImage } from '../utils/imageLoader';

interface InventoryProps {
  inventory: Item[];
  equipped: { [key: string]: Item };
  onEquip: (item: Item) => void;
  onUnequip: (slotKey: string) => void;
  onClose: () => void;
  onSort: () => void;
  onDiscard: (itemId: string) => void;
  stats: PlayerStats;
  language: Language;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, equipped, onEquip, onUnequip, onClose, onSort, onDiscard, stats, language }) => {
  const t = TRANSLATIONS[language];
  const [hoveredItem, setHoveredItem] = useState<{ item: Item, x: number, y: number } | null>(null);

  const getRarityClass = (rarity: Rarity) => {
    switch (rarity) {
      case Rarity.Unique: return 'item-unique border-orange-500 bg-orange-900/20';
      case Rarity.Rare: return 'item-rare border-yellow-400 bg-yellow-900/20';
      case Rarity.Magic: return 'item-magic border-blue-400 bg-blue-900/20';
      default: return 'item-normal border-slate-500 bg-slate-800';
    }
  };

  const getLocalizedStat = (mod: StatModifier) => {
      const label = STAT_TRANSLATIONS[mod.stat]?.[language] || mod.stat;
      const valStr = mod.isPercentage ? `${Math.round(mod.value * 100)}%` : Math.round(mod.value * 10) / 10;
      const sign = mod.value > 0 ? '+' : '';
      return language === 'zh' ? `${sign}${valStr} ${label}` : `${sign}${valStr} ${mod.isPercentage ? '' : 'to '}${label}`;
  };

  const getLocalizedUniqueEffect = (item: Item) => {
      const trans = UNIQUE_EFFECT_TRANSLATIONS[item.baseName];
      if (trans) return trans[language];
      return item.uniqueEffect;
  };

  const getItemName = (item: Item) => language === 'zh' && item.nameZh ? item.nameZh : item.name;

  const ItemTooltipCard: React.FC<{ item: Item, isEquippedComparison?: boolean }> = ({ item, isEquippedComparison }) => (
    <div 
        className="bg-black/95 border-2 p-3 w-[260px] md:w-[280px] shadow-[0_0_20px_rgba(0,0,0,1)] rounded-sm pointer-events-none flex-shrink-0 text-xs md:text-sm"
        style={{ 
            borderColor: isEquippedComparison ? '#475569' : item.rarity === Rarity.Unique ? '#d97706' : item.rarity === Rarity.Rare ? '#facc15' : item.rarity === Rarity.Magic ? '#60a5fa' : '#94a3b8'
        }}
    >
        {isEquippedComparison && (
            <div className="bg-slate-700 text-white text-[10px] md:text-xs font-bold text-center py-1 mb-2 uppercase tracking-widest">
                {t.currentlyEquipped}
            </div>
        )}
        <div className={`text-center font-serif border-b pb-1 mb-2`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className={`text-base md:text-lg font-bold tracking-wider ${item.rarity === Rarity.Unique ? 'text-orange-500' : item.rarity === Rarity.Rare ? 'text-yellow-400' : item.rarity === Rarity.Magic ? 'text-blue-400' : 'text-slate-200'}`}>
                {getItemName(item)}
            </div>
            <div className="text-[10px] md:text-sm text-slate-400 uppercase">{item.rarity === 'Unique' ? (language === 'zh' ? '暗金' : 'Unique') : item.rarity} {language === 'zh' && item.baseNameZh ? item.baseNameZh : item.baseName}</div>
        </div>
        <div className="space-y-1 text-blue-200 font-medium">
            <div className="text-slate-500 italic text-[10px] md:text-xs mb-1">{item.slot}</div>
            {item.implicit && (
                <div className="text-slate-300 py-1 border-t border-slate-800">
                    {getLocalizedStat(item.implicit)} <span className="text-slate-600">{t.implicit}</span>
                </div>
            )}
            <div className="border-t border-slate-800 pt-1 mt-1 space-y-1">
                {item.prefixes.map((p, i) => (p.modifiers[0].value !== 0 ? <div key={`pre-${i}`} className="text-blue-300">{getLocalizedStat(p.modifiers[0])} <span className="text-slate-500 text-[10px] md:text-xs">{p.tier ? `(T${p.tier})` : ''}</span></div> : null))}
                {item.suffixes.map((s, i) => (s.modifiers[0].value !== 0 ? <div key={`suf-${i}`} className="text-blue-300">{getLocalizedStat(s.modifiers[0])} <span className="text-slate-500 text-[10px] md:text-xs">{s.tier ? `(T${s.tier})` : ''}</span></div> : null))}
                {item.rarity === Rarity.Unique && item.modifiers?.map((m, i) => (<div key={`mod-${i}`} className="text-blue-300">{getLocalizedStat(m)}</div>))}
            </div>
            {item.uniqueEffect && <div className="text-orange-400 mt-2 italic border-t border-orange-900/50 pt-1">"{getLocalizedUniqueEffect(item)}"</div>}
            {item.levelReq > 1 && <div className="text-slate-500 mt-2 text-[10px] md:text-xs border-t border-slate-800 pt-1">{t.requiresLevel} {item.levelReq}</div>}
        </div>
    </div>
  );

  const Tooltip = () => {
      if (!hoveredItem) return null;
      const { item, x, y } = hoveredItem;
      const comparisonItems: Item[] = [];
      if (item.slot === ItemSlot.Ring) {
          if (equipped['Ring1'] && equipped['Ring1'].id !== item.id) comparisonItems.push(equipped['Ring1']);
          if (equipped['Ring2'] && equipped['Ring2'].id !== item.id) comparisonItems.push(equipped['Ring2']);
      } else {
          if (equipped[item.slot] && equipped[item.slot].id !== item.id) comparisonItems.push(equipped[item.slot]);
      }
      
      const isMobile = window.innerWidth < 768;
      
      const cardWidth = isMobile ? 260 : 280;
      const totalWidth = isMobile ? cardWidth : (comparisonItems.length + 1) * cardWidth;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      let top = y;
      let left = x + 20;
      
      if (left + totalWidth > screenW) {
          left = x - totalWidth - 20;
          if (left < 0) left = 5;
      }
      
      const cardHeight = 300;
      const totalHeight = isMobile ? (comparisonItems.length + 1) * cardHeight * 0.8 : cardHeight;
      
      if (top + totalHeight > screenH) {
          top = screenH - totalHeight - 10;
          if (top < 10) top = 10;
      }

      return (
        <div 
            className="fixed z-[100] flex flex-col md:flex-row gap-2 pointer-events-none max-h-[80vh] md:max-h-none overflow-y-auto md:overflow-visible hide-scrollbar" 
            style={{ top, left }}
        >
            {comparisonItems.map((compItem) => <ItemTooltipCard key={compItem.id} item={compItem} isEquippedComparison />)}
            <ItemTooltipCard item={item} />
        </div>
      );
  };

  const renderItemIcon = (item: Item) => {
      if (item.assetKey) {
          const img = getImage(item.assetKey);
          if (img) return <img src={img.src} alt={item.name} className="w-full h-full object-contain p-1" />;
      }
      return <span className="text-xl md:text-2xl drop-shadow-md">{item.image}</span>;
  };

  const ItemSlotComponent = ({ slotKey, label, item }: { slotKey: string, label: string, item?: Item }) => (
    <div 
      onClick={(e) => { e.stopPropagation(); if (item) onUnequip(slotKey); }}
      onMouseEnter={(e) => item && setHoveredItem({ item, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHoveredItem(null)}
      className={`w-14 h-14 md:w-16 md:h-16 border-2 bg-slate-900 relative group cursor-pointer flex items-center justify-center transition-all hover:bg-slate-800 hover:scale-105 ${item ? getRarityClass(item.rarity) : 'border-slate-700'}`}
    >
        {item ? renderItemIcon(item) : <span className="text-slate-700 text-[10px] md:text-xs uppercase font-bold text-center leading-none">{label}</span>}
    </div>
  );

  const handleItemClick = (item: Item, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) { onDiscard(item.id); setHoveredItem(null); } 
      else { onEquip(item); setHoveredItem(null); }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 p-2 md:p-6">
      <div className="bg-slate-900 border-2 border-amber-800 w-full md:w-[95vw] max-w-[900px] h-[98vh] md:h-[650px] flex flex-col md:flex-row shadow-2xl rounded-lg overflow-hidden relative">
        
        {/* MOBILE LAYOUT: Split Top Pane for Equipped & Stats */}
        <div className="flex md:flex-col h-[45%] md:h-auto md:w-1/3 border-b md:border-b-0 md:border-r border-amber-900 bg-slate-950 flex-shrink-0">
            {/* EQUIPPED GRID */}
            <div className="w-1/2 md:w-full p-1 md:p-6 flex flex-col items-center border-r md:border-r-0 border-amber-900/30 justify-center">
                 <h2 className="hidden md:block text-amber-500 font-serif text-lg md:text-xl mb-4 border-b border-amber-900/50 w-full text-center pb-2">{t.equipment}</h2>
                 <div className="grid grid-cols-3 gap-1 md:gap-2 scale-95 md:scale-100">
                    <div className="flex flex-col gap-1 md:gap-4 items-center md:pt-8">
                        <ItemSlotComponent slotKey="Weapon" label="Wpn" item={equipped[ItemSlot.Weapon]} />
                        <ItemSlotComponent slotKey="Ring1" label="Rng1" item={equipped['Ring1']} />
                    </div>
                    <div className="flex flex-col gap-1 md:gap-4 items-center">
                        <ItemSlotComponent slotKey="Helm" label="Hlm" item={equipped[ItemSlot.Helm]} />
                        <ItemSlotComponent slotKey="Body" label="Body" item={equipped[ItemSlot.Body]} />
                        <ItemSlotComponent slotKey="Boots" label="Boot" item={equipped[ItemSlot.Boots]} />
                    </div>
                    <div className="flex flex-col gap-1 md:gap-4 items-center md:pt-8">
                        <ItemSlotComponent slotKey="Gloves" label="Glv" item={equipped[ItemSlot.Gloves]} />
                        <ItemSlotComponent slotKey="Ring2" label="Rng2" item={equipped['Ring2']} />
                    </div>
                </div>
            </div>

            {/* STATS PANEL */}
            <div className="w-1/2 md:w-full bg-slate-900/50 md:bg-slate-900 p-2 md:p-4 md:border-t border-slate-800 text-xs md:text-sm text-slate-300 space-y-1 md:space-y-2 flex flex-col justify-center overflow-y-auto">
                <div className="flex justify-between text-amber-200 font-bold border-b border-slate-700 pb-1 mb-1 text-sm md:text-base"><span>{t.stats}</span> <Shield size={16}/></div>
                <div className="flex justify-between"><span>{t.maxLife}:</span> <span className="text-white">{Math.round(stats.maxHp)}</span></div>
                <div className="flex justify-between"><span>{t.physDmg}:</span> <span className="text-white">{Math.round(stats.damageMultiplier * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.atkSpeed}:</span> <span className="text-white">{Math.round(stats.attackSpeedMultiplier * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.critChance}:</span> <span className="text-white">{Math.round(stats.critChance * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.moveSpeed}:</span> <span className="text-white">{stats.speed.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>{language === 'zh' ? '护甲' : 'Armor'}:</span> <span className="text-white">{Math.round(stats.armor)}</span></div>
            </div>
        </div>

        {/* INVENTORY GRID (Scrollable) */}
        <div className="w-full h-[55%] md:h-full md:w-2/3 p-2 md:p-6 bg-slate-900 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-1 md:mb-4 flex-shrink-0">
                <h2 className="text-amber-500 font-serif text-base md:text-xl">{t.inventory}</h2>
                <div className="flex gap-2">
                    <button onClick={onSort} className="flex items-center gap-1 text-[10px] md:text-xs bg-slate-800 hover:bg-slate-700 text-amber-200 px-2 py-1 md:px-3 md:py-1 rounded border border-slate-600"><ArrowDownUp size={12} /> {t.sort}</button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-red-900/50 rounded"><X size={20}/></button>
                </div>
            </div>
            
            <div className="flex-1 bg-slate-950 border border-slate-700 p-1 md:p-2 overflow-y-auto relative custom-scrollbar" onMouseLeave={() => setHoveredItem(null)}>
                {/* Mobile: 7 cols, TIGHT GAP (2px) */}
                <div className="grid grid-cols-7 md:grid-cols-6 gap-[2px] md:gap-2 content-start">
                    {inventory.map((item) => {
                        const isEquipped = Object.values(equipped).some((e: Item) => e.id === item.id);
                        return (
                            <div 
                                key={item.id} 
                                onClick={(e) => handleItemClick(item, e)}
                                onMouseEnter={(e) => setHoveredItem({ item, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`w-10 h-10 md:w-16 md:h-16 border-2 flex items-center justify-center cursor-pointer relative group transition-all hover:brightness-125 rounded-sm
                                    ${getRarityClass(item.rarity)} ${isEquipped ? 'opacity-50 grayscale' : ''} 
                                `}
                            >
                                {renderItemIcon(item)}
                            </div>
                        );
                    })}
                    {Array.from({ length: Math.max(0, 42 - inventory.length) }).map((_, i) => (
                         <div key={`empty-${i}`} className="w-10 h-10 md:w-16 md:h-16 border border-slate-800 bg-slate-900/30 rounded-sm"></div>
                    ))}
                </div>
            </div>

            <div className="h-6 md:h-10 mt-1 md:mt-2 border-t border-slate-700 pt-1 flex justify-between items-center text-[9px] md:text-xs text-slate-500 font-mono flex-shrink-0">
                 <div>{t.clickToEquip}</div>
                 <div className="flex items-center gap-1 md:gap-2"><Trash2 size={12} /> <span>Shift+Click = {t.trash}</span></div>
            </div>
        </div>
        
        <Tooltip />
      </div>
    </div>
  );
};

export default Inventory;