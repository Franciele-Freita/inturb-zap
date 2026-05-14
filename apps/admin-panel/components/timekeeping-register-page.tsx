"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_SESSION_UPDATED_EVENT,
  getStoredAdminSession,
  type AdminSession
} from "../lib/admin-auth";
import {
  type DriverProfile,
  type TimeEntry,
  type TimeEntryKind,
  type TimeEntrySource,
  request
} from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { validateRegisterPunchForm } from "../lib/timekeeping-validation";
import { defaultDateTimeLocalValue } from "./timekeeping-shared";
import {
  InfoCard,
  PageHeader,
  TimekeepingRegisterForm,
  type RegisterFormErrors,
  type RegisterFormValues
} from "./timekeeping-register-components";

type CreateTimeEntryPayload = {
  driverId: string;
  occurredAt: string;
  kind: TimeEntryKind;
  source: TimeEntrySource;
  timezone: string;
  notes?: string;
  changeReason?: string;
};

export function TimekeepingRegisterPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [form, setForm] = useState<RegisterFormValues>({
    driverId: "",
    occurredAt: defaultDateTimeLocalValue(),
    kind: "IN",
    source: "ADMIN",
    notes: "",
    isAdministrativeChange: false
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const access = resolveTimekeepingAccess(session);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredAdminSession());
    }
    syncSession();
    window.addEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    return () => {
      window.removeEventListener(ADMIN_SESSION_UPDATED_EVENT, syncSession);
    };
  }, []);

  useEffect(() => {
    if (!access.canOperate) {
      return;
    }
    void request<DriverProfile[]>("/admin/drivers")
      .then((loaded) => {
        setDrivers(loaded);
        setForm((current) => {
          if (current.driverId || loaded.length === 0) {
            return current;
          }
          return { ...current, driverId: loaded[0].id };
        });
      })
      .catch((error: Error) => {
        setFeedback(error.message);
      });
  }, [access.canOperate]);

  function handleFormChange(next: Partial<RegisterFormValues>) {
    setForm((current) => ({ ...current, ...next }));
    if (Object.keys(errors).length > 0) {
      setErrors((current) => {
        const updated = { ...current };
        Object.keys(next).forEach((key) => {
          delete updated[key as keyof RegisterFormErrors];
        });
        return updated;
      });
    }
  }

  async function handleSubmit() {
    const validation = validateRegisterPunchForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setFeedback("Revise os campos obrigatorios antes de registrar.");
      return;
    }

    setPending(true);
    try {
      const payload: CreateTimeEntryPayload = {
        driverId: form.driverId,
        kind: form.kind,
        source: form.source,
        occurredAt: new Date(form.occurredAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const trimmedReason = form.notes.trim();
      if (trimmedReason.length > 0) {
        payload.notes = trimmedReason;
        payload.changeReason = trimmedReason;
      }

      await request<TimeEntry>("/admin/time-entries", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setFeedback("Batida registrada com sucesso.");
      setErrors({});
      setForm((current) => ({
        ...current,
        notes: "",
        isAdministrativeChange: false
      }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao registrar batida.");
    } finally {
      setPending(false);
    }
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Registrar ponto</h1>
          <p>Seu perfil atual nao possui permissao para operar o modulo de ponto.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <PageHeader
        title="Registrar ponto"
        subtitle="Lancamento manual de batidas de ponto."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide timekeeping-register-layout">
          <TimekeepingRegisterForm
            drivers={drivers}
            values={form}
            errors={errors}
            pending={pending}
            onChange={handleFormChange}
            onSubmit={() => void handleSubmit()}
          />

          <InfoCard />
        </article>
      </section>
    </main>
  );
}
