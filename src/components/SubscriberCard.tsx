import React, { useState } from "react";
import {
  UserCheck,
  QrCode,
  User,
  Hash,
  LogOut,
  Check,
  Loader2,
  Lock,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { FormLang } from "../types";
import { SubscriberData } from "../utils/subscriberSession";
import { QrScannerModal } from "./QrScannerModal";

interface SubscriberCardProps {
  subscriber: SubscriberData | null;
  isVerified: boolean;
  isVerifying: boolean;
  alreadyAnswered: boolean;
  onVerifyAndSaveSubscriber: (id: string, name: string) => Promise<void>;
  onClearSubscriber: () => void;
  error?: string | null;
  manualId: string;
  setManualId: (val: string) => void;
  manualName: string;
  setManualName: (val: string) => void;
  currentLang?: FormLang;
}

const SUBSCRIBER_CARD_TEXTS: Record<
  FormLang,
  {
    verifiedBadge: string;
    changeSubscriber: string;
    alreadyCompletedBadge: string;
    welcomePrefix: string;
    idPrefix: string;
    alreadyCompletedDesc: string;
    loginAnotherSubscriber: string;
    gateBadge: string;
    gateTitle: string;
    gateSubtitle: string;
    scanQr: string;
    studentIdLabel: string;
    studentIdPlaceholder: string;
    studentNameLabel: string;
    studentNamePlaceholder: string;
    lockedNotice: string;
    verifyingBtn: string;
    verifyAndUnlockBtn: string;
    errMissingId: string;
    errMissingName: string;
  }
> = {
  ar: {
    verifiedBadge: "تم التحقق من بيانات المشترك بنجاح",
    changeSubscriber: "تغيير المشترك",
    alreadyCompletedBadge: "الاستبيان مكتمل مسبقاً",
    welcomePrefix: "مرحباً",
    idPrefix: "رقم",
    alreadyCompletedDesc:
      "لقد قمت بالإجابة على هذا الاستبيان مسبقاً وتم تسجيل إجاباتك ونتيجتك في سجل المشتركين بنجاح. لا يمكن الإجابة على الاستبيان مرة أخرى.",
    loginAnotherSubscriber: "دخول مشترك آخر",
    gateBadge: "بوابة تسجيل دخول المشتركين",
    gateTitle: "أدخل رقم المشترك واسمك لفتح الاستبيان",
    gateSubtitle:
      "يجب أن يتطابق الرقم (Student ID) والاسم (Student Name) مع البيانات المسجلة في ورقة المشتركين",
    scanQr: "مسح كود QR",
    studentIdLabel: "رقم المشترك (Student ID):",
    studentIdPlaceholder: "أدخل رقم المشترك...",
    studentNameLabel: "اسم المشترك (Student Name):",
    studentNamePlaceholder: "أدخل الاسم الكامل كما هو مسجل...",
    lockedNotice: "أسئلة الاستبيان مقفلة حتى يتم التحقق من صحة الاسم والرقم في ورقة المشتركين.",
    verifyingBtn: "جاري التحقق من السجل...",
    verifyAndUnlockBtn: "تحقق وفتح الاستبيان",
    errMissingId: "يرجى إدخال رقم المشترك (Student ID) أولاً.",
    errMissingName: "يرجى إدخال اسم المشترك (Student Name) أولاً."
  },
  en: {
    verifiedBadge: "Subscriber Identity Verified Successfully",
    changeSubscriber: "Change Subscriber",
    alreadyCompletedBadge: "Questionnaire Already Completed",
    welcomePrefix: "Welcome",
    idPrefix: "ID",
    alreadyCompletedDesc:
      "You have already completed this questionnaire and your answers and score have been recorded. Multiple submissions are not allowed.",
    loginAnotherSubscriber: "Sign in as another subscriber",
    gateBadge: "Subscriber Login Gate",
    gateTitle: "Enter your Student ID and Name to unlock the questionnaire",
    gateSubtitle:
      "Your Student ID and Student Name must match the registered records in the Subscribers sheet",
    scanQr: "Scan QR Code",
    studentIdLabel: "Student ID:",
    studentIdPlaceholder: "Enter your Student ID...",
    studentNameLabel: "Student Name:",
    studentNamePlaceholder: "Enter your registered full name...",
    lockedNotice: "Questionnaire questions are locked until your ID and Name are verified.",
    verifyingBtn: "Verifying record...",
    verifyAndUnlockBtn: "Verify & Unlock Form",
    errMissingId: "Please enter your Student ID first.",
    errMissingName: "Please enter your Student Name first."
  },
  th: {
    verifiedBadge: "ยืนยันข้อมูลผู้สมัครเรียบร้อยแล้ว",
    changeSubscriber: "เปลี่ยนผู้สมัคร",
    alreadyCompletedBadge: "ทำแบบสอบถามเสร็จสิ้นแล้ว",
    welcomePrefix: "ยินดีต้อนรับ",
    idPrefix: "รหัส",
    alreadyCompletedDesc:
      "คุณได้ตอบแบบสอบถามนี้ไปแล้ว และระบบได้บันทึกคำตอบพร้อมคะแนนของคุณเรียบร้อยแล้ว ไม่สามารถส่งคำตอบซ้ำได้",
    loginAnotherSubscriber: "เข้าสู่ระบบด้วยผู้สมัครท่านอื่น",
    gateBadge: "ประตูเข้าสู่ระบบสำหรับผู้สมัคร",
    gateTitle: "กรอกรหัสผู้สมัครและชื่อของคุณเพื่อเปิดแบบสอบถาม",
    gateSubtitle:
      "รหัสประจำตัว (Student ID) และชื่อ (Student Name) ต้องตรงกับข้อมูลที่ลงทะเบียนไว้ในระบบ",
    scanQr: "สแกน QR Code",
    studentIdLabel: "รหัสผู้สมัคร (Student ID):",
    studentIdPlaceholder: "กรอกรหัสผู้สมัครของคุณ...",
    studentNameLabel: "ชื่อผู้สมัคร (Student Name):",
    studentNamePlaceholder: "กรอกชื่อเต็มตามที่ลงทะเบียน...",
    lockedNotice: "คำถามจะถูกล็อกจนกว่าจะยืนยันรหัสและชื่อผู้สมัครถูกต้อง",
    verifyingBtn: "กำลังตรวจสอบข้อมูล...",
    verifyAndUnlockBtn: "ยืนยันและเปิดแบบสอบถาม",
    errMissingId: "กรุณากรอกรหัสผู้สมัคร (Student ID) ก่อน",
    errMissingName: "กรุณากรอกชื่อผู้สมัคร (Student Name) ก่อน"
  }
};

export const SubscriberCard: React.FC<SubscriberCardProps> = ({
  subscriber,
  isVerified,
  isVerifying,
  alreadyAnswered,
  onVerifyAndSaveSubscriber,
  onClearSubscriber,
  error,
  manualId,
  setManualId,
  manualName,
  setManualName,
  currentLang = "ar"
}) => {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const txt = SUBSCRIBER_CARD_TEXTS[currentLang] || SUBSCRIBER_CARD_TEXTS.ar;

  const handleConfirmSubscriber = async () => {
    const cleanId = manualId.trim();
    const cleanName = manualName.trim();

    if (!cleanId) {
      setLocalError(txt.errMissingId);
      return;
    }
    if (!cleanName) {
      setLocalError(txt.errMissingName);
      return;
    }

    setLocalError(null);
    await onVerifyAndSaveSubscriber(cleanId, cleanName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmSubscriber();
    }
  };

  // Smart parser for scanned QR codes
  const handleQrScanned = (scannedText: string) => {
    const cleanText = scannedText.trim();
    if (!cleanText) return;

    // 1. Check if it's a URL with parameters: ?id=102&name=Ali
    if (cleanText.includes("?") || cleanText.startsWith("http")) {
      try {
        const url = new URL(cleanText);
        const qId =
          url.searchParams.get("subscriber_id") ||
          url.searchParams.get("id") ||
          url.searchParams.get("user");
        const qName =
          url.searchParams.get("name") ||
          url.searchParams.get("subscriber_name") ||
          "";
        if (qId) {
          const finalId = qId.trim();
          const finalName = qName.trim();
          setManualId(finalId);
          if (finalName) setManualName(finalName);
          if (finalId && (finalName || manualName.trim())) {
            onVerifyAndSaveSubscriber(finalId, finalName || manualName.trim());
          }
          return;
        }
      } catch (e) {}
    }

    // 2. Check if it's JSON: {"id":"102", "name":"Ali"}
    if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanText);
        const jId = parsed.id || parsed.subscriber_id || parsed.sub_id || "";
        const jName = parsed.name || parsed.subscriber_name || "";
        if (jId) {
          const finalId = String(jId).trim();
          const finalName = String(jName).trim();
          setManualId(finalId);
          if (finalName) setManualName(finalName);
          if (finalId && (finalName || manualName.trim())) {
            onVerifyAndSaveSubscriber(finalId, finalName || manualName.trim());
          }
          return;
        }
      } catch (e) {}
    }

    // 3. Check pattern: "10203 - أحمد علي" or "10203 / أحمد علي"
    const splitMatch = cleanText
      .split(/[\s—–-]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitMatch.length >= 2 && /^\d+$/.test(splitMatch[0])) {
      const parsedId = splitMatch[0];
      const parsedName = cleanText
        .substring(cleanText.indexOf(splitMatch[1]))
        .trim();
      setManualId(parsedId);
      setManualName(parsedName);
      onVerifyAndSaveSubscriber(parsedId, parsedName);
      return;
    }

    // 4. Default: text is the subscriber ID
    setManualId(cleanText);
    if (manualName.trim()) {
      onVerifyAndSaveSubscriber(cleanText, manualName.trim());
    }
  };

  // Case 1: Subscriber is verified and allowed to answer
  if (subscriber && subscriber.id && isVerified && !alreadyAnswered) {
    return (
      <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all animate-in fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{txt.verifiedBadge}</span>
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {subscriber.name}
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Student ID: {subscriber.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClearSubscriber}
              className="text-xs text-slate-600 hover:text-rose-600 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer bg-white border border-slate-200 flex items-center gap-1.5"
              title={txt.changeSubscriber}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{txt.changeSubscriber}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Subscriber already answered previously -> Locked state
  if (alreadyAnswered && subscriber) {
    return (
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-300 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <span className="inline-block text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            {txt.alreadyCompletedBadge}
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            {txt.welcomePrefix} {subscriber.name} ({txt.idPrefix}: {subscriber.id})
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            {txt.alreadyCompletedDesc}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onClearSubscriber}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>{txt.loginAnotherSubscriber}</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Login / Verification Gate (Form is locked until verified)
  return (
    <>
      <div className="bg-white border-2 border-emerald-300/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                {txt.gateBadge}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                {txt.gateTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {txt.gateSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="shrink-0 self-start sm:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>{txt.scanQr}</span>
          </button>
        </div>

        {(error || localError) && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-in fade-in flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{localError || error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Student ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
              <span>{txt.studentIdLabel}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={manualId}
              disabled={isVerifying}
              onChange={(e) => {
                setManualId(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={txt.studentIdPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm font-bold text-slate-800 transition-all outline-hidden placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
            />
          </div>

          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>{txt.studentNameLabel}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={manualName}
              disabled={isVerifying}
              onChange={(e) => {
                setManualName(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={txt.studentNamePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm font-bold text-slate-800 transition-all outline-hidden placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{txt.lockedNotice}</span>
          </p>

          <button
            type="button"
            disabled={isVerifying}
            onClick={handleConfirmSubscriber}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-60 shrink-0"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{txt.verifyingBtn}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{txt.verifyAndUnlockBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <QrScannerModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onScanSuccess={handleQrScanned}
      />
    </>
  );
};
