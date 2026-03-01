import React, { useState, useEffect } from 'react';
import { Device, Scene, FreeKeyMapping, FreeKeyActionType } from '../types';
import { Key, Trash2, ChevronDown } from 'lucide-react';

interface SmartKeysManagerProps {
  mappings: FreeKeyMapping[];
  devices: Device[];
  scenes: Scene[];
  onUpdateMapping: (mapping: FreeKeyMapping) => void;
  onDeleteMapping: (id: string) => void;
}

const SmartKeysManager: React.FC<SmartKeysManagerProps> = ({
  mappings,
  devices,
  scenes,
  onUpdateMapping,
  onDeleteMapping
}) => {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);

  // --- VISUAL FEEDBACK LISTENER ---
  useEffect(() => {
      const handleKeyPress = (e: any) => {
          const id = e.detail?.id;
          if (id) {
              setActiveKeyId(id);
              // Reset after animation
              setTimeout(() => setActiveKeyId(null), 500);
          }
      };

      window.addEventListener('nexus-free-key-press', handleKeyPress);
      return () => window.removeEventListener('nexus-free-key-press', handleKeyPress);
  }, []);
  
  return (
    <div className="space-y-4 p-2" dir="rtl">
      <div className="flex items-center gap-2 mb-4 text-cyan-400">
        <Key size={20} />
        <h2 className="text-lg font-bold">المفاتيح الذكية (Free Keys)</h2>
      </div>

      {mappings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-white/5">
          <p>لا توجد مفاتيح حرة مكتشفة بعد.</p>
          <p className="text-xs mt-2">اضغط على أي مفتاح حر في لوحات الحائط ليظهر هنا.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {mappings.map((mapping) => (
            <div 
              key={mapping.id}
              className={`bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10 ${activeKeyId === mapping.id ? 'ring-2 ring-cyan-500 bg-cyan-900/20' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-cyan-400 transition-colors ${activeKeyId === mapping.id ? 'bg-cyan-500 text-white shadow-[0_0_15px_cyan]' : 'bg-cyan-500/20'}`}>
                    <span className="font-mono font-bold text-lg">{mapping.sourceKeyIndex}</span>
                  </div>
                  <div className="flex-1 mr-2">
                    <input 
                        type="text"
                        value={mapping.name || `مفتاح رقم ${mapping.sourceKeyIndex}`}
                        onChange={(e) => onUpdateMapping({ ...mapping, name: e.target.value })}
                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-500 outline-none text-white font-bold text-sm w-full transition-all"
                        placeholder="سمي المفتاح..."
                    />
                    <div className="font-mono text-[10px] text-gray-500 mt-0.5">{mapping.sourceMac}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onDeleteMapping(mapping.id)}
                  className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Action Selection */}
              <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium px-1">وظيفة المفتاح:</label>
                  <div className="relative">
                    <select
                        value={mapping.actionType || ''}
                        onChange={(e) => {
                        const newType = e.target.value as FreeKeyActionType | '';
                        onUpdateMapping({
                            ...mapping,
                            actionType: newType || null,
                            targetId: undefined // Reset target when type changes
                        });
                        }}
                        className="w-full appearance-none bg-[#1a1a20] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm hover:bg-[#252530]"
                    >
                        <option value="" className="bg-[#1a1a20] text-gray-400">-- اختر الإجراء --</option>
                        <option value="TOGGLE_DEVICE" className="bg-[#1a1a20] text-white">🔄 تشغيل/إيقاف (Toggle - المفتاح العادي)</option>
                        <option value="TURN_ON" className="bg-[#1a1a20] text-white">🟢 زرار تشغيل فقط (Master ON)</option>
                        <option value="TURN_OFF" className="bg-[#1a1a20] text-white">🔴 زرار إطفاء فقط (Master OFF)</option>
                        <option value="ACTIVATE_SCENE" className="bg-[#1a1a20] text-white">🎭 تفعيل مشهد (Scene)</option>
                        <option value="CUSTOM_MODE" className="bg-[#1a1a20] text-white">🎛️ وضع مخصص (Custom Mode)</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Target Selection based on Action Type */}
                {(mapping.actionType === 'TOGGLE_DEVICE' || mapping.actionType === 'TURN_ON' || mapping.actionType === 'TURN_OFF') && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-cyan-400 font-medium px-1">الجهاز المستهدف:</label>
                    <div className="relative">
                        <select
                        value={mapping.targetId || ''}
                        onChange={(e) => onUpdateMapping({ ...mapping, targetId: e.target.value })}
                        className="w-full appearance-none bg-[#1a1a20] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm hover:bg-[#252530]"
                        >
                        <option value="" className="bg-[#1a1a20] text-gray-400">-- اختر الجهاز --</option>
                        {devices.map(d => (
                            <option key={d.id} value={d.id} className="bg-[#1a1a20] text-white">
                            {d.type === 'light' ? '💡' : d.type === 'ac' ? '❄️' : '🔌'} {d.name} ({d.room || 'بدون غرفة'})
                            </option>
                        ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                )}

                {mapping.actionType === 'ACTIVATE_SCENE' && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-purple-400 font-medium px-1">المشهد المطلوب:</label>
                    <div className="relative">
                        <select
                        value={mapping.targetId || ''}
                        onChange={(e) => onUpdateMapping({ ...mapping, targetId: e.target.value })}
                        className="w-full appearance-none bg-[#1a1a20] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm hover:bg-[#252530]"
                        >
                        <option value="" className="bg-[#1a1a20] text-gray-400">-- اختر المشهد --</option>
                        {scenes.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#1a1a20] text-white">
                            ✨ {s.name}
                            </option>
                        ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                )}

                {/* CUSTOM MODE CONFIGURATION */}
                {mapping.actionType === 'CUSTOM_MODE' && (
                  <div className="animate-in fade-in slide-in-from-top-2 space-y-2 mt-2 bg-black/40 p-3 rounded-lg border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="text-xs text-cyan-400 font-bold mb-2 sticky top-0 bg-black/90 p-1 z-10 border-b border-white/10">
                      حدد حالة الأجهزة عند الضغط:
                    </div>
                    {devices.map(device => {
                      const currentState = mapping.customModeConfig?.[device.id]; // 'ON' | 'OFF' | undefined (IGNORE)
                      
                      return (
                        <div key={device.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{device.type === 'light' ? '💡' : device.type === 'ac' ? '❄️' : '🔌'}</span>
                            <div className="text-xs text-white font-medium">{device.name}</div>
                          </div>
                          
                          <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/10">
                            <button
                              onClick={() => {
                                const newConfig = { ...(mapping.customModeConfig || {}) };
                                delete newConfig[device.id]; // Remove to set as IGNORE
                                onUpdateMapping({ ...mapping, customModeConfig: newConfig });
                              }}
                              className={`px-2 py-1 text-[10px] rounded ${!currentState ? 'bg-gray-600 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              تجاهل
                            </button>
                            <button
                              onClick={() => {
                                const newConfig = { ...(mapping.customModeConfig || {}), [device.id]: 'ON' };
                                onUpdateMapping({ ...mapping, customModeConfig: newConfig });
                              }}
                              className={`px-2 py-1 text-[10px] rounded ${currentState === 'ON' ? 'bg-green-600 text-white font-bold shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'text-gray-500 hover:text-green-400'}`}
                            >
                              تشغيل
                            </button>
                            <button
                              onClick={() => {
                                const newConfig = { ...(mapping.customModeConfig || {}), [device.id]: 'OFF' };
                                onUpdateMapping({ ...mapping, customModeConfig: newConfig });
                              }}
                              className={`px-2 py-1 text-[10px] rounded ${currentState === 'OFF' ? 'bg-red-600 text-white font-bold shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-gray-500 hover:text-red-400'}`}
                            >
                              إطفاء
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartKeysManager;
