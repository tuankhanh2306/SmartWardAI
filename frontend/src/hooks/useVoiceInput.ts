import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Normalizes voice transcripts for Vietnamese civic administration queries.
 * Converts spoken phonetic pronunciations of codes and numbers to official acronyms.
 * E.g.: "xê tê không một" -> "CT01", "vê nê ai đi" -> "VNeID", "u b e n đ ê" -> "UBND"
 */
export function normalizeVoiceTranscript(text: string): string {
  if (!text) return '';
  return text
    // 1. Normalize administrative agencies and civic apps
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])u\s*b\s*e\s*n\s*đ\s*ê(?![a-zA-ZÀ-ỹ0-9])/gi, 'UBND')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])vê\s*nê\s*(ai\s*đi|i\s*đê)(?![a-zA-ZÀ-ỹ0-9])/gi, 'VNeID')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])v\s*e\s*n\s*e\s*i\s*d(?![a-zA-ZÀ-ỹ0-9])/gi, 'VNeID')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])v\s*n\s*e\s*i\s*d(?![a-zA-ZÀ-ỹ0-9])/gi, 'VNeID')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])c\s*c\s*c\s*d(?![a-zA-ZÀ-ỹ0-9])/gi, 'CCCD')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])xê\s*xê\s*xê\s*đê(?![a-zA-ZÀ-ỹ0-9])/gi, 'CCCD')
    // 2. Normalize spoken spelled-out numbers to 2-digit numbers
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*một(?![a-zA-ZÀ-ỹ0-9])/gi, '01')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*hai(?![a-zA-ZÀ-ỹ0-9])/gi, '02')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*ba(?![a-zA-ZÀ-ỹ0-9])/gi, '03')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*bốn(?![a-zA-ZÀ-ỹ0-9])/gi, '04')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*năm(?![a-zA-ZÀ-ỹ0-9])/gi, '05')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*sáu(?![a-zA-ZÀ-ỹ0-9])/gi, '06')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*bảy(?![a-zA-ZÀ-ỹ0-9])/gi, '07')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*tám(?![a-zA-ZÀ-ỹ0-9])/gi, '08')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])không\s*chín(?![a-zA-ZÀ-ỹ0-9])/gi, '09')
    // 3. Merge CT code with separated digits (e.g. "c t 0 1" -> "CT01")
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])(xê\s*tê|cê\s*tê|c\s*t)\s*(\d)\s*(\d)(?![a-zA-ZÀ-ỹ0-9])/gi, 'CT$2$3')
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])(xê\s*tê|cê\s*tê|c\s*t)\s*(\d{1,2})(?![a-zA-ZÀ-ỹ0-9])/gi, (_, __, num) => `CT${num.padStart(2, '0')}`)
    .replace(/(?<![a-zA-ZÀ-ỹ0-9])(xê\s*tê|cê\s*tê)(?![a-zA-ZÀ-ỹ0-9])/gi, 'CT')
    // 4. Merge separated digits
    .replace(/(\b\d)\s+(\d)\b/g, '$1$2')
    .trim();
}

export interface UseVoiceInputOptions {
  onFinalResult?: (text: string) => void;
  lang?: string;
  normalize?: boolean;
}

export function useVoiceInput(
  onFinalResultOrOptions?: ((text: string) => void) | UseVoiceInputOptions
) {
  const onFinalCallback =
    typeof onFinalResultOrOptions === 'function'
      ? onFinalResultOrOptions
      : onFinalResultOrOptions?.onFinalResult;
  const lang =
    (typeof onFinalResultOrOptions === 'object' && onFinalResultOrOptions?.lang) || 'vi-VN';
  const shouldNormalize =
    typeof onFinalResultOrOptions === 'object' && onFinalResultOrOptions?.normalize !== undefined
      ? onFinalResultOrOptions.normalize
      : true;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setVoiceError(
        'Trình duyệt chưa hỗ trợ nhận diện giọng nói Web Speech. Vui lòng dùng Chrome hoặc Edge trên máy tính/điện thoại.'
      );
      return;
    }

    // Stop any running recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang;
      recognition.continuous = false; // Tự dừng sau 1 câu nói, không nghe liên tục
      recognition.interimResults = true; // Hiển thị kết quả tạm thời real-time

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
        setInterimText('');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (final) {
          const processed = shouldNormalize ? normalizeVoiceTranscript(final.trim()) : final.trim();
          if (processed && onFinalCallback) {
            onFinalCallback(processed);
          }
          setInterimText('');
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimText('');
        const errorKey = event.error || '';
        const errorMessages: Record<string, string> = {
          'no-speech': 'Hệ thống chưa nghe rõ. Bà con vui lòng bấm micro và nói lại nhé.',
          'not-allowed': 'Vui lòng cấp quyền truy cập micro trong cài đặt trình duyệt để nói câu hỏi.',
          'service-not-allowed': 'Dịch vụ nhận diện giọng nói bị từ chối trên thiết bị này.',
          network: 'Lỗi kết nối mạng khi nhận diện giọng nói. Vui lòng kiểm tra lại internet.',
          'audio-capture': 'Không tìm thấy micro trên thiết bị. Vui lòng cắm micro hoặc kiểm tra cài đặt thiết bị.',
        };
        setVoiceError(
          errorMessages[errorKey] || 'Không thể nhận diện giọng nói lúc này, vui lòng thử lại.'
        );
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceError('Không thể khởi động micro. Vui lòng thử lại.');
      console.warn('SpeechRecognition initialization error:', err);
    }
  }, [isSupported, lang, shouldNormalize, onFinalCallback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    voiceError,
    startListening,
    stopListening,
    clearVoiceError,
  };
}
