import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/nav";
import AdminClient from "@/app/admin/admin-client";

export default async function AdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");

    // Check master status
    const { data: masterRole } = await supabase
        .from("user_global_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "master_admin")
        .maybeSingle();

    if (!masterRole) redirect("/");

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    return (
        <div className="light-page">
            <Nav userName={profile?.full_name ?? "Admin"} isMaster={true} />
            <div className="page-container">
                <h1 className="page-title">Painel Administrativo</h1>
                <AdminClient userId={user.id} />
            </div>
        </div>
    );
}
