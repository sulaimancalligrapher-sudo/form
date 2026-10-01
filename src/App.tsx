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
import { AdminDashboard } from "./components/AdminDashboard";
import {
  AdminLoginModal,
  isAdminLoggedIn,
  setAdminLoggedIn
} from "./components/AdminLoginModal";
import {
  getEffectiveUiTranslations,
  getEffectiveQuestionTranslation,
  getCustomQuestionTranslations,
  saveCustomQuestionTranslations
} from "./utils/translationStorage";
import { translateWithAi } from "./utils/aiTranslator";
import { SubscriberCard } from "./components/SubscriberCard";
import {
  detectSubscriberSession,
  saveSubscriberSession,
  clearSubscriberSession,
  SubscriberData
} from "./utils/subscriberSession";
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
  fetchFormQuestionsBridge,
  extractScoreFromAnswer,
  isScoredQuestionType,
  verifySubscriberInSheetBridge
} from "./utils/googleBackendBridge";
import { analyzeSubscriberAnswers, getAnalysisSettings } from "./utils/aiAnalyzer";
import {
  getActiveSurveyIdFromUrl,
  getSurveyById,
  getSheetNamesForSurvey
} from "./utils/surveyManager";
import {
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  Lock
} from "lucide-react";

export default function App() {
  const [currentLang, setCurrentLang] = useState<FormLang>("ar");
  const [activeSurveyId, setActiveSurveyId] = useState<number>(() => getActiveSurveyIdFromUrl());
  const [questions, setQuestions] = useState<RegistrationQuestion[]>(DEFAULT_FORM_QUESTIONS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to check if current URL is the private Admin URL (/admin, ?admin, #admin)
  const checkUrlHasAdmin = useCallback(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.includes("/admin") ||
      hash.includes("admin") ||
      search.includes("view=admin") ||
      search.includes("admin")
    );
  }, []);

  // Admin authentication & login modal state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isAdminLoggedIn());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const isUrlAdmin =
        path.includes("/admin") ||
        hash.includes("admin") ||
        search.includes("view=admin") ||
        search.includes("admin");
      if (isUrlAdmin && !isAdminLoggedIn()) {
        return true;
      }
    }
    return false;
  });

  // View Router: "form" (default public form or admin-unlocked form header) or "admin" (Admin Dashboard)
  const [currentView, setCurrentView] = useState<"form" | "admin">("form");

  // Keep route synced with browser back/forward and hash changes
  useEffect(() => {
    const handlePopState = () => {
      setActiveSurveyId(getActiveSurveyIdFromUrl());
      if (checkUrlHasAdmin()) {
        if (!isAdminLoggedIn()) {
          setIsAdminLoginModalOpen(true);
          setCurrentView("form");
        }
      } else {
        setCurrentView("form");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, [checkUrlHasAdmin]);

  const openAdminRoute = () => {
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/admin");
    }
    if (isAdminAuthenticated) {
      setCurrentView("admin");
    } else {
      setIsAdminLoginModalOpen(true);
    }
  };

  const navigateToAdmin = () => {
    if (!isAdminAuthenticated) {
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", "/admin");
      }
      setIsAdminLoginModalOpen(true);
      return;
    }
    setCurrentView("admin");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/admin");
    }
  };

  const navigateToForm = (targetSurveyId?: number) => {
    if (targetSurveyId && targetSurveyId >= 1) {
      setActiveSurveyId(targetSurveyId);
      setAnswers({});
      setErrors({});
      setIsSuccess(false);
      if (typeof window !== "undefined") {
        const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, "") || "/";
        window.history.pushState(null, "", `${cleanPath}?survey=${targetSurveyId}`);
      }
    }
    setCurrentView("form");
  };

  const handleAdminLogout = () => {
    setAdminLoggedIn(false);
    setIsAdminAuthenticated(false);
    setIsSettingsOpen(false);
    setCurrentView("form");
    if (typeof window !== "undefined") {
      const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, "") || "/";
      window.history.pushState(null, "", cleanPath);
    }
  };

  // Subscriber Identity State (from URL, localStorage, cookies, or manual input/QR scan)
  const [subscriber, setSubscriber] = useState<SubscriberData | null>(null);
  const [manualSubId, setManualSubId] = useState("");
  const [manualSubName, setManualSubName] = useState("");
  const [subscriberError, setSubscriberError] = useState<string | null>(null);
  const [isSubscriberVerified, setIsSubscriberVerified] = useState<boolean>(false);
  const [isVerifyingSubscriber, setIsVerifyingSubscriber] = useState<boolean>(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleVerifyAndSaveSubscriber = useCallback(
    async (id: string, name: string, customScriptUrl?: string, customSheetId?: string) => {
      const cleanId = id.trim();
      const cleanName = name.trim();
      if (!cleanId || !cleanName) {
        setIsSubscriberVerified(false);
        return;
      }

      setIsVerifyingSubscriber(true);
      setSubscriberError(null);

      try {
        const check = await verifySubscriberInSheetBridge(
          cleanId,
          cleanName,
          customScriptUrl || getActiveScriptUrl(),
          customSheetId || getActiveSpreadsheetId(),
          activeSurveyId
        );

        if (check.valid && check.status === "ok") {
          const finalId = check.subscriber?.studentId || cleanId;
          const finalName = check.subscriber?.studentName || cleanName;
          const saved = saveSubscriberSession(finalId, finalName, "manual");
          setSubscriber(saved);
          setManualSubId(finalId);
          setManualSubName(finalName);
          setIsSubscriberVerified(true);
          setAlreadyAnswered(false);
          setSubscriberError(null);
        } else if (check.status === "already_answered") {
          const finalId = check.subscriber?.studentId || cleanId;
          const finalName = check.subscriber?.studentName || cleanName;
          setSubscriber({ id: finalId, name: finalName, source: "manual" });
          setManualSubId(finalId);
          setManualSubName(finalName);
          setIsSubscriberVerified(false);
          setAlreadyAnswered(true);
          setSubscriberError(check.message);
        } else {
          setIsSubscriberVerified(false);
          setAlreadyAnswered(false);
          setSubscriberError(check.message);
        }
      } catch (err) {
        setIsSubscriberVerified(false);
        setSubscriberError("تعذر التحقق من سجل المشتركين، يرجى المحاولة مرة أخرى.");
      } finally {
        setIsVerifyingSubscriber(false);
      }
    },
    [activeSurveyId]
  );

  // Auto-detect subscriber session on mount and verify against المشتركين sheet
  useEffect(() => {
    const session = detectSubscriberSession();
    if (session && session.id && session.name) {
      setManualSubId(session.id);
      setManualSubName(session.name);
      handleVerifyAndSaveSubscriber(session.id, session.name);
    }
  }, [handleVerifyAndSaveSubscriber]);

  const handleClearSubscriber = () => {
    clearSubscriberSession();
    setSubscriber(null);
    setManualSubId("");
    setManualSubName("");
    setIsSubscriberVerified(false);
    setAlreadyAnswered(false);
    setSubscriberError(null);
    setAnswers({});
    setErrors({});
  };

  // Helper: check if a question is asking for subscriber identity
  const isIdentityQuestion = useCallback((q: RegistrationQuestion) => {
    const text = (q.question || "").trim().toLowerCase();
    return (
      text === "الاسم" ||
      text === "اسمك" ||
      text === "الاسم الكامل" ||
      text === "اسم المشترك" ||
      text === "اسم الطالب" ||
      text === "full name" ||
      text === "name" ||
      text === "رقم المشترك" ||
      text === "رقم التسجيل" ||
      text === "رقم القيد" ||
      text === "subscriber id" ||
      text === "id"
    );
  }, []);

  // Filter out redundant name/ID fields since the Subscriber Card handles them exclusively
  const displayedQuestions = useMemo(() => {
    return questions.filter((q) => !isIdentityQuestion(q));
  }, [questions, isIdentityQuestion]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    timestamp: string;
    name: string;
    phone?: string;
    email?: string;
    answersList: Array<{ question: string; answer: string }>;
  } | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(getActiveSpreadsheetId());
  const [scriptUrl, setScriptUrl] = useState(getActiveScriptUrl());
  const [driveFolderId, setDriveFolderId] = useState(getActiveDriveFolderId());
  const [telegramConfig, setTelegramConfigState] = useState<TelegramConfig>(getTelegramConfig());
  const [isRefreshingQuestions, setIsRefreshingQuestions] = useState(false);

  // Load questions dynamically from Google Sheet (RegistrationQuestions or RegistrationQuestions_N)
  const loadQuestions = useCallback(async (targetSheetId?: string, targetScriptUrl?: string, force = false) => {
    setIsRefreshingQuestions(true);
    try {
      const fetched = await fetchFormQuestionsBridge(
        targetScriptUrl || scriptUrl,
        targetSheetId || spreadsheetId,
        force,
        activeSurveyId
      );
      if (fetched && fetched.length > 0) {
        setQuestions(fetched);
      }
    } catch (err) {
      console.warn("Error fetching questions from Google Sheet:", err);
    } finally {
      setIsRefreshingQuestions(false);
    }
  }, [scriptUrl, spreadsheetId, activeSurveyId]);

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

  // Auto-translate any newly added Google Sheet questions/options on any device when switching to EN or TH
  useEffect(() => {
    if (currentLang === "ar" || questions.length === 0) return;
    let isCancelled = false;

    const autoTranslateMissing = async () => {
      const targetLang: "en" | "th" = currentLang === "th" ? "th" : "en";
      const titleField = targetLang === "th" ? "questionTh" : "questionEn";
      const optsField = targetLang === "th" ? "optionsTh" : "optionsEn";

      let updatedAny = false;
      const customMap = { ...getCustomQuestionTranslations() };

      for (const q of questions) {
        if (isCancelled) break;
        const qKey = (q.question || "").trim();
        if (!qKey) continue;

        const eff = {
          ...(q.translations || {}),
          ...getEffectiveQuestionTranslation(qKey, q.options)
        };

        const needsTitle = !eff[titleField] || !eff[titleField]?.trim();
        const rawOpts = q.options || [];
        const existingOpts = eff[optsField] || [];
        const needsOptions =
          rawOpts.length > 0 &&
          rawOpts.some((_, idx) => !existingOpts[idx] || !existingOpts[idx].trim());

        if (!needsTitle && !needsOptions) continue;

        const nextEntry = { ...(customMap[qKey] || eff) };

        if (needsTitle) {
          try {
            const trTitle = await translateWithAi(qKey, targetLang, "Form question label");
            if (trTitle && trTitle.trim() !== qKey) {
              nextEntry[titleField] = trTitle.trim();
              updatedAny = true;
            }
          } catch (e) {}
        }

        if (needsOptions && !isCancelled) {
          const newOptsArr = [...existingOpts];
          for (let i = 0; i < rawOpts.length; i++) {
            if (newOptsArr[i] && newOptsArr[i].trim()) continue;
            const cleanOpt = rawOpts[i].replace(/^\s*\d+\s*[-—–ـ:]\s*/, "").trim() || rawOpts[i].trim();
            try {
              const trOpt = await translateWithAi(cleanOpt, targetLang, "Form choice option");
              newOptsArr[i] = trOpt || cleanOpt;
              updatedAny = true;
            } catch (e) {
              newOptsArr[i] = cleanOpt;
            }
          }
          nextEntry[optsField] = newOptsArr;
        }

        customMap[qKey] = nextEntry;
      }

      if (updatedAny && !isCancelled) {
        saveCustomQuestionTranslations(customMap);
        setTranslationVersion((v) => v + 1);
      }
    };

    autoTranslateMissing();
    return () => {
      isCancelled = true;
    };
  }, [currentLang, questions]);

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

    // 1. Verify subscriber identity & verification status
    const currentId = (subscriber?.id || manualSubId).trim();
    const currentName = (subscriber?.name || manualSubName).trim();
    if (!currentId || !currentName || !isSubscriberVerified || alreadyAnswered) {
      setSubscriberError("يرجى إدخال رقم المشترك واسمك الصحيحين والتحقق منهما لفتح الاستبيان.");
      const cardEl = document.getElementById("subscriber-card-container");
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    // 2. Verify questions
    displayedQuestions.forEach((q) => {
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
    setSubmitError(null);
    setSubmissionProgress(t.submitting);

    const activeSubId = (subscriber?.id || manualSubId).trim();
    const activeSubName = (subscriber?.name || manualSubName).trim();
    let detectedPhone = "";
    let detectedEmail = "";

    // Double-check duplicate submission before sending for THIS survey
    const preCheck = await verifySubscriberInSheetBridge(
      activeSubId,
      activeSubName,
      scriptUrl,
      spreadsheetId,
      activeSurveyId
    );
    if (!preCheck.valid) {
      setIsSubmitting(false);
      setSubmissionProgress(null);
      if (preCheck.status === "already_answered") {
        setAlreadyAnswered(true);
        setIsSubscriberVerified(false);
      }
      setSubscriberError(preCheck.message);
      return;
    }

    // Format answers array: contains ONLY the actual question answers in strict order
    const formattedAnswers: Array<{ question: string; answer: string; type?: string; score?: number }> = [];
    let attachmentData = "";
    let totalScore = 0;
    let hasScoredQuestions = false;

    displayedQuestions.forEach((q) => {
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
      const isScored = isScoredQuestionType(q.type);
      let questionScore: number | undefined = undefined;

      if (isScored) {
        hasScoredQuestions = true;
        const pts = extractScoreFromAnswer(answerVal);
        totalScore += pts;
        questionScore = pts;
      }

      formattedAnswers.push({
        question: q.question,
        answer: answerVal,
        type: q.type,
        score: questionScore
      });

      const qLow = (q.question || "").toLowerCase().trim();
      if (!detectedPhone && (qType === "phone" || qLow.includes("هاتف") || qLow.includes("phone") || qLow.includes("واتساب"))) {
        detectedPhone = answerVal;
      }
      if (!detectedEmail && (qType === "email" || qLow.includes("ايميل") || qLow.includes("بريد") || qLow.includes("email"))) {
        detectedEmail = answerVal;
      }
      if (!attachmentData && qType === "file" && answerVal) {
        attachmentData = answerVal;
      }
    });

    // Combine all answers separated by " ||| " for Column E of المشتركين sheet
    // (Never put raw base64 data into combinedAnswers; submitRegistrationBridge will replace it with the Drive URL)
    const combinedAnswers = formattedAnswers
      .map((item) => {
        const raw = item.answer && item.answer.trim() ? item.answer.trim() : "-";
        if (raw.startsWith("data:") || raw.includes("base64,")) {
          return "[صورة مرفقة]";
        }
        return raw;
      })
      .join(" ||| ");

    // Run AI Analysis for this survey's columns in المشتركين sheet (for administration only)
    let aiAnalysisText = "";
    const analysisSettings = getAnalysisSettings(activeSurveyId);
    if (analysisSettings.autoAnalyzeOnSubmit) {
      try {
        const sanitizedAnswersForAi = formattedAnswers.map((item) => ({
          ...item,
          answer:
            item.answer && (item.answer.startsWith("data:") || item.answer.includes("base64,"))
              ? "[تم إرفاق صورة كتابة المشترك]"
              : item.answer
        }));
        aiAnalysisText = await analyzeSubscriberAnswers({
          studentId: activeSubId,
          studentName: activeSubName,
          totalScore,
          answers: sanitizedAnswersForAi,
          combinedAnswers,
          settings: analysisSettings
        });
      } catch (aiErr) {
        console.warn("AI analysis note:", aiErr);
      }
    }

    const { questionsSheetName, answersSheetName } = getSheetNamesForSurvey(activeSurveyId);

    try {
      const result = await submitRegistrationBridge({
        registrationId: activeSubId,
        subscriberId: activeSubId,
        name: activeSubName,
        phone: detectedPhone,
        email: detectedEmail,
        surveyId: activeSurveyId,
        questionsSheet: questionsSheetName,
        answersSheet: answersSheetName,
        answers: formattedAnswers,
        combinedAnswers,
        aiAnalysis: aiAnalysisText,
        totalScore,
        hasScoredQuestions,
        attachment: attachmentData,
        scriptUrl,
        spreadsheetId,
        driveFolderId,
        telegramConfig
      });

      setIsSubmitting(false);
      setSubmissionProgress(null);

      if (result && result.success) {
        setAlreadyAnswered(true);
        setIsSubscriberVerified(false);
        setSuccessData({
          id: result.registrationId || activeSubId,
          timestamp: result.timestamp || new Date().toLocaleString("ar-IQ"),
          name: activeSubName,
          answersList: formattedAnswers
        });
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitError(result?.error || "حدث خطأ أثناء الإرسال، يرجى إعادة المحاولة.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmissionProgress(null);
      setSubmitError("تعذر إرسال البيانات: " + (err?.message || ""));
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
  const inputQuestionsCount = displayedQuestions.filter((q) => {
    const type = (q.type || "").toLowerCase();
    return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(type);
  }).length;
  const progressPercent = Math.min(100, Math.round((answeredCount / (inputQuestionsCount || 1)) * 100));

  // If Admin View is active and authenticated, render full Admin Dashboard
  if (currentView === "admin" && isAdminAuthenticated) {
    return (
      <>
        <AdminDashboard
          questions={questions}
          onUpdateQuestions={(newQuestions) => {
            setQuestions(newQuestions);
            setTranslationVersion((v) => v + 1);
          }}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          onNavigateToForm={navigateToForm}
          onAdminLogout={handleAdminLogout}
          spreadsheetId={spreadsheetId}
          scriptUrl={scriptUrl}
          driveFolderId={driveFolderId}
          telegramConfig={telegramConfig}
          currentLang={currentLang}
        />

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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <FormHeader
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={navigateToAdmin}
        onRefreshQuestions={() => loadQuestions()}
        isRefreshing={isRefreshingQuestions}
        spreadsheetId={spreadsheetId}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogout={handleAdminLogout}
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
              {activeSurveyId > 1 && (
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <span>📋 {getSurveyById(activeSurveyId).title}</span>
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2.5">
                {activeSurveyId > 1 && currentLang === "ar"
                  ? getSurveyById(activeSurveyId).title
                  : t.formTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeSurveyId > 1 && currentLang === "ar" && getSurveyById(activeSurveyId).subtitle
                  ? getSurveyById(activeSurveyId).subtitle
                  : t.formSubtitle}
              </p>
            </div>

            {/* Subscriber Identity & Login Gate Card */}
            <div id="subscriber-card-container">
              <SubscriberCard
                subscriber={subscriber}
                isVerified={isSubscriberVerified}
                isVerifying={isVerifyingSubscriber}
                alreadyAnswered={alreadyAnswered}
                onVerifyAndSaveSubscriber={(id, name) =>
                  handleVerifyAndSaveSubscriber(id, name, scriptUrl, spreadsheetId)
                }
                onClearSubscriber={handleClearSubscriber}
                error={subscriberError}
                manualId={manualSubId}
                setManualId={(val) => {
                  setManualSubId(val);
                  if (subscriberError) setSubscriberError(null);
                }}
                manualName={manualSubName}
                setManualName={(val) => {
                  setManualSubName(val);
                  if (subscriberError) setSubscriberError(null);
                }}
                currentLang={currentLang}
              />
            </div>

            {/* Submit Error Banner */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Questionnaire is ONLY unlocked after Subscriber ID & Name are verified against المشتركين sheet */}
            {isSubscriberVerified && !alreadyAnswered ? (
              <>
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
                <form onSubmit={handleSubmit} noValidate className="space-y-4 animate-in fade-in duration-300">
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

                  {displayedQuestions.map((question, index) => (
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
                        <span>تشفير آمن للبيانات وتسجيل مباشر في صفك بورقة المشتركين</span>
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
              </>
            ) : !alreadyAnswered ? (
              <div className="bg-slate-100/80 border border-dashed border-slate-300 rounded-3xl p-8 text-center space-y-2.5 text-slate-500">
                <Lock className="w-8 h-8 mx-auto text-slate-400" />
                <h4 className="text-sm font-bold text-slate-700">
                  أسئلة الاستبيان مقفلة حالياً
                </h4>
                <p className="text-xs max-w-md mx-auto leading-relaxed">
                  يرجى إدخال <strong>رقم المشترك (Student ID)</strong> و<strong>الاسم الكامل (Student Name)</strong> في البطاقة أعلاه والضغط على <strong>«تحقق وفتح الاستبيان»</strong> لعرض الأسئلة والإجابة عليها.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.headerTitle || "مركز يوسف ذنون لتعليم الخط العربي أون لاين"}</span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {isAdminAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={navigateToAdmin}
                  className="text-slate-700 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>لوحة الإدارة</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  إعدادات الربط والشيت
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAdminRoute}
                title="بوابة الإدارة الخاصة (/admin)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Private Admin Login Modal (opens when visiting /admin) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setIsAdminLoginModalOpen(false);
        }}
        onCancel={() => {
          setIsAdminLoginModalOpen(false);
          if (typeof window !== "undefined") {
            const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, "") || "/";
            window.history.pushState(null, "", cleanPath);
          }
        }}
      />

      {/* Settings & Setup Guide Modal */}
      <SheetSettingsModal
        isOpen={isSettingsOpen && isAdminAuthenticated}
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
