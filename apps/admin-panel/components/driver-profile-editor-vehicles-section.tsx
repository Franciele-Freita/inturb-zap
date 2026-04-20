"use client";

import Link from "next/link";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type VehicleDraft = {
  id?: string;
  label: string;
  plate: string;
  color: string;
  year: string;
  isActive: boolean;
};

type SelectableFleetVehicle = {
  id: string;
  label: string;
  plate: string;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
};

type DriverProfileEditorVehiclesSectionProps = {
  activeSection: DriverEditorSection;
  mode: "create" | "edit";
  driverType: "AGREGADO" | "FROTA";
  fleetAssignmentMode: "" | "FIXED" | "FLEX";
  defaultFleetVehicleId: string;
  vehicleSectionTitle: string;
  selectedDefaultFleetVehicle: SelectableFleetVehicle | null;
  selectableFleetVehicles: SelectableFleetVehicle[];
  existingVehicles: VehicleDraft[];
  newVehicles: VehicleDraft[];
  expandedVehicleKey: string | null;
  isSavingVehicle: string | null;
  activeReadyVehicle?: VehicleDraft;
  requiresOwnVehicle: boolean;
  onDefaultFleetVehicleChange: (value: string) => void;
  onAddVehicleDraft: () => void;
  onOpenVehicleEditor: (key: string) => void;
  onRemoveNewVehicle: (index: number) => void;
  onUpdateDraftVehicle: (
    collection: "new" | "existing",
    index: number,
    field: keyof VehicleDraft,
    value: string | boolean
  ) => void;
  onCreateVehicle: (vehicle: VehicleDraft, index: number) => void;
  onUpdateVehicle: (vehicle: VehicleDraft, index: number) => void;
  getExistingVehicleKey: (vehicleId: string) => string;
  getNewVehicleKey: (index: number) => string;
};

export function DriverProfileEditorVehiclesSection({
  activeSection,
  mode,
  driverType,
  fleetAssignmentMode,
  defaultFleetVehicleId,
  vehicleSectionTitle,
  selectedDefaultFleetVehicle,
  selectableFleetVehicles,
  existingVehicles,
  newVehicles,
  expandedVehicleKey,
  isSavingVehicle,
  activeReadyVehicle,
  requiresOwnVehicle,
  onDefaultFleetVehicleChange,
  onAddVehicleDraft,
  onOpenVehicleEditor,
  onRemoveNewVehicle,
  onUpdateDraftVehicle,
  onCreateVehicle,
  onUpdateVehicle,
  getExistingVehicleKey,
  getNewVehicleKey
}: DriverProfileEditorVehiclesSectionProps) {
  return (
    <article
      id="driver-editor-vehicles"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "contract" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">04</span>
        <div className="panel-head panel-head-inline">
          <div>
            <h2>{vehicleSectionTitle}</h2>
            <span>
              {driverType === "AGREGADO"
                ? mode === "create"
                  ? "Comece com um veiculo principal. Os demais podem entrar depois."
                  : "Organize os veiculos proprios com um unico item ativo."
                : fleetAssignmentMode === "FIXED"
                  ? "Defina o veiculo padrao da frota que esse motorista deve validar antes do turno."
                  : "O motorista valida o carro disponivel via QR Code ou placa antes de operar."}
            </span>
          </div>
          {activeSection === "contract" && driverType === "AGREGADO" ? (
            <button type="button" className="secondary" onClick={onAddVehicleDraft}>
              Adicionar veiculo
            </button>
          ) : null}
        </div>
      </div>

      {driverType === "FROTA" ? (
        fleetAssignmentMode === "FIXED" ? (
          <div className="driver-editor-fleet-allocation-card">
            <div className="driver-editor-fleet-allocation-copy">
              <strong>Veiculo padrao da frota</strong>
              <span>
                {selectedDefaultFleetVehicle
                  ? `${selectedDefaultFleetVehicle.label} - ${selectedDefaultFleetVehicle.plate}`
                  : "Selecione o veiculo fixo que esse motorista deve validar no app antes de operar."}
              </span>
            </div>
            <div className="form-grid">
              <label>
                Veiculo padrao
                <select className="select" value={defaultFleetVehicleId} onChange={(event) => onDefaultFleetVehicleChange(event.target.value)}>
                  <option value="">Selecionar veiculo...</option>
                  {selectableFleetVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label} - {vehicle.plate} ({resolveFleetVehicleStatusLabel(vehicle.status)})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <div className="driver-editor-fleet-allocation-card">
            <div className="driver-editor-fleet-allocation-copy">
              <strong>Validacao do carro no inicio do turno</strong>
              <span>O motorista vai ate a garagem, valida o carro via QR Code ou placa no app e so entao pode operar.</span>
            </div>
            <Link href="/fleet" className="button-link secondary-link">
              Abrir Frota
            </Link>
          </div>
        )
      ) : null}

      {driverType === "AGREGADO" && mode === "edit" && existingVehicles.length > 0 ? (
        <div className="driver-vehicle-group">
          <p className="driver-vehicle-group-label">Veiculos cadastrados</p>
          <div className="driver-vehicle-list">
            {existingVehicles.map((vehicle, index) => {
              if (!vehicle.id) {
                return null;
              }

              const vehicleKey = getExistingVehicleKey(vehicle.id);
              const isExpanded = expandedVehicleKey === vehicleKey;

              return (
                <div
                  key={vehicle.id}
                  className={`driver-vehicle-card ${vehicle.isActive ? "is-active" : ""} ${isExpanded ? "is-expanded" : "is-collapsed"}`}
                >
                  <div className="driver-vehicle-head">
                    <div className="driver-vehicle-title-row">
                      <strong className="driver-vehicle-summary">{formatVehicleSummary(vehicle, "Veiculo sem nome")}</strong>
                      {!isExpanded ? (
                        <div className="driver-vehicle-actions">
                          <button type="button" className="driver-vehicle-expand" onClick={() => onOpenVehicleEditor(vehicleKey)}>
                            Editar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="driver-vehicle-editing">
                      <div className="driver-vehicle-editing-top">
                        <label className="toggle-field compact-toggle driver-vehicle-toggle">
                          <span>Veiculo ativo</span>
                          <input
                            type="checkbox"
                            checked={vehicle.isActive}
                            onChange={(event) => onUpdateDraftVehicle("existing", index, "isActive", event.target.checked)}
                          />
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>Modelo<input value={vehicle.label} onChange={(event) => onUpdateDraftVehicle("existing", index, "label", event.target.value)} /></label>
                        <label>Placa<input value={vehicle.plate} onChange={(event) => onUpdateDraftVehicle("existing", index, "plate", event.target.value)} /></label>
                        <label>Cor<input value={vehicle.color} onChange={(event) => onUpdateDraftVehicle("existing", index, "color", event.target.value)} /></label>
                        <label>Ano<input value={vehicle.year} onChange={(event) => onUpdateDraftVehicle("existing", index, "year", event.target.value)} /></label>
                      </div>
                      <div className="driver-vehicle-footer">
                        <span className="helper-text">As mudancas desse veiculo sao salvas separadamente.</span>
                        <button type="button" disabled={isSavingVehicle === vehicle.id} onClick={() => onUpdateVehicle(vehicle, index)}>
                          Salvar veiculo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {driverType === "AGREGADO" && (mode === "create" || newVehicles.length > 0) ? (
        <div className="driver-vehicle-group">
          <p className="driver-vehicle-group-label">{mode === "create" ? "Veiculo inicial" : "Novos veiculos"}</p>
          <div className="driver-vehicle-list">
            {newVehicles.map((vehicle, index) => {
              const vehicleKey = getNewVehicleKey(index);
              const isExpanded = expandedVehicleKey === vehicleKey;

              return (
                <div
                  key={`draft-${index}`}
                  className={`driver-vehicle-card ${vehicle.isActive ? "is-active" : ""} ${isExpanded ? "is-expanded" : "is-collapsed"}`}
                >
                  <div className="driver-vehicle-head">
                    <div className="driver-vehicle-title-row">
                      <strong className="driver-vehicle-summary">{formatVehicleSummary(vehicle, `Veiculo ${index + 1}`)}</strong>
                      {!isExpanded ? (
                        <div className="driver-vehicle-actions">
                          <button type="button" className="driver-vehicle-expand" onClick={() => onOpenVehicleEditor(vehicleKey)}>
                            Editar
                          </button>
                          <button type="button" className="driver-vehicle-inline-action" onClick={() => onRemoveNewVehicle(index)}>
                            Remover
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="driver-vehicle-editing">
                      <div className="driver-vehicle-editing-top">
                        <label className="toggle-field compact-toggle driver-vehicle-toggle">
                          <span>Veiculo ativo</span>
                          <input
                            type="checkbox"
                            checked={vehicle.isActive}
                            onChange={(event) => onUpdateDraftVehicle("new", index, "isActive", event.target.checked)}
                          />
                        </label>
                      </div>
                      <div className="form-grid">
                        <label>Modelo<input value={vehicle.label} onChange={(event) => onUpdateDraftVehicle("new", index, "label", event.target.value)} placeholder="Onix Branco" /></label>
                        <label>Placa<input value={vehicle.plate} onChange={(event) => onUpdateDraftVehicle("new", index, "plate", event.target.value)} placeholder="ABC1D23" /></label>
                        <label>Cor<input value={vehicle.color} onChange={(event) => onUpdateDraftVehicle("new", index, "color", event.target.value)} placeholder="Branco" /></label>
                        <label>Ano<input value={vehicle.year} onChange={(event) => onUpdateDraftVehicle("new", index, "year", event.target.value)} placeholder="2022" /></label>
                      </div>
                      <div className="driver-vehicle-footer">
                        <span className="helper-text">
                          {mode === "edit" ? "Salve esse item quando os dados estiverem completos." : "Revise esse veiculo antes de concluir o cadastro."}
                        </span>
                        <div className="toolbar">
                          {mode === "edit" ? (
                            <button
                              type="button"
                              disabled={isSavingVehicle === `new-${index}` || !vehicle.label.trim() || !vehicle.plate.trim()}
                              onClick={() => onCreateVehicle(vehicle, index)}
                            >
                              Salvar novo veiculo
                            </button>
                          ) : null}
                          <button type="button" className="secondary" onClick={() => onRemoveNewVehicle(index)}>
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="driver-vehicle-compact-footer">
                      <span className="helper-text">Abra esse item apenas quando precisar editar os dados do veiculo.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="driver-editor-callout">
        <strong>{requiresOwnVehicle ? "Obrigatorio para agregado" : "Regra para motorista da frota"}</strong>
        <span>
          {requiresOwnVehicle
            ? activeReadyVehicle
              ? `Veiculo ativo pronto: ${activeReadyVehicle.label} - ${activeReadyVehicle.plate}.`
              : "Salve pelo menos um veiculo com modelo e placa para concluir o cadastro."
            : fleetAssignmentMode === "FIXED"
              ? selectedDefaultFleetVehicle
                ? `Veiculo fixo definido: ${selectedDefaultFleetVehicle.label} - ${selectedDefaultFleetVehicle.plate}. O motorista ainda precisa validar esse carro no app antes do turno.`
                : "Defina o veiculo fixo que esse motorista deve validar antes de operar."
              : "Nao existe carro padrao. O motorista valida o carro disponivel via QR Code ou placa antes de operar."}
        </span>
      </div>
    </article>
  );
}

function formatVehicleSummary(vehicle: VehicleDraft, fallbackLabel: string): string {
  const label = vehicle.label.trim() || fallbackLabel;
  const plate = vehicle.plate.trim() || "placa pendente";
  const status = vehicle.isActive ? "Ativo" : "Reserva";
  return `${label} - ${plate} - ${status}`;
}

function resolveFleetVehicleStatusLabel(status: SelectableFleetVehicle["status"]): string {
  if (status === "AVAILABLE") return "Disponivel";
  if (status === "ALLOCATED") return "Em uso";
  if (status === "MAINTENANCE") return "Manutencao";
  return "Inativo";
}
