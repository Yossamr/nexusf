import React, { useEffect, useState } from 'react';
import { Device } from '../types';
import { Power, Tv, Volume2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Menu, AppWindow, Play, Pause, FastForward, Rewind, Lightbulb } from 'lucide-react';

interface SimpleRemoteProps {
  device: Device;
  onToggle: () => void;
  onUpdate?: (params: Partial<Device['params']>) => void;
}

const SimpleRemote: React.FC<SimpleRemoteProps> = ({ device, onToggle, onUpdate }) => {
  const [durationStr, setDurationStr] = useState('--:--:--');

  useEffect(() => {
    if (!device.isOn || !device.lastStartTime) {
      if (durationStr !== '') setDurationStr('');
      return;
    }
    const updateTime = () => {
      const seconds = Math.floor((Date.now() - (device.lastStartTime || Date.now())) / 1000);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const newStr = h > 0 ? `شغال بقاله ${h} ساعة و ${m} دقيقة` : `شغال بقاله ${m} دقيقة`;
      setDurationStr(newStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [device.isOn, device.lastStartTime, durationStr]);

  // --- TV REMOTE ---
  if (device.type === 'tv') {
    return (
      <div className="flex flex-col h-full gap-4" dir="rtl">
         {/* Screen Status */}
         <div className={`
            w-full h-32 rounded-2xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500
            ${device.isOn ? 'bg-gradient-to-br from-blue-900/40 to-black border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-[#151515] border-white/5'}
         `}>
             <Tv size={32} className={device.isOn ? "text-blue-400 mb-2" : "text-gray-600 mb-2"} />
             <span className="text-lg font-bold text-white">
                 {device.isOn ? 'التلفزيون شغال' : 'التلفزيون مطفي'}
             </span>
             {device.isOn && <span className="text-xs text-blue-300 mt-1">{durationStr}</span>}
         </div>

         {/* Navigation Circle */}
         <div className="flex-1 flex items-center justify-center">
             <div className="relative w-56 h-56 rounded-full bg-[#1a1a20] border border-white/10 shadow-xl flex items-center justify-center">
                 {/* Directional Buttons */}
                 <button className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-12 flex justify-center pt-2 text-gray-400 hover:text-white active:scale-95"><ChevronUp size={30}/></button>
                 <button className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-12 flex justify-center pb-2 text-gray-400 hover:text-white active:scale-95"><ChevronDown size={30}/></button>
                 <button className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center pr-2 text-gray-400 hover:text-white active:scale-95"><ChevronRight size={30}/></button>
                 <button className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center pl-2 text-gray-400 hover:text-white active:scale-95"><ChevronLeft size={30}/></button>
                 
                 {/* OK Button */}
                 <button className="w-20 h-20 rounded-full bg-[#252530] border border-white/5 shadow-inner flex items-center justify-center text-sm font-black text-gray-300 active:bg-blue-600 active:text-white active:scale-95 transition-all">
                    OK
                 </button>
             </div>
         </div>

         {/* Bottom Actions */}
         <div className="grid grid-cols-3 gap-3">
             <button className="h-16 rounded-2xl bg-[#1a1a20] flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-white/10">
                 <Menu size={20} className="text-gray-400"/>
                 <span className="text-[10px] font-bold text-gray-500">القائمة</span>
             </button>
             
             <button 
                 onClick={onToggle}
                 className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${device.isOn ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-green-500/20 text-green-500 border border-green-500/50'}`}
             >
                 <Power size={24} />
                 <span className="text-[10px] font-bold">{device.isOn ? 'إطفاء' : 'تشغيل'}</span>
             </button>

             <button className="h-16 rounded-2xl bg-[#1a1a20] flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-white/10">
                 <Volume2 size={20} className="text-gray-400"/>
                 <span className="text-[10px] font-bold text-gray-500">الصوت</span>
             </button>
         </div>
      </div>
    );
  }

  // --- GENERIC TOGGLE (Light/Plug/Heater) ---
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center" dir="rtl">
       
       <div className="relative">
           {/* Glow Effect */}
           <div className={`absolute inset-0 blur-[60px] rounded-full transition-all duration-700 ${device.isOn ? 'bg-amber-500/30' : 'bg-transparent'}`}></div>

           <button
            onClick={onToggle}
            className={`
                relative w-56 h-56 rounded-full border-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 active:scale-95 shadow-2xl
                ${device.isOn 
                    ? 'bg-gradient-to-b from-amber-500 to-orange-600 border-amber-400/50 text-white' 
                    : 'bg-[#151515] border-[#222] text-gray-600 hover:border-gray-600'}
            `}
           >
              <Power size={64} className={`transition-all duration-500 ${device.isOn ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''}`} />
              <div className="flex flex-col">
                  <span className="text-2xl font-black">{device.isOn ? 'شغال' : 'مطفي'}</span>
                  <span className={`text-sm font-medium ${device.isOn ? 'text-amber-100' : 'text-gray-600'}`}>
                      {device.isOn ? 'دوس عشان تطفي' : 'دوس عشان تشغل'}
                  </span>
              </div>
           </button>
       </div>

       {device.isOn && (
           <div className="bg-[#1a1a20] rounded-xl px-6 py-3 border border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
               <div className="flex flex-col items-center border-l border-white/10 pl-4">
                   <span className="text-[10px] text-gray-500 font-bold">الاستهلاك</span>
                   <span className="text-lg font-mono font-bold text-amber-400">{device.watts} وات</span>
               </div>
               <div className="flex flex-col items-center pr-2">
                   <span className="text-[10px] text-gray-500 font-bold">الوقت</span>
                   <span className="text-sm font-bold text-white">{durationStr || 'لسه بادئ'}</span>
               </div>
           </div>
       )}
    </div>
  );
};

export default SimpleRemote;