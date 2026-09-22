import React, { useState, useMemo } from "react";
import {
  Globe,
  Search,
  Save,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Loader2,
  X
} from "lucide-react";
import { FormLang, RegistrationQuestion, QuestionTranslation, FormTranslationsMap } from "../types";
import { UI_TRANSLATIONS } from "../data/defaultConfig";
import {
  getCustomQuestionTranslations,
  saveCustomQuestionTranslations,
  getCustomUiTranslations,
  saveCustomUiTranslations,
  resetAllTranslationsToDefaults,
  getEffectiveQuestionTranslation
} from "../utils/translationStorage";
import { translateWithAi } from "../utils/aiTranslator";

interface TranslationSettingsTabProps {
  questions: RegistrationQuestion[];
  currentLang: FormLang;
  onTranslationsUpdated: () => void;
}

interface UiTextCategory {
  id: string;
  title: string;
  keys: { key: string; label: string }[];
}

const UI_CATEGORIES: UiTextCategory[] = [
  {
    id: "header_branding",
    title: "1. هوية الشريط العلوي والشعار (Header Branding)",
    keys: [
      { key: "headerTitle", label: "عنوان الشريط العلوي" },
      { key: "headerSubtitle", label: "الوصف الفرعي للشريط العلوي" }
    ]
  },
  {
    id: "hero_card",
    title: "2. بطاقة الترحيب والاستمارة الرئيسية (Hero Card)",
    keys: [
      { key: "formTitle", label: "عنوان بطاقة الترحيب الرئيسية" },
      { key: "formSubtitle", label: "وصف وتعليمات بطاقة الترحيب" },
      { key: "badgeConnected", label: "شارة الاتصال بالشيت" },
      { key: "sheetSettings", label: "زر إعدادات الربط والشيت" },
      { key: "shareLink", label: "زر مشاركة الرابط" },
      { key: "linkCopied", label: "رسالة تم نسخ الرابط" }
    ]
  },
  {
    id: "form_controls",
    title: "أزرار التحكم وعناصر الإدخال",
    keys: [
      { key: "submitButton", label: "زر الإرسال الأساسي" },
      { key: "submitting", label: "نص زر الإرسال أثناء الحفظ" },
      { key: "uploadingDrive", label: "نص رفع المرفقات لجوجل درايف" },
      { key: "requiredBadge", label: "شارة حقل مطلوب" },
      { key: "optionalBadge", label: "شارة حقل اختياري" },
      { key: "selectOption", label: "نص اختيار من الخيارات" },
      { key: "uploadFilePrompt", label: "نص مساحة سحب وإفلات الملف" },
      { key: "openCamera", label: "زر فتح الكاميرا المباشرة" },
      { key: "fileSizeLimit", label: "تلميح حد حجم الملف وأنواعه" }
    ]
  },
  {
    id: "validation",
    title: "رسائل التحقق والتنبيهات",
    keys: [
      { key: "validationErrorTitle", label: "عنوان تنبيه حقول غير مكتملة" },
      { key: "fieldRequired", label: "رسالة خطأ حقل إجباري فارغ" },
      { key: "emailInvalid", label: "رسالة خطأ بريد غير صحيح" },
      { key: "phoneInvalid", label: "رسالة خطأ رقم هاتف غير صحيح" }
    ]
  },
  {
    id: "receipt",
    title: "إيصال ووصل التسجيل الناجح",
    keys: [
      { key: "successTitle", label: "عنوان نجاح التسجيل" },
      { key: "successDesc", label: "وصف نجاح التسجيل وتوليد الرقم" },
      { key: "refNumber", label: "عنوان الرقم المرجعي للتسجيل" },
      { key: "copyRef", label: "زر نسخ الرقم المرجعي" },
      { key: "refCopied", label: "رسالة تم نسخ الرقم المرجعي" },
      { key: "shareWhatsApp", label: "زر مشاركة الإشعار واتساب" },
      { key: "connectTelegram", label: "زر تفعيل بوت تلغرام" },
      { key: "printReceipt", label: "زر طباعة أو تصدير PDF" },
      { key: "newSubmission", label: "زر تسجيل مشترك جديد" },
      { key: "summaryTitle", label: "عنوان ملخص بيانات المشترك" }
    ]
  }
];

export const TranslationSettingsTab: React.FC<TranslationSettingsTabProps> = ({
  questions,
  onTranslationsUpdated
}) => {
  const [subTab, setSubTab] = useState<"questions" | "ui">("questions");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | number | null>(null);

  // Question translations state
  const [questionTranslations, setQuestionTranslations] = useState<FormTranslationsMap>(() => {
    return getCustomQuestionTranslations();
  });

  // UI translations state
  const [uiTranslations, setUiTranslations] = useState<Record<FormLang, Record<string, string>>>(() => {
    return getCustomUiTranslations();
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [translatingKeys, setTranslatingKeys] = useState<Record<string, boolean>>({});

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Update a single question's translation field
  const handleUpdateQuestionTranslation = (
    questionText: string,
    field: keyof QuestionTranslation,
    val: string | string[]
  ) => {
    const trimmed = questionText.trim();
    setQuestionTranslations((prev) => {
      const existing = prev[trimmed] || getEffectiveQuestionTranslation(trimmed);
      return {
        ...prev,
        [trimmed]: {
          ...existing,
          [field]: val
        }
      };
    });
  };

  // Batch update multiple fields for a question to prevent race conditions
  const handleUpdateQuestionTranslationBatch = (
    questionText: string,
    updates: Partial<QuestionTranslation>
  ) => {
    const trimmed = questionText.trim();
    setQuestionTranslations((prev) => {
      const existing = prev[trimmed] || getEffectiveQuestionTranslation(trimmed);
      return {
        ...prev,
        [trimmed]: {
          ...existing,
          ...updates
        }
      };
    });
  };

  // Update a UI text translation
  const handleUpdateUiText = (lang: FormLang, key: string, val: string) => {
    setUiTranslations((prev) => {
      return {
        ...prev,
        [lang]: {
          ...(prev[lang] || {}),
          [key]: val
        }
      };
    });
  };

  // AI translate single field
  const handleAiTranslateSingle = async (
    sourceText: string,
    targetLang: "en" | "th",
    trackingKey: string,
    onSuccess: (result: string) => void,
    contextInfo?: string
  ) => {
    if (!sourceText || !sourceText.trim()) {
      showNotification("⚠️ النص العربي فارغ، يرجى كتابته أولاً لتتم ترجمته.");
      return;
    }

    setTranslatingKeys((prev) => ({ ...prev, [trackingKey]: true }));
    try {
      const translation = await translateWithAi(sourceText, targetLang, contextInfo);
      if (translation) {
        onSuccess(translation);
        showNotification(`✅ تمت الترجمة إلى ${targetLang === "th" ? "التايلاندية (ภาษาไทย)" : "الإنجليزية (EN)"} بنجاح: "${translation}"`);
      }
    } catch (err: any) {
      showNotification(`⚠️ تعذر إتمام الترجمة: ${err.message || "تأكد من الاتصال"}`);
    } finally {
      setTranslatingKeys((prev) => ({ ...prev, [trackingKey]: false }));
    }
  };

  // AI translate an entire question (Title + Description + Button to EN & TH) with atomic state commit
  const handleAiTranslateWholeQuestion = async (q: RegistrationQuestion) => {
    const qKey = q.question.trim();
    setTranslatingKeys((prev) => ({ ...prev, [`all_${qKey}`]: true }));

    try {
      const updates: Partial<QuestionTranslation> = {};

      // 1. Question Title to EN & TH
      const [titleEn, titleTh] = await Promise.all([
        translateWithAi(q.question, "en", "Form question label").catch(() => ""),
        translateWithAi(q.question, "th", "Form question label").catch(() => "")
      ]);
      if (titleEn) updates.questionEn = titleEn;
      if (titleTh) updates.questionTh = titleTh;

      // 2. Question Description to EN & TH
      if (q.description) {
        const [descEn, descTh] = await Promise.all([
          translateWithAi(q.description, "en", "Question hint / description").catch(() => ""),
          translateWithAi(q.description, "th", "Question hint / description").catch(() => "")
        ]);
        if (descEn) updates.descriptionEn = descEn;
        if (descTh) updates.descriptionTh = descTh;
      }

      // 3. Button label if applicable
      const isButtonType = q.type === "button_title" || q.type === "عنوان زر";
      if (isButtonType && q.buttonTitle) {
        const [btnEn, btnTh] = await Promise.all([
          translateWithAi(q.buttonTitle, "en", "Action button label").catch(() => ""),
          translateWithAi(q.buttonTitle, "th", "Action button label").catch(() => "")
        ]);
        if (btnEn) updates.buttonTitleEn = btnEn;
        if (btnTh) updates.buttonTitleTh = btnTh;
      }

      handleUpdateQuestionTranslationBatch(q.question, updates);
      showNotification(`✨ تمت ترجمة سؤال "${q.question}" بالكامل بالذكاء الاصطناعي (English + ภาษาไทย)!`);
    } catch (err: any) {
      showNotification(`⚠️ حدث خطأ أثناء الترجمة: ${err.message || "تحقق من الاتصال"}`);
    } finally {
      setTranslatingKeys((prev) => ({ ...prev, [`all_${qKey}`]: false }));
    }
  };

  // Translate ALL questions sequentially to English and Thai
  const [isTranslatingAllQuestions, setIsTranslatingAllQuestions] = useState(false);
  const [translatingAllProgress, setTranslatingAllProgress] = useState("");

  const handleTranslateAllQuestions = async () => {
    if (questions.length === 0) return;
    setIsTranslatingAllQuestions(true);
    let successCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      setTranslatingAllProgress(`جاري ترجمة (${i + 1} من ${questions.length}): "${q.question.slice(0, 20)}..."`);
      try {
        await handleAiTranslateWholeQuestion(q);
        successCount++;
      } catch (err) {
        console.error("Batch translate item failed:", err);
      }
    }

    setIsTranslatingAllQuestions(false);
    setTranslatingAllProgress("");
    showNotification(`🎉 اكتملت ترجمة جميع الأسئلة (${successCount} سؤال) إلى الإنجليزية والتايلاندية بنجاح!`);
  };

  // Save changes
  const handleSaveAll = () => {
    saveCustomQuestionTranslations(questionTranslations);
    saveCustomUiTranslations(uiTranslations);
    onTranslationsUpdated();
    showNotification("تم حفظ جميع الترجمات والنصوص بنجاح! تم تحديث الاستمارة فورياً.");
  };

  // Reset to defaults
  const handleReset = () => {
    if (window.confirm("هل أنت متأكد من استعادة جميع الترجمات والنصوص إلى حالتها الافتراضية؟")) {
      resetAllTranslationsToDefaults();
      setQuestionTranslations({});
      setUiTranslations({ ar: {}, en: {}, th: {} });
      onTranslationsUpdated();
      showNotification("تمت استعادة الترجمات والنصوص الافتراضية بنجاح.");
    }
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const query = searchQuery.toLowerCase();
    return questions.filter((q) => {
      const eff = getEffectiveQuestionTranslation(q.question);
      const customForQ = questionTranslations[q.question.trim()] || {};
      const enTitle = customForQ.questionEn || eff.questionEn || "";
      const thTitle = customForQ.questionTh || eff.questionTh || "";
      const enDesc = customForQ.descriptionEn || eff.descriptionEn || "";
      const thDesc = customForQ.descriptionTh || eff.descriptionTh || "";

      return (
        q.question.toLowerCase().includes(query) ||
        (q.description && q.description.toLowerCase().includes(query)) ||
        enTitle.toLowerCase().includes(query) ||
        thTitle.toLowerCase().includes(query) ||
        enDesc.toLowerCase().includes(query) ||
        thDesc.toLowerCase().includes(query)
      );
    });
  }, [questions, searchQuery, questionTranslations]);

  // Filtered UI categories based on search
  const filteredUiCategories = useMemo(() => {
    if (!searchQuery.trim()) return UI_CATEGORIES;
    const query = searchQuery.toLowerCase();

    return UI_CATEGORIES.map((cat) => {
      const matchedKeys = cat.keys.filter(({ key, label }) => {
        const arVal = uiTranslations.ar[key] || UI_TRANSLATIONS.ar[key as keyof typeof UI_TRANSLATIONS.ar] || "";
        const enVal = uiTranslations.en[key] || UI_TRANSLATIONS.en[key as keyof typeof UI_TRANSLATIONS.en] || "";
        const thVal = uiTranslations.th[key] || UI_TRANSLATIONS.th[key as keyof typeof UI_TRANSLATIONS.th] || "";

        return (
          label.toLowerCase().includes(query) ||
          key.toLowerCase().includes(query) ||
          arVal.toLowerCase().includes(query) ||
          enVal.toLowerCase().includes(query) ||
          thVal.toLowerCase().includes(query)
        );
      });

      return {
        ...cat,
        keys: matchedKeys
      };
    }).filter((cat) => cat.keys.length > 0);
  }, [searchQuery, uiTranslations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Success Notification Alert */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Top Banner with Actions */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/80 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-700" />
            <h4 className="font-bold text-slate-900 text-sm">
              مدير ترجمة نصوص الاستمارة (عربي • English • ภาษาไทย)
            </h4>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            يمكنك ترجمة الأسئلة والنصوص يدوياً أو بنقرة زر واحدة عبر الذكاء الاصطناعي التوليدي، مع حفظ دائم وفوري.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleReset}
            title="استعادة الترجمات الافتراضية"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ الترجمات</span>
          </button>
        </div>
      </div>

      {/* Subtabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        {/* Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("questions")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "questions"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ترجمة أسئلة الاستمارة ({questions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("ui")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === "ui"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>ترجمة نصوص الواجهة والأزرار</span>
          </button>
        </div>

        {/* Universal Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              subTab === "questions"
                ? "بحث في نصوص وترجمات الأسئلة..."
                : "بحث في نصوص وأزرار الواجهة..."
            }
            className="w-full pr-8 pl-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: QUESTIONS TRANSLATIONS */}
      {subTab === "questions" && (
        <div className="space-y-3">
          {/* Quick AI Translate All Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">
                  ترجمة جميع الأسئلة بالذكاء الاصطناعي (English + ภาษาไทย)
                </h5>
                <p className="text-[11px] text-slate-600">
                  يقوم الذكاء الاصطناعي بصياغة ترجمات دقيقة واحترافية لكافة الأسئلة والشروحات والأزرار دفعة واحدة.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isTranslatingAllQuestions || questions.length === 0}
              onClick={handleTranslateAllQuestions}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              {isTranslatingAllQuestions ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{translatingAllProgress || "جاري ترجمة الأسئلة..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>ترجمة كافة الأسئلة تلقائياً (EN + TH)</span>
                </>
              )}
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              لم يتم العثور على أي سؤال يطابق عبارة البحث «{searchQuery}».
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const eff = getEffectiveQuestionTranslation(q.question);
              const customForQ = questionTranslations[q.question.trim()] || {};
              const isExpanded = expandedQuestionId === q.id || filteredQuestions.length <= 3;

              const valQuestionEn = customForQ.questionEn !== undefined ? customForQ.questionEn : (eff.questionEn || "");
              const valQuestionTh = customForQ.questionTh !== undefined ? customForQ.questionTh : (eff.questionTh || "");
              const valDescEn = customForQ.descriptionEn !== undefined ? customForQ.descriptionEn : (eff.descriptionEn || "");
              const valDescTh = customForQ.descriptionTh !== undefined ? customForQ.descriptionTh : (eff.descriptionTh || "");
              const valBtnEn = customForQ.buttonTitleEn !== undefined ? customForQ.buttonTitleEn : (eff.buttonTitleEn || "");
              const valBtnTh = customForQ.buttonTitleTh !== undefined ? customForQ.buttonTitleTh : (eff.buttonTitleTh || "");

              const isButtonType = q.type === "button_title" || q.type === "عنوان زر";
              const qKey = q.question.trim();
              const isTranslatingAll = translatingKeys[`all_${qKey}`];

              return (
                <div
                  key={q.id || idx}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-2xs hover:border-slate-300"
                >
                  {/* Question Header Card */}
                  <div
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer bg-slate-50/70 hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {q.question}
                          </h5>
                          {q.required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold border border-rose-200">
                              مطلوب
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono">
                            {q.type}
                          </span>
                        </div>
                        {q.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {q.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Whole Question AI Translate button */}
                      <button
                        type="button"
                        disabled={isTranslatingAll}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAiTranslateWholeQuestion(q);
                        }}
                        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        title="ترجمة السؤال بالكامل إلى الإنجليزية والتايلاندية بالذكاء الاصطناعي"
                      >
                        {isTranslatingAll ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>ترجمة السؤال بالكامل AI</span>
                      </button>

                      {/* Language Availability Indicator */}
                      <div className="hidden md:flex items-center gap-1.5 text-[11px]">
                        <span className={`px-2 py-0.5 rounded ${valQuestionEn ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-400"}`}>
                          EN {valQuestionEn ? "✓" : "—"}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${valQuestionTh ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-400"}`}>
                          TH {valQuestionTh ? "✓" : "—"}
                        </span>
                      </div>

                      <div className="p-1 text-slate-400 hover:text-slate-700 rounded">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Translation Fields */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                      {/* Mobile whole question AI button */}
                      <div className="sm:hidden">
                        <button
                          type="button"
                          disabled={isTranslatingAll}
                          onClick={() => handleAiTranslateWholeQuestion(q)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          {isTranslatingAll ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>ترجمة السؤال بالكامل بالذكاء الاصطناعي (EN + TH)</span>
                        </button>
                      </div>

                      {/* 1. English Fields */}
                      <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                            <span>🇬🇧 الترجمة الإنجليزية (English):</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Title EN */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Question Title (English)
                              </label>
                              <button
                                type="button"
                                disabled={translatingKeys[`q_en_${qKey}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    q.question,
                                    "en",
                                    `q_en_${qKey}`,
                                    (val) => handleUpdateQuestionTranslation(q.question, "questionEn", val),
                                    "Form question title"
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded transition-colors"
                                title="ترجمة هذا الحقل بالذكاء الاصطناعي"
                              >
                                {translatingKeys[`q_en_${qKey}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={valQuestionEn}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "questionEn", e.target.value)
                              }
                              placeholder="e.g. Full Name"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Description EN */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Description / Hint (English)
                              </label>
                              {q.description && (
                                <button
                                  type="button"
                                  disabled={translatingKeys[`q_desc_en_${qKey}`]}
                                  onClick={() =>
                                    handleAiTranslateSingle(
                                      q.description || "",
                                      "en",
                                      `q_desc_en_${qKey}`,
                                      (val) => handleUpdateQuestionTranslation(q.question, "descriptionEn", val),
                                      "Question hint / description"
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded transition-colors"
                                  title="ترجمة الوصف بالذكاء الاصطناعي"
                                >
                                  {translatingKeys[`q_desc_en_${qKey}`] ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-2.5 h-2.5" />
                                  )}
                                  <span>ترجمة AI</span>
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={valDescEn}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "descriptionEn", e.target.value)
                              }
                              placeholder="e.g. Write your full name as in ID"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Button title if applicable */}
                        {isButtonType && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Button Label (English)
                              </label>
                              <button
                                type="button"
                                disabled={translatingKeys[`q_btn_en_${qKey}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    q.buttonTitle || q.question,
                                    "en",
                                    `q_btn_en_${qKey}`,
                                    (val) => handleUpdateQuestionTranslation(q.question, "buttonTitleEn", val),
                                    "Action button label"
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded transition-colors"
                              >
                                {translatingKeys[`q_btn_en_${qKey}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={valBtnEn}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "buttonTitleEn", e.target.value)
                              }
                              placeholder="e.g. Open PDF Document"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. Thai Fields */}
                      <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                            <span>🇹🇭 الترجمة التايلاندية (ภาษาไทย):</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Title TH */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Question Title (Thai)
                              </label>
                              <button
                                type="button"
                                disabled={translatingKeys[`q_th_${qKey}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    q.question,
                                    "th",
                                    `q_th_${qKey}`,
                                    (val) => handleUpdateQuestionTranslation(q.question, "questionTh", val),
                                    "Form question title"
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded transition-colors"
                                title="ترجمة هذا الحقل بالذكاء الاصطناعي"
                              >
                                {translatingKeys[`q_th_${qKey}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={valQuestionTh}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "questionTh", e.target.value)
                              }
                              placeholder="เช่น ชื่อ-นามสกุล"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Description TH */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Description / Hint (Thai)
                              </label>
                              {q.description && (
                                <button
                                  type="button"
                                  disabled={translatingKeys[`q_desc_th_${qKey}`]}
                                  onClick={() =>
                                    handleAiTranslateSingle(
                                      q.description || "",
                                      "th",
                                      `q_desc_th_${qKey}`,
                                      (val) => handleUpdateQuestionTranslation(q.question, "descriptionTh", val),
                                      "Question hint / description"
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded transition-colors"
                                  title="ترجمة الوصف بالذكاء الاصطناعي"
                                >
                                  {translatingKeys[`q_desc_th_${qKey}`] ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-2.5 h-2.5" />
                                  )}
                                  <span>ترجمة AI</span>
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={valDescTh}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "descriptionTh", e.target.value)
                              }
                              placeholder="เช่น กรุณาระบุชื่อตามบัตรประชาชน"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        {/* Button label TH if applicable */}
                        {isButtonType && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Button Label (Thai)
                              </label>
                              <button
                                type="button"
                                disabled={translatingKeys[`q_btn_th_${qKey}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    q.buttonTitle || q.question,
                                    "th",
                                    `q_btn_th_${qKey}`,
                                    (val) => handleUpdateQuestionTranslation(q.question, "buttonTitleTh", val),
                                    "Action button label"
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded transition-colors"
                              >
                                {translatingKeys[`q_btn_th_${qKey}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={valBtnTh}
                              onChange={(e) =>
                                handleUpdateQuestionTranslation(q.question, "buttonTitleTh", e.target.value)
                              }
                              placeholder="เช่น เปิดดูเอกสาร PDF"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 2: UI INTERFACE TEXTS */}
      {subTab === "ui" && (
        <div className="space-y-6">
          {filteredUiCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              لم يتم العثور على أي نصوص واجهة تطابق عبارة البحث «{searchQuery}».
            </div>
          ) : (
            filteredUiCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4"
              >
                <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{cat.title}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {cat.keys.length}
                  </span>
                </h5>

                <div className="space-y-4">
                  {cat.keys.map(({ key, label }) => {
                    const arDefault = UI_TRANSLATIONS.ar[key as keyof typeof UI_TRANSLATIONS.ar] || "";
                    const enDefault = UI_TRANSLATIONS.en[key as keyof typeof UI_TRANSLATIONS.en] || "";
                    const thDefault = UI_TRANSLATIONS.th[key as keyof typeof UI_TRANSLATIONS.th] || "";

                    const currentAr = uiTranslations.ar[key] !== undefined ? uiTranslations.ar[key] : arDefault;
                    const currentEn = uiTranslations.en[key] !== undefined ? uiTranslations.en[key] : enDefault;
                    const currentTh = uiTranslations.th[key] !== undefined ? uiTranslations.th[key] : thDefault;

                    return (
                      <div key={key} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">{label}</span>
                          <span className="text-[10px] font-mono text-slate-400">{key}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {/* Arabic */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">
                              العربية (AR):
                            </span>
                            <input
                              type="text"
                              value={currentAr}
                              onChange={(e) => handleUpdateUiText("ar", key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* English */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-blue-600">
                                English (EN):
                              </span>
                              <button
                                type="button"
                                disabled={translatingKeys[`ui_en_${key}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    currentAr || label,
                                    "en",
                                    `ui_en_${key}`,
                                    (val) => handleUpdateUiText("en", key, val),
                                    `UI label or button: ${label}`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                                title="ترجمة بالذكاء الاصطناعي من النص العربي"
                              >
                                {translatingKeys[`ui_en_${key}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={currentEn}
                              onChange={(e) => handleUpdateUiText("en", key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Thai */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-amber-700">
                                ภาษาไทย (TH):
                              </span>
                              <button
                                type="button"
                                disabled={translatingKeys[`ui_th_${key}`]}
                                onClick={() =>
                                  handleAiTranslateSingle(
                                    currentAr || label,
                                    "th",
                                    `ui_th_${key}`,
                                    (val) => handleUpdateUiText("th", key, val),
                                    `UI label or button: ${label}`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded transition-colors"
                                title="ترجمة بالذكاء الاصطناعي من النص العربي"
                              >
                                {translatingKeys[`ui_th_${key}`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>ترجمة AI</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={currentTh}
                              onChange={(e) => handleUpdateUiText("th", key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Save Reminder */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          💡 لا تنس النقر على «حفظ الترجمات» لتثبيت أي تعديلات قمت بها.
        </p>
        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          <span>حفظ الترجمات الآن</span>
        </button>
      </div>
    </div>
  );
};
