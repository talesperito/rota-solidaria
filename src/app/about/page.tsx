import Link from "next/link";
import Nav from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

const TEAM = [
  {
    name: "Tales Giuliano Vieira",
    role: "Produto e coordenacao tecnica",
    linkedin: "https://www.linkedin.com/in/peritotales",
  },
  {
    name: "Joao Victor Nazareth de Souza",
    role: "Frontend e implementacao",
    linkedin: "https://www.linkedin.com/in/dev-joao-victor",
  },
];

export default async function AboutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "Visitante";
  let isMaster = false;

  if (user) {
    const [profileRes, masterRes] = await Promise.all([
      supabase.from("user_profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("user_global_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "master_admin")
        .maybeSingle(),
    ]);

    userName = profileRes.data?.full_name ?? "Usuario";
    isMaster = !!masterRes.data;
  }

  return (
    <div className="light-page">
      {user ? (
        <Nav userName={userName} isMaster={isMaster} />
      ) : (
        <div className="about-top">
          <Link href="/" className="nav-link">Voltar para inicio</Link>
          <Link href="/auth/login" className="nav-link">Entrar</Link>
        </div>
      )}

      <div className="page-container" style={{ maxWidth: 900 }}>
        <section className="admin-section">
          <h1 className="page-title" style={{ marginBottom: "0.75rem" }}>
            Sobre o Rota Solidaria
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            O Rota Solidaria e um projeto voluntario, totalmente sem fins lucrativos,
            criado para apoiar a coordenacao de ajuda humanitaria para vitimas de desastres.
          </p>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            A plataforma organiza doacoes, logistica e voluntariado com rastreabilidade,
            priorizando transparencia, seguranca e impacto social.
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Esse contexto orienta as decisoes de produto, engenharia e governanca do projeto.
          </p>
        </section>

        <section className="admin-section">
          <h2 style={{ marginBottom: "0.75rem" }}>Participantes</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {TEAM.map((member) => (
              <div
                key={member.name}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  background: "var(--color-surface-hover)",
                  padding: "0.875rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "0.9375rem" }}>{member.name}</strong>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{member.role}</span>
                </div>
                <a href={member.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ width: "auto" }}>
                  LinkedIn
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
