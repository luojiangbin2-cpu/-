
import React from 'react';
import { Skill, Language } from '../types';
import { getImage } from '../utils/imageLoader';
import { MAX_SKILL_LEVEL, TRANSLATIONS } from '../constants';

interface LevelUpModalProps {
  options: Skill[];
  onSelect: (skill: Skill) => void;
  language: Language;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ options, onSelect, language }) => {
  const t = TRANSLATIONS[language];

  const getSkillName = (skill: Skill) => {
    return language === 'zh' && skill.nameZh ? skill.nameZh : skill.name;
  };

  const getElementTag = (skill: Skill) => {
      if (!skill.element && !skill.isAugment) return null;
      
      if (skill.isAugment) {
          return <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded border border-purple-500">{t.augment}</span>;
      }
      
      const colors = {
          physical: 'bg-slate-700 text-slate-200 border-slate-500',
          cold: 'bg-cyan-900 text-cyan-200 border-cyan-500',
          lightning: 'bg-blue-900 text-blue-200 border-blue-500',
          void: 'bg-indigo-900 text-indigo-200 border-indigo-500'
      };
      
      const el = skill.element || 'physical';
      const label = language === 'zh' ? 
        (el === 'cold' ? '冰霜' : el === 'lightning' ? '闪电' : '物理') : 
        el.toUpperCase();
        
      return <span className={`text-[10px] px-2 py-0.5 rounded border ${colors[el]}`}>{label}</span>;
  };

  const getSkillDesc = (skill: Skill) => {
      // ... existing desc logic ...
      const stats = skill.statsPerLevel;
      const nextLevel = skill.level + 1;
      
      // If Augment, just show description
      if (skill.isAugment) {
           return (language === 'zh' && skill.descriptionZh ? skill.descriptionZh : skill.description);
      }

      const isMastery = nextLevel >= MAX_SKILL_LEVEL;
      if (isMastery && skill.masteryEffect) {
          return language === 'zh' ? skill.masteryEffectZh : skill.masteryEffect;
      }
      
      const parts = [];
      if (skill.id === 'icebolt') {
          if (nextLevel === 3) parts.push(language === 'zh' ? '投射物数量 +2 (散射)' : 'Projectiles +2 (Multi-shot)');
          if (nextLevel === 5) parts.push(language === 'zh' ? '获得减速效果' : 'Gains Slow Effect');
      }
      if (stats) {
          if (stats.damage) parts.push(language === 'zh' ? `伤害 +${stats.damage}` : `Dmg +${stats.damage}`);
          if (stats.projectileCount && skill.id !== 'icebolt') parts.push(language === 'zh' ? `数量 +${stats.projectileCount}` : `Count +${stats.projectileCount}`);
          if (stats.cooldown) {
              const cdSec = Math.abs(stats.cooldown / 60).toFixed(2);
              const sign = stats.cooldown < 0 ? '-' : '+';
              parts.push(language === 'zh' ? `冷却 ${sign}${cdSec}秒` : `CD ${sign}${cdSec}s`);
          }
          if (stats.duration) parts.push(language === 'zh' ? `持续 +${(stats.duration/60).toFixed(1)}s` : `Dur +${(stats.duration/60).toFixed(1)}s`);
          if (stats.area) parts.push(language === 'zh' ? `范围 +${Math.round(stats.area*100)}%` : `Area +${Math.round(stats.area*100)}%`);
      }
      if (parts.length > 0) return parts.join(', ');
      return (language === 'zh' && skill.descriptionZh ? skill.descriptionZh : skill.description);
  };

  const renderIcon = (skill: Skill) => {
      if (skill.assetKey) {
          const img = getImage(skill.assetKey);
          if (img) return <img src={img.src} alt={skill.name} className="w-full h-full object-cover rounded-full" />;
      }
      return skill.icon;
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="flex flex-col items-center justify-center h-full w-full space-y-2 md:space-y-6">
        <h1 className="text-2xl md:text-4xl text-amber-400 font-serif text-shadow-glow animate-bounce mt-4 md:mt-0">{t.levelUp}</h1>
        <p className="text-slate-300 text-sm md:text-base">{t.choosePower}</p>
        
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-center w-full max-h-[85vh] overflow-y-auto md:overflow-visible py-2">
          {options.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSelect(skill)}
              className={`w-full max-w-[320px] md:max-w-[280px] h-auto min-h-[140px] md:h-80 bg-slate-900 border-2 
                ${skill.isAugment ? 'border-purple-600 hover:border-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'border-slate-600 hover:border-amber-400'} 
                md:hover:scale-105 transition-all flex flex-row md:flex-col items-center p-3 md:p-6 text-left md:text-center group rounded-lg shadow-2xl relative overflow-hidden flex-shrink-0`}
            >
               {skill.level + 1 === MAX_SKILL_LEVEL && !skill.isAugment && (
                   <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 md:rotate-45 md:translate-x-3 md:translate-y-3 shadow-md z-10">MAX</div>
               )}
               {skill.isAugment && (
                   <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-2 py-1 md:rotate-45 md:translate-x-3 md:translate-y-3 shadow-md z-10">TAC</div>
               )}
               
               <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800 border-2 ${skill.isAugment ? 'border-purple-500' : 'border-slate-500'} flex items-center justify-center text-3xl md:text-4xl mr-4 md:mr-0 md:mb-4 shadow-inner group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] overflow-hidden flex-shrink-0`}>
                 {renderIcon(skill)}
               </div>
               
               <div className="flex-1 md:w-full flex flex-col items-start md:items-center">
                   <h3 className={`text-lg md:text-xl font-bold mb-1 ${skill.isAugment ? 'text-purple-300' : 'text-amber-100'}`}>{getSkillName(skill)}</h3>
                   
                   <div className="mb-2">{getElementTag(skill)}</div>
                   
                   {!skill.isAugment && (
                       <div className="text-xs text-amber-500 mb-1 font-mono">
                           {language === 'zh' ? '等级' : 'Level'} {skill.level} {'->'} <span className="text-white font-bold">{skill.level + 1}</span>
                       </div>
                   )}
                   
                   <div className="h-px w-full bg-slate-700 mb-1 md:mb-4 hidden md:block"></div>
                   
                   <p className="text-xs md:text-sm text-green-400 group-hover:text-green-300 font-medium leading-tight">
                       {getSkillDesc(skill)}
                   </p>
                   
                   {skill.level + 1 === MAX_SKILL_LEVEL && !skill.isAugment && (
                       <div className="mt-1 text-red-400 text-xs font-bold animate-pulse">{t.mastery}</div>
                   )}
               </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
