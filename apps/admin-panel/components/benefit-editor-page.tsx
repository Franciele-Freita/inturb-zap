"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Benefit,
  BenefitContractProfile,
  BenefitDiscountBase,
  BenefitDiscountMode,
  BenefitFrequency,
  formatCurrency,
  request
} from "../lib/api";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  benefitId?: string;
};

type UiBenefitType = "FIXED" | "VARIABLE" | "PERCENTAGE" | "PAYROLL_DISCOUNT" | "INFORMATIVE";
type UiFrequency = "MONTHLY" | "WEEKLY" | "DAILY" | "EVENTUAL";
type UiPayer = "COMPANY" | "EMPLOYEE" | "SHARED";
type UiEligibilityMode = "ALL" | "BY_CONTRACT";

type FormState = {
  name: string;
  description: string;
  isActive: boolean;
  benefitType: UiBenefitType;
  fixedAmount: string;
  percentageValue: string;
  informativeDescription: string;
  frequencyUi: UiFrequency;
  considersBusinessDays: boolean;
  payer: UiPayer;
  eligibilityMode: UiEligibilityMode;
  contractProfiles: BenefitContractProfile[];
  incursCharges: boolean;
  discountMode: BenefitDiscountMode;
  discountValue: string;
  discountBase: BenefitDiscountBase;
  discountLimit: string;
  showInContract: boolean;
  isMandatory: boolean;
  editableInContract: boolean;
};

const CONTRACT_PROFILE_OPTIONS: Array<{ value: BenefitContractProfile; label: string }> = [
  { value: "CLT", label: "CLT" },
  { value: "CLT_INTERMITENTE", label: "CLT Intermitente" },
  { value: "MEI", label: "MEI" },
  { value: "PJ", label: "PJ" },
  { value: "AUTONOMO", label: "Autonomo" }
];

const ALL_CONTRACT_PROFILES = CONTRACT_PROFILE_OPTIONS.map((item) => item.value);

const defaultForm: FormState = {
  name: "",
  description: "",
  isActive: true,
  benefitType: "FIXED",
  fixedAmount: "",
  percentageValue: "",
  informativeDescription: "",
  frequencyUi: "MONTHLY",
  considersBusinessDays: true,
  payer: "COMPANY",
  eligibilityMode: "ALL",
  contractProfiles: [...ALL_CONTRACT_PROFILES],
  incursCharges: false,
  discountMode: "AMOUNT",
  discountValue: "",
  discountBase: "SALARY",
  discountLimit: "",
  showInContract: true,
  isMandatory: false,
  editableInContract: true
};

export function BenefitEditorPage({ mode, benefitId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const pageTitle =
    mode === "create"
      ? "Cadastro de beneficio"
      : mode === "edit"
        ? "Edicao de beneficio"
        : "Visualizacao de beneficio";
  const pageSubtitle = "Configure beneficios reutilizaveis para contratos e colaboradores.";

  useEffect(() => {
    if (mode === "create" || !benefitId) return;

    setIsLoading(true);
    void request<Benefit>(`/admin/benefits/${benefitId}`)
      .then((benefit) => {
        setForm(mapBenefitToForm(benefit));
        setStatusMessage(null);
      })
      .catch((error) =>
        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar beneficio.")
      )
      .finally(() => setIsLoading(false));
  }, [mode, benefitId]);

  const validationErrors = useMemo(() => validateForm(form), [form]);
  const canSave = useMemo(
    () => !isReadOnly && !isLoading && !isSaving && validationErrors.length === 0,
    [isReadOnly, isLoading, isSaving, validationErrors.length]
  );
  const summary = useMemo(() => buildSummary(form), [form]);

  const disabled = isReadOnly || isLoading || isSaving;
  const showErrors = submitAttempted && validationErrors.length > 0;
  const showDiscountBlock = shouldShowDiscountConfig(form);
  const isEmployeePayer = form.payer === "EMPLOYEE";
  const payerSelectDisabled = disabled || form.benefitType === "INFORMATIVE";
  const isFinancialType = form.benefitType !== "INFORMATIVE";

  function update<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleContractProfile(profile: BenefitContractProfile) {
    setForm((current) => {
      const exists = current.contractProfiles.includes(profile);
      const nextProfiles = exists
        ? current.contractProfiles.filter((item) => item !== profile)
        : [...current.contractProfiles, profile];

      return {
        ...current,
        contractProfiles: nextProfiles
      };
    });
  }

  function applyPayer(nextPayer: UiPayer) {
    setForm((current) => {
      if (current.benefitType === "INFORMATIVE") {
        return { ...current, payer: "COMPANY" };
      }
      if (current.benefitType === "PAYROLL_DISCOUNT" && nextPayer === "COMPANY") {
        return { ...current, payer: "EMPLOYEE" };
      }
      return {
        ...current,
        payer: nextPayer
      };
    });
  }

  function setEligibilityMode(nextMode: UiEligibilityMode) {
    if (nextMode === "ALL") {
      setForm((current) => ({
        ...current,
        eligibilityMode: nextMode,
        contractProfiles: [...ALL_CONTRACT_PROFILES]
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      eligibilityMode: nextMode,
      contractProfiles: current.contractProfiles.length > 0 ? current.contractProfiles : ["CLT"]
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!canSave || isReadOnly) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload = buildPayload(form);

      if (mode === "edit" && benefitId) {
        await request(`/admin/benefits/${benefitId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/admin/benefits", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      router.push("/administrative/benefits");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar.");
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide benefit-editor-page-shell">
      <header className="benefit-editor-page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </header>

      {statusMessage ? <p className="benefit-editor-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide benefit-editor-card">
          <form className="stack benefit-editor-form" onSubmit={(event) => void onSubmit(event)}>
            <section className="benefit-form-card">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Dados basicos</h2>
                  <p>Nome, status e descricao do beneficio.</p>
                </div>
              </header>
              <div className="benefit-form-grid">
                <label className="benefit-form-field benefit-form-field-full">
                  <span>Nome do beneficio</span>
                  <input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    disabled={disabled}
                    placeholder="Ex.: Vale alimentacao"
                  />
                </label>
                <label className="benefit-form-field benefit-form-field-toggle">
                  <span>Status ativo</span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => update("isActive", event.target.checked)}
                    disabled={disabled}
                  />
                </label>
                <label className="benefit-form-field benefit-form-field-full">
                  <span>Descricao</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => update("description", event.target.value)}
                    disabled={disabled}
                    placeholder="Descreva quando e como este beneficio deve ser utilizado."
                  />
                </label>
              </div>
            </section>

            <section className="benefit-form-card">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Tipo e calculo</h2>
                  <p>Defina como o beneficio e configurado financeiramente.</p>
                </div>
              </header>
              <div className="benefit-form-grid">
                <label className="benefit-form-field">
                  <span>Como o beneficio e definido</span>
                  <select
                    className="select"
                    value={form.benefitType}
                    onChange={(event) =>
                      setForm((current) => applyTypeSelection(current, event.target.value as UiBenefitType))
                    }
                    disabled={disabled}
                  >
                    <option value="FIXED">Valor fixo</option>
                    <option value="VARIABLE">Valor variavel</option>
                    <option value="PERCENTAGE">Percentual</option>
                    <option value="PAYROLL_DISCOUNT">Desconto em folha</option>
                    <option value="INFORMATIVE">Informativo</option>
                  </select>
                </label>

                {form.benefitType === "FIXED" ? (
                  <label className="benefit-form-field">
                    <span>Valor (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.fixedAmount}
                      onChange={(event) => update("fixedAmount", event.target.value)}
                      disabled={disabled}
                      placeholder="0,00"
                    />
                  </label>
                ) : null}

                {form.benefitType === "VARIABLE" ? (
                  <label className="benefit-form-field">
                    <span>Valor base de referencia (opcional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.fixedAmount}
                      onChange={(event) => update("fixedAmount", event.target.value)}
                      disabled={disabled}
                      placeholder="0,00"
                    />
                    <small>Usado como base para contratos ou estimativas. O valor real pode variar.</small>
                  </label>
                ) : null}

                {form.benefitType === "PERCENTAGE" ? (
                  <label className="benefit-form-field">
                    <span>Percentual (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.percentageValue}
                      onChange={(event) => update("percentageValue", event.target.value)}
                      disabled={disabled}
                      placeholder="0"
                    />
                  </label>
                ) : null}

                {form.benefitType === "PAYROLL_DISCOUNT" ? (
                  <div className="driver-editor-contract-inline-note">
                    <strong>Desconto em folha puro</strong>
                    <span>Este tipo registra apenas a regra de desconto do colaborador.</span>
                  </div>
                ) : null}

                {form.benefitType === "INFORMATIVE" ? (
                  <label className="benefit-form-field benefit-form-field-full">
                    <span>Descricao informativa</span>
                    <textarea
                      rows={4}
                      value={form.informativeDescription}
                      onChange={(event) => update("informativeDescription", event.target.value)}
                      disabled={disabled}
                      placeholder="Ex.: Beneficio sem impacto financeiro direto."
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section className="benefit-form-card">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Aplicacao</h2>
                  <p>Frequencia, responsabilidade de pagamento e elegibilidade.</p>
                </div>
              </header>
              <div className="benefit-form-grid">
                <label className="benefit-form-field">
                  <span>Frequencia</span>
                  <select
                    className="select"
                    value={form.frequencyUi}
                    onChange={(event) => {
                      const nextFrequency = event.target.value as UiFrequency;
                      setForm((current) => ({
                        ...current,
                        frequencyUi: nextFrequency,
                        considersBusinessDays:
                          nextFrequency === "DAILY" || nextFrequency === "WEEKLY"
                            ? current.considersBusinessDays
                            : false
                      }));
                    }}
                    disabled={disabled}
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="DAILY">Diario</option>
                    <option value="EVENTUAL">Eventual</option>
                  </select>
                </label>
                <label className="benefit-form-field">
                  <span>Quem paga</span>
                  <select
                    className="select"
                    value={form.payer}
                    onChange={(event) => applyPayer(event.target.value as UiPayer)}
                    disabled={payerSelectDisabled}
                  >
                    <option value="COMPANY" disabled={form.benefitType === "PAYROLL_DISCOUNT"}>
                      Empresa
                    </option>
                    <option value="EMPLOYEE">Colaborador</option>
                    <option value="SHARED">Dividido</option>
                  </select>
                  {form.benefitType === "INFORMATIVE" ? (
                    <small>Beneficio informativo nao possui custeio ou desconto.</small>
                  ) : null}
                  {form.payer === "SHARED" ? (
                    <small>Rateio percentual entre empresa e colaborador sera disponibilizado em evolucao futura.</small>
                  ) : null}
                </label>
                <label className="benefit-form-field">
                  <span>Elegibilidade</span>
                  <select
                    className="select"
                    value={form.eligibilityMode}
                    onChange={(event) => setEligibilityMode(event.target.value as UiEligibilityMode)}
                    disabled={disabled}
                  >
                    <option value="ALL">Todos</option>
                    <option value="BY_CONTRACT">Por tipo de vinculo</option>
                  </select>
                </label>
              </div>

              {form.frequencyUi === "DAILY" || form.frequencyUi === "WEEKLY" ? (
                <label className="benefit-form-field-toggle">
                  <span>Aplicar apenas em dias trabalhados</span>
                  <input
                    type="checkbox"
                    checked={form.considersBusinessDays}
                    onChange={(event) => update("considersBusinessDays", event.target.checked)}
                    disabled={disabled}
                  />
                </label>
              ) : null}

              {form.eligibilityMode === "BY_CONTRACT" ? (
                <div className="benefit-contract-chips">
                  {CONTRACT_PROFILE_OPTIONS.map((option) => {
                    const selected = form.contractProfiles.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={selected ? "pricing-rule-day is-selected" : "pricing-rule-day"}
                        onClick={() => toggleContractProfile(option.value)}
                        disabled={disabled}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            {showDiscountBlock ? (
              <section className="benefit-form-card">
                <header className="benefit-form-card-head">
                  <div>
                    <h2>Desconto do colaborador</h2>
                    <p>
                      {isEmployeePayer
                        ? "Desconto obrigatorio quando o custeio e do colaborador."
                        : "Configure o desconto aplicado ao colaborador."}
                    </p>
                  </div>
                </header>
                <div className="benefit-form-grid">
                  <label className="benefit-form-field">
                    <span>Tipo de desconto</span>
                    <select
                      className="select"
                      value={form.discountMode}
                      onChange={(event) => update("discountMode", event.target.value as BenefitDiscountMode)}
                      disabled={disabled}
                    >
                      <option value="AMOUNT">Valor fixo</option>
                      <option value="PERCENT">Percentual</option>
                    </select>
                  </label>
                  <label className="benefit-form-field">
                    <span>{form.discountMode === "PERCENT" ? "Valor do desconto (%)" : "Valor do desconto (R$)"}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountValue}
                      onChange={(event) => update("discountValue", event.target.value)}
                      disabled={disabled}
                      placeholder="0"
                    />
                  </label>
                  <label className="benefit-form-field">
                    <span>Base do desconto</span>
                    <select
                      className="select"
                      value={form.discountBase}
                      onChange={(event) => update("discountBase", event.target.value as BenefitDiscountBase)}
                      disabled={disabled}
                    >
                      <option value="SALARY">Sobre salario</option>
                      <option value="BENEFIT">Sobre beneficio</option>
                    </select>
                  </label>
                  <label className="benefit-form-field">
                    <span>Limite opcional</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discountLimit}
                      onChange={(event) => update("discountLimit", event.target.value)}
                      disabled={disabled}
                      placeholder="Ex.: 220,00"
                    />
                  </label>
                </div>
              </section>
            ) : null}

            <section className="benefit-form-card">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Regras adicionais</h2>
                  <p>Regras complementares de folha para calculo financeiro.</p>
                </div>
              </header>

              <div className="benefit-rules-grid">
                <label className="toggle-field">
                  <span>Integrar na folha de pagamento</span>
                  <input
                    type="checkbox"
                    checked={form.incursCharges}
                    onChange={(event) => update("incursCharges", event.target.checked)}
                    disabled={disabled || !isFinancialType}
                  />
                </label>
              </div>
              <small>
                Define se o beneficio sera considerado no calculo da folha salarial.
              </small>
            </section>

            <section className="benefit-form-card">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Contrato</h2>
                  <p>Controle de exibicao e edicao do beneficio no contrato.</p>
                </div>
              </header>

              <div className="benefit-rules-grid">
                <label className="toggle-field">
                  <span>Exibir no contrato</span>
                  <input
                    type="checkbox"
                    checked={form.showInContract}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((current) => ({
                        ...current,
                        showInContract: checked,
                        editableInContract: checked ? current.editableInContract : false
                      }));
                    }}
                    disabled={disabled}
                  />
                </label>
                <label className="toggle-field">
                  <span>Obrigatorio</span>
                  <input
                    type="checkbox"
                    checked={form.isMandatory}
                    onChange={(event) => update("isMandatory", event.target.checked)}
                    disabled={disabled}
                  />
                </label>
                <label className="toggle-field">
                  <span>Pode ser editado no contrato</span>
                  <input
                    type="checkbox"
                    checked={form.editableInContract}
                    onChange={(event) => update("editableInContract", event.target.checked)}
                    disabled={disabled || !form.showInContract}
                  />
                </label>
              </div>
            </section>

            <section className="benefit-form-card benefit-form-card-summary">
              <header className="benefit-form-card-head">
                <div>
                  <h2>Resumo</h2>
                  <p>Descricao natural da configuracao atual para revisar antes de salvar.</p>
                </div>
              </header>
              <p className="benefit-form-summary-text">{summary}</p>
            </section>

            {showErrors ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Revise os campos obrigatorios</strong>
                <span>{validationErrors.join(" | ")}</span>
              </div>
            ) : null}

            <div className="toolbar">
              {!isReadOnly ? (
                <button type="submit" disabled={!canSave}>
                  {isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar beneficio"}
                </button>
              ) : null}
              {isReadOnly && benefitId ? (
                <Link href={`/administrative/benefits/${benefitId}/edit`} className="button-link">
                  Editar beneficio
                </Link>
              ) : null}
              <Link href="/administrative/benefits" className="button-link secondary-link">
                Voltar para lista
              </Link>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

function applyTypeSelection(current: FormState, type: UiBenefitType): FormState {
  if (type === current.benefitType) {
    return current;
  }

  if (type === "INFORMATIVE") {
    return {
      ...current,
      benefitType: type,
      payer: "COMPANY",
      incursCharges: false
    };
  }

  if (type === "PAYROLL_DISCOUNT") {
    return {
      ...current,
      benefitType: type,
      payer: current.payer === "COMPANY" ? "EMPLOYEE" : current.payer
    };
  }

  return {
    ...current,
    benefitType: type
  };
}

function mapUiTypeToApiType(type: UiBenefitType): Benefit["type"] {
  if (type === "VARIABLE" || type === "PAYROLL_DISCOUNT") {
    return "VARIABLE";
  }
  return type;
}

function mapUiFrequencyToApiFrequency(value: UiFrequency): BenefitFrequency {
  if (value === "DAILY") return "DAILY";
  if (value === "WEEKLY") return "PER_USE";
  if (value === "EVENTUAL") return "ONE_TIME";
  return "MONTHLY";
}

function mapApiFrequencyToUiFrequency(value: BenefitFrequency): UiFrequency {
  if (value === "DAILY") return "DAILY";
  if (value === "PER_USE") return "WEEKLY";
  if (value === "ONE_TIME") return "EVENTUAL";
  return "MONTHLY";
}

function mapFrequencyToApplicationMode(
  value: UiFrequency,
  considersBusinessDays: boolean
): Benefit["applicationMode"] {
  if ((value === "DAILY" || value === "WEEKLY") && considersBusinessDays) {
    return "PER_DAY_WORKED";
  }
  return "PER_EMPLOYEE";
}

function shouldShowDiscountConfig(form: FormState): boolean {
  if (form.benefitType === "INFORMATIVE") {
    return false;
  }
  return form.payer !== "COMPANY";
}

function buildPayload(form: FormState) {
  const apiType = mapUiTypeToApiType(form.benefitType);
  const shouldShowInContract = form.showInContract;
  const deductFromSalary = shouldShowDiscountConfig(form);

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    isActive: form.isActive,
    type: apiType,
    valueConfig: buildValueConfig(form, deductFromSalary),
    frequency: mapUiFrequencyToApiFrequency(form.frequencyUi),
    applicationMode: mapFrequencyToApplicationMode(form.frequencyUi, form.considersBusinessDays),
    deductFromSalary,
    incursCharges: form.incursCharges,
    isMandatory: form.isMandatory,
    editableInContract: shouldShowInContract ? form.editableInContract : false,
    workProfiles: [],
    contractProfiles: form.eligibilityMode === "ALL" ? [] : form.contractProfiles
  };
}

function buildValueConfig(form: FormState, deductFromSalary: boolean): Benefit["valueConfig"] {
  const valueConfig: Benefit["valueConfig"] = {};

  if (form.benefitType === "FIXED") {
    valueConfig.fixedAmount = toNumber(form.fixedAmount);
  }

  if (form.benefitType === "VARIABLE") {
    const fixedAmount = toNumber(form.fixedAmount);
    if (fixedAmount !== undefined) {
      valueConfig.fixedAmount = fixedAmount;
    }
  }

  if (form.benefitType === "PERCENTAGE") {
    valueConfig.percentageValue = toNumber(form.percentageValue);
    valueConfig.percentageBase = "SALARY";
  }

  if (form.benefitType === "PAYROLL_DISCOUNT") {
    valueConfig.variableRuleDescription = "Desconto em folha";
  }

  if (form.benefitType === "INFORMATIVE") {
    valueConfig.informativeDescription = form.informativeDescription.trim() || form.description.trim();
  }

  if (deductFromSalary) {
    valueConfig.discountMode = form.discountMode;
    valueConfig.discountValue = toNumber(form.discountValue);
    valueConfig.discountBase = form.discountBase;
    valueConfig.discountLimit = toNumber(form.discountLimit);
  }

  return valueConfig;
}

function mapBenefitToForm(benefit: Benefit): FormState {
  const parsedLegacyDiscount = parseLegacyDiscountRule(benefit.valueConfig.variableRuleDescription);
  const benefitType = mapApiBenefitToUiType(benefit);
  const hasContractRestriction = benefit.contractProfiles.length > 0;
  const payer = resolvePayer(benefit.deductFromSalary, benefit.incursCharges);

  return {
    ...defaultForm,
    name: benefit.name,
    description: benefit.description ?? "",
    isActive: benefit.isActive,
    benefitType,
    fixedAmount:
      (benefitType === "FIXED" || benefitType === "VARIABLE") &&
      benefit.valueConfig.fixedAmount !== undefined
        ? String(benefit.valueConfig.fixedAmount)
        : "",
    percentageValue:
      benefit.type === "PERCENTAGE" && benefit.valueConfig.percentageValue !== undefined
        ? String(benefit.valueConfig.percentageValue)
        : "",
    informativeDescription: benefit.valueConfig.informativeDescription ?? "",
    frequencyUi: mapApiFrequencyToUiFrequency(benefit.frequency),
    considersBusinessDays: benefit.applicationMode === "PER_DAY_WORKED",
    payer: benefitType === "INFORMATIVE" ? "COMPANY" : payer,
    eligibilityMode: hasContractRestriction ? "BY_CONTRACT" : "ALL",
    contractProfiles: hasContractRestriction ? benefit.contractProfiles : [...ALL_CONTRACT_PROFILES],
    incursCharges: benefitType === "INFORMATIVE" ? false : benefit.incursCharges,
    discountMode: benefit.valueConfig.discountMode ?? parsedLegacyDiscount.mode,
    discountValue:
      benefit.valueConfig.discountValue !== undefined
        ? String(benefit.valueConfig.discountValue)
        : parsedLegacyDiscount.value,
    discountBase: benefit.valueConfig.discountBase ?? parsedLegacyDiscount.base,
    discountLimit:
      benefit.valueConfig.discountLimit !== undefined
        ? String(benefit.valueConfig.discountLimit)
        : parsedLegacyDiscount.limit,
    showInContract: benefit.editableInContract,
    isMandatory: benefit.isMandatory,
    editableInContract: benefit.editableInContract
  };
}

function mapApiBenefitToUiType(benefit: Benefit): UiBenefitType {
  if (benefit.type !== "VARIABLE") {
    return benefit.type;
  }

  const hasFixedAmount = benefit.valueConfig.fixedAmount !== undefined;
  const hasDiscountConfig =
    benefit.valueConfig.discountMode !== undefined ||
    benefit.valueConfig.discountValue !== undefined ||
    isLegacyDiscountRule(benefit.valueConfig.variableRuleDescription);

  if (!hasFixedAmount && hasDiscountConfig) {
    return "PAYROLL_DISCOUNT";
  }

  return "VARIABLE";
}

function parseLegacyDiscountRule(value: string | undefined): {
  mode: BenefitDiscountMode;
  value: string;
  base: BenefitDiscountBase;
  limit: string;
} {
  if (!value || value.trim().length === 0) {
    return {
      mode: "AMOUNT",
      value: "",
      base: "SALARY",
      limit: ""
    };
  }

  const normalized = value.toLowerCase();
  const normalizedAscii = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const mode: BenefitDiscountMode =
    normalizedAscii.includes("percentual") || normalizedAscii.includes("mode=percent")
      ? "PERCENT"
      : "AMOUNT";
  const base: BenefitDiscountBase = normalizedAscii.includes("beneficio") ? "BENEFIT" : "SALARY";

  const numericMatches = value.match(/(\d+(?:[.,]\d+)?)/g) ?? [];
  return {
    mode,
    value: numericMatches[0] ?? "",
    base,
    limit: numericMatches[1] ?? ""
  };
}

function isLegacyDiscountRule(value: string | undefined): boolean {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("desconto em folha");
}

function validateForm(form: FormState): string[] {
  const errors: string[] = [];
  const hasDiscountConfig = shouldShowDiscountConfig(form);

  if (form.name.trim().length < 3) {
    errors.push("Informe um nome de beneficio com pelo menos 3 caracteres.");
  }

  if (form.benefitType === "FIXED") {
    const fixedAmount = toNumber(form.fixedAmount) ?? 0;
    if (fixedAmount <= 0) {
      errors.push("Informe um valor em reais maior que zero para beneficio de valor fixo.");
    }
  }

  if (form.benefitType === "VARIABLE") {
    const variableAmount = toNumber(form.fixedAmount);
    if (variableAmount !== undefined && variableAmount < 0) {
      errors.push("O valor base de referencia do beneficio variavel deve ser igual ou maior que zero.");
    }
  }

  if (form.benefitType === "PERCENTAGE") {
    const percentage = toNumber(form.percentageValue) ?? 0;
    if (percentage <= 0) {
      errors.push("Informe um percentual maior que zero.");
    } else if (percentage > 100) {
      errors.push("Percentual invalido. Utilize um valor entre 0 e 100.");
    }
  }

  if (form.benefitType === "PAYROLL_DISCOUNT" && form.payer === "COMPANY") {
    errors.push('Beneficio do tipo "Desconto em folha" exige custeio do colaborador ou dividido.');
  }

  if (
    form.benefitType === "INFORMATIVE" &&
    form.informativeDescription.trim().length < 3 &&
    form.description.trim().length < 3
  ) {
    errors.push("Beneficio informativo exige uma descricao.");
  }

  if (form.eligibilityMode === "BY_CONTRACT" && form.contractProfiles.length === 0) {
    errors.push("Selecione ao menos um tipo de vinculo em elegibilidade.");
  }

  if (form.benefitType === "INFORMATIVE" && form.incursCharges) {
    errors.push("Beneficio informativo nao pode integrar na folha de pagamento.");
  }

  if (hasDiscountConfig) {
    const discountValue = toNumber(form.discountValue) ?? 0;
    if (discountValue <= 0) {
      errors.push("Informe o valor do desconto do colaborador.");
    }
    if (form.discountMode === "PERCENT" && discountValue > 100) {
      errors.push("Percentual de desconto invalido.");
    }
    const discountLimit = toNumber(form.discountLimit);
    if (discountLimit !== undefined && discountLimit <= 0) {
      errors.push("O limite opcional deve ser maior que zero.");
    }
  }

  return errors;
}

function resolvePayer(deductFromSalary: boolean, incursCharges: boolean): UiPayer {
  if (!deductFromSalary) {
    return "COMPANY";
  }
  if (incursCharges) {
    return "SHARED";
  }
  return "EMPLOYEE";
}

function buildSummary(form: FormState): string {
  const hasDiscountConfig = shouldShowDiscountConfig(form);
  const sentences: string[] = [];

  if (form.benefitType === "FIXED") {
    const value = toNumber(form.fixedAmount);
    sentences.push(
      `Beneficio de valor fixo${value !== undefined ? ` de ${formatCurrency(value)}` : ""}.`
    );
  } else if (form.benefitType === "VARIABLE") {
    const value = toNumber(form.fixedAmount);
    sentences.push(
      `Beneficio de valor variavel${
        value !== undefined ? ` (referencia ${formatCurrency(value)})` : ""
      }.`
    );
  } else if (form.benefitType === "PERCENTAGE") {
    const value = toNumber(form.percentageValue);
    sentences.push(
      `Beneficio percentual${value !== undefined ? ` de ${value}%` : ""}.`
    );
  } else if (form.benefitType === "PAYROLL_DISCOUNT") {
    sentences.push("Beneficio de desconto em folha.");
  } else {
    const info = form.informativeDescription.trim() || form.description.trim();
    sentences.push(`Beneficio informativo${info.length > 0 ? `: ${info}` : ""}.`);
  }

  if (hasDiscountConfig) {
    const modeLabel = form.discountMode === "PERCENT" ? "percentual" : "valor fixo";
    const baseLabel = form.discountBase === "BENEFIT" ? "sobre o beneficio" : "sobre salario";
    const parsedDiscountValue = toNumber(form.discountValue);
    const valueLabel =
      form.discountMode === "PERCENT"
        ? `${form.discountValue.trim() || "0"}%`
        : parsedDiscountValue !== undefined
          ? formatCurrency(parsedDiscountValue)
          : form.discountValue.trim() || "0";
    const parsedLimit = toNumber(form.discountLimit);
    const limitLabel = parsedLimit !== undefined ? `, com limite de ${formatCurrency(parsedLimit)}` : "";
    sentences.push(`Desconto do colaborador por ${modeLabel} de ${valueLabel}, ${baseLabel}${limitLabel}.`);
  }

  sentences.push(`Frequencia ${resolveUiFrequencyLabel(form.frequencyUi).toLowerCase()}.`);
  if (form.frequencyUi === "DAILY" || form.frequencyUi === "WEEKLY") {
    sentences.push(
      form.considersBusinessDays
        ? "Aplicacao apenas em dias trabalhados."
        : "Aplicacao sem restricao de dias trabalhados."
    );
  }

  if (form.payer === "COMPANY") {
    sentences.push("Custeio integral da empresa.");
  } else if (form.payer === "EMPLOYEE") {
    sentences.push("Custeio integral do colaborador.");
  } else {
    sentences.push("Custeio dividido entre empresa e colaborador.");
  }

  sentences.push(
    form.eligibilityMode === "ALL"
      ? "Elegivel para todos os vinculos."
      : `Elegivel para ${form.contractProfiles.length} tipo(s) de vinculo.`
  );

  if (form.incursCharges) {
    sentences.push("Integrado na folha de pagamento.");
  }

  if (form.showInContract) {
    const contractParts: string[] = ["Exibido no contrato"];
    if (form.isMandatory) {
      contractParts.push("obrigatorio");
    }
    if (form.editableInContract) {
      contractParts.push("editavel no contrato");
    }
    sentences.push(`${contractParts.join(", ")}.`);
  } else {
    sentences.push("Nao exibido no contrato.");
  }

  return sentences.join(" ");
}

function resolveUiFrequencyLabel(value: UiFrequency): string {
  if (value === "DAILY") return "Diaria";
  if (value === "WEEKLY") return "Semanal";
  if (value === "EVENTUAL") return "Eventual";
  return "Mensal";
}

function toNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}
