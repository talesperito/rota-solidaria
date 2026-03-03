"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Incident {
    id: string;
    type: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    gps_lat: number | null;
    gps_lng: number | null;
    related_donation_id: string | null;
    related_delivery_id: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
    reporter: { full_name: string } | null;
    resolver: { full_name: string } | null;
}

interface IncidentsTabProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

const TYPES = [
    { value: "risco", label: "⚠️ Risco" },
    { value: "bloqueio_logistico", label: "🚧 Bloqueio logístico" },
    { value: "falta_critica", label: "🔴 Falta crítica" },
    { value: "emergencia", label: "🚨 Emergência" },
    { value: "dano_material", label: "💥 Dano material" },
    { value: "outro", label: "📝 Outro" },
];

const SEVERITY: Record<string, { label: string; color: string }> = {
    critical: { label: "Crítica", color: "#dc2626" },
    high: { label: "Alta", color: "#ea580c" },
    medium: { label: "Média", color: "#d97706" },
    low: { label: "Baixa", color: "#059669" },
};

const STATUS: Record<string, { label: string; color: string }> = {
    open: { label: "Aberto", color: "#dc2626" },
    investigating: { label: "Investigando", color: "#d97706" },
    resolved: { label: "Resolvido", color: "#059669" },
    dismissed: { label: "Descartado", color: "#6b7280" },
};

const selectStyle = {
    width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)",
    border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
    fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)",
};

const EMPTY_FORM = {
    type: "risco",
    title: "",
    description: "",
    severity: "medium",
    related_donation_id: "",
    related_delivery_id: "",
};

export default function IncidentsTab({ projectId, canManage, userId }: IncidentsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [geoLat, setGeoLat] = useState<number | null>(null);
    const [geoLng, setGeoLng] = useState<number | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");

    const fetchIncidents = useCallback(async () => {

        const { data, error: err } = await supabase
            .from("incidents")
            .select(`
        id, type, title, description, severity, status,
        gps_lat, gps_lng, related_donation_id, related_delivery_id,
        resolved_at, resolved_by, created_at,
        reporter:user_profiles!incidents_reported_by_fkey(full_name),
        resolver:user_profiles!incidents_resolved_by_fkey(full_name)
      `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (err) {
            setError(`Erro ao carregar incidentes: ${err.message}`);
            console.error("[INCIDENTS FETCH ERROR]", err);
        } else {
            setIncidents((data as unknown as Incident[]) ?? []);
        }
        setLoading(false);
    }, [projectId, supabase]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    function requestGeo() {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); setGeoLoading(false); },
            () => { setGeoLoading(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const { error: err } = await supabase.from("incidents").insert({
            project_id: projectId,
            reported_by: userId,
            type: form.type,
            title: form.title.trim(),
            description: form.description.trim() || null,
            severity: form.severity,
            gps_lat: geoLat,
            gps_lng: geoLng,
            related_donation_id: form.related_donation_id || null,
            related_delivery_id: form.related_delivery_id || null,
        });

        if (err) {
            setError(`Erro ao reportar incidente: ${err.message}`);
            console.error("[INCIDENT CREATE ERROR]", err);
        } else {
            setSuccess("Incidente reportado. Um gestor irá analisar.");
            setForm(EMPTY_FORM);
            setGeoLat(null);
            setGeoLng(null);
            setShowForm(false);
            await fetchIncidents();
        }
        setSaving(false);
    }

    async function handleStatusChange(id: string, newStatus: string) {
        setError(null);
        const update: Record<string, unknown> = { status: newStatus };
        if (newStatus === "resolved" || newStatus === "dismissed") {
            update.resolved_at = new Date().toISOString();
            update.resolved_by = userId;
        }
        const { error: err } = await supabase.from("incidents").update(update).eq("id", id);
        if (err) {
            setError(`Erro ao atualizar status: ${err.message}`);
            console.error("[INCIDENT STATUS ERROR]", err);
        } else {
            setSuccess(`Status: ${STATUS[newStatus]?.label}.`);
            await fetchIncidents();
        }
    }

    const filtered = incidents.filter((i) => {
        if (filterStatus !== "all" && i.status !== filterStatus) return false;
        if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
        return true;
    });

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Incidentes</h2>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "Cancelar" : "🚨 Reportar"}
                    </button>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Reporte riscos, bloqueios logísticos, faltas críticas ou emergências para ação dos gestores.
                </p>

                {/* Create Form */}
                {showForm && (
                    <form onSubmit={handleCreate} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group">
                                <label>Tipo *</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Gravidade *</label>
                                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={selectStyle}>
                                    <option value="low">🟢 Baixa</option>
                                    <option value="medium">🟡 Média</option>
                                    <option value="high">🟠 Alta</option>
                                    <option value="critical">🔴 Crítica</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Título *</label>
                                <input type="text" placeholder="Ex: Estrada bloqueada na BR-120" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Descrição</label>
                                <input type="text" placeholder="Detalhes sobre o incidente" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>

                        {/* Geolocation */}
                        <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius)", fontSize: "0.8125rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                <div>
                                    <strong>📍 Localização do incidente</strong>
                                    <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                                        {geoLat && geoLng ? `${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}` : "Não informada"}
                                    </span>
                                </div>
                                <button type="button" className="expand-btn" onClick={requestGeo} disabled={geoLoading} style={{ marginTop: 0 }}>
                                    {geoLoading ? "Obtendo..." : geoLat ? "✓ Atualizar" : "Usar minha localização"}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: "0.75rem", width: "auto" }}>
                            {saving ? <span className="spinner" /> : "Reportar Incidente"}
                        </button>
                    </form>
                )}
            </div>

            {/* Filters */}
            {incidents.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todos os status</option>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todas gravidades</option>
                        {Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {(filterStatus !== "all" || filterSeverity !== "all") && (
                        <button onClick={() => { setFilterStatus("all"); setFilterSeverity("all"); }} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                            ✕ Limpar
                        </button>
                    )}
                </div>
            )}

            {/* Incidents List */}
            {incidents.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✅</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhum incidente reportado.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Reporte riscos, bloqueios ou emergências que afetem a operação do projeto.
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhum incidente com os filtros selecionados.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {filtered.map((inc) => (
                        <div key={inc.id} className="admin-section" style={{ marginBottom: 0, borderLeft: `3px solid ${SEVERITY[inc.severity]?.color ?? "#ccc"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{inc.title}</h3>
                                        <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: 999, background: `${SEVERITY[inc.severity]?.color}18`, color: SEVERITY[inc.severity]?.color }}>
                                            {SEVERITY[inc.severity]?.label}
                                        </span>
                                    </div>
                                    {inc.description && (
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>{inc.description}</p>
                                    )}
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        <span>{TYPES.find(t => t.value === inc.type)?.label ?? inc.type}</span>
                                        {inc.reporter && <span>👤 {inc.reporter.full_name}</span>}
                                        <span>📅 {new Date(inc.created_at).toLocaleDateString("pt-BR")}</span>
                                        {inc.gps_lat && inc.gps_lng && <span>📍 {inc.gps_lat.toFixed(4)}, {inc.gps_lng.toFixed(4)}</span>}
                                        {inc.resolved_at && inc.resolver && (
                                            <span>✅ Resolvido por {inc.resolver.full_name} em {new Date(inc.resolved_at).toLocaleDateString("pt-BR")}</span>
                                        )}
                                    </div>
                                </div>
                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: 999, background: `${STATUS[inc.status]?.color}18`, color: STATUS[inc.status]?.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {STATUS[inc.status]?.label}
                                </span>
                            </div>

                            {/* Manager actions */}
                            {canManage && !["resolved", "dismissed"].includes(inc.status) && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    {inc.status === "open" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(inc.id, "investigating")}>🔍 Investigar</button>
                                    )}
                                    <button className="expand-btn" onClick={() => handleStatusChange(inc.id, "resolved")}>✅ Resolvido</button>
                                    <button className="expand-btn" style={{ color: "var(--color-text-muted)" }} onClick={() => handleStatusChange(inc.id, "dismissed")}>✕ Descartar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
