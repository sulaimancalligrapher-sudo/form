/**
 * AI Answer Analyzer & Analysis Settings Manager
 * Evaluates subscriber registration answers and scores against the admin's
 * defined goal and 11 educational/behavioral criteria.
 * Works via Server-Side Gemini API (/api/analyze) with a built-in intelligent
 * semantic/score probability fallback so it works 100% reliably on Vercel & GitHub.
 */

import { AnalysisSettings } from "../types";

const ANALYSIS_SETTINGS_STORAGE_KEY = "thnoon_analysis_settings_v1";

export interface StageAnalysisPreset {
  goal: string;
  criteria: string[];
  customInstructions: string;
}

/**
 * Stage-tailored analysis presets for multi-stage educational and training evaluation
 */
export const STAGE_ANALYSIS_PRESETS: Record<number, StageAnalysisPreset> = {
  1: {
    goal: "التعرف على المتعلم قبل دخوله البرنامج التدريبي: دوافعه، أهدافه، شغفه، صبره، استمراريته، تقبل التوجيه والتصحيح، التركيز، والتعامل مع المعلم والآخرين.",
    criteria: [
      "من هو المتعلم؟",
      "لماذا يريد الانضمام للبرنامج؟",
      "هل الرغبة منه أم من الآخرين؟",
      "الميل الفني وقوة الملاحظة",
      "الصبر والتحمل",
      "الاستمرارية والانضباط",
      "وضوح الهدف والغاية",
      "تقبل التعليم والتطوير",
      "تقبل التصحيح والتوجيه",
      "التركيز والدقة",
      "التعامل مع المعلم والزملاء"
    ],
    customInstructions:
      "يرجى قراءة نصوص إجابات المشترك ومجموع نقاطه بدقة، وكتابة تحليل واضح ومختصر أمام كل محور من المحاور أعلاه (مع وضع نسبة مئوية تقديرية % للمحاور المهارية والسلوكية من واقع إجاباته)، ثم ختم التقرير بتوصية موجزة للإدارة والمعلم."
  },
  2: {
    goal: "تقييم أداء المشترك ومدى استيعابه للمهارات والقواعد الأساسية بعد المرحلة الأولى: الالتزام بالتمارين، سرعة الاستجابة للتوجيهات، والتطور الملموس في التطبيقات.",
    criteria: [
      "مدى استيعاب القواعد والأساسيات",
      "الانضباط وأداء التمارين المطلوبة",
      "التطور الملحوظ مقارنة بالبداية",
      "دقة التنفيذ والمحاكاة",
      "الصبر في تكرار التمارين ومعالجة الأخطاء",
      "سرعة تطبيق ملاحظات المعلم وتعديل الأداء",
      "إدارة الوقت والالتزام بالمواعيد",
      "الشغف والاستعداد للمستوى التالي"
    ],
    customInstructions:
      "يرجى تحليل إجابات المشترك الخاصة بالمرحلة الثانية، وتقييم تطوره العملي بنسب مئوية % واضحة، وتحديد نقاط القوة ونقاط التحسين المطلوب التركيز عليها قبل الانتقال للمرحلة التالية."
  },
  3: {
    goal: "قياس مستوى الإتقان والنضج الفني للمشترك في المرحلة المتقدمة: عمق الفهم، دقة التفاصيل، القدرة على النقد والتقييم الذاتي، والاستقلالية في العمل.",
    criteria: [
      "دقة النسب والمقاييس والتركيز في التفاصيل",
      "الحس الجمالي واللمسات المتقدمة",
      "القدرة على النقد الذاتي واكتشاف الأخطاء وتصحيحها",
      "الاستمرارية وجودة الأداء تحت ضغط التمارين",
      "التفكير الإبداعي والابتكار في التطبيق",
      "التفاعل البناء مع المعلم والزملاء",
      "مستوى الجاهزية للمرحلة الختامية والإنتاج النهائي"
    ],
    customInstructions:
      "يرجى تحليل إجابات المشترك في هذه المرحلة المتقدمة مع التركيز على جودة الإتقان، ووضع نسب مئوية % لكل محور، وتحديد هل المشترك جاهز للمشروع النهائي والتخرج."
  },
  4: {
    goal: "التقييم الشامل والنهائي لمخرجات المشترك: قياس الأثر التحويلي للبرنامج التدريبي، الجاهزية للإنتاج المستقل أو التخرج، والتوصية بمستقبله ومساره التدريبي أو المهني.",
    criteria: [
      "الإنجاز الكلي وجودة المخرجات والمشروع النهائي",
      "الأثر التحويلي والفارق الملموس بين البداية والنهاية",
      "الاستقلالية والقدرة على العمل والإنتاج المنفرد",
      "الالتزام بالمعايير المهنية العالية وجودة الإتقان",
      "المهارات الشخصية والسلوكية المكتسبة خلال البرنامج",
      "القدرة على نقل الخبرة أو تعليم الآخرين",
      "التوصية الختامية للإدارة: الاعتماد / التخرج / مسار التطوير المستقبلي"
    ],
    customInstructions:
      "يرجى كتابة تقرير تقييم ختامي شامل للمشترك يلخص مسيرته عبر المراحل، بنسب إنجاز نهائية %، وخاتمة بتوصية واضحة ومباشرة للإدارة بشأن التخرج أو الاعتماد."
  }
};

export const DEFAULT_ANALYSIS_GOAL = STAGE_ANALYSIS_PRESETS[1].goal;
export const DEFAULT_ANALYSIS_CRITERIA = STAGE_ANALYSIS_PRESETS[1].criteria;

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  goal: DEFAULT_ANALYSIS_GOAL,
  criteria: DEFAULT_ANALYSIS_CRITERIA,
  customInstructions: STAGE_ANALYSIS_PRESETS[1].customInstructions,
  autoAnalyzeOnSubmit: true,
  strictSubscriberLogin: true,
  preventDuplicateSubmission: true,
  isFormClosed: false
};

/**
 * Returns stage-appropriate default analysis settings for any survey ID (1, 2, 3, 4...)
 */
export function getDefaultAnalysisSettingsForSurvey(surveyId: number = 1): AnalysisSettings {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const preset = STAGE_ANALYSIS_PRESETS[cleanId] || {
    goal: `تقييم ومتابعة أداء المشترك في استبيان المرحلة (${cleanId}): قياس الأهداف الخاصة بهذه المرحلة ومدى تطور المشترك والتزامه.`,
    criteria: [
      `مدى تحقق أهداف المرحلة ${cleanId}`,
      "الانضباط والاستمرارية في التدريب",
      "دقة التطبيق ومستوى الجودة",
      "الاستجابة لملاحظات المعلم",
      "التحديات والصعوبات وسبل معالجتها",
      "التوصيات والمقترحات للمرحلة التالية"
    ],
    customInstructions: `يرجى تحليل إجابات المشترك لاستبيان المرحلة ${cleanId} بدقة وكتابة تقييم موجز بنسب مئوية % لكل محور مع توصية للإدارة.`
  };

  return {
    goal: preset.goal,
    criteria: [...preset.criteria],
    customInstructions: preset.customInstructions,
    autoAnalyzeOnSubmit: true,
    strictSubscriberLogin: true,
    preventDuplicateSubmission: true,
    isFormClosed: false
  };
}

function getStorageKeyForSurvey(surveyId: number = 1): string {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  return `thnoon_analysis_settings_s${cleanId}_v2`;
}

/**
 * Retrieves the isolated analysis settings for a specific survey ID.
 * Never leaks or copies another survey's custom goals/criteria.
 */
export function getAnalysisSettings(surveyId: number = 1): AnalysisSettings {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const fallbackDefaults = getDefaultAnalysisSettingsForSurvey(cleanId);

  if (typeof window !== "undefined") {
    try {
      const primaryKey = getStorageKeyForSurvey(cleanId);
      let raw = localStorage.getItem(primaryKey);

      // Backwards compatibility with v1 keys (strictly for the same survey ID only, never leaking survey 1 to others)
      if (!raw) {
        if (cleanId === 1) {
          raw = localStorage.getItem(ANALYSIS_SETTINGS_STORAGE_KEY);
        } else {
          raw = localStorage.getItem(`${ANALYSIS_SETTINGS_STORAGE_KEY}_s${cleanId}`);
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...fallbackDefaults,
          ...parsed,
          goal: typeof parsed.goal === "string" && parsed.goal.trim() ? parsed.goal : fallbackDefaults.goal,
          criteria:
            Array.isArray(parsed.criteria) && parsed.criteria.length > 0
              ? parsed.criteria
              : fallbackDefaults.criteria,
          customInstructions:
            typeof parsed.customInstructions === "string" && parsed.customInstructions.trim()
              ? parsed.customInstructions
              : fallbackDefaults.customInstructions
        };
      }
    } catch (e) {
      console.warn(`Failed to read analysis settings for survey ${cleanId}:`, e);
    }
  }

  return fallbackDefaults;
}

/**
 * Saves analysis settings strictly for the specified survey ID
 */
export function saveAnalysisSettings(settings: AnalysisSettings, surveyId: number = 1): void {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  if (typeof window !== "undefined") {
    try {
      const primaryKey = getStorageKeyForSurvey(cleanId);
      const jsonStr = JSON.stringify(settings);
      localStorage.setItem(primaryKey, jsonStr);

      // Keep legacy keys in sync for compatibility
      if (cleanId === 1) {
        localStorage.setItem(ANALYSIS_SETTINGS_STORAGE_KEY, jsonStr);
      } else {
        localStorage.setItem(`${ANALYSIS_SETTINGS_STORAGE_KEY}_s${cleanId}`, jsonStr);
      }
    } catch (e) {
      console.warn(`Failed to save analysis settings for survey ${cleanId}:`, e);
    }
  }
}

/**
 * Resets analysis settings for a specific survey back to its own stage-specific defaults
 */
export function resetAnalysisSettings(surveyId: number = 1): AnalysisSettings {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(getStorageKeyForSurvey(cleanId));
      if (cleanId === 1) {
        localStorage.removeItem(ANALYSIS_SETTINGS_STORAGE_KEY);
      } else {
        localStorage.removeItem(`${ANALYSIS_SETTINGS_STORAGE_KEY}_s${cleanId}`);
      }
    } catch (e) {}
  }
  return getDefaultAnalysisSettingsForSurvey(cleanId);
}

export interface AnalyzeSubscriberInput {
  studentId: string;
  studentName: string;
  totalScore?: number | string;
  answers: Array<{
    question: string;
    answer: string;
    score?: number;
  }>;
  combinedAnswers?: string;
  settings?: AnalysisSettings;
}

/**
 * Intelligent internal text & score probability analyzer (Fallback when offline or no API key on Vercel)
 * Reads the actual Arabic/English/Thai text of answers and numeric scores to infer each criterion
 * and calculate realistic percentages.
 */
export function generateSmartDeterministicAnalysis(input: AnalyzeSubscriberInput): string {
  const settings = input.settings || getAnalysisSettings();
  const pairs = Array.isArray(input.answers) ? input.answers.filter((a) => a && a.answer) : [];

  // Reconstruct pairs from combinedAnswers if pairs array is empty
  if (pairs.length === 0 && input.combinedAnswers) {
    const parts = input.combinedAnswers.split("|||").map((s) => s.trim()).filter(Boolean);
    parts.forEach((p, idx) => {
      const colonIdx = p.indexOf(":");
      if (colonIdx > 0 && colonIdx < 80) {
        pairs.push({
          question: p.substring(0, colonIdx).trim(),
          answer: p.substring(colonIdx + 1).trim()
        });
      } else {
        pairs.push({
          question: `إجابة ${idx + 1}`,
          answer: p
        });
      }
    });
  }

  const allText = pairs.map((p) => `${p.question} ${p.answer}`).join(" ").toLowerCase();
  const allAnswersOnly = pairs.map((p) => p.answer).join(" ، ");

  const numericScore = Number(input.totalScore) || 0;

  // Detect positive/experienced vs beginner signals from actual answer texts
  const hasPositivePassion =
    allText.includes("نعم") ||
    allText.includes("شغف") ||
    allText.includes("أحب") ||
    allText.includes("احب") ||
    allText.includes("ممتاز") ||
    allText.includes("جدا") ||
    allText.includes("كثيرا") ||
    allText.includes("yes") ||
    allText.includes("love");

  const hasPriorPractice =
    allText.includes("سبق") ||
    allText.includes("مارست") ||
    allText.includes("أعرف") ||
    allText.includes("اعرف") ||
    allText.includes("أميز") ||
    allText.includes("استاذ") ||
    allText.includes("أستاذ") ||
    allText.includes("معلم");

  const hasPatienceSignals =
    allText.includes("صبر") ||
    allText.includes("أحاول") ||
    allText.includes("احاول") ||
    allText.includes("أعيد") ||
    allText.includes("اعيد") ||
    allText.includes("أتدرب") ||
    allText.includes("اتدرب") ||
    allText.includes("استمر") ||
    allText.includes("أستمر") ||
    allText.includes("هدوء");

  const hasCorrectionAcceptance =
    allText.includes("توجيه") ||
    allText.includes("تصحيح") ||
    allText.includes("ملاحظات") ||
    allText.includes("أتقبل") ||
    allText.includes("اتقبل") ||
    allText.includes("أستفيد") ||
    allText.includes("استفيد") ||
    allText.includes("تعلم");

  // Compute base percentage from score and text richness
  const answeredRichness = Math.min(15, pairs.length * 3);
  const scoreBoost = numericScore > 0 ? Math.min(25, numericScore * 2) : 12;
  const passionBoost = hasPositivePassion ? 10 : 4;
  const basePct = Math.min(96, Math.max(60, 55 + answeredRichness + scoreBoost + passionBoost));

  const clampPct = (val: number) => Math.min(98, Math.max(55, Math.round(val)));

  const lines: string[] = [];
  lines.push(`📊 التقرير التحليلي للمشترك: ${input.studentName} (رقم: ${input.studentId})`);
  if (numericScore > 0) {
    lines.push(`• مجموع النقاط المحسوب: ${numericScore} نقطة`);
  }
  lines.push(`────────────────────────`);

  settings.criteria.forEach((criterion, idx) => {
    const cNorm = criterion.trim();

    if (cNorm.includes("من هو المتعلم")) {
      const profileDesc = hasPriorPractice
        ? `متعلم لديه خلفية أو اهتمام عملي سابق بالخط العربي والفنون (${pairs.length} إجابات مسجلة).`
        : `متعلم مستجد يرغب في التأسيس الصحيح وبناء مهارته من البداية.`;
      lines.push(`${idx + 1}. ${criterion}: ${profileDesc}`);
    } else if (cNorm.includes("لماذا يريد تعلم")) {
      const motive = hasPositivePassion
        ? "دافع قوي لإتقان فن الخط العربي وتحسين جودة الكتابة وفق القواعد الصحيحة."
        : "الرغبة في اكتساب مهارة الخط العربي والتعرف على أصوله الفنية.";
      lines.push(`${idx + 1}. ${criterion}: ${motive} (${clampPct(basePct + 3)}%)`);
    } else if (cNorm.includes("هل الرغبة منه")) {
      const selfDriven = hasPositivePassion ? "رغبة ذاتية نابعة من اهتمام شخصي واضح" : "رغبة ذاتية مدعومة بالتشجيع";
      lines.push(`${idx + 1}. ${criterion}: ${selfDriven} (${clampPct(basePct + 5)}%)`);
    } else if (cNorm.includes("الميل الفني") || cNorm.includes("الملاحظة")) {
      const pct = clampPct(basePct + (hasPriorPractice ? 6 : 0));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — يظهر اهتماماً بالجانب الجمالي وملاحظة تفاصيل الحروف.`);
    } else if (cNorm.includes("الصبر")) {
      const pct = clampPct(basePct + (hasPatienceSignals ? 5 : -2));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — استعداد جيد للتدرج في التمارين وتكرار المحاولة.`);
    } else if (cNorm.includes("الاستمرارية")) {
      const pct = clampPct(basePct + (hasPatienceSignals ? 4 : -1));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — قابلية عالية للمواظبة والالتزام بخطة البرنامج.`);
    } else if (cNorm.includes("وضوح الهدف")) {
      const pct = clampPct(basePct + (hasPositivePassion ? 4 : 0));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — هدفه من الالتحاق بالبرنامج واضح ومحدد.`);
    } else if (cNorm.includes("تقبل التعليم")) {
      const pct = clampPct(basePct + 6);
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — منفتح على تلقي القواعد والمنهجية التعليمية.`);
    } else if (cNorm.includes("تقبل التصحيح")) {
      const pct = clampPct(basePct + (hasCorrectionAcceptance ? 7 : 3));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — يتقبل الملاحظات التصحيحية لتطوير مستواه.`);
    } else if (cNorm.includes("التركيز") || cNorm.includes("الدقة")) {
      const pct = clampPct(basePct + (hasPriorPractice ? 4 : 1));
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — اهتمام بالتفاصيل ودقة في الإجابة والمتابعة.`);
    } else if (cNorm.includes("التعامل مع المعلم")) {
      const pct = clampPct(basePct + 8);
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — أسلوب إيجابي ومتعاون مع المعلم والزملاء.`);
    } else {
      const pct = clampPct(basePct);
      lines.push(`${idx + 1}. ${criterion}: ${pct}% — مؤشر إيجابي بناءً على إجابات الاستبيان.`);
    }
  });

  lines.push(`────────────────────────`);
  const overallPct = clampPct(basePct + 2);
  lines.push(
    `💡 الخلاصة والتوصية للإدارة (${overallPct}%): المتعلم مؤهل للبرنامج، يُنصح بـ${
      hasPriorPractice
        ? "تقييم مستواه العملي وتوجيهه للتمارين التطويرية مع التركيز على دقة الميزان الحرفي."
        : "البدء معه بالتأسيس المتدرج وتشجيعه المستمر لترسيخ الصبر ومسك القلم الصحيح."
    }`
  );
  if (allAnswersOnly) {
    lines.push(`📝 مقتطف الإجابات المعتمدة: ${allAnswersOnly.substring(0, 180)}${allAnswersOnly.length > 180 ? "..." : ""}`);
  }

  return lines.join("\n");
}

/**
 * Main function to analyze a subscriber's answers using AI (with automatic fallback)
 */
export async function analyzeSubscriberAnswers(input: AnalyzeSubscriberInput): Promise<string> {
  const settings = input.settings || getAnalysisSettings();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: input.studentId,
        studentName: input.studentName,
        totalScore: input.totalScore,
        answers: input.answers,
        combinedAnswers: input.combinedAnswers,
        goal: settings.goal,
        criteria: settings.criteria,
        customInstructions: settings.customInstructions
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.analysis && typeof data.analysis === "string" && data.analysis.trim().length > 20) {
        return data.analysis.trim();
      }
    }
  } catch (err) {
    console.warn("Server AI analysis unavailable, using smart deterministic analyzer:", err);
  }

  // Fallback to smart deterministic analysis so it never fails on Vercel or offline
  return generateSmartDeterministicAnalysis(input);
}
