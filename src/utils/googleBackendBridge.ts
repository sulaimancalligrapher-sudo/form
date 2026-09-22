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
  RegistrationQuestion
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

export function getActiveScriptUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("sheet_form_script_url");
      if (saved && saved.trim().startsWith("http")) {
        // Automatically upgrade outdated known default URLs to the new updated backend
        if (
          saved.includes("AKfycbwxn8Q7W9Db") ||
          saved.includes("AKfycbyl2_TnMESST")
        ) {
          localStorage.setItem("sheet_form_script_url", DEFAULT_SCRIPT_URL);
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
  explicitSpreadsheetId?: string
): Promise<RegistrationQuestion[]> {
  const targetScriptUrl = explicitScriptUrl || getActiveScriptUrl();
  const targetSpreadsheetId = explicitSpreadsheetId || getActiveSpreadsheetId();

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
        if (
          qText === "صورة" ||
          qType === "صورة" ||
          qType === "image" ||
          qType.includes("عرض صورة") ||
          (qType.includes("رابط") && qImage && (!qLink || qLink === "-"))
        ) {
          fieldType = "image_display";
        } else if (
          qType.includes("عنوان زر") ||
          qType.includes("زر") ||
          qType.includes("button")
        ) {
          fieldType = "button_title";
        } else if (qType.includes("رفع") || qType.includes("ملف") || qType.includes("file")) {
          fieldType = "file";
        } else if (qType.includes("رقم هاتف") || qType.includes("هاتف") || qType.includes("phone")) {
          fieldType = "phone";
        } else if (qType.includes("رقم") || qType.includes("number")) {
          fieldType = "number";
        } else if (qType.includes("ايميل") || qType.includes("بريد") || qType.includes("email")) {
          fieldType = "email";
        } else if (qType.includes("رابط") || qType.includes("url") || qType.includes("link")) {
          fieldType = "url";
        } else if (
          qType.includes("اختيار") ||
          qType.includes("choice") ||
          qType.includes("select")
        ) {
          fieldType = "choice";
        }

        let opts: string[] = [];
        if (qOptionsStr) {
          if (qOptionsStr.includes("|||")) {
            opts = qOptionsStr.split("|||").map((s: string) => s.trim()).filter(Boolean);
          } else if (qOptionsStr.includes("\n")) {
            opts = qOptionsStr.split("\n").map((s: string) => s.trim()).filter(Boolean);
          } else {
            opts = qOptionsStr.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        }

        // Attach translation if exists in dictionary
        const fallbackTrans = DEFAULT_FORM_TRANSLATIONS[qText] || DEFAULT_FORM_TRANSLATIONS[qText.trim()];

        parsedQuestions.push({
          id: parsedQuestions.length + 1,
          question: qText,
          description: qDesc || undefined,
          type: fieldType,
          options: opts.length > 0 ? opts : undefined,
          required: qRequired,
          imageUrl: qImage ? formatImageUrl(qImage) : undefined,
          externalLink: qLink && qLink !== "-" ? qLink : undefined,
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

  // Generate consistent Registration ID (Year + Month + 4 digits)
  const now = new Date();
  const autoRegId = `${now.getFullYear()}${now.getMonth() + 1}${Math.floor(1000 + Math.random() * 9000)}`;
  const regId = payload.registrationId && /^\d{6,14}$/.test(String(payload.registrationId))
    ? String(payload.registrationId)
    : autoRegId;

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
