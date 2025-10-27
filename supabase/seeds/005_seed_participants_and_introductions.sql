-- Seed data for participants and introductions
-- File: 005_seed_participants_and_introductions.sql
-- Description: Creates sample user introductions and participant records

-- IMPORTANT: This script requires actual user IDs from auth.users table
-- Before running this script, you need to:
-- 1. Create users in Supabase Auth (via sign-up or Supabase dashboard)
-- 2. Get their user IDs by running: SELECT id, email FROM auth.users;
-- 3. Replace the placeholder UUIDs below with actual user IDs

-- Example: Create sample introductions
-- Note: created_by should match actual user IDs from auth.users

INSERT INTO public.introductions (id, name, affiliation, research_topic, interests, one_liner, occupation, is_public, created_by) VALUES
(
    'aa111111-1111-1111-1111-111111111111',
    '山田太郎',
    '東京大学大学院',
    '自然言語処理',
    '機械翻訳, 文書要約, Transformer',
    '最新のNLP技術で社会課題を解決したい！',
    '博士課程',
    true,
    NULL  -- Replace with actual user ID
),
(
    'aa222222-2222-2222-2222-222222222222',
    '佐藤花子',
    '京都大学',
    'グラフ理論とネットワーク分析',
    'ソーシャルネットワーク, グラフニューラルネットワーク, データマイニング',
    'データで人と人との繋がりを可視化します',
    '修士課程',
    true,
    NULL  -- Replace with actual user ID
),
(
    'aa333333-3333-3333-3333-333333333333',
    '鈴木一郎',
    '大阪大学',
    'エッジコンピューティング',
    'IoT, 分散機械学習, 組み込みシステム',
    'エッジでスマートな世界を実現',
    '博士課程',
    true,
    NULL
),
(
    'aa444444-4444-4444-4444-444444444444',
    '田中美咲',
    '慶應義塾大学',
    'ブロックチェーン応用',
    'セキュリティ, プライバシー保護, 分散システム',
    '安全な情報共有の仕組みを研究中',
    '修士課程',
    true,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    affiliation = EXCLUDED.affiliation,
    research_topic = EXCLUDED.research_topic,
    interests = EXCLUDED.interests,
    one_liner = EXCLUDED.one_liner,
    occupation = EXCLUDED.occupation,
    is_public = EXCLUDED.is_public;

-- Create participant records linking users to conferences
-- Note: This automatically uses the first available user from auth.users
-- Make sure you have at least one user created in Supabase Auth before running this

-- Get the first user ID for use in participants
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;

    -- Check if user exists
    IF first_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in auth.users. Please create at least one user first.';
    END IF;

    -- Insert participants using the first user
    -- Note: Only one participant per (user_id, conference_id) is allowed due to UNIQUE constraint
    -- For the same conference, we'll use the first introduction
    INSERT INTO public.participants (id, user_id, conference_id, introduction_id, current_location_id) VALUES
    -- 情報処理学会 全国大会 2025 の参加者（同じユーザー、同じカンファレンスは1回のみ）
    (
        'bb111111-1111-1111-1111-111111111111',
        first_user_id,
        '11111111-1111-1111-1111-111111111111',
        'aa111111-1111-1111-1111-111111111111',
        (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_LOBBY' LIMIT 1)
    ),

    -- データベースシンポジウム 2025 の参加者
    (
        'bb444444-4444-4444-4444-444444444444',
        first_user_id,
        '22222222-2222-2222-2222-222222222222',
        'aa222222-2222-2222-2222-222222222222',
        (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_ENTRANCE' LIMIT 1)
    ),

    -- AI・機械学習フォーラム 2025 の参加者
    (
        'bb555555-5555-5555-5555-555555555555',
        first_user_id,
        '33333333-3333-3333-3333-333333333333',
        'aa111111-1111-1111-1111-111111111111',
        (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_ENTRANCE' LIMIT 1)
    )
    ON CONFLICT (user_id, conference_id) DO UPDATE SET
        introduction_id = EXCLUDED.introduction_id,
        current_location_id = EXCLUDED.current_location_id,
        updated_at = NOW();

    -- Also update introductions created_by with the user ID
    UPDATE public.introductions
    SET created_by = first_user_id
    WHERE id IN (
        'aa111111-1111-1111-1111-111111111111',
        'aa222222-2222-2222-2222-222222222222',
        'aa333333-3333-3333-3333-333333333333',
        'aa444444-4444-4444-4444-444444444444'
    );
END $$;

-- Create QR scan history (participant_locations)
-- Note: Only creating location history for existing participants
INSERT INTO public.participant_locations (participant_id, location_id, scanned_at) VALUES
-- 山田太郎の移動履歴 (bb111111 - 情報処理学会)
('bb111111-1111-1111-1111-111111111111', (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_LOBBY'), '2025-03-15 09:00:00+09'),
('bb111111-1111-1111-1111-111111111111', (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_HALL1'), '2025-03-15 10:00:00+09'),
('bb111111-1111-1111-1111-111111111111', (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_RESTAURANT'), '2025-03-15 12:00:00+09'),
('bb111111-1111-1111-1111-111111111111', (SELECT id FROM public.locations WHERE qr_code = 'QR_IPSJ2025_POSTER_A'), '2025-03-15 14:00:00+09'),

-- 佐藤花子の移動履歴 (bb444444 - データベースシンポジウム)
('bb444444-4444-4444-4444-444444444444', (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_ENTRANCE'), '2025-06-10 09:00:00+09'),
('bb444444-4444-4444-4444-444444444444', (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_ROOM_A'), '2025-06-10 10:00:00+09'),
('bb444444-4444-4444-4444-444444444444', (SELECT id FROM public.locations WHERE qr_code = 'QR_DBSYM2025_CAFE'), '2025-06-10 12:00:00+09'),

-- 山田太郎の移動履歴 (bb555555 - AI・機械学習フォーラム)
('bb555555-5555-5555-5555-555555555555', (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_ENTRANCE'), '2025-09-20 09:00:00+09'),
('bb555555-5555-5555-5555-555555555555', (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_MAIN'), '2025-09-20 10:00:00+09'),
('bb555555-5555-5555-5555-555555555555', (SELECT id FROM public.locations WHERE qr_code = 'QR_AIFORUM2025_SESSION1'), '2025-09-20 13:00:00+09');

-- Note: The script above automatically uses the first user from auth.users
-- If you want to use different users for different participants, you can manually update:
--
-- Get user IDs first:
-- SELECT id, email FROM auth.users;
--
-- Then update specific participants:
-- UPDATE public.participants SET user_id = 'specific-user-id' WHERE id = 'bb111111-1111-1111-1111-111111111111';
-- UPDATE public.introductions SET created_by = 'specific-user-id' WHERE id = 'aa111111-1111-1111-1111-111111111111';

COMMENT ON TABLE public.participants IS 'Sample participants with location history have been seeded';
