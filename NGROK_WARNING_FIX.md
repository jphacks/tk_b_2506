# ngrok警告ページの回避方法

ngrokの無料プランでは、ブラウザで警告ページが表示されます。LINE認証のコールバック時にこの警告を通過する必要があります。

## 方法1: 警告ページを手動で通過（推奨）

1. LINE認証後、コールバックURLで警告ページが表示される
2. ブラウザで「Visit Site」または「Continue」ボタンをクリック
3. アプリケーションにリダイレクトされる

## 方法2: ngrok設定で警告を最小化

ngrok起動時に以下のオプションを追加：

```bash
ngrok http 4028 --host-header="localhost:4028"
```

## 方法3: ngrok設定ファイルを使用（推奨）

`~/.ngrok2/ngrok.yml`に以下を追加：

```yaml
version: "2"
authtoken: YOUR_NGROK_AUTH_TOKEN
tunnels:
  sympolink:
    proto: http
    addr: 4028
    host_header: "localhost:4028"
```

その後、以下で起動：

```bash
ngrok start sympolink
```

## 方法4: 固定ドメインを使用（最も確実）

ngrokの固定ドメインを使用すると、警告ページが表示されません（ただし、有料プランが必要な場合があります）。

```bash
ngrok http 4028 --domain=your-domain.ngrok-free.app
```

---

## 現在の対処

現在は方法1（手動で警告ページを通過）を使用してください。LINE認証後、警告ページが表示されたら「Visit Site」をクリックしてください。
