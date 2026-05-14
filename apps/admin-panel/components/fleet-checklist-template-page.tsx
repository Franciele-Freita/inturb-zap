"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import {
  FleetChecklistBuilderRule,
  FleetChecklistTaskBuilderConfig,
  FleetChecklistTemplate,
  FleetChecklistTemplateTask,
  request
} from "../lib/api";

type Props = { templateId?: string };

type WizardStep = "TEMPLATE_INFO" | "CHECKLIST_ITEMS" | "RULES_AUTOMATIONS" | "REVIEW";
type InputKind = "BOOLEAN" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";
type ActionKind = FleetChecklistTemplateTask["actionType"];
type NumberMode = NonNullable<FleetChecklistTaskBuilderConfig["numberMode"]>;
type FrequencyType =
  | "START_OF_DAY"
  | "END_OF_DAY"
  | "DRIVER_CHANGE"
  | "DAILY"
  | "PRE_TRIP"
  | "POST_OPERATION";
type TemplateCategory =
  | "OPERACIONAL"
  | "SEGURANCA"
  | "INSPECAO"
  | "LIMPEZA"
  | "MANUTENCAO"
  | "VIAGEM"
  | "PREVENTIVO";

type OptionRow = { id: string; label: string; actions: ActionKind[] };

type TemplateForm = {
  name: string;
  description: string;
  category: string;
  frequencyType: FrequencyType;
  isActive: boolean;
  isMandatory: boolean;
};

type RulesForm = {
  checklistMandatory: boolean;
  requireBeforeRoute: boolean;
  requireOnDriverChange: boolean;
  blockVehicleOnFailure: boolean;
  allowPhotos: boolean;
  allowNotes: boolean;
  validityHours: string;
  executionFrequency: FrequencyType;
};

type ChecklistItemDraft = {
  clientKey: string;
  id?: string;
  label: string;
  description: string;
  sortOrder: string;
  category: string;
  inputType: InputKind;
  numberMode: NumberMode;
  completionActions: ActionKind[];
  booleanNegativeActions: ActionKind[];
  options: OptionRow[];
  isRequired: boolean;
  isActive: boolean;
  hasConditionalAutomation: boolean;
};

type ItemModalState = {
  mode: "create" | "edit";
  clientKey?: string;
};

const ACTIONS: Array<{ value: ActionKind; label: string; description: string }> = [
  { value: "OPEN_MAINTENANCE", label: "Abrir OS", description: "Encaminha para manutencao." },
  { value: "OPEN_SUPPORT_TICKET", label: "Abrir ocorrencia", description: "Gera ocorrencia operacional." },
  { value: "REQUIRE_PHOTO", label: "Solicitar foto", description: "Exige evidencia visual." },
  { value: "REQUIRE_NOTE", label: "Solicitar observacao", description: "Exige justificativa textual." },
  { value: "REQUIRE_NUMBER", label: "Solicitar valor numerico", description: "Exige valor complementar." }
];

const TEMPLATE_CATEGORY_OPTIONS: Array<{ value: TemplateCategory; label: string }> = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "SEGURANCA", label: "Seguranca" },
  { value: "INSPECAO", label: "Inspecao" },
  { value: "LIMPEZA", label: "Limpeza" },
  { value: "MANUTENCAO", label: "Manutencao" },
  { value: "VIAGEM", label: "Viagem" },
  { value: "PREVENTIVO", label: "Preventivo" }
];

const wizardSteps: Array<{ key: WizardStep; index: string; title: string; description: string }> = [
  {
    key: "TEMPLATE_INFO",
    index: "01",
    title: "Informacoes do template",
    description: "Dados principais, frequencia e status."
  },
  {
    key: "CHECKLIST_ITEMS",
    index: "02",
    title: "Itens do checklist",
    description: "Cadastre verificacoes com fluxo em modal."
  },
  {
    key: "RULES_AUTOMATIONS",
    index: "03",
    title: "Regras e automacoes",
    description: "Comportamento operacional do template."
  },
  {
    key: "REVIEW",
    index: "04",
    title: "Revisao final",
    description: "Conferencia geral antes de salvar."
  }
];

const emptyTemplateForm: TemplateForm = {
  name: "",
  description: "",
  category: "",
  frequencyType: "START_OF_DAY",
  isActive: true,
  isMandatory: true
};

const emptyRulesForm: RulesForm = {
  checklistMandatory: true,
  requireBeforeRoute: true,
  requireOnDriverChange: false,
  blockVehicleOnFailure: false,
  allowPhotos: true,
  allowNotes: true,
  validityHours: "24",
  executionFrequency: "START_OF_DAY"
};

function createEmptyItem(category = ""): ChecklistItemDraft {
  return {
    clientKey: uid(),
    label: "",
    description: "",
    sortOrder: "",
    category,
    inputType: "BOOLEAN",
    numberMode: "FREE",
    completionActions: [],
    booleanNegativeActions: [],
    options: [{ id: uid(), label: "", actions: [] }],
    isRequired: true,
    isActive: true,
    hasConditionalAutomation: false
  };
}

function parseStep(rawStep: string | null): WizardStep {
  if (
    rawStep === "TEMPLATE_INFO" ||
    rawStep === "CHECKLIST_ITEMS" ||
    rawStep === "RULES_AUTOMATIONS" ||
    rawStep === "REVIEW"
  ) {
    return rawStep;
  }
  return "TEMPLATE_INFO";
}

function frequencyToRoutine(
  frequency: FrequencyType
): "START_OF_DAY" | "END_OF_DAY" {
  if (frequency === "END_OF_DAY" || frequency === "POST_OPERATION") {
    return "END_OF_DAY";
  }
  return "START_OF_DAY";
}

function routineToFrequency(template: FleetChecklistTemplate): FrequencyType {
  const haystack = `${template.name} ${template.category}`.toLowerCase();
  if (template.routine === "END_OF_DAY") {
    if (haystack.includes("pos") || haystack.includes("encerr")) {
      return "POST_OPERATION";
    }
    return "END_OF_DAY";
  }
  if (haystack.includes("pre") || haystack.includes("saida")) {
    return "PRE_TRIP";
  }
  return "START_OF_DAY";
}

function resolveFrequencyLabel(frequency: FrequencyType): string {
  if (frequency === "START_OF_DAY") return "Inicio do turno";
  if (frequency === "END_OF_DAY") return "Fim do turno";
  if (frequency === "DRIVER_CHANGE") return "Troca de motorista";
  if (frequency === "DAILY") return "Diario";
  if (frequency === "PRE_TRIP") return "Pre-viagem";
  return "Pos-operacao";
}

function formatCustomCategoryLabel(category: string): string {
  const normalized = category
    .trim()
    .replace(/\(\s*customizada\s*\)$/i, "")
    .trim();
  return `${normalized} (customizada)`;
}

function actionLabel(action: ActionKind): string {
  if (action === "OPEN_MAINTENANCE") return "Abrir OS";
  if (action === "OPEN_SUPPORT_TICKET") return "Abrir ocorrencia";
  if (action === "REQUIRE_PHOTO") return "Solicitar foto";
  if (action === "REQUIRE_NOTE") return "Solicitar observacao";
  if (action === "REQUIRE_NUMBER") return "Solicitar valor numerico";
  return "Sem acao";
}

function itemInputLabel(item: ChecklistItemDraft): string {
  if (item.inputType === "NUMBER" && item.numberMode === "ODOMETER") {
    return "Numero (KM)";
  }
  if (item.inputType === "SELECT") return "Multipla escolha";
  if (item.inputType === "TEXT") return "Texto";
  if (item.inputType === "PHOTO") return "Foto";
  if (item.inputType === "NUMBER") return "Numero";
  return "Sim / Nao";
}

function clean(actions: ActionKind[]): ActionKind[] {
  return Array.from(new Set(actions.filter((action) => action !== "NONE")));
}

function toggle(actions: ActionKind[], action: ActionKind): ActionKind[] {
  return actions.includes(action)
    ? actions.filter((item) => item !== action)
    : [...actions, action];
}

function buildRules(item: ChecklistItemDraft): FleetChecklistBuilderRule[] {
  if (!item.hasConditionalAutomation) {
    return [];
  }

  if (item.inputType === "BOOLEAN") {
    const actions = clean(item.booleanNegativeActions);
    return actions.length
      ? [
          {
            id: "boolean-false",
            condition: "BOOLEAN_IS_FALSE",
            value: "NO",
            label: "Resposta = Nao",
            actions
          }
        ]
      : [];
  }

  if (item.inputType === "SELECT") {
    return item.options
      .map((option) => ({ option, actions: clean(option.actions) }))
      .filter(
        ({ option, actions }) =>
          option.label.trim().length > 0 && actions.length > 0
      )
      .map(({ option, actions }) => ({
        id: option.id,
        condition: "OPTION_EQUALS",
        value: option.label.trim(),
        label: `Resposta = ${option.label.trim()}`,
        actions
      }));
  }

  return [];
}

function toItemPayload(item: ChecklistItemDraft) {
  const rules = buildRules(item);
  const completionActions = clean(item.hasConditionalAutomation ? item.completionActions : []);
  const builderConfig: FleetChecklistTaskBuilderConfig = {};

  if (item.inputType === "NUMBER") {
    builderConfig.numberMode = item.numberMode;
  }
  if (item.inputType === "SELECT") {
    builderConfig.options = item.options
      .map((option) => ({ id: option.id, label: option.label.trim() }))
      .filter((option) => option.label.length > 0);
  }
  if (rules.length > 0) {
    builderConfig.rules = rules;
  }
  if (completionActions.length > 0) {
    builderConfig.completionActions = completionActions;
  }

  const inputType =
    item.inputType === "NUMBER" && item.numberMode === "ODOMETER"
      ? "ODOMETER"
      : item.inputType;
  const primaryAction =
    [...rules.flatMap((rule) => rule.actions), ...completionActions].find(
      (action) => action !== "NONE"
    ) ?? "NONE";

  return {
    label: item.label.trim(),
    description: item.description.trim() || undefined,
    inputType,
    actionType: primaryAction,
    selectOptions:
      item.inputType === "SELECT"
        ? item.options.map((option) => option.label.trim()).filter(Boolean)
        : undefined,
    builderConfig:
      Object.keys(builderConfig).length > 0 ? builderConfig : undefined,
    sortOrder: item.sortOrder.trim() ? Number(item.sortOrder) : undefined,
    isRequired: item.isRequired,
    isActive: item.isActive
  };
}

function toChecklistItemDraft(
  task: FleetChecklistTemplateTask,
  fallbackCategory: string
): ChecklistItemDraft {
  const config = task.builderConfig;
  const optionActions = new Map(
    (config?.rules ?? [])
      .filter((rule) => rule.condition === "OPTION_EQUALS")
      .map((rule) => [rule.value, rule.actions] as const)
  );
  const options =
    config?.options?.map((option) => ({
      id: option.id,
      label: option.label,
      actions: [...(optionActions.get(option.label) ?? [])]
    })) ??
    (task.selectOptions?.map((label) => ({ id: uid(), label, actions: [] })) ?? [
      { id: uid(), label: "", actions: [] }
    ]);
  const boolRule = config?.rules?.find(
    (rule) => rule.condition === "BOOLEAN_IS_FALSE"
  );
  const completionActions = config?.completionActions ?? [];
  const negativeActions =
    boolRule?.actions ??
    (task.inputType === "BOOLEAN" && task.actionType !== "NONE"
      ? [task.actionType]
      : []);

  return {
    clientKey: task.id,
    id: task.id,
    label: task.label,
    description: task.description ?? "",
    sortOrder: String(task.sortOrder),
    category: fallbackCategory,
    inputType: task.inputType === "ODOMETER" ? "NUMBER" : (task.inputType as InputKind),
    numberMode:
      config?.numberMode ??
      (task.inputType === "ODOMETER" ? "ODOMETER" : "FREE"),
    completionActions,
    booleanNegativeActions: negativeActions,
    options,
    isRequired: task.isRequired,
    isActive: task.isActive,
    hasConditionalAutomation:
      completionActions.length > 0 ||
      negativeActions.length > 0 ||
      options.some((option) => option.actions.length > 0)
  };
}

function canSaveItem(item: ChecklistItemDraft): boolean {
  if (item.label.trim().length === 0) {
    return false;
  }
  if (item.inputType === "SELECT") {
    return item.options.some((option) => option.label.trim().length > 0);
  }
  return true;
}

export function FleetChecklistTemplatePage({ templateId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStep = parseStep(searchParams.get("step"));

  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>([]);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<WizardStep>(initialStep);
  const [templateForm, setTemplateForm] =
    useState<TemplateForm>(emptyTemplateForm);
  const [rulesForm, setRulesForm] = useState<RulesForm>(emptyRulesForm);
  const [items, setItems] = useState<ChecklistItemDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isSavingFinal, setIsSavingFinal] = useState(false);
  const [statusMessage, setStatusMessage] =
    useState("Carregando configuracao de checklist...");
  const [itemModal, setItemModal] = useState<ItemModalState | null>(null);
  const [itemForm, setItemForm] = useState<ChecklistItemDraft>(
    createEmptyItem()
  );
  const [itemModalError, setItemModalError] = useState<string | null>(null);
  const [hydratedTemplateId, setHydratedTemplateId] = useState<string | null>(null);

  const effectiveTemplateId = templateId ?? createdTemplateId;

  useEffect(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await request<FleetChecklistTemplate[]>(
        "/admin/fleet/checklist-templates"
      );
      setTemplates(response);
      setStatusMessage(`${response.length} template(s) carregado(s).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Falha ao carregar templates."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const template = useMemo(
    () =>
      effectiveTemplateId
        ? templates.find((item) => item.id === effectiveTemplateId) ?? null
        : null,
    [effectiveTemplateId, templates]
  );

  useEffect(() => {
    if (!template) {
      if (!effectiveTemplateId && hydratedTemplateId !== "new") {
        setTemplateForm(emptyTemplateForm);
        setRulesForm(emptyRulesForm);
        setItems([]);
        setHydratedTemplateId("new");
      }
      return;
    }

    if (hydratedTemplateId === template.id) {
      return;
    }

    const templateItems = template.items
      .filter((task) => task.isActive)
      .map((task) => toChecklistItemDraft(task, template.category));
    const mandatory =
      templateItems.filter((item) => item.isRequired).length > 0;
    const frequency = routineToFrequency(template);

    setTemplateForm({
      name: template.name,
      description: "",
      category: template.category,
      frequencyType: frequency,
      isActive: template.isActive,
      isMandatory: mandatory
    });

    setRulesForm({
      checklistMandatory: mandatory,
      requireBeforeRoute:
        frequency === "START_OF_DAY" || frequency === "PRE_TRIP",
      requireOnDriverChange: frequency === "DRIVER_CHANGE",
      blockVehicleOnFailure: false,
      allowPhotos: true,
      allowNotes: true,
      validityHours: "24",
      executionFrequency: frequency
    });

    setItems(templateItems);
    setHydratedTemplateId(template.id);
  }, [effectiveTemplateId, hydratedTemplateId, template]);

  const stepErrors = useMemo<Record<WizardStep, string[]>>(() => {
    const templateInfoErrors: string[] = [];
    if (!templateForm.name.trim()) {
      templateInfoErrors.push("Informe o nome do template.");
    }
    if (!templateForm.category.trim()) {
      templateInfoErrors.push("Informe a categoria do template.");
    }

    const itemErrors: string[] = [];
    if (items.length === 0) {
      itemErrors.push("Adicione ao menos um item do checklist.");
    }

    const ruleErrors: string[] = [];
    if (rulesForm.validityHours.trim().length > 0) {
      const numericValue = Number(rulesForm.validityHours);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        ruleErrors.push("Informe uma validade em horas maior que zero.");
      }
    }

    return {
      TEMPLATE_INFO: templateInfoErrors,
      CHECKLIST_ITEMS: itemErrors,
      RULES_AUTOMATIONS: ruleErrors,
      REVIEW: []
    };
  }, [items, rulesForm.validityHours, templateForm.category, templateForm.name]);

  const activeStepIndex = useMemo(
    () =>
      Math.max(wizardSteps.findIndex((step) => step.key === activeStep), 0),
    [activeStep]
  );
  const progress = Math.round(((activeStepIndex + 1) / wizardSteps.length) * 100);
  const currentStepErrors = stepErrors[activeStep] ?? [];

  function resolveReviewItemStats() {
    const requiredCount = items.filter((item) => item.isRequired).length;
    const automationCount = items.filter((item) => item.hasConditionalAutomation).length;
    return { total: items.length, required: requiredCount, automation: automationCount };
  }

  async function persistTemplate(): Promise<string | null> {
    setIsSavingTemplate(true);
    try {
      const payload = {
        name: templateForm.name.trim(),
        category: templateForm.category.trim(),
        routine: frequencyToRoutine(templateForm.frequencyType),
        isActive: templateForm.isActive
      };

      const endpoint = effectiveTemplateId
        ? `/admin/fleet/checklist-templates/${effectiveTemplateId}`
        : "/admin/fleet/checklist-templates";
      const method = effectiveTemplateId ? "PATCH" : "POST";

      const nextTemplates = await request<FleetChecklistTemplate[]>(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      setTemplates(nextTemplates);

      if (effectiveTemplateId) {
        setStatusMessage("Template atualizado com sucesso.");
        return effectiveTemplateId;
      }

      const created = [...nextTemplates]
        .filter(
          (item) =>
            item.name === payload.name && item.category === payload.category
        )
        .sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )[0];

      if (!created) {
        setStatusMessage("Template salvo, mas nao foi possivel identificar o registro criado.");
        return null;
      }

      setCreatedTemplateId(created.id);
      setStatusMessage("Template criado com sucesso.");
      router.replace(`/fleet/checklists/${created.id}?step=CHECKLIST_ITEMS`);
      return created.id;
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Falha ao salvar template."
      );
      return null;
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function persistAllDraftItems(targetTemplateId: string): Promise<boolean> {
    const drafts = items.filter((item) => !item.id);
    if (drafts.length === 0) {
      return true;
    }

    try {
      let nextTemplates = templates;
      for (const draft of drafts) {
        nextTemplates = await request<FleetChecklistTemplate[]>(
          `/admin/fleet/checklist-templates/${targetTemplateId}/tasks`,
          {
            method: "POST",
            body: JSON.stringify(toItemPayload(draft))
          }
        );
      }
      setTemplates(nextTemplates);
      const refreshedTemplate =
        nextTemplates.find((item) => item.id === targetTemplateId) ?? null;
      if (refreshedTemplate) {
        setItems(
          refreshedTemplate.items
            .filter((task) => task.isActive)
            .map((task) =>
              toChecklistItemDraft(task, templateForm.category.trim() || refreshedTemplate.category)
            )
        );
      }
      return true;
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Falha ao persistir os itens do checklist."
      );
      return false;
    }
  }

  async function handleContinueFromTemplateInfo() {
    if (stepErrors.TEMPLATE_INFO.length > 0) {
      setStatusMessage(stepErrors.TEMPLATE_INFO[0]);
      return;
    }

    const savedTemplateId = await persistTemplate();
    if (!savedTemplateId) {
      return;
    }
    setActiveStep("CHECKLIST_ITEMS");
  }

  function goToStep(nextStep: WizardStep) {
    const nextIndex = wizardSteps.findIndex((step) => step.key === nextStep);
    if (nextIndex < 0) {
      return;
    }

    for (let index = 0; index < nextIndex; index += 1) {
      const stepKey = wizardSteps[index].key;
      const errors = stepErrors[stepKey] ?? [];
      if (errors.length > 0) {
        setStatusMessage(errors[0]);
        return;
      }
      if (
        (stepKey === "TEMPLATE_INFO" || stepKey === "CHECKLIST_ITEMS") &&
        !effectiveTemplateId
      ) {
        setStatusMessage("Salve o template antes de avancar para as proximas etapas.");
        return;
      }
    }

    setActiveStep(nextStep);
  }

  function goToPreviousStep() {
    const previousIndex = activeStepIndex - 1;
    if (previousIndex < 0) {
      return;
    }
    setActiveStep(wizardSteps[previousIndex].key);
  }

  function goToNextStep() {
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= wizardSteps.length) {
      return;
    }
    if (currentStepErrors.length > 0) {
      setStatusMessage(currentStepErrors[0]);
      return;
    }
    if (activeStep === "TEMPLATE_INFO" && !effectiveTemplateId) {
      setStatusMessage("Salve o template para continuar.");
      return;
    }
    setActiveStep(wizardSteps[nextIndex].key);
  }

  function openCreateItemModal() {
    setItemModal({ mode: "create" });
    setItemModalError(null);
    setItemForm(createEmptyItem(templateForm.category));
  }

  function openEditItemModal(item: ChecklistItemDraft) {
    setItemModal({ mode: "edit", clientKey: item.clientKey });
    setItemModalError(null);
    setItemForm({
      ...item,
      options:
        item.options.length > 0
          ? item.options.map((option) => ({
              id: option.id,
              label: option.label,
              actions: [...option.actions]
            }))
          : [{ id: uid(), label: "", actions: [] }],
      completionActions: [...item.completionActions],
      booleanNegativeActions: [...item.booleanNegativeActions]
    });
  }

  function closeItemModal() {
    if (isSavingItem) {
      return;
    }
    setItemModal(null);
    setItemModalError(null);
  }

  async function saveItemModal() {
    if (!canSaveItem(itemForm)) {
      setItemModalError("Preencha o nome do item e os campos obrigatorios.");
      return;
    }

    setIsSavingItem(true);
    setItemModalError(null);
    try {
      if (!effectiveTemplateId) {
        if (itemModal?.mode === "edit" && itemModal.clientKey) {
          setItems((current) =>
            current.map((item) =>
              item.clientKey === itemModal.clientKey
                ? { ...itemForm, clientKey: item.clientKey, id: item.id }
                : item
            )
          );
        } else {
          setItems((current) => [...current, { ...itemForm, clientKey: uid() }]);
        }
        setStatusMessage("Item atualizado localmente. Salve o template para persistir.");
        closeItemModal();
        return;
      }

      let nextTemplates: FleetChecklistTemplate[];
      if (itemModal?.mode === "edit") {
        const editingItem = items.find(
          (item) => item.clientKey === itemModal.clientKey
        );
        if (!editingItem?.id) {
          setItemModalError("Nao foi possivel localizar o item selecionado.");
          return;
        }
        nextTemplates = await request<FleetChecklistTemplate[]>(
          `/admin/fleet/checklist-templates/tasks/${editingItem.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(toItemPayload(itemForm))
          }
        );
      } else {
        nextTemplates = await request<FleetChecklistTemplate[]>(
          `/admin/fleet/checklist-templates/${effectiveTemplateId}/tasks`,
          {
            method: "POST",
            body: JSON.stringify(toItemPayload(itemForm))
          }
        );
      }

      setTemplates(nextTemplates);
      const refreshedTemplate =
        nextTemplates.find((item) => item.id === effectiveTemplateId) ?? null;
      if (refreshedTemplate) {
        setItems(
          refreshedTemplate.items
            .filter((task) => task.isActive)
            .map((task) =>
              toChecklistItemDraft(
                task,
                itemForm.category.trim() || templateForm.category.trim() || refreshedTemplate.category
              )
            )
        );
      }

      setStatusMessage(
        itemModal?.mode === "edit"
          ? "Item atualizado com sucesso."
          : "Item criado com sucesso."
      );
      closeItemModal();
    } catch (error) {
      setItemModalError(
        error instanceof Error ? error.message : "Falha ao salvar item."
      );
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleDuplicateItem(item: ChecklistItemDraft) {
    const duplicate: ChecklistItemDraft = {
      ...item,
      id: undefined,
      clientKey: uid(),
      label: `${item.label} (copia)`,
      options: item.options.map((option) => ({
        id: uid(),
        label: option.label,
        actions: [...option.actions]
      }))
    };

    if (!effectiveTemplateId) {
      setItems((current) => [...current, duplicate]);
      setStatusMessage(`Item "${item.label}" duplicado localmente.`);
      return;
    }

    try {
      const nextTemplates = await request<FleetChecklistTemplate[]>(
        `/admin/fleet/checklist-templates/${effectiveTemplateId}/tasks`,
        {
          method: "POST",
          body: JSON.stringify(toItemPayload(duplicate))
        }
      );
      setTemplates(nextTemplates);
      const refreshedTemplate =
        nextTemplates.find((entry) => entry.id === effectiveTemplateId) ?? null;
      if (refreshedTemplate) {
        setItems(
          refreshedTemplate.items
            .filter((task) => task.isActive)
            .map((task) =>
              toChecklistItemDraft(
                task,
                templateForm.category.trim() || refreshedTemplate.category
              )
            )
        );
      }
      setStatusMessage(`Item "${item.label}" duplicado com sucesso.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Falha ao duplicar item."
      );
    }
  }

  async function handleDeleteItem(item: ChecklistItemDraft) {
    if (!item.id) {
      setItems((current) =>
        current.filter((entry) => entry.clientKey !== item.clientKey)
      );
      setStatusMessage(`Item "${item.label}" removido.`);
      return;
    }

    try {
      const nextTemplates = await request<FleetChecklistTemplate[]>(
        `/admin/fleet/checklist-templates/tasks/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...toItemPayload(item),
            isActive: false
          })
        }
      );
      setTemplates(nextTemplates);
      setItems((current) =>
        current.filter((entry) => entry.clientKey !== item.clientKey)
      );
      setStatusMessage(`Item "${item.label}" arquivado e removido da etapa.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Falha ao excluir item."
      );
    }
  }

  async function handleFinalSave() {
    if (stepErrors.TEMPLATE_INFO.length > 0) {
      setStatusMessage(stepErrors.TEMPLATE_INFO[0]);
      setActiveStep("TEMPLATE_INFO");
      return;
    }
    if (stepErrors.CHECKLIST_ITEMS.length > 0) {
      setStatusMessage(stepErrors.CHECKLIST_ITEMS[0]);
      setActiveStep("CHECKLIST_ITEMS");
      return;
    }
    if (stepErrors.RULES_AUTOMATIONS.length > 0) {
      setStatusMessage(stepErrors.RULES_AUTOMATIONS[0]);
      setActiveStep("RULES_AUTOMATIONS");
      return;
    }

    setIsSavingFinal(true);
    try {
      const savedTemplateId = await persistTemplate();
      if (!savedTemplateId) {
        return;
      }

      const allItemsSaved = await persistAllDraftItems(savedTemplateId);
      if (!allItemsSaved) {
        return;
      }

      setStatusMessage("Template salvo com sucesso.");
      router.replace(`/fleet/checklists/${savedTemplateId}`);
      router.refresh();
    } finally {
      setIsSavingFinal(false);
    }
  }

  const navigationDisabled = isLoading || isSavingTemplate || isSavingItem || isSavingFinal;
  const reviewStats = resolveReviewItemStats();
  const templateCategoryOptions = useMemo(() => {
    const currentCategory = templateForm.category.trim();
    const baseOptions = TEMPLATE_CATEGORY_OPTIONS.map((option) => ({
      value: option.label,
      label: option.label
    }));
    if (
      !currentCategory ||
      TEMPLATE_CATEGORY_OPTIONS.some(
        (option) => option.label.toLowerCase() === currentCategory.toLowerCase()
      )
    ) {
      return baseOptions;
    }

    return [
      { value: currentCategory, label: formatCustomCategoryLabel(currentCategory) },
      ...baseOptions
    ];
  }, [templateForm.category]);

  return (
    <main className="page-shell page-shell-wide journey-editor-page-shell">
      <header className="journey-editor-page-header">
        <h1>{templateId ? "Editar template de checklist" : "Novo template de checklist"}</h1>
        <p>Fluxo em etapas para cadastro progressivo de templates operacionais da frota.</p>
      </header>

      {statusMessage ? <p className="journey-editor-status-message">{statusMessage}</p> : null}

      <div className="driver-editor-workspace journey-editor-workspace">
        <aside className="driver-editor-stepbar" aria-label="Etapas do cadastro do template">
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
            {wizardSteps.map((step, index) => {
              const isActive = activeStep === step.key;
              const isComplete = index < activeStepIndex && (stepErrors[step.key] ?? []).length === 0;
              return (
                <button
                  key={step.key}
                  type="button"
                  className={[
                    "driver-editor-stepchip",
                    isActive ? "is-active" : "",
                    isComplete ? "is-complete" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => goToStep(step.key)}
                  disabled={navigationDisabled}
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
        </aside>

        <section className="grid grid-single">
          <article className="panel panel-wide journey-editor-card">
            <div
              className={[
                "stack journey-editor-form",
                activeStep === "TEMPLATE_INFO" ? "fleet-checklist-template-info-active" : ""
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="driver-editor-form-step-meta">
                <span className="driver-editor-form-step-badge">
                  {wizardSteps[activeStepIndex]?.index ?? "01"}
                </span>
                <strong>{wizardSteps[activeStepIndex]?.title ?? "Etapa"}</strong>
                <small>{wizardSteps[activeStepIndex]?.description ?? ""}</small>
              </div>

              {currentStepErrors.length > 0 ? (
                <div className="driver-editor-contract-inline-note">
                  <strong>Existem campos pendentes nesta etapa</strong>
                  <span>{currentStepErrors.join(" | ")}</span>
                </div>
              ) : null}

              {activeStep === "TEMPLATE_INFO" ? (
                <>
                  <div className="panel-head">
                    <h2>Dados do template</h2>
                    <span>Etapa rapida para definir base, frequencia e status operacional.</span>
                  </div>

                  <div className="form-grid">
                    <label>
                      Nome do template
                      <input
                        value={templateForm.name}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        placeholder="Ex.: Checklist diario operacional"
                        disabled={navigationDisabled}
                      />
                    </label>
                    <label>
                      Categoria
                      <select
                        className="select"
                        value={templateForm.category}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            category: event.target.value
                          }))
                        }
                        disabled={navigationDisabled}
                      >
                        <option value="">Selecione uma categoria</option>
                        {templateCategoryOptions.map((option) => (
                          <option key={`${option.value}-${option.label}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <small className="helper-text">
                        Categorias customizadas serao suportadas em etapa futura.
                      </small>
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Descricao
                      <textarea
                        value={templateForm.description}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                        placeholder="Ex.: Inspecao obrigatoria antes da primeira rota do dia."
                        disabled={navigationDisabled}
                        rows={3}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Frequencia
                      <select
                        className="select"
                        value={templateForm.frequencyType}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            frequencyType: event.target.value as FrequencyType
                          }))
                        }
                        disabled={navigationDisabled}
                      >
                        <option value="START_OF_DAY">Inicio do turno</option>
                        <option value="END_OF_DAY">Fim do turno</option>
                        <option value="DRIVER_CHANGE">Troca de motorista</option>
                        <option value="DAILY">Diario</option>
                        <option value="PRE_TRIP">Pre-viagem</option>
                        <option value="POST_OPERATION">Pos-operacao</option>
                      </select>
                    </label>
                    <label>
                      Status
                      <select
                        className="select"
                        value={templateForm.isActive ? "ACTIVE" : "INACTIVE"}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            isActive: event.target.value === "ACTIVE"
                          }))
                        }
                        disabled={navigationDisabled}
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="INACTIVE">Inativo</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-grid">
                    <label className="toggle-field compact-toggle fleet-checklist-rules-toggle fleet-checklist-template-mandatory-toggle">
                      <span>Obrigatorio para operacao</span>
                      <input
                        type="checkbox"
                        checked={templateForm.isMandatory}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setTemplateForm((current) => ({
                            ...current,
                            isMandatory: checked
                          }));
                          setRulesForm((current) => ({
                            ...current,
                            checklistMandatory: checked
                          }));
                        }}
                        disabled={navigationDisabled}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {activeStep === "CHECKLIST_ITEMS" ? (
                <>
                  <div className="panel-head">
                    <h2>Itens do checklist</h2>
                    <span>Gerencie verificacoes em lista compacta e cadastro por modal.</span>
                  </div>

                  <div className="toolbar">
                    <button
                      type="button"
                      onClick={openCreateItemModal}
                      disabled={navigationDisabled}
                    >
                      Adicionar item
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <section className="cargo-editor-levels-panel fleet-checklist-items-panel">
                      <div className="cargo-editor-levels-head">
                        <div className="cargo-editor-levels-copy">
                          <strong>Lista de itens</strong>
                          <span>Visualizacao compacta para leitura e manutencao operacional.</span>
                        </div>
                        <span className="cargo-editor-levels-count">
                          {items.length} {items.length === 1 ? "item" : "itens"}
                        </span>
                      </div>

                      <div className="cargo-editor-levels-list" aria-label="Itens do checklist">
                      {items.map((item, index) => {
                        const automationPreview =
                          item.hasConditionalAutomation
                            ? (() => {
                                const ruleActions = [
                                  ...item.booleanNegativeActions,
                                  ...item.options.flatMap((option) => option.actions),
                                  ...item.completionActions
                                ];
                                const normalized = clean(ruleActions);
                                if (normalized.length === 0) {
                                  return "Configurada sem acao";
                                }
                                return normalized
                                  .map((action) => actionLabel(action))
                                  .join(" + ");
                              })()
                            : "Sem automacao";

                        return (
                          <article key={item.clientKey} className="cargo-editor-level-row fleet-checklist-item-row">
                            <div className="cargo-editor-level-row-main">
                              <span className="cargo-editor-level-row-index">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div className="fleet-checklist-item-copy">
                                <strong>{item.label}</strong>
                                {item.description ? <small>{item.description}</small> : null}
                              </div>
                            </div>

                            <div className="fleet-checklist-item-meta">
                              <span>
                                {itemInputLabel(item)} • {item.isRequired ? "Obrigatorio" : "Opcional"} •{" "}
                                {item.isActive ? "Ativo" : "Inativo"}
                              </span>
                              <small>Automacao: {automationPreview}</small>
                            </div>

                            <div className="fleet-checklist-item-actions">
                              <button
                                type="button"
                                className="button-link secondary-link cargo-editor-level-row-remove"
                                onClick={() => openEditItemModal(item)}
                                disabled={navigationDisabled}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="button-link secondary-link cargo-editor-level-row-remove"
                                onClick={() => void handleDuplicateItem(item)}
                                disabled={navigationDisabled}
                              >
                                Duplicar
                              </button>
                              <button
                                type="button"
                                className="button-link secondary-link cargo-editor-level-row-remove"
                                onClick={() => void handleDeleteItem(item)}
                                disabled={navigationDisabled}
                              >
                                Excluir
                              </button>
                            </div>
                          </article>
                        );
                      })}
                      </div>
                    </section>
                  ) : (
                    <div className="empty-state fleet-panel-empty">
                      <strong>Nenhum item cadastrado.</strong>
                      <p>Use "Adicionar item" para montar o checklist por verificacoes.</p>
                    </div>
                  )}
                </>
              ) : null}

              {activeStep === "RULES_AUTOMATIONS" ? (
                <>
                  <div className="panel-head">
                    <h2>Regras e configuracoes operacionais</h2>
                    <span>Defina regras de execucao, validacao e recursos adicionais do template.</span>
                  </div>

                  <div className="fleet-checklist-rules-layout">
                    <section className="fleet-checklist-rules-group">
                      <header className="fleet-checklist-rules-group-head">
                        <strong>Execucao operacional</strong>
                        <small>Defina quando o checklist deve ser exigido na rotina da frota.</small>
                      </header>

                      <div className="form-grid fleet-checklist-rules-grid">
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Exigir antes da rota</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.requireBeforeRoute}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                requireBeforeRoute: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Exigir na troca de motorista</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.requireOnDriverChange}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                requireOnDriverChange: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Obrigatorio para operacao</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.checklistMandatory}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                checklistMandatory: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                        <label>
                          Periodicidade obrigatoria
                          <select
                            className="select"
                            value={rulesForm.executionFrequency}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                executionFrequency: event.target.value as FrequencyType
                              }))
                            }
                            disabled={navigationDisabled}
                          >
                            <option value="START_OF_DAY">Sempre antes da rota</option>
                            <option value="END_OF_DAY">Ao final de cada turno</option>
                            <option value="DRIVER_CHANGE">A cada troca de motorista</option>
                            <option value="DAILY">1x por dia</option>
                            <option value="PRE_TRIP">Antes da pre-viagem</option>
                            <option value="POST_OPERATION">Ao concluir a operacao</option>
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="fleet-checklist-rules-group">
                      <header className="fleet-checklist-rules-group-head">
                        <strong>Validacao</strong>
                        <small>Controle bloqueios operacionais e validade da ultima execucao.</small>
                      </header>

                      <div className="form-grid fleet-checklist-rules-grid">
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Bloquear veiculo se reprovado</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.blockVehicleOnFailure}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                blockVehicleOnFailure: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                        <label>
                          Validade do checklist (horas)
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={rulesForm.validityHours}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                validityHours: event.target.value
                              }))
                            }
                            placeholder="24"
                            disabled={navigationDisabled}
                          />
                        </label>
                      </div>
                    </section>

                    <section className="fleet-checklist-rules-group">
                      <header className="fleet-checklist-rules-group-head">
                        <strong>Recursos adicionais</strong>
                        <small>Defina evidencias e anotacoes permitidas durante o checklist.</small>
                      </header>

                      <div className="form-grid fleet-checklist-rules-grid">
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Permitir fotos</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.allowPhotos}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                allowPhotos: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                        <label className="toggle-field compact-toggle fleet-checklist-rules-toggle">
                          <span>Permitir observacoes do motorista</span>
                          <input
                            type="checkbox"
                            checked={rulesForm.allowNotes}
                            onChange={(event) =>
                              setRulesForm((current) => ({
                                ...current,
                                allowNotes: event.target.checked
                              }))
                            }
                            disabled={navigationDisabled}
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                </>
              ) : null}

              {activeStep === "REVIEW" ? (
                <>
                  <div className="panel-head">
                    <h2>Revisao final</h2>
                    <span>Confira o resumo do template antes de salvar.</span>
                  </div>

                  <div className="journey-review-grid">
                    <div className="review-item">
                      <label className="review-item-label">Nome</label>
                      <strong>{templateForm.name || "Nao informado"}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Categoria</label>
                      <strong>{templateForm.category || "Nao informado"}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Frequencia</label>
                      <strong>{resolveFrequencyLabel(templateForm.frequencyType)}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Status</label>
                      <strong>{templateForm.isActive ? "Ativo" : "Inativo"}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Itens</label>
                      <strong>{reviewStats.total}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Itens obrigatorios</label>
                      <strong>{reviewStats.required}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Itens com automacao</label>
                      <strong>{reviewStats.automation}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Bloqueio em reprova</label>
                      <strong>{rulesForm.blockVehicleOnFailure ? "Sim" : "Nao"}</strong>
                    </div>
                    <div className="review-item">
                      <label className="review-item-label">Validade</label>
                      <strong>
                        {rulesForm.validityHours.trim()
                          ? `${rulesForm.validityHours.trim()} hora(s)`
                          : "Nao definida"}
                      </strong>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="driver-editor-form-footer">
                <div className="driver-editor-form-actions">
                  <Link
                    href="/fleet/checklists"
                    className={[
                      "button-link secondary-link",
                      activeStep === "TEMPLATE_INFO"
                        ? "fleet-checklist-template-info-backlink"
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    Voltar para lista
                  </Link>

                  <div className="driver-editor-form-nav-actions">
                    {activeStepIndex > 0 ? (
                      <button
                        type="button"
                        className="driver-editor-nav-button"
                        onClick={goToPreviousStep}
                        disabled={navigationDisabled}
                      >
                        Etapa anterior
                      </button>
                    ) : null}

                    {activeStep === "TEMPLATE_INFO" ? (
                      <button
                        type="button"
                        className="driver-editor-submit-button fleet-checklist-template-info-cta"
                        onClick={() => void handleContinueFromTemplateInfo()}
                        disabled={navigationDisabled}
                      >
                        Continuar
                      </button>
                    ) : null}

                    {activeStep !== "TEMPLATE_INFO" && activeStep !== "REVIEW" ? (
                      <button
                        type="button"
                        className="driver-editor-nav-button"
                        onClick={goToNextStep}
                        disabled={navigationDisabled}
                      >
                        Proxima etapa
                      </button>
                    ) : null}

                    {activeStep === "REVIEW" ? (
                      <button
                        type="button"
                        className="driver-editor-submit-button"
                        onClick={() => void handleFinalSave()}
                        disabled={navigationDisabled}
                      >
                        {isSavingFinal || isSavingTemplate ? "Salvando..." : "Salvar template"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>

      <DriverProfileEditorModal
        open={Boolean(itemModal)}
        title={itemModal?.mode === "edit" ? "Editar item do checklist" : "Adicionar item do checklist"}
        description="Configure o item por secoes, com foco em velocidade e leitura operacional."
        onClose={closeItemModal}
        dialogWidth="min(860px, calc(100vw - 24px))"
        dialogClassName="fleet-checklist-item-modal"
        footer={
          <>
            <button
              type="button"
              className="button-link secondary-link"
              onClick={closeItemModal}
              disabled={isSavingItem}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void saveItemModal()}
              disabled={isSavingItem}
            >
              {isSavingItem ? "Salvando..." : itemModal?.mode === "edit" ? "Salvar item" : "Adicionar item"}
            </button>
          </>
        }
      >
        <div className="stack fleet-checklist-item-modal-body">
          <section className="fleet-checklist-item-modal-section">
            <header className="fleet-checklist-item-modal-section-head">
              <strong>Informacoes basicas</strong>
              <small>Dados centrais de identificacao do item.</small>
            </header>

          <div className="form-grid">
            <label className="driver-editor-modal-field-full">
              Nome do item
              <input
                value={itemForm.label}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="Ex.: Verificar pneus"
                disabled={isSavingItem}
              />
            </label>
            <label className="driver-editor-modal-field-full">
              Categoria
              <input
                value={itemForm.category}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Ex.: Seguranca"
                disabled={isSavingItem}
              />
            </label>
          </div>

          <label className="driver-editor-modal-field-full">
            Descricao
            <textarea
              rows={3}
              value={itemForm.description}
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="Detalhe o que deve ser validado nesse item."
              disabled={isSavingItem}
            />
          </label>

          <div className="form-grid">
            <label>
              Ordem
              <input
                inputMode="numeric"
                value={itemForm.sortOrder}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    sortOrder: event.target.value
                  }))
                }
                placeholder="10"
                disabled={isSavingItem}
              />
            </label>
            <label>
              Status
              <select
                className="select"
                value={itemForm.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    isActive: event.target.value === "ACTIVE"
                  }))
                }
                disabled={isSavingItem}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label className="toggle-field">
              <span>Obrigatorio?</span>
              <input
                type="checkbox"
                checked={itemForm.isRequired}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    isRequired: event.target.checked
                  }))
                }
                disabled={isSavingItem}
              />
            </label>
          </div>
          </section>

          <section className="fleet-checklist-item-modal-section">
            <header className="fleet-checklist-item-modal-section-head">
              <strong>Tipo de resposta</strong>
              <small>Defina como o operador responde a verificacao.</small>
            </header>
            <div className="fleet-checklist-type-grid">
              {[
                ["BOOLEAN", "Sim / Nao", "Validacao objetiva."],
                ["TEXT", "Texto", "Resposta descritiva."],
                ["NUMBER", "Numero", "Valor numerico ou KM."],
                ["PHOTO", "Foto", "Evidencia visual."],
                ["SELECT", "Multipla escolha", "Alternativas controladas."]
              ].map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    itemForm.inputType === value
                      ? "fleet-checklist-type-card fleet-checklist-type-card-compact is-active"
                      : "fleet-checklist-type-card fleet-checklist-type-card-compact"
                  }
                  onClick={() =>
                    setItemForm((current) => ({
                      ...current,
                      inputType: value as InputKind
                    }))
                  }
                  disabled={isSavingItem}
                >
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </button>
              ))}
            </div>
          

          {itemForm.inputType === "NUMBER" ? (
            <div className="fleet-checklist-number-grid">
              <button
                type="button"
                className={
                  itemForm.numberMode === "ODOMETER"
                    ? "fleet-checklist-type-card fleet-checklist-type-card-compact is-active"
                    : "fleet-checklist-type-card fleet-checklist-type-card-compact"
                }
                onClick={() =>
                  setItemForm((current) => ({
                    ...current,
                    numberMode: "ODOMETER"
                  }))
                }
                disabled={isSavingItem}
              >
                <strong>KM / odometro</strong>
                <span>Usa o valor como quilometragem.</span>
              </button>
              <button
                type="button"
                className={
                  itemForm.numberMode === "FREE"
                    ? "fleet-checklist-type-card fleet-checklist-type-card-compact is-active"
                    : "fleet-checklist-type-card fleet-checklist-type-card-compact"
                }
                onClick={() =>
                  setItemForm((current) => ({ ...current, numberMode: "FREE" }))
                }
                disabled={isSavingItem}
              >
                <strong>Numero livre</strong>
                <span>Usa o valor como medicao generica.</span>
              </button>
            </div>
          ) : null}

          {itemForm.inputType === "SELECT" ? (
            <div className="fleet-checklist-option-stack">
              {itemForm.options.map((option, index) => (
                <article key={option.id} className="fleet-checklist-option-card fleet-checklist-option-card-compact">
                  <div className="fleet-checklist-option-card-head">
                    <strong>Opcao {index + 1}</strong>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setItemForm((current) => ({
                          ...current,
                          options:
                            current.options.length === 1
                              ? current.options
                              : current.options.filter((row) => row.id !== option.id)
                        }))
                      }
                      disabled={isSavingItem || itemForm.options.length === 1}
                    >
                      Remover
                    </button>
                  </div>
                  <label>
                    Nome da opcao
                    <input
                      value={option.label}
                      onChange={(event) =>
                        setItemForm((current) => ({
                          ...current,
                          options: current.options.map((row) =>
                            row.id === option.id
                              ? { ...row, label: event.target.value }
                              : row
                          )
                        }))
                      }
                      placeholder="Ex.: Reprovado"
                      disabled={isSavingItem}
                    />
                  </label>
                </article>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setItemForm((current) => ({
                    ...current,
                    options: [...current.options, { id: uid(), label: "", actions: [] }]
                  }))
                }
                disabled={isSavingItem}
              >
                + Adicionar opcao
              </button>
            </div>
          ) : null}
          </section>

          <section className="fleet-checklist-item-modal-section">
            <header className="fleet-checklist-item-modal-section-head">
              <strong>Automacoes condicionais</strong>
              <small>Exiba regras apenas quando necessario.</small>
            </header>

          <div className="form-grid fleet-checklist-item-modal-toggle-grid">
            <label className="toggle-field">
              <span>Possui automacao condicional</span>
              <input
                type="checkbox"
                checked={itemForm.hasConditionalAutomation}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    hasConditionalAutomation: event.target.checked
                  }))
                }
                disabled={isSavingItem}
              />
            </label>
          </div>

          {itemForm.hasConditionalAutomation ? (
            <>
              {itemForm.inputType === "BOOLEAN" ? (
                <div className="fleet-checklist-dynamic-panel fleet-checklist-dynamic-panel-compact">
                  <div className="fleet-checklist-logic-banner">
                    <strong>Se a resposta for negativa</strong>
                    <span>Selecione as automacoes desejadas.</span>
                  </div>
                  <ActionPicker
                    value={itemForm.booleanNegativeActions}
                    onToggle={(action) =>
                      setItemForm((current) => ({
                        ...current,
                        booleanNegativeActions: toggle(
                          current.booleanNegativeActions,
                          action
                        )
                      }))
                    }
                  />
                </div>
              ) : null}

              {itemForm.inputType === "SELECT" ? (
                <div className="fleet-checklist-dynamic-panel fleet-checklist-dynamic-panel-compact">
                  <div className="fleet-checklist-logic-banner">
                    <strong>Acoes por opcao</strong>
                    <span>Configure automacoes para cada alternativa.</span>
                  </div>
                  <div className="fleet-checklist-option-stack">
                    {itemForm.options.map((option, index) => (
                      <article key={`${option.id}-actions`} className="fleet-checklist-option-card fleet-checklist-option-card-compact">
                        <div className="fleet-checklist-option-card-head">
                          <strong>{option.label.trim() || `Opcao ${index + 1}`}</strong>
                        </div>
                        <ActionPicker
                          value={option.actions}
                          onToggle={(action) =>
                            setItemForm((current) => ({
                              ...current,
                              options: current.options.map((row) =>
                                row.id === option.id
                                  ? { ...row, actions: toggle(row.actions, action) }
                                  : row
                              )
                            }))
                          }
                        />
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {itemForm.inputType !== "BOOLEAN" && itemForm.inputType !== "SELECT" ? (
                <div className="fleet-checklist-dynamic-panel fleet-checklist-dynamic-panel-compact">
                  <div className="fleet-checklist-logic-banner">
                    <strong>Acoes ao concluir o item</strong>
                    <span>Use para exigir complemento ou disparar fluxo operacional.</span>
                  </div>
                  <ActionPicker
                    value={itemForm.completionActions}
                    onToggle={(action) =>
                      setItemForm((current) => ({
                        ...current,
                        completionActions: toggle(current.completionActions, action)
                      }))
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}
          </section>

          {itemModalError ? (
            <p className="cargo-editor-alert" role="alert">
              {itemModalError}
            </p>
          ) : null}
        </div>
      </DriverProfileEditorModal>
    </main>
  );
}

function ActionPicker({
  value,
  onToggle
}: {
  value: ActionKind[];
  onToggle: (action: ActionKind) => void;
}) {
  return (
    <div className="fleet-checklist-action-grid">
      {ACTIONS.map((action) => (
        <button
          key={action.value}
          type="button"
          className={
            value.includes(action.value)
              ? "fleet-checklist-action-card is-active"
              : "fleet-checklist-action-card"
          }
          onClick={() => onToggle(action.value)}
        >
          <strong>{action.label}</strong>
          <span>{action.description}</span>
        </button>
      ))}
    </div>
  );
}

function uid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
