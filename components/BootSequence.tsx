import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, ShieldCheck, Wifi, Cpu } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const totalSteps = 4;
    const stepDuration = 800; // ms per step

    const interval = setInterval(() => {
        setStep(prev => {
            if (prev >= totalSteps) {
                clearInterval(interval);
                return prev;
            }
            return prev + 1;
        });
    }, stepDuration);

    const completionTimeout = setTimeout(onComplete, (totalSteps + 1) * stepDuration);

    return () => {
        clearInterval(interval);
        clearTimeout(completionTimeout);
    };
  }, [onComplete]);

  const steps = [
      { text: "جاري تحميل النظام...", icon: Cpu },
      { text: "فحص وحدات الاتصال...", icon: Wifi },
      { text: "تأمين الشبكة...", icon: ShieldCheck },
      { text: "تحميل الإعدادات الشخصية...", icon: Zap },
      { text: "أهلاً بك في بيتك", icon: Sparkles },
  ];

  const currentStep = steps[Math.min(step, steps.length - 1)];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-sans overflow-hidden" dir="rtl">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
      
      <div className="relative z-10 flex flex-col items-center">
          
          {/* Logo / Glowing Orb */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-12">
              {/* Outer Glow Rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[spin_3s_linear_infinite]"></div>
              <div className="absolute inset-3 rounded-full border border-blue-500/20 animate-[spin_4s_linear_infinite_reverse]"></div>
              
              {/* Core Glow */}
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>

              {/* Central Icon */}
              <div className="relative z-10 text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-500 transform scale-100">
                  <Icon size={40} className="animate-in zoom-in duration-300" key={step} />
              </div>
          </div>

          {/* Text Status */}
          <div className="h-20 flex flex-col items-center justify-start gap-3">
              <h2 className="text-2xl font-bold text-white tracking-wide animate-in slide-in-from-bottom-2 fade-in duration-300 key={step}">
                  {currentStep.text}
              </h2>
              
              {/* Progress Dots */}
              <div className="flex gap-2 mt-1">
                  {[0, 1, 2, 3].map(i => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-6 bg-cyan-500 shadow-[0_0_8px_cyan]' : 'w-1.5 bg-gray-800'}`}
                      />
                  ))}
              </div>
          </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-12 flex flex-col items-center opacity-40">
          <p className="text-[10px] text-gray-400 font-mono tracking-[0.3em] uppercase">Nexus OS v2.1</p>
      </div>
    </div>
  );
};

export default BootSequence;