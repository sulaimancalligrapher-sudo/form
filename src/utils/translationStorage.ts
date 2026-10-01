import { FormLang, FormTranslationsMap, QuestionTranslation } from "../types";
import { DEFAULT_FORM_TRANSLATIONS, DEFAULT_OPTION_TRANSLATIONS } from "../data/defaultFormTranslations";
import { UI_TRANSLATIONS } from "../data/defaultConfig";

const CUSTOM_QUESTIONS_KEY = "thnoon_custom_question_translations";
const CUSTOM_UI_KEY = "thnoon_custom_ui_translations";
const CUSTOM_HEADER_LOGO_KEY = "thnoon_custom_header_logo_url";

/**
 * Helper: Normalize Arabic question/option text for resilient lookup across devices
 * Strips leading question numbers ("2. ") or option scores ("1 - ") and normalizes spaces.
 */
function normalizeTextKey(text: string): string {
  return (text || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*([؟?])\s*$/g, "؟");
}

function stripLeadingNumberPrefix(text: string): string {
  return (text || "")
    .trim()
    .replace(/^\s*\d+\s*[.\-—–ـ:]\s*/, "")
    .trim();
}

/**
 * Retrieve custom header logo image URL
 */
export function getHeaderLogoUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CUSTOM_HEADER_LOGO_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Save custom header logo image URL
 */
export function saveHeaderLogoUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    if (url && url.trim()) {
      localStorage.setItem(CUSTOM_HEADER_LOGO_KEY, url.trim());
    } else {
      localStorage.removeItem(CUSTOM_HEADER_LOGO_KEY);
    }
  } catch (e) {
    console.warn("Failed to save header logo:", e);
  }
}

/**
 * Retrieve user-customized question translations from localStorage
 */
export function getCustomQuestionTranslations(): FormTranslationsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Failed to read custom question translations:", e);
    return {};
  }
}

/**
 * Save user-customized question translations to localStorage
 */
export function saveCustomQuestionTranslations(map: FormTranslationsMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save custom question translations:", e);
  }
}

/**
 * Merge cloud-fetched question translations into localStorage without losing existing entries
 */
export function mergeCloudQuestionTranslations(cloudMap: FormTranslationsMap): boolean {
  if (typeof window === "undefined" || !cloudMap || typeof cloudMap !== "object") return false;
  try {
    const localMap = getCustomQuestionTranslations();
    let changed = false;
    const merged: FormTranslationsMap = { ...localMap };

    for (const [qKey, cloudTrans] of Object.entries(cloudMap)) {
      if (!cloudTrans || typeof cloudTrans !== "object") continue;
      const existing = merged[qKey] || {};
      const next: QuestionTranslation = {
        ...existing,
        ...cloudTrans
      };
      if (JSON.stringify(existing) !== JSON.stringify(next)) {
        merged[qKey] = next;
        changed = true;
      }
    }

    if (changed) {
      localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(merged));
    }
    return changed;
  } catch (e) {
    return false;
  }
}

/**
 * Retrieve user-customized UI translations from localStorage
 */
export function getCustomUiTranslations(): Record<FormLang, Record<string, string>> {
  if (typeof window === "undefined") {
    return { ar: {}, en: {}, th: {} };
  }
  try {
    const raw = localStorage.getItem(CUSTOM_UI_KEY);
    return raw ? JSON.parse(raw) : { ar: {}, en: {}, th: {} };
  } catch (e) {
    console.warn("Failed to read custom UI translations:", e);
    return { ar: {}, en: {}, th: {} };
  }
}

/**
 * Save user-customized UI translations to localStorage
 */
export function saveCustomUiTranslations(map: Record<FormLang, Record<string, string>>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_UI_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save custom UI translations:", e);
  }
}

/**
 * Get merged UI translations dictionary for a specific language
 */
export function getEffectiveUiTranslations(lang: FormLang): Record<string, string> {
  const defaults = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.ar;
  const customs = getCustomUiTranslations()[lang] || {};
  return { ...defaults, ...customs };
}

/**
 * Find translation in a map using exact, normalized, or number-stripped matching
 */
function findMatchingQuestionTranslation(
  map: Record<string, QuestionTranslation>,
  questionText: string
): QuestionTranslation | undefined {
  const trimmed = (questionText || "").trim();
  if (!trimmed) return undefined;

  if (map[trimmed]) return map[trimmed];
  if (map[questionText]) return map[questionText];

  const normTarget = normalizeTextKey(trimmed);
  const strippedTarget = normalizeTextKey(stripLeadingNumberPrefix(trimmed));
  const leadNumMatch = trimmed.match(/^\s*(\d+\s*[.\-—–])\s*/);
  const leadNumPrefix = leadNumMatch ? leadNumMatch[1].trim() + " " : "";

  for (const [k, v] of Object.entries(map)) {
    const normK = normalizeTextKey(k);
    const strippedK = normalizeTextKey(stripLeadingNumberPrefix(k));
    if (normK === normTarget) {
      return v;
    }
    if (strippedTarget && strippedK === strippedTarget) {
      // Preserve leading question number if original question had one and matched entry didn't
      const result: QuestionTranslation = { ...v };
      if (leadNumPrefix) {
        if (result.questionEn && !/^\s*\d+/.test(result.questionEn)) {
          result.questionEn = `${leadNumPrefix}${result.questionEn}`;
        }
        if (result.questionTh && !/^\s*\d+/.test(result.questionTh)) {
          result.questionTh = `${leadNumPrefix}${result.questionTh}`;
        }
      }
      return result;
    }
  }

  return undefined;
}

/**
 * Translate a single option string using DEFAULT_OPTION_TRANSLATIONS dictionary
 */
export function getBuiltInOptionTranslation(rawOption: string, lang: "en" | "th"): string | undefined {
  if (!rawOption) return undefined;
  const trimmed = rawOption.trim();
  const cleanOpt = stripLeadingNumberPrefix(trimmed);

  const exact = DEFAULT_OPTION_TRANSLATIONS[trimmed] || DEFAULT_OPTION_TRANSLATIONS[cleanOpt];
  if (exact) {
    return lang === "th" ? exact.th : exact.en;
  }

  // Normalized lookup
  const normClean = normalizeTextKey(cleanOpt);
  for (const [k, v] of Object.entries(DEFAULT_OPTION_TRANSLATIONS)) {
    if (normalizeTextKey(k) === normClean || normalizeTextKey(stripLeadingNumberPrefix(k)) === normClean) {
      return lang === "th" ? v.th : v.en;
    }
  }

  return undefined;
}

/**
 * Get merged question translation for a specific question text (and optionally its options)
 */
export function getEffectiveQuestionTranslation(
  questionText: string,
  options?: string[]
): QuestionTranslation {
  const defaultTrans = findMatchingQuestionTranslation(DEFAULT_FORM_TRANSLATIONS, questionText) || {};
  const customMap = getCustomQuestionTranslations();
  const customTrans = findMatchingQuestionTranslation(customMap, questionText) || {};

  const merged: QuestionTranslation = {
    ...defaultTrans,
    ...customTrans
  };

  // Ensure optionsEn and optionsTh are populated from built-in option dictionary if missing
  if (options && options.length > 0) {
    const currentEn = merged.optionsEn ? [...merged.optionsEn] : [];
    const currentTh = merged.optionsTh ? [...merged.optionsTh] : [];
    let hasEn = false;
    let hasTh = false;

    for (let i = 0; i < options.length; i++) {
      const rawOpt = options[i];
      if (!currentEn[i] || !currentEn[i].trim()) {
        const dictEn = getBuiltInOptionTranslation(rawOpt, "en");
        if (dictEn) currentEn[i] = dictEn;
      }
      if (currentEn[i] && currentEn[i].trim()) hasEn = true;

      if (!currentTh[i] || !currentTh[i].trim()) {
        const dictTh = getBuiltInOptionTranslation(rawOpt, "th");
        if (dictTh) currentTh[i] = dictTh;
      }
      if (currentTh[i] && currentTh[i].trim()) hasTh = true;
    }

    if (hasEn) merged.optionsEn = currentEn;
    if (hasTh) merged.optionsTh = currentTh;
  }

  return merged;
}

/**
 * Clear all custom translations and reset back to defaults
 */
export function resetAllTranslationsToDefaults(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOM_QUESTIONS_KEY);
    localStorage.removeItem(CUSTOM_UI_KEY);
  } catch (e) {
    console.warn("Failed to reset translations:", e);
  }
}
