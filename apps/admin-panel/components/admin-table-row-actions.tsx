"use client";

import Link from "next/link";
import { ReactNode, useMemo, useRef } from "react";
import { EditIcon, OpenIcon, TogglePowerIcon, TrashIcon } from "./icons/common-icons";

type AdminTableRowAction = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  dividerBefore?: boolean;
};

type AdminTableRowActionsProps = {
  primary?: AdminTableRowAction;
  items: AdminTableRowAction[];
  menuLabel?: string;
  className?: string;
  showPrimaryButton?: boolean;
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function resolveDefaultIcon(action: AdminTableRowAction): ReactNode | null {
  if (action.icon) {
    return action.icon;
  }

  const label = normalizeLabel(action.label);
  if (label.includes("editar")) {
    return <EditIcon size={15} strokeWidth={2} aria-hidden="true" />;
  }
  if (
    label.includes("visualizar") ||
    label.includes("historico") ||
    label.includes("financeiro")
  ) {
    return <OpenIcon size={15} strokeWidth={2} aria-hidden="true" />;
  }
  if (label.includes("ativar") || label.includes("inativar")) {
    return <TogglePowerIcon size={15} strokeWidth={2} aria-hidden="true" />;
  }
  if (action.danger || label.includes("excluir")) {
    return <TrashIcon size={15} strokeWidth={2} aria-hidden="true" />;
  }

  return null;
}

export function AdminTableRowActions({
  primary,
  items,
  menuLabel = "Mais acoes",
  className,
  showPrimaryButton = false
}: AdminTableRowActionsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const menuItems = useMemo(() => {
    const merged: AdminTableRowAction[] = [];
    if (primary && !showPrimaryButton) {
      merged.push(primary);
    }
    merged.push(...items);

    let hasNonDangerBefore = false;
    return merged.map((item) => {
      const isDanger = Boolean(item.danger);
      const dividerBefore =
        typeof item.dividerBefore === "boolean"
          ? item.dividerBefore
          : isDanger && hasNonDangerBefore;
      if (!isDanger) {
        hasNonDangerBefore = true;
      }

      return {
        ...item,
        dividerBefore,
        icon: resolveDefaultIcon(item)
      };
    });
  }, [items, primary, showPrimaryButton]);

  function closeMenu() {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
  }

  function runAction(action: AdminTableRowAction) {
    if (action.disabled) return;
    action.onClick?.();
    closeMenu();
  }

  return (
    <div className={className ? `table-actions ${className}` : "table-actions"}>
      {showPrimaryButton && primary ? (
        primary.href ? (
          <Link href={primary.href} className="button-link secondary-link table-action-primary">
            {primary.label}
          </Link>
        ) : (
          <button
            type="button"
            className="button-link secondary-link table-action-primary"
            onClick={() => runAction(primary)}
            disabled={primary.disabled}
          >
            {primary.label}
          </button>
        )
      ) : null}

      {menuItems.length > 0 ? (
        <details className="table-actions-menu" ref={detailsRef}>
          <summary aria-label={menuLabel}>
            <span aria-hidden="true">...</span>
          </summary>
          <div className="table-actions-menu-list">
            {menuItems.map((item) => (
              <div key={item.id} className="table-actions-menu-entry">
                {item.dividerBefore ? (
                  <div className="table-actions-menu-separator" role="separator" aria-hidden="true" />
                ) : null}

                {item.href ? (
                  <Link
                    href={item.href}
                    className={item.danger ? "table-actions-menu-item is-danger" : "table-actions-menu-item"}
                    onClick={() => closeMenu()}
                  >
                    {item.icon ? <span className="table-actions-menu-item-icon">{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={item.danger ? "table-actions-menu-item is-danger" : "table-actions-menu-item"}
                    onClick={() => runAction(item)}
                    disabled={item.disabled}
                  >
                    {item.icon ? <span className="table-actions-menu-item-icon">{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
