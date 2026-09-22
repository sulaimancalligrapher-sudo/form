import React, { useState, useEffect, useRef } from "react";
import { FormLang, RegistrationQuestion, TelegramConfig } from "../types";
import { UI_TRANSLATIONS } from "../data/defaultConfig";
import { GOOGLE_APPS_SCRIPT_CODE } from "../data/appsScriptCode";
import { TranslationSettingsTab } from "./TranslationSettingsTab";
import {
  getHeaderLogoUrl,
  saveHeaderLogoUrl,
  getCustomUiTranslations,
  saveCustomUiTranslations
} from "../utils/translationStorage";
import {
  normalizeImageUrl,
  extractGoogleDriveFileId,
  getAlternativeDriveImageUrl
} from "../utils/imageUrlConverter";
import {
  X,
  FileSpreadsheet,
  Check,
  Copy,
  ExternalLink,
  Zap,
  Github,
  Server,
  Cloud,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  Image as ImageIcon,
  Upload,
  ImagePlay,
  RotateCcw
} from "lucide-react";
import { testSheetConnection } from "../utils/googleBackendBridge";

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  scriptUrl: string;
  driveFolderId: string;
  telegramConfig: TelegramConfig;
  currentLang: FormLang;
  questions?: RegistrationQuestion[];
  onTranslationsUpdated?: () => void;
  onSave: (data: {
    spreadsheetId: string;
    scriptUrl: string;
    driveFolderId: string;
    telegramConfig: TelegramConfig;
  }) => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId: initialSpreadsheetId,
  scriptUrl: initialScriptUrl,
  driveFolderId: initialDriveFolderId,
  telegramConfig: initialTelegramConfig,
  currentLang,
  questions = [],
  onTranslationsUpdated,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "translations" | "code" | "deploy">("settings");
  const [sheetId, setSheetId] = useState(initialSpreadsheetId);
  const [scriptUrl, setScriptUrl] = useState(initialScriptUrl);
  const [driveFolderId, setDriveFolderId] = useState(initialDriveFolderId);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(initialTelegramConfig);

  // Logo and Decoupled Header Branding states
  const [logoUrl, setLogoUrl] = useState(() => getHeaderLogoUrl());
  const [headerTitleAr, setHeaderTitleAr] = useState(() => {
    const ui = getCustomUiTranslations();
    return ui.ar.headerTitle || UI_TRANSLATIONS.ar.headerTitle || "مركز يوسف ذنون لتعليم الخط العربي أون لاين";
  });
  const [headerSubtitleAr, setHeaderSubtitleAr] = useState(() => {
    const ui = getCustomUiTranslations();
    return ui.ar.headerSubtitle || UI_TRANSLATIONS.ar.headerSubtitle || "المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية";
  });

  // Decoupled Hero Card states
  const [formTitleAr, setFormTitleAr] = useState(() => {
    const ui = getCustomUiTranslations();
    return ui.ar.formTitle || UI_TRANSLATIONS.ar.formTitle;
  });
  const [formSubtitleAr, setFormSubtitleAr] = useState(() => {
    const ui = getCustomUiTranslations();
    return ui.ar.formSubtitle || UI_TRANSLATIONS.ar.formSubtitle;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    sheetAccessible?: boolean;
    scriptResponsive?: boolean;
    message?: string;
    title?: string;
  }>({ tested: false });

  // Keep state in sync with updated props
  useEffect(() => {
    if (isOpen) {
      setSheetId(initialSpreadsheetId);
      setScriptUrl(initialScriptUrl);
      setDriveFolderId(initialDriveFolderId);
      setTelegramConfig(initialTelegramConfig);
      setLogoUrl(getHeaderLogoUrl());

      const ui = getCustomUiTranslations();
      setHeaderTitleAr(ui.ar.headerTitle || UI_TRANSLATIONS.ar.headerTitle || "مركز يوسف ذنون لتعليم الخط العربي أون لاين");
      setHeaderSubtitleAr(ui.ar.headerSubtitle || UI_TRANSLATIONS.ar.headerSubtitle || "المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية");
      setFormTitleAr(ui.ar.formTitle || UI_TRANSLATIONS.ar.formTitle);
      setFormSubtitleAr(ui.ar.formSubtitle || UI_TRANSLATIONS.ar.formSubtitle);
    }
  }, [isOpen, initialSpreadsheetId, initialScriptUrl, initialDriveFolderId, initialTelegramConfig]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (loadEvt.target?.result) {
        setLogoUrl(String(loadEvt.target.result));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ tested: false });
    const result = await testSheetConnection(sheetId, scriptUrl);
    setTestResult({
      tested: true,
      success: result.success,
      sheetAccessible: result.sheetAccessible,
      scriptResponsive: result.scriptResponsive,
      message: result.message,
      title: result.title
    });
    setIsTesting(false);
  };

  const handleCopyCode = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSaveAndClose = () => {
    // 1. Save Header Logo
    saveHeaderLogoUrl(logoUrl);

    // 2. Save Decoupled Header Branding and Hero Card in Arabic
    const currentUi = getCustomUiTranslations();
    currentUi.ar.headerTitle = headerTitleAr;
    currentUi.ar.headerSubtitle = headerSubtitleAr;
    currentUi.ar.formTitle = formTitleAr;
    currentUi.ar.formSubtitle = formSubtitleAr;
    saveCustomUiTranslations(currentUi);

    if (onTranslationsUpdated) {
      onTranslationsUpdated();
    }

    onSave({
      spreadsheetId: sheetId,
      scriptUrl,
      driveFolderId,
      telegramConfig
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header - fixed with shrink-0 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                إعدادات الاستمارة والشيت ودليل الرفع
              </h3>
              <p className="text-xs text-slate-500">
                إدارة الشعار، الربط السحابي، كود البرمجة والترجمات
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - shrink-0 and sticky */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-white gap-2 overflow-x-auto shrink-0 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "settings"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚙️ إعدادات الربط والشيت
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("translations")}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "translations"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🌐 إعدادات الترجمة والنصوص
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "code"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📝 كود Apps Script للشيت
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deploy")}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === "deploy"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🚀 دليل Vercel و GitHub
          </button>
        </div>

        {/* Body Content - min-h-0 prevents flex children overflow */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Settings */}
          {activeTab === "settings" && (
            <div className="space-y-5">
              {/* SECTION 1: Header Branding & Logo (Decoupled) */}
              <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      1. هوية الشريط العلوي والشعار (Header Branding & Logo)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    مستقل عن بطاقة الفورم
                  </span>
                </div>

                {/* Logo URL & Upload & Preset */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      رابط صورة الشعار (Logo Image URL):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                        title="رفع صورة أو GIF من جهازك"
                      >
                        <Upload className="w-3 h-3" />
                        <span>رفع صورة / GIF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoUrl("/yusuf-thnun-seal.svg")}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                        title="استخدام ختم وشعار مركز يوسف ذنون"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>شعار مركز يوسف ذنون</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,.gif,.png,.jpg,.jpeg,.svg,.webp"
                    className="hidden"
                  />

                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-xl bg-white border border-emerald-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {logoUrl ? (
                        <img
                          src={normalizeImageUrl(logoUrl)}
                          alt="Logo preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const alt = getAlternativeDriveImageUrl(logoUrl);
                            if (alt && e.currentTarget.src !== alt) {
                              e.currentTarget.src = alt;
                            } else {
                              e.currentTarget.style.display = "none";
                            }
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-emerald-600/60" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        dir="ltr"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view أو رابط مباشر..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-slate-900 outline-none"
                      />
                      <p className="text-[11px] text-slate-500">
                        يقبل جميع روابط Google Drive (صيغة view أو share)، الروابط المباشرة، الصور المتحركة (GIF)، أو الرفع من جهازك.
                      </p>
                    </div>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="px-2.5 py-2 text-xs text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors"
                        title="إزالة الشعار"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  {extractGoogleDriveFileId(logoUrl) && (
                    <div className="mt-2 p-2 bg-emerald-100/70 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        تم التعرف على رابط Google Drive! سيتم تحويله تلقائياً ليظهر مباشرة في شريط الهوية. (تأكد أن إذن المشاركة في درايف: أي شخص لديه الرابط).
                      </span>
                    </div>
                  )}
                </div>

                {/* Header Title & Header Subtitle inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      عنوان الشريط العلوي (Header Title):
                    </label>
                    <input
                      type="text"
                      value={headerTitleAr}
                      onChange={(e) => setHeaderTitleAr(e.target.value)}
                      placeholder="مركز يوسف ذنون لتعليم الخط العربي أون لاين"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      وصف الشريط العلوي (Header Subtitle):
                    </label>
                    <input
                      type="text"
                      value={headerSubtitleAr}
                      onChange={(e) => setHeaderSubtitleAr(e.target.value)}
                      placeholder="المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Hero Card & Form Instructions (Decoupled) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-700" />
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      2. بطاقة الترحيب والاستمارة الرئيسية (Hero Card & Instructions)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    مستقلة وتظهر في بداية الاستمارة
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      عنوان بطاقة الاستمارة الرئيسية (Hero Title):
                    </label>
                    <input
                      type="text"
                      value={formTitleAr}
                      onChange={(e) => setFormTitleAr(e.target.value)}
                      placeholder="استمارة التسجيل في دورات الخط العربي"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      نص تعليمات ووصف الاستمارة (Hero Description):
                    </label>
                    <textarea
                      rows={2}
                      value={formSubtitleAr}
                      onChange={(e) => setFormSubtitleAr(e.target.value)}
                      placeholder="يرجى تعبئة الحقول والأسئلة التالية بدقة..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-200">
                  <span>لترجمة نصوص الشريط العلوي وبطاقة الترحيب إلى الإنجليزية والتايلاندية:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("translations")}
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>فتح تبويب الترجمات والنصوص</span>
                    <Globe className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {/* Spreadsheet ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    معرف جدول قوقل شيت (Spreadsheet ID):
                  </label>
                  {sheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <span>فتح الشيت في Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="1MAurScyKTntcUUWAoB7Qt62vwvmEnDqmYNaB0DKo9tY"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-xs sm:text-sm font-mono text-slate-900 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  هو الرمز الموجود في رابط جدولك بين <code>/d/</code> و <code>/edit</code>.
                </p>
              </div>

              {/* Script Web App URL */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  رابط تطبيق الويب (Google Apps Script Web App URL):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-xs sm:text-sm font-mono text-slate-900 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  الرابط المنشور الذي تحصل عليه عند نشر كود Apps Script (ينتهي بـ /exec).
                </p>
              </div>

              {/* Google Drive Folder ID */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  معرف مجلد قوقل درايف للمرفقات والصور (Drive Folder ID):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="1tae6n3-tjB9vVtxr2GbK572SRtWxZ3f7"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 text-xs sm:text-sm font-mono text-slate-900 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  سيتم حفظ صور الكاميرا والملفات المرفوعة تلقائياً في هذا المجلد.
                </p>
              </div>

              {/* Test Connection Button */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>اختبار الاتصال المباشر بالشيت و Apps Script</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      يتحقق من قدرة الفورم على القراءة والكتابة في قوقل شيت الآن
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الفحص...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>فحص الاتصال الآن</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult.tested && (
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed animate-in fade-in ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {testResult.success
                          ? "حالة الاتصال ممتازة وجاهز للعمل!"
                          : "تنبيه في فحص الاتصال"}
                      </span>
                    </div>
                    <p>{testResult.message}</p>
                    <div className="mt-2 flex gap-4 text-[11px]">
                      <span>
                        قراءة الشيت (GVIZ):{" "}
                        <strong>{testResult.sheetAccessible ? "✅ متاح" : "❌ غير متاح"}</strong>
                      </span>
                      <span>
                        تطبيق Apps Script:{" "}
                        <strong>{testResult.scriptResponsive ? "✅ نشط" : "⚠️ غير مؤكد"}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Telegram Config Collapsible */}
              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <span>إشعارات بوت تلغرام الفورية (Telegram Notifications)</span>
                    </h4>
                    <p className="text-[11px] text-sky-700">
                      إرسال رسالة فورية إلى هاتفك عند قيام أي شخص بتعبئة الاستمارة
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telegramConfig.enabled}
                      onChange={(e) =>
                        setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded-sm text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs font-bold text-sky-900">تفعيل</span>
                  </label>
                </div>

                {telegramConfig.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Bot Token (من @BotFather):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={telegramConfig.botToken}
                        onChange={(e) =>
                          setTelegramConfig({ ...telegramConfig, botToken: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                        placeholder="123456:ABC-DEF..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Chat ID (معرف الدردشة أو المجموعة):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={telegramConfig.chatId}
                        onChange={(e) =>
                          setTelegramConfig({ ...telegramConfig, chatId: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                        placeholder="-100..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Translations Settings */}
          {activeTab === "translations" && (
            <TranslationSettingsTab
              questions={questions}
              currentLang={currentLang}
              onTranslationsUpdated={onTranslationsUpdated || (() => {})}
            />
          )}

          {/* TAB 2: Google Apps Script Code */}
          {activeTab === "code" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">📌 كيف تضع هذا الكود في قوقل شيت؟</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800">
                  <li>افتح جدول قوقل شيت (Google Sheets) الذي ترغب في استقبال التسجيلات فيه.</li>
                  <li>من القائمة العلوية اختر: <strong>الإضافات (Extensions)</strong> ثم <strong>تطبيقات سكريبت (Apps Script)</strong>.</li>
                  <li>احذف أي كود مكتوب، والصق الكود الموجود بالأسفل كاملاً.</li>
                  <li>انقر على زر <strong>نشر (Deploy)</strong> باللون الأزرق ثم <strong>نشر جديد (New deployment)</strong>.</li>
                  <li>اختر النوع <strong>Web app</strong> واجعل الصلاحية (Who has access) هي: <strong>Anyone (أي شخص)</strong>.</li>
                  <li>انسخ رابط الـ Web App وضعه في خانة <strong>رابط تطبيق الويب</strong> في تبويب الإعدادات!</li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  كود Google Apps Script الجاهز (Apps Script Code):
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">تم النسخ بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الكود بالكامل</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200">
                <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-96" dir="ltr">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Deploy to GitHub & Vercel */}
          {activeTab === "deploy" && (
            <div className="space-y-5 text-slate-800">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <h4 className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>المشروع جاهز 100% للنشر الفوري على GitHub و Vercel</span>
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  هذا التطبيق مستقل تماماً ومجهز بملف <code>vercel.json</code> وملفات API السحابية <code>/api/register.ts</code> مع دعم العمل كـ Static SPA نقية أو Full-Stack Serverless.
                </p>
              </div>

              {/* Step 1: GitHub */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                  <Github className="w-4 h-4 text-slate-700" />
                  <span>الخطوة 1: رفع المشروع إلى مستودع GitHub جديد</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  أنشئ مستودعاً جديداً فارغاً في حسابك على GitHub (مثلاً: <code>google-sheets-form</code>)، ثم نفذ في مجلد هذا المشروع:
                </p>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto" dir="ltr">
{`git init
git add .
git commit -m "Initial commit: Standalone Google Sheets Form"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/google-sheets-form.git
git push -u origin main`}
                </pre>
              </div>

              {/* Step 2: Vercel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                  <Cloud className="w-4 h-4 text-slate-700" />
                  <span>الخطوة 2: الربط والنشر في موقع Vercel.com</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
                  <li>افتح <strong><a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold underline">vercel.com</a></strong> وسجل الدخول بحساب GitHub الخاص بك.</li>
                  <li>انقر على <strong>Add New...</strong> ثم <strong>Project</strong>.</li>
                  <li>اختر المستودع الجديد الذي قمت برفعه للتو ثم انقر <strong>Import</strong>.</li>
                  <li>في خانة <strong>Environment Variables</strong> (اختياري)، يمكنك إضافة المتغيرات:
                    <ul className="list-disc list-inside pr-4 mt-1 font-mono text-[11px] text-slate-700">
                      <li><code>VITE_SPREADSHEET_ID</code> = معرف الشيت الخاص بك</li>
                      <li><code>VITE_GOOGLE_SCRIPT_URL</code> = رابط سكريبت Web App</li>
                      <li><code>VITE_DRIVE_FOLDER_ID</code> = معرف مجلد قوقل درايف</li>
                    </ul>
                  </li>
                  <li>انقر <strong>Deploy</strong>، وخلال دقيقة واحدة سيكون الفورم متاحاً عالمياً برابط Vercel سريع وآمن ومجاني!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            حفظ الإعدادات والبدء
          </button>
        </div>
      </div>
    </div>
  );
};
