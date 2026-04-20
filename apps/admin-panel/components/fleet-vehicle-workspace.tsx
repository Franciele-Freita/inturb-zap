"use client";

import Link from "next/link";
import { FleetVehicleDetails, FleetVehicleMaintenancePlan, FleetVehicleMaintenanceTask, formatCurrency, formatDateTime } from "../lib/api";

export type FleetVehicleWorkspaceTab = "overview" | "manutencao" | "checklists" | "alocacoes" | "historico";

type FleetVehicleWorkspaceProps = {
  vehicle: FleetVehicleDetails;
  activeTab: FleetVehicleWorkspaceTab;
};

const tabs: Array<{ key: FleetVehicleWorkspaceTab; label: string; description: string }> = [
  { key: "overview", label: "Overview", description: "Saude e leitura executiva" },
  { key: "manutencao", label: "Manutencao", description: "OS, planos e custos" },
  { key: "checklists", label: "Checklists", description: "Execucao e obrigatoriedade" },
  { key: "alocacoes", label: "Alocacoes", description: "Motoristas e uso do ativo" },
  { key: "historico", label: "Historico", description: "Timeline e quilometragem" }
];

export function FleetVehicleWorkspace({ vehicle, activeTab }: FleetVehicleWorkspaceProps) {
  const openTasks = vehicle.maintenanceTasks.filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED");
  const activePlans = vehicle.maintenancePlans.filter((plan) => plan.isActive);
  const currentAssignment = vehicle.currentAssignment ?? null;
  const healthIssues = [
    ...vehicle.alerts.map((alert) => ({
      id: `${alert.code}-${alert.label}`,
      title: alert.label,
      detail: alert.detail ?? "Alerta operacional registrado para este veiculo.",
      tone: alert.level
    })),
    ...(vehicle.overdueMaintenanceCount > 0
      ? [
          {
            id: "overdue-maintenance",
            title: `${vehicle.overdueMaintenanceCount} manutencao(oes) vencida(s)`,
            detail: "Existe risco operacional e o carro precisa entrar na fila de manutencao.",
            tone: "danger" as const
          }
        ]
      : []),
    ...(vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete
      ? [
          {
            id: "pending-checklist",
            title: `${vehicle.checklistProgress.pendingItems} item(ns) pendente(s) no checklist`,
            detail: "A rotina do dia ainda nao foi concluida para liberar totalmente o carro.",
            tone: "warning" as const
          }
        ]
      : [])
  ];
  const readinessItems = [
    {
      label: "Disponibilidade",
      complete: vehicle.status === "AVAILABLE" || vehicle.status === "ALLOCATED",
      meta: resolveFleetStatusLabel(vehicle.status)
    },
    {
      label: "Checklist do dia",
      complete: !vehicle.checklistProgress.required || vehicle.checklistProgress.isComplete,
      meta: resolveChecklistLabel(vehicle)
    },
    {
      label: "Manutencao critica",
      complete: vehicle.overdueMaintenanceCount === 0,
      meta:
        vehicle.overdueMaintenanceCount > 0
          ? `${vehicle.overdueMaintenanceCount} vencida(s)`
          : vehicle.dueSoonMaintenanceCount > 0
            ? `${vehicle.dueSoonMaintenanceCount} proxima(s)`
            : "Sem pendencias"
    }
  ];

  return (
    <main className="page-shell page-shell-wide fleet-vehicle-workspace-shell">
      <section className="fleet-vehicle-workspace-hero">
        <div className="fleet-vehicle-workspace-hero-surface">
          <div className="fleet-vehicle-workspace-hero-copy">
            <p className="eyebrow">Frota</p>
            <div className="fleet-vehicle-workspace-title-row">
              <div className="fleet-vehicle-workspace-avatar" aria-hidden="true">
                {vehicle.label.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1>{vehicle.label}</h1>
                <p>
                  {vehicle.plate}
                  {vehicle.color ? ` | ${vehicle.color}` : ""}
                  {vehicle.year ? ` | ${vehicle.year}` : ""}
                  {` | Check-in ${vehicle.checkinCode}`}
                </p>
              </div>
            </div>
            <div className="chips">
              <span className={resolveFleetStatusClassName(vehicle.status)}>{resolveFleetStatusLabel(vehicle.status)}</span>
              <span className={!vehicle.checklistProgress.required || vehicle.checklistProgress.isComplete ? "chip" : "chip chip-soft fleet-chip-warning"}>
                {resolveChecklistLabel(vehicle)}
              </span>
              {vehicle.alerts.length > 0 ? (
                <span className="chip chip-soft fleet-chip-danger">{`${vehicle.alerts.length} alerta(s)`}</span>
              ) : (
                <span className="chip chip-soft">Sem alertas abertos</span>
              )}
            </div>
            <div className="fleet-vehicle-workspace-hero-actions">
              <Link href="/fleet/veiculos" className="button-link secondary-link">
                Voltar para veiculos
              </Link>
              <Link href={`/fleet/veiculos/${vehicle.id}/cadastro`} className="button-link">
                Editar cadastro
              </Link>
            </div>
          </div>

          <div className="fleet-vehicle-workspace-hero-aside">
            <article className="fleet-vehicle-workspace-hero-signal">
              <span>Pulso operacional</span>
              <strong>{currentAssignment ? `Em uso por ${currentAssignment.driverName}` : "Sem motorista em uso"}</strong>
              <small>{currentAssignment ? `Validado por ${resolveValidationMethodLabel(currentAssignment.validationMethod)}` : "Pronto para alocacao ou fila operacional"}</small>
            </article>
            <article className="fleet-vehicle-workspace-hero-signal">
              <span>Manutencao</span>
              <strong>{openTasks.length} item(ns) aberto(s)</strong>
              <small>{vehicle.overdueMaintenanceCount > 0 ? `${vehicle.overdueMaintenanceCount} vencida(s)` : "Sem vencimento critico no momento"}</small>
            </article>
            <article className="fleet-vehicle-workspace-hero-signal">
              <span>Quilometragem</span>
              <strong>{vehicle.latestOdometerKm ? `${vehicle.latestOdometerKm} km` : "KM pendente"}</strong>
              <small>{activePlans.length > 0 ? `${activePlans.length} plano(s) preventivo(s) ativo(s)` : "Sem plano preventivo ativo"}</small>
            </article>
          </div>
        </div>
      </section>

      <section className="fleet-vehicle-workspace-summary-grid">
        <article className="fleet-vehicle-workspace-summary-card">
          <span>Status</span>
          <strong>{resolveFleetStatusLabel(vehicle.status)}</strong>
          <small>{currentAssignment ? "Em operacao com motorista vinculado" : "Sem uso ativo neste momento"}</small>
        </article>
        <article className="fleet-vehicle-workspace-summary-card">
          <span>Alocacao</span>
          <strong>{currentAssignment ? currentAssignment.driverName : "Sem motorista"}</strong>
          <small>{currentAssignment ? `Desde ${formatDateTime(currentAssignment.startedAt)}` : "Aguardando vinculo operacional"}</small>
        </article>
        <article className="fleet-vehicle-workspace-summary-card">
          <span>Checklist</span>
          <strong>{vehicle.checklistProgress.required ? `${vehicle.checklistProgress.completedItems}/${vehicle.checklistProgress.totalItems}` : "Nao exigido"}</strong>
          <small>{vehicle.checklistProgress.required ? `Data ${vehicle.checklistProgress.dateKey}` : "Rotina nao obrigatoria hoje"}</small>
        </article>
        <article className="fleet-vehicle-workspace-summary-card">
          <span>Alertas</span>
          <strong>{vehicle.alerts.length}</strong>
          <small>{openTasks.length} manutencao(oes) aberta(s)</small>
        </article>
      </section>

      <section className="fleet-vehicle-workspace-tabs-wrap">
        <nav className="fleet-vehicle-workspace-tabs" aria-label="Abas do veiculo">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/fleet/veiculos/${vehicle.id}/${tab.key}`}
              className={activeTab === tab.key ? "fleet-vehicle-workspace-tab is-active" : "fleet-vehicle-workspace-tab"}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="fleet-vehicle-workspace-layout">
        <div className="fleet-vehicle-workspace-main">
          {activeTab === "overview" ? <FleetOverviewTab vehicle={vehicle} healthIssues={healthIssues} currentAssignment={currentAssignment} /> : null}
          {activeTab === "manutencao" ? <FleetMaintenanceTab vehicle={vehicle} openTasks={openTasks} activePlans={activePlans} /> : null}
          {activeTab === "checklists" ? <FleetChecklistTab vehicle={vehicle} /> : null}
          {activeTab === "alocacoes" ? <FleetAllocationsTab vehicle={vehicle} currentAssignment={currentAssignment} /> : null}
          {activeTab === "historico" ? <FleetHistoryTab vehicle={vehicle} /> : null}
        </div>

        <aside className="fleet-vehicle-workspace-sidebar">
          <article className="panel">
            <div className="panel-head">
              <h2>Resumo rapido</h2>
              <span>Leitura imediata para operacao da frota.</span>
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
              <span>Dados administrativos do ativo.</span>
            </div>
            <div className="driver-workspace-keyvalue">
              <div>
                <span>Criado em</span>
                <strong>{formatDateTime(vehicle.createdAt)}</strong>
              </div>
              <div>
                <span>Atualizado em</span>
                <strong>{formatDateTime(vehicle.updatedAt)}</strong>
              </div>
              <div>
                <span>Check-in</span>
                <strong>{vehicle.checkinCode}</strong>
              </div>
              <div>
                <span>ID</span>
                <strong>{vehicle.id}</strong>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

function FleetOverviewTab({
  vehicle,
  healthIssues,
  currentAssignment
}: {
  vehicle: FleetVehicleDetails;
  healthIssues: Array<{ id: string; title: string; detail: string; tone: "info" | "warning" | "danger" }>;
  currentAssignment: FleetVehicleDetails["currentAssignment"] | null;
}) {
  return (
    <>
      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Saude do veiculo</h2>
          <span>O que bloqueia, pressiona ou libera este ativo na operacao.</span>
        </div>
        {healthIssues.length > 0 ? (
          <div className="fleet-vehicle-workspace-list">
            {healthIssues.map((issue) => (
              <article key={issue.id} className={`list-card fleet-vehicle-workspace-alert-card is-${issue.tone}`}>
                <strong>{issue.title}</strong>
                <span>{issue.detail}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state fleet-vehicle-workspace-health-state">
            <span className="fleet-vehicle-workspace-health-badge">Base liberada</span>
            <strong>Sem bloqueios operacionais ativos.</strong>
            <p>O veiculo esta em condicao saudavel para seguir em disponibilidade ou alocacao.</p>
          </div>
        )}
      </article>

      <div className="overview-grid fleet-vehicle-workspace-overview-grid">
        <article className="panel fleet-vehicle-workspace-detail-card">
          <div className="panel-head">
            <h2>Contexto operacional</h2>
            <span>Estado atual do ativo na base e no uso.</span>
          </div>
          <div className="driver-workspace-keyvalue fleet-vehicle-workspace-fact-grid">
            <div className="fleet-vehicle-workspace-fact-card"><span>Motorista atual</span><strong>{currentAssignment?.driverName ?? "Sem alocacao"}</strong></div>
            <div className="fleet-vehicle-workspace-fact-card"><span>Metodo</span><strong>{currentAssignment ? resolveValidationMethodLabel(currentAssignment.validationMethod) : "Nao aplicavel"}</strong></div>
            <div className="fleet-vehicle-workspace-fact-card"><span>Check-in</span><strong>{vehicle.checkinCode}</strong></div>
            <div className="fleet-vehicle-workspace-fact-card"><span>KM atual</span><strong>{vehicle.latestOdometerKm ? `${vehicle.latestOdometerKm} km` : "Sem registro"}</strong></div>
          </div>
        </article>

        <article className="panel fleet-vehicle-workspace-detail-card">
          <div className="panel-head">
            <h2>Painel de leitura</h2>
            <span>Resumo rapido de manutencao e checklist.</span>
          </div>
          <div className="driver-workspace-keyvalue fleet-vehicle-workspace-metric-grid">
            <div className="fleet-vehicle-workspace-metric-card"><span>Manutencoes abertas</span><strong>{vehicle.openMaintenanceCount}</strong></div>
            <div className="fleet-vehicle-workspace-metric-card"><span>Vencidas</span><strong>{vehicle.overdueMaintenanceCount}</strong></div>
            <div className="fleet-vehicle-workspace-metric-card"><span>Proximas</span><strong>{vehicle.dueSoonMaintenanceCount}</strong></div>
            <div className="fleet-vehicle-workspace-metric-card"><span>Checklist pendente</span><strong>{vehicle.checklistProgress.pendingItems}</strong></div>
          </div>
        </article>
      </div>
    </>
  );
}

function FleetMaintenanceTab({
  vehicle,
  openTasks,
  activePlans
}: {
  vehicle: FleetVehicleDetails;
  openTasks: FleetVehicleMaintenanceTask[];
  activePlans: FleetVehicleMaintenancePlan[];
}) {
  return (
    <>
      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Fila de manutencao</h2>
          <span>Ordens abertas, prioridade e vencimento do ativo.</span>
        </div>
        {openTasks.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma manutencao aberta.</strong>
            <p>Este veiculo nao possui OS ativa no momento.</p>
          </div>
        ) : (
          <div className="fleet-vehicle-workspace-list">
            {openTasks.map((task) => (
              <article key={task.id} className="list-card fleet-vehicle-workspace-task-card">
                <div className="fleet-vehicle-workspace-card-head">
                  <div>
                    <strong>{task.title}</strong>
                    <span>{resolveServiceTypeLabel(task.serviceType)} • {resolvePriorityLabel(task.priority)}</span>
                  </div>
                  <span className={resolveTaskStatusClassName(task.status, task.priority)}>{resolveTaskStatusLabel(task.status)}</span>
                </div>
                <div className="fleet-vehicle-workspace-card-meta">
                  <span>{task.workshop ?? "Oficina nao definida"}</span>
                  <span>{task.dueAt ? `Prevista em ${formatDateTime(task.dueAt)}` : "Sem data prevista"}</span>
                  <span>{task.dueKm ? `Meta ${task.dueKm} km` : "Sem meta em km"}</span>
                  <span>{task.estimatedCost ? formatCurrency(task.estimatedCost) : "Custo estimado pendente"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Planos preventivos</h2>
          <span>Cadencia e proxima geracao de manutencao.</span>
        </div>
        {activePlans.length === 0 ? (
          <div className="empty-state">
            <strong>Sem plano preventivo ativo.</strong>
            <p>Crie um plano para governar vencimentos por tempo ou quilometragem.</p>
          </div>
        ) : (
          <div className="fleet-vehicle-workspace-list">
            {activePlans.map((plan) => (
              <article key={plan.id} className="list-card fleet-vehicle-workspace-task-card">
                <div className="fleet-vehicle-workspace-card-head">
                  <div>
                    <strong>{plan.title}</strong>
                    <span>{resolveServiceTypeLabel(plan.serviceType)} • {resolvePriorityLabel(plan.priority)}</span>
                  </div>
                  <span className="chip chip-soft">Ativo</span>
                </div>
                <div className="fleet-vehicle-workspace-card-meta">
                  <span>{resolvePlanCadenceLabel(plan)}</span>
                  <span>{plan.nextTask?.dueAt ? `Proximo vencimento em ${formatDateTime(plan.nextTask.dueAt)}` : "Sem proxima tarefa gerada"}</span>
                  <span>{plan.defaultEstimatedCost ? formatCurrency(plan.defaultEstimatedCost) : "Sem custo padrao"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function FleetChecklistTab({ vehicle }: { vehicle: FleetVehicleDetails }) {
  return (
    <>
      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Execucao do dia</h2>
          <span>Checklist exigido, progresso e itens pendentes.</span>
        </div>
        <div className="overview-grid fleet-vehicle-workspace-overview-grid">
          <article className="fleet-vehicle-workspace-metric-card">
            <span>Obrigatorio</span>
            <strong>{vehicle.checklistProgress.required ? "Sim" : "Nao"}</strong>
          </article>
          <article className="fleet-vehicle-workspace-metric-card">
            <span>Concluidos</span>
            <strong>{vehicle.checklistProgress.completedItems}</strong>
          </article>
          <article className="fleet-vehicle-workspace-metric-card">
            <span>Pendentes</span>
            <strong>{vehicle.checklistProgress.pendingItems}</strong>
          </article>
          <article className="fleet-vehicle-workspace-metric-card">
            <span>Templates ativos</span>
            <strong>{vehicle.checklistTemplates.filter((template) => template.isActive).length}</strong>
          </article>
        </div>
      </article>

      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Itens do checklist</h2>
          <span>Rotina configurada e status de execucao do dia.</span>
        </div>
        {vehicle.checklist.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum item carregado.</strong>
            <p>O veiculo ainda nao recebeu uma rotina de checklist para este dia.</p>
          </div>
        ) : (
          <div className="fleet-vehicle-workspace-list">
            {vehicle.checklist.map((item) => (
              <article key={`${item.itemKey}-${item.sortOrder}`} className={item.isChecked ? "list-card fleet-vehicle-workspace-check-card is-complete" : "list-card fleet-vehicle-workspace-check-card"}>
                <div className="fleet-vehicle-workspace-card-head">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.templateName ?? item.category ?? "Checklist operacional"}</span>
                  </div>
                  <span className={item.isChecked ? "chip" : "chip chip-soft fleet-chip-warning"}>
                    {item.isChecked ? "Concluido" : "Pendente"}
                  </span>
                </div>
                <div className="fleet-vehicle-workspace-card-meta">
                  <span>{item.routine === "START_OF_DAY" ? "Inicio do dia" : "Fim do dia"}</span>
                  <span>{resolveChecklistInputLabel(item.inputType)}</span>
                  <span>{resolveChecklistActionLabel(item.actionType)}</span>
                  <span>{item.checkedAt ? formatDateTime(item.checkedAt) : "Sem marcacao"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function FleetAllocationsTab({
  vehicle,
  currentAssignment
}: {
  vehicle: FleetVehicleDetails;
  currentAssignment: FleetVehicleDetails["currentAssignment"] | null;
}) {
  return (
    <>
      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Alocacao atual</h2>
          <span>Quem esta usando este carro agora e como foi validado.</span>
        </div>
        {currentAssignment ? (
          <div className="fleet-vehicle-workspace-current-assignment">
            <strong>{currentAssignment.driverName}</strong>
            <span>{currentAssignment.driverType === "FROTA" ? "Motorista da frota" : "Agregado com veiculo proprio"}</span>
            <small>{`Em uso desde ${formatDateTime(currentAssignment.startedAt)} • Validacao ${resolveValidationMethodLabel(currentAssignment.validationMethod)}`}</small>
          </div>
        ) : (
          <div className="empty-state">
            <strong>Sem motorista alocado no momento.</strong>
            <p>O veiculo esta disponivel para uma nova atribuicao operacional.</p>
          </div>
        )}
      </article>

      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Historico de alocacoes</h2>
          <span>Registro auditavel de quem usou este veiculo.</span>
        </div>
        {vehicle.assignmentHistory.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma alocacao registrada.</strong>
            <p>Assim que o veiculo entrar em uso, o historico passa a ser preenchido automaticamente.</p>
          </div>
        ) : (
          <div className="timeline">
            {vehicle.assignmentHistory.map((entry) => (
              <div key={entry.id} className="timeline-item">
                <div className="timeline-bullet" />
                <div>
                  <strong>{entry.driverName}</strong>
                  <p>{`${formatDateTime(entry.startedAt)} • ${entry.endedAt ? `Encerrado em ${formatDateTime(entry.endedAt)}` : "Alocacao ativa"}`}</p>
                  <span>{`Validacao ${resolveValidationMethodLabel(entry.validationMethod)}${entry.notes ? ` • ${entry.notes}` : ""}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function FleetHistoryTab({ vehicle }: { vehicle: FleetVehicleDetails }) {
  return (
    <>
      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Timeline do veiculo</h2>
          <span>Eventos operacionais, manutencao e mudancas relevantes.</span>
        </div>
        {vehicle.timeline.length === 0 ? (
          <div className="empty-state">
            <strong>Timeline ainda vazia.</strong>
            <p>As proximas alocacoes, manutencoes e checklists aparecerao aqui em ordem cronologica.</p>
          </div>
        ) : (
          <div className="timeline">
            {vehicle.timeline.map((entry) => (
              <div key={entry.id} className={`timeline-item ${resolveTimelineClassName(entry.tone)}`}>
                <div className="timeline-bullet" />
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.description}</p>
                  <span>{formatDateTime(entry.occurredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel panel-wide">
        <div className="panel-head">
          <h2>Quilometragem registrada</h2>
          <span>Evolucao do odometro e apontamentos do ativo.</span>
        </div>
        {vehicle.odometerLogs.length === 0 ? (
          <div className="empty-state">
            <strong>Sem log de quilometragem.</strong>
            <p>O historico de km aparece conforme a operacao registra novos apontamentos.</p>
          </div>
        ) : (
          <div className="fleet-vehicle-workspace-list">
            {vehicle.odometerLogs.map((log) => (
              <article key={log.id} className="list-card fleet-vehicle-workspace-task-card">
                <div className="fleet-vehicle-workspace-card-head">
                  <div>
                    <strong>{`${log.odometerKm} km`}</strong>
                    <span>{formatDateTime(log.recordedAt)}</span>
                  </div>
                  <span className="chip chip-soft">Odometro</span>
                </div>
                <div className="fleet-vehicle-workspace-card-meta">
                  <span>{log.notes || "Sem observacoes adicionais"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function resolveFleetStatusLabel(status: FleetVehicleDetails["status"]) {
  switch (status) {
    case "ALLOCATED":
      return "Em uso";
    case "MAINTENANCE":
      return "Em manutencao";
    case "INACTIVE":
      return "Inativo";
    default:
      return "Disponivel";
  }
}

function resolveFleetStatusClassName(status: FleetVehicleDetails["status"]) {
  if (status === "AVAILABLE") {
    return "chip";
  }

  if (status === "MAINTENANCE") {
    return "chip chip-soft fleet-chip-danger";
  }

  if (status === "ALLOCATED") {
    return "chip chip-soft fleet-chip-warning";
  }

  return "chip chip-soft";
}

function resolveChecklistLabel(vehicle: FleetVehicleDetails) {
  if (!vehicle.checklistProgress.required) {
    return "Checklist nao exigido";
  }

  if (vehicle.checklistProgress.isComplete) {
    return "Checklist em dia";
  }

  return `${vehicle.checklistProgress.pendingItems} item(ns) pendente(s)`;
}

function resolveTaskStatusLabel(status: FleetVehicleMaintenanceTask["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "Em andamento";
    case "COMPLETED":
      return "Concluida";
    case "CANCELLED":
      return "Cancelada";
    default:
      return "Aberta";
  }
}

function resolveTaskStatusClassName(status: FleetVehicleMaintenanceTask["status"], priority: FleetVehicleMaintenanceTask["priority"]) {
  if (status === "IN_PROGRESS") {
    return "chip chip-soft fleet-chip-warning";
  }

  if (priority === "CRITICAL" || priority === "HIGH") {
    return "chip chip-soft fleet-chip-danger";
  }

  return "chip chip-soft";
}

function resolveServiceTypeLabel(serviceType: FleetVehicleMaintenanceTask["serviceType"]) {
  switch (serviceType) {
    case "PREVENTIVE":
      return "Preventiva";
    case "CORRECTIVE":
      return "Corretiva";
    case "ALIGNMENT":
      return "Alinhamento";
    case "BALANCING":
      return "Balanceamento";
    case "OIL_CHANGE":
      return "Troca de oleo";
    case "TIRE":
      return "Pneu";
    case "INSPECTION":
      return "Inspecao";
    case "CLEANING":
      return "Limpeza";
    case "BODYWORK":
      return "Funilaria";
    default:
      return "Geral";
  }
}

function resolvePriorityLabel(priority: FleetVehicleMaintenanceTask["priority"]) {
  switch (priority) {
    case "LOW":
      return "Baixa";
    case "HIGH":
      return "Alta";
    case "CRITICAL":
      return "Critica";
    default:
      return "Media";
  }
}

function resolvePlanCadenceLabel(plan: FleetVehicleMaintenancePlan) {
  const parts: string[] = [];

  if (plan.intervalMonths !== undefined) {
    parts.push(`${plan.intervalMonths} mes(es)`);
  }

  if (plan.intervalKm !== undefined) {
    parts.push(`${plan.intervalKm} km`);
  }

  return parts.join(" • ") || "Sem recorrencia definida";
}

function resolveChecklistInputLabel(inputType: FleetVehicleDetails["checklist"][number]["inputType"]) {
  switch (inputType) {
    case "BOOLEAN":
      return "Confirmacao";
    case "ODOMETER":
      return "Odometro";
    case "TEXT":
      return "Texto";
    case "SELECT":
      return "Selecao";
    case "NUMBER":
      return "Numero";
    default:
      return "Foto";
  }
}

function resolveChecklistActionLabel(actionType: FleetVehicleDetails["checklist"][number]["actionType"]) {
  switch (actionType) {
    case "REQUIRE_PHOTO":
      return "Exige foto";
    case "OPEN_MAINTENANCE":
      return "Abre OS";
    case "OPEN_SUPPORT_TICKET":
      return "Aciona suporte";
    case "REQUIRE_NOTE":
      return "Exige nota";
    case "REQUIRE_NUMBER":
      return "Exige numero";
    default:
      return "Sem automacao";
  }
}

function resolveValidationMethodLabel(method?: FleetVehicleDetails["assignmentHistory"][number]["validationMethod"]) {
  switch (method) {
    case "QR_CODE":
      return "QR";
    case "PLATE":
      return "Placa";
    default:
      return "Admin";
  }
}

function resolveTimelineClassName(tone: FleetVehicleDetails["timeline"][number]["tone"]) {
  if (tone === "danger") {
    return "fleet-timeline-danger";
  }

  if (tone === "warning") {
    return "fleet-timeline-warning";
  }

  if (tone === "positive") {
    return "fleet-timeline-positive";
  }

  return "";
}
