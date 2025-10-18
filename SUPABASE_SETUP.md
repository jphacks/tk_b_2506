# Supabase セットアップガイド

このガイドでは、Conference Intro BuilderアプリケーションでSupabaseを使用するための設定手順を説明します。

## 🚀 1. Supabaseプロジェクトの作成

### 1.1 Supabaseアカウントの作成
1. [Supabase](https://supabase.com)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ

### 1.2 新しいプロジェクトを作成
1. 「New Project」をクリック
2. プロジェクト名を入力（例：`conference-intro-builder`）
3. データベースパスワードを設定
4. リージョンを選択（Asia Northeast (Tokyo)推奨）
5. 「Create new project」をクリック

## 🔧 2. 環境変数の設定

### 2.1 Supabaseの認証情報を取得
1. Supabaseダッシュボードでプロジェクトを開く
2. 左サイドバーの「Settings」→「API」をクリック
3. 以下の情報をコピー：
   - **Project URL** (例：`https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (例：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2.2 環境変数ファイルを作成
プロジェクトルートに `.env` ファイルを作成：

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**重要**: `.env` ファイルは `.gitignore` に含まれているため、Gitにコミットされません。

## 📊 3. データベースのセットアップ

### 3.1 Migrationファイルの実行
1. Supabaseダッシュボードで「SQL Editor」を開く
2. `migration/001_create_introductions_table.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行
4. 同様に `002_setup_rls_policies.sql` と `003_add_constraints_and_indexes.sql` も実行

### 3.2 テーブルの確認
1. 左サイドバーの「Table Editor」をクリック
2. `introductions` テーブルが作成されていることを確認

## 🔐 4. 認証設定

### 4.1 認証プロバイダーの設定
1. Supabaseダッシュボードで「Authentication」→「Settings」をクリック
2. 「Auth Providers」で「Email」を有効化
3. 「Site URL」を設定（開発時は `http://localhost:4028`）

### 4.2 RLS（Row Level Security）の確認
- Migrationファイルで既に設定済み
- ユーザーは自分のデータのみ管理可能
- 公開データは全ユーザーが閲覧可能

## 🧪 5. 動作確認

### 5.1 開発サーバーの起動
```bash
npm start
```

### 5.2 テスト手順
1. ブラウザで `http://localhost:4028` にアクセス
2. 「アカウント作成」をクリック
3. メールアドレスとパスワードを入力
4. 自己紹介フォームに進む
5. フォームに入力して「自己紹介を作成」をクリック
6. Supabaseダッシュボードの「Table Editor」でデータが保存されていることを確認

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. 「Invalid API key」エラー
- 環境変数の設定を確認
- SupabaseのプロジェクトURLとAPIキーが正しいか確認

#### 2. 「Failed to fetch」エラー
- Supabaseプロジェクトがアクティブか確認
- ネットワーク接続を確認

#### 3. 認証エラー
- Supabaseの認証設定を確認
- Site URLの設定を確認

#### 4. データベースエラー
- Migrationファイルが正しく実行されているか確認
- RLSポリシーが適切に設定されているか確認

## 📚 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🔧 開発時の注意事項

1. **環境変数**: `.env` ファイルは絶対にGitにコミットしない
2. **APIキー**: 本番環境では適切な権限設定を行う
3. **データベース**: 本番環境では必ずバックアップを取得
4. **セキュリティ**: RLSポリシーを適切に設定

## 🚀 本番環境へのデプロイ

1. 本番環境のSupabaseプロジェクトを作成
2. 環境変数を本番用に設定
3. Migrationファイルを本番環境で実行
4. 認証設定を本番用に調整
5. アプリケーションをデプロイ
