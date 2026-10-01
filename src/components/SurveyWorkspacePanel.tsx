import React, { useState, useEffect } from "react";
import {
  RegistrationQuestion,
  SurveyDefinition,
  FormLang
} from "../types";
import {
  getSurveysList,
  createNextSurvey,
  updateSurveyInfo,
  getSurveyPublicUrl,
  getSurveyToken,
  getSheetNamesForSurvey
} from "../utils/surveyManager";
import {
  fetchFormQuestionsBridge,
  saveFormQuestionsBridge,
  DEFAULT_STAGE_SURVEY_QUESTIONS,
  isScoredQuestionType
} from "../utils/googleBackendBridge";
import { TranslationSettingsTab } from "./TranslationSettingsTab";
import { AnalysisSettingsTab } from "./AnalysisSettingsTab";
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  MoveUp,
  MoveDown,
  FileSpreadsheet,
  Globe,
  Sparkles,
  FileQuestion,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  X
} from "lucide-react";

interface SurveyWorkspacePanelProps {
  activeSurveyId: number;
  onSelectSurveyId: (id: number) => void;
  primaryQuestions: RegistrationQuestion[];
  onUpdatePrimaryQuestions: (q: RegistrationQuestion[]) => void;
  spreadsheetId: string;
  scriptUrl: string;
  currentLang: FormLang;
  onSurveysListChanged?: (surveys: SurveyDefinition[]) => void;
  onPreviewSurvey?: (surveyId: number) => void;
}

export const SurveyWorkspacePanel: React.FC<SurveyWorkspacePanelProps> = ({
  activeSurveyId,
  onSelectSurveyId,
  primaryQuestions,
  onUpdatePrimaryQuestions,
  spreadsheetId,
  scriptUrl,
  currentLang,
  onSurveysListChanged,
  onPreviewSurvey
}) => {
  const [surveys, setSurveys] = useState<SurveyDefinition[]>(() => getSurveysList());
  const [connectedSubTab, setConnectedSubTab] = useState<"questions" | "translations" | "analysis">("questions");

  // Questions state for the currently selected survey
  const [surveyQuestions, setSurveyQuestions] = useState<RegistrationQuestion[]>(primaryQuestions);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [savingQuestions, setSavingQuestions] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [copiedSurveyLink, setCopiedSurveyLink] = useState<number | null>(null);

  // Add New Survey Modal State
  const [isAddSurveyModalOpen, setIsAddSurveyModalOpen] = useState<boolean>(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState<string>("");
  const [newSurveySubtitle, setNewSurveySubtitle] = useState<string>("");
  const [newSurveyTemplate, setNewSurveyTemplate] = useState<"stage_4" | "copy_s1" | "empty">("stage_4");
  const [isCreatingSurvey, setIsCreatingSurvey] = useState<boolean>(false);

  // Question Add/Edit Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<RegistrationQuestion> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newOptionInput, setNewOptionInput] = useState<string>("");
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);

  const currentSurvey = surveys.find((s) => s.id === activeSurveyId) || surveys[0];

  const showNotice = (text: string, success = true) => {
    setNotice({ text, success });
    setTimeout(() => setNotice(null), 4500);
  };

  // Load questions whenever activeSurveyId changes
  const loadQuestionsForSurvey = async (sId: number, force = false) => {
    if (sId === 1 && !force && primaryQuestions.length > 0) {
      setSurveyQuestions(primaryQuestions);
      return;
    }
    setLoadingQuestions(true);
    try {
      const fetched = await fetchFormQuestionsBridge(scriptUrl, spreadsheetId, force, sId);
      setSurveyQuestions(fetched);
      if (sId === 1) {
        onUpdatePrimaryQuestions(fetched);
      }
    } catch (e) {
      console.error("Error loading survey questions:", e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    loadQuestionsForSurvey(activeSurveyId, false);
  }, [activeSurveyId, spreadsheetId, scriptUrl]);

  useEffect(() => {
    if (activeSurveyId === 1) {
      setSurveyQuestions(primaryQuestions);
    }
  }, [primaryQuestions, activeSurveyId]);

  // Create a new survey + provision its 2 sheets (RegistrationQuestions_N & RegistrationAnswers_N) + 3 columns in المشتركين
  const handleConfirmCreateSurvey = async () => {
    setIsCreatingSurvey(true);
    try {
      const nextNum = surveys.reduce((m, s) => Math.max(m, s.id), 1) + 1;
      const titleToUse = newSurveyTitle.trim() || `الاستبيان ${nextNum} (المرحلة ${nextNum})`;
      const { newSurvey, allSurveys } = createNextSurvey(titleToUse);

      let finalList = allSurveys;
      if (newSurveySubtitle.trim()) {
        finalList = updateSurveyInfo(newSurvey.id, {
          title: titleToUse,
          subtitle: newSurveySubtitle.trim()
        });
      }

      setSurveys(finalList);
      if (onSurveysListChanged) onSurveysListChanged(finalList);

      let starterQuestions: RegistrationQuestion[] = DEFAULT_STAGE_SURVEY_QUESTIONS;
      if (newSurveyTemplate === "copy_s1") {
        starterQuestions = primaryQuestions.map((q, i) => ({ ...q, id: i + 1 }));
      } else if (newSurveyTemplate === "empty") {
        starterQuestions = [
          {
            id: 1,
            question: "1. اكتب السؤال الأول لهذا الاستبيان هنا",
            type: "text",
            required: true
          }
        ];
      }

      // Immediately save to localStorage and create the 2 Google Sheets + 3 columns in المشتركين
      await saveFormQuestionsBridge(starterQuestions, scriptUrl, newSurvey.id);

      setIsAddSurveyModalOpen(false);
      setNewSurveyTitle("");
      setNewSurveySubtitle("");
      onSelectSurveyId(newSurvey.id);
      setSurveyQuestions(starterQuestions);
      setConnectedSubTab("questions");

      showNotice(
        `🎉 تم إنشاء «${titleToUse}» وتجهيز ورقتي الشيت (${newSurvey.questionsSheetName} و ${newSurvey.answersSheetName}) وإضافة 3 أعمدة جديدة في ورقة المشتركين بنجاح!`
      );
    } catch (e) {
      showNotice("حدث خطأ أثناء إنشاء الاستبيان الجديد.", false);
    } finally {
      setIsCreatingSurvey(false);
    }
  };

  const handleSaveQuestionsToSheet = async (updatedList: RegistrationQuestion[]) => {
    setSavingQuestions(true);
    setSurveyQuestions(updatedList);
    if (activeSurveyId === 1) {
      onUpdatePrimaryQuestions(updatedList);
    }
    const res = await saveFormQuestionsBridge(updatedList, scriptUrl, activeSurveyId);
    setSavingQuestions(false);
    showNotice(res.message, res.success);
  };

  const handleOpenAddQuestion = () => {
    setEditingIndex(null);
    setEditingQuestion({
      id: surveyQuestions.length + 1,
      question: "",
      description: "",
      type: "text",
      options: [],
      required: true,
      imageUrl: "",
      externalLink: ""
    });
    setNewOptionInput("");
    setQuestionModalError(null);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: RegistrationQuestion, idx: number) => {
    setEditingIndex(idx);
    setEditingQuestion({
      ...q,
      options: q.options ? [...q.options] : []
    });
    setNewOptionInput("");
    setQuestionModalError(null);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestionModal = async () => {
    if (!editingQuestion || !editingQuestion.question?.trim()) {
      setQuestionModalError("يرجى كتابة نص السؤال أولاً.");
      return;
    }

    const qObj: RegistrationQuestion = {
      id: editingIndex !== null ? surveyQuestions[editingIndex].id : surveyQuestions.length + 1,
      question: editingQuestion.question.trim(),
      description: editingQuestion.description?.trim() || undefined,
      type: editingQuestion.type || "text",
      options:
        editingQuestion.options && editingQuestion.options.length > 0
          ? editingQuestion.options
          : undefined,
      required: Boolean(editingQuestion.required),
      imageUrl: editingQuestion.imageUrl?.trim() || undefined,
      externalLink: editingQuestion.externalLink?.trim() || undefined,
      translations: editingQuestion.translations
    };

    const nextList = [...surveyQuestions];
    if (editingIndex !== null) {
      nextList[editingIndex] = qObj;
    } else {
      nextList.push(qObj);
    }

    const reindexed = nextList.map((item, i) => ({ ...item, id: i + 1 }));
    setIsQuestionModalOpen(false);
    await handleSaveQuestionsToSheet(reindexed);
  };

  const handleDeleteQuestion = async (idx: number) => {
    const nextList = surveyQuestions
      .filter((_, i) => i !== idx)
      .map((item, i) => ({ ...item, id: i + 1 }));
    await handleSaveQuestionsToSheet(nextList);
  };

  const handleMoveQuestion = async (idx: number, dir: "up" | "down") => {
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= surveyQuestions.length) return;
    const nextList = [...surveyQuestions];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    const reindexed = nextList.map((item, i) => ({ ...item, id: i + 1 }));
    await handleSaveQuestionsToSheet(reindexed);
  };

  const handleCopyLink = (sId: number) => {
    const url = getSurveyPublicUrl(sId);
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopiedSurveyLink(sId);
      setTimeout(() => setCopiedSurveyLink(null), 2500);
    }
  };

  // Helper to get column letters in المشتركين for a given surveyId
  const getSubscriberColumnsLabel = (sId: number) => {
    const startCol = 4 + (sId - 1) * 3; // 4=D, 7=G, 10=J...
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
    return `${toLetter(startCol)} و ${toLetter(startCol + 1)} و ${toLetter(startCol + 2)}`;
  };

  const { questionsSheetName, answersSheetName } = getSheetNamesForSurvey(activeSurveyId);
  const publicUrl = getSurveyPublicUrl(activeSurveyId);

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in ${
            notice.success
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
          }`}
        >
          {notice.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* TOP BAR: SURVEYS SELECTOR + ADD NEW SURVEY BUTTON */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                منظومة إدارة الاستبيانات المتعددة (الأسئلة + الترجمة + التحليل)
              </h2>
              <p className="text-xs text-slate-400">
                كل استبيان يجمع 3 أقسام متصلة ببعضها وله رابط مستقل وورقتان في قوقل شيت و3 أعمدة في ورقة المشتركين
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextNum = surveys.reduce((m, s) => Math.max(m, s.id), 1) + 1;
              setNewSurveyTitle(`الاستبيان ${nextNum}`);
              setNewSurveySubtitle(`استبيان تقييم المرحلة ${nextNum}`);
              setNewSurveyTemplate("stage_4");
              setIsAddSurveyModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة استبيان جديد +</span>
          </button>
        </div>

        {/* Survey Cards Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {surveys.map((srv) => {
            const isSelected = srv.id === activeSurveyId;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => onSelectSurveyId(srv.id)}
                className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-right transition-all min-w-[210px] cursor-pointer ${
                  isSelected
                    ? "bg-emerald-950/50 border-emerald-500 text-white shadow-md"
                    : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2 mb-1">
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    استبيان #{srv.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dir-ltr">
                    /?s={getSurveyToken(srv.id)}
                  </span>
                </div>
                <div className="font-bold text-xs sm:text-sm truncate w-full">
                  {srv.title}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{srv.questionsSheetName}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* UNIFIED SURVEY CONTAINER (يمثل الاستبيان الواحد بأقسامه الثلاثة المتصلة ورابطه الخاص) */}
      <div className="bg-slate-900 border-2 border-emerald-500/30 rounded-3xl overflow-hidden shadow-xl">
        {/* Survey Identity & Direct Link Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-l from-emerald-950/40 via-slate-900 to-slate-900 border-b border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Editable Survey Title */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black">
                  الاستبيان رقم #{activeSurveyId}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">
                  ورقة الأسئلة: {questionsSheetName}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-mono">
                  ورقة الإجابات: {answersSheetName}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                  أعمدة ورقة المشتركين: ({getSubscriberColumnsLabel(activeSurveyId)})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                <input
                  type="text"
                  value={currentSurvey?.title || ""}
                  onChange={(e) => {
                    const updated = updateSurveyInfo(activeSurveyId, { title: e.target.value });
                    setSurveys(updated);
                    if (onSurveysListChanged) onSurveysListChanged(updated);
                  }}
                  placeholder="عنوان الاستبيان..."
                  className="bg-slate-950/90 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm font-black text-white outline-none w-full sm:max-w-md"
                />
                <input
                  type="text"
                  value={currentSurvey?.subtitle || ""}
                  onChange={(e) => {
                    const updated = updateSurveyInfo(activeSurveyId, { subtitle: e.target.value });
                    setSurveys(updated);
                    if (onSurveysListChanged) onSurveysListChanged(updated);
                  }}
                  placeholder="وصف المرحلة أو الاستبيان..."
                  className="bg-slate-950/90 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-300 outline-none w-full sm:max-w-sm"
                />
              </div>
            </div>

            {/* Dedicated Survey Link Box */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2 min-w-[280px] sm:min-w-[340px]">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>الرابط المشفر الخاص بالاستبيان #{activeSurveyId}:</span>
                </span>
                <span className="font-mono text-emerald-300">/?s={getSurveyToken(activeSurveyId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  dir="ltr"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(activeSurveyId)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedSurveyLink === activeSurveyId ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
                {onPreviewSurvey && (
                  <button
                    type="button"
                    onClick={() => onPreviewSurvey(activeSurveyId)}
                    title="معاينة هذا الاستبيان"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3 CONNECTED SUB-SECTIONS NAVIGATION BAR (الأقسام الثلاثة المتصلة ببعضها) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setConnectedSubTab("questions")}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                connectedSubTab === "questions"
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                  : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    connectedSubTab === "questions"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black">1. قسم الأسئلة</div>
                  <div
                    className={`text-[11px] ${
                      connectedSubTab === "questions" ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    إدارة أسئلة ({questionsSheetName})
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  connectedSubTab === "questions"
                    ? "bg-white text-emerald-900"
                    : "bg-slate-800 text-emerald-400"
                }`}
              >
                {surveyQuestions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConnectedSubTab("translations")}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                connectedSubTab === "translations"
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                  : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    connectedSubTab === "translations"
                      ? "bg-white/20 text-white"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black">2. قسم الترجمة كاملة</div>
                  <div
                    className={`text-[11px] ${
                      connectedSubTab === "translations" ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    عربي • English • ภาษาไทย
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  connectedSubTab === "translations"
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-blue-400"
                }`}
              >
                3 لغات
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConnectedSubTab("analysis")}
              className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                connectedSubTab === "analysis"
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg"
                  : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    connectedSubTab === "analysis"
                      ? "bg-white/20 text-white"
                      : "bg-purple-500/10 text-purple-400"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black">3. قسم إعدادات التحليل</div>
                  <div
                    className={`text-[11px] ${
                      connectedSubTab === "analysis" ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    المعايير وبوابة الدخول للاستبيان #{activeSurveyId}
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  connectedSubTab === "analysis"
                    ? "bg-white/20 text-white"
                    : "bg-slate-800 text-purple-400"
                }`}
              >
                AI
              </span>
            </button>
          </div>
        </div>

        {/* CONNECTED SUB-SECTION BODY */}
        <div className="p-5 sm:p-6">
          {/* SUB-SECTION 1: QUESTIONS MANAGER */}
          {connectedSubTab === "questions" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>أسئلة {currentSurvey?.title}</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      {questionsSheetName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    أي تعديل أو إضافة يتم حفظه في النظام ومزامنته مباشرة مع ورقة ({questionsSheetName}) وتحديث أعمدة ({answersSheetName})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadQuestionsForSurvey(activeSurveyId, true)}
                    disabled={loadingQuestions}
                    title="تحديث الأسئلة من قوقل شيت"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingQuestions ? "animate-spin text-emerald-400" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveQuestionsToSheet(surveyQuestions)}
                    disabled={savingQuestions}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingQuestions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    <span>حفظ ومزامنة مع الشيت</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال جديد</span>
                  </button>
                </div>
              </div>

              {loadingQuestions ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-400">جاري تحميل أسئلة الاستبيان...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {surveyQuestions.map((q, idx) => {
                    const isScored = isScoredQuestionType(q.type);
                    return (
                      <div
                        key={`${q.id}-${idx}`}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-emerald-400 text-xs font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-sm text-white">{q.question}</h4>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                isScored
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {isScored
                                ? "اختيارات 2 (نقاط)"
                                : q.type === "choice"
                                ? "اختيارات"
                                : q.type === "multiple_choice"
                                ? "اختيار متعدد"
                                : q.type === "file"
                                ? "رفع ملف/صورة"
                                : "نص"}
                            </span>
                            {q.required && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-bold">
                                إجباري
                              </span>
                            )}
                          </div>

                          {q.options && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {q.options.map((opt, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "up")}
                            disabled={idx === 0}
                            title="تحريك لأعلى"
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(idx, "down")}
                            disabled={idx === surveyQuestions.length - 1}
                            title="تحريك لأسفل"
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(q, idx)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 transition-colors cursor-pointer"
                            title="حذف السؤال"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-SECTION 2: FULL TRANSLATIONS FOR THIS SURVEY */}
          {connectedSubTab === "translations" && (
            <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6">
              <TranslationSettingsTab
                questions={surveyQuestions}
                currentLang={currentLang}
                surveyId={activeSurveyId}
                scriptUrl={scriptUrl}
                onTranslationsUpdated={() => {
                  loadQuestionsForSurvey(activeSurveyId, false);
                }}
              />
            </div>
          )}

          {/* SUB-SECTION 3: ANALYSIS SETTINGS FOR THIS SURVEY */}
          {connectedSubTab === "analysis" && (
            <div>
              <AnalysisSettingsTab
                darkMode={true}
                surveyId={activeSurveyId}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CREATE NEW SURVEY */}
      {isAddSurveyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">إضافة استبيان جديد للمنصة</h3>
                  <p className="text-xs text-slate-400">
                    سيتم إنشاء ورقتي شيت جديدتين + 3 أعمدة في ورقة المشتركين تلقائياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSurveyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان الاستبيان الجديد:
                </label>
                <input
                  type="text"
                  value={newSurveyTitle}
                  onChange={(e) => setNewSurveyTitle(e.target.value)}
                  placeholder="مثال: الاستبيان 2 (التقييم البعدي / نهاية المستوى)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  وصف مختصر للاستبيان:
                </label>
                <input
                  type="text"
                  value={newSurveySubtitle}
                  onChange={(e) => setNewSurveySubtitle(e.target.value)}
                  placeholder="مثال: قياس تقدم المشترك بعد إتمام البرنامج التدريبي"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  الأسئلة الافتراضية للاستبيان الجديد:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 cursor-pointer hover:border-emerald-500/50">
                    <input
                      type="radio"
                      name="surveyTemplate"
                      checked={newSurveyTemplate === "stage_4"}
                      onChange={() => setNewSurveyTemplate("stage_4")}
                      className="mt-1 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        الأسئلة الافتراضية للمراحل (4 أسئلة جاهزة مع نقاطها وترجمتها - قابلة للزيادة)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        تتضمن تقييم الاستفادة، الالتزام بالتدريب، المهارات المتحسنة، والملاحظات.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 cursor-pointer hover:border-emerald-500/50">
                    <input
                      type="radio"
                      name="surveyTemplate"
                      checked={newSurveyTemplate === "copy_s1"}
                      onChange={() => setNewSurveyTemplate("copy_s1")}
                      className="mt-1 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        نسخ أسئلة الاستبيان الأول والتعديل عليها
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        ينسخ جميع أسئلة الاستبيان الأول لتتمكن من الحذف أو التعديل عليها.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/70 cursor-pointer hover:border-emerald-500/50">
                    <input
                      type="radio"
                      name="surveyTemplate"
                      checked={newSurveyTemplate === "empty"}
                      onChange={() => setNewSurveyTemplate("empty")}
                      className="mt-1 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">
                        البدء باستبيان جديد فارغ (سؤال واحد مبدئي)
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddSurveyModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateSurvey}
                disabled={isCreatingSurvey}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreatingSurvey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>إنشاء الاستبيان وتجهيز أوراق الشيت</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION */}
      {isQuestionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base">
                {editingIndex !== null ? "تعديل السؤال" : "إضافة سؤال جديد"} ({currentSurvey?.title})
              </h3>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {questionModalError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold">
                {questionModalError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  نص السؤال (بالعربية):
                </label>
                <input
                  type="text"
                  value={editingQuestion.question || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, question: e.target.value })
                  }
                  placeholder="اكتب السؤال هنا..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    نوع الحقل / السؤال:
                  </label>
                  <select
                    value={editingQuestion.type || "text"}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, type: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="scored_choice">اختيارات 2 (خيارات بنقاط تقييم)</option>
                    <option value="choice">اختيارات (اختيار واحد بدون نقاط)</option>
                    <option value="multiple_choice">اختيارات 3 (اختيار متعدد Checkboxes)</option>
                    <option value="text">نص مفتوح</option>
                    <option value="number">رقم</option>
                    <option value="phone">رقم هاتف</option>
                    <option value="email">بريد إلكتروني</option>
                    <option value="file">رفع ملف / صورة كتابة</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingQuestion.required)}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, required: e.target.checked })
                      }
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-200">حقل إجباري (مطلوب)</span>
                  </label>
                </div>
              </div>

              {(editingQuestion.type === "choice" ||
                editingQuestion.type === "scored_choice" ||
                editingQuestion.type === "multiple_choice") && (
                <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <label className="block text-xs font-bold text-emerald-400">
                    خيارات السؤال {editingQuestion.type === "scored_choice" ? "(مثال: 4 - ممتاز)" : ""}:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newOptionInput.trim()) {
                          e.preventDefault();
                          setEditingQuestion({
                            ...editingQuestion,
                            options: [...(editingQuestion.options || []), newOptionInput.trim()]
                          });
                          setNewOptionInput("");
                        }
                      }}
                      placeholder="أضف خياراً ثم اضغط إضافة..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newOptionInput.trim()) return;
                        setEditingQuestion({
                          ...editingQuestion,
                          options: [...(editingQuestion.options || []), newOptionInput.trim()]
                        });
                        setNewOptionInput("");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2 max-h-44 overflow-y-auto">
                    {(editingQuestion.options || []).map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                      >
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...(editingQuestion.options || [])];
                            nextOpts[oIdx] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: nextOpts });
                          }}
                          className="bg-transparent text-slate-200 flex-1 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextOpts = (editingQuestion.options || []).filter(
                              (_, i) => i !== oIdx
                            );
                            setEditingQuestion({ ...editingQuestion, options: nextOpts });
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveQuestionModal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                حفظ السؤال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
