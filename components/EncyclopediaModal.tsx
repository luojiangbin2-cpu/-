
import React, { useState } from 'react';
import { Settings } from '../types';
import { TRANSLATIONS, MONSTER_AFFIXES, AVAILABLE_SKILLS, MAX_SKILL_LEVEL, SKILL_STAT_LABELS } from '../constants';
import { X, BookOpen, Skull, Zap } from 'lucide-react';
import { getImage } from '../utils/imageLoader';

interface EncyclopediaModalProps {
  settings: Settings;
  onClose: () => void;
}

const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ settings, onClose }) => {
  const t = TRANSLATIONS[settings.language];
  const lang = settings.language;
  const [tab, setTab] = useState<'monsters' | 'skills'>('skills');

  const formatValue = (key: string, val: number, skillType?: string) => {
      // Special override for Kinetic skill cooldown
      if (key === 'cooldown' && skillType === 'kinetic') {
          return lang === 'zh' ? '移动充能' : 'Movement';
      }

      if (key === 'cooldown' || key === 'duration') {
          return `${(val / 60).toFixed(2)}s`;
      }
      if (key === 'area' || key === 'projectileSpeed' || key === 'damageMultiplier') {
          return val > 0 ? `+${Math.round(val*100)}%` : `${Math.round(val*100)}%`;
      }
      return val > 0 ? `+${val}` : `${val}`;
  };

  const getStatLabel = (key: string) => {
      return SKILL_STAT_LABELS[key]?.[lang] || key;
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[70] backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-amber-800 rounded-lg w-full max-w-[800px] h-[85vh] max-h-[600px] shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-700 bg-slate-950">
            <div className="flex items-center gap-3">
                <BookOpen className="text-amber-500" size={28} />
                <h2 className="text-xl md:text-2xl font-serif text-amber-100">{t.encyclopedia}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-red-900/50 p-1 rounded"><X size={24}/></button>
        </div>

        <div className="flex border-b border-slate-700 bg-slate-900">
            <button 
                onClick={() => setTab('skills')}
                className={`flex-1 py-3 font-serif tracking-wider flex items-center justify-center gap-2 ${tab === 'skills' ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Zap size={18} /> {t.skillDetails}
            </button>
            <button 
                onClick={() => setTab('monsters')}
                className={`flex-1 py-3 font-serif tracking-wider flex items-center justify-center gap-2 ${tab === 'monsters' ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Skull size={18} /> {t.monsterAffixes}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900 custom-scrollbar">
            {tab === 'monsters' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MONSTER_AFFIXES.map((affix, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded hover:border-amber-900/50">
                            <h3 className="text-amber-400 font-bold text-lg mb-2">{lang === 'zh' ? affix.nameZh : affix.name}</h3>
                            <div className="space-y-1 text-sm text-slate-300 font-mono">
                                {Object.entries(affix.statMod).map(([stat, val]) => {
                                    if (typeof val !== 'number') return null;
                                    return (
                                        <div key={stat} className="flex justify-between border-b border-slate-800/50 pb-1">
                                            <span className="opacity-70">{stat}</span>
                                            <span className="text-green-400">x{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'skills' && (
                <div className="space-y-6 md:space-y-8">
                    {AVAILABLE_SKILLS.map((skill) => (
                        <div key={skill.id} className="bg-slate-950 border border-slate-800 rounded p-4 flex flex-col md:flex-row gap-4">
                             <div className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-full flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden mx-auto md:mx-0">
                                {skill.assetKey && getImage(skill.assetKey) ? (
                                    <img src={getImage(skill.assetKey)!.src} className="w-full h-full object-cover" />
                                ) : skill.icon}
                             </div>
                             <div className="flex-1">
                                 <h3 className="text-xl font-bold text-white mb-1 text-center md:text-left">{lang === 'zh' ? skill.nameZh : skill.name}</h3>
                                 <p className="text-slate-400 text-sm mb-3 text-center md:text-left">{lang === 'zh' ? skill.descriptionZh : skill.description}</p>
                                 
                                 <div className="bg-slate-900/50 p-2 rounded text-xs font-mono space-y-1 text-slate-300">
                                     <div className="flex justify-between"><span className="text-slate-500">{getStatLabel('damage')}:</span> {skill.damage}</div>
                                     <div className="flex justify-between"><span className="text-slate-500">{getStatLabel('cooldown')}:</span> {formatValue('cooldown', skill.cooldown, skill.type)}</div>
                                     {skill.projectileCount && <div className="flex justify-between"><span className="text-slate-500">{getStatLabel('projectileCount')}:</span> {skill.projectileCount}</div>}
                                 </div>

                                 <div className="mt-3">
                                     <h4 className="text-amber-600 text-xs font-bold uppercase tracking-widest mb-1">{lang === 'zh' ? '每级提升' : 'Scaling per Level'}</h4>
                                     <div className="text-xs text-slate-400 grid grid-cols-2 gap-x-4">
                                         {Object.entries(skill.statsPerLevel || {}).map(([key, val]) => {
                                             if (typeof val !== 'number') return null;
                                             return (
                                                <div key={key}>
                                                    <span className="capitalize">{getStatLabel(key)}:</span> <span className="text-green-400">{formatValue(key, val as number, skill.type)}</span>
                                                </div>
                                             )
                                         })}
                                     </div>
                                 </div>

                                 <div className="mt-3 border-t border-slate-800 pt-2">
                                     <h4 className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">{lang === 'zh' ? `等级 ${MAX_SKILL_LEVEL} 精通` : `Level ${MAX_SKILL_LEVEL} Mastery`}</h4>
                                     <p className="text-xs text-slate-200 italic">
                                         {lang === 'zh' ? skill.masteryEffectZh : skill.masteryEffect}
                                     </p>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default EncyclopediaModal;
