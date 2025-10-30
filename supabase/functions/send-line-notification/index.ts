import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, message, type = 'meet_request' } = await req.json()

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'userId and message are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // LINE Messaging API に送信するメッセージを構築
    let lineMessage = {
      type: 'text',
      text: message
    }

    // メッセージタイプに応じてカスタマイズ
    if (type === 'meet_request') {
      lineMessage = {
        type: 'text',
        text: `🔔 新しいミートリクエストが届きました！

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
        to: userId,
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
