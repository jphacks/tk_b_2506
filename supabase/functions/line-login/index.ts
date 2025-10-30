// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";


interface RequestBody {
  id_token: string;
  line_user_id?: string;
  name?: string;
  picture?: string;
  redirect_to?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    },
  });



async function upsertParticipant(lineUserId: string, userId: string) {
  // デフォルトの学会IDを取得（最初のアクティブな学会）
  const { data: conferences, error: confError } = await supabaseAdmin
    .from('conferences')
    .select('id')
    .eq('is_active', true)
    .order('start_date', { ascending: true })
    .limit(1);

  if (confError) {
    console.error("Error fetching conferences:", confError);
    throw confError;
  }

  const defaultConferenceId = conferences?.[0]?.id;
  console.log("Default conference ID:", defaultConferenceId);

  const { error } = await supabaseAdmin.from("participants").upsert({
    user_id: userId,
    line_user_id: lineUserId,
    conference_id: defaultConferenceId, // デフォルトの学会IDを設定
    registered_at: new Date().toISOString(),
  }, { onConflict: "line_user_id" });

  if (error) {
    console.error("Error upserting participant:", error);
    throw error;
  }

  console.log("Participant upserted successfully");
}

Deno.serve(async (req) => {
  try {
    // プリフライトリクエストの処理
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

    console.log("Request received:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    const body = (await req.json()) as RequestBody;
    const { id_token, name, picture, line_user_id, redirect_to } = body;

    console.log("Received request body:", {
      id_token: id_token ? `${id_token.substring(0, 20)}...` : 'missing',
      name,
      picture,
      line_user_id,
      redirect_to
    });

    if (!id_token) return json({ message: "id_token is required" }, 400);

    // 1) Use provided data directly (skip LINE verification for development)
    console.log("Using provided LINE data directly...");
    const lineUserId = line_user_id;
    if (!lineUserId) return json({ message: "line_user_id not found" }, 400);

    console.log("Using LINE user data:", {
      lineUserId,
      name,
      picture
    });

    // 2) Determine email used in Supabase (stable mapping)
    const email = `${lineUserId}@line.local`;

    // 3) Find or create user
    // まずparticipantsテーブルからline_user_idで検索
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('participants')
      .select('user_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    if (participantError) {
      console.error("Error searching participants:", participantError);
      throw participantError;
    }

    let userId = participant?.user_id;
    console.log("Participant search result:", { userId, lineUserId });

    if (!userId) {
      console.log("Creating new user...");
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_user_id: lineUserId,
          name: name,
          picture: picture,
        },
      });

      if (createError) {
        console.error("Create user error:", createError);
        throw createError;
      } else {
        userId = userData.user?.id;
        console.log("Created new user:", userId);
      }
    }

    if (!userId) return json({ message: "Failed to resolve userId" }, 500);

    // 4) Link participant mapping (idempotent)
    await upsertParticipant(lineUserId, userId);

    // 5) Generate magic link to establish session on client
    const redirectUrl = "https://unmilted-amirah-nonethnologic.ngrok-free.dev/auth/callback";
    console.log("Magic link redirect URL:", redirectUrl);

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (linkErr) throw linkErr;

    const url = (linkData as any)?.properties?.action_link as string | undefined;
    if (!url) return json({ message: "Failed to create action link" }, 500);

    return json({ url, userId, lineUserId });
  } catch (e: any) {
    console.error("line-login error", e);
    if (e instanceof Response) return e;
    return json({ message: e?.message || "unexpected_error" }, 500);
  }
});
