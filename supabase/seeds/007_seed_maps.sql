-- Seed data for maps and map_regions tables
-- File: 007_seed_maps.sql
-- Description: Inserts sample map data and clickable regions for conference venues

-- Note: image_path is set to NULL initially. Upload map images via admin interface and update the records.
-- After uploading maps to Supabase Storage 'maps' bucket, update the image_path with the actual path.

-- ============================================
-- Maps for 情報処理学会 全国大会 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-11111111-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '東京国際フォーラム 5F',
    NULL,  -- Will be updated after uploading to Storage: 'maps/ipsj2025/floor-5f.png'
    1200,
    800,
    true
),
(
    'map-11111111-0002-0002-0002-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '東京国際フォーラム 4F',
    NULL,  -- Will be updated after uploading to Storage: 'maps/ipsj2025/floor-4f.png'
    1200,
    800,
    true
);

-- Map regions for 5F (第1ホール, 第2ホール)
INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-11111111-0001-0001-0001-000000000001',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 100,
        'y', 100,
        'width', 300,
        'height', 200
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_IPSJ2025_HALL1';

INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-11111111-0001-0001-0001-000000000001',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 700,
        'y', 100,
        'width', 300,
        'height', 200
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_IPSJ2025_HALL2';

-- Map regions for 4F (ポスターエリアA, B)
INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-11111111-0002-0002-0002-000000000002',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 150,
        'y', 200,
        'width', 400,
        'height', 300
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_IPSJ2025_POSTER_A';

INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-11111111-0002-0002-0002-000000000002',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 650,
        'y', 200,
        'width', 400,
        'height', 300
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_IPSJ2025_POSTER_B';

-- ============================================
-- Maps for データベースシンポジウム 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-22222222-0001-0001-0001-000000000001',
    '22222222-2222-2222-2222-222222222222',
    '京都国際会館 本館',
    NULL,  -- Will be updated after uploading to Storage: 'maps/dbsym2025/main-building.png'
    1000,
    700,
    true
);

-- Map regions for 本館
INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-22222222-0001-0001-0001-000000000001',
    id,
    name,
    'polygon',
    jsonb_build_object(
        'points', jsonb_build_array(
            jsonb_build_object('x', 200, 'y', 150),
            jsonb_build_object('x', 450, 'y', 150),
            jsonb_build_object('x', 450, 'y', 300),
            jsonb_build_object('x', 200, 'y', 300)
        )
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_DBSYM2025_ROOM_A';

INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-22222222-0001-0001-0001-000000000001',
    id,
    name,
    'polygon',
    jsonb_build_object(
        'points', jsonb_build_array(
            jsonb_build_object('x', 550, 'y', 150),
            jsonb_build_object('x', 800, 'y', 150),
            jsonb_build_object('x', 800, 'y', 300),
            jsonb_build_object('x', 550, 'y', 300)
        )
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_DBSYM2025_ROOM_B';

-- ============================================
-- Maps for AI・機械学習フォーラム 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-33333333-0001-0001-0001-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'パシフィコ横浜 会議棟',
    NULL,  -- Will be updated after uploading to Storage: 'maps/aiforum2025/conference-building.png'
    1400,
    900,
    true
);

-- Map regions for 会議棟
INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-33333333-0001-0001-0001-000000000001',
    id,
    name,
    'circle',
    jsonb_build_object(
        'cx', 500,
        'cy', 450,
        'r', 200
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_AIFORUM2025_MAIN';

INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-33333333-0001-0001-0001-000000000001',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 100,
        'y', 200,
        'width', 250,
        'height', 150
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_AIFORUM2025_SESSION1';

INSERT INTO public.map_regions (map_id, location_id, label, shape_type, coords, z_index, is_active)
SELECT
    'map-33333333-0001-0001-0001-000000000001',
    id,
    name,
    'rect',
    jsonb_build_object(
        'x', 900,
        'y', 200,
        'width', 250,
        'height', 150
    ),
    1,
    true
FROM public.locations
WHERE qr_code = 'QR_AIFORUM2025_SESSION2';

COMMENT ON TABLE public.maps IS 'Sample venue maps have been seeded';
COMMENT ON TABLE public.map_regions IS 'Sample clickable regions have been seeded';

-- Instructions for updating image_path after uploading to Storage:
-- 1. Upload map images to Supabase Storage 'maps' bucket via admin interface
-- 2. Get the public URL or storage path
-- 3. Run UPDATE queries like:
--    UPDATE public.maps SET image_path = 'maps/ipsj2025/floor-5f.png'
--    WHERE id = 'map-11111111-0001-0001-0001-000000000001';
