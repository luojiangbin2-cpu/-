
import React from 'react';
import { Skill, Language } from '../types';
import { getImage } from '../utils/imageLoader';
import { TRANSLATIONS } from '../constants';

interface NewSkillModalProps {
  options: Skill[];
  onSelect: (skill: Skill) => void;
  language: Language;
}

const NewSkillModal: React.FC<NewSkillModalProps> = ({ options, onSelect, language }) => {
  const t = TRANSLATIONS[language];

  const getSkillName = (skill: Skill) => {
    return language === 'zh' && skill.nameZh ? skill.nameZh : skill.name;
  };

  const renderIcon = (skill: Skill) => {
      if (skill.assetKey) {
          const img = getImage(skill.assetKey);
          if (img) return <img src={img.src} alt={skill.name} className="w-full h-full object-cover rounded-full" />;
      }
      return skill.icon;
  };

  return (
    <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl space-y-4 md:space-y-8">
        <div className="text-center">
            <h1 className="text-3xl md:text-5xl text-amber-500 font-serif text-shadow-glow animate-pulse mb-2">{t.levelUp}</h1>
            <p className="text-slate-200 text-lg md:text-xl font-light">{t.choosePower}</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full">
          {options.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSelect(skill)}
              className="w-full max-w-[300px] bg-slate-900 border-2 border-slate-600 hover:border-amber-500 hover:bg-slate-800 hover:scale-105 transition-all p-6 rounded-lg shadow-2xl group flex flex-col items-center text-center relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
               
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 border-2 border-amber-900 flex items-center justify-center text-4xl mb-4 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-shadow">
                 {renderIcon(skill)}
               </div>
               
               <h3 className="text-xl md:text-2xl font-bold text-amber-100 mb-2">{getSkillName(skill)}</h3>
               
               <div className="h-px w-20 bg-slate-700 mb-4"></div>
               
               <p className="text-sm text-slate-400 group-hover:text-slate-200 leading-relaxed">
                   {language === 'zh' ? skill.descriptionZh : skill.description}
               </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewSkillModal;
