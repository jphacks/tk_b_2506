# User Page (Vite + React)

このディレクトリはエンドユーザー向けフロントエンドです。Vite + React 18、Tailwind CSS、React Router を使用しています。

## 必要要件
- Node.js 18+（LTS 推奨）
- npm 9+

## 初期セットアップ
1. 依存関係のインストール
   ```bash
   npm install
   ```
2. 環境変数の設定（Supabase など）
   - `env.example` を複製して `.env` を作成し、値を設定します。
   - 主なキー例：
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

## 開発サーバーの起動
```bash
npm run start
```
- デフォルトで `http://localhost:5173` が起動します。

## ビルドとプレビュー
- 本番ビルド
  ```bash
  npm run build
  ```
- ビルド成果物のプレビュー
  ```bash
  npm run serve
  ```

## テスト
```bash
npm run test
```
- Vitest + React Testing Library を使用します。
- 設定は `vitest.config.js` と `src/setupTests.js`（存在する場合）を参照してください。

## ディレクトリ構成（抜粋）
```
user_page/
  public/          # 静的アセット
  src/
    components/    # UI コンポーネント
    pages/         # 画面
    hooks/         # React Hooks
    contexts/      # グローバル状態
    lib/           # Supabase クライアント等
```

## よくあるトラブルシュート
- 開発サーバーがポート競合する: `--port` オプションを `vite.config.mjs` に追加、または `npm run start -- --port 5174` などで回避できます。
- 環境変数が読み込まれない: `.env` をプロジェクト直下に配置し、キー名に必ず `VITE_` プレフィックスを付与してください。
- Supabase 認証の CORS エラー: Supabase の Auth 設定で `http://localhost:5173` を許可ドメインに追加してください。

## デプロイのヒント
- Netlify / Vercel でのデプロイを想定しています。ビルドコマンドは `npm run build`、公開ディレクトリは `build/` ではなく `dist/` です（Vite のデフォルト）。
- SPA ルーティング用に `public/_redirects` がある場合は、そのままアップロードしてください。
