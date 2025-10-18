# データベースシードデータ

このディレクトリには、データベースのダミーデータを投入するためのSQLファイルが含まれています。

## 実行方法

Supabase SQL Editorで以下の順序でSQLファイルを実行してください。

### 実行順序

1. **001_seed_conferences.sql** - 学会データ
2. **002_seed_locations.sql** - 会場内の場所データ（QRコード付き）
3. **003_seed_tags.sql** - タグデータ
4. **004_seed_presentations.sql** - 発表データと発表タグ
5. **005_seed_participants_and_introductions.sql** - 自己紹介と参加者データ
6. **006_seed_user_features.sql** - ユーザーの興味と保存された発表

## 重要な注意事項

### ユーザーIDの設定が必要

シードデータの一部（特に005と006）は、`auth.users`テーブルの実際のユーザーIDを必要とします。

#### 手順:

1. **ユーザーを作成する**
   - Supabaseダッシュボードの「Authentication」セクションでユーザーを作成
   - または、アプリケーションのサインアップ機能を使用

2. **ユーザーIDを取得する**
   ```sql
   SELECT id, email FROM auth.users;
   ```

3. **シードデータのNULL値を置き換える**

   各SQLファイル内の`NULL`となっている箇所を、実際のユーザーIDに置き換えてください。

   例:
   ```sql
   -- 修正前
   created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
   ...
   VALUES (..., NULL)

   -- 修正後
   created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
   ...
   VALUES (..., 'actual-user-uuid-here')
   ```

4. **または一括更新を実行する**

   シードデータを実行後、以下のようなUPDATE文で一括更新も可能:
   ```sql
   -- 全てのconferencesのcreated_byを最初のユーザーに設定
   UPDATE public.conferences
   SET created_by = (SELECT id FROM auth.users LIMIT 1)
   WHERE created_by IS NULL;

   -- introductionsのcreated_byも同様に更新
   UPDATE public.introductions
   SET created_by = (SELECT id FROM auth.users LIMIT 1)
   WHERE created_by IS NULL;

   -- participantsのuser_idも更新
   UPDATE public.participants
   SET user_id = (SELECT id FROM auth.users LIMIT 1)
   WHERE user_id IS NULL;
   ```

## シードデータの内容

### 学会データ（conferences）
- 情報処理学会 全国大会 2025
- データベースシンポジウム 2025
- AI・機械学習フォーラム 2025
- セキュリティ・キャンプ全国大会 2024（終了済み）

### タグ（tags）
27種類の研究トピックタグ:
- AI/機械学習関連: 機械学習, 深層学習, 自然言語処理, コンピュータビジョン, 強化学習
- データベース関連: データベース, 分散データベース, NoSQL, クエリ最適化, データマイニング
- セキュリティ関連: サイバーセキュリティ, 暗号技術, プライバシー保護
- その他: ネットワーク, IoT, Web技術, ブロックチェーン, AR/VR など

### 発表データ（presentations）
各学会に複数の発表データ:
- 口頭発表（oral）とポスター発表（poster）
- 抄録テキスト
- AI要約
- 発表者情報
- タグ付け

### その他
- 各学会の会場内の場所（QRコード付き）
- ユーザーの移動履歴
- ユーザーの興味トピック
- 保存された発表

## データのクリア

シードデータをクリアしたい場合は、以下の順序でDELETEを実行してください（外部キー制約のため逆順）:

```sql
-- 逆順で削除
DELETE FROM public.saved_presentations;
DELETE FROM public.user_interests;
DELETE FROM public.participant_locations;
DELETE FROM public.participants;
DELETE FROM public.presentation_tags;
DELETE FROM public.presentations;
DELETE FROM public.tags;
DELETE FROM public.locations;
DELETE FROM public.conferences;
DELETE FROM public.introductions WHERE id LIKE 'i%';  -- シード用のみ削除
```

または、TRUNCATEを使用（より高速、ただし全データ削除）:

```sql
TRUNCATE TABLE
  public.saved_presentations,
  public.user_interests,
  public.participant_locations,
  public.participants,
  public.presentation_tags,
  public.presentations,
  public.tags,
  public.locations,
  public.conferences
CASCADE;
```

## トラブルシューティング

### 外部キー制約エラー
- 実行順序を守っているか確認してください
- 参照先のテーブルにデータが存在するか確認してください

### ユーザーID関連エラー
- `auth.users`にユーザーが存在するか確認してください
- NULL値を実際のユーザーIDに置き換えているか確認してください

### UNIQUE制約違反
- 既にシードデータが投入されている可能性があります
- データをクリアしてから再実行してください
