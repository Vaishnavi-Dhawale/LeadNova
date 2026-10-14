import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  confirmVariant?: 'primary' | 'danger';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  isDangerous,
  confirmVariant,
}) => {
  const closeAction = onCancel || onClose || (() => {});
  const confirmBtnText = confirmLabel || confirmText || 'Confirm';
  const cancelBtnText = cancelLabel || cancelText || 'Cancel';
  const danger = isDangerous || confirmVariant === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={closeAction} title={title} maxWidth="md">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={closeAction}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          {cancelBtnText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            closeAction();
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition ${
            danger
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {confirmBtnText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
