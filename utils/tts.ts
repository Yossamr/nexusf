// Service to handle Text-to-Speech integration (KittenTTS / Web Fallback)

export type TTSLanguage = 'ar' | 'en';

interface TTSConfig {
  endpoint?: string; // URL to your local KittenTTS server (e.g., http://localhost:5000/tts)
  useLocalModel: boolean; // If true, tries to call the API. If false, uses Browser API.
}

class TTSService {
  private lang: TTSLanguage = 'ar';
  private config: TTSConfig = {
    useLocalModel: false, // Default to browser until backend is ready
    endpoint: 'http://localhost:5000/api/tts'
  };

  setLanguage(lang: TTSLanguage) {
    this.lang = lang;
  }

  setEndpoint(url: string) {
    this.config.endpoint = url;
    this.config.useLocalModel = true;
  }

  async speak(text: string): Promise<void> {
    console.log(`🗣️ [Voice] Speaking (${this.lang}): ${text}`);

    if (this.config.useLocalModel && this.config.endpoint) {
      try {
        // 1. Try KittenTTS API
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, lang: this.lang })
        });

        if (!response.ok) throw new Error('TTS Server Error');

        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        await audio.play();
        return;

      } catch (e) {
        console.warn("⚠️ KittenTTS Unreachable, falling back to Web Speech API", e);
      }
    }

    // 2. Fallback: Web Speech API (Browser Native)
    this.speakNative(text);
  }

  private speakNative(text: string) {
    if (!('speechSynthesis' in window)) {
      console.error("Browser does not support TTS");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure Voice based on Language
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (this.lang === 'ar') {
      // Try to find an Arabic voice (Google Arabic, Maged, etc.)
      selectedVoice = voices.find(v => v.lang.includes('ar'));
      utterance.lang = 'ar-SA';
      utterance.pitch = 0.9; // Slightly deeper for authority
      utterance.rate = 0.9;  // Slightly slower
    } else {
      // English
      selectedVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));
      utterance.lang = 'en-US';
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
  }
}

export const tts = new TTSService();
