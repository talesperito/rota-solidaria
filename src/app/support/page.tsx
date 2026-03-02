import Link from "next/link";
import Nav from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

const SUPPORT_EMAIL = "talesperito@gmail.com";
const SUPPORT_PHONE = "31-992419000";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "Visitante";
  let isMaster = false;

  if (user) {
    const [profileRes, masterRes] = await Promise.all([
      supabase.from("user_profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("user_global_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "master_admin")
        .maybeSingle(),
    ]);

    userName = profileRes.data?.full_name ?? "Usuario";
    isMaster = !!masterRes.data;
  }

  return (
    <div className="light-page">
      {user ? (
        <Nav userName={userName} isMaster={isMaster} />
      ) : (
        <div className="about-top">
          <Link href="/" className="nav-link">Voltar para inicio</Link>
          <Link href="/auth/login" className="nav-link">Entrar</Link>
        </div>
      )}

      <div className="page-container" style={{ maxWidth: 860 }}>
        <section className="admin-section" style={{ textAlign: "center" }}>
          <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>
            Precisa de suporte?
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Fale com a equipe mantenedora para tirar duvidas, reportar problemas
            ou receber orientacao sobre contribuicoes.
          </p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary" style={{ width: "auto", margin: "0 auto" }}>
            Entrar em contato agora
          </a>
        </section>

        <section className="admin-section">
          <h2 style={{ marginBottom: "0.75rem" }}>Canais de contato</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div className="support-contact-row">
              <div>
                <strong style={{ display: "block", fontSize: "0.9375rem" }}>Email</strong>
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  Resposta para duvidas gerais e suporte tecnico
                </span>
              </div>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-ghost btn-sm" style={{ width: "auto" }}>
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div className="support-contact-row">
              <div>
                <strong style={{ display: "block", fontSize: "0.9375rem" }}>Telefone</strong>
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  Contato direto para alinhamentos rapidos
                </span>
              </div>
              <a href="tel:+5531992419000" className="btn btn-ghost btn-sm" style={{ width: "auto" }}>
                {SUPPORT_PHONE}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
