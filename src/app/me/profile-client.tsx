"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface ProfileClientProps {
    userId: string;
    email: string;
    fullName: string;
    phone: string | null;
    phoneConsent: boolean;
    createdAt: string;
}

function normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
    if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
    if (raw.startsWith("+")) return raw.trim();
    return `+${digits}`;
}

export default function ProfileClient({
    userId,
    email,
    fullName,
    phone,
    phoneConsent,
    createdAt,
}: ProfileClientProps) {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    // Edit state
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(fullName);
    const [editPhone, setEditPhone] = useState(phone ?? "");
    const [editConsent, setEditConsent] = useState(phoneConsent);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    function getInitials(name: string): string {
        return name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    }

    function formatDate(iso: string): string {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }

    async function handleLogout() {
        setLoggingOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);

        const phoneValue = editPhone.trim() ? normalizePhone(editPhone) : null;
        if (editPhone.trim() && !phoneValue?.match(/^\+[1-9]\d{1,14}$/)) {
            setError("Telefone inválido. Use formato: 35999990000 ou +5535999990000");
            setSaving(false);
            return;
        }

        const supabase = createClient();
        const { error: err } = await supabase
            .from("user_profiles")
            .update({
                full_name: editName.trim(),
                phone: phoneValue,
                phone_consent: editConsent,
            })
            .eq("id", userId);

        if (err) {
            setError(`Erro ao salvar: ${err.message}`);
        } else {
            setSuccess("Perfil atualizado com sucesso!");
            setEditing(false);
            router.refresh();
            setTimeout(() => setSuccess(null), 3000);
        }
        setSaving(false);
    }

    function handleCancelEdit() {
        setEditing(false);
        setEditName(fullName);
        setEditPhone(phone ?? "");
        setEditConsent(phoneConsent);
        setError(null);
    }

    return (
        <div className="page-center">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">{getInitials(fullName)}</div>
                    <div className="profile-header-info">
                        <h1>{fullName}</h1>
                        <p>{email}</p>
                    </div>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}
                {success && <div className="alert alert-success" style={{ marginBottom: "1rem" }}>{success}</div>}

                {editing ? (
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label htmlFor="edit-name">Nome completo</label>
                            <input
                                id="edit-name"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                minLength={2}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="edit-phone">Telefone</label>
                            <input
                                id="edit-phone"
                                type="tel"
                                placeholder="35999990000"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                            />
                            <small style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                                Apenas números. O +55 é adicionado automaticamente.
                            </small>
                        </div>

                        <div className="form-group">
                            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={editConsent}
                                    onChange={(e) => setEditConsent(e.target.checked)}
                                    style={{ marginTop: "0.2rem", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "0.875rem" }}>
                                    Autorizo o compartilhamento do meu telefone com gestores e voluntários logísticos do projeto para fins de coordenação humanitária (LGPD — art. 7º, II).
                                </span>
                            </label>
                        </div>

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? <span className="spinner" /> : "Salvar"}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="profile-field">
                            <span className="profile-field-label">Nome completo</span>
                            <span className="profile-field-value">{fullName}</span>
                        </div>

                        <div className="profile-field">
                            <span className="profile-field-label">Email</span>
                            <span className="profile-field-value">{email}</span>
                        </div>

                        <div className="profile-field">
                            <span className="profile-field-label">Telefone</span>
                            <span className="profile-field-value">{phone ?? "—"}</span>
                        </div>

                        <div className="profile-field">
                            <span className="profile-field-label">Compartilhar telefone</span>
                            <span className="profile-field-value" style={{ color: phoneConsent ? "#10b981" : "var(--color-text-muted)" }}>
                                {phoneConsent ? "✓ Autorizado" : "✗ Não autorizado"}
                            </span>
                        </div>

                        <div className="profile-field">
                            <span className="profile-field-label">Membro desde</span>
                            <span className="profile-field-value">{formatDate(createdAt)}</span>
                        </div>

                        <div className="profile-actions">
                            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
                                Editar perfil
                            </button>
                            <Link href="/" className="btn btn-ghost">
                                Início
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn btn-danger"
                                disabled={loggingOut}
                            >
                                {loggingOut ? <span className="spinner" /> : "Sair"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
