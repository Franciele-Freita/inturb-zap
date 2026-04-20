"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PricingConfig, PricingRule, formatCurrency, formatDateTime, request } from "../../lib/api";
import { useIsMobileLayout } from "../../lib/use-mobile-layout";
import { FilterIcon, OpenIcon, SearchIcon } from "../../components/icons/common-icons";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatTime(minutes?: number): string {
  if (minutes === undefined) {
    return "-";
  }

  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatRuleScope(rule: PricingRule): string {
  if (rule.scheduleType === "WEEKLY_WINDOW") {
    const days = (rule.daysOfWeek ?? "")
      .split(",")
      .filter(Boolean)
      .map((day) => weekdayLabels[Number(day)])
      .filter(Boolean);

    const daysLabel = days.length === 7 ? "Todos os dias" : days.join(", ") || "Dias nao definidos";

    return `${daysLabel} • ${formatTime(rule.startMinutes)} às ${formatTime(rule.endMinutes)}`;
  }

  const formatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
  const start = rule.startDate ? formatter.format(new Date(rule.startDate)) : "-";
  const end = rule.endDate ? formatter.format(new Date(rule.endDate)) : "-";
  return start === end ? start : `${start} a ${end}`;
}

function formatAdjustment(rule: PricingRule): string {
  if (rule.adjustmentType === "PERCENT") {
    return `+${rule.adjustmentValue}%`;
  }

  return `+${formatCurrency(rule.adjustmentValue)}`;
}

export default function PricingPage() {
  const isMobileLayout = useIsMobileLayout();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [statusMessage, setStatusMessage] = useState("Carregando a configuracao de precificacao.");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "WEEKLY_WINDOW" | "DATE_RANGE">("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void Promise.allSettled([
      request<PricingConfig>("/admin/pricing"),
      request<PricingRule[]>("/admin/pricing-rules")
    ]).then(([configResult, rulesResult]) => {
      if (configResult.status === "fulfilled") {
        setConfig(configResult.value);
      }

      if (rulesResult.status === "fulfilled") {
        setRules(rulesResult.value);
      }

      const messages: string[] = [];
      const resolvedRules = rulesResult.status === "fulfilled" ? rulesResult.value : [];
      const resolvedConfig = configResult.status === "fulfilled" ? configResult.value : null;

      if (resolvedConfig) {
        messages.push(
          `${resolvedRules.length} regra(s) carregada(s). Base atualizada em ${formatDateTime(resolvedConfig.updatedAt)}.`
        );
      }

      if (configResult.status === "rejected" && rulesResult.status === "rejected") {
        messages.push("Nao foi possivel carregar a precificacao.");
      }

      setStatusMessage(messages.join(" ") || "Painel de precificacao carregado.");
    });
  }, []);

  const filteredRules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [rule.name, rule.description ?? "", formatRuleScope(rule)].join(" ").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && rule.isActive) ||
        (statusFilter === "INACTIVE" && !rule.isActive);

      const matchesType = typeFilter === "ALL" || rule.scheduleType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rules, searchTerm, statusFilter, typeFilter]);

  const activeRules = useMemo(() => rules.filter((rule) => rule.isActive).length, [rules]);
  const weeklyRules = useMemo(() => rules.filter((rule) => rule.scheduleType === "WEEKLY_WINDOW").length, [rules]);
  const dateRules = useMemo(() => rules.filter((rule) => rule.scheduleType === "DATE_RANGE").length, [rules]);
  const hasActiveFilters = statusFilter !== "ALL" || typeFilter !== "ALL";

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">{statusMessage}</p>
        <div className="drivers-page-head-actions">
          <Link href="/pricing/base" className="button-link secondary-link">
            Editar tarifa base
          </Link>
          <Link href="/pricing/new" className="button-link">
            + Nova regra
          </Link>
        </div>
      </section>

      <section className="drivers-overview-strip pricing-overview-strip">
        <article className="drivers-overview-item">
          <span>Tarifa base</span>
          <strong>{formatCurrency(config?.baseFare)}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Por km</span>
          <strong>{formatCurrency(config?.distanceRatePerKm)}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Por minuto</span>
          <strong>{formatCurrency(config?.timeRatePerMinute)}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Regras ativas</span>
          <strong>{activeRules}</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Regras tarifarias</h2>
              <span>
                {filteredRules.length} regra(s) visiveis. {weeklyRules} semanal(is) e {dateRules} por data.
              </span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by date, name or id..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <button
                type="button"
                className={
                  hasActiveFilters || filtersOpen
                    ? "drivers-filter-toggle admin-header-icon-button is-active"
                    : "drivers-filter-toggle admin-header-icon-button"
                }
                onClick={() => setFiltersOpen((current) => !current)}
                aria-label="Abrir filtros"
                aria-expanded={filtersOpen}
              >
                <FilterIcon />
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="drivers-table-filters">
              <div className="filter-field">
                <span>Status</span>
                <select
                  className="select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativas</option>
                  <option value="INACTIVE">Inativas</option>
                </select>
              </div>

              <div className="filter-field">
                <span>Tipo</span>
                <select
                  className="select"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as "ALL" | "WEEKLY_WINDOW" | "DATE_RANGE")
                  }
                >
                  <option value="ALL">Todos</option>
                  <option value="WEEKLY_WINDOW">Janela semanal</option>
                  <option value="DATE_RANGE">Periodo por data</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="drivers-table-wrap">
            {!isMobileLayout ? (
              <table className="drivers-table pricing-table">
              <thead>
                <tr>
                  <th>Regra</th>
                  <th>Aplicacao</th>
                  <th>Ajuste</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{rule.name}</strong>
                        <span>{rule.description || "Sem descricao operacional"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{formatRuleScope(rule)}</strong>
                        <span>{rule.scheduleType === "WEEKLY_WINDOW" ? "Janela semanal" : "Periodo especial"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{formatAdjustment(rule)}</strong>
                        <span>Prioridade {rule.priority}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-status-stack">
                        <span className={rule.isActive ? "status-pill status-pill-success" : "status-pill"}>
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </span>
                        <span className="table-status-meta">Atualizada em {formatDateTime(rule.updatedAt)}</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/pricing/${rule.id}`}
                        className="table-inline-link table-inline-icon-link"
                        aria-label={`Abrir regra ${rule.name}`}
                        title="Abrir regra"
                      >
                        <OpenIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            ) : null}

            {isMobileLayout ? (
              <div className="drivers-mobile-list">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="list-card driver-card">
                    <div className="driver-card-top">
                      <div className="table-contact-cell">
                        <strong>{rule.name}</strong>
                        <span>{rule.description || "Sem descricao operacional"}</span>
                      </div>
                      <Link
                        href={`/pricing/${rule.id}`}
                        className="table-inline-link table-inline-icon-link"
                        aria-label={`Abrir regra ${rule.name}`}
                        title="Abrir regra"
                      >
                        <OpenIcon />
                      </Link>
                    </div>

                    <div className="driver-card-grid">
                      <div className="driver-info-block">
                        <span className="info-label">Aplicacao</span>
                        <strong>{formatRuleScope(rule)}</strong>
                        <span>{rule.scheduleType === "WEEKLY_WINDOW" ? "Janela semanal" : "Periodo especial"}</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Ajuste</span>
                        <strong>{formatAdjustment(rule)}</strong>
                        <span>Prioridade {rule.priority}</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Status</span>
                        <strong>{rule.isActive ? "Ativa" : "Inativa"}</strong>
                        <span>Atualizada em {formatDateTime(rule.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {filteredRules.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma regra tarifaria encontrada.</strong>
                <p>Cadastre regras para horario de pico, dias uteis ou datas especiais como Natal e feriados.</p>
                <Link href="/pricing/new" className="button-link">
                  Cadastrar regra
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
