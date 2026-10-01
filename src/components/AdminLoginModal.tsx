import React, { useState } from "react";
import { Lock, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound } from "lucide-react";

const ADMIN_PASS_KEY = "thnoon_admin_password";
const ADMIN_SESSION_KEY = "thnoon_admin_authenticated";

export function getAdminPassword(): string {
  if (typeof window === "undefined") return "1234";
  try {
    return localStorage.getItem(ADMIN_PASS_KEY) || "1234";
  } catch {
    return "1234";
  }
}

export function setAdminPassword(newPass: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = newPass.trim();
    if (clean) {
      localStorage.setItem(ADMIN_PASS_KEY, clean);
    }
  } catch {}
}

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true" || localStorage.getItem(ADMIN_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdminLoggedIn(status: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (status) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      localStorage.setItem(ADMIN_SESSION_KEY, "true");
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {}
}

interface AdminLoginModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onSuccess,
  onCancel
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = password.trim();
    const savedPass = getAdminPassword();

    if (!cleanInput) {
      setError("يرجى إدخال رمز الدخول الخاص بالإدارة.");
      return;
    }

    if (cleanInput === savedPass || (savedPass === "1234" && cleanInput === "admin")) {
      setError(null);
      setPassword("");
      setAdminLoggedIn(true);
      onSuccess();
    } else {
      setError("رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Top Icon & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto shadow-lg ring-4 ring-emerald-50">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
            بوابة الإدارة الخاصة
          </span>
          <h3 className="text-xl font-black text-slate-900">
            تسجيل دخول الإدارة
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            أدخل رمز المرور الخاص بالإدارة لإظهار إعدادات الربط والشيت ولوحة التحكم ومشاركة الرابط
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>رمز مرور الإدارة:</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="أدخل رمز المرور..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm font-bold text-slate-900 outline-none transition-all pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title={showPassword ? "إخفاء الرمز" : "إظهار الرمز"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="submit"
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
            >
              <Lock className="w-4 h-4" />
              <span>دخول للإدارة</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للاستمارة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
