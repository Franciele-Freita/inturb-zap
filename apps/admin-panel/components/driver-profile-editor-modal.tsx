"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DriverProfileEditorModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  disableBackdropBlur?: boolean;
  layoutVariant?: "center" | "drawer" | "quick";
  lockBodyScroll?: boolean;
  dialogWidth?: string;
  bodyScrollable?: boolean;
  dialogClassName?: string;
};

export function DriverProfileEditorModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  disableBackdropBlur = false,
  layoutVariant = "center",
  lockBodyScroll = true,
  dialogWidth,
  bodyScrollable = true,
  dialogClassName
}: DriverProfileEditorModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (lockBodyScroll) {
      document.body.style.overflow = "hidden";
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (lockBodyScroll) {
        document.body.style.overflow = previousBodyOverflow;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lockBodyScroll, onClose, open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`driver-editor-modal-overlay${disableBackdropBlur ? " is-solid" : ""}${layoutVariant === "drawer" ? " is-drawer" : ""}${layoutVariant === "quick" ? " is-quick" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`driver-editor-modal${layoutVariant === "drawer" ? " is-drawer" : ""}${layoutVariant === "quick" ? " is-quick" : ""}${dialogClassName ? ` ${dialogClassName}` : ""}`}
        style={dialogWidth ? { width: dialogWidth } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="driver-editor-modal-head">
          <div>
            <strong>{title}</strong>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="driver-editor-modal-close" onClick={onClose} aria-label="Fechar modal">
            Fechar
          </button>
        </div>
        <div className={`driver-editor-modal-body${bodyScrollable ? "" : " is-no-scroll"}`}>{children}</div>
        {footer ? <div className="driver-editor-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
