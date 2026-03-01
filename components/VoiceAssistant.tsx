
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Device, Scene } from '../types';
import { Mic, Sparkles, Send, X, Activity, Cpu, Zap, BrainCircuit, Globe } from 'lucide-react';
import { tts, TTSLanguage } from '../utils/tts';

interface VoiceAssistantProps {
  devices: Device[];
  scenes: Scene[];
  onToggleDevice: (id: string) => void;
  onApplyScene: (id: string) => void;
  onUpdateDeviceParams: (id: string, params: any) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    webkitAudioContext: any;
  }
}

const WAKE_WORDS = [
    'nexus', 'nxs', 'next', 'mix', 'texas', 
    'نكسس', 'نيكسس', 'نكزس', 'نيكزس', 'يا نكسس', 'يا عم', 'يا هندسة', 'سيستم', 'يا باشا'
];

// --- OFFLINE INTELLIGENCE ENGINE ---

class LocalBrain {
    // Advanced String Similarity (Dice Coefficient)
    static getSimilarity(str1: string, str2: string): number {
        const clean1 = str1.replace(/\s+/g, '');
        const clean2 = str2.replace(/\s+/g, '');
        
        if (clean1 === clean2) return 1.0;
        if (clean1.length < 2 || clean2.length < 2) return 0.0;

        const bigrams = (str: string) => {
            const s = str.toLowerCase();
            const v = new Array(s.length - 1);
            for (let i = 0; i < v.length; i++) v[i] = s.slice(i, i + 2);
            return v;
        };

        const b1 = bigrams(clean1);
        const b2 = bigrams(clean2);
        let intersection = 0;
        const b2Copy = [...b2];

        for (let i = 0; i < b1.length; i++) {
            for (let j = 0; j < b2Copy.length; j++) {
                if (b1[i] === b2Copy[j]) {
                    intersection++;
                    b2Copy.splice(j, 1);
                    break;
                }
            }
        }
        return (2.0 * intersection) / (b1.length + b2.length);
    }

    static normalizeArabic(text: string): string {
        return text
            .toLowerCase()
            .replace(/(آ|إ|أ)/g, 'ا')
            .replace(/(ة)/g, 'ه')
            .replace(/(ى)/g, 'ي')
            .replace(/(ؤ|ئ)/g, 'ء')
            .replace(/[^\w\s\u0600-\u06FF]/g, '') // Remove punctuation
            .trim();
    }

    static parseCommand(text: string, devices: Device[], scenes: Scene[], lang: TTSLanguage) {
        const normalized = this.normalizeArabic(text);
        
        // 1. INTENT DETECTION DICTIONARY (Egyptian Flavor + English)
        const intents = {
            ON: ['شغل', 'نور', 'افتح', 'ولع', 'دور', 'on', 'start', 'open', 'turn on', 'enable'],
            OFF: ['اطفي', 'اقفل', 'بطل', 'موت', 'off', 'stop', 'close', 'turn off', 'disable', 'kill'],
            SCENE: ['وضع', 'مود', 'نظام', 'جو', 'scene', 'mode', 'profile', 'activat'],
            SET: ['خلي', 'اضبط', 'ظبط', 'set', 'make', 'change', 'level'],
            QUERY: ['حاله', 'اخبار', 'وضع', 'status', 'state', 'what'],
            GREETING: ['ازيك', 'عامل ايه', 'صباح', 'مساء', 'hello', 'hi']
        };

        // Detect Primary Intent
        let intent = 'UNKNOWN';
        let actionKeyword = '';

        for (const [key, keywords] of Object.entries(intents)) {
            for (const kw of keywords) {
                if (normalized.includes(kw)) {
                    intent = key;
                    actionKeyword = kw;
                    break;
                }
            }
            if (intent !== 'UNKNOWN') break;
        }

        // Extract potential target name (remove action keyword)
        const targetPhrase = normalized.replace(actionKeyword, '').trim();

        // 2. ENTITY MATCHING (Devices & Scenes)
        let bestDevice: Device | null = null;
        let bestScene: Scene | null = null;
        let maxDeviceScore = 0;
        let maxSceneScore = 0;

        // Threshold for fuzzy match confidence
        const THRESHOLD = 0.35; 

        // Find Best Device
        devices.forEach(d => {
            const score = Math.max(
                this.getSimilarity(targetPhrase, this.normalizeArabic(d.name)),
                this.getSimilarity(normalized, this.normalizeArabic(d.name)) // Try full sentence too
            );
            
            // Boost score if exact type is mentioned
            let typeBoost = 0;
            if (normalized.includes('تكييف') && d.type === 'ac') typeBoost = 0.2;
            if (normalized.includes('لمبة') && d.type === 'light') typeBoost = 0.2;
            if (normalized.includes('مروحة') && d.type === 'fan') typeBoost = 0.2;

            const finalScore = score + typeBoost;

            if (finalScore > maxDeviceScore) {
                maxDeviceScore = finalScore;
                bestDevice = d;
            }
        });

        // Find Best Scene
        scenes.forEach(s => {
            const score = Math.max(
                this.getSimilarity(targetPhrase, this.normalizeArabic(s.name)),
                this.getSimilarity(normalized, this.normalizeArabic(s.name))
            );
            if (score > maxSceneScore) {
                maxSceneScore = score;
                bestScene = s;
            }
        });

        // 3. PARAMETER EXTRACTION (Numbers for Temp/Timer)
        const numberMatch = normalized.match(/\d+/);
        const numericValue = numberMatch ? parseInt(numberMatch[0]) : null;

        // 4. FINAL DECISION LOGIC
        
        // Priority to Scene if explicitly mentioned or score is very high
        if (intent === 'SCENE' && bestScene && maxSceneScore > THRESHOLD) {
            return { type: 'ACTIVATE_SCENE', target: bestScene };
        }
        
        // Implicit Scene (e.g., "I'm going to sleep" -> Sleep Mode)
        if (normalized.includes('نوم') || normalized.includes('sleep')) {
             const sleepScene = scenes.find(s => s.name.includes('نوم') || s.name.includes('Sleep'));
             if (sleepScene) return { type: 'ACTIVATE_SCENE', target: sleepScene };
        }

        // Device Control
        if ((intent === 'ON' || intent === 'OFF' || intent === 'SET') && bestDevice && maxDeviceScore > THRESHOLD) {
            return { 
                type: 'CONTROL_DEVICE', 
                target: bestDevice, 
                action: intent === 'SET' ? 'SET' : intent,
                value: numericValue 
            };
        }

        // Chitchat
        if (intent === 'GREETING') {
            return { type: 'CHITCHAT', response: lang === 'ar' ? 'أهلاً يا ريس، كلي آذان صاغية!' : 'Hello boss, I am all ears!' };
        }

        // Fallback: If we have a decent device match but no clear intent, assume TOGGLE or infer from context
        if (bestDevice && maxDeviceScore > 0.6) {
             return { type: 'CONTROL_DEVICE', target: bestDevice, action: 'TOGGLE' };
        }

        return { type: 'UNKNOWN', bestGuess: (bestDevice as Device | null)?.name };
    }
}


const VoiceAssistant: React.FC<VoiceAssistantProps> = React.memo(({ 
  devices, 
  scenes, 
  onToggleDevice, 
  onApplyScene, 
  onUpdateDeviceParams 
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [language, setLanguage] = useState<TTSLanguage>('ar'); // Default Arabic
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const restartTimer = useRef<any>(null);
  const silenceTimer = useRef<any>(null);

  // Auto scroll chat
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update TTS Service Language
  useEffect(() => {
      tts.setLanguage(language);
  }, [language]);

  // --- TTS ---
  const speak = async (text: string) => {
      setState('speaking');
      await tts.speak(text);
      if (isOpen) setState('idle');
  };

  const playSound = (type: 'wake' | 'success' | 'fail' | 'thinking') => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'wake') {
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'thinking') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.linearRampToValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.02, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'success') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      }
  };

  // --- LOCAL LOGIC PROCESSOR ---
  const processWithLocalBrain = async (userPrompt: string) => {
    setState('processing');
    playSound('thinking');

    // Simulate a tiny "thinking" delay for realism (optional, improves UX feel)
    await new Promise(r => setTimeout(r, 400));

    const decision = LocalBrain.parseCommand(userPrompt, devices, scenes, language);
    let responseText = "";

    console.log("🧠 Brain Decision:", decision);

    const isAr = language === 'ar';

    switch (decision.type) {
        case 'CONTROL_DEVICE': {
            const device = decision.target as any as Device;
            const action = decision.action;
            const value = decision.value;

            if (action === 'ON' || (action === 'TOGGLE' && !device.isOn)) {
                if (!device.isOn) {
                    onToggleDevice(device.id);
                    responseText = isAr ? `تمام، شغلتلك ${device.name}` : `OK, turned on ${device.name}`;
                } else {
                    responseText = isAr ? `${device.name} شغال أصلاً يا هندسة` : `${device.name} is already on, boss`;
                }
            } 
            else if (action === 'OFF' || (action === 'TOGGLE' && device.isOn)) {
                if (device.isOn) {
                    onToggleDevice(device.id);
                    responseText = isAr ? `تمام، طفيت ${device.name}` : `OK, turned off ${device.name}`;
                } else {
                    responseText = isAr ? `${device.name} مطفي أصلاً` : `${device.name} is already off`;
                }
            }
            else if (action === 'SET' && value !== null) {
                // If device is AC, Heater, etc.
                if (device.type === 'ac') {
                    onUpdateDeviceParams(device.id, { temperature: value });
                    if (!device.isOn) onToggleDevice(device.id); // Auto turn on
                    responseText = isAr ? `ظبطت ${device.name} على ${value} درجة` : `Set ${device.name} to ${value} degrees`;
                } else {
                    responseText = isAr ? `معلش، مش هعرف أغير درجة ${device.name}` : `Sorry, I can't set the level for ${device.name}`;
                }
            } else {
                responseText = isAr ? `فهمت إنك عايز تتحكم في ${device.name}، بس مش متأكد أعمل ايه بالضبط.` : `I understand you want to control ${device.name}, but I'm not sure what to do.`;
            }
            break;
        }
        case 'ACTIVATE_SCENE': {
            const scene = decision.target as Scene;
            onApplyScene(scene.id);
            responseText = isAr ? `من عنيا، فعلت وضع ${scene.name}` : `Sure thing, activated ${scene.name} scene`;
            break;
        }
        case 'CHITCHAT': {
            responseText = decision.response || (isAr ? "أهلاً بيك!" : "Hello there!");
            break;
        }
        case 'UNKNOWN': {
            if (decision.bestGuess) {
                responseText = isAr ? `قصدك على ${decision.bestGuess}؟ معلش قول الأمر تاني بوضوح.` : `Did you mean ${decision.bestGuess}? Please say it again clearly.`;
            } else {
                responseText = isAr ? "معلش مسمعتش كويس، ممكن تعيد؟" : "Sorry, I didn't catch that. Could you repeat?";
            }
            playSound('fail');
            break;
        }
    }

    setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    if (decision.type !== 'UNKNOWN') playSound('success');
    speak(responseText);
  };

  // --- STT ENGINE ---
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e){}

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-EG'; 

    recognition.onstart = () => {
        setIsWakeWordListening(true);
        if (restartTimer.current) clearTimeout(restartTimer.current);
    };

    recognition.onend = () => {
        setIsWakeWordListening(false);
        // Only restart if not currently processing or speaking
        if (state === 'idle' || state === 'listening') {
             restartTimer.current = setTimeout(() => {
                try { recognition.start(); } catch(e){}
            }, 200);
        }
    };

    recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        const nTranscript = LocalBrain.normalizeArabic(transcript);
        const isFinal = lastResult.isFinal;

        // Wake Word Detection
        const detectedWakeWord = WAKE_WORDS.find(w => nTranscript.includes(w));
        
        if (detectedWakeWord && !isOpen) {
            if (!isFinal) {
                setIsOpen(true);
                playSound('wake');
                setState('listening');
            }
        } 
        
        if (isOpen) {
            setInputText(transcript);
            
            if (isFinal) {
                // Remove wake word from the prompt
                let cleanPrompt = transcript;
                if (detectedWakeWord) {
                     cleanPrompt = transcript.replace(new RegExp(detectedWakeWord, 'i'), '').trim();
                }

                if (cleanPrompt.length > 2) {
                    setMessages(prev => [...prev, { role: 'user', text: cleanPrompt }]);
                    // Use Local Brain instead of Cloud
                    processWithLocalBrain(cleanPrompt);
                }
            }

            if (silenceTimer.current) clearTimeout(silenceTimer.current);
            silenceTimer.current = setTimeout(() => {
                if (isOpen && state === 'listening') setIsOpen(false);
            }, 6000);
        }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isOpen, state, devices, scenes]);

  useEffect(() => {
      const t = setTimeout(startListening, 1000);
      return () => {
          clearTimeout(t);
          if (recognitionRef.current) recognitionRef.current.stop();
          if (restartTimer.current) clearTimeout(restartTimer.current);
      };
  }, [startListening]);

  // --- UI HANDLERS ---
  const toggleOpen = () => {
      if (isOpen) {
          setIsOpen(false);
          setState('idle');
      } else {
          setIsOpen(true);
          playSound('wake');
          setMessages([{ role: 'ai', text: "أؤمرني يا هندسة..." }]);
          setState('listening');
      }
  };

  const handleSend = () => {
      if (inputText.trim()) {
          setMessages(prev => [...prev, { role: 'user', text: inputText }]);
          processWithLocalBrain(inputText);
          setInputText('');
      }
  };

  return (
    <>
        {/* Trigger Button */}
        {!isOpen && (
            <button 
                onClick={toggleOpen}
                className={`
                    fixed bottom-36 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center 
                    shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-95 transition-all duration-300
                    ${isWakeWordListening ? 'bg-gradient-to-br from-cyan-600 to-blue-700' : 'bg-gray-700'}
                `}
            >
                {isWakeWordListening && <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-20 animate-ping"></div>}
                <Mic size={28} className="text-white relative z-10" />
            </button>
        )}

        {/* Assistant Overlay */}
        <div className={`fixed inset-0 z-[200] flex flex-col justify-end transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsOpen(false)}></div>

            <div className={`relative z-10 w-full max-w-2xl mx-auto h-[85vh] bg-[#121215] rounded-t-[3rem] border-t border-white/10 shadow-2xl flex flex-col overflow-hidden transition-transform duration-500 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1a1a20]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            {state === 'processing' ? <Cpu size={20} className="text-white animate-spin" /> : <BrainCircuit size={20} className="text-white" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">المساعد الذكي</h2>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                                <Zap size={10} className="text-yellow-500 fill-yellow-500"/> 
                                KittenTTS Integration v1.0
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition-all"
                        >
                            <Globe size={12} />
                            {language === 'ar' ? 'العربية' : 'English'}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"></div>
                    
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-4 duration-300`}>
                            <div className={`
                                max-w-[85%] px-5 py-3.5 rounded-2xl text-sm font-bold leading-loose shadow-lg
                                ${msg.role === 'user' 
                                    ? 'bg-[#252530] text-gray-200 rounded-br-none border border-white/5' 
                                    : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-bl-none border border-white/10'}
                            `}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    
                    {state === 'processing' && (
                        <div className="flex justify-end animate-in fade-in">
                            <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/20 px-5 py-3 rounded-2xl rounded-bl-none">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-[#0e0e12] border-t border-white/10">
                    <div className="flex items-center gap-2 bg-[#1a1a20] rounded-[2rem] p-2 border border-white/5 focus-within:border-cyan-500/50 transition-colors shadow-inner">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${state === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                            {state === 'speaking' ? <Activity size={20} className="animate-bounce" /> : <Mic size={20} />}
                        </div>
                        
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={language === 'ar' ? "اكتب أو قول أمرك..." : "Type or say command..."}
                            className="flex-1 bg-transparent text-white placeholder-gray-600 text-right px-2 outline-none font-bold text-sm h-full"
                            dir={language === 'ar' ? "rtl" : "ltr"}
                        />

                        <button 
                            onClick={handleSend}
                            disabled={!inputText.trim() || state === 'processing'}
                            className="w-12 h-12 rounded-full bg-cyan-600 disabled:bg-gray-700 text-white flex items-center justify-center hover:bg-cyan-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Send size={18} className={`rotate-180 ${inputText.trim() ? '' : 'opacity-50'}`} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </>
  );
});

export default VoiceAssistant;
