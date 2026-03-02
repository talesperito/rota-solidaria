"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Normalize phone to E.164 format
    function normalizePhone(raw: string): string | null {
        const digits = raw.replace(/\D/g, "");
        if (!digits) return null;
        // If starts with 55 and has 12-13 digits, add +
        if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
        // If 10-11 digits (BR local), prepend +55
        if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
        // If already has +, return as-is
        if (raw.startsWith("+")) return raw.trim();
        return `+${digits}`;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Client-side phone validation
        const phoneValue = normalizePhone(phone);
        if (phone.trim() && !phoneValue?.match(/^\+[1-9]\d{1,14}$/)) {
            setError("Telefone inválido. Use formato: +5535999990000 ou apenas 35999990000");
            setLoading(false);
            return;
        }

        try {
            const supabase = createClient();

            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } =
                await supabase.auth.signUp({ email, password });

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            if (!authData.user) {
                setError("Erro inesperado ao criar conta.");
                setLoading(false);
                return;
            }

            // 2. Insert profile into user_profiles table

            const { error: profileError } = await supabase
                .from("user_profiles")
                .insert({
                    id: authData.user.id,
                    full_name: fullName.trim(),
                    phone: phoneValue,
                    phone_consent: false,
                });

            if (profileError) {
                setError(`Conta criada, mas erro ao salvar perfil: ${profileError.message}`);
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch {
            setError("Erro inesperado. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="page-center light-page">
                <div className="card">
                    <div className="card-header">
                        <Link href="/" className="logo">
                            <Image
                                src="/assets/branding/logo.png"
                                alt="Rota Solidária"
                                width={120}
                                height={34}
                                className="logo-image"
                                priority
                            />
                            Rota Solidária
                        </Link>
                        <h1>Conta criada!</h1>
                        <p>
                            Verifique seu email para confirmar o cadastro. Depois, faça login.
                        </p>
                    </div>
                    <Link href="/auth/login" className="btn btn-primary">
                        Ir para Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-center light-page">
            <div className="card">
                <div className="card-header">
                    <Link href="/" className="logo">
                        <Image
                            src="/assets/branding/logo.png"
                            alt="Rota Solidária"
                            width={120}
                            height={34}
                            className="logo-image"
                            priority
                        />
                        Rota Solidária
                    </Link>
                    <h1>Criar Conta</h1>
                    <p>Cadastre-se para participar de ações humanitárias</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName">Nome completo</label>
                        <input
                            id="fullName"
                            type="text"
                            placeholder="Seu nome completo"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            minLength={2}
                            autoComplete="name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone">Telefone</label>
                        <input
                            id="phone"
                            type="tel"
                            placeholder="35999990000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                        />
                        <small style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                            Apenas números. O +55 é adicionado automaticamente.
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : "Criar Conta"}
                    </button>
                </form>

                <div className="form-footer">
                    Já tem uma conta? <Link href="/auth/login">Fazer login</Link>
                </div>
            </div>
        </div>
    );
}
