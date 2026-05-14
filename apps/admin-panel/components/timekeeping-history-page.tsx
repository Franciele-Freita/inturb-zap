"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_SESSION_UPDATED_EVENT,
  getStoredAdminSession,
  type AdminSession
} from "../lib/admin-auth";
import { type DriverProfile, type TimeEntry, request } from "../lib/api";
import { resolveTimekeepingAccess } from "../lib/timekeeping-access";
import { PageHeader } from "./timekeeping-register-components";
import {
  HistoryEntriesTable,
  HistoryFiltersCard
} from "./timekeeping-history-components";
import { todayDateKey } from "./timekeeping-shared";

const LIST_LIMIT = 300;

type HistoryFilters = {
  driverId: string;
  fromDate: string;
  toDate: string;
  kind: "" | "IN" | "OUT" | "BREAK_START" | "BREAK_END";
  source: "" | "APP" | "WEB" | "ADMIN" | "IMPORT";
};

export function TimekeepingHistoryPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>(createDefaultFilters);
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
      })
      .catch((error: Error) => {
        setFeedback(error.message);
      });
  }, [access.canOperate]);

  useEffect(() => {
    if (!access.canOperate) {
      return;
    }
    void loadEntries(createDefaultFilters());
  }, [access.canOperate]);

  const driversById = useMemo<Record<string, string>>(() => {
    return drivers.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [drivers]);

  function handleFilterChange(next: Partial<HistoryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function handleClear() {
    const next = createDefaultFilters();
    setFilters(next);
    void loadEntries(next);
  }

  async function handleSubmit() {
    await loadEntries(filters);
  }

  async function loadEntries(nextFilters: HistoryFilters) {
    setPending(true);
    try {
      const query = new URLSearchParams();
      query.set("limit", String(LIST_LIMIT));

      if (nextFilters.driverId) {
        query.set("driverId", nextFilters.driverId);
      }
      if (nextFilters.kind) {
        query.set("kind", nextFilters.kind);
      }
      if (nextFilters.source) {
        query.set("source", nextFilters.source);
      }
      if (nextFilters.fromDate) {
        query.set("from", `${nextFilters.fromDate}T00:00:00.000Z`);
      }
      if (nextFilters.toDate) {
        query.set("to", `${nextFilters.toDate}T23:59:59.999Z`);
      }

      const loaded = await request<TimeEntry[]>(`/admin/time-entries?${query.toString()}`);
      setEntries(loaded);
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar historico de batidas.");
    } finally {
      setPending(false);
    }
  }

  if (!access.canOperate) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell">
        <section className="panel panel-wide">
          <h1>Historico de batidas</h1>
          <p>Seu perfil atual nao possui permissao para consultar batidas.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <PageHeader
        title="Historico de batidas"
        subtitle="Consulta rapida de registros para acompanhamento operacional."
      />

      {feedback ? <p className="journey-list-status-message">{feedback}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide timekeeping-register-layout">
          <HistoryFiltersCard
            drivers={drivers}
            filters={filters}
            pending={pending}
            onChange={handleFilterChange}
            onSubmit={() => void handleSubmit()}
            onClear={handleClear}
          />

          <HistoryEntriesTable entries={entries} driversById={driversById} pending={pending} />
        </article>
      </section>
    </main>
  );
}

function createDefaultFilters(): HistoryFilters {
  return {
    driverId: "",
    fromDate: todayDateKey(),
    toDate: todayDateKey(),
    kind: "",
    source: ""
  };
}
