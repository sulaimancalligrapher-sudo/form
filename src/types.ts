/**
 * Types definition for the Standalone Google Sheets Form Project
 */

export type FormLang = "ar" | "en" | "th";

export interface QuestionTranslation {
  questionEn?: string;
  questionTh?: string;
  descriptionEn?: string;
  descriptionTh?: string;
  optionsEn?: string[];
  optionsTh?: string[];
  buttonTitleEn?: string;
  buttonTitleTh?: string;
}

export type FormTranslationsMap = Record<string, QuestionTranslation>;

export interface RegistrationQuestion {
  id: string | number;
  question: string;         // Column A: نص السؤال
  description?: string;     // Column B: الوصف التوضيحي
  type: "text" | "number" | "phone" | "email" | "url" | "choice" | "file" | "button_title" | "image_display" | string; // Column C: نوع العنصر
  options?: string[];       // Column D: الخيارات المتاحة
  required: boolean;        // Column E: هل الحقل إجباري؟
  imageUrl?: string;        // Column F: رابط الصورة المعروضة
  externalLink?: string;    // Column G: رابط خارجي أو ملف PDF
  buttonTitle?: string;     // عنوان الزر إذا كان عنصراً تفاعلياً
  translations?: QuestionTranslation; // الترجمات المتعددة
}

export interface TelegramCustomButton {
  id: string;
  text: string;
  url: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  topicId?: string;
  notificationTitle: string;
  includeAllAnswers: boolean;
  includeQrCode: boolean;
  includeAttachment: boolean;
  customHeader?: string;
  customFooter?: string;
  customButtons?: TelegramCustomButton[];
}

export interface EmailFieldMapping {
  id: string;
  label: string;
  columnLetter: string;
}

export interface SubscriberEmailConfig {
  enabled: boolean;
  emailColumn: string;
  deliveryStatusColumn: string;
  dataFields: EmailFieldMapping[];
  qrCodeColumns: string;
  qrDriveUrlColumn: string;
  includeQrInEmail: boolean;
  telegramBotLink?: string;
}

export interface FormSubmissionPayload {
  registrationId?: string;
  timestamp?: string;
  name?: string;
  nameArabic?: string;
  email?: string;
  phone?: string;
  answers: Array<{
    question: string;
    answer: string;
    type?: string;
  }>;
  attachment?: string;
  scriptUrl?: string;
  spreadsheetId?: string;
  driveFolderId?: string;
  emailConfig?: Partial<SubscriberEmailConfig>;
  telegramConfig?: Partial<TelegramConfig>;
  [key: string]: any;
}

export interface SubmissionResponse {
  success: boolean;
  registrationId?: string;
  timestamp?: string;
  message?: string;
  data?: any;
  error?: string;
  gasResult?: any;
}

export interface AppConfig {
  spreadsheetId: string;
  scriptUrl: string;
  driveFolderId: string;
  telegramConfig: TelegramConfig;
}
