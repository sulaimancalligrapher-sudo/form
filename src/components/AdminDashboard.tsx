/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  RegistrationQuestion,
  SheetAnswerRecord,
  SheetAnswersData,
  TelegramConfig,
  FormLang,
  SubscriberRecord
} from "../types";
import {
  fetchRegistrationAnswersBridge,
  saveFormQuestionsBridge,
  fetchFormQuestionsBridge,
  fetchSubscribersSheetBridge,
  updateSubscriberRowBridge,
  saveSubscribersToSheetBridge,
  getActiveSpreadsheetId,
  getActiveScriptUrl,
  isScoredQuestionType
} from "../utils/googleBackendBridge";
import { analyzeSubscriberAnswers } from "../utils/aiAnalyzer";
import { AnalysisSettingsTab } from "./AnalysisSettingsTab";
import {
  LayoutDashboard,
  FileQuestion,
  TableProperties,
  Plus,
  Edit3,
  Trash2,
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
  MoveUp,
  MoveDown,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Hash,
  Award,
  Filter,
  X,
  FileSpreadsheet,
  Link,
  ChevronRight,
  ShieldCheck,
  ListChecks,
  Image as ImageIcon,
  Users,
  Unlock,
  Loader2
} from "lucide-react";

interface AdminDashboardProps {
  questions: RegistrationQuestion[];
  onUpdateQuestions: (newQuestions: RegistrationQuestion[]) => void;
  onOpenSettingsModal: () => void;
  onNavigateToForm: () => void;
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
  spreadsheetId,
  scriptUrl,
  driveFolderId,
  telegramConfig
}) => {
  const [activeTab, setActiveTab] = useState<
    "subscribers" | "analysis_settings" | "questions" | "answers" | "share"
  >("subscribers");

  // Subscribers sheet (ورقة المشتركين) state
  const [subscribersList, setSubscribersList] = useState<SubscriberRecord[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState<boolean>(true);
  const [subscribersSearch, setSubscribersSearch] = useState<string>("");
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberRecord | null>(null);
  const [newSubId, setNewSubId] = useState<string>("");
  const [newSubName, setNewSubName] = useState<string>("");
  const [analyzingStudentId, setAnalyzingStudentId] = useState<string | null>(null);
  const [subscribersNotice, setSubscribersNotice] = useState<{ text: string; success: boolean } | null>(null);

  // Answers sheet state
  const [answersData, setAnswersData] = useState<SheetAnswersData>({
    headers: [],
    records: []
  });
  const [loadingAnswers, setLoadingAnswers] = useState<boolean>(true);
  const [answersSearch, setAnswersSearch] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<SheetAnswerRecord | null>(null);

  // Questions editing state
  const [localQuestions, setLocalQuestions] = useState<RegistrationQuestion[]>(questions);
  const [isEditingQuestionModalOpen, setIsEditingQuestionModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<RegistrationQuestion> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // null = new question
  const [newOptionInput, setNewOptionInput] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingQuestions, setSavingQuestions] = useState<boolean>(false);
  const [questionsSaveMessage, setQuestionsSaveMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [lastDeletedQuestion, setLastDeletedQuestion] = useState<{ question: RegistrationQuestion; index: number } | null>(null);

  // Copy state
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);
  const [copiedRecordSummary, setCopiedRecordSummary] = useState<boolean>(false);

  // Sync localQuestions with prop changes
  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  // Load answers from Google Sheets on mount & tab change
  const loadAnswers = async () => {
    setLoadingAnswers(true);
    try {
      const data = await fetchRegistrationAnswersBridge(scriptUrl, spreadsheetId);
      setAnswersData(data);
    } catch (e) {
      console.error("Failed to load answers in Admin Dashboard:", e);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Load subscribers from ورقة المشتركين
  const loadSubscribers = async (force = false) => {
    setLoadingSubscribers(true);
    try {
      const list = await fetchSubscribersSheetBridge(scriptUrl, spreadsheetId, force);
      setSubscribersList(list);
    } catch (e) {
      console.error("Failed to load subscribers sheet:", e);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  useEffect(() => {
    loadAnswers();
    loadSubscribers();
  }, [spreadsheetId, scriptUrl]);

  // Add new subscriber to ورقة المشتركين
  const handleAddSubscriber = async () => {
    const cleanId = newSubId.trim();
    const cleanName = newSubName.trim();
    if (!cleanId || !cleanName) {
      setSubscribersNotice({
        text: "يرجى إدخال رقم المشترك (Student ID) واسم المشترك (Student Name) لإضافته.",
        success: false
      });
      setTimeout(() => setSubscribersNotice(null), 3500);
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
      hasAnswered: false
    };

    const updated = [...subscribersList, newRecord];
    setSubscribersList(updated);
    setNewSubId("");
    setNewSubName("");

    await updateSubscriberRowBridge(cleanId, cleanName, {
      totalScore: "",
      combinedAnswers: "",
      aiAnalysis: "",
      hasAnswered: false
    }, scriptUrl);

    setSubscribersNotice({
      text: `تمت إضافة المشترك «${cleanName}» (رقم: ${cleanId}) إلى ورقة المشتركين بنجاح!`,
      success: true
    });
    setTimeout(() => setSubscribersNotice(null), 4000);
  };

  // Run or re-run AI analysis for a subscriber and save to Column F of their row in المشتركين
  const handleAnalyzeSubscriber = async (sub: SubscriberRecord) => {
    setAnalyzingStudentId(sub.studentId);
    try {
      const parts = (sub.combinedAnswers || "")
        .split("|||")
        .map((s) => s.trim())
        .filter(Boolean);

      const inputQuestions = localQuestions.filter((q) => {
        const t = (q.type || "").toLowerCase();
        return !["image_display", "button_title", "button_link", "صورة", "زر"].includes(t);
      });

      const reconstructedAnswers = parts.map((ans, idx) => ({
        question: inputQuestions[idx]?.question || `سؤال ${idx + 1}`,
        answer: ans
      }));

      const analysisText = await analyzeSubscriberAnswers({
        studentId: sub.studentId,
        studentName: sub.studentName,
        totalScore: sub.totalScore,
        answers: reconstructedAnswers,
        combinedAnswers: sub.combinedAnswers
      });

      await updateSubscriberRowBridge(
        sub.studentId,
        sub.studentName,
        {
          totalScore: sub.totalScore,
          combinedAnswers: sub.combinedAnswers,
          aiAnalysis: analysisText,
          hasAnswered: sub.hasAnswered
        },
        scriptUrl
      );

      const updatedList = subscribersList.map((item) =>
        item.studentId === sub.studentId ? { ...item, aiAnalysis: analysisText } : item
      );
      setSubscribersList(updatedList);
      if (selectedSubscriber && selectedSubscriber.studentId === sub.studentId) {
        setSelectedSubscriber({ ...selectedSubscriber, aiAnalysis: analysisText });
      }

      setSubscribersNotice({
        text: `تم تحليل إجابات «${sub.studentName}» بالذكاء الاصطناعي وحفظ التقرير في العمود السادس (F) بنفس صفه!`,
        success: true
      });
      setTimeout(() => setSubscribersNotice(null), 4500);
    } catch (e: any) {
      setSubscribersNotice({
        text: "حدث خطأ أثناء تحليل الإجابات: " + (e?.message || ""),
        success: false
      });
      setTimeout(() => setSubscribersNotice(null), 4000);
    } finally {
      setAnalyzingStudentId(null);
    }
  };

  // Clear a subscriber's previous answer so they can answer the questionnaire again
  const handleResetSubscriberAnswer = async (sub: SubscriberRecord) => {
    await updateSubscriberRowBridge(
      sub.studentId,
      sub.studentName,
      {
        totalScore: "",
        combinedAnswers: "",
        aiAnalysis: "",
        hasAnswered: false
      },
      scriptUrl
    );

    const updatedList = subscribersList.map((item) =>
      item.studentId === sub.studentId
        ? { ...item, totalScore: "", combinedAnswers: "", aiAnalysis: "", hasAnswered: false }
        : item
    );
    setSubscribersList(updatedList);
    if (selectedSubscriber && selectedSubscriber.studentId === sub.studentId) {
      setSelectedSubscriber({
        ...selectedSubscriber,
        totalScore: "",
        combinedAnswers: "",
        aiAnalysis: "",
        hasAnswered: false
      });
    }

    setSubscribersNotice({
      text: `تم مسح الإجابة السابقة للمشترك «${sub.studentName}» والسماح له بالإجابة من جديد!`,
      success: true
    });
    setTimeout(() => setSubscribersNotice(null), 4000);
  };

  const filteredSubscribers = useMemo(() => {
    if (!subscribersSearch.trim()) return subscribersList;
    const q = subscribersSearch.toLowerCase().trim();
    return subscribersList.filter(
      (s) =>
        s.studentId.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        (s.combinedAnswers || "").toLowerCase().includes(q) ||
        (s.aiAnalysis || "").toLowerCase().includes(q)
    );
  }, [subscribersList, subscribersSearch]);

  const subscribersStats = useMemo(() => {
    const total = subscribersList.length;
    const answered = subscribersList.filter((s) => s.hasAnswered).length;
    const pending = Math.max(0, total - answered);
    const analyzed = subscribersList.filter((s) => s.aiAnalysis && s.aiAnalysis.trim().length > 5).length;
    return { total, answered, pending, analyzed };
  }, [subscribersList]);

  // Reload questions from Sheet
  const reloadQuestionsFromSheet = async () => {
    try {
      const fetched = await fetchFormQuestionsBridge(scriptUrl, spreadsheetId, true);
      if (fetched && fetched.length > 0) {
        setLocalQuestions(fetched);
        onUpdateQuestions(fetched);
        setLastDeletedQuestion(null);
        setQuestionsSaveMessage({ text: "تم تحديث الأسئلة من قوقل شيت بنجاح!", success: true });
        setTimeout(() => setQuestionsSaveMessage(null), 3500);
      }
    } catch (e) {
      setQuestionsSaveMessage({ text: "تعذر قراءة الأسئلة من قوقل شيت حالياً.", success: false });
      setTimeout(() => setQuestionsSaveMessage(null), 3500);
    }
  };

  // Filtered answers
  const filteredRecords = useMemo(() => {
    if (!answersSearch.trim()) return answersData.records;
    const q = answersSearch.toLowerCase().trim();
    return answersData.records.filter((rec) => {
      if (rec.name?.toLowerCase().includes(q)) return true;
      if (rec.registrationId?.toLowerCase().includes(q)) return true;
      if (rec.timestamp?.toLowerCase().includes(q)) return true;
      if (rec.totalScore?.toString().toLowerCase().includes(q)) return true;
      return Object.values(rec.answers || {}).some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });
  }, [answersData.records, answersSearch]);

  // Answers statistics
  const stats = useMemo(() => {
    const total = answersData.records.length;
    let scoreSum = 0;
    let scoredCount = 0;
    let maxScore = 0;

    answersData.records.forEach((r) => {
      const scoreNum = parseFloat(String(r.totalScore || "0"));
      if (!isNaN(scoreNum) && scoreNum > 0) {
        scoreSum += scoreNum;
        scoredCount++;
        if (scoreNum > maxScore) maxScore = scoreNum;
      }
    });

    const avgScore = scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : "-";
    const latestTime = answersData.records[0]?.timestamp || "لا يوجد تسجيلات بعد";

    return {
      total,
      avgScore,
      maxScore: maxScore > 0 ? maxScore : "-",
      latestTime
    };
  }, [answersData.records]);

  // Handle save questions to Google Sheet
  const handleSaveQuestionsToSheet = async () => {
    setSavingQuestions(true);
    setQuestionsSaveMessage(null);
    try {
      const res = await saveFormQuestionsBridge(localQuestions, scriptUrl);
      onUpdateQuestions(localQuestions);
      setQuestionsSaveMessage({
        text: res.message || "تم حفظ وتحديث ورقة RegistrationQuestions بنجاح!",
        success: res.success
      });
    } catch (e: any) {
      setQuestionsSaveMessage({
        text: "حدث خطأ أثناء الحفظ في قوقل شيت: " + e.message,
        success: false
      });
    } finally {
      setSavingQuestions(false);
      setTimeout(() => setQuestionsSaveMessage(null), 5000);
    }
  };

  // Questions reordering
  const moveQuestion = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localQuestions.length) return;

    const updated = [...localQuestions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setLocalQuestions(updated);
    onUpdateQuestions(updated);
    saveFormQuestionsBridge(updated, scriptUrl).catch(() => {});
  };

  // Delete question (works immediately without blocked window.confirm, with Undo support & instant sync)
  const handleDeleteQuestion = (index: number) => {
    const targetQuestion = localQuestions[index];
    if (!targetQuestion) return;

    const updated = localQuestions.filter((_, i) => i !== index);
    setLocalQuestions(updated);
    onUpdateQuestions(updated);
    setLastDeletedQuestion({ question: targetQuestion, index });
    saveFormQuestionsBridge(updated, scriptUrl).catch(() => {});
    setQuestionsSaveMessage({
      text: `تم حذف السؤال «${targetQuestion.question}» وتحديث القائمة بنجاح!`,
      success: true
    });
  };

  // Undo last deleted question
  const handleUndoDelete = () => {
    if (!lastDeletedQuestion) return;
    const updated = [...localQuestions];
    const insertIdx = Math.min(lastDeletedQuestion.index, updated.length);
    updated.splice(insertIdx, 0, lastDeletedQuestion.question);
    setLocalQuestions(updated);
    onUpdateQuestions(updated);
    setLastDeletedQuestion(null);
    saveFormQuestionsBridge(updated, scriptUrl).catch(() => {});
    setQuestionsSaveMessage({
      text: `تمت استعادة السؤال «${lastDeletedQuestion.question.question}» بنجاح!`,
      success: true
    });
    setTimeout(() => setQuestionsSaveMessage(null), 4000);
  };

  // Open Question Editor for New or Edit
  const openQuestionEditor = (index: number | null) => {
    setEditingIndex(index);
    setModalError(null);
    if (index !== null && localQuestions[index]) {
      setEditingQuestion({
        ...localQuestions[index],
        options: localQuestions[index].options ? [...localQuestions[index].options!] : []
      });
    } else {
      setEditingQuestion({
        id: Date.now(),
        question: "",
        description: "",
        type: "choice",
        options: [],
        required: true,
        imageUrl: "",
        externalLink: ""
      });
    }
    setNewOptionInput("");
    setIsEditingQuestionModalOpen(true);
  };

  // Save Question in Modal
  const handleSaveQuestionModal = () => {
    if (!editingQuestion || !editingQuestion.question?.trim()) {
      setModalError("يرجى كتابة نص السؤال أولاً!");
      return;
    }

    // If user typed an option in the input box without clicking "إضافة خيار", include it automatically
    const baseOptions = [...(editingQuestion.options || [])];
    if (
      newOptionInput.trim() &&
      (editingQuestion.type === "choice" ||
        editingQuestion.type === "scored_choice" ||
        editingQuestion.type === "multiple_choice")
    ) {
      baseOptions.push(newOptionInput.trim());
    }

    const updatedList = [...localQuestions];
    const qToSave: RegistrationQuestion = {
      id: editingQuestion.id || Date.now(),
      question: editingQuestion.question.trim(),
      description: editingQuestion.description?.trim() || "",
      type: editingQuestion.type || "text",
      options: baseOptions,
      required: !!editingQuestion.required,
      imageUrl: editingQuestion.imageUrl?.trim() || "",
      externalLink: editingQuestion.externalLink?.trim() || ""
    };

    if (editingIndex !== null) {
      updatedList[editingIndex] = qToSave;
    } else {
      updatedList.push(qToSave);
    }

    setLocalQuestions(updatedList);
    onUpdateQuestions(updatedList);
    saveFormQuestionsBridge(updatedList, scriptUrl).catch(() => {});
    setIsEditingQuestionModalOpen(false);
    setEditingQuestion(null);
    setNewOptionInput("");
    setModalError(null);
    setQuestionsSaveMessage({
      text: editingIndex !== null ? "تم تعديل السؤال وحفظه بنجاح!" : "تمت إضافة السؤال الجديد وحفظه بنجاح!",
      success: true
    });
    setTimeout(() => setQuestionsSaveMessage(null), 4000);
  };

  // Copy Link Helper
  const handleCopyLink = (url: string, type: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkType(type);
    setTimeout(() => setCopiedLinkType(null), 3000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!answersData.records || answersData.records.length === 0) {
      alert("لا توجد بيانات متاحة للتصدير حالياً!");
      return;
    }

    const headers = answersData.headers;
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

    // Data rows
    answersData.records.forEach((rec) => {
      const row = headers.map((h, cIdx) => {
        let val = "";
        if (cIdx === 0) val = rec.timestamp;
        else if (cIdx === 1) val = rec.registrationId;
        else if (cIdx === 2) val = rec.name;
        else if (h === answersData.totalScoreHeader) val = String(rec.totalScore || "");
        else val = rec.answers[h] || rec.rawRow[h] || "";

        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RegistrationAnswers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print Table
  const handlePrintAnswers = () => {
    window.print();
  };

  // Public Form URL & Admin URL
  const publicFormUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname.replace(/\/admin\/?$/, "")}`
    : "/";
  const adminUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname.includes("/admin") ? window.location.pathname : window.location.pathname + "/admin"}`
    : "/admin";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>لوحة إدارة الاستمارة والشيت</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-medium">
                    Admin
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  إدارة ورقة الأسئلة وسجل الإجابات والنتائج المتصل بقوقل شيت
                </p>
              </div>
            </div>

            {/* Quick Mobile Back */}
            <button
              type="button"
              onClick={onNavigateToForm}
              className="md:hidden px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
            >
              <span>الاستمارة</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* View Public Form */}
            <button
              type="button"
              onClick={onNavigateToForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>معاينة الاستمارة للجمهور</span>
            </button>

            {/* Open Google Sheet */}
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-all"
              title="فتح ملف قوقل شيت مباشرة"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>فتح الشيت ↗</span>
            </a>

            {/* Settings Modal Button */}
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات الربط والشيت</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5">
            {/* Tab 0: Subscribers Sheet & AI Analysis (ورقة المشتركين) */}
            <button
              type="button"
              onClick={() => setActiveTab("subscribers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "subscribers"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ورقة المشتركين والتحليل الذكي (المشتركين)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeTab === "subscribers" ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {subscribersList.length}
              </span>
            </button>

            {/* Tab 0b: Analysis & Login Gate Settings */}
            <button
              type="button"
              onClick={() => setActiveTab("analysis_settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "analysis_settings"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>إعدادات التحليل وبوابة الدخول</span>
            </button>

            {/* Tab 1: RegistrationQuestions */}
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "questions"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              <span>إدارة الأسئلة (RegistrationQuestions)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeTab === "questions" ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {localQuestions.length}
              </span>
            </button>

            {/* Tab 2: RegistrationAnswers */}
            <button
              type="button"
              onClick={() => setActiveTab("answers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "answers"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>سجل الإجابات التفصيلي</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeTab === "answers" ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {answersData.records.length}
              </span>
            </button>

            {/* Tab 3: Share Links & Quick Tools */}
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "share"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة الروابط</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 0: SUBSCRIBERS SHEET & AI ANALYSIS (ورقة المشتركين والنتائج والتحليل) */}
        {/* ========================================================================= */}
        {activeTab === "subscribers" && (
          <div className="space-y-5">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">إجمالي المشتركين المسجلين</span>
                <div className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                  <span>{subscribersStats.total}</span>
                  <span className="text-xs text-slate-500 font-normal">طالب في ورقة المشتركين</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">أجابوا على الاستبيان</span>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-baseline gap-2">
                  <span>{subscribersStats.answered}</span>
                  <span className="text-xs text-slate-500 font-normal">مكتمل (مقفول التكرار)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">بانتظار الإجابة</span>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 flex items-baseline gap-2">
                  <span>{subscribersStats.pending}</span>
                  <span className="text-xs text-slate-500 font-normal">لم يجيبوا بعد</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">تقارير تحليل الذكاء الاصطناعي</span>
                <div className="text-2xl sm:text-3xl font-bold text-purple-400 flex items-baseline gap-2">
                  <span>{subscribersStats.analyzed}</span>
                  <span className="text-xs text-slate-500 font-normal">تحليل مسجل في العمود F</span>
                </div>
              </div>
            </div>

            {/* Notice Toast */}
            {subscribersNotice && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in ${
                  subscribersNotice.success
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                    : "bg-rose-950/80 border-rose-700 text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {subscribersNotice.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{subscribersNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscribersNotice(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Add Subscriber Bar + Search & Sync */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              {/* Quick Add Subscriber to المشتركين */}
              <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={newSubId}
                  onChange={(e) => setNewSubId(e.target.value)}
                  placeholder="رقم المشترك (Student ID)..."
                  className="sm:w-40 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 focus:border-emerald-500 text-xs text-slate-100 outline-none"
                />
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubscriber();
                    }
                  }}
                  placeholder="اسم المشترك الكامل (Student Name)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-750 focus:border-emerald-500 text-xs text-slate-100 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubscriber}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مشترك للورقة</span>
                </button>
              </div>

              {/* Search & Refresh */}
              <div className="lg:col-span-5 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={subscribersSearch}
                    onChange={(e) => setSubscribersSearch(e.target.value)}
                    placeholder="بحث بالرقم أو الاسم أو التحليل..."
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-750 focus:border-emerald-500 text-xs text-slate-200 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => loadSubscribers(true)}
                  disabled={loadingSubscribers}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer shrink-0"
                  title="قراءة أحدث بيانات ورقة المشتركين من قوقل شيت"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSubscribers ? "animate-spin text-emerald-400" : ""}`} />
                  <span>تحديث</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await saveSubscribersToSheetBridge(subscribersList, scriptUrl);
                    setSubscribersNotice({ text: res.message, success: res.success });
                    setTimeout(() => setSubscribersNotice(null), 4000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer shrink-0"
                  title="مزامنة وإنشاء ورقة المشتركين في قوقل شيت"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>مزامنة الشيت</span>
                </button>
              </div>
            </div>

            {/* Subscribers 6-Column Table */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              {loadingSubscribers && subscribersList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                  <p className="text-sm font-semibold">جاري قراءة ورقة (المشتركين) من قوقل شيت...</p>
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2.5">
                  <Users className="w-9 h-9 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-200">
                    {subscribersSearch
                      ? "لا يوجد مشترك يطابق بحثك"
                      : "ورقة (المشتركين) فارغة حالياً أو لم تتم إضافة طلاب بعد"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                    يمكنك إضافة المشتركين (Student ID + Student Name) من الشريط أعلاه أو مباشرة داخل ورقة <strong>المشتركين</strong> في ملف قوقل شيت، وعندما يجيب كل طالب ستُسجل نقاطه وإجاباته وتحليله الذكي في نفس صفه تلقائياً.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                        <th className="py-3 px-3 w-14 text-center whitespace-nowrap">
                          العمود 1: التسلسل
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap">
                          العمود 2: Student ID
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap">
                          العمود 3: Student Name
                        </th>
                        <th className="py-3 px-3 text-center whitespace-nowrap">
                          العمود 4: مجموع النقاط
                        </th>
                        <th className="py-3 px-3">
                          العمود 5: الإجابات المجمعة (|||)
                        </th>
                        <th className="py-3 px-3">
                          العمود 6: تحليل الذكاء الاصطناعي
                        </th>
                        <th className="py-3 px-3 text-center whitespace-nowrap">
                          الحالة والإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredSubscribers.map((sub, idx) => {
                        const isAnalyzingThis = analyzingStudentId === sub.studentId;
                        return (
                          <tr
                            key={sub.studentId || idx}
                            onClick={() => setSelectedSubscriber(sub)}
                            className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                          >
                            {/* Col 1: Sequence */}
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {sub.sequence || idx + 1}
                            </td>

                            {/* Col 2: Student ID */}
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {sub.studentId}
                            </td>

                            {/* Col 3: Student Name */}
                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {sub.studentName}
                            </td>

                            {/* Col 4: Total Score */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {sub.totalScore !== undefined && String(sub.totalScore).trim() !== "" ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono text-xs">
                                  {sub.totalScore}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Col 5: Combined Answers (|||) */}
                            <td className="py-3 px-3 text-slate-300 max-w-xs truncate font-mono text-[11px]">
                              {sub.combinedAnswers ? (
                                <span title={sub.combinedAnswers}>{sub.combinedAnswers}</span>
                              ) : (
                                <span className="text-slate-600 font-sans">لم يجب بعد</span>
                              )}
                            </td>

                            {/* Col 6: AI Analysis */}
                            <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                              {sub.aiAnalysis ? (
                                <span className="text-purple-300 font-medium">
                                  {sub.aiAnalysis.replace(/\n+/g, " — ")}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td
                              className="py-3 px-3 text-center whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {sub.hasAnswered ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                    أجاب ✅
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                                    بانتظار الإجابة
                                  </span>
                                )}

                                {sub.hasAnswered && (
                                  <button
                                    type="button"
                                    disabled={isAnalyzingThis}
                                    onClick={() => handleAnalyzeSubscriber(sub)}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    title="تحليل إجابات المشترك بالذكاء الاصطناعي وحفظها في العمود السادس"
                                  >
                                    {isAnalyzingThis ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                    <span>تحليل ذكي</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedSubscriber(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all text-[11px] font-semibold cursor-pointer"
                                >
                                  التفاصيل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 0b: ANALYSIS & LOGIN GATE SETTINGS (إعدادات التحليل وبوابة الدخول)     */}
        {/* ========================================================================= */}
        {activeTab === "analysis_settings" && (
          <AnalysisSettingsTab darkMode={true} />
        )}

        {/* ========================================================================= */}
        {/* TAB 1: REGISTRATION ANSWERS (سجل الإجابات والنتائج)                       */}
        {/* ========================================================================= */}
        {activeTab === "answers" && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">إجمالي المسجلين</span>
                <div className="text-2xl sm:text-3xl font-bold text-white flex items-baseline gap-2">
                  <span>{stats.total}</span>
                  <span className="text-xs text-slate-500 font-normal">مشترك</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">متوسط النقاط</span>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-baseline gap-2">
                  <span>{stats.avgScore}</span>
                  <span className="text-xs text-slate-500 font-normal">نقطة</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">أعلى مجموع نقاط</span>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 flex items-baseline gap-2">
                  <span>{stats.maxScore}</span>
                  <span className="text-xs text-slate-500 font-normal">نقطة</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-medium">آخر تحديث للشيت</span>
                <div className="text-xs sm:text-sm font-semibold text-slate-300 truncate mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{answersData.lastUpdated || stats.latestTime}</span>
                </div>
              </div>
            </div>

            {/* Action Bar (Search & Export Buttons) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={answersSearch}
                  onChange={(e) => setAnswersSearch(e.target.value)}
                  placeholder="بحث باسم المشترك، رقم التسجيل، أو أي إجابة..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-750 focus:border-emerald-500 text-xs sm:text-sm text-slate-200 outline-none placeholder:text-slate-500 transition-all"
                />
                {answersSearch && (
                  <button
                    type="button"
                    onClick={() => setAnswersSearch("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={loadAnswers}
                  disabled={loadingAnswers}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all disabled:opacity-50"
                  title="تحديث البيانات من قوقل شيت الآن"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAnswers ? "animate-spin text-emerald-400" : ""}`} />
                  <span>تحديث</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all"
                  title="تحميل جدول الإجابات بصيغة CSV"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>تصدير CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintAnswers}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all"
                  title="طباعة السجلات"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            {/* Answers Table */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              {loadingAnswers && answersData.records.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                  <p className="text-sm font-semibold">جاري قراءة إجابات ورقة RegistrationAnswers من قوقل شيت...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <TableProperties className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">
                    {answersSearch ? "لا توجد نتائج تطابق بحثك" : "لا توجد أي تسجيلات مسجلة في ورقة RegistrationAnswers بعد"}
                  </p>
                  <p className="text-xs text-slate-500">
                    عندما يقوم أي شخص بتعبئة الاستمارة، ستظهر بياناته هنا فوراً وبشكل حي.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 whitespace-nowrap">التاريخ والوقت</th>
                        <th className="py-3 px-3 whitespace-nowrap">رقم التسجيل</th>
                        <th className="py-3 px-3 whitespace-nowrap">اسم المشترك</th>
                        <th className="py-3 px-3 whitespace-nowrap text-center">مجموع النقاط</th>
                        <th className="py-3 px-3">ملخص الإجابات</th>
                        <th className="py-3 px-3 text-center w-20">تفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredRecords.map((rec, rIdx) => {
                        const scoreVal = rec.totalScore !== undefined && rec.totalScore !== null ? String(rec.totalScore).trim() : "";
                        return (
                          <tr
                            key={rec.registrationId || rIdx}
                            onClick={() => setSelectedRecord(rec)}
                            className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-3 text-center text-slate-500 font-mono">
                              {rIdx + 1}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                              {rec.timestamp || "-"}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {rec.registrationId || "-"}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-200 whitespace-nowrap">
                              {rec.name || "-"}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {scoreVal !== "" ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono text-xs">
                                  {scoreVal}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                              {Object.entries(rec.answers || {})
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ") || "-"}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecord(rec);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white transition-all text-[11px] font-semibold"
                              >
                                عرض
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REGISTRATION QUESTIONS (إدارة ورقة الأسئلة)                        */}
        {/* ========================================================================= */}
        {activeTab === "questions" && (
          <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>قائمة أسئلة الاستمارة</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                    {localQuestions.length} سؤال
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  يمكنك إضافة أسئلة جديدة، تعديل أنواعها (اختيارات، اختيارات 2 لحساب النقاط، اختيارات 3 متعدد)، أو حذفها ومزامنتها مع قوقل شيت.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={reloadQuestionsFromSheet}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700/80 transition-all"
                  title="إعادة تحميل الأسئلة من قوقل شيت"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث من الشيت</span>
                </button>

                <button
                  type="button"
                  onClick={() => openQuestionEditor(null)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال جديد</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveQuestionsToSheet}
                  disabled={savingQuestions}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  {savingQuestions ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                  )}
                  <span>حفظ ونشر التعديلات إلى قوقل شيت</span>
                </button>
              </div>
            </div>

            {/* Questions Save Feedback Message & Undo Delete */}
            {(questionsSaveMessage || lastDeletedQuestion) && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-3 animate-in fade-in ${
                  questionsSaveMessage && !questionsSaveMessage.success
                    ? "bg-rose-950/80 border-rose-700 text-rose-200"
                    : "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {questionsSaveMessage && !questionsSaveMessage.success ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    {questionsSaveMessage?.text ||
                      (lastDeletedQuestion ? `تم حذف السؤال «${lastDeletedQuestion.question.question}»` : "")}
                  </span>
                </div>

                {lastDeletedQuestion && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUndoDelete}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      ↩ تراجع عن الحذف (استعادة السؤال)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLastDeletedQuestion(null);
                        setQuestionsSaveMessage(null);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title="إغلاق التنبيه"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-3">
              {localQuestions.map((q, idx) => {
                const isScored = isScoredQuestionType(q.type);
                const isMulti =
                  q.type === "multiple_choice" ||
                  String(q.type).includes("3") ||
                  String(q.type).includes("متعدد");

                return (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Question details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-white">{q.question}</h4>

                        {/* Type badge */}
                        {isScored ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>اختيارات 2 (حساب نقاط)</span>
                          </span>
                        ) : isMulti ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1">
                            <ListChecks className="w-3 h-3" />
                            <span>اختيارات 3 (اختيار متعدد)</span>
                          </span>
                        ) : q.type === "choice" ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium">
                            اختيارات (راديو)
                          </span>
                        ) : q.type === "file" ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-medium">
                            رفع ملف
                          </span>
                        ) : q.type === "phone" ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                            رقم هاتف
                          </span>
                        ) : q.type === "image_display" ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
                            صورة توضيحية
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium">
                            {q.type}
                          </span>
                        )}

                        {/* Required badge */}
                        {q.required ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            مطلوب *
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                            اختياري
                          </span>
                        )}
                      </div>

                      {q.description && (
                        <p className="text-xs text-slate-400 leading-relaxed pr-8">{q.description}</p>
                      )}

                      {/* Options preview if any */}
                      {q.options && q.options.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pr-8 pt-1">
                          <span className="text-[11px] text-slate-500 font-semibold">الخيارات:</span>
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="تحريك لأعلى"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, "down")}
                        disabled={idx === localQuestions.length - 1}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="تحريك لأسفل"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openQuestionEditor(idx)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold border border-rose-800/70 hover:border-rose-500 transition-colors cursor-pointer"
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SHARE LINKS & QUICK SETTINGS                                      */}
        {/* ========================================================================= */}
        {activeTab === "share" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Public Form Link */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">رابط الاستمارة للجمهور (Public Form)</h3>
                  <p className="text-xs text-slate-400">الرابط المخصص للمشتركين والطلاب لتعبئة الاستمارة</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الرابط المباشر:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={publicFormUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(publicFormUrl, "public")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shrink-0"
                  >
                    {copiedLinkType === "public" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onNavigateToForm}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فتح ومعاينة الاستمارة الآن</span>
                </button>
              </div>
            </div>

            {/* Card 2: Admin Dashboard Link */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">رابط لوحة الإدارة المستقل (Admin Link)</h3>
                  <p className="text-xs text-slate-400">الرابط الخاص بك كمسؤول لإدارة الأسئلة واستعراض النتائج</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">رابط الإدارة:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={adminUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(adminUrl, "admin")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shrink-0"
                  >
                    {copiedLinkType === "admin" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-indigo-200" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onOpenSettingsModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فتح نافذة إعدادات الشيت و Apps Script</span>
                </button>
              </div>
            </div>

            {/* Card 3: Google Sheets Direct Integration */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 md:col-span-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>حالة الربط المباشر مع Google Sheets</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400">معرف الشيت (Spreadsheet ID):</span>
                  <div className="font-mono text-slate-200 truncate">{spreadsheetId}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400">مجلد درايف (Drive Folder):</span>
                  <div className="font-mono text-slate-200 truncate">{driveFolderId}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400">إشعارات تلغرام:</span>
                  <div className="font-bold text-slate-200">
                    {telegramConfig.enabled ? "✅ مفعلة بنجاح" : "معطلة"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: SUBSCRIBER ROW & AI ANALYSIS VIEW (عرض تفاصيل وتحليل المشترك)       */}
      {/* ========================================================================= */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {selectedSubscriber.studentName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>التسلسل: {selectedSubscriber.sequence}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">
                      Student ID: {selectedSubscriber.studentId}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubscriber(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Row Columns 4, 5, 6 Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-400 font-bold block">
                      العمود الرابع (D)
                    </span>
                    <h4 className="font-bold text-sm text-white mt-0.5">
                      عدد مجموع النقاط
                    </h4>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {selectedSubscriber.totalScore !== undefined &&
                    String(selectedSubscriber.totalScore).trim() !== ""
                      ? selectedSubscriber.totalScore
                      : "0"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block">
                      حالة الاستبيان للمشترك
                    </span>
                    <h4 className="font-bold text-sm text-white mt-0.5">
                      {selectedSubscriber.hasAnswered
                        ? "أجاب (مقفول عن التكرار)"
                        : "لم يجب بعد (متاح له الدخول)"}
                    </h4>
                  </div>
                  {selectedSubscriber.hasAnswered && (
                    <button
                      type="button"
                      onClick={() => handleResetSubscriberAnswer(selectedSubscriber)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="مسح الإجابة السابقة والسماح للمشترك بالإجابة مرة أخرى"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>السماح بالإجابة مجدداً</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Column 5: Combined Answers (|||) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>العمود الخامس (E): تجميع كل الإجابات في خلية واحدة بفاصل (|||)</span>
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed break-words">
                  {selectedSubscriber.combinedAnswers || (
                    <span className="text-slate-500 font-sans">
                      لا توجد إجابات مسجلة لهذا المشترك بعد.
                    </span>
                  )}
                </div>

                {/* Parsed Individual Answers Preview */}
                {selectedSubscriber.combinedAnswers && (
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {selectedSubscriber.combinedAnswers
                      .split("|||")
                      .map((part, pIdx) => part.trim())
                      .filter(Boolean)
                      .map((ansPart, pIdx) => (
                        <div
                          key={pIdx}
                          className="px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-850 flex items-start gap-2 text-xs"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] shrink-0">
                            ج{pIdx + 1}
                          </span>
                          <span className="text-slate-200 font-medium">{ansPart}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Column 6: AI Analysis Report */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>العمود السادس (F): تحليل الذكاء الاصطناعي (خاص للإدارة)</span>
                  </h4>

                  <button
                    type="button"
                    disabled={analyzingStudentId === selectedSubscriber.studentId}
                    onClick={() => handleAnalyzeSubscriber(selectedSubscriber)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {analyzingStudentId === selectedSubscriber.studentId ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري قراءة الإجابات وتحليلها...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {selectedSubscriber.aiAnalysis
                            ? "إعادة تحليل الإجابات بالذكاء الاصطناعي"
                            : "توليد تحليل الذكاء الاصطناعي الآن"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/25 border border-purple-800/50 text-xs text-slate-100 leading-relaxed whitespace-pre-line">
                  {selectedSubscriber.aiAnalysis ? (
                    selectedSubscriber.aiAnalysis
                  ) : (
                    <span className="text-slate-400">
                      لم يتم توليد تحليل ذكي لهذا المشترك بعد. اضغط على زر «توليد تحليل الذكاء الاصطناعي الآن» أعلاه لقراءة إجاباته وتطبيق المعطيات الـ 11 وحفظها في الشيت.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `المشترك: ${selectedSubscriber.studentName} (${selectedSubscriber.studentId})\nمجموع النقاط: ${selectedSubscriber.totalScore || 0}\nالإجابات: ${selectedSubscriber.combinedAnswers || "-"}\n\n${selectedSubscriber.aiAnalysis || ""}`
                  );
                  setCopiedRecordSummary(true);
                  setTimeout(() => setCopiedRecordSummary(false), 2500);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedRecordSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم نسخ التقرير الكامل!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ بطاقة وتحليل المشترك</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubscriber(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMISSION DETAILS VIEW (عرض تفاصيل التسجيل)                       */}
      {/* ========================================================================= */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{selectedRecord.name || "مشترك بدون اسم"}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>رقم القيد: {selectedRecord.registrationId}</span>
                    <span>•</span>
                    <span>{selectedRecord.timestamp}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Total Score Highlight */}
              {selectedRecord.totalScore !== undefined && selectedRecord.totalScore !== "" && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-200">مجموع النقاط المحسوبة</h4>
                      <p className="text-xs text-emerald-400/80">من أسئلة التقييم (اختيارات 2)</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold font-mono text-emerald-400">
                    {selectedRecord.totalScore}
                  </div>
                </div>
              )}

              {/* Answers Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  تفاصيل الإجابات المسجلة:
                </h4>
                <div className="divide-y divide-slate-800 rounded-2xl bg-slate-950/50 border border-slate-800 overflow-hidden">
                  {Object.entries(selectedRecord.answers || {}).map(([qText, ansVal], aIdx) => {
                    const isLink =
                      typeof ansVal === "string" &&
                      (ansVal.startsWith("http://") || ansVal.startsWith("https://"));
                    return (
                      <div key={aIdx} className="p-3.5 space-y-1">
                        <div className="text-xs font-bold text-slate-300">{qText}</div>
                        {isLink ? (
                          <a
                            href={ansVal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>عرض المرفق / الملف ↗</span>
                          </a>
                        ) : (
                          <div className="text-xs text-slate-100 font-medium leading-relaxed bg-slate-900/60 p-2 rounded-lg">
                            {ansVal || <span className="text-slate-600 font-normal">لا توجد إجابة</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `اسم المشترك: ${selectedRecord.name}\nرقم التسجيل: ${selectedRecord.registrationId}\nالتاريخ: ${selectedRecord.timestamp}\nمجموع النقاط: ${selectedRecord.totalScore || "-"}`
                  );
                  setCopiedRecordSummary(true);
                  setTimeout(() => setCopiedRecordSummary(false), 2500);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-all"
              >
                {copiedRecordSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم نسخ الملخص!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ ملخص السجل</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT QUESTION (نافذة إضافة أو تعديل سؤال)                     */}
      {/* ========================================================================= */}
      {isEditingQuestionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingIndex !== null ? "تعديل السؤال" : "إضافة سؤال جديد"}
                  </h3>
                  <p className="text-xs text-slate-400">تحكم بجميع خصائص الحقل لورقة RegistrationQuestions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingQuestionModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  نص السؤال (العمود A) <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  value={editingQuestion.question || ""}
                  onChange={(e) => {
                    setEditingQuestion({ ...editingQuestion, question: e.target.value });
                    if (modalError) setModalError(null);
                  }}
                  placeholder="مثال: كم سنة مارست الخط العربي؟"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs sm:text-sm text-slate-100 outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  الوصف التوضيحي (العمود B):
                </label>
                <input
                  type="text"
                  value={editingQuestion.description || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, description: e.target.value })}
                  placeholder="وصف إضافي يظهر تحت السؤال للمشترك..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs sm:text-sm text-slate-100 outline-none"
                />
              </div>

              {/* Question Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  نوع العنصر (العمود C):
                </label>
                <select
                  value={editingQuestion.type || "choice"}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs sm:text-sm text-slate-100 outline-none font-medium"
                >
                  <option value="choice">اختيارات (راديو - خيار واحد)</option>
                  <option value="scored_choice">اختيارات 2 (حساب نقاط - خيار واحد مع مجموع)</option>
                  <option value="multiple_choice">اختيارات 3 (اختيار متعدد - Checkboxes أكثر من خيار)</option>
                  <option value="text">نص (إجابة نصية حرة)</option>
                  <option value="number">رقم (إدخال رقمي)</option>
                  <option value="phone">رقم هاتف (مع مفتاح الدولة)</option>
                  <option value="email">بريد إلكتروني (Email)</option>
                  <option value="file">رفع ملف (صورة / PDF لدرايف)</option>
                  <option value="image_display">صورة (عرض صورة توضيحية)</option>
                  <option value="button_title">عنوان زر (زر لفتح رابط خارجي / PDF)</option>
                </select>

                {/* Type Help Tip */}
                {editingQuestion.type === "scored_choice" && (
                  <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                    💡 <strong>اختيارات 2:</strong> اكتب الخيارات بهذا النمط: <code>1-مبتدئ|||2-متوسط|||3-متقدم</code> ليقوم الكود بجمع الأرقام تلقائياً ووضعها في عمود «مجموع النقاط».
                  </p>
                )}
                {editingQuestion.type === "multiple_choice" && (
                  <p className="text-[11px] text-cyan-400 bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                    ☑️ <strong>اختيارات 3:</strong> تتيح للمشترك اختيار عدة خيارات معاً أو تحديد الكل، وتُسجل في الشيت مفصولة بفاصلة.
                  </p>
                )}
              </div>

              {/* Options Management (if choice or multiple choice or scored) */}
              {(editingQuestion.type === "choice" ||
                editingQuestion.type === "scored_choice" ||
                editingQuestion.type === "multiple_choice") && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 block">
                      الخيارات المتاحة (العمود D):
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(editingQuestion.options || []).length} خيار
                    </span>
                  </div>

                  {/* Options Chips */}
                  {(editingQuestion.options || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(editingQuestion.options || []).map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-750 text-xs text-slate-200"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingQuestion.options || []).filter((_, i) => i !== oIdx);
                              setEditingQuestion({ ...editingQuestion, options: updated });
                            }}
                            className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="حذف الخيار"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 py-1">
                      لا توجد خيارات مضافة بعد — اكتب الخيار أدناه ثم اضغط «إضافة خيار».
                    </p>
                  )}

                  {/* Add Option Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newOptionInput.trim()) {
                          e.preventDefault();
                          const currentOpts = editingQuestion.options || [];
                          setEditingQuestion({
                            ...editingQuestion,
                            options: [...currentOpts, newOptionInput.trim()]
                          });
                          setNewOptionInput("");
                        }
                      }}
                      placeholder="اكتب خياراً ثم اضغط إضافة خيار..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newOptionInput.trim()) {
                          const currentOpts = editingQuestion.options || [];
                          setEditingQuestion({
                            ...editingQuestion,
                            options: [...currentOpts, newOptionInput.trim()]
                          });
                          setNewOptionInput("");
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-600/40 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة خيار</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Is Required Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">هل الحقل إجباري؟ (العمود E)</span>
                  <span className="text-[11px] text-slate-400">لن يتمكن المشترك من إرسال الاستمارة دون الإجابة عنه</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingQuestion.required}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Image URL (Column F) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  رابط الصورة المعروضة إن وجدت (العمود F):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingQuestion.imageUrl || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs font-mono text-slate-200 outline-none"
                />
              </div>

              {/* External Link / PDF (Column G) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  رابط خارجي أو ملف PDF إن وجد (العمود G):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingQuestion.externalLink || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, externalLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs font-mono text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingQuestionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  إلغاء
                </button>

                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      const idxToDelete = editingIndex;
                      setIsEditingQuestionModalOpen(false);
                      setEditingQuestion(null);
                      handleDeleteQuestion(idxToDelete);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/70 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف هذا السؤال</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveQuestionModal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                اعتماد السؤال في القائمة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
