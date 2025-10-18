# Supabase認証設定ガイド

## 🔐 認証設定の確認手順

### 1. Supabaseダッシュボードでの設定確認

#### 1.1 認証設定の確認
1. Supabaseダッシュボードにアクセス
2. プロジェクト `norgtcdqffgbtqfytmrb` を選択
3. 左サイドバーの「Authentication」→「Settings」をクリック

#### 1.2 必要な設定項目
- **Site URL**: `http://localhost:4028`
- **Redirect URLs**: `http://localhost:4028/**`
- **Email Auth**: 有効化
- **Confirm email**: 無効化（開発時）

### 2. 認証プロバイダーの設定

#### 2.1 Email認証の設定
1. 「Authentication」→「Settings」→「Auth Providers」
2. 「Email」を有効化
3. 「Confirm email」を無効化（開発時のみ）

#### 2.2 認証設定の確認
```
Site URL: http://localhost:4028
Redirect URLs: http://localhost:4028/**
Email Auth: Enabled
Confirm email: Disabled (for development)
```

### 3. データベースの確認

#### 3.1 テーブルの存在確認
1. 「Table Editor」を開く
2. `introductions` テーブルが存在することを確認
3. テーブル構造が正しいことを確認

#### 3.2 RLSポリシーの確認
1. 「Authentication」→「Policies」を開く
2. `introductions` テーブルのポリシーが設定されていることを確認

### 4. デバッグ方法

#### 4.1 ブラウザの開発者ツール
1. F12で開発者ツールを開く
2. 「Console」タブでエラーメッセージを確認
3. 「Network」タブでAPIリクエストを確認

#### 4.2 Supabaseログの確認
1. Supabaseダッシュボードの「Logs」を開く
2. 「Auth」ログで認証イベントを確認
3. エラーが発生していないか確認

### 5. よくある問題と解決方法

#### 5.1 「Invalid API key」エラー
- 環境変数の設定を確認
- SupabaseプロジェクトのAPIキーが正しいか確認

#### 5.2 「Failed to fetch」エラー
- ネットワーク接続を確認
- Supabaseプロジェクトがアクティブか確認

#### 5.3 認証エラー
- Site URLの設定を確認
- Redirect URLsの設定を確認
- Email認証が有効化されているか確認

### 6. テスト手順

#### 6.1 認証のテスト
1. ブラウザで `http://localhost:4028` にアクセス
2. 「アカウント作成」をクリック
3. メールアドレスとパスワードを入力
4. エラーメッセージが表示されないか確認

#### 6.2 データベースのテスト
1. 認証成功後、自己紹介フォームに入力
2. 「自己紹介を作成」をクリック
3. Supabaseダッシュボードでデータが保存されているか確認

### 7. トラブルシューティング

#### 7.1 認証が動作しない場合
1. Supabaseの認証設定を再確認
2. ブラウザのキャッシュをクリア
3. 開発サーバーを再起動

#### 7.2 データが保存されない場合
1. データベースのテーブル構造を確認
2. RLSポリシーが正しく設定されているか確認
3. 認証状態が正しく取得できているか確認
