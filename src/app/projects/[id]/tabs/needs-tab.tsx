"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Need {
    id: string;
    title: string;
    description: string | null;
    category: string;
    quantity_needed: number;
    quantity_received: number;
    quantity_remaining: number;
    quantity_committed: number;
    quantity_available: number;
    unit: string;
    priority: string;
    due_date: string | null;
    status: string;
    hub_id: string | null;
    hubs: { name: string } | null;
}

interface Hub {
    id: string;
    name: string;
}

interface NeedsTabProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

const CATEGORIES = [
    { value: "alimentos", label: "Alimentos" },
    { value: "roupas", label: "Roupas" },
    { value: "higiene", label: "Higiene" },
    { value: "medicamentos", label: "Medicamentos" },
    { value: "moveis", label: "Moveis" },
    { value: "agua", label: "Agua" },
    { value: "colchoes", label: "Colchoes" },
    { value: "limpeza", label: "Limpeza" },
    { value: "outros", label: "Outros" },
];

const PRIORITIES: Record<string, { label: string; color: string }> = {
    high: { label: "Alta", color: "#dc2626" },
    medium: { label: "Media", color: "#d97706" },
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
};

const selectStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "inherit",
    fontSize: "0.9375rem",
    color: "var(--color-text)",
};

export default function NeedsTab({ projectId, canManage, userId }: NeedsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [needs, setNeeds] = useState<Need[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterHub, setFilterHub] = useState<string>("all");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const [needsRes, hubsRes] = await Promise.all([
            supabase
                .from("needs")
                .select("id, title, description, category, quantity_needed, quantity_received, quantity_remaining, quantity_committed, quantity_available, unit, priority, due_date, status, hub_id, hubs(name)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false }),
            supabase
                .from("hubs")
                .select("id, name")
                .eq("project_id", projectId)
                .eq("status", "active")
                .order("name"),
        ]);

        if (needsRes.error) {
            setError(`Erro ao carregar demandas: ${needsRes.error.message}`);
            console.error("[NEEDS FETCH ERROR]", needsRes.error);
        } else {
            setNeeds((needsRes.data as unknown as Need[]) ?? []);
        }

        setHubs(hubsRes.data ?? []);
        setLoading(false);
    }, [projectId, supabase]);

    useEffect(() => {
        async function loadData() {
            await fetchData();
        }

        void loadData();
    }, [fetchData]);

    useEffect(() => {
        if (success) {
            const timeout = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timeout);
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
            created_by: userId,
        };

        if (editingId) {
            const updatePayload = {
                title: payload.title,
                description: payload.description,
                category: payload.category,
                quantity_needed: payload.quantity_needed,
                unit: payload.unit,
                priority: payload.priority,
                due_date: payload.due_date,
                hub_id: payload.hub_id,
            };
            const { error: err } = await supabase
                .from("needs")
                .update(updatePayload)
                .eq("id", editingId);

            if (err) {
                setError(`Erro ao atualizar: ${err.message}`);
                console.error("[NEED UPDATE ERROR]", err);
            } else {
                setSuccess("Demanda atualizada.");
                resetForm();
                await fetchData();
            }
        } else {
            const { error: err } = await supabase.from("needs").insert(payload);

            if (err) {
                setError(`Erro ao criar demanda: ${err.message}`);
                console.error("[NEED CREATE ERROR]", err);
            } else {
                setSuccess("Demanda criada com sucesso.");
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
        });
        setShowForm(true);
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
            setSuccess("Demanda excluida.");
            await fetchData();
        }
    }

    const filtered = needs.filter((need) => {
        if (filterStatus !== "all" && need.status !== filterStatus) return false;
        if (filterHub !== "all" && need.hub_id !== filterHub) return false;
        if (filterCategory !== "all" && need.category !== filterCategory) return false;
        return true;
    });

    function getProgress(need: Need) {
        if (need.quantity_needed <= 0) return 0;
        return Math.min((need.quantity_received / need.quantity_needed) * 100, 100);
    }

    function getCommitmentProgress(need: Need) {
        if (need.quantity_needed <= 0) return 0;
        return Math.min((need.quantity_committed / need.quantity_needed) * 100, 100);
    }

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Demandas</h2>
                    {canManage && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                                if (showForm && !editingId) {
                                    resetForm();
                                } else {
                                    setEditingId(null);
                                    setForm(EMPTY_FORM);
                                    setShowForm(true);
                                }
                            }}
                        >
                            {showForm ? "Cancelar" : "+ Nova demanda"}
                        </button>
                    )}
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "0.375rem" }}>
                    As demandas sao a base do fluxo operacional: o gestor define a necessidade e as doacoes passam a atender esse cadastro.
                </p>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Cada demanda mostra a quantidade original, o total validado e o saldo restante para a operacao.
                </p>

                {showForm && canManage && (
                    <form
                        onSubmit={handleSubmit}
                        style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}
                    >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Titulo *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Cestas basicas para 50 familias"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    required
                                    minLength={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Categoria *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    style={selectStyle}
                                >
                                    {CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hub destino</label>
                                <select
                                    value={form.hub_id}
                                    onChange={(e) => setForm({ ...form, hub_id: e.target.value })}
                                    style={selectStyle}
                                >
                                    <option value="">Sem hub definido</option>
                                    {hubs.map((hub) => (
                                        <option key={hub.id} value={hub.id}>
                                            {hub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantidade *</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="50"
                                    value={form.quantity_needed}
                                    onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Unidade *</label>
                                <input
                                    type="text"
                                    placeholder="unidades, kg, litros, caixas"
                                    value={form.unit}
                                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Prioridade</label>
                                <select
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                    style={selectStyle}
                                >
                                    <option value="low">Baixa</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Prazo</label>
                                <input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Descricao</label>
                                <input
                                    type="text"
                                    placeholder="Detalhes adicionais sobre a necessidade"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                {saving ? <span className="spinner" /> : editingId ? "Salvar" : "Criar demanda"}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
                                    Cancelar edicao
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>

            {needs.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
                        <option value="all">Todos os status</option>
                        {Object.entries(STATUSES).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value.label}
                            </option>
                        ))}
                    </select>
                    <select value={filterHub} onChange={(e) => setFilterHub(e.target.value)} style={selectStyle}>
                        <option value="all">Todos os hubs</option>
                        {hubs.map((hub) => (
                            <option key={hub.id} value={hub.id}>
                                {hub.name}
                            </option>
                        ))}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={selectStyle}>
                        <option value="all">Todas as categorias</option>
                        {CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                    {(filterStatus !== "all" || filterHub !== "all" || filterCategory !== "all") && (
                        <button
                            onClick={() => {
                                setFilterStatus("all");
                                setFilterHub("all");
                                setFilterCategory("all");
                            }}
                            style={{
                                padding: "0.375rem 0.75rem",
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--color-border)",
                                fontSize: "0.75rem",
                                fontFamily: "inherit",
                                background: "transparent",
                                color: "var(--color-text-muted)",
                                cursor: "pointer",
                            }}
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>
            )}

            {needs.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Demandas</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma demanda cadastrada.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        O gestor precisa abrir uma demanda para que as doacoes do projeto comecem a ser registradas.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        As demandas representam necessidades reais do projeto e passam a guiar o fluxo de doacoes e validacoes.
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
                    {filtered.map((need) => (
                        <div key={need.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{need.title}</h3>
                                        <span
                                            style={{
                                                fontSize: "0.6875rem",
                                                fontWeight: 600,
                                                padding: "0.125rem 0.5rem",
                                                borderRadius: 999,
                                                background: `${PRIORITIES[need.priority]?.color}18`,
                                                color: PRIORITIES[need.priority]?.color,
                                            }}
                                        >
                                            {PRIORITIES[need.priority]?.label}
                                        </span>
                                    </div>
                                    {need.description && (
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
                                            {need.description}
                                        </p>
                                    )}
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        <span>{CATEGORIES.find((category) => category.value === need.category)?.label ?? need.category}</span>
                                        <span>Original: {need.quantity_needed} {need.unit}</span>
                                        <span>Comprometido: {need.quantity_committed} {need.unit}</span>
                                        <span>Disponivel: {need.quantity_available} {need.unit}</span>
                                        <span>Recebido: {need.quantity_received} {need.unit}</span>
                                        <span>Restante: {need.quantity_remaining} {need.unit}</span>
                                        {need.hubs && <span>Hub: {need.hubs.name}</span>}
                                        {need.due_date && (
                                            <span>Prazo: {new Date(`${need.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                                        )}
                                    </div>
                                    <div style={{ marginTop: "0.625rem" }}>
                                        <div
                                            style={{
                                                height: 8,
                                                borderRadius: 999,
                                                background: "var(--color-surface-hover)",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${getCommitmentProgress(need)}%`,
                                                    height: "100%",
                                                    background: "var(--color-primary)",
                                                    transition: "width var(--transition)",
                                                }}
                                            />
                                        </div>
                                        <p style={{ marginTop: "0.375rem", fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                                            {getCommitmentProgress(need).toFixed(0)}% comprometido
                                        </p>
                                    </div>
                                    <div style={{ marginTop: "0.5rem" }}>
                                        <div
                                            style={{
                                                height: 8,
                                                borderRadius: 999,
                                                background: "var(--color-surface-hover)",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${getProgress(need)}%`,
                                                    height: "100%",
                                                    background: need.quantity_remaining === 0 ? "#059669" : "#d97706",
                                                    transition: "width var(--transition)",
                                                }}
                                            />
                                        </div>
                                        <p style={{ marginTop: "0.375rem", fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                                            {getProgress(need).toFixed(0)}% recebido (validado)
                                        </p>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: "0.6875rem",
                                        fontWeight: 600,
                                        padding: "0.25rem 0.625rem",
                                        borderRadius: 999,
                                        background: `${STATUSES[need.status]?.color}18`,
                                        color: STATUSES[need.status]?.color,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                    }}
                                >
                                    {STATUSES[need.status]?.label}
                                </span>
                            </div>

                            {canManage && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    <button className="expand-btn" onClick={() => startEdit(need)}>
                                        Editar
                                    </button>
                                    {need.status !== "cancelled" && need.status !== "fulfilled" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(need.id, "cancelled")}>
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        className="expand-btn"
                                        style={{ color: "var(--color-danger)" }}
                                        onClick={() => handleDelete(need.id)}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
