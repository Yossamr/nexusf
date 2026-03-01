import React, { useState, useEffect } from 'react';
import { Device, DeviceType } from '../types';
import { 
    X, Save, Edit2, Check, Smartphone, Lightbulb, 
    Fan, Wind, Tv, Speaker, Power, LayoutGrid 
} from 'lucide-react';

interface DeviceMappingModalProps {
    macAddress: string;
    channels: number;
    initialType?: string;
    existingDevices?: Device[];
    onSave: (mappings: { channelIndex: number, name: string, type: DeviceType, room: string, watts: number }[]) => void;
    onCancel: () => void;
}

const DeviceMappingModal: React.FC<DeviceMappingModalProps> = ({ 
    macAddress, channels, initialType, existingDevices = [], onSave, onCancel 
}) => {
    // Initialize state with existing devices if available, or defaults
    const [mappings, setMappings] = useState<{ channelIndex: number, name: string, type: DeviceType, room: string, watts: number }[]>(() => {
        const initial = [];
        for (let i = 1; i <= channels; i++) {
            const existing = existingDevices.find(d => d.channelIndex === i);
            initial.push({
                channelIndex: i,
                name: existing?.name || `جهاز ${i}`,
                type: (existing?.type || initialType || 'light') as DeviceType,
                room: existing?.room || 'غرفة المعيشة',
                watts: existing?.watts || 0
            });
        }
        return initial;
    });

    const handleUpdate = (index: number, field: string, value: any) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setMappings(newMappings);
    };

    const getIconForType = (type: DeviceType) => {
        switch(type) {
            case 'light': return Lightbulb;
            case 'fan': return Fan;
            case 'ac': return Wind;
            case 'tv': return Tv;
            case 'remote': return Smartphone;
            default: return Power;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" dir="rtl">
            <div className="w-full max-w-2xl bg-[#1a1a20] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <LayoutGrid className="text-cyan-400" />
                            إعداد الجهاز الجديد
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 font-mono">MAC: {macAddress}</p>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Check className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">تم اكتشاف جهاز جديد!</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                الجهاز ده بيتحكم في {channels} خطوط. يرجى تسمية كل خط وتحديد نوعه ومكانه.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {mappings.map((mapping, idx) => {
                            const Icon = getIconForType(mapping.type);
                            return (
                                <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                                        <span className="font-mono font-bold text-lg">{mapping.channelIndex}</span>
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                        {/* Name Input */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">الاسم</label>
                                            <input 
                                                type="text" 
                                                value={mapping.name}
                                                onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                                                placeholder="مثال: نور الصالة"
                                            />
                                        </div>

                                        {/* Type Select */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">النوع</label>
                                            <div className="relative">
                                                <select 
                                                    value={mapping.type}
                                                    onChange={(e) => handleUpdate(idx, 'type', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none appearance-none pl-8"
                                                >
                                                    <option value="light">إضاءة (Light)</option>
                                                    <option value="fan">مروحة (Fan)</option>
                                                    <option value="ac">تكييف (AC)</option>
                                                    <option value="tv">تلفزيون (TV)</option>
                                                    <option value="heater">سخان (Heater)</option>
                                                    <option value="outlet">فيشة (Outlet)</option>
                                                    <option value="fridge">ثلاجة (Fridge)</option>
                                                    <option value="washer">غسالة (Washer)</option>
                                                    <option value="router">راوتر (Router)</option>
                                                </select>
                                                <Icon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Room Input */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">الغرفة</label>
                                            <input 
                                                type="text" 
                                                value={mapping.room}
                                                onChange={(e) => handleUpdate(idx, 'room', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                                                placeholder="مثال: الصالة"
                                                list="rooms-list"
                                            />
                                            <datalist id="rooms-list">
                                                <option value="غرفة المعيشة" />
                                                <option value="غرفة النوم" />
                                                <option value="المطبخ" />
                                                <option value="الحمام" />
                                                <option value="المكتب" />
                                            </datalist>
                                        </div>

                                        {/* Watts Input */}
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">القدرة (وات)</label>
                                            <input 
                                                type="number" 
                                                value={mapping.watts}
                                                onChange={(e) => handleUpdate(idx, 'watts', Number(e.target.value))}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/20 border-t border-white/5 flex justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={() => onSave(mappings)}
                        className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceMappingModal;
