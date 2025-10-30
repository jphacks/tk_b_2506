# ローカルホストでLINE認証を設定する方法

## 📋 必要なもの

1. **ngrok** (ローカルホストを公開するため)
2. **LINE Developers アカウント**
3. **Supabase プロジェクト（ローカルまたはリモート）**

---

## ステップ1: ngrokのインストール

### macOS / Linux
```bash
# Homebrew (macOS)
brew install ngrok/ngrok/ngrok

# または直接ダウンロード
# https://ngrok.com/download
```

### インストール確認
```bash
ngrok version
```

---

## ステップ2: ngrokでローカルホストを公開

開発サーバーが起動している状態で、別のターミナルで：

```bash
# ポート4029で公開（または使用しているポート）
ngrok http 4029

# または固定ドメインを使用する場合（有料プラン）
ngrok http 4029 --domain=your-domain.ngrok-free.app
```

ngrokが起動すると、以下のようなURLが表示されます：
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:4029
```

この `https://abc123.ngrok-free.app` が公開URLです。

**重要**: 毎回起動するとURLが変わるため、LINE DevelopersのコールバックURLも更新が必要です。

---

## ステップ3: LINE Developersで設定

### 1. LINE Login チャネルを作成

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. **プロバイダーを作成**（まだの場合）
3. **LINE Login** チャネルを作成

### 2. コールバックURLを設定

ngrokで取得したURLを使用：

1. LINE Login チャネル → **設定** → **Callback URL**
2. 以下を追加：
   ```
   https://[YOUR_NGROK_URL]/auth/callback
   ```
   例: `https://abc123.ngrok-free.app/auth/callback`

3. **保存**

### 3. チャネル情報をメモ

- **Channel ID** (Client ID)
- **Channel secret** (Client Secret)

---

## ステップ4: Supabaseで設定

### リモートSupabaseを使用する場合

1. Supabase Dashboard → **Authentication** → **Providers**
2. **LINE** を有効化
3. 以下を入力：
   - **Client ID**: LINE LoginチャネルのChannel ID
   - **Client Secret**: LINE LoginチャネルのChannel Secret
4. **Authorized redirect URLs** に追加：
   ```
   https://[YOUR_NGROK_URL]/auth/callback
   ```
5. **Save**

### ローカルSupabaseを使用する場合

環境変数ファイル (`.env.local`) を確認：
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Supabase CLIでローカル環境を起動：
```bash
supabase start
```

---

## ステップ5: 環境変数の設定

`user_page/.env.local` を作成（または既存の`.env`を更新）：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**注意**: リモートSupabaseを使用する場合、URLはリモートURLを使用してください。

---

## ステップ6: 開発サーバーの起動

```bash
cd user_page
npm install  # 初回のみ
npm run start
```

ブラウザで `http://localhost:4029` を開く。

---

## ステップ7: 動作確認

1. `/auth` ページにアクセス
2. **「LINEでログイン」**ボタンをクリック
3. LINEログイン画面が表示される
4. LINEアカウントでログイン
5. 認証後、アプリにリダイレクトされる

---

## トラブルシューティング

### ngrokのURLが変わった場合

LINE DevelopersのコールバックURLとSupabaseのリダイレクトURLを更新してください。

### 「リダイレクトURIが一致しません」エラー

1. LINE DevelopersのコールバックURLが正しいか確認
2. SupabaseのリダイレクトURLが正しいか確認
3. URLの末尾にスラッシュがないか確認

### ローカルでSupabaseを使用する場合

Supabase CLIでローカル環境が起動していることを確認：
```bash
supabase status
```

---

## ngrokの便利な使い方

### 固定ドメインを使用（推奨）

ngrokの有料プランを使用すると、固定ドメインが使用できます：
```bash
ngrok http 4029 --domain=your-fixed-domain.ngrok-free.app
```

これで毎回URLが変わることがなくなります。

### 無料プランでできること

無料プランでも：
- 固定ドメイン（ランダムな文字列）を1つ使用可能
- 2時間ごとにセッションが切れる（再起動すれば継続）

---

## 次のステップ

ローカルで動作確認できたら、本番環境にデプロイする前に：
1. 本番用のLINE Loginチャネルを作成
2. 本番ドメインでSupabaseを設定
3. リッチメニューを設定

詳細は `LINE_SETUP.md` を参照してください。
