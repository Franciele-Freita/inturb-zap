import Link from "next/link";

const passengerAppUrl = process.env.NEXT_PUBLIC_PASSENGER_APP_URL ?? "http://localhost:3002";

export default function PassengerHandoffPage() {
  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Passenger App</p>
          <h1>O atendimento do passageiro agora roda em um app separado.</h1>
        </div>
        <div className="status-card">
          <span className="status-label">Destino</span>
          <strong>{passengerAppUrl}</strong>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel">
          <div className="panel-head">
            <h2>Separacao de contexto</h2>
            <span>Admin e passageiro agora podem evoluir de forma independente</span>
          </div>
          <div className="list">
            <div className="list-card">
              <strong>Painel admin</strong>
              <span>Segue dedicado a operacao, corridas, clientes, alertas e motoristas.</span>
            </div>
            <div className="list-card">
              <strong>Passenger app</strong>
              <span>Concentra o chat web e a futura evolucao para o canal real do passageiro.</span>
            </div>
          </div>
          <Link href={passengerAppUrl} className="button-link" target="_blank" rel="noreferrer">
            Abrir passenger app
          </Link>
        </article>
      </section>
    </main>
  );
}
