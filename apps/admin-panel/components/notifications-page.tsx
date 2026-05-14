"use client";

import { useEffect, useState } from "react";
import { NotificationItem, request, formatDateTime } from "../lib/api";
import { FinancialDataTable } from "./financial-data-table";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void request<NotificationItem[]>("/admin/notifications")
      .then(setNotifications)
      .finally(() => setIsLoading(false));
  }, []);

  async function markAsRead(id: string) {
    await request(`/admin/notifications/${id}/read`, { method: "PATCH" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }

  return (
    <main className="page-shell page-shell-wide">
      <section className="panel panel-wide">
        <div className="panel-head panel-head-inline">
          <div>
            <h2>Central de Notificacoes</h2>
            <span>Acompanhe eventos operacionais e alertas do sistema.</span>
          </div>
          <button className="button-link secondary-link">Marcar todas como lidas</button>
        </div>

        <FinancialDataTable
          loading={isLoading}
          isEmpty={notifications.length === 0}
          emptyTitle="Tudo limpo por aqui"
          emptyDescription="Voce nao tem notificacoes no momento."
          columnCount={3}
          headers={
            <tr>
              <th>Notificacao</th>
              <th>Data</th>
              <th>Acao</th>
            </tr>
          }
        >
          {notifications.map((item) => (
            <tr key={item.id} className={!item.readAt ? "notification-unread-row" : ""}>
              <td>
                <div className="table-contact-cell">
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </div>
              </td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>
                <div className="table-actions">
                   {!item.readAt && (
                     <button onClick={() => markAsRead(item.id)} className="button-link secondary-link">
                       Lida
                     </button>
                   )}
                   {item.link && (
                     <a href={item.link} className="button-link">Abrir</a>
                   )}
                </div>
              </td>
            </tr>
          ))}
        </FinancialDataTable>
      </section>
    </main>
  );
}