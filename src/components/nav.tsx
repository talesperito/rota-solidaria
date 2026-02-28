"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavProps {
    userName: string;
    isMaster: boolean;
}

export default function Nav({ userName, isMaster }: NavProps) {
    const router = useRouter();

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
    }

    return (
        <nav className="top-nav">
            <Link href="/" className="logo">
                <span className="logo-icon">RS</span>
                Rota Solidária
            </Link>
            <div className="nav-links">
                <Link href="/" className="nav-link">Projetos</Link>
                {isMaster && <Link href="/admin" className="nav-link">Admin</Link>}
                <Link href="/me" className="nav-link">{userName}</Link>
                <button onClick={handleLogout} className="nav-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Sair
                </button>
            </div>
        </nav>
    );
}
