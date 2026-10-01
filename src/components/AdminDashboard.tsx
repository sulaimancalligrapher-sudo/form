import React, { useState, useEffect, useMemo } from "react";
import {
  RegistrationQuestion,
  SheetAnswerRecord,
  SheetAnswersData,
  TelegramConfig,
  FormLang,
  SubscriberRecord,
  SurveyDefinition,
  SubscriberSurveyResult
} from "../types";
import {
  fetchRegistrationAnswersBridge,
  fetchFormQuestionsBridge,
  fetchSubscribersSheetBridge,
  updateSubscriberRowBridge,
  saveSubscribersToSheetBridge
} from "../utils/googleBackendBridge";
import { analyzeSubscriberAnswers, getAnalysisSettings } from "../utils/aiAnalyzer";
import {
  getSurveysList,
  getSurveyPublicUrl,
  getSurveyToken,
  getSheetNamesForSurvey
} from "../utils/surveyManager";
import { SurveyWorkspacePanel } from "./SurveyWorkspacePanel";
import {
  LayoutDashboard,
  TableProperties,
  Plus,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  Download,
  Printer,
  Eye,
  Check,
  Share2,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  X,
  FileSpreadsheet,
  Layers,
  Users,
  Unlock,
  Loader2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon
} from "lucide-react";

interface AdminDashboardProps {
  questions: RegistrationQuestion[];
  onUpdateQuestions: (newQuestions: RegistrationQuestion[]) => void;
  onOpenSettingsModal: () => void;
  onNavigateToForm: (surveyId?: number) => void;
  onAdminLogout?: () => void;
  spreadsheetId: string;
  scriptUrl: string;
  driveFolderId: string;
  telegramConfig: TelegramConfig;
  currentLang: FormLang;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  questions,
  onUpdateQuestions,
  onOpenSettingsModal,
  onNavigateToForm,
  onAdminLogout,
  spreadsheetId,
  scriptUrl,
  currentLang
}) => {
  // Redesigned 3-section main navigation + share
  const [activeTab, setActiveTab] = useState<
    "subscribers" | "surveys_manager" | "answers" | "share"
  >("subscribers");

  // Multi-Survey list state
  const [surveysList, setSurveysList] = useState<SurveyDefinition[]>(() => getSurveysList());
  const [activeManagerSurveyId, setActiveManagerSurveyId] = useState<number>(1);
  const [activeAnswersSurveyId, setActiveAnswersSurveyId] = useState<number>(1);

  // Subscribers sheet (ورقة المشتركين) state
  const [subscribersList, setSubscribersList] = useState<SubscriberRecord[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState<boolean>(true);
  const [subscribersSearch, setSubscribersSearch] = useState<string>("");
  const [newSubId, setNewSubId] = useState<string>("");
  const [newSubName, setNewSubName] = useState<string>("");
  const [analyzingKey, setAnalyzingKey] = useState<string | null>(null);
  const [subscribersNotice, setSubscribersNotice] = useState<{ text: string; success: boolean } | null>(null);

  // Expanded survey button per subscriber row: { [studentId]: surveyId }
  const [expandedSubscriberSurvey, setExpandedSubscriberSurvey] = useState<Record<string, number>>({});

  // Full report modal for a subscriber + specific survey
  const [selectedSubscriberModal, setSelectedSubscriberModal] = useState<{
    subscriber: SubscriberRecord;
    surveyId: number;
  } | null>(null);

  // Cached questions per survey for answer reconstruction
  const [questionsBySurvey, setQuestionsBySurvey] = useState<Record<number, RegistrationQuestion[]>>({
    1: questions
  });

  // Answers log per survey
  const [answersData, setAnswersData] = useState<SheetAnswersData>({
    headers: [],
    records: []
  });
  const [loadingAnswers, setLoadingAnswers] = useState<boolean>(true);
  const [answersSearch, setAnswersSearch] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<SheetAnswerRecord | null>(null);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setQuestionsBySurvey((prev) => ({ ...prev, 1: questions }));
  }, [questions]);

  const showSubNotice = (text: string, success = true) => {
    setSubscribersNotice({ text, success });
    setTimeout(() => setSubscribersNotice(null), 4000);
  };

  const handleCopyText = (text: string, key: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Load subscribers from ورقة المشتركين (reads all 3-column survey blocks)
  const loadSubscribers = async (force = false) => {
    setLoadingSubscribers(true);
    try {
      const list = await fetchSubscribersSheetBridge(scriptUrl, spreadsheetId, force);
      setSubscribersList(list);
      setSurveysList(getSurveysList());
    } catch (e) {
      console.error("Failed to load subscribers sheet:", e);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  // Load answers for activeAnswersSurveyId
  const loadAnswers = async (sId: number = activeAnswersSurveyId) => {
    setLoadingAnswers(true);
    try {
      const data = await fetchRegistrationAnswersBridge(scriptUrl, spreadsheetId, sId);
      setAnswersData(data);
    } catch (e) {
      console.error("Failed to load answers:", e);
    } finally {
      setLoadingAnswers(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, [spreadsheetId, scriptUrl]);

  useEffect(() => {
    loadAnswers(activeAnswersSurveyId);
  }, [activeAnswersSurveyId, spreadsheetId, scriptUrl]);

  // Helper to get a subscriber's result for a specific surveyId
  const getSubSurveyResult = (sub: SubscriberRecord, sId: number): SubscriberSurveyResult => {
    if (sub.surveys && sub.surveys[sId]) {
      return sub.surveys[sId];
    }
    if (sId === 1) {
      return {
        surveyId: 1,
        totalScore: sub.totalScore ?? "",
        combinedAnswers: sub.combinedAnswers ?? "",
        aiAnalysis: sub.aiAnalysis ?? "",
        hasAnswered: Boolean(sub.hasAnswered)
      };
    }
    return {
      surveyId: sId,
      totalScore: "",
      combinedAnswers: "",
      aiAnalysis: "",
      hasAnswered: false
    };
  };

  // Helper to get column letters in المشتركين for a given surveyId
  const getSurveyColsLabel = (sId: number) => {
    const startCol = 4 + (sId - 1) * 3;
    const toLetter = (n: number) => {
      let s = "";
      let num = n;
      while (num > 0) {
        const mod = (num - 1) % 26;
        s = String.fromCharCode(65 + mod) + s;
        num = Math.floor((num - 1) / 26);
      }
      return s;
    };
    return `${toLetter(startCol)}-${toLetter(startCol + 1)}-${toLetter(startCol + 2)}`;
  };

  // Ensure questions for a survey are loaded when inspecting/analyzing a subscriber
  const ensureSurveyQuestions = async (sId: number): Promise<RegistrationQuestion[]> => {
    if (questionsBySurvey[sId] && questionsBySurvey[sId].length > 0) {
      return questionsBySurvey[sId];
    }
    const fetched = await fetchFormQuestionsBridge(scriptUrl, spreadsheetId, false, sId);
    setQuestionsBySurvey((prev) => ({ ...prev, [sId]: fetched }));
    return fetched;
  };

  // Toggle survey button click on a subscriber row
  const handleClickSubscriberSurveyBtn = async (sub: SubscriberRecord, sId: number) => {
    await ensureSurveyQuestions(sId);
    setExpandedSubscriberSurvey((prev) => {
      if (prev[sub.studentId] === sId) {
        const next = { ...prev };
        delete next[sub.studentId];
        return next;
      }
      return { ...prev, [sub.studentId]: sId };
    });
  };

  // Add new subscriber to ورقة المشتركين
  const handleAddSubscriber = async () => {
    const cleanId = newSubId.trim();
    const cleanName = newSubName.trim();
    if (!cleanId || !cleanName) {
      showSubNotice("يرجى إدخال رقم المشترك (Student ID) واسم المشترك (Student Name) لإضافته.", false);
      return;
    }

    const newRecord: SubscriberRecord = {
      rowIndex: subscribersList.length + 2,
      sequence: subscribersList.length + 1,
      studentId: cleanId,
      studentName: cleanName,
      totalScore: "",
      combinedAnswers: "",
      aiAnalysis: "",
      hasAnswered: false,
      surveys: {}
    };

    setSubscribersList((prev) => [...prev, newRecord]);
    setNewSubId("");
    setNewSubName("");

    await updateSubscriberRowBridge(
      cleanId,
      cleanName,
      {
        totalScore: "",
        combinedAnswers: "",
        aiAnalysis: "",
        hasAnswered: false
      },
      scriptUrl,
      1
    );

    showSubNotice(`تمت إضافة المشترك «${cleanName}» (رقم: ${cleanId}) إلى ورقة المشتركين بنجاح!`);
  };

  // Run or re-run AI analysis for a subscriber on a specific surveyId
  const handleAnalyzeSubscriberSurvey = async (sub: SubscriberRecord, sId: number) => {
    const key = `${sub.studentId}_${sId}`;
    setAnalyzingKey(key);
    try {
      const sRes = getSubSurveyResult(sub, sId);
      const sQuestions = await ensureSurveyQuestions(sId);
      const parts = (sRes.combinedAnswers || "")
        .split("|||")
        .map((s) => s.trim())
        .filter(Boolean);

      const inputQuestions = sQuestions.filter((q) => {
        const t = (q.type || "").toLowerCase();
        return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(t);
      });

      const reconstructedAnswers = parts.map((ans, idx) => ({
        question: inputQuestions[idx]?.question || `سؤال ${idx + 1}`,
        answer: ans
      }));

      const surveyAnalysisSettings = getAnalysisSettings(sId);
      const analysisText = await analyzeSubscriberAnswers({
        studentId: sub.studentId,
        studentName: sub.studentName,
        totalScore: sRes.totalScore,
        answers: reconstructedAnswers,
        combinedAnswers: sRes.combinedAnswers,
        settings: surveyAnalysisSettings
      });

      await updateSubscriberRowBridge(
        sub.studentId,
        sub.studentName,
        {
          totalScore: sRes.totalScore,
          combinedAnswers: sRes.combinedAnswers,
          aiAnalysis: analysisText,
          hasAnswered: sRes.hasAnswered
        },
        scriptUrl,
        sId
      );

      setSubscribersList((prev) =>
        prev.map((item) => {
          if (item.studentId !== sub.studentId) return item;
          const nextSurveys = {
            ...(item.surveys || {}),
            [sId]: {
              ...sRes,
              aiAnalysis: analysisText
            }
          };
          return {
            ...item,
            ...(sId === 1 ? { aiAnalysis: analysisText } : {}),
            surveys: nextSurveys
          };
        })
      );

      showSubNotice(`تم توليد وحفظ التحليل الذكي للاستبيان (${sId}) للمشترك «${sub.studentName}» بنجاح!`);
    } catch (e) {
      showSubNotice("تعذر إتمام التحليل الذكي حالياً، يرجى المحاولة مرة أخرى.", false);
    } finally {
      setAnalyzingKey(null);
    }
  };

  // Reset/Unlock a specific survey for a subscriber
  const handleResetSubscriberSurvey = async (sub: SubscriberRecord, sId: number) => {
    await updateSubscriberRowBridge(
      sub.studentId,
      sub.studentName,
      {
        totalScore: "",
        combinedAnswers: "",
        aiAnalysis: "",
        hasAnswered: false
      },
      scriptUrl,
      sId
    );

    setSubscribersList((prev) =>
      prev.map((item) => {
        if (item.studentId !== sub.studentId) return item;
        const nextSurveys = {
          ...(item.surveys || {}),
          [sId]: {
            surveyId: sId,
            totalScore: "",
            combinedAnswers: "",
            aiAnalysis: "",
            hasAnswered: false
          }
        };
        return {
          ...item,
          ...(sId === 1
            ? { totalScore: "", combinedAnswers: "", aiAnalysis: "", hasAnswered: false }
            : {}),
          surveys: nextSurveys
        };
      })
    );

    showSubNotice(`تمت إعادة فتح الاستبيان (${sId}) للمشترك «${sub.studentName}» ليتمكن من الإجابة مجدداً.`);
  };

  const filteredSubscribers = useMemo(() => {
    const q = subscribersSearch.trim().toLowerCase();
    if (!q) return subscribersList;
    return subscribersList.filter(
      (s) =>
        s.studentId.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q)
    );
  }, [subscribersList, subscribersSearch]);

  const filteredAnswerRecords = useMemo(() => {
    const q = answersSearch.trim().toLowerCase();
    if (!q) return answersData.records;
    return answersData.records.filter(
      (r) =>
        r.registrationId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        Object.values(r.answers || {}).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [answersData.records, answersSearch]);

  const handleExportAnswersCsv = () => {
    if (answersData.records.length === 0) return;
    const headers = answersData.headers.length > 0
      ? answersData.headers
      : ["التاريخ والوقت", "رقم التسجيل", "الاسم الكامل للمشترك", "مجموع النقاط"];
    const csvRows = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")
    ];
    filteredAnswerRecords.forEach((rec) => {
      const rowVals = headers.map((h, idx) => {
        let v = "";
        if (idx === 0) v = rec.timestamp;
        else if (idx === 1) v = rec.registrationId;
        else if (idx === 2) v = rec.name;
        else if (h === answersData.totalScoreHeader || h === "مجموع النقاط") v = String(rec.totalScore ?? "");
        else v = rec.answers[h] ?? rec.rawRow?.[h] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      csvRows.push(rowVals.join(","));
    });
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RegistrationAnswers_Survey_${activeAnswersSurveyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" dir="rtl">
      {/* TOP ADMIN HEADER */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>لوحة الإدارة المركزية ومتابعة الاستبيانات</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {surveysList.length} استبيانات
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                إدارة المشتركين والتحليل التراكمي، منظومة الاستبيانات المتعددة، وسجل الإجابات المفصول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigateToForm(activeManagerSurveyId)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>معاينة الاستمارة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "share"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة الروابط</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات الربط والشيت</span>
            </button>

            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                title="تسجيل الخروج من وضع الإدارة"
                aria-label="تسجيل الخروج من وضع الإدارة"
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* REDESIGNED MAIN NAVIGATION BAR */}
        <div className="max-w-7xl mx-auto pt-3 mt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("subscribers")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "subscribers"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. ورقة المشتركين والتحليل الذكي (المشتركين)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25">
              {subscribersList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("surveys_manager")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "surveys_manager"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. إدارة الاستبيانات (الأسئلة + الترجمة + التحليل)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25">
              {surveysList.length} استبيانات
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("answers")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "answers"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>3. سجل الإجابات المفصول لكل استبيان</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* =====================================================================
            SECTION 1: ورقة المشتركين والتحليل الذكي (المشتركين)
            Each subscriber row shows Survey 1 button, Survey 2 button, etc.
            Clicking any survey button expands all data & action buttons for that survey!
           ===================================================================== */}
        {activeTab === "subscribers" && (
          <div className="space-y-5 animate-in fade-in">
            {subscribersNotice && (
              <div
                className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-bold ${
                  subscribersNotice.success
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                }`}
              >
                {subscribersNotice.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{subscribersNotice.text}</span>
              </div>
            )}

            {/* Top Controls & Add Subscriber Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>سجل ورقة (المشتركين) الموحد لجميع الاستبيانات</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    انقر على زر أي استبيان بجوار اسم المشترك ورقمه لعرض نقاطه وإجاباته وتحليله الذكي وأزرار التحكم الخاصة بذلك الاستبيان (كل استبيان يضيف 3 أعمدة في نفس الورقة)
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => loadSubscribers(true)}
                    disabled={loadingSubscribers}
                    title="تحديث من قوقل شيت"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSubscribers ? "animate-spin text-emerald-400" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await saveSubscribersToSheetBridge(subscribersList, scriptUrl);
                      showSubNotice(res.message, res.success);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>مزامنة الورقة مع قوقل شيت</span>
                  </button>
                </div>
              </div>

              {/* Search & Add New Subscriber */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subscribersSearch}
                    onChange={(e) => setSubscribersSearch(e.target.value)}
                    placeholder="ابحث برقم المشترك (Student ID) أو الاسم..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={newSubId}
                    onChange={(e) => setNewSubId(e.target.value)}
                    placeholder="رقم المشترك الجديد (Student ID)"
                    className="w-full sm:w-44 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="اسم المشترك الكامل (Student Name)"
                    className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubscriber}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مشترك</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subscribers Rows List */}
            {loadingSubscribers ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-400">جاري قراءة سجل المشتركين وبيانات الاستبيانات...</p>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-300">لا يوجد مشتركون مطابقون للبحث</p>
                <p className="text-xs text-slate-500">يمكنك إضافة مشترك جديد من الشريط أعلاه</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubscribers.map((sub, idx) => {
                  const activeExpSurveyId = expandedSubscriberSurvey[sub.studentId] || null;
                  const activeSurveyResult = activeExpSurveyId
                    ? getSubSurveyResult(sub, activeExpSurveyId)
                    : null;
                  const activeSurveyDef = activeExpSurveyId
                    ? surveysList.find((s) => s.id === activeExpSurveyId)
                    : null;
                  const activeSurveyQuestions = activeExpSurveyId
                    ? questionsBySurvey[activeExpSurveyId] || []
                    : [];

                  return (
                    <div
                      key={`${sub.studentId}-${idx}`}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        activeExpSurveyId
                          ? "bg-slate-900 border-emerald-500/50 shadow-lg"
                          : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* MAIN SUBSCRIBER ROW: Sequence + Student ID + Student Name + Survey Buttons */}
                      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Identity Info */}
                        <div className="flex items-center gap-3 min-w-[260px]">
                          <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {sub.sequence || idx + 1}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-black text-emerald-400 shrink-0">
                            #{sub.studentId}
                          </span>
                          <div className="font-bold text-sm sm:text-base text-white truncate">
                            {sub.studentName}
                          </div>
                        </div>

                        {/* SURVEY BUTTONS RIGHT AFTER NAME & ID */}
                        <div className="flex items-center gap-2 flex-wrap flex-1 lg:justify-end">
                          {surveysList.map((srv) => {
                            const sRes = getSubSurveyResult(sub, srv.id);
                            const isClicked = activeExpSurveyId === srv.id;
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => handleClickSubscriberSurveyBtn(sub, srv.id)}
                                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                  isClicked
                                    ? "bg-emerald-600 border-emerald-400 text-white shadow-md scale-[1.02]"
                                    : sRes.hasAnswered
                                    ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                }`}
                              >
                                {sRes.hasAnswered ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span>الاستبيان {srv.id}</span>
                                {sRes.hasAnswered && sRes.totalScore !== undefined && sRes.totalScore !== "" && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                      isClicked
                                        ? "bg-white text-emerald-900"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                                  >
                                    {sRes.totalScore} نقطة
                                  </span>
                                )}
                                {isClicked ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* EXPANDED PANEL FOR THE CLICKED SURVEY BUTTON */}
                      {activeExpSurveyId && activeSurveyResult && (
                        <div className="border-t border-slate-800 bg-slate-950/90 p-5 space-y-4 animate-in fade-in">
                          {/* Top Bar of Expanded Survey Panel: Info + Action Buttons */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black">
                                {activeSurveyDef?.title || `الاستبيان ${activeExpSurveyId}`}
                              </span>
                              <span className="text-xs text-slate-400">
                                الأعمدة في ورقة المشتركين:{" "}
                                <strong className="text-slate-200 font-mono">
                                  ({getSurveyColsLabel(activeExpSurveyId)})
                                </strong>
                              </span>
                              {activeSurveyResult.hasAnswered ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                  ✓ تم الإجابة والتسجيل
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                  ⏳ لم يجب على هذا الاستبيان بعد
                                </span>
                              )}
                            </div>

                            {/* Action Buttons for THIS Survey */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  const personalUrl = `${getSurveyPublicUrl(activeExpSurveyId)}&id=${encodeURIComponent(
                                    sub.studentId
                                  )}&name=${encodeURIComponent(sub.studentName)}`;
                                  handleCopyText(personalUrl, `sub_link_${sub.studentId}_${activeExpSurveyId}`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              >
                                {copiedKey === `sub_link_${sub.studentId}_${activeExpSurveyId}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>تم نسخ رابط المشترك</span>
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>نسخ رابط الاستبيان {activeExpSurveyId} للمشترك</span>
                                  </>
                                )}
                              </button>

                              {activeSurveyResult.hasAnswered && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSubscriberModal({
                                        subscriber: sub,
                                        surveyId: activeExpSurveyId
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>عرض التقرير الكامل والطباعة</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAnalyzeSubscriberSurvey(sub, activeExpSurveyId)}
                                    disabled={analyzingKey === `${sub.studentId}_${activeExpSurveyId}`}
                                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    {analyzingKey === `${sub.studentId}_${activeExpSurveyId}` ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {activeSurveyResult.aiAnalysis
                                        ? "إعادة التحليل الذكي"
                                        : "تحليل الإجابات بالذكاء الاصطناعي"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleResetSubscriberSurvey(sub, activeExpSurveyId)}
                                    className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>إعادة فتح الاستبيان {activeExpSurveyId} للمشترك</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 3-Column Data Display for THIS Survey */}
                          {activeSurveyResult.hasAnswered ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                              {/* Col 1: Score & Summary */}
                              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <span className="text-[11px] text-slate-400 font-bold block">
                                    مجموع النقاط (الاستبيان {activeExpSurveyId})
                                  </span>
                                  <div className="text-2xl font-black text-amber-400 flex items-center gap-2 pt-1">
                                    <Award className="w-6 h-6" />
                                    <span>{activeSurveyResult.totalScore !== "" ? activeSurveyResult.totalScore : "0"}</span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800 mt-3">
                                  عدد الإجابات المسجلة:{" "}
                                  <strong className="text-white">
                                    {(activeSurveyResult.combinedAnswers || "")
                                      .split("|||")
                                      .map((s) => s.trim())
                                      .filter(Boolean).length}
                                  </strong>
                                </div>
                              </div>

                              {/* Col 2: Combined Answers (|||) */}
                              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-60 overflow-y-auto">
                                <div className="text-xs font-bold text-emerald-400 sticky top-0 bg-slate-900 pb-1 border-b border-slate-800">
                                  إجابات المشترك في الاستبيان {activeExpSurveyId}:
                                </div>
                                <div className="space-y-2 pt-1">
                                  {(activeSurveyResult.combinedAnswers || "")
                                    .split("|||")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                    .map((ansPart, aIdx) => {
                                      const inputQs = activeSurveyQuestions.filter((q) => {
                                        const t = (q.type || "").toLowerCase();
                                        return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(t);
                                      });
                                      const qTitle = inputQs[aIdx]?.question || `سؤال ${aIdx + 1}`;
                                      return (
                                        <div
                                          key={aIdx}
                                          className="text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80"
                                        >
                                          <div className="text-[11px] text-slate-400 font-semibold mb-0.5">
                                            {qTitle}
                                          </div>
                                          {ansPart.startsWith("http") ? (
                                            <a
                                              href={ansPart}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-emerald-400 underline font-bold"
                                            >
                                              عرض المرفق / الصورة ↗
                                            </a>
                                          ) : (
                                            <div className="text-slate-100 font-bold">{ansPart}</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>

                              {/* Col 3: AI Analysis */}
                              <div className="lg:col-span-5 bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-2 max-h-60 overflow-y-auto">
                                <div className="text-xs font-bold text-purple-300 flex items-center justify-between sticky top-0 bg-slate-900 pb-1 border-b border-slate-800">
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                    <span>تحليل الذكاء الاصطناعي (الاستبيان {activeExpSurveyId})</span>
                                  </span>
                                </div>
                                {activeSurveyResult.aiAnalysis ? (
                                  <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed pt-1">
                                    {activeSurveyResult.aiAnalysis}
                                  </div>
                                ) : (
                                  <div className="py-8 text-center space-y-2">
                                    <p className="text-xs text-slate-400">
                                      لم يتم توليد تحليل ذكي لهذا الاستبيان بعد.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleAnalyzeSubscriberSurvey(sub, activeExpSurveyId)}
                                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>توليد التحليل الآن</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800">
                              لم يقم المشترك <strong>{sub.studentName}</strong> بالإجابة على{" "}
                              <strong>{activeSurveyDef?.title || `الاستبيان ${activeExpSurveyId}`}</strong> حتى الآن. يمكنك نسخ رابط الاستبيان أعلاه وإرساله له.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            SECTION 2: منظومة إدارة الاستبيانات المتكاملة (الأسئلة + الترجمة + التحليل)
           ===================================================================== */}
        {activeTab === "surveys_manager" && (
          <SurveyWorkspacePanel
            activeSurveyId={activeManagerSurveyId}
            onSelectSurveyId={setActiveManagerSurveyId}
            primaryQuestions={questions}
            onUpdatePrimaryQuestions={onUpdateQuestions}
            spreadsheetId={spreadsheetId}
            scriptUrl={scriptUrl}
            currentLang={currentLang}
            onSurveysListChanged={(updated) => setSurveysList(updated)}
            onPreviewSurvey={(sId) => onNavigateToForm(sId)}
          />
        )}

        {/* =====================================================================
            SECTION 3: سجل الإجابات التفصيلي مفصولاً لكل استبيان
           ===================================================================== */}
        {activeTab === "answers" && (
          <div className="space-y-5 animate-in fade-in">
            {/* Survey Sub-Tabs for Answers Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <TableProperties className="w-5 h-5 text-emerald-400" />
                    <span>سجل الإجابات التفصيلي (مفصول لكل استبيان)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    يتم حفظ الإجابات داخل النظام أولاً ثم مزامنتها مع ورقة الإجابات المخصصة لكل استبيان
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadAnswers(activeAnswersSurveyId)}
                    disabled={loadingAnswers}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="تحديث السجل"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAnswers ? "animate-spin text-emerald-400" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAnswersCsv}
                    disabled={answersData.records.length === 0}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير CSV (استبيان {activeAnswersSurveyId})</span>
                  </button>
                </div>
              </div>

              {/* Separate Tab per Survey */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {surveysList.map((srv) => {
                  const isSel = activeAnswersSurveyId === srv.id;
                  const { answersSheetName } = getSheetNamesForSurvey(srv.id);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setActiveAnswersSurveyId(srv.id)}
                      className={`px-4 py-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer shrink-0 ${
                        isSel
                          ? "bg-emerald-600 border-emerald-400 text-white shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-xs font-black">{srv.title}</div>
                        <div className="text-[10px] font-mono opacity-80">{answersSheetName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Search inside selected survey answers */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={answersSearch}
                  onChange={(e) => setAnswersSearch(e.target.value)}
                  placeholder={`ابحث في إجابات الاستبيان (${activeAnswersSurveyId}) برقم التسجيل أو الاسم...`}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Answers Table for Selected Survey */}
            {loadingAnswers ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-400">
                  جاري تحميل سجل إجابات الاستبيان ({activeAnswersSurveyId})...
                </p>
              </div>
            ) : filteredAnswerRecords.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-300">
                  لا توجد إجابات مسجلة في الاستبيان ({activeAnswersSurveyId}) حتى الآن
                </p>
                <p className="text-xs text-slate-500">
                  الورقة المخصصة: {getSheetNamesForSurvey(activeAnswersSurveyId).answersSheetName}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                      <tr>
                        <th className="py-3.5 px-4">التاريخ والوقت</th>
                        <th className="py-3.5 px-4">رقم المشترك</th>
                        <th className="py-3.5 px-4">اسم المشترك</th>
                        <th className="py-3.5 px-4">مجموع النقاط</th>
                        <th className="py-3.5 px-4">عدد الإجابات</th>
                        <th className="py-3.5 px-4 text-left">عرض التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredAnswerRecords.map((rec, idx) => (
                        <tr
                          key={`${rec.registrationId}-${idx}`}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400">{rec.timestamp}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            #{rec.registrationId}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">{rec.name}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-black">
                              {rec.totalScore !== undefined && rec.totalScore !== "" ? rec.totalScore : "-"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {Object.keys(rec.answers || {}).length} إجابة
                          </td>
                          <td className="py-3.5 px-4 text-left">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(rec)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            SECTION 4: مشاركة الروابط لجميع الاستبيانات
           ===================================================================== */}
        {activeTab === "share" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                روابط الاستبيانات المباشرة والـ QR Code
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                لكل استبيان رابط خاص به يمكنك إرساله للمشتركين حسب المرحلة التدريبية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surveysList.map((srv) => {
                const url = getSurveyPublicUrl(srv.id);
                return (
                  <div
                    key={srv.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                        الاستبيان #{srv.id}
                      </span>
                      <span className="text-xs font-mono text-emerald-400">/?s={getSurveyToken(srv.id)}</span>
                    </div>
                    <h3 className="font-bold text-sm text-white">{srv.title}</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={url}
                        dir="ltr"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText(url, `share_s_${srv.id}`)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === `share_s_${srv.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: FULL SUBSCRIBER SURVEY REPORT */}
      {selectedSubscriberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">
                  تقرير المشترك: {selectedSubscriberModal.subscriber.studentName} (#{selectedSubscriberModal.subscriber.studentId})
                </h3>
                <p className="text-xs text-emerald-400 font-bold">
                  الاستبيان #{selectedSubscriberModal.surveyId} — الأعمدة ({getSurveyColsLabel(selectedSubscriberModal.surveyId)})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubscriberModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {(() => {
                const sRes = getSubSurveyResult(
                  selectedSubscriberModal.subscriber,
                  selectedSubscriberModal.surveyId
                );
                const sQs = questionsBySurvey[selectedSubscriberModal.surveyId] || [];
                const inputQs = sQs.filter((q) => {
                  const t = (q.type || "").toLowerCase();
                  return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(t);
                });
                const ansParts = (sRes.combinedAnswers || "")
                  .split("|||")
                  .map((s) => s.trim())
                  .filter(Boolean);

                return (
                  <>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-slate-300">مجموع النقاط المسجل:</span>
                      <span className="text-lg font-black text-amber-400">
                        {sRes.totalScore !== "" ? sRes.totalScore : "0"} نقطة
                      </span>
                    </div>

                    {sRes.aiAnalysis && (
                      <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                        <div className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          <span>تقرير تحليل الذكاء الاصطناعي:</span>
                        </div>
                        <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                          {sRes.aiAnalysis}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="font-black text-emerald-400 text-sm">الإجابات التفصيلية:</h4>
                      {ansParts.map((ans, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                        >
                          <div className="text-slate-400 font-bold">
                            {inputQs[i]?.question || `سؤال ${i + 1}`}
                          </div>
                          <div className="text-white font-bold">{ans}</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAILED ANSWER RECORD FROM ANSWERS LOG */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  تفاصيل إجابة: {selectedRecord.name} (#{selectedRecord.registrationId})
                </h3>
                <p className="text-xs text-slate-400">{selectedRecord.timestamp}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-2.5 text-xs">
              {Object.entries(selectedRecord.answers || {}).map(([qKey, aVal], i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 font-bold mb-1">{qKey}</div>
                  <div className="text-white font-bold">{aVal || "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
