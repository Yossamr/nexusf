import React from 'react';
import { Device } from '../types';
import { Power, Wind, Snowflake, Flame, Droplets, ChevronUp, ChevronDown, Fan } from 'lucide-react';

interface ACRemoteProps {
  device: Device;
  onToggle: () => void;
  onUpdate: (params: Partial<Device['params']>) => void;
}

const ACRemote: React.FC<ACRemoteProps> = ({ device, onToggle, onUpdate }) => {
  const { temperature = 24, mode = 'cool', fanSpeed = 'low' } = device.params || {};

  const handleTemp = (delta: number) => {
    const newTemp = Math.min(30, Math.max(16, temperature + delta));
    onUpdate({ temperature: newTemp });
  };

  const setMode = (m: NonNullable<Device['params']>['mode']) => {
      onUpdate({ mode: m });
  };

  const setFan = (s: NonNullable<Device['params']>['fanSpeed']) => {
      onUpdate({ fanSpeed: s });
  };

  // Helper for fan speed visualization
  const getFanSpeedLabel = () => {
      switch(fanSpeed) {
          case 'low': return 'هادي';
          case 'med': return 'وسط';
          case 'high': return 'عالي';
          default: return 'Auto';
      }
  };

  const getFanAnimationSpeed = () => {
      if (!device.isOn) return '0s';
      switch(fanSpeed) {
          case 'low': return '3s';
          case 'med': return '1.5s';
          case 'high': return '0.8s';
          default: return '3s';
      }
  };

  return (
    <div className="flex flex-col h-full gap-5 select-none text-center pt-2" dir="rtl">
      
      {/* 1. TEMPERATURE DIAL (ENHANCED DISPLAY) */}
      <div className="relative w-full aspect-square max-h-[260px] mx-auto flex items-center justify-center">
         
         {/* Background Glow */}
         <div className={`absolute inset-0 rounded-full blur-[50px] opacity-20 transition-all duration-700 ${device.isOn ? (mode === 'heat' ? 'bg-orange-500' : 'bg-cyan-500') : 'bg-transparent'}`}></div>

         {/* Main Circle */}
         <div className={`
            relative w-60 h-60 rounded-full flex flex-col items-center justify-center
            bg-[#15151a] border-[6px] transition-all duration-500 shadow-2xl
            ${device.isOn ? (mode === 'heat' ? 'border-orange-500/20 shadow-orange-500/10' : 'border-cyan-500/20 shadow-cyan-500/10') : 'border-white/5 grayscale'}
         `}>
             {!device.isOn ? (
                <div className="flex flex-col items-center gap-3 opacity-40">
                   <Power size={56} />
                   <span className="text-base font-bold text-gray-400">التكييف مقفول</span>
                </div>
             ) : (
                <>
                  {/* Temperature */}
                  <div className="flex items-start justify-center relative -mt-4">
                    <span className="text-[5.5rem] font-black tracking-tighter text-white leading-none drop-shadow-lg">
                      {temperature}
                    </span>
                    <span className="text-3xl text-gray-500 font-bold mt-2 absolute -right-6">°</span>
                  </div>

                  {/* STATUS PILLS */}
                  <div className="mt-4 flex flex-col items-center gap-2 w-full px-8">
                      
                      {/* Mode Pill */}
                      <div className={`flex items-center justify-center gap-2 w-full py-1.5 rounded-xl bg-white/5 border border-white/5 ${mode === 'heat' ? 'text-orange-400' : 'text-cyan-400'}`}>
                         {mode === 'cool' && <Snowflake size={16} className="animate-pulse" />}
                         {mode === 'heat' && <Flame size={16} className="animate-pulse" />}
                         {mode === 'dry' && <Droplets size={16} />}
                         {mode === 'fan' && <Wind size={16} />}
                         <span className="text-sm font-bold">
                            {mode === 'cool' ? 'تبريد' : mode === 'heat' ? 'تدفئة' : mode === 'dry' ? 'جاف' : 'مروحة'}
                         </span>
                      </div>

                      {/* Fan Speed Pill */}
                      <div className="flex items-center justify-center gap-2 w-full py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                         <Fan 
                            size={14} 
                            style={{ animation: `spin ${getFanAnimationSpeed()} linear infinite` }} 
                         />
                         <span className="text-xs font-bold text-gray-400">المروحة:</span>
                         <span className="text-xs font-bold text-white">{getFanSpeedLabel()}</span>
                      </div>

                  </div>
                </>
             )}
         </div>

         {/* Floating Temp Controls */}
         {device.isOn && (
           <>
             <button 
               onClick={() => handleTemp(1)}
               className="absolute -left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#202025] border border-white/10 shadow-lg flex items-center justify-center text-white active:scale-90 transition-all hover:bg-white/10 hover:border-white/30 z-20"
             >
               <ChevronUp size={28} />
             </button>
             <button 
               onClick={() => handleTemp(-1)}
               className="absolute -right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#202025] border border-white/10 shadow-lg flex items-center justify-center text-white active:scale-90 transition-all hover:bg-white/10 hover:border-white/30 z-20"
             >
               <ChevronDown size={28} />
             </button>
           </>
         )}
      </div>

      {/* 2. MODE SELECTOR */}
      <div className="bg-[#121215] rounded-2xl p-1.5 flex justify-between items-center border border-white/5 shadow-inner">
         {[
            { id: 'cool', icon: Snowflake, label: 'تبريد', color: 'text-cyan-400' },
            { id: 'heat', icon: Flame, label: 'تدفئة', color: 'text-orange-400' },
            { id: 'dry', icon: Droplets, label: 'جاف', color: 'text-blue-400' },
            { id: 'fan', icon: Wind, label: 'مروحة', color: 'text-gray-400' }
         ].map((m) => (
             <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                disabled={!device.isOn}
                className={`
                    flex flex-col items-center justify-center gap-1 flex-1 py-3 rounded-xl transition-all relative overflow-hidden
                    ${mode === m.id && device.isOn ? 'bg-white/10 shadow-sm' : 'opacity-40 hover:opacity-70'}
                `}
             >
                 {mode === m.id && device.isOn && <div className={`absolute top-0 left-0 w-full h-0.5 ${m.id === 'heat' ? 'bg-orange-500' : 'bg-cyan-500'}`}></div>}
                 <m.icon size={22} className={mode === m.id && device.isOn ? m.color : 'text-gray-400'} />
                 <span className={`text-[10px] font-bold mt-1 ${mode === m.id && device.isOn ? 'text-white' : 'text-gray-500'}`}>{m.label}</span>
             </button>
         ))}
      </div>

      {/* 3. FAN SPEED & POWER */}
      <div className="grid grid-cols-5 gap-3 mt-auto">
          {/* Fan Speed Control (Takes 3 columns) */}
          <div className="col-span-3 bg-[#121215] rounded-2xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] text-gray-500 font-bold">سرعة الهواء</span>
                 <Wind size={12} className="text-gray-600" />
              </div>
              <div className="flex gap-1 h-full items-end">
                 {['low', 'med', 'high'].map((s, idx) => (
                     <button 
                        key={s}
                        onClick={() => setFan(s as any)}
                        disabled={!device.isOn}
                        className={`
                            flex-1 rounded-lg transition-all h-10 flex items-end justify-center pb-2 relative group
                            ${fanSpeed === s && device.isOn ? 'bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.4)]' : 'bg-[#252530] hover:bg-[#303040]'}
                        `}
                     >
                        <div className={`w-1 rounded-full ${fanSpeed === s && device.isOn ? 'bg-white/50' : 'bg-white/10'}`} style={{ height: `${(idx+1)*30}%` }}></div>
                     </button>
                 ))}
              </div>
              <div className="flex justify-between text-[8px] text-gray-500 mt-1 font-bold px-1">
                  <span>1</span><span>2</span><span>3</span>
              </div>
          </div>

          {/* Power Button (Takes 2 columns) */}
          <button 
             onClick={onToggle}
             className={`
                col-span-2 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all active:scale-95 shadow-lg
                ${device.isOn 
                    ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-red-900/20' 
                    : 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20 shadow-green-900/20'}
             `}
          >
             <Power size={32} className={device.isOn ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"} />
             <span className="font-bold text-xs">{device.isOn ? 'إيقاف' : 'تشغيل'}</span>
          </button>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ACRemote;