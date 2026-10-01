import { SurveyDefinition } from "../types";

const SURVEYS_STORAGE_KEY = "thnoon_surveys_definitions_v1";

export const DEFAULT_SURVEYS: SurveyDefinition[] = [
  {
    id: 1,
    title: "الاستبيان 1 (الرئيسي / التقييم القبلي)",
    subtitle: "استبيان التقييم الأساسي قبل البرنامج التدريبي",
    questionsSheetName: "RegistrationQuestions",
    answersSheetName: "RegistrationAnswers"
  }
];

/**
 * Generates standard sheet names for any survey ID (1, 2, 3, 4...)
 */
export function getSheetNamesForSurvey(surveyId: number): {
  questionsSheetName: string;
  answersSheetName: string;
} {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  if (cleanId === 1) {
    return {
      questionsSheetName: "RegistrationQuestions",
      answersSheetName: "RegistrationAnswers"
    };
  }
  return {
    questionsSheetName: `RegistrationQuestions_${cleanId}`,
    answersSheetName: `RegistrationAnswers_${cleanId}`
  };
}

/**
 * Retrieves the list of configured surveys (always includes Survey 1)
 */
export function getSurveysList(): SurveyDefinition[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SURVEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure Survey 1 is always present
          const hasOne = parsed.some((s: SurveyDefinition) => Number(s.id) === 1);
          const list: SurveyDefinition[] = hasOne ? parsed : [DEFAULT_SURVEYS[0], ...parsed];
          return list
            .map((s) => {
              const names = getSheetNamesForSurvey(s.id);
              return {
                ...s,
                id: Number(s.id),
                questionsSheetName: s.questionsSheetName || names.questionsSheetName,
                answersSheetName: s.answersSheetName || names.answersSheetName
              };
            })
            .sort((a, b) => a.id - b.id);
        }
      }
    } catch (e) {}
  }
  return DEFAULT_SURVEYS;
}

/**
 * Saves the surveys list to localStorage
 */
export function saveSurveysList(surveys: SurveyDefinition[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SURVEYS_STORAGE_KEY, JSON.stringify(surveys));
  } catch (e) {}
}

/**
 * Ensures surveys discovered from Google Sheets (e.g., extra columns in المشتركين) are registered
 */
export function ensureSurveysUpTo(maxSurveyId: number): SurveyDefinition[] {
  const current = getSurveysList();
  let updated = [...current];
  let changed = false;

  for (let id = 1; id <= maxSurveyId; id++) {
    if (!updated.some((s) => Number(s.id) === id)) {
      const names = getSheetNamesForSurvey(id);
      updated.push({
        id,
        title: `الاستبيان ${id}`,
        subtitle: `استبيان المرحلة ${id}`,
        questionsSheetName: names.questionsSheetName,
        answersSheetName: names.answersSheetName
      });
      changed = true;
    }
  }

  if (changed) {
    updated = updated.sort((a, b) => a.id - b.id);
    saveSurveysList(updated);
  }
  return updated;
}

/**
 * Returns a specific survey definition by ID (works on any device even if not in localStorage)
 */
export function getSurveyById(surveyId: number): SurveyDefinition {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const list = getSurveysList();
  const found = list.find((s) => Number(s.id) === cleanId);
  if (found) return found;

  const names = getSheetNamesForSurvey(cleanId);
  return {
    id: cleanId,
    title: cleanId === 1 ? "الاستبيان 1 (الرئيسي)" : `الاستبيان ${cleanId}`,
    subtitle: `استبيان المرحلة ${cleanId}`,
    questionsSheetName: names.questionsSheetName,
    answersSheetName: names.answersSheetName
  };
}

/**
 * Creates a new survey definition (Survey 2, 3, 4...) and persists it
 */
export function createNextSurvey(customTitle?: string): {
  newSurvey: SurveyDefinition;
  allSurveys: SurveyDefinition[];
} {
  const current = getSurveysList();
  const maxId = current.reduce((max, s) => Math.max(max, Number(s.id) || 1), 1);
  const nextId = maxId + 1;
  const names = getSheetNamesForSurvey(nextId);

  const newSurvey: SurveyDefinition = {
    id: nextId,
    title: customTitle?.trim() || `الاستبيان ${nextId}`,
    subtitle: `استبيان المرحلة ${nextId}`,
    questionsSheetName: names.questionsSheetName,
    answersSheetName: names.answersSheetName,
    createdAt: new Date().toISOString()
  };

  const allSurveys = [...current, newSurvey].sort((a, b) => a.id - b.id);
  saveSurveysList(allSurveys);
  return { newSurvey, allSurveys };
}

/**
 * Updates the title/subtitle of a survey
 */
export function updateSurveyInfo(
  surveyId: number,
  updates: Partial<Pick<SurveyDefinition, "title" | "subtitle">>
): SurveyDefinition[] {
  const current = getSurveysList();
  const next = current.map((s) =>
    Number(s.id) === Number(surveyId) ? { ...s, ...updates } : s
  );
  saveSurveysList(next);
  return next;
}

/**
 * Reads the active survey ID from current URL (?survey=1, ?survey=2, etc.)
 */
export function getActiveSurveyIdFromUrl(): number {
  if (typeof window === "undefined") return 1;
  try {
    const params = new URLSearchParams(window.location.search);
    const sParam = params.get("survey") || params.get("s") || params.get("stage");
    if (sParam) {
      const num = parseInt(sParam, 10);
      if (!isNaN(num) && num >= 1) return num;
    }
    // Check hash params if any (e.g. #/?survey=2)
    if (window.location.hash.includes("survey=")) {
      const match = window.location.hash.match(/survey=(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= 1) return num;
      }
    }
  } catch (e) {}
  return 1;
}

/**
 * Builds the shareable public link for a specific survey (?survey=1, ?survey=2...)
 */
export function getSurveyPublicUrl(surveyId: number): string {
  if (typeof window === "undefined") return `/?survey=${surveyId}`;
  const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, "").replace(/\/$/, "");
  return `${window.location.origin}${cleanPath}/?survey=${surveyId}`;
}
