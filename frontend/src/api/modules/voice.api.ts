import { api } from './http';

/**
 * SmartWard AI — Offline AI Voice Synthesis (Piper TTS ONNX)
 * Calls the backend proxy (/api/v1/voice/synthesize) to synthesize administrative text
 * into local Vietnamese audio (WAV) directly via the containerized AI Sidecar.
 */
export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await api.post(
    '/voice/synthesize',
    { text },
    {
      responseType: 'blob',
      timeout: 15000,
    }
  );
  return response.data as Blob;
}
