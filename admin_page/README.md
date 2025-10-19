# 学会管理システム（Admin Page）

学会のプレゼンテーション管理とマップ管理を行う管理者用Webアプリケーション

## 機能

### 実装済み機能

- ✅ プレゼンテーション登録フォーム
- ✅ 会場マップからの場所選択
- ✅ PDFアップロード機能
- ✅ タグによる分類
- ✅ プレゼンテーション一覧表示

### 実装中の機能

- 🚧 PDF自動解析（抄録抽出）
- 🚧 AI要約生成
- 🚧 AIタグ提案

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: Supabase Storage

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルが既に存在します。Supabaseの認証情報が設定されています。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは http://localhost:3001 で起動します。

## データベーススキーマ

主要なテーブル：

- `conferences`: 学会情報
- `locations`: 会場の場所（QRコード対応）
- `presentations`: プレゼンテーション情報
- `tags`: タグマスター
- `presentation_tags`: プレゼンテーションとタグの関連

詳細は `DB/migration` ディレクトリのマイグレーションファイルを参照してください。

## ディレクトリ構造

```
admin_page/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── presentations/     # プレゼンテーション管理
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/            # Reactコンポーネント
│   │   ├── ui/               # UIコンポーネント
│   │   └── LocationMap.tsx   # マップコンポーネント
│   ├── lib/                   # ライブラリとユーティリティ
│   │   └── supabase.ts       # Supabaseクライアント
│   └── utils/                 # ユーティリティ関数
│       └── cn.ts             # クラス名マージ
├── public/                    # 静的ファイル
├── .env                       # 環境変数
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## AI機能の実装について

### PDF解析

`src/app/api/analyze-pdf/route.ts` に実装の骨組みがあります。

実際の実装には以下が必要です：

1. **PDFテキスト抽出**
   ```bash
   npm install pdfjs-dist
   # または
   npm install pdf-parse
   ```

2. **AI API統合**

   OpenAI APIを使用する場合：
   ```bash
   npm install openai
   ```

   環境変数に追加：
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

   Anthropic Claudeを使用する場合：
   ```bash
   npm install @anthropic-ai/sdk
   ```

   環境変数に追加：
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

### 実装例

```typescript
// src/app/api/analyze-pdf/route.ts
import { OpenAI } from 'openai';
import pdfParse from 'pdf-parse';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // PDFからテキストを抽出
  const buffer = await file.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(buffer));
  const text = pdfData.text;

  // OpenAI APIで要約を生成
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "あなたは学術論文の要約を作成する専門家です。"
      },
      {
        role: "user",
        content: `以下の論文を200文字程度で要約してください：\n\n${text}`
      }
    ]
  });

  const summary = completion.choices[0].message.content;

  return NextResponse.json({
    abstract: text,
    summary: summary,
    suggestedTags: []
  });
}
```

## user_pageとの連携

このアプリケーションは、`user_page`と同じSupabaseデータベースを使用しています。

- 管理者が登録したプレゼンテーションは、`user_page`から参照できます
- `user_page`のユーザーは、興味のあるタグに基づいて推奨プレゼンテーションを見ることができます

## デプロイ

### Vercelへのデプロイ

```bash
npm run build
```

Vercelにプッシュするか、Vercel CLIを使用してデプロイします。

環境変数をVercelのプロジェクト設定で設定してください。

## ライセンス

プロジェクトのライセンスに従います。
