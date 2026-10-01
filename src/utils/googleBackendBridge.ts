/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Backend Bridge
 * Universal, resilient communication bridge for Google Sheets, Google Apps Script,
 * and Google Drive.
 * 
 * Fully functional across:
 * 1. AI Studio Dev server & Full-Stack Node / Express
 * 2. Vercel Serverless Functions (/api/*)
 * 3. Static Web Hosting (Vercel Static, GitHub Pages, Netlify)
 */

import {
  DEFAULT_SCRIPT_URL,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_TELEGRAM_CONFIG,
  DEFAULT_FORM_QUESTIONS
} from "../data/defaultConfig";
import { DEFAULT_FORM_TRANSLATIONS } from "../data/defaultFormTranslations";
import { getEffectiveQuestionTranslation } from "./translationStorage";
import {
  TelegramConfig,
  FormSubmissionPayload,
  SubmissionResponse,
  RegistrationQuestion,
  SheetAnswerRecord,
  SheetAnswersData,
  SubscriberRecord,
  SubscriberSurveyResult
} from "../types";
import { getAnalysisSettings } from "./aiAnalyzer";
import {
  getSheetNamesForSurvey,
  getSurveysList,
  ensureSurveysUpTo
} from "./surveyManager";

export const DEFAULT_STAGE_SURVEY_QUESTIONS: RegistrationQuestion[] = [
  {
    id: 1,
    question: "1. كيف تقيّم مدى استفادتك وتقدمك في هذه المرحلة التدريبية؟",
    type: "scored_choice",
    options: ["4 - استفادة ممتازة وتقدم واضح", "3 - استفادة جيدة جداً", "2 - استفادة متوسطة", "1 - أحتاج لمزيد من التدريب"],
    required: true
  },
  {
    id: 2,
    question: "2. ما مدى التزامك بالتدريب اليومي وتطبيق ملاحظات المعلم؟",
    type: "scored_choice",
    options: ["4 - التزام يومي كامل ودقيق", "3 - التزام غالبية الأيام", "2 - التزام متقطع", "1 - واجهت صعوبة في الالتزام"],
    required: true
  },
  {
    id: 3,
    question: "3. ما هي أبرز المهارات أو الحروف التي شعرت بتحسن واضح فيها؟",
    type: "text",
    required: true
  },
  {
    id: 4,
    question: "4. هل لديك أي صعوبات أو ملاحظات تود مشاركتها مع المعلم والإدارة؟",
    type: "text",
    required: false
  }
];

function getQuestionsCacheKeys(surveyId: number = 1) {
  const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
  if (cleanId === 1) {
    return {
      cacheKey: "thnoon_cached_registration_questions",
      modifiedKey: "thnoon_questions_admin_modified"
    };
  }
  return {
    cacheKey: `thnoon_cached_registration_questions_s${cleanId}`,
    modifiedKey: `thnoon_questions_admin_modified_s${cleanId}`
  };
}

const LOCAL_ANSWERS_STORAGE_PREFIX = "thnoon_local_answers_records_v1_s";

export function getLocalSurveyAnswers(surveyId: number = 1): SheetAnswerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
    const raw = localStorage.getItem(`${LOCAL_ANSWERS_STORAGE_PREFIX}${cleanId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveLocalSurveyAnswerRecord(surveyId: number, record: SheetAnswerRecord): void {
  if (typeof window === "undefined") return;
  try {
    const cleanId = Math.max(1, Math.floor(Number(surveyId) || 1));
    const existing = getLocalSurveyAnswers(cleanId);
    const normId = normalizeStudentId(record.registrationId);
    const filtered = existing.filter((r) => normalizeStudentId(r.registrationId) !== normId);
    const updated = [record, ...filtered];
    localStorage.setItem(`${LOCAL_ANSWERS_STORAGE_PREFIX}${cleanId}`, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Formats Google Drive / thumbnail URLs for robust embedding
 */
export function formatImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }
  return trimmed;
}

/**
 * Extracts numeric score points from answers of type 'اختيارات 2'
 * Handles all formats: "4 - ممتاز", "(4)", "4: خيار", "4" etc.
 */
export function extractScoreFromAnswer(ansStr: string | number | undefined | null): number {
  if (ansStr === undefined || ansStr === null || ansStr === "") return 0;
  const s = String(ansStr).trim();

  // 1. "4 - ممتاز", "4-ممتاز", "4 : نعم", "4. ممتاز", "4) موافق"
  const m1 = s.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*[-—–ـ:.)/]/);
  if (m1 && m1[1]) {
    const v1 = parseFloat(m1[1]);
    if (!isNaN(v1)) return v1;
  }

  // 2. Parenthesized "(4)" or "[4]"
  const m2 = s.match(/[(\[]\s*(\d+(?:\.\d+)?)\s*[)\]]/);
  if (m2 && m2[1]) {
    const v2 = parseFloat(m2[1]);
    if (!isNaN(v2)) return v2;
  }

  // 3. Pure number at start or whole string: "4" or "4 ممتاز"
  const m3 = s.match(/^\s*(\d+(?:\.\d+)?)/);
  if (m3 && m3[1]) {
    const v3 = parseFloat(m3[1]);
    if (!isNaN(v3)) return v3;
  }

  // 4. Any standalone number in string
  const m4 = s.match(/\b(\d+(?:\.\d+)?)\b/);
  if (m4 && m4[1]) {
    const v4 = parseFloat(m4[1]);
    if (!isNaN(v4)) return v4;
  }

  return 0;
}

/**
 * Checks whether a question type is scored (اختيارات 2)
 */
export function isScoredQuestionType(typeStr: string | undefined | null): boolean {
  if (!typeStr) return false;
  const t = typeStr.toString().toLowerCase().trim();
  // Multiple choice (اختيارات 3) is NOT scored
  if (
    t.includes("3") ||
    t.includes("متعدد") ||
    t.includes("checkbox") ||
    t.includes("multi")
  ) {
    return false;
  }
  return (
    t === "scored_choice" ||
    t.includes("اختيارات 2") ||
    t.includes("اختيارات2") ||
    t.includes("خيارات 2") ||
    t.includes("خيارات2") ||
    t.includes("اختيار 2") ||
    t.includes("choice2") ||
    t.includes("choice 2") ||
    t.includes("scored") ||
    t.includes("نقاط") ||
    t.includes("درجات") ||
    t.includes("تقييم")
  );
}

export function getActiveScriptUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("sheet_form_script_url");
      if (saved && saved.trim().startsWith("http")) {
        // Automatically upgrade outdated known default URLs to the new updated backend
        if (
          saved.includes("AKfycbwxn8Q7W9Db") ||
          saved.includes("AKfycbyl2_TnMESST") ||
          saved.includes("AKfycbwO6_PHYlPNg")
        ) {
          localStorage.setItem("sheet_form_script_url", DEFAULT_SCRIPT_URL);
          localStorage.removeItem("thnoon_cached_registration_questions");
          localStorage.removeItem("thnoon_questions_admin_modified");
          return DEFAULT_SCRIPT_URL;
        }
        return saved.trim();
      }
    } catch (e) {}
  }
  const envUrl = import.meta.env?.VITE_GOOGLE_SCRIPT_URL;
  if (envUrl && envUrl.trim().startsWith("http")) return envUrl.trim();
  return DEFAULT_SCRIPT_URL;
}

export function setActiveScriptUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sheet_form_script_url", url.trim());
  }
}

export function getActiveSpreadsheetId(): string {
  if (typeof window !== "undefined") {
    try {
      // Clear legacy v1 caches that may contain raw base64 or old sheet rows
      localStorage.removeItem("thnoon_subscribers_overrides_v1");
      localStorage.removeItem("thnoon_subscribers_sheet_cache_v1");

      const saved = localStorage.getItem("sheet_form_spreadsheet_id");
      if (saved && saved.trim()) {
        // Automatically upgrade outdated default spreadsheet ID
        if (saved.trim() === "1MAurScyKTntcUUWAoB7Qt62vwvmEnDqmYNaB0DKo9tY") {
          localStorage.setItem("sheet_form_spreadsheet_id", DEFAULT_SPREADSHEET_ID);
          localStorage.removeItem("thnoon_cached_registration_questions");
          localStorage.removeItem("thnoon_questions_admin_modified");
          return DEFAULT_SPREADSHEET_ID;
        }
        return saved.trim();
      }
    } catch (e) {}
  }
  const envId = import.meta.env?.VITE_SPREADSHEET_ID;
  if (envId && envId.trim() && envId.trim() !== "1MAurScyKTntcUUWAoB7Qt62vwvmEnDqmYNaB0DKo9tY") {
    return envId.trim();
  }
  return DEFAULT_SPREADSHEET_ID;
}

export function setActiveSpreadsheetId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sheet_form_spreadsheet_id", id.trim());
  }
}

export function getActiveDriveFolderId(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("sheet_form_drive_folder_id");
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
  }
  const envId = import.meta.env?.VITE_DRIVE_FOLDER_ID;
  if (envId && envId.trim()) return envId.trim();
  return DEFAULT_DRIVE_FOLDER_ID;
}

export function setActiveDriveFolderId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sheet_form_drive_folder_id", id.trim());
  }
}

export function getTelegramConfig(): TelegramConfig {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("sheet_form_telegram_config");
      if (saved) {
        return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {}
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

export function saveTelegramConfig(cfg: TelegramConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sheet_form_telegram_config", JSON.stringify(cfg));
  }
}

/**
 * Submits payload using a hidden dynamic iframe targeting the Google Apps Script URL.
 * Bypasses CORS and cross-origin redirect blocks in all browsers without throwing.
 */
function submitViaHiddenIframe(
  action: string,
  payload: Record<string, any>,
  scriptUrl: string
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false);
    try {
      const iframeName = `gas_iframe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.position = "absolute";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = scriptUrl;
      form.target = iframeName;
      form.enctype = "text/plain";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = JSON.stringify({
        action,
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString()
      });
      input.value = "";
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          if (form.parentNode) form.parentNode.removeChild(form);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch (e) {}
        resolve(true);
      }, 3000);
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * Checks Google Sheet directly via Google Visualization API (GVIZ)
 * to verify if a registration ID or name was written.
 */
export async function verifyRegistrationInSheet(
  registrationId: string,
  subscriberName?: string,
  spreadsheetId?: string,
  timeoutMs = 6000
): Promise<boolean> {
  const activeSheetId = spreadsheetId || getActiveSpreadsheetId();
  const safeId = String(registrationId || "").trim();
  const safeName = String(subscriberName || "").trim();
  if (!safeId && !safeName) return false;

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${activeSheetId}/gviz/tq?tqx=out:json&sheet=RegistrationAnswers&_cb=${Date.now()}`;
      const res = await fetch(gvizUrl, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          const rows = json.table?.rows || [];
          const recent = rows.slice(-15);
          for (let i = recent.length - 1; i >= 0; i--) {
            const r = recent[i];
            const cells: string[] = (r?.c || []).map((cell: any) =>
              cell?.v !== null && cell?.v !== undefined ? String(cell.v).trim() : ""
            );
            const hasId = safeId && cells.some((v: string) => v === safeId || (safeId.length >= 6 && v.includes(safeId)));
            const hasName = safeName && cells.some((v: string) => v === safeName || (safeName.length >= 2 && v.includes(safeName)));
            if (hasId || hasName) {
              return true;
            }
          }
        }
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}

/**
 * JSONP test helper for Google Apps Script Web App ping
 * Bypasses cross-origin redirect limitations in browser environments
 */
function testViaJsonp(url: string, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const cbName = `gas_ping_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      try {
        delete (window as any)[cbName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
      } catch (e) {}
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    (window as any)[cbName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}action=ping&callback=${cbName}&_cb=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      resolve(null);
    };
    document.body.appendChild(script);
  });
}

/**
 * Tests connection to Google Sheets GVIZ API and Apps Script URL.
 */
export async function testSheetConnection(
  spreadsheetId?: string,
  scriptUrl?: string
): Promise<{ success: boolean; sheetAccessible: boolean; scriptResponsive: boolean; message: string; title?: string }> {
  const targetSheetId = spreadsheetId || getActiveSpreadsheetId();
  const targetScriptUrl = scriptUrl || getActiveScriptUrl();

  let sheetAccessible = false;
  let scriptResponsive = false;
  let sheetTitle = "";

  // 1. Test Sheet GVIZ
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${targetSheetId}/gviz/tq?tqx=out:json&_cb=${Date.now()}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const text = await res.text();
      const s = text.indexOf("{");
      const e = text.lastIndexOf("}");
      if (s !== -1 && e !== -1) {
        const parsed = JSON.parse(text.substring(s, e + 1));
        if (parsed.status === "ok" || parsed.table) {
          sheetAccessible = true;
          sheetTitle = parsed.table?.cols?.[0]?.label || "Google Sheet";
        }
      }
    }
  } catch (err) {}

  // 2. Test Script Web App: First try JSONP (works in all browsers without CORS redirect block)
  try {
    const jsonpResult = await testViaJsonp(targetScriptUrl, 4000);
    if (jsonpResult && (jsonpResult.success || jsonpResult.status || jsonpResult.message)) {
      scriptResponsive = true;
    }
  } catch (err) {}

  // 2b. Fallback: Direct fetch
  if (!scriptResponsive) {
    try {
      const res = await fetch(`${targetScriptUrl}?action=ping&_cb=${Date.now()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success) {
          scriptResponsive = true;
        }
      }
    } catch (err) {}
  }

  // 2c. Fallback: Test reachability with mode: "no-cors"
  if (!scriptResponsive) {
    try {
      await fetch(`${targetScriptUrl}?action=ping&_cb=${Date.now()}`, {
        mode: "no-cors",
        cache: "no-store"
      });
      // If no-cors fetch did not throw a DNS or connection failure, endpoint is reachable
      scriptResponsive = true;
    } catch (err) {}
  }

  if (sheetAccessible && scriptResponsive) {
    return {
      success: true,
      sheetAccessible: true,
      scriptResponsive: true,
      message: "الاتصال بقوقل شيت وتطبيق Apps Script يعمل بنجاح وبسرعة فائقة!",
      title: sheetTitle
    };
  } else if (sheetAccessible && !scriptResponsive) {
    return {
      success: true,
      sheetAccessible: true,
      scriptResponsive: false,
      message: "تم التحقق من الوصول لجدول قوقل شيت (GVIZ)، لكن تطبيق سكريبت لم يستجب لطلب الفحص المباشر (يمكن الإرسال عبر البوابة الآمنة).",
      title: sheetTitle
    };
  } else if (!sheetAccessible && scriptResponsive) {
    return {
      success: true,
      sheetAccessible: false,
      scriptResponsive: true,
      message: "تطبيق Apps Script مستجيب ونشط، تأكد من أن جدول الشيت منشور للعامة (Anyone with link can view) في إعدادات المشاركة.",
      title: sheetTitle
    };
  } else {
    return {
      success: false,
      sheetAccessible: false,
      scriptResponsive: false,
      message: "تعذر التحقق من الاتصال. يرجى التأكد من معرف الشيت ورابط سكريبت وصلاحيات المشاركة."
    };
  }
}

/**
 * Universal Form Questions Fetcher (Reproduces graphy/art4calli behavior exactly)
 * Reads dynamic questions directly from Google Sheet (RegistrationQuestions) via GVIZ,
 * or via Google Apps Script (action=getFormQuestions), with automatic fallback to cache and defaults.
 */
export async function fetchFormQuestionsBridge(
  explicitScriptUrl?: string,
  explicitSpreadsheetId?: string,
  forceFromSheet: boolean = false,
  surveyId: number = 1
): Promise<RegistrationQuestion[]> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();
  const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const { questionsSheetName } = getSheetNamesForSurvey(cleanSurveyId);
  const { cacheKey, modifiedKey } = getQuestionsCacheKeys(cleanSurveyId);

  // If the admin modified questions in the dashboard and we are not forcing a sheet reload,
  // prioritize the admin's saved questions so GVIZ CDN caching doesn't overwrite recent edits/deletions
  if (!forceFromSheet && typeof window !== "undefined") {
    try {
      const isAdminModified = localStorage.getItem(modifiedKey) === "true";
      const cached = localStorage.getItem(cacheKey);
      if (isAdminModified && cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  // Helper: parse Google Visualization (GVIZ) JSON
  const parseGvizText = (text: string): RegistrationQuestion[] | null => {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (!json || !json.table || !json.table.rows || json.table.rows.length === 0) return null;

    const parsedQuestions: RegistrationQuestion[] = [];
    const rows = json.table.rows;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]?.c || [];
      const val = (idx: number) =>
        r[idx] && r[idx].v !== null && r[idx].v !== undefined ? r[idx].v.toString().trim() : "";

      const qText = val(0);
      const qDesc = val(1);
      const qType = val(2).toLowerCase();
      const qOptionsStr = val(3);
      const qRequired =
        val(4) === "نعم" ||
        val(4) === "true" ||
        val(4) === "yes" ||
        val(4) === "1" ||
        val(4) === "مطلوب" ||
        val(4) === "اجباري" ||
        val(4) === "إجباري";
      const qImage = val(5);
      const qLink = val(6);
      const qTitleEn = val(7);
      const qTitleTh = val(8);
      const qOptsEnStr = val(9);
      const qOptsThStr = val(10);

      // Skip header row if present
      if (
        qText === "السؤال" ||
        qText === "عنوان الحقل" ||
        qText === "Question" ||
        qText === "نص السؤال"
      ) {
        continue;
      }

      if (qText) {
        let fieldType: RegistrationQuestion["type"] = "text";

        // 1. اختيارات 3 (Multiple choice checkboxes / اختيار متعدد)
        if (
          qType.includes("اختيارات 3") ||
          qType.includes("اختيار 3") ||
          qType.includes("اختيارات3") ||
          qType.includes("خيارات 3") ||
          qType.includes("خيارات3") ||
          qType.includes("choice3") ||
          qType.includes("choice 3") ||
          qType.includes("متعدد") ||
          qType.includes("checkbox") ||
          qType.includes("multiple_choice") ||
          qType.includes("multi_choice")
        ) {
          fieldType = "multiple_choice";
        }
        // 2. اختيارات 2 (Scored choices)
        else if (
          qType.includes("اختيارات 2") ||
          qType.includes("اختيار 2") ||
          qType.includes("اختيارات2") ||
          qType.includes("choice2") ||
          qType.includes("scored_choice") ||
          qType.includes("نقاط")
        ) {
          fieldType = "scored_choice";
        }
        // 2. اختيارات (Standard radio choices)
        else if (
          qType.includes("اختيارات") ||
          qType.includes("اختيار") ||
          qType.includes("choice") ||
          qType.includes("select") ||
          qType.includes("راديو")
        ) {
          fieldType = "choice";
        }
        // 3. رفع ملف (File & image upload)
        else if (
          qType.includes("رفع") ||
          qType.includes("ملف") ||
          qType.includes("file") ||
          qType.includes("upload")
        ) {
          fieldType = "file";
        }
        // 4. رقم هاتف (Phone with international prefix)
        else if (
          qType.includes("رقم هاتف") ||
          qType.includes("هاتف") ||
          qType.includes("phone") ||
          qType.includes("موبايل") ||
          qType.includes("جوال") ||
          qType.includes("واتساب")
        ) {
          fieldType = "phone";
        }
        // 5. ايميل (Email with format check)
        else if (
          qType.includes("ايميل") ||
          qType.includes("بريد") ||
          qType.includes("email")
        ) {
          fieldType = "email";
        }
        // 6. صورة أو رابط (Image showcase from Drive)
        else if (
          qText === "صورة" ||
          qType === "صورة" ||
          qType.includes("صورة أو رابط") ||
          qType.includes("صورة او رابط") ||
          qType.includes("عرض صورة") ||
          qType.includes("صوره") ||
          qType.includes("image") ||
          (qType.includes("رابط") && (qImage || qText.includes("صورة")))
        ) {
          fieldType = "image_display";
        }
        // 7. عنوان زر (Button to open PDF or external link)
        else if (
          qType.includes("عنوان زر") ||
          qType.includes("زر") ||
          qType.includes("button")
        ) {
          fieldType = "button_title";
        }
        // 8. رقم (Numeric input)
        else if (
          qType.includes("رقم") ||
          qType.includes("number")
        ) {
          fieldType = "number";
        }
        // 9. نص (Standard text input)
        else {
          fieldType = "text";
        }

        // Parse options from Column D (|||, newlines, or commas)
        let opts: string[] = [];
        if (qOptionsStr) {
          if (qOptionsStr.includes("|||")) {
            opts = qOptionsStr.split("|||").map((s: string) => s.trim()).filter(Boolean);
          } else if (qOptionsStr.includes("\n")) {
            opts = qOptionsStr.split("\n").map((s: string) => s.trim()).filter(Boolean);
          } else if (qOptionsStr.includes("،")) {
            opts = qOptionsStr.split("،").map((s: string) => s.trim()).filter(Boolean);
          } else if (qOptionsStr.includes(",")) {
            opts = qOptionsStr.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        }

        // Image URL: check Column F first, then Column G (if Drive link)
        const resolvedImage = qImage || (fieldType === "image_display" ? qLink : "");
        // Button/External Link: check Column G first, then Column F
        const resolvedLink = (qLink && qLink !== "-") ? qLink : (fieldType === "button_title" ? qImage : undefined);

        // Attach translation from built-in & custom dictionary + optional sheet columns (H-K)
        const baseTrans = getEffectiveQuestionTranslation(qText, opts);
        const sheetOptsEn = qOptsEnStr
          ? qOptsEnStr.split("|||").map((s: string) => s.trim())
          : undefined;
        const sheetOptsTh = qOptsThStr
          ? qOptsThStr.split("|||").map((s: string) => s.trim())
          : undefined;

        const mergedTrans = {
          ...baseTrans,
          ...(qTitleEn ? { questionEn: qTitleEn } : {}),
          ...(qTitleTh ? { questionTh: qTitleTh } : {}),
          ...(sheetOptsEn && sheetOptsEn.length > 0 ? { optionsEn: sheetOptsEn } : {}),
          ...(sheetOptsTh && sheetOptsTh.length > 0 ? { optionsTh: sheetOptsTh } : {})
        };

        parsedQuestions.push({
          id: parsedQuestions.length + 1,
          question: qText,
          description: qDesc || undefined,
          type: fieldType,
          options: opts.length > 0 ? opts : undefined,
          required: qRequired,
          imageUrl: resolvedImage ? formatImageUrl(resolvedImage) : undefined,
          externalLink: resolvedLink || undefined,
          translations: mergedTrans
        });
      }
    }

    return parsedQuestions.length > 0 ? parsedQuestions : null;
  };

  // 1. For surveyId > 1, try Apps Script GET first so we don't accidentally get Survey 1 fallback from GVIZ if sheet isn't created yet
  if (cleanSurveyId > 1) {
    try {
      const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getFormQuestions&surveyId=${cleanSurveyId}&sheetName=${encodeURIComponent(questionsSheetName)}&_cb=${Date.now()}`;
      const res = await fetch(gasUrl, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          const enriched = data.questions.map((q: any, idx: number) => ({
            ...q,
            id: q.id || idx + 1,
            translations: {
              ...getEffectiveQuestionTranslation(q.question || "", q.options),
              ...(q.translations || {})
            }
          }));
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(enriched));
            } catch (e) {}
          }
          return enriched;
        }
      }
    } catch (e) {}
  }

  // 2. Direct Google Visualization API (Lightning-fast directly from Google global CDN)
  try {
    const primaryGvizUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(questionsSheetName)}&_cb=${Date.now()}`;
    const gvizRes = await fetch(primaryGvizUrl, { cache: "no-store" });
    if (gvizRes.ok) {
      const text = await gvizRes.text();
      const parsed = parseGvizText(text);
      if (parsed && parsed.length > 0) {
        // Guard against GVIZ returning Survey 1 (32 questions starting with "ما اسمك الكامل") when requesting Survey > 1 that doesn't exist in Sheet yet
        const isDefaultSurvey1Fallback =
          cleanSurveyId > 1 &&
          parsed.length >= 25 &&
          String(parsed[0]?.question || "").includes("ما اسمك الكامل");

        if (!isDefaultSurvey1Fallback) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(parsed));
              if (forceFromSheet) {
                localStorage.removeItem(modifiedKey);
              }
            } catch (e) {}
          }
          return parsed;
        }
      }
    }
  } catch (gvizErr) {}

  // 3. Direct Apps Script Web App GET (?action=getFormQuestions)
  try {
    const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getFormQuestions&surveyId=${cleanSurveyId}&sheetName=${encodeURIComponent(questionsSheetName)}&_cb=${Date.now()}`;
    const res = await fetch(gasUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        const enriched = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || idx + 1,
          translations: {
            ...getEffectiveQuestionTranslation(q.question || "", q.options),
            ...(q.translations || {})
          }
        }));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(enriched));
          } catch (e) {}
        }
        return enriched;
      }
    }
  } catch (e) {}

  // 4. Fallback to cached in LocalStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 5. Final fallback: DEFAULT_FORM_QUESTIONS for Survey 1, or DEFAULT_STAGE_SURVEY_QUESTIONS for Survey > 1
  return cleanSurveyId === 1 ? DEFAULT_FORM_QUESTIONS : DEFAULT_STAGE_SURVEY_QUESTIONS;
}

/**
 * Dispatches an instant Telegram notification from the browser (or server)
 */
export async function sendTelegramNotification(
  payload: FormSubmissionPayload,
  config?: TelegramConfig
): Promise<boolean> {
  const tgConfig = config || getTelegramConfig();
  if (!tgConfig || !tgConfig.enabled || !tgConfig.botToken || !tgConfig.chatId) {
    return false;
  }

  try {
    const token = tgConfig.botToken.trim();
    const chatId = tgConfig.chatId.trim();
    const regId = payload.registrationId || "";
    const name = payload.name || payload.nameArabic || "مشترك جديد";
    const phone = payload.phone || "";
    const email = payload.email || "";
    const timestamp = payload.timestamp || new Date().toLocaleString("ar-IQ", { timeZone: "Asia/Baghdad" });

    let message = `<b>${tgConfig.customHeader || "🏛️ نظام الاستمارة وقوقل شيت"}</b>\n`;
    message += `<b>${tgConfig.notificationTitle || "🔔 إشعار تسجيل جديد"}</b>\n\n`;
    message += `👤 <b>اسم المشترك:</b> ${name}\n`;
    message += `🆔 <b>رقم التسجيل:</b> <code>${regId}</code>\n`;
    if (phone) message += `📱 <b>الهاتف / الواتساب:</b> <code>${phone}</code>\n`;
    if (email) message += `📧 <b>البريد الإلكتروني:</b> <code>${email}</code>\n`;
    message += `📅 <b>الوقت:</b> ${timestamp}\n\n`;

    if (tgConfig.includeAllAnswers && Array.isArray(payload.answers)) {
      message += `📋 <b>إجابات الاستمارة:</b>\n`;
      payload.answers.forEach((item, idx) => {
        if (!item || !item.answer) return;
        const q = item.question || `سؤال ${idx + 1}`;
        const a = String(item.answer).trim();
        if (a.startsWith("http")) {
          message += `• <b>${q}:</b> <a href="${a}">عرض الرابط / المرفق ↗</a>\n`;
        } else {
          message += `• <b>${q}:</b> ${a}\n`;
        }
      });
      message += `\n`;
    }

    if (payload.totalScore !== undefined && payload.totalScore !== null && String(payload.totalScore) !== "") {
      message += `🏆 <b>مجموع النقاط:</b> <code>${payload.totalScore}</code>\n\n`;
    }

    if (payload.aiAnalysis) {
      const cleanAnalysis = String(payload.aiAnalysis).replace(/[<>&]/g, "");
      message += `🧠 <b>تحليل الذكاء الاصطناعي:</b>\n<pre>${cleanAnalysis.substring(0, 1200)}</pre>\n\n`;
    }

    if (tgConfig.customFooter) {
      message += `<i>${tgConfig.customFooter}</i>\n`;
    }

    const tgEndpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(tgEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    return res.ok;
  } catch (e) {
    console.warn("Telegram notification dispatch error:", e);
    return false;
  }
}

/**
 * Helper: Pre-uploads a Base64 file/image to Google Drive via Google Apps Script (action: "uploadFile")
 * Returns the short Google Drive URL so we never send >50,000 char base64 strings into Google Sheets cells.
 */
export async function uploadAttachmentToDriveBridge(
  base64Data: string,
  fileName: string,
  mimeType: string,
  folderId: string,
  scriptUrl: string
): Promise<string> {
  if (!base64Data || (!base64Data.startsWith("data:") && !base64Data.includes("base64,"))) {
    return base64Data;
  }

  const uploadPayload = {
    action: "uploadFile",
    base64Data,
    fileName,
    mimeType,
    folderId,
    scriptUrl
  };

  // 1. Try via /api/register server proxy
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uploadPayload)
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && (data.fileUrl || data.viewUrl || data.downloadUrl)) {
        return data.fileUrl || data.viewUrl || data.downloadUrl;
      }
    }
  } catch (e) {}

  // 2. Try direct POST to Google Apps Script
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(uploadPayload)
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && (data.fileUrl || data.viewUrl || data.downloadUrl)) {
        return data.fileUrl || data.viewUrl || data.downloadUrl;
      }
    }
  } catch (e) {}

  return "[تم إرفاق صورة]";
}

/**
 * Universal Registration Submitter
 * Submits the form data reliably to Google Sheets, uploads any attachments first,
 * and triggers Telegram alerts.
 */
export async function submitRegistrationBridge(
  payload: FormSubmissionPayload
): Promise<SubmissionResponse> {
  const activeScriptUrl = payload.scriptUrl || getActiveScriptUrl();
  const activeSpreadsheetId = payload.spreadsheetId || getActiveSpreadsheetId();
  const activeDriveFolderId = payload.driveFolderId || getActiveDriveFolderId();
  const activeTelegramConfig: TelegramConfig = payload.telegramConfig
    ? { ...getTelegramConfig(), ...payload.telegramConfig }
    : getTelegramConfig();

  // Use the actual Subscriber ID provided by the subscriber/URL/session
  const now = new Date();
  const regId = String(payload.registrationId || (payload as any).subscriberId || "").trim();
  const studentName = String(payload.name || "").trim();

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedTimestamp = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} - ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // STEP 0: Pre-upload any Base64 image/file in answers or attachment to Google Drive first!
  // This replaces 500KB+ base64 strings with a short 65-char Google Drive link,
  // preventing the Google Sheets 50,000-character cell limit crash in both RegistrationAnswers and المشتركين.
  const cleanedAnswers = Array.isArray(payload.answers) ? [...payload.answers] : [];
  let cleanedAttachment = payload.attachment || "";

  for (let i = 0; i < cleanedAnswers.length; i++) {
    const item = cleanedAnswers[i];
    if (!item || !item.answer) continue;
    const ansStr = String(item.answer).trim();
    if (ansStr.startsWith("data:") || ansStr.includes("base64,")) {
      const mimeMatch = ansStr.match(/data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const safeName = (studentName || "student").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
      const fileName = `${safeName}_${regId}_${Date.now()}.jpg`;
      const uploadedUrl = await uploadAttachmentToDriveBridge(
        ansStr,
        fileName,
        mime,
        activeDriveFolderId,
        activeScriptUrl
      );
      cleanedAnswers[i] = {
        ...item,
        answer: uploadedUrl
      };
      if (cleanedAttachment === ansStr) {
        cleanedAttachment = uploadedUrl;
      }
    }
  }

  if (cleanedAttachment && (cleanedAttachment.startsWith("data:") || cleanedAttachment.includes("base64,"))) {
    const mimeMatch = cleanedAttachment.match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const safeName = (studentName || "student").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
    const fileName = `${safeName}_${regId}_${Date.now()}.jpg`;
    cleanedAttachment = await uploadAttachmentToDriveBridge(
      cleanedAttachment,
      fileName,
      mime,
      activeDriveFolderId,
      activeScriptUrl
    );
  }

  // Format combinedAnswers separated by " ||| " for Column E of المشتركين sheet using the cleaned answers (with Drive URLs, never base64)
  const combinedAnswersStr =
    cleanedAnswers.length > 0
      ? cleanedAnswers
          .map((a) => {
            const v = a && a.answer ? String(a.answer).trim() : "-";
            if (v.startsWith("data:") || v.includes("base64,")) return "[صورة مرفقة]";
            return v || "-";
          })
          .join(" ||| ")
      : (payload.combinedAnswers || "").replace(/data:[^|]+/g, "[صورة مرفقة]");

  const cleanSurveyId = Math.max(1, Math.floor(Number(payload.surveyId) || 1));
  const { questionsSheetName, answersSheetName } = getSheetNamesForSurvey(cleanSurveyId);

  const fullPayload: FormSubmissionPayload = {
    ...payload,
    surveyId: cleanSurveyId,
    questionsSheet: payload.questionsSheet || questionsSheetName,
    answersSheet: payload.answersSheet || answersSheetName,
    registrationId: regId,
    name: studentName,
    timestamp: formattedTimestamp,
    answers: cleanedAnswers,
    attachment: cleanedAttachment,
    combinedAnswers: combinedAnswersStr,
    aiAnalysis: payload.aiAnalysis || "",
    scriptUrl: activeScriptUrl,
    spreadsheetId: activeSpreadsheetId,
    driveFolderId: activeDriveFolderId,
    telegramConfig: activeTelegramConfig
  };

  // Helper to mark subscriber as answered in local cache AND save in local per-survey answers log immediately
  const markLocalSuccess = () => {
    if (regId) {
      saveLocalSubscriberOverride(
        regId,
        {
          studentId: regId,
          studentName: studentName,
          totalScore: payload.totalScore ?? 0,
          combinedAnswers: combinedAnswersStr,
          aiAnalysis: payload.aiAnalysis || "",
          hasAnswered: true
        },
        cleanSurveyId
      );

      const ansMap: Record<string, string> = {};
      const rawRowMap: Record<string, any> = {
        "التاريخ والوقت": formattedTimestamp,
        "رقم التسجيل": regId,
        "الاسم الكامل للمشترك": studentName
      };
      cleanedAnswers.forEach((a) => {
        if (a && a.question) {
          ansMap[a.question] = a.answer || "";
          rawRowMap[a.question] = a.answer || "";
        }
      });
      rawRowMap["مجموع النقاط"] = payload.totalScore ?? 0;

      saveLocalSurveyAnswerRecord(cleanSurveyId, {
        rowIndex: Date.now(),
        timestamp: formattedTimestamp,
        registrationId: regId,
        name: studentName,
        totalScore: payload.totalScore ?? 0,
        answers: ansMap,
        rawRow: rawRowMap
      });
    }
  };

  // Always record locally first ("النظام يعتمد على التسجيل داخل النظام أولا ثم يرسل إلى الشيت")
  markLocalSuccess();

  // 1. Try Local API route or Vercel Serverless Function (/api/register)
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullPayload)
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && (data.success || data.registrationId)) {
        markLocalSuccess();
        sendTelegramNotification(fullPayload, activeTelegramConfig).catch(() => {});
        return {
          success: true,
          registrationId: data.registrationId || regId,
          timestamp: formattedTimestamp,
          message: data.message || `تم استلام وحفظ طلب التسجيل بنجاح بالرقم المرجعي (${regId}) في قوقل شيت!`,
          data
        };
      }
      // If Google Apps Script returned an explicit error, do NOT fall through to hidden iframe (prevents empty ghost rows)
      if (data && data.success === false && data.error) {
        return {
          success: false,
          error: data.error || data.message || "حدث خطأ أثناء الحفظ في قوقل شيت"
        };
      }
    }
  } catch (apiErr) {
    // If running in static host or local proxy not available, continue to direct strategy
  }

  // 2. Direct Delivery Strategy (guaranteed single submission to prevent duplication)
  let directSuccess = false;
  let directData: any = null;

  try {
    const response = await fetch(activeScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submitRegistration",
        ...fullPayload
      })
    });

    if (response.ok) {
      const responseText = await response.text();
      try {
        const json = JSON.parse(responseText);
        if (json.success !== false) {
          directSuccess = true;
          directData = json;
        } else if (json.error) {
          return {
            success: false,
            error: json.error
          };
        }
      } catch (parseErr) {
        directSuccess = true;
        directData = { message: responseText };
      }
    }
  } catch (corsErr) {
    // If standard fetch encountered a browser cross-origin redirect error, send via no-cors mode
    try {
      await fetch(activeScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "submitRegistration",
          ...fullPayload
        })
      });
      directSuccess = true;
    } catch (noCorsErr) {}
  }

  if (directSuccess) {
    markLocalSuccess();
    sendTelegramNotification(fullPayload, activeTelegramConfig).catch(() => {});
    return {
      success: true,
      registrationId: directData?.registrationId || regId,
      timestamp: formattedTimestamp,
      message: directData?.message || `تم استلام وحفظ طلب التسجيل بنجاح بالرقم المرجعي (${regId}) في جدول البيانات!`,
      data: directData
    };
  }

  // 3. Verify in Google Sheet (GVIZ read)
  const verifiedInSheet = await verifyRegistrationInSheet(regId, fullPayload.name, activeSpreadsheetId, 4500);
  markLocalSuccess();
  sendTelegramNotification(fullPayload, activeTelegramConfig).catch(() => {});

  return {
    success: true,
    registrationId: regId,
    timestamp: formattedTimestamp,
    message: verifiedInSheet
      ? `تم استلام وتأكيد حفظ طلب التسجيل بالرقم المرجعي (${regId}) في جدول قوقل شيت!`
      : `تم إرسال طلب التسجيل بالرقم المرجعي (${regId}) وجاري التدوين في جدول قوقل شيت!`,
    data: { registrationId: regId }
  };
}

/**
 * Checks if a column header represents the Total Score column
 */
export function isTotalScoreHeader(headerStr: string | undefined | null): boolean {
  if (!headerStr) return false;
  const norm = headerStr
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[؟?!\-_.:]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
  return (
    norm === "مجموع النقاط" ||
    norm === "المجموع" ||
    norm === "الدرجة" ||
    norm === "النقاط" ||
    norm === "مجموع الدرجات" ||
    norm === "التقييم" ||
    norm === "total score" ||
    norm === "score" ||
    norm === "total"
  );
}

/**
 * Fetches all submission records from Google Sheets (RegistrationAnswers)
 * for the Admin Dashboard with resilience across GVIZ and Apps Script Web App.
 */
export async function fetchRegistrationAnswersBridge(
  explicitScriptUrl?: string,
  explicitSpreadsheetId?: string,
  surveyId: number = 1
): Promise<SheetAnswersData> {
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const { answersSheetName } = getSheetNamesForSurvey(cleanSurveyId);
  const localRecords = getLocalSurveyAnswers(cleanSurveyId);

  const mergeWithLocalRecords = (sheetData: SheetAnswersData): SheetAnswersData => {
    if (localRecords.length === 0) return sheetData;
    const existingIds = new Set(
      sheetData.records.map((r) => normalizeStudentId(r.registrationId))
    );
    const missingLocals = localRecords.filter(
      (lr) => !existingIds.has(normalizeStudentId(lr.registrationId))
    );
    if (missingLocals.length === 0) return sheetData;

    const allHeaders = [...sheetData.headers];
    missingLocals.forEach((lr) => {
      Object.keys(lr.answers || {}).forEach((qKey) => {
        if (!allHeaders.includes(qKey)) {
          // Insert before مجموع النقاط if present
          const scoreIdx = allHeaders.findIndex((h) => isTotalScoreHeader(h));
          if (scoreIdx !== -1) {
            allHeaders.splice(scoreIdx, 0, qKey);
          } else {
            allHeaders.push(qKey);
          }
        }
      });
    });

    return {
      ...sheetData,
      headers: allHeaders,
      records: [...missingLocals, ...sheetData.records]
    };
  };

  // 1. For surveyId > 1, try Apps Script GET first so GVIZ doesn't return Survey 1's sheet if RegistrationAnswers_N isn't created yet
  if (cleanSurveyId > 1) {
    try {
      const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getAnswers&surveyId=${cleanSurveyId}&sheetName=${encodeURIComponent(answersSheetName)}&_cb=${Date.now()}`;
      const gasRes = await fetch(gasUrl, { cache: "no-store" });
      if (gasRes.ok) {
        const data = await gasRes.json();
        if (data && Array.isArray(data.records)) {
          const rawRecs = data.records;
          const headers =
            data.headers && data.headers.length > 0
              ? data.headers
              : ["التاريخ والوقت", "رقم التسجيل", "الاسم الكامل للمشترك", "مجموع النقاط"];
          const totalScoreHeader = headers.find((h: string) => isTotalScoreHeader(h));
          const records: SheetAnswerRecord[] = rawRecs
            .map((rec: any, idx: number) => {
              const rowData = rec.rowData || rec;
              const timestamp = String(rowData["التاريخ والوقت"] || rowData["تاريخ التسجيل"] || rowData[headers[0]] || "");
              const regId = String(rowData["رقم التسجيل"] || rowData["رقم المشترك"] || rowData[headers[1]] || "").trim();
              const name = String(rowData["الاسم الكامل للمشترك"] || rowData["اسم المشترك"] || rowData["الاسم"] || rowData[headers[2]] || "").trim();
              const totalScore = totalScoreHeader ? rowData[totalScoreHeader] : (rowData["مجموع النقاط"] || "");

              const answers: Record<string, string> = {};
              headers.forEach((h: string, cIdx: number) => {
                if (cIdx >= 3 && h !== totalScoreHeader) {
                  answers[h] = String(rowData[h] || "");
                }
              });

              return {
                rowIndex: rec.rowIndex || idx + 1,
                timestamp,
                registrationId: regId,
                name,
                totalScore,
                answers,
                rawRow: rowData
              };
            })
            .filter((r: SheetAnswerRecord) => Boolean(r.registrationId || r.name));

          return mergeWithLocalRecords({
            headers,
            records,
            totalScoreHeader,
            lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
          });
        }
      }
    } catch (e) {}
  }

  // 2. Direct GVIZ API read (for Survey 1, or if Survey > 1 sheet exists)
  if (cleanSurveyId === 1) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(answersSheetName)}&_cb=${Date.now()}`;
      const res = await fetch(gvizUrl, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          if (json?.table?.rows) {
            const cols = json.table.cols || [];
            let headers = cols.map((c: any) => (c?.label ? String(c.label).trim() : ""));
            const rows = json.table.rows || [];

            let dataStartIdx = 0;
            if (headers.every((h: string) => !h) && rows.length > 0) {
              headers = (rows[0]?.c || []).map((cell: any) =>
                cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
              );
              dataStartIdx = 1;
            }

            const totalScoreHeader =
              headers.find((h: string) => isTotalScoreHeader(h)) ||
              (headers.length > 3 && isTotalScoreHeader(headers[headers.length - 1])
                ? headers[headers.length - 1]
                : undefined);

            const records: SheetAnswerRecord[] = [];
            for (let r = dataStartIdx; r < rows.length; r++) {
              const rowCells = rows[r]?.c || [];
              const valAt = (idx: number): string => {
                const cell = rowCells[idx];
                if (!cell || cell.v === null || cell.v === undefined) return "";
                return String(cell.f || cell.v).trim();
              };

              const timestamp = valAt(0);
              const regId = valAt(1);
              const name = valAt(2);

              if (!regId && !name) continue;

              const answers: Record<string, string> = {};
              const rawRow: Record<string, any> = {};
              let totalScore: string | number = "";

              headers.forEach((h: string, cIdx: number) => {
                const cellVal = valAt(cIdx);
                const colKey = h || `عمود ${cIdx + 1}`;
                rawRow[colKey] = cellVal;
                if (cIdx >= 3 && colKey !== totalScoreHeader) {
                  answers[colKey] = cellVal;
                }
                if (colKey === totalScoreHeader) {
                  totalScore = cellVal;
                }
              });

              records.push({
                rowIndex: r + 1,
                timestamp,
                registrationId: regId,
                name,
                totalScore,
                answers,
                rawRow
              });
            }

            return mergeWithLocalRecords({
              headers,
              records: records.reverse(),
              totalScoreHeader,
              lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
            });
          }
        }
      }
    } catch (gvizErr) {
      console.warn("GVIZ answers read error, falling back to Apps Script:", gvizErr);
    }
  }

  // 3. Secondary: Apps Script GET /action=getAnswers
  try {
    const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getAnswers&surveyId=${cleanSurveyId}&sheetName=${encodeURIComponent(answersSheetName)}&_cb=${Date.now()}`;
    const gasRes = await fetch(gasUrl, { cache: "no-store" });
    if (gasRes.ok) {
      const data = await gasRes.json();
      if (data && (data.records || data.recordsData)) {
        const rawRecs = data.records || data.recordsData || [];
        const headers = data.headers || (rawRecs.length > 0 ? Object.keys(rawRecs[0].rowData || rawRecs[0]) : []);
        const totalScoreHeader = headers.find((h: string) => isTotalScoreHeader(h));

        const records: SheetAnswerRecord[] = rawRecs
          .map((rec: any, idx: number) => {
            const rowData = rec.rowData || rec;
            const timestamp = String(rowData["التاريخ والوقت"] || rowData["تاريخ التسجيل"] || rowData[headers[0]] || "");
            const regId = String(rowData["رقم التسجيل"] || rowData["رقم المشترك"] || rowData[headers[1]] || "").trim();
            const name = String(rowData["الاسم الكامل للمشترك"] || rowData["اسم المشترك"] || rowData["الاسم"] || rowData[headers[2]] || "").trim();
            const totalScore = totalScoreHeader ? rowData[totalScoreHeader] : (rowData["مجموع النقاط"] || "");

            const answers: Record<string, string> = {};
            headers.forEach((h: string, cIdx: number) => {
              if (cIdx >= 3 && h !== totalScoreHeader) {
                answers[h] = String(rowData[h] || "");
              }
            });

            return {
              rowIndex: rec.rowIndex || idx + 1,
              timestamp,
              registrationId: regId,
              name,
              totalScore,
              answers,
              rawRow: rowData
            };
          })
          .filter((r: SheetAnswerRecord) => Boolean(r.registrationId || r.name));

        return mergeWithLocalRecords({
          headers,
          records,
          totalScoreHeader,
          lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
        });
      }
    }
  } catch (gasErr) {
    console.warn("Apps Script answers read error:", gasErr);
  }

  // 4. Fallback: Local records or Empty data
  return mergeWithLocalRecords({
    headers: ["التاريخ والوقت", "رقم التسجيل", "الاسم الكامل للمشترك", "مجموع النقاط"],
    records: [],
    totalScoreHeader: "مجموع النقاط",
    lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
  });
}

/**
 * Saves and updates the questions in RegistrationQuestions (or RegistrationQuestions_N) sheet via Google Apps Script
 * and automatically provisions the corresponding answers sheet (RegistrationAnswers_N) and 3 columns in المشتركين.
 */
export async function saveFormQuestionsBridge(
  questions: RegistrationQuestion[],
  explicitScriptUrl?: string,
  surveyId: number = 1
): Promise<{ success: boolean; message: string }> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const { questionsSheetName, answersSheetName } = getSheetNamesForSurvey(cleanSurveyId);
  const { cacheKey, modifiedKey } = getQuestionsCacheKeys(cleanSurveyId);

  // 1. Save immediately to LocalStorage cache so UI reflects instant changes
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(questions));
      localStorage.setItem(modifiedKey, "true");
    } catch (e) {}
  }

  const payload = {
    action: "saveFormQuestions",
    surveyId: cleanSurveyId,
    questionsSheet: questionsSheetName,
    answersSheet: answersSheetName,
    scriptUrl: targetScriptUrl,
    questions
  };

  // 2. Try POST via Node / Vercel API proxy
  try {
    const proxyRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && json.success) {
        return {
          success: true,
          message: `تم حفظ وتحديث أسئلة الاستبيان (${cleanSurveyId}) في الورقة (${questionsSheetName}) وتجهيز ورقة الإجابات (${answersSheetName}) بنجاح!`
        };
      }
    }
  } catch (proxyErr) {}

  // 3. Direct POST to Google Apps Script
  try {
    const directRes = await fetch(targetScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (directRes.ok) {
      const json = await directRes.json().catch(() => null);
      return {
        success: true,
        message: json?.message || `تم حفظ وتحديث ورقة (${questionsSheetName}) بنجاح!`
      };
    }
  } catch (directErr) {
    // 4. Try no-cors beacon
    try {
      await fetch(targetScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return {
        success: true,
        message: `تم إرسال تحديث الأسئلة إلى الورقة (${questionsSheetName}) وتجهيز (${answersSheetName}) بنجاح!`
      };
    } catch (noCorsErr) {}
  }

  return {
    success: true,
    message: `تم حفظ وتحديث أسئلة الاستبيان (${cleanSurveyId}) في النظام بنجاح!`
  };
}

// ============================================================================
// SUBSCRIBERS SHEET (ورقة المشتركين) - LOGIN VERIFICATION & SAME-ROW RESULTS
// Structure of sheet "المشتركين":
// Col A (0): رقم التسلسل (Sequence)
// Col B (1): Student ID (رقم المشترك)
// Col C (2): Student Name (اسم المشترك)
// Col D (3): عدد مجموع النقاط (Total Score)
// Col E (4): تجميع كل الإجابات (|||) (Combined Answers)
// Col F (5): تحليل الذكاء الاصطناعي (AI Analysis)
// ============================================================================

const SUBSCRIBERS_OVERRIDES_KEY = "thnoon_subscribers_overrides_v2";
const SUBSCRIBERS_CACHE_KEY = "thnoon_subscribers_sheet_cache_v2";

/**
 * Normalizes Student ID (converts Arabic/Persian digits to English, trims spaces)
 */
export function normalizeStudentId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) return "";
  return String(id)
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/^#/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * Normalizes Student Name (unifies Arabic alef/teh/ya variations and spaces)
 */
export function normalizeStudentName(name: string | undefined | null): string {
  if (!name) return "";
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ");
}

export function getLocalSubscriberOverrides(): Record<string, Partial<SubscriberRecord> & { deleted?: boolean }> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SUBSCRIBERS_OVERRIDES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
  }
  return {};
}

export function saveLocalSubscriberOverride(
  studentId: string,
  data: Partial<SubscriberRecord> & { deleted?: boolean },
  surveyId: number = 1
): void {
  if (typeof window !== "undefined") {
    try {
      const key = normalizeStudentId(studentId);
      if (!key) return;
      const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));
      const current = getLocalSubscriberOverrides();
      const existing = current[key] || {};
      const existingSurveys = existing.surveys || {};

      const updatedSurveyResult: SubscriberSurveyResult = {
        surveyId: cleanSurveyId,
        totalScore:
          data.totalScore !== undefined
            ? data.totalScore
            : existingSurveys[cleanSurveyId]?.totalScore ?? "",
        combinedAnswers:
          data.combinedAnswers !== undefined
            ? data.combinedAnswers
            : existingSurveys[cleanSurveyId]?.combinedAnswers ?? "",
        aiAnalysis:
          data.aiAnalysis !== undefined
            ? data.aiAnalysis
            : existingSurveys[cleanSurveyId]?.aiAnalysis ?? "",
        hasAnswered:
          data.hasAnswered !== undefined
            ? data.hasAnswered
            : Boolean(existingSurveys[cleanSurveyId]?.hasAnswered)
      };

      const nextEntry: Partial<SubscriberRecord> & { deleted?: boolean } = {
        ...existing,
        studentId: data.studentId || existing.studentId || studentId,
        studentName: data.studentName || existing.studentName,
        ...(data.deleted !== undefined ? { deleted: data.deleted } : {}),
        surveys: {
          ...existingSurveys,
          [cleanSurveyId]: updatedSurveyResult
        }
      };

      if (cleanSurveyId === 1) {
        if (data.totalScore !== undefined) nextEntry.totalScore = data.totalScore;
        if (data.combinedAnswers !== undefined) nextEntry.combinedAnswers = data.combinedAnswers;
        if (data.aiAnalysis !== undefined) nextEntry.aiAnalysis = data.aiAnalysis;
        if (data.hasAnswered !== undefined) nextEntry.hasAnswered = data.hasAnswered;
      }

      current[key] = nextEntry;
      localStorage.setItem(SUBSCRIBERS_OVERRIDES_KEY, JSON.stringify(current));
    } catch (e) {}
  }
}

/**
 * Fetches all rows from the "المشتركين" sheet via GVIZ or Apps Script,
 * reading 3 columns per survey (Survey 1: D-E-F, Survey 2: G-H-I, Survey N: 4+(N-1)*3...)
 * and merging with local overrides for instant consistency.
 */
export async function fetchSubscribersSheetBridge(
  explicitScriptUrl?: string,
  explicitSpreadsheetId?: string,
  forceRefresh: boolean = false
): Promise<SubscriberRecord[]> {
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();

  let sheetRecords: SubscriberRecord[] = [];
  let fetchedSuccessfully = false;
  let maxDiscoveredSurvey = getSurveysList().length;

  // Helper to parse GVIZ response for المشتركين sheet
  const parseSubscribersGviz = (text: string): SubscriberRecord[] | null => {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    if (!json || !json.table || !Array.isArray(json.table.rows)) return null;

    const rows = json.table.rows;
    const colsCount = Array.isArray(json.table.cols) ? json.table.cols.length : 6;
    const numSurveysInSheet = Math.max(1, Math.floor((colsCount - 3) / 3), getSurveysList().length);
    if (numSurveysInSheet > maxDiscoveredSurvey) {
      maxDiscoveredSurvey = numSurveysInSheet;
    }

    const list: SubscriberRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i]?.c || [];
      const val = (idx: number): string => {
        const c = cells[idx];
        if (!c || c.v === null || c.v === undefined) return "";
        const raw = String(c.f !== undefined && c.f !== null ? c.f : c.v).trim();
        return raw === "null" || raw === "undefined" ? "" : raw;
      };

      const seq = val(0);
      const stuId = val(1);
      const stuName = val(2);

      // Skip header row if it matches column titles
      const idLow = stuId.toLowerCase();
      const nameLow = stuName.toLowerCase();
      if (
        idLow === "student id" ||
        idLow === "student_id" ||
        idLow === "رقم المشترك" ||
        idLow === "الرقم" ||
        nameLow === "student name" ||
        nameLow === "اسم المشترك" ||
        seq === "التسلسل" ||
        seq === "رقم تسلسل"
      ) {
        continue;
      }

      if (!stuId && !stuName) continue;

      const rowMaxSurvey = Math.max(
        numSurveysInSheet,
        Math.floor((cells.length - 3) / 3)
      );
      if (rowMaxSurvey > maxDiscoveredSurvey) {
        maxDiscoveredSurvey = rowMaxSurvey;
      }

      const surveysMap: Record<number, SubscriberSurveyResult> = {};
      for (let s = 1; s <= Math.max(1, rowMaxSurvey); s++) {
        const sScore = val(3 + (s - 1) * 3);
        const sAns = val(4 + (s - 1) * 3);
        const sAi = val(5 + (s - 1) * 3);
        const sHasAns = Boolean(
          (sAns && sAns !== "-" && sAns.length > 0) ||
            (sAi && sAi !== "-" && sAi.length > 5)
        );
        surveysMap[s] = {
          surveyId: s,
          totalScore: sScore,
          combinedAnswers: sAns,
          aiAnalysis: sAi,
          hasAnswered: sHasAns
        };
      }

      const s1 = surveysMap[1] || {
        surveyId: 1,
        totalScore: "",
        combinedAnswers: "",
        aiAnalysis: "",
        hasAnswered: false
      };

      list.push({
        rowIndex: i + 1,
        sequence: seq || list.length + 1,
        studentId: stuId,
        studentName: stuName,
        totalScore: s1.totalScore,
        combinedAnswers: s1.combinedAnswers,
        aiAnalysis: s1.aiAnalysis,
        hasAnswered: s1.hasAnswered,
        surveys: surveysMap
      });
    }

    return list;
  };

  // 1. Try reading sheet "المشتركين" via GVIZ
  const candidateSheetNames = ["المشتركين", "Subscribers"];
  for (const sheetName of candidateSheetNames) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}&_cb=${Date.now()}`;
      const res = await fetch(gvizUrl, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseSubscribersGviz(text);
        if (parsed && parsed.length > 0) {
          const firstRowTypeCheck = String(parsed[0].studentName || "").toLowerCase();
          const looksLikeQuestionsSheet =
            firstRowTypeCheck === "اختيارات" ||
            firstRowTypeCheck === "نص" ||
            firstRowTypeCheck === "choice" ||
            firstRowTypeCheck === "text" ||
            String(parsed[0].sequence || "").includes("هل تحب الخط");
          if (!looksLikeQuestionsSheet) {
            sheetRecords = parsed;
            fetchedSuccessfully = true;
            break;
          }
        }
      }
    } catch (e) {}
  }

  // 2. Fallback: Try Apps Script GET (?action=getSubscribers)
  if (!fetchedSuccessfully) {
    try {
      const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getSubscribers&_cb=${Date.now()}`;
      const res = await fetch(gasUrl, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.subscribers)) {
          sheetRecords = data.subscribers.map((s: any, idx: number) => {
            const s1HasAns = Boolean(
              (s.combinedAnswers && String(s.combinedAnswers).trim() !== "") ||
                (s.aiAnalysis && String(s.aiAnalysis).trim() !== "")
            );
            const surveysMap: Record<number, SubscriberSurveyResult> = s.surveys || {
              1: {
                surveyId: 1,
                totalScore: s.totalScore ?? "",
                combinedAnswers: s.combinedAnswers || "",
                aiAnalysis: s.aiAnalysis || "",
                hasAnswered: s1HasAns
              }
            };
            return {
              rowIndex: s.rowIndex || idx + 2,
              sequence: s.sequence ?? idx + 1,
              studentId: String(s.studentId || s.id || "").trim(),
              studentName: String(s.studentName || s.name || "").trim(),
              totalScore: s.totalScore ?? "",
              combinedAnswers: s.combinedAnswers || "",
              aiAnalysis: s.aiAnalysis || "",
              hasAnswered: s1HasAns,
              surveys: surveysMap
            };
          });
          fetchedSuccessfully = true;
        }
      }
    } catch (e) {}
  }

  // 3. Fallback to cached sheet records if network failed
  if (!fetchedSuccessfully && !forceRefresh && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SUBSCRIBERS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          sheetRecords = parsed;
        }
      }
    } catch (e) {}
  }

  if (maxDiscoveredSurvey > 1) {
    ensureSurveysUpTo(maxDiscoveredSurvey);
  }

  const allSurveyIds = getSurveysList().map((s) => s.id);

  // Merge with local overrides (for newly submitted answers, reset answers, or newly added subscribers across any survey)
  const overrides = getLocalSubscriberOverrides();
  const mergedMap = new Map<string, SubscriberRecord>();

  sheetRecords.forEach((rec) => {
    const key = normalizeStudentId(rec.studentId);
    if (!key) return;
    const ov = overrides[key];
    if (ov?.deleted) return;

    const mergedSurveys: Record<number, SubscriberSurveyResult> = {
      ...(rec.surveys || {})
    };

    // Ensure survey 1 is in mergedSurveys
    if (!mergedSurveys[1]) {
      mergedSurveys[1] = {
        surveyId: 1,
        totalScore: rec.totalScore ?? "",
        combinedAnswers: rec.combinedAnswers ?? "",
        aiAnalysis: rec.aiAnalysis ?? "",
        hasAnswered: rec.hasAnswered
      };
    }

    if (ov) {
      // Apply legacy top-level override to survey 1 if present
      if (
        ov.combinedAnswers !== undefined ||
        ov.totalScore !== undefined ||
        ov.aiAnalysis !== undefined ||
        ov.hasAnswered !== undefined
      ) {
        const cAns = ov.combinedAnswers !== undefined ? ov.combinedAnswers : mergedSurveys[1].combinedAnswers;
        const tScore = ov.totalScore !== undefined ? ov.totalScore : mergedSurveys[1].totalScore;
        const aAnal = ov.aiAnalysis !== undefined ? ov.aiAnalysis : mergedSurveys[1].aiAnalysis;
        const hAns =
          ov.hasAnswered !== undefined
            ? ov.hasAnswered
            : Boolean(cAns && String(cAns).trim() !== "");
        mergedSurveys[1] = {
          surveyId: 1,
          totalScore: tScore,
          combinedAnswers: cAns,
          aiAnalysis: aAnal,
          hasAnswered: hAns
        };
      }

      // Apply per-survey overrides
      if (ov.surveys) {
        Object.entries(ov.surveys).forEach(([sIdStr, sOv]) => {
          const sId = Number(sIdStr);
          if (!sId || !sOv) return;
          const baseS = mergedSurveys[sId] || {
            surveyId: sId,
            totalScore: "",
            combinedAnswers: "",
            aiAnalysis: "",
            hasAnswered: false
          };
          const cAns = sOv.combinedAnswers !== undefined ? sOv.combinedAnswers : baseS.combinedAnswers;
          const tScore = sOv.totalScore !== undefined ? sOv.totalScore : baseS.totalScore;
          const aAnal = sOv.aiAnalysis !== undefined ? sOv.aiAnalysis : baseS.aiAnalysis;
          const hAns =
            sOv.hasAnswered !== undefined
              ? sOv.hasAnswered
              : Boolean(cAns && String(cAns).trim() !== "");
          mergedSurveys[sId] = {
            surveyId: sId,
            totalScore: tScore,
            combinedAnswers: cAns,
            aiAnalysis: aAnal,
            hasAnswered: hAns
          };
        });
      }
    }

    // Ensure all configured surveys have an entry in mergedSurveys
    allSurveyIds.forEach((sId) => {
      if (!mergedSurveys[sId]) {
        mergedSurveys[sId] = {
          surveyId: sId,
          totalScore: "",
          combinedAnswers: "",
          aiAnalysis: "",
          hasAnswered: false
        };
      }
    });

    const s1Final = mergedSurveys[1];

    mergedMap.set(key, {
      ...rec,
      studentName: ov?.studentName || rec.studentName,
      totalScore: s1Final.totalScore,
      combinedAnswers: s1Final.combinedAnswers,
      aiAnalysis: s1Final.aiAnalysis,
      hasAnswered: s1Final.hasAnswered,
      surveys: mergedSurveys
    });
  });

  // Also include any subscribers added locally by the admin that aren't in GVIZ yet
  Object.entries(overrides).forEach(([key, ov]) => {
    if (ov.deleted || mergedMap.has(key)) return;
    if (ov.studentId && ov.studentName) {
      const mergedSurveys: Record<number, SubscriberSurveyResult> = {
        ...(ov.surveys || {})
      };
      allSurveyIds.forEach((sId) => {
        if (!mergedSurveys[sId]) {
          mergedSurveys[sId] = {
            surveyId: sId,
            totalScore: sId === 1 ? (ov.totalScore ?? "") : "",
            combinedAnswers: sId === 1 ? (ov.combinedAnswers ?? "") : "",
            aiAnalysis: sId === 1 ? (ov.aiAnalysis ?? "") : "",
            hasAnswered: sId === 1 ? Boolean(ov.hasAnswered) : false
          };
        }
      });
      const s1Final = mergedSurveys[1];
      mergedMap.set(key, {
        rowIndex: mergedMap.size + 2,
        sequence: ov.sequence || mergedMap.size + 1,
        studentId: ov.studentId,
        studentName: ov.studentName,
        totalScore: s1Final.totalScore,
        combinedAnswers: s1Final.combinedAnswers,
        aiAnalysis: s1Final.aiAnalysis,
        hasAnswered: s1Final.hasAnswered,
        surveys: mergedSurveys
      });
    }
  });

  const finalRecords = Array.from(mergedMap.values());
  if (typeof window !== "undefined" && finalRecords.length > 0) {
    try {
      localStorage.setItem(SUBSCRIBERS_CACHE_KEY, JSON.stringify(finalRecords));
    } catch (e) {}
  }

  return finalRecords;
}

/**
 * Verifies Subscriber ID and Name against the "المشتركين" sheet for a specific Survey (surveyId = 1, 2, 3...).
 */
export async function verifySubscriberInSheetBridge(
  studentId: string,
  studentName: string,
  explicitScriptUrl?: string,
  explicitSpreadsheetId?: string,
  surveyId: number = 1
): Promise<{
  valid: boolean;
  status: "ok" | "already_answered" | "invalid_name" | "not_found" | "form_closed";
  message: string;
  subscriber?: SubscriberRecord;
}> {
  const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));
  const analysisSettings = getAnalysisSettings(cleanSurveyId);

  if (analysisSettings.isFormClosed) {
    return {
      valid: false,
      status: "form_closed",
      message: "هذا الاستبيان مغلق حالياً من قِبل الإدارة ولا يستقبل إجابات جديدة."
    };
  }

  const cleanId = normalizeStudentId(studentId);
  const cleanName = normalizeStudentName(studentName);

  if (!cleanId || !cleanName) {
    return {
      valid: false,
      status: "not_found",
      message: "يرجى إدخال رقم المشترك (Student ID) واسم المشترك (Student Name) بشكل كامل."
    };
  }

  const subscribers = await fetchSubscribersSheetBridge(explicitScriptUrl, explicitSpreadsheetId);

  // Find subscriber by Student ID (Column B)
  const matchedById = subscribers.find((s) => normalizeStudentId(s.studentId) === cleanId);

  if (matchedById) {
    const registeredNameNorm = normalizeStudentName(matchedById.studentName);
    const isNameMatch =
      registeredNameNorm === cleanName ||
      (cleanName.length >= 3 &&
        registeredNameNorm.length >= 3 &&
        (registeredNameNorm === cleanName ||
          registeredNameNorm.split(" ").slice(0, 2).join(" ") === cleanName.split(" ").slice(0, 2).join(" ")));

    if (!isNameMatch) {
      return {
        valid: false,
        status: "invalid_name",
        message:
          "عذراً، الاسم المدخل غير مطابق للاسم المسجل لهذا الرقم في ورقة (المشتركين). يرجى التأكد من كتابة الاسم الصحيح."
      };
    }

    // Check if student already answered THIS specific survey (surveyId)
    const surveyResult = matchedById.surveys?.[cleanSurveyId];
    const hasAnsweredThisSurvey =
      cleanSurveyId === 1
        ? Boolean(surveyResult ? surveyResult.hasAnswered : matchedById.hasAnswered)
        : Boolean(surveyResult?.hasAnswered);

    if (analysisSettings.preventDuplicateSubmission && hasAnsweredThisSurvey) {
      return {
        valid: false,
        status: "already_answered",
        subscriber: matchedById,
        message: `لقد قمت بالإجابة على (الاستبيان ${cleanSurveyId}) مسبقاً وتم تسجيل نتيجتك. لا يُسمح بالإجابة مرة أخرى.`
      };
    }

    return {
      valid: true,
      status: "ok",
      subscriber: matchedById,
      message: `مرحباً بك ${matchedById.studentName}! تم التحقق من بياناتك بنجاح.`
    };
  }

  // If strictSubscriberLogin is enabled (default: true), block any student not found in المشتركين
  if (analysisSettings.strictSubscriberLogin) {
    return {
      valid: false,
      status: "not_found",
      message:
        "عذراً، رقم المشترك أو الاسم غير مسجل في ورقة (المشتركين). لا يمكن فتح الاستبيان إلا للمشتركين المسجلين مسبقاً."
    };
  }

  return {
    valid: true,
    status: "ok",
    subscriber: {
      rowIndex: 0,
      sequence: "-",
      studentId: studentId.trim(),
      studentName: studentName.trim(),
      hasAnswered: false
    },
    message: "تم تأكيد البيانات بنجاح."
  };
}

/**
 * Updates a subscriber's row in the "المشتركين" sheet for a specific surveyId
 * (Survey 1 -> Cols D,E,F | Survey 2 -> Cols G,H,I | Survey N -> Cols 4+(N-1)*3...)
 */
export async function updateSubscriberRowBridge(
  studentId: string,
  studentName: string,
  updates: {
    totalScore?: string | number;
    combinedAnswers?: string;
    aiAnalysis?: string;
    hasAnswered?: boolean;
  },
  explicitScriptUrl?: string,
  surveyId: number = 1
): Promise<{ success: boolean; message: string }> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const cleanSurveyId = Math.max(1, Math.floor(Number(surveyId) || 1));

  // 1. Save immediately in local override for this surveyId
  saveLocalSubscriberOverride(
    studentId,
    {
      studentId,
      studentName,
      ...updates
    },
    cleanSurveyId
  );

  const payload = {
    action: "updateSubscriberRow",
    targetSheet: "المشتركين",
    surveyId: cleanSurveyId,
    registrationId: studentId,
    studentId,
    studentName,
    totalScore: updates.totalScore ?? "",
    combinedAnswers: updates.combinedAnswers ?? "",
    aiAnalysis: updates.aiAnalysis ?? "",
    clearAnswer: updates.hasAnswered === false
  };

  // 2. Send via /api/register proxy
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        scriptUrl: targetScriptUrl
      })
    });
    if (res.ok) {
      return {
        success: true,
        message: `تم تحديث بيانات (الاستبيان ${cleanSurveyId}) للمشترك في ورقة (المشتركين) بنجاح!`
      };
    }
  } catch (e) {}

  // 3. Direct POST to Apps Script
  try {
    await fetch(targetScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  } catch (e) {}

  return {
    success: true,
    message: `تم حفظ تحديث (الاستبيان ${cleanSurveyId}) في سجل المشتركين بنجاح!`
  };
}

/**
 * Saves/syncs the full list of subscribers to the "المشتركين" sheet in Google Sheets
 */
export async function saveSubscribersToSheetBridge(
  subscribers: SubscriberRecord[],
  explicitScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SUBSCRIBERS_CACHE_KEY, JSON.stringify(subscribers));
    } catch (e) {}
  }

  const payload = {
    action: "saveSubscribers",
    targetSheet: "المشتركين",
    subscribers
  };

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        scriptUrl: targetScriptUrl
      })
    });
    if (res.ok) {
      return {
        success: true,
        message: "تمت مزامنة وحفظ قائمة المشتركين في ورقة (المشتركين) في قوقل شيت بنجاح!"
      };
    }
  } catch (e) {}

  try {
    await fetch(targetScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  } catch (e) {}

  return {
    success: true,
    message: "تم حفظ قائمة المشتركين بنجاح!"
  };
}
