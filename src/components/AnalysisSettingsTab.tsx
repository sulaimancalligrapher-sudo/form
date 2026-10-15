import React, { useState, useEffect } from "react";
import { AnalysisSettings } from "../types";
import {
  getAnalysisSettings,
  saveAnalysisSettings,
  resetAnalysisSettings,
  STAGE_ANALYSIS_PRESETS
} from "../utils/aiAnalyzer";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ListChecks,
  Target,
  UserCheck,
  BookOpen,
  Layers,
  Check
} from "lucide-react";

interface AnalysisSettingsTabProps {
  onSettingsUpdated?: (settings: AnalysisSettings) => void;
  darkMode?: boolean;
  surveyId?: number;
  surveyTitle?: string;
}

export const AnalysisSettingsTab: React.FC<AnalysisSettingsTabProps> = ({
  onSettingsUpdated,
  darkMode = false,
  surveyId = 1,
  surveyTitle
}) => {
  const [settings, setSettings] = useState<AnalysisSettings>(() => getAnalysisSettings(surveyId));
  const [newCriterion, setNewCriterion] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const displayTitle = surveyTitle || `الاستبيان ${surveyId} (المرحلة ${surveyId})`;

  useEffect(() => {
    setSettings(getAnalysisSettings(surveyId));
  }, [surveyId]);

  const persist = (
    updated: AnalysisSettings,
    message = `تم حفظ إعدادات تحليل ${displayTitle} تلقائياً!`
  ) => {
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) {
      onSettingsUpdated(updated);
    }
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleGoalChange = (newGoal: string) => {
    const updated: AnalysisSettings = { ...settings, goal: newGoal };
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) onSettingsUpdated(updated);
  };

  const handleInstructionsChange = (newInstructions: string) => {
    const updated: AnalysisSettings = { ...settings, customInstructions: newInstructions };
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) onSettingsUpdated(updated);
  };

  const handleAddCriterion = () => {
    const trimmed = newCriterion.trim();
    if (!trimmed) return;
    const updated: AnalysisSettings = {
      ...settings,
      criteria: [...settings.criteria, trimmed]
    };
    setNewCriterion("");
    persist(updated, `تمت إضافة المحور «${trimmed}» بنجاح لـ ${displayTitle}!`);
  };

  const handleDeleteCriterion = (index: number) => {
    const updated: AnalysisSettings = {
      ...settings,
      criteria: settings.criteria.filter((_, i) => i !== index)
    };
    persist(updated, `تم حذف المحور وتحديث قائمة محاور ${displayTitle}!`);
  };

  const handleUpdateCriterionText = (index: number, val: string) => {
    const next = [...settings.criteria];
    next[index] = val;
    const updated: AnalysisSettings = { ...settings, criteria: next };
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) onSettingsUpdated(updated);
  };

  const handleReset = () => {
    const defaults = resetAnalysisSettings(surveyId);
    setSettings(defaults);
    if (onSettingsUpdated) onSettingsUpdated(defaults);
    setSavedNotice(`تمت استعادة المعطيات والمحاور الافتراضية الخاصة بـ (${displayTitle}) بنجاح!`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleApplyPreset = (presetStageId: number) => {
    const preset = STAGE_ANALYSIS_PRESETS[presetStageId];
    if (!preset) return;
    const updated: AnalysisSettings = {
      ...settings,
      goal: preset.goal,
      criteria: [...preset.criteria],
      customInstructions: preset.customInstructions
    };
    persist(
      updated,
      `تم تطبيق قالب معطيات (المرحلة ${presetStageId}) بنجاح على «${displayTitle}»!`
    );
  };

  // Calculate dynamic column letters for this survey in ورقة المشتركين
  const startCol = 4 + (surveyId - 1) * 3;
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
  const colScoreLetter = toLetter(startCol);
  const colAnswersLetter = toLetter(startCol + 1);
  const colAnalysisLetter = toLetter(startCol + 2);

  const cardBg = darkMode
    ? "bg-slate-950/70 border-slate-800 text-slate-100"
    : "bg-slate-50/80 border-slate-200 text-slate-900";

  const inputBg = darkMode
    ? "bg-slate-900 border-slate-750 text-slate-100 focus:border-emerald-500"
    : "bg-white border-slate-200 text-slate-900 focus:border-emerald-600";

  const subText = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
      {/* Active Survey Stage Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-emerald-950/30 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
            {surveyId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                إعدادات تحليل مستقلة
              </span>
              <h3 className="font-bold text-sm text-white">{displayTitle}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              الأهداف والمحاور في هذا القسم خاصة بهذا الاستبيان (المرحلة {surveyId}) فقط ولا تؤثر على باقي المراحل
            </p>
          </div>
        </div>

        {/* Quick presets buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold ml-1">قوالب جاهزة:</span>
          {[1, 2, 3, 4].map((stageNum) => (
            <button
              key={stageNum}
              type="button"
              onClick={() => handleApplyPreset(stageNum)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                surveyId === stageNum
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
              }`}
              title={`تطبيق معطيات ومحاور المرحلة ${stageNum}`}
            >
              قالب م{stageNum}
            </button>
          ))}
        </div>
      </div>

      {/* Status Toast */}
      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* SECTION 1: SUBSCRIBER LOGIN GATE & DUPLICATE PREVENTION */}
      <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
        <div className="flex items-center justify-between border-b border-slate-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                1. بوابة تسجيل دخول المشتركين وقفل الاستبيان (ورقة المشتركين)
              </h4>
              <p className={`text-xs ${subText}`}>
                التحكم بشروط فتح {displayTitle} ومنع تكرار الإجابة وربطها بورقة «المشتركين»
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Toggle 1: Strict Verification against المشتركين sheet */}
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
              darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold block flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>اشتراط تطابق الاسم والرقم مع ورقة «المشتركين»</span>
              </span>
              <p className={`text-[11px] leading-relaxed ${subText}`}>
                لا يفتح {displayTitle} إلا إذا أدخل الطالب (Student ID) و(Student Name) الصحيحين الموجودين مسبقاً في ورقة «المشتركين».
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.strictSubscriberLogin}
                onChange={(e) =>
                  persist({ ...settings, strictSubscriberLogin: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Toggle 2: Prevent Duplicate Submission */}
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
              darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold block flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>منع الإجابة مرة أخرى إذا تم الإجابة مسبقاً</span>
              </span>
              <p className={`text-[11px] leading-relaxed ${subText}`}>
                إذا كان المشترك قد أجاب على {displayTitle} وسُجلت نتيجته في أعمدته الخاصة، يُمنع من الإجابة عليه مرة ثانية.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.preventDuplicateSubmission}
                onChange={(e) =>
                  persist({ ...settings, preventDuplicateSubmission: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Toggle 3: Auto AI Analysis on Submit */}
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
              darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>تحليل الإجابات تلقائياً فور الإرسال</span>
              </span>
              <p className={`text-[11px] leading-relaxed ${subText}`}>
                يقوم الذكاء الاصطناعي بقراءة إجابات {displayTitle} فور تسليمها ويكتب التحليل في العمود ({colAnalysisLetter}) بنفس صف المشترك (للإدارة فقط).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.autoAnalyzeOnSubmit}
                onChange={(e) =>
                  persist({ ...settings, autoAnalyzeOnSubmit: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Toggle 4: Close Form Temporarily */}
          <div
            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
              settings.isFormClosed
                ? "bg-rose-950/30 border-rose-500/50"
                : darkMode
                ? "bg-slate-900/80 border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold block flex items-center gap-1.5 text-rose-500">
                <Lock className="w-3.5 h-3.5" />
                <span>إيقاف استقبال إجابات {displayTitle} مؤقتاً</span>
              </span>
              <p className={`text-[11px] leading-relaxed ${subText}`}>
                عند تفعيل هذا الخيار، يتوقف هذا الاستبيان عن استقبال أي إجابات جديدة حتى تعيد فتحه.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.isFormClosed}
                onChange={(e) =>
                  persist({ ...settings, isFormClosed: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>
        </div>

        {/* Sheet Structure Reference Box for THIS Survey */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            darkMode
              ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="font-bold flex items-center justify-between flex-wrap gap-2">
            <span>📋 موقع تسجيل بيانات «{displayTitle}» في ورقة المشتركين (Google Sheets):</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              الأعمدة ({colScoreLetter} - {colAnswersLetter} - {colAnalysisLetter})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono pt-1">
            <div className="p-2 rounded-lg bg-black/10 text-center">
              <span className="block font-bold">العمود A (1)</span>
              <span>رقم تسلسل</span>
            </div>
            <div className="p-2 rounded-lg bg-black/10 text-center">
              <span className="block font-bold">العمود B (2)</span>
              <span>Student ID</span>
            </div>
            <div className="p-2 rounded-lg bg-black/10 text-center">
              <span className="block font-bold">العمود C (3)</span>
              <span>Student Name</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <span className="block font-bold">العمود {colScoreLetter} ({startCol})</span>
              <span>مجموع نقاط {displayTitle}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <span className="block font-bold">العمود {colAnswersLetter} ({startCol + 1})</span>
              <span>إجابات {displayTitle} (|||)</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <span className="block font-bold">العمود {colAnalysisLetter} ({startCol + 2})</span>
              <span>تحليل الذكاء الاصطناعي</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI ANALYSIS GOAL & CRITERIA SPECIFIC TO THIS SURVEY */}
      <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">
                  2. معطيات وأهداف تحليل الإجابات بالذكاء الاصطناعي
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {displayTitle}
                </span>
              </div>
              <p className={`text-xs ${subText} mt-0.5`}>
                يقرأ الذكاء الاصطناعي إجابات المشترك في {displayTitle} ونقاطه ويضع تحليلاً ونسباً مئوية بناءً على هذه المعطيات الخاصة بهذه المرحلة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-xs font-bold transition-colors cursor-pointer"
            title={`استعادة معطيات ومحاور المرحلة ${surveyId} الافتراضية`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة افتراضي المرحلة {surveyId}</span>
          </button>
        </div>

        {/* Main Goal for this stage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold block flex items-center gap-1.5">
              <span>الهدف العام من تحليل إجابات ({displayTitle}):</span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              (مستقل وخاص بهذا الاستبيان فقط)
            </span>
          </div>
          <textarea
            rows={2}
            value={settings.goal}
            onChange={(e) => handleGoalChange(e.target.value)}
            onBlur={() => persist(settings, `تم حفظ الهدف العام لـ ${displayTitle} بنجاح!`)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed outline-none transition-all ${inputBg}`}
            placeholder={`اكتب الهدف العام من تحليل إجابات المشترك في ${displayTitle}...`}
          />
        </div>

        {/* Criteria List for this stage */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-emerald-500" />
              <span>
                عناصر ومحاور التحليل المطلوب معرفتها في ({displayTitle}) — ({settings.criteria.length} محور):
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settings.criteria.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  darkMode ? "bg-slate-900 border-slate-800 focus-within:border-emerald-500/50" : "bg-white border-slate-200"
                }`}
              >
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateCriterionText(idx, e.target.value)}
                  onBlur={() => persist(settings, `تم حفظ تعديل المحور ${idx + 1} لـ ${displayTitle}!`)}
                  className="flex-1 bg-transparent text-xs font-semibold outline-none text-slate-100"
                  placeholder="نص المحور أو العنصر..."
                />
                <button
                  type="button"
                  onClick={() => handleDeleteCriterion(idx)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف هذا المحور"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new criterion for this stage */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCriterion();
                }
              }}
              placeholder={`إضافة عنصر أو محور تحليلي جديد خاص بـ (${displayTitle})...`}
              className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none ${inputBg}`}
            />
            <button
              type="button"
              onClick={handleAddCriterion}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة محور للمرحلة</span>
            </button>
          </div>
        </div>

        {/* Custom Instructions for this stage */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold block">
              تعليمات إضافية لصياغة تقرير ونسب ({displayTitle}):
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              (خاصة بهذه المرحلة)
            </span>
          </div>
          <textarea
            rows={2}
            value={settings.customInstructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            onBlur={() => persist(settings, `تم حفظ التعليمات الإضافية لـ ${displayTitle}!`)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed outline-none transition-all ${inputBg}`}
            placeholder={`اكتب أي تعليمات خاصة لصياغة تقرير ونسب الذكاء الاصطناعي لـ ${displayTitle}...`}
          />
        </div>
      </div>
    </div>
  );
};
