import { SurveyDefinition } from "../types";

const SURVEYS_STORAGE_KEY = "thnoon_surveys_definitions_v1";

/**
 * Generates a deterministic, non-sequential 6-character security token for any surveyId (1, 2, 3...)
 * Works identically on all devices (Vercel, phones, desktops) without needing database lookup,
 * while making it impossible for students to guess the next survey URL by typing 2, 3, 4.
 */
const PRESET_TOKENS: Record<number, string> = {
  1: "k8m2x9",
  2: "p4v9n3",
  3: "w7r5q2",
  4: "z3t8b6",
  5: "m9c4h7",
  6: "j2f6d8",
  7: "x5n8p4",
  8: "r6y3w9",
  9: "b8q2k5",
  10: "t4h7v3"
};

export function getSurveyToken(surveyId: number): string {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  if (PRESET_TOKENS[cleanId]) {
    return PRESET_TOKENS[cleanId];
  }
  // Deterministic non-sequential hash for surveyId > 10
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  let seed = (cleanId * 2654435761) >>> 0;
  let code = "";
  for (let i = 0; i < 6; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    code += alphabet[seed % alphabet.length];
  }
  return code;
}

/**
 * Resolves a non-sequential token from the URL back to its surveyId (1..200).
 * Rejects plain sequential numbers like "2", "3" so students cannot guess the next survey.
 */
export function resolveSurveyIdFromToken(rawToken: string | null | undefined): number {
  if (!rawToken) return 1;
  const clean = rawToken.trim().toLowerCase();
  if (!clean) return 1;

  for (let id = 1; id <= 200; id++) {
    if (getSurveyToken(id).toLowerCase() === clean) {
      return id;
    }
  }

  return 1;
}

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
 * Reads the active survey ID from current URL using the non-sequential token (?s=p4v9n3 or ?survey=p4v9n3)
 */
export function getActiveSurveyIdFromUrl(): number {
  if (typeof window === "undefined") return 1;
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("s") || params.get("survey");
    if (tokenParam) {
      return resolveSurveyIdFromToken(tokenParam);
    }
    if (window.location.hash) {
      const match = window.location.hash.match(/[?&](?:s|survey)=([a-z0-9]+)/i);
      if (match && match[1]) {
        return resolveSurveyIdFromToken(match[1]);
      }
    }
  } catch (e) {}
  return 1;
}

/**
 * Builds the shareable public link for a specific survey using its non-sequential token (/?s=k8m2x9)
 */
export function getSurveyPublicUrl(surveyId: number): string {
  const token = getSurveyToken(surveyId);
  if (typeof window === "undefined") return `/?s=${token}`;
  const cleanPath = window.location.pathname.replace(/\/admin\/?$/i, "").replace(/\/$/, "");
  return `${window.location.origin}${cleanPath}/?s=${token}`;
}
