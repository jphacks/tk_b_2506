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



// 参加者レコードは作成しない（学会選択時に作成）。
// LINEログイン時は auth.users の user_metadata のみ更新しておく。

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
    // Supabase はメールを小文字で保存するため小文字で統一
    const email = `${lineUserId.toLowerCase()}@line.local`;

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

        // ユーザーが既に存在する場合、既存ユーザーを検索
        if (createError.message?.includes("already been registered") || createError.code === "email_exists") {
          console.log("User already exists, searching for existing user...");

          // 既存ユーザーを検索
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

          if (listError) {
            console.error("Error listing users:", listError);
            throw listError;
          }

          const existingUser = existingUsers.users.find(user => user.email === email);
          if (existingUser) {
            userId = existingUser.id;
            console.log("Found existing user:", userId);
          } else {
            throw new Error("User exists but could not be found");
          }
        } else {
          throw createError;
        }
      } else {
        userId = userData.user?.id;
        console.log("Created new user:", userId);
      }
    }

    if (!userId) return json({ message: "Failed to resolve userId" }, 500);

    // 4) Ensure auth user's metadata has latest LINE info
    const { error: updateMetaErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        line_user_id: lineUserId,
        name: name ?? null,
        picture: picture ?? null,
      },
    });
    if (updateMetaErr) {
      console.error('Failed to update user metadata:', updateMetaErr);
    }

    // 5) If participant rows already exist for this user, stamp line_user_id onto them
    //    （自動作成はしないが、既存行の同期は行う）
    const { error: updateParticipantErr } = await supabaseAdmin
      .from('participants')
      .update({ line_user_id: lineUserId })
      .eq('user_id', userId);
    if (updateParticipantErr) {
      console.error('Failed to sync line_user_id to participants:', updateParticipantErr);
    }

    // 5) Generate magic link to establish session on client
    const redirectUrl = redirect_to;

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
