# LINE認証・リッチメニュー設定ガイド

## 📋 目次

1. [LINE認証の設定](#line認証の設定)
2. [SupabaseでのLINE認証設定](#supabaseでのline認証設定)
3. [リッチメニューの設定](#リッチメニューの設定)
4. [リッチメニューURL一覧](#リッチメニューurl一覧)

---

## LINE認証の設定

### 1. LINE Developers でプロバイダーを作成

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. プロバイダーを作成（まだの場合）
3. **Messaging API** チャネルを作成または既存のチャネルを使用

### 2. LINE Login チャネルを作成

1. LINE Developers コンソールで **LINE Login** チャネルを作成
2. **Callback URL** を設定：
   ```
   https://[YOUR_SUPABASE_URL]/auth/v1/callback
   ```
3. チャネルIDとチャネルシークレットをメモ

---

## SupabaseでのLINE認証設定

### 1. Authentication 設定

1. Supabase Dashboard → **Authentication** → **Providers**
2. **LINE** を有効化
3. 以下を入力：
   - **Client ID (Channel ID)**: LINE LoginチャネルのチャネルID
   - **Client Secret (Channel Secret)**: LINE Loginチャネルのチャネルシークレット
4. **Authorized redirect URLs** に以下を追加：
   ```
   https://[YOUR_SUPABASE_URL]/auth/v1/callback
   https://[YOUR_DOMAIN]/auth/callback
   ```
5. **Save** をクリック

### 2. URL設定確認

- **Site URL**: `https://[YOUR_DOMAIN]`
- **Redirect URLs**:
  - `https://[YOUR_DOMAIN]/auth/callback`
  - `https://[YOUR_DOMAIN]/dashboard/*`

---

## リッチメニューの設定

### 1. リッチメニュー画像の準備

各ボタンに使用する画像を準備してください（推奨サイズ: 1200x810px）。

### 2. リッチメニューJSONの作成

以下のJSONテンプレートを使用して、リッチメニューを作成します：

```json
{
  "size": {
    "width": 1200,
    "height": 810
  },
  "selected": false,
  "name": "SympoLink! メニュー",
  "chatBarText": "メニュー",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=home"
      }
    },
    {
      "bounds": {
        "x": 400,
        "y": 0,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=settings"
      }
    },
    {
      "bounds": {
        "x": 800,
        "y": 0,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=location&action=qrscan"
      }
    },
    {
      "bounds": {
        "x": 0,
        "y": 405,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=location"
      }
    },
    {
      "bounds": {
        "x": 400,
        "y": 405,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=recommended"
      }
    },
    {
      "bounds": {
        "x": 800,
        "y": 405,
        "width": 400,
        "height": 405
      },
      "action": {
        "type": "uri",
        "uri": "https://[YOUR_DOMAIN]/dashboard/[CONFERENCE_ID]?tab=messages"
      }
    }
  ]
}
```

### 3. リッチメニューAPIで設定

LINE Messaging APIを使用してリッチメニューを設定します：

```bash
# 1. リッチメニューを作成（画像とJSONをアップロード）
curl -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @richmenu.json

# 2. リッチメニューIDを取得（上記のレスポンスから）
RICH_MENU_ID="richmenu-xxxxxxxxxxxxxx"

# 3. 画像をアップロード
curl -X POST https://api-data.line.me/v2/bot/richmenu/{RICH_MENU_ID}/content \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: image/png" \
  -T richmenu-image.png

# 4. デフォルトのリッチメニューとして設定
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/{RICH_MENU_ID} \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}"
```

### 4. Supabase Edge Functionを使用する場合

`supabase/functions/set-rich-menu/index.ts` を作成して、上記の処理を自動化できます。

---

## リッチメニューURL一覧

以下のURLパターンに対応しています：

| ボタン | URLパターン | 説明 |
|--------|------------|------|
| ①ホームタブ | `/dashboard/:conferenceId?tab=home` | ホームタブを表示 |
| ②設定タブ | `/dashboard/:conferenceId?tab=settings` | 設定モーダルを開く（未実装） |
| ③QR読み込み | `/dashboard/:conferenceId?tab=location&action=qrscan` | 位置情報タブでQRスキャンを開く（未実装） |
| ④位置情報タブ | `/dashboard/:conferenceId?tab=location` | 位置情報タブを表示 |
| ⑤おすすめタブ | `/dashboard/:conferenceId?tab=recommended` | おすすめの研究者タブを表示 |
| ⑥チャットタブ | `/dashboard/:conferenceId?tab=messages` | メッセージタブを表示 |

### 注意事項

- `[YOUR_DOMAIN]` は実際のドメインに置き換えてください
- `[CONFERENCE_ID]` は実際の学会IDに置き換えてください（動的に設定する場合は、リッチメニュー設定時に注意が必要）
- ログインしていないユーザーは、認証ページにリダイレクトされます

---

## テスト方法

1. LINEアプリで公式アカウントを開く
2. リッチメニューの各ボタンをタップ
3. 対応するタブが開かれることを確認

---

## トラブルシューティング

### LINE認証が動作しない場合

1. Supabase DashboardでLINEプロバイダーが有効化されているか確認
2. Callback URLが正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

### リッチメニューが表示されない場合

1. リッチメニューが正しく設定されているか確認（LINE Developersコンソール）
2. チャネルアクセストークンが正しいか確認
3. リッチメニューのサイズが正しいか確認（1200x810px推奨）

---

## 参考リンク

- [LINE Developers ドキュメント](https://developers.line.biz/ja/docs/)
- [LINE Messaging API - リッチメニュー](https://developers.line.biz/ja/docs/messaging-api/using-rich-menus/)
- [Supabase Authentication - OAuth Providers](https://supabase.com/docs/guides/auth/social-login/auth-line)
