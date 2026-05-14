import { WorkProfileContractType } from "./types";

export type WorkProfileContractCapabilities = {
  isLaborRegime: boolean;
  requiresJourneyTemplate: boolean;
  allowsOvertimePolicy: boolean;
  usesIntermittentRemunerationFlow: boolean;
};

const WORK_PROFILE_CONTRACT_CAPABILITIES: Record<
  WorkProfileContractType,
  WorkProfileContractCapabilities
> = {
  CLT: {
    isLaborRegime: true,
    requiresJourneyTemplate: true,
    allowsOvertimePolicy: true,
    usesIntermittentRemunerationFlow: false
  },
  CLT_INTERMITENTE: {
    isLaborRegime: true,
    requiresJourneyTemplate: true,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: true
  },
  MEI: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  },
  PJ: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  },
  AUTONOMO: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  }
};

export const WORK_PROFILE_CONTRACT_TYPE_VALUES = Object.freeze(
  Object.keys(WORK_PROFILE_CONTRACT_CAPABILITIES) as WorkProfileContractType[]
);

export function getWorkProfileContractCapabilities(
  value: WorkProfileContractType
): WorkProfileContractCapabilities {
  return WORK_PROFILE_CONTRACT_CAPABILITIES[value];
}
