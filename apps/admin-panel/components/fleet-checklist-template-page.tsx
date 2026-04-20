"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import {
  FleetChecklistBuilderRule,
  FleetChecklistTaskBuilderConfig,
  FleetChecklistTemplate,
  FleetChecklistTemplateTask,
  request
} from "../lib/api";

type TemplateForm = {
  name: string;
  category: string;
  routine: "START_OF_DAY" | "END_OF_DAY";
  isActive: boolean;
};

type InputKind = "BOOLEAN" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";
type ActionKind = FleetChecklistTemplateTask["actionType"];
type NumberMode = NonNullable<FleetChecklistTaskBuilderConfig["numberMode"]>;
type OptionRow = { id: string; label: string; actions: ActionKind[] };
type TaskForm = {
  label: string;
  description: string;
  sortOrder: string;
  inputType: InputKind;
  numberMode: NumberMode;
  completionActions: ActionKind[];
  booleanNegativeActions: ActionKind[];
  options: OptionRow[];
  isRequired: boolean;
  isActive: boolean;
};

type Props = { templateId?: string };

const ACTIONS: Array<{ value: ActionKind; label: string; description: string }> = [
  { value: "OPEN_MAINTENANCE", label: "Abrir OS", description: "Encaminha para manutencao." },
  { value: "OPEN_SUPPORT_TICKET", label: "Abrir chamado", description: "Gera ocorrencia operacional." },
  { value: "REQUIRE_PHOTO", label: "Solicitar foto", description: "Exige evidencia visual." },
  { value: "REQUIRE_NOTE", label: "Solicitar observacao", description: "Exige texto complementar." },
  { value: "REQUIRE_NUMBER", label: "Solicitar numero", description: "Exige valor numerico extra." }
];

const emptyTemplate: TemplateForm = { name: "", category: "", routine: "START_OF_DAY", isActive: true };
const emptyTask: TaskForm = {
  label: "",
  description: "",
  sortOrder: "",
  inputType: "BOOLEAN",
  numberMode: "FREE",
  completionActions: [],
  booleanNegativeActions: [],
  options: [{ id: uid(), label: "", actions: [] }],
  isRequired: true,
  isActive: true
};

export function FleetChecklistTemplatePage({ templateId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>([]);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando listas de checklist...");

  useEffect(() => {
    void request<FleetChecklistTemplate[]>("/admin/fleet/checklist-templates")
      .then((items) => {
        setTemplates(items);
        setStatusMessage(`${items.length} lista(s) de checklist carregada(s).`);
      })
      .catch((error: Error) => setStatusMessage(error.message))
      .finally(() => setIsLoading(false));
  }, []);

  const template = useMemo(
    () => (templateId ? templates.find((item) => item.id === templateId) ?? null : null),
    [templateId, templates]
  );
  const stats = useMemo(
    () => ({
      total: template?.items.length ?? 0,
      active: template?.items.filter((item) => item.isActive).length ?? 0,
      required: template?.items.filter((item) => item.isRequired).length ?? 0
    }),
    [template]
  );
  const draftRules = useMemo(() => buildRules(taskForm), [taskForm]);
  const draftCompletionActions = useMemo(
    () => clean(taskForm.inputType === "BOOLEAN" || taskForm.inputType === "SELECT" ? [] : taskForm.completionActions),
    [taskForm]
  );

  useEffect(() => {
    if (!templateId) return setTemplateForm(emptyTemplate);
    if (!template) return;
    setTemplateForm({
      name: template.name,
      category: template.category,
      routine: template.routine,
      isActive: template.isActive
    });
  }, [template, templateId]);

  useEffect(() => {
    if (!template || !taskId) {
      setEditingTaskId(null);
      setTaskForm(emptyTask);
      return;
    }
    const task = template.items.find((item) => item.id === taskId);
    if (!task) {
      setEditingTaskId(null);
      setTaskForm(emptyTask);
      return;
    }
    setEditingTaskId(task.id);
    setTaskForm(toTaskForm(task));
  }, [taskId, template]);

  async function saveTemplate() {
    setIsSavingTemplate(true);
    try {
      const next = await request<FleetChecklistTemplate[]>(
        templateId ? `/admin/fleet/checklist-templates/${templateId}` : "/admin/fleet/checklist-templates",
        {
          method: templateId ? "PATCH" : "POST",
          body: JSON.stringify(templateForm)
        }
      );
      setTemplates(next);
      if (!templateId) {
        const created = [...next]
          .filter((item) => item.name === templateForm.name && item.category === templateForm.category)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (created) {
          router.push(`/fleet/checklists/${created.id}`);
          router.refresh();
          return;
        }
      }
      setStatusMessage(templateId ? "Lista atualizada." : "Lista criada.");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar lista.");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function saveTask() {
    if (!templateId) return setStatusMessage("Salve a lista antes de montar tasks.");
    setIsSavingTask(true);
    try {
      const next = await request<FleetChecklistTemplate[]>(
        editingTaskId
          ? `/admin/fleet/checklist-templates/tasks/${editingTaskId}`
          : `/admin/fleet/checklist-templates/${templateId}/tasks`,
        { method: editingTaskId ? "PATCH" : "POST", body: JSON.stringify(toTaskPayload(taskForm)) }
      );
      setTemplates(next);
      setEditingTaskId(null);
      setTaskForm(emptyTask);
      setStatusMessage(editingTaskId ? "Task atualizada." : "Task criada.");
      router.push(`/fleet/checklists/${templateId}`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar task.");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function toggleTask(task: FleetChecklistTemplateTask) {
    setPendingTaskId(task.id);
    try {
      const next = await request<FleetChecklistTemplate[]>(`/admin/fleet/checklist-templates/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: task.label,
          description: task.description || undefined,
          inputType: task.inputType,
          actionType: task.actionType,
          selectOptions: task.selectOptions,
          builderConfig: task.builderConfig,
          sortOrder: task.sortOrder,
          isRequired: task.isRequired,
          isActive: !task.isActive
        })
      });
      setTemplates(next);
      setStatusMessage(`Task ${task.label} ${task.isActive ? "inativada" : "ativada"}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Falha ao atualizar ${task.label}.`);
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <main className="page-shell page-shell-form">
      <section className="page-hero fleet-checklist-builder-hero">
        <div>
          <p className="eyebrow">PAINEL ADMINISTRATIVO</p>
          <h1>{templateId ? "Builder de checklist inteligente" : "Nova lista de checklist"}</h1>
          <p className="helper-text">
            {templateId
              ? "Organize a lista, visualize tasks em cards e configure regras condicionais."
              : "Crie a lista primeiro. Depois monte o builder das tasks nesta mesma pagina."}
          </p>
        </div>
        {template ? (
          <div className="fleet-checklist-builder-stats">
            <article><strong>{stats.total}</strong><span>tasks</span></article>
            <article><strong>{stats.active}</strong><span>ativas</span></article>
            <article><strong>{stats.required}</strong><span>obrigatorias</span></article>
          </div>
        ) : null}
      </section>

      <section className="grid grid-single fleet-checklist-builder-shell">
        <article className="panel panel-wide fleet-section-card fleet-checklist-builder-section">
          <div className="panel-head fleet-section-head">
            <div>
              <h2>1. Informacoes da lista</h2>
              <span>Configuracao compacta, profissional e em duas colunas.</span>
            </div>
          </div>
          <div className="stack">
            <div className="fleet-checklist-builder-meta-grid">
              <label>Nome da lista<input value={templateForm.name} onChange={(e) => setTemplateForm((c) => ({ ...c, name: e.target.value }))} placeholder="Ex.: Checklist de abertura premium" /></label>
              <label>Categoria<input value={templateForm.category} onChange={(e) => setTemplateForm((c) => ({ ...c, category: e.target.value }))} placeholder="Ex.: Inspecao tecnica" /></label>
              <label>Rotina<select className="select" value={templateForm.routine} onChange={(e) => setTemplateForm((c) => ({ ...c, routine: e.target.value as TemplateForm["routine"] }))}><option value="START_OF_DAY">Inicio da jornada</option><option value="END_OF_DAY">Fim da jornada</option></select></label>
              <label>Status<select className="select" value={templateForm.isActive ? "ACTIVE" : "INACTIVE"} onChange={(e) => setTemplateForm((c) => ({ ...c, isActive: e.target.value === "ACTIVE" }))}><option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option></select></label>
            </div>
            <div className="toolbar">
              <button type="button" disabled={isSavingTemplate || !templateForm.name.trim() || !templateForm.category.trim()} onClick={() => void saveTemplate()}>{isSavingTemplate ? "Salvando..." : templateId ? "Salvar lista" : "Criar lista"}</button>
              <Link href="/fleet/checklists" className="button-link secondary-link">Voltar para checklists</Link>
            </div>
            <p className="drivers-page-status">{isLoading ? "Carregando..." : statusMessage}</p>
          </div>
        </article>

        {templateId ? (
          <>
            <article className="panel panel-wide fleet-section-card fleet-checklist-builder-section">
              <div className="panel-head fleet-section-head">
                <div>
                  <h2>2. Lista de tasks</h2>
                  <span>Cards com contexto, status e regras de cada validacao.</span>
                </div>
              </div>

              {template?.items.length ? (
                <div className="fleet-checklist-task-card-grid">
                  {template.items.map((task) => (
                    <article key={task.id} className="fleet-checklist-task-card">
                      <div className="fleet-checklist-task-card-head">
                        <div>
                          <p className="fleet-checklist-task-eyebrow">{template.category} - {routineLabel(template.routine)}</p>
                          <h3>{task.label}</h3>
                          {task.description ? <p>{task.description}</p> : null}
                        </div>
                        <span className={task.isActive ? "chip" : "chip chip-soft"}>{task.isActive ? "Ativa" : "Inativa"}</span>
                      </div>

                      <div className="fleet-checklist-task-facts">
                        <article><span>Tipo</span><strong>{taskInputLabel(task)}</strong></article>
                        <article><span>Obrigatoria</span><strong>{task.isRequired ? "Sim" : "Nao"}</strong></article>
                        <article><span>Status</span><strong>{task.isActive ? "Ativa" : "Inativa"}</strong></article>
                        <article><span>Ordem</span><strong>{task.sortOrder}</strong></article>
                      </div>

                      <div className="fleet-checklist-task-rule-block">
                        <h4>Regras e automacoes</h4>
                        {renderRuleSummary(task)}
                      </div>

                      <div className="fleet-checklist-task-card-actions">
                        <Link href={`/fleet/checklists/${template.id}?taskId=${task.id}`} className="button-link secondary-link">Editar</Link>
                        <button type="button" className="secondary" disabled={pendingTaskId === task.id} onClick={() => void toggleTask(task)}>
                          {pendingTaskId === task.id ? "Salvando..." : task.isActive ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state fleet-panel-empty">
                  <strong>Nenhuma task cadastrada.</strong>
                  <p>Use o builder abaixo para criar a primeira regra desta lista.</p>
                </div>
              )}
            </article>

            <article className="panel panel-wide fleet-section-card fleet-checklist-builder-section">
              <div className="panel-head fleet-section-head">
                <div>
                  <h2>3. Builder da task</h2>
                  <span>Um fluxo de configuracao com informacoes, tipo, regras dinamicas e preview.</span>
                </div>
              </div>

              <div className="fleet-checklist-builder-grid">
                <div className="fleet-checklist-builder-main">
                  <section className="fleet-checklist-builder-block">
                    <div className="fleet-checklist-builder-block-head">
                      <strong>A. Informacoes basicas</strong>
                      <span>Defina o que precisa ser verificado e a ordem operacional.</span>
                    </div>

                    <div className="fleet-checklist-builder-fields">
                      <label className="fleet-checklist-builder-field-wide">Nome da task<input value={taskForm.label} onChange={(e) => setTaskForm((c) => ({ ...c, label: e.target.value }))} placeholder="Ex.: Conferir oleo do motor" /></label>
                      <label className="fleet-checklist-builder-field-wide">Descricao<textarea rows={3} value={taskForm.description} onChange={(e) => setTaskForm((c) => ({ ...c, description: e.target.value }))} placeholder="Explique o criterio da verificacao." /></label>
                      <label>Ordem<input value={taskForm.sortOrder} onChange={(e) => setTaskForm((c) => ({ ...c, sortOrder: e.target.value }))} inputMode="numeric" placeholder="10" /></label>
                      <label>Obrigatoriedade<select className="select" value={taskForm.isRequired ? "REQUIRED" : "OPTIONAL"} onChange={(e) => setTaskForm((c) => ({ ...c, isRequired: e.target.value === "REQUIRED" }))}><option value="REQUIRED">Obrigatoria</option><option value="OPTIONAL">Opcional</option></select></label>
                      <label>Status<select className="select" value={taskForm.isActive ? "ACTIVE" : "INACTIVE"} onChange={(e) => setTaskForm((c) => ({ ...c, isActive: e.target.value === "ACTIVE" }))}><option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option></select></label>
                    </div>
                  </section>

                  <section className="fleet-checklist-builder-block">
                    <div className="fleet-checklist-builder-block-head">
                      <strong>B. Tipo de resposta</strong>
                      <span>Escolha o formato e destrave a configuracao correta.</span>
                    </div>

                    <div className="fleet-checklist-type-grid">
                      {[
                        ["BOOLEAN", "Sim / Nao", "Validacao objetiva."],
                        ["SELECT", "Multipla escolha", "Regras por resultado."],
                        ["NUMBER", "Numero", "Valor livre ou KM."],
                        ["TEXT", "Texto", "Descricao do motorista."],
                        ["PHOTO", "Foto", "Evidencia visual."]
                      ].map(([value, label, detail]) => (
                        <button key={value} type="button" className={taskForm.inputType === value ? "fleet-checklist-type-card is-active" : "fleet-checklist-type-card"} onClick={() => setTaskForm((c) => ({ ...c, inputType: value as InputKind }))}>
                          <strong>{label}</strong>
                          <span>{detail}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="fleet-checklist-builder-block">
                    <div className="fleet-checklist-builder-block-head">
                      <strong>C. Configuracao dinamica</strong>
                      <span>Monte regras condicionais e comportamento da task conforme o tipo.</span>
                    </div>
                    {renderDynamicBuilder(taskForm, setTaskForm)}
                  </section>

                  <div className="toolbar">
                    <button type="button" disabled={!canSaveTask(taskForm) || isSavingTask} onClick={() => void saveTask()}>
                      {isSavingTask ? "Salvando..." : editingTaskId ? "Salvar task" : "Criar task"}
                    </button>
                    {editingTaskId ? <Link href={`/fleet/checklists/${templateId}`} className="button-link secondary-link">Cancelar edicao</Link> : null}
                  </div>
                </div>

                <aside className="fleet-checklist-builder-aside">
                  <section className="fleet-checklist-builder-preview">
                    <div className="fleet-checklist-builder-block-head">
                      <strong>D. Regras geradas</strong>
                      <span>Leitura clara do comportamento final da task.</span>
                    </div>
                    {draftRules.length || draftCompletionActions.length ? (
                      <div className="fleet-checklist-rule-preview-list">
                        {draftRules.map((rule) => (
                          <article key={rule.id} className="fleet-checklist-rule-preview-card">
                            <span className="fleet-checklist-rule-when">SE: {rule.label}</span>
                            <strong>ENTAO: {rule.actions.map(actionLabel).join(" + ")}</strong>
                          </article>
                        ))}
                        {draftCompletionActions.length ? (
                          <article className="fleet-checklist-rule-preview-card">
                            <span className="fleet-checklist-rule-when">SE: Resposta concluida</span>
                            <strong>ENTAO: {draftCompletionActions.map(actionLabel).join(" + ")}</strong>
                          </article>
                        ) : null}
                      </div>
                    ) : (
                      <div className="empty-state fleet-panel-empty">
                        <strong>Nenhuma regra condicional configurada.</strong>
                        <p>As automacoes aparecem aqui conforme voce monta o builder.</p>
                      </div>
                    )}
                  </section>

                  <section className="fleet-checklist-builder-preview">
                    <div className="fleet-checklist-builder-block-head">
                      <strong>E. Resumo da task</strong>
                      <span>Visao executiva do resultado final.</span>
                    </div>
                    <div className="fleet-checklist-summary-grid">
                      <article><span>Tipo</span><strong>{formInputLabel(taskForm)}</strong></article>
                      <article><span>Obrigatoria</span><strong>{taskForm.isRequired ? "Sim" : "Nao"}</strong></article>
                      <article><span>Status</span><strong>{taskForm.isActive ? "Ativa" : "Inativa"}</strong></article>
                      <article><span>Ordem</span><strong>{taskForm.sortOrder.trim() || "0"}</strong></article>
                    </div>
                  </section>
                </aside>
              </div>
            </article>
          </>
        ) : (
          <article className="panel panel-wide fleet-section-card fleet-checklist-builder-section">
            <div className="empty-state fleet-panel-empty">
              <strong>Salve a lista para desbloquear o builder.</strong>
              <p>Depois da criacao, esta pagina passa a exibir cards, regras condicionais e automacoes por resposta.</p>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

function renderDynamicBuilder(taskForm: TaskForm, setTaskForm: Dispatch<SetStateAction<TaskForm>>) {
  if (taskForm.inputType === "BOOLEAN") {
    return (
      <div className="fleet-checklist-dynamic-panel">
        <div className="fleet-checklist-logic-banner">
          <strong>Se a resposta for NAO</strong>
          <span>Selecione as automacoes que devem ser disparadas.</span>
        </div>
        <ActionPicker value={taskForm.booleanNegativeActions} onToggle={(action) => setTaskForm((c) => ({ ...c, booleanNegativeActions: toggle(c.booleanNegativeActions, action) }))} />
      </div>
    );
  }

  if (taskForm.inputType === "SELECT") {
    return (
      <div className="fleet-checklist-dynamic-panel">
        <div className="fleet-checklist-logic-banner">
          <strong>Configure opcoes e regras por resposta</strong>
          <span>Cada opcao pode disparar um conjunto diferente de automacoes.</span>
        </div>
        <div className="fleet-checklist-option-stack">
          {taskForm.options.map((option, index) => (
            <article key={option.id} className="fleet-checklist-option-card">
              <div className="fleet-checklist-option-card-head">
                <strong>Opcao {index + 1}</strong>
                <button type="button" className="secondary" disabled={taskForm.options.length === 1} onClick={() => setTaskForm((c) => ({ ...c, options: c.options.length === 1 ? c.options : c.options.filter((item) => item.id !== option.id) }))}>Remover</button>
              </div>
              <label>Nome da opcao<input value={option.label} onChange={(e) => setTaskForm((c) => ({ ...c, options: c.options.map((item) => item.id === option.id ? { ...item, label: e.target.value } : item) }))} placeholder="Ex.: Arranhado" /></label>
              <div className="fleet-checklist-option-actions">
                <p>Se resposta = {option.label.trim() || `Opcao ${index + 1}`}</p>
                <ActionPicker value={option.actions} onToggle={(action) => setTaskForm((c) => ({ ...c, options: c.options.map((item) => item.id === option.id ? { ...item, actions: toggle(item.actions, action) } : item) }))} />
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="secondary" onClick={() => setTaskForm((c) => ({ ...c, options: [...c.options, { id: uid(), label: "", actions: [] }] }))}>+ Adicionar opcao</button>
      </div>
    );
  }

  return (
    <div className="fleet-checklist-dynamic-panel">
      {taskForm.inputType === "NUMBER" ? (
        <div className="fleet-checklist-number-grid">
          <button type="button" className={taskForm.numberMode === "ODOMETER" ? "fleet-checklist-type-card is-active" : "fleet-checklist-type-card"} onClick={() => setTaskForm((c) => ({ ...c, numberMode: "ODOMETER" }))}><strong>KM / odometro</strong><span>Usa o valor como quilometragem da jornada.</span></button>
          <button type="button" className={taskForm.numberMode === "FREE" ? "fleet-checklist-type-card is-active" : "fleet-checklist-type-card"} onClick={() => setTaskForm((c) => ({ ...c, numberMode: "FREE" }))}><strong>Numero livre</strong><span>Usa o valor como medicao generica.</span></button>
        </div>
      ) : null}
      <div className="fleet-checklist-logic-banner">
        <strong>{taskForm.inputType === "PHOTO" ? "A resposta principal sera uma foto" : taskForm.inputType === "TEXT" ? "A resposta principal sera um texto livre" : "Acoes complementares ao concluir a resposta"}</strong>
        <span>Use para exigir observacao, foto, numero complementar ou abertura de fluxo.</span>
      </div>
      <ActionPicker value={taskForm.completionActions} onToggle={(action) => setTaskForm((c) => ({ ...c, completionActions: toggle(c.completionActions, action) }))} />
    </div>
  );
}

function ActionPicker({ value, onToggle }: { value: ActionKind[]; onToggle: (action: ActionKind) => void }) {
  return (
    <div className="fleet-checklist-action-grid">
      {ACTIONS.map((action) => (
        <button key={action.value} type="button" className={value.includes(action.value) ? "fleet-checklist-action-card is-active" : "fleet-checklist-action-card"} onClick={() => onToggle(action.value)}>
          <strong>{action.label}</strong>
          <span>{action.description}</span>
        </button>
      ))}
    </div>
  );
}

function renderRuleSummary(task: FleetChecklistTemplateTask) {
  const rules = taskRules(task);
  const completion = task.builderConfig?.completionActions ?? [];
  if (!rules.length && !completion.length) return <p className="fleet-checklist-task-rule-empty">Sem automacoes condicionais configuradas.</p>;
  return (
    <div className="fleet-checklist-task-rule-list">
      {rules.map((rule) => <article key={rule.id} className="fleet-checklist-task-rule-item"><span>{rule.label}</span><strong>{rule.actions.map(actionLabel).join(" + ")}</strong></article>)}
      {completion.length ? <article className="fleet-checklist-task-rule-item"><span>Ao concluir a resposta</span><strong>{completion.map(actionLabel).join(" + ")}</strong></article> : null}
    </div>
  );
}

function toTaskForm(task: FleetChecklistTemplateTask): TaskForm {
  const config = task.builderConfig;
  const optionActions = new Map((config?.rules ?? []).filter((rule) => rule.condition === "OPTION_EQUALS").map((rule) => [rule.value, rule.actions] as const));
  const options = config?.options?.map((option) => ({ id: option.id, label: option.label, actions: [...(optionActions.get(option.label) ?? [])] })) ?? (task.selectOptions?.map((label) => ({ id: uid(), label, actions: [] })) ?? [{ id: uid(), label: "", actions: [] }]);
  const boolRule = config?.rules?.find((rule) => rule.condition === "BOOLEAN_IS_FALSE");
  return {
    label: task.label,
    description: task.description ?? "",
    sortOrder: String(task.sortOrder),
    inputType: task.inputType === "ODOMETER" ? "NUMBER" : (task.inputType as InputKind),
    numberMode: config?.numberMode ?? (task.inputType === "ODOMETER" ? "ODOMETER" : "FREE"),
    completionActions: config?.completionActions ?? (task.actionType !== "NONE" && task.inputType !== "BOOLEAN" && task.inputType !== "SELECT" ? [task.actionType] : []),
    booleanNegativeActions: boolRule?.actions ?? (task.inputType === "BOOLEAN" && task.actionType !== "NONE" ? [task.actionType] : []),
    options,
    isRequired: task.isRequired,
    isActive: task.isActive
  };
}

function toTaskPayload(taskForm: TaskForm) {
  const rules = buildRules(taskForm);
  const completionActions = clean(taskForm.inputType === "BOOLEAN" || taskForm.inputType === "SELECT" ? [] : taskForm.completionActions);
  const builderConfig: FleetChecklistTaskBuilderConfig = {};
  if (taskForm.inputType === "NUMBER") builderConfig.numberMode = taskForm.numberMode;
  if (taskForm.inputType === "SELECT") builderConfig.options = taskForm.options.map((option) => ({ id: option.id, label: option.label.trim() })).filter((option) => option.label);
  if (rules.length) builderConfig.rules = rules;
  if (completionActions.length) builderConfig.completionActions = completionActions;
  const inputType = taskForm.inputType === "NUMBER" && taskForm.numberMode === "ODOMETER" ? "ODOMETER" : taskForm.inputType;
  const primaryAction = [...rules.flatMap((rule) => rule.actions), ...completionActions].find((action) => action !== "NONE") ?? "NONE";
  return {
    label: taskForm.label.trim(),
    description: taskForm.description.trim() || undefined,
    inputType,
    actionType: primaryAction,
    selectOptions: taskForm.inputType === "SELECT" ? taskForm.options.map((option) => option.label.trim()).filter(Boolean) : undefined,
    builderConfig: Object.keys(builderConfig).length ? builderConfig : undefined,
    sortOrder: taskForm.sortOrder.trim() ? Number(taskForm.sortOrder) : undefined,
    isRequired: taskForm.isRequired,
    isActive: taskForm.isActive
  };
}

function buildRules(taskForm: TaskForm): FleetChecklistBuilderRule[] {
  if (taskForm.inputType === "BOOLEAN") {
    const actions = clean(taskForm.booleanNegativeActions);
    return actions.length ? [{ id: "boolean-false", condition: "BOOLEAN_IS_FALSE", value: "NO", label: "Resposta = Nao", actions }] : [];
  }
  if (taskForm.inputType === "SELECT") {
    return taskForm.options.map((option) => ({ option, actions: clean(option.actions) })).filter(({ option, actions }) => option.label.trim() && actions.length).map(({ option, actions }) => ({ id: option.id, condition: "OPTION_EQUALS", value: option.label.trim(), label: `Resposta = ${option.label.trim()}`, actions }));
  }
  return [];
}

function taskRules(task: FleetChecklistTemplateTask): FleetChecklistBuilderRule[] {
  if (task.builderConfig?.rules?.length) return task.builderConfig.rules;
  if (task.inputType === "BOOLEAN" && task.actionType !== "NONE") return [{ id: `${task.id}-legacy`, condition: "BOOLEAN_IS_FALSE", value: "NO", label: "Resposta = Nao", actions: [task.actionType] }];
  return [];
}

function taskInputLabel(task: FleetChecklistTemplateTask) { return task.inputType === "ODOMETER" || task.builderConfig?.numberMode === "ODOMETER" ? "Numero (KM)" : task.inputType === "SELECT" ? "Multipla escolha" : task.inputType === "TEXT" ? "Texto" : task.inputType === "PHOTO" ? "Foto" : task.inputType === "NUMBER" ? "Numero" : "Sim / Nao"; }
function formInputLabel(taskForm: TaskForm) { return taskForm.inputType === "NUMBER" ? taskForm.numberMode === "ODOMETER" ? "Numero (KM)" : "Numero" : taskForm.inputType === "SELECT" ? "Multipla escolha" : taskForm.inputType === "TEXT" ? "Texto" : taskForm.inputType === "PHOTO" ? "Foto" : "Sim / Nao"; }
function actionLabel(action: ActionKind) { return action === "OPEN_MAINTENANCE" ? "Abrir OS" : action === "OPEN_SUPPORT_TICKET" ? "Abrir chamado" : action === "REQUIRE_PHOTO" ? "Solicitar foto" : action === "REQUIRE_NOTE" ? "Solicitar observacao" : action === "REQUIRE_NUMBER" ? "Solicitar numero" : "Sem acao"; }
function routineLabel(routine: TemplateForm["routine"]) { return routine === "START_OF_DAY" ? "Inicio da jornada" : "Fim da jornada"; }
function clean(actions: ActionKind[]) { return Array.from(new Set(actions.filter((action) => action !== "NONE"))); }
function toggle(actions: ActionKind[], action: ActionKind) { return actions.includes(action) ? actions.filter((item) => item !== action) : [...actions, action]; }
function canSaveTask(taskForm: TaskForm) { return taskForm.label.trim().length > 0 && (taskForm.inputType !== "SELECT" || taskForm.options.some((option) => option.label.trim().length > 0)); }
function uid() { return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
