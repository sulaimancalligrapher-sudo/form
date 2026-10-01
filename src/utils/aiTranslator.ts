import { getActiveScriptUrl } from "./googleBackendBridge";

/**
 * Built-in comprehensive dictionary for instant 0ms translation
 * Works 100% offline and statically on any device / host
 */
const FORM_TERMS_DICTIONARY: Record<string, { en: string; th: string }> = {
  // Common personal & identification
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
  "هل تحب الخط العربي؟": { en: "Do you love Arabic calligraphy?", th: "คุณชอบศิลปะการเขียนอักษرวิจิตรภาษาอาหรับหรือไม่?" },
  "ما اسم استاذك الذي علمك الخط؟": { en: "What is the name of your calligraphy teacher?", th: "อาจารย์ผู้สอนการเขียนอักษรวิจิตรของคุณชื่ออะไร?" },
  "هل تعرفين انوان الخط": { en: "Do you know calligraphy types?", th: "คุณรู้จักรูปแบบและประเภทของอักษรวิจิตรหรือไม่?" },
  "هل تعرف انواع الخط": { en: "Do you know calligraphy types?", th: "คุณรู้จักประเภทของอักษรวิجิตรหรือไม่?" },
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
  },
  "يرجى ملء جميع الحقول المطلوبة بعناية": {
    en: "Please fill out all required fields carefully",
    th: "กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วนและถูกต้อง"
  }
};

/**
 * Validates that a translated string actually translated into the target language
 * and did not just echo back the Arabic source text.
 */
function isValidTranslation(
  sourceText: string,
  translated: string | undefined | null,
  targetLang: "en" | "th"
): boolean {
  if (!translated || typeof translated !== "string") return false;
  const clean = translated.trim();
  if (!clean || clean.includes("MYMEMORY WARNING")) return false;

  const sourceHasArabic = /[\u0600-\u06FF]/.test(sourceText);
  const resultHasArabic = /[\u0600-\u06FF]/.test(clean);

  // If the source was Arabic and the result still has Arabic or equals the source, reject it!
  if (sourceHasArabic && (clean === sourceText.trim() || resultHasArabic)) {
    return false;
  }

  if (targetLang === "th") {
    return /[\u0E00-\u0E7F]/.test(clean);
  }

  // For English: ensure it has English / Latin characters
  return /[a-zA-Z]/.test(clean);
}

/**
 * Translates text with a multi-layered fallback strategy:
 * 1. Exact Dictionary Match (0ms, 100% offline & client-side)
 * 2. Direct Server Endpoint (/api/translate - works in dev and Vercel serverless)
 * 3. Direct Google Translate GTX API (works in browser without API keys for both EN & TH)
 * 4. Direct Google Apps Script Endpoint (?action=translate via LanguageApp)
 * 5. Free Public Translation API (MyMemory) directly in browser
 */
export async function translateWithAi(
  text: string,
  targetLang: "en" | "th",
  context?: string
): Promise<string> {
  if (!text || !text.trim()) {
    return "";
  }

  const trimmedText = text.trim();
  const isThai = targetLang === "th";

  // 1. Instant Exact Dictionary Match
  const exact = FORM_TERMS_DICTIONARY[trimmedText];
  if (exact) {
    const res = isThai ? exact.th : exact.en;
    if (res) return res;
  }

  // 2. Try Server /api/translate endpoint if available
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmedText, targetLang, context }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (
        data.success &&
        data.source !== "echo_fallback" &&
        isValidTranslation(trimmedText, data.translation, targetLang)
      ) {
        return data.translation.trim();
      }
    }
  } catch (err) {
    // /api/translate not available or timed out, continue to client fallbacks
  }

  // 3. Try Direct Google Translate GTX Endpoint (fast, accurate for both EN and TH without API keys)
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmedText)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const gtxRes = await fetch(gtxUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (gtxRes.ok) {
      const gtxData = await gtxRes.json();
      if (Array.isArray(gtxData) && Array.isArray(gtxData[0])) {
        const combined = gtxData[0]
          .map((part: any) => (Array.isArray(part) && part[0] ? String(part[0]) : ""))
          .join("")
          .trim();
        if (isValidTranslation(trimmedText, combined, targetLang)) {
          return combined;
        }
      }
    }
  } catch (e) {
    // Continue to next fallback
  }

  // 4. Try Direct Google Apps Script backend if it has translate action
  const scriptUrl = getActiveScriptUrl();
  if (scriptUrl && scriptUrl.startsWith("http")) {
    try {
      const gUrl = `${scriptUrl}?action=translate&text=${encodeURIComponent(trimmedText)}&targetLang=${targetLang}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const gasRes = await fetch(gUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (gasRes.ok) {
        const gasData = await gasRes.json();
        if (
          gasData &&
          gasData.success &&
          isValidTranslation(trimmedText, gasData.translation, targetLang)
        ) {
          return gasData.translation.trim();
        }
      }
    } catch (e) {
      // Continue to next fallback
    }
  }

  // 5. Try Free Public MyMemory Translation (client-side, works everywhere without keys)
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmedText)}&langpair=ar|${targetLang === "th" ? "th-TH" : "en-US"}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const memRes = await fetch(myMemoryUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (memRes.ok) {
      const memData = await memRes.json();
      const translated = memData?.responseData?.translatedText;
      if (typeof translated === "string") {
        const clean = translated.trim().replace(/^["']|["']$/g, "");
        if (isValidTranslation(trimmedText, clean, targetLang)) {
          return clean;
        }
      }
    }
  } catch (e) {
    // Continue to dictionary partial
  }

  // 6. Partial Dictionary Matching
  for (const [key, val] of Object.entries(FORM_TERMS_DICTIONARY)) {
    if (trimmedText.includes(key) || key.includes(trimmedText)) {
      const matchVal = isThai ? val.th : val.en;
      if (matchVal) return matchVal;
    }
  }

  // 7. Echo back if all else fails
  return trimmedText;
}
