"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type FleetVehicleEditorSection = "profile" | "operations" | "maintenance" | "history";

type FleetVehicleStatusCheck = {
  label: string;
  complete: boolean;
};

type FleetVehicleEditorHeroProps = {
  mode: "create" | "edit";
  vehicleId?: string;
  vehicleName: string;
  statusMessage: string;
  spotlightTitle: string;
  spotlightDescription: string;
  operationalStatusLabel: string;
  currentOdometerLabel: string;
  currentAssignmentLabel: string;
};

type FleetVehicleEditorStepNavProps = {
  activeSection: FleetVehicleEditorSection;
  onSectionChange: (section: FleetVehicleEditorSection) => void;
};

type FleetVehicleEditorSidebarProps = {
  vehicleName: string;
  plate: string;
  operationalStatusLabel: string;
  readinessLabel: string;
  readinessReady: boolean;
  currentAssignmentLabel: string;
  currentOdometerLabel: string;
  checkinCode: string;
  statusChecks: FleetVehicleStatusCheck[];
  openTasksCount: number;
  alertsCount: number;
  timelineCount: number;
  odometerLogCount: number;
  canSubmit: boolean;
  isSaving: boolean;
  mode: "create" | "edit";
  submitFormId: string;
};

type FleetVehicleEditorSectionCardProps = {
  id: string;
  index: string;
  section: FleetVehicleEditorSection;
  activeSection: FleetVehicleEditorSection;
  title: string;
  description: string;
  children: ReactNode;
};

export function FleetVehicleEditorHero({
  mode,
  vehicleId,
  vehicleName,
  statusMessage,
  spotlightTitle,
  spotlightDescription,
  operationalStatusLabel,
  currentOdometerLabel,
  currentAssignmentLabel
}: FleetVehicleEditorHeroProps) {
  return (
    <div className="driver-editor-hero-top">
      <div className="driver-editor-hero-copy">
        <p className="eyebrow">{mode === "create" ? "Novo veiculo" : "Editar veiculo"}</p>
        <h1>{mode === "create" ? "Cadastro de veiculo" : vehicleName}</h1>
        <p className="helper-text">{statusMessage}</p>
        <div className="driver-editor-hero-actions">
          <Link href="/fleet/veiculos" className="button-link secondary-link">
            Voltar para veiculos
          </Link>
          {mode === "edit" && vehicleId ? (
            <Link href={`/fleet/veiculos/${vehicleId}/overview`} className="button-link secondary-link">
              Abrir workspace
            </Link>
          ) : null}
        </div>
      </div>

      <article className="driver-editor-hero-spotlight">
        <span className="driver-editor-hero-spotlight-label">Pulso do cadastro</span>
        <strong>{spotlightTitle}</strong>
        <p>{spotlightDescription}</p>
        <div className="driver-editor-hero-spotlight-grid">
          <div>
            <span>Status</span>
            <strong>{operationalStatusLabel}</strong>
          </div>
          <div>
            <span>KM atual</span>
            <strong>{currentOdometerLabel}</strong>
          </div>
          <div>
            <span>Motorista</span>
            <strong>{currentAssignmentLabel}</strong>
          </div>
        </div>
      </article>
    </div>
  );
}

export function FleetVehicleEditorStepNav({
  activeSection,
  onSectionChange
}: FleetVehicleEditorStepNavProps) {
  return (
    <section className="driver-editor-stepbar" aria-label="Etapas do cadastro do veiculo">
      <div className="driver-editor-stepnav">
        <button
          type="button"
          className={activeSection === "profile" ? "driver-editor-stepchip is-active" : "driver-editor-stepchip"}
          onClick={() => onSectionChange("profile")}
        >
          <span>01</span>
          <div className="driver-editor-stepcopy">
            <strong>Cadastro</strong>
            <small>Modelo, placa e status</small>
          </div>
        </button>
        <button
          type="button"
          className={activeSection === "operations" ? "driver-editor-stepchip is-active" : "driver-editor-stepchip"}
          onClick={() => onSectionChange("operations")}
        >
          <span>02</span>
          <div className="driver-editor-stepcopy">
            <strong>Operacao</strong>
            <small>Alocacao, checklist e alertas</small>
          </div>
        </button>
        <button
          type="button"
          className={activeSection === "maintenance" ? "driver-editor-stepchip is-active" : "driver-editor-stepchip"}
          onClick={() => onSectionChange("maintenance")}
        >
          <span>03</span>
          <div className="driver-editor-stepcopy">
            <strong>Manutencao</strong>
            <small>Planos, OS e quilometragem</small>
          </div>
        </button>
        <button
          type="button"
          className={activeSection === "history" ? "driver-editor-stepchip is-active" : "driver-editor-stepchip"}
          onClick={() => onSectionChange("history")}
        >
          <span>04</span>
          <div className="driver-editor-stepcopy">
            <strong>Historico</strong>
            <small>Timeline e sessoes do veiculo</small>
          </div>
        </button>
      </div>
    </section>
  );
}

export function FleetVehicleEditorSidebar({
  vehicleName,
  plate,
  operationalStatusLabel,
  readinessLabel,
  readinessReady,
  currentAssignmentLabel,
  currentOdometerLabel,
  checkinCode,
  statusChecks,
  openTasksCount,
  alertsCount,
  timelineCount,
  odometerLogCount,
  canSubmit,
  isSaving,
  mode,
  submitFormId
}: FleetVehicleEditorSidebarProps) {
  return (
    <aside className="driver-editor-sidebar">
      <div className="driver-editor-sidebar-card">
        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Resumo</span>
          <div className="driver-editor-sidebar-summary driver-editor-sidebar-hero">
            <strong className="driver-editor-sidebar-summary-name">{vehicleName}</strong>
            <span className="driver-editor-sidebar-summary-meta">{plate}</span>
            <div className="driver-editor-sidebar-chiprow">
              <span className={readinessReady ? "driver-editor-sidebar-chip is-ready" : "driver-editor-sidebar-chip"}>
                {readinessLabel}
              </span>
              <span className="driver-editor-sidebar-chip">{operationalStatusLabel}</span>
            </div>
            <div className="driver-editor-sidebar-keylist">
              <div className="driver-editor-sidebar-keyrow">
                <span>Motorista atual</span>
                <strong>{currentAssignmentLabel}</strong>
              </div>
              <div className="driver-editor-sidebar-keyrow">
                <span>Quilometragem</span>
                <strong>{currentOdometerLabel}</strong>
              </div>
              <div className="driver-editor-sidebar-keyrow">
                <span>Check-in</span>
                <strong>{checkinCode}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Situacao</span>
          <div className="driver-editor-sidebar-status-list">
            {statusChecks.map((item) => (
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
              <span>OS abertas</span>
              <strong>{openTasksCount}</strong>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>Alertas</span>
              <strong>{alertsCount}</strong>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>KM logs</span>
              <strong>{odometerLogCount}</strong>
            </div>
            <div className="driver-editor-sidebar-fact">
              <span>Timeline</span>
              <strong>{timelineCount}</strong>
            </div>
          </div>
        </div>

        <div className="driver-editor-sidebar-section">
          <span className="driver-editor-sidebar-section-title">Acoes</span>
          <div className="driver-editor-sidebar-actions">
            <button type="submit" form={submitFormId} disabled={!canSubmit}>
              {isSaving ? "Salvando..." : mode === "create" ? "Salvar veiculo" : "Salvar alteracoes"}
            </button>
            <Link href="/fleet/veiculos" className="button-link secondary-link">
              Voltar para veiculos
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function FleetVehicleEditorSectionCard({
  id,
  index,
  section,
  activeSection,
  title,
  description,
  children
}: FleetVehicleEditorSectionCardProps) {
  return (
    <article
      id={id}
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === section ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">{index}</span>
        <div className="panel-head">
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      {children}
    </article>
  );
}
