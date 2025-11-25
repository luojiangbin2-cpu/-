
import React from 'react';
import { GameState, Settings } from '../types';
import { TRANSLATIONS, ENEMY_NAME_TRANSLATIONS, AVAILABLE_SKILLS } from '../constants';
import { Trophy, Skull, Crosshair, Clock } from 'lucide-react';

interface GameOverModalProps {
  gameState: GameState;
  settings: Settings;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ gameState, settings, onRestart }) => {
  const t = TRANSLATIONS[settings.language];
  const lang = settings.language;
  
  // Sort damage
  const sortedDamage = (Object.entries(gameState.damageDealtBySkill) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const totalDamage = (Object.values(gameState.damageDealtBySkill) as number[]).reduce((acc, v) => acc + v, 0) || 1;
  
  // Sort kills
  const sortedKills = (Object.entries(gameState.killCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const getMobName = (key: string) => {
      const trans = ENEMY_NAME_TRANSLATIONS[key];
      if (trans) return lang === 'zh' ? trans.zh : trans.en;
      return key.replace('enemy_', '').replace('boss_', '');
  };

  const getSkillName = (key: string) => {
      const skill = AVAILABLE_SKILLS.find(s => s.id === key);
      if (skill) return lang === 'zh' ? skill.nameZh : skill.name;
      return key;
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-start md:justify-center p-4 md:p-8 overflow-y-auto animate-in fade-in duration-500">
        <div className="w-full max-w-4xl flex flex-col items-center my-auto">
            <h2 className="text-4xl md:text-6xl text-red-600 font-serif mb-2 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)] uppercase tracking-widest text-center mt-8 md:mt-0">{t.youDied}</h2>
            <div className="text-slate-400 mb-8 font-mono text-lg md:text-xl flex flex-wrap justify-center gap-6">
                <span className="flex items-center gap-2"><Clock size={20} className="text-amber-500" /> {t.survived}: {gameState.time}s</span>
                <span className="flex items-center gap-2"><Trophy size={20} className="text-amber-500" /> {t.level}: {gameState.level}</span>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Kill Counts */}
                <div className="bg-slate-900/50 border border-slate-800 rounded p-4 md:p-6">
                    <h3 className="text-amber-500 font-serif text-xl md:text-2xl mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                        <Skull /> {t.kills}
                    </h3>
                    <div className="space-y-2 h-[200px] md:h-[300px] overflow-y-auto custom-scrollbar">
                        {sortedKills.map(([mob, count]) => (
                            <div key={mob} className="flex justify-between items-center text-slate-300 text-sm md:text-base">
                                <span className="capitalize">{getMobName(mob)}</span>
                                <span className="font-mono font-bold text-white">{count}</span>
                            </div>
                        ))}
                        {sortedKills.length === 0 && <div className="text-slate-600 italic">{t.noKills}</div>}
                    </div>
                </div>

                {/* Damage Distribution */}
                <div className="bg-slate-900/50 border border-slate-800 rounded p-4 md:p-6">
                    <h3 className="text-blue-400 font-serif text-xl md:text-2xl mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                        <Crosshair /> {t.damageDealt}
                    </h3>
                    <div className="space-y-3 h-[200px] md:h-[300px] overflow-y-auto custom-scrollbar">
                        {sortedDamage.map(([skillId, dmg]) => {
                            const pct = Math.round((dmg / totalDamage) * 100);
                            return (
                                <div key={skillId} className="w-full">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-200 capitalize">{getSkillName(skillId)}</span>
                                        <span className="text-slate-400">{Math.round(dmg).toLocaleString()} ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-600 rounded-full" 
                                            style={{ width: `${pct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                        {sortedDamage.length === 0 && <div className="text-slate-600 italic">{t.pacifist}</div>}
                    </div>
                </div>
            </div>

            <button 
                onClick={onRestart} 
                className="px-8 md:px-12 py-3 md:py-4 bg-red-900 hover:bg-red-800 text-white border-2 border-red-600 rounded shadow-lg uppercase tracking-widest font-bold text-lg md:text-xl transition-transform hover:scale-105 mb-10"
            >
                {t.restart}
            </button>
        </div>
    </div>
  );
};

export default GameOverModal;
