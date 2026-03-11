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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    available: { label: "Disponivel para coleta", color: "#3b82f6" },
    assigned: { label: "Assumida", color: "#8b5cf6" },
    in_transit: { label: "Em transporte", color: "#d97706" },
    delivered: { label: "Entregue", color: "#059669" },
    validated: { label: "Validada", color: "#047857" },
    cancelled: { label: "Cancelada", color: "#6b7280" },
};

const STATUS_GROUPS = [
    { key: "available", title: "Disponiveis para coleta", empty: "Nenhuma entrega disponivel no momento." },
    { key: "active", title: "Em andamento", empty: "Nenhuma entrega em andamento." },
    { key: "completed", title: "Concluidas", empty: "Nenhuma entrega concluida nesta secao." },
];

export default function LogisticsTab({
    projectId,
    canManage,
    userId,
}: LogisticsTabProps) {
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
    }, [projectId, supabase]);

    useEffect(() => {
        async function loadDeliveries() {
            await fetchDeliveries();
        }

        void loadDeliveries();
    }, [fetchDeliveries]);

    useEffect(() => {
        if (success) {
            const timeout = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timeout);
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
            setSuccess("Entrega assumida com sucesso.");
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
            setSuccess(`Status atualizado para "${STATUS_CONFIG[newStatus]?.label}".`);
            await fetchDeliveries();
        }
    }

    async function handleCancel(deliveryId: string) {
        if (!confirm("Cancelar esta entrega?")) return;
        await handleUpdateStatus(deliveryId, "cancelled");
    }

    const available = deliveries.filter((delivery) => delivery.status === "available");
    const active = deliveries.filter((delivery) =>
        ["assigned", "in_transit", "delivered"].includes(delivery.status)
    );
    const completed = deliveries.filter((delivery) =>
        ["validated", "cancelled"].includes(delivery.status)
    );

    const groups: Record<string, Delivery[]> = { available, active, completed };

    if (loading) {
        return (
            <div className="admin-section" style={{ textAlign: "center", padding: "3rem" }}>
                <span
                    className="spinner"
                    style={{
                        borderColor: "rgba(0,0,0,0.1)",
                        borderTopColor: "var(--color-primary)",
                        width: 24,
                        height: 24,
                    }}
                />
            </div>
        );
    }

    return (
        <>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="admin-section">
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Logistica</h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>
                    A operacao logistica comeca quando o gestor aceita uma doacao vinculada a demanda e libera a coleta para voluntarios.
                </p>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Cada entrega segue o ciclo oferta aceita, coleta, transporte, recebimento e validacao final.
                </p>

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    {STATUS_GROUPS.map((group) => (
                        <button
                            key={group.key}
                            onClick={() => setActiveGroup(group.key)}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "var(--radius)",
                                border: `1px solid ${activeGroup === group.key ? "var(--color-primary)" : "var(--color-border)"}`,
                                background: activeGroup === group.key ? "var(--color-primary-glow)" : "transparent",
                                color: activeGroup === group.key ? "var(--color-primary)" : "var(--color-text-muted)",
                                fontFamily: "inherit",
                                fontSize: "0.8125rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all var(--transition)",
                            }}
                        >
                            {group.title} ({groups[group.key]?.length ?? 0})
                        </button>
                    ))}
                </div>
            </div>

            {deliveries.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Logistica</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma entrega pendente.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        As entregas aparecem aqui depois que uma doacao e aceita e entra no fluxo operacional do projeto.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        O gestor faz o aceite da doacao e os voluntarios logisticos assumem a coleta a partir desta fila.
                    </p>
                </div>
            ) : (groups[activeGroup]?.length ?? 0) === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        {STATUS_GROUPS.find((group) => group.key === activeGroup)?.empty || "Nenhum item nesta secao."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {(groups[activeGroup] ?? []).map((delivery) => (
                        <div key={delivery.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: "0.75rem",
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                                        {delivery.donations?.item_description ?? "Doacao"}
                                    </h3>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "1rem",
                                            flexWrap: "wrap",
                                            fontSize: "0.75rem",
                                            color: "var(--color-text-muted)",
                                        }}
                                    >
                                        {delivery.donations && (
                                            <span>
                                                Quantidade: {delivery.donations.quantity} {delivery.donations.unit}
                                            </span>
                                        )}
                                        {delivery.donations?.hubs && (
                                            <span>Destino: {delivery.donations.hubs.name}</span>
                                        )}
                                        {delivery.donations?.donor_lat && delivery.donations?.donor_lng && (
                                            <span>
                                                Origem: {delivery.donations.donor_lat.toFixed(3)}, {delivery.donations.donor_lng.toFixed(3)}
                                            </span>
                                        )}
                                        {delivery.volunteer && (
                                            <span>Responsavel atual: {delivery.volunteer.full_name}</span>
                                        )}
                                        {delivery.assigned_at && (
                                            <span>
                                                Assumida em {new Date(delivery.assigned_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        )}
                                        {delivery.delivered_at && (
                                            <span>
                                                Entregue em {new Date(delivery.delivered_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        )}
                                        {delivery.validated_at && (
                                            <span>
                                                Validada em {new Date(delivery.validated_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: "0.6875rem",
                                        fontWeight: 600,
                                        padding: "0.25rem 0.625rem",
                                        borderRadius: 999,
                                        background: `${STATUS_CONFIG[delivery.status]?.color}18`,
                                        color: STATUS_CONFIG[delivery.status]?.color,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                    }}
                                >
                                    {STATUS_CONFIG[delivery.status]?.label}
                                </span>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                {delivery.status === "available" && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleAssign(delivery.id)}
                                    >
                                        Assumir entrega
                                    </button>
                                )}

                                {delivery.status === "assigned" && delivery.logistics_volunteer_id === userId && (
                                    <button
                                        className="expand-btn"
                                        onClick={() => handleUpdateStatus(delivery.id, "in_transit")}
                                    >
                                        Sair para entrega
                                    </button>
                                )}

                                {delivery.status === "in_transit" && delivery.logistics_volunteer_id === userId && (
                                    <button
                                        className="expand-btn"
                                        onClick={() => handleUpdateStatus(delivery.id, "delivered")}
                                    >
                                        Marcar como entregue
                                    </button>
                                )}

                                {delivery.status === "delivered" && canManage && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleUpdateStatus(delivery.id, "validated")}
                                    >
                                        Validar recebimento
                                    </button>
                                )}

                                {canManage && !["validated", "cancelled"].includes(delivery.status) && (
                                    <button
                                        className="expand-btn"
                                        style={{ color: "var(--color-danger)" }}
                                        onClick={() => handleCancel(delivery.id)}
                                    >
                                        Cancelar
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
