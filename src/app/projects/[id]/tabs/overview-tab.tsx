"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface OverviewTabProps {
    projectId: string;
    canManage: boolean;
}

interface Stats {
    needs: { open: number; in_progress: number; fulfilled: number; cancelled: number; total: number };
    donations: { offered: number; accepted: number; in_transit: number; delivered: number; cancelled: number; total: number };
    deliveries: { available: number; assigned: number; in_transit: number; delivered: number; validated: number; distributed: number; cancelled: number; total: number };
    hubs: { active: number; inactive: number; total: number };
    incidents: { open: number; investigating: number; resolved: number; total: number };
    members: { manager: number; donor: number; logistics_volunteer: number; service_volunteer: number; total: number };
}

const EMPTY_STATS: Stats = {
    needs: { open: 0, in_progress: 0, fulfilled: 0, cancelled: 0, total: 0 },
    donations: { offered: 0, accepted: 0, in_transit: 0, delivered: 0, cancelled: 0, total: 0 },
    deliveries: { available: 0, assigned: 0, in_transit: 0, delivered: 0, validated: 0, distributed: 0, cancelled: 0, total: 0 },
    hubs: { active: 0, inactive: 0, total: 0 },
    incidents: { open: 0, investigating: 0, resolved: 0, total: 0 },
    members: { manager: 0, donor: 0, logistics_volunteer: 0, service_volunteer: 0, total: 0 },
};

function count<T extends Record<string, unknown>>(rows: T[], key: keyof T, val: string): number {
    return rows.filter((r) => r[key] === val).length;
}

export default function OverviewTab({ projectId, canManage }: OverviewTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [stats, setStats] = useState<Stats>(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        const [needsRes, donRes, delRes, hubsRes, incRes, memRes] = await Promise.all([
            supabase.from("needs").select("status").eq("project_id", projectId),
            supabase.from("donations").select("status").eq("project_id", projectId),
            supabase.from("deliveries").select("status").eq("project_id", projectId),
            supabase.from("hubs").select("status").eq("project_id", projectId),
            supabase.from("incidents").select("status").eq("project_id", projectId),
            supabase.from("project_members").select("role").eq("project_id", projectId),
        ]);

        if (needsRes.error) { setError("Erro ao carregar dados."); setLoading(false); return; }

        const needs = needsRes.data ?? [];
        const donations = donRes.data ?? [];
        const deliveries = delRes.data ?? [];
        const hubs = hubsRes.data ?? [];
        const incidents = incRes.data ?? [];
        const members = memRes.data ?? [];

        setStats({
            needs: {
                open: count(needs, "status", "open"),
                in_progress: count(needs, "status", "in_progress"),
                fulfilled: count(needs, "status", "fulfilled"),
                cancelled: count(needs, "status", "cancelled"),
                total: needs.length,
            },
            donations: {
                offered: count(donations, "status", "offered"),
                accepted: count(donations, "status", "accepted"),
                in_transit: count(donations, "status", "in_transit"),
                delivered: count(donations, "status", "delivered"),
                cancelled: count(donations, "status", "cancelled"),
                total: donations.length,
            },
            deliveries: {
                available: count(deliveries, "status", "available"),
                assigned: count(deliveries, "status", "assigned"),
                in_transit: count(deliveries, "status", "in_transit"),
                delivered: count(deliveries, "status", "delivered"),
                validated: count(deliveries, "status", "validated"),
                distributed: count(deliveries, "status", "distributed"),
                cancelled: count(deliveries, "status", "cancelled"),
                total: deliveries.length,
            },
            hubs: {
                active: count(hubs, "status", "active"),
                inactive: count(hubs, "status", "inactive"),
                total: hubs.length,
            },
            incidents: {
                open: count(incidents, "status", "open"),
                investigating: count(incidents, "status", "investigating"),
                resolved: count(incidents, "status", "resolved"),
                total: incidents.length,
            },
            members: {
                manager: count(members, "role", "manager"),
                donor: count(members, "role", "donor"),
                logistics_volunteer: count(members, "role", "logistics_volunteer"),
                service_volunteer: count(members, "role", "service_volunteer"),
                total: members.length,
            },
        });
        setLoading(false);
    }, [projectId, supabase]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) {
        return (
            <div className="admin-section" style={{ textAlign: "center", padding: "3rem" }}>
                <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "var(--color-primary)", width: 24, height: 24 }} />
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-error">{error}</div>;
    }

    const donationsActive = stats.donations.offered + stats.donations.accepted + stats.donations.in_transit;
    const deliveriesActive = stats.deliveries.available + stats.deliveries.assigned + stats.deliveries.in_transit;
    const needsOpen = stats.needs.open + stats.needs.in_progress;
    const incidentsOpen = stats.incidents.open + stats.incidents.investigating;

    return (
        <div style={{ display: "grid", gap: "1rem" }}>

            {/* Alert: open incidents */}
            {incidentsOpen > 0 && (
                <div style={{
                    padding: "0.875rem 1.25rem",
                    borderRadius: "var(--radius)",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    fontSize: "0.875rem",
                }}>
                    <span style={{ fontSize: "1.125rem" }}>⚠️</span>
                    <span>
                        <strong>{incidentsOpen} incidente{incidentsOpen !== 1 ? "s" : ""}</strong> em aberto requerem atenção.
                    </span>
                </div>
            )}

            {/* Top KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
                <KpiCard icon="📋" label="Demandas abertas" value={needsOpen} total={stats.needs.total} color="#3b82f6" />
                <KpiCard icon="📦" label="Doações ativas" value={donationsActive} total={stats.donations.total} color="#8b5cf6" />
                <KpiCard icon="🚛" label="Entregas em curso" value={deliveriesActive} total={stats.deliveries.total} color="#d97706" />
                <KpiCard icon="✅" label="Entregas concluídas" value={stats.deliveries.validated + stats.deliveries.distributed} total={stats.deliveries.total} color="#059669" />
                <KpiCard icon="🏠" label="Hubs ativos" value={stats.hubs.active} total={stats.hubs.total} color="#10b981" />
                <KpiCard icon="👥" label="Membros" value={stats.members.total} color="#6b7280" />
            </div>

            {/* Demandas breakdown */}
            <div className="admin-section" style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Demandas por status</h3>
                <StatusRow items={[
                    { label: "Abertas", value: stats.needs.open, color: "#3b82f6" },
                    { label: "Em andamento", value: stats.needs.in_progress, color: "#d97706" },
                    { label: "Atendidas", value: stats.needs.fulfilled, color: "#059669" },
                    { label: "Canceladas", value: stats.needs.cancelled, color: "#6b7280" },
                ]} total={stats.needs.total} />
            </div>

            {/* Cadeia de custódia das doações */}
            <div className="admin-section" style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Cadeia de custódia</h3>
                <ChainFlow stats={stats} />
            </div>

            {/* Equipe */}
            <div className="admin-section" style={{ marginBottom: 0 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Equipe do projeto</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
                    {[
                        { label: "Gestores", value: stats.members.manager, color: "#7c3aed" },
                        { label: "Doadores", value: stats.members.donor, color: "#2563eb" },
                        { label: "Vol. Logístico", value: stats.members.logistics_volunteer, color: "#d97706" },
                        { label: "Vol. Serviço", value: stats.members.service_volunteer, color: "#059669" },
                    ].map((m) => (
                        <div key={m.label} style={{
                            padding: "0.875rem 1rem",
                            background: "var(--color-surface-hover)",
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--color-border)",
                            textAlign: "center",
                        }}>
                            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</p>
                            <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>{m.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Incidentes (apenas se canManage ou se houver abertos) */}
            {(canManage || stats.incidents.total > 0) && (
                <div className="admin-section" style={{ marginBottom: 0 }}>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>Incidentes</h3>
                    <StatusRow items={[
                        { label: "Abertos", value: stats.incidents.open, color: "#ef4444" },
                        { label: "Investigando", value: stats.incidents.investigating, color: "#d97706" },
                        { label: "Resolvidos", value: stats.incidents.resolved, color: "#059669" },
                    ]} total={stats.incidents.total} />
                </div>
            )}
        </div>
    );
}

function KpiCard({ icon, label, value, total, color }: { icon: string; label: string; value: number; total?: number; color: string }) {
    return (
        <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            display: "flex", flexDirection: "column", gap: "0.375rem",
        }}>
            <span style={{ fontSize: "1.25rem" }}>{icon}</span>
            <p style={{ fontSize: "1.625rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", lineHeight: 1.3 }}>{label}</p>
            {total !== undefined && total > 0 && value !== total && (
                <p style={{ fontSize: "0.625rem", color: "var(--color-text-muted)" }}>de {total} total</p>
            )}
        </div>
    );
}

function StatusRow({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
    return (
        <div>
            {/* Stacked bar */}
            {total > 0 && (
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: "0.875rem", gap: 2 }}>
                    {items.map((item) => {
                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                        return pct > 0 ? (
                            <div key={item.label} style={{ width: `${pct}%`, background: item.color, borderRadius: 999, transition: "width 0.4s ease" }} title={`${item.label}: ${item.value}`} />
                        ) : null;
                    })}
                </div>
            )}
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                {items.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ color: "var(--color-text-muted)" }}>{item.label}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
                {total === 0 && <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Nenhum registro ainda.</span>}
            </div>
        </div>
    );
}

function ChainFlow({ stats }: { stats: Stats }) {
    const steps = [
        { label: "Oferecidas", value: stats.donations.offered, color: "#3b82f6", icon: "🤲" },
        { label: "Aceitas", value: stats.donations.accepted, color: "#8b5cf6", icon: "✓" },
        { label: "Em coleta", value: stats.deliveries.assigned, color: "#6366f1", icon: "🙋" },
        { label: "Em transporte", value: stats.deliveries.in_transit, color: "#d97706", icon: "🚛" },
        { label: "Entregues no hub", value: stats.deliveries.delivered + stats.deliveries.validated, color: "#059669", icon: "📦" },
        { label: "Distribuídas", value: stats.deliveries.distributed, color: "#047857", icon: "🤲" },
    ];

    return (
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexWrap: "wrap" }}>
            {steps.map((step, i) => (
                <div key={step.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "var(--radius)",
                        background: `${step.color}12`,
                        border: `1px solid ${step.color}30`,
                        textAlign: "center",
                        minWidth: 72,
                    }}>
                        <p style={{ fontSize: "0.75rem", marginBottom: "0.125rem" }}>{step.icon}</p>
                        <p style={{ fontSize: "1.125rem", fontWeight: 700, color: step.color, lineHeight: 1 }}>{step.value}</p>
                        <p style={{ fontSize: "0.5625rem", color: "var(--color-text-muted)", marginTop: "0.125rem", lineHeight: 1.2 }}>{step.label}</p>
                    </div>
                    {i < steps.length - 1 && (
                        <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", flexShrink: 0 }}>→</span>
                    )}
                </div>
            ))}
        </div>
    );
}
