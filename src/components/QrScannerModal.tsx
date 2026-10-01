import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("المتصفح لا يدعم الوصول للكاميرا مباشرة. يمكنك رفع صورة كود QR.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setCameraActive(false);
      setErrorMessage("تعذر فتح الكاميرا (ربما بسبب صلاحيات المتصفح). يمكنك مسح الكود برفع صورة الكود أدناه.");
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data && code.data.trim()) {
        stopCamera();
        onScanSuccess(code.data.trim());
        onClose();
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        setIsProcessingFile(false);
        if (code && code.data) {
          stopCamera();
          onScanSuccess(code.data.trim());
          onClose();
        } else {
          setErrorMessage("لم يتم التعرف على كود QR واضح في الصورة المرفوعة. يرجى التأكد من وضوح الكود.");
        }
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMessage("فشل قراءة ملف الصورة.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>مسح كود المشترك (QR Code)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-5 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-square max-w-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              playsInline
              muted
            />

            {/* Target Reticle Overlay */}
            {cameraActive && (
              <div className="absolute inset-8 border-2 border-emerald-400/90 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400 animate-pulse shadow-sm" />
              </div>
            )}

            {!cameraActive && !errorMessage && (
              <div className="text-center p-4 text-slate-300 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                <p className="text-xs">جارٍ تشغيل الكاميرا...</p>
              </div>
            )}

            {errorMessage && (
              <div className="text-center p-4 text-rose-300 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
                <p className="text-xs leading-relaxed">{errorMessage}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            وجّه الكاميرا نحو كود الـ QR الخاص بك في البطاقة أو الهاتف وسيتم التعرف عليه فوراً.
          </p>

          {/* Alternative: File Upload */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
            <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{isProcessingFile ? "جارٍ فحص الصورة..." : "أو اختر صورة كود QR من جهازك"}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
