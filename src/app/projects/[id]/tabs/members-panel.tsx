"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface MemberRow {
    member_id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    phone_consent: boolean;
    role: string;
    assigned_at: string;
}

interface GroupedMember {
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    phone_consent: boolean;
    roles: { member_id: string; role: string; assigned_at: string }[];
}

interface MembersPanelProps {
    projectId: string;
    canManage: boolean;
    isMaster: boolean;
    userId: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    manager: { label: "Gestor", color: "#7c3aed" },
    donor: { label: "Doador", color: "#2563eb" },
    logistics_volunteer: { label: "Voluntário Logístico", color: "#d97706" },
    service_volunteer: { label: "Voluntário de Serviço", color: "#059669" },
};

const selectStyle = {
    padding: "0.75rem 1rem", background: "var(--color-surface)",
    border: "1px solid var(--color-border)", borderRadius: "var(--radius)",
    fontFamily: "inherit", fontSize: "0.9375rem", color: "var(--color-text)",
};

function maskPhone(phone: string | null): string {
    if (!phone) return "—";
    if (phone.length <= 4) return phone;
    return phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
}

export default function MembersPanel({ projectId, canManage, isMaster, userId }: MembersPanelProps) {
    const supabase = useMemo(() => createClient(), []);
    const [members, setMembers] = useState<GroupedMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Add member form
    const [showAdd, setShowAdd] = useState(false);
    const [addEmail, setAddEmail] = useState("");
    const [addRole, setAddRole] = useState("donor");
    const [adding, setAdding] = useState(false);

    const fetchMembers = useCallback(async () => {

        const { data, error: err } = await supabase.rpc("get_project_members_full", {
            _project_id: projectId,
        });

        if (err) {
            setError(`Erro ao carregar membros: ${err.message}`);
            console.error("[MEMBERS FETCH ERROR]", err);
            setLoading(false);
            return;
        }

        // Group rows by user_id
        const grouped: Record<string, GroupedMember> = {};
        for (const row of (data as MemberRow[]) ?? []) {
            if (!grouped[row.user_id]) {
                grouped[row.user_id] = {
                    user_id: row.user_id,
                    full_name: row.full_name,
                    email: row.email,
                    phone: row.phone,
                    phone_consent: row.phone_consent,
                    roles: [],
                };
            }
            grouped[row.user_id].roles.push({
                member_id: row.member_id,
                role: row.role,
                assigned_at: row.assigned_at,
            });
        }
        setMembers(Object.values(grouped));
        setLoading(false);
    }, [projectId, supabase]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault();
        setAdding(true);
        setError(null);

        // Prevent manager from assigning manager role
        if (addRole === "manager" && !isMaster) {
            setError("Apenas o administrador master pode atribuir o papel de gestor.");
            setAdding(false);
            return;
        }

        try {
            // 1. Resolve email to UUID
            const { data: uid, error: lookupErr } = await supabase.rpc("lookup_user_for_assignment", {
                _email: addEmail.trim().toLowerCase(),
                _project_id: projectId,
            });

            if (lookupErr) {
                setError(lookupErr.message.includes("não encontrado")
                    ? `Usuário "${addEmail}" não encontrado. Verifique se já se cadastrou.`
                    : `Erro: ${lookupErr.message}`);
                setAdding(false);
                return;
            }

            // 2. Insert into project_members
            const { error: insertErr } = await supabase.from("project_members").insert({
                project_id: projectId,
                user_id: uid,
                role: addRole,
                assigned_by: userId,
            });

            if (insertErr) {
                if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) {
                    setError("Este usuário já possui esse papel neste projeto.");
                } else {
                    setError(`Erro ao adicionar: ${insertErr.message}`);
                }
                console.error("[ADD MEMBER ERROR]", insertErr);
            } else {
                setSuccess(`${addEmail} adicionado como ${ROLE_LABELS[addRole]?.label}!`);
                setAddEmail("");
                setShowAdd(false);
                await fetchMembers();
            }
        } catch (err) {
            setError("Erro inesperado ao adicionar membro.");
            console.error("[ADD MEMBER CATCH]", err);
        }
        setAdding(false);
    }

    async function handleRemoveRole(memberId: string, roleName: string) {
        if (!confirm(`Remover papel "${ROLE_LABELS[roleName]?.label}" deste membro?`)) return;
        setError(null);
        const { error: err } = await supabase
            .from("project_members")
            .delete()
            .eq("id", memberId);

        if (err) {
            setError(`Erro ao remover: ${err.message}`);
            console.error("[REMOVE ROLE ERROR]", err);
        } else {
            setSuccess("Papel removido.");
            await fetchMembers();
        }
    }

    // Phone visibility: manager sees full number only if member gave consent

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

            {/* Header + Add */}
            <div className="admin-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                        Membros do Projeto ({members.length})
                    </h2>
                    {canManage && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                            {showAdd ? "Cancelar" : "+ Adicionar"}
                        </button>
                    )}
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                    Pessoas vinculadas ao projeto com seus respectivos papéis.
                </p>

                {/* Add Member Form */}
                {showAdd && canManage && (
                    <form onSubmit={handleAddMember} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                                <label>Email do usuário *</label>
                                <input type="email" placeholder="voluntario@email.com" value={addEmail}
                                    onChange={(e) => setAddEmail(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                                <label>Papel *</label>
                                <select value={addRole} onChange={(e) => setAddRole(e.target.value)} style={selectStyle}>
                                    <option value="donor">🤲 Doador</option>
                                    <option value="logistics_volunteer">🚛 Vol. Logístico</option>
                                    <option value="service_volunteer">🛠 Vol. Serviço</option>
                                    {isMaster && <option value="manager">⭐ Gestor</option>}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={adding}
                                style={{ height: "fit-content", marginBottom: "0.5rem" }}>
                                {adding ? <span className="spinner" /> : "Adicionar"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="admin-section" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>👥</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhum membro vinculado ao projeto.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                    {members.map((m) => (
                        <div key={m.user_id} className="admin-section" style={{ marginBottom: 0, padding: "1rem 1.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                        <strong style={{ fontSize: "0.9375rem" }}>{m.full_name}</strong>
                                        {m.user_id === userId && (
                                            <span style={{ fontSize: "0.625rem", background: "var(--color-primary-glow)", color: "var(--color-primary)", padding: "0.0625rem 0.375rem", borderRadius: 999 }}>Você</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                                        <span>✉ {m.email}</span>
                                        {canManage && m.phone_consent
                                            ? <span title="Compartilhamento autorizado">📞 {m.phone ?? "—"}</span>
                                            : canManage && !m.phone_consent
                                                ? <span style={{ color: "var(--color-text-muted)" }} title="Membro não autorizou compartilhamento de telefone">📞 {maskPhone(m.phone)} <small>(sem consentimento)</small></span>
                                                : <span>📞 {maskPhone(m.phone)}</span>
                                        }
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                                    {m.roles.map((r) => (
                                        <span key={r.member_id} style={{
                                            fontSize: "0.6875rem", fontWeight: 600,
                                            padding: "0.1875rem 0.5rem", borderRadius: 999,
                                            background: `${ROLE_LABELS[r.role]?.color ?? "#666"}18`,
                                            color: ROLE_LABELS[r.role]?.color ?? "#666",
                                            display: "inline-flex", alignItems: "center", gap: "0.25rem",
                                        }}>
                                            {ROLE_LABELS[r.role]?.label ?? r.role}
                                            {/* Remove button */}
                                            {canManage && (r.role !== "manager" || isMaster) && m.user_id !== userId && (
                                                <button onClick={() => handleRemoveRole(r.member_id, r.role)}
                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "0.75rem", padding: 0, lineHeight: 1 }}>
                                                    ✕
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
