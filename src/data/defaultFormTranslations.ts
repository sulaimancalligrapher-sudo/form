import { QuestionTranslation } from "../types";

/**
 * Default translations map for standard registration questions.
 * Matches the original graphy repository structure exactly.
 */
export const DEFAULT_FORM_TRANSLATIONS: Record<string, QuestionTranslation> = {
  "الاسم": {
    questionEn: "Full Name",
    questionTh: "ชื่อ-นามสกุล",
    descriptionEn: "Please write your full name as shown on your ID",
    descriptionTh: "กรุณาระบุชื่อ-นามสกุลเต็มตามที่ปรากฏบนบัตรประจำตัว"
  },
  "الاسم بالعربي": {
    questionEn: "Name in Arabic",
    questionTh: "ชื่อภาษาอาหรับ",
    descriptionEn: "Your name in Arabic (if any)",
    descriptionTh: "ชื่อของคุณเป็นภาษาอาหรับ (ถ้ามี)"
  },
  "العمر": {
    questionEn: "Age",
    questionTh: "อายุ",
    descriptionEn: "Age in years (numbers only)",
    descriptionTh: "อายุเป็นปี (ตัวเลขเท่านั้น)"
  },
  "عمر المشترك": {
    questionEn: "Age",
    questionTh: "อายุ",
    descriptionEn: "Age in years (numbers only)",
    descriptionTh: "อายุเป็นปี (ตัวเลขเท่านั้น)"
  },
  "رقم الهاتف": {
    questionEn: "Phone Number",
    questionTh: "หมายเลขโทรศัพท์",
    descriptionEn: "Phone or WhatsApp number with country code",
    descriptionTh: "เบอร์โทรศัพท์หรือ WhatsApp พร้อมรหัสประเทศ"
  },
  "ايميل": {
    questionEn: "Email",
    questionTh: "อีเมล",
    descriptionEn: "Your approved email to receive notifications",
    descriptionTh: "อีเมลที่ใช้สำหรับรับการแจ้งเตือน"
  },
  "البريد الالكتروني": {
    questionEn: "Email",
    questionTh: "อีเมล",
    descriptionEn: "Your approved email to receive notifications",
    descriptionTh: "อีเมลที่ใช้สำหรับรับการแจ้งเตือน"
  },
  "ID Line": {
    questionEn: "Line ID",
    questionTh: "LINE ID",
    descriptionEn: "Your Line ID for quick communication",
    descriptionTh: "LINE ID ของคุณสำหรับการติดต่ออย่างรวดเร็ว"
  },
  "افتح ملف بي دي اف": {
    questionEn: "Open PDF File",
    questionTh: "เปิดไฟล์ PDF",
    descriptionEn: "Click to open the PDF document",
    descriptionTh: "คลิกเพื่อเปิดเอกสาร PDF",
    buttonTitleEn: "Open PDF Document",
    buttonTitleTh: "เปิดดูเอกสาร PDF"
  },
  "فيس بوك": {
    questionEn: "Facebook",
    questionTh: "Facebook",
    descriptionEn: "Link or name of your Facebook account",
    descriptionTh: "ลิงก์หรือชื่อบัญชี Facebook ของคุณ"
  },
  "هل تحب الخط العربي؟": {
    questionEn: "Do you like Arabic calligraphy?",
    questionTh: "คุณชอบศิลปะการเขียนตัวอักษرอาหรับหรือไม่?",
    descriptionEn: "Choose the answer suitable for your level",
    descriptionTh: "เลือกคำตอบที่ตรงกับระดับความรู้ของคุณ",
    optionsEn: [
      "✅ Yes = Ever",
      "❌ No = Never"
    ],
    optionsTh: [
      "✅ ใช่ = เคย",
      "❌ ไม่ = ไม่เคย"
    ]
  },
  "ما اسم استاذك الذي علمك الخط؟": {
    questionEn: "What is the name of your calligraphy teacher?",
    questionTh: "อาจารย์ผู้สอนการเขียนตัวอักษรอาหรับให้คุณชื่ออะไร?",
    descriptionEn: "Name of the calligrapher or teacher who taught you",
    descriptionTh: "ชื่อของครูหรือผู้เชี่ยวชาญที่สอนคุณ"
  },
  "هل تعرفين انواع الخط": {
    questionEn: "Do you know the types of calligraphy scripts?",
    questionTh: "คุณรู้จักประเภทของลายมือ/ฟอนต์อาหรับหรือไม่?",
    descriptionEn: "Types of Arabic calligraphy scripts",
    descriptionTh: "ประเภทและรูปแบบของอักษรวิจิตรอาหรับ",
    optionsEn: [
      "✅ Yes = Ever",
      "❌ No = Never"
    ],
    optionsTh: [
      "✅ ใช่ = เคย",
      "❌ ไม่ = ไม่เคย"
    ]
  },
  "هل تعرفين انوان الخط": {
    questionEn: "Do you know the types of calligraphy scripts?",
    questionTh: "คุณรู้จักประเภทของลายมือ/ฟอนต์อาหรับหรือไม่?",
    descriptionEn: "Types of Arabic calligraphy scripts",
    descriptionTh: "ประเภทและรูปแบบของอักษรวิจิตรอาหรับ",
    optionsEn: [
      "✅ Yes = Ever",
      "❌ No = Never"
    ],
    optionsTh: [
      "✅ ใช่ = เคย",
      "❌ ไม่ = ไม่เคย"
    ]
  },
  "هل تعرفين انوان الخط ": {
    questionEn: "Do you know the types of calligraphy scripts?",
    questionTh: "คุณรู้จักประเภทของลายมือ/ฟอนต์อาหรับหรือไม่?",
    descriptionEn: "Types of Arabic calligraphy scripts",
    descriptionTh: "ประเภทและรูปแบบของอักษรวิจิตรอาหรับ",
    optionsEn: [
      "✅ Yes = Ever",
      "❌ No = Never"
    ],
    optionsTh: [
      "✅ ใช่ = เคย",
      "❌ ไม่ = ไม่เคย"
    ]
  },
  "هل تحب الفن": {
    questionEn: "Do you love art?",
    questionTh: "คุณรักศิลปะหรือไม่?",
    descriptionEn: "General artistic interest",
    descriptionTh: "ความสนใจด้านศิลปะทั่วไป"
  },
  "صورة": {
    questionEn: "Image",
    questionTh: "รูปภาพ",
    descriptionEn: "Displayed image",
    descriptionTh: "รูปภาพที่แสดง"
  },
  "رفع ملف": {
    questionEn: "Upload File / Document",
    questionTh: "อัปโหลดไฟล์ / เอกสาร",
    descriptionEn: "Attach your file, artwork or ID",
    descriptionTh: "แนบไฟล์ ผลงาน หรือเอกสารของคุณ"
  }
};
