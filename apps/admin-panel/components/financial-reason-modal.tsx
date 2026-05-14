"use client";

import { useEffect, useState } from "react";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";

type FinancialReasonModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  required: boolean;
  defaultValue?: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function FinancialReasonModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  required,
  defaultValue = "",
  errorMessage,
  isSubmitting = false,
  onClose,
  onConfirm
}: FinancialReasonModalProps) {
  const [reason, setReason] = useState(defaultValue);

  useEffect(() => {
    if (!open) return;
    setReason(defaultValue);
  }, [defaultValue, open]);

  return (
    <DriverProfileEditorModal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={title}
      description={description}
      footer={
        <div className="timekeeping-adjustments-actions-row">
          <button type="button" className="secondary" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <label>
        <span>{required ? "Motivo (obrigatorio)" : "Motivo (opcional)"}</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={required ? "Descreva o motivo da acao." : "Descreva o motivo, se necessario."}
          className={errorMessage ? "journey-input-invalid" : undefined}
        />
      </label>
      {errorMessage ? <small className="journey-field-error">{errorMessage}</small> : null}
    </DriverProfileEditorModal>
  );
}
