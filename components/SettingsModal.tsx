
import React, { useState } from 'react';
import { Scene, Device, Habit, FreeKeyMapping } from '../types';
import SmartKeysManager from './SmartKeysManager';
import OnboardingWizard from './OnboardingWizard'; // NEW
import { 
  X, Trash2, Plus, CalendarClock, Wifi, WifiOff, 
  Settings as SettingsIcon, Cloud, CloudOff, 
  Zap, Layers, AlertTriangle, RefreshCw, Key, Router
} from 'lucide-react';

interface SettingsModalProps {
  scenes: Scene[];
  devices: Device[]; 
  onClose: () => void;
  onAddSceneClick: () => void;
  onSaveScene: (scene: Scene) => void;
  onDeleteScene: (id: string) => void;
  onUpdateDeviceHabits?: (id: string, habits: Habit[]) => void;
  onEnablePairing?: () => void;
  isOnlineMode?: boolean;
  onToggleOnlineMode?: (enabled: boolean) => void;
  isConnected?: boolean;
  initialTab?: 'general' | 'scenes' | 'habits' | 'system' | 'smart_keys'; 
  
  freeKeyMappings?: FreeKeyMapping[];
  onUpdateFreeKeyMapping?: (mapping: FreeKeyMapping) => void;
  onDeleteFreeKeyMapping?: (id: string) => void;

  localHubIp?: string;
  onUpdateLocalHubIp?: (ip: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    scenes, devices, onClose, 
    onAddSceneClick, onDeleteScene, onUpdateDeviceHabits,
    onEnablePairing, isOnlineMode, onToggleOnlineMode, isConnected = false,
    initialTab = 'general',
    freeKeyMappings = [], onUpdateFreeKeyMapping, onDeleteFreeKeyMapping,
    localHubIp, onUpdateLocalHubIp
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'scenes' | 'habits' | 'system' | 'smart_keys'>(initialTab);
  const [isPairing, setIsPairing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false); // NEW
  
  const [ipInput, setIpInput] = useState(localHubIp || '192.168.4.1');

  const handleSaveIp = () => {
      if (onUpdateLocalHubIp) {
          onUpdateLocalHubIp(ipInput);
          alert("تم حفظ عنوان IP الجديد. سيتم إعادة الاتصال...");
      }
  };
  
  const handlePairing = () => {
      if (onEnablePairing && isConnected) {
          onEnablePairing();
          setIsPairing(true);
          setTimeout(() => setIsPairing(false), 60000);
      } else {
          alert("لازم تكون متصل بالنظام عشان تشغل وضع الاقتران");
      }
  };

  const handleDeleteHabit = (deviceId: string, habitId: string) => {
      if (onUpdateDeviceHabits) {
          const device = devices.find(d => d.id === deviceId);
          if (device && device.habits) {
              const newHabits = device.habits.filter(h => h.id !== habitId);
              onUpdateDeviceHabits(deviceId, newHabits);
          }
      }
  };

  const handleResetSystem = () => {
      if (confirm("متأكد إنك عايز تمسح كل الإعدادات وترجع النظام زي ما كان؟")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  if (showOnboarding) {
      return (
          <OnboardingWizard 
              onComplete={() => setShowOnboarding(false)}
              onCancel={() => setShowOnboarding(false)}
          />
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" dir="rtl">
      <div className="w-full max-w-2xl bg-[#121215] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[85vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#1a1a20] border-b border-white/5">
           <div>
               <h2 className="text-xl font-black text-white">إعدادات النظام</h2>
               <p className="text-xs text-gray-500 font-bold mt-1">نسخة Nexus OS v2.1</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors hover:bg-white/10">
              <X size={20} />
           </button>
        </div>

        {/* TABS */}
        <div className="flex p-2 bg-[#0a0a0f] gap-1 overflow-x-auto no-scrollbar">
            {[
                { id: 'general', icon: SettingsIcon, label: 'عام' },
                { id: 'scenes', icon: Layers, label: 'الأوضاع' },
                { id: 'smart_keys', icon: Key, label: 'المفاتيح' },
                { id: 'habits', icon: CalendarClock, label: 'الجداول' },
                { id: 'system', icon: AlertTriangle, label: 'النظام' },
            ].map((tab) => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                        flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-[#252530] text-white shadow-md border border-white/5' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                    `}
                >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0e0e12]">
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    
                    {/* Connection Card */}
                    <div className={`p-5 rounded-2xl border flex items-center justify-between ${isConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {isConnected ? <Wifi size={24}/> : <WifiOff size={24}/>}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                    {isConnected ? 'متصل بالشبكة المحلية' : 'غير متصل'}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    حالة الاتصال بالسيرفر الداخلي (ESP32 Hub)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* NEW: ADD HUB WIZARD BUTTON */}
                    <div className="bg-[#1a1a20] rounded-2xl p-5 border border-white/5 space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                            <Router size={20} className="text-cyan-400" />
                            <h3 className="font-bold text-white text-lg">إعداد Hub جديد</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                            لو لسه شاري البوردة جديد، استخدم المعالج ده عشان تربطها بالواي فاي.
                        </p>
                        <button 
                            onClick={() => setShowOnboarding(true)}
                            className="w-full py-3 bg-cyan-900/20 hover:bg-cyan-900/30 border border-cyan-500/20 rounded-xl text-cyan-400 font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Wifi size={18} />
                            بدء إعداد الاتصال (Onboarding)
                        </button>
                    </div>

                    {/* LOCAL HUB IP CONFIG */}
                    {!isOnlineMode && (
                        <div className="bg-[#1a1a20] rounded-2xl p-5 border border-white/5 space-y-3">
                            <div className="flex items-center gap-3 mb-2">
                                <SettingsIcon size={20} className="text-gray-400" />
                                <h3 className="font-bold text-white text-lg">إعدادات الاتصال المحلي</h3>
                            </div>
                            <p className="text-xs text-gray-500">
                                أدخل عنوان IP الخاص بـ ESP32 (الافتراضي 192.168.4.1)
                            </p>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={ipInput}
                                    onChange={(e) => setIpInput(e.target.value)}
                                    placeholder="192.168.4.1"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-left ltr"
                                    dir="ltr"
                                />
                                <button 
                                    onClick={handleSaveIp}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-xl font-bold transition-colors"
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Online Mode Toggle */}
                    <div className="bg-[#1a1a20] rounded-2xl p-5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnlineMode ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {isOnlineMode ? <Cloud size={24}/> : <CloudOff size={24}/>}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">المزامنة السحابية</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    {isOnlineMode ? 'البيانات بتترفع على السيرفر (DB Sync)' : 'شغالين محلي (Offline Mode)'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onToggleOnlineMode && onToggleOnlineMode(!isOnlineMode)}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isOnlineMode ? 'bg-blue-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${isOnlineMode ? '-translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Pairing Button */}
                    <button 
                        onClick={handlePairing}
                        disabled={isPairing || !isConnected}
                        className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${isPairing ? 'bg-green-900/10 border-green-500/50' : 'bg-[#1a1a20] border-white/5 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                                <Zap size={24} className={isPairing ? "animate-spin" : ""} />
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-white text-lg">{isPairing ? 'جاري البحث عن أجهزة...' : 'إضافة جهاز جديد'}</span>
                                <span className="block text-xs text-gray-500 mt-1">اضغط هنا لو اشتريت فيشة أو لمبة ذكية جديدة</span>
                            </div>
                        </div>
                        {isPairing && <span className="text-xs font-bold text-green-500 animate-pulse">جاري الاقتران</span>}
                    </button>

                </div>
            )}

            {/* --- SCENES TAB --- */}
            {activeTab === 'scenes' && (
                <div className="space-y-6">
                    
                    <button 
                        onClick={() => {
                            onClose(); // Close settings to show scene editor
                            onAddSceneClick();
                        }}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        إنشاء وضع جديد (Advanced)
                    </button>

                    {/* Scenes List */}
                    <div className="space-y-3">
                        {scenes.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">مفيش أوضاع محفوظة لسه.</p>
                        ) : (
                            scenes.map((scene) => (
                                <div key={scene.id} className="bg-[#1a1a20] border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: scene.color }}>
                                            {scene.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{scene.name}</h4>
                                            <p className="text-xs text-gray-500">{Object.keys(scene.targets).length} أجهزة مربوطة</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onDeleteScene(scene.id)}
                                        className="w-10 h-10 rounded-full hover:bg-red-500/20 text-gray-500 hover:text-red-500 flex items-center justify-center transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- SMART KEYS TAB (NEW) --- */}
            {activeTab === 'smart_keys' && (
                <SmartKeysManager 
                    mappings={freeKeyMappings}
                    devices={devices}
                    scenes={scenes}
                    onUpdateMapping={onUpdateFreeKeyMapping!}
                    onDeleteMapping={onDeleteFreeKeyMapping!}
                />
            )}

            {/* --- HABITS TAB --- */}
            {activeTab === 'habits' && (
                <div className="space-y-4">
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-200 leading-relaxed mb-6">
                        <strong className="block mb-1 text-blue-400">💡 معلومة:</strong>
                        المواعيد دي بتتنفذ تلقائياً كل يوم طالما التابلت شغال. لو عايز تضيف ميعاد جديد، اضغط مطولاً على أي جهاز في الشاشة الرئيسية.
                    </div>

                    {devices.some(d => d.habits && d.habits.length > 0) ? (
                        <div className="space-y-3">
                            {devices.map(dev => (
                                dev.habits?.map(habit => (
                                    <div key={habit.id} className="bg-[#1a1a20] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                                                <span className="text-lg font-mono font-bold text-cyan-400">{habit.time}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                                    {dev.name}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${habit.action === 'ON' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {habit.action === 'ON' ? 'تشغيل' : 'إيقاف'}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">كل يوم</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteHabit(dev.id, habit.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                ))
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 flex flex-col items-center">
                            <CalendarClock size={48} className="text-gray-700 mb-4" />
                            <p className="text-gray-500 font-bold">مفيش جداول زمنية</p>
                            <p className="text-gray-600 text-xs mt-2 max-w-xs">
                                دوس ضغطة طويلة (Long Press) على أي جهاز في الصفحة الرئيسية عشان تضبط له ميعاد.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
                <div className="space-y-6">
                    <div className="bg-[#1a1a20] rounded-2xl p-5 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-gray-400 text-sm">إصدار النظام</span>
                            <span className="text-white font-mono text-sm">Nexus Core 2.1.0</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-gray-400 text-sm">عنوان IP</span>
                            <span className="text-white font-mono text-sm">192.168.1.105</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">وقت التشغيل</span>
                            <span className="text-white font-mono text-sm">03:45:12</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full py-4 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            إعادة تحميل الواجهة
                        </button>
                        
                        <button 
                            onClick={handleResetSystem}
                            className="w-full py-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <AlertTriangle size={18} />
                            فرمتة النظام (Reset Factory)
                        </button>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
