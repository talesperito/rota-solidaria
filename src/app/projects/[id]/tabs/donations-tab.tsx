"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Donation {
    id: string;
    category: string;
    item_description: string;
    quantity: number;
    unit: string;
    approx_weight: number | null;
    donor_lat: number | null;
    donor_lng: number | null;
    status: string;
    need_id: string | null;
    hub_id: string | null;
    donor_id: string;
    created_at: string;
    needs: { title: string } | null;
    hubs: { name: string } | null;
}

interface Hub { id: string; name: string; }
interface Need {
    id: string;
    title: string;
    category: string;
    quantity_needed: number;
    unit: string;
}

interface DonationsTabProps {
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

const STATUSES: Record<string, { label: string; color: string }> = {
    offered: { label: "Oferecida", color: "#3b82f6" },
    accepted: { label: "Aceita", color: "#8b5cf6" },
    in_transit: { label: "Em transporte", color: "#d97706" },
    delivered: { label: "Entregue", color: "#059669" },
    cancelled: { label: "Cancelada", color: "#6b7280" },
};

const EMPTY_FORM = {
    category: "alimentos",
    item_description: "",
    quantity: "",
    unit: "unidades",
    approx_weight: "",
    need_id: "",
    hub_id: "",
};

const selectStyle = {
    width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)",
    border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
    fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)",
};

function getCategoryLabel(category: string): string {
    return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default function DonationsTab({ projectId, canManage, userId }: DonationsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [needs, setNeeds] = useState<Need[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [geoLat, setGeoLat] = useState<number | null>(null);
    const [geoLng, setGeoLng] = useState<number | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const fetchData = useCallback(async () => {

        const [donRes, hubsRes, needsRes] = await Promise.all([
            supabase
                .from("donations")
                .select("id, category, item_description, quantity, unit, approx_weight, donor_lat, donor_lng, status, need_id, hub_id, donor_id, created_at, needs(title), hubs(name)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false }),
            supabase
                .from("hubs")
                .select("id, name")
                .eq("project_id", projectId)
                .eq("status", "active")
                .order("name"),
            supabase
                .from("needs")
                .select("id, title, category, quantity_needed, unit")
                .eq("project_id", projectId)
                .in("status", ["open", "in_progress"])
                .order("created_at", { ascending: false }),
        ]);

        if (donRes.error) {
            setError(`Erro ao carregar doações: ${donRes.error.message}`);
            console.error("[DONATIONS FETCH ERROR]", donRes.error);
        } else {
            setDonations((donRes.data as unknown as Donation[]) ?? []);
        }
        setHubs(hubsRes.data ?? []);
        setNeeds((needsRes.data as unknown as Need[]) ?? []);
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

    function requestGeolocation() {
        if (!navigator.geolocation) {
            setGeoError("Geolocalização não suportada pelo navegador.");
            return;
        }
        setGeoLoading(true);
        setGeoError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGeoLat(pos.coords.latitude);
                setGeoLng(pos.coords.longitude);
                setGeoLoading(false);
            },
            (err) => {
                setGeoError(
                    err.code === 1
                        ? "Permissão de localização negada. Verifique as configurações do navegador."
                        : "Não foi possível obter a localização."
                );
                setGeoLoading(false);
                console.error("[GEO ERROR]", err);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const quantity = parseInt(form.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            setError("Informe uma quantidade válida.");
            setSaving(false);
            return;
        }

        if (!form.need_id) {
            setError("Selecione uma demanda ativa para registrar a doação.");
            setSaving(false);
            return;
        }

        const selectedNeed = activeNeeds.find((n) => n.id === form.need_id);
        if (!selectedNeed) {
            setError("A demanda selecionada não está ativa.");
            setSaving(false);
            return;
        }

        if (quantity > selectedNeed.remaining) {
            setError(`Quantidade acima do restante da demanda. Restam ${selectedNeed.remaining} ${selectedNeed.unit}.`);
            setSaving(false);
            return;
        }

        if (form.category !== selectedNeed.category) {
            setError(`A categoria deve ser "${getCategoryLabel(selectedNeed.category)}" para esta demanda.`);
            setSaving(false);
            return;
        }

        const { error: err } = await supabase.from("donations").insert({
            project_id: projectId,
            donor_id: userId,
            category: form.category,
            item_description: form.item_description.trim(),
            quantity,
            unit: form.unit.trim(),
            approx_weight: form.approx_weight ? parseFloat(form.approx_weight) : null,
            need_id: form.need_id,
            hub_id: form.hub_id || null,
            donor_lat: geoLat,
            donor_lng: geoLng,
        });

        if (err) {
            const message = err.message.toLowerCase();
            if (message.includes("demanda") && message.includes("ativa")) {
                setError("Não foi possível registrar: a demanda não está mais ativa.");
            } else if (message.includes("restante") || message.includes("excede")) {
                setError("Não foi possível registrar: a quantidade excede o restante da demanda.");
            } else if (message.includes("categoria")) {
                setError("Não foi possível registrar: a categoria da doação deve ser igual à categoria da demanda.");
            } else {
                setError(`Erro ao registrar doação: ${err.message}`);
            }
            console.error("[DONATION CREATE ERROR]", err);
        } else {
            setSuccess("Doação registrada com sucesso! Obrigado pela solidariedade. 💙");
            setForm(EMPTY_FORM);
            setGeoLat(null);
            setGeoLng(null);
            setShowForm(false);
            await fetchData();
        }
        setSaving(false);
    }

    async function handleStatusChange(donationId: string, newStatus: string) {
        setError(null);
        const { error: err } = await supabase
            .from("donations")
            .update({ status: newStatus })
            .eq("id", donationId);

        if (err) {
            setError(`Erro ao mudar status: ${err.message}`);
            console.error("[DONATION STATUS ERROR]", err);
        } else {
            setSuccess(`Status alterado para "${STATUSES[newStatus]?.label}".`);
            await fetchData();
        }
    }

    const filtered = donations.filter((d) => {
        if (filterStatus !== "all" && d.status !== filterStatus) return false;
        return true;
    });
    const donatedByNeed = donations.reduce<Record<string, number>>((acc, d) => {
        if (!d.need_id || d.status === "cancelled") return acc;
        acc[d.need_id] = (acc[d.need_id] ?? 0) + d.quantity;
        return acc;
    }, {});
    const activeNeeds = needs
        .map((n) => ({
            ...n,
            donated: donatedByNeed[n.id] ?? 0,
            remaining: Math.max(0, n.quantity_needed - (donatedByNeed[n.id] ?? 0)),
        }))
        .filter((n) => n.remaining > 0);
    const hasActiveNeeds = activeNeeds.length > 0;
    const selectedNeed = activeNeeds.find((n) => n.id === form.need_id);
    const requestedQuantity = parseInt(form.quantity);
    const quantityExceedsNeed =
        Number.isFinite(requestedQuantity)
        && requestedQuantity > 0
        && !!selectedNeed
        && requestedQuantity > selectedNeed.remaining;

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
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Doações</h2>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowForm(!showForm)}
                        disabled={!hasActiveNeeds}
                    >
                        {showForm ? "Cancelar" : "🤲 Doar"}
                    </button>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Ofertas de itens para atender as demandas do projeto. Doações são rastreadas desde a oferta até a entrega.
                </p>
                {!hasActiveNeeds && (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                        Não há demandas ativas no momento. O gestor precisa abrir uma demanda para receber doações.
                    </p>
                )}

                {/* Donation Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group">
                                <label>Categoria *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    style={selectStyle}
                                    disabled={!!selectedNeed}
                                >
                                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                                {selectedNeed && (
                                    <small style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                                        Categoria definida pela demanda selecionada.
                                    </small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Demanda ativa *</label>
                                <select
                                    value={form.need_id}
                                    onChange={(e) => {
                                        const nextNeedId = e.target.value;
                                        const nextNeed = activeNeeds.find((n) => n.id === nextNeedId);
                                        setForm((prev) => ({
                                            ...prev,
                                            need_id: nextNeedId,
                                            category: nextNeed?.category ?? prev.category,
                                        }));
                                    }}
                                    style={selectStyle}
                                    required
                                >
                                    <option value="" disabled>Selecione uma demanda</option>
                                    {activeNeeds.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {n.title} ({getCategoryLabel(n.category)}) - Restam {n.remaining} {n.unit}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Descrição do item *</label>
                                <input type="text" placeholder="Ex: 20 cestas básicas com arroz, feijão, óleo" value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} required minLength={2} />
                            </div>
                            <div className="form-group">
                                <label>Quantidade *</label>
                                <input type="number" min="1" placeholder="20" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                {quantityExceedsNeed && (
                                    <small style={{ color: "var(--color-danger)", fontSize: "0.75rem" }}>
                                        Excede a demanda selecionada. Restam {selectedNeed?.remaining} {selectedNeed?.unit}.
                                    </small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Unidade *</label>
                                <input type="text" placeholder="unidades, kg, litros" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Peso aprox. (kg)</label>
                                <input type="number" step="0.1" min="0" placeholder="Opcional" value={form.approx_weight} onChange={(e) => setForm({ ...form, approx_weight: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Hub destino</label>
                                <select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })} style={selectStyle}>
                                    <option value="">A definir pelo gestor</option>
                                    {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Geolocation */}
                        <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius)", fontSize: "0.8125rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                <div>
                                    <strong>📍 Sua localização</strong>
                                    <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                                        {geoLat && geoLng
                                            ? `${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}`
                                            : "Não informada"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="expand-btn"
                                    onClick={requestGeolocation}
                                    disabled={geoLoading}
                                    style={{ marginTop: 0 }}
                                >
                                    {geoLoading ? "Obtendo..." : geoLat ? "✓ Atualizar" : "Usar minha localização"}
                                </button>
                            </div>
                            {geoError && <p style={{ color: "var(--color-danger)", marginTop: "0.375rem", fontSize: "0.75rem" }}>{geoError}</p>}
                            <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.6875rem" }}>
                                Ajuda voluntários logísticos a planejar a coleta. Opcional e com seu consentimento.
                            </p>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={saving || !hasActiveNeeds || !form.need_id || quantityExceedsNeed} style={{ marginTop: "0.75rem", width: "auto" }}>
                            {saving ? <span className="spinner" /> : "Registrar Doação"}
                        </button>
                    </form>
                )}
            </div>

            {/* Filters */}
            {donations.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "var(--color-surface)", color: "var(--color-text)" }}>
                        <option value="all">Todos os status</option>
                        {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {filterStatus !== "all" && (
                        <button onClick={() => setFilterStatus("all")} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--color-border)", fontSize: "0.75rem", fontFamily: "inherit", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                            ✕ Limpar
                        </button>
                    )}
                </div>
            )}

            {/* Donations List */}
            {donations.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📦</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma doação registrada.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Clique em &quot;Doar&quot; para oferecer itens que atendam as necessidades do projeto.
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhuma doação com o filtro selecionado.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {filtered.map((d) => (
                        <div key={d.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{d.item_description}</h3>
                                    </div>
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        <span>{CATEGORIES.find(c => c.value === d.category)?.label ?? d.category}</span>
                                        <span>📊 {d.quantity} {d.unit}</span>
                                        {d.approx_weight && <span>⚖️ ~{d.approx_weight}kg</span>}
                                        {d.needs && <span>🔗 {d.needs.title}</span>}
                                        {d.hubs && <span>📍 {d.hubs.name}</span>}
                                        {d.donor_lat && d.donor_lng && <span>🌐 {d.donor_lat.toFixed(3)}, {d.donor_lng.toFixed(3)}</span>}
                                        <span>📅 {new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: 999, background: `${STATUSES[d.status]?.color}18`, color: STATUSES[d.status]?.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {STATUSES[d.status]?.label}
                                </span>
                            </div>

                            {/* Manager status actions */}
                            {canManage && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    {d.status === "offered" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(d.id, "accepted")}>✓ Aceitar</button>
                                    )}
                                    {d.status === "accepted" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(d.id, "in_transit")}>🚛 Em transporte</button>
                                    )}
                                    {d.status === "in_transit" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(d.id, "delivered")}>✅ Entregue</button>
                                    )}
                                    {d.status !== "cancelled" && d.status !== "delivered" && (
                                        <button className="expand-btn" style={{ color: "var(--color-danger)" }} onClick={() => handleStatusChange(d.id, "cancelled")}>✕ Cancelar</button>
                                    )}
                                </div>
                            )}

                            {/* Non-manager: show own indicator */}
                            {!canManage && d.donor_id === userId && (
                                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
                                    ✓ Sua doação
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
