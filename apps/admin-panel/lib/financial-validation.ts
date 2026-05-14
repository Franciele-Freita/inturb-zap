import type { FinancialCategory } from "./api";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export type FinancialCategoryDraft = {
  code: string;
  name: string;
  type: FinancialCategory["type"];
  color: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
};

export type FinancialCategoryPayload = {
  code: string;
  name: string;
  type: FinancialCategory["type"];
  color?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
};

export type FinancialTransactionEditDraft = {
  description: string;
  category: string;
  amount: string;
  notes: string;
};

export type FinancialTransactionEditPayload = {
  description: string;
  category: string;
  amount: number;
  notes?: string;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const CATEGORY_CODE_REGEX = /^[A-Z0-9_-]+$/;

export function normalizeFinancialText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeFinancialSearchTerm(value: string, maxLength = 90): string {
  const normalized = normalizeFinancialText(value);
  if (!normalized) return "";
  return normalized.slice(0, maxLength);
}

export function validateFinancialCategoryDraft(
  draft: FinancialCategoryDraft
): ValidationResult<FinancialCategoryPayload> {
  const code = normalizeFinancialText(draft.code).toUpperCase();
  const name = normalizeFinancialText(draft.name);
  const color = normalizeFinancialText(draft.color);
  const icon = normalizeFinancialText(draft.icon);
  const sortOrder = Number(draft.sortOrder);
  const errors: string[] = [];

  if (!code) {
    errors.push("Informe o codigo da categoria.");
  } else if (!CATEGORY_CODE_REGEX.test(code)) {
    errors.push("Codigo invalido. Use apenas letras, numeros, _ ou -.");
  }

  if (!name) {
    errors.push("Informe o nome da categoria.");
  }

  if (!Number.isFinite(sortOrder)) {
    errors.push("Informe uma ordem numerica valida.");
  }

  if (color && !HEX_COLOR_REGEX.test(color)) {
    errors.push("Cor invalida. Use formato hexadecimal, ex.: #1D4ED8.");
  }

  if (icon.length > 40) {
    errors.push("Icone muito longo. Limite de 40 caracteres.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      code,
      name,
      type: draft.type,
      color: color || undefined,
      icon: icon || undefined,
      sortOrder,
      isActive: draft.isActive
    }
  };
}

export function validateFinancialReason(
  value: string,
  options: {
    required: boolean;
    fieldLabel: string;
    maxLength?: number;
  }
): ValidationResult<string | undefined> {
  const maxLength = options.maxLength ?? 220;
  const normalized = normalizeFinancialText(value);

  if (!normalized) {
    if (options.required) {
      return { ok: false, errors: [`Informe ${options.fieldLabel}.`] };
    }
    return { ok: true, value: undefined };
  }

  if (normalized.length > maxLength) {
    return {
      ok: false,
      errors: [`${options.fieldLabel} deve ter no maximo ${maxLength} caracteres.`]
    };
  }

  return { ok: true, value: normalized };
}

export function validateFinancialTransactionEditDraft(
  draft: FinancialTransactionEditDraft
): ValidationResult<FinancialTransactionEditPayload> {
  const description = normalizeFinancialText(draft.description);
  const category = normalizeFinancialText(draft.category);
  const notes = normalizeFinancialText(draft.notes);
  const amount = Number(draft.amount.replace(",", "."));
  const errors: string[] = [];

  if (!description) {
    errors.push("Informe a descricao da transacao.");
  }

  if (!category) {
    errors.push("Informe a categoria da transacao.");
  }

  if (!Number.isFinite(amount)) {
    errors.push("Informe um valor numerico valido para a transacao.");
  }

  if (notes.length > 400) {
    errors.push("Observacoes devem ter no maximo 400 caracteres.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      description,
      category,
      amount,
      notes: notes || undefined
    }
  };
}
