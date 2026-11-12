import jsQR from 'jsqr';
import { parseCccdQrString, type DecodedCccdQr } from './cccdQrParser';

/**
 * Attempts to extract and parse a Vietnamese BCA CCCD QR code directly from an uploaded image File or Blob.
 * Tries multiple rotation angles (0, 90, 180, 270 degrees) and binarization / contrast enhancements.
 */
export async function decodeQrFromImageFile(file: File | Blob): Promise<DecodedCccdQr | null> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const angles = [0, 90, 180, 270];
        let detectedPayload: string | null = null;

        for (const angle of angles) {
          const canvas = document.createElement('canvas');
          if (angle === 90 || angle === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) continue;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();

          // 1. Try native BarcodeDetector if available in modern Chromium/Edge
          if ('BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(canvas);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedPayload = barcodes[0].rawValue;
                break;
              }
            } catch {
              // fallback to jsQR
            }
          }

          // 2. Try jsQR on standard image data
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const rawCode = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (rawCode && rawCode.data) {
            detectedPayload = rawCode.data;
            break;
          }

          // 3. Try contrast thresholding / binarization for low contrast / glossy scans
          const binarized = new Uint8ClampedArray(imgData.data);
          for (let i = 0; i < binarized.length; i += 4) {
            const avg = (binarized[i] + binarized[i + 1] + binarized[i + 2]) / 3;
            const val = avg > 128 ? 255 : 0;
            binarized[i] = val;
            binarized[i + 1] = val;
            binarized[i + 2] = val;
          }
          const contrastCode = jsQR(binarized, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (contrastCode && contrastCode.data) {
            detectedPayload = contrastCode.data;
            break;
          }
        }

        URL.revokeObjectURL(objectUrl);

        if (detectedPayload) {
          const parsed = parseCccdQrString(detectedPayload);
          if (parsed.valid && parsed.data) {
            resolve(parsed.data);
            return;
          }
        }
        resolve(null);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}
