import React from "react";
import { X, ZoomIn, Download, ExternalLink } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white shrink-0">
          <div className="flex items-center gap-2 truncate pr-2">
            <ZoomIn className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold truncate">
              {title || "عرض الصورة بالحجم الكامل"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="فتح في نافذة جديدة"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content Container */}
        <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950/50 flex-1 min-h-[300px]">
          <img
            src={imageUrl}
            alt={title || "صورة بالحجم الكامل"}
            referrerPolicy="no-referrer"
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg cursor-zoom-out"
            onClick={onClose}
          />
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-t border-slate-800 text-slate-400 text-xs flex items-center justify-between shrink-0">
          <span>انقر على الصورة أو في أي مكان للإغلاق</span>
          <span className="font-mono text-[11px] text-slate-500">100% Fit</span>
        </div>
      </div>
    </div>
  );
};
