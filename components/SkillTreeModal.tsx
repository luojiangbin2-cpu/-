
import React, { useState } from 'react';
import { Skill, Language, SkillNode } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, ArrowLeft, Zap, Lock } from 'lucide-react';

interface SkillTreeModalProps {
  skills: Skill[];
  availablePoints: number;
  onAllocate: (skillId: string, nodeId: string) => void;
  onClose: () => void;
  language: Language;
}

const SkillTreeModal: React.FC<SkillTreeModalProps> = ({ skills, availablePoints, onAllocate, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');

  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  const getNodeState = (skill: Skill, node: SkillNode) => {
      const currentPoints = skill.allocatedPoints[node.id] || 0;
      const isMaxed = currentPoints >= node.maxPoints;
      
      // Check Prereqs
      let unlocked = true;
      if (node.prerequisites.length > 0) {
          unlocked = node.prerequisites.every(preId => {
              const preNode = skill.tree.find(n => n.id === preId);
              const prePoints = skill.allocatedPoints[preId] || 0;
              // Simple logic: need at least 1 point in parent to see child? Or max?
              // Let's say: Need > 0 points in parent to unlock child
              return prePoints > 0;
          });
      }
      
      return { currentPoints, isMaxed, unlocked };
  };

  const handleNodeClick = (node: SkillNode) => {
      if (!selectedSkill || availablePoints <= 0) return;
      const { currentPoints, isMaxed, unlocked } = getNodeState(selectedSkill, node);
      
      if (unlocked && !isMaxed) {
          onAllocate(selectedSkill.id, node.id);
      }
  };

  // Render connections lines
  const renderConnections = (skill: Skill) => {
      if (!skill.tree) return null;
      
      return skill.tree.map(node => {
          return node.prerequisites.map(preId => {
              const parent = skill.tree.find(n => n.id === preId);
              if (!parent) return null;
              
              // Calculate relative positions (Assuming grid 60px size + gaps)
              // This is a simplified visual representation
              const x1 = parent.col * 80 + 40; 
              const y1 = parent.row * 100 + 40;
              const x2 = node.col * 80 + 40;
              const y2 = node.row * 100 + 40;
              
              const { unlocked } = getNodeState(skill, node);
              
              return (
                  <line 
                    key={`${parent.id}-${node.id}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={unlocked ? '#f59e0b' : '#334155'}
                    strokeWidth="2"
                    strokeDasharray={unlocked ? "" : "5,5"}
                  />
              );
          });
      });
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[60] backdrop-blur-md p-2 md:p-6">
      <div className="w-full h-full max-w-[1200px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT: Skill Selection List */}
        <div className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-amber-500 font-serif text-lg">{t.skillTree}</h2>
                <div className="text-xs text-slate-400 font-mono">{t.pointsAvailable}: <span className="text-green-400 text-base font-bold">{availablePoints}</span></div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {skills.map(skill => (
                    <button
                        key={skill.id}
                        onClick={() => setSelectedSkillId(skill.id)}
                        className={`w-full p-3 rounded flex items-center gap-3 transition-colors ${selectedSkillId === skill.id ? 'bg-amber-900/40 border border-amber-600/50' : 'bg-slate-900 border border-transparent hover:bg-slate-800'}`}
                    >
                        <div className="text-2xl">{skill.icon}</div>
                        <div className="text-left">
                            <div className={`text-sm font-bold ${selectedSkillId === skill.id ? 'text-amber-100' : 'text-slate-400'}`}>
                                {language === 'zh' && skill.nameZh ? skill.nameZh : skill.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                                {Object.values(skill.allocatedPoints).reduce((a: number, b: number) => a + b, 0)} {t.allocated}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            <button onClick={onClose} className="p-4 bg-slate-900 hover:bg-red-900/30 text-slate-400 hover:text-white border-t border-slate-800 transition-colors flex items-center justify-center gap-2">
                <X size={18} /> {t.close}
            </button>
        </div>

        {/* RIGHT: The Tree */}
        <div className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black relative overflow-auto custom-scrollbar">
            {selectedSkill ? (
                <div className="min-w-[500px] min-h-[600px] p-10 relative">
                     {/* SVG Layer for Lines */}
                     <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                         {renderConnections(selectedSkill)}
                     </svg>
                     
                     {/* Nodes Layer */}
                     <div className="relative z-10">
                         {selectedSkill.tree.map(node => {
                             const { currentPoints, isMaxed, unlocked } = getNodeState(selectedSkill, node);
                             
                             // Positioning
                             const left = node.col * 80 + 10;
                             const top = node.row * 100 + 10;
                             
                             return (
                                 <div 
                                    key={node.id}
                                    className="absolute flex flex-col items-center group"
                                    style={{ left, top }}
                                 >
                                     <button
                                        onClick={() => handleNodeClick(node)}
                                        disabled={!unlocked || isMaxed || availablePoints <= 0}
                                        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl relative transition-all
                                            ${isMaxed ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 
                                              unlocked ? (availablePoints > 0 ? 'bg-slate-800 border-slate-500 text-slate-200 hover:border-green-400 hover:scale-110 cursor-pointer' : 'bg-slate-800 border-slate-600 text-slate-400') : 
                                              'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'}
                                        `}
                                     >
                                         {node.icon}
                                         {!unlocked && <Lock size={12} className="absolute top-1 right-1 text-slate-600" />}
                                         <div className="absolute -bottom-2 right-[-5px] bg-black text-[10px] font-mono px-1 border border-slate-600 rounded text-white">
                                             {currentPoints}/{node.maxPoints}
                                         </div>
                                     </button>
                                     
                                     {/* Tooltip */}
                                     <div className="absolute bottom-16 opacity-0 group-hover:opacity-100 pointer-events-none bg-slate-900 border border-slate-600 p-2 rounded shadow-xl w-48 z-20 transition-opacity">
                                         <div className="text-amber-400 font-bold text-sm mb-1">{language === 'zh' ? node.nameZh : node.name}</div>
                                         <div className="text-xs text-slate-300 mb-2">{language === 'zh' ? node.descriptionZh : node.description}</div>
                                         <div className="text-[10px] text-green-400 font-mono">
                                             {Object.entries(node.statsPerPoint).map(([key, val]) => (
                                                 <div key={key}>{key}: {typeof val === 'number' && val > 0 ? '+' : ''}{val}</div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Select a skill to view its tree</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SkillTreeModal;
