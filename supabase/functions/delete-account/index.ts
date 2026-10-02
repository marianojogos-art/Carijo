import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const allowedOrigins = new Set([
  "https://crimson-thunder-80d3.marianojogos.workers.dev",
  "http://localhost:3000",
]);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (origin && !allowedOrigins.has(origin)) return Response.json({ error: "Origem não autorizada." }, { status: 403, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return Response.json({ error: "Sessão inválida." }, { status: 401, headers });
  const body = await req.json().catch(() => ({}));
  if (body?.confirmation !== "EXCLUIR") return Response.json({ error: "Confirmação inválida." }, { status: 400, headers });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return Response.json({ error: "Não foi possível excluir a conta agora." }, { status: 500, headers });
  return Response.json({ deleted: true }, { headers });
});
