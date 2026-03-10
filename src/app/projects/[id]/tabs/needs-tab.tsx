"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Need {
    id: string;
    title: string;
    description: string | null;
    category: string;
    quantity_needed: number;
    unit: string;
    priority: string;
    due_date: string | null;
    status: string;
    hub_id: string | null;
    dest_lat: number | null;
    dest_lng: number | null;
    hubs: { name: string } | null;
}

interface Hub {
    id: string;
    name: string;
}

interface DonationSummary {
    need_id: string | null;
    quantity: number;
    status: string;
}

interface NeedsTabProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

const CATEGORIES = [
    { value: "alimentos", label: "🍚 Alimentos" },
    { value: "roupas", label: "👕 Roupas" },
    { value: "higiene", label: "🧴 Higiene" },
    { value: "medicamentos", label: "💊 Medicamentos" },
    { value: "moveis", label: "🪑 Móveis" },
    { value: "agua", label: "💧 Água" },
    { value: "colchoes", label: "🛏 Colchões" },
    { value: "limpeza", label: "🧹 Limpeza" },
    { value: "outros", label: "📦 Outros" },
];

const PRIORITIES: Record<string, { label: string; color: string }> = {
    high: { label: "Alta", color: "#dc2626" },
    medium: { label: "Média", color: "#d97706" },
    low: { label: "Baixa", color: "#059669" },
};

const STATUSES: Record<string, { label: string; color: string }> = {
    open: { label: "Aberta", color: "#3b82f6" },
    in_progress: { label: "Em andamento", color: "#d97706" },
    fulfilled: { label: "Atendida", color: "#059669" },
    cancelled: { label: "Cancelada", color: "#6b7280" },
};

const EMPTY_FORM = {
    title: "",
    description: "",
    category: "alimentos",
    quantity_needed: "",
    unit: "unidades",
    priority: "medium",
    due_date: "",
    hub_id: "",
    dest_lat: "",
    dest_lng: "",
};

export default function NeedsTab({ projectId, canManage, userId }: NeedsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [needs, setNeeds] = useState<Need[]>([]);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [deliveredByNeed, setDeliveredByNeed] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterHub, setFilterHub] = useState<string>("all");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    // Form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {

        const [needsRes, hubsRes, donationsRes] = await Promise.all([
            supabase
                .from("needs")
                .select("id, title, description, category, quantity_needed, unit, priority, due_date, status, hub_id, dest_lat, dest_lng, hubs(name)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false }),
            supabase
                .from("hubs")
                .select("id, name")
                .eq("project_id", projectId)
                .eq("status", "active")
                .order("name"),
            supabase
                .from("donations")
                .select("need_id, quantity, status")
                .eq("project_id", projectId)
                .not("need_id", "is", null),
        ]);

        if (needsRes.error) {
            setError(`Erro ao carregar demandas: ${needsRes.error.message}`);
            console.error("[NEEDS FETCH ERROR]", needsRes.error);
        } else {
            setNeeds((needsRes.data as unknown as Need[]) ?? []);
        }
        setHubs(hubsRes.data ?? []);
        if (donationsRes.error) {
            setDeliveredByNeed({});
            console.error("[DONATIONS SUMMARY ERROR]", donationsRes.error);
        } else {
            const deliveredMap: Record<string, number> = {};
            for (const row of (donationsRes.data as DonationSummary[]) ?? []) {
                if (!row.need_id || row.status !== "delivered") continue;
                deliveredMap[row.need_id] = (deliveredMap[row.need_id] ?? 0) + row.quantity;
            }
            setDeliveredByNeed(deliveredMap);
        }
        setLoading(false);
    }, [projectId, supabase]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            project_id: projectId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category,
            quantity_needed: parseInt(form.quantity_needed),
            unit: form.unit.trim(),
            priority: form.priority,
            due_date: form.due_date || null,
            hub_id: form.hub_id || null,
            dest_lat: form.dest_lat ? parseFloat(form.dest_lat) : null,
            dest_lng: form.dest_lng ? parseFloat(form.dest_lng) : null,
            created_by: userId,
        };

        if (editingId) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { project_id, created_by, ...updatePayload } = payload;
            const { error: err } = await supabase
                .from("needs")
                .update(updatePayload)
                .eq("id", editingId);

            if (err) {
                setError(`Erro ao atualizar: ${err.message}`);
                console.error("[NEED UPDATE ERROR]", err);
            } else {
                setSuccess("Demanda atualizada!");
                resetForm();
                await fetchData();
            }
        } else {
            const { error: err } = await supabase.from("needs").insert(payload);

            if (err) {
                setError(`Erro ao criar demanda: ${err.message}`);
                console.error("[NEED CREATE ERROR]", err);
            } else {
                setSuccess("Demanda criada com sucesso!");
                resetForm();
                await fetchData();
            }
        }
        setSaving(false);
    }

    function resetForm() {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setEditingId(null);
    }

    function startEdit(need: Need) {
        setEditingId(need.id);
        setForm({
            title: need.title,
            description: need.description ?? "",
            category: need.category,
            quantity_needed: need.quantity_needed.toString(),
            unit: need.unit,
            priority: need.priority,
            due_date: need.due_date ?? "",
            hub_id: need.hub_id ?? "",
            dest_lat: need.dest_lat?.toString() ?? "",
            dest_lng: need.dest_lng?.toString() ?? "",
        });
        setGeoError(null);
        setShowForm(true);
    }

    function requestGeolocation() {
        if (!navigator.geolocation) {
            setGeoError("Geolocalização não suportada pelo navegador.");
            return;
        }
        setGeoLoading(true);
        setGeoError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm((prev) => ({
                    ...prev,
                    dest_lat: pos.coords.latitude.toString(),
                    dest_lng: pos.coords.longitude.toString(),
                }));
                setGeoLoading(false);
            },
            (err) => {
                setGeoError(
                    err.code === 1
                        ? "Permissão de localização negada."
                        : "Não foi possível obter a localização."
                );
                setGeoLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    async function handleStatusChange(needId: string, newStatus: string) {
        setError(null);
        const { error: err } = await supabase
            .from("needs")
            .update({ status: newStatus })
            .eq("id", needId);

        if (err) {
            setError(`Erro ao mudar status: ${err.message}`);
        } else {
            setSuccess(`Status alterado para "${STATUSES[newStatus]?.label}".`);
            await fetchData();
        }
    }

    async function handleDelete(needId: string) {
        if (!confirm("Tem certeza que deseja excluir esta demanda?")) return;
        setError(null);
        const { error: err } = await supabase.from("needs").delete().eq("id", needId);
        if (err) {
            setError(`Erro ao excluir: ${err.message}`);
        } else {
            setSuccess("Demanda excluída.");
            await fetchData();
        }
    }

    // Apply filters
    const filtered = needs.filter((n) => {
        if (filterStatus !== "all" && n.status !== filterStatus) return false;
        if (filterHub !== "all" && n.hub_id !== filterHub) return false;
        if (filterCategory !== "all" && n.category !== filterCategory) return false;
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

            {/* Header + Create */}
            <div className="admin-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Demandas</h2>
                    {canManage && (
                        <button className="btn btn-primary btn-sm" onClick={() => { if (showForm && !editingId) resetForm(); else { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); } }}>
                            {showForm ? "Cancelar" : "+ Nova Demanda"}
                        </button>
                    )}
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Necessidades do projeto — itens, materiais e serviços que precisam ser atendidos.
                </p>

                {/* Create/Edit Form */}
                {showForm && canManage && (
                    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Título *</label>
                                <input type="text" placeholder="Ex: Cestas básicas para 50 famílias" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
                            </div>
                            <div className="form-group">
                                <label>Categoria *</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)" }}>
                                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hub destino</label>
                                <select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })} style={{ width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)" }}>
                                    <option value="">Sem hub definido</option>
                                    {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantidade *</label>
                                <input type="number" min="1" placeholder="50" value={form.quantity_needed} onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Unidade *</label>
                                <input type="text" placeholder="unidades, kg, litros, caixas" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Prioridade</label>
                                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)" }}>
                                    <option value="low">🟢 Baixa</option>
                                    <option value="medium">🟡 Média</option>
                                    <option value="high">🔴 Alta</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Prazo</label>
                                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Latitude do destino (GPS)</label>
                                <input type="text" placeholder="-20.761" value={form.dest_lat} onChange={(e) => setForm({ ...form, dest_lat: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Longitude do destino (GPS)</label>
                                <input type="text" placeholder="-42.882" value={form.dest_lng} onChange={(e) => setForm({ ...form, dest_lng: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius)", fontSize: "0.8125rem" }}>
                                    <div>
                                        <strong>📍 Usar minha localização atual</strong>
                                        {form.dest_lat && form.dest_lng && (
                                            <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                                                {parseFloat(form.dest_lat).toFixed(4)}, {parseFloat(form.dest_lng).toFixed(4)}
                                            </span>
                                        )}
                                    </div>
                                    <button type="button" className="expand-btn" onClick={requestGeolocation} disabled={geoLoading} style={{ marginTop: 0 }}>
                                        {geoLoading ? "Obtendo..." : form.dest_lat ? "✓ Atualizar" : "Capturar"}
                                    </button>
                                </div>
                                {geoError && <p style={{ color: "var(--color-danger)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{geoError}</p>}
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Descrição</label>
                                <input type="text" placeholder="Detalhes adicionais sobre a necessidade" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                {saving ? <span className="spinner" /> : editingId ? "Salvar" : "Criar Demanda"}
                            </button>
                            {editingId && <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>Cancelar edição</button>}
                        </div>
                    </form>
                )}
            </div>

            {/* Filters */}
            {needs.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todos os status</option>
                        {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterHub} onChange={(e) => setFilterHub(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todos os hubs</option>
                        {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todas categorias</option>
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {(filterStatus !== "all" || filterHub !== "all" || filterCategory !== "all") && (
                        <button onClick={() => { setFilterStatus("all"); setFilterHub("all"); setFilterCategory("all"); }} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                            ✕ Limpar filtros
                        </button>
                    )}
                </div>
            )}

            {/* Needs List */}
            {needs.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📋</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma demanda cadastrada.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Demandas são necessidades do projeto — itens, materiais ou serviços que precisam ser atendidos por doadores e voluntários.
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhuma demanda corresponde aos filtros selecionados.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {filtered.map((need) => {
                        const delivered = deliveredByNeed[need.id] ?? 0;
                        const remaining = Math.max(0, need.quantity_needed - delivered);
                        return (
                        <div key={need.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{need.title}</h3>
                                        <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: 999, background: `${PRIORITIES[need.priority]?.color}18`, color: PRIORITIES[need.priority]?.color }}>
                                            {PRIORITIES[need.priority]?.label}
                                        </span>
                                    </div>
                                    {need.description && (
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>{need.description}</p>
                                    )}
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
                                        <span>{CATEGORIES.find(c => c.value === need.category)?.label ?? need.category}</span>
                                        {need.hubs && <span>📍 {need.hubs.name}</span>}
                                        {need.dest_lat && need.dest_lng && <span>🌐 {need.dest_lat.toFixed(4)}, {need.dest_lng.toFixed(4)}</span>}
                                        {need.due_date && <span>📅 {new Date(need.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                                    </div>
                                    {/* Progress bar */}
                                    {need.status !== "cancelled" && (() => {
                                        const pct = need.quantity_needed > 0 ? Math.min(100, Math.round((delivered / need.quantity_needed) * 100)) : 0;
                                        const barColor = pct >= 100 ? "#059669" : pct > 0 ? "#d97706" : "var(--color-border)";
                                        return (
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                                                    <span>{delivered} {need.unit} entregues de {need.quantity_needed} {need.unit}</span>
                                                    <span style={{ fontWeight: 600, color: pct >= 100 ? "#059669" : "var(--color-text-muted)" }}>{pct}%</span>
                                                </div>
                                                <div style={{ height: 6, borderRadius: 999, background: "var(--color-border)", overflow: "hidden" }}>
                                                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999, transition: "width 0.4s ease" }} />
                                                </div>
                                                {remaining > 0 && need.status !== "fulfilled" && (
                                                    <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                                        Faltam {remaining} {need.unit}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: 999, background: `${STATUSES[need.status]?.color}18`, color: STATUSES[need.status]?.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {STATUSES[need.status]?.label}
                                </span>
                            </div>

                            {/* Manager actions */}
                            {canManage && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    <button className="expand-btn" onClick={() => startEdit(need)}>✏️ Editar</button>
                                    {need.status === "open" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(need.id, "in_progress")}>▶ Iniciar</button>
                                    )}
                                    {need.status === "in_progress" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(need.id, "fulfilled")}>✅ Atendida</button>
                                    )}
                                    {need.status !== "cancelled" && need.status !== "fulfilled" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(need.id, "cancelled")}>✕ Cancelar</button>
                                    )}
                                    <button className="expand-btn" style={{ color: "var(--color-danger)" }} onClick={() => handleDelete(need.id)}>🗑 Excluir</button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
