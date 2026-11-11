import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  QrCode,
  FlipHorizontal,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import jsQR from 'jsqr';
import {
  parseCccdQrString,
  detectDiscrepancies,
  type DecodedCccdQr,
  type QrFieldDiscrepancy,
} from '../utils/cccdQrParser';

export interface CccdQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decoded: DecodedCccdQr, discrepancies: QrFieldDiscrepancy[]) => void;
  currentFormData?: {
    cccd?: string;
    fullName?: string;
    dob?: string;
    gender?: string;
    address?: string;
    issueDate?: string;
  };
}

export const CccdQrScannerModal: React.FC<CccdQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  currentFormData = {},
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Reconciliation view state
  const [reconciliationData, setReconciliationData] = useState<{
    decoded: DecodedCccdQr;
    discrepancies: QrFieldDiscrepancy[];
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping video track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Handle successful raw QR string detection
  const processRawQrPayload = useCallback(
    (rawPayload: string) => {
      if (!rawPayload) return;
      setIsProcessing(true);
      setScanError(null);

      const parsed = parseCccdQrString(rawPayload);
      if (!parsed.valid || !parsed.data) {
        setScanError(parsed.error || 'Mã QR không đúng định dạng CCCD của Bộ Công An.');
        setIsProcessing(false);
        return;
      }

      // Stop camera once valid QR found
      stopCameraStream();

      // Check discrepancies with currently typed data
      const discrepancies = detectDiscrepancies(parsed.data, currentFormData);

      if (discrepancies.length === 0) {
        // Full match or form was blank -> auto-fill immediately
        onScanSuccess(parsed.data, []);
        handleCloseModal();
      } else {
        // Discrepancies exist -> show reconciliation UI
        setReconciliationData({
          decoded: parsed.data,
          discrepancies,
        });
      }
      setIsProcessing(false);
    },
    [currentFormData, onScanSuccess, stopCameraStream]
  );

  // Decode from ImageData using jsQR with optional binarization
  const decodeImageDataWithJsQr = (imageData: ImageData): string | null => {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && code.data) {
      return code.data;
    }

    // Try Otsu-like contrast enhancement if normal decode fails
    const data = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = avg > 128 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    const binarizedCode = jsQR(data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return binarizedCode?.data || null;
  };

  // Decode frame from video or canvas
  const decodeCurrentVideoFrame = useCallback(async (): Promise<void> => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;

    // 1. Try BarcodeDetector if supported
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          processRawQrPayload(barcodes[0].rawValue);
          return;
        }
      } catch (err) {
        // Fallback to jsQR
      }
    }

    // 2. Fallback using Canvas + jsQR
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const rawText = decodeImageDataWithJsQr(imgData);
      if (rawText) {
        processRawQrPayload(rawText);
      }
    } catch (err) {
      console.warn('Canvas frame decode error:', err);
    }
  }, [processRawQrPayload]);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setScanError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập máy ảnh hoặc môi trường không phải HTTPS/localhost.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Run scanner loop every 180ms
        scanIntervalRef.current = window.setInterval(() => {
          decodeCurrentVideoFrame();
        }, 180);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập máy ảnh hoặc chuyển sang Tải ảnh QR.');
      setCameraActive(false);
    }
  }, [facingMode, stopCameraStream, decodeCurrentVideoFrame]);

  // Start/stop camera on tab change or modal open
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !reconciliationData) {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, startCameraStream, stopCameraStream, reconciliationData]);

  // Handle uploaded image file with rotation pipeline (0, 90, 180, 270 deg)
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setScanError(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không thể tải tệp hình ảnh.'));
        img.src = objectUrl;
      });

      const angles = [0, 90, 180, 270];
      let detectedText: string | null = null;

      for (const angle of angles) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;

        if (angle === 0 || angle === 180) {
          canvas.width = img.width;
          canvas.height = img.height;
        } else {
          canvas.width = img.height;
          canvas.height = img.width;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // 1. Try BarcodeDetector
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(canvas);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedText = barcodes[0].rawValue;
              break;
            }
          } catch (e) {
            // continue to jsQR
          }
        }

        // 2. Try jsQR
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rawCode = decodeImageDataWithJsQr(imgData);
        if (rawCode) {
          detectedText = rawCode;
          break;
        }
      }

      URL.revokeObjectURL(objectUrl);

      if (detectedText) {
        processRawQrPayload(detectedText);
      } else {
        setScanError('Không tìm thấy mã QR hợp lệ trong ảnh tải lên. Vui lòng chụp rõ nét hoặc vuông góc với thẻ CCCD.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setScanError(err.message || 'Lỗi khi xử lý ảnh chụp.');
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    stopCameraStream();
    setReconciliationData(null);
    setScanError(null);
    setCameraError(null);
    setIsProcessing(false);
    onClose();
  };

  const handleApplyQrData = () => {
    if (!reconciliationData) return;
    onScanSuccess(reconciliationData.decoded, reconciliationData.discrepancies);
    handleCloseModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#00796B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-[#A7F3D0]" />
            <div>
              <h3 className="font-bold text-base leading-tight">Quét & Giải Mã QR Thẻ CCCD Gắn Chip</h3>
              <p className="text-xs text-white/80">Chuẩn 7 trường dữ liệu Cục C06 - Bộ Công An</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* SCREEN 1: DISCREPANCY RECONCILIATION */}
          {reconciliationData ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs text-[#92400E]">
                  <strong className="block text-sm font-bold mb-1">
                    Phát hiện sai lệch giữa Tờ khai và Thẻ CCCD
                  </strong>
                  Thông tin bạn đã nhập trên biểu mẫu có sự khác biệt so với dữ liệu trích xuất từ mã QR trên thẻ CCCD. Vui lòng đối chiếu kỹ trước khi tiếp tục.
                </div>
              </div>

              {/* Discrepancy Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Trường thông tin</th>
                      <th className="py-2.5 px-3">Thông tin tự nhập</th>
                      <th className="py-2.5 px-3">Dữ liệu từ QR CCCD</th>
                      <th className="py-2.5 px-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliationData.discrepancies.map((d) => (
                      <tr key={d.fieldKey} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{d.fieldLabel}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{d.typedValue || '—'}</td>
                        <td className="py-2.5 px-3 text-[#00796B] font-mono font-bold">{d.qrValue}</td>
                        <td className="py-2.5 px-3">
                          {d.level === 'CONFLICT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                              <ShieldAlert className="w-3 h-3" /> Mâu thuẫn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px]">
                              <AlertCircle className="w-3 h-3" /> Sai khác nhẹ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Decoded Full Overview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block">Thông tin đầy đủ từ thẻ CCCD:</span>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Số CCCD: <strong className="text-slate-900 font-mono">{reconciliationData.decoded.cccdNumber}</strong></div>
                  <div>Họ và tên: <strong className="text-slate-900">{reconciliationData.decoded.fullName}</strong></div>
                  <div>Ngày sinh: <strong className="text-slate-900">{reconciliationData.decoded.dateOfBirth}</strong></div>
                  <div>Giới tính: <strong className="text-slate-900">{reconciliationData.decoded.gender}</strong></div>
                  <div className="col-span-2">Thường trú: <strong className="text-slate-900">{reconciliationData.decoded.address}</strong></div>
                  {reconciliationData.decoded.issueDate && (
                    <div>Ngày cấp: <strong className="text-slate-900">{reconciliationData.decoded.issueDate}</strong></div>
                  )}
                  {reconciliationData.decoded.oldIdNumber && (
                    <div>CMND cũ (9 số): <strong className="text-slate-900 font-mono">{reconciliationData.decoded.oldIdNumber}</strong></div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Giữ nguyên thông tin đã nhập & Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyQrData}
                  className="px-4 py-2.5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Cập nhật toàn bộ theo mã QR CCCD (Khuyến nghị)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* SCREEN 2: SCANNER MODES (CAMERA OR UPLOAD) */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('camera');
                    setScanError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'camera'
                      ? 'bg-white text-[#00796B] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Quét Trực Tiếp Bằng Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    stopCameraStream();
                    setScanError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-white text-[#00796B] shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Tải Ảnh Thẻ CCCD / QR</span>
                </button>
              </div>

              {/* CAMERA MODE */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  <div className="relative w-full h-72 rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center border-2 border-dashed border-[#00796B]/50 shadow-inner">
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Laser overlay animation */}
                    {cameraActive && (
                      <div className="absolute inset-x-8 top-12 bottom-12 border-2 border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                        <div className="flex justify-between text-[11px] font-mono text-emerald-400 bg-black/40 px-2 py-0.5 rounded">
                          <span>CCCD QR VIEWFINDER</span>
                          <span>BCA 7-FIELD</span>
                        </div>
                        <div className="h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-laser" />
                        <div className="text-center text-[10px] text-white/80 bg-black/40 py-0.5 rounded">
                          Đặt mã QR góc phải phía trên thẻ CCCD vào khung
                        </div>
                      </div>
                    )}

                    {/* Camera Error or Inactive */}
                    {!cameraActive && (
                      <div className="flex flex-col items-center gap-2 text-white/90 z-10 p-4 text-center max-w-sm">
                        <Camera className="w-10 h-10 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold">
                          {cameraError || 'Đang khởi động Camera...'}
                        </span>
                        {cameraError && (
                          <button
                            type="button"
                            onClick={() => startCameraStream()}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Thử lại</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Đổi Camera ({facingMode === 'environment' ? 'Sau' : 'Trước'})</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Tự động nhận diện chuỗi QR khi nằm trong khung
                    </span>
                  </div>
                </div>
              )}

              {/* UPLOAD MODE */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-64 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#00796B] bg-slate-50 hover:bg-emerald-50/30 transition flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                  >
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-[#00796B] transition mb-2" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-[#00796B]">
                      Nhấp để chọn ảnh hoặc Kéo thả ảnh thẻ CCCD vào đây
                    </span>
                    <span className="text-[11px] text-slate-500 max-w-xs mt-1">
                      Hỗ trợ định dạng PNG, JPG, JPEG, WEBP. Hệ thống tự động xoay và lọc ảnh để nhận diện mã QR.
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </div>

                  {isProcessing && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-xs text-emerald-800 font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#00796B]" />
                      <span>Đang phân tích và giải mã mã QR thẻ CCCD...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Errors & Alerts */}
              {scanError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Không thể phân tích mã QR:</span>
                    <span>{scanError}</span>
                  </div>
                </div>
              )}

              {/* Privacy Footer */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Bảo mật Zero-Knowledge: Việc giải mã mã QR diễn ra 100% tại trình duyệt của bạn, thông tin cá nhân không truyền qua máy chủ nếu chưa nộp hồ sơ.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
