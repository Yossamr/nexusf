import React, { useState } from 'react';
import { Wifi, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

interface OnboardingWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('ssid', ssid);
            formData.append('pass', password);

            // Using fetch to post to the ESP32 setup IP
            const response = await fetch('http://192.168.4.1/save', {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Important for local network requests often
            });

            // Since 'no-cors' returns an opaque response, we assume success if no network error
            setStep(3);
            setTimeout(() => {
                onComplete();
            }, 5000); // Give user time to read success message

        } catch (err) {
            console.error("Setup Error", err);
            setError("فشل الاتصال بالبوردة. تأكد أنك متصل بشبكة 'Nexus_Setup'");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" dir="rtl">
            <div className="w-full max-w-md bg-[#1a1a20] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wifi className="text-cyan-400" />
                        إعداد Hub جديد
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">خطوات ربط البوردة بشبكة الواي فاي المنزلية</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 items-start">
                                <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                                <p className="text-sm text-yellow-200">
                                    يرجى الذهاب لإعدادات الواي فاي في هاتفك والاتصال بشبكة: <br/>
                                    <span className="font-mono font-bold text-white block mt-1">Nexus_Setup</span>
                                </p>
                            </div>
                            
                            <div className="flex justify-center py-4">
                                <div className="w-16 h-16 rounded-full bg-cyan-500/20 animate-pulse flex items-center justify-center">
                                    <Wifi size={32} className="text-cyan-400" />
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2"
                            >
                                تم الاتصال، التالي
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold">اسم الشبكة (SSID)</label>
                                <input 
                                    type="text" 
                                    value={ssid}
                                    onChange={(e) => setSsid(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="اسم الواي فاي بتاعك"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 font-bold">كلمة المرور</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="الباسورد"
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                    {error}
                                </p>
                            )}

                            <button 
                                onClick={handleConnect}
                                disabled={!ssid || !password || isSubmitting}
                                className={`w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${
                                    !ssid || !password || isSubmitting 
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-500'
                                }`}
                            >
                                {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإعادة التشغيل'}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-8 space-y-4">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-400 mb-4">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-white">تم الحفظ بنجاح!</h3>
                            <p className="text-sm text-gray-400">
                                البوردة هتعمل ريستارت دلوقتي وتتصل بالشبكة بتاعتك. <br/>
                                ارجع اتصل بالواي فاي الأصلي بتاعك عشان تتحكم فيها.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex justify-center">
                    <button 
                        onClick={onCancel}
                        className="text-xs text-gray-500 hover:text-white transition-colors"
                    >
                        إلغاء الأمر
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
