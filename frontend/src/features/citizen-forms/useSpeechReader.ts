import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesizeSpeech } from '../../api/client';
import { normalizeTextForTts } from '../../utils/ttsTextNormalizer';

export function useSpeechReader() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  const stopSpeech = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch {}
      currentAudioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('speechSynthesis cancel warning:', err);
      }
    }
    currentUtteranceRef.current = null;
    setSpeakingId(null);
  }, []);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  const fallbackWebSpeech = useCallback((clean: string, id: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingId(null);
      return;
    }
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
        if (viVoice) utterance.voice = viVoice;

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };
        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };

        currentUtteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis error:', err);
        setSpeakingId(null);
      }
    }, 50);
  }, []);

  const startSpeech = useCallback(
    (text: string, id: string) => {
      stopSpeech();
      const clean = normalizeTextForTts(text);
      if (!clean) return;

      setSpeakingId(id);
      synthesizeSpeech(clean)
        .then((blob) => {
          const audioUrl = URL.createObjectURL(blob);
          currentAudioUrlRef.current = audioUrl;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => stopSpeech();
          audio.onerror = () => {
            console.warn('Audio playback error, falling back to Web Speech API');
            stopSpeech();
            fallbackWebSpeech(clean, id);
          };

          audio.play().catch((err) => {
            console.warn('Audio play() rejected:', err);
            stopSpeech();
            fallbackWebSpeech(clean, id);
          });
        })
        .catch((err) => {
          console.info('Sidecar TTS unavailable, falling back to browser Web Speech API:', err);
          fallbackWebSpeech(clean, id);
        });
    },
    [stopSpeech, fallbackWebSpeech]
  );

  const toggleSpeech = useCallback(
    (text: string, id: string) => {
      if (speakingId === id) {
        stopSpeech();
      } else {
        startSpeech(text, id);
      }
    },
    [speakingId, stopSpeech, startSpeech]
  );

  return { speakingId, toggleSpeech, stopSpeech };
}
