import React, { useState, useRef, useMemo } from "react";
import { RegistrationQuestion, FormLang } from "../types";
import {
  getEffectiveUiTranslations,
  getEffectiveQuestionTranslation,
  getBuiltInOptionTranslation
} from "../utils/translationStorage";
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
  ZoomIn,
  Check,
  ListChecks
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

  // Multilingual question text resolution (custom translations take priority over defaults)
  const effectiveTrans = {
    ...(question.translations || {}),
    ...getEffectiveQuestionTranslation(question.question, question.options)
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

  // Helper to extract clean display label for choices (strips leading score like "1-", "2 —", "3 -" in scored_choice)
  const getCleanOptionLabel = (opt: string, isScored: boolean): string => {
    if (!isScored || !opt) return opt;
    // Match leading numbers followed by hyphen, dash, or separator: e.g. "1 -", "2-", "3 —"
    return opt.replace(/^\s*\d+\s*[-—–ـ:]\s*/, "").trim() || opt;
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
    return question.options || [];
  };

  // Returns the translated option label for display (EN / TH / AR) while keeping original option for saving
  const getTranslatedOptionLabel = (optIdx: number, originalOpt: string, isScored: boolean): string => {
    if (currentLang === "en") {
      const optEn = effectiveTrans.optionsEn?.[optIdx]?.trim() || getBuiltInOptionTranslation(originalOpt, "en");
      if (optEn) return getCleanOptionLabel(optEn, isScored);
    }
    if (currentLang === "th") {
      const optTh = effectiveTrans.optionsTh?.[optIdx]?.trim() || getBuiltInOptionTranslation(originalOpt, "th");
      if (optTh) return getCleanOptionLabel(optTh, isScored);
    }
    return getCleanOptionLabel(originalOpt, isScored);
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

  // --- File Upload handler (with automatic image compression for fast Drive upload) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const rawBase64 = reader.result as string;
      if (file.type.startsWith("image/") && !file.type.includes("svg") && !file.type.includes("gif")) {
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1100;
            let w = img.width || 800;
            let h = img.height || 600;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const offCanvas = document.createElement("canvas");
            offCanvas.width = w;
            offCanvas.height = h;
            const ctx = offCanvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressed = offCanvas.toDataURL("image/jpeg", 0.8);
              onChange(compressed);
              if (onFileSelect) {
                onFileSelect(compressed, file.name);
              }
              return;
            }
          } catch (compErr) {}
          onChange(rawBase64);
          if (onFileSelect) {
            onFileSelect(rawBase64, file.name);
          }
        };
        img.onerror = () => {
          onChange(rawBase64);
          if (onFileSelect) {
            onFileSelect(rawBase64, file.name);
          }
        };
        img.src = rawBase64;
      } else {
        onChange(rawBase64);
        if (onFileSelect) {
          onFileSelect(rawBase64, file.name);
        }
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

  // Check if question is multiple choice (اختيارات 3)
  const isMultipleChoice =
    qType === "multiple_choice" ||
    qType === "multi_choice" ||
    qType.includes("اختيارات 3") ||
    qType.includes("اختيار 3") ||
    qType.includes("خيارات 3") ||
    qType.includes("خيارات3") ||
    qType.includes("اختيارات3") ||
    qType.includes("choice3") ||
    qType.includes("choice 3") ||
    qType.includes("checkbox") ||
    qType.includes("متعدد");

  // For multiple choice (اختيارات 3): selected options list
  const selectedOptionsList: string[] = useMemo(() => {
    if (!value || typeof value !== "string") return [];
    if (options.includes(value)) return [value];
    const parts = value.split(/(?:،\s*|,\s*|\|\|\||\n)/).map((s) => s.trim()).filter(Boolean);
    const matched = options.filter((opt) => parts.includes(opt.trim()));
    return matched.length > 0 ? matched : parts;
  }, [value, options]);

  const handleMultipleChoiceToggle = (opt: string) => {
    let updated: string[];
    if (selectedOptionsList.includes(opt)) {
      updated = selectedOptionsList.filter((v) => v !== opt);
    } else {
      updated = [...selectedOptionsList, opt];
    }
    onChange(updated.join("، "));
  };

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
      {/* A-1) Multiple Choice (اختيارات 3 - مربعات اختيار متعدد) */}
      {isMultipleChoice && (
        <div className="space-y-2 mt-1">
          {/* Header indicator / hint */}
          <div className="flex items-center justify-between px-1 mb-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200/70 text-[11px]">
              <ListChecks className="w-3.5 h-3.5 shrink-0" />
              <span>{t.multipleChoiceHint || "يمكنك اختيار أكثر من إجابة (اختيار متعدد)"}</span>
            </span>

            {selectedOptionsList.length > 0 && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors underline font-medium cursor-pointer"
              >
                {t.clearSelection || "إلغاء التحديد"}
              </button>
            )}
          </div>

          {/* Option checkboxes */}
          {options.map((opt, optIdx) => {
            const isChecked = selectedOptionsList.includes(opt);
            const displayLabel = getTranslatedOptionLabel(optIdx, opt, false);

            return (
              <label
                key={optIdx}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  isChecked
                    ? "bg-emerald-50/90 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-400 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                <input
                  type="checkbox"
                  name={`question-${question.id}-${optIdx}`}
                  checked={isChecked}
                  onChange={() => handleMultipleChoiceToggle(opt)}
                  className="sr-only"
                />
                <div
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    isChecked
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-xs sm:text-sm leading-relaxed flex-1">{displayLabel}</span>
              </label>
            );
          })}

          {/* Selected items counter footer */}
          {selectedOptionsList.length > 0 && (
            <div className="pt-1 px-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                {t.selectedCount || "تم تحديد"}: <strong className="text-emerald-700 font-bold">{selectedOptionsList.length}</strong> من أصل {options.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* A-2) Single Choice & Scored Choice (اختيارات و اختيارات 2 - راديو خيار واحد) */}
      {!isMultipleChoice && (qType === "choice" || qType === "scored_choice" || qType === "اختيارات 2" || qType.includes("اختيار") || qType.includes("choice")) && (
        <div className="space-y-2 mt-1">
          {options.map((opt, optIdx) => {
            const isChecked = value === opt;
            const isScored = qType === "scored_choice" || qType === "اختيارات 2";
            const displayLabel = getTranslatedOptionLabel(optIdx, opt, isScored);

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
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    isChecked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs sm:text-sm select-none leading-relaxed">{displayLabel}</span>
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

      {/* C) Phone Input with international prefix */}
      {qType === "phone" && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <select
              aria-label="مفتاح الدولة"
              value={value.startsWith("+964") ? "+964" : value.startsWith("+966") ? "+966" : value.startsWith("+971") ? "+971" : value.startsWith("+20") ? "+20" : value.startsWith("+66") ? "+66" : value.startsWith("+962") ? "+962" : value.startsWith("+965") ? "+965" : "other"}
              onChange={(e) => {
                const prefix = e.target.value;
                if (prefix === "other") return;
                const digits = value.replace(/^\+\d+\s*/, "");
                onChange(`${prefix} ${digits}`.trim());
              }}
              className="px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono font-bold outline-none focus:border-emerald-500 cursor-pointer shrink-0"
            >
              <option value="+964">🇮🇶 +964</option>
              <option value="+966">🇸🇦 +966</option>
              <option value="+971">🇦🇪 +971</option>
              <option value="+20">🇪🇬 +20</option>
              <option value="+66">🇹🇭 +66</option>
              <option value="+965">🇰🇼 +965</option>
              <option value="+962">🇯🇴 +962</option>
              <option value="other">🌐 دولي آخر</option>
            </select>
            <input
              id={`field-input-${question.id}`}
              type="tel"
              dir="ltr"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="+964 770 000 0000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-slate-900 text-sm outline-none transition-all text-left font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-400">يرجى كتابة رقم الهاتف مع رمز الدولة (واتساب أو اتصال)</p>
        </div>
      )}

      {/* D) Email Input with format validation */}
      {qType === "email" && (
        <div className="space-y-1">
          <input
            id={`field-input-${question.id}`}
            type="email"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder="user@example.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 focus:bg-white text-slate-900 text-sm outline-none transition-all text-left font-sans ${
              value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                ? "border-amber-300 focus:border-amber-500 focus:ring-3 focus:ring-amber-100"
                : "border-slate-200 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100"
            }`}
          />
          {value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <span>يرجى التأكد من كتابة البريد بصيغة صحيحة (مثل: name@domain.com)</span>
            </p>
          )}
        </div>
      )}

      {/* E) Standard Text Input */}
      {(qType === "text" || !["number", "phone", "email", "choice", "scored_choice", "اختيارات 2", "file"].includes(qType)) && (
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
