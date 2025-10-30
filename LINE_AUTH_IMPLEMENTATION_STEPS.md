# LINE認証実装ステップガイド

このドキュメントでは、LINE認証を実装するための**具体的な手順**を順番に説明します。

---

## 📋 実装チェックリスト

- [ ] **ステップ1**: マイグレーションの適用（データベース関数の作成）
- [ ] **ステップ2**: 環境変数の設定（フロントエンド）
- [ ] **ステップ3**: LINE Developersでチャネル作成・設定
- [ ] **ステップ4**: ngrokでローカルホストを公開（開発環境のみ）
- [ ] **ステップ5**: Supabase Edge Functionの環境変数設定
- [ ] **ステップ6**: Edge Functionのデプロイ
- [ ] **ステップ7**: 動作確認

---

## ステップ1: マイグレーションの適用

まず、ユーザー検索用のPostgreSQL関数を作成します。

### 方法A: Supabase CLIを使用（推奨）

```bash
cd /home/hayashi/tk_b_2506

# マイグレーションを適用
supabase db push
```

### 方法B: Supabase Dashboardから実行

1. Supabase Dashboardを開く
2. **SQL Editor**を開く
3. `supabase/migrations/017_create_get_user_by_email_function.sql` の内容をコピー
4. SQLエディタに貼り付けて実行

**確認**: エラーなく実行されればOKです。

---

## ステップ2: フロントエンドの環境変数設定

### 2-1. `.env.local`ファイルの作成

`user_page`ディレクトリに`.env.local`ファイルを作成します：

```bash
cd /home/hayashi/tk_b_2506/user_page
touch .env.local
```

### 2-2. 環境変数を設定

`user_page/.env.local`に以下を追加：

```env
# Supabase設定（既存の値があればそれを使用）
VITE_SUPABASE_URL=https://cqudhplophskbgzepoti.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# LINE設定（ステップ3で取得した値を使用）
VITE_LINE_CHANNEL_ID=your-line-channel-id-here
```

**注意**:
- `VITE_SUPABASE_URL`と`VITE_SUPABASE_ANON_KEY`は既に設定されている場合はそのまま使用
- `VITE_LINE_CHANNEL_ID`はステップ3で取得します

---

## ステップ3: LINE Developersでチャネル作成

### 3-1. LINE Loginチャネルを作成

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. **プロバイダーを作成**（まだの場合）
3. **LINE Login**チャネルを作成
   - チャネル名を入力
   - アプリタイプ: **Web app**を選択
   - **作成**をクリック

### 3-2. チャネル情報を取得

作成後、以下の情報をメモ：

- **Channel ID**（Client ID）
- **Channel secret**（Client Secret）

これらは後で使用します。

### 3-3. コールバックURLの設定

**重要**: まずステップ4でngrokを起動してURLを取得してから、ここに戻って設定してください。

LINE Developersコンソールで：
1. **設定**タブを開く
2. **Callback URL**に以下を追加：
   ```
   https://[YOUR_NGROK_URL]/auth/callback
   ```
   例: `https://abc123.ngrok-free.app/auth/callback`
3. **保存**

---

## ステップ4: ngrokでローカルホストを公開（開発環境のみ）

### 4-1. ngrokのインストール確認

```bash
ngrok version
```

インストールされていない場合は：
```bash
# macOS
brew install ngrok/ngrok/ngrok

# または公式サイトからダウンロード
# https://ngrok.com/download
```

### 4-2. 開発サーバーを起動

```bash
cd /home/hayashi/tk_b_2506/user_page
npm run start
```

サーバーが`http://localhost:4028`で起動していることを確認

### 4-3. ngrokを起動

**別のターミナル**で：

```bash
ngrok http 4028
```

ngrokが起動すると、以下のようなURLが表示されます：

```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:4028
```

この **`https://abc123.ngrok-free.app`** が公開URLです。これをメモしてください。

**注意**: ngrokを再起動するとURLが変わるため、そのたびにLINE DevelopersのコールバックURLも更新が必要です。

### 4-4. ステップ3に戻ってコールバックURLを設定

ステップ3-3で取得したngrok URLをLINE DevelopersのコールバックURLに設定してください。

---

## ステップ5: Supabase Edge Functionの環境変数設定

### 5-1. Supabase Dashboardを開く

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. **Edge Functions** → **Settings** → **Secrets**を開く

### 5-2. 環境変数を追加

以下の環境変数を追加します：

```
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_REDIRECT_URI=https://abc123.ngrok-free.app/auth/callback
SUPABASE_URL=https://cqudhplophskbgzepoti.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**各値の説明**:

- `LINE_CHANNEL_ID`: ステップ3で取得したChannel ID
- `LINE_CHANNEL_SECRET`: ステップ3で取得したChannel Secret
- `LINE_REDIRECT_URI`: ステップ4で取得したngrok URL + `/auth/callback`
- `SUPABASE_URL`: プロジェクトのURL（通常は既に表示されている）
- `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → **Settings** → **API** → **service_role key**から取得

---

## ステップ6: Edge Functionのデプロイ

### 6-1. Supabase CLIでログイン

```bash
cd /home/hayashi/tk_b_2506
supabase login
```

ブラウザが開くので、Supabaseアカウントでログインします。

### 6-2. プロジェクトをリンク（初回のみ）

```bash
supabase link --project-ref cqudhplophskbgzepoti
```

**プロジェクト参照ID**はSupabase DashboardのURLから取得できます：
- URL: `https://supabase.com/dashboard/project/cqudhplophskbgzepoti`
- プロジェクト参照ID: `cqudhplophskbgzepoti`

### 6-3. Edge Functionをデプロイ

```bash
supabase functions deploy line-auth
```

デプロイが成功すると、以下のようなメッセージが表示されます：

```
Deployed Function line-auth
```

**確認**: Supabase Dashboard → **Edge Functions**で`line-auth`が表示されていることを確認

---

## ステップ7: 動作確認

### 7-1. アプリを開く

ブラウザで `http://localhost:4028/auth` を開く

### 7-2. LINEログインボタンをクリック

「LINEでログイン」ボタンをクリック

### 7-3. LINE認証画面でログイン

LINEの認証画面が表示されるので、LINEアカウントでログイン

### 7-4. リダイレクト確認

ログイン後、自動的にアプリにリダイレクトされ、ダッシュボードまたは自己紹介フォームが表示されれば成功です！

---

## 🐛 トラブルシューティング

### エラー: "LINE Channel IDが設定されていません"

→ `user_page/.env.local`に`VITE_LINE_CHANNEL_ID`が設定されているか確認
→ 開発サーバーを再起動

### エラー: "認証状態の検証に失敗しました"

→ ngrok URLが変わっていないか確認
→ LINE DevelopersのコールバックURLを更新

### エラー: "Failed to get LINE access token"

→ LINE DevelopersのChannel ID/Secretが正しいか確認
→ Edge Functionの環境変数が正しく設定されているか確認
→ Supabase Dashboard → Edge Functions → Logsでエラーを確認

### Edge Functionが見つからない

→ `supabase functions deploy line-auth`を実行
→ Supabase Dashboard → Edge Functionsで確認

---

## 📝 まとめ

実装順序のまとめ：

1. ✅ **マイグレーション適用** → データベース関数作成
2. ✅ **環境変数設定** → フロントエンドとEdge Function
3. ✅ **LINE Developers設定** → チャネル作成とコールバックURL設定
4. ✅ **ngrok起動** → ローカルホストを公開
5. ✅ **Edge Functionデプロイ** → 認証ロジックをデプロイ
6. ✅ **テスト** → 動作確認

各ステップでエラーが出た場合は、上記のトラブルシューティングを参照してください。

---

## 🎯 次のステップ

LINE認証が動作したら：

1. **リッチメニューの設定** - LINE Botに6パネルのリッチメニューを追加
2. **デプロイ** - 本番環境へのデプロイ（Vercel, Netlifyなど）
3. **本番環境の設定** - 本番URLでLINE DevelopersとSupabaseを設定
