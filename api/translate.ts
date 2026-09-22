/**
 * Vercel Serverless Function: /api/translate
 *
 * Provides AI translation (Arabic -> English & Thai) with:
 * 1. Multi-tier Google Gemini Models (with GEMINI_API_KEY)
 * 2. Instant built-in dictionary fallback (0ms latency, works even without API keys)
 * 3. CORS headers for cross-origin client calls
 */

import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const FORM_TERMS_DICTIONARY: Record<string, { en: string; th: string }> = {
  "الاسم": { en: "Full Name", th: "ชื่อ-นามสกุล" },
  "الاسم الكامل": { en: "Full Name", th: "ชื่อเต็ม" },
  "الاسم الكامل لك": { en: "Your Full Name", th: "ชื่อ-นามสกุลเต็มของคุณ" },
  "الاسم الثلاثي": { en: "Full Triple Name", th: "ชื่อ-ชื่อกลาง-นามสกุล" },
  "الاسم الثلاثي واللقب": { en: "Full Name & Surname", th: "ชื่อ-นามสกุล และฉายา" },
  "الاسم بالعربي": { en: "Name in Arabic", th: "ชื่อภาษาอาหรับ" },
  "الاسم بالإنجليزية": { en: "Name in English", th: "ชื่อภาษาอังกฤษ" },
  "كيف حالك الان": { en: "How are you now", th: "คุณสบายดีไหมตอนนี้" },
  "العمر": { en: "Age", th: "อายุ" },
  "عمر المشترك": { en: "Participant Age", th: "อายุของผู้สมัคร" },
  "تاريخ الميلاد": { en: "Date of Birth", th: "วันเดือนปีเกิด" },
  "مكان الميلاد": { en: "Place of Birth", th: "สถานที่เกิด" },
  "الجنس": { en: "Gender", th: "เพศ" },
  "الجنسية": { en: "Nationality", th: "สัญชาติ" },
  "رقم الهاتف": { en: "Phone Number", th: "หมายเลขโทรศัพท์" },
  "رقم الهاتف والواتساب": { en: "Phone & WhatsApp Number", th: "เบอร์โทรศัพท์และ WhatsApp" },
  "رقم الواتساب": { en: "WhatsApp Number", th: "เบอร์ WhatsApp" },
  "اكتب ايميلك": { en: "Enter Your Email", th: "กรอกอีเมลของคุณ" },
  "البريد الإلكتروني": { en: "Email Address", th: "อีเมล" },
  "ID Line": { en: "Line ID", th: "ไอดีไลน์ (LINE ID)" },
  "فيس بوك": { en: "Facebook", th: "เฟซบุ๊ก (Facebook)" },
  "افتح ملف بي دي اف": { en: "Open PDF Document", th: "เปิดไฟล์ PDF" },
  "هل تحب الخط العربي؟": { en: "Do you love Arabic calligraphy?", th: "คุณชอบศิลปะการเขียนอักษรวิจิตรภาษาอาหรับหรือไม่?" },
  "ما اسم استاذك الذي علمك الخط؟": { en: "What is the name of your calligraphy teacher?", th: "อาจารย์ผู้สอนการเขียนอักษรวิจิตรของคุณชื่ออะไร?" },
  "هل تعرفين انوان الخط": { en: "Do you know calligraphy types?", th: "คุณรู้จักรูปแบบและประเภทของอักษรวิจิตรหรือไม่?" },
  "هل تحب الفن": { en: "Do you like art?", th: "คุณชอบงานศิลปะหรือไม่?" },
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
  "نعم": { en: "Yes", th: "ใช่ / เคย" },
  "لا": { en: "No", th: "ไม่ / ไม่เคย" },
  "ملاحظات إضافية": { en: "Additional Notes", th: "หมายเหตุเพิ่มเติม" },
  "المرفقات": { en: "Attachments", th: "ไฟล์แนบ" },
  "صورة": { en: "Photo / Image", th: "รูปภาพ" },
  "رفع ملف": { en: "Upload File", th: "อัปโหลดไฟล์" },
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
    th: "แบบฟอร์มลงทะเบียนหลักสูตรการเขียนอักษรวิจิตรภาษาอาหรับ"
  }
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { text, targetLang, context } = body || {};

  if (!text || !targetLang) {
    return res.status(400).json({ success: false, error: "Missing text or targetLang" });
  }

  const trimmedText = String(text).trim();
  const isThai = targetLang === "th";

  // 1. Instant Exact Dictionary Match
  const dictMatch = FORM_TERMS_DICTIONARY[trimmedText];
  if (dictMatch) {
    const fallbackVal = isThai ? dictMatch.th : dictMatch.en;
    if (fallbackVal) {
      return res.status(200).json({ success: true, translation: fallbackVal, source: "dictionary" });
    }
  }

  // 2. Try Gemini AI (if GEMINI_API_KEY is configured in Vercel environment variables)
  const ai = getAi();
  if (ai) {
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

    const modelsToTry = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    for (const model of modelsToTry) {
      try {
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
              return res.status(200).json({ success: true, translation: result, source: "ai" });
            }
          } else {
            return res.status(200).json({ success: true, translation: result, source: "ai" });
          }
        }
      } catch (err) {
        // try next model
      }
    }
  }

  // 3. Partial Dictionary Matching
  for (const [key, val] of Object.entries(FORM_TERMS_DICTIONARY)) {
    if (trimmedText.includes(key) || key.includes(trimmedText)) {
      const fallbackVal = isThai ? val.th : val.en;
      if (fallbackVal) {
        return res.status(200).json({ success: true, translation: fallbackVal, source: "dictionary_partial" });
      }
    }
  }

  // 4. Return formatted original text as safe fallback
  return res.status(200).json({
    success: true,
    translation: trimmedText,
    source: "echo_fallback"
  });
}
