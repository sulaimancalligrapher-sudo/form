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
  type: "text" | "number" | "phone" | "email" | "url" | "choice" | "scored_choice" | "multiple_choice" | "file" | "button_title" | "image_display" | string; // Column C: نوع العنصر
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

export interface SurveyDefinition {
  id: number;                   // 1, 2, 3, 4...
  title: string;                // e.g., "الاستبيان 1"
  subtitle?: string;            // وصف الاستبيان أو المرحلة
  questionsSheetName: string;   // "RegistrationQuestions" for id=1, "RegistrationQuestions_2" for id=2...
  answersSheetName: string;     // "RegistrationAnswers" for id=1, "RegistrationAnswers_2" for id=2...
  createdAt?: string;
}

export interface SubscriberSurveyResult {
  surveyId: number;
  totalScore?: string | number;
  combinedAnswers?: string;
  aiAnalysis?: string;
  hasAnswered: boolean;
}

export interface FormSubmissionPayload {
  registrationId?: string;
  timestamp?: string;
  name?: string;
  nameArabic?: string;
  email?: string;
  phone?: string;
  surveyId?: number;
  questionsSheet?: string;
  answersSheet?: string;
  answers: Array<{
    question: string;
    answer: string;
    type?: string;
    score?: number;
  }>;
  combinedAnswers?: string;
  aiAnalysis?: string;
  totalScore?: number;
  hasScoredQuestions?: boolean;
  attachment?: string;
  scriptUrl?: string;
  spreadsheetId?: string;
  driveFolderId?: string;
  emailConfig?: Partial<SubscriberEmailConfig>;
  telegramConfig?: Partial<TelegramConfig>;
  [key: string]: any;
}

export interface SubscriberRecord {
  rowIndex: number;
  sequence: string | number;     // Column A: رقم التسلسل
  studentId: string;             // Column B: Student ID
  studentName: string;           // Column C: Student Name
  totalScore?: string | number;  // Column D: عدد مجموع النقاط (الاستبيان 1)
  combinedAnswers?: string;      // Column E: تجميع كل الإجابات (|||) (الاستبيان 1)
  aiAnalysis?: string;           // Column F: تحليل الذكاء الاصطناعي (الاستبيان 1)
  hasAnswered: boolean;
  surveys?: Record<number, SubscriberSurveyResult>; // نتائج كل استبيان (1، 2، 3، 4...)
}

export interface AnalysisSettings {
  goal: string;
  criteria: string[];
  customInstructions: string;
  autoAnalyzeOnSubmit: boolean;
  strictSubscriberLogin: boolean;
  preventDuplicateSubmission: boolean;
  isFormClosed: boolean;
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

export interface SheetAnswerRecord {
  rowIndex: number;
  timestamp: string;
  registrationId: string;
  name: string;
  totalScore?: string | number;
  answers: Record<string, string>;
  rawRow: Record<string, any>;
}

export interface SheetAnswersData {
  headers: string[];
  records: SheetAnswerRecord[];
  totalScoreHeader?: string;
  lastUpdated?: string;
}
