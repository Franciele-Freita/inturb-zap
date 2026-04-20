"use client";

import Link from "next/link";
import { DriverProfile } from "../lib/api";

export type DriverEditorSection =
  | "basic"
  | "contact"
  | "compliance"
  | "accessibility"
  | "contract"
  | "contracts";

type SidebarStatusCheck = {
  label: string;
  complete: boolean;
};

type DriverProfileEditorHeroProps = {
  mode: "create" | "edit";
  initialDriverName?: string;
  photoUrl?: string;
  cnhCategoryLabel: string;
  ageLabel: string;
  contractPhaseLabel: string;
  employmentTenureLabel: string;
  employmentSinceLabel: string;
};

type DriverProfileEditorStepNavProps = {
  activeSection: DriverEditorSection;
  onSectionChange: (section: DriverEditorSection) => void;
};

type DriverProfileEditorSidebarProps = {
  name: string;
  email: string;
  driverTypeLabel: string;
  operationalStatusLabel: string;
  operationEligible: boolean;
  operationBlockingIssues: string[];
  sidebarCompensationModeLabel: string;
  effectiveCompensationLabel: string;
  sidebarVehicleLabel: string;
  sidebarVehicleLine: string;
  sidebarStatusChecks: SidebarStatusCheck[];
  initialDriver?: DriverProfile;
  canSubmit: boolean;
  isSavingDriver: boolean;
  mode: "create" | "edit";
};

export function DriverProfileEditorHero({
  mode,
  initialDriverName,
  photoUrl,
  cnhCategoryLabel,
  ageLabel,
  contractPhaseLabel,
  employmentTenureLabel,
  employmentSinceLabel
}: DriverProfileEditorHeroProps) {
  const displayName = mode === "create" ? "Cadastro de motorista" : initialDriverName ?? "Cadastro do motorista";
  const nameInitial = (initialDriverName ?? "M").slice(0, 1).toUpperCase();

  return (
    <>
      <div className="driver-editor-hero-top">
        <div className="driver-editor-hero-copy">
          <div className="driver-editor-hero-profile">
            <div className="driver-editor-hero-avatar" aria-hidden="true">
              {photoUrl ? <img src={photoUrl} alt="" /> : <span>{nameInitial}</span>}
            </div>
            <div className="driver-editor-hero-profile-copy">
              <h1>{displayName}</h1>
            </div>
          </div>
          <div className="driver-editor-hero-identity-line">
            <span className="driver-editor-hero-identity-pill">{cnhCategoryLabel}</span>
            <span className="driver-editor-hero-identity-pill">{ageLabel}</span>
          </div>
          <div className="driver-editor-hero-meta">
            <article className="driver-editor-hero-meta-item">
              <span>Fase Atual</span>
              <strong>{contractPhaseLabel}</strong>
            </article>
            <article className="driver-editor-hero-meta-item">
              <span>Tempo na Empresa</span>
              <strong>{employmentTenureLabel}</strong>
              <small>{employmentSinceLabel}</small>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

export function DriverProfileEditorStepNav({
  activeSection,
  onSectionChange
}: DriverProfileEditorStepNavProps) {
  const steps: Array<{ key: DriverEditorSection; index: string; title: string; description: string }> = [
    { key: "basic", index: "01", title: "Dados basicos", description: "Identificacao e acesso" },
    { key: "compliance", index: "02", title: "CNH e conformidade", description: "CNH, toxicologico e psicotecnico" },
    { key: "contact", index: "03", title: "Contato e emergencia", description: "Contato principal e sinistro" },
    { key: "accessibility", index: "04", title: "Acessibilidade", description: "Condicoes especiais" },
    { key: "contract", index: "05", title: "Contrato de trabalho", description: "Vinculo, jornada e pagamento" },
    { key: "contracts", index: "06", title: "Contratos", description: "Geracao, assinatura e historico" }
  ];
  const activeIndex = Math.max(
    steps.findIndex((step) => step.key === activeSection),
    0
  );
  const progress = Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <section className="driver-editor-stepbar" aria-label="Etapas do cadastro">
      <div className="driver-editor-stepbar-progress">
        <div className="driver-editor-stepbar-progress-head">
          <span>Progresso</span>
          <strong>{progress}%</strong>
        </div>
        <div className="driver-editor-stepbar-progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="driver-editor-stepnav">
        {steps.map((step, index) => {
          const isActive = activeSection === step.key;
          const isCompleted = index < activeIndex;

          return (
            <button
              key={step.key}
              type="button"
              className={[
                "driver-editor-stepchip",
                isActive ? "is-active" : "",
                isCompleted ? "is-complete" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSectionChange(step.key)}
            >
              <span>{step.index}</span>
              <div className="driver-editor-stepcopy">
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DriverProfileEditorSidebar({
  name,
  email,
  driverTypeLabel,
  operationalStatusLabel,
  operationEligible,
  operationBlockingIssues,
  sidebarCompensationModeLabel,
  effectiveCompensationLabel,
  sidebarVehicleLabel,
  sidebarVehicleLine,
  sidebarStatusChecks,
  initialDriver,
  canSubmit,
  isSavingDriver,
  mode
}: DriverProfileEditorSidebarProps) {
  return (
    <aside className="driver-editor-sidebar">
      <div className="driver-editor-sidebar-card">
        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Resumo</span>
          <div className="driver-editor-sidebar-summary driver-editor-sidebar-hero">
            <strong className="driver-editor-sidebar-summary-name">{name.trim() || "Novo motorista"}</strong>
            <span className="driver-editor-sidebar-summary-meta">{email.trim() || "E-mail pendente"}</span>
            <div className="driver-editor-sidebar-chiprow">
              <span className={operationEligible ? "driver-editor-sidebar-chip is-ready" : "driver-editor-sidebar-chip"}>
                {operationEligible ? "Apto para operar" : "Com bloqueio"}
              </span>
              <span className="driver-editor-sidebar-chip">{operationalStatusLabel}</span>
            </div>
            <div className="driver-editor-sidebar-keylist">
              <div className="driver-editor-sidebar-keyrow">
                <span>Remuneracao</span>
                <strong>{sidebarCompensationModeLabel}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Situacao</span>
          <div className="driver-editor-sidebar-status-list">
            {sidebarStatusChecks.map((item) => (
              <div key={item.label} className={item.complete ? "driver-editor-sidebar-status-item is-ready" : "driver-editor-sidebar-status-item"}>
                <span className="driver-editor-sidebar-status-mark" aria-hidden="true">
                  {item.complete ? "OK" : "!"}
                </span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Operacao</span>
          <div className="driver-editor-sidebar-facts driver-editor-sidebar-metrics">
            <div className="driver-editor-sidebar-fact">
              <span>Corridas ativas</span>
              <strong>{initialDriver?.operationSummary.activeAssignedRides ?? 0}</strong>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>Concluidas</span>
              <strong>{initialDriver?.operationSummary.completedRides ?? 0}</strong>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>Ocorrencias</span>
              <strong>
                {(initialDriver?.operationSummary.noShowRides ?? 0) +
                  (initialDriver?.operationSummary.emergencyCancellations ?? 0)}
              </strong>
              <small>
                {`${initialDriver?.operationSummary.noShowRides ?? 0} no-show | ${initialDriver?.operationSummary.emergencyCancellations ?? 0} cancelamento(s) emergencial(is)`}
              </small>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>Alertas abertos</span>
              <strong>{initialDriver?.operationSummary.openExecutionAlerts ?? 0}</strong>
              <small>
                {initialDriver?.operationSummary.lastRideAt
                  ? `Ultima corrida em ${new Date(initialDriver.operationSummary.lastRideAt).toLocaleString("pt-BR")}`
                  : "Sem corridas registradas ainda"}
              </small>
            </div>
          </div>
        </div>

        {operationBlockingIssues.length > 0 ? (
          <div className="driver-editor-sidebar-section">
            <span className="driver-editor-sidebar-section-title">Bloqueios</span>
            <div className="driver-editor-sidebar-status-list">
              {operationBlockingIssues.map((issue) => (
                <div key={issue} className="driver-editor-sidebar-status-item">
                  <span className="driver-editor-sidebar-status-mark" aria-hidden="true">
                    !
                  </span>
                  <strong>{issue}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Acoes</span>
          <div className="driver-editor-sidebar-actions">
            <button type="submit" disabled={!canSubmit}>
              {isSavingDriver ? "Salvando..." : mode === "create" ? "Salvar motorista" : "Salvar alteracoes"}
            </button>
            <Link href="/drivers" className="button-link secondary-link">
              Voltar para lista
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
