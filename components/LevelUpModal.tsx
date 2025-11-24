
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

  const getSkillDesc = (skill: Skill) => {
      // Dynamic Description for the NEXT level
      const stats = skill.statsPerLevel;
      const nextLevel = skill.level + 1;
      const isMastery = nextLevel >= MAX_SKILL_LEVEL;
      
      if (isMastery && skill.masteryEffect) {
          return language === 'zh' ? skill.masteryEffectZh : skill.masteryEffect;
      }
      
      const parts = [];
      
      // SPECIAL LOGIC: Ice Bolt Breakpoints
      if (skill.id === 'icebolt') {
          if (nextLevel === 3) {
              parts.push(language === 'zh' ? '投射物数量 +2 (散射)' : 'Projectiles +2 (Multi-shot)');
          }
          if (nextLevel === 5) {
              parts.push(language === 'zh' ? '获得减速效果' : 'Gains Slow Effect');
          }
      }

      if (stats) {
          if (stats.damage) parts.push(language === 'zh' ? `伤害 +${stats.damage}` : `Dmg +${stats.damage}`);
          
          // Show projectile count if it's in the stats AND not handled by the special logic above
          if (stats.projectileCount && skill.id !== 'icebolt') {
              parts.push(language === 'zh' ? `数量 +${stats.projectileCount}` : `Count +${stats.projectileCount}`);
          }
          
          // Cooldown conversion: Frames to Seconds
          if (stats.cooldown) {
              const cdSec = Math.abs(stats.cooldown / 60).toFixed(2);
              const sign = stats.cooldown < 0 ? '-' : '+';
              parts.push(language === 'zh' ? `冷却 ${sign}${cdSec}秒` : `CD ${sign}${cdSec}s`);
          }
          
          if (stats.duration) parts.push(language === 'zh' ? `持续 +${(stats.duration/60).toFixed(1)}s` : `Dur +${(stats.duration/60).toFixed(1)}s`);
          if (stats.area) parts.push(language === 'zh' ? `范围 +${Math.round(stats.area*100)}%` : `Area +${Math.round(stats.area*100)}%`);
      }
      
      if (parts.length > 0) {
          return parts.join(', ');
      }
      
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
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-8">
        <h1 className="text-4xl text-amber-400 font-serif text-shadow-glow animate-bounce">{t.levelUp}</h1>
        <p className="text-slate-300">{t.choosePower}</p>
        
        <div className="flex gap-6">
          {options.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSelect(skill)}
              className="w-64 h-80 bg-slate-900 border-2 border-slate-600 hover:border-amber-400 hover:scale-105 transition-all flex flex-col items-center p-6 text-center group rounded-lg shadow-2xl relative overflow-hidden"
            >
               {skill.level + 1 === MAX_SKILL_LEVEL && (
                   <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rotate-45 translate-x-3 translate-y-3 shadow-md z-10">MAX</div>
               )}
               
               <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-4xl mb-4 shadow-inner group-hover:border-amber-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] overflow-hidden">
                 {renderIcon(skill)}
               </div>
               <h3 className="text-xl font-bold text-amber-100 mb-1">{getSkillName(skill)}</h3>
               <div className="text-xs text-amber-500 mb-2 font-mono">
                   {language === 'zh' ? '等级' : 'Level'} {skill.level} {'->'} <span className="text-white font-bold">{skill.level + 1}</span>
               </div>
               
               <div className="h-px w-full bg-slate-700 mb-4"></div>
               
               <p className="text-sm text-green-400 group-hover:text-green-300 font-medium">
                   {getSkillDesc(skill)}
               </p>
               
               {skill.level + 1 === MAX_SKILL_LEVEL && (
                   <div className="mt-2 text-red-400 text-xs font-bold animate-pulse">{t.mastery}</div>
               )}

               <div className="mt-auto">
                   <span className="text-xs uppercase tracking-widest text-slate-500">{t.type}: {skill.type}</span>
               </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
