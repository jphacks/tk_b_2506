-- Seed data for user features (interests and saved presentations)
-- File: 006_seed_user_features.sql
-- Description: Creates sample user interests and saved presentations

-- IMPORTANT: This script requires at least one user in auth.users table
-- Make sure you have created at least one user in Supabase Auth before running this

-- Create user interests and saved presentations using the first user
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

    -- Create user interests (link users to tags they're interested in)
    INSERT INTO public.user_interests (user_id, tag_id) VALUES
    -- User interested in NLP and machine learning
    (first_user_id, (SELECT id FROM public.tags WHERE name = '自然言語処理')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = '深層学習')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = '機械学習')),

    -- User interested in data mining and networks
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'データマイニング')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'ネットワーク')),

    -- User interested in IoT and edge computing
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'IoT')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = '組み込みシステム')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'クラウドコンピューティング')),

    -- User interested in blockchain and security
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'ブロックチェーン')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'サイバーセキュリティ')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = 'プライバシー保護')),
    (first_user_id, (SELECT id FROM public.tags WHERE name = '暗号技術'));

    -- Create saved presentations (users bookmarking poster presentations)
    INSERT INTO public.saved_presentations (user_id, presentation_id, notes) VALUES
    (
        first_user_id,
        'a3333333-3333-3333-3333-333333333333',  -- エッジコンピューティングにおける分散機械学習の最適化
        '自分の研究にも応用できそう。実装詳細を後で確認する。'
    ),
    (
        first_user_id,
        'c3333333-3333-3333-3333-333333333333',  -- Few-shot学習による少量データでの画像分類
        'Few-shot学習の手法が参考になる。論文を読んで実装してみたい。'
    ),
    (
        first_user_id,
        'b2222222-2222-2222-2222-222222222222',  -- NoSQLデータベースにおけるトランザクション管理の新手法
        'NoSQLのトランザクション管理、参考にしたい。'
    ),
    (
        first_user_id,
        'a4444444-4444-4444-4444-444444444444',  -- ブロックチェーン技術を用いた分散型データ共有システム
        'プライバシー保護の実装方法を詳しく知りたい。後で論文を読む。'
    ),
    (
        first_user_id,
        'c4444444-4444-4444-4444-444444444444',  -- マルチモーダル学習による動画理解の深化
        'セキュリティ監視システムに応用できそう。'
    );
END $$;

-- Note: The script above automatically uses the first user from auth.users
-- If you want to test with different users, you can manually insert more records:
--
-- Get user IDs first:
-- SELECT id, email FROM auth.users;
--
-- Then insert specific user interests:
-- INSERT INTO public.user_interests (user_id, tag_id)
-- VALUES ('specific-user-id', (SELECT id FROM public.tags WHERE name = 'タグ名'));

COMMENT ON TABLE public.user_interests IS 'Sample user interests have been seeded';
COMMENT ON TABLE public.saved_presentations IS 'Sample saved presentations have been seeded';
