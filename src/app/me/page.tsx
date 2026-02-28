import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/app/me/profile-client";

export default async function MePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Fetch profile from user_profiles table
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, phone, phone_consent, created_at")
        .eq("id", user.id)
        .single();

    return (
        <ProfileClient
            email={user.email ?? ""}
            fullName={profile?.full_name ?? "—"}
            phone={profile?.phone ?? "—"}
            createdAt={profile?.created_at ?? ""}
        />
    );
}
