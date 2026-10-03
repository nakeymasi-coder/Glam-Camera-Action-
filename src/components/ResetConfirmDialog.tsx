import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmDialog: React.FC<ResetConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Reset confirmation" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Reset All Presets &amp; Fields?</h3>
            <p className="text-xs text-neutral-500">This action will restore default values.</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 mb-6 leading-relaxed">
          Every preset will revert to <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono">None</code>, and your typed story idea and optional details will be cleared. Any saved prompts in your Library will remain intact.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs sm:text-sm font-bold text-white transition-colors shadow-xs"
          >
            Yes, Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
};
