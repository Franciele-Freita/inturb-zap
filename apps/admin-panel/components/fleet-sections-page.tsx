"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  FleetChecklistTemplate,
  FleetChecklistTemplateTask,
  FleetMaintenanceOverview,
  FleetOverviewMetrics,
  FleetVehicleOverview,
  formatCurrency,
  formatDateTime,
  request
} from "../lib/api";
import { useIsMobileLayout } from "../lib/use-mobile-layout";
import { FilterIcon, OpenIcon, SearchIcon } from "./icons/common-icons";
import {
  FleetMaintenanceLaneIcon as MaintenanceLaneIcon,
  FleetOperationLaneIcon as OperationLaneIcon
} from "./icons/domain/fleet-icons";

type FleetTab = "OVERVIEW" | "VEHICLES" | "MAINTENANCE" | "CHECKLISTS";
type FleetOperationFilter = "ALL" | "ISSUES" | "AVAILABLE";
type FleetOperationLane = "PROBLEM" | "PENDING" | "ACTIVE" | "AVAILABLE";
type FleetMaintenanceFilter = "ALL" | "URGENT" | "UPCOMING" | "OK";
type FleetMaintenanceLane = "OVERDUE" | "UPCOMING" | "OK";
type FleetMaintenanceTaskItem = FleetMaintenanceOverview["openTasks"][number];
type FleetMaintenanceQueueItem = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
  title: string;
  serviceType: FleetMaintenanceTaskItem["serviceType"];
  priority: FleetMaintenanceTaskItem["priority"];
  dueAt?: string;
  dueKm?: number;
  latestOdometerKm?: number;
  workshop?: string;
  maintenancePlanTitle?: string;
  taskStatus?: FleetMaintenanceTaskItem["status"];
  source: "TASK" | "PLAN";
  lane: FleetMaintenanceLane;
  isOverdue: boolean;
  updatedAt: string;
};

type FleetSectionsPageProps = {
  activeTab: FleetTab;
};

export function FleetSectionsPage({ activeTab }: FleetSectionsPageProps) {
  const router = useRouter();
  const isMobileLayout = useIsMobileLayout();
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleOverview[]>([]);
  const [overview, setOverview] = useState<FleetOverviewMetrics | null>(null);
  const [maintenanceOverview, setMaintenanceOverview] = useState<FleetMaintenanceOverview | null>(null);
  const [checklistTemplates, setChecklistTemplates] = useState<FleetChecklistTemplate[]>([]);
  const [pendingChecklistTemplateId, setPendingChecklistTemplateId] = useState<string | null>(null);
  const [pendingChecklistTaskId, setPendingChecklistTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando base de veiculos.");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FleetVehicleOverview["status"]>("ALL");
  const [alertFilter, setAlertFilter] = useState<"ALL" | "ALERT_ONLY" | "CHECKLIST_PENDING">("ALL");
  const [operationFilter, setOperationFilter] = useState<FleetOperationFilter>("ALL");
  const [maintenanceFilter, setMaintenanceFilter] = useState<FleetMaintenanceFilter>("ALL");

  function openVehicleCadastro(vehicleId: string) {
    router.push(`/fleet/veiculos/${vehicleId}/cadastro`);
  }

  function handleVehicleRowKeyDown(event: KeyboardEvent<HTMLElement>, vehicleId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openVehicleCadastro(vehicleId);
  }

  useEffect(() => {
    void Promise.all([
      request<FleetOverviewMetrics>("/admin/fleet/overview"),
      request<FleetVehicleOverview[]>("/admin/fleet/vehicles"),
      request<FleetMaintenanceOverview>("/admin/fleet/maintenance-overview"),
      request<FleetChecklistTemplate[]>("/admin/fleet/checklist-templates")
    ])
      .then(([nextOverview, vehicles, nextMaintenanceOverview, nextChecklistTemplates]) => {
        setOverview(nextOverview);
        setFleetVehicles(vehicles);
        setMaintenanceOverview(nextMaintenanceOverview);
        setChecklistTemplates(nextChecklistTemplates);
        setStatusMessage(`${vehicles.length} veiculo(s) carregado(s).`);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, []);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return fleetVehicles.filter((vehicle) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          vehicle.label,
          vehicle.plate,
          vehicle.color ?? "",
          vehicle.notes ?? "",
          vehicle.currentAssignment?.driverName ?? "",
          vehicle.alerts.map((alert) => alert.label).join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus = statusFilter === "ALL" || vehicle.status === statusFilter;
      const matchesAlert =
        alertFilter === "ALL" ||
        (alertFilter === "ALERT_ONLY" && vehicle.alerts.length > 0) ||
        (alertFilter === "CHECKLIST_PENDING" &&
          vehicle.checklistProgress.required &&
          !vehicle.checklistProgress.isComplete);

      return matchesSearch && matchesStatus && matchesAlert;
    });
  }, [alertFilter, fleetVehicles, searchTerm, statusFilter]);

  const availableVehicleCount = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length,
    [fleetVehicles]
  );
  const allocatedVehicleCount = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.status === "ALLOCATED").length,
    [fleetVehicles]
  );
  const maintenanceVehicleCount = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.status === "MAINTENANCE").length,
    [fleetVehicles]
  );
  const inactiveVehicleCount = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.status === "INACTIVE").length,
    [fleetVehicles]
  );
  const vehiclesWithAlertsCount = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.alerts.length > 0).length,
    [fleetVehicles]
  );
  const checklistPendingVehicleCount = useMemo(
    () =>
      fleetVehicles.filter(
        (vehicle) => vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete
      ).length,
    [fleetVehicles]
  );
  const vehicleAttentionCount = useMemo(
    () =>
      fleetVehicles.filter(
        (vehicle) =>
          vehicle.alerts.length > 0 ||
          vehicle.overdueMaintenanceCount > 0 ||
          (vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete)
      ).length,
    [fleetVehicles]
  );

  const criticalVehicles = useMemo(
    () =>
      fleetVehicles
        .filter(isCriticalOperationVehicle)
        .sort((left, right) => scoreOperationAttention(right) - scoreOperationAttention(left)),
    [fleetVehicles]
  );

  const pendingVehicles = useMemo(
    () =>
      fleetVehicles
        .filter((vehicle) => !isCriticalOperationVehicle(vehicle) && isPendingOperationVehicle(vehicle))
        .sort((left, right) => scoreOperationAttention(right) - scoreOperationAttention(left)),
    [fleetVehicles]
  );

  const maintenancePlanItems = maintenanceOverview?.plans ?? [];
  const maintenanceOpenItems = maintenanceOverview?.openTasks ?? [];
  const maintenanceOverdueItems = maintenanceOverview?.overdueTasks ?? [];
  const checklistTemplateItems = useMemo(
    () => checklistTemplates.flatMap((template) => template.items.map((item) => ({ template, item }))),
    [checklistTemplates]
  );
  const activeChecklistTaskCount = useMemo(
    () => checklistTemplateItems.filter(({ item }) => item.isActive).length,
    [checklistTemplateItems]
  );
  const checklistSupportActionCount = useMemo(
    () => checklistTemplateItems.filter(({ item }) => item.isActive && item.actionType === "OPEN_SUPPORT_TICKET").length,
    [checklistTemplateItems]
  );
  const checklistMaintenanceActionCount = useMemo(
    () => checklistTemplateItems.filter(({ item }) => item.isActive && item.actionType === "OPEN_MAINTENANCE").length,
    [checklistTemplateItems]
  );
  const checklistPhotoActionCount = useMemo(
    () => checklistTemplateItems.filter(({ item }) => item.isActive && item.actionType === "REQUIRE_PHOTO").length,
    [checklistTemplateItems]
  );
  const requiredChecklistTemplates = useMemo(
    () => checklistTemplateItems.filter(({ item }) => item.isActive && item.isRequired).length,
    [checklistTemplateItems]
  );
  const checklistVehiclesRequired = useMemo(
    () => fleetVehicles.filter((vehicle) => vehicle.checklistProgress.required),
    [fleetVehicles]
  );
  const checklistVehiclesPending = useMemo(
    () =>
      checklistVehiclesRequired
        .filter((vehicle) => !vehicle.checklistProgress.isComplete)
        .sort((left, right) => right.checklistProgress.pendingItems - left.checklistProgress.pendingItems || right.updatedAt.localeCompare(left.updatedAt)),
    [checklistVehiclesRequired]
  );
  const checklistVehiclesCompleted = useMemo(
    () =>
      checklistVehiclesRequired
        .filter((vehicle) => vehicle.checklistProgress.isComplete)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [checklistVehiclesRequired]
  );
  const checklistExecutionList = useMemo(
    () => [...checklistVehiclesPending, ...checklistVehiclesCompleted].slice(0, 8),
    [checklistVehiclesCompleted, checklistVehiclesPending]
  );
  const checklistTemplatesByRoutine = useMemo(
    () => [
      {
        key: "START_OF_DAY" as const,
        title: "Inicio da rotina",
        description: "Listas executadas antes de iniciar agenda, corridas ou operacao.",
        templates: checklistTemplates.filter((item) => item.routine === "START_OF_DAY")
      },
      {
        key: "END_OF_DAY" as const,
        title: "Fechamento do dia",
        description: "Listas executadas no retorno para devolver o veiculo e encerrar o turno.",
        templates: checklistTemplates.filter((item) => item.routine === "END_OF_DAY")
      }
    ],
    [checklistTemplates]
  );
  const operationAttentionCount = criticalVehicles.length + pendingVehicles.length;
  const maintenanceCounter = maintenanceOpenItems.length + maintenanceOverdueItems.length;
  const maintenanceServiceItems = useMemo(() => {
    const itemsById = new Map<string, FleetMaintenanceOverview["openTasks"][number]>();

    [...maintenanceOpenItems, ...maintenanceOverdueItems].forEach((item) => {
      const current = itemsById.get(item.id);

      if (!current || (!current.isOverdue && item.isOverdue)) {
        itemsById.set(item.id, item);
      }
    });

    return Array.from(itemsById.values());
  }, [maintenanceOpenItems, maintenanceOverdueItems]);
  const maintenanceQueue = useMemo(() => {
    const scheduledTaskIds = new Set(maintenanceServiceItems.map((item) => item.id));
    const taskItems: FleetMaintenanceQueueItem[] = maintenanceServiceItems.map((item) => ({
      id: item.id,
      vehicleId: item.vehicleId,
      vehicleLabel: item.vehicleLabel,
      plate: item.plate,
      title: item.title,
      serviceType: item.serviceType,
      priority: item.priority,
      dueAt: item.dueAt,
      dueKm: item.dueKm,
      latestOdometerKm: item.latestOdometerKm,
      workshop: item.workshop,
      maintenancePlanTitle: item.maintenancePlanTitle,
      taskStatus: item.status,
      source: "TASK",
      lane: resolveMaintenanceQueueLane({
        dueAt: item.dueAt,
        dueKm: item.dueKm,
        latestOdometerKm: item.latestOdometerKm,
        isOverdue: item.isOverdue,
        source: "TASK"
      }),
      isOverdue: item.isOverdue,
      updatedAt: item.updatedAt
    }));

    const planItems: FleetMaintenanceQueueItem[] = maintenancePlanItems
      .filter((item) => item.isActive)
      .filter((item) => !item.nextTask || !scheduledTaskIds.has(item.nextTask.id))
      .map((item) => ({
        id: `plan-${item.id}`,
        vehicleId: item.vehicleId,
        vehicleLabel: item.vehicleLabel,
        plate: item.plate,
        title: item.title,
        serviceType: item.serviceType,
        priority: item.priority,
        dueAt: item.nextTask?.dueAt,
        dueKm: item.nextTask?.dueKm,
        workshop: item.workshop,
        maintenancePlanTitle: item.title,
        taskStatus: item.nextTask?.status,
        source: "PLAN",
        lane: resolveMaintenanceQueueLane({
          dueAt: item.nextTask?.dueAt,
          dueKm: item.nextTask?.dueKm,
          source: "PLAN"
        }),
        isOverdue: false,
        updatedAt: item.updatedAt
      }));

    return [...taskItems, ...planItems].sort(compareMaintenanceQueueItems);
  }, [maintenancePlanItems, maintenanceServiceItems]);
  const upcomingMaintenanceItems = useMemo(
    () => [...maintenanceServiceItems].sort(compareMaintenanceItems).slice(0, 6),
    [maintenanceServiceItems]
  );
  const maintenanceUpcomingCount = maintenanceQueue.filter((item) => item.lane === "UPCOMING").length;
  const filteredMaintenanceQueue = useMemo(
    () =>
      maintenanceQueue.filter((item) => {
        if (maintenanceFilter === "URGENT") {
          return item.lane === "OVERDUE";
        }

        if (maintenanceFilter === "UPCOMING") {
          return item.lane === "UPCOMING";
        }

        if (maintenanceFilter === "OK") {
          return item.lane === "OK";
        }

        return true;
      }),
    [maintenanceFilter, maintenanceQueue]
  );
  const operationQueue = useMemo(
    () =>
      [...fleetVehicles]
        .map((vehicle) => ({ vehicle, lane: resolveOperationLane(vehicle) }))
        .sort((left, right) => compareOperationQueueEntries(left, right)),
    [fleetVehicles]
  );
  const filteredOperationQueue = useMemo(
    () =>
      operationQueue.filter((entry) => {
        if (operationFilter === "ISSUES") {
          return entry.lane === "PROBLEM" || entry.lane === "PENDING";
        }

        if (operationFilter === "AVAILABLE") {
          return entry.lane === "AVAILABLE";
        }

        return true;
      }),
    [operationFilter, operationQueue]
  );

  async function handleToggleChecklistTemplate(item: FleetChecklistTemplate) {
    setPendingChecklistTemplateId(item.id);

    try {
      const nextTemplates = await request<FleetChecklistTemplate[]>(`/admin/fleet/checklist-templates/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          routine: item.routine,
          isActive: !item.isActive
        })
      });

      setChecklistTemplates(nextTemplates);
      setStatusMessage(`Lista ${item.name} ${item.isActive ? "inativada" : "ativada"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Falha ao atualizar ${item.name}.`);
    } finally {
      setPendingChecklistTemplateId(null);
    }
  }

  async function handleToggleChecklistTask(item: FleetChecklistTemplateTask) {
    setPendingChecklistTaskId(item.id);

    try {
      const nextTemplates = await request<FleetChecklistTemplate[]>(`/admin/fleet/checklist-templates/tasks/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: item.label,
          description: item.description || undefined,
          inputType: item.inputType,
          actionType: item.actionType,
          selectOptions: item.selectOptions,
          sortOrder: item.sortOrder,
          isRequired: item.isRequired,
          isActive: !item.isActive
        })
      });

      setChecklistTemplates(nextTemplates);
      setStatusMessage(`Task ${item.label} ${item.isActive ? "inativada" : "ativada"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Falha ao atualizar ${item.label}.`);
    } finally {
      setPendingChecklistTaskId(null);
    }
  }

  const topbarActions =
    activeTab === "VEHICLES" ? (
      <Link href="/fleet/veiculos/novo" className="button-link">
        + Novo veiculo
      </Link>
    ) : activeTab === "MAINTENANCE" ? (
      <>
        <Link
          href="/fleet/manutencao/planos/novo"
          className="button-link"
          title="Abrir configuracao de plano preventivo"
        >
          + Novo plano
        </Link>
        <Link
          href="/fleet/manutencao/os/nova"
          className="button-link secondary-link"
          title="Abrir formulario de ordem de servico"
        >
          + Nova OS
        </Link>
        <Link
          href="/fleet/manutencao/km/novo"
          className="button-link secondary-link"
          title="Abrir lancamento de quilometragem"
        >
          + Registrar km
        </Link>
      </>
    ) : activeTab === "CHECKLISTS" ? (
      <Link href="/fleet/checklists/nova" className="button-link">
        + Nova lista
      </Link>
    ) : null;

  const heroMeta =
    activeTab === "VEHICLES"
      ? {
          title: "Gestão de Veiculos",
          description: "Cadastro, disponibilidade, alertas e acesso ao detalhe operacional da base.",
          pulseTitle: vehicleAttentionCount > 0 ? `${vehicleAttentionCount} ativo(s) com atencao` : "Base limpa para operacao",
          pulseMeta:
            vehicleAttentionCount > 0
              ? "Existem veiculos com alerta, checklist pendente ou manutencao fora da janela."
              : "A base de veiculos esta pronta para novas alocacoes.",
          sideTitle: `${availableVehicleCount} disponivel(is) agora`,
          sideMeta: `${allocatedVehicleCount} em operacao • ${maintenanceVehicleCount} em manutencao`
        }
      : activeTab === "MAINTENANCE"
        ? {
            title: "Cockpit de manutencao",
            description: "OS, planos preventivos, vencimento e custo operacional em uma fila unica.",
            pulseTitle: maintenanceOverdueItems.length > 0 ? `${maintenanceOverdueItems.length} vencimento(s) critico(s)` : "Sem vencimento critico no momento",
            pulseMeta:
              maintenanceOverdueItems.length > 0
                ? "Os itens vencidos precisam de priorizacao para evitar impacto na disponibilidade."
                : "A janela preventiva esta sob controle e sem risco imediato.",
            sideTitle: `${maintenancePlanItems.length} plano(s) ativo(s)`,
            sideMeta: `${maintenanceOpenItems.length} OS aberta(s) • ${maintenanceUpcomingCount} proxima(s)`
          }
        : activeTab === "CHECKLISTS"
          ? {
              title: "Central de checklists",
              description: "Modelos, execucao do dia e automacoes operacionais da rotina de frota.",
              pulseTitle:
                checklistVehiclesPending.length > 0
                  ? `${checklistVehiclesPending.length} veiculo(s) aguardando checklist`
                  : "Rotina do dia sem pendencias",
              pulseMeta:
                checklistVehiclesPending.length > 0
                  ? "Ainda existem ativos bloqueados pela rotina operacional do dia."
                  : "A base exigida para execucao esta concluida ou sem obrigatoriedade agora.",
              sideTitle: `${activeChecklistTaskCount} item(ns) ativo(s)`,
              sideMeta: `${requiredChecklistTemplates} obrigatorio(s) • ${checklistSupportActionCount} aciona(m) suporte`
            }
          : {
              title: "Cockpit da frota",
              description: "Disponibilidade, risco, manutencao e checklist em uma leitura executiva da operacao.",
              pulseTitle: operationAttentionCount > 0 ? `${operationAttentionCount} ativo(s) exigem atencao` : "Base operacional estabilizada",
              pulseMeta:
                operationAttentionCount > 0
                  ? "A fila abaixo mostra os veiculos com risco, pendencia ou oportunidade imediata."
                  : "A frota esta sem fila critica e com base pronta para escalar.",
              sideTitle: `${overview?.total ?? fleetVehicles.length} veiculo(s) na base`,
              sideMeta: `${overview?.available ?? availableVehicleCount} disponiveis • ${overview?.withAlerts ?? vehicleAttentionCount} com atencao`
            };

  const summaryCards =
    activeTab === "VEHICLES"
      ? [
          { label: "Total", value: overview?.total ?? fleetVehicles.length, meta: "Base total de veiculos." },
          { label: "Disponiveis", value: overview?.available ?? availableVehicleCount, meta: "Prontos para rodar." },
          { label: "Manutencao", value: overview?.maintenance ?? maintenanceVehicleCount, meta: "Em manutencao ativa." },
          { label: "Inativos", value: overview?.inactive ?? inactiveVehicleCount, meta: "Fora da operacao." }
        ]
      : activeTab === "MAINTENANCE"
        ? [
            { label: "OS abertas", value: maintenanceOpenItems.length, meta: "Fila em execucao" },
            { label: "Vencidas", value: maintenanceOverdueItems.length, meta: "Risco operacional" },
            { label: "Proximas", value: maintenanceUpcomingCount, meta: "Janela preventiva" },
            { label: "Planos", value: maintenancePlanItems.length, meta: "Governanca ativa" }
          ]
        : activeTab === "CHECKLISTS"
          ? [
              { label: "Itens ativos", value: activeChecklistTaskCount, meta: "Modelo vigente" },
              { label: "Pendentes hoje", value: overview?.checklistPendingToday ?? checklistVehiclesPending.length, meta: "Aguardando execucao" },
              { label: "Liberados", value: overview?.checklistCompletedToday ?? checklistVehiclesCompleted.length, meta: "Rotina concluida" },
              { label: "Obrigatorios", value: requiredChecklistTemplates, meta: "Travando operacao" }
            ]
          : [
              { label: "Total", value: overview?.total ?? fleetVehicles.length, meta: "Ativos na base" },
              { label: "Disponiveis", value: overview?.available ?? availableVehicleCount, meta: "Prontos para rodar" },
              { label: "Em uso", value: overview?.allocated ?? allocatedVehicleCount, meta: "Com motorista" },
              { label: "Alertas", value: overview?.withAlerts ?? vehicleAttentionCount, meta: "Risco ou pendencia" }
            ];

  const hasVehicleSearch = searchTerm.trim().length > 0;
  const hasVehicleViewFilters = statusFilter !== "ALL" || alertFilter !== "ALL" || hasVehicleSearch;
  const vehicleStatusIndicators = [
    {
      key: "ALL",
      label: "Todos",
      value: overview?.total ?? fleetVehicles.length,
      description: "Base total de veiculos."
    },
    {
      key: "AVAILABLE",
      label: "Disponiveis",
      value: overview?.available ?? availableVehicleCount,
      description: "Veiculos liberados para uso."
    },
    {
      key: "ALLOCATED",
      label: "Alocados",
      value: overview?.allocated ?? allocatedVehicleCount,
      description: "Veiculos em operacao."
    },
    {
      key: "MAINTENANCE",
      label: "Manutencao",
      value: overview?.maintenance ?? maintenanceVehicleCount,
      description: "Veiculos em manutencao."
    },
    {
      key: "INACTIVE",
      label: "Inativos",
      value: overview?.inactive ?? inactiveVehicleCount,
      description: "Veiculos fora de operacao."
    },
    {
      key: "WITH_ALERTS",
      label: "Com alertas",
      value: vehiclesWithAlertsCount,
      description: "Ativos que pedem atencao."
    },
    {
      key: "CHECKLIST_PENDING",
      label: "Checklist pendente",
      value: checklistPendingVehicleCount,
      description: "Aguardando rotina obrigatoria."
    }
  ];

  const heroHighlights =
    activeTab === "VEHICLES"
      ? [
          {
            label: "Total da base",
            value: overview?.total ?? fleetVehicles.length,
            meta: "Veiculos cadastrados na operacao."
          },
          {
            label: "Disponiveis",
            value: overview?.available ?? availableVehicleCount,
            meta: `${overview?.allocated ?? allocatedVehicleCount} alocado(s) agora`
          },
          {
            label: "Com atencao",
            value: vehicleAttentionCount,
            meta: `${checklistPendingVehicleCount} com checklist pendente`
          }
        ]
      : activeTab === "MAINTENANCE"
        ? [
            { label: "OS abertas", value: maintenanceOpenItems.length, meta: `${maintenancePlanItems.length} plano(s) ativo(s)` },
            { label: "Vencidas", value: maintenanceOverdueItems.length, meta: "Itens que pressionam disponibilidade" },
            { label: "Proximas", value: maintenanceUpcomingCount, meta: `${maintenancePlanItems.length} plano(s) em governanca` }
          ]
        : activeTab === "CHECKLISTS"
          ? [
              { label: "Pendentes hoje", value: checklistVehiclesPending.length, meta: `${checklistVehiclesCompleted.length} liberado(s) hoje` },
              { label: "Itens ativos", value: activeChecklistTaskCount, meta: `${requiredChecklistTemplates} template(s) obrigatorio(s)` },
              { label: "Acionam suporte", value: checklistSupportActionCount, meta: "Automacoes com resposta operacional" }
            ]
          : [
              { label: "Disponiveis", value: overview?.available ?? availableVehicleCount, meta: `${(overview?.total ?? fleetVehicles.length) - (overview?.available ?? availableVehicleCount)} fora da fila livre` },
              { label: "Com motorista", value: overview?.allocated ?? allocatedVehicleCount, meta: `${overview?.maintenance ?? maintenanceVehicleCount} em manutencao agora` },
              { label: "Prontidao", value: `${Math.round(((overview?.available ?? availableVehicleCount) / Math.max(overview?.total ?? fleetVehicles.length, 1)) * 100)}%`, meta: `${overview?.withAlerts ?? vehicleAttentionCount} ativo(s) com atencao` }
            ];

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell fleet-cargo-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>{heroMeta.title}</h1>
          <p>
            {heroMeta.description} {statusMessage}
          </p>
        </div>
        <div className="cargo-list-page-header-actions fleet-cargo-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setAlertFilter("ALL");
              setOperationFilter("ALL");
              setMaintenanceFilter("ALL");
            }}
          >
            Limpar filtros
          </button>
          {topbarActions}
        </div>
      </section>

      <section className="grid grid-single fleet-cargo-summary-section">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="fleet-cargo-highlights" aria-label="Resumo da frota">
            {heroHighlights.map((item) => (
              <article key={item.label} className="fleet-cargo-highlight-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
              </article>
            ))}
          </div>

          {activeTab === "VEHICLES" ? (
            <div className="drivers-overview-strip fleet-status-strip" aria-label="Status dos veiculos">
              {vehicleStatusIndicators.map((view) => (
                <article key={view.key} className="drivers-overview-item">
                  <span>{view.label}</span>
                  <strong>{view.value}</strong>
                  <small>{view.description}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="fleet-module-summary-grid" aria-label="Resumo da frota">
              {summaryCards.map((card) => (
                <article key={card.label} className="fleet-module-summary-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.meta}</small>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      {activeTab === "OVERVIEW" ? (
        <section className="grid grid-single">
          <article className="panel panel-wide fleet-section-card fleet-operations-queue-panel">
            <div className="panel-head fleet-section-head fleet-section-head-highlight">
              <div>
                <h2>Visao geral da frota</h2>
                <span>Fila operacional com os veiculos que precisam de atencao agora.</span>
              </div>
              <div className="fleet-operations-filter" role="tablist" aria-label="Filtro da fila operacional">
                <button
                  type="button"
                  className={operationFilter === "ALL" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setOperationFilter("ALL")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={operationFilter === "ISSUES" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setOperationFilter("ISSUES")}
                >
                  Problemas
                </button>
                <button
                  type="button"
                  className={operationFilter === "AVAILABLE" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setOperationFilter("AVAILABLE")}
                >
                  Disponiveis
                </button>
              </div>
            </div>

            <div className="fleet-queue-list">
              {filteredOperationQueue.map(({ vehicle, lane }) => {
                const chips = resolveOperationQueueChips(vehicle, lane);
                const indicator = resolveOperationLaneIndicator(lane);
                return (
                  <article
                    key={vehicle.id}
                    className={`fleet-queue-item ${indicator.itemClassName}`}
                  >
                    <div className="fleet-queue-indicator" aria-hidden="true">
                      <span className={indicator.iconClassName}>
                        <OperationLaneIcon lane={lane} />
                      </span>
                    </div>

                    <div className="fleet-queue-body">
                      <div className="fleet-queue-main">
                        <div className="fleet-action-copy">
                          <small className="fleet-queue-label">{indicator.label}</small>
                          <strong>{vehicle.label}</strong>
                          <span>
                            {vehicle.currentAssignment
                              ? `${vehicle.currentAssignment.driverName} | ${vehicle.plate}`
                              : `${vehicle.plate} | sem motorista`}
                          </span>
                        </div>

                        <div className="fleet-action-side">
                          <span className={resolveFleetStatusClassName(vehicle.status)}>{resolveFleetStatusLabel(vehicle.status)}</span>
                          <span className="fleet-action-updated">{`Atualizado ${formatDateTime(vehicle.updatedAt)}`}</span>
                        </div>
                      </div>

                      <p className="fleet-queue-summary">{resolveOperationQueueSummary(vehicle, lane)}</p>

                      <div className="chips fleet-action-chips">
                        {chips.map((chip) => (
                          <span key={chip.key} className={chip.className}>
                            {chip.label}
                          </span>
                        ))}
                      </div>

                      <div className="fleet-action-footer">
                        <Link href={`/fleet/veiculos/${vehicle.id}/overview`} className="button-link fleet-action-button">
                          Abrir veiculo
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredOperationQueue.length === 0 ? (
                <div className="empty-state fleet-panel-empty">
                  <strong>Nenhum veiculo nessa fila.</strong>
                  <p>Ajuste o filtro ou aguarde novas mudancas operacionais na frota.</p>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "VEHICLES" ? (
        <section className="grid grid-single">
          <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean fleet-section-card">
            <div className="drivers-table-head fleet-table-head">
              <div className="drivers-table-head-copy">
                <h2>Veiculos</h2>
                <span>{`${filteredVehicles.length} veiculo(s) visiveis para consulta, status e acesso ao detalhe.`}</span>
              </div>

              <div className="drivers-table-tools">
                <label className="admin-header-search drivers-inline-search">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por carro, placa, motorista ou alerta..."
                  />
                  <span className="admin-header-search-icon" aria-hidden="true">
                    <SearchIcon />
                  </span>
                </label>
                <select
                  className={
                    hasVehicleViewFilters
                      ? "select drivers-filter-toggle is-active"
                      : "select drivers-filter-toggle"
                  }
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "ALL" | FleetVehicleOverview["status"])
                  }
                  aria-label="Filtrar por status"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="AVAILABLE">Disponiveis</option>
                  <option value="ALLOCATED">Alocados</option>
                  <option value="MAINTENANCE">Manutencao</option>
                  <option value="INACTIVE">Inativos</option>
                </select>
                <select
                  className={
                    hasVehicleViewFilters
                      ? "select drivers-filter-toggle is-active"
                      : "select drivers-filter-toggle"
                  }
                  value={alertFilter}
                  onChange={(event) =>
                    setAlertFilter(event.target.value as "ALL" | "ALERT_ONLY" | "CHECKLIST_PENDING")
                  }
                  aria-label="Filtrar por alertas e checklist"
                >
                  <option value="ALL">Todos os alertas</option>
                  <option value="ALERT_ONLY">Com alertas</option>
                  <option value="CHECKLIST_PENDING">Checklist pendente</option>
                </select>
              </div>
            </div>

            <div className="fleet-queue-list">
              {!isMobileLayout && filteredVehicles.length > 0 ? (
                <table className="drivers-table">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th>KM e manutencao</th>
                    <th>Alertas</th>
                    <th>Atualizacao</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const alertPreview = vehicle.alerts.slice(0, 2);
                    const extraAlerts = vehicle.alerts.length - alertPreview.length;
                    const hasAttention =
                      vehicle.alerts.length > 0 ||
                      vehicle.overdueMaintenanceCount > 0 ||
                      (vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete);

                    return (
                      <tr
                        key={vehicle.id}
                        className={hasAttention ? "fleet-table-row is-attention" : "fleet-table-row"}
                        tabIndex={0}
                        role="link"
                        aria-label={`Abrir cadastro do veiculo ${vehicle.label}`}
                        onClick={() => openVehicleCadastro(vehicle.id)}
                        onKeyDown={(event) => handleVehicleRowKeyDown(event, vehicle.id)}
                      >
                        <td>
                          <div className="table-contact-cell fleet-table-vehicle-cell">
                            <strong>{vehicle.label}</strong>
                            <span className="fleet-table-plate">{vehicle.plate}</span>
                            <small>{[resolveFleetStatusLabel(vehicle.status), vehicle.color, vehicle.year].filter(Boolean).join(" | ")}</small>
                          </div>
                        </td>
                        <td>
                          <div className="table-contact-cell fleet-table-km-cell">
                            <strong>
                              {vehicle.latestOdometerKm !== undefined ? `${vehicle.latestOdometerKm} km` : "KM pendente"}
                            </strong>
                            <span>{resolveMaintenanceSummary(vehicle)}</span>
                            <small>{resolveChecklistLabel(vehicle)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="chips fleet-alert-stack fleet-table-alerts">
                            {alertPreview.length > 0 ? (
                              <>
                                {alertPreview.map((alert) => (
                                  <span key={alert.code} className={resolveAlertChipClassName(alert.level)}>
                                    {alert.label}
                                  </span>
                                ))}
                                {extraAlerts > 0 ? <span className="chip chip-soft">{`+${extraAlerts} alerta(s)`}</span> : null}
                              </>
                            ) : (
                              <span className="chip chip-soft">Sem alertas</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-contact-cell fleet-table-updated-cell">
                            <strong>{formatDateTime(vehicle.updatedAt)}</strong>
                            <span>{`Criado em ${formatDateTime(vehicle.createdAt)}`}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              ) : null}

              {isMobileLayout && filteredVehicles.length > 0 ? (
                <div className="drivers-mobile-list">
                  {filteredVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="list-card driver-card fleet-mobile-card"
                      tabIndex={0}
                      role="link"
                      aria-label={`Abrir cadastro do veiculo ${vehicle.label}`}
                      onClick={() => openVehicleCadastro(vehicle.id)}
                      onKeyDown={(event) => handleVehicleRowKeyDown(event, vehicle.id)}
                    >
                      <div className="driver-card-top">
                        <div className="table-contact-cell fleet-table-vehicle-cell">
                          <strong>{vehicle.label}</strong>
                          <span className="fleet-table-plate">{vehicle.plate}</span>
                          <small>{[vehicle.color, vehicle.year].filter(Boolean).join(" | ") || "Sem detalhes extras"}</small>
                        </div>
                      </div>

                      <div className="driver-card-grid">
                        <div className="driver-info-block">
                          <span className="info-label">Status</span>
                          <strong>{resolveFleetStatusLabel(vehicle.status)}</strong>
                          <span>{vehicle.currentAssignment?.driverName ?? "Sem alocacao ativa"}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Checklist</span>
                          <strong>{resolveChecklistLabel(vehicle)}</strong>
                          <span>{resolveMaintenanceSummary(vehicle)}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Alertas</span>
                          <strong>{vehicle.alerts[0]?.label ?? "Sem alertas"}</strong>
                          <span>{vehicle.alerts[0]?.detail ?? "Operacao dentro do esperado"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {filteredVehicles.length === 0 ? (
                <div className="cargo-list-empty-state fleet-vehicles-empty-state">
                  <strong>Nenhum veiculo encontrado.</strong>
                  <p>Ajuste a busca ou os filtros, ou cadastre um novo carro para a operacao.</p>
                  <div className="cargo-list-empty-state-actions fleet-vehicles-empty-actions">
                    <Link href="/fleet/veiculos/novo" className="button-link fleet-vehicles-empty-cta">
                      Cadastrar carro
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "MAINTENANCE" ? (
        <section className="grid grid-single">
          <article className="panel panel-wide fleet-section-card fleet-maintenance-queue-panel">
            <div className="panel-head fleet-section-head fleet-section-head-highlight">
              <div>
                <h2>Fila de manutencao</h2>
                <span>Itens ordenados por prioridade de intervencao.</span>
              </div>
              <div className="fleet-operations-filter" role="tablist" aria-label="Filtro da fila de manutencao">
                <button
                  type="button"
                  className={maintenanceFilter === "ALL" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("ALL")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "URGENT" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("URGENT")}
                >
                  Urgente
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "UPCOMING" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("UPCOMING")}
                >
                  Proximos
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "OK" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("OK")}
                >
                  Em dia
                </button>
              </div>
            </div>

            {filteredMaintenanceQueue.length > 0 ? (
              <div className="fleet-queue-list">
                {filteredMaintenanceQueue.map((item) => {
                  const indicator = resolveMaintenanceLaneIndicator(item.lane);
                  const chips = resolveMaintenanceQueueChips(item);

                  return (
                    <article key={item.id} className={`fleet-queue-item fleet-maintenance-queue-item ${indicator.itemClassName}`}>
                      <div className="fleet-queue-indicator">
                        <span className={indicator.iconClassName}>
                          <MaintenanceLaneIcon lane={item.lane} />
                        </span>
                      </div>

                      <div className="fleet-queue-body">
                        <div className="fleet-queue-main">
                          <div className="fleet-maintenance-queue-copy">
                            <span className="fleet-queue-label">{indicator.label}</span>
                            <strong>{item.title}</strong>
                            <span>{`${item.vehicleLabel} | ${item.plate}`}</span>
                            <p className="fleet-queue-summary">{resolveMaintenanceQueueSummary(item)}</p>
                          </div>

                          <div className="fleet-maintenance-queue-side">
                            <span className={indicator.statusClassName}>{resolveMaintenanceQueueDeadlineLabel(item)}</span>
                            <span className="fleet-maintenance-queue-updated">{`Atualizado ${formatDateTime(item.updatedAt)}`}</span>
                          </div>
                        </div>

                        {chips.length > 0 ? (
                          <div className="fleet-alert-stack fleet-priority-chips">
                            {chips.map((chip) => (
                              <span key={chip.key} className={chip.className}>
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="fleet-priority-footer fleet-maintenance-queue-footer">
                          <span>{resolveMaintenanceQueueFooter(item)}</span>
                          <Link href={`/fleet/veiculos/${item.vehicleId}/overview`} className="fleet-action-link">
                            {item.source === "TASK" ? "Abrir OS" : "Agendar"}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state fleet-panel-empty">
                <strong>Nenhum item nesta fila.</strong>
                <p>Os itens de manutencao aparecem aqui conforme surgirem OS abertas, vencimentos e proximos ciclos.</p>
              </div>
            )}
          </article>

          {false ? (
            <>
          <article className="panel panel-wide fleet-section-card fleet-maintenance-queue-panel">
            <div className="panel-head fleet-section-head fleet-section-head-highlight">
              <div>
                <h2>Fila de manutencao</h2>
                <span>Itens ordenados por prioridade de intervencao.</span>
              </div>
              <div className="fleet-operations-filter" role="tablist" aria-label="Filtro da fila de manutencao">
                <button
                  type="button"
                  className={maintenanceFilter === "ALL" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("ALL")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "URGENT" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("URGENT")}
                >
                  Urgente
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "UPCOMING" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("UPCOMING")}
                >
                  Proximos
                </button>
                <button
                  type="button"
                  className={maintenanceFilter === "OK" ? "fleet-operations-filter-item is-active" : "fleet-operations-filter-item"}
                  onClick={() => setMaintenanceFilter("OK")}
                >
                  Em dia
                </button>
              </div>
            </div>

            <div className="drivers-table-wrap">
              {!isMobileLayout ? (
                <table className="drivers-table">
                <thead>
                  <tr>
                    <th>Plano</th>
                    <th>Tipo</th>
                    <th>Periodicidade</th>
                    <th>Proximo vencimento</th>
                    <th>Status</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenancePlanItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{item.title}</strong>
                          <span>{`${item.vehicleLabel} | ${item.plate}`}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{resolveServiceTypeLabel(item.serviceType)}</strong>
                          <span>{resolvePriorityLabel(item.priority)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{resolvePlanCadenceLabel(item)}</strong>
                          <span>{item.workshop ?? "Sem oficina"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{resolveMaintenanceDueLabel(item.nextTask?.dueAt, item.nextTask?.dueKm)}</strong>
                          <span>{item.nextTask ? resolveTaskStatusLabel(item.nextTask.status) : "Sem OS gerada"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>{item.isActive ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td>
                        <Link
                          href={`/fleet/veiculos/${item.vehicleId}/overview`}
                          className="table-inline-link table-inline-icon-link fleet-table-open-link"
                          aria-label={`Abrir veiculo ${item.vehicleLabel}`}
                          title={`Abrir veiculo ${item.vehicleLabel}`}
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
                  {maintenancePlanItems.map((item) => (
                    <article key={item.id} className="list-card driver-card">
                      <div className="driver-card-top">
                        <div className="table-contact-cell">
                          <strong>{item.title}</strong>
                          <span>{`${item.vehicleLabel} | ${item.plate}`}</span>
                        </div>
                        <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>{item.isActive ? "Ativo" : "Inativo"}</span>
                      </div>

                      <div className="driver-card-grid">
                        <div className="driver-info-block">
                          <span className="info-label">Tipo</span>
                          <strong>{resolveServiceTypeLabel(item.serviceType)}</strong>
                          <span>{resolvePriorityLabel(item.priority)}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Periodicidade</span>
                          <strong>{resolvePlanCadenceLabel(item)}</strong>
                          <span>{item.workshop ?? "Sem oficina"}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Proximo vencimento</span>
                          <strong>{resolveMaintenanceDueLabel(item.nextTask?.dueAt, item.nextTask?.dueKm)}</strong>
                          <span>{item.nextTask ? resolveTaskStatusLabel(item.nextTask.status) : "Sem OS gerada"}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {maintenancePlanItems.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhum plano preventivo cadastrado.</strong>
                  <p>Crie um plano para começar a acompanhar periodicidade, vencimento e cobertura da frota.</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean fleet-section-card">
            <div className="drivers-table-head fleet-table-head">
              <div className="drivers-table-head-copy">
                <h2>Ordens de servico</h2>
                <span>Fila operacional das OS abertas e vencidas na frota.</span>
              </div>
            </div>

            <div className="drivers-table-wrap">
              {!isMobileLayout ? (
                <table className="drivers-table">
                <thead>
                  <tr>
                    <th>Titulo</th>
                    <th>Veiculo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceServiceItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{item.title}</strong>
                          <span>{resolveServiceTypeLabel(item.serviceType)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{item.vehicleLabel}</strong>
                          <span>{item.plate}</span>
                        </div>
                      </td>
                      <td>
                        <span className={resolvePriorityChipClassName(item.priority)}>{resolvePriorityLabel(item.priority)}</span>
                      </td>
                      <td>
                        <span className={item.isOverdue ? "chip chip-soft fleet-chip-danger" : resolveTaskStatusChipClassName(item.status)}>
                          {item.isOverdue ? "Vencida" : resolveTaskStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{resolveMaintenanceDueLabel(item.dueAt, item.dueKm)}</strong>
                          <span>{item.latestOdometerKm !== undefined ? `Ultimo KM ${item.latestOdometerKm}` : "KM pendente"}</span>
                        </div>
                      </td>
                      <td>
                        <Link
                          href={`/fleet/veiculos/${item.vehicleId}/overview`}
                          className="table-inline-link table-inline-icon-link fleet-table-open-link"
                          aria-label={`Abrir veiculo ${item.vehicleLabel}`}
                          title={`Abrir veiculo ${item.vehicleLabel}`}
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
                  {maintenanceServiceItems.map((item) => (
                    <article key={item.id} className="list-card driver-card">
                      <div className="driver-card-top">
                        <div className="table-contact-cell">
                          <strong>{item.title}</strong>
                          <span>{`${item.vehicleLabel} | ${item.plate}`}</span>
                        </div>
                        <span className={item.isOverdue ? "chip chip-soft fleet-chip-danger" : resolveTaskStatusChipClassName(item.status)}>
                          {item.isOverdue ? "Vencida" : resolveTaskStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="driver-card-grid">
                        <div className="driver-info-block">
                          <span className="info-label">Prioridade</span>
                          <strong>{resolvePriorityLabel(item.priority)}</strong>
                          <span>{resolveServiceTypeLabel(item.serviceType)}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Prazo</span>
                          <strong>{resolveMaintenanceDueLabel(item.dueAt, item.dueKm)}</strong>
                          <span>{item.latestOdometerKm !== undefined ? `Ultimo KM ${item.latestOdometerKm}` : "KM pendente"}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Plano</span>
                          <strong>{item.maintenancePlanTitle ?? "Avulsa"}</strong>
                          <span>{formatCurrency(item.actualCost ?? item.estimatedCost)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {maintenanceServiceItems.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhuma ordem de servico aberta.</strong>
                  <p>As OS abertas e vencidas vao aparecer aqui conforme os planos e atendimentos forem sendo gerados.</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="panel panel-wide fleet-section-card">
            <div className="panel-head fleet-section-head">
              <div>
                <h2>Proximos vencimentos</h2>
                <span>Leitura rapida dos itens que devem entrar na fila antes de virar atraso.</span>
              </div>
            </div>

            <div className="fleet-dashboard-stack">
              {upcomingMaintenanceItems.map((item) => (
                <article key={item.id} className="fleet-operation-card">
                  <div className="fleet-operation-card-head">
                    <div className="table-contact-cell">
                      <strong>{item.title}</strong>
                      <span>{`${item.vehicleLabel} | ${item.plate}`}</span>
                    </div>
                    <span className={item.isOverdue ? "chip chip-soft fleet-chip-danger" : resolvePriorityChipClassName(item.priority)}>
                      {item.isOverdue ? "Vencida" : resolvePriorityLabel(item.priority)}
                    </span>
                  </div>

                  <div className="fleet-operation-card-meta">
                    <span>{resolveMaintenanceDueLabel(item.dueAt, item.dueKm)}</span>
                    <span>{resolveServiceTypeLabel(item.serviceType)}</span>
                    <span>{item.maintenancePlanTitle ?? "OS avulsa"}</span>
                  </div>

                  <div className="fleet-operation-card-link">
                    <Link href={`/fleet/veiculos/${item.vehicleId}/overview`}>Abrir veiculo</Link>
                  </div>
                </article>
              ))}

              {upcomingMaintenanceItems.length === 0 ? (
                <div className="empty-state fleet-panel-empty">
                  <strong>Nenhum vencimento proximo agora.</strong>
                  <p>Os proximos itens criticos vao aparecer aqui conforme a frota ganhar planos e prazos.</p>
                </div>
              ) : null}
            </div>
          </article>
            </>
          ) : null}
        </section>
      ) : null}

      {activeTab === "CHECKLISTS" ? (
        <section className="fleet-checklist-layout">
          <section className="fleet-checklist-dashboard">
            <article className="panel panel-wide fleet-section-card fleet-checklist-routine-panel">
              <div className="panel-head fleet-section-head">
                <div>
                  <h2>Rotina em uso na frota</h2>
                  <span>Monte listas pre-moldadas e cadastre tasks com tipo de resposta e acao automatica.</span>
                </div>
              </div>

              <div className="fleet-checklist-routine-grid">
                {checklistTemplatesByRoutine.map((routine) => (
                  <article key={routine.key} className="fleet-checklist-routine-card">
                    <div className="fleet-checklist-routine-head">
                      <div>
                        <strong>{routine.title}</strong>
                        <span>{routine.description}</span>
                      </div>
                      <span className="fleet-section-counter">{routine.templates.length}</span>
                    </div>

                    {routine.templates.length > 0 ? (
                      <div className="fleet-checklist-category-stack">
                        {routine.templates.map((template) => (
                          <div key={template.id} className="fleet-checklist-category-block">
                            <div className="fleet-checklist-routine-head">
                              <div>
                                <strong>{template.name}</strong>
                                <span>{template.category}</span>
                              </div>
                              <span className={template.isActive ? "chip" : "chip chip-soft"}>
                                {template.isActive ? "Lista ativa" : "Lista inativa"}
                              </span>
                            </div>

                            <div className="fleet-checklist-template-actions">
                              <Link href={`/fleet/checklists/${template.id}`} className="button-link secondary-link">
                                Editar lista
                              </Link>
                              <Link href={`/fleet/checklists/${template.id}`} className="button-link secondary-link">
                                Nova task
                              </Link>
                              <button
                                type="button"
                                className="secondary"
                                disabled={pendingChecklistTemplateId === template.id}
                                onClick={() => void handleToggleChecklistTemplate(template)}
                              >
                                {pendingChecklistTemplateId === template.id
                                  ? "Salvando..."
                                  : template.isActive
                                    ? "Inativar lista"
                                    : "Ativar lista"}
                              </button>
                            </div>

                            {template.items.length > 0 ? (
                              <div className="fleet-checklist-template-list">
                                {template.items.map((item) => (
                                  <article key={item.id} className="fleet-checklist-template-item">
                                  <div className="fleet-checklist-template-copy">
                                    <span>{item.label}</span>
                                    {item.description ? <small>{item.description}</small> : null}
                                  </div>
                                  <div className="fleet-checklist-template-side">
                                    <div className="chips fleet-alert-stack">
                                      <span className="chip chip-soft">{resolveChecklistInputTypeLabel(item.inputType)}</span>
                                      <span className="chip chip-soft">{resolveChecklistActionLabel(item.actionType)}</span>
                                      <span className={item.isRequired ? "chip chip-soft fleet-chip-warning" : "chip chip-soft"}>
                                        {item.isRequired ? "Obrigatorio" : "Opcional"}
                                      </span>
                                      <span className={item.isActive ? "chip" : "chip chip-soft"}>{item.isActive ? "Ativo" : "Inativo"}</span>
                                    </div>
                                    <div className="fleet-checklist-template-actions">
                                      <Link
                                        href={`/fleet/checklists/${template.id}?taskId=${item.id}`}
                                        className="button-link secondary-link"
                                      >
                                        Editar task
                                      </Link>
                                      <button
                                        type="button"
                                        className="secondary"
                                        disabled={pendingChecklistTaskId === item.id}
                                        onClick={() => void handleToggleChecklistTask(item)}
                                      >
                                        {pendingChecklistTaskId === item.id
                                          ? "Salvando..."
                                          : item.isActive
                                            ? "Inativar task"
                                            : "Ativar task"}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                                ))}
                              </div>
                            ) : (
                              <div className="empty-state fleet-panel-empty">
                                <strong>Lista sem tasks.</strong>
                                <p>Cadastre as verificacoes que o motorista precisa concluir nesta etapa.</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state fleet-panel-empty">
                        <strong>Nenhuma lista nesta rotina.</strong>
                        <p>Crie a lista e depois cadastre as tasks que devem ser respondidas pelo motorista.</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </article>

            <aside className="fleet-checklist-sidebar">
              <article className="panel panel-wide fleet-section-card fleet-checklist-execution-panel">
                <div className="panel-head fleet-section-head">
                  <div>
                    <h2>Execucao do dia</h2>
                    <span>Quem ainda esta travado e quem ja pode seguir para a agenda.</span>
                  </div>
                </div>

                {checklistExecutionList.length > 0 ? (
                  <div className="fleet-checklist-execution-list">
                    {checklistExecutionList.map((vehicle) => (
                      <article
                        key={vehicle.id}
                        className={
                          vehicle.checklistProgress.isComplete
                            ? "fleet-checklist-execution-item is-complete"
                            : "fleet-checklist-execution-item is-pending"
                        }
                      >
                        <div className="fleet-checklist-execution-main">
                          <div className="fleet-checklist-execution-copy">
                            <strong>{vehicle.label}</strong>
                            <span>{vehicle.currentAssignment?.driverName ?? "Sem motorista alocado"}</span>
                            <small>{`${vehicle.checklistProgress.completedItems}/${vehicle.checklistProgress.totalItems} item(ns) concluido(s)`}</small>
                          </div>

                          <div className="fleet-checklist-execution-side">
                            <span
                              className={
                                vehicle.checklistProgress.isComplete ? "chip" : "chip chip-soft fleet-chip-warning"
                              }
                            >
                              {vehicle.checklistProgress.isComplete
                                ? "Liberado para agenda"
                                : `${vehicle.checklistProgress.pendingItems} pendencia(s)`}
                            </span>
                            <Link href={`/fleet/veiculos/${vehicle.id}/overview`} className="fleet-action-link">
                              Abrir veiculo
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state fleet-panel-empty">
                    <strong>Nenhum veiculo com checklist exigido agora.</strong>
                    <p>Quando a rotina do motorista exigir checklist, a execucao do dia vai aparecer aqui.</p>
                  </div>
                )}
              </article>

              <article className="panel panel-wide fleet-section-card fleet-checklist-model-panel">
                <div className="panel-head fleet-section-head">
                  <div>
                    <h2>Acoes configuradas</h2>
                    <span>Resumo das automacoes disparadas pelas respostas do checklist.</span>
                  </div>
                </div>

                <div className="fleet-checklist-model-grid">
                  <article className="fleet-checklist-model-card">
                    <div className="fleet-checklist-model-head">
                      <div>
                        <strong>Solicitar foto</strong>
                        <span>Resposta exige imagem antes de concluir a task.</span>
                      </div>
                      <span className="chip">{checklistPhotoActionCount}</span>
                    </div>
                  </article>
                  <article className="fleet-checklist-model-card">
                    <div className="fleet-checklist-model-head">
                      <div>
                        <strong>Abrir OS</strong>
                        <span>Falhas tecnicas podem abrir ordem de servico automaticamente.</span>
                      </div>
                      <span className="chip chip-soft fleet-chip-warning">{checklistMaintenanceActionCount}</span>
                    </div>
                  </article>
                  <article className="fleet-checklist-model-card">
                    <div className="fleet-checklist-model-head">
                      <div>
                        <strong>Abrir chamado</strong>
                        <span>Ocorrencias ou problemas operacionais podem virar chamado de suporte.</span>
                      </div>
                      <span className="chip chip-soft">{checklistSupportActionCount}</span>
                    </div>
                  </article>
                </div>
              </article>
            </aside>
          </section>


          {/*
            <article className="panel panel-wide fleet-section-card fleet-checklist-form-panel">
              <div className="panel-head fleet-section-head fleet-section-head-highlight">
                <div>
                  <h2>{editingChecklistTaskId ? "Editar task da lista" : "Nova task da lista"}</h2>
                  <span>Defina o tipo de resposta esperado e a acao que deve ocorrer a partir dessa resposta.</span>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setIsChecklistTaskFormOpen(false);
                    setEditingChecklistTaskId(null);
                    setChecklistTaskForm(emptyChecklistTaskForm);
                  }}
                >
                  Fechar
                </button>
              </div>

              <div className="stack">
                <div className="form-grid">
                  <label>
                    Lista
                    <select
                      className="select"
                      value={checklistTaskForm.templateId}
                      onChange={(event) =>
                        setChecklistTaskForm((current) => ({ ...current, templateId: event.target.value }))
                      }
                    >
                      <option value="">Selecione</option>
                      {checklistTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {`${template.name} • ${resolveChecklistRoutineLabel(template.routine)}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Task
                    <input
                      value={checklistTaskForm.label}
                      onChange={(event) => setChecklistTaskForm((current) => ({ ...current, label: event.target.value }))}
                      placeholder="Ex.: Verificar limpeza"
                    />
                  </label>
                  <label>
                    Tipo de resposta
                    <select
                      className="select"
                      value={checklistTaskForm.inputType}
                      onChange={(event) =>
                        setChecklistTaskForm((current) => ({
                          ...current,
                          inputType: event.target.value as ChecklistTaskFormState["inputType"]
                        }))
                      }
                    >
                      <option value="BOOLEAN">Booleano (sim/nao)</option>
                      <option value="TEXT">Texto</option>
                      <option value="SELECT">Selecao</option>
                      <option value="NUMBER">Numero</option>
                      <option value="ODOMETER">KM</option>
                    </select>
                  </label>
                  <label>
                    Acao
                    <select
                      className="select"
                      value={checklistTaskForm.actionType}
                      onChange={(event) =>
                        setChecklistTaskForm((current) => ({
                          ...current,
                          actionType: event.target.value as ChecklistTaskFormState["actionType"]
                        }))
                      }
                    >
                      <option value="NONE">Nenhuma</option>
                      <option value="REQUIRE_PHOTO">Solicitar foto</option>
                      <option value="OPEN_MAINTENANCE">Abrir OS</option>
                      <option value="OPEN_SUPPORT_TICKET">Abrir chamado</option>
                      <option value="REQUIRE_NOTE">Exigir observacao</option>
                    </select>
                  </label>
                  <label>
                    Ordem
                    <input
                      value={checklistTaskForm.sortOrder}
                      onChange={(event) => setChecklistTaskForm((current) => ({ ...current, sortOrder: event.target.value }))}
                      inputMode="numeric"
                      placeholder="10"
                    />
                  </label>
                  <label>
                    Status
                    <select
                      className="select"
                      value={checklistTaskForm.isActive ? "ACTIVE" : "INACTIVE"}
                      onChange={(event) =>
                        setChecklistTaskForm((current) => ({
                          ...current,
                          isActive: event.target.value === "ACTIVE"
                        }))
                      }
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </label>
                </div>

                <label>
                  Descricao complementar
                  <textarea
                    rows={3}
                    value={checklistTaskForm.description}
                    onChange={(event) =>
                      setChecklistTaskForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Explique o que precisa ser validado nessa task."
                  />
                </label>

                {checklistTaskForm.inputType === "SELECT" ? (
                  <label>
                    Opcoes do select
                    <input
                      value={checklistTaskForm.selectOptions}
                      onChange={(event) =>
                        setChecklistTaskForm((current) => ({ ...current, selectOptions: event.target.value }))
                      }
                      placeholder="Ex.: Limpo, Regular, Sujo"
                    />
                  </label>
                ) : null}

                <label className="table-checkbox">
                  <input
                    type="checkbox"
                    checked={checklistTaskForm.isRequired}
                    onChange={(event) =>
                      setChecklistTaskForm((current) => ({ ...current, isRequired: event.target.checked }))
                    }
                  />
                  <span>Task obrigatoria para liberar a rotina</span>
                </label>

                <div className="toolbar">
                  <button
                    type="button"
                    disabled={
                      isSavingChecklistTask ||
                      checklistTaskForm.templateId.trim().length === 0 ||
                      checklistTaskForm.label.trim().length === 0 ||
                      (checklistTaskForm.inputType === "SELECT" &&
                        checklistTaskForm.selectOptions
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean).length === 0)
                    }
                    onClick={() => void handleChecklistTaskSubmit()}
                  >
                    {isSavingChecklistTask ? "Salvando..." : editingChecklistTaskId ? "Salvar task" : "Criar task"}
                  </button>
                  {editingChecklistTaskId ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setIsChecklistTaskFormOpen(false);
                        setEditingChecklistTaskId(null);
                        setChecklistTaskForm(emptyChecklistTaskForm);
                      }}
                    >
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          */}
        </section>
      ) : null}
    </main>
  );
}

function scoreOperationAttention(vehicle: FleetVehicleOverview): number {
  let score = 0;

  if (isCriticalOperationVehicle(vehicle)) {
    score += 8;
  }

  if (vehicle.status === "MAINTENANCE") {
    score += 4;
  }

  score += vehicle.alerts.filter((alert) => alert.level === "danger").length * 4;
  score += vehicle.alerts.filter((alert) => alert.level === "warning").length * 2;
  score += vehicle.overdueMaintenanceCount * 3;
  score += vehicle.dueSoonMaintenanceCount;

  if (isPendingOperationVehicle(vehicle)) {
    score += 2;
  }

  return score;
}

function isCriticalOperationVehicle(vehicle: FleetVehicleOverview): boolean {
  return (
    vehicle.status === "MAINTENANCE" ||
    vehicle.overdueMaintenanceCount > 0 ||
    vehicle.alerts.some((alert) => alert.level === "danger")
  );
}

function isPendingOperationVehicle(vehicle: FleetVehicleOverview): boolean {
  return (
    vehicle.status === "INACTIVE" ||
    vehicle.dueSoonMaintenanceCount > 0 ||
    vehicle.alerts.some((alert) => alert.level === "warning") ||
    (vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete)
  );
}

function resolveOperationLane(vehicle: FleetVehicleOverview): FleetOperationLane {
  if (isCriticalOperationVehicle(vehicle)) {
    return "PROBLEM";
  }

  if (isPendingOperationVehicle(vehicle)) {
    return "PENDING";
  }

  if (vehicle.currentAssignment || vehicle.status === "ALLOCATED") {
    return "ACTIVE";
  }

  return "AVAILABLE";
}

function compareOperationQueueEntries(
  left: { vehicle: FleetVehicleOverview; lane: FleetOperationLane },
  right: { vehicle: FleetVehicleOverview; lane: FleetOperationLane }
): number {
  const laneWeight: Record<FleetOperationLane, number> = {
    PROBLEM: 0,
    PENDING: 1,
    ACTIVE: 2,
    AVAILABLE: 3
  };

  if (laneWeight[left.lane] !== laneWeight[right.lane]) {
    return laneWeight[left.lane] - laneWeight[right.lane];
  }

  const scoreDifference = scoreOperationAttention(right.vehicle) - scoreOperationAttention(left.vehicle);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return right.vehicle.updatedAt.localeCompare(left.vehicle.updatedAt);
}

function resolveOperationQueueChips(
  vehicle: FleetVehicleOverview,
  lane: FleetOperationLane
): Array<{ key: string; label: string; className: string }> {
  const chips: Array<{ key: string; label: string; className: string }> = [];

  if (vehicle.overdueMaintenanceCount > 0) {
    chips.push({
      key: "overdue-maintenance",
      label: `${vehicle.overdueMaintenanceCount} manut. vencida(s)`,
      className: "chip chip-soft fleet-chip-danger"
    });
  }

  if (vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete) {
    chips.push({
      key: "pending-checklist",
      label: resolveChecklistLabel(vehicle),
      className: "chip chip-soft fleet-chip-warning"
    });
  }

  for (const alert of vehicle.alerts) {
    chips.push({
      key: `alert-${alert.code}`,
      label: alert.label,
      className: resolveAlertChipClassName(alert.level)
    });
  }

  if (chips.length === 0 && vehicle.dueSoonMaintenanceCount > 0) {
    chips.push({
      key: "maintenance-soon",
      label: `${vehicle.dueSoonMaintenanceCount} manut. proxima(s)`,
      className: "chip chip-soft fleet-chip-warning"
    });
  }

  if (chips.length === 0 && lane === "ACTIVE") {
    chips.push({
      key: "active-operation",
      label: "Em operacao",
      className: "chip chip-soft"
    });
  }

  if (chips.length === 0 && lane === "AVAILABLE") {
    chips.push({
      key: "available-ready",
      label: "Pronto para uso",
      className: "chip chip-soft"
    });
  }

  return chips.slice(0, 3);
}

function resolveOperationQueueSummary(vehicle: FleetVehicleOverview, lane: FleetOperationLane): string {
  if (lane === "PROBLEM") {
    if (vehicle.overdueMaintenanceCount > 0) {
      return `${vehicle.overdueMaintenanceCount} manutencao(oes) vencida(s) exigem intervencao imediata.`;
    }

    if (vehicle.alerts.length > 0) {
      return vehicle.alerts[0]?.detail ?? "Veiculo com alerta critico na operacao.";
    }

    return "Veiculo fora do fluxo ideal de operacao.";
  }

  if (lane === "PENDING") {
    if (vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete) {
      return "Checklist do dia ainda nao foi concluido.";
    }

    if (vehicle.dueSoonMaintenanceCount > 0) {
      return `${vehicle.dueSoonMaintenanceCount} manutencao(oes) proximas precisam ser planejadas.`;
    }

    return "Veiculo com pendencia operacional antes de ficar pronto.";
  }

  if (lane === "ACTIVE") {
    return vehicle.currentAssignment
      ? `Em operacao com ${vehicle.currentAssignment.driverName} desde ${formatDateTime(vehicle.currentAssignment.startedAt)}.`
      : "Veiculo atualmente em operacao.";
  }

  return "Veiculo pronto para uso e sem alertas ativos.";
}

function resolveOperationLaneIndicator(lane: FleetOperationLane): {
  label: string;
  itemClassName: string;
  iconClassName: string;
} {
  switch (lane) {
    case "PROBLEM":
      return {
        label: "Problema",
        itemClassName: "is-critical",
        iconClassName: "fleet-queue-icon is-critical"
      };
    case "PENDING":
      return {
        label: "Pendencia",
        itemClassName: "is-warning",
        iconClassName: "fleet-queue-icon is-warning"
      };
    case "ACTIVE":
      return {
        label: "Em operacao",
        itemClassName: "is-neutral",
        iconClassName: "fleet-queue-icon is-neutral"
      };
    default:
      return {
        label: "Disponivel",
        itemClassName: "is-success",
        iconClassName: "fleet-queue-icon is-success"
      };
  }
}

function resolveMaintenanceQueueLane(input: {
  dueAt?: string;
  dueKm?: number;
  latestOdometerKm?: number;
  isOverdue?: boolean;
  source: "TASK" | "PLAN";
}): FleetMaintenanceLane {
  if (input.isOverdue) {
    return "OVERDUE";
  }

  if (input.dueAt) {
    const daysUntil = resolveDaysUntilDate(input.dueAt);

    if (daysUntil <= 0) {
      return "OVERDUE";
    }

    if (daysUntil <= 14) {
      return "UPCOMING";
    }

    return "OK";
  }

  if (input.dueKm !== undefined) {
    if (input.latestOdometerKm !== undefined) {
      const remainingKm = input.dueKm - input.latestOdometerKm;

      if (remainingKm <= 0) {
        return "OVERDUE";
      }

      if (remainingKm <= 1500) {
        return "UPCOMING";
      }

      return "OK";
    }

    return input.source === "TASK" ? "UPCOMING" : "OK";
  }

  return input.source === "TASK" ? "UPCOMING" : "OK";
}

function compareMaintenanceQueueItems(left: FleetMaintenanceQueueItem, right: FleetMaintenanceQueueItem): number {
  const laneWeight: Record<FleetMaintenanceLane, number> = {
    OVERDUE: 0,
    UPCOMING: 1,
    OK: 2
  };

  if (laneWeight[left.lane] !== laneWeight[right.lane]) {
    return laneWeight[left.lane] - laneWeight[right.lane];
  }

  if (left.priority !== right.priority) {
    const priorityWeight: Record<FleetMaintenanceTaskItem["priority"], number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3
    };

    return priorityWeight[left.priority] - priorityWeight[right.priority];
  }

  if (left.dueAt && right.dueAt) {
    return left.dueAt.localeCompare(right.dueAt);
  }

  if (left.dueAt || right.dueAt) {
    return left.dueAt ? -1 : 1;
  }

  if (left.dueKm !== undefined && right.dueKm !== undefined) {
    return left.dueKm - right.dueKm;
  }

  if (left.dueKm !== undefined || right.dueKm !== undefined) {
    return left.dueKm !== undefined ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function resolveMaintenanceLaneIndicator(lane: FleetMaintenanceLane): {
  label: string;
  itemClassName: string;
  iconClassName: string;
  statusClassName: string;
} {
  switch (lane) {
    case "OVERDUE":
      return {
        label: "Vencido",
        itemClassName: "is-critical",
        iconClassName: "fleet-queue-icon is-critical",
        statusClassName: "chip chip-soft fleet-chip-danger"
      };
    case "UPCOMING":
      return {
        label: "Proximo",
        itemClassName: "is-warning",
        iconClassName: "fleet-queue-icon is-warning",
        statusClassName: "chip chip-soft fleet-chip-warning"
      };
    default:
      return {
        label: "Em dia",
        itemClassName: "is-neutral",
        iconClassName: "fleet-queue-icon is-neutral",
        statusClassName: "chip chip-soft"
      };
  }
}

function resolveMaintenanceQueueDeadlineLabel(item: FleetMaintenanceQueueItem): string {
  if (item.dueAt) {
    const daysUntil = resolveDaysUntilDate(item.dueAt);

    if (daysUntil < 0) {
      return `Venceu ha ${Math.abs(daysUntil)} dia(s)`;
    }

    if (daysUntil === 0) {
      return "Vence hoje";
    }

    return `Vence em ${daysUntil} dia(s)`;
  }

  if (item.dueKm !== undefined) {
    if (item.latestOdometerKm !== undefined) {
      const remainingKm = item.dueKm - item.latestOdometerKm;

      if (remainingKm < 0) {
        return `${Math.abs(remainingKm)} km acima`;
      }

      if (remainingKm === 0) {
        return "No KM limite";
      }

      return `${remainingKm} km restantes`;
    }

    return `Meta ${item.dueKm} km`;
  }

  return item.lane === "OK" ? "Sem urgencia" : "Planejar agora";
}

function resolveMaintenanceQueueSummary(item: FleetMaintenanceQueueItem): string {
  if (item.lane === "OVERDUE") {
    return item.source === "TASK"
      ? "OS aberta e vencida. Exige intervencao imediata."
      : "Plano vencido sem agendamento. Trate antes de liberar o veiculo.";
  }

  if (item.lane === "UPCOMING") {
    return item.source === "TASK"
      ? "OS aberta aguardando execucao ou confirmacao."
      : "Planeje a manutencao antes do vencimento para evitar atraso.";
  }

  return "Item monitorado sem urgencia imediata.";
}

function resolveMaintenanceQueueFooter(item: FleetMaintenanceQueueItem): string {
  const parts = [resolveServiceTypeLabel(item.serviceType)];

  if (item.workshop) {
    parts.push(item.workshop);
  }

  if (item.source === "TASK" && item.taskStatus) {
    parts.push(resolveTaskStatusLabel(item.taskStatus));
  } else {
    parts.push("Plano preventivo");
  }

  return parts.join(" | ");
}

function resolveMaintenanceQueueChips(
  item: FleetMaintenanceQueueItem
): Array<{ key: string; label: string; className: string }> {
  const chips: Array<{ key: string; label: string; className: string }> = [];

  if (item.priority === "CRITICAL" || item.priority === "HIGH") {
    chips.push({
      key: "priority",
      label: resolvePriorityLabel(item.priority),
      className: resolvePriorityChipClassName(item.priority)
    });
  }

  chips.push({
    key: "service-type",
    label: resolveServiceTypeLabel(item.serviceType),
    className: "chip chip-soft"
  });

  if (item.maintenancePlanTitle && item.maintenancePlanTitle !== item.title) {
    chips.push({
      key: "plan-title",
      label: item.maintenancePlanTitle,
      className: "chip chip-soft"
    });
  } else if (item.source === "PLAN") {
    chips.push({
      key: "plan",
      label: "Plano preventivo",
      className: "chip chip-soft"
    });
  } else if (item.taskStatus && item.lane !== "OVERDUE") {
    chips.push({
      key: "status",
      label: resolveTaskStatusLabel(item.taskStatus),
      className: resolveTaskStatusChipClassName(item.taskStatus)
    });
  }

  return chips.slice(0, 3);
}

function resolveDaysUntilDate(dateValue: string): number {
  const dueDate = new Date(dateValue);
  const now = new Date();
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round((dueMidnight.getTime() - nowMidnight.getTime()) / millisecondsPerDay);
}

function compareMaintenanceItems(
  left: FleetMaintenanceOverview["openTasks"][number],
  right: FleetMaintenanceOverview["openTasks"][number]
): number {
  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  if (left.dueAt && right.dueAt) {
    return left.dueAt.localeCompare(right.dueAt);
  }

  if (left.dueAt || right.dueAt) {
    return left.dueAt ? -1 : 1;
  }

  if (left.dueKm !== undefined && right.dueKm !== undefined) {
    return left.dueKm - right.dueKm;
  }

  if (left.dueKm !== undefined || right.dueKm !== undefined) {
    return left.dueKm !== undefined ? -1 : 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function resolveFleetStatusLabel(status: FleetVehicleOverview["status"]): string {
  switch (status) {
    case "ALLOCATED":
      return "Alocado";
    case "MAINTENANCE":
      return "Manutencao";
    case "INACTIVE":
      return "Inativo";
    default:
      return "Disponivel";
  }
}

function resolveFleetStatusClassName(status: FleetVehicleOverview["status"]): string {
  if (status === "ALLOCATED") {
    return "status-pill status-pill-success";
  }

  if (status === "MAINTENANCE") {
    return "status-pill rides-status-pill-warning";
  }

  return "status-pill";
}

function resolveChecklistLabel(vehicle: FleetVehicleOverview): string {
  if (!vehicle.checklistProgress.required) {
    return "Checklist nao exigido";
  }

  if (vehicle.checklistProgress.isComplete) {
    return "Checklist concluido";
  }

  return `${vehicle.checklistProgress.pendingItems} item(ns) pendente(s)`;
}

function resolveChecklistChipClassName(vehicle: FleetVehicleOverview): string {
  if (!vehicle.checklistProgress.required) {
    return "chip chip-soft";
  }

  return vehicle.checklistProgress.isComplete ? "chip" : "chip chip-soft fleet-chip-warning";
}

function resolveMaintenanceSummary(vehicle: FleetVehicleOverview): string {
  const parts: string[] = [];

  if (vehicle.openMaintenanceCount > 0) {
    parts.push(`${vehicle.openMaintenanceCount} tarefa(s) aberta(s)`);
  }

  if (vehicle.overdueMaintenanceCount > 0) {
    parts.push(`${vehicle.overdueMaintenanceCount} vencida(s)`);
  } else if (vehicle.dueSoonMaintenanceCount > 0) {
    parts.push(`${vehicle.dueSoonMaintenanceCount} proxima(s)`);
  }

  return parts.join(" | ") || "Sem manutencoes pendentes";
}

function resolveAlertChipClassName(level: FleetVehicleOverview["alerts"][number]["level"]): string {
  if (level === "danger") {
    return "chip chip-soft fleet-chip-danger";
  }

  if (level === "warning") {
    return "chip chip-soft fleet-chip-warning";
  }

  return "chip chip-soft";
}

function resolveTaskStatusLabel(status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"): string {
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

function resolveTaskStatusChipClassName(status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"): string {
  if (status === "COMPLETED") {
    return "status-pill status-pill-success";
  }

  if (status === "IN_PROGRESS") {
    return "chip chip-soft fleet-chip-warning";
  }

  if (status === "CANCELLED") {
    return "status-pill";
  }

  return "chip chip-soft";
}

function resolvePriorityChipClassName(priority: FleetMaintenanceOverview["openTasks"][number]["priority"]): string {
  if (priority === "CRITICAL") {
    return "chip chip-soft fleet-chip-danger";
  }

  if (priority === "HIGH") {
    return "chip chip-soft fleet-chip-warning";
  }

  return "chip chip-soft";
}

function resolveMaintenanceDueLabel(dueAt?: string, dueKm?: number): string {
  if (dueAt) {
    return formatDateTime(dueAt);
  }

  if (dueKm !== undefined) {
    return `${dueKm} km`;
  }

  return "Sem vencimento";
}

function resolveChecklistInputTypeLabel(inputType: FleetChecklistTemplateTask["inputType"]): string {
  switch (inputType) {
    case "ODOMETER":
      return "KM";
    case "TEXT":
      return "Texto";
    case "SELECT":
      return "Selecao";
    case "NUMBER":
      return "Numero";
    default:
      return "Sim/Nao";
  }
}

function resolveChecklistActionLabel(actionType: FleetChecklistTemplateTask["actionType"]): string {
  switch (actionType) {
    case "REQUIRE_PHOTO":
      return "Tirar foto";
    case "OPEN_MAINTENANCE":
      return "Abrir OS";
    case "OPEN_SUPPORT_TICKET":
      return "Abrir chamado";
    case "REQUIRE_NOTE":
      return "Exigir observacao";
    default:
      return "Sem acao";
  }
}

function resolveChecklistRoutineLabel(routine: "START_OF_DAY" | "END_OF_DAY"): string {
  return routine === "END_OF_DAY" ? "Final do dia" : "Inicio do dia";
}

function resolveServiceTypeLabel(serviceType: FleetMaintenanceOverview["openTasks"][number]["serviceType"]): string {
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

function resolvePriorityLabel(priority: FleetMaintenanceOverview["openTasks"][number]["priority"]): string {
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

function resolvePlanCadenceLabel(plan: FleetMaintenanceOverview["plans"][number]): string {
  const parts: string[] = [];

  if (plan.intervalMonths !== undefined) {
    parts.push(`${plan.intervalMonths} mes(es)`);
  }

  if (plan.intervalKm !== undefined) {
    parts.push(`${plan.intervalKm} km`);
  }

  return parts.join(" | ") || "Sem recorrencia";
}
