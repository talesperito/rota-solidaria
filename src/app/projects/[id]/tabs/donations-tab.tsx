"use client";

import { useState, useEffect, useCallback } from "react";
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

interface Hub {
    id: string;
    name: string;
}

interface Need {
    id: string;
    title: string;
    category: string;
    quantity_needed: number;
    quantity_received: number;
    quantity_remaining: number;
    quantity_committed: number;
    quantity_available: number;
    unit: string;
}

interface DonationsTabProps {
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
    width: "100%",
    padding: "0.75rem 1rem",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "inherit",
    fontSize: "0.9375rem",
    color: "var(--color-text)",
};

export default function DonationsTab({ projectId, canManage, userId }: DonationsTabProps) {
    const supabase = createClient();
    const [donations, setDonations] = useState<Donation[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [needs, setNeeds] = useState<Need[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [geoLat, setGeoLat] = useState<number | null>(null);
    const [geoLng, setGeoLng] = useState<number | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
                .select("id, title, category, quantity_needed, quantity_received, quantity_remaining, quantity_committed, quantity_available, unit")
                .eq("project_id", projectId)
                .in("status", ["open", "in_progress"])
                .order("created_at", { ascending: false }),
        ]);

        if (donRes.error) {
            setError(`Erro ao carregar doacoes: ${donRes.error.message}`);
            console.error("[DONATIONS FETCH ERROR]", donRes.error);
        } else {
            setDonations((donRes.data as unknown as Donation[]) ?? []);
        }

        setHubs(hubsRes.data ?? []);
        setNeeds((needsRes.data as unknown as Need[]) ?? []);
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

    function requestGeolocation() {
        if (!navigator.geolocation) {
            setGeoError("Geolocalizacao nao suportada pelo navegador.");
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
                        ? "Permissao de localizacao negada. Verifique as configuracoes do navegador."
                        : "Nao foi possivel obter a localizacao."
                );
                setGeoLoading(false);
                console.error("[GEO ERROR]", err);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    const selectedNeed = needs.find((need) => need.id === form.need_id) ?? null;

    const quantityValue = parseInt(form.quantity);
    const quantityIsValid = Number.isFinite(quantityValue) && quantityValue > 0;
    const withinAvailable = !!selectedNeed && quantityIsValid && quantityValue <= selectedNeed.quantity_available;

    const isFormReady =
        !!selectedNeed &&
        form.item_description.trim().length >= 2 &&
        quantityIsValid &&
        withinAvailable &&
        form.unit.trim().length > 0;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        if (!selectedNeed) {
            setError("Selecione uma demanda aberta para registrar a doacao.");
            setSaving(false);
            return;
        }

        if (!quantityIsValid) {
            setError("Informe uma quantidade valida.");
            setSaving(false);
            return;
        }

        if (!withinAvailable) {
            setError("Quantidade excede o saldo disponivel da demanda.");
            setSaving(false);
            return;
        }

        const { error: err } = await supabase.from("donations").insert({
            project_id: projectId,
            donor_id: userId,
            category: selectedNeed.category,
            item_description: form.item_description.trim(),
            quantity: quantityValue,
            unit: form.unit.trim(),
            approx_weight: form.approx_weight ? parseFloat(form.approx_weight) : null,
            need_id: selectedNeed.id,
            hub_id: form.hub_id || null,
            donor_lat: geoLat,
            donor_lng: geoLng,
        });

        if (err) {
            setError(`Erro ao registrar doacao: ${err.message}`);
            console.error("[DONATION CREATE ERROR]", err);
        } else {
            setSuccess("Doacao registrada com sucesso.");
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

    const filtered = donations.filter((donation) => {
        if (filterStatus !== "all" && donation.status !== filterStatus) return false;
        return true;
    });

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
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Doacoes</h2>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "Cancelar" : "Doar"}
                    </button>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Cada doacao precisa atender uma demanda aberta pelo gestor. O sistema bloqueia doacoes acima do saldo disponivel.
                </p>

                {showForm && (
                    <form
                        onSubmit={handleSubmit}
                        style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}
                    >
                        {needs.length === 0 && (
                            <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                                Ainda nao ha demandas abertas para este projeto. Aguarde o gestor cadastrar uma necessidade.
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group">
                                <label>Demanda aberta *</label>
                                <select
                                    value={form.need_id}
                                    onChange={(e) => {
                                        const needId = e.target.value;
                                        const pickedNeed = needs.find((need) => need.id === needId);
                                        setForm({
                                            ...form,
                                            need_id: needId,
                                            category: pickedNeed?.category ?? EMPTY_FORM.category,
                                            unit: pickedNeed?.unit ?? EMPTY_FORM.unit,
                                        });
                                    }}
                                    style={selectStyle}
                                    required
                                >
                                    <option value="">Selecione a demanda que voce vai atender</option>
                                    {needs.map((need) => (
                                        <option key={need.id} value={need.id}>
                                            {need.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Categoria da demanda</label>
                                <select value={form.category} style={selectStyle} disabled>
                                    {CATEGORIES.map((category) => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Descricao do item *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 20 cestas basicas com arroz, feijao e oleo"
                                    value={form.item_description}
                                    onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                                    required
                                    minLength={2}
                                />
                            </div>

                            <div className="form-group">
                                <label>Quantidade para doar *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedNeed?.quantity_available ?? undefined}
                                    placeholder="Informe quanto voce vai doar"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                    required
                                />
                                {selectedNeed && (
                                    <small style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                                        Original: {selectedNeed.quantity_needed} {selectedNeed.unit}. Comprometido: {selectedNeed.quantity_committed} {selectedNeed.unit}. Disponivel: {selectedNeed.quantity_available} {selectedNeed.unit}. Recebido: {selectedNeed.quantity_received} {selectedNeed.unit}.
                                    </small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Unidade da demanda *</label>
                                <input
                                    type="text"
                                    placeholder="Unidade definida pelo gestor"
                                    value={form.unit}
                                    readOnly
                                    required
                                    style={{ background: "var(--color-surface-hover)", cursor: "not-allowed" }}
                                />
                            </div>

                            <div className="form-group">
                                <label>Peso aprox. (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="Opcional"
                                    value={form.approx_weight}
                                    onChange={(e) => setForm({ ...form, approx_weight: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Hub destino</label>
                                <select
                                    value={form.hub_id}
                                    onChange={(e) => setForm({ ...form, hub_id: e.target.value })}
                                    style={selectStyle}
                                >
                                    <option value="">A definir pelo gestor</option>
                                    {hubs.map((hub) => (
                                        <option key={hub.id} value={hub.id}>
                                            {hub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: "0.75rem",
                                padding: "0.75rem",
                                background: "var(--color-surface-hover)",
                                borderRadius: "var(--radius)",
                                fontSize: "0.8125rem",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                                <div>
                                    <strong>Sua localizacao</strong>
                                    <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                                        {geoLat && geoLng ? `${geoLat.toFixed(4)}, ${geoLng.toFixed(4)}` : "Nao informada"}
                                    </span>
                                </div>
                                <button type="button" className="expand-btn" onClick={requestGeolocation} disabled={geoLoading} style={{ marginTop: 0 }}>
                                    {geoLoading ? "Obtendo..." : geoLat ? "Atualizar" : "Usar minha localizacao"}
                                </button>
                            </div>
                            {geoError && (
                                <p style={{ color: "var(--color-danger)", marginTop: "0.375rem", fontSize: "0.75rem" }}>
                                    {geoError}
                                </p>
                            )}
                            <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem", fontSize: "0.6875rem" }}>
                                Ajuda voluntarios logisticos a planejar a coleta. Opcional e com seu consentimento.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || needs.length === 0 || !isFormReady || (selectedNeed?.quantity_available ?? 0) === 0}
                            style={{
                                marginTop: "0.75rem",
                                width: "auto",
                                opacity: saving || needs.length === 0 || !isFormReady || (selectedNeed?.quantity_available ?? 0) === 0 ? 0.55 : 1,
                                cursor: saving || needs.length === 0 || !isFormReady || (selectedNeed?.quantity_available ?? 0) === 0 ? "not-allowed" : "pointer",
                            }}
                        >
                            {saving ? <span className="spinner" /> : "Registrar doacao"}
                        </button>
                    </form>
                )}
            </div>

            {donations.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "var(--radius)",
                            border: "1px solid var(--color-border)",
                            fontSize: "0.75rem",
                            fontFamily: "inherit",
                            background: "var(--color-surface)",
                            color: "var(--color-text)",
                        }}
                    >
                        <option value="all">Todos os status</option>
                        {Object.entries(STATUSES).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value.label}
                            </option>
                        ))}
                    </select>
                    {filterStatus !== "all" && (
                        <button
                            onClick={() => setFilterStatus("all")}
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
                            Limpar
                        </button>
                    )}
                </div>
            )}

            {donations.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Doacoes</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                        Nenhuma doacao registrada.
                    </p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        Clique em &quot;Doar&quot; para atender uma demanda aberta do projeto.
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhuma doacao com o filtro selecionado.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {filtered.map((donation) => (
                        <div key={donation.id} className="admin-section" style={{ marginBottom: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{donation.item_description}</h3>
                                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.375rem" }}>
                                        <span>{CATEGORIES.find((category) => category.value === donation.category)?.label ?? donation.category}</span>
                                        <span>{donation.quantity} {donation.unit}</span>
                                        {donation.approx_weight && <span>~{donation.approx_weight}kg</span>}
                                        {donation.needs && <span>Demanda: {donation.needs.title}</span>}
                                        {donation.hubs && <span>Hub: {donation.hubs.name}</span>}
                                        {donation.donor_lat && donation.donor_lng && (
                                            <span>Origem: {donation.donor_lat.toFixed(3)}, {donation.donor_lng.toFixed(3)}</span>
                                        )}
                                        <span>{new Date(donation.created_at).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: "0.6875rem",
                                        fontWeight: 600,
                                        padding: "0.25rem 0.625rem",
                                        borderRadius: 999,
                                        background: `${STATUSES[donation.status]?.color}18`,
                                        color: STATUSES[donation.status]?.color,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                    }}
                                >
                                    {STATUSES[donation.status]?.label}
                                </span>
                            </div>

                            {canManage && (
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                    {donation.status === "offered" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(donation.id, "accepted")}>
                                            Aceitar
                                        </button>
                                    )}
                                    {donation.status === "accepted" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(donation.id, "in_transit")}>
                                            Em transporte
                                        </button>
                                    )}
                                    {donation.status === "in_transit" && (
                                        <button className="expand-btn" onClick={() => handleStatusChange(donation.id, "delivered")}>
                                            Entregue
                                        </button>
                                    )}
                                    {donation.status !== "cancelled" && donation.status !== "delivered" && (
                                        <button
                                            className="expand-btn"
                                            style={{ color: "var(--color-danger)" }}
                                            onClick={() => handleStatusChange(donation.id, "cancelled")}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            )}

                            {!canManage && donation.donor_id === userId && (
                                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
                                    Sua doacao
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
