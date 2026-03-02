"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface NavProps {
    userName: string;
    isMaster: boolean;
}

export default function Nav({ userName, isMaster }: NavProps) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        setMenuOpen(false);
        router.push("/");
        router.refresh();
    }

    function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) {
            setMenuOpen(false);
        }
    }

    return (
        <>
            <nav className="top-nav">
                <Link href="/" className="logo" aria-label="Rota Solidária">
                    <Image
                        src="/assets/branding/logo.png"
                        alt="Rota Solidária"
                        width={120}
                        height={34}
                        className="logo-image"
                        priority
                    />
                    <span className="logo-text">Rota Solidária</span>
                </Link>

                <div className="nav-links">
                    <Link href="/" className="nav-link">Projetos</Link>
                    {isMaster && <Link href="/admin" className="nav-link">Admin</Link>}
                    <span className="nav-user">Bem-vindo, {userName}</span>
                    <button
                        onClick={handleLogout}
                        className="nav-link"
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                        Sair
                    </button>
                </div>

                <button
                    type="button"
                    className={`menu-toggle ${menuOpen ? "open" : ""}`}
                    aria-label="Abrir menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((prev) => !prev)}
                >
                    <span className="menu-toggle-line" />
                    <span className="menu-toggle-line" />
                    <span className="menu-toggle-line" />
                </button>
            </nav>

            <div
                className={`mobile-menu ${menuOpen ? "open" : ""}`}
                onClick={handleBackdropClick}
            >
                <div className="mobile-menu-panel">
                    <p className="mobile-menu-user">Bem-vindo, {userName}</p>

                    <Link href="/" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>
                        Projetos
                    </Link>

                    <button type="button" className="mobile-menu-logout" onClick={handleLogout}>
                        Sair
                    </button>
                </div>
            </div>
        </>
    );
}
