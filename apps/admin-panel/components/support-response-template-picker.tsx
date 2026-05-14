"use client";

import { Fragment, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SupportTemplateCategory =
  | "ALL"
  | "FAVORITES"
  | "RECENT"
  | "CHARGE"
  | "CANCEL"
  | "REFUND"
  | "RIDE"
  | "DRIVER"
  | "CUSTOMER"
  | "GREETING"
  | "CLOSING"
  | "INTERNAL";

export type SupportTemplateCatalogItem = {
  id: string;
  label: string;
  description: string;
  message: string;
  category: SupportTemplateCategory;
  tags?: string[];
};

type PopoverPosition = {
  top: number;
  left: number;
};

type SupportResponseTemplatePickerProps = {
  open: boolean;
  onClose: () => void;
  templates: SupportTemplateCatalogItem[];
  onSelectTemplate: (template: SupportTemplateCatalogItem) => void;
  favoriteTemplateIds: string[];
  recentTemplateIds: string[];
  usageCountByTemplateId: Record<string, number>;
  onToggleFavorite: (templateId: string) => void;
  triggerRef?: RefObject<HTMLElement | null>;
  avoidRef?: RefObject<HTMLElement | null>;
  searchInputEnabled?: boolean;
  initialQuery?: string;
};

const TEMPLATE_CATEGORY_OPTIONS: Array<{ value: SupportTemplateCategory; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "FAVORITES", label: "Favoritos" },
  { value: "RECENT", label: "Recentes" },
  { value: "CHARGE", label: "Cobranca" },
  { value: "CANCEL", label: "Cancelamento" },
  { value: "REFUND", label: "Reembolso" },
  { value: "RIDE", label: "Corrida" },
  { value: "DRIVER", label: "Motorista" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "GREETING", label: "Saudacao" },
  { value: "CLOSING", label: "Encerramento" },
  { value: "INTERNAL", label: "Interno" }
];

export function SupportResponseTemplatePicker({
  open,
  onClose,
  templates,
  onSelectTemplate,
  favoriteTemplateIds,
  recentTemplateIds,
  usageCountByTemplateId,
  onToggleFavorite,
  triggerRef,
  avoidRef,
  searchInputEnabled = true,
  initialQuery = ""
}: SupportResponseTemplatePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState<SupportTemplateCategory>("ALL");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopoverPosition>({ top: 84, left: 20 });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearchInput(initialQuery);
    setCategoryFilter("ALL");
    setActiveIndex(0);
  }, [open, initialQuery]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchInput.trim().toLowerCase();
    const favoriteSet = new Set(favoriteTemplateIds);
    const recentSet = new Set(recentTemplateIds);

    const rowsByCategory = templates.filter((template) => {
      if (categoryFilter === "ALL") return true;
      if (categoryFilter === "FAVORITES") return favoriteSet.has(template.id);
      if (categoryFilter === "RECENT") return recentSet.has(template.id);
      return template.category === categoryFilter;
    });

    const rowsByQuery = normalizedQuery
      ? rowsByCategory.filter((template) => {
          const tags = (template.tags ?? []).join(" ");
          return [template.label, template.description, template.message, tags].join(" ").toLowerCase().includes(normalizedQuery);
        })
      : rowsByCategory;

    return [...rowsByQuery].sort((left, right) => {
      const leftFav = favoriteSet.has(left.id) ? 1 : 0;
      const rightFav = favoriteSet.has(right.id) ? 1 : 0;
      if (leftFav !== rightFav) return rightFav - leftFav;

      const leftRecent = recentSet.has(left.id) ? 1 : 0;
      const rightRecent = recentSet.has(right.id) ? 1 : 0;
      if (leftRecent !== rightRecent) return rightRecent - leftRecent;

      const leftCount = usageCountByTemplateId[left.id] ?? 0;
      const rightCount = usageCountByTemplateId[right.id] ?? 0;
      if (leftCount !== rightCount) return rightCount - leftCount;

      return left.label.localeCompare(right.label, "pt-BR");
    });
  }, [categoryFilter, favoriteTemplateIds, recentTemplateIds, searchInput, templates, usageCountByTemplateId]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) => {
      if (filteredRows.length === 0) return 0;
      return Math.min(current, filteredRows.length - 1);
    });
  }, [open, filteredRows.length]);

  useEffect(() => {
    if (!open || !searchInputEnabled) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open, searchInputEnabled]);

  useEffect(() => {
    if (!open) return;

    function clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    }

    function updatePosition() {
      const panel = panelRef.current;
      const trigger = triggerRef?.current;
      const avoid = avoidRef?.current;
      const panelWidth = panel?.offsetWidth ?? 460;
      const panelHeight = panel?.offsetHeight ?? 560;
      const viewportPadding = 12;
      const gutter = 10;

      if (avoid) {
        const rect = avoid.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gutter;
        const spaceAbove = rect.top - viewportPadding - gutter;

        let left = rect.left + 8;
        let top = spaceBelow >= panelHeight || spaceBelow >= spaceAbove ? rect.bottom + gutter : rect.top - panelHeight - gutter;

        left = clamp(left, viewportPadding, window.innerWidth - panelWidth - viewportPadding);
        top = clamp(top, viewportPadding, window.innerHeight - panelHeight - viewportPadding);
        setPosition({ top, left });
        return;
      }

      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        let left = rect.left;
        let top = rect.bottom + 8;

        left = clamp(left, viewportPadding, window.innerWidth - panelWidth - viewportPadding);
        if (top + panelHeight > window.innerHeight - viewportPadding) {
          top = Math.max(viewportPadding, rect.top - panelHeight - 8);
        }
        top = clamp(top, viewportPadding, window.innerHeight - panelHeight - viewportPadding);
        setPosition({ top, left });
        return;
      }

      setPosition({ top: 84, left: window.innerWidth - panelWidth - viewportPadding });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [avoidRef, open, triggerRef, filteredRows.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const panel = panelRef.current;
      const trigger = triggerRef?.current;
      const target = event.target as Node;
      if (panel?.contains(target)) return;
      if (trigger?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, triggerRef]);

  function applyTemplate(template: SupportTemplateCatalogItem) {
    onSelectTemplate(template);
    onClose();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="template-variable-popover is-command support-template-picker"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Buscar respostas rapidas"
    >
      {searchInputEnabled ? (
        <div className="template-variable-command-searchline">
          <span>/</span>
          <input
            ref={searchInputRef}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (filteredRows.length > 0) {
                  setActiveIndex((current) => (current + 1) % filteredRows.length);
                }
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (filteredRows.length > 0) {
                  setActiveIndex((current) => (current - 1 + filteredRows.length) % filteredRows.length);
                }
                return;
              }
              if (event.key === "Enter" && filteredRows.length > 0) {
                event.preventDefault();
                const row = filteredRows[activeIndex] ?? filteredRows[0];
                if (row) applyTemplate(row);
              }
            }}
            placeholder="Buscar template..."
          />
        </div>
      ) : (
        <div className="template-variable-command-inline-query">
          <span>/</span>
          <strong>{searchInput || "Templates"}</strong>
        </div>
      )}

      <div className="template-variable-command-scopes support-template-picker-tabs">
        {TEMPLATE_CATEGORY_OPTIONS.map((category) => (
          <button
            key={category.value}
            type="button"
            className={`template-variable-command-scope${categoryFilter === category.value ? " is-active" : ""}`}
            onClick={() => setCategoryFilter(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="template-variable-command-section-title">Respostas rapidas</div>

      <div className="template-variable-popover-list is-command support-template-picker-list">
        {filteredRows.map((item, index) => {
          const isActive = index === activeIndex;
          const isFavorite = favoriteTemplateIds.includes(item.id);
          const usageCount = usageCountByTemplateId[item.id] ?? 0;
          return (
            <Fragment key={item.id}>
              <article
                className={`template-variable-popover-item${isActive ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <button
                  type="button"
                  className="template-variable-popover-main"
                  onClick={() => applyTemplate(item)}
                >
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <span>{truncateTemplateMessage(item.message)}</span>
                  <span className="support-template-picker-meta">
                    {usageCount > 0 ? `${usageCount} uso(s)` : "Ainda nao utilizado"}
                    {item.tags && item.tags.length > 0 ? ` | ${item.tags.join(", ")}` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="support-template-picker-favorite"
                  aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  onClick={() => onToggleFavorite(item.id)}
                >
                  {isFavorite ? "Favorito" : "Favoritar"}
                </button>
              </article>
            </Fragment>
          );
        })}
        {filteredRows.length === 0 ? (
          <div className="driver-contract-empty">Nenhum template encontrado para esse filtro.</div>
        ) : null}
      </div>

      <footer className="template-variable-command-footer">
        <button type="button" className="template-variable-command-close" onClick={onClose}>
          Fechar menu
        </button>
        <span>esc</span>
      </footer>
    </div>,
    document.body
  );
}

function truncateTemplateMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 130) return normalized;
  return `${normalized.slice(0, 127)}...`;
}

