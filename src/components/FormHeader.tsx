import React from "react";
import { FormLang } from "../types";
import { getEffectiveUiTranslations, getHeaderLogoUrl } from "../utils/translationStorage";
import { normalizeImageUrl, getAlternativeDriveImageUrl } from "../utils/imageUrlConverter";
import {
  FileSpreadsheet,
  Settings,
  Share2,
  Check,
  Globe,
  Sparkles,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface FormHeaderProps {
  currentLang: FormLang;
  onLanguageChange: (lang: FormLang) => void;
  onOpenSettings: () => void;
  onRefreshQuestions?: () => void;
  isRefreshing?: boolean;
  spreadsheetId: string;
}

export const FormHeader: React.FC<FormHeaderProps> = ({
  currentLang,
  onLanguageChange,
  onOpenSettings,
  onRefreshQuestions,
  isRefreshing,
  spreadsheetId
}) => {
  const [copied, setCopied] = React.useState(false);
  const rawLogoUrl = getHeaderLogoUrl();
  const normalizedLogo = React.useMemo(() => normalizeImageUrl(rawLogoUrl), [rawLogoUrl]);
  const [currentImgSrc, setCurrentImgSrc] = React.useState(normalizedLogo);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    const norm = normalizeImageUrl(rawLogoUrl);
    setCurrentImgSrc(norm);
    setImgError(false);
  }, [rawLogoUrl]);

  const handleImageError = () => {
    const alt = getAlternativeDriveImageUrl(rawLogoUrl);
    if (alt && currentImgSrc !== alt) {
      setCurrentImgSrc(alt);
    } else {
      setImgError(true);
    }
  };

  const t = getEffectiveUiTranslations(currentLang);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;

    // Use Web Share API if available on mobile/tablet devices
    if (navigator.share) {
      try {
        await navigator.share({
          title: headerTitle,
          text: headerSubtitle,
          url: currentUrl
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (err: any) {
        // If user cancelled share sheet, do nothing
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: clipboard write or prompt
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("انسخ الرابط التالي لمشاركته:", currentUrl);
    }
  };

  const headerTitle = t.headerTitle || (currentLang === "ar" ? "مركز يوسف ذنون لتعليم الخط العربي أون لاين" : currentLang === "en" ? "Yusuf Thnun Center for Arabic Calligraphy" : "ศูนย์การเรียนรู้การเขียนอักษรวิจิตร ยูซุฟ ซันนูน");
  const headerSubtitle = t.headerSubtitle || (currentLang === "ar" ? "المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية" : currentLang === "en" ? "Official Registration & Course Enrollment Platform" : "แพลตฟอร์มอย่างเป็นทางการสำหรับการลงทะเบียนเรียน");

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Configurable Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-950 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-100 shrink-0">
            {currentImgSrc && !imgError ? (
              <img
                src={currentImgSrc}
                alt="Logo"
                referrerPolicy="no-referrer"
                onError={handleImageError}
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
              {headerTitle}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block max-w-md truncate">
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Right Actions: Lang Switcher, Share, Settings */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => onLanguageChange("ar")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                currentLang === "ar"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                currentLang === "en"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("th")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                currentLang === "th"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ไทย
            </button>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title={t.shareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">{t.linkCopied}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.shareLink}</span>
              </>
            )}
          </button>

          {/* Refresh Questions Button */}
          {onRefreshQuestions && (
            <button
              type="button"
              onClick={onRefreshQuestions}
              disabled={isRefreshing}
              title="تحديث الأسئلة فورياً من قوقل شيت"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : "text-emerald-600"}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? "جاري التحديث..." : "تحديث الأسئلة"}
              </span>
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.sheetSettings}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
