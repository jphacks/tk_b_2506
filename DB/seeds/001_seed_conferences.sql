-- Seed data for conferences table
-- File: 001_seed_conferences.sql
-- Description: Inserts sample conference data

-- Note: created_by should be replaced with actual user UUIDs from auth.users
-- You can get user IDs by running: SELECT id, email FROM auth.users;

INSERT INTO public.conferences (id, name, description, start_date, end_date, location, is_active, created_by, join_password) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '情報処理学会 全国大会 2025',
    '情報処理学会の全国大会。コンピュータサイエンスの最新研究成果が発表されます。',
    '2025-03-15',
    '2025-03-17',
    '東京国際フォーラム',
    true,
    NULL,  -- Replace with actual user ID: (SELECT id FROM auth.users LIMIT 1)
    'IPSJ2025'  -- Join password
),
(
    '22222222-2222-2222-2222-222222222222',
    'データベースシンポジウム 2025',
    'データベース技術に関する国内最大級のシンポジウム。最新のDB技術とアプリケーションを紹介。',
    '2025-06-10',
    '2025-06-12',
    '京都国際会館',
    true,
    NULL,  -- Replace with actual user ID
    'DBSYM2025'  -- Join password
),
(
    '33333333-3333-3333-3333-333333333333',
    'AI・機械学習フォーラム 2025',
    '人工知能と機械学習の最新動向を共有するフォーラム。産学連携の場としても活用されます。',
    '2025-09-20',
    '2025-09-22',
    'パシフィコ横浜',
    true,
    NULL,  -- Replace with actual user ID
    'AIFORUM2025'  -- Join password
),
(
    '44444444-4444-4444-4444-444444444444',
    'セキュリティ・キャンプ全国大会 2024',
    '過去の学会データとしてのサンプル（終了済み）',
    '2024-08-10',
    '2024-08-14',
    'クロス・ウェーブ府中',
    false,
    NULL,
    'SECCAMP2024'  -- Join password
);

-- Update created_by with actual user IDs (run this after getting user IDs)
-- UPDATE public.conferences SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;

COMMENT ON TABLE public.conferences IS 'Sample conferences have been seeded';
