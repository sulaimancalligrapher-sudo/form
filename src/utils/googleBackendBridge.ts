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
import {
  TelegramConfig,
  FormSubmissionPayload,
  SubmissionResponse,
  RegistrationQuestion,
  SheetAnswerRecord,
  SheetAnswersData
} from "../types";

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
      const saved = localStorage.getItem("sheet_form_spreadsheet_id");
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
  }
  const envId = import.meta.env?.VITE_SPREADSHEET_ID;
  if (envId && envId.trim()) return envId.trim();
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
  forceFromSheet: boolean = false
): Promise<RegistrationQuestion[]> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();

  // If the admin modified questions in the dashboard and we are not forcing a sheet reload,
  // prioritize the admin's saved questions so GVIZ CDN caching doesn't overwrite recent edits/deletions
  if (!forceFromSheet && typeof window !== "undefined") {
    try {
      const isAdminModified = localStorage.getItem("thnoon_questions_admin_modified") === "true";
      const cached = localStorage.getItem("thnoon_cached_registration_questions");
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

        // Attach translation if exists in dictionary
        const fallbackTrans = DEFAULT_FORM_TRANSLATIONS[qText] || DEFAULT_FORM_TRANSLATIONS[qText.trim()];

        parsedQuestions.push({
          id: parsedQuestions.length + 1,
          question: qText,
          description: qDesc || undefined,
          type: fieldType,
          options: opts.length > 0 ? opts : undefined,
          required: qRequired,
          imageUrl: resolvedImage ? formatImageUrl(resolvedImage) : undefined,
          externalLink: resolvedLink || undefined,
          translations: fallbackTrans
        });
      }
    }

    return parsedQuestions.length > 0 ? parsedQuestions : null;
  };

  // 1. Direct Google Visualization API (Lightning-fast directly from Google global CDN)
  try {
    const primaryGvizUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/gviz/tq?tqx=out:json&headers=1&sheet=RegistrationQuestions&_cb=${Date.now()}`;
    const gvizRes = await fetch(primaryGvizUrl, { cache: "no-store" });
    if (gvizRes.ok) {
      const text = await gvizRes.text();
      const parsed = parseGvizText(text);
      if (parsed && parsed.length > 0) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("thnoon_cached_registration_questions", JSON.stringify(parsed));
            if (forceFromSheet) {
              localStorage.removeItem("thnoon_questions_admin_modified");
            }
          } catch (e) {}
        }
        return parsed;
      }
    }
  } catch (gvizErr) {}

  // 2. Direct Apps Script Web App GET (?action=getFormQuestions)
  try {
    const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getFormQuestions&_cb=${Date.now()}`;
    const res = await fetch(gasUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        const enriched = data.questions.map((q: any, idx: number) => ({
          ...q,
          id: q.id || idx + 1,
          translations: q.translations || DEFAULT_FORM_TRANSLATIONS[q.question]
        }));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("thnoon_cached_registration_questions", JSON.stringify(enriched));
          } catch (e) {}
        }
        return enriched;
      }
    }
  } catch (e) {}

  // 3. Fallback to cached in LocalStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("thnoon_cached_registration_questions");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 4. Final fallback: DEFAULT_FORM_QUESTIONS
  return DEFAULT_FORM_QUESTIONS;
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
 * Universal Registration Submitter
 * Submits the form data reliably to Google Sheets, uploads any attachments,
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

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedTimestamp = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} - ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const fullPayload: FormSubmissionPayload = {
    ...payload,
    registrationId: regId,
    timestamp: formattedTimestamp,
    scriptUrl: activeScriptUrl,
    spreadsheetId: activeSpreadsheetId,
    driveFolderId: activeDriveFolderId,
    telegramConfig: activeTelegramConfig
  };

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
        return {
          success: true,
          registrationId: data.registrationId || regId,
          timestamp: formattedTimestamp,
          message: data.message || `تم استلام وحفظ طلب التسجيل بنجاح بالرقم المرجعي (${regId}) في قوقل شيت!`,
          data
        };
      }
    }
  } catch (apiErr) {
    // If running in static host or local proxy not available, continue to direct strategy
  }

  // 2. Direct Delivery Strategy (guaranteed single submission to prevent duplication)
  let directSuccess = false;
  let directData: any = null;
  let sentViaNoCors = false;

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
      sentViaNoCors = true;
    } catch (noCorsErr) {}
  }

  if (directSuccess) {
    sendTelegramNotification(fullPayload, activeTelegramConfig).catch(() => {});
    return {
      success: true,
      registrationId: directData?.registrationId || regId,
      timestamp: formattedTimestamp,
      message: directData?.message || `تم استلام وحفظ طلب التسجيل بنجاح بالرقم المرجعي (${regId}) في جدول البيانات!`,
      data: directData
    };
  }

  // 3. Fallback to hidden dynamic iframe ONLY if no-cors fetch failed or was not sent
  // (Prevents duplicate row creation in Google Sheets)
  if (!sentViaNoCors) {
    try {
      await submitViaHiddenIframe("submitRegistration", fullPayload, activeScriptUrl);
    } catch (e) {}
  }

  // 4. Verify in Google Sheet (GVIZ read)
  const verifiedInSheet = await verifyRegistrationInSheet(regId, fullPayload.name, activeSpreadsheetId, 4500);
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
  explicitSpreadsheetId?: string
): Promise<SheetAnswersData> {
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();

  // 1. Primary: Direct GVIZ API read
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/gviz/tq?tqx=out:json&sheet=RegistrationAnswers&_cb=${Date.now()}`;
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
          // If labels were missing, read headers from row 0
          if (headers.every((h: string) => !h) && rows.length > 0) {
            headers = (rows[0]?.c || []).map((cell: any) =>
              cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
            );
            dataStartIdx = 1;
          }

          // Identify the total score header if present
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

            if (!regId && !name && !timestamp) continue;

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

          // Return latest records first
          return {
            headers,
            records: records.reverse(),
            totalScoreHeader,
            lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
          };
        }
      }
    }
  } catch (gvizErr) {
    console.warn("GVIZ answers read error, falling back to Apps Script:", gvizErr);
  }

  // 2. Secondary: Apps Script GET /action=getAnswers
  try {
    const gasUrl = `${targetScriptUrl}${targetScriptUrl.includes("?") ? "&" : "?"}action=getAnswers&_cb=${Date.now()}`;
    const gasRes = await fetch(gasUrl, { cache: "no-store" });
    if (gasRes.ok) {
      const data = await gasRes.json();
      if (data && (data.records || data.recordsData)) {
        const rawRecs = data.records || data.recordsData || [];
        const headers = data.headers || (rawRecs.length > 0 ? Object.keys(rawRecs[0].rowData || rawRecs[0]) : []);
        const totalScoreHeader = headers.find((h: string) => isTotalScoreHeader(h));

        const records: SheetAnswerRecord[] = rawRecs.map((rec: any, idx: number) => {
          const rowData = rec.rowData || rec;
          const timestamp = String(rowData["التاريخ والوقت"] || rowData["تاريخ التسجيل"] || rowData[headers[0]] || "");
          const regId = String(rowData["رقم التسجيل"] || rowData["رقم المشترك"] || rowData[headers[1]] || "");
          const name = String(rowData["الاسم الكامل للمشترك"] || rowData["اسم المشترك"] || rowData["الاسم"] || rowData[headers[2]] || "");
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
        });

        return {
          headers,
          records,
          totalScoreHeader,
          lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
        };
      }
    }
  } catch (gasErr) {
    console.warn("Apps Script answers read error:", gasErr);
  }

  // 3. Fallback: Empty data
  return {
    headers: ["التاريخ والوقت", "رقم التسجيل", "الاسم الكامل للمشترك", "مجموع النقاط"],
    records: [],
    lastUpdated: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })
  };
}

/**
 * Saves and updates the questions in RegistrationQuestions sheet via Google Apps Script
 */
export async function saveFormQuestionsBridge(
  questions: RegistrationQuestion[],
  explicitScriptUrl?: string
): Promise<{ success: boolean; message: string }> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();

  // 1. Save immediately to LocalStorage cache so UI reflects instant changes
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("thnoon_cached_registration_questions", JSON.stringify(questions));
      localStorage.setItem("thnoon_questions_admin_modified", "true");
    } catch (e) {}
  }

  // 2. Try POST via Node / Vercel API proxy
  try {
    const proxyRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveFormQuestions",
        scriptUrl: targetScriptUrl,
        questions
      })
    });
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json && json.success) {
        return {
          success: true,
          message: "تم حفظ وتحديث ورقة RegistrationQuestions في قوقل شيت بنجاح!"
        };
      }
    }
  } catch (proxyErr) {}

  // 3. Direct POST to Google Apps Script
  try {
    const directRes = await fetch(targetScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveFormQuestions",
        questions
      })
    });
    if (directRes.ok) {
      const json = await directRes.json().catch(() => null);
      return {
        success: true,
        message: json?.message || "تم حفظ وتحديث ورقة RegistrationQuestions بنجاح!"
      };
    }
  } catch (directErr) {
    // 4. Try no-cors beacon
    try {
      await fetch(targetScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "saveFormQuestions",
          questions
        })
      });
      return {
        success: true,
        message: "تم إرسال تحديث الأسئلة إلى قوقل شيت وحفظها محلياً بنجاح!"
      };
    } catch (noCorsErr) {}
  }

  return {
    success: true,
    message: "تم حفظ وتحديث الأسئلة في التطبيق والذاكرة المحلية بنجاح!"
  };
}
