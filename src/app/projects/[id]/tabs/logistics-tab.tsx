"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Delivery {
    id: string;
    donation_id: string;
    logistics_volunteer_id: string | null;
    status: string;
    assigned_at: string | null;
    delivered_at: string | null;
    validated_at: string | null;
    notes: string | null;
    created_at: string;
    donations: {
        item_description: string;
        category: string;
        quantity: number;
        unit: string;
        donor_lat: number | null;
        donor_lng: number | null;
        hubs: { name: string } | null;
    } | null;
    volunteer: { full_name: string } | null;
}

interface LogisticsTabProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    available: { label: "Disponível", color: "#3b82f6", icon: "📋" },
    assigned: { label: "Assumida", color: "#8b5cf6", icon: "🙋" },
    in_transit: { label: "Em transporte", color: "#d97706", icon: "🚛" },
    delivered: { label: "Entregue", color: "#059669", icon: "📦" },
    validated: { label: "Validada", color: "#047857", icon: "✅" },
    cancelled: { label: "Cancelada", color: "#6b7280", icon: "✕" },
};

const STATUS_GROUPS = [
    { key: "available", title: "Disponíveis para coleta", empty: "Nenhuma entrega disponível no momento." },
    { key: "active", title: "Em andamento", empty: "Nenhuma entrega em andamento." },
    { key: "completed", title: "Concluídas", empty: "" },
];

export default function LogisticsTab({ projectId, canManage, userId }: LogisticsTabProps) {
    const supabase = createClient();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeGroup, setActiveGroup] = useState("available");

    const fetchDeliveries = useCallback(async () => {

        const { data, error: err } = await supabase
            .from("deliveries")
            .select(`
        id, donation_id, logistics_volunteer_id, status,
        assigned_at, delivered_at, validated_at, notes, created_at,
        donations(item_description, category, quantity, unit, donor_lat, donor_lng, hubs(name)),
        volunteer:user_profiles!deliveries_logistics_volunteer_id_fkey(full_name)
      `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (err) {
            setError(`Erro ao carregar entregas: ${err.message}`);
            console.error("[DELIVERIES FETCH ERROR]", err);
        } else {
            setDeliveries((data as unknown as Delivery[]) ?? []);
        }
        setLoading(false);
    }, [projectId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function handleAssign(deliveryId: string) {
        setError(null);
        const { error: err } = await supabase
            .from("deliveries")
            .update({
                logistics_volunteer_id: userId,
                status: "assigned",
                assigned_at: new Date().toISOString(),
            })
            .eq("id", deliveryId)
            .eq("status", "available");

        if (err) {
            setError(`Erro ao assumir entrega: ${err.message}`);
            console.error("[ASSIGN ERROR]", err);
        } else {
            setSuccess("Entrega assumida! Obrigado pelo voluntariado. 🙌");
            setActiveGroup("active");
            await fetchDeliveries();
        }
    }

    async function handleUpdateStatus(deliveryId: string, newStatus: string) {
        setError(null);
        const update: Record<string, unknown> = { status: newStatus };
        if (newStatus === "in_transit") update.notes = null;
        if (newStatus === "delivered") update.delivered_at = new Date().toISOString();
        if (newStatus === "validated") update.validated_at = new Date().toISOString();

        const { error: err } = await supabase
            .from("deliveries")
            .update(update)
            .eq("id", deliveryId);

        if (err) {
            setError(`Erro ao atualizar status: ${err.message}`);
            console.error("[STATUS UPDATE ERROR]", err);
        } else {
            setSuccess(`Status: ${STATUS_CONFIG[newStatus]?.label}.`);
            await fetchDeliveries();
        }
    }

    async function handleCancel(deliveryId: string) {
        if (!confirm("Cancelar esta entrega?")) return;
        await handleUpdateStatus(deliveryId, "cancelled");
    }

    // Group deliveries
    const available = deliveries.filter((d) => d.status === "available");
    const active = deliveries.filter((d) => ["assigned", "in_transit", "delivered"].includes(d.status));
    const completed = deliveries.filter((d) => ["validated", "cancelled"].includes(d.status));

    const groups: Record<string, Delivery[]> = { available, active, completed };

    if (loading) {
        return (
            <div className="admin-section" style={{ textAlign: "center", padding: "3rem" }}>
                <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "var(--color-primary)", width: 24, height: 24 }} />
            </div>
        );
    }

    return (
        <>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Header */}
            <div className="admin-section">
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Logística</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Entregas são criadas automaticamente quando uma doação é aceita pelo gestor. Voluntários logísticos podem assumir e transportar.
                </p>

                {/* Stats */}
                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    {STATUS_GROUPS.map((g) => (
                        <button
                            key={g.key}
                            onClick={() => setActiveGroup(g.key)}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "var(--radius)",
                                border: `1px solid ${activeGroup === g.key ? "var(--color-primary)" : "var(--color-border)"}`,
                                background: activeGroup === g.key ? "var(--color-primary-glow)" : "transparent",
                                color: activeGroup === g.key ? "var(--color-primary)" : "var(--color-text-muted)",
                                fontFamily: "inherit",
                                fontSize: "0.8125rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all var(--transition)",
                            }}
                        >
                            {g.title} ({groups[g.key]?.length ?? 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Delivery List */}
            {deliveries.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🚛</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma entrega pendente.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Entregas são geradas automaticamente quando o gestor aceita uma doação na aba &quot;Doações&quot;.
                    </p>
                </div>
            ) : (groups[activeGroup]?.length ?? 0) === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        {STATUS_GROUPS.find((g) => g.key === activeGroup)?.empty || "Nenhum item nesta seção."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {(groups[activeGroup] ?? []).map((d) => (
                        <div key={d.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    {/* Item info */}
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                                        {d.donations?.item_description ?? "Doação"}
                                    </h3>
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        {d.donations && <span>📊 {d.donations.quantity} {d.donations.unit}</span>}
                                        {d.donations?.hubs && <span>📍 Destino: {d.donations.hubs.name}</span>}
                                        {d.donations?.donor_lat && d.donations?.donor_lng && (
                                            <span>🌐 Origem: {d.donations.donor_lat.toFixed(3)}, {d.donations.donor_lng.toFixed(3)}</span>
                                        )}
                                        {d.volunteer && <span>🙋 {d.volunteer.full_name}</span>}
                                        {d.assigned_at && <span>📅 Assumida: {new Date(d.assigned_at).toLocaleDateString("pt-BR")}</span>}
                                        {d.delivered_at && <span>📦 Entregue: {new Date(d.delivered_at).toLocaleDateString("pt-BR")}</span>}
                                        {d.validated_at && <span>✅ Validada: {new Date(d.validated_at).toLocaleDateString("pt-BR")}</span>}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: "0.6875rem", fontWeight: 600,
                                    padding: "0.25rem 0.625rem", borderRadius: 999,
                                    background: `${STATUS_CONFIG[d.status]?.color}18`,
                                    color: STATUS_CONFIG[d.status]?.color,
                                    whiteSpace: "nowrap", flexShrink: 0,
                                }}>
                                    {STATUS_CONFIG[d.status]?.icon} {STATUS_CONFIG[d.status]?.label}
                                </span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                {/* Volunteer: assign self */}
                                {d.status === "available" && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleAssign(d.id)}>
                                        🙋 Assumir entrega
                                    </button>
                                )}

                                {/* Volunteer: mark in transit */}
                                {d.status === "assigned" && d.logistics_volunteer_id === userId && (
                                    <button className="expand-btn" onClick={() => handleUpdateStatus(d.id, "in_transit")}>
                                        🚛 Saí para entrega
                                    </button>
                                )}

                                {/* Volunteer: mark delivered */}
                                {d.status === "in_transit" && d.logistics_volunteer_id === userId && (
                                    <button className="expand-btn" onClick={() => handleUpdateStatus(d.id, "delivered")}>
                                        📦 Entreguei
                                    </button>
                                )}

                                {/* Manager: validate */}
                                {d.status === "delivered" && canManage && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(d.id, "validated")}>
                                        ✅ Validar entrega
                                    </button>
                                )}

                                {/* Manager: cancel */}
                                {canManage && !["validated", "cancelled"].includes(d.status) && (
                                    <button className="expand-btn" style={{ color: "var(--color-danger)" }} onClick={() => handleCancel(d.id)}>
                                        ✕ Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
