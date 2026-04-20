"use client";

import { DriverAccessibility } from "../lib/api";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type DriverProfileEditorAccessibilitySectionProps = {
  activeSection: DriverEditorSection;
  accessibility?: DriverAccessibility;
  onAccessibilityChange: (value?: DriverAccessibility) => void;
};

function normalizeAccessibility(value?: DriverAccessibility): DriverAccessibility | undefined {
  if (!value) {
    return undefined;
  }

  const hasDisability = value.hasDisability === undefined ? undefined : Boolean(value.hasDisability);
  const disabilityType = hasDisability ? "PHYSICAL" : undefined;
  const otherDisabilityType = hasDisability ? value.otherDisabilityType?.trim() || undefined : undefined;
  const hasMobilityLimitation =
    hasDisability && value.hasMobilityLimitation !== undefined ? Boolean(value.hasMobilityLimitation) : undefined;
  const mobilityLimitationDescription =
    hasDisability && hasMobilityLimitation ? value.mobilityLimitationDescription?.trim() || undefined : undefined;
  const needsVehicleAdaptation =
    hasDisability && value.needsVehicleAdaptation !== undefined ? Boolean(value.needsVehicleAdaptation) : undefined;
  const vehicleAdaptationDescription =
    hasDisability && needsVehicleAdaptation ? value.vehicleAdaptationDescription?.trim() || undefined : undefined;

  if (
    hasDisability === undefined &&
    !disabilityType &&
    !otherDisabilityType &&
    hasMobilityLimitation === undefined &&
    !mobilityLimitationDescription &&
    needsVehicleAdaptation === undefined &&
    !vehicleAdaptationDescription
  ) {
    return undefined;
  }

  return {
    hasDisability,
    disabilityType,
    otherDisabilityType,
    hasMobilityLimitation,
    mobilityLimitationDescription,
    needsVehicleAdaptation,
    vehicleAdaptationDescription
  };
}

function resolveAccessibilitySummary(value?: DriverAccessibility): string {
  if (value?.hasDisability === true) {
    return `PCD fisica${value.otherDisabilityType?.trim() ? ` - ${value.otherDisabilityType.trim()}` : ""}`;
  }

  if (value?.hasDisability === false) {
    return "Sem indicacao de PCD";
  }

  return "Aguardando definicao";
}

export function DriverProfileEditorAccessibilitySection({
  activeSection,
  accessibility,
  onAccessibilityChange
}: DriverProfileEditorAccessibilitySectionProps) {
  const hasDisability = accessibility?.hasDisability;
  const hasMobilityLimitation = accessibility?.hasMobilityLimitation;
  const needsVehicleAdaptation = accessibility?.needsVehicleAdaptation;

  function updateAccessibility(patch: Partial<DriverAccessibility>) {
    const next = normalizeAccessibility({ ...(accessibility ?? {}), ...patch });
    onAccessibilityChange(next);
  }

  return (
    <article
      id="driver-editor-accessibility"
      className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "accessibility" ? "is-expanded" : "is-collapsed"}`}
    >
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">04</span>
        <div className="panel-head">
          <h2>Acessibilidade e condicoes especiais</h2>
          <span>Registre informacoes de PCD e necessidades de mobilidade/adaptacao para operacao segura.</span>
        </div>
      </div>

      <div className="driver-editor-block">
        <div className="driver-editor-block-head">
          <strong>Pessoa com deficiencia?</strong>
          <p className="helper-text">Esse campo define se as informacoes adicionais de acessibilidade devem ser preenchidas.</p>
        </div>
        <div className="driver-editor-profile-picker driver-editor-accessibility-binary-picker" role="radiogroup" aria-label="Pessoa com deficiencia">
          <button
            type="button"
            className={`driver-editor-profile-option ${hasDisability === true ? "is-active" : ""}`}
            onClick={() =>
              updateAccessibility({
                hasDisability: true,
                disabilityType: "PHYSICAL",
                hasMobilityLimitation:
                  accessibility?.hasDisability === true ? accessibility.hasMobilityLimitation : undefined,
                needsVehicleAdaptation:
                  accessibility?.hasDisability === true ? accessibility.needsVehicleAdaptation : undefined
              })
            }
            aria-pressed={hasDisability === true}
          >
            <div className="driver-editor-profile-option-copy">
              <strong>Sim</strong>
              <small>Exibir campos de acessibilidade.</small>
            </div>
          </button>
          <button
            type="button"
            className={`driver-editor-profile-option ${hasDisability === false ? "is-active" : ""}`}
            onClick={() => updateAccessibility({ hasDisability: false })}
            aria-pressed={hasDisability === false}
          >
            <div className="driver-editor-profile-option-copy">
              <strong>Nao</strong>
              <small>Sem informacoes adicionais para acessibilidade.</small>
            </div>
          </button>
        </div>
      </div>

      {hasDisability ? (
        <div className="driver-editor-block">
          <div className="driver-editor-block-head">
            <strong>Informacoes de acessibilidade</strong>
            <p className="helper-text">Descreva a condicao fisica e detalhe necessidades para orientar equipe e operacao.</p>
          </div>

          <label className="driver-editor-modal-field-full">
            Qual deficiencia fisica?
            <textarea
              rows={3}
              value={accessibility?.otherDisabilityType ?? ""}
              onChange={(event) => updateAccessibility({ disabilityType: "PHYSICAL", otherDisabilityType: event.target.value })}
              placeholder="Descreva a condicao fisica"
            />
          </label>

          <div className="driver-editor-accessibility-subgrid">
            <div>
              <strong>Possui alguma limitacao de mobilidade?</strong>
              <div className="driver-editor-profile-picker driver-editor-accessibility-binary-picker">
                <button
                  type="button"
                  className={`driver-editor-profile-option ${hasMobilityLimitation === true ? "is-active" : ""}`}
                  onClick={() => updateAccessibility({ hasMobilityLimitation: true })}
                  aria-pressed={hasMobilityLimitation === true}
                >
                  <div className="driver-editor-profile-option-copy">
                    <strong>Sim</strong>
                  </div>
                </button>
                <button
                  type="button"
                  className={`driver-editor-profile-option ${hasMobilityLimitation === false ? "is-active" : ""}`}
                  onClick={() => updateAccessibility({ hasMobilityLimitation: false })}
                  aria-pressed={hasMobilityLimitation === false}
                >
                  <div className="driver-editor-profile-option-copy">
                    <strong>Nao</strong>
                  </div>
                </button>
              </div>
              {hasMobilityLimitation ? (
                <label className="driver-editor-accessibility-detail">
                  Descreva a limitacao ou necessidade
                  <textarea
                    rows={3}
                    value={accessibility?.mobilityLimitationDescription ?? ""}
                    onChange={(event) =>
                      updateAccessibility({ mobilityLimitationDescription: event.target.value })
                    }
                    placeholder="Ex.: dificuldade para subir degraus, necessidade de apoio para embarque..."
                  />
                </label>
              ) : null}
            </div>

            <div>
              <strong>Necessita de adaptacao no veiculo?</strong>
              <div className="driver-editor-profile-picker driver-editor-accessibility-binary-picker">
                <button
                  type="button"
                  className={`driver-editor-profile-option ${needsVehicleAdaptation === true ? "is-active" : ""}`}
                  onClick={() => updateAccessibility({ needsVehicleAdaptation: true })}
                  aria-pressed={needsVehicleAdaptation === true}
                >
                  <div className="driver-editor-profile-option-copy">
                    <strong>Sim</strong>
                  </div>
                </button>
                <button
                  type="button"
                  className={`driver-editor-profile-option ${needsVehicleAdaptation === false ? "is-active" : ""}`}
                  onClick={() => updateAccessibility({ needsVehicleAdaptation: false })}
                  aria-pressed={needsVehicleAdaptation === false}
                >
                  <div className="driver-editor-profile-option-copy">
                    <strong>Nao</strong>
                  </div>
                </button>
              </div>
              {needsVehicleAdaptation ? (
                <label className="driver-editor-accessibility-detail">
                  Qual adaptacao?
                  <input
                    value={accessibility?.vehicleAdaptationDescription ?? ""}
                    onChange={(event) =>
                      updateAccessibility({ vehicleAdaptationDescription: event.target.value })
                    }
                    placeholder="Ex.: comando manual, rampa de acesso, alavanca especial..."
                  />
                </label>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="driver-editor-summary-strip driver-editor-accessibility-summary-grid">
        <article className="driver-editor-summary-card">
          <span>Acessibilidade</span>
          <strong>{resolveAccessibilitySummary(accessibility)}</strong>
          <small>Revise com o motorista para evitar restricoes operacionais e falhas de atendimento.</small>
        </article>
      </div>
    </article>
  );
}
