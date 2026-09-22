import { FormLang, FormTranslationsMap, QuestionTranslation } from "../types";
import { DEFAULT_FORM_TRANSLATIONS } from "../data/defaultFormTranslations";
import { UI_TRANSLATIONS } from "../data/defaultConfig";

const CUSTOM_QUESTIONS_KEY = "thnoon_custom_question_translations";
const CUSTOM_UI_KEY = "thnoon_custom_ui_translations";
const CUSTOM_HEADER_LOGO_KEY = "thnoon_custom_header_logo_url";

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
 * Get merged question translation for a specific question text
 */
export function getEffectiveQuestionTranslation(questionText: string): QuestionTranslation {
  const trimmed = questionText.trim();
  const defaultTrans = DEFAULT_FORM_TRANSLATIONS[trimmed] || DEFAULT_FORM_TRANSLATIONS[questionText] || {};
  const customMap = getCustomQuestionTranslations();
  const customTrans = customMap[trimmed] || customMap[questionText] || {};

  return {
    ...defaultTrans,
    ...customTrans
  };
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
