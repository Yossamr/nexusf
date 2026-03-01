
import React from 'react';
import { Scene } from '../types';
import { Moon, Sun, LogOut, Clapperboard, Gamepad2, Briefcase, Coffee, Zap, Settings2 } from 'lucide-react';

interface ScenesPageProps {
  scenes: Scene[];
  onApply: (id: string) => void;
  onAdd: () => void;
  onEdit: (scene: Scene) => void; // New prop
}

const ScenesPage: React.FC<ScenesPageProps> = ({ scenes, onApply, onAdd, onEdit }) => {
  
  const getSceneConfig = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('sleep') || n.includes('نوم')) return { icon: Moon, label: 'وقت النوم', desc: 'إطفاء الأنوار وتظبيط التكييف' };
    if (n.includes('morning') || n.includes('صبح') || n.includes('صحيت')) return { icon: Sun, label: 'صباح الخير', desc: 'فتح الستاير وتشغيل الكاتل' };
    if (n.includes('leave') || n.includes('خروج') || n.includes('off')) return { icon: LogOut, label: 'خارج من البيت', desc: 'فصل كل الأجهزة وتفعيل الأمان' };
    if (n.includes('movie') || n.includes('سينما') || n.includes('سهرة')) return { icon: Clapperboard, label: 'مود السهرة', desc: 'إضاءة خافتة للتلفزيون' };
    if (n.includes('game') || n.includes('لعب')) return { icon: Gamepad2, label: 'وقت اللعب', desc: 'أجواء حماسية' };
    if (n.includes('work') || n.includes('شغل') || n.includes('مذاكرة')) return { icon: Briefcase, label: 'تركيز وشغل', desc: 'إضاءة بيضاء قوية' };
    if (n.includes('relax') || n.includes('روقان')) return { icon: Coffee, label: 'وقت الروقان', desc: 'إضاءة هادية وموسيقى' };
    
    return { icon: Zap, label: name, desc: 'تفعيل الوضع' };
  };

  return (
    <div className="h-full flex flex-col items-center pt-4 pb-24 w-full px-4" dir="rtl">
      
      <div className="w-full mb-6">
          <h2 className="text-2xl font-black text-white mb-1">أوضاع البيت</h2>
          <p className="text-gray-400 text-sm">بضغطة واحدة، البيت كله يتغير عشانك</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full overflow-y-auto no-scrollbar pb-10">
        {scenes.map((scene) => {
          const config = getSceneConfig(scene.name);
          const Icon = config.icon;

          return (
            <div 
                key={scene.id}
                className="group relative h-28 rounded-[2rem] bg-[#1a1a20] border border-white/5 overflow-hidden transition-all hover:bg-[#252530] flex"
            >
                {/* Apply Button (Main Click Area) */}
                <button
                  onClick={() => onApply(scene.id)}
                  className="flex-1 flex items-center px-6 gap-5 h-full text-right outline-none active:scale-[0.98] transition-transform"
                >
                    <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
                        style={{ backgroundColor: scene.color }}
                    ></div>

                    <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: scene.color }}
                    >
                        <Icon size={32} />
                    </div>

                    <div className="flex-1 z-10">
                        <h3 className="text-xl font-bold text-white mb-1">{config.label}</h3>
                        <p className="text-xs text-gray-400 font-medium leading-tight line-clamp-2">{config.desc}</p>
                    </div>
                </button>

                {/* Edit Button (Separate) */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(scene);
                    }}
                    className="w-14 h-full flex items-center justify-center border-r border-white/5 hover:bg-white/5 text-gray-500 hover:text-white transition-colors z-20"
                >
                    <Settings2 size={20} />
                </button>
            </div>
          );
        })}

        {/* Create New Button */}
        <button 
            onClick={onAdd}
            className="h-28 rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center gap-3 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all active:scale-95"
        >
            <span className="text-2xl">+</span>
            <span className="text-sm font-bold">إضافة وضع جديد</span>
        </button>
      </div>
    </div>
  );
};

export default ScenesPage;
