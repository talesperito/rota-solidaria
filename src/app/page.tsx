import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/nav";

/* ── Solidarity Hero SVG ── */
function SolidarityHero() {
  return (
    <svg viewBox="0 0 480 240" fill="none" style={{ width: "100%", maxWidth: 420, margin: "0 auto 1rem", display: "block" }}>
      {/* Sky gradient background */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#eff6ff" />
        </linearGradient>
        <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
      </defs>
      <rect width="480" height="240" rx="16" fill="url(#sky)" />

      {/* Rolling hills (Zona da Mata landscape) */}
      <path d="M0 180 C80 140 160 170 240 150 C320 130 400 160 480 140 V240 H0Z" fill="url(#hill)" opacity="0.5" />
      <path d="M0 200 C100 170 200 190 300 175 C380 165 440 180 480 170 V240 H0Z" fill="#86efac" opacity="0.4" />

      {/* Sun */}
      <circle cx="400" cy="55" r="30" fill="#fbbf24" opacity="0.7" />
      <circle cx="400" cy="55" r="22" fill="#fcd34d" />

      {/* Clouds */}
      <g opacity="0.6">
        <ellipse cx="100" cy="45" rx="30" ry="12" fill="white" />
        <ellipse cx="120" cy="40" rx="22" ry="10" fill="white" />
        <ellipse cx="280" cy="60" rx="25" ry="10" fill="white" />
      </g>

      {/* Map pin 1 — donation point */}
      <g transform="translate(100,95)">
        <path d="M18 0C8 0 0 8 0 18C0 31.5 18 49.5 18 49.5S36 31.5 36 18C36 8 28 0 18 0Z" fill="#3b82f6" />
        <circle cx="18" cy="18" r="7" fill="white" />
        <text x="18" y="22" textAnchor="middle" fontSize="11" fill="#3b82f6" fontWeight="bold">📦</text>
      </g>

      {/* Map pin 2 — hub */}
      <g transform="translate(310,80)">
        <path d="M15 0C6.7 0 0 6.7 0 15C0 26 15 39 15 39S30 26 30 15C30 6.7 23.3 0 15 0Z" fill="#10b981" />
        <circle cx="15" cy="15" r="6" fill="white" />
        <text x="15" y="19" textAnchor="middle" fontSize="9" fill="#10b981" fontWeight="bold">🏠</text>
      </g>

      {/* Route connecting pins */}
      <path d="M118 135 C160 150 220 120 260 125 C280 128 300 120 325 115" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="8 5" fill="none" opacity="0.45" />

      {/* Heart in center */}
      <g transform="translate(215,130)">
        <path d="M15 27C15 27 30 15 30 7.5C30 3.4 26.6 0 22.5 0C19.8 0 17.4 1.3 15 3.5C12.6 1.3 10.2 0 7.5 0C3.4 0 0 3.4 0 7.5C0 15 15 27 15 27Z" fill="#ef4444" opacity="0.7" />
      </g>

      {/* People silhouettes */}
      {/* Person 1 — volunteer */}
      <g transform="translate(155,160)">
        <circle cx="8" cy="4" r="4" fill="#3b82f6" opacity="0.7" />
        <path d="M3 12 C3 9 5 7 8 7 C11 7 13 9 13 12 V20 H3Z" fill="#3b82f6" opacity="0.5" />
      </g>
      {/* Person 2 */}
      <g transform="translate(180,155)">
        <circle cx="8" cy="4" r="4" fill="#8b5cf6" opacity="0.7" />
        <path d="M3 12 C3 9 5 7 8 7 C11 7 13 9 13 12 V22 H3Z" fill="#8b5cf6" opacity="0.5" />
      </g>
      {/* Person 3 */}
      <g transform="translate(265,158)">
        <circle cx="8" cy="4" r="4" fill="#10b981" opacity="0.7" />
        <path d="M3 12 C3 9 5 7 8 7 C11 7 13 9 13 12 V21 H3Z" fill="#10b981" opacity="0.5" />
      </g>
      {/* Person 4 */}
      <g transform="translate(290,162)">
        <circle cx="8" cy="4" r="4" fill="#f59e0b" opacity="0.7" />
        <path d="M3 12 C3 9 5 7 8 7 C11 7 13 9 13 12 V19 H3Z" fill="#f59e0b" opacity="0.5" />
      </g>

      {/* Box at hub */}
      <rect x="320" y="165" width="14" height="12" rx="2" fill="#d97706" opacity="0.6" />
      <rect x="322" y="163" width="10" height="3" rx="1" fill="#b45309" opacity="0.5" />
    </svg>
  );
}

/* ── Seed Constants ── */
const SEED_PROJECT = {
  name: "SOS Zona da Mata - MG",
  description:
    "Central de coordenação de doações e voluntariado para ações emergenciais e contínuas na Zona da Mata/MG.",
};

function MissionBanner() {
  return (
    <section className="mission-banner" aria-label="Missão do projeto">
      <div className="mission-badge-row">
        <span className="mission-badge">100% Voluntário</span>
        <span className="mission-badge">Sem fins lucrativos</span>
        <span className="mission-badge">Ajuda a vítimas de desastres</span>
      </div>
      <h2>Nossa missão</h2>
      <p>
        O Rota Solidária existe para organizar ajuda humanitária com agilidade e rastreabilidade.
        Este projeto é mantido por contribuidores voluntários e não possui finalidade comercial.
      </p>
      <p className="mission-note">
        Novo por aqui? Este contexto é parte central das decisões de produto, engenharia e governança.
      </p>
    </section>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not logged in: public welcome ──
  if (!user) {
    return (
      <div className="light-page">
        <div className="hero" style={{ paddingTop: "5rem" }}>
          <Link href="/" className="logo" style={{ justifyContent: "center", marginBottom: "2rem" }}>
            <Image
              src="/assets/branding/logo.png"
              alt="Rota Solidária"
              width={120}
              height={34}
              className="logo-image"
              priority
            />
            Rota Solidária
          </Link>
          <SolidarityHero />
          <h1>Ajuda humanitária organizada</h1>
          <p>
            Coordene doações, logística e voluntariado de forma eficiente,
            segura e rastreável. Sem fins lucrativos, por pessoas, para pessoas.
          </p>
          <div className="hero-actions">
            <Link href="/auth/login" className="btn btn-primary">
              Entrar
            </Link>
            <Link href="/auth/register" className="btn btn-ghost">
              Criar Conta
            </Link>
          </div>
          <MissionBanner />
        </div>
      </div>
    );
  }

  // ── Authenticated: fetch data in parallel ──
  const [profileRes, masterRes, projectsRes] = await Promise.all([
    supabase.from("user_profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("user_global_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master_admin")
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, description, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const userName = profileRes.data?.full_name ?? "Usuário";
  const isMaster = !!masterRes.data;
  let projects = projectsRes.data ?? [];
  let seedError: string | null = null;

  // ── Auto-seed: create initial project if master + zero projects ──
  if (isMaster && projects.length === 0) {
    // Check-then-insert ensures idempotency:
    // - Only runs if query returns 0 projects (RLS-aware)
    // - Server component runs once per request (no race conditions)
    const { data: newProject, error: insertError } = await supabase
      .from("projects")
      .insert({
        name: SEED_PROJECT.name,
        description: SEED_PROJECT.description,
        created_by: user.id,
      })
      .select("id, name, description, status, created_at")
      .single();

    if (insertError) {
      seedError = `Erro ao criar projeto inicial: ${insertError.message}`;
      console.error("[SEED ERROR]", insertError);
    } else if (newProject) {
      projects = [newProject];
      console.log("[SEED] Projeto inicial criado:", newProject.name);
    }
  }

  return (
    <div className="light-page">
      <Nav userName={userName} isMaster={isMaster} />

      {/* Hero section */}
      <div
        style={{
          textAlign: "center",
          padding: "2.5rem 1rem 1rem",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <SolidarityHero />
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Projetos Ativos
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
          Acompanhe e participe das operações humanitárias em andamento.
        </p>
      </div>

      <div className="page-container" style={{ maxWidth: 900, paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
        <MissionBanner />
      </div>

      {/* Error alert */}
      {seedError && (
        <div className="page-container" style={{ maxWidth: 700, paddingTop: 0 }}>
          <div className="alert alert-error">{seedError}</div>
        </div>
      )}

      {/* Projects grid */}
      <div className="page-container" style={{ maxWidth: 900, paddingTop: "1rem" }}>
        {projects.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: "2rem" }}>📋</p>
            <p>Nenhum projeto disponível ainda.</p>
            {isMaster && (
              <Link
                href="/admin"
                className="btn btn-primary"
                style={{ width: "auto", marginTop: "1rem" }}
              >
                Criar projeto no Admin
              </Link>
            )}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p) => (
              <div key={p.id} className="project-card" style={{ cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <span
                    className={`project-status ${p.status === "active" ? "status-active" : "status-inactive"}`}
                  >
                    <span className="status-dot" />
                    {p.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p>{p.description || "Sem descrição"}</p>
                <Link
                  href={`/projects/${p.id}`}
                  className="btn btn-primary"
                  style={{
                    width: "auto",
                    marginTop: "0.5rem",
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.8125rem",
                  }}
                >
                  Acessar →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
