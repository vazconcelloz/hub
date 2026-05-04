import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  convite_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("CONVITE_FROM_EMAIL") || "Hub Grupo FBN <onboarding@resend.dev>";
    const SITE_URL = Deno.env.get("SITE_URL") || "";

    // Auth check (admin token required)
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.convite_id) {
      return new Response(JSON.stringify({ error: "convite_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: convite, error: convErr } = await admin
      .from("convites")
      .select("id, email, token, role, expira_em, status")
      .eq("id", body.convite_id)
      .maybeSingle();

    if (convErr || !convite) {
      return new Response(JSON.stringify({ error: "convite não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin =
      SITE_URL ||
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "";
    const link = `${origin}/login?convite=${convite.token}`;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          sent: false,
          reason: "email_not_configured",
          link,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="color:#0B2545;margin:0 0 12px">Você foi convidado para o Hub Grupo FBN</h2>
        <p style="font-size:14px;line-height:1.6;color:#334155">
          Olá! Você foi convidado para acessar o portal interno do Grupo FBN como
          <strong>${convite.role === "admin" ? "Administrador" : "Usuário"}</strong>.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#334155">
          Clique no botão abaixo para criar sua conta usando o e-mail
          <strong>${convite.email}</strong>.
        </p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#0B2545;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
            Aceitar convite
          </a>
        </p>
        <p style="font-size:12px;color:#64748b">
          Ou copie e cole este link no navegador:<br/>
          <span style="word-break:break-all">${link}</span>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:11px;color:#94a3b8">
          Este convite expira em ${new Date(convite.expira_em).toLocaleDateString("pt-BR")}.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [convite.email],
        subject: "Convite para o Hub Grupo FBN",
        html,
      }),
    });

    if (!resendRes.ok) {
      const txt = await resendRes.text();
      console.error("Resend error:", resendRes.status, txt);
      return new Response(
        JSON.stringify({ sent: false, reason: "resend_error", detail: txt, link }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ sent: true, link }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-convite-email error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
