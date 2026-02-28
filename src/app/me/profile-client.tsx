"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface ProfileClientProps {
    email: string;
    fullName: string;
    phone: string;
    createdAt: string;
}

export default function ProfileClient({
    email,
    fullName,
    phone,
    createdAt,
}: ProfileClientProps) {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

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
                    <span className="profile-field-value">{phone}</span>
                </div>

                <div className="profile-field">
                    <span className="profile-field-label">Membro desde</span>
                    <span className="profile-field-value">{formatDate(createdAt)}</span>
                </div>

                <div className="profile-actions">
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
            </div>
        </div>
    );
}
