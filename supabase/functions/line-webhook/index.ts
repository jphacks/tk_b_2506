import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // 完全なイベント情報をログに出力
    console.log('LINE Webhook Event:', JSON.stringify(body, null, 2))

    for (const event of body.events) {
      // イベントごとにユーザーIDをログ出力
      console.log('Event Type:', event.type)
      console.log('LINE User ID:', event.source?.userId)

      if (event.type === 'follow') {
        console.log('User followed:', event.source.userId)
        await sendWelcomeMessage(event.source.userId)
      } else if (event.type === 'unfollow') {
        console.log('User unfollowed:', event.source.userId)
      } else if (event.type === 'message') {
        console.log('Message received from:', event.source.userId)
        console.log('Message text:', event.message.text)
        await sendAutoReply(event.source.userId)
      }
    }

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('Error in LINE webhook:', error)
    return new Response('OK', { headers: corsHeaders })
  }
})

async function sendWelcomeMessage(userId: string) {
  const message = {
    type: 'text',
    text: `SympoLink!へようこそ！

学会や懇親会での出会いをサポートします。
リッチメニューから各機能にアクセスできます。

まずは「自分の登録」からプロフィールを設定してください。`
  }

  await sendLineMessage(userId, [message])
}

async function sendAutoReply(userId: string) {
  const message = {
    type: 'text',
    text: `ご質問ありがとうございます！

SympoLink!の使い方：
• ダッシュボード：参加者一覧とミートリクエスト
• 自分の登録：プロフィール設定
• 位置情報更新：現在地の登録
• ヘルプ：詳細な使い方

リッチメニューから各機能にアクセスしてください。`
  }

  await sendLineMessage(userId, [message])
}

async function sendLineMessage(userId: string, messages: any[]) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')}`
    },
    body: JSON.stringify({
      to: userId,
      messages: messages
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to send LINE message:', errorText)
  }
}
