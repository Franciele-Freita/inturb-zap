"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PricingConfig, formatCurrency, formatDateTime, request } from "../lib/api";

type PricingForm = {
  currency: string;
  baseFare: string;
  distanceRatePerKm: string;
  timeRatePerMinute: string;
};

function toPricingForm(config: PricingConfig): PricingForm {
  return {
    currency: config.currency,
    baseFare: String(config.baseFare),
    distanceRatePerKm: String(config.distanceRatePerKm),
    timeRatePerMinute: String(config.timeRatePerMinute)
  };
}

export function PricingConfigEditor() {
  const router = useRouter();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [form, setForm] = useState<PricingForm>({
    currency: "BRL",
    baseFare: "6",
    distanceRatePerKm: "2.1",
    timeRatePerMinute: "0.35"
  });
  const [statusMessage, setStatusMessage] = useState("Carregando a tarifa base da operacao.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void request<PricingConfig>("/admin/pricing")
      .then((data) => {
        setConfig(data);
        setForm(toPricingForm(data));
        setStatusMessage(`Configuracao carregada. Ultima atualizacao em ${formatDateTime(data.updatedAt)}.`);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("Salvando tarifa base...");

    try {
      const data = await request<PricingConfig>("/admin/pricing", {
        method: "PATCH",
        body: JSON.stringify({
          currency: form.currency.trim().toUpperCase(),
          baseFare: Number(form.baseFare || 0),
          distanceRatePerKm: Number(form.distanceRatePerKm || 0),
          timeRatePerMinute: Number(form.timeRatePerMinute || 0)
        })
      });

      setConfig(data);
      setForm(toPricingForm(data));
      setStatusMessage(`Precificacao base atualizada em ${formatDateTime(data.updatedAt)}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar a precificacao.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Precificacao</p>
          <h1>Editar tarifa base</h1>
          <p className="helper-text">
            Ajuste a base da operacao. As regras tarifarias por horario ou por data continuam separadas.
          </p>
        </div>

        <div className="status-card">
          <span className="status-label">Resumo</span>
          <strong>{statusMessage}</strong>
          <div className="chips">
            <span className="chip chip-soft">Base {formatCurrency(config?.baseFare)}</span>
            <span className="chip chip-soft">Km {formatCurrency(config?.distanceRatePerKm)}</span>
            <span className="chip chip-soft">Min {formatCurrency(config?.timeRatePerMinute)}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Valores ativos</h2>
            <span>Essa base entra em toda cotacao antes do acrescimo por tipo de viagem e das regras tarifarias.</span>
          </div>

          <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid pricing-config-grid">
              <label>
                Moeda
                <input
                  maxLength={5}
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                  placeholder="BRL"
                />
              </label>

              <label>
                Tarifa base
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseFare}
                  onChange={(event) => setForm((current) => ({ ...current, baseFare: event.target.value }))}
                />
              </label>

              <label>
                Valor por km
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.distanceRatePerKm}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, distanceRatePerKm: event.target.value }))
                  }
                />
              </label>

              <label>
                Valor por minuto
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.timeRatePerMinute}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, timeRatePerMinute: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="toolbar">
              <button
                type="submit"
                disabled={
                  isSaving ||
                  !form.currency.trim() ||
                  Number(form.baseFare) < 0 ||
                  Number(form.distanceRatePerKm) < 0 ||
                  Number(form.timeRatePerMinute) < 0
                }
              >
                {isSaving ? "Salvando..." : "Salvar tarifa base"}
              </button>

              <Link href="/pricing" className="button-link secondary-link">
                Voltar para regras
              </Link>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
