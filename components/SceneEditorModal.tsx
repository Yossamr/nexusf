
import React, { useState, useEffect } from 'react';
import { Device, Scene, SceneTarget } from '../types';
import { X, Check, Save, Layers, Power, Ban } from 'lucide-react';

interface SceneEditorModalProps {
  scene?: Scene | null; // If null, creating new
  devices: Device[];
  onSave: (scene: Scene) => void;
  onClose: () => void;
}

const SceneEditorModal: React.FC<SceneEditorModalProps> = ({ scene, devices, onSave, onClose }) => {
  const [name, setName] = useState(scene?.name || '');
  const [color, setColor] = useState(scene?.color || '#3b82f6');
  const [targets, setTargets] = useState<Record<string, SceneTarget>>(scene?.targets || {});

  // Pre-fill targets if creating new scene (optional: defaults to current state or empty)
  // Let's default to empty (Ignore All) so user explicitly sets what they want.

  const handleDeviceStateChange = (deviceId: string, state: 'ON' | 'OFF' | 'IGNORE') => {
    setTargets(prev => {
      const next = { ...prev };
      if (state === 'IGNORE') {
        delete next[deviceId];
      } else {
        // Preserve existing params if any, or default
        const existingParams = next[deviceId]?.params;
        next[deviceId] = {
          isOn: state === 'ON',
          params: existingParams
        };
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    const newScene: Scene = {
      id: scene?.id || `scene_${Date.now()}`,
      name,
      color,
      targets
    };
    onSave(newScene);
    onClose();
  };

  const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#e879f9', '#f472b6'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" dir="rtl">
      <div className="w-full max-w-2xl bg-[#121215] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-[#1a1a20] border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-white">{scene ? 'تعديل الوضع' : 'وضع جديد'}</h2>
            <p className="text-xs text-gray-500 font-bold mt-1">حدد الأجهزة اللي هتتغير لما تشغل الوضع ده</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0e0e12]">
          
          {/* 1. Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">اسم الوضع</label>
              <div className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl p-2 px-4 focus-within:border-cyan-500 transition-colors">
                <Layers size={20} className="text-gray-500" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: وقت النوم، خارج البيت..."
                  className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none font-bold"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">لون الأيقونة</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. Device Configuration List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-white text-lg font-bold">التحكم في الأجهزة</label>
              <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">{Object.keys(targets).length} أجهزة مختارة</span>
            </div>

            <div className="space-y-3">
              {devices.map(device => {
                const target = targets[device.id];
                // State: 'ON' if in targets & isOn=true, 'OFF' if in targets & isOn=false, 'IGNORE' if not in targets
                let currentState: 'ON' | 'OFF' | 'IGNORE' = 'IGNORE';
                if (target) currentState = target.isOn ? 'ON' : 'OFF';

                return (
                  <div key={device.id} className="bg-[#1a1a20] rounded-2xl p-3 border border-white/5 flex items-center justify-between gap-4">
                    
                    {/* Device Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentState !== 'IGNORE' ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-600'}`}>
                        <Power size={18} />
                      </div>
                      <div className="truncate">
                        <p className={`font-bold truncate ${currentState !== 'IGNORE' ? 'text-white' : 'text-gray-500'}`}>{device.name}</p>
                        <p className="text-[10px] text-gray-600 truncate">{device.type}</p>
                      </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex bg-black rounded-lg p-1 shrink-0">
                      
                      {/* IGNORE BTN */}
                      <button
                        onClick={() => handleDeviceStateChange(device.id, 'IGNORE')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentState === 'IGNORE' ? 'bg-gray-700 text-gray-200 shadow' : 'text-gray-600 hover:text-gray-400'}`}
                      >
                        <Ban size={12} />
                        تجاهل
                      </button>

                      {/* OFF BTN */}
                      <button
                        onClick={() => handleDeviceStateChange(device.id, 'OFF')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentState === 'OFF' ? 'bg-red-500/20 text-red-500 shadow border border-red-500/20' : 'text-gray-600 hover:text-gray-400'}`}
                      >
                        إيقاف
                      </button>

                      {/* ON BTN */}
                      <button
                        onClick={() => handleDeviceStateChange(device.id, 'ON')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${currentState === 'ON' ? 'bg-green-500/20 text-green-500 shadow border border-green-500/20' : 'text-gray-600 hover:text-gray-400'}`}
                      >
                        تشغيل
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-[#1a1a20] border-t border-white/5 shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-bold shadow-lg shadow-cyan-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {scene ? 'حفظ التعديلات' : 'إنشاء الوضع'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SceneEditorModal;
