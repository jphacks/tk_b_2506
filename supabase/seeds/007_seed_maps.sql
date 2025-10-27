-- Seed data for maps and map_regions tables
-- File: 007_seed_maps.sql
-- Description: Inserts sample map data and clickable regions linked to individual locations

-- Note: image_path is set to NULL initially. Upload map images via the admin interface and update the records afterwards.

-- ============================================
-- Maps for 情報処理学会 全国大会 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, location_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-11111111-0001-0001-0001-000000000001',
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.locations WHERE conference_id = '11111111-1111-1111-1111-111111111111' AND name = '第1ホール' LIMIT 1),
    '第1ホールマップ',
    NULL,
    1200,
    800,
    true
),
(
    'map-11111111-0002-0002-0002-000000000002',
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.locations WHERE conference_id = '11111111-1111-1111-1111-111111111111' AND name = 'ポスターエリアA' LIMIT 1),
    'ポスターエリアAマップ',
    NULL,
    1000,
    700,
    true
);

INSERT INTO public.map_regions (map_id, qr_code, label, shape_type, coords, z_index, is_active) VALUES
('map-11111111-0001-0001-0001-000000000001', 'QR_IPSJ2025_HALL1', '講演ステージ', 'rect', jsonb_build_object('x', 150, 'y', 120, 'width', 320, 'height', 220), 1, true),
('map-11111111-0001-0001-0001-000000000001', 'QR_IPSJ2025_HALL1_ZONE2', '展示ブース', 'rect', jsonb_build_object('x', 600, 'y', 160, 'width', 320, 'height', 240), 2, true);

INSERT INTO public.map_regions (map_id, qr_code, label, shape_type, coords, z_index, is_active) VALUES
('map-11111111-0002-0002-0002-000000000002', 'QR_IPSJ2025_POSTER_A', 'ポスターゾーンA', 'rect', jsonb_build_object('x', 120, 'y', 180, 'width', 350, 'height', 260), 1, true),
('map-11111111-0002-0002-0002-000000000002', 'QR_IPSJ2025_POSTER_A_ZONE2', 'ポスターゾーンB', 'rect', jsonb_build_object('x', 520, 'y', 180, 'width', 350, 'height', 260), 2, true);

-- ============================================
-- Maps for データベースシンポジウム 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, location_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-22222222-0001-0001-0001-000000000001',
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.locations WHERE conference_id = '22222222-2222-2222-2222-222222222222' AND name = '国際会議室A' LIMIT 1),
    '国際会議室Aマップ',
    NULL,
    1100,
    750,
    true
);

INSERT INTO public.map_regions (map_id, qr_code, label, shape_type, coords, z_index, is_active) VALUES
('map-22222222-0001-0001-0001-000000000001', 'QR_DBSYM2025_ROOM_A', '講演ステージ', 'polygon', jsonb_build_object('points', jsonb_build_array(
    jsonb_build_object('x', 200, 'y', 140),
    jsonb_build_object('x', 450, 'y', 140),
    jsonb_build_object('x', 450, 'y', 260),
    jsonb_build_object('x', 200, 'y', 260)
)), 1, true),
('map-22222222-0001-0001-0001-000000000001', 'QR_DBSYM2025_ROOM_A_ZONE2', '展示スペース', 'polygon', jsonb_build_object('points', jsonb_build_array(
    jsonb_build_object('x', 520, 'y', 180),
    jsonb_build_object('x', 820, 'y', 180),
    jsonb_build_object('x', 820, 'y', 320),
    jsonb_build_object('x', 520, 'y', 320)
)), 2, true);

-- ============================================
-- Maps for AI・機械学習フォーラム 2025
-- ============================================

INSERT INTO public.maps (id, conference_id, location_id, name, image_path, image_width, image_height, is_active) VALUES
(
    'map-33333333-0001-0001-0001-000000000001',
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM public.locations WHERE conference_id = '33333333-3333-3333-3333-333333333333' AND name = 'メインホール' LIMIT 1),
    'メインホールマップ',
    NULL,
    1300,
    880,
    true
);

INSERT INTO public.map_regions (map_id, qr_code, label, shape_type, coords, z_index, is_active) VALUES
('map-33333333-0001-0001-0001-000000000001', 'QR_AIFORUM2025_MAIN', '中央ステージ', 'circle', jsonb_build_object('cx', 520, 'cy', 420, 'r', 210), 1, true),
('map-33333333-0001-0001-0001-000000000001', 'QR_AIFORUM2025_MAIN_ZONE2', '展示エリア', 'rect', jsonb_build_object('x', 880, 'y', 260, 'width', 260, 'height', 220), 2, true);

COMMENT ON TABLE public.maps IS 'Sample venue maps linked to locations have been seeded';
COMMENT ON TABLE public.map_regions IS 'Sample clickable regions (with QR codes) have been seeded';

-- Instructions for updating image_path after uploading to Storage:
-- 1. Upload map images to Supabase Storage "maps" bucket via the admin interface
-- 2. Obtain the storage path (e.g., maps/ipsj2025/hall.png)
-- 3. Run UPDATE queries such as:
--    UPDATE public.maps SET image_path = 'maps/ipsj2025/hall.png'
--    WHERE id = 'map-11111111-0001-0001-0001-000000000001';
