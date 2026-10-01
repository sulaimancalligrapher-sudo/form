import React, { useState, useEffect } from "react";
import { AnalysisSettings } from "../types";
import {
  getAnalysisSettings,
  saveAnalysisSettings,
  resetAnalysisSettings
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
  UserCheck
} from "lucide-react";

interface AnalysisSettingsTabProps {
  onSettingsUpdated?: (settings: AnalysisSettings) => void;
  darkMode?: boolean;
  surveyId?: number;
}

export const AnalysisSettingsTab: React.FC<AnalysisSettingsTabProps> = ({
  onSettingsUpdated,
  darkMode = false,
  surveyId = 1
}) => {
  const [settings, setSettings] = useState<AnalysisSettings>(() => getAnalysisSettings(surveyId));
  const [newCriterion, setNewCriterion] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getAnalysisSettings(surveyId));
  }, [surveyId]);

  const persist = (updated: AnalysisSettings, message = "تم حفظ إعدادات التحليل وبوابة المشتركين تلقائياً!") => {
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) {
      onSettingsUpdated(updated);
    }
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleAddCriterion = () => {
    const trimmed = newCriterion.trim();
    if (!trimmed) return;
    const updated: AnalysisSettings = {
      ...settings,
      criteria: [...settings.criteria, trimmed]
    };
    setNewCriterion("");
    persist(updated, `تمت إضافة عنصر التحليل «${trimmed}» بنجاح!`);
  };

  const handleDeleteCriterion = (index: number) => {
    const updated: AnalysisSettings = {
      ...settings,
      criteria: settings.criteria.filter((_, i) => i !== index)
    };
    persist(updated, "تم حذف العنصر وتحديث القائمة!");
  };

  const handleUpdateCriterionText = (index: number, val: string) => {
    const next = [...settings.criteria];
    next[index] = val;
    const updated = { ...settings, criteria: next };
    setSettings(updated);
    saveAnalysisSettings(updated, surveyId);
    if (onSettingsUpdated) onSettingsUpdated(updated);
  };

  const handleReset = () => {
    const defaults = resetAnalysisSettings(surveyId);
    setSettings(defaults);
    if (onSettingsUpdated) onSettingsUpdated(defaults);
    setSavedNotice("تمت استعادة معطيات التحليل الـ 11 والإعدادات الافتراضية بنجاح!");
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const cardBg = darkMode
    ? "bg-slate-950/70 border-slate-800 text-slate-100"
    : "bg-slate-50/80 border-slate-200 text-slate-900";

  const inputBg = darkMode
    ? "bg-slate-900 border-slate-750 text-slate-100 focus:border-emerald-500"
    : "bg-white border-slate-200 text-slate-900 focus:border-emerald-600";

  const subText = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-5">
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
                التحكم بشروط فتح الاستبيان ومنع تكرار الإجابة وربطها بورقة «المشتركين»
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
                لا يفتح الاستبيان إلا إذا أدخل الطالب (Student ID) و(Student Name) الصحيحين الموجودين مسبقاً في ورقة «المشتركين».
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
                إذا كان المشترك قد أجاب على الاستبيان وسُجلت نتيجته في صفه، يُمنع من فتح الاستبيان أو الإجابة مرة ثانية.
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
                يقوم الذكاء الاصطناعي بقراءة الإجابات فور تسليمها ويكتب التحليل في العمود السادس (F) بنفس صف المشترك(للإدارة فقط).
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
                <span>إيقاف استقبال الإجابات مؤقتاً (قفل الاستبيان للجميع)</span>
              </span>
              <p className={`text-[11px] leading-relaxed ${subText}`}>
                عند تفعيل هذا الخيار، يتوقف الاستبيان عن استقبال أي إجابات جديدة حتى تعيد فتحه.
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

        {/* Sheet Structure Reference Box */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            darkMode
              ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="font-bold flex items-center gap-1.5">
            <span>📋 هيكل ورقة «المشتركين» المعتمد في Google Sheets (تُسجل النتائج في نفس صف المشترك):</span>
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
              <span className="block font-bold">العمود D (4)</span>
              <span>مجموع النقاط</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <span className="block font-bold">العمود E (5)</span>
              <span>الإجابات (|||)</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
              <span className="block font-bold">العمود F (6)</span>
              <span>تحليل الذكاء الاصطناعي</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: AI ANALYSIS GOAL & 11 CRITERIA */}
      <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                2. معطيات وأهداف تحليل الإجابات بالذكاء الاصطناعي
              </h4>
              <p className={`text-xs ${subText}`}>
                يقرأ الذكاء الاصطناعي إجابات المشترك ونقاطه ويضع تحليلاً ونسباً مئوية بناءً على هذه المعطيات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-xs font-bold transition-colors cursor-pointer"
            title="استعادة المعطيات الـ 11 الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
        </div>

        {/* Main Goal */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold block">الهدف العام من التحليل:</label>
          <textarea
            rows={2}
            value={settings.goal}
            onChange={(e) => {
              const updated = { ...settings, goal: e.target.value };
              setSettings(updated);
              saveAnalysisSettings(updated);
              if (onSettingsUpdated) onSettingsUpdated(updated);
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed outline-none ${inputBg}`}
            placeholder="اكتب الهدف العام من تحليل إجابات المتعلم..."
          />
        </div>

        {/* Criteria List (The 11 Points) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-emerald-500" />
              <span>عناصر ومحاور التحليل المطلوب معرفتها ({settings.criteria.length} عنصر):</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {settings.criteria.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-xl border ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateCriterionText(idx, e.target.value)}
                  className="flex-1 bg-transparent text-xs font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteCriterion(idx)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="حذف هذا العنصر"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new criterion */}
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
              placeholder="إضافة عنصر أو محور جديد للتحليل..."
              className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none ${inputBg}`}
            />
            <button
              type="button"
              onClick={handleAddCriterion}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عنصر</span>
            </button>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold block">تعليمات إضافية لطريقة صياغة التحليل والنسب المئوية:</label>
          <textarea
            rows={2}
            value={settings.customInstructions}
            onChange={(e) => {
              const updated = { ...settings, customInstructions: e.target.value };
              setSettings(updated);
              saveAnalysisSettings(updated);
              if (onSettingsUpdated) onSettingsUpdated(updated);
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed outline-none ${inputBg}`}
          />
        </div>
      </div>
    </div>
  );
};
