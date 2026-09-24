import React from 'react';
import { useOperator } from '../../context/OperatorContext';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useOperator();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';
        const isSuccess = t.type === 'success';

        return (
          <div key={t.id} className={`toast-card ${t.type}`}>
            <div className="toast-icon">
              {isError && <ShieldAlert size={18} className="text-danger" />}
              {isWarning && <AlertTriangle size={18} className="text-warning" />}
              {isSuccess && <CheckCircle2 size={18} className="text-green" />}
              {!isError && !isWarning && !isSuccess && <Info size={18} className="text-cyan" />}
            </div>

            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.message}</div>
            </div>

            <button
              className="cat-icon-btn toast-close-btn"
              onClick={() => removeToast(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
