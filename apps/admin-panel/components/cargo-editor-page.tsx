"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Cargo, CboOccupation, request } from "../lib/api";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import {
  listCargoDepartmentOptions,
  normalizeCargoLevel,
  normalizeCargoSeniorityLevels,
} from "../lib/cargo-catalog";

type Mode = "create" | "edit";

type CboResult = {
  codigo: string;
  titulo: string;
};

type Props = {
  mode: Mode;
  cargoId?: string;
};

type CargoForm = {
  name: string;
  description: string;
  department: string;
  level: string;
  levels: string[];
  isActive: boolean;
  cbo: CboResult | null;
  unhealthyAllowance: "NONE" | "10" | "20" | "40";
  hazardousAllowance: "NONE" | "30";
};

type CargoFormField = "name" | "department" | "level" | "levels" | "cbo";

const levelOptions = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "TECNICO", label: "T\u00e9cnico" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "LIDERANCA", label: "Lideran\u00e7a" },
  { value: "GESTAO", label: "Gest\u00e3o" },
  { value: "ESTRATEGICO", label: "Estrat\u00e9gico" }
] as const;

const initialForm: CargoForm = {
  name: "",
  description: "",
  department: "",
  level: "OPERACIONAL",
  levels: [],
  isActive: true,
  cbo: null,
  unhealthyAllowance: "NONE",
  hazardousAllowance: "NONE",
};

const initialTouchedFields: Record<CargoFormField, boolean> = {
  name: false,
  department: false,
  level: false,
  levels: false,
  cbo: false,
};

export function CargoEditorPage({ mode, cargoId }: Props) {
  const router = useRouter();
  const cboSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cboBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cboSearchRequestIdRef = useRef(0);
  const [form, setForm] = useState<CargoForm>(initialForm);
  const [levelInput, setLevelInput] = useState("");
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [levelModalError, setLevelModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [cboQuery, setCboQuery] = useState("");
  const [cboResults, setCboResults] = useState<CboResult[]>([]);
  const [showCboResults, setShowCboResults] = useState(false);
  const [highlightedCboIndex, setHighlightedCboIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touchedFields, setTouchedFields] =
    useState<Record<CargoFormField, boolean>>(initialTouchedFields);
  const [blockingStatusMessage, setBlockingStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !cargoId) {
      setIsLoading(false);
      return;
    }

    void request<Cargo>(`/admin/cargos/${cargoId}`)
      .then((cargo) => {
        setForm({
          name: cargo.name,
          description: cargo.description ?? "",
          department: cargo.department,
          level: normalizeCargoLevel(cargo.level),
          levels: normalizeCargoSeniorityLevels(cargo.levels, cargo.level),
          isActive: cargo.isActive,
          cbo: cargo.cbo ?? null,
          unhealthyAllowance: cargo.unhealthyAllowance ?? "NONE",
          hazardousAllowance: cargo.hazardousAllowance ?? "NONE",
        });
        if (cargo.cbo) {
          setCboQuery(`${cargo.cbo.codigo} - ${cargo.cbo.titulo}`);
        }
        setBlockingStatusMessage(null);
      })
      .catch((error) => {
        setBlockingStatusMessage(error instanceof Error ? error.message : "Cargo nao encontrado.");
      })
      .finally(() => setIsLoading(false));
  }, [mode, cargoId]);

  useEffect(() => {
    return () => {
      if (cboSearchDebounceRef.current) {
        clearTimeout(cboSearchDebounceRef.current);
        cboSearchDebounceRef.current = null;
      }
      if (cboBlurTimeoutRef.current) {
        clearTimeout(cboBlurTimeoutRef.current);
        cboBlurTimeoutRef.current = null;
      }
      cboSearchRequestIdRef.current += 1;
    };
  }, []);

  const departmentOptions = useMemo(() => {
    const options = listCargoDepartmentOptions();
    if (form.department && !options.includes(form.department)) {
      return [...options, form.department].sort((left, right) =>
        left.localeCompare(right, "pt-BR")
      );
    }
    return options;
  }, [form.department]);

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<CargoFormField, string>> = {};
    if (form.name.trim().length === 0) {
      errors.name = "O nome do cargo e obrigatorio.";
    } else if (form.name.trim().length < 2) {
      errors.name = "Informe ao menos 2 caracteres no nome do cargo.";
    }

    if (form.department.trim().length === 0) {
      errors.department = "Selecione um departamento.";
    }

    if (form.level.trim().length === 0) {
      errors.level = "Selecione uma categoria do cargo.";
    }

    if (form.levels.length === 0) {
      errors.levels = "Adicione ao menos um nivel para o cargo.";
    }

    if (!form.cbo) {
      errors.cbo = "A vinculacao com o CBO e obrigatoria.";
    }

    return errors;
  }, [form.department, form.level, form.levels, form.name, form.cbo]);

  const validationErrors = useMemo(() => {
    return (Object.values(fieldErrors).filter(Boolean) as string[]) ?? [];
  }, [fieldErrors]);

  const canSave = !isLoading && !isSaving && validationErrors.length === 0;
  const disabled = isLoading || isSaving;
  const showErrors = submitAttempted && validationErrors.length > 0;
  const pageTitle = mode === "create" ? "Cadastrar cargo" : "Editar cargo";
  const pageSubtitle =
    mode === "create"
      ? "Defina um cargo para reutilizacao no sistema"
      : "Atualize as informacoes do cargo para manter o catalogo padronizado";
  const primaryActionLabel =
    isSaving ? "Salvando..." : mode === "create" ? "Criar cargo" : "Salvar alteracoes";
  const cboListboxId = "cargo-cbo-autocomplete-list";

  function updateField<K extends keyof CargoForm>(key: K, value: CargoForm[K]) {
    if (blockingStatusMessage) {
      setBlockingStatusMessage(null);
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markFieldAsTouched(field: CargoFormField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function shouldShowFieldError(field: CargoFormField): boolean {
    return Boolean(fieldErrors[field]) && (submitAttempted || touchedFields[field]);
  }

  async function searchCbo(query: string) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setCboResults([]);
      setShowCboResults(false);
      setHighlightedCboIndex(-1);
      return;
    }

    const requestId = ++cboSearchRequestIdRef.current;

    try {
      const rows = await request<CboOccupation[]>(
        `/admin/cbo/search?q=${encodeURIComponent(normalizedQuery)}&limit=20`
      );
      if (requestId !== cboSearchRequestIdRef.current) {
        return;
      }

      const mapped: CboResult[] = rows.map((item) => ({
        codigo: item.code,
        titulo: item.title
      }));

      setCboResults(mapped);
      setShowCboResults(mapped.length > 0);
      setHighlightedCboIndex(mapped.length > 0 ? 0 : -1);
    } catch {
      if (requestId !== cboSearchRequestIdRef.current) {
        return;
      }
      setCboResults([]);
      setShowCboResults(false);
      setHighlightedCboIndex(-1);
    } finally {
      if (requestId !== cboSearchRequestIdRef.current) {
        return;
      }
    }
  }

  function getCboOptionId(result: CboResult) {
    return `cargo-cbo-option-${result.codigo.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function handleSelectCbo(result: CboResult) {
    if (cboBlurTimeoutRef.current) {
      clearTimeout(cboBlurTimeoutRef.current);
      cboBlurTimeoutRef.current = null;
    }
    updateField("cbo", result);
    setCboQuery(`${result.codigo} - ${result.titulo}`);
    setShowCboResults(false);
    setHighlightedCboIndex(-1);
    markFieldAsTouched("cbo");
  }

  function suggestDescription() {
    if (!form.cbo) return;
    const currentText = form.description.trim();
    const cargoName = form.name.trim() || "cargo informado";
    const suggestion = `Atividades correspondentes ao CBO ${form.cbo.codigo} - ${form.cbo.titulo} para o cargo ${cargoName}. Descreva responsabilidades principais, entregas esperadas, requisitos tecnicos e condicoes de execucao do trabalho.`;

    if (currentText && !confirm("Deseja substituir a descricao atual pela sugestao do CBO?")) {
      return;
    }
    updateField("description", suggestion);
  }

  function closeCboResults() {
    if (cboBlurTimeoutRef.current) {
      clearTimeout(cboBlurTimeoutRef.current);
      cboBlurTimeoutRef.current = null;
    }
    setShowCboResults(false);
    setHighlightedCboIndex(-1);
  }

  function handleCboKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showCboResults || cboResults.length === 0) {
      if (event.key === "Escape") {
        closeCboResults();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedCboIndex((current) => {
        if (current < 0) return 0;
        return current >= cboResults.length - 1 ? 0 : current + 1;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedCboIndex((current) => {
        if (current < 0) return cboResults.length - 1;
        return current <= 0 ? cboResults.length - 1 : current - 1;
      });
      return;
    }

    if (event.key === "Enter") {
      if (highlightedCboIndex >= 0 && highlightedCboIndex < cboResults.length) {
        event.preventDefault();
        handleSelectCbo(cboResults[highlightedCboIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCboResults();
    }
  }

  const activeCboDescendantId =
    showCboResults && highlightedCboIndex >= 0 && highlightedCboIndex < cboResults.length
      ? getCboOptionId(cboResults[highlightedCboIndex])
      : undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setTouchedFields({
      name: true,
      department: true,
      level: true,
      levels: true,
      cbo: true,
    });

    if (!canSave) {
      return;
    }

    setIsSaving(true);
    const normalizedName = form.name.trim();
    const normalizedDescription = form.description.trim();
    const normalizedDepartment = form.department.trim();
    const normalizedLevel = normalizeCargoLevel(form.level);
    const normalizedLevels = normalizeCargoSeniorityLevels(form.levels, form.level);
    const payload = {
      name: normalizedName,
      description: normalizedDescription || undefined,
      department: normalizedDepartment,
      level: normalizedLevel,
      levels: normalizedLevels,
      cbo: form.cbo,
      unhealthyAllowance: form.unhealthyAllowance,
      hazardousAllowance: form.hazardousAllowance,
      isActive: form.isActive
    };

    try {
      if (mode === "edit" && cargoId) {
        await request<Cargo>(`/admin/cargos/${cargoId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request<Cargo>("/admin/cargos", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      router.push("/administrative/cargo");
      router.refresh();
    } catch (error) {
      setBlockingStatusMessage(error instanceof Error ? error.message : "Falha ao salvar cargo.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  }

  function addLevel() {
    const rawLevel = levelInput.trim();
    if (rawLevel.length === 0) {
      setLevelModalError("Informe um nivel para adicionar.");
      return;
    }

    const normalized = normalizeCargoSeniorityLevels([rawLevel]);
    const nextLevel = normalized[0];
    if (!nextLevel) {
      setLevelModalError("Nao foi possivel validar o nivel informado.");
      return;
    }

    const alreadyExists = form.levels.some(
      (item) => item.trim().toLowerCase() === nextLevel.toLowerCase()
    );
    if (alreadyExists) {
      setLevelModalError(`O nivel "${nextLevel}" ja esta cadastrado.`);
      return;
    }

    updateField("levels", [...form.levels, nextLevel]);
    setTouchedFields((current) => ({ ...current, levels: true }));
    setLevelModalError(null);
    setLevelInput("");
    setIsLevelModalOpen(false);
  }

  function openLevelModal() {
    if (disabled) {
      return;
    }
    setLevelModalError(null);
    setIsLevelModalOpen(true);
  }

  function closeLevelModal() {
    setIsLevelModalOpen(false);
    setLevelInput("");
    setLevelModalError(null);
  }

  function removeLevel(level: string) {
    updateField(
      "levels",
      form.levels.filter((item) => item !== level)
    );
    setTouchedFields((current) => ({ ...current, levels: true }));
  }

  return (
    <main className="page-shell cargo-editor-page-shell">
      <form className="cargo-editor-page" onSubmit={(event) => void onSubmit(event)}>
        <header className="cargo-editor-header">
          <div className="cargo-editor-header-main">
            <h1>{pageTitle}</h1>
          </div>

          <div className="cargo-editor-header-meta">
            <p className="cargo-editor-header-subtitle">{pageSubtitle}</p>
          </div>
        </header>

        <section className="cargo-editor-card">
          <section className="cargo-editor-section">
            <h2>01. Informacoes principais</h2>
            <div className="cargo-editor-grid">
              <label
                className={
                  shouldShowFieldError("name")
                    ? "cargo-editor-field cargo-editor-field-full is-invalid"
                    : "cargo-editor-field cargo-editor-field-full"
                }
              >
                <span>Nome do cargo</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  onBlur={() => markFieldAsTouched("name")}
                  placeholder="Ex.: Supervisor de frota"
                  disabled={disabled}
                />
                <small
                  className={
                    shouldShowFieldError("name")
                      ? "cargo-editor-field-feedback"
                      : "cargo-editor-field-feedback is-empty"
                  }
                  aria-hidden={!shouldShowFieldError("name")}
                >
                  {shouldShowFieldError("name") ? fieldErrors.name : "\u00a0"}
                </small>
              </label>

              <div className={shouldShowFieldError("cbo") ? "cargo-editor-field cargo-editor-field-full is-invalid" : "cargo-editor-field cargo-editor-field-full"} style={{ position: 'relative' }}>
                <span>CBO (Busca Dinâmica)</span>
                <input 
                  value={cboQuery}
                  onChange={e => {
                    const nextQuery = e.target.value;
                    setCboQuery(nextQuery);
                    if (form.cbo && nextQuery.trim() !== `${form.cbo.codigo} - ${form.cbo.titulo}`) {
                      updateField("cbo", null);
                    }

                    if (cboSearchDebounceRef.current) {
                      clearTimeout(cboSearchDebounceRef.current);
                      cboSearchDebounceRef.current = null;
                    }

                    if (nextQuery.trim().length < 2) {
                      setCboResults([]);
                      setShowCboResults(false);
                      setHighlightedCboIndex(-1);
                      return;
                    }

                    cboSearchDebounceRef.current = setTimeout(() => {
                      void searchCbo(nextQuery);
                    }, 300);
                  }}
                  onFocus={() => {
                    if (cboBlurTimeoutRef.current) {
                      clearTimeout(cboBlurTimeoutRef.current);
                      cboBlurTimeoutRef.current = null;
                    }
                    if (cboResults.length > 0) {
                      setShowCboResults(true);
                      setHighlightedCboIndex((current) =>
                        current >= 0 && current < cboResults.length ? current : 0
                      );
                    }
                  }}
                  onBlur={() => {
                    markFieldAsTouched("cbo");
                    if (cboBlurTimeoutRef.current) {
                      clearTimeout(cboBlurTimeoutRef.current);
                    }
                    cboBlurTimeoutRef.current = setTimeout(() => {
                      cboBlurTimeoutRef.current = null;
                      closeCboResults();
                    }, 120);
                  }}
                  onKeyDown={handleCboKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-haspopup="listbox"
                  aria-expanded={showCboResults && cboResults.length > 0}
                  aria-controls={cboListboxId}
                  aria-activedescendant={activeCboDescendantId}
                  autoComplete="off"
                  placeholder="Digite o código ou nome da ocupação..." 
                  disabled={disabled}
                />
                {showCboResults && cboResults.length > 0 && (
                  <ul className="cbo-autocomplete-list" id={cboListboxId} role="listbox">
                    {cboResults.map((result, index) => (
                      <li
                        id={getCboOptionId(result)}
                        key={result.codigo}
                        role="option"
                        aria-selected={index === highlightedCboIndex}
                        className={index === highlightedCboIndex ? "is-active" : undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectCbo(result)}
                      >
                        <strong>{result.codigo}</strong> — {result.titulo}
                      </li>
                    ))}
                  </ul>
                )}
                <small
                  className={
                    shouldShowFieldError("cbo")
                      ? "cargo-editor-field-feedback"
                      : "cargo-editor-field-feedback"
                  }
                >
                  {shouldShowFieldError("cbo") ? fieldErrors.cbo : (
                    <span style={{ color: '#666' }}>
                      Fundamental para a correta exportação de eventos ao eSocial.
                    </span>
                  )}
                </small>
              </div>

              <label
                className={
                  shouldShowFieldError("department")
                    ? "cargo-editor-field is-invalid"
                    : "cargo-editor-field"
                }
              >
                <span>Departamento</span>
                <select
                  className="select"
                  value={form.department}
                  onChange={(event) => updateField("department", event.target.value)}
                  onBlur={() => markFieldAsTouched("department")}
                  disabled={disabled}
                >
                  <option value="">Selecione</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <small
                  className={
                    shouldShowFieldError("department")
                      ? "cargo-editor-field-feedback"
                      : "cargo-editor-field-feedback is-empty"
                  }
                  aria-hidden={!shouldShowFieldError("department")}
                >
                  {shouldShowFieldError("department") ? fieldErrors.department : "\u00a0"}
                </small>
              </label>

              <label
                className={
                  shouldShowFieldError("level")
                    ? "cargo-editor-field is-invalid"
                    : "cargo-editor-field"
                }
              >
                <span>Categoria do cargo</span>
                <select
                  className="select"
                  value={form.level}
                  onChange={(event) => updateField("level", event.target.value)}
                  onBlur={() => markFieldAsTouched("level")}
                  disabled={disabled}
                >
                  {levelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small
                  className={
                    shouldShowFieldError("level")
                      ? "cargo-editor-field-feedback"
                      : "cargo-editor-field-feedback is-empty"
                  }
                  aria-hidden={!shouldShowFieldError("level")}
                >
                  {shouldShowFieldError("level") ? fieldErrors.level : "\u00a0"}
                </small>
              </label>

              <label
                className={
                  shouldShowFieldError("levels")
                    ? "cargo-editor-field cargo-editor-field-full is-invalid"
                    : "cargo-editor-field cargo-editor-field-full"
                }
              >
                <span>Niveis para selecao no perfil de trabalho</span>
                <div className="cargo-editor-levels-panel">
                  <div className="cargo-editor-levels-head">
                    <div className="cargo-editor-levels-copy">
                      <strong>Lista de niveis</strong>
                      <span>
                        Esses niveis serao exibidos no perfil de trabalho para selecao de senioridade.
                      </span>
                    </div>
                    <span className="cargo-editor-levels-count">
                      {form.levels.length} {form.levels.length === 1 ? "nivel" : "niveis"}
                    </span>
                  </div>

                  <div className="cargo-editor-levels-toolbar">
                    <p className="cargo-editor-levels-helper">
                      Use niveis simples e objetivos, como Junior, Pleno e Senior.
                    </p>
                    <button
                      type="button"
                      className="button-link secondary-link cargo-editor-levels-add"
                      onClick={openLevelModal}
                      disabled={disabled}
                    >
                      + Novo nivel
                    </button>
                  </div>

                  {form.levels.length > 0 ? (
                    <div className="cargo-editor-levels-list" aria-label="Niveis cadastrados">
                      {form.levels.map((item, index) => (
                        <div key={item} className="cargo-editor-level-row">
                          <div className="cargo-editor-level-row-main">
                            <span className="cargo-editor-level-row-index">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <strong>{item}</strong>
                          </div>
                          <small>Disponivel no perfil de trabalho</small>
                          <button
                            type="button"
                            className="button-link secondary-link cargo-editor-level-row-remove"
                            onClick={() => removeLevel(item)}
                            disabled={disabled}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="cargo-editor-levels-empty">
                      Nenhum nivel cadastrado. Clique em "Novo nivel" para adicionar.
                    </p>
                  )}
                </div>
                <small
                  className={
                    shouldShowFieldError("levels")
                      ? "cargo-editor-field-feedback"
                      : "cargo-editor-field-feedback is-empty"
                  }
                  aria-hidden={!shouldShowFieldError("levels")}
                >
                  {shouldShowFieldError("levels") ? fieldErrors.levels : "\u00a0"}
                </small>
              </label>
            </div>
          </section>

          <section className="cargo-editor-section">
            <h2>02. Classificação e Riscos</h2>
            <div className="cargo-editor-grid">
              <label className="cargo-editor-field">
                <span>Adicional de Insalubridade</span>
                <select 
                  className="select"
                  value={form.unhealthyAllowance}
                  onChange={(event) =>
                    updateField(
                      "unhealthyAllowance",
                      event.target.value as CargoForm["unhealthyAllowance"]
                    )
                  }
                  disabled={disabled}
                >
                  <option value="NONE">Não se aplica</option>
                  <option value="10">Mínimo (10%)</option>
                  <option value="20">Médio (20%)</option>
                  <option value="40">Máximo (40%)</option>
                </select>
              </label>

              <label className="cargo-editor-field">
                <span>Adicional de Periculosidade</span>
                <select 
                  className="select"
                  value={form.hazardousAllowance}
                  onChange={(event) =>
                    updateField(
                      "hazardousAllowance",
                      event.target.value as CargoForm["hazardousAllowance"]
                    )
                  }
                  disabled={disabled}
                >
                  <option value="NONE">Não se aplica</option>
                  <option value="30">Sim (30%)</option>
                </select>
              </label>
            </div>
            
            {(form.unhealthyAllowance !== "NONE" && form.hazardousAllowance !== "NONE") && (
              <div className="driver-editor-address-required-hint is-warning" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong>Atenção Legal:</strong>
                <span>Por lei, os adicionais de insalubridade e periculosidade geralmente não são acumulativos.</span>
              </div>
            )}
          </section>

          <section className="cargo-editor-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2>03. Descrição e Atividades</h2>
              <button 
                type="button" 
                className="button-link secondary-link" 
                style={{ fontSize: '13px' }}
                onClick={suggestDescription}
                disabled={disabled || !form.cbo}
              >
                Sugerir via CBO
              </button>
            </div>
            <label className="cargo-editor-field cargo-editor-field-full">
              <span>Sumário de atividades</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Descreva responsabilidades e contexto de uso deste cargo."
                disabled={disabled}
              />
            </label>
          </section>

          {blockingStatusMessage ? (
            <p className="cargo-editor-alert" role="alert">
              {blockingStatusMessage}
            </p>
          ) : null}

          {showErrors ? (
            <div className="cargo-editor-error-list" role="alert">
              <strong>Revise os campos obrigatorios.</strong>
              <ul>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <footer className="cargo-editor-footer">
            <Link href="/administrative/cargo" className="button-link secondary-link">
              Cancelar
            </Link>
            <button type="submit" disabled={!canSave}>
              {primaryActionLabel}
            </button>
          </footer>
        </section>
      </form>

      <DriverProfileEditorModal
        open={isLevelModalOpen}
        title="Adicionar nivel"
        description="Esse nivel aparecera no perfil de trabalho para classificacao de senioridade."
        onClose={closeLevelModal}
        dialogWidth="min(520px, calc(100vw - 24px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={closeLevelModal}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={addLevel}
              disabled={disabled || levelInput.trim().length === 0}
            >
              Adicionar nivel
            </button>
          </>
        }
      >
        <label className="driver-editor-modal-field-full">
          Nome do nivel
          <input
            value={levelInput}
            onChange={(event) => {
              setLevelInput(event.target.value);
              if (levelModalError) {
                setLevelModalError(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLevel();
              }
            }}
            placeholder="Ex.: Junior"
            autoFocus
            disabled={disabled}
          />
        </label>

        {levelModalError ? (
          <p className="cargo-editor-alert" role="alert">
            {levelModalError}
          </p>
        ) : (
          <p className="cargo-editor-levels-modal-hint">
            Dica: prefira nomes claros como Junior, Pleno e Senior.
          </p>
        )}
      </DriverProfileEditorModal>
    </main>
  );
}


