-- ═══════════════════════════════════════════════════════
-- 鼎瑋官網 — 需求留言表（第二次增補腳本）
-- 使用方式：Supabase 後台 → SQL Editor → 貼上全部 → Run
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dw_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,                 -- buy（想買）/ rent（想租）/ sell（委託出售）
  name TEXT NOT NULL,                 -- 稱呼
  phone TEXT NOT NULL,                -- 聯絡電話（前台看板僅顯示隱碼）
  content TEXT NOT NULL,              -- 需求內容
  status TEXT DEFAULT 'open',        -- open（待處理）/ done（已處理）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dw_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "dw_messages_all" ON dw_messages
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON dw_messages TO anon, authenticated;
