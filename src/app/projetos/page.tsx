import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface Need {
    id: string;
    title: string;
    category: string;
    priority: string;
    quantity_needed: number;
    unit: string;
    status: string;
}

interface Hub {
    id: string;
    name: string;
    address: string;
    opening_hours: string | null;
}

interface Project {
    id: string;
    name: string;
    description: string | null;
    geographic_area: string | null;
    status: string;
    needs: Need[];
    hubs: Hub[];
}

const CATEGORY_LABELS: Record<string, string> = {
    alimentos: "🍚 Alimentos",
    roupas: "👕 Roupas",
    higiene: "🧴 Higiene",
    medicamentos: "💊 Medicamentos",
    moveis: "🪑 Móveis",
    agua: "💧 Água",
    colchoes: "🛏 Colchões",
    limpeza: "🧹 Limpeza",
    outros: "📦 Outros",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    high: { label: "Urgente", color: "#ef4444" },
    medium: { label: "Média", color: "#d97706" },
    low: { label: "Normal", color: "#6b7280" },
};

export const revalidate = 60; // Revalida a cada 60 segundos (ISR)

export default async function ProjetosPublicosPage() {
    const supabase = await createClient();

    // Fetch public data — anon key, filtered by RLS policy (015_public_read.sql)
    const [projectsRes, needsRes, hubsRes] = await Promise.all([
        supabase
            .from("projects")
            .select("id, name, description, geographic_area, status")
            .eq("status", "active")
            .order("created_at", { ascending: false }),
        supabase
            .from("needs")
            .select("id, project_id, title, category, priority, quantity_needed, unit, status")
            .in("status", ["open", "in_progress"])
            .order("priority", { ascending: false }),
        supabase
            .from("hubs")
            .select("id, project_id, name, address, opening_hours")
            .eq("status", "active"),
    ]);

    const rawProjects = projectsRes.data ?? [];
    const allNeeds = needsRes.data ?? [];
    const allHubs = hubsRes.data ?? [];

    const projects: Project[] = rawProjects.map((p) => ({
        ...p,
        needs: allNeeds.filter((n) => n.project_id === p.id),
        hubs: allHubs.filter((h) => h.project_id === p.id),
    }));

    return (
        <div style={{
            minHeight: "100dvh",
            background: "var(--color-bg)",
            color: "var(--color-text)",
        }}>
            {/* Header */}
            <header style={{
                borderBottom: "1px solid var(--color-border)",
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
            }}>
                <Link href="/" style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    textDecoration: "none", color: "var(--color-text)",
                    fontWeight: 700, fontSize: "1.0625rem",
                }}>
                    <Image
                        src="/assets/branding/logo.png"
                        alt="Rota Solidária"
                        width={100}
                        height={28}
                        style={{ objectFit: "contain" }}
                    />
                    Rota Solidária
                </Link>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <Link href="/auth/login" className="btn btn-ghost" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        Entrar
                    </Link>
                    <Link href="/auth/register" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                        Quero ajudar
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section style={{
                textAlign: "center",
                padding: "3.5rem 1.5rem 2rem",
                maxWidth: 640,
                margin: "0 auto",
            }}>
                <span style={{
                    display: "inline-block",
                    padding: "0.25rem 0.875rem",
                    borderRadius: 999,
                    background: "rgba(16,185,129,0.12)",
                    color: "#10b981",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    letterSpacing: "0.05em",
                }}>
                    OPERAÇÕES ATIVAS
                </span>
                <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.75rem", lineHeight: 1.2 }}>
                    Veja como você pode ajudar
                </h1>
                <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto 1.5rem" }}>
                    Abaixo estão as operações humanitárias ativas e o que mais precisamos agora. Crie sua conta para participar.
                </p>
                <Link href="/auth/register" className="btn btn-primary" style={{ width: "auto", padding: "0.75rem 2rem" }}>
                    Criar conta gratuita →
                </Link>
            </section>

            {/* Projects */}
            <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 1rem 4rem" }}>
                {projects.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</p>
                        <p>Nenhuma operação ativa no momento.</p>
                        <p style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
                            Volte em breve ou <Link href="/auth/login" style={{ color: "var(--color-primary)" }}>entre com sua conta</Link> para ver seus projetos.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: "2rem" }}>
                        {projects.map((project) => (
                            <div key={project.id} style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-lg)",
                                overflow: "hidden",
                            }}>
                                {/* Project header */}
                                <div style={{
                                    padding: "1.25rem 1.5rem",
                                    borderBottom: "1px solid var(--color-border)",
                                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
                                }}>
                                    <div>
                                        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                                            {project.name}
                                        </h2>
                                        {project.description && (
                                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                                                {project.description}
                                            </p>
                                        )}
                                        {project.geographic_area && (
                                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                📍 {project.geographic_area}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                        {project.needs.some((n) => n.priority === "high") && (
                                            <span style={{
                                                padding: "0.2rem 0.625rem", borderRadius: 999,
                                                background: "rgba(239,68,68,0.12)", color: "#ef4444",
                                                fontSize: "0.6875rem", fontWeight: 600,
                                            }}>
                                                🚨 Urgente
                                            </span>
                                        )}
                                        <span style={{
                                            padding: "0.2rem 0.625rem", borderRadius: 999,
                                            background: "rgba(16,185,129,0.12)", color: "#10b981",
                                            fontSize: "0.6875rem", fontWeight: 600,
                                        }}>
                                            ● Ativo
                                        </span>
                                    </div>
                                </div>

                                {/* Stats bar */}
                                <div style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "var(--color-surface-hover)",
                                    display: "flex", gap: "1.5rem", flexWrap: "wrap",
                                    fontSize: "0.8125rem", color: "var(--color-text-muted)",
                                }}>
                                    <span>📋 <strong style={{ color: "var(--color-text)" }}>{project.needs.length}</strong> demanda{project.needs.length !== 1 ? "s" : ""} abertas</span>
                                    <span>🏠 <strong style={{ color: "var(--color-text)" }}>{project.hubs.length}</strong> ponto{project.hubs.length !== 1 ? "s" : ""} de entrega</span>
                                </div>

                                {/* Needs list */}
                                {project.needs.length > 0 && (
                                    <div style={{ padding: "1rem 1.5rem" }}>
                                        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                            O que precisamos agora
                                        </h3>
                                        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                                            {project.needs.slice(0, 9).map((need) => (
                                                <div key={need.id} style={{
                                                    padding: "0.75rem 1rem",
                                                    background: "var(--color-bg)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: "var(--radius)",
                                                    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem",
                                                }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {need.title}
                                                        </p>
                                                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                            {CATEGORY_LABELS[need.category] ?? need.category} · {need.quantity_needed} {need.unit}
                                                        </p>
                                                    </div>
                                                    <span style={{
                                                        fontSize: "0.625rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, flexShrink: 0,
                                                        background: `${PRIORITY_CONFIG[need.priority]?.color ?? "#6b7280"}18`,
                                                        color: PRIORITY_CONFIG[need.priority]?.color ?? "#6b7280",
                                                    }}>
                                                        {PRIORITY_CONFIG[need.priority]?.label ?? need.priority}
                                                    </span>
                                                </div>
                                            ))}
                                            {project.needs.length > 9 && (
                                                <div style={{
                                                    padding: "0.75rem 1rem",
                                                    background: "var(--color-bg)",
                                                    border: "1px dashed var(--color-border)",
                                                    borderRadius: "var(--radius)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.8125rem", color: "var(--color-text-muted)",
                                                }}>
                                                    +{project.needs.length - 9} mais demandas
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Hubs */}
                                {project.hubs.length > 0 && (
                                    <div style={{ padding: "0 1.5rem 1rem" }}>
                                        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                            Pontos de entrega
                                        </h3>
                                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                            {project.hubs.map((hub) => (
                                                <span key={hub.id} style={{
                                                    padding: "0.375rem 0.75rem",
                                                    background: "var(--color-bg)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: 999,
                                                    fontSize: "0.75rem",
                                                }}>
                                                    📍 {hub.name}
                                                    {hub.opening_hours && <span style={{ color: "var(--color-text-muted)" }}> · {hub.opening_hours}</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <div style={{
                                    padding: "1rem 1.5rem",
                                    borderTop: "1px solid var(--color-border)",
                                    display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap",
                                }}>
                                    <Link href={`/projetos/${project.id}`} className="btn btn-ghost" style={{ width: "auto", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                                        Ver detalhes
                                    </Link>
                                    <Link href="/auth/register" className="btn btn-primary" style={{ width: "auto", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                                        Quero ajudar →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: "1px solid var(--color-border)",
                padding: "1.5rem",
                textAlign: "center",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
            }}>
                <p>Rota Solidária · 100% voluntário · Sem fins lucrativos</p>
                <p style={{ marginTop: "0.25rem" }}>
                    <Link href="/about" style={{ color: "var(--color-text-muted)" }}>Sobre</Link>
                    {" · "}
                    <Link href="/support" style={{ color: "var(--color-text-muted)" }}>Suporte</Link>
                    {" · "}
                    <Link href="/auth/login" style={{ color: "var(--color-text-muted)" }}>Entrar</Link>
                </p>
            </footer>
        </div>
    );
}
