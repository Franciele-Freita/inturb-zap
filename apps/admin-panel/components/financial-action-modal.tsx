"use client";

import { useEffect, useState } from "react";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";

type FinancialActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  justificationRequired: boolean;
  defaultJustification?: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (justification: string) => void;
};

export function FinancialActionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  justificationRequired,
  defaultJustification = "",
  errorMessage,
  isSubmitting = false,
  onClose,
  onConfirm
}: FinancialActionModalProps) {
  const [justification, setJustification] = useState(defaultJustification);

  useEffect(() => {
    if (!open) return;
    setJustification(defaultJustification);
  }, [defaultJustification, open]);

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
          <button type="button" onClick={() => onConfirm(justification)} disabled={isSubmitting}>
            {isSubmitting ? "Processando..." : confirmLabel}
          </button>
        </div>
      }
    >
      <label>
        <span>{justificationRequired ? "Justificativa (obrigatoria)" : "Justificativa (opcional)"}</span>
        <textarea
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder={
            justificationRequired
              ? "Informe a justificativa da acao."
              : "Informe a justificativa, se necessario."
          }
          className={errorMessage ? "journey-input-invalid" : undefined}
        />
      </label>
      {errorMessage ? <small className="journey-field-error">{errorMessage}</small> : null}
    </DriverProfileEditorModal>
  );
}
