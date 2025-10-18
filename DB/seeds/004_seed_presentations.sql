-- Seed data for presentations and presentation_tags tables
-- File: 004_seed_presentations.sql
-- Description: Inserts sample presentation data with AI summaries

-- Get location IDs for reference
-- Presentations for 情報処理学会 全国大会 2025

INSERT INTO public.presentations (id, conference_id, title, abstract, pdf_url, ai_summary, presentation_type, location_id, presenter_name, presenter_affiliation, scheduled_at) VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Transformerモデルを用いた日本語文書要約の高精度化',
    '本研究では、Transformerアーキテクチャを基盤とした日本語文書の自動要約手法を提案する。既存の要約モデルと比較して、ROUGE-Lスコアで15%の性能向上を達成した。特に、長文の技術文書において高い要約精度を示すことを確認した。',
    'https://example.com/papers/transformer_summary.pdf',
    'Transformerを用いた日本語文書要約手法を提案。既存手法よりROUGE-Lスコアで15%向上。長文技術文書で特に有効。',
    'oral',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_HALL1' LIMIT 1),
    '山田太郎',
    '東京大学',
    '2025-03-15 10:00:00+09'
),
(
    'a2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'グラフニューラルネットワークによるソーシャルネットワーク分析',
    'ソーシャルネットワークの構造を解析するために、グラフニューラルネットワーク（GNN）を活用した手法を開発した。影響力のあるノードの検出精度が従来手法と比べて20%向上し、リアルタイム処理も可能となった。',
    'https://example.com/papers/gnn_social.pdf',
    'GNNを用いたソーシャルネットワーク分析手法。影響力ノード検出精度が20%向上。リアルタイム処理も実現。',
    'oral',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_HALL2' LIMIT 1),
    '佐藤花子',
    '京都大学',
    '2025-03-15 11:00:00+09'
),
(
    'a3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'エッジコンピューティングにおける分散機械学習の最適化',
    'IoTデバイスで収集されたデータをエッジで学習する分散機械学習フレームワークを提案。通信コストを60%削減しつつ、モデル精度を維持することに成功した。',
    'https://example.com/papers/edge_ml.pdf',
    'エッジでの分散機械学習フレームワークを提案。通信コスト60%削減、精度維持を達成。',
    'poster',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_POSTER_A' LIMIT 1),
    '鈴木一郎',
    '大阪大学',
    '2025-03-16 14:00:00+09'
),
(
    'a4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'ブロックチェーン技術を用いた分散型データ共有システム',
    '医療データなどの機密情報を安全に共有するため、ブロックチェーン技術を応用した分散型データ共有システムを開発。プライバシーを保護しながら、必要な情報へのアクセスを実現した。',
    'https://example.com/papers/blockchain_data.pdf',
    'ブロックチェーンによる分散型データ共有システム。プライバシー保護とアクセス制御を両立。',
    'poster',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_POSTER_A' LIMIT 1),
    '田中美咲',
    '慶應義塾大学',
    '2025-03-16 14:00:00+09'
),

-- Presentations for データベースシンポジウム 2025
(
    'b1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '時系列データベースにおけるクエリ最適化手法',
    'IoTセンサーから得られる大量の時系列データを効率的に処理するため、インデックス構造とクエリ最適化アルゴリズムを改良。クエリ応答時間を平均40%短縮した。',
    'https://example.com/papers/timeseries_db.pdf',
    '時系列DBのクエリ最適化。インデックスとアルゴリズム改良で応答時間40%短縮。',
    'oral',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_ROOM_A' LIMIT 1),
    '高橋健',
    '東北大学',
    '2025-06-10 13:00:00+09'
),
(
    'b2222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'NoSQLデータベースにおけるトランザクション管理の新手法',
    'NoSQLデータベースでACID特性を保証しつつ、高いスループットを実現するトランザクション管理手法を提案。MongoDB上での実装で性能を検証した。',
    'https://example.com/papers/nosql_transaction.pdf',
    'NoSQLでのACID保証とスループット向上を両立するトランザクション管理手法。',
    'poster',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_POSTER' LIMIT 1),
    '渡辺真由',
    '名古屋大学',
    '2025-06-11 15:00:00+09'
),

-- Presentations for AI・機械学習フォーラム 2025
(
    'c1111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '説明可能AI（XAI）による医療診断支援システム',
    '深層学習モデルの判断根拠を可視化する説明可能AI技術を医療診断に応用。医師が診断プロセスを理解しやすくし、診断精度向上に貢献した。',
    'https://example.com/papers/xai_medical.pdf',
    '説明可能AIを用いた医療診断支援。判断根拠の可視化で医師の理解と診断精度が向上。',
    'oral',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_MAIN' LIMIT 1),
    '伊藤誠',
    '北海道大学',
    '2025-09-20 10:30:00+09'
),
(
    'c2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '強化学習による自動運転制御の最適化',
    '深層強化学習を用いた自動運転システムの制御手法を開発。シミュレーション環境での検証により、安全性と効率性の両立を確認した。',
    'https://example.com/papers/rl_autonomous.pdf',
    '深層強化学習による自動運転制御。シミュレーションで安全性と効率性を検証。',
    'oral',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_SESSION1' LIMIT 1),
    '中村裕子',
    '九州大学',
    '2025-09-20 14:00:00+09'
),
(
    'c3333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Few-shot学習による少量データでの画像分類',
    '少量の学習データから効率的に学習するFew-shot学習手法を提案。医療画像や希少物体の分類において従来手法を上回る精度を達成。',
    'https://example.com/papers/fewshot_classification.pdf',
    'Few-shot学習で少量データから高精度分類。医療画像や希少物体で有効性を実証。',
    'poster',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_POSTER' LIMIT 1),
    '小林修',
    '早稲田大学',
    '2025-09-21 13:00:00+09'
),
(
    'c4444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    'マルチモーダル学習による動画理解の深化',
    '映像、音声、テキストを統合的に処理するマルチモーダル深層学習モデルを開発。動画コンテンツの理解と要約において高い性能を示した。',
    'https://example.com/papers/multimodal_video.pdf',
    'マルチモーダル学習で動画理解を高度化。映像・音声・テキストの統合処理で高性能。',
    'poster',
    (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_POSTER' LIMIT 1),
    '木村あゆみ',
    '筑波大学',
    '2025-09-21 13:00:00+09'
);

-- Link presentations to tags
INSERT INTO public.presentation_tags (presentation_id, tag_id) VALUES
-- Transformerモデルを用いた日本語文書要約の高精度化
('a1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = '自然言語処理')),
('a1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = '深層学習')),

-- グラフニューラルネットワークによるソーシャルネットワーク分析
('a2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = '機械学習')),
('a2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = '深層学習')),
('a2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = 'データマイニング')),

-- エッジコンピューティングにおける分散機械学習の最適化
('a3333333-3333-3333-3333-333333333333', (SELECT id FROM public.tags WHERE name = '機械学習')),
('a3333333-3333-3333-3333-333333333333', (SELECT id FROM public.tags WHERE name = 'IoT')),
('a3333333-3333-3333-3333-333333333333', (SELECT id FROM public.tags WHERE name = '組み込みシステム')),

-- ブロックチェーン技術を用いた分散型データ共有システム
('a4444444-4444-4444-4444-444444444444', (SELECT id FROM public.tags WHERE name = 'ブロックチェーン')),
('a4444444-4444-4444-4444-444444444444', (SELECT id FROM public.tags WHERE name = 'プライバシー保護')),

-- 時系列データベースにおけるクエリ最適化手法
('b1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = 'データベース')),
('b1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = 'クエリ最適化')),
('b1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = 'IoT')),

-- NoSQLデータベースにおけるトランザクション管理の新手法
('b2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = 'NoSQL')),
('b2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = 'データベース')),

-- 説明可能AI（XAI）による医療診断支援システム
('c1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = '深層学習')),
('c1111111-1111-1111-1111-111111111111', (SELECT id FROM public.tags WHERE name = '機械学習')),

-- 強化学習による自動運転制御の最適化
('c2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = '強化学習')),
('c2222222-2222-2222-2222-222222222222', (SELECT id FROM public.tags WHERE name = '深層学習')),

-- Few-shot学習による少量データでの画像分類
('c3333333-3333-3333-3333-333333333333', (SELECT id FROM public.tags WHERE name = '機械学習')),
('c3333333-3333-3333-3333-333333333333', (SELECT id FROM public.tags WHERE name = 'コンピュータビジョン')),

-- マルチモーダル学習による動画理解の深化
('c4444444-4444-4444-4444-444444444444', (SELECT id FROM public.tags WHERE name = '深層学習')),
('c4444444-4444-4444-4444-444444444444', (SELECT id FROM public.tags WHERE name = 'コンピュータビジョン')),
('c4444444-4444-4444-4444-444444444444', (SELECT id FROM public.tags WHERE name = '自然言語処理'));

COMMENT ON TABLE public.presentations IS 'Sample presentations with AI summaries have been seeded';
