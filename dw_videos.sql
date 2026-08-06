-- 鼎瑋不動產：影片功能資料庫升級
-- 已建立 dw_listings 的專案，請在 Supabase → SQL Editor 貼上並執行本檔一次。
-- 影片與照片共用既有的 dw-photos Storage bucket，不需要新建 bucket。

ALTER TABLE dw_listings
  ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]';

GRANT ALL ON dw_listings TO anon, authenticated;
