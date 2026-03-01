import React, { useEffect, useState, useMemo } from 'react';
import { Device } from '../types';
import { Zap, Wallet, TrendingUp, AlertCircle } from 'lucide-react';

interface StatsPageProps {
  devices: Device[];
}

const StatsPage: React.FC<StatsPageProps> = ({ devices }) => {
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // --- CALCULATION LOGIC (Simplified for Egypt 2024/2025) ---
  const { totalWatts, totalCost, deviceStats } = useMemo(() => {
    let currentWatts = 0;
    let accumulatedKwh = 0;

    const stats = devices.map(d => {
      // 1. Live Power
      const realWatts = Number(d.watts) || 0;
      if (d.isOn) currentWatts += realWatts;

      // 2. Historical
      let totalSeconds = Number(d.usageSeconds) || 0;
      if (d.isOn && d.lastStartTime) {
        totalSeconds += Math.max(0, (now - Number(d.lastStartTime)) / 1000);
      }

      // Fallbacks if watts are 0
      let ratedWatts = realWatts;
      if (ratedWatts === 0) {
         if (d.type === 'ac') ratedWatts = 1200;
         else if (d.type === 'light') ratedWatts = 15;
         else if (d.type === 'fridge') ratedWatts = 150;
         else ratedWatts = 60;
      }

      const deviceKwh = (ratedWatts * totalSeconds) / 3600000;
      accumulatedKwh += deviceKwh;

      return { ...d, calculatedKwh: deviceKwh };
    });

    // Simple Tiered Calc (Average ~1.5 EGP for simplicity in display, or detailed logic)
    // Let's use a dynamic average based on volume to keep it readable.
    let bill = 0;
    if (accumulatedKwh < 50) bill = accumulatedKwh * 0.68;
    else if (accumulatedKwh < 100) bill = accumulatedKwh * 0.78;
    else if (accumulatedKwh < 200) bill = accumulatedKwh * 0.95;
    else if (accumulatedKwh < 650) bill = accumulatedKwh * 1.55;
    else bill = accumulatedKwh * 2.23;

    return { 
      totalWatts: currentWatts, 
      totalCost: bill,
      deviceStats: stats.sort((a, b) => b.calculatedKwh - a.calculatedKwh)
    };
  }, [devices, now]);

  return (
    <div className="h-full flex flex-col gap-6 font-sans select-none pb-24 px-2" dir="rtl">
        
        {/* HEADER */}
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">فاتورة الكهرباء</h2>
            <p className="text-gray-400 text-sm">متابعة الاستهلاك لحظة بلحظة</p>
        </div>

        {/* 1. HERO CARD (BILL) */}
        <div className="bg-gradient-to-br from-[#1a1a20] to-black border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/10 rounded-full blur-[50px]"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-gray-400 text-sm font-bold mb-2 flex items-center gap-2">
                        <Wallet size={18} className="text-green-500"/>
                        التكلفة التقريبية
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white tracking-tighter">
                            {totalCost < 1 ? totalCost.toFixed(2) : Math.floor(totalCost)}
                        </span>
                        <span className="text-xl font-bold text-green-500">ج.م</span>
                    </div>
                </div>
                <div className="text-left">
                     <p className="text-gray-400 text-xs font-bold mb-1">الحمل الحالي</p>
                     <p className="text-xl font-mono font-bold text-cyan-400">{totalWatts} <span className="text-xs">وات</span></p>
                </div>
            </div>

            {/* Progress Bar for Tiers */}
            <div className="mt-6">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-bold">
                    <span>استهلاك بسيط</span>
                    <span>استهلاك عالي</span>
                </div>
                <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-l from-green-500 via-yellow-500 to-red-500 transition-all duration-1000" 
                        style={{ width: `${Math.min((totalCost / 500) * 100, 100)}%` }}
                    ></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={10} />
                    يتم تصفير العداد أول كل شهر تلقائياً
                </p>
            </div>
        </div>

        {/* 2. DEVICE BREAKDOWN */}
        <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                <TrendingUp size={16} />
                الأكثر استهلاكاً الآن
            </h3>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pl-1">
                {deviceStats.map((d, i) => (
                    <div key={d.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                                #{i + 1}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">{d.name}</h4>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    {d.isOn ? `شغال و بيسحب ${d.watts} وات` : 'مقفول حالياً'}
                                </p>
                            </div>
                        </div>
                        <div className="text-left">
                            <span className="block text-sm font-bold text-white">{d.calculatedKwh.toFixed(1)} ك.و</span>
                            <span className="block text-[10px] text-gray-500">~ {(d.calculatedKwh * 1.5).toFixed(1)} جنيه</span>
                        </div>
                    </div>
                ))}
                
                {deviceStats.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        مفيش أجهزة شغالة لسه
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default React.memo(StatsPage);