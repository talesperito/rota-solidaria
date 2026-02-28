"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Registration {
    id: string;
    user_id: string;
    wants_to_offer_ride: boolean;
    needs_ride: boolean;
    notes: string | null;
    user_profiles: { full_name: string } | null;
}

interface Shift {
    id: string;
    title: string;
    description: string | null;
    shift_date: string;
    start_time: string;
    end_time: string;
    required_people: number;
    status: string;
    hub_id: string | null;
    created_at: string;
    hubs: { name: string } | null;
    shift_registrations: Registration[];
}

interface Hub { id: string; name: string; }

interface ShiftsPanelProps {
    projectId: string;
    canManage: boolean;
    userId: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
    open: { label: "Aberto", color: "#3b82f6" },
    full: { label: "Lotado", color: "#d97706" },
    closed: { label: "Encerrado", color: "#6b7280" },
    cancelled: { label: "Cancelado", color: "#dc2626" },
};

const selectStyle = {
    width: "100%", padding: "0.75rem 1rem", background: "var(--color-surface)",
    border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
    fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)",
};

const EMPTY_FORM = {
    title: "", description: "", shift_date: "", start_time: "08:00",
    end_time: "12:00", required_people: "", hub_id: "",
};

export default function ShiftsPanel({ projectId, canManage, userId }: ShiftsPanelProps) {
    const supabase = createClient();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Registration UI
    const [regShiftId, setRegShiftId] = useState<string | null>(null);
    const [offerRide, setOfferRide] = useState(false);
    const [needRide, setNeedRide] = useState(false);
    const [regNotes, setRegNotes] = useState("");
    const [registering, setRegistering] = useState(false);

    const fetchData = useCallback(async () => {

        const [shiftsRes, hubsRes] = await Promise.all([
            supabase
                .from("service_shifts")
                .select(`id, title, description, shift_date, start_time, end_time,
          required_people, status, hub_id, created_at,
          hubs(name),
          shift_registrations(id, user_id, wants_to_offer_ride, needs_ride, notes, user_profiles(full_name))`)
                .eq("project_id", projectId)
                .order("shift_date", { ascending: true }),
            supabase.from("hubs").select("id, name").eq("project_id", projectId)
                .eq("status", "active").order("name"),
        ]);

        if (shiftsRes.error) {
            setError(`Erro ao carregar turnos: ${shiftsRes.error.message}`);
            console.error("[SHIFTS FETCH ERROR]", shiftsRes.error);
        } else {
            setShifts((shiftsRes.data as unknown as Shift[]) ?? []);
        }
        setHubs(hubsRes.data ?? []);
        setLoading(false);
    }, [projectId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function handleCreateShift(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const { error: err } = await supabase.from("service_shifts").insert({
            project_id: projectId,
            title: form.title.trim(),
            description: form.description.trim() || null,
            shift_date: form.shift_date,
            start_time: form.start_time,
            end_time: form.end_time,
            required_people: parseInt(form.required_people),
            hub_id: form.hub_id || null,
            created_by: userId,
        });

        if (err) {
            setError(`Erro ao criar turno: ${err.message}`);
            console.error("[SHIFT CREATE ERROR]", err);
        } else {
            setSuccess("Turno criado!");
            setForm(EMPTY_FORM);
            setShowForm(false);
            await fetchData();
        }
        setSaving(false);
    }

    async function handleRegister(shiftId: string) {
        setRegistering(true);
        setError(null);

        const { error: err } = await supabase.from("shift_registrations").insert({
            shift_id: shiftId,
            user_id: userId,
            wants_to_offer_ride: offerRide,
            needs_ride: needRide,
            notes: regNotes.trim() || null,
        });

        if (err) {
            if (err.message.includes("duplicate") || err.message.includes("unique")) {
                setError("Você já está inscrito neste turno.");
            } else {
                setError(`Erro ao se inscrever: ${err.message}`);
            }
            console.error("[REG ERROR]", err);
        } else {
            setSuccess("Inscrição realizada! 🎉");
            setRegShiftId(null);
            setOfferRide(false);
            setNeedRide(false);
            setRegNotes("");
            await fetchData();
        }
        setRegistering(false);
    }

    async function handleCancelShift(shiftId: string) {
        if (!confirm("Cancelar este turno?")) return;
        const { error: err } = await supabase
            .from("service_shifts").update({ status: "cancelled" }).eq("id", shiftId);
        if (err) setError(`Erro: ${err.message}`);
        else { setSuccess("Turno cancelado."); await fetchData(); }
    }

    function isRegistered(shift: Shift): boolean {
        return shift.shift_registrations.some((r) => r.user_id === userId);
    }

    function isPast(dateStr: string): boolean {
        return new Date(dateStr + "T23:59:59") < new Date();
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

            {/* Header */}
            <div className="admin-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Turnos de Serviço</h2>
                    {canManage && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                            {showForm ? "Cancelar" : "+ Novo Turno"}
                        </button>
                    )}
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Mutirões, reparos e atendimentos. Inscreva-se e informe se pode oferecer ou precisa de carona.
                </p>

                {/* Create Form */}
                {showForm && canManage && (
                    <form onSubmit={handleCreateShift} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Título *</label>
                                <input type="text" placeholder="Ex: Mutirão de limpeza - Bairro São João" value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
                            </div>
                            <div className="form-group">
                                <label>Data *</label>
                                <input type="date" value={form.shift_date}
                                    onChange={(e) => setForm({ ...form, shift_date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Pessoas necessárias *</label>
                                <input type="number" min="1" placeholder="10" value={form.required_people}
                                    onChange={(e) => setForm({ ...form, required_people: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Início *</label>
                                <input type="time" value={form.start_time}
                                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Fim *</label>
                                <input type="time" value={form.end_time}
                                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Hub / Local</label>
                                <select value={form.hub_id} onChange={(e) => setForm({ ...form, hub_id: e.target.value })} style={selectStyle}>
                                    <option value="">Nenhum</option>
                                    {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Descrição</label>
                                <input type="text" placeholder="Detalhes sobre o turno" value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ marginTop: "0.75rem" }}>
                            {saving ? <span className="spinner" /> : "Criar Turno"}
                        </button>
                    </form>
                )}
            </div>

            {/* Shifts List */}
            {shifts.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📅</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhum turno agendado.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                    {shifts.map((s) => {
                        const regCount = s.shift_registrations.length;
                        const past = isPast(s.shift_date);
                        const alreadyIn = isRegistered(s);
                        const canRegister = s.status === "open" && !past && !alreadyIn;

                        return (
                            <div key={s.id} className="admin-section" style={{ marginBottom: 0 }}>
                                {/* Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.375rem" }}>{s.title}</h3>
                                        {s.description && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>{s.description}</p>}
                                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                            <span>📅 {new Date(s.shift_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                                            <span>🕐 {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
                                            <span>👥 {regCount}/{s.required_people}</span>
                                            {s.hubs && <span>📍 {s.hubs.name}</span>}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: "0.6875rem", fontWeight: 600,
                                        padding: "0.25rem 0.625rem", borderRadius: 999,
                                        background: `${STATUS_CFG[past && s.status === "open" ? "closed" : s.status]?.color}18`,
                                        color: STATUS_CFG[past && s.status === "open" ? "closed" : s.status]?.color,
                                        whiteSpace: "nowrap",
                                    }}>
                                        {past && s.status === "open" ? "Encerrado" : STATUS_CFG[s.status]?.label}
                                    </span>
                                </div>

                                {/* Participants */}
                                {regCount > 0 && (
                                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
                                        <p style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "var(--color-text-muted)" }}>
                                            Inscritos:
                                        </p>
                                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                                            {s.shift_registrations.map((r) => (
                                                <span key={r.id} style={{
                                                    fontSize: "0.6875rem", padding: "0.1875rem 0.5rem",
                                                    borderRadius: 999, background: "var(--color-surface-hover)",
                                                    display: "inline-flex", alignItems: "center", gap: "0.25rem",
                                                }}>
                                                    {r.user_profiles?.full_name ?? "—"}
                                                    {r.wants_to_offer_ride && <span title="Oferece carona">🚗</span>}
                                                    {r.needs_ride && <span title="Precisa de carona">🙋</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                                    {canRegister && regShiftId !== s.id && (
                                        <button className="btn btn-primary btn-sm" onClick={() => setRegShiftId(s.id)}>
                                            ✋ Quero participar
                                        </button>
                                    )}
                                    {alreadyIn && (
                                        <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 500 }}>
                                            ✓ Inscrito
                                        </span>
                                    )}
                                    {canManage && s.status !== "cancelled" && !past && (
                                        <button className="expand-btn" style={{ color: "var(--color-danger)" }}
                                            onClick={() => handleCancelShift(s.id)}>✕ Cancelar</button>
                                    )}
                                </div>

                                {/* Registration Inline Form */}
                                {regShiftId === s.id && (
                                    <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius)" }}>
                                        <p style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>Inscrição</p>
                                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                <input type="checkbox" checked={offerRide} onChange={(e) => setOfferRide(e.target.checked)} />
                                                🚗 Posso oferecer carona
                                            </label>
                                            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer" }}>
                                                <input type="checkbox" checked={needRide} onChange={(e) => setNeedRide(e.target.checked)} />
                                                🙋 Preciso de carona
                                            </label>
                                        </div>
                                        <input type="text" placeholder="Observações (opcional)" value={regNotes}
                                            onChange={(e) => setRegNotes(e.target.value)}
                                            style={{ marginBottom: "0.5rem", width: "100%", fontSize: "0.8125rem" }} />
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button className="btn btn-primary btn-sm" disabled={registering}
                                                onClick={() => handleRegister(s.id)}>
                                                {registering ? <span className="spinner" /> : "Confirmar inscrição"}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setRegShiftId(null)}>Cancelar</button>
                                        </div>
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
