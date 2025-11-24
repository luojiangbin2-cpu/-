
import React from 'react';
import { Settings, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { X } from 'lucide-react';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (newSettings: Settings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  const t = TRANSLATIONS[settings.language];

  const handleVolumeChange = (type: 'master' | 'music' | 'sfx', val: number) => {
    onUpdate({
        ...settings,
        [type === 'master' ? 'masterVolume' : type === 'music' ? 'musicVolume' : 'sfxVolume']: val
    });
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[60]">
      <div className="bg-slate-900 border-2 border-amber-800 p-8 rounded-lg w-[500px] shadow-2xl">
        
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <h2 className="text-2xl font-serif text-amber-500">{t.settings}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>
        </div>

        <div className="space-y-6">
            {/* Language */}
            <div className="flex flex-col gap-2">
                <label className="text-slate-300 font-bold">{t.language}</label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onUpdate({...settings, language: 'en'})}
                        className={`flex-1 py-2 border ${settings.language === 'en' ? 'bg-amber-900 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                    >
                        English
                    </button>
                    <button 
                        onClick={() => onUpdate({...settings, language: 'zh'})}
                        className={`flex-1 py-2 border ${settings.language === 'zh' ? 'bg-amber-900 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                    >
                        中文
                    </button>
                </div>
            </div>

            {/* Audio */}
            <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                        <span>{t.masterVol}</span>
                        <span>{Math.round(settings.masterVolume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={settings.masterVolume}
                        onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                        <span>{t.musicVol}</span>
                        <span>{Math.round(settings.musicVolume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={settings.musicVolume}
                        onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                        <span>{t.sfxVol}</span>
                        <span>{Math.round(settings.sfxVolume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={settings.sfxVolume}
                        onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                 </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-600 mt-4 font-serif"
            >
                {t.close}
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
