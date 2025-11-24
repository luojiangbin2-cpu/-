
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
    <div className="absolute top-0 left-0 w-full p-4 pointer-events-none">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-full border border-slate-700">
           <div className="w-8 h-8 rounded-full bg-amber-900 flex items-center justify-center border border-amber-500 text-amber-100 font-bold font-serif">
             {gameState.level}
           </div>
           <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
                style={{ width: `${xpPercentage}%` }}
              ></div>
           </div>
           <span className="text-xs text-amber-200 font-mono">EXP</span>
        </div>

        <div className="flex items-center space-x-2 bg-black/50 px-4 py-2 rounded border border-slate-700 text-slate-200 font-mono text-xl">
           <Clock size={20} />
           <span>{formatTime(gameState.time)}</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
         <div className="relative w-96 h-6 bg-slate-900 rounded-full border-2 border-slate-700 overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-200"
                style={{ width: `${Math.max(0, hpPercentage)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white shadow-black drop-shadow-md">
                {Math.ceil(stats.hp)} / {Math.ceil(stats.maxHp)}
            </div>
         </div>
         <Heart className="text-red-500 mt-1 animate-pulse" size={24} fill="currentColor" />
      </div>
    </div>
  );
};

export default HUD;
