"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DriverProfileEditorModal } from "../../../components/driver-profile-editor-modal";
import {
  DocumentTemplate,
  formatDateTime,
  incrementVersion,
  loadDocumentTemplates,
  resolveScopeLabel,
  resolveTemplateStatusLabel,
  resolveTemplateTone,
  saveDocumentTemplates,
  TemplateScope
} from "../../../lib/document-templates";

type ScopeFilter = "ALL" | TemplateScope;

export default function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    setTemplates(loadDocumentTemplates());
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    return templates.filter((item) => {
      const matchesScope = scopeFilter === "ALL" || item.scope === scopeFilter;
      const matchesSearch =
        query.length === 0 ||
        [item.key, item.name, item.version, item.scope].join(" ").toLowerCase().includes(query);
      return matchesScope && matchesSearch;
    });
  }, [templates, scopeFilter, searchInput]);

  function updateTemplates(next: DocumentTemplate[]) {
    setTemplates(next);
    saveDocumentTemplates(next);
  }

  function duplicateTemplate(template: DocumentTemplate) {
    const nextTemplate: DocumentTemplate = {
      ...template,
      id: `tpl_${Date.now()}`,
      key: `${template.key}_COPY`,
      name: `${template.name} (copia)`,
      version: incrementVersion(template.version),
      status: "DRAFT",
      updatedAt: new Date().toISOString()
    };
    updateTemplates([nextTemplate, ...templates]);
  }

  function toggleTemplateStatus(template: DocumentTemplate) {
    const next = templates.map((item) => {
      if (item.id !== template.id) return item;
      if (item.status === "PUBLISHED") {
        return { ...item, status: "ARCHIVED" as const, updatedAt: new Date().toISOString() };
      }
      return { ...item, status: "PUBLISHED" as const, updatedAt: new Date().toISOString() };
    });
    updateTemplates(next);
  }

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Documentos</p>
              <h1>Gestao de Templates</h1>
              <p className="drivers-page-status">
                Gerencie modelos reutilizaveis para contratos e termos operacionais.
              </p>
            </div>
            <div className="drivers-page-head-actions">
              <Link href="/documents/templates/variables" className="button-link secondary-link">
                Consultar variaveis
              </Link>
              <Link href="/documents/templates/new" className="button-link">
                Novo template
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Biblioteca de templates</h2>
              <span>{filteredTemplates.length} template(s) encontrado(s).</span>
            </div>
            <div className="drivers-table-tools driver-contracts-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por nome, chave ou escopo..."
                />
              </label>
              <label>
                <span>Escopo</span>
                <select
                  className="select"
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="DRIVER_EMPLOYMENT">Motorista</option>
                  <option value="VEHICLE">Veiculo</option>
                  <option value="STAFF">Outros funcionarios</option>
                </select>
              </label>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Escopo</th>
                  <th>Versao</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.key}</small>
                    </td>
                    <td>{resolveScopeLabel(item.scope)}</td>
                    <td>{item.version}</td>
                    <td>
                      <span className={`driver-contract-status is-${resolveTemplateTone(item.status)}`}>
                        {resolveTemplateStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <div className="driver-contract-actions">
                        <button type="button" className="secondary" onClick={() => setSelectedTemplate(item)}>
                          Visualizar
                        </button>
                        {item.status === "DRAFT" ? (
                          <Link href={`/documents/templates/${item.id}/edit`} className="button-link secondary-link">
                            Editar
                          </Link>
                        ) : null}
                        <button type="button" className="secondary" onClick={() => duplicateTemplate(item)}>
                          Duplicar
                        </button>
                        <button type="button" className="secondary" onClick={() => toggleTemplateStatus(item)}>
                          {item.status === "PUBLISHED" ? "Arquivar" : "Publicar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="driver-contract-empty">Nenhum template encontrado para o filtro atual.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <DriverProfileEditorModal
        open={Boolean(selectedTemplate)}
        title={selectedTemplate ? selectedTemplate.name : "Template"}
        description={
          selectedTemplate
            ? `${selectedTemplate.key} - ${selectedTemplate.version} - ${resolveTemplateStatusLabel(selectedTemplate.status)}`
            : undefined
        }
        onClose={() => setSelectedTemplate(null)}
        footer={
          <button type="button" className="secondary" onClick={() => setSelectedTemplate(null)}>
            Fechar
          </button>
        }
      >
        {selectedTemplate ? (
          <div className="driver-contract-preview">
            {looksLikeHtml(selectedTemplate.content) ? (
              <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
            ) : (
              <pre>{selectedTemplate.content}</pre>
            )}
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
