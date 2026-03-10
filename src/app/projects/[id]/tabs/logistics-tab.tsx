"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

interface Delivery {
    id: string;
    donation_id: string;
    logistics_volunteer_id: string | null;
    status: string;
    assigned_at: string | null;
    delivered_at: string | null;
    validated_at: string | null;
    distributed_at: string | null;
    notes: string | null;
    evidence_photo_url: string | null;
    created_at: string;
    donations: {
        item_description: string;
        category: string;
        quantity: number;
        unit: string;
        donor_lat: number | null;
        donor_lng: number | null;
        hubs: { name: string } | null;
        donor: { full_name: string; phone: string | null; phone_consent: boolean } | null;
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
    distributed: { label: "Distribuída", color: "#0f766e", icon: "🤲" },
    cancelled: { label: "Cancelada", color: "#6b7280", icon: "✕" },
};

const STATUS_GROUPS = [
    { key: "available", title: "Disponíveis para coleta", empty: "Nenhuma entrega disponível no momento." },
    { key: "active", title: "Em andamento", empty: "Nenhuma entrega em andamento." },
    { key: "completed", title: "Concluídas", empty: "" },
];


const EVIDENCE_BUCKET = "delivery-evidence";
const MAX_PHOTO_MB = 2;
const COMPRESSION_OPTIONS = {
    maxSizeMB: MAX_PHOTO_MB,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg" as const,
};

export default function LogisticsTab({ projectId, canManage, userId }: LogisticsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeGroup, setActiveGroup] = useState("available");

    // Evidence photo upload state
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingDeliveryId = useRef<string | null>(null);

    const fetchDeliveries = useCallback(async () => {
        const { data, error: err } = await supabase
            .from("deliveries")
            .select(`
                id, donation_id, logistics_volunteer_id, status,
                assigned_at, delivered_at, validated_at, distributed_at, notes, evidence_photo_url, created_at,
                donations(item_description, category, quantity, unit, donor_lat, donor_lng, hubs(name), donor:user_profiles!donations_donor_id_fkey(full_name, phone, phone_consent)),
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDeliveries();
    }, [fetchDeliveries]);


    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3500);
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
        if (newStatus === "distributed") update.distributed_at = new Date().toISOString();

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

    // Trigger file picker for evidence photo
    function triggerEvidenceUpload(deliveryId: string) {
        pendingDeliveryId.current = deliveryId;
        fileInputRef.current?.click();
    }

    // Handle file selection → compress → upload → update delivery
    async function handleEvidenceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        const deliveryId = pendingDeliveryId.current;
        if (!file || !deliveryId) return;

        // Reset input so same file can be re-selected
        e.target.value = "";

        if (!file.type.startsWith("image/")) {
            setError("Apenas imagens são permitidas como evidência.");
            return;
        }

        setUploadingFor(deliveryId);
        setError(null);

        try {
            setUploadProgress("Comprimindo imagem...");
            const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

            setUploadProgress("Enviando foto...");
            const ext = "jpg";
            const path = `${projectId}/${deliveryId}/${Date.now()}.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from(EVIDENCE_BUCKET)
                .upload(path, compressed, {
                    contentType: "image/jpeg",
                    upsert: true,
                });

            if (uploadErr) {
                throw new Error(uploadErr.message);
            }

            const { data: urlData } = supabase.storage
                .from(EVIDENCE_BUCKET)
                .getPublicUrl(path);

            setUploadProgress("Salvando referência...");
            const { error: updateErr } = await supabase
                .from("deliveries")
                .update({ evidence_photo_url: urlData.publicUrl })
                .eq("id", deliveryId);

            if (updateErr) throw new Error(updateErr.message);

            setSuccess("Foto de evidência enviada com sucesso! 📸");
            await fetchDeliveries();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro desconhecido";
            setError(`Erro ao enviar foto: ${msg}`);
            console.error("[EVIDENCE UPLOAD ERROR]", err);
        } finally {
            setUploadingFor(null);
            setUploadProgress(null);
            pendingDeliveryId.current = null;
        }
    }

    // Group deliveries
    const available = deliveries.filter((d) => d.status === "available");
    const active = deliveries.filter((d) => ["assigned", "in_transit", "delivered"].includes(d.status));
    const completed = deliveries.filter((d) => ["validated", "distributed", "cancelled"].includes(d.status));
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
            {/* Hidden file input for evidence photos */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleEvidenceFileChange}
            />

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Header */}
            <div className="admin-section">
                <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Logística</h2>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                        Entregas são criadas automaticamente quando uma doação é aceita pelo gestor. Voluntários logísticos podem assumir e transportar.
                    </p>
                </div>

                {/* Group tabs */}
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
                                        {d.donations?.donor && (
                                            d.donations.donor.phone_consent && d.donations.donor.phone
                                                ? <span title="Contato do doador">📞 {d.donations.donor.full_name}: {d.donations.donor.phone}</span>
                                                : <span style={{ color: "var(--color-text-muted)" }} title="Doador não autorizou compartilhamento de telefone">📞 {d.donations.donor.full_name} (sem contato autorizado)</span>
                                        )}
                                        {d.assigned_at && <span>📅 Assumida: {new Date(d.assigned_at).toLocaleDateString("pt-BR")}</span>}
                                        {d.delivered_at && <span>📦 Entregue: {new Date(d.delivered_at).toLocaleDateString("pt-BR")}</span>}
                                        {d.validated_at && <span>✅ Validada: {new Date(d.validated_at).toLocaleDateString("pt-BR")}</span>}
                                        {d.distributed_at && <span>🤲 Distribuída: {new Date(d.distributed_at).toLocaleDateString("pt-BR")}</span>}
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

                            {/* Evidence photo thumbnail */}
                            {d.evidence_photo_url && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <a href={d.evidence_photo_url} target="_blank" rel="noopener noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={d.evidence_photo_url}
                                            alt="Evidência de entrega"
                                            style={{
                                                width: 80, height: 80,
                                                objectFit: "cover",
                                                borderRadius: "var(--radius)",
                                                border: "1px solid var(--color-border)",
                                                cursor: "pointer",
                                            }}
                                        />
                                    </a>
                                    <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                        📸 Foto de evidência anexada
                                    </p>
                                </div>
                            )}

                            {/* Upload progress */}
                            {uploadingFor === d.id && (
                                <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "var(--color-primary)", width: 14, height: 14, flexShrink: 0 }} />
                                    {uploadProgress}
                                </div>
                            )}

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

                                {/* Volunteer: mark delivered + upload evidence */}
                                {d.status === "in_transit" && d.logistics_volunteer_id === userId && (
                                    <>
                                        <button
                                            className="expand-btn"
                                            onClick={() => triggerEvidenceUpload(d.id)}
                                            disabled={uploadingFor === d.id}
                                            title={`Enviar foto de evidência (máx. ${MAX_PHOTO_MB}MB)`}
                                        >
                                            📸 {d.evidence_photo_url ? "Atualizar foto" : "Adicionar foto"}
                                        </button>
                                        <button
                                            className="expand-btn"
                                            onClick={() => handleUpdateStatus(d.id, "delivered")}
                                            disabled={uploadingFor === d.id}
                                        >
                                            📦 Entreguei
                                        </button>
                                    </>
                                )}

                                {/* Allow evidence upload also on delivered status (before validation) */}
                                {d.status === "delivered" && d.logistics_volunteer_id === userId && !canManage && (
                                    <button
                                        className="expand-btn"
                                        onClick={() => triggerEvidenceUpload(d.id)}
                                        disabled={uploadingFor === d.id}
                                    >
                                        📸 {d.evidence_photo_url ? "Atualizar foto" : "Adicionar foto"}
                                    </button>
                                )}

                                {/* Manager: validate */}
                                {d.status === "delivered" && canManage && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(d.id, "validated")}>
                                        ✅ Validar entrega
                                    </button>
                                )}

                                {/* Manager: mark as distributed to beneficiary */}
                                {d.status === "validated" && canManage && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(d.id, "distributed")}>
                                        🤲 Distribuída ao beneficiário
                                    </button>
                                )}

                                {/* Manager: cancel */}
                                {canManage && !["validated", "distributed", "cancelled"].includes(d.status) && (
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
