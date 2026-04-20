"use client";

import { Fragment, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  filterTemplateVariables,
  resolveTemplateVariableGroup,
  resolveTemplateVariableGroupLabel,
  resolveScopeLabel,
  TemplateScope,
  TemplateVariableEntry
} from "../lib/document-templates";

type PopoverPosition = {
  top: number;
  left: number;
};

type DocumentTemplateVariableDictionaryModalProps = {
  open: boolean;
  onClose: () => void;
  defaultScope: TemplateScope;
  onInsert: (token: string) => void;
  canInsert?: boolean;
  triggerRef?: RefObject<HTMLElement | null>;
  avoidRef?: RefObject<HTMLElement | null>;
  queryOverride?: string;
  searchInputEnabled?: boolean;
};

export function DocumentTemplateVariableDictionaryModal({
  open,
  onClose,
  defaultScope,
  onInsert,
  canInsert = true,
  triggerRef,
  avoidRef,
  queryOverride,
  searchInputEnabled = true
}: DocumentTemplateVariableDictionaryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [scopeFilter, setScopeFilter] = useState<TemplateScope | "ALL">(defaultScope);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopoverPosition>({ top: 84, left: 20 });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setScopeFilter(defaultScope);
    if (searchInputEnabled) {
      setSearchInput("");
    }
    setActiveIndex(0);
  }, [defaultScope, open, searchInputEnabled]);

  const effectiveQuery = queryOverride ?? searchInput;
  const rows = useMemo<TemplateVariableEntry[]>(
    () => filterTemplateVariables(scopeFilter, effectiveQuery),
    [effectiveQuery, scopeFilter]
  );

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) => {
      if (rows.length === 0) return 0;
      return Math.min(current, rows.length - 1);
    });
  }, [open, rows.length]);

  useEffect(() => {
    if (!open || !searchInputEnabled) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open, searchInputEnabled]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const panel = panelRef.current;
      const trigger = triggerRef?.current;
      const avoid = avoidRef?.current;

      const panelWidth = panel?.offsetWidth ?? 420;
      const panelHeight = panel?.offsetHeight ?? 560;
      const viewportPadding = 12;
      const gutter = 10;

      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }

      if (avoid) {
        const rect = avoid.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gutter;
        const spaceAbove = rect.top - viewportPadding - gutter;

        let left = rect.left + 8;
        let top: number;

        if (spaceBelow >= panelHeight || spaceBelow >= spaceAbove) {
          top = rect.bottom + gutter;
        } else {
          top = rect.top - panelHeight - gutter;
        }

        left = clamp(left, viewportPadding, window.innerWidth - panelWidth - viewportPadding);
        top = clamp(top, viewportPadding, window.innerHeight - panelHeight - viewportPadding);

        setPosition({ top, left });
        return;
      }

      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        let left = rect.left;
        let top = rect.bottom + 8;

        if (left + panelWidth > window.innerWidth - viewportPadding) {
          left = window.innerWidth - panelWidth - viewportPadding;
        }
        if (left < viewportPadding) {
          left = viewportPadding;
        }

        if (top + panelHeight > window.innerHeight - viewportPadding) {
          top = Math.max(viewportPadding, rect.top - panelHeight - 8);
        }

        left = clamp(left, viewportPadding, window.innerWidth - panelWidth - viewportPadding);
        top = clamp(top, viewportPadding, window.innerHeight - panelHeight - viewportPadding);
        setPosition({ top, left });
        return;
      }

      setPosition({
        top: 84,
        left: window.innerWidth - panelWidth - viewportPadding
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [avoidRef, open, rows.length, triggerRef]);

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
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, triggerRef]);

  function handleInsert(token: string, closeAfter = false) {
    onInsert(token);
    if (closeAfter) onClose();
  }

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      className="template-variable-popover is-command"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Dicionario de variaveis"
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
                if (rows.length > 0) {
                  setActiveIndex((current) => (current + 1) % rows.length);
                }
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (rows.length > 0) {
                  setActiveIndex((current) => (current - 1 + rows.length) % rows.length);
                }
                return;
              }
              if (event.key === "Enter" && canInsert && rows.length > 0) {
                event.preventDefault();
                handleInsert(rows[activeIndex]?.token ?? rows[0].token, event.shiftKey);
              }
            }}
            placeholder="Digite para pesquisar"
          />
        </div>
      ) : (
        <div className="template-variable-command-inline-query">
          <span>/</span>
          <strong>{effectiveQuery || ""}</strong>
        </div>
      )}

      <div className="template-variable-command-scopes">
        {([
          ["ALL", "Todos"],
          ["DRIVER_EMPLOYMENT", "Motorista"],
          ["VEHICLE", "Veiculo"],
          ["STAFF", "Staff"]
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`template-variable-command-scope${scopeFilter === value ? " is-active" : ""}`}
            onClick={() => setScopeFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="template-variable-command-section-title">Sugestoes</div>

      <div className="template-variable-popover-list is-command">
        {rows.map((item, index) => {
          const group = resolveTemplateVariableGroup(item);
          const previousGroup = index > 0 ? resolveTemplateVariableGroup(rows[index - 1]) : null;
          const showGroupTitle = previousGroup !== group;
          const isActive = index === activeIndex;
          return (
            <Fragment key={`${item.scope}-${item.token}-${index}`}>
              {showGroupTitle ? (
                <div className="template-variable-command-group-title">
                  {resolveTemplateVariableGroupLabel(group)}
                </div>
              ) : null}
              <article
                className={`template-variable-popover-item${isActive ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <button
                  type="button"
                  className="template-variable-popover-main"
                  onClick={() => canInsert && handleInsert(item.token, true)}
                  disabled={!canInsert}
                >
                  <strong>{item.label}</strong>
                  <small>{item.token}</small>
                  <span>
                    {resolveScopeLabel(item.scope)} - {item.description}
                  </span>
                </button>
                <span className="template-variable-command-enter">enter</span>
              </article>
            </Fragment>
          );
        })}
        {rows.length === 0 ? (
          <div className="driver-contract-empty">Nenhuma variavel encontrada para esse filtro.</div>
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
