
import React from 'react';
import { GameState, PlayerStats } from '../types';
import { Heart, Clock } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  gameState: GameState;
}

const HUD: React.FC<HUDProps> = ({ stats, gameState }) => {
  const hpPercentage = stats.maxHp > 0 ? (stats.hp / stats.maxHp) * 100 : 0;
  const xpPercentage = gameState.xpToNextLevel > 0 ? (gameState.xp / gameState.xpToNextLevel) * 100 : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute top-0 left-0 w-full p-2 pt-12 md:pt-4 md:p-4 pointer-events-none z-10">
      {/* Top Bar: Stack vertically on mobile, spread horizontally on desktop */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
        
        {/* Level & XP */}
        <div className="flex items-center space-x-2 bg-black/50 px-2 py-1 md:px-4 md:py-2 rounded-full border border-slate-700 self-start">
           <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-amber-900 flex items-center justify-center border border-amber-500 text-amber-100 font-bold font-serif text-xs md:text-base">
             {gameState.level}
           </div>
           <div className="w-32 md:w-64 h-2 md:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                style={{ width: `${xpPercentage}%` }}
              ></div>
           </div>
           <span className="text-[10px] md:text-xs text-amber-200 font-mono">EXP</span>
        </div>

        {/* Timer */}
        <div className="flex items-center space-x-2 bg-black/50 px-2 py-1 md:px-4 md:py-2 rounded border border-slate-700 text-slate-200 font-mono text-sm md:text-xl self-start md:self-auto mt-1 md:mt-0">
           <Clock size={16} className="md:w-5 md:h-5" />
           <span>{formatTime(gameState.time)}</span>
        </div>
      </div>

      {/* Health Bar - Positioned at bottom 15% to be safe from top overlaps and bottom buttons */}
      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto w-full max-w-[90vw] md:max-w-md">
         <div className="relative w-full h-4 md:h-6 bg-slate-900 rounded-full border-2 border-slate-700 overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-200"
                style={{ width: `${Math.max(0, hpPercentage)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-white shadow-black drop-shadow-md">
                {Math.ceil(stats.hp)} / {Math.ceil(stats.maxHp)}
            </div>
         </div>
         <Heart className="text-red-500 mt-1 animate-pulse w-4 h-4 md:w-6 md:h-6" fill="currentColor" />
      </div>
    </div>
  );
};

export default HUD;
