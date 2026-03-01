
import React, { useMemo } from 'react';
import { Device, TimerConfig, Habit, FreeKeyMapping, SystemBillingStats } from '../types';
import { 
  Zap, Power, Thermometer, Fan, Lightbulb, Tv, 
  Plug, Router, WashingMachine, Refrigerator, Flame, 
  Clock, Calendar, Plus, Settings, WifiOff,
  DollarSign, TrendingUp, History, ShieldCheck, CloudSun, MapPin, Wind, Grid, ThermometerSnowflake
} from 'lucide-react';
import { getDeviceIcon } from '../utils/deviceParser';

interface DashboardProps {
  devices: Device[];
  billingStats: SystemBillingStats; // NEW
  onToggle: (id: string) => void;
  onLongPress: (id: string) => void;
  onDeviceClick: (id: string) => void; // For opening modal details
  onFreeKeyPress: (mac: string, keyIndex: number) => void;
}

// --- BILLING HELPER (DUPLICATED FOR UI DISPLAY) ---
const calculateEgyptianBill = (kwh: number): string => {
  let cost = 0;
  let serviceFee = 0;

  if (kwh <= 100) {
    if (kwh <= 50) {
      cost = kwh * 0.68; 
      serviceFee = 1;
    } else {
      cost = (50 * 0.68) + ((kwh - 50) * 0.78); 
      serviceFee = 2;
    }
  } else if (kwh <= 650) {
    if (kwh <= 200) {
      cost = kwh * 0.95; 
      serviceFee = 6;
    } else if (kwh <= 350) {
      cost = (200 * 0.95) + ((kwh - 200) * 1.55); 
      serviceFee = 11;
    } else {
      cost = (200 * 0.95) + (150 * 1.55) + ((kwh - 350) * 1.95); 
      serviceFee = 15;
    }
  } else if (kwh <= 1000) {
    cost = kwh * 2.10;
    serviceFee = 25;
  } else {
    cost = kwh * 2.23;
    serviceFee = 40;
  }
  return (cost + serviceFee).toFixed(2);
};

// --- TIER HELPER ---
const getEgyptianTier = (kwh: number): string => {
  if (kwh <= 50) return "الشريحة الأولى";
  if (kwh <= 100) return "الشريحة الثانية";
  if (kwh <= 200) return "الشريحة الثالثة";
  if (kwh <= 350) return "الشريحة الرابعة";
  if (kwh <= 650) return "الشريحة الخامسة";
  if (kwh <= 1000) return "الشريحة السادسة";
  return "الشريحة السابعة";
};

// --- WEATHER WIDGET (NEW) ---
const WeatherWidget = () => {
    return (
        <div className="w-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-[2rem] p-6 mb-8 relative overflow-hidden backdrop-blur-md shadow-2xl">
            {/* Background Decorations */}
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-yellow-500/20 rounded-full blur-[40px]"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-blue-500/20 rounded-full blur-[40px]"></div>
            
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2 text-gray-300 text-xs font-bold mb-1">
                        <MapPin size={12} className="text-cyan-400" />
                        القاهرة، مصر
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white tracking-tighter">28°</span>
                        <span className="text-lg text-gray-400">صافي</span>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1"><Wind size={12}/> 12 km/h</span>
                        <span className="flex items-center gap-1"><CloudSun size={12}/> UV Low</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-center">
                    <CloudSun size={64} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    <span className="text-xs font-bold text-white mt-2 bg-white/10 px-3 py-1 rounded-full">الجو رايق</span>
                </div>
            </div>
        </div>
    );
};

// --- ICON MAPPING ---
// const getDeviceIcon = ... (Moved to utils/deviceParser)

// --- STATUS CHIP COMPONENT (TOP BAR) ---
const QuickStatus = ({ icon: Icon, label, value, color }: any) => (
  <div className="glass-panel rounded-2xl p-3 flex items-center gap-3 min-w-[130px] flex-1 border border-white/5 bg-white/5 backdrop-blur-sm">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} bg-opacity-20`}>
          <Icon size={16} className="text-white" />
      </div>
      <div>
          <p className="text-[10px] text-gray-400 font-bold">{label}</p>
          <p className="text-sm font-bold text-white">{value}</p>
      </div>
  </div>
);

// --- DEVICE CARD (SINGLE) ---
const DeviceCard = React.memo(({ device, onToggle, onLongPress, onDeviceClick, onFreeKeyPress }: { 
    device: Device, 
    onToggle: (id: string) => void, 
    onLongPress: (id: string) => void,
    onDeviceClick: (id: string) => void,
    onFreeKeyPress: (mac: string, keyIndex: number) => void
}) => {
  const Icon = getDeviceIcon(device.type);
  const isActive = device.isOn;
  
  const vibrate = (pattern: number | number[]) => {
      if (navigator.vibrate) navigator.vibrate(pattern);
  };

  // --- REMOTE CARD LOGIC ---
  if (device.numberOfButtons && device.numberOfButtons > 0) {
      return (
        <div className="device-card relative rounded-[2rem] p-4 aspect-[1/1] bg-[#18181b]/60 backdrop-blur-md border border-white/5 flex flex-col gap-2 overflow-hidden">
            <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-gray-400 truncate max-w-[80%]">{device.name}</span>
                <div className="w-2 h-2 rounded-full bg-white/10"></div>
            </div>
            <div className={`flex-1 grid gap-2 ${device.numberOfButtons > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {Array.from({ length: device.numberOfButtons }).map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation();
                            vibrate(50);
                            onFreeKeyPress(device.id, i + 1);
                        }}
                        className="bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl flex items-center justify-center border border-white/5 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity"></div>
                        <span className="text-xs font-bold text-gray-300 relative z-10">BTN {i + 1}</span>
                    </button>
                ))}
            </div>
        </div>
      );
  }

  // --- STYLE LOGIC ---
  let activeClass = "bg-white text-black";
  if (device.type === 'light') activeClass = "bg-amber-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)] border-amber-300";
  if (device.type === 'ac') activeClass = "bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)] border-cyan-300";
  if (device.type === 'tv') activeClass = "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] border-purple-400";
  if (device.type === 'heater') activeClass = "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] border-red-400";
  
  const offClass = "bg-[#18181b]/60 backdrop-blur-md border border-white/5 hover:bg-[#18181b]/80";

  // --- OFFLINE OVERRIDE ---
  const isOffline = device.isOffline;
  const cardOpacity = isOffline ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100';

  return (
    <div 
        onClick={() => {
            if (isOffline) return;
            vibrate(50);
            onToggle(device.id);
        }}
        onContextMenu={(e) => {
            e.preventDefault();
            if (isOffline) return;
            vibrate(100);
            onLongPress(device.id);
        }}
        className={`
            device-card relative rounded-[2rem] p-5 aspect-[1/1] flex flex-col justify-between cursor-pointer select-none overflow-hidden transition-all duration-300
            ${isActive ? activeClass : offClass}
            ${isActive ? 'scale-[1.02]' : 'scale-100 active:scale-95'}
            ${cardOpacity}
        `}
    >
        {/* Header: Icon & Status */}
        <div className="flex justify-between items-start relative z-10">
            <div 
                className={`
                    w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                    ${isActive ? 'bg-black/10 text-black' : 'bg-white/5 text-gray-500'}
                `}
            >
                {isOffline ? <WifiOff size={22} className="text-red-500" /> : <Icon size={22} />}
            </div>
            
            {/* Optional: Status Dot or Text */}
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : (isActive ? 'bg-black' : 'bg-white/10')}`}></div>
        </div>

        {/* Footer: Name & Room */}
        <div className="mt-2 relative z-10">
            <h3 className={`text-sm font-bold leading-tight line-clamp-2 ${isActive ? 'text-black' : 'text-gray-300'}`} dir="rtl">
                {device.name}
            </h3>
            <p className={`text-[10px] font-bold mt-1 ${isActive ? 'text-black/60' : 'text-gray-500'}`}>
                {isOffline ? 'غير متصل' : device.room}
            </p>
        </div>
        
        {/* Background Glow for active state */}
        {isActive && !isOffline && (
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-[40px] pointer-events-none"></div>
        )}
    </div>
  );
}, (prev, next) => {
    return prev.device.isOn === next.device.isOn && 
           prev.device.name === next.device.name && 
           prev.device.room === next.device.room &&
           prev.device.isOffline === next.device.isOffline; // Added check
});


const Dashboard: React.FC<DashboardProps> = ({ devices, billingStats, onToggle, onLongPress, onDeviceClick, onFreeKeyPress }) => {
  
  // --- STATS SUMMARY ---
  const { lightsOn, acOn } = useMemo(() => {
      let l = 0;
      let a = 0;
      devices.forEach(d => {
          if (d.isOn && d.type === 'light') l++;
          if (d.isOn && d.type === 'ac') a++;
      });
      return { lightsOn: l, acOn: a };
  }, [devices]);

  const currentBill = useMemo(() => calculateEgyptianBill(billingStats.total_kwh_this_month), [billingStats.total_kwh_this_month]);
  const currentTier = useMemo(() => getEgyptianTier(billingStats.total_kwh_this_month), [billingStats.total_kwh_this_month]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-32">
      
      {/* 1. WEATHER WIDGET (NEW ADDITION) */}
      <WeatherWidget />

      {/* 1.5 BILLING WIDGET (NEW) */}
      <div className="mb-6 px-1">
          <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 rounded-[2rem] p-5 flex items-center justify-between relative overflow-hidden backdrop-blur-md">
              <div className="absolute inset-0 bg-emerald-500/5"></div>
              
              <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <DollarSign size={24} />
                  </div>
                  <div>
                      <p className="text-xs text-emerald-400 font-bold mb-0.5">فاتورة الشهر ده (تقديري)</p>
                      <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{currentBill}</span>
                          <span className="text-xs text-gray-400 font-bold">جنية</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                          استهلاك {billingStats.total_kwh_this_month.toFixed(1)} kWh
                      </p>
                  </div>
              </div>

              <div className="relative z-10 text-left flex flex-col items-end">
                  <div className="bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 mb-2">
                      <p className="text-[10px] font-bold text-emerald-300">{currentTier}</p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-[10px] font-bold mb-1 justify-end">
                      <History size={10} />
                      <span>الشهر اللي فات</span>
                  </div>
                  <p className="text-lg font-bold text-gray-300">{billingStats.last_bill_cost} <span className="text-xs">جنية</span></p>
              </div>
          </div>
      </div>

      {/* 2. STATUS HEADER */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 mb-6 px-1">
         <QuickStatus 
            icon={Lightbulb} 
            label="الإضاءة" 
            value={lightsOn > 0 ? `${lightsOn} منورين` : 'كله مطفي'} 
            color="bg-amber-500" 
         />
         <QuickStatus 
            icon={ThermometerSnowflake} 
            label="التكييف" 
            value={acOn > 0 ? `${acOn} شغالين` : 'مريحين'} 
            color="bg-blue-500" 
         />
         <QuickStatus 
            icon={ShieldCheck} 
            label="الأمان" 
            value="البيت أمان" 
            color="bg-green-500" 
         />
      </div>

      {/* 3. DEVICE GRID */}
      <div>
          <h2 className="text-xl font-bold text-white mb-4 px-1 flex items-center gap-2">
              كل الأجهزة
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">
                {devices.filter(d => d.relayCount !== 0).length}
              </span>
          </h2>
          
          {devices.filter(d => d.relayCount !== 0).length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/10 rounded-[2rem] bg-white/5">
                 <Grid size={40} className="text-gray-600 mb-4" />
                 <p className="text-gray-400 font-bold">لسه مفيش أجهزة</p>
                 <p className="text-xs text-gray-600 mt-1">دوس على الإعدادات فوق عشان تضيف</p>
             </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                  {devices
                    .filter(d => d.relayCount !== 0) // Hide pure free key devices (remotes)
                    .map(device => (
                      <DeviceCard 
                        key={device.id} 
                        device={device} 
                        onToggle={onToggle} 
                        onLongPress={onLongPress}
                        onDeviceClick={onDeviceClick}
                        onFreeKeyPress={onFreeKeyPress}
                      />
                  ))}
                  
                  {/* Add Device Placeholder */}
                  <div className="border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer aspect-square hover:bg-white/5 hover:border-white/20">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <Grid size={24} className="text-gray-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-500">جهاز جديد؟</span>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
