-- 鼎瑋不動產說明書／售租屋資料
-- 在 Supabase → SQL Editor 貼上並執行一次。
-- 注意：目前後台是「測試階段免登入」，因此此表的 anon 測試權限只適合測試資料。
-- 正式填寫屋主、買方等個資前，請先恢復 Supabase Auth，並將 anon 政策移除。

CREATE TABLE IF NOT EXISTS dw_property_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL UNIQUE REFERENCES dw_listings(id) ON DELETE CASCADE,
  sno TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dw_property_files ENABLE ROW LEVEL SECURITY;

-- 測試階段：後台免登入才需要此政策。正式上線務必改成 authenticated + 使用者歸屬條件。
DO $$ BEGIN
  CREATE POLICY "dw_property_files_test_access" ON dw_property_files
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON dw_property_files TO anon, authenticated;

-- 讓資料更新時間隨儲存同步更新。
CREATE OR REPLACE FUNCTION public.dw_touch_property_file_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dw_property_files_touch_updated_at ON dw_property_files;
CREATE TRIGGER dw_property_files_touch_updated_at
  BEFORE UPDATE ON dw_property_files
  FOR EACH ROW EXECUTE FUNCTION public.dw_touch_property_file_updated_at();
