import type { TimeEntryKind, TimeEntrySource } from "./api";

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>;

export type RegisterPunchValidationInput = {
  driverId: string;
  occurredAt: string;
  kind: TimeEntryKind;
  source: TimeEntrySource;
  notes: string;
  isAdministrativeChange: boolean;
};

export function validateRegisterPunchForm(
  values: RegisterPunchValidationInput
): FieldErrors<"driverId" | "occurredAt" | "kind" | "source" | "notes"> {
  const errors: FieldErrors<"driverId" | "occurredAt" | "kind" | "source" | "notes"> = {};

  if (!values.driverId.trim()) {
    errors.driverId = "Funcionario/motorista e obrigatorio.";
  }
  if (!values.occurredAt.trim()) {
    errors.occurredAt = "Data e hora da batida sao obrigatorias.";
  } else if (Number.isNaN(new Date(values.occurredAt).getTime())) {
    errors.occurredAt = "Data e hora da batida invalidas.";
  }
  if (!values.kind) {
    errors.kind = "Tipo de batida e obrigatorio.";
  }
  if (!values.source) {
    errors.source = "Origem e obrigatoria.";
  }

  const notesRequired = values.source === "ADMIN" || values.isAdministrativeChange;
  if (notesRequired && !values.notes.trim()) {
    errors.notes = "Informe a observacao para lancamentos manuais/administrativos.";
  } else if (values.notes.trim().length > 500) {
    errors.notes = "Observacao deve ter no maximo 500 caracteres.";
  }

  return errors;
}

export type AdjustmentType = "INCLUDE" | "UPDATE" | "REMOVE";

export type AdjustmentFormValidationInput = {
  driverId: string;
  adjustmentType: AdjustmentType;
  relatedTimeEntryId: string;
  kind: TimeEntryKind;
  occurredAt: string;
  reason: string;
  notes: string;
};

export function validateAdjustmentForm(
  values: AdjustmentFormValidationInput
): FieldErrors<"driverId" | "relatedTimeEntryId" | "kind" | "occurredAt" | "reason" | "notes"> {
  const errors: FieldErrors<"driverId" | "relatedTimeEntryId" | "kind" | "occurredAt" | "reason" | "notes"> = {};

  if (!values.driverId.trim()) {
    errors.driverId = "Funcionario/motorista e obrigatorio.";
  }
  if (!values.reason.trim()) {
    errors.reason = "Motivo do ajuste e obrigatorio.";
  } else if (values.reason.trim().length < 5) {
    errors.reason = "Motivo do ajuste deve ter ao menos 5 caracteres.";
  } else if (values.reason.trim().length > 500) {
    errors.reason = "Motivo do ajuste deve ter no maximo 500 caracteres.";
  }
  if (values.adjustmentType !== "INCLUDE" && !values.relatedTimeEntryId.trim()) {
    errors.relatedTimeEntryId = "Selecione a batida relacionada.";
  }
  if (values.adjustmentType !== "REMOVE") {
    if (!values.kind) {
      errors.kind = "Tipo de batida e obrigatorio.";
    }
    if (!values.occurredAt.trim()) {
      errors.occurredAt = "Data e hora da batida sao obrigatorias.";
    } else if (Number.isNaN(new Date(values.occurredAt).getTime())) {
      errors.occurredAt = "Data e hora da batida invalidas.";
    }
  }
  if (values.notes.trim().length > 500) {
    errors.notes = "Observacoes devem ter no maximo 500 caracteres.";
  }

  return errors;
}

export function validateTimekeepingDateRange(fromDate: string, toDate: string): string | undefined {
  if (!fromDate || !toDate) {
    return undefined;
  }
  if (fromDate > toDate) {
    return "Periodo invalido: a data inicial deve ser menor ou igual a data final.";
  }
  return undefined;
}

export function validateApprovalDecisionComment(input: {
  mode: "APPROVE" | "REJECT" | "VIEW";
  comment: string;
}): string | undefined {
  if (input.mode === "REJECT" && !input.comment.trim()) {
    return "Comentario do revisor e obrigatorio para recusar.";
  }
  if (input.comment.trim().length > 500) {
    return "Comentario do revisor deve ter no maximo 500 caracteres.";
  }
  return undefined;
}
