# Supabase セットアップガイド

## 初期セットアップ方法

プロジェクトを初めてSupabaseにリンクする際の手順：

``` bash
# Supabaseにログイン
npx supabase login

# プロジェクトをSupabaseにリンク（データベースパスワードが必要）
# セレクタープロンプトが表示されます
npx supabase link

# 設定をサーバーに送信（確認が必要な場合があります）
npx supabase config push

# マイグレーションを適用
npx supabase migrations up --linked
```

## マイグレーションファイルの管理

### 新しいマイグレーションファイルを追加する場合

1. **マイグレーションファイルの作成**
   ```bash
   # 新しいマイグレーションファイルを作成（タイムスタンプ付き）
   npx supabase migration new <migration_name>
   ```

   または、手動で`supabase/migrations/`ディレクトリに`.sql`ファイルを作成します。
   - ファイル名は連番形式（例: `007_add_new_feature.sql`）を推奨

2. **マイグレーションファイルの編集**
   - 作成した`.sql`ファイルにSQLコードを記述
   - テーブル作成、カラム追加、インデックス作成などを定義

3. **ローカル環境でテスト（推奨）**
   ```bash
   # ローカルのSupabaseを起動
   npx supabase start

   # ローカル環境でマイグレーションを適用
   npx supabase db reset

   # または、特定のマイグレーションのみ適用
   npx supabase migration up
   ```

4. **リモート環境（本番/ステージング）へ適用**
   ```bash
   # リンクされたSupabaseプロジェクトにマイグレーションを適用
   npx supabase db push

   # または、マイグレーションを個別に適用
   npx supabase migrations up --linked
   ```

## seedsデータの挿入
- SQL EditorからRunコマンドをたたいて実行

### マイグレーションのベストプラクティス

- **順序を守る**: マイグレーションファイルは番号順に実行されます
- **冪等性を保つ**: `IF NOT EXISTS`や`IF EXISTS`を使用して、複数回実行しても安全なSQLを記述
- **ロールバック計画**: 必要に応じて、変更を元に戻すマイグレーションも準備
- **テストする**: 本番環境に適用する前に、必ずローカル環境でテスト

### マイグレーションの状態確認

```bash
# 適用済みマイグレーションの確認
npx supabase migration list --linked

# ローカル環境のマイグレーション状態
npx supabase migration list --local
```

## トラブルシューティング

### マイグレーションが失敗した場合

1. エラーメッセージを確認
2. SQLの構文エラーをチェック
3. 依存関係（外部キーなど）が正しいか確認
4. 必要に応じてマイグレーションファイルを修正し、再実行

### ローカル環境のリセット

```bash
# ローカルデータベースを完全にリセットして全マイグレーションを再適用
npx supabase db reset
```