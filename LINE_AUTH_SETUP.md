# LINE認証の設定手順（Edge Functionを使用）

## ⚠️ 重要

SupabaseのデフォルトプロバイダーにはLINEが含まれていないため、**Supabase Edge Function**を使ってLINE認証を実装しています。

この実装は [Zennの記事](https://zenn.dev/kota113/articles/79a75dac7236c0) を参考にしています。

---

## 📋 設定手順

### 1. LINE Developersで設定

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. LINE Loginチャネルを作成
3. **Callback URL** に設定：
   ```
   https://[YOUR_NGROK_URL]/auth/callback
   ```
   例: `https://unmilted-amirah-nonethnologic.ngrok-free.dev/auth/callback`
4. **Channel ID** と **Channel Secret** をメモ

### 2. データベース関数の作成

まず、ユーザー検索用のPostgreSQL関数を作成します：

```bash
# マイグレーションを適用
supabase db push

# または、Supabase Dashboard → SQL Editor で実行
# supabase/migrations/017_create_get_user_by_email_function.sql の内容をコピー
```

### 3. 環境変数の設定

#### フロントエンド (user_page/.env.local)

```env
VITE_SUPABASE_URL=https://[YOUR_SUPABASE_PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_LINE_CHANNEL_ID=your-line-channel-id
```

#### Supabase Edge Function (環境変数)

Supabase Dashboard → **Edge Functions** → **Settings** → **Secrets** に以下を追加：

```
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_REDIRECT_URI=https://[YOUR_NGROK_URL]/auth/callback
SUPABASE_URL=https://[YOUR_SUPABASE_PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**注意**: `SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`も必要です。

### 4. Edge Functionをデプロイ

```bash
cd /home/hayashi/tk_b_2506

# Supabase CLIでログイン
supabase login

# Edge Functionをデプロイ
supabase functions deploy line-auth
```

### 5. テスト

1. ブラウザで `http://localhost:4028/auth` を開く
2. **「LINEでログイン」**ボタンをクリック
3. LINEログイン画面が表示される
4. ログイン後、アプリにリダイレクトされる

---

## 🔧 トラブルシューティング

### Edge Functionが見つからないエラー

- Edge Functionがデプロイされているか確認
- Supabase Dashboard → Edge Functions で確認

### 「認証に失敗しました」エラー

- LINE DevelopersのコールバックURLが正しいか確認
- Edge Functionの環境変数が正しく設定されているか確認
- ブラウザのコンソールでエラーを確認

### セッションが設定できない

- Service Role Keyが正しく設定されているか確認
- Edge Functionのログを確認（Supabase Dashboard → Edge Functions → Logs）

---

## 📝 次のステップ

認証が成功したら、リッチメニューの設定に進みましょう！
