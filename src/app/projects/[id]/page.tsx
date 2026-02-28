import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Nav from "@/components/nav";
import ProjectTabs from "@/app/projects/[id]/project-tabs";

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Parallel fetches
    const [projectRes, profileRes, masterRes, membersRes] = await Promise.all([
        supabase
            .from("projects")
            .select("id, name, description, status, created_at")
            .eq("id", id)
            .single(),
        supabase
            .from("user_profiles")
            .select("full_name")
            .eq("id", user.id)
            .single(),
        supabase
            .from("user_global_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "master_admin")
            .maybeSingle(),
        supabase
            .from("project_members")
            .select("user_id, role")
            .eq("project_id", id),
    ]);

    const project = projectRes.data;
    const userName = profileRes.data?.full_name ?? "Usuário";
    const isMaster = !!masterRes.data;
    const members = membersRes.data ?? [];
    const userRole = members.find((m) => m.user_id === user.id)?.role ?? null;
    const isManager = userRole === "manager";
    const canManage = isMaster || isManager;

    if (!project) {
        return (
            <div className="light-page">
                <Nav userName={userName} isMaster={isMaster} />
                <div className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
                    <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</p>
                    <h1 style={{ marginBottom: "0.5rem" }}>Projeto não encontrado</h1>
                    <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
                        Este projeto não existe ou você não tem acesso.
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ width: "auto", display: "inline-flex" }}>
                        ← Voltar aos projetos
                    </Link>
                </div>
            </div>
        );
    }

    // Member counts
    const memberCounts = members.reduce(
        (acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="light-page">
            <Nav userName={userName} isMaster={isMaster} />
            <div className="page-container" style={{ maxWidth: 960 }}>
                {/* Back link */}
                <Link
                    href="/"
                    style={{
                        color: "var(--color-text-muted)",
                        textDecoration: "none",
                        fontSize: "0.8125rem",
                        marginBottom: "1.5rem",
                        display: "inline-block",
                    }}
                >
                    ← Voltar aos projetos
                </Link>

                {/* Project Header */}
                <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                {project.name}
                            </h1>
                            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>
                                {project.description || "Sem descrição"}
                            </p>
                        </div>
                        <span className={`project-status ${project.status === "active" ? "status-active" : "status-inactive"}`}>
                            <span className="status-dot" />
                            {project.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "2rem", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-border)", flexWrap: "wrap" }}>
                        <StatsItem label="Managers" value={memberCounts["manager"] ?? 0} />
                        <StatsItem label="Voluntários" value={(memberCounts["logistics_volunteer"] ?? 0) + (memberCounts["service_volunteer"] ?? 0)} />
                        <StatsItem label="Doadores" value={memberCounts["donor"] ?? 0} />
                    </div>
                </div>

                {/* Tabs Component */}
                <ProjectTabs
                    projectId={project.id}
                    canManage={canManage}
                    isMaster={isMaster}
                    userId={user.id}
                />
            </div>
        </div>
    );
}

function StatsItem({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{label}</span>
            <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{value}</p>
        </div>
    );
}
