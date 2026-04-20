"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { DocumentTemplateVariableDictionaryModal } from "../../../../../components/document-template-variable-dictionary-modal";
import {
  detectInlineTemplateCommand,
  DocumentTemplate,
  filterTemplateVariables,
  InlineTemplateCommand,
  loadDocumentTemplates,
  resolveTemplateStatusLabel,
  saveDocumentTemplates,
  TemplateScope
} from "../../../../../lib/document-templates";

type TemplateForm = {
  name: string;
  scope: TemplateScope;
  content: string;
};

export default function EditDocumentTemplatePage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dictionaryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [form, setForm] = useState<TemplateForm>({
    name: "",
    scope: "DRIVER_EMPLOYMENT",
    content: ""
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [dictionaryMode, setDictionaryMode] = useState<"button" | "inline">("button");
  const [inlineCommand, setInlineCommand] = useState<InlineTemplateCommand | null>(null);
  const [fontSizePx, setFontSizePx] = useState("14");
  const inlineSuggestions = useMemo(
    () => filterTemplateVariables(form.scope, inlineCommand?.query ?? ""),
    [form.scope, inlineCommand?.query]
  );

  function getEditorElement(): HTMLDivElement | null {
    return contentRef.current;
  }

  function saveCurrentSelection() {
    const editor = getEditorElement();
    if (!editor) {
      savedSelectionRef.current = null;
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    savedSelectionRef.current = range.cloneRange();
  }

  function restoreSavedSelection() {
    const editor = getEditorElement();
    const saved = savedSelectionRef.current;
    if (!editor || !saved) {
      return;
    }

    try {
      if (!editor.contains(saved.commonAncestorContainer)) {
        return;
      }
      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      selection.removeAllRanges();
      selection.addRange(saved.cloneRange());
    } catch {
      savedSelectionRef.current = null;
    }
  }

  function getTextBeforeCaret(root: HTMLElement): string | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer)) {
      return null;
    }

    const preRange = range.cloneRange();
    preRange.selectNodeContents(root);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().replace(/\r/g, "");
  }

  function syncContentFromEditor() {
    const editor = getEditorElement();
    if (!editor) return;
    setForm((current) => ({ ...current, content: editor.innerHTML }));
  }

  function findTextPosition(
    root: HTMLElement,
    targetOffset: number
  ): { node: Text; offset: number } | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = targetOffset;
    let current = walker.nextNode() as Text | null;
    while (current) {
      const length = current.textContent?.length ?? 0;
      if (remaining <= length) {
        return { node: current, offset: remaining };
      }
      remaining -= length;
      current = walker.nextNode() as Text | null;
    }

    const fallback = root.lastChild;
    if (fallback && fallback.nodeType === Node.TEXT_NODE) {
      const textNode = fallback as Text;
      return { node: textNode, offset: textNode.textContent?.length ?? 0 };
    }
    return null;
  }

  function replaceTextRangeInEditor(start: number, end: number, replacement: string) {
    const editor = getEditorElement();
    if (!editor) return;

    const startPos = findTextPosition(editor, start);
    const endPos = findTextPosition(editor, end);
    if (!startPos || !endPos) return;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    range.deleteContents();

    const insertedNode = document.createTextNode(replacement);
    range.insertNode(insertedNode);

    const selection = window.getSelection();
    if (selection) {
      const nextRange = document.createRange();
      nextRange.setStart(insertedNode, insertedNode.textContent?.length ?? 0);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedSelectionRef.current = nextRange.cloneRange();
    }

    syncContentFromEditor();
  }

  function insertTextAtCaret(text: string) {
    const editor = getEditorElement();
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.focus();
      const textNode = document.createTextNode(text);
      editor.appendChild(textNode);
      const fallbackSelection = window.getSelection();
      if (fallbackSelection) {
        const nextRange = document.createRange();
        nextRange.setStart(textNode, textNode.textContent?.length ?? 0);
        nextRange.collapse(true);
        fallbackSelection.removeAllRanges();
        fallbackSelection.addRange(nextRange);
        savedSelectionRef.current = nextRange.cloneRange();
      }
      syncContentFromEditor();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) {
      editor.focus();
      return;
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    const nextRange = document.createRange();
    nextRange.setStart(textNode, textNode.textContent?.length ?? 0);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedSelectionRef.current = nextRange.cloneRange();

    syncContentFromEditor();
  }

  function insertVariable(token: string) {
    const editor = getEditorElement();
    if (!editor || template?.status !== "DRAFT") return;

    editor.focus();
    if (dictionaryMode === "inline" && inlineCommand) {
      replaceTextRangeInEditor(inlineCommand.start, inlineCommand.end, token);
      setInlineCommand(null);
      setIsDictionaryOpen(false);
      return;
    }

    restoreSavedSelection();
    insertTextAtCaret(token);
  }

  function applyBold() {
    const editor = getEditorElement();
    if (!editor || template?.status !== "DRAFT") return;
    editor.focus();
    document.execCommand("bold");
    syncContentFromEditor();
  }

  function applyItalic() {
    const editor = getEditorElement();
    if (!editor || template?.status !== "DRAFT") return;
    editor.focus();
    document.execCommand("italic");
    syncContentFromEditor();
  }

  function applyAlignment(command: "justifyLeft" | "justifyCenter" | "justifyRight") {
    const editor = getEditorElement();
    if (!editor || template?.status !== "DRAFT") return;
    editor.focus();
    document.execCommand(command);
    syncContentFromEditor();
  }

  function applyFontSize(value: string) {
    const editor = getEditorElement();
    if (!editor || template?.status !== "DRAFT") return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return;

    const size = Number(value);
    const normalized = Number.isFinite(size) ? Math.min(36, Math.max(10, Math.round(size))) : 14;
    const span = document.createElement("span");
    span.style.fontSize = `${normalized}px`;

    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }

    const next = document.createRange();
    next.selectNodeContents(span);
    next.collapse(false);
    selection.removeAllRanges();
    selection.addRange(next);
    syncContentFromEditor();
  }

  function handleEditorInput() {
    if (template?.status !== "DRAFT") return;

    setValidationError(null);
    saveCurrentSelection();
    syncContentFromEditor();

    const editor = getEditorElement();
    if (!editor) return;
    const textBeforeCaret = getTextBeforeCaret(editor);
    if (textBeforeCaret === null) return;
    const detected = detectInlineTemplateCommand(textBeforeCaret, textBeforeCaret.length);
    if (detected) {
      setDictionaryMode("inline");
      setInlineCommand(detected);
      setIsDictionaryOpen(true);
      return;
    }

    if (dictionaryMode === "inline") {
      setInlineCommand(null);
      setIsDictionaryOpen(false);
    }
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (template?.status !== "DRAFT") {
      return;
    }
    if (dictionaryMode !== "inline" || !inlineCommand) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setInlineCommand(null);
      setIsDictionaryOpen(false);
      return;
    }

    if (event.key === "Enter" && inlineSuggestions.length > 0) {
      event.preventDefault();
      insertVariable(inlineSuggestions[0].token);
    }
  }

  function handleEditorMouseUp() {
    if (template?.status !== "DRAFT") return;
    saveCurrentSelection();
  }

  function handleEditorKeyUp() {
    if (template?.status !== "DRAFT") return;
    saveCurrentSelection();
  }

  function hasMeaningfulContent(html: string): boolean {
    const text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    return text.length > 0;
  }

  function toEditorHtml(value: string): string {
    if (/<\/?[a-z][\s\S]*>/i.test(value)) {
      return value;
    }
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  useEffect(() => {
    const templateId = typeof params?.templateId === "string" ? params.templateId : "";
    const templates = loadDocumentTemplates();
    const found = templates.find((item) => item.id === templateId) ?? null;
    setTemplate(found);
    if (found) {
      setForm({
        name: found.name,
        scope: found.scope,
        content: found.content
      });
    }
    setIsLoaded(true);
  }, [params?.templateId]);

  useEffect(() => {
    const editor = getEditorElement();
    if (!editor) return;
    if (!isLoaded || !template) return;
    if (editor.innerHTML === form.content) return;
    editor.innerHTML = toEditorHtml(form.content);
  }, [form.content, isLoaded, template]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;
    if (template.status !== "DRAFT") {
      setValidationError("Apenas templates em rascunho podem ser editados.");
      return;
    }
    if (!form.name.trim() || !hasMeaningfulContent(form.content)) {
      setValidationError("Preencha nome e conteudo do template.");
      return;
    }

    const templates = loadDocumentTemplates();
    const next = templates.map((item) =>
      item.id === template.id
        ? {
            ...item,
            name: form.name.trim(),
            scope: form.scope,
            content: form.content.trim(),
            updatedAt: new Date().toISOString()
          }
        : item
    );
    saveDocumentTemplates(next);
    router.push("/documents/templates");
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (template?.status !== "DRAFT") return;
        event.preventDefault();
        saveCurrentSelection();
        setDictionaryMode("button");
        setInlineCommand(null);
        setIsDictionaryOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [template?.status]);

  if (!isLoaded) {
    return (
      <main className="page-shell driver-contracts-shell">
        <section className="grid grid-single">
          <article className="panel panel-wide">
            <p>Carregando template...</p>
          </article>
        </section>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="page-shell driver-contracts-shell">
        <section className="grid grid-single">
          <article className="panel panel-wide">
            <h2>Template nao encontrado</h2>
            <p>Esse template pode ter sido removido ou ainda nao foi salvo.</p>
            <Link href="/documents/templates" className="button-link secondary-link">
              Voltar para templates
            </Link>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Documentos - Templates</p>
              <h1>Editar template</h1>
              <p className="drivers-page-status">
                {template.name} - {resolveTemplateStatusLabel(template.status)}
              </p>
            </div>
            <div className="drivers-page-head-actions">
              <Link href="/documents/templates" className="button-link secondary-link">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide">
          {template.status !== "DRAFT" ? (
            <div className="driver-editor-contract-validation-alert">
              <strong>Template bloqueado para edicao</strong>
              <span>Somente templates em rascunho podem ser alterados.</span>
            </div>
          ) : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nome do template
              <input
                value={form.name}
                disabled={template.status !== "DRAFT"}
                onChange={(event) => {
                  setValidationError(null);
                  setForm((current) => ({ ...current, name: event.target.value }));
                }}
              />
            </label>
            <label>
              Escopo
              <select
                className="select"
                value={form.scope}
                disabled={template.status !== "DRAFT"}
                onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as TemplateScope }))}
              >
                <option value="DRIVER_EMPLOYMENT">Motorista</option>
                <option value="VEHICLE">Veiculo</option>
                <option value="STAFF">Outros funcionarios</option>
              </select>
            </label>
            <label>
              Chave interna
              <input value={template.key} readOnly disabled />
            </label>

            <div className="driver-editor-modal-field-full">
              <label>Conteudo</label>
              <div className="template-editor-toolbar">
                <button type="button" className="secondary" title="Negrito" disabled={template.status !== "DRAFT"} onClick={applyBold}>
                  B
                </button>
                <button type="button" className="secondary" title="Italico" disabled={template.status !== "DRAFT"} onClick={applyItalic}>
                  I
                </button>
                <button
                  type="button"
                  className="secondary"
                  title="Alinhar a esquerda"
                  disabled={template.status !== "DRAFT"}
                  onClick={() => applyAlignment("justifyLeft")}
                >
                  Esq
                </button>
                <button
                  type="button"
                  className="secondary"
                  title="Centralizar"
                  disabled={template.status !== "DRAFT"}
                  onClick={() => applyAlignment("justifyCenter")}
                >
                  Centro
                </button>
                <button
                  type="button"
                  className="secondary"
                  title="Alinhar ao fim da linha"
                  disabled={template.status !== "DRAFT"}
                  onClick={() => applyAlignment("justifyRight")}
                >
                  Fim
                </button>
                <label className="template-editor-fontsize">
                  <span>Tamanho</span>
                  <select
                    className="select"
                    value={fontSizePx}
                    disabled={template.status !== "DRAFT"}
                    onChange={(event) => {
                      const next = event.target.value;
                      setFontSizePx(next);
                      applyFontSize(next);
                    }}
                  >
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
                    <option value="24">24</option>
                  </select>
                </label>
              </div>

              <div
                ref={contentRef}
                className="template-editor-contenteditable"
                contentEditable={template.status === "DRAFT"}
                role="textbox"
                suppressContentEditableWarning
                style={{ fontSize: `${fontSizePx}px` }}
                data-placeholder="Digite o conteudo do contrato/template..."
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                onMouseUp={handleEditorMouseUp}
                onKeyUp={handleEditorKeyUp}
              />
            </div>

            <div className="driver-editor-modal-field-full">
              <strong>Variaveis do template</strong>
              <small>Digite `/` direto no texto para abrir sugestoes.</small>
              <small>Atalho: Ctrl + K.</small>
              <div className="driver-contract-actions" style={{ marginTop: 10 }}>
                <button
                  ref={dictionaryTriggerRef}
                  type="button"
                  className="secondary"
                  disabled={template.status !== "DRAFT"}
                  onClick={() => {
                    saveCurrentSelection();
                    setDictionaryMode("button");
                    setInlineCommand(null);
                    setIsDictionaryOpen(true);
                  }}
                >
                  Abrir dicionario de variaveis
                </button>
              </div>
            </div>

            {validationError ? (
              <div className="driver-editor-modal-field-full">
                <div className="driver-editor-contract-validation-alert">
                  <span>{validationError}</span>
                </div>
              </div>
            ) : null}

            <div className="driver-editor-modal-field-full">
              <div className="driver-contract-actions">
                <Link href="/documents/templates" className="button-link secondary-link">
                  Cancelar
                </Link>
                <button type="submit" disabled={template.status !== "DRAFT"}>
                  Salvar rascunho
                </button>
              </div>
            </div>
          </form>
        </article>
      </section>

      <DocumentTemplateVariableDictionaryModal
        open={isDictionaryOpen}
        onClose={() => {
          setIsDictionaryOpen(false);
          if (dictionaryMode === "inline") {
            setInlineCommand(null);
          }
        }}
        defaultScope={form.scope}
        onInsert={insertVariable}
        canInsert={template.status === "DRAFT"}
        triggerRef={dictionaryTriggerRef}
        avoidRef={contentRef}
        queryOverride={dictionaryMode === "inline" ? inlineCommand?.query ?? "" : undefined}
        searchInputEnabled={dictionaryMode !== "inline"}
      />
    </main>
  );
}
