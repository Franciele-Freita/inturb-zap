import Link from "next/link";

const settingsRoutes = [
  {
    href: "/settings/company",
    eyebrow: "Institucional",
    title: "Dados da empresa",
    description: "Cadastre CNPJ, endereco e representante legal para contratos e documentos."
  },
  {
    href: "/settings/employment-linkages",
    eyebrow: "RH",
    title: "Vinculos trabalhistas",
    description: "Gerencie nomenclatura, ordem e disponibilidade dos vinculos exibidos no sistema."
  },
  {
    href: "/profile",
    eyebrow: "Operador",
    title: "Meu perfil",
    description: "Atualize nome, e-mail e senha da conta administrativa logada."
  },
  {
    href: "/settings/auxiliary-tables/cbo",
    eyebrow: "Tabelas auxiliares",
    title: "CBO (Classificacao Brasileira)",
    description: "Acesse a tabela de CBO usada no cadastro de cargos e regras trabalhistas."
  }
] as const;

export default function SettingsIndexPage() {
  return (
    <main className="page-shell">
      <section className="grid grid-single">
        <article className="panel panel-wide">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Central de configuracoes</h2>
              <span>Escolha qual bloco deseja ajustar no painel administrativo.</span>
            </div>
          </div>

          <div className="dashboard-action-grid">
            {settingsRoutes.map((route) => (
              <Link key={route.href} href={route.href} className="dashboard-action-card">
                <span className="overview-label">{route.eyebrow}</span>
                <strong>{route.title}</strong>
                <p>{route.description}</p>
                <span className="dashboard-action-link">Abrir</span>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
