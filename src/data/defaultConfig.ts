import { RegistrationQuestion, TelegramConfig, FormLang } from "../types";

export const DEFAULT_SPREADSHEET_ID = "1vci0f5bqip2svJAsa8Rgq4mwGtHjCqVhjNBPGJa96ig";
export const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgGU-7cYtdqFAiP2Wg0sLce6VEaZ1wS_Y40bPmYXurw7NnABhkQ17cey8KtGxblypx/exec";
export const DEFAULT_DRIVE_FOLDER_ID = "1tae6n3-tjB9vVtxr2GbK572SRtWxZ3f7";

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  enabled: true,
  botToken: "8336688531:AAGXF9V3w1t7Yp95tq_GkZ0K1lM6X9x9X-A",
  chatId: "-1002598383210",
  topicId: "",
  notificationTitle: "🔔 إشعار تسجيل جديد - استمارة المشتركين",
  includeAllAnswers: true,
  includeQrCode: true,
  includeAttachment: true,
  customHeader: "🏛️ نظام استمارة التسجيل وقوقل شيت",
  customFooter: "⚡ تم الإرسال والمزامنة التلقائية مع Google Sheets"
};

/**
 * The clean list of form questions (Subscriber Name and ID are managed by the Subscriber Card)
 */
export const DEFAULT_FORM_QUESTIONS: RegistrationQuestion[] = [
  {
    id: 1,
    question: "هل تحب الخط العربي؟",
    description: "اختر الإجابة المناسبة لتجربتك وشغفك بالخط",
    type: "choice",
    options: [
      "✅ نعم = سبق لي ممارسته وشغوف به",
      "❌ لا = مبتدئ تماماً وأرغب في التعلم"
    ],
    required: true,
    translations: {
      questionEn: "Do you love Arabic calligraphy?",
      questionTh: "คุณชอบศิลปةการเขียนตัวอักษรอาหรับหรือไม่?",
      descriptionEn: "Choose the answer fitting your background and passion",
      descriptionTh: "เลือกคำตอบที่ตรงกับระดับความรู้และความสนใจของคุณ",
      optionsEn: [
        "✅ Yes = I practiced before and passionate",
        "❌ No = Total beginner eager to learn"
      ],
      optionsTh: [
        "✅ ใช่ = เคยฝึกฝนและหลงใหล",
        "❌ ไม่ = ผู้เริ่มต้นที่สนใจเรียนรู้"
      ]
    }
  },
  {
    id: 2,
    question: "ما اسم استاذك الذي علمك الخط؟",
    description: "اسم الخطاط أو المعلم الذي تعلمت على يديه (إن وُجد)",
    type: "text",
    required: false,
    translations: {
      questionEn: "Calligraphy Teacher Name",
      questionTh: "อาจารย์ผู้สอน",
      descriptionEn: "Name of the calligraphy master or teacher who taught you (if any)",
      descriptionTh: "ชื่อของครูหรือผู้เชี่ยวชาญที่สอนคุณ (ถ้ามี)"
    }
  },
  {
    id: 3,
    question: "هل تعرفين انواع الخط",
    description: "معرفتك بأنواع الخطوط (النسخ، الثلث، الرقعة، الديواني...)",
    type: "choice",
    options: [
      "✅ نعم = أعرف وأميز أنواع الخطوط",
      "❌ لا = لا أميزها بعد"
    ],
    required: true,
    translations: {
      questionEn: "Do you know calligraphy script styles?",
      questionTh: "คุณรู้จักประเภทของแบบอักษรอาหรับหรือไม่?",
      descriptionEn: "Knowledge of scripts (Naskh, Thuluth, Ruq'ah, Diwani...)",
      descriptionTh: "ความรู้เกี่ยวกับรูปแบบอักษร (นัสค์, ซุลุส, รุกอะฮ์...)",
      optionsEn: [
        "✅ Yes = I recognize different calligraphy styles",
        "❌ No = Not yet familiar"
      ],
      optionsTh: [
        "✅ ใช่ = รู้จักและแยกแยะได้",
        "❌ ไม่ = ยังไม่คุ้นเคย"
      ]
    }
  },
  {
    id: 4,
    question: "هل تحب الفن",
    description: "اهتماماتك الفنية والإبداعية العامة",
    type: "text",
    required: false,
    translations: {
      questionEn: "Do you love Art?",
      questionTh: "คุณรักศิลปะหรือไม่?",
      descriptionEn: "Your general artistic and creative interests",
      descriptionTh: "ความสนใจด้านศิลปะและความคิดสร้างสรรค์ทั่วไป"
    }
  },
  {
    id: 5,
    question: "صورة",
    description: "صورة توضيحية لنموذج العمل الفني",
    type: "image_display",
    required: false,
    imageUrl: "https://lh3.googleusercontent.com/d/1wUPfYMrl3t6j0RPaw6Vk-WiqAaECbSNQ",
    translations: {
      questionEn: "Sample Artwork Image",
      questionTh: "ภาพตัวอย่างผลงาน",
      descriptionEn: "Illustrative artwork preview",
      descriptionTh: "ภาพตัวอย่างประกอบ"
    }
  },
  {
    id: 6,
    question: "افتح ملف بي دي اف",
    description: "انقر للاطلاع على الدليل والشروط التوضيحية بصيغة PDF",
    type: "button_title",
    required: false,
    externalLink: "https://drive.google.com/thumbnail?id=1wUPfYMrl3t6j0RPaw6Vk-WiqAaECbSNQ&sz=w1201",
    translations: {
      questionEn: "Open PDF Guide",
      questionTh: "เปิดไฟล์คู่มือ PDF",
      descriptionEn: "Click to open and review the PDF instructions",
      descriptionTh: "คลิกเพื่อเปิดเอกสารคำแนะนำ PDF",
      buttonTitleEn: "Open PDF Document",
      buttonTitleTh: "เปิดดูเอกสาร PDF"
    }
  },
  {
    id: 7,
    question: "رفع ملف",
    description: "يرجى إرفاق نموذج من أعمالك أو هويتك أو بطاقة الاشتراك (صورة، PDF، أو مستند)",
    type: "file",
    required: false,
    translations: {
      questionEn: "Upload Document / Artwork",
      questionTh: "อัปโหลดไฟล์ / ผลงาน",
      descriptionEn: "Upload a sample of your work, ID, or certificate (Image, PDF, Document)",
      descriptionTh: "อัปโหลดตัวอย่างผลงาน บัตรประชาชน หรือเอกสาร (รูปภาพ, PDF, เอกสาร)"
    }
  }
];

export const UI_TRANSLATIONS: Record<FormLang, Record<string, string>> = {
  ar: {
    headerTitle: "مركز يوسف ذنون لتعليم الخط العربي أون لاين",
    headerSubtitle: "المنصة الرسمية للتسجيل ومتابعة البرامج التعليمية",
    formTitle: "استمارة التسجيل في دورات الخط العربي",
    formSubtitle: "يرجى تعبئة الحقول والأسئلة التالية بدقة. سيتم حفظ البيانات فوراً في جدول قوقل شيت وإرسال إشعار فوري.",
    badgeConnected: "متصل بقوقل شيت مباشرة",
    sheetSettings: "إعدادات الربط والشيت",
    shareLink: "مشاركة الرابط",
    linkCopied: "تم نسخ الرابط بنجاح!",
    requiredBadge: "مطلوب",
    optionalBadge: "اختياري",
    selectOption: "اختر أحد الخيارات التالية:",
    multipleChoiceHint: "يمكنك اختيار أكثر من إجابة (اختيار متعدد)",
    selectedCount: "تم تحديد",
    clearSelection: "إلغاء التحديد",
    uploadFilePrompt: "اسحب الملف وأفلته هنا، أو انقر للاختيار من جهازك",
    openCamera: "تصوير مباشر بالكاميرا",
    fileSizeLimit: "يدعم الصور، PDF ومستندات Word (الحد الأقصى: 15 ميجابايت)",
    cameraActive: "الكاميرا نشطة",
    capturePhoto: "التقاط الصورة",
    retakePhoto: "إعادة التقاط",
    confirmPhoto: "اعتماد الصورة",
    switchCamera: "تبديل الكاميرا",
    closeCamera: "إلغاء الكاميرا",
    submitButton: "إرسال وحفظ في قوقل شيت",
    submitting: "جاري حفظ البيانات في Google Sheets...",
    uploadingDrive: "جاري رفع المرفقات إلى Google Drive...",
    validationErrorTitle: "يوجد حقول إجبارية غير مكتملة",
    fieldRequired: "هذا الحقل إجباري، يرجى ملؤه",
    emailInvalid: "يرجى إدخال بريد إلكتروني صحيح",
    phoneInvalid: "يرجى إدخال رقم هاتف صحيح",
    successTitle: "تم استلام البيانات",
    successDesc: "شكراً لك! تم استلام وحفظ بياناتك بنجاح.",
    refNumber: "الرقم المرجعي للتسجيل",
    copyRef: "نسخ الرقم",
    refCopied: "تم نسخ الرقم المرجعي!",
    shareWhatsApp: "إرسال نسخة عبر واتساب",
    connectTelegram: "تفعيل الإشعار في تلغرام",
    printReceipt: "طباعة أو حفظ الإيصال (PDF)",
    newSubmission: "تسجيل مشترك جديد",
    summaryTitle: "ملخص بيانات التسجيل المحفوظة:",
    exportToVercelTitle: "جاهز للنشر على Vercel و GitHub",
    exportToVercelDesc: "تم تجهيز هذا المشروع ليعمل فوراً ومستقلاً على Vercel مع API كامل أو كصفحة Static نقية متصلة بقوقل شيت بدون خادم.",
    guideTab: "دليل الربط والشيت",
    codeTab: "كود Google Apps Script",
    githubTab: "النشر على GitHub و Vercel"
  },
  en: {
    headerTitle: "Yusuf Thnun Center for Arabic Calligraphy Online",
    headerSubtitle: "Official Registration & Course Enrollment Platform",
    formTitle: "Arabic Calligraphy Courses Registration Form",
    formSubtitle: "Please fill out the fields below accurately. All responses will be saved directly into Google Sheets with instant notifications.",
    badgeConnected: "Live Google Sheets Connection",
    sheetSettings: "Sheet & API Settings",
    shareLink: "Share Link",
    linkCopied: "Link copied to clipboard!",
    requiredBadge: "Required",
    optionalBadge: "Optional",
    selectOption: "Choose one of the following options:",
    multipleChoiceHint: "You can select one, multiple, or all options",
    selectedCount: "Selected",
    clearSelection: "Clear selection",
    uploadFilePrompt: "Drag & drop your file here, or click to browse",
    openCamera: "Take Photo with Camera",
    fileSizeLimit: "Supports Images, PDF & Documents (Max: 15MB)",
    cameraActive: "Camera active",
    capturePhoto: "Capture Snapshot",
    retakePhoto: "Retake Photo",
    confirmPhoto: "Use this Photo",
    switchCamera: "Switch Camera",
    closeCamera: "Cancel Camera",
    submitButton: "Submit & Save to Google Sheets",
    submitting: "Saving responses to Google Sheets...",
    uploadingDrive: "Uploading attachments to Google Drive...",
    validationErrorTitle: "Required fields are incomplete",
    fieldRequired: "This field is required",
    emailInvalid: "Please provide a valid email address",
    phoneInvalid: "Please provide a valid phone number",
    successTitle: "Data Received",
    successDesc: "Thank you! Your information has been received and saved successfully.",
    refNumber: "Registration Reference ID",
    copyRef: "Copy ID",
    refCopied: "Reference ID copied!",
    shareWhatsApp: "Share confirmation on WhatsApp",
    connectTelegram: "Activate Telegram Bot",
    printReceipt: "Print / Save Receipt (PDF)",
    newSubmission: "Submit Another Registration",
    summaryTitle: "Submission Summary:",
    exportToVercelTitle: "Ready for Vercel & GitHub",
    exportToVercelDesc: "This project is built to deploy seamlessly on Vercel with serverless API or as a pure static front-end connected to Google Sheets.",
    guideTab: "Sheet Guide",
    codeTab: "Apps Script Code",
    githubTab: "Deploy to GitHub & Vercel"
  },
  th: {
    headerTitle: "ศูนย์การเรียนรู้การเขียนอักษรวิจิตร ยูซุฟ ซันนูน ออนไลน์",
    headerSubtitle: "แพลตฟอร์มอย่างเป็นทางการสำหรับการลงทะเบียนและหลักสูตรการศึกษา",
    formTitle: "แบบฟอร์มลงทะเบียนหลักสูตรการเขียนอักษรวิจิตรภาษาอาหรับ",
    formSubtitle: "กรุณากรอกข้อมูลและตอบคำถามต่อไปนี้อย่างถูกต้อง ข้อมูลจะถูกบันทึกลงใน Google Sheets โดยอัตโนมัติ",
    badgeConnected: "เชื่อมต่อกับ Google Sheets โดยตรง",
    sheetSettings: "การตั้งค่าชีตและ API",
    shareLink: "แชร์ลิงก์",
    linkCopied: "คัดลอกลิงก์เรียบร้อยแล้ว!",
    requiredBadge: "จำเป็น",
    optionalBadge: "ไม่บังคับ",
    selectOption: "เลือกหนึ่งในตัวเลือกต่อไปนี้:",
    multipleChoiceHint: "คุณสามารถเลือกได้หลายตัวเลือกหรือทั้งหมด (เลือกได้หลายข้อ)",
    selectedCount: "เลือกแล้ว",
    clearSelection: "ล้างตัวเลือก",
    uploadFilePrompt: "ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์",
    openCamera: "ถ่ายภาพด้วยกล้องสด",
    fileSizeLimit: "รองรับรูปภาพ, PDF และเอกสาร (สูงสุด 15MB)",
    cameraActive: "กล้องเปิดใช้งานอยู่",
    capturePhoto: "ถ่ายภาพ",
    retakePhoto: "ถ่ายใหม่",
    confirmPhoto: "ใช้ภาพนี้",
    switchCamera: "สลับกล้อง",
    closeCamera: "ปิดกล้อง",
    submitButton: "ส่งข้อมูลและบันทึกลง Google Sheets",
    submitting: "กำลังบันทึกข้อมูลลง Google Sheets...",
    uploadingDrive: "กำลังอัปโหลดไฟล์ไปยัง Google Drive...",
    validationErrorTitle: "กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน",
    fieldRequired: "ช่องนี้จำเป็นต้องระบุ",
    emailInvalid: "กรุณาระบุอีเมลที่ถูกต้อง",
    phoneInvalid: "กรุณาระบุหมายเลขโทรศัพท์ที่ถูกต้อง",
    successTitle: "ได้รับข้อมูลเรียบร้อยแล้ว",
    successDesc: "ขอบคุณ! ข้อมูลของคุณได้รับการบันทึกเรียบร้อยแล้ว",
    refNumber: "รหัสอ้างอิงการลงทะเบียน",
    copyRef: "คัดลอกรหัส",
    refCopied: "คัดลอกรหัสอ้างอิงแล้ว!",
    shareWhatsApp: "แชร์การยืนยันผ่าน WhatsApp",
    connectTelegram: "เปิดใช้งานการแจ้งเตือน Telegram",
    printReceipt: "พิมพ์หรือบันทึกใบเสร็จ (PDF)",
    newSubmission: "ลงทะเบียนใหม่",
    summaryTitle: "สรุปข้อมูลการลงทะเบียน:",
    exportToVercelTitle: "พร้อมสำหรับ Vercel และ GitHub",
    exportToVercelDesc: "โปรเจกต์นี้ได้รับการออกแบบให้พร้อมใช้งานบน Vercel และ GitHub ทันที",
    guideTab: "คู่มือการเชื่อมต่อชีต",
    codeTab: "โค้ด Apps Script",
    githubTab: "ขั้นตอนขึ้น Vercel & GitHub"
  }
};
