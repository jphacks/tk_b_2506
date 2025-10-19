# SympoLink!

[![SympoLink! Demo](https://jphacks.com/wp-content/uploads/2025/05/JPHACKS2025_ogp.jpg)](https://www.youtube.com/watch?v=lA9EluZugD8)

## 製品概要
### 背景(製品開発のきっかけ，課題等）
- 学会後の懇親会において，シャイな研究者は初対面の人に話しかけに行く心理的なハードルが高い
- 研究テーマや興味が近い人を探そうとしても，紙の名札や冊子ベースの参加者リストでは情報が乏しく，会場内で目当ての人を見つけにくい．
- 興味のある発表セッションを見逃す，あるいは仲間の現在地が分からず合流できないといった課題も現場で頻発している．

### 製品説明（具体的な製品の説明）
- ユーザーはメールアドレスとパスワードでログインし，参加予定の学会を`/select-conference`から選択・参加登録する．
- 続いて`/self-introduction-form`で自己紹介カードを作成し，所属や研究テーマ・興味タグを入力してSupabaseの`introductions`・`tags`テーブルに保存する．
- ダッシュボード(`/dashboard/:conferenceId`)に進むと，QRコードで現在地を更新しながら会場マップや参加者リスト，興味に合う発表のレコメンドを閲覧でき，現地で話しかけるべき人やブースを瞬時に把握できる．

### 特長
#### 1. 自己紹介ビルダー（`src/pages/self-introduction-form` / `introductions`・`tags`）
- 名前・所属・研究テーマ・職種・一言コメント・公開設定を整理でき，`src/hooks/useTags.js`がSupabaseの`tags`テーブルから興味タグを読み込む．
- 既存レコードがあれば編集モードでprefillし，送信時に`introductions`テーブルへ更新を反映．
- TailwindベースのUIで必須チェックや120文字上限の一言コメントなど，学会で使いやすいテンプレートを提供．

#### 2. カンファレンス選択と参加者管理（`src/pages/select-conference` / `conferences`・`participants`）
- Supabaseの`conferences`テーブルから一覧を取得し，必要に応じてパスワード付き学会にもjoinできる設計．
- Join後は`participants`テーブルに登録され，選択した学会IDでダッシュボード(`/dashboard/:conferenceId`)へリダイレクト．
- ダッシュボード内の`src/pages/dashboard/components/ParticipantList.jsx`が参加者の自己紹介要約と現在地を表示し，モーダルで詳細確認も可能．

#### 3. 現地体験強化ダッシュボード（`src/pages/dashboard/components` / `locations`・RPC）
- `QrScanButton.jsx`と`src/hooks/useQrScan.js`が会場に設置されたQRコードを読み取り，`locations`と`participant_locations`に現在地履歴を追加．
- `VenueMap.jsx`が`/public/maps/{conferenceId}.png`などの会場マップと現在位置バッジを重ねて表示し，どこに仲間がいるか一目で把握可能．
- `RecommendedPresentations.jsx`がSupabase RPC `search_presentations_by_user_interests`を呼び出し，興味タグから`presentations`をレコメンド．`ai_summary`が登録されていればダイジェストを提示する．

### 解決出来ること
- 懇親会前に互いの興味・研究テーマを共有でき，最初の会話までの時間を大幅に短縮できる．
- 同じ学会に参加している仲間の位置や最新の自己紹介をリアルタイムに把握し，会場内での合流率を高められる．
- 興味タグと連動したセッション推薦により，見逃しがちな発表を事前に知り，タイムテーブル最適化を支援する．
- 主催者は参加者の自己紹介充実度やチェックイン履歴を活用し，よりパーソナライズされたネットワーキング企画に展開できる．

### 今後の展望
- BeaconやNFCを活用した自動チェックイン機能で，QR読取なしでも現在地を更新できる仕組み．
- 興味タグと参加履歴をベースにしたAIマッチングで，最適な会話相手やラウンドテーブルをレコメンドする機能の高度化．
- 主催者向け分析ダッシュボード（滞在時間ヒートマップ，タグ別人気セッション分析など）によるイベント改善支援．

### 注力したこと（こだわり等）
- モバイルでも片手操作しやすいUIをTailwindと`class-variance-authority`で設計（例: `src/pages/dashboard/components/QrScanButton.jsx`）．
- Supabase RLSを崩さずに参加者ディレクトリを提供するため，`get_conference_participant_directory` RPCを導入しフロントから安全に利用できるようにした（`DB/migration/012_create_conference_participant_directory_function.sql`）．
- React Queryにより参加者・会場データをキャッシュし，QRスキャン後の再フェッチをシンプルに管理（`src/hooks/useParticipants.js`, `src/hooks/useLocations.js`）．
- 学会選択や自己紹介の状態をReact ContextとLocalStorageで同期し，再訪時でも入力の手戻りが起きないようにした（`src/constants/conference.js`, `src/pages/select-conference/SelectConference.jsx`）．

## 開発技術
### 活用した技術
#### API・データ
- Supabase PostgREST / RPC (`search_introductions_by_interests`, `search_presentations_by_user_interests`, `get_conference_participant_directory`)
- Supabase テーブル群：`introductions`, `participants`, `conferences`, `locations`, `tags`, `presentations`, `participant_locations`

#### フレームワーク・ライブラリ・モジュール
- Vite + React 18 + React Router 6
- Tailwind CSS, class-variance-authority, framer-motion
- @tanstack/react-query, React Hook Form（一部フォーム）
- @yudiel/react-qr-scanner, date-fns, D3 / Recharts
- Vitest, React Testing Library

#### デバイス
- スマートフォン／タブレットのカメラ（QRコード読み取り用）
- ノートPC・タブレット（ダッシュボード閲覧，会場マップ操作）

### 独自技術
#### ハッカソンで開発した独自機能・技術
- Supabase RLSを活かしつつ参加者名簿を安全に共有するディレクトリRPC（`DB/migration/012_create_conference_participant_directory_function.sql`）
- QRコード連動の現在地トラッキングとマップ表示連携（`src/hooks/useQrScan.js`, `src/pages/dashboard/components/VenueMap.jsx`）
- 興味タグ駆動のプレゼン推薦エンジンとAI要約表示（`src/pages/dashboard/components/RecommendedPresentations.jsx` ほか）
