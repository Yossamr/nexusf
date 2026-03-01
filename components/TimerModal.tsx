import React, { useState } from 'react';
import { Device, TimerConfig } from '../types';
import { Clock, Timer, X, Zap, PowerOff, CheckCircle2 } from 'lucide-react';

interface TimerModalProps {
  device: Device;
  onClose: () => void;
  onSetTimer: (timer: TimerConfig | null) => void;
}

const TimerModal: React.FC<TimerModalProps> = ({ device, onClose, onSetTimer }) => {
  const [activeTab, setActiveTab] = useState<'duration' | 'target'>('duration');
  
  // Duration State
  const [durationVal, setDurationVal] = useState(30);
  const [durationUnit, setDurationUnit] = useState<'min' | 'hour'>('min');
  
  // Target Time State
  const [targetTime, setTargetTime] = useState('12:00');
  
  // Action State
  const [action, setAction] = useState<'ON' | 'OFF'>(device.isOn ? 'OFF' : 'ON');

  const handleSave = () => {
    let finalTimestamp = 0;
    const now = new Date();

    if (activeTab === 'duration') {
        const msToAdd = durationUnit === 'min' ? durationVal * 60000 : durationVal * 3600000;
        finalTimestamp = Date.now() + msToAdd;
    } else {
        const [hours, mins] = targetTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(hours, mins, 0, 0);
        // If target time is earlier than now, assume tomorrow
        if (targetDate.getTime() < Date.now()) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        finalTimestamp = targetDate.getTime();
    }

    onSetTimer({
        type: activeTab,
        targetTime: finalTimestamp,
        action: action
    });
    onClose();
  };

  const handleClear = () => {
      onSetTimer(null);
      onClose();
  };

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTime = () => {
        const val = device.activeTimer ? Math.max(0, Math.ceil((device.activeTimer.targetTime - Date.now()) / 60000)) : 0;
        setTimeLeft(val);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [device.activeTimer]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-sm md:max-w-md bg-[#0e0e12] rounded-[2rem] overflow-hidden border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 md:p-6 bg-gradient-to-b from-amber-900/10 to-transparent border-b border-white/5 flex justify-between items-center">
            <div>
                <h3 className="text-white font-bold tracking-[0.2em] uppercase flex items-center gap-2 text-lg md:text-xl">
                    <Timer size={20} className="text-amber-500" />
                    Quick Timer
                </h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-mono tracking-wider">{device.name}</p>
            </div>
            <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Existing Timer Info */}
        {device.activeTimer && (
            <div className="mx-5 md:mx-6 mt-4 p-3 md:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex justify-between items-center animate-pulse">
                <div>
                    <span className="text-[10px] md:text-xs text-amber-400 font-bold uppercase block tracking-wider">Timer Active</span>
                    <span className="text-white font-mono text-sm md:text-base">Turns {device.activeTimer.action} in {timeLeft}m</span>
                </div>
                <button onClick={handleClear} className="text-[10px] md:text-xs text-red-400 hover:text-red-300 font-bold border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">CANCEL</button>
            </div>
        )}

        {/* Body */}
        <div className="p-5 md:p-6 space-y-6 md:space-y-8">
            
            {/* Tabs */}
            <div className="flex bg-black rounded-xl p-1 border border-white/10">
                <button 
                  onClick={() => setActiveTab('duration')}
                  className={`flex-1 py-3 md:py-4 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'duration' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >Duration</button>
                <button 
                  onClick={() => setActiveTab('target')}
                  className={`flex-1 py-3 md:py-4 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'target' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >Specific Time</button>
            </div>

            {/* Content Based on Tab */}
            {activeTab === 'duration' ? (
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" 
                            value={durationVal}
                            onChange={(e) => setDurationVal(Number(e.target.value))}
                            className="flex-1 bg-black border border-white/20 rounded-2xl px-4 py-4 md:py-5 text-3xl md:text-4xl text-white font-mono text-center focus:border-amber-500 outline-none transition-colors"
                        />
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => setDurationUnit('min')} 
                                className={`px-4 py-2 rounded-lg border text-[10px] md:text-xs font-bold tracking-wider transition-colors ${durationUnit === 'min' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}
                            >MIN</button>
                            <button 
                                onClick={() => setDurationUnit('hour')} 
                                className={`px-4 py-2 rounded-lg border text-[10px] md:text-xs font-bold tracking-wider transition-colors ${durationUnit === 'hour' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}
                            >HOUR</button>
                        </div>
                    </div>
                    
                    {/* Quick Select Bubbles */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                        {[15, 30, 45, 60, 90, 120].map(val => (
                            <button key={val} onClick={() => { setDurationVal(val); setDurationUnit('min'); }} className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs md:text-sm text-gray-400 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/50 whitespace-nowrap transition-all active:scale-95">
                                {val}m
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <input 
                        type="time" 
                        value={targetTime}
                        onChange={(e) => setTargetTime(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-2xl px-4 py-4 md:py-5 text-3xl md:text-4xl text-white font-mono text-center focus:border-amber-500 outline-none appearance-none transition-colors"
                    />
                    <p className="text-center text-[10px] md:text-xs text-gray-500 tracking-wide">Will trigger at this time (next occurrence).</p>
                </div>
            )}

            {/* Action Select */}
            <div>
                <label className="text-[10px] md:text-xs text-gray-500 uppercase tracking-[0.2em] mb-3 block">Action to Perform</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setAction('ON')}
                        className={`py-4 md:py-5 rounded-2xl border flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${action === 'ON' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-white/10 text-gray-600 hover:bg-white/5'}`}
                    >
                        <Zap size={20} /> <span className="font-bold text-xs md:text-sm tracking-widest">TURN ON</span>
                    </button>
                    <button 
                        onClick={() => setAction('OFF')}
                        className={`py-4 md:py-5 rounded-2xl border flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${action === 'OFF' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/10 text-gray-600 hover:bg-white/5'}`}
                    >
                        <PowerOff size={20} /> <span className="font-bold text-xs md:text-sm tracking-widest">TURN OFF</span>
                    </button>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-4 md:py-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]"
            >
                <CheckCircle2 size={24} />
                <span className="text-sm md:text-base">Start Timer</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default TimerModal;