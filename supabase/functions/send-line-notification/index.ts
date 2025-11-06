import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { participantId, message, type = 'meet_request' } = await req.json()

    if (!participantId || !message) {
      return new Response(
        JSON.stringify({ error: 'participantId and message are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 参加者IDからLINE User IDを取得
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('participants')
      .select('line_user_id')
      .eq('id', participantId)
      .single()

    if (participantError || !participant?.line_user_id) {
      console.error('Participant not found or no LINE user ID:', participantError)
      return new Response(
        JSON.stringify({ error: 'Participant not found or no LINE user ID' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const lineUserId = participant.line_user_id
    console.log('Found LINE user ID:', lineUserId)

    // LINE Messaging API に送信するメッセージを構築
    let lineMessage = {
      type: 'text',
      text: message
    }

    // メッセージタイプに応じてカスタマイズ
    if (type === 'meet_request') {
      lineMessage = {
        type: 'text',
        text: `🔔 新しいメッセージが届きました！

${message}

リッチメニューからダッシュボードを確認してください。`
      }
    } else if (type === 'location_update') {
      lineMessage = {
        type: 'text',
        text: `📍 位置情報が更新されました！

${message}

近くの参加者を確認してみましょう。`
      }
    }

    // LINE Messaging API に送信
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [lineMessage]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API Error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send LINE message', details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await response.json()
    console.log('LINE message sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in LINE notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
