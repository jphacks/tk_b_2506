# ローカルでLINE認証を試す - クイックスタート

## ⚡ 5分で始める方法

### 1. ngrokをインストール

#### WSL2 (Linux) の場合
```bash
# ngrokをダウンロード
cd /tmp
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
ngrok version
```

#### または公式サイトから
1. https://ngrok.com/download にアクセス
2. OSに応じたファイルをダウンロード
3. 解凍して `ngrok` をパスが通った場所に配置

### 2. ngrokアカウントを作成（無料）

1. https://ngrok.com/ にアクセス
2. **Sign up** でアカウント作成（無料）
3. ダッシュボードから **Your Authtoken** をコピー
4. ターミナルで実行：
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 3. 開発サーバーを起動

```bash
cd /home/hayashi/tk_b_2506/user_page
npm run start
```

別のターミナルで、ngrokを起動：

```bash
ngrok http 4029
```

ngrokが起動すると、以下のような出力が表示されます：
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        Japan (jp)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:4029

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**重要**: `https://abc123.ngrok-free.app` の部分が公開URLです。これをコピーします。

### 4. LINE Developersで設定

1. [LINE Developers](https://developers.line.biz/ja/) にログイン
2. プロバイダー → LINE Loginチャネル作成（または既存のチャネルを使用）
3. **設定** → **Callback URL** に以下を追加：
   ```
   https://abc123.ngrok-free.app/auth/callback
   ```
   （`abc123` の部分は実際のngrok URLに置き換え）

### 5. Supabaseで設定

1. Supabase Dashboard → **Authentication** → **Providers**
2. **LINE** を有効化
3. 以下を入力：
   - **Client ID**: LINE LoginチャネルのChannel ID
   - **Client Secret**: LINE LoginチャネルのChannel Secret
4. **Authorized redirect URLs** に追加：
   ```
   https://abc123.ngrok-free.app/auth/callback
   ```
5. **Save**

### 6. テスト！

ブラウザで `http://localhost:4029/auth` を開き、**「LINEでログイン」**ボタンをクリック！

---

## 🔄 URLが変わった場合

ngrokを再起動するとURLが変わります。その場合は：
1. 新しいngrok URLをコピー
2. LINE DevelopersのコールバックURLを更新
3. SupabaseのリダイレクトURLを更新

---

## 💡 固定URLを使いたい場合

ngrok無料プランでも固定ドメイン（ランダム文字列）が1つ使えます：

```bash
# 初回のみ、名前を付ける
ngrok config add-tls domain your-name.ngrok-free.app

# そのドメインを使用
ngrok http 4029 --domain=your-name.ngrok-free.app
```

詳細は `LOCAL_LINE_SETUP.md` を参照してください。
