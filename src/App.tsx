/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FormLang, RegistrationQuestion, TelegramConfig } from "./types";
import {
  DEFAULT_FORM_QUESTIONS,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SCRIPT_URL,
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_TELEGRAM_CONFIG,
  UI_TRANSLATIONS
} from "./data/defaultConfig";
import { FormHeader } from "./components/FormHeader";
import { FormField } from "./components/FormField";
import { SuccessReceipt } from "./components/SuccessReceipt";
import { SheetSettingsModal } from "./components/SheetSettingsModal";
import { getEffectiveUiTranslations } from "./utils/translationStorage";
import {
  getActiveSpreadsheetId,
  getActiveScriptUrl,
  getActiveDriveFolderId,
  getTelegramConfig,
  setActiveSpreadsheetId,
  setActiveScriptUrl,
  setActiveDriveFolderId,
  saveTelegramConfig,
  submitRegistrationBridge,
  fetchFormQuestionsBridge
} from "./utils/googleBackendBridge";
import {
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  ShieldCheck
} from "lucide-react";

export default function App() {
  const [currentLang, setCurrentLang] = useState<FormLang>("ar");
  const [questions, setQuestions] = useState<RegistrationQuestion[]>(DEFAULT_FORM_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    timestamp: string;
    name: string;
    phone: string;
    email: string;
    answersList: Array<{ question: string; answer: string }>;
  } | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(getActiveSpreadsheetId());
  const [scriptUrl, setScriptUrl] = useState(getActiveScriptUrl());
  const [driveFolderId, setDriveFolderId] = useState(getActiveDriveFolderId());
  const [telegramConfig, setTelegramConfigState] = useState<TelegramConfig>(getTelegramConfig());
  const [isRefreshingQuestions, setIsRefreshingQuestions] = useState(false);

  // Load questions dynamically from Google Sheet (RegistrationQuestions)
  const loadQuestions = useCallback(async (targetSheetId?: string, targetScriptUrl?: string) => {
    setIsRefreshingQuestions(true);
    try {
      const fetched = await fetchFormQuestionsBridge(
        targetScriptUrl || scriptUrl,
        targetSheetId || spreadsheetId
      );
      if (fetched && fetched.length > 0) {
        setQuestions(fetched);
      }
    } catch (err) {
      console.warn("Error fetching questions from Google Sheet:", err);
    } finally {
      setIsRefreshingQuestions(false);
    }
  }, [scriptUrl, spreadsheetId]);

  // Fetch questions on component mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Honeypot field for anti-bot
  const [honeypot, setHoneypot] = useState("");
  const formOpenedTimeRef = useRef<number>(Date.now());

  // Translation version to force reactive re-rendering on updates
  const [translationVersion, setTranslationVersion] = useState(0);

  // Update HTML dir and lang based on currentLang
  useEffect(() => {
    const html = document.documentElement;
    html.lang = currentLang;
    html.dir = currentLang === "ar" ? "rtl" : "ltr";
  }, [currentLang]);

  const t = useMemo(() => {
    return getEffectiveUiTranslations(currentLang);
  }, [currentLang, translationVersion]);

  const handleLanguageChange = (lang: FormLang) => {
    setCurrentLang(lang);
  };

  const handleAnswerChange = (questionId: string | number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: value
    }));

    // Clear error on input
    if (errors[String(questionId)]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[String(questionId)];
        return next;
      });
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    questions.forEach((q) => {
      const qType = (q.type || "text").toLowerCase().trim();
      // Skip non-input elements
      if (
        qType === "image_display" ||
        qType === "button_title" ||
        qType === "button_link" ||
        qType === "صورة" ||
        qType === "زر"
      ) {
        return;
      }

      const val = answers[String(q.id)]?.trim() || "";

      if (q.required && !val) {
        newErrors[String(q.id)] = t.fieldRequired;
        return;
      }

      if (val && qType === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          newErrors[String(q.id)] = t.emailInvalid;
        }
      }

      if (val && qType === "phone") {
        const cleanPhone = val.replace(/[\s\-\(\)]/g, "");
        if (cleanPhone.length < 6) {
          newErrors[String(q.id)] = t.phoneInvalid;
        }
      }
    });

    setErrors(newErrors);

    // If errors exist, scroll to first error field
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstErrorElement = document.getElementById(`field-container-${errorKeys[0]}`);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    return true;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot) {
      console.warn("Spam bot detected.");
      return;
    }

    // Minimum interaction time check (1.5s)
    if (Date.now() - formOpenedTimeRef.current < 1500) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionProgress(t.submitting);

    // Format answers array
    const formattedAnswers: Array<{ question: string; answer: string; type?: string }> = [];
    let subscriberName = "";
    let subscriberPhone = "";
    let subscriberEmail = "";
    let attachmentData = "";

    questions.forEach((q) => {
      const qType = (q.type || "text").toLowerCase().trim();
      if (
        qType === "image_display" ||
        qType === "button_title" ||
        qType === "button_link" ||
        qType === "صورة" ||
        qType === "زر"
      ) {
        return;
      }

      const answerVal = answers[String(q.id)] || "";
      formattedAnswers.push({
        question: q.question,
        answer: answerVal,
        type: q.type
      });

      const qLow = q.question.toLowerCase();
      if (!subscriberName && (qLow.includes("اسم") || qLow.includes("name"))) {
        subscriberName = answerVal;
      }
      if (!subscriberPhone && (qLow.includes("هاتف") || qLow.includes("phone") || qLow.includes("واتساب"))) {
        subscriberPhone = answerVal;
      }
      if (!subscriberEmail && (qLow.includes("ايميل") || qLow.includes("بريد") || qLow.includes("email"))) {
        subscriberEmail = answerVal;
      }
      if (!attachmentData && qType === "file" && answerVal) {
        attachmentData = answerVal;
      }
    });

    try {
      const result = await submitRegistrationBridge({
        name: subscriberName,
        nameArabic: answers["2"] || subscriberName,
        phone: subscriberPhone,
        email: subscriberEmail,
        answers: formattedAnswers,
        attachment: attachmentData,
        scriptUrl,
        spreadsheetId,
        driveFolderId,
        telegramConfig
      });

      setIsSubmitting(false);
      setSubmissionProgress(null);

      if (result && result.success) {
        setSuccessData({
          id: result.registrationId || `${Date.now().toString().slice(-8)}`,
          timestamp: result.timestamp || new Date().toLocaleString("ar-IQ"),
          name: subscriberName,
          phone: subscriberPhone,
          email: subscriberEmail,
          answersList: formattedAnswers
        });
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert(result?.error || "حدث خطأ أثناء الإرسال، يرجى إعادة المحاولة.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmissionProgress(null);
      alert("تعذر إرسال البيانات: " + err.message);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setErrors({});
    setIsSuccess(false);
    setSuccessData(null);
    formOpenedTimeRef.current = Date.now();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveSettings = (data: {
    spreadsheetId: string;
    scriptUrl: string;
    driveFolderId: string;
    telegramConfig: TelegramConfig;
  }) => {
    setActiveSpreadsheetId(data.spreadsheetId);
    setActiveScriptUrl(data.scriptUrl);
    setActiveDriveFolderId(data.driveFolderId);
    saveTelegramConfig(data.telegramConfig);

    setSpreadsheetId(data.spreadsheetId);
    setScriptUrl(data.scriptUrl);
    setDriveFolderId(data.driveFolderId);
    setTelegramConfigState(data.telegramConfig);

    // Re-fetch questions immediately for the new sheet credentials
    loadQuestions(data.spreadsheetId, data.scriptUrl);
  };

  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;
  const inputQuestionsCount = questions.filter((q) => {
    const type = (q.type || "").toLowerCase();
    return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(type);
  }).length;
  const progressPercent = Math.min(100, Math.round((answeredCount / (inputQuestionsCount || 1)) * 100));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <FormHeader
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshQuestions={() => loadQuestions()}
        isRefreshing={isRefreshingQuestions}
        spreadsheetId={spreadsheetId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        {isSuccess && successData ? (
          <SuccessReceipt
            registrationId={successData.id}
            timestamp={successData.timestamp}
            answers={successData.answersList}
            name={successData.name}
            phone={successData.phone}
            email={successData.email}
            currentLang={currentLang}
            onReset={handleReset}
          />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Form Hero Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2.5">
                {t.formTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.formSubtitle}
              </p>
            </div>

            {/* Validation Notice if errors */}
            {Object.keys(errors).length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold block">{t.validationErrorTitle}</span>
                  <span>يرجى استكمال الحقول المطلوبة باللون الأحمر أدناه للمتابعة.</span>
                </div>
              </div>
            )}

            {/* Form Fields Container */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Invisible Honeypot */}
              <input
                type="text"
                name="website_url_hp"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="sr-only"
                aria-hidden="true"
              />

              {questions.map((question, index) => (
                <FormField
                  key={`${question.id}-${translationVersion}`}
                  question={question}
                  index={index}
                  value={answers[String(question.id)] || ""}
                  error={errors[String(question.id)]}
                  currentLang={currentLang}
                  onChange={(val) => handleAnswerChange(question.id, val)}
                />
              ))}

              {/* Submit Button */}
              <div className="pt-4 sticky bottom-4 z-20">
                <div className="bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تشفير آمن للبيانات ومزامنة مباشرة مع الشيت</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base transition-all shadow-md active:scale-98 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{submissionProgress || t.submitting}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t.submitButton}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>مشروع استمارة تسجيل متكامل متصل بـ Google Sheets & Drive</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-emerald-700 hover:underline font-semibold"
            >
              دليل الربط وكود سكريبت
            </button>
            <span className="text-slate-300">|</span>
            <span>جاهز لـ GitHub و Vercel</span>
          </div>
        </div>
      </footer>

      {/* Settings & Setup Guide Modal */}
      <SheetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        spreadsheetId={spreadsheetId}
        scriptUrl={scriptUrl}
        driveFolderId={driveFolderId}
        telegramConfig={telegramConfig}
        currentLang={currentLang}
        questions={questions}
        onTranslationsUpdated={() => setTranslationVersion((v) => v + 1)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
