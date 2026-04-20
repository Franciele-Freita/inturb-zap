"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DriverProfile,
  FleetVehicleDetails,
  FleetVehicleMaintenanceTask,
  FleetVehicleMaintenancePlan,
  formatCurrency,
  formatDateTime,
  request
} from "../lib/api";
import {
  FleetVehicleEditorHero,
  FleetVehicleEditorSection,
  FleetVehicleEditorSectionCard,
  FleetVehicleEditorSidebar,
  FleetVehicleEditorStepNav
} from "./fleet-vehicle-editor-shell";

type FleetVehicleFormState = {
  label: string;
  plate: string;
  color: string;
  year: string;
  status: FleetVehicleDetails["status"];
  notes: string;
};

type MaintenanceTaskFormState = {
  title: string;
  description: string;
  serviceType: FleetVehicleMaintenanceTask["serviceType"];
  priority: FleetVehicleMaintenanceTask["priority"];
  workshop: string;
  dueDate: string;
  dueKm: string;
  recurrenceMonths: string;
  recurrenceKm: string;
  currentOdometerKm: string;
  estimatedCost: string;
  actualCost: string;
  notes: string;
};

type MaintenancePlanFormState = {
  title: string;
  description: string;
  serviceType: FleetVehicleMaintenanceTask["serviceType"];
  priority: FleetVehicleMaintenanceTask["priority"];
  workshop: string;
  intervalMonths: string;
  intervalKm: string;
  firstDueDate: string;
  firstDueKm: string;
  defaultEstimatedCost: string;
  notes: string;
};

type OdometerFormState = {
  odometerKm: string;
  notes: string;
};

type FleetVehicleEditorProps = {
  mode: "create" | "edit";
  initialVehicle?: FleetVehicleDetails;
};

const emptyMaintenanceTaskForm: MaintenanceTaskFormState = {
  title: "",
  description: "",
  serviceType: "GENERAL",
  priority: "MEDIUM",
  workshop: "",
  dueDate: "",
  dueKm: "",
  recurrenceMonths: "",
  recurrenceKm: "",
  currentOdometerKm: "",
  estimatedCost: "",
  actualCost: "",
  notes: ""
};

const emptyOdometerForm: OdometerFormState = {
  odometerKm: "",
  notes: ""
};

const emptyMaintenancePlanForm: MaintenancePlanFormState = {
  title: "",
  description: "",
  serviceType: "PREVENTIVE",
  priority: "MEDIUM",
  workshop: "",
  intervalMonths: "",
  intervalKm: "",
  firstDueDate: "",
  firstDueKm: "",
  defaultEstimatedCost: "",
  notes: ""
};

function toFleetVehicleFormState(vehicle?: FleetVehicleDetails): FleetVehicleFormState {
  return {
    label: vehicle?.label ?? "",
    plate: vehicle?.plate ?? "",
    color: vehicle?.color ?? "",
    year: vehicle?.year ? String(vehicle.year) : "",
    status: vehicle?.status ?? "AVAILABLE",
    notes: vehicle?.notes ?? ""
  };
}

function toMaintenancePlanFormState(plan?: FleetVehicleMaintenancePlan): MaintenancePlanFormState {
  return {
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    serviceType: plan?.serviceType ?? "PREVENTIVE",
    priority: plan?.priority ?? "MEDIUM",
    workshop: plan?.workshop ?? "",
    intervalMonths: plan?.intervalMonths ? String(plan.intervalMonths) : "",
    intervalKm: plan?.intervalKm ? String(plan.intervalKm) : "",
    firstDueDate: plan?.firstDueAt ? new Date(plan.firstDueAt).toISOString().slice(0, 10) : "",
    firstDueKm: plan?.firstDueKm ? String(plan.firstDueKm) : "",
    defaultEstimatedCost: plan?.defaultEstimatedCost ? String(plan.defaultEstimatedCost) : "",
    notes: plan?.notes ?? ""
  };
}

export function FleetVehicleEditor({ mode, initialVehicle }: FleetVehicleEditorProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<FleetVehicleDetails | undefined>(initialVehicle);
  const [form, setForm] = useState<FleetVehicleFormState>(() => toFleetVehicleFormState(initialVehicle));
  const [activeSection, setActiveSection] = useState<FleetVehicleEditorSection>("profile");
  const [fleetDrivers, setFleetDrivers] = useState<DriverProfile[]>([]);
  const [assignmentDriverId, setAssignmentDriverId] = useState("");
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceTaskFormState>(emptyMaintenanceTaskForm);
  const [maintenancePlanForm, setMaintenancePlanForm] = useState<MaintenancePlanFormState>(emptyMaintenancePlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [odometerForm, setOdometerForm] = useState<OdometerFormState>(() => ({
    odometerKm: initialVehicle?.latestOdometerKm ? String(initialVehicle.latestOdometerKm) : "",
    notes: ""
  }));
  const [statusMessage, setStatusMessage] = useState(
    mode === "create"
      ? "Cadastre um carro da operacao em uma pagina dedicada e organize a disponibilidade da frota."
      : "Atualize o carro da frota e gerencie manutencao e km sem misturar isso com a listagem."
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isSavingOdometer, setIsSavingOdometer] = useState(false);

  useEffect(() => {
    void request<DriverProfile[]>("/admin/fleet/drivers")
      .then((drivers) => setFleetDrivers(drivers))
      .catch((error: Error) => setStatusMessage((current) => `${current} ${error.message}`));
  }, []);

  const activeFleetDrivers = useMemo(
    () => fleetDrivers.filter((driver) => driver.operationalStatus === "ACTIVE"),
    [fleetDrivers]
  );
  const canAssign = mode === "edit" && !!vehicle && (form.status === "AVAILABLE" || form.status === "ALLOCATED");
  const canSubmit = form.label.trim().length > 0 && form.plate.trim().length > 0 && !isSaving;
  const openTasks = vehicle?.maintenanceTasks.filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED") ?? [];
  const alerts = vehicle?.alerts ?? [];
  const maintenancePlans = vehicle?.maintenancePlans ?? [];
  const assignmentHistory = vehicle?.assignmentHistory ?? [];
  const timeline = vehicle?.timeline ?? [];
  const activeMaintenancePlans = maintenancePlans.filter((plan) => plan.isActive).length;
  const currentOdometerLabel =
    vehicle?.latestOdometerKm !== undefined ? `${vehicle.latestOdometerKm} km` : "KM pendente";
  const readinessSummary = vehicle
    ? alerts.length > 0
      ? `${alerts.length} alerta(s) exigem atencao`
      : vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete
        ? `${vehicle.checklistProgress.pendingItems} item(ns) pendente(s) no checklist`
        : "Operação sem pendências no momento"
    : "Salve o veículo para liberar operação, manutenção e histórico";

  const vehicleName = form.label.trim() || "Veiculo sem nome";
  const operationalStatusLabel = resolveFleetStatusLabel(form.status);
  const currentAssignmentLabel =
    vehicle?.currentAssignment?.driverName ??
    (form.status === "AVAILABLE" ? "Disponivel para alocacao" : "Sem motorista alocado");
  const checkinCode = vehicle?.checkinCode ?? "Pendente";
  const readinessReady =
    !!vehicle &&
    alerts.length === 0 &&
    (vehicle.overdueMaintenanceCount ?? 0) === 0 &&
    (!vehicle.checklistProgress.required || vehicle.checklistProgress.isComplete);
  const readinessLabel =
    mode === "create" ? "Cadastro inicial" : readinessReady ? "Pronto para operar" : "Exige atencao";
  const spotlightTitle =
    mode === "create"
      ? "Novo veiculo da frota"
      : readinessReady
        ? "Veiculo pronto para operar"
        : "Veiculo com atencao operacional";
  const spotlightDescription =
    mode === "create"
      ? "Salve o cadastro principal para liberar alocacao, manutencao e historico."
      : readinessSummary;
  const sidebarStatusChecks = [
    {
      label: "Cadastro principal completo",
      complete: form.label.trim().length > 0 && form.plate.trim().length > 0
    },
    {
      label: "Status operacional definido",
      complete: !!form.status
    },
    {
      label: "Check-in liberado",
      complete: !!vehicle?.checkinCode
    },
    {
      label: "Sem manutencao vencida",
      complete: mode === "edit" ? (vehicle?.overdueMaintenanceCount ?? 0) === 0 : false
    }
  ];
  const vehicleFormId = "fleet-vehicle-editor-form";

  function applyVehicleState(nextVehicle: FleetVehicleDetails) {
    setVehicle(nextVehicle);
    setForm(toFleetVehicleFormState(nextVehicle));
    setOdometerForm((current) => ({
      odometerKm: nextVehicle.latestOdometerKm ? String(nextVehicle.latestOdometerKm) : current.odometerKm,
      notes: current.notes
    }));
  }

  function updateField<Key extends keyof FleetVehicleFormState>(field: Key, value: FleetVehicleFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(mode === "create" ? "Salvando novo carro da frota..." : "Salvando alteracoes do carro...");

    try {
      const payload = {
        label: form.label.trim(),
        plate: form.plate.trim().toUpperCase(),
        color: form.color.trim() || undefined,
        year: form.year.trim() ? Number(form.year) : undefined,
        status: form.status,
        notes: form.notes.trim() || undefined
      };

      const saved =
        mode === "create"
          ? await request<FleetVehicleDetails>("/admin/fleet/vehicles", {
              method: "POST",
              body: JSON.stringify(payload)
            })
          : await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicle?.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload)
            });

      applyVehicleState(saved);
      setStatusMessage(
        mode === "create"
          ? `Carro ${saved.label} criado com sucesso.`
          : `Carro ${saved.label} atualizado com sucesso.`
      );

      if (mode === "create") {
        router.push(`/fleet/veiculos/${saved.id}/overview`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar carro da frota.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssign() {
    if (!vehicle || !assignmentDriverId) {
      return;
    }

    setIsAssigning(true);
    setStatusMessage("Alocando carro da frota...");

    try {
      const updated = await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicle.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: assignmentDriverId })
      });

      setAssignmentDriverId("");
      applyVehicleState(updated);
      setStatusMessage(`Carro ${updated.label} alocado para ${updated.currentAssignment?.driverName}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao alocar carro.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleUnassign() {
    if (!vehicle) {
      return;
    }

    setIsUnassigning(true);
    setStatusMessage("Encerrando alocacao do carro...");

    try {
      const updated = await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicle.id}/unassign`, {
        method: "POST"
      });

      applyVehicleState(updated);
      setStatusMessage(`Carro ${updated.label} devolvido para disponibilidade.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao desalocar carro.");
    } finally {
      setIsUnassigning(false);
    }
  }

  async function handleCreateMaintenanceTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) {
      return;
    }

    setIsCreatingTask(true);
    try {
      const updated = await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicle.id}/maintenance-tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: maintenanceForm.title,
          description: maintenanceForm.description || undefined,
          serviceType: maintenanceForm.serviceType,
          priority: maintenanceForm.priority,
          workshop: maintenanceForm.workshop || undefined,
          dueDate: maintenanceForm.dueDate || undefined,
          dueKm: maintenanceForm.dueKm ? Number(maintenanceForm.dueKm) : undefined,
          recurrenceMonths: maintenanceForm.recurrenceMonths ? Number(maintenanceForm.recurrenceMonths) : undefined,
          recurrenceKm: maintenanceForm.recurrenceKm ? Number(maintenanceForm.recurrenceKm) : undefined,
          currentOdometerKm: maintenanceForm.currentOdometerKm ? Number(maintenanceForm.currentOdometerKm) : undefined,
          estimatedCost: maintenanceForm.estimatedCost ? Number(maintenanceForm.estimatedCost) : undefined,
          actualCost: maintenanceForm.actualCost ? Number(maintenanceForm.actualCost) : undefined,
          notes: maintenanceForm.notes || undefined
        })
      });

      applyVehicleState(updated);
      setMaintenanceForm(emptyMaintenanceTaskForm);
      setStatusMessage(`Tarefa de manutencao criada para ${updated.label}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao criar tarefa de manutencao.");
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleCreateMaintenancePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) {
      return;
    }

    setIsCreatingPlan(true);
    try {
      const updated = await request<FleetVehicleDetails>(
        editingPlanId
          ? `/admin/fleet/vehicles/${vehicle.id}/maintenance-plans/${editingPlanId}`
          : `/admin/fleet/vehicles/${vehicle.id}/maintenance-plans`,
        {
        method: editingPlanId ? "PATCH" : "POST",
        body: JSON.stringify({
          title: maintenancePlanForm.title,
          description: maintenancePlanForm.description || undefined,
          serviceType: maintenancePlanForm.serviceType,
          priority: maintenancePlanForm.priority,
          workshop: maintenancePlanForm.workshop || undefined,
          intervalMonths: maintenancePlanForm.intervalMonths ? Number(maintenancePlanForm.intervalMonths) : undefined,
          intervalKm: maintenancePlanForm.intervalKm ? Number(maintenancePlanForm.intervalKm) : undefined,
          firstDueDate: maintenancePlanForm.firstDueDate || undefined,
          firstDueKm: maintenancePlanForm.firstDueKm ? Number(maintenancePlanForm.firstDueKm) : undefined,
          defaultEstimatedCost: maintenancePlanForm.defaultEstimatedCost ? Number(maintenancePlanForm.defaultEstimatedCost) : undefined,
          notes: maintenancePlanForm.notes || undefined
        })
      });

      applyVehicleState(updated);
      setMaintenancePlanForm(emptyMaintenancePlanForm);
      setEditingPlanId(null);
      setStatusMessage(
        editingPlanId
          ? `Plano de manutencao atualizado para ${updated.label}.`
          : `Plano de manutencao criado para ${updated.label}.`
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar plano de manutencao.");
    } finally {
      setIsCreatingPlan(false);
    }
  }

  function handleEditPlan(plan: FleetVehicleMaintenancePlan) {
    setEditingPlanId(plan.id);
    setMaintenancePlanForm(toMaintenancePlanFormState(plan));
    setStatusMessage(`Editando plano ${plan.title}.`);
  }

  function handleCancelPlanEdit() {
    setEditingPlanId(null);
    setMaintenancePlanForm(emptyMaintenancePlanForm);
    setStatusMessage("Edicao do plano cancelada.");
  }

  async function handleTogglePlan(plan: FleetVehicleMaintenancePlan) {
    if (!vehicle) {
      return;
    }

    setPendingPlanId(plan.id);
    try {
      const updated = await request<FleetVehicleDetails>(
        `/admin/fleet/vehicles/${vehicle.id}/maintenance-plans/${plan.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !plan.isActive })
        }
      );

      applyVehicleState(updated);
      setStatusMessage(`Plano ${plan.title} ${plan.isActive ? "inativado" : "ativado"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar plano.");
    } finally {
      setPendingPlanId(null);
    }
  }

  async function handleGeneratePlanTask(plan: FleetVehicleMaintenancePlan) {
    if (!vehicle) {
      return;
    }

    setPendingPlanId(plan.id);
    try {
      const updated = await request<FleetVehicleDetails>(
        `/admin/fleet/vehicles/${vehicle.id}/maintenance-plans/${plan.id}/generate-task`,
        {
          method: "POST"
        }
      );

      applyVehicleState(updated);
      setStatusMessage(`Ordem de servico gerada a partir do plano ${plan.title}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao gerar ordem de servico.");
    } finally {
      setPendingPlanId(null);
    }
  }

  async function handleMaintenanceStatusChange(task: FleetVehicleMaintenanceTask, status: FleetVehicleMaintenanceTask["status"]) {
    if (!vehicle) {
      return;
    }

    setPendingTaskId(task.id);
    try {
      const updated = await request<FleetVehicleDetails>(
        `/admin/fleet/vehicles/${vehicle.id}/maintenance-tasks/${task.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status })
        }
      );

      applyVehicleState(updated);
      setStatusMessage(`Tarefa "${task.title}" atualizada.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar tarefa.");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleCreateOdometerLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) {
      return;
    }

    setIsSavingOdometer(true);
    try {
      const updated = await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${vehicle.id}/odometer-logs`, {
        method: "POST",
        body: JSON.stringify({
          odometerKm: Number(odometerForm.odometerKm),
          notes: odometerForm.notes || undefined
        })
      });

      applyVehicleState(updated);
      setOdometerForm({ odometerKm: updated.latestOdometerKm ? String(updated.latestOdometerKm) : "", notes: "" });
      setStatusMessage(`KM do carro ${updated.label} registrado.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar kilometragem.");
    } finally {
      setIsSavingOdometer(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="driver-editor-shell">
        <div className="driver-editor-main">
          <section className="driver-editor-hero">
            <FleetVehicleEditorHero
              mode={mode}
              vehicleId={vehicle?.id}
              vehicleName={vehicleName}
              statusMessage={statusMessage}
              spotlightTitle={spotlightTitle}
              spotlightDescription={spotlightDescription}
              operationalStatusLabel={operationalStatusLabel}
              currentOdometerLabel={currentOdometerLabel}
              currentAssignmentLabel={currentAssignmentLabel}
            />
          </section>

      <section className="fleet-editor-summary-grid">
        <article className="fleet-editor-summary-card">
          <span className="fleet-editor-summary-label">Operação</span>
          <strong>{resolveFleetStatusLabel(form.status)}</strong>
          <p>{vehicle?.currentAssignment?.driverName ?? "Sem motorista alocado"}</p>
        </article>
        <article className="fleet-editor-summary-card">
          <span className="fleet-editor-summary-label">Prontidão</span>
          <strong>{readinessSummary}</strong>
          <p>
            {mode === "create"
              ? "O checklist e os alertas ficam ativos depois do primeiro salvamento."
              : vehicle?.checklistProgress.required
                ? `${vehicle.checklistProgress.completedItems}/${vehicle.checklistProgress.totalItems} item(ns) do checklist de hoje`
                : "Checklist diário não exigido neste momento"}
          </p>
        </article>
        <article className="fleet-editor-summary-card">
          <span className="fleet-editor-summary-label">Manutenção</span>
          <strong>
            {mode === "create"
              ? "Sem agenda ainda"
              : `${openTasks.length} OS aberta(s) • ${activeMaintenancePlans} plano(s) ativo(s)`}
          </strong>
          <p>
            {mode === "create"
              ? "Planos, ordens de servico e KM aparecem depois do cadastro."
              : `${vehicle?.overdueMaintenanceCount ?? 0} vencida(s) • ${vehicle?.dueSoonMaintenanceCount ?? 0} proxima(s)`}
          </p>
        </article>
        <article className="fleet-editor-summary-card">
          <span className="fleet-editor-summary-label">Quilometragem</span>
          <strong>{currentOdometerLabel}</strong>
          <p>
            {mode === "create"
              ? "Registros de hodometro serao liberados apos salvar."
              : `${vehicle?.odometerLogs.length ?? 0} registro(s) • codigo ${vehicle?.checkinCode ?? "pendente"}`}
          </p>
        </article>
      </section>

      {mode === "edit" ? (
        <FleetVehicleEditorStepNav activeSection={activeSection} onSectionChange={setActiveSection} />
      ) : null}

      <div className="driver-editor-content">
        <div className="driver-editor-sections">
          <section className="grid grid-single">
        {(mode === "create" || activeSection === "profile") ? (
        <article id="fleet-maintenance-plan-form" className="panel panel-wide">
          <div className="panel-head">
            <h2>{mode === "create" ? "Dados do veiculo" : "Informacoes do veiculo"}</h2>
            <div className="fleet-editor-panel-copy">
              <span>{mode === "create" ? "Preencha as informacoes basicas e defina o status inicial do veiculo." : "Dados basicos, leitura de operacao e contexto do cadastro."}</span>
              {mode === "edit" ? <small>{`Ultima atualizacao em ${vehicle ? formatDateTime(vehicle.updatedAt) : "-"}`}</small> : null}
            </div>
          </div>

          <form id={vehicleFormId} className="stack" onSubmit={(event) => void handleSubmit(event)}>
            <div className="fleet-editor-form-shell">
              <section className="fleet-editor-form-section">
                <div className="fleet-editor-form-head">
                  <strong>Dados do veiculo</strong>
                  <span>Informacoes principais do registro.</span>
                </div>
                <div className="form-grid">
                  <label>
                    Modelo do veiculo
                    <input value={form.label} onChange={(event) => updateField("label", event.target.value)} placeholder="Ex.: HB20 Hatch 07" />
                  </label>
                  <label>
                    Placa
                    <input value={form.plate} onChange={(event) => updateField("plate", event.target.value.toUpperCase())} placeholder="ABC1D23" />
                  </label>
                  <label>
                    Cor
                    <input value={form.color} onChange={(event) => updateField("color", event.target.value)} placeholder="Cinza" />
                  </label>
                  <label>
                    Ano
                    <input value={form.year} onChange={(event) => updateField("year", event.target.value)} inputMode="numeric" placeholder="2026" />
                  </label>
                </div>
              </section>

              <section className="fleet-editor-form-section">
                <div className="fleet-editor-form-head">
                  <strong>Status do veiculo</strong>
                  <span>Situacao atual do veiculo na frota.</span>
                </div>
                <div className="form-grid">
                  <label>
                    Status
                    <select className="select" value={form.status} onChange={(event) => updateField("status", event.target.value as FleetVehicleDetails["status"])}>
                      <option value="AVAILABLE">Disponivel</option>
                      <option value="ALLOCATED">Alocado</option>
                      <option value="MAINTENANCE">Manutencao</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>

            <div className="drivers-overview-strip fleet-editor-context-strip fleet-editor-context-strip-grid-2">
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>Operacao</span>
                <strong>{operationalStatusLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item is-name">
                <span>Motorista atual</span>
                <strong>{currentAssignmentLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>KM atual</span>
                <strong>{currentOdometerLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item is-code">
                <span>Check-in</span>
                <strong>{checkinCode}</strong>
              </article>
            </div>

            <label>
              Observacoes
              <textarea rows={4} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Ex: veiculo reserva, restricoes ou qualquer informacao relevante." />
            </label>

            <div className="toolbar">
              <button type="submit" disabled={!canSubmit}>{isSaving ? "Salvando..." : "Salvar"}</button>
              <Link href="/fleet/veiculos" className="button-link secondary-link">Voltar para veiculos</Link>
            </div>
          </form>
        </article>
        ) : null}

        {mode === "create" ? (
          <article className="panel panel-wide">
            <div className="panel-head">
              <h2>Proximos modulos</h2>
              <span>Assim que o veiculo for salvo, a gestao completa fica disponivel.</span>
            </div>
            <div className="fleet-editor-onboarding-grid">
              <article className="fleet-editor-onboarding-card">
                <strong>Operacao</strong>
                <span>Alocacao por motorista, checklist do dia e alertas operacionais.</span>
              </article>
              <article className="fleet-editor-onboarding-card">
                <strong>Manutencao</strong>
                <span>Planos preventivos, OS abertas, vencimentos por data e KM.</span>
              </article>
              <article className="fleet-editor-onboarding-card">
                <strong>Historico</strong>
                <span>Timeline do veiculo, historico de uso e trilha operacional.</span>
              </article>
            </div>
          </article>
        ) : null}

        {(mode === "edit" && activeSection === "operations") ? (
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Operacao</h2>
            <span>Alocacao atual, checklist do turno e alertas operacionais do veiculo.</span>
          </div>

          <div className="stack">
            <div className="drivers-overview-strip fleet-editor-context-strip fleet-editor-context-strip-grid-3">
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>Status</span>
                <strong>{operationalStatusLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item is-name">
                <span>Motorista</span>
                <strong>{currentAssignmentLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item is-date">
                <span>Desde</span>
                <strong>{vehicle?.currentAssignment ? formatDateTime(vehicle.currentAssignment.startedAt) : "Nao iniciado"}</strong>
              </article>
            </div>

            <div className="form-grid">
              <label>
                Selecionar motorista
                <select className="select" value={assignmentDriverId} disabled={!canAssign || isAssigning} onChange={(event) => setAssignmentDriverId(event.target.value)}>
                  <option value="">Selecionar motorista...</option>
                  {activeFleetDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.currentFleetVehicle ? ` - atualmente com ${driver.currentFleetVehicle.label}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="toolbar">
              <button type="button" disabled={!canAssign || !assignmentDriverId || isAssigning} onClick={() => void handleAssign()}>
                {isAssigning ? "Salvando..." : vehicle?.currentAssignment ? "Trocar motorista" : "Alocar veiculo"}
              </button>
              {vehicle?.currentAssignment ? <button type="button" className="secondary" disabled={isUnassigning} onClick={() => void handleUnassign()}>{isUnassigning ? "Desalocando..." : "Desalocar"}</button> : null}
            </div>

            <div className="drivers-overview-strip fleet-editor-context-strip fleet-editor-context-strip-grid-3 fleet-editor-context-strip-compact">
              <article className={!vehicle?.checklistProgress.required || vehicle.checklistProgress.isComplete ? "drivers-overview-item fleet-editor-context-item fleet-overview-item-success" : "drivers-overview-item fleet-editor-context-item fleet-overview-item-warning"}>
                <span>Checklist</span>
                <strong>{vehicle?.checklistProgress.required ? `${vehicle.checklistProgress.completedItems}/${vehicle.checklistProgress.totalItems}` : "Tudo OK"}</strong>
              </article>
              <article className={alerts.length > 0 ? "drivers-overview-item fleet-editor-context-item fleet-overview-item-warning" : "drivers-overview-item fleet-editor-context-item fleet-overview-item-success"}>
                <span>Alertas</span>
                <strong>{alerts.length}</strong>
              </article>
              <article className={(vehicle?.overdueMaintenanceCount ?? 0) > 0 ? "drivers-overview-item fleet-editor-context-item fleet-overview-item-danger" : "drivers-overview-item fleet-editor-context-item fleet-overview-item-success"}>
                <span>Manut. vencidas</span>
                <strong>{vehicle?.overdueMaintenanceCount ?? 0}</strong>
              </article>
            </div>
          </div>
        </article>
        ) : null}

        {(mode === "edit" && activeSection === "maintenance") ? (
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Manutencao</h2>
            <span>Planos preventivos, ordens de servico e registros de KM em um unico contexto.</span>
          </div>

          <div className="stack">
            <div className="drivers-overview-strip fleet-editor-context-strip fleet-editor-context-strip-grid-2">
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>Planos ativos</span>
                <strong>{activeMaintenancePlans}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>OS abertas</span>
                <strong>{openTasks.length}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>KM atual</span>
                <strong>{currentOdometerLabel}</strong>
              </article>
              <article className="drivers-overview-item fleet-editor-context-item">
                <span>Logs</span>
                <strong>{vehicle?.odometerLogs.length ?? 0}</strong>
              </article>
            </div>

            <div className="fleet-editor-action-callout">
              <strong>Operacao tecnica fora do cadastro</strong>
              <span>Crie planos, OS e lancamentos de KM em fluxos proprios e use o cadastro como painel de acompanhamento.</span>
              <div className="toolbar">
                <Link href={`/fleet/manutencao/planos/novo?vehicleId=${vehicle?.id ?? ""}`} className="button-link">
                  + Novo plano
                </Link>
                <Link href={`/fleet/manutencao/os/nova?vehicleId=${vehicle?.id ?? ""}`} className="button-link secondary-link">
                  + Nova OS
                </Link>
                <Link href={`/fleet/manutencao/km/novo?vehicleId=${vehicle?.id ?? ""}`} className="button-link secondary-link">
                  Registrar km
                </Link>
              </div>
            </div>

            <div className="drivers-mobile-list">
              {maintenancePlans.map((plan) => (
                <article key={plan.id} className="list-card driver-card">
                  <div className="driver-card-top">
                    <div className="table-contact-cell">
                      <strong>{plan.title}</strong>
                      <span>{`${resolveServiceTypeLabel(plan.serviceType)} - ${resolvePriorityLabel(plan.priority)}`}</span>
                    </div>
                    <span className={plan.isActive ? "status-pill status-pill-success" : "status-pill"}>{plan.isActive ? "Ativo" : "Inativo"}</span>
                  </div>
                  <div className="driver-card-grid">
                    <div className="driver-info-block">
                      <span className="info-label">Regra</span>
                      <strong>{resolvePlanCadenceLabel(plan)}</strong>
                      <span>{plan.workshop ?? "Sem oficina informada"}</span>
                    </div>
                    <div className="driver-info-block">
                      <span className="info-label">Proxima OS</span>
                      <strong>{plan.nextTask ? resolveTaskStatusLabel(plan.nextTask.status) : "Nao gerada"}</strong>
                      <span>{plan.nextTask?.dueAt ? formatDateTime(plan.nextTask.dueAt) : plan.nextTask?.dueKm ? `${plan.nextTask.dueKm} km` : "Sem vencimento calculado"}</span>
                    </div>
                  </div>
                </article>
              ))}
              {maintenancePlans.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhum plano preventivo cadastrado.</strong>
                  <p>Defina a regra de manutencao para o veiculo acompanhar vencimento por tempo ou km.</p>
                </div>
              ) : null}
            </div>

            <div className="drivers-mobile-list">
              {vehicle?.maintenanceTasks.map((task) => (
                <article key={task.id} className="list-card driver-card">
                  <div className="driver-card-top">
                    <div className="table-contact-cell">
                      <strong>{task.title}</strong>
                      <span>{`${resolveServiceTypeLabel(task.serviceType)} - ${resolvePriorityLabel(task.priority)}`}</span>
                    </div>
                    <span className="status-pill">{resolveTaskStatusLabel(task.status)}</span>
                  </div>
                  <div className="driver-card-grid">
                    <div className="driver-info-block">
                      <span className="info-label">Prazo</span>
                      <strong>{task.dueAt ? formatDateTime(task.dueAt) : "Sem data definida"}</strong>
                      <span>{task.dueKm ? `${task.dueKm} km` : "Sem meta de km"}</span>
                    </div>
                    <div className="driver-info-block">
                      <span className="info-label">Custos</span>
                      <strong>{formatCurrency(task.actualCost ?? task.estimatedCost)}</strong>
                      <span>{task.workshop ?? "Sem oficina informada"}</span>
                    </div>
                  </div>
                </article>
              ))}
              {vehicle?.maintenanceTasks.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhuma tarefa cadastrada.</strong>
                  <p>As ordens de servico abertas e concluidas vao aparecer aqui.</p>
                </div>
              ) : null}
            </div>

            <div className="drivers-mobile-list">
              {vehicle?.odometerLogs.map((log) => (
                <article key={log.id} className="list-card driver-card">
                  <div className="driver-card-top">
                    <div className="table-contact-cell">
                      <strong>{`${log.odometerKm} km`}</strong>
                      <span>{formatDateTime(log.recordedAt)}</span>
                    </div>
                  </div>
                  <p className="helper-text">{log.notes ?? "Sem observacoes."}</p>
                </article>
              ))}
              {vehicle?.odometerLogs.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhum lancamento de quilometragem.</strong>
                  <p>Os registros de KM vao aparecer aqui assim que o primeiro log for salvo.</p>
                </div>
              ) : null}
            </div>
          </div>
        </article>
        ) : null}

        {(mode === "edit" && activeSection === "history") ? (
        <article className="panel panel-wide">
          <div className="panel-head">
            <h2>Historico</h2>
            <span>Sessoes de uso e timeline operacional do veiculo.</span>
          </div>

          <div className="stack">
            {assignmentHistory.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma alocacao registrada.</strong>
                <p>Esse veiculo ainda nao teve uso operacional associado a um motorista.</p>
              </div>
            ) : (
              <div className="timeline">
                {assignmentHistory.map((entry) => (
                  <div key={entry.id} className="timeline-item">
                    <div className="timeline-bullet" />
                    <div>
                      <strong>{entry.driverName}</strong>
                      <span>{`Inicio: ${formatDateTime(entry.startedAt)} - Metodo: ${resolveValidationMethodLabel(entry.validationMethod)}`}</span>
                      <span>{entry.endedAt ? `Encerrado em ${formatDateTime(entry.endedAt)}` : "Alocacao ainda ativa"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {timeline.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum evento operacional ainda.</strong>
                <p>Assim que o veiculo comecar a ser usado, a timeline passa a ser preenchida.</p>
              </div>
            ) : (
              <div className="timeline">
                {timeline.map((entry) => (
                  <div key={entry.id} className={`timeline-item ${resolveTimelineClassName(entry.tone)}`}>
                    <div className="timeline-bullet" />
                    <div>
                      <strong>{entry.title}</strong>
                      <span>{formatDateTime(entry.occurredAt)}</span>
                      <span>{entry.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
        ) : null}
          </section>
        </div>

        <FleetVehicleEditorSidebar
          vehicleName={vehicleName}
          plate={form.plate.trim() || "Placa pendente"}
          operationalStatusLabel={operationalStatusLabel}
          readinessLabel={readinessLabel}
          readinessReady={readinessReady}
          currentAssignmentLabel={currentAssignmentLabel}
          currentOdometerLabel={currentOdometerLabel}
          checkinCode={checkinCode}
          statusChecks={sidebarStatusChecks}
          openTasksCount={openTasks.length}
          alertsCount={alerts.length}
          timelineCount={timeline.length}
          odometerLogCount={vehicle?.odometerLogs.length ?? 0}
          canSubmit={canSubmit}
          isSaving={isSaving}
          mode={mode}
          submitFormId={vehicleFormId}
        />
      </div>
        </div>
      </section>
    </main>
  );
}

function resolveFleetStatusLabel(status: FleetVehicleDetails["status"]): string {
  switch (status) {
    case "ALLOCATED":
      return "Em uso";
    case "MAINTENANCE":
      return "Em manutenção";
    case "INACTIVE":
      return "Inativo";
    default:
      return "Disponível";
  }
}

function resolveFleetStatusClassName(status: FleetVehicleDetails["status"]): string {
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

function resolveTaskStatusLabel(status: FleetVehicleMaintenanceTask["status"]): string {
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

function resolveServiceTypeLabel(serviceType: FleetVehicleMaintenanceTask["serviceType"]): string {
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

function resolvePriorityLabel(priority: FleetVehicleMaintenanceTask["priority"]): string {
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

function resolveRecurrenceLabel(task: FleetVehicleMaintenanceTask): string {
  const parts: string[] = [];

  if (task.recurrenceMonths !== undefined) {
    parts.push(`${task.recurrenceMonths} mes(es)`);
  }

  if (task.recurrenceKm !== undefined) {
    parts.push(`${task.recurrenceKm} km`);
  }

  return parts.join(" • ") || "Sem recorrencia";
}

function resolvePlanCadenceLabel(plan: FleetVehicleDetails["maintenancePlans"][number]): string {
  const parts: string[] = [];

  if (plan.intervalMonths !== undefined) {
    parts.push(`${plan.intervalMonths} mes(es)`);
  }

  if (plan.intervalKm !== undefined) {
    parts.push(`${plan.intervalKm} km`);
  }

  return parts.join(" • ") || "Sem recorrencia definida";
}

function resolveAlertChipClassName(level: FleetVehicleDetails["alerts"][number]["level"]): string {
  if (level === "danger") {
    return "chip chip-soft fleet-chip-danger";
  }

  if (level === "warning") {
    return "chip chip-soft fleet-chip-warning";
  }

  return "chip chip-soft";
}

function resolveValidationMethodLabel(method?: FleetVehicleDetails["assignmentHistory"][number]["validationMethod"]): string {
  switch (method) {
    case "QR_CODE":
      return "QR";
    case "PLATE":
      return "Placa";
    default:
      return "Admin";
  }
}

function resolveTimelineClassName(tone: FleetVehicleDetails["timeline"][number]["tone"]): string {
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




