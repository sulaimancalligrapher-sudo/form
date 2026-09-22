import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { FormLang } from "../types";
import { getEffectiveUiTranslations } from "../utils/translationStorage";
import { CheckCircle2 } from "lucide-react";

interface SuccessReceiptProps {
  registrationId?: string;
  timestamp?: string;
  answers?: Array<{ question: string; answer: string }>;
  name?: string;
  phone?: string;
  email?: string;
  currentLang: FormLang;
  onReset?: () => void;
  telegramBotLink?: string;
}

export const SuccessReceipt: React.FC<SuccessReceiptProps> = ({
  currentLang
}) => {
  const t = getEffectiveUiTranslations(currentLang);

  useEffect(() => {
    // Fire celebratory confetti upon successful submission
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.55 }
      });
    } catch (e) {}
  }, []);

  return (
    <div className="max-w-xl mx-auto my-12 p-8 sm:p-12 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center animate-in fade-in zoom-in-95 duration-400">
      {/* Centered Success Checkmark */}
      <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/60 shadow-xs">
        <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
      </div>

      {/* Main Confirmation Message */}
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
        {t.successTitle}
      </h2>

      <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
        {t.successDesc}
      </p>
    </div>
  );
};

