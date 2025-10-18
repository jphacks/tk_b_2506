# Supabase Migration Files

このディレクトリには、Conference Intro Builderアプリケーション用のSupabase migrationファイルが含まれています。

## 📁 Migration Files

### 1. `001_create_introductions_table.sql`
- **目的**: 自己紹介データを保存するメインテーブルを作成
- **機能**:
  - `introductions`テーブルの作成
  - UUID主キー、タイムスタンプ、外部キー設定
  - 自動更新トリガーの設定
  - 基本的なインデックスの作成

### 2. `002_setup_rls_policies.sql`
- **目的**: Row Level Security（RLS）ポリシーの設定
- **機能**:
  - 公開自己紹介の閲覧権限
  - ユーザー自身の自己紹介の管理権限
  - 認証済みユーザーの作成権限
  - 匿名ユーザー向けの公開データ取得関数

### 3. `003_add_constraints_and_indexes.sql`
- **目的**: データ検証制約とパフォーマンス最適化
- **機能**:
  - データ長制限の制約
  - 全文検索インデックス
  - 検索機能の実装
  - 統計情報取得機能

## 🚀 使用方法

### 1. Supabaseプロジェクトのセットアップ
```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# Supabaseプロジェクトの初期化
supabase init

# ローカル開発環境の起動
supabase start
```

### 2. Migrationの実行
```bash
# すべてのmigrationを順番に実行
supabase db reset

# または個別に実行
supabase db push
```

### 3. 本番環境へのデプロイ
```bash
# 本番環境にmigrationを適用
supabase db push --linked
```

## 📊 データベーススキーマ

### `introductions` テーブル
| カラム名 | 型 | 制約 | 説明 |
|---------|----|----|----|
| `id` | UUID | PRIMARY KEY | 一意識別子 |
| `name` | VARCHAR(255) | NOT NULL | 表示名（必須） |
| `affiliation` | VARCHAR(500) | - | 所属機関 |
| `research_topic` | VARCHAR(500) | - | 研究テーマ |
| `interests` | TEXT | - | 興味・関心 |
| `one_liner` | VARCHAR(120) | - | 一言メッセージ |
| `is_public` | BOOLEAN | DEFAULT true | 公開設定 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | 更新日時 |
| `created_by` | UUID | FOREIGN KEY | 作成者ID |

## 🔒 セキュリティ

### Row Level Security (RLS) ポリシー
- **公開データ**: すべてのユーザーが公開された自己紹介を閲覧可能
- **プライベートデータ**: ユーザーは自分の自己紹介のみ管理可能
- **認証**: 自己紹介の作成・更新・削除には認証が必要

### データ検証
- 名前は必須（空文字不可）
- 一言メッセージは120文字以内
- 所属・研究テーマは500文字以内

## 🔍 利用可能な関数

### `get_public_introductions()`
- 公開された自己紹介を取得
- 匿名ユーザーも利用可能

### `search_introductions_by_interests(search_term)`
- 興味・研究テーマ・所属で検索
- 公開データのみ検索対象

### `get_introduction_stats()`
- 自己紹介の統計情報を取得
- 総数、公開数、非公開数、最近の作成数

## 🛠️ 開発時の注意事項

1. **Migration順序**: ファイル名の番号順に実行してください
2. **RLS設定**: 本番環境では必ずRLSを有効にしてください
3. **インデックス**: 大量データを扱う場合は追加のインデックスを検討してください
4. **バックアップ**: 本番環境に適用前に必ずバックアップを取得してください

## 📝 今後の拡張予定

- [ ] 自己紹介の「いいね」機能
- [ ] コメント機能
- [ ] タグ機能
- [ ] 検索履歴
- [ ] お気に入り機能
