"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { TripType, formatCurrency, request } from "../lib/api";

type TripTypeFormState = {
  name: string;
  description: string;
  surchargeAmount: string;
  isActive: boolean;
};

type TripTypeEditorProps = {
  mode: "create" | "edit";
  initialTripType?: TripType;
};

function toTripTypeFormState(tripType?: TripType): TripTypeFormState {
  return {
    name: tripType?.name ?? "",
    description: tripType?.description ?? "",
    surchargeAmount: String(tripType?.surchargeAmount ?? 0),
    isActive: tripType?.isActive ?? true
  };
}

export function TripTypeEditor({ mode, initialTripType }: TripTypeEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<TripTypeFormState>(() => toTripTypeFormState(initialTripType));
  const [statusMessage, setStatusMessage] = useState(
    mode === "create"
      ? "Cadastre um tipo de viagem e defina se ele deve entrar disponivel para o app."
      : "Atualize o cadastro do tipo e mantenha a operacao organizada."
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const surchargePreview = useMemo(() => Number(form.surchargeAmount || 0), [form.surchargeAmount]);
  const isDefault = initialTripType?.isDefault ?? false;
  const canDelete = mode === "edit" && initialTripType && !initialTripType.isDefault;

  function updateField<Key extends keyof TripTypeFormState>(field: Key, value: TripTypeFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(mode === "create" ? "Salvando novo tipo de viagem..." : "Salvando alteracoes...");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        surchargeAmount: isDefault ? 0 : Number(form.surchargeAmount || 0),
        isActive: isDefault ? true : form.isActive
      };

      const tripType =
        mode === "create"
          ? await request<TripType>("/admin/trip-types", {
              method: "POST",
              body: JSON.stringify(payload)
            })
          : await request<TripType>(`/admin/trip-types/${initialTripType?.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload)
            });

      setForm(toTripTypeFormState(tripType));
      setStatusMessage(
        mode === "create"
          ? `Tipo ${tripType.name} criado com sucesso.`
          : `Tipo ${tripType.name} atualizado com sucesso.`
      );

      if (mode === "create") {
        router.push(`/trip-types/${tripType.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar tipo de viagem.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialTripType) {
      return;
    }

    const confirmed = window.confirm(`Excluir o tipo de viagem "${initialTripType.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage(`Excluindo ${initialTripType.name}...`);

    try {
      await request<void>(`/admin/trip-types/${initialTripType.id}`, {
        method: "DELETE"
      });
      router.push("/trip-types");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao excluir tipo de viagem.");
      setIsDeleting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Tipos de viagem</p>
          <h1>{mode === "create" ? "Novo tipo de viagem" : form.name || "Editar tipo de viagem"}</h1>
          <p className="helper-text">
            {mode === "create"
              ? "Crie categorias operacionais como pet, mala e mercado em uma pagina propria, sem poluir a listagem."
              : "Ajuste nome, descricao, acrescimo e disponibilidade do tipo selecionado."}
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">Resumo</span>
          <strong>{statusMessage}</strong>
          <div className="chips">
            <span className="chip">{isDefault ? "Tipo padrao" : "Tipo configuravel"}</span>
            <span className="chip chip-soft">{formatCurrency(surchargePreview)} de acrescimo</span>
            {mode === "edit" && initialTripType ? (
              <span className="chip chip-soft">{initialTripType.isActive ? "Ativo" : "Inativo"}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>{mode === "create" ? "Cadastro principal" : "Manutencao do tipo"}</h2>
            <span>
              {mode === "create"
                ? "Defina como o passageiro vai enxergar este tipo de viagem."
                : `Slug interno: ${initialTripType?.slug ?? "-"}`}
            </span>
          </div>

          <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid">
              <label>
                Nome do tipo
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Ex.: Viagem com pet"
                />
              </label>

              <label>
                Acrescimo no valor
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={isDefault ? "0" : form.surchargeAmount}
                  disabled={isDefault}
                  onChange={(event) => updateField("surchargeAmount", event.target.value)}
                  placeholder="0,00"
                />
              </label>
            </div>

            <label>
              Descricao
              <input
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Explique quando esse tipo deve ser usado pelo passageiro."
              />
            </label>

            <label className="toggle-field">
              <span>{isDefault ? "Tipo padrao sempre ativo" : "Disponivel para o app"}</span>
              <input
                type="checkbox"
                checked={isDefault ? true : form.isActive}
                disabled={isDefault}
                onChange={(event) => updateField("isActive", event.target.checked)}
              />
            </label>

            <div className="toolbar">
              <button type="submit" disabled={isSaving || !form.name.trim()}>
                {isSaving ? "Salvando..." : mode === "create" ? "Salvar tipo" : "Salvar alteracoes"}
              </button>

              <Link href="/trip-types" className="button-link secondary-link">
                Voltar para lista
              </Link>

              {canDelete ? (
                <button
                  type="button"
                  className="danger"
                  disabled={isDeleting}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? "Excluindo..." : "Excluir tipo"}
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
