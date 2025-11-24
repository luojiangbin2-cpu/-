
import React, { useState, useRef, useEffect } from 'react';
import { Item, ItemSlot, PlayerStats, Rarity, Language, StatModifier } from '../types';
import { TRANSLATIONS, STAT_TRANSLATIONS, UNIQUE_EFFECT_TRANSLATIONS } from '../constants';
import { X, Shield, Trash2, ArrowDownUp, Zap } from 'lucide-react';
import { getImage } from '../utils/imageLoader';

interface InventoryProps {
  inventory: Item[];
  equipped: { [key: string]: Item }; // key is Slot String (Helm, Weapon, Ring1, etc)
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
      
      if (language === 'zh') {
          return `${sign}${valStr} ${label}`;
      } else {
          return `${sign}${valStr} ${mod.isPercentage ? '' : 'to '}${label}`;
      }
  };

  const getLocalizedUniqueEffect = (item: Item) => {
      const trans = UNIQUE_EFFECT_TRANSLATIONS[item.baseName];
      if (trans) return trans[language];
      return item.uniqueEffect;
  };

  const getItemName = (item: Item) => {
      return language === 'zh' && item.nameZh ? item.nameZh : item.name;
  };

  const ItemTooltipCard = ({ item, isEquippedComparison }: { item: Item, isEquippedComparison?: boolean }) => (
    <div 
        className="bg-black/95 border-2 p-3 w-[280px] shadow-[0_0_20px_rgba(0,0,0,1)] rounded-sm pointer-events-none flex-shrink-0"
        style={{ 
            borderColor: isEquippedComparison ? '#475569' : item.rarity === Rarity.Unique ? '#d97706' : item.rarity === Rarity.Rare ? '#facc15' : item.rarity === Rarity.Magic ? '#60a5fa' : '#94a3b8'
        }}
    >
        {isEquippedComparison && (
            <div className="bg-slate-700 text-white text-xs font-bold text-center py-1 mb-2 uppercase tracking-widest">
                {t.currentlyEquipped}
            </div>
        )}

        <div className={`text-center font-serif border-b pb-1 mb-2`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className={`text-lg font-bold tracking-wider ${item.rarity === Rarity.Unique ? 'text-orange-500' : item.rarity === Rarity.Rare ? 'text-yellow-400' : item.rarity === Rarity.Magic ? 'text-blue-400' : 'text-slate-200'}`}>
                {getItemName(item)}
            </div>
            <div className="text-sm text-slate-400 uppercase">{item.rarity === 'Unique' ? (language === 'zh' ? '暗金' : 'Unique') : item.rarity} {language === 'zh' && item.baseNameZh ? item.baseNameZh : item.baseName}</div>
        </div>
        
        <div className="text-sm space-y-1 text-blue-200 font-medium">
            <div className="text-slate-500 italic text-xs mb-1">{item.slot}</div>
            
            {item.implicit && (
                <div className="text-slate-300 py-1 border-t border-slate-800">
                    {getLocalizedStat(item.implicit)} <span className="text-slate-600">{t.implicit}</span>
                </div>
            )}
            
            <div className="border-t border-slate-800 pt-1 mt-1 space-y-1">
                {item.prefixes.map((p, i) => (
                    p.modifiers[0].value !== 0 ? 
                    <div key={`pre-${i}`} className="text-blue-300">
                        {getLocalizedStat(p.modifiers[0])} <span className="text-slate-500 text-xs">{p.tier ? `(T${p.tier})` : ''}</span>
                    </div> : null
                ))}
                {item.suffixes.map((s, i) => (
                    s.modifiers[0].value !== 0 ?
                    <div key={`suf-${i}`} className="text-blue-300">
                        {getLocalizedStat(s.modifiers[0])} <span className="text-slate-500 text-xs">{s.tier ? `(T${s.tier})` : ''}</span>
                    </div> : null
                ))}
                {item.rarity === Rarity.Unique && item.modifiers && item.modifiers.map((m, i) => (
                        <div key={`mod-${i}`} className="text-blue-300">{getLocalizedStat(m)}</div>
                ))}
            </div>

            {item.uniqueEffect && (
                <div className="text-orange-400 mt-2 italic border-t border-orange-900/50 pt-1">"{getLocalizedUniqueEffect(item)}"</div>
            )}
                {item.levelReq > 1 && (
                <div className="text-slate-500 mt-2 text-xs border-t border-slate-800 pt-1">{t.requiresLevel} {item.levelReq}</div>
                )}
        </div>
    </div>
  );

  const Tooltip = () => {
      if (!hoveredItem) return null;
      const { item, x, y } = hoveredItem;
      
      const comparisonItems: Item[] = [];
      
      // Determine comparison items
      if (item.slot === ItemSlot.Ring) {
          if (equipped['Ring1'] && equipped['Ring1'].id !== item.id) comparisonItems.push(equipped['Ring1']);
          if (equipped['Ring2'] && equipped['Ring2'].id !== item.id) comparisonItems.push(equipped['Ring2']);
      } else {
          // Normal slot check
          if (equipped[item.slot] && equipped[item.slot].id !== item.id) {
              comparisonItems.push(equipped[item.slot]);
          }
      }
      
      const cardWidth = 280;
      const gap = 8;
      // Calculate total width including comparisons
      const totalWidth = (comparisonItems.length + 1) * cardWidth + (comparisonItems.length * gap);
      
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Vertical positioning
      let top = y;
      const height = 300; // Approx height of card
      if (top + height > screenH) top = screenH - height - 10;
      if (top < 10) top = 10;

      // Horizontal positioning
      // Default to right of cursor
      let left = x + 20;
      
      // If it overflows right side, flip to left of cursor
      if (left + totalWidth > screenW) {
          left = x - totalWidth - 20;
      }
      
      // Ensure it doesn't go off screen left
      if (left < 10) left = 10;

      return (
        <div className="fixed z-[100] flex gap-2 pointer-events-none" style={{ top, left }}>
            {comparisonItems.map((compItem) => (
                <ItemTooltipCard key={compItem.id} item={compItem} isEquippedComparison />
            ))}
            <ItemTooltipCard item={item} />
        </div>
      );
  };

  const renderItemIcon = (item: Item) => {
      if (item.assetKey) {
          const img = getImage(item.assetKey);
          if (img) return <img src={img.src} alt={item.name} className="w-full h-full object-contain p-1" />;
      }
      // Fallback to Emoji
      return <span className="text-2xl drop-shadow-md">{item.image}</span>;
  };

  const ItemSlotComponent = ({ slotKey, label, item }: { slotKey: string, label: string, item?: Item }) => (
    <div 
      onClick={(e) => {
         e.stopPropagation(); 
         if (item) onUnequip(slotKey);
      }}
      onMouseEnter={(e) => item && setHoveredItem({ item, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHoveredItem(null)}
      onMouseMove={(e) => item && setHoveredItem({ item, x: e.clientX, y: e.clientY })}
      className={`w-16 h-16 border-2 bg-slate-900 relative group cursor-pointer flex items-center justify-center transition-colors hover:bg-slate-800 ${item ? getRarityClass(item.rarity) : 'border-slate-700'}`}
    >
        {item ? renderItemIcon(item) : (
            <span className="text-slate-700 text-xs uppercase font-bold text-center leading-none">{label}</span>
        )}
    </div>
  );

  const handleItemClick = (item: Item, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
          onDiscard(item.id);
          setHoveredItem(null);
      } else {
          onEquip(item);
          setHoveredItem(null);
      }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
      <div className="bg-slate-900 border-2 border-amber-800 w-[900px] h-[650px] flex shadow-2xl rounded-lg overflow-hidden relative">
        
        <div 
          className="w-1/3 bg-slate-950 p-6 border-r border-amber-900 flex flex-col items-center relative"
          onMouseLeave={() => setHoveredItem(null)} // Clear tooltip if leaving the equipped area
        >
            <h2 className="text-amber-500 font-serif text-xl mb-6 border-b border-amber-900/50 w-full text-center pb-2">{t.equipment}</h2>
            
            <div className="grid grid-cols-3 gap-2 mb-6">
                {/* Column 1: Weapon & Ring 1 */}
                <div className="flex flex-col gap-4 items-center pt-8">
                    <ItemSlotComponent slotKey="Weapon" label="Wpn" item={equipped[ItemSlot.Weapon]} />
                    <ItemSlotComponent slotKey="Ring1" label="Ring 1" item={equipped['Ring1']} />
                </div>
                
                {/* Column 2: Helm, Body, Boots */}
                <div className="flex flex-col gap-4 items-center">
                    <ItemSlotComponent slotKey="Helm" label="Helm" item={equipped[ItemSlot.Helm]} />
                    <ItemSlotComponent slotKey="Body" label="Body" item={equipped[ItemSlot.Body]} />
                    <ItemSlotComponent slotKey="Boots" label="Boots" item={equipped[ItemSlot.Boots]} />
                </div>

                {/* Column 3: Gloves & Ring 2 */}
                <div className="flex flex-col gap-4 items-center pt-8">
                     <ItemSlotComponent slotKey="Gloves" label="Gloves" item={equipped[ItemSlot.Gloves]} />
                     <ItemSlotComponent slotKey="Ring2" label="Ring 2" item={equipped['Ring2']} />
                </div>
            </div>

            <div className="w-full bg-slate-900 p-4 rounded border border-slate-800 text-sm text-slate-300 space-y-2 shadow-inner">
                <div className="flex justify-between text-amber-200 font-bold border-b border-slate-700 pb-1 mb-1"><span>{t.stats}</span> <Shield size={14}/></div>
                <div className="flex justify-between"><span>{t.maxLife}:</span> <span className="text-white">{Math.round(stats.maxHp)}</span></div>
                <div className="flex justify-between"><span>{t.physDmg}:</span> <span className="text-white">{Math.round(stats.damageMultiplier * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.atkSpeed}:</span> <span className="text-white">{Math.round(stats.attackSpeedMultiplier * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.critChance}:</span> <span className="text-white">{Math.round(stats.critChance * 100)}%</span></div>
                <div className="flex justify-between"><span>{t.moveSpeed}:</span> <span className="text-white">{stats.speed.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>{language === 'zh' ? '护甲' : 'Armor'}:</span> <span className="text-white">{Math.round(stats.armor)}</span></div>
            </div>
        </div>

        <div className="w-2/3 p-6 bg-slate-900 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-amber-500 font-serif text-xl">{t.inventory}</h2>
                
                <div className="flex gap-2">
                    <button onClick={onSort} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-amber-200 px-3 py-1 rounded border border-slate-600">
                        <ArrowDownUp size={14} /> {t.sort}
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-red-900/50 rounded"><X size={24}/></button>
                </div>
            </div>
            
            <div 
              className="flex-1 bg-slate-950 border border-slate-700 p-2 overflow-y-auto relative custom-scrollbar"
              onMouseLeave={() => setHoveredItem(null)} // Clear tooltip if leaving the inventory grid
            >
                <div className="grid grid-cols-6 gap-2 content-start">
                    {inventory.map((item) => {
                        // Check if equipped (by ID) across all slots values
                        const isEquipped = Object.values(equipped).some((e: Item) => e.id === item.id);
                        return (
                            <div 
                                key={item.id} 
                                onClick={(e) => handleItemClick(item, e)}
                                onMouseEnter={(e) => setHoveredItem({ item, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredItem(null)}
                                onMouseMove={(e) => setHoveredItem({ item, x: e.clientX, y: e.clientY })}
                                className={`w-16 h-16 border-2 flex items-center justify-center cursor-pointer relative group transition-all hover:brightness-125 hover:scale-105
                                    ${getRarityClass(item.rarity)}
                                    ${isEquipped ? 'opacity-50 grayscale' : ''} 
                                `}
                            >
                                {renderItemIcon(item)}
                            </div>
                        );
                    })}
                    {Array.from({ length: Math.max(0, 42 - inventory.length) }).map((_, i) => (
                         <div key={`empty-${i}`} className="w-16 h-16 border border-slate-800 bg-slate-900/30"></div>
                    ))}
                </div>
            </div>

            <div className="h-10 mt-2 border-t border-slate-700 pt-2 flex justify-between items-center text-xs text-slate-500 font-mono">
                 <div>{t.clickToEquip}</div>
                 <div className="flex items-center gap-2">
                    <Trash2 size={12} />
                    <span>Shift+Click = {t.trash}</span>
                 </div>
            </div>
        </div>
        
        <Tooltip />
      </div>
    </div>
  );
};

export default Inventory;
