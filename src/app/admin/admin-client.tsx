"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: string;
}

interface Manager {
    user_id: string;
    full_name: string;
    email: string;
}

export default function AdminClient({ userId }: { userId: string }) {
    const supabase = createClient();

    const [projects, setProjects] = useState<Project[]>([]);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [creating, setCreating] = useState(false);

    const [expanded, setExpanded] = useState<string | null>(null);
    const [managers, setManagers] = useState<Record<string, Manager[]>>({});
    const [addEmail, setAddEmail] = useState("");
    const [adding, setAdding] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        const { data } = await supabase
            .from("projects")
            .select("id, name, description, status")
            .order("created_at", { ascending: false });
        setProjects(data ?? []);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    async function createProject(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setError(null);

        const { error: err } = await supabase.from("projects").insert({
            name: name.trim(),
            description: desc.trim() || null,
            created_by: userId,
        });

        if (err) {
            setError(err.message);
        } else {
            setName("");
            setDesc("");
            setSuccess("Projeto criado com sucesso!");
            await fetchProjects();
        }
        setCreating(false);
    }

    async function fetchManagers(projectId: string) {
        const { data } = await supabase.rpc("get_project_managers", {
            _project_id: projectId,
        });
        setManagers((m) => ({ ...m, [projectId]: (data as Manager[]) ?? [] }));
    }

    async function toggleExpand(projectId: string) {
        if (expanded === projectId) {
            setExpanded(null);
            return;
        }
        setExpanded(projectId);
        await fetchManagers(projectId);
    }

    async function addManager(projectId: string) {
        setAdding(true);
        setError(null);

        // 1. Lookup user by email (RPC — master only)
        const { data: lookedUpId, error: lookupErr } = await supabase.rpc(
            "lookup_user_by_email",
            { _email: addEmail.trim() }
        );

        if (lookupErr) {
            setError(lookupErr.message);
            setAdding(false);
            return;
        }

        // 2. Insert as manager (RLS enforces master-only for manager role)
        const { error: insertErr } = await supabase.from("project_members").insert({
            project_id: projectId,
            user_id: lookedUpId,
            role: "manager",
            assigned_by: userId,
        });

        if (insertErr) {
            setError(insertErr.message);
        } else {
            setAddEmail("");
            setSuccess("Manager adicionado!");
            await fetchManagers(projectId);
        }
        setAdding(false);
    }

    async function removeManager(projectId: string, managerId: string) {
        setError(null);

        const { error: err } = await supabase
            .from("project_members")
            .delete()
            .eq("project_id", projectId)
            .eq("user_id", managerId)
            .eq("role", "manager");

        if (err) {
            setError(err.message);
        } else {
            setSuccess("Manager removido.");
            await fetchManagers(projectId);
        }
    }

    return (
        <>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Create Project */}
            <div className="admin-section">
                <h2>Criar Projeto</h2>
                <form onSubmit={createProject} className="admin-form">
                    <div className="form-group">
                        <label htmlFor="projectName">Nome do projeto</label>
                        <input
                            id="projectName"
                            type="text"
                            placeholder="Ex: SOS Zona da Mata - MG"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            minLength={3}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="projectDesc">Descrição</label>
                        <input
                            id="projectDesc"
                            type="text"
                            placeholder="Breve descrição da operação"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={creating}>
                        {creating ? <span className="spinner" /> : "Criar"}
                    </button>
                </form>
            </div>

            {/* Projects List */}
            <div className="admin-section">
                <h2>Projetos ({projects.length})</h2>
                {projects.length === 0 ? (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Nenhum projeto criado ainda.
                    </p>
                ) : (
                    projects.map((p) => (
                        <div
                            key={p.id}
                            style={{
                                padding: "1rem 0",
                                borderBottom: "1px solid var(--color-border)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <strong>{p.name}</strong>
                                    <span
                                        className={`project-status ${p.status === "active" ? "status-active" : "status-inactive"}`}
                                        style={{ marginLeft: "0.75rem" }}
                                    >
                                        <span className="status-dot" />
                                        {p.status === "active" ? "Ativo" : "Inativo"}
                                    </span>
                                    {p.description && (
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                            {p.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                className="expand-btn"
                                onClick={() => toggleExpand(p.id)}
                            >
                                {expanded === p.id ? "▲ Fechar" : "▼ Gerenciar Managers"}
                            </button>

                            {expanded === p.id && (
                                <div className="managers-panel">
                                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                                        Managers do projeto
                                    </h3>

                                    {/* Manager List */}
                                    {(managers[p.id] ?? []).length === 0 ? (
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                                            Nenhum manager atribuído.
                                        </p>
                                    ) : (
                                        <ul className="manager-list">
                                            {(managers[p.id] ?? []).map((m) => (
                                                <li key={m.user_id} className="manager-item">
                                                    <div className="manager-info">
                                                        <span className="manager-name">{m.full_name}</span>
                                                        <span className="manager-email">{m.email}</span>
                                                    </div>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => removeManager(p.id, m.user_id)}
                                                    >
                                                        Remover
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Add Manager Form */}
                                    <div className="admin-form" style={{ marginTop: "0.75rem" }}>
                                        <div className="form-group">
                                            <label htmlFor={`addEmail-${p.id}`}>Email do novo manager</label>
                                            <input
                                                id={`addEmail-${p.id}`}
                                                type="email"
                                                placeholder="email@exemplo.com"
                                                value={addEmail}
                                                onChange={(e) => setAddEmail(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={adding || !addEmail.trim()}
                                            onClick={() => addManager(p.id)}
                                        >
                                            {adding ? <span className="spinner" /> : "Adicionar"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
