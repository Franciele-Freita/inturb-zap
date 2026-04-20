"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CargoCatalogItem,
  getCargoCatalogItemById,
  listCargoDepartmentOptions,
  loadCargoCatalogItems,
  normalizeCargoLevel,
  normalizeCargoSeniorityLevels,
  saveCargoCatalogItems,
  sortCargoCatalogByName
} from "../lib/cargo-catalog";

type Mode = "create" | "edit";

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
};

type CargoFormField = "name" | "department" | "level" | "levels";

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
  levels: normalizeCargoSeniorityLevels([]),
  isActive: true
};

const initialTouchedFields: Record<CargoFormField, boolean> = {
  name: false,
  department: false,
  level: false,
  levels: false
};

export function CargoEditorPage({ mode, cargoId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CargoForm>(initialForm);
  const [levelInput, setLevelInput] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
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

    const cargo = getCargoCatalogItemById(cargoId);
    if (!cargo) {
      setBlockingStatusMessage("Cargo nao encontrado.");
      setIsLoading(false);
      return;
    }

    setForm({
      name: cargo.name,
      description: cargo.description ?? "",
      department: cargo.department,
      level: normalizeCargoLevel(cargo.level),
      levels: normalizeCargoSeniorityLevels(cargo.levels, cargo.level),
      isActive: cargo.isActive
    });
    setIsLoading(false);
  }, [mode, cargoId]);

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

    return errors;
  }, [form.department, form.level, form.levels, form.name]);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setTouchedFields({
      name: true,
      department: true,
      level: true,
      levels: true
    });

    if (!canSave) {
      return;
    }

    setIsSaving(true);

    const allItems = loadCargoCatalogItems();
    const normalizedName = form.name.trim();
    const normalizedDescription = form.description.trim();
    const normalizedDepartment = form.department.trim();
    const normalizedLevel = normalizeCargoLevel(form.level);
    const normalizedLevels = normalizeCargoSeniorityLevels(form.levels, form.level);

    const duplicated = allItems.find(
      (item) =>
        item.id !== cargoId &&
        item.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
        item.department.trim().toLowerCase() === normalizedDepartment.toLowerCase()
    );

    if (duplicated) {
      const conflictMessage = `Ja existe cargo "${normalizedName}" no departamento "${normalizedDepartment}".`;
      setBlockingStatusMessage(conflictMessage);
      setIsSaving(false);
      return;
    }

    const now = new Date().toISOString();

    if (mode === "edit" && cargoId) {
      const updated = allItems.map((item) =>
        item.id === cargoId
          ? {
              ...item,
              name: normalizedName,
              description: normalizedDescription || undefined,
              department: normalizedDepartment,
              level: normalizedLevel,
              levels: normalizedLevels,
              isActive: form.isActive,
              updatedAt: now
            }
          : item
      );
      saveCargoCatalogItems(sortCargoCatalogByName(updated));
    } else {
      const created: CargoCatalogItem = {
        id: `cargo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: normalizedName,
        description: normalizedDescription || undefined,
        department: normalizedDepartment,
        level: normalizedLevel,
        levels: normalizedLevels,
        isActive: form.isActive,
        createdAt: now,
        updatedAt: now
      };
      saveCargoCatalogItems(sortCargoCatalogByName([...allItems, created]));
    }

    router.push("/administrative/cargo");
    router.refresh();
  }

  function addLevel() {
    const rawLevel = levelInput.trim();
    if (rawLevel.length === 0) {
      return;
    }

    const normalized = normalizeCargoSeniorityLevels([rawLevel]);
    const nextLevel = normalized[0];
    if (!nextLevel) {
      return;
    }

    const alreadyExists = form.levels.some(
      (item) => item.trim().toLowerCase() === nextLevel.toLowerCase()
    );
    if (alreadyExists) {
      setLevelInput("");
      return;
    }

    updateField("levels", [...form.levels, nextLevel]);
    setTouchedFields((current) => ({ ...current, levels: true }));
    setLevelInput("");
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
            <h2>Informacoes principais</h2>
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
                <div className="driver-editor-contract-inline-note">
                  <strong>Lista de niveis</strong>
                  <span>
                    Use os niveis desejados para este cargo, como Junior, Pleno e Senior.
                  </span>
                </div>
                <div className="form-grid">
                  <input
                    value={levelInput}
                    onChange={(event) => setLevelInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addLevel();
                      }
                    }}
                    placeholder="Ex.: Junior"
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="button-link secondary-link"
                    onClick={addLevel}
                    disabled={disabled || levelInput.trim().length === 0}
                  >
                    Adicionar nivel
                  </button>
                </div>
                {form.levels.length > 0 ? (
                  <div className="driver-editor-contract-inline-note">
                    <strong>Niveis cadastrados</strong>
                    <span>{form.levels.join(" | ")}</span>
                    <div className="driver-editor-inline-actions">
                      {form.levels.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="button-link secondary-link"
                          onClick={() => removeLevel(item)}
                          disabled={disabled}
                        >
                          Remover {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
            <h2>Configuracao</h2>
            <label className="cargo-editor-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                disabled={disabled}
              />
              <span>Status ativo</span>
            </label>
          </section>

          <section className="cargo-editor-section">
            <h2>Descricao</h2>
            <label className="cargo-editor-field cargo-editor-field-full">
              <span>Descricao do cargo</span>
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
    </main>
  );
}
