import React, { useState, useRef } from "react";
import { RegistrationQuestion, FormLang } from "../types";
import { getEffectiveUiTranslations, getEffectiveQuestionTranslation } from "../utils/translationStorage";
import { ImageModal } from "./ImageModal";
import {
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RotateCw,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  ZoomIn
} from "lucide-react";

interface FormFieldProps {
  question: RegistrationQuestion;
  index: number;
  value: string;
  error?: string;
  currentLang: FormLang;
  onChange: (val: string) => void;
  onFileSelect?: (fileBase64: string, fileName: string) => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  question,
  index,
  value,
  error,
  currentLang,
  onChange,
  onFileSelect
}) => {
  const t = getEffectiveUiTranslations(currentLang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [tempCapturedImage, setTempCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title?: string } | null>(null);

  // Multilingual question text resolution
  const effectiveTrans = {
    ...getEffectiveQuestionTranslation(question.question),
    ...(question.translations || {})
  };

  const getQuestionTitle = (): string => {
    if (currentLang === "en" && effectiveTrans.questionEn) {
      return effectiveTrans.questionEn;
    }
    if (currentLang === "th" && effectiveTrans.questionTh) {
      return effectiveTrans.questionTh;
    }
    return question.question;
  };

  const getQuestionDescription = (): string | undefined => {
    if (currentLang === "en" && effectiveTrans.descriptionEn) {
      return effectiveTrans.descriptionEn;
    }
    if (currentLang === "th" && effectiveTrans.descriptionTh) {
      return effectiveTrans.descriptionTh;
    }
    return question.description;
  };

  const getQuestionOptions = (): string[] => {
    if (currentLang === "en" && effectiveTrans.optionsEn && effectiveTrans.optionsEn.length > 0) {
      return effectiveTrans.optionsEn;
    }
    if (currentLang === "th" && effectiveTrans.optionsTh && effectiveTrans.optionsTh.length > 0) {
      return effectiveTrans.optionsTh;
    }
    return question.options || [];
  };

  const getButtonTitle = (): string => {
    if (currentLang === "en" && effectiveTrans.buttonTitleEn) {
      return effectiveTrans.buttonTitleEn;
    }
    if (currentLang === "th" && effectiveTrans.buttonTitleTh) {
      return effectiveTrans.buttonTitleTh;
    }
    return question.question;
  };

  // --- Camera handlers ---
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    setTempCapturedImage(null);

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError("تعذر الوصول للكاميرا، يرجى التحقق من إعطاء الإذن للمتصفح.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setTempCapturedImage(null);
  };

  const switchCamera = async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {}
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setTempCapturedImage(dataUrl);
    }
  };

  const confirmCapturedPhoto = () => {
    if (!tempCapturedImage) return;
    onChange(tempCapturedImage);
    setFileName(`camera_snapshot_${Date.now()}.jpg`);
    if (onFileSelect) {
      onFileSelect(tempCapturedImage, `camera_snapshot_${Date.now()}.jpg`);
    }
    stopCamera();
  };

  // --- File Upload handler ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
      if (onFileSelect) {
        onFileSelect(base64, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    onChange("");
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const title = getQuestionTitle();
  const desc = getQuestionDescription();
  const options = getQuestionOptions();
  const qType = (question.type || "text").toLowerCase().trim();

  // 1. Non-input Element: Banner Image
  if (qType === "image_display" || qType === "صورة") {
    const src = question.imageUrl || "https://lh3.googleusercontent.com/d/1wUPfYMrl3t6j0RPaw6Vk-WiqAaECbSNQ";
    return (
      <>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                {index + 1}
              </span>
              {title}
            </h3>
            <span className="text-xs text-slate-400">{t.optionalBadge}</span>
          </div>
          {desc && <p className="text-xs text-slate-500 mb-3">{desc}</p>}
          <div
            onClick={() => setLightboxImg({ url: src, title })}
            className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex justify-center max-h-72 cursor-zoom-in relative group"
            title="انقر لعرض الصورة بالحجم الكامل"
          >
            <img
              src={src}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain max-h-72 group-hover:scale-[1.02] transition-transform duration-200"
            />
            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-medium flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>تكبير الصورة</span>
            </div>
          </div>
        </div>

        <ImageModal
          isOpen={!!lightboxImg}
          imageUrl={lightboxImg?.url || null}
          title={lightboxImg?.title}
          onClose={() => setLightboxImg(null)}
        />
      </>
    );
  }

  // 2. Non-input Element: Action / PDF Button
  if (qType === "button_title" || qType === "button_link" || qType === "عنوان زر") {
    const link = question.externalLink || "#";
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                {index + 1}
              </span>
              {title}
            </h3>
            {desc && <p className="text-xs text-slate-600 mt-1 max-w-xl">{desc}</p>}
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>{getButtonTitle()}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`field-container-${question.id}`}
      className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
        error
          ? "border-rose-300 ring-2 ring-rose-100 bg-rose-50/20"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Question Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <label
          htmlFor={`field-input-${question.id}`}
          className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 cursor-pointer"
        >
          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold shrink-0">
            {index + 1}
          </span>
          <span>{title}</span>
        </label>
        {question.required ? (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            {t.requiredBadge} *
          </span>
        ) : (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 shrink-0">
            {t.optionalBadge}
          </span>
        )}
      </div>

      {/* Description */}
      {desc && <p className="text-xs text-slate-500 mb-3.5 pr-8 leading-relaxed">{desc}</p>}

      {/* Optional Attached Reference Image (Column F) */}
      {question.imageUrl && qType !== "image_display" && qType !== "صورة" && (
        <div className="mb-3 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 max-h-56 flex justify-center">
          <img
            src={question.imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain max-h-56 hover:scale-[1.01] transition-transform"
          />
        </div>
      )}

      {/* Optional Attached External / PDF Link (Column G) */}
      {question.externalLink && question.externalLink !== "-" && qType !== "button_title" && qType !== "عنوان زر" && (
        <div className="mb-3">
          <a
            href={question.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض الرابط التوضيحي / المستند ↗</span>
          </a>
        </div>
      )}

      {/* Question Inputs according to type */}
      {/* A) Choice / Radio */}
      {qType === "choice" && (
        <div className="space-y-2 mt-1">
          {options.map((opt, optIdx) => {
            const isChecked = value === opt;
            return (
              <label
                key={optIdx}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 font-medium ring-1 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={isChecked}
                  onChange={() => onChange(opt)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isChecked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs sm:text-sm select-none">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* B) Number Input */}
      {qType === "number" && (
        <input
          id={`field-input-${question.id}`}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مثال: 25"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-slate-900 text-sm outline-none transition-all"
        />
      )}

      {/* C) Phone Input */}
      {qType === "phone" && (
        <div className="relative">
          <input
            id={`field-input-${question.id}`}
            type="tel"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="+964 770 000 0000"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-slate-900 text-sm outline-none transition-all text-left font-mono"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
            <span className="text-xs">واتساب / هاتف</span>
          </div>
        </div>
      )}

      {/* D) Email Input */}
      {qType === "email" && (
        <input
          id={`field-input-${question.id}`}
          type="email"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="user@example.com"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-slate-900 text-sm outline-none transition-all text-left font-sans"
        />
      )}

      {/* E) Standard Text Input */}
      {(qType === "text" || !["number", "phone", "email", "choice", "file"].includes(qType)) && (
        <input
          id={`field-input-${question.id}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="اكتب إجابتك هنا..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-slate-900 text-sm outline-none transition-all"
        />
      )}

      {/* F) File Upload & Live Camera */}
      {qType === "file" && (
        <div className="space-y-3">
          {/* Active file preview if uploaded */}
          {value ? (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3 overflow-hidden">
                {value.startsWith("data:image") || value.startsWith("http") ? (
                  <img
                    src={value}
                    alt="Uploaded"
                    onClick={() => setLightboxImg({ url: value, title: fileName || "صورة المرفق" })}
                    className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                    title="انقر لتكبير الصورة"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-200/60 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                    {fileName || "تم اختيار الملف بنجاح"}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">جاهز للمزامنة مع Google Drive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors shrink-0"
                title="حذف الملف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Elegant File Upload Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Primary File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer group"
                >
                  <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                  <span>رفع أو اختيار ملف</span>
                </button>

                {/* Secondary Camera Button */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 transition-all cursor-pointer shadow-2xs"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span>{t.openCamera}</span>
                </button>

                <span className="text-[11px] text-slate-400 font-medium">
                  (صور، PDF أو Word)
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}

          {/* Camera Modal / Live View */}
          {isCameraActive && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 mt-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  {t.cameraActive}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    title={t.switchCamera}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">{t.switchCamera}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title={t.closeCamera}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Video Stream or Captured Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
                {tempCapturedImage ? (
                  <img
                    src={tempCapturedImage}
                    alt="Captured snapshot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {tempCapturedImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setTempCapturedImage(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                    >
                      {t.retakePhoto}
                    </button>
                    <button
                      type="button"
                      onClick={confirmCapturedPhoto}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t.confirmPhoto}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-transform active:scale-95 flex items-center gap-2 shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    {t.capturePhoto}
                  </button>
                )}
              </div>
            </div>
          )}

          {cameraError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {cameraError}
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium mt-2 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Full Size Image Lightbox Modal */}
      <ImageModal
        isOpen={!!lightboxImg}
        imageUrl={lightboxImg?.url || null}
        title={lightboxImg?.title}
        onClose={() => setLightboxImg(null)}
      />
    </div>
  );
};
