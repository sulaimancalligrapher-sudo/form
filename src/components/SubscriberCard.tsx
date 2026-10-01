import React, { useState } from "react";
import { UserCheck, QrCode, User, Hash, Edit2, LogOut, Check } from "lucide-react";
import { SubscriberData } from "../utils/subscriberSession";
import { QrScannerModal } from "./QrScannerModal";

interface SubscriberCardProps {
  subscriber: SubscriberData | null;
  onSaveSubscriber: (id: string, name: string) => void;
  onClearSubscriber: () => void;
  error?: string | null;
  manualId: string;
  setManualId: (val: string) => void;
  manualName: string;
  setManualName: (val: string) => void;
}

export const SubscriberCard: React.FC<SubscriberCardProps> = ({
  subscriber,
  onSaveSubscriber,
  onClearSubscriber,
  error,
  manualId,
  setManualId,
  manualName,
  setManualName
}) => {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isExpandedEdit, setIsExpandedEdit] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirmSubscriber = () => {
    const cleanId = manualId.trim();
    const cleanName = manualName.trim();

    if (!cleanId) {
      setLocalError("يرجى إدخال رقم المشترك / القيد أولاً.");
      return;
    }
    if (!cleanName) {
      setLocalError("يرجى إدخال اسم المشترك الكامل أولاً.");
      return;
    }

    setLocalError(null);
    onSaveSubscriber(cleanId, cleanName);
    setIsExpandedEdit(false);
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
        const qId = url.searchParams.get("subscriber_id") || url.searchParams.get("id") || url.searchParams.get("user");
        const qName = url.searchParams.get("name") || url.searchParams.get("subscriber_name") || "";
        if (qId) {
          const finalId = qId.trim();
          const finalName = qName.trim();
          setManualId(finalId);
          if (finalName) setManualName(finalName);
          onSaveSubscriber(finalId, finalName);
          setIsExpandedEdit(false);
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
          onSaveSubscriber(finalId, finalName);
          setIsExpandedEdit(false);
          return;
        }
      } catch (e) {}
    }

    // 3. Check pattern: "10203 - أحمد علي" or "10203 / أحمد علي"
    const splitMatch = cleanText.split(/[\s—–-]+/).map((s) => s.trim()).filter(Boolean);
    if (splitMatch.length >= 2 && /^\d+$/.test(splitMatch[0])) {
      const parsedId = splitMatch[0];
      const parsedName = cleanText.substring(cleanText.indexOf(splitMatch[1])).trim();
      setManualId(parsedId);
      setManualName(parsedName);
      onSaveSubscriber(parsedId, parsedName);
      setIsExpandedEdit(false);
      return;
    }

    // 4. Default: text is the subscriber ID
    setManualId(cleanText);
    if (manualName.trim()) {
      onSaveSubscriber(cleanText, manualName.trim());
      setIsExpandedEdit(false);
    }
  };

  // Case 1: Subscriber is set and confirmed
  if (subscriber && subscriber.id && !isExpandedEdit) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all animate-in fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  بيانات المشترك
                </span>
                <span className="text-[11px] text-emerald-700/80">
                  {subscriber.source === "url" ? "(من رابط التسجيل)" : "(تم التثبيت)"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {subscriber.name || "مشترك مسجل"}
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  رقم المشترك: {subscriber.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="text-xs text-slate-700 hover:text-emerald-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-emerald-100/60 border border-emerald-200/60 transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
              title="مسح كود QR جديد"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>مسح QR</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpandedEdit(true)}
              className="text-xs text-slate-600 hover:text-emerald-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-emerald-100/60 border border-emerald-200/60 transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
              title="تعديل الاسم أو رقم المشترك"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تعديل</span>
            </button>
            <button
              type="button"
              onClick={onClearSubscriber}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer bg-white border border-slate-200"
              title="مسح وتغيير المشترك"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <QrScannerModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          onScanSuccess={handleQrScanned}
        />
      </div>
    );
  }

  // Case 2: Input fields for Name & Subscriber ID + QR Scanner button
  return (
    <>
      <div className="bg-white border-2 border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              بيانات المشترك
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              أدخل رقم المشترك والاسم (أو امسح كود QR)
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>مسح كود QR</span>
          </button>
        </div>

        {(error || localError) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in flex items-center gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>{localError || error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Subscriber ID */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
              <span>رقم المشترك / القيد:</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={manualId}
              onChange={(e) => {
                setManualId(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="مثال: 1045"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm font-medium text-slate-800 transition-all outline-hidden placeholder:text-slate-400"
            />
          </div>

          {/* Subscriber Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>اسم المشترك الكامل:</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => {
                setManualName(e.target.value);
                if (localError) setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="مثال: حامد محمد"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm font-medium text-slate-800 transition-all outline-hidden placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Controls - Strictly bounded to the Confirm Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 font-medium">
            * أدخل رقم المشترك واسمك الكامل، ثم اضغط على زر "تأكيد وتثبيت البيانات" للاعتماد.
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isExpandedEdit && (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setIsExpandedEdit(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء التعديل
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmSubscriber}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>تأكيد وتثبيت البيانات</span>
            </button>
          </div>
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
