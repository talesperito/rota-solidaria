"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Hub {
    id: string;
    name: string;
    address: string;
    gps_lat: number | null;
    gps_lng: number | null;
    capacity: string | null;
    opening_hours: string | null;
    status: string;
}

interface HubsTabProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

export default function HubsTab({ projectId, canManage, userId }: HubsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Create form state
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: "",
        address: "",
        gps_lat: "",
        gps_lng: "",
        capacity: "",
        opening_hours: "",
    });
    const [saving, setSaving] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(form);

    const fetchHubs = useCallback(async () => {

        const { data, error: err } = await supabase
            .from("hubs")
            .select("id, name, address, gps_lat, gps_lng, capacity, opening_hours, status")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (err) {
            setError(`Erro ao carregar hubs: ${err.message}`);
            console.error("[HUBS FETCH ERROR]", err);
        } else {
            setHubs(data ?? []);
        }
        setLoading(false);
    }, [projectId, supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchHubs();
    }, [fetchHubs]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const { error: err } = await supabase.from("hubs").insert({
            project_id: projectId,
            name: form.name.trim(),
            address: form.address.trim(),
            gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
            gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
            capacity: form.capacity.trim() || null,
            opening_hours: form.opening_hours.trim() || null,
            created_by: userId,
        });

        if (err) {
            setError(`Erro ao criar hub: ${err.message}`);
            console.error("[HUB CREATE ERROR]", err);
        } else {
            setSuccess("Hub criado com sucesso!");
            setForm({ name: "", address: "", gps_lat: "", gps_lng: "", capacity: "", opening_hours: "" });
            setShowForm(false);
            await fetchHubs();
        }
        setSaving(false);
    }

    async function handleUpdate(hubId: string) {
        setError(null);
        const { error: err } = await supabase
            .from("hubs")
            .update({
                name: editForm.name.trim(),
                address: editForm.address.trim(),
                gps_lat: editForm.gps_lat ? parseFloat(editForm.gps_lat) : null,
                gps_lng: editForm.gps_lng ? parseFloat(editForm.gps_lng) : null,
                capacity: editForm.capacity.trim() || null,
                opening_hours: editForm.opening_hours.trim() || null,
            })
            .eq("id", hubId);

        if (err) {
            setError(`Erro ao atualizar: ${err.message}`);
            console.error("[HUB UPDATE ERROR]", err);
        } else {
            setSuccess("Hub atualizado!");
            setEditingId(null);
            await fetchHubs();
        }
    }

    async function handleToggleStatus(hub: Hub) {
        setError(null);
        const newStatus = hub.status === "active" ? "inactive" : "active";
        const { error: err } = await supabase
            .from("hubs")
            .update({ status: newStatus })
            .eq("id", hub.id);

        if (err) {
            setError(`Erro ao mudar status: ${err.message}`);
        } else {
            setSuccess(`Hub ${newStatus === "active" ? "ativado" : "desativado"}.`);
            await fetchHubs();
        }
    }

    async function handleDelete(hubId: string) {
        if (!confirm("Tem certeza que deseja excluir este hub?")) return;
        setError(null);
        const { error: err } = await supabase.from("hubs").delete().eq("id", hubId);
        if (err) {
            setError(`Erro ao excluir: ${err.message}`);
        } else {
            setSuccess("Hub excluído.");
            await fetchHubs();
        }
    }

    function startEdit(hub: Hub) {
        setEditingId(hub.id);
        setEditForm({
            name: hub.name,
            address: hub.address,
            gps_lat: hub.gps_lat?.toString() ?? "",
            gps_lng: hub.gps_lng?.toString() ?? "",
            capacity: hub.capacity ?? "",
            opening_hours: hub.opening_hours ?? "",
        });
    }

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

            {/* Create Hub Button + Form */}
            {canManage && (
                <div className="admin-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                            Pontos de Entrega
                        </h2>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? "Cancelar" : "+ Novo Hub"}
                        </button>
                    </div>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem", marginBottom: showForm ? "1rem" : 0 }}>
                        Locais físicos onde doações são recebidas, armazenadas e distribuídas — como escolas, igrejas, centros comunitários ou galpões.
                    </p>

                    {showForm && (
                        <form onSubmit={handleCreate} style={{ marginTop: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className="form-group">
                                    <label>Nome *</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Centro Comunitário"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Endereço *</label>
                                    <input
                                        type="text"
                                        placeholder="Rua, número, bairro"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Latitude (GPS)</label>
                                    <input
                                        type="text"
                                        placeholder="-20.761"
                                        value={form.gps_lat}
                                        onChange={(e) => setForm({ ...form, gps_lat: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Longitude (GPS)</label>
                                    <input
                                        type="text"
                                        placeholder="-42.882"
                                        value={form.gps_lng}
                                        onChange={(e) => setForm({ ...form, gps_lng: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Capacidade</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 200 cestas"
                                        value={form.capacity}
                                        onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Horário de funcionamento</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 8h-17h seg-sex"
                                        value={form.opening_hours}
                                        onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "0.75rem", width: "auto" }}>
                                {saving ? <span className="spinner" /> : "Criar Hub"}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Hubs List */}
            {!canManage && (
                <div style={{ marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Pontos de Entrega
                    </h2>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                        Locais físicos onde doações são recebidas, armazenadas e distribuídas.
                    </p>
                </div>
            )}

            {hubs.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📍</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhum ponto de entrega cadastrado.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Hubs são locais como escolas, igrejas ou centros comunitários que servem de base para receber e distribuir doações.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {hubs.map((hub) => (
                        <div key={hub.id} className="admin-section" style={{ marginBottom: 0 }}>
                            {editingId === hub.id ? (
                                /* Edit Mode */
                                <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                        <div className="form-group">
                                            <label>Nome</label>
                                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Endereço</label>
                                            <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Latitude</label>
                                            <input value={editForm.gps_lat} onChange={(e) => setEditForm({ ...editForm, gps_lat: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Longitude</label>
                                            <input value={editForm.gps_lng} onChange={(e) => setEditForm({ ...editForm, gps_lng: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Capacidade</label>
                                            <input value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Horário</label>
                                            <input value={editForm.opening_hours} onChange={(e) => setEditForm({ ...editForm, opening_hours: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(hub.id)}>Salvar</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                                    </div>
                                </div>
                            ) : (
                                /* Display Mode */
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                                                {hub.name}
                                            </h3>
                                            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                                                📍 {hub.address}
                                            </p>
                                        </div>
                                        <span className={`project-status ${hub.status === "active" ? "status-active" : "status-inactive"}`}>
                                            <span className="status-dot" />
                                            {hub.status === "active" ? "Ativo" : "Inativo"}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                                        {hub.gps_lat && hub.gps_lng && (
                                            <span>🌐 {hub.gps_lat.toFixed(4)}, {hub.gps_lng.toFixed(4)}</span>
                                        )}
                                        {hub.capacity && <span>📦 {hub.capacity}</span>}
                                        {hub.opening_hours && <span>🕐 {hub.opening_hours}</span>}
                                    </div>

                                    {/* Manager Actions */}
                                    {canManage && (
                                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                                            <button className="expand-btn" onClick={() => startEdit(hub)}>✏️ Editar</button>
                                            <button className="expand-btn" onClick={() => handleToggleStatus(hub)}>
                                                {hub.status === "active" ? "⏸ Desativar" : "▶ Ativar"}
                                            </button>
                                            <button className="expand-btn" style={{ color: "var(--color-danger)" }} onClick={() => handleDelete(hub.id)}>
                                                🗑 Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
