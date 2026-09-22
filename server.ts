import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. Health check API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Comprehensive fallback dictionary for instant, quota-safe translations
const FORM_TERMS_DICTIONARY: Record<string, { en: string; th: string }> = {
  "الاسم": { en: "Full Name", th: "ชื่อ-นามสกุล" },
  "الاسم الثلاثي": { en: "Full Triple Name", th: "ชื่อ-ชื่อกลาง-นามสกุล" },
  "الاسم الكامل": { en: "Full Name", th: "ชื่อเต็ม" },
  "الاسم بالعربي": { en: "Name in Arabic", th: "ชื่อภาษาอาหรับ" },
  "الاسم بالإنجليزية": { en: "Name in English", th: "ชื่อภาษาอังกฤษ" },
  "العمر": { en: "Age", th: "อายุ" },
  "تاريخ الميلاد": { en: "Date of Birth", th: "วันเดือนปีเกิด" },
  "مكان الميلاد": { en: "Place of Birth", th: "สถานที่เกิด" },
  "الجنس": { en: "Gender", th: "เพศ" },
  "الجنسية": { en: "Nationality", th: "สัญชาติ" },
  "رقم الهاتف": { en: "Phone Number", th: "หมายเลขโทรศัพท์" },
  "رقم الهاتف والواتساب": { en: "Phone & WhatsApp Number", th: "เบอร์โทรศัพท์และ WhatsApp" },
  "رقم الواتساب": { en: "WhatsApp Number", th: "เบอร์ WhatsApp" },
  "البريد الإلكتروني": { en: "Email Address", th: "อีเมล" },
  "المؤهل الدراسي": { en: "Educational Qualification", th: "วุฒิการศึกษา" },
  "المهنة": { en: "Profession", th: "อาชีพ" },
  "مكان العمل": { en: "Workplace", th: "สถานที่ทำงาน" },
  "عنوان السكن": { en: "Residential Address", th: "ที่อยู่ปัจจุบัน" },
  "عنوان السكن الحالي": { en: "Current Residence Address", th: "ที่อยู่ปัจจุบัน" },
  "المدينة": { en: "City", th: "เมือง" },
  "الدولة": { en: "Country", th: "ประเทศ" },
  "المستوى": { en: "Level", th: "ระดับ" },
  "مستوى الخبرة": { en: "Experience Level", th: "ระดับประสบการณ์" },
  "مبتدئ": { en: "Beginner", th: "ระดับเริ่มต้น" },
  "متوسط": { en: "Intermediate", th: "ระดับปานกลาง" },
  "متقدم": { en: "Advanced", th: "ระดับสูง" },
  "ملاحظات إضافية": { en: "Additional Notes", th: "หมายเหตุเพิ่มเติม" },
  "المرفقات": { en: "Attachments", th: "ไฟล์แนบ" },
  "تحميل الهوية": { en: "Upload ID", th: "อัปโหลดบัตรประชาชน" },
  "تحميل الصورة الشخصية": { en: "Upload Personal Photo", th: "อัปโหลดรูปถ่ายส่วนตัว" },
  "إرسال": { en: "Submit", th: "ส่งข้อมูล" },
  "إرسال وحفظ في قوقل شيت": { en: "Submit & Save to Google Sheets", th: "ส่งข้อมูลและบันทึกลง Google Sheets" },
  "مركز يوسف ذنون لتعليم الخط العربي أون لاين": {
    en: "Yusuf Thnun Center for Arabic Calligraphy Online",
    th: "ศูนย์การเรียนรู้การเขียนอักษรวิจิตร ยูซุฟ ซันนูน ออนไลน์"
  },
  "المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية": {
    en: "Official Registration & Educational Programs Platform",
    th: "แพลตฟอร์มอย่างเป็นทางการสำหรับการลงทะเบียนและหลักสูตรการศึกษา"
  },
  "استمارة التسجيل في دورات الخط العربي": {
    en: "Arabic Calligraphy Courses Registration Form",
    th: "แบบฟอร์มลงทะเบียนหลักสูตรการเขียนอักษرวิจิตรภาษาอาหรับ"
  }
};

// 2. AI Translation API with resilient multi-model selection & dictionary fallback
app.post("/api/translate", async (req, res) => {
  const { text, targetLang, context } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ success: false, error: "Missing text or targetLang" });
  }

  const trimmedText = String(text).trim();

  // Try Gemini AI first
  const isThai = targetLang === "th";
  const prompt = isThai
    ? `You are an expert Arabic-to-Thai translator.
Translate the following Arabic text into accurate, natural, and standard Thai (ภาษาไทย).
CRITICAL MANDATORY RULES:
1. The translation MUST be written strictly in the THAI ALPHABET (ภาษาไทย).
2. DO NOT output English letters, Latin words, or romanized transliteration.
3. Context: ${context || "Form question, UI label, or button"}.
4. Return ONLY the direct Thai translated text without quotes, explanations, or greetings.

Arabic text to translate:
${trimmedText}`
    : `You are an expert Arabic-to-English translator.
Translate the following Arabic text into clear, modern, and natural English.
Context: ${context || "Form question, UI label, or button"}.
Return ONLY the direct English translation without preamble, quotes, or explanations.

Arabic text to translate:
${trimmedText}`;

  // 1. Instant Exact Dictionary Match (0ms latency, guaranteed high accuracy)
  const dictMatch = FORM_TERMS_DICTIONARY[trimmedText];
  if (dictMatch) {
    const fallbackVal = isThai ? dictMatch.th : dictMatch.en;
    if (fallbackVal) {
      return res.json({ success: true, translation: fallbackVal, source: "dictionary" });
    }
  }

  const modelsToTry = [
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash"
  ];

  let translatedText = "";

  try {
    const ai = getAi();
    for (const model of modelsToTry) {
      try {
        // Run with 4 second timeout per model to prevent request hanging
        const apiPromise = ai.models.generateContent({
          model,
          contents: prompt
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 4000)
        );

        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        const result = response?.text?.trim().replace(/^["'`]|["'`]$/g, "") || "";
        if (result) {
          if (isThai) {
            const hasThaiChars = /[\u0E00-\u0E7F]/.test(result);
            if (hasThaiChars) {
              translatedText = result;
              break;
            }
          } else {
            translatedText = result;
            break;
          }
        }
      } catch (modelErr: any) {
        console.warn(`Translation model ${model} attempt note:`, modelErr?.message?.slice(0, 80));
      }
    }
  } catch (err: any) {
    console.warn("AI translation initialization error:", err.message);
  }

  // If Gemini succeeded and produced text, return it
  if (translatedText) {
    return res.json({ success: true, translation: translatedText, source: "ai" });
  }

  // 2. Partial match search in dictionary
  for (const [key, val] of Object.entries(FORM_TERMS_DICTIONARY)) {
    if (trimmedText.includes(key) || key.includes(trimmedText)) {
      const fallbackVal = isThai ? val.th : val.en;
      if (fallbackVal) {
        return res.json({ success: true, translation: fallbackVal, source: "dictionary_partial" });
      }
    }
  }

  return res.status(500).json({
    success: false,
    error: "تعذر الحصول على ترجمة من نموذج الذكاء الاصطناعي، يرجى كتابة النص يدوياً أو المحاولة لاحقاً."
  });
});

// 3. Form submission proxy route (/api/register)
app.post("/api/register", async (req, res) => {
  try {
    const payload = req.body;
    const scriptUrl =
      payload.scriptUrl ||
      process.env.VITE_GOOGLE_SCRIPT_URL ||
      process.env.GOOGLE_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbwxn8Q7W9DbAufsdZXx_57s7qf3hM2B4EeSugqDzWc13D62U28kvUkn9yZSwH2il5dBoQ/exec";

    const gasResponse = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submitRegistration",
        ...payload
      })
    });

    const responseText = await gasResponse.text();
    try {
      const json = JSON.parse(responseText);
      res.status(200).json(json);
    } catch {
      res.status(200).json({
        success: true,
        registrationId: payload.registrationId,
        message: responseText
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to proxy to Google Sheets"
    });
  }
});

// 4. Vite middleware for dev or Static Files for production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
