-- Seed data for locations table
-- File: 002_seed_locations.sql
-- Description: Inserts sample location data with QR codes and map coordinates for each conference

-- Locations for 情報処理学会 全国大会 2025
-- Note: map_url will be set to NULL initially. Upload a map image via admin interface and update the records.
-- Coordinates (map_x, map_y) are normalized values between 0 and 1, representing position on the map image.
INSERT INTO public.locations (conference_id, name, description, qr_code, floor, building, location_type, map_x, map_y) VALUES
('11111111-1111-1111-1111-111111111111', '第1ホール', 'メイン会場。口頭発表が行われます', 'QR_IPSJ2025_HALL1', '5F', 'ホールA', 'hall', 0.3, 0.2),
('11111111-1111-1111-1111-111111111111', '第2ホール', 'サブ会場。並行セッション用', 'QR_IPSJ2025_HALL2', '5F', 'ホールB', 'hall', 0.7, 0.2),
('11111111-1111-1111-1111-111111111111', 'ポスターエリアA', 'ポスター発表エリア（午前の部）', 'QR_IPSJ2025_POSTER_A', '4F', 'ホールA', 'poster_area', 0.3, 0.5),
('11111111-1111-1111-1111-111111111111', 'ポスターエリアB', 'ポスター発表エリア（午後の部）', 'QR_IPSJ2025_POSTER_B', '4F', 'ホールB', 'poster_area', 0.7, 0.5),
('11111111-1111-1111-1111-111111111111', 'ロビー', '受付・休憩エリア', 'QR_IPSJ2025_LOBBY', '1F', 'メイン棟', 'lobby', 0.5, 0.8),
('11111111-1111-1111-1111-111111111111', 'レストランエリア', '食事スペース', 'QR_IPSJ2025_RESTAURANT', 'B1F', 'メイン棟', 'restaurant', 0.2, 0.9),

-- Locations for データベースシンポジウム 2025
('22222222-2222-2222-2222-222222222222', '国際会議室A', 'メインホール', 'QR_DBSYM2025_ROOM_A', '3F', '本館', 'hall', 0.4, 0.3),
('22222222-2222-2222-2222-222222222222', '国際会議室B', '分科会会場', 'QR_DBSYM2025_ROOM_B', '3F', '本館', 'hall', 0.6, 0.3),
('22222222-2222-2222-2222-222222222222', 'ポスターホール', 'ポスターセッション会場', 'QR_DBSYM2025_POSTER', '2F', '本館', 'poster_area', 0.5, 0.5),
('22222222-2222-2222-2222-222222222222', 'エントランスホール', '受付・交流スペース', 'QR_DBSYM2025_ENTRANCE', '1F', '本館', 'lobby', 0.5, 0.7),
('22222222-2222-2222-2222-222222222222', 'カフェテリア', '休憩・食事エリア', 'QR_DBSYM2025_CAFE', '1F', '別館', 'restaurant', 0.8, 0.8),

-- Locations for AI・機械学習フォーラム 2025
('33333333-3333-3333-3333-333333333333', 'メインホール', 'キーノート・招待講演会場', 'QR_AIFORUM2025_MAIN', '1F', 'ホール棟', 'hall', 0.5, 0.3),
('33333333-3333-3333-3333-333333333333', 'セッションルーム1', '機械学習セッション', 'QR_AIFORUM2025_SESSION1', '2F', '会議棟', 'hall', 0.3, 0.4),
('33333333-3333-3333-3333-333333333333', 'セッションルーム2', 'ディープラーニングセッション', 'QR_AIFORUM2025_SESSION2', '2F', '会議棟', 'hall', 0.7, 0.4),
('33333333-3333-3333-3333-333333333333', 'ポスター展示場', 'ポスター発表・デモンストレーション', 'QR_AIFORUM2025_POSTER', '3F', '展示棟', 'poster_area', 0.5, 0.6),
('33333333-3333-3333-3333-333333333333', 'エントランス', '総合受付', 'QR_AIFORUM2025_ENTRANCE', '1F', 'ホール棟', 'lobby', 0.5, 0.8),
('33333333-3333-3333-3333-333333333333', 'フードコート', '飲食エリア', 'QR_AIFORUM2025_FOOD', '4F', 'ホール棟', 'restaurant', 0.2, 0.2);

COMMENT ON TABLE public.locations IS 'Sample locations with QR codes have been seeded';
