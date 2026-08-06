-- ═══════════════════════════════════════════════════════
-- 鼎瑋不動產官網 — Supabase 資料庫建立腳本
-- 使用方式：Supabase 後台 → SQL Editor → 貼上全部 → Run
-- （與譽誠平台共用同一個專案，表名以 dw_ 前綴區隔）
-- ═══════════════════════════════════════════════════════

-- ══ 1. 物件表 ══
CREATE TABLE IF NOT EXISTS dw_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sno TEXT UNIQUE NOT NULL,           -- 物件編號（舊站沿用，新增自動產生）
  deal TEXT NOT NULL,                 -- sell（售）/ rent（租）
  status TEXT DEFAULT 'active',       -- active（上架中）/ unlisted（已下架）
  name TEXT NOT NULL,                 -- 案名
  district TEXT DEFAULT '',           -- 區域（蘆竹、桃園…）
  kind TEXT DEFAULT '',               -- 種類（住宅大樓、透天厝…）
  price NUMERIC DEFAULT 0,            -- 售：總價(萬)；租：月租(萬)
  size NUMERIC DEFAULT 0,             -- 坪數
  unit TEXT DEFAULT '',               -- 單價(萬/坪)，售屋用
  parking BOOLEAN DEFAULT false,      -- 含車位
  address TEXT DEFAULT '',            -- 案址
  layout TEXT DEFAULT '',             -- 格局 3房2廳2衛
  floor TEXT DEFAULT '',              -- 樓別
  age TEXT DEFAULT '',                -- 屋齡
  pitch JSONB DEFAULT '[]',           -- 訴求重點（字串陣列）
  spec JSONB DEFAULT '{}',            -- 其他規格（鍵值對）
  lat TEXT DEFAULT '',
  lng TEXT DEFAULT '',
  photos JSONB DEFAULT '[]',          -- 照片（檔名=舊照片 / 完整網址=新上傳）
  videos JSONB DEFAULT '[]',          -- 影片（Supabase Storage 公開網址）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dw_listings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "dw_listings_all" ON dw_listings
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON dw_listings TO anon, authenticated;

-- ══ 2. 照片儲存桶（公開讀取）══
INSERT INTO storage.buckets (id, name, public)
VALUES ('dw-photos', 'dw-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "dw_photos_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'dw-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "dw_photos_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'dw-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "dw_photos_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'dw-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "dw_photos_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'dw-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
