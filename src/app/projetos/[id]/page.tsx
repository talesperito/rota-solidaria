import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Need {
    id: string;
    title: string;
    description: string | null;
    category: string;
    priority: string;
    quantity_needed: number;
    unit: string;
    status: string;
    due_date: string | null;
}

interface Hub {
    id: string;
    name: string;
    address: string;
    opening_hours: string | null;
    gps_lat: number | null;
    gps_lng: number | null;
}

interface Donation {
    status: string;
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

export const revalidate = 60;

export default async function ProjetoPublicoPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const [projectRes, needsRes, hubsRes, donationsRes] = await Promise.all([
        supabase
            .from("projects")
            .select("id, name, description, geographic_area, status")
            .eq("id", id)
            .eq("status", "active")
            .single(),
        supabase
            .from("needs")
            .select("id, title, description, category, priority, quantity_needed, unit, status, due_date")
            .eq("project_id", id)
            .in("status", ["open", "in_progress"])
            .order("priority", { ascending: false }),
        supabase
            .from("hubs")
            .select("id, name, address, opening_hours, gps_lat, gps_lng")
            .eq("project_id", id)
            .eq("status", "active"),
        supabase
            .from("donations")
            .select("status")
            .eq("project_id", id)
            .not("status", "eq", "cancelled"),
    ]);

    if (projectRes.error || !projectRes.data) notFound();

    const project = projectRes.data;
    const needs: Need[] = needsRes.data ?? [];
    const hubs: Hub[] = hubsRes.data ?? [];
    const donations: Donation[] = donationsRes.data ?? [];

    const donationsDelivered = donations.filter((d) => d.status === "delivered").length;
    const donationsActive = donations.filter((d) => ["offered", "accepted", "in_transit"].includes(d.status)).length;

    const urgentNeeds = needs.filter((n) => n.priority === "high");
    const otherNeeds = needs.filter((n) => n.priority !== "high");

    return (
        <div style={{ minHeight: "100dvh", background: "var(--color-bg)", color: "var(--color-text)" }}>
            {/* Header */}
            <header style={{
                borderBottom: "1px solid var(--color-border)",
                padding: "1rem 1.5rem",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
            }}>
                <Link href="/projetos" style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    textDecoration: "none", color: "var(--color-text)", fontWeight: 700, fontSize: "1.0625rem",
                }}>
                    <Image src="/assets/branding/logo.png" alt="Rota Solidária" width={100} height={28} style={{ objectFit: "contain" }} />
                    Rota Solidária
                </Link>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <Link href="/projetos" style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", textDecoration: "none" }}>
                        ← Todas as operações
                    </Link>
                    <Link href="/auth/login" className="btn btn-ghost" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Entrar</Link>
                    <Link href="/auth/register" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>Quero ajudar</Link>
                </div>
            </header>

            <main style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 1rem 4rem" }}>

                {/* Project hero */}
                <div style={{ marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                        <div>
                            <span style={{
                                display: "inline-block", padding: "0.2rem 0.75rem", borderRadius: 999,
                                background: "rgba(16,185,129,0.12)", color: "#10b981",
                                fontSize: "0.6875rem", fontWeight: 600, marginBottom: "0.5rem",
                            }}>● OPERAÇÃO ATIVA</span>
                            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "0.5rem" }}>{project.name}</h1>
                            {project.description && (
                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", maxWidth: 560 }}>{project.description}</p>
                            )}
                            {project.geographic_area && (
                                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>📍 {project.geographic_area}</p>
                            )}
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div style={{
                        display: "flex", gap: "1.5rem", flexWrap: "wrap",
                        padding: "1rem 1.25rem",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius)",
                        marginTop: "1.25rem",
                        fontSize: "0.875rem",
                    }}>
                        <StatItem label="Demandas abertas" value={needs.length} icon="📋" />
                        <StatItem label="Pontos de entrega" value={hubs.length} icon="🏠" />
                        <StatItem label="Doações recebidas" value={donationsDelivered} icon="✅" />
                        <StatItem label="Doações em andamento" value={donationsActive} icon="🚛" />
                    </div>
                </div>

                {/* Urgent needs */}
                {urgentNeeds.length > 0 && (
                    <section style={{ marginBottom: "2rem" }}>
                        <div style={{
                            padding: "0.5rem 1rem", borderRadius: "var(--radius)",
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem",
                        }}>
                            <span>🚨</span>
                            <strong style={{ fontSize: "0.875rem", color: "#ef4444" }}>Necessidades urgentes — precisamos agora</strong>
                        </div>
                        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                            {urgentNeeds.map((need) => <NeedCard key={need.id} need={need} />)}
                        </div>
                    </section>
                )}

                {/* Other needs */}
                {otherNeeds.length > 0 && (
                    <section style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.875rem" }}>
                            Outras demandas ({otherNeeds.length})
                        </h2>
                        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                            {otherNeeds.map((need) => <NeedCard key={need.id} need={need} />)}
                        </div>
                    </section>
                )}

                {needs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)", marginBottom: "2rem" }}>
                        <p style={{ fontSize: "1.5rem" }}>✅</p>
                        <p style={{ marginTop: "0.5rem" }}>Todas as demandas foram atendidas no momento.</p>
                    </div>
                )}

                {/* Hubs */}
                {hubs.length > 0 && (
                    <section style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.875rem" }}>
                            Pontos de entrega ({hubs.length})
                        </h2>
                        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                            {hubs.map((hub) => (
                                <div key={hub.id} style={{
                                    padding: "1rem 1.125rem",
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius)",
                                }}>
                                    <p style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>📍 {hub.name}</p>
                                    <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{hub.address}</p>
                                    {hub.opening_hours && (
                                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>🕐 {hub.opening_hours}</p>
                                    )}
                                    {hub.gps_lat && hub.gps_lng && (
                                        <a
                                            href={`https://maps.google.com/?q=${hub.gps_lat},${hub.gps_lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}
                                        >
                                            Ver no mapa →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* CTA */}
                <div style={{
                    padding: "1.75rem",
                    background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.08))",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: "var(--radius-lg)",
                    textAlign: "center",
                }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Quer ajudar nesta operação?</h2>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.25rem" }}>
                        Crie sua conta gratuitamente para doar itens, ser voluntário logístico ou de serviço.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="/auth/register" className="btn btn-primary" style={{ width: "auto", padding: "0.625rem 1.75rem" }}>
                            Criar conta →
                        </Link>
                        <Link href="/auth/login" className="btn btn-ghost" style={{ width: "auto", padding: "0.625rem 1.25rem" }}>
                            Já tenho conta
                        </Link>
                    </div>
                </div>
            </main>

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
                    <Link href="/projetos" style={{ color: "var(--color-text-muted)" }}>Todas as operações</Link>
                    {" · "}
                    <Link href="/auth/login" style={{ color: "var(--color-text-muted)" }}>Entrar</Link>
                </p>
            </footer>
        </div>
    );
}

function NeedCard({ need }: { need: Need }) {
    const priority = PRIORITY_CONFIG[need.priority];
    return (
        <div style={{
            padding: "0.875rem 1rem",
            background: "var(--color-surface)",
            border: `1px solid ${need.priority === "high" ? "rgba(239,68,68,0.25)" : "var(--color-border)"}`,
            borderRadius: "var(--radius)",
            display: "flex", flexDirection: "column", gap: "0.375rem",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                <p style={{ fontWeight: 600, fontSize: "0.875rem", flex: 1 }}>{need.title}</p>
                <span style={{
                    fontSize: "0.5625rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, flexShrink: 0,
                    background: `${priority?.color ?? "#6b7280"}18`,
                    color: priority?.color ?? "#6b7280",
                }}>
                    {priority?.label ?? need.priority}
                </span>
            </div>
            {need.description && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{need.description}</p>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {CATEGORY_LABELS[need.category] ?? need.category} · {need.quantity_needed} {need.unit}
            </p>
            {need.due_date && (
                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                    📅 Prazo: {new Date(need.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
            )}
        </div>
    );
}

function StatItem({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{icon}</span>
            <div>
                <p style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{label}</p>
            </div>
        </div>
    );
}
