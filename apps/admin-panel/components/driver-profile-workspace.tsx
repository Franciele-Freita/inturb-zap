import Link from "next/link";
import { DriverProfile, DriverVehicle, formatCurrency, formatDateTime } from "../lib/api";

export type DriverWorkspaceTab = "overview" | "operacao" | "financeiro" | "veiculos" | "historico";

type DriverProfileWorkspaceProps = {
  driver: DriverProfile;
  activeTab: DriverWorkspaceTab;
};

const tabs: Array<{ key: DriverWorkspaceTab; label: string; description: string }> = [
  { key: "overview", label: "Visao geral", description: "Resumo, indicadores e historico" },
  { key: "operacao", label: "Operacao", description: "Status, vinculo e contexto" },
  { key: "financeiro", label: "Financeiro", description: "Repasse e governanca" },
  { key: "veiculos", label: "Veiculos", description: "Ativos em uso ou reserva" },
  { key: "historico", label: "Historico", description: "Timeline do cadastro" }
];

export function DriverProfileWorkspace({ driver, activeTab }: DriverProfileWorkspaceProps) {
  const activeOwnVehicle = driver.vehicles.find((vehicle) => vehicle.isActive) ?? null;
  const blockingIssues = driver.operationEligibility.blockingIssues;
  const showWorkspaceNav = activeTab !== "overview";
  const employmentType = resolveEmploymentType(driver);
  const employmentSince = formatDateLabel(driver.createdAt);
  const contractLabel = resolveContractLabel(employmentType);
  const ratingLabel = resolveRatingLabel(driver);
  const kmLabel = resolveKmLabel(driver);
  const workedHoursLabel = resolveWorkedHoursLabel(driver);
  const operationPulseLabel =
    driver.operationSummary.activeAssignedRides > 0
      ? `${driver.operationSummary.activeAssignedRides} corrida(s) ativa(s)`
      : "Sem corrida ativa no momento";
  const readinessItems = [
    {
      label: "Conta de acesso",
      complete: driver.isActive,
      meta: driver.isActive ? "Ativa no app" : "Desativada no app"
    },
    {
      label: "Elegibilidade operacional",
      complete: driver.operationEligibility.eligible,
      meta: driver.operationEligibility.eligible ? "Sem bloqueios" : blockingIssues[0] ?? "Com bloqueios"
    },
    {
      label: driver.driverType === "FROTA" ? "Alocacao de frota" : "Veiculo operacional",
      complete: driver.driverType === "FROTA" ? driver.fleetAssignmentMode === "FLEX" || !!driver.defaultFleetVehicle : !!activeOwnVehicle,
      meta: resolveVehicleSummary(driver, activeOwnVehicle)
    }
  ];

  return (
    <main className="page-shell page-shell-wide driver-workspace-shell">
      {activeTab === "overview" ? (
        <OverviewHero
          driver={driver}
          employmentType={employmentType}
          employmentSince={employmentSince}
          contractLabel={contractLabel}
        />
      ) : (
        <section className="driver-workspace-hero">
          <div className="driver-workspace-hero-surface">
            <div className="driver-workspace-hero-copy">
              <p className="eyebrow">Motoristas</p>
              <div className="driver-workspace-title-row">
                <div className="driver-workspace-avatar" aria-hidden="true">
                  {driver.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h1>{driver.name}</h1>
                  <p>
                    {driver.email ?? "E-mail pendente"} | {driver.phone} | {resolveDriverTypeLabel(driver.driverType)}
                  </p>
                </div>
              </div>
              <div className="chips">
                <span className={resolveStatusClassName(driver.operationalStatus)}>{resolveStatusLabel(driver.operationalStatus)}</span>
                <span className={driver.operationEligibility.eligible ? "chip" : "chip chip-soft fleet-chip-danger"}>
                  {driver.operationEligibility.eligible ? "Apto para operar" : "Com bloqueios"}
                </span>
                <span className="chip chip-soft">{driver.isActive ? "Acesso ativo" : "Acesso inativo"}</span>
              </div>

              <div className="driver-workspace-hero-actions">
                <Link href="/drivers" className="button-link secondary-link">
                  Voltar para lista
                </Link>
                <Link href={`/drivers/${driver.id}/cadastro`} className="button-link">
                  Editar cadastro
                </Link>
              </div>
            </div>

            <div className="driver-workspace-hero-aside">
              <article className="driver-workspace-hero-signal">
                <span>Pulso operacional</span>
                <strong>{operationPulseLabel}</strong>
                <small>{driver.operationSummary.openExecutionAlerts} alerta(s) abertos na execucao</small>
              </article>
              <article className="driver-workspace-hero-signal">
                <span>Veiculo em contexto</span>
                <strong>{resolveVehicleSummary(driver, activeOwnVehicle)}</strong>
                <small>{resolveValidationLabel(driver)}</small>
              </article>
              <article className="driver-workspace-hero-signal">
                <span>Repasse efetivo</span>
                <strong>{resolveCompensationLabel(driver)}</strong>
                <small>Regra individual aplicada</small>
              </article>
            </div>
          </div>
        </section>
      )}

      <section className={activeTab === "overview" ? "driver-workspace-summary-grid is-overview" : "driver-workspace-summary-grid"}>
        {activeTab === "overview" ? (
          <>
            <article className="driver-workspace-summary-card">
              <span>Avaliacao media</span>
              <strong>{ratingLabel}</strong>
              <small>Leitura consolidada da experiencia do motorista.</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>Total de corridas</span>
              <strong>{driver.operationSummary.completedRides}</strong>
              <small>{driver.operationSummary.activeAssignedRides} ativa(s) no momento</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>KM rodados</span>
              <strong>{kmLabel}</strong>
              <small>Distancia consolidada da operacao.</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>Horas trabalhadas</span>
              <strong>{workedHoursLabel}</strong>
              <small>Horas acumuladas na operacao.</small>
            </article>
          </>
        ) : (
          <>
            <article className="driver-workspace-summary-card">
              <span>Status</span>
              <strong>{resolveStatusLabel(driver.operationalStatus)}</strong>
              <small>{driver.operationEligibility.eligible ? "Sem bloqueios" : `${blockingIssues.length} bloqueio(s)`}</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>Vinculo</span>
              <strong>{resolveDriverTypeLabel(driver.driverType)}</strong>
              <small>{driver.driverType === "FROTA" ? resolveFleetModeLabel(driver.fleetAssignmentMode) : "Veiculo proprio"}</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>Repasse</span>
              <strong>{resolveCompensationLabel(driver)}</strong>
              <small>Regra personalizada</small>
            </article>
            <article className="driver-workspace-summary-card">
              <span>Ultima corrida</span>
              <strong>{driver.operationSummary.lastRideAt ? formatDateTime(driver.operationSummary.lastRideAt) : "Sem corridas"}</strong>
              <small>{driver.operationSummary.completedRides} corrida(s) concluidas</small>
            </article>
          </>
        )}
      </section>

      {showWorkspaceNav ? (
        <section className="driver-workspace-tabs-wrap">
          <nav className="driver-workspace-tabs" aria-label="Abas do motorista">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/drivers/${driver.id}/${tab.key}`}
                className={activeTab === tab.key ? "driver-workspace-tab is-active" : "driver-workspace-tab"}
                aria-current={activeTab === tab.key ? "page" : undefined}
              >
                <strong>{tab.label}</strong>
                <span>{tab.description}</span>
              </Link>
            ))}
          </nav>
        </section>
      ) : null}

      {activeTab === "overview" ? (
        <section className="driver-workspace-overview-stack">
          <OverviewTab driver={driver} />
        </section>
      ) : (
        <section className="driver-workspace-layout">
          <div className="driver-workspace-main">
            {activeTab === "operacao" ? <OperationTab driver={driver} activeOwnVehicle={activeOwnVehicle} /> : null}
            {activeTab === "financeiro" ? <FinanceTab driver={driver} /> : null}
            {activeTab === "veiculos" ? <VehiclesTab driver={driver} activeOwnVehicle={activeOwnVehicle} /> : null}
            {activeTab === "historico" ? <HistoryTab driver={driver} activeOwnVehicle={activeOwnVehicle} /> : null}
          </div>

          <aside className="driver-workspace-sidebar">
            <article className="panel">
              <div className="panel-head">
                <h2>Resumo rapido</h2>
                <span>Leitura imediata para operacao.</span>
              </div>
              <div className="driver-workspace-checklist">
                {readinessItems.map((item) => (
                  <div key={item.label} className={item.complete ? "driver-workspace-check is-ready" : "driver-workspace-check"}>
                    <span aria-hidden="true">{item.complete ? "OK" : "!"}</span>
                    <strong>{item.label}</strong>
                    <small>{item.meta}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2>Contexto</h2>
                <span>Informacoes administrativas do registro.</span>
              </div>
              <div className="driver-workspace-keyvalue">
                <div>
                  <span>Criado em</span>
                  <strong>{formatDateTime(driver.createdAt)}</strong>
                </div>
                <div>
                  <span>Atualizado em</span>
                  <strong>{formatDateTime(driver.updatedAt)}</strong>
                </div>
                <div>
                  <span>ID</span>
                  <strong>{driver.id}</strong>
                </div>
              </div>
            </article>
          </aside>
        </section>
      )}
    </main>
  );
}

function OverviewHero({
  driver,
  employmentType,
  employmentSince,
  contractLabel
}: {
  driver: DriverProfile;
  employmentType: ReturnType<typeof resolveEmploymentType>;
  employmentSince: string;
  contractLabel: string;
}) {
  return (
    <section className="driver-workspace-overview-dashboard">
      <article className="driver-workspace-overview-main">
        <div className="driver-workspace-overview-heading">
          <div className="driver-workspace-avatar" aria-hidden="true">
            {driver.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Visao geral do motorista</p>
            <h1>{driver.name}</h1>
            <p className="driver-workspace-overview-caption">
              {driver.email ?? "E-mail pendente"} • {driver.phone}
            </p>
          </div>
        </div>

        <p className="driver-workspace-overview-hero-description">
          Painel executivo para acompanhar performance, situacao profissional e principais alertas operacionais do motorista.
        </p>

        <div className="chips">
          <span className={resolveStatusClassName(driver.operationalStatus)}>{resolveStatusLabel(driver.operationalStatus)}</span>
          <span className={driver.operationEligibility.eligible ? "chip" : "chip chip-soft fleet-chip-danger"}>
            {driver.operationEligibility.eligible ? "Apto para operar" : "Com bloqueios"}
          </span>
          <span className="chip chip-soft">{driver.isActive ? "Acesso ativo" : "Acesso inativo"}</span>
        </div>

        <div className="driver-workspace-overview-mini-grid">
          <article className="driver-workspace-overview-mini-card">
            <span>Tipo de funcionario</span>
            <strong>{employmentType}</strong>
            <small>{contractLabel}</small>
          </article>
          <article className="driver-workspace-overview-mini-card">
            <span>Funcionario desde</span>
            <strong>{employmentSince}</strong>
            <small>Cadastro ativo na base</small>
          </article>
          <article className="driver-workspace-overview-mini-card">
            <span>Remuneracao</span>
            <strong>{resolveCompensationLabel(driver)}</strong>
            <small>Configuracao atual</small>
          </article>
        </div>

        <div className="driver-workspace-hero-actions">
          <Link href="/drivers" className="button-link secondary-link">
            Voltar para lista
          </Link>
          <Link href={`/drivers/${driver.id}/cadastro`} className="button-link">
            Editar cadastro
          </Link>
        </div>
      </article>

      <div className="driver-workspace-overview-rail">
        <article className="panel driver-workspace-overview-side-card">
          <div className="panel-head">
            <h2>Resumo profissional</h2>
            <span>Leitura institucional do vinculo.</span>
          </div>
          <div className="driver-workspace-keyvalue driver-workspace-overview-side-list">
            <div>
              <span>Contrato</span>
              <strong>{contractLabel}</strong>
            </div>
            <div>
              <span>Jornada</span>
              <strong>{resolveJourneyModel(employmentType)}</strong>
            </div>
            <div>
              <span>Tipo de cadastro</span>
              <strong>{resolveDriverTypeLabel(driver.driverType)}</strong>
            </div>
          </div>
        </article>

        <article className="panel driver-workspace-overview-side-card driver-workspace-overview-side-card-accent">
          <div className="panel-head">
            <h2>Radar operacional</h2>
            <span>O que merece atencao agora.</span>
          </div>
          <div className="driver-workspace-keyvalue driver-workspace-overview-side-list">
            <div>
              <span>Ocorrencias abertas</span>
              <strong>{driver.operationSummary.openExecutionAlerts}</strong>
            </div>
            <div>
              <span>Sinistros</span>
              <strong>{driver.operationSummary.emergencyCancellations}</strong>
            </div>
            <div>
              <span>Elegibilidade</span>
              <strong>{driver.operationEligibility.eligible ? "Apto para operar" : "Com bloqueios"}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function OverviewTab({ driver }: { driver: DriverProfile }) {
  const employmentType = resolveEmploymentType(driver);
  const employmentSince = formatDateLabel(driver.createdAt);
  const contractLabel = resolveContractLabel(employmentType);
  const journeyModel = resolveJourneyModel(employmentType);
  const overviewTimeline = [
    {
      date: formatDateTime(driver.createdAt),
      title: "Inicio na empresa",
      description: `${driver.name} entrou na base operacional como ${employmentType}.`
    },
    {
      date: formatDateTime(driver.updatedAt),
      title: "Cadastro revisado",
      description: "Dados cadastrais e contratuais atualizados no painel administrativo."
    },
    driver.operationSummary.lastRideAt
      ? {
          date: formatDateTime(driver.operationSummary.lastRideAt),
          title: "Ultima operacao registrada",
          description: `${driver.operationSummary.completedRides} corrida(s) concluidas ate o momento.`
        }
      : null,
    driver.operationSummary.openExecutionAlerts > 0
      ? {
          date: formatDateTime(driver.updatedAt),
          title: "Ocorrencias em aberto",
          description: `${driver.operationSummary.openExecutionAlerts} item(ns) aguardando tratativa operacional.`
        }
      : null
  ].filter(Boolean) as Array<{ date: string; title: string; description: string }>;

  return (
    <div className="driver-workspace-overview-panels">
      <article className="panel driver-workspace-detail-card driver-workspace-domain-card">
        <div className="panel-head">
          <h2>Perfil profissional</h2>
          <span>Informacoes institucionais e contratuais do motorista.</span>
        </div>
        <div className="driver-workspace-keyvalue driver-workspace-keyvalue-strong driver-workspace-domain-grid">
          <div className="driver-workspace-domain-item"><span>Tipo de funcionario</span><strong>{employmentType}</strong><small>{resolveDriverTypeLabel(driver.driverType)}</small></div>
          <div className="driver-workspace-domain-item"><span>Funcionario desde</span><strong>{employmentSince}</strong><small>Cadastro ativo no painel</small></div>
          <div className="driver-workspace-domain-item"><span>Contrato de trabalho</span><strong>{contractLabel}</strong><small>{resolveCompensationLabel(driver)}</small></div>
          <div className="driver-workspace-domain-item"><span>Modelo de jornada</span><strong>{journeyModel}</strong><small>{driver.operationEligibility.eligible ? "Base liberada para operar" : "Com restricoes operacionais"}</small></div>
          <div className="driver-workspace-domain-item"><span>Remuneracao atual</span><strong>{resolveCompensationLabel(driver)}</strong><small>Configuracao vigente para este motorista</small></div>
        </div>
      </article>

      <article className="panel driver-workspace-detail-card driver-workspace-domain-card">
        <div className="panel-head">
          <h2>Seguranca e conformidade</h2>
          <span>Ocorrencias, sinistros e multas registradas.</span>
        </div>
        <div className="driver-workspace-keyvalue driver-workspace-metric-grid">
          <div className="driver-workspace-metric-card"><span>Ocorrencias</span><strong>{driver.operationSummary.openExecutionAlerts}</strong></div>
          <div className="driver-workspace-metric-card"><span>Sinistros</span><strong>{driver.operationSummary.emergencyCancellations}</strong></div>
          <div className="driver-workspace-metric-card"><span>Multas</span><strong>0</strong></div>
          <div className="driver-workspace-metric-card"><span>Status operacional</span><strong>{resolveStatusLabel(driver.operationalStatus)}</strong></div>
        </div>
      </article>

      <article className="panel driver-workspace-detail-card driver-workspace-history-card driver-workspace-panel-full">
        <div className="panel-head">
          <h2>Historico operacional</h2>
          <span>Linha do tempo com os principais marcos do motorista na operacao.</span>
        </div>
        <div className="driver-workspace-timeline">
          {overviewTimeline.map((item) => (
            <article key={`${item.title}-${item.date}`} className="driver-workspace-timeline-item">
              <span className="driver-workspace-timeline-date">{item.date}</span>
              <div><strong>{item.title}</strong><p>{item.description}</p></div>
            </article>
          ))}
        </div>
      </article>
    </div>
  );
}

function OperationTab({ driver, activeOwnVehicle }: { driver: DriverProfile; activeOwnVehicle: DriverVehicle | null }) {
  return (
    <article className="panel panel-wide driver-workspace-detail-card driver-workspace-domain-card">
      <div className="panel-head">
        <h2>Operacao</h2>
        <span>Status, vinculo e contexto operacional do motorista.</span>
      </div>
      <div className="driver-workspace-keyvalue driver-workspace-keyvalue-strong driver-workspace-domain-grid">
        <div className="driver-workspace-domain-item"><span>Status operacional</span><strong>{resolveStatusLabel(driver.operationalStatus)}</strong><small>{resolveStatusDescription(driver.operationalStatus)}</small></div>
        <div className="driver-workspace-domain-item"><span>Vinculo</span><strong>{resolveDriverTypeLabel(driver.driverType)}</strong><small>{driver.driverType === "FROTA" ? resolveFleetModeLabel(driver.fleetAssignmentMode) : "Veiculo proprio no cadastro"}</small></div>
        <div className="driver-workspace-domain-item"><span>Veiculo em operacao</span><strong>{resolveVehicleSummary(driver, activeOwnVehicle)}</strong><small>{resolveValidationLabel(driver)}</small></div>
        <div className="driver-workspace-domain-item"><span>Observacoes</span><strong>{driver.operationalNotes?.trim() || "Sem observacoes registradas"}</strong><small>Mantenha esse contexto atualizado no cadastro.</small></div>
      </div>
    </article>
  );
}

function FinanceTab({ driver }: { driver: DriverProfile }) {
  return (
    <div className="overview-grid driver-workspace-overview-grid">
      <article className="panel driver-workspace-detail-card driver-workspace-domain-card">
        <div className="panel-head panel-head-inline">
          <div>
            <h2>Repasse efetivo</h2>
            <span>Modelo financeiro aplicado a este motorista.</span>
          </div>
          <Link href="/compensation" className="button-link secondary-link">Templates</Link>
        </div>
        <div className="driver-workspace-keyvalue driver-workspace-keyvalue-strong driver-workspace-domain-grid">
          <div className="driver-workspace-domain-item"><span>Modelo</span><strong>{resolveCompensationModel(driver)}</strong><small>{resolveCompensationLabel(driver)}</small></div>
          <div className="driver-workspace-domain-item"><span>Origem</span><strong>Template/Personalizada</strong><small>Regra aplicada diretamente ao motorista.</small></div>
          <div className="driver-workspace-domain-item"><span>Status</span><strong>{driver.compensation.effectiveIsActive ? "Ativo" : "Inativo"}</strong><small>Regra aplicada no fechamento operacional.</small></div>
        </div>
      </article>

      <article className="panel driver-workspace-note-card">
        <div className="panel-head">
          <h2>Notas financeiras</h2>
          <span>Observacoes para governanca e acompanhamento.</span>
        </div>
        <div className="driver-workspace-rich-copy">
          <p>{driver.compensation.customNotes?.trim() || "Sem observacoes financeiras registradas."}</p>
        </div>
      </article>
    </div>
  );
}

function VehiclesTab({ driver, activeOwnVehicle }: { driver: DriverProfile; activeOwnVehicle: DriverVehicle | null }) {
  if (driver.driverType === "FROTA") {
    return (
      <article className="panel panel-wide driver-workspace-detail-card driver-workspace-domain-card">
        <div className="panel-head">
          <h2>Alocacao de frota</h2>
          <span>Controle do carro padrao e do carro validado para operar.</span>
        </div>
        <div className="driver-workspace-list driver-workspace-vehicle-summary-grid">
          <article className="list-card driver-workspace-vehicle-summary-card"><strong>Modo de alocacao</strong><span>{resolveFleetModeLabel(driver.fleetAssignmentMode)}</span></article>
          <article className="list-card driver-workspace-vehicle-summary-card"><strong>Veiculo padrao</strong><span>{driver.defaultFleetVehicle ? `${driver.defaultFleetVehicle.label} | ${driver.defaultFleetVehicle.plate}` : "Nenhum definido"}</span></article>
          <article className="list-card driver-workspace-vehicle-summary-card"><strong>Veiculo em uso</strong><span>{driver.currentFleetVehicle ? `${driver.currentFleetVehicle.label} | ${driver.currentFleetVehicle.plate}` : "Sem carro validado no momento"}</span></article>
        </div>
      </article>
    );
  }

  return (
    <article className="panel panel-wide driver-workspace-detail-card driver-workspace-domain-card">
      <div className="panel-head">
        <h2>Veiculos proprios</h2>
        <span>Base operacional dos carros cadastrados para o agregado.</span>
      </div>
      {driver.vehicles.length > 0 ? (
        <div className="driver-workspace-list">
          {driver.vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className={
                vehicle.isActive
                  ? "vehicle-card vehicle-card-active driver-workspace-owned-vehicle"
                  : "vehicle-card driver-workspace-owned-vehicle"
              }
            >
              <div className="driver-workspace-vehicle-head">
                <div><strong>{vehicle.label}</strong><span>{vehicle.plate}</span></div>
                <span className={vehicle.isActive ? "status-pill status-pill-success" : "status-pill"}>{vehicle.isActive ? "Operacional" : "Reserva"}</span>
              </div>
              <div className="driver-workspace-keyvalue">
                <div><span>Cor</span><strong>{vehicle.color || "Nao informado"}</strong></div>
                <div><span>Ano</span><strong>{vehicle.year ? String(vehicle.year) : "Nao informado"}</strong></div>
                <div><span>Atualizado em</span><strong>{formatDateTime(vehicle.updatedAt)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state driver-workspace-empty-card">
          <strong>Nenhum veiculo cadastrado.</strong>
          <p>Esse motorista precisa de ao menos um veiculo operacional para atuar como agregado.</p>
        </div>
      )}
    </article>
  );
}

function HistoryTab({ driver, activeOwnVehicle }: { driver: DriverProfile; activeOwnVehicle: DriverVehicle | null }) {
  const timeline = [
    { date: formatDateTime(driver.createdAt), title: "Cadastro criado", description: `Perfil criado para ${driver.name}.` },
    { date: formatDateTime(driver.updatedAt), title: "Ultima atualizacao", description: "Revisao mais recente do cadastro, regras ou dados operacionais." },
    driver.operationSummary.lastRideAt
      ? { date: formatDateTime(driver.operationSummary.lastRideAt), title: "Ultima corrida", description: `${driver.operationSummary.completedRides} corrida(s) concluidas ate o momento.` }
      : null,
    activeOwnVehicle
      ? { date: formatDateTime(activeOwnVehicle.updatedAt), title: "Veiculo ativo", description: `${activeOwnVehicle.label} | ${activeOwnVehicle.plate} marcado como operacional.` }
      : driver.currentFleetVehicle
        ? { date: formatDateTime(driver.currentFleetVehicle.startedAt), title: "Veiculo validado", description: `${driver.currentFleetVehicle.label} | ${driver.currentFleetVehicle.plate} em operacao.` }
        : null
  ].filter(Boolean) as Array<{ date: string; title: string; description: string }>;

  return (
    <article className="panel panel-wide driver-workspace-detail-card driver-workspace-history-card">
      <div className="panel-head">
        <h2>Historico</h2>
        <span>Timeline resumida para leitura rapida de contexto.</span>
      </div>
      <div className="driver-workspace-timeline">
        {timeline.map((item) => (
          <article key={`${item.title}-${item.date}`} className="driver-workspace-timeline-item">
            <span className="driver-workspace-timeline-date">{item.date}</span>
            <div><strong>{item.title}</strong><p>{item.description}</p></div>
          </article>
        ))}
      </div>
    </article>
  );
}

function resolveDriverTypeLabel(type: DriverProfile["driverType"]) {
  return type === "FROTA" ? "Motorista da frota" : "Agregado";
}

function resolveEmploymentType(driver: DriverProfile) {
  if (driver.compensation.effectiveModel === "INTERMITTENT") return "Intermitente";
  if (driver.driverType === "FROTA") return "CLT";
  return "MEI";
}

function resolveContractLabel(type: ReturnType<typeof resolveEmploymentType>) {
  if (type === "CLT") return "Contrato CLT";
  if (type === "Intermitente") return "Vinculo intermitente";
  return "Prestacao MEI";
}

function resolveJourneyModel(type: ReturnType<typeof resolveEmploymentType>) {
  if (type === "CLT") return "Jornada fixa";
  if (type === "Intermitente") return "Jornada variavel";
  return "Disponibilidade acordada";
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
}

function resolveRatingLabel(driver: DriverProfile) {
  return driver.operationSummary.completedRides > 0 ? "Sem nota" : "Sem nota";
}

function resolveKmLabel(driver: DriverProfile) {
  return driver.operationSummary.completedRides > 0 ? "Sem leitura" : "Sem leitura";
}

function resolveWorkedHoursLabel(driver: DriverProfile) {
  return driver.operationSummary.completedRides > 0 ? "Sem leitura" : "Sem leitura";
}

function resolveStatusLabel(status: DriverProfile["operationalStatus"]) {
  if (status === "INACTIVE") return "Inativo";
  if (status === "LEAVE") return "Em analise";
  if (status === "SUSPENDED") return "Suspenso";
  return "Ativo";
}

function resolveStatusDescription(status: DriverProfile["operationalStatus"]) {
  if (status === "INACTIVE") return "Nao deve aparecer na operacao nem receber corridas.";
  if (status === "LEAVE") return "Cadastro em avaliacao e temporariamente fora da operacao.";
  if (status === "SUSPENDED") return "Bloqueado para operar ate nova liberacao.";
  return "Pode operar normalmente quando vinculo e veiculo estiverem regulares.";
}

function resolveStatusClassName(status: DriverProfile["operationalStatus"]) {
  if (status === "ACTIVE") return "status-pill status-pill-success";
  if (status === "LEAVE") return "status-pill rides-status-pill-warning";
  if (status === "SUSPENDED") return "status-pill rides-status-pill-danger";
  return "status-pill";
}

function resolveFleetModeLabel(mode?: DriverProfile["fleetAssignmentMode"]) {
  if (mode === "FIXED") return "Veiculo fixo";
  if (mode === "FLEX") return "Validacao flexivel";
  return "Nao se aplica";
}

function resolveValidationLabel(driver: DriverProfile) {
  if (driver.driverType !== "FROTA") return "Controle pelo cadastro do veiculo proprio";
  if (driver.currentFleetVehicle?.validationMethod === "QR_CODE") return "Validado por QR Code";
  if (driver.currentFleetVehicle?.validationMethod === "PLATE") return "Validado por placa";
  if (driver.currentFleetVehicle?.validationMethod === "ADMIN") return "Validado por admin";
  return "Aguardando validacao";
}

function resolveVehicleSummary(driver: DriverProfile, activeOwnVehicle: DriverVehicle | null) {
  if (driver.driverType === "FROTA") {
    return driver.currentFleetVehicle ? `${driver.currentFleetVehicle.label} | ${driver.currentFleetVehicle.plate}` : "Sem carro validado";
  }

  return activeOwnVehicle ? `${activeOwnVehicle.label} | ${activeOwnVehicle.plate}` : "Sem veiculo operacional";
}

function resolveCompensationModel(driver: DriverProfile) {
  const mode = driver.compensation.effectiveModel;
  if (mode === "PERCENT") return "Comissao por corrida";
  if (mode === "FLAT") return "Valor fixo por corrida";
  if (mode === "DAILY") return "Diaria";
  if (mode === "SHIFT") return "Turno";
  if (mode === "SALARY") return "Salario";
  if (mode === "INTERMITTENT") return "Intermitente";
  return "Personalizado";
}

function resolveCompensationLabel(driver: DriverProfile) {
  const mode = driver.compensation.effectiveModel;
  const value = driver.compensation.effectiveValue;
  if (mode === "PERCENT") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% por corrida`;
  if (mode === "FLAT") return `${formatCurrency(value)} por corrida`;
  if (mode === "DAILY") return `${formatCurrency(value)} por diaria`;
  if (mode === "SHIFT") return `${formatCurrency(value)} por turno`;
  if (mode === "SALARY") return `${formatCurrency(value)} por mes`;
  if (mode === "INTERMITTENT") return value > 0 ? `${formatCurrency(value)} intermitente` : "Intermitente";
  return value > 0 ? `${formatCurrency(value)} personalizado` : "Personalizado";
}

function resolveGenderLabel(gender?: DriverProfile["gender"]) {
  if (gender === "FEMALE") return "Feminino";
  if (gender === "MALE") return "Masculino";
  if (gender === "NON_BINARY") return "Nao-binario";
  if (gender === "PREFER_NOT_TO_SAY") return "Prefere nao dizer";
  return "Nao informado";
}
