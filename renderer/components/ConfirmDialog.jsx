import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Sil', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Təsdiq'} size="sm"
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="btn-secondary">Ləğv et</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-900/30 text-red-400 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <p className="text-sm text-dark-200 mt-2">{message || 'Bu əməliyyatı təsdiqləyirsiniz?'}</p>
      </div>
    </Modal>
  );
}
