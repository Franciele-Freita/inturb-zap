"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FleetVehicleDetails, FleetVehicleOverview, FleetVehicleMaintenanceTask, request } from "../lib/api";
import { SearchIcon } from "./icons/common-icons";

type FleetMaintenanceActionMode = "PLAN" | "TASK" | "ODOMETER";

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

const emptyOdometerForm: OdometerFormState = {
  odometerKm: "",
  notes: ""
};

type FleetMaintenanceActionPageProps = {
  mode: FleetMaintenanceActionMode;
};

export function FleetMaintenanceActionPage({ mode }: FleetMaintenanceActionPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleOverview[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(searchParams.get("vehicleId") ?? "");
  const [vehicleDetails, setVehicleDetails] = useState<FleetVehicleDetails | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [isLoadingVehicleDetails, setIsLoadingVehicleDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando veiculos da frota...");
  const [maintenanceTaskForm, setMaintenanceTaskForm] = useState<MaintenanceTaskFormState>(emptyMaintenanceTaskForm);
  const [maintenancePlanForm, setMaintenancePlanForm] = useState<MaintenancePlanFormState>(emptyMaintenancePlanForm);
  const [odometerForm, setOdometerForm] = useState<OdometerFormState>(emptyOdometerForm);

  useEffect(() => {
    void request<FleetVehicleOverview[]>("/admin/fleet/vehicles")
      .then((vehicles) => {
        setFleetVehicles(vehicles);
        setStatusMessage(`${vehicles.length} veiculo(s) disponivel(is) para manutencao.`);
      })
      .catch((error: Error) => setStatusMessage(error.message))
      .finally(() => setIsLoadingVehicles(false));
  }, []);

  useEffect(() => {
    if (!selectedVehicleId) {
      setVehicleDetails(null);
      setOdometerForm(emptyOdometerForm);
      return;
    }

    setIsLoadingVehicleDetails(true);
    void request<FleetVehicleDetails>(`/admin/fleet/vehicles/${selectedVehicleId}`)
      .then((vehicle) => {
        setVehicleDetails(vehicle);
        setOdometerForm((current) => ({
          odometerKm: vehicle.latestOdometerKm ? String(vehicle.latestOdometerKm) : current.odometerKm,
          notes: current.notes
        }));
        setMaintenanceTaskForm((current) => ({
          ...current,
          currentOdometerKm: vehicle.latestOdometerKm ? String(vehicle.latestOdometerKm) : current.currentOdometerKm
        }));
      })
      .catch((error: Error) => setStatusMessage(error.message))
      .finally(() => setIsLoadingVehicleDetails(false));
  }, [selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => fleetVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [fleetVehicles, selectedVehicleId]
  );

  const visibleVehicles = useMemo(() => {
    const normalizedSearch = vehicleSearch.trim().toLowerCase();

    return fleetVehicles.filter((vehicle) => {
      if (!normalizedSearch) {
        return true;
      }

      return [vehicle.label, vehicle.plate, vehicle.currentAssignment?.driverName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [fleetVehicles, vehicleSearch]);

  const pageCopy = resolvePageCopy(mode);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedVehicleId) {
      setStatusMessage("Selecione um veiculo antes de continuar.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(pageCopy.submittingLabel);

    try {
      if (mode === "PLAN") {
        await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${selectedVehicleId}/maintenance-plans`, {
          method: "POST",
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

        router.push(`/fleet/veiculos/${selectedVehicleId}/overview`);
        router.refresh();
        return;
      }

      if (mode === "TASK") {
        await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${selectedVehicleId}/maintenance-tasks`, {
          method: "POST",
          body: JSON.stringify({
            title: maintenanceTaskForm.title,
            description: maintenanceTaskForm.description || undefined,
            serviceType: maintenanceTaskForm.serviceType,
            priority: maintenanceTaskForm.priority,
            workshop: maintenanceTaskForm.workshop || undefined,
            dueDate: maintenanceTaskForm.dueDate || undefined,
            dueKm: maintenanceTaskForm.dueKm ? Number(maintenanceTaskForm.dueKm) : undefined,
            recurrenceMonths: maintenanceTaskForm.recurrenceMonths ? Number(maintenanceTaskForm.recurrenceMonths) : undefined,
            recurrenceKm: maintenanceTaskForm.recurrenceKm ? Number(maintenanceTaskForm.recurrenceKm) : undefined,
            currentOdometerKm: maintenanceTaskForm.currentOdometerKm ? Number(maintenanceTaskForm.currentOdometerKm) : undefined,
            estimatedCost: maintenanceTaskForm.estimatedCost ? Number(maintenanceTaskForm.estimatedCost) : undefined,
            actualCost: maintenanceTaskForm.actualCost ? Number(maintenanceTaskForm.actualCost) : undefined,
            notes: maintenanceTaskForm.notes || undefined
          })
        });

        router.push(`/fleet/veiculos/${selectedVehicleId}/overview`);
        router.refresh();
        return;
      }

      await request<FleetVehicleDetails>(`/admin/fleet/vehicles/${selectedVehicleId}/odometer-logs`, {
        method: "POST",
        body: JSON.stringify({
          odometerKm: Number(odometerForm.odometerKm),
          notes: odometerForm.notes || undefined
        })
      });

      router.push(`/fleet/veiculos/${selectedVehicleId}/overview`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : pageCopy.errorLabel);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell page-shell-form">
      <section className="page-hero">
        <div>
          <p className="eyebrow">PAINEL ADMINISTRATIVO</p>
          <h1>{pageCopy.title}</h1>
          <p className="helper-text">{pageCopy.description}</p>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide fleet-section-card">
          <div className="panel-head fleet-section-head">
            <div>
              <h2>Veiculo</h2>
              <span>Escolha o veiculo antes de preencher a acao de manutencao.</span>
            </div>
          </div>

          <div className="fleet-action-page-stack">
            <label className="admin-header-search drivers-inline-search">
              <input
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder="Buscar veiculo por nome, placa ou motorista..."
              />
              <span className="admin-header-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
            </label>

            <label>
              Veiculo selecionado
              <select
                className="select"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                disabled={isLoadingVehicles}
              >
                <option value="">Selecionar veiculo...</option>
                {visibleVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {`${vehicle.label} | ${vehicle.plate}`}
                  </option>
                ))}
              </select>
            </label>

            {selectedVehicle ? (
              <div className="fleet-action-page-vehicle-card">
                <strong>{selectedVehicle.label}</strong>
                <span>{selectedVehicle.plate}</span>
                <small>{selectedVehicle.currentAssignment?.driverName ? `Motorista atual: ${selectedVehicle.currentAssignment.driverName}` : "Sem motorista alocado"}</small>
                <small>{selectedVehicle.latestOdometerKm !== undefined ? `KM atual: ${selectedVehicle.latestOdometerKm}` : "KM atual pendente"}</small>
              </div>
            ) : null}

            <p className="drivers-page-status">{statusMessage}</p>
          </div>
        </article>

        <article className="panel panel-wide fleet-section-card">
          <div className="panel-head fleet-section-head">
            <div>
              <h2>{pageCopy.formTitle}</h2>
              <span>{pageCopy.formDescription}</span>
            </div>
          </div>

          <form className="stack" onSubmit={(event) => void handleSubmit(event)}>
            {mode === "PLAN" ? (
              <>
                <div className="form-grid">
                  <label>
                    Nome do plano
                    <input
                      value={maintenancePlanForm.title}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Ex.: Troca de oleo preventiva"
                    />
                  </label>
                  <label>
                    Tipo de servico
                    <select
                      className="select"
                      value={maintenancePlanForm.serviceType}
                      onChange={(event) =>
                        setMaintenancePlanForm((current) => ({
                          ...current,
                          serviceType: event.target.value as FleetVehicleMaintenanceTask["serviceType"]
                        }))
                      }
                    >
                      <ServiceTypeOptions />
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select
                      className="select"
                      value={maintenancePlanForm.priority}
                      onChange={(event) =>
                        setMaintenancePlanForm((current) => ({
                          ...current,
                          priority: event.target.value as FleetVehicleMaintenanceTask["priority"]
                        }))
                      }
                    >
                      <PriorityOptions />
                    </select>
                  </label>
                  <label>
                    Oficina
                    <input
                      value={maintenancePlanForm.workshop}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, workshop: event.target.value }))}
                      placeholder="Ex.: Oficina Centro"
                    />
                  </label>
                  <label>
                    Intervalo em meses
                    <input
                      value={maintenancePlanForm.intervalMonths}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, intervalMonths: event.target.value }))}
                      inputMode="numeric"
                      placeholder="6"
                    />
                  </label>
                  <label>
                    Intervalo em KM
                    <input
                      value={maintenancePlanForm.intervalKm}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, intervalKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder="10000"
                    />
                  </label>
                  <label>
                    Primeiro vencimento
                    <input
                      type="date"
                      value={maintenancePlanForm.firstDueDate}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, firstDueDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    Primeiro vencimento em KM
                    <input
                      value={maintenancePlanForm.firstDueKm}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, firstDueKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder="120000"
                    />
                  </label>
                  <label>
                    Custo padrao previsto
                    <input
                      value={maintenancePlanForm.defaultEstimatedCost}
                      onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, defaultEstimatedCost: event.target.value }))}
                      inputMode="decimal"
                      placeholder="350"
                    />
                  </label>
                </div>
                <label>
                  Descricao
                  <textarea
                    rows={3}
                    value={maintenancePlanForm.description}
                    onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Explique a regra desse plano preventivo."
                  />
                </label>
                <label>
                  Observacoes
                  <textarea
                    rows={3}
                    value={maintenancePlanForm.notes}
                    onChange={(event) => setMaintenancePlanForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Ex.: usar oleo especifico, oficina homologada ou contexto operacional."
                  />
                </label>
              </>
            ) : null}

            {mode === "TASK" ? (
              <>
                <div className="form-grid">
                  <label>
                    Titulo da tarefa
                    <input
                      value={maintenanceTaskForm.title}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Ex.: Alinhamento e balanceamento"
                    />
                  </label>
                  <label>
                    Tipo de servico
                    <select
                      className="select"
                      value={maintenanceTaskForm.serviceType}
                      onChange={(event) =>
                        setMaintenanceTaskForm((current) => ({
                          ...current,
                          serviceType: event.target.value as FleetVehicleMaintenanceTask["serviceType"]
                        }))
                      }
                    >
                      <ServiceTypeOptions />
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select
                      className="select"
                      value={maintenanceTaskForm.priority}
                      onChange={(event) =>
                        setMaintenanceTaskForm((current) => ({
                          ...current,
                          priority: event.target.value as FleetVehicleMaintenanceTask["priority"]
                        }))
                      }
                    >
                      <PriorityOptions />
                    </select>
                  </label>
                  <label>
                    Oficina
                    <input
                      value={maintenanceTaskForm.workshop}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, workshop: event.target.value }))}
                      placeholder="Ex.: Oficina Centro"
                    />
                  </label>
                  <label>
                    Data prevista
                    <input
                      type="date"
                      value={maintenanceTaskForm.dueDate}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    KM previsto
                    <input
                      value={maintenanceTaskForm.dueKm}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, dueKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder="120000"
                    />
                  </label>
                  <label>
                    KM na abertura
                    <input
                      value={maintenanceTaskForm.currentOdometerKm}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, currentOdometerKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder={vehicleDetails?.latestOdometerKm ? String(vehicleDetails.latestOdometerKm) : "118400"}
                    />
                  </label>
                  <label>
                    Recorrencia em meses
                    <input
                      value={maintenanceTaskForm.recurrenceMonths}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, recurrenceMonths: event.target.value }))}
                      inputMode="numeric"
                      placeholder="6"
                    />
                  </label>
                  <label>
                    Recorrencia em KM
                    <input
                      value={maintenanceTaskForm.recurrenceKm}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, recurrenceKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder="10000"
                    />
                  </label>
                  <label>
                    Custo previsto
                    <input
                      value={maintenanceTaskForm.estimatedCost}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, estimatedCost: event.target.value }))}
                      inputMode="decimal"
                      placeholder="350"
                    />
                  </label>
                  <label>
                    Custo realizado
                    <input
                      value={maintenanceTaskForm.actualCost}
                      onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, actualCost: event.target.value }))}
                      inputMode="decimal"
                      placeholder="420"
                    />
                  </label>
                </div>
                <label>
                  Descricao
                  <textarea
                    rows={3}
                    value={maintenanceTaskForm.description}
                    onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Explique o que precisa ser feito no carro."
                  />
                </label>
                <label>
                  Observacoes
                  <textarea
                    rows={3}
                    value={maintenanceTaskForm.notes}
                    onChange={(event) => setMaintenanceTaskForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Ex.: oficina indicada, urgencia ou contexto operacional."
                  />
                </label>
              </>
            ) : null}

            {mode === "ODOMETER" ? (
              <>
                <div className="form-grid">
                  <label>
                    Quilometragem
                    <input
                      value={odometerForm.odometerKm}
                      onChange={(event) => setOdometerForm((current) => ({ ...current, odometerKm: event.target.value }))}
                      inputMode="numeric"
                      placeholder="123456"
                    />
                  </label>
                </div>
                <label>
                  Observacoes
                  <textarea
                    rows={3}
                    value={odometerForm.notes}
                    onChange={(event) => setOdometerForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Ex.: registro apos troca de turno, abastecimento ou revisao."
                  />
                </label>
              </>
            ) : null}

            <div className="toolbar">
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedVehicleId ||
                  isLoadingVehicleDetails ||
                  (mode === "PLAN" && !maintenancePlanForm.title.trim()) ||
                  (mode === "TASK" && !maintenanceTaskForm.title.trim()) ||
                  (mode === "ODOMETER" && !odometerForm.odometerKm.trim())
                }
              >
                {isSubmitting ? pageCopy.submittingButtonLabel : pageCopy.submitButtonLabel}
              </button>
              <Link href="/fleet/manutencao" className="button-link secondary-link">
                Voltar para manutencao
              </Link>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}

function resolvePageCopy(mode: FleetMaintenanceActionMode) {
  if (mode === "PLAN") {
    return {
      title: "Novo plano preventivo",
      description: "Configure a regra preventiva sem entrar no cadastro completo do veiculo.",
      formTitle: "Configuracao do plano",
      formDescription: "Defina periodicidade, vencimento inicial e contexto operacional.",
      submitButtonLabel: "Criar plano",
      submittingButtonLabel: "Salvando...",
      submittingLabel: "Salvando plano preventivo...",
      errorLabel: "Falha ao criar plano preventivo."
    };
  }

  if (mode === "TASK") {
    return {
      title: "Nova ordem de servico",
      description: "Abra uma OS operacional sem depender da tela de cadastro do veiculo.",
      formTitle: "Dados da OS",
      formDescription: "Registre o servico, prazo, custo e contexto de execucao.",
      submitButtonLabel: "Criar OS",
      submittingButtonLabel: "Criando...",
      submittingLabel: "Criando ordem de servico...",
      errorLabel: "Falha ao criar ordem de servico."
    };
  }

  return {
    title: "Registrar KM",
    description: "Lance a quilometragem rapidamente fora do cadastro do veiculo.",
    formTitle: "Leitura de hodometro",
    formDescription: "Use esse formulario para atualizar o KM atual do veiculo.",
    submitButtonLabel: "Registrar KM",
    submittingButtonLabel: "Registrando...",
    submittingLabel: "Registrando quilometragem...",
    errorLabel: "Falha ao registrar quilometragem."
  };
}

function ServiceTypeOptions() {
  return (
    <>
      <option value="GENERAL">Geral</option>
      <option value="PREVENTIVE">Preventiva</option>
      <option value="CORRECTIVE">Corretiva</option>
      <option value="ALIGNMENT">Alinhamento</option>
      <option value="BALANCING">Balanceamento</option>
      <option value="OIL_CHANGE">Troca de oleo</option>
      <option value="TIRE">Pneu</option>
      <option value="INSPECTION">Inspecao</option>
      <option value="CLEANING">Limpeza</option>
      <option value="BODYWORK">Funilaria</option>
    </>
  );
}

function PriorityOptions() {
  return (
    <>
      <option value="LOW">Baixa</option>
      <option value="MEDIUM">Media</option>
      <option value="HIGH">Alta</option>
      <option value="CRITICAL">Critica</option>
    </>
  );
}
