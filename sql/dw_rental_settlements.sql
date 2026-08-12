-- 鼎瑋不動產 — 代租代管屋主結算
-- 此資料含屋主姓名與租金金額，只能由受 Cloudflare 登入保護的後台代理使用。

CREATE TABLE IF NOT EXISTS public.dw_management_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  listing_id UUID REFERENCES public.dw_listings(id) ON DELETE SET NULL,
  default_electricity_rate NUMERIC(10,4) NOT NULL DEFAULT 6.5 CHECK (default_electricity_rate >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dw_management_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.dw_management_projects(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  owner_code TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dw_management_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.dw_management_projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.dw_management_owners(id) ON DELETE CASCADE,
  billing_roc_year SMALLINT NOT NULL CHECK (billing_roc_year BETWEEN 1 AND 999),
  billing_month SMALLINT NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
  electricity_rate NUMERIC(10,4) NOT NULL DEFAULT 6.5 CHECK (electricity_rate >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dw_management_statement_month_unique UNIQUE (owner_id, billing_roc_year, billing_month)
);

CREATE TABLE IF NOT EXISTS public.dw_management_statement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.dw_management_statements(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  lease_roc_year SMALLINT CHECK (lease_roc_year BETWEEN 1 AND 999),
  lease_month SMALLINT CHECK (lease_month BETWEEN 1 AND 12),
  lease_day SMALLINT CHECK (lease_day BETWEEN 1 AND 31),
  unit_no TEXT NOT NULL DEFAULT '',
  electricity_kwh NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (electricity_kwh >= 0),
  electricity_fee_override NUMERIC(12,2),
  rent_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
  management_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (management_fee >= 0),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 適用於已先建立資料表的既有專案：保留已核對的歷史人工電費。
ALTER TABLE public.dw_management_statement_units
  ADD COLUMN IF NOT EXISTS electricity_fee_override NUMERIC(12,2);

CREATE INDEX IF NOT EXISTS dw_management_owners_project_idx ON public.dw_management_owners(project_id);
CREATE INDEX IF NOT EXISTS dw_management_statements_project_idx ON public.dw_management_statements(project_id, billing_roc_year DESC, billing_month DESC);
CREATE INDEX IF NOT EXISTS dw_management_statement_units_statement_idx ON public.dw_management_statement_units(statement_id, sort_order);

CREATE OR REPLACE FUNCTION public.dw_management_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dw_management_projects_touch_updated_at ON public.dw_management_projects;
CREATE TRIGGER dw_management_projects_touch_updated_at BEFORE UPDATE ON public.dw_management_projects FOR EACH ROW EXECUTE FUNCTION public.dw_management_touch_updated_at();
DROP TRIGGER IF EXISTS dw_management_statements_touch_updated_at ON public.dw_management_statements;
CREATE TRIGGER dw_management_statements_touch_updated_at BEFORE UPDATE ON public.dw_management_statements FOR EACH ROW EXECUTE FUNCTION public.dw_management_touch_updated_at();
DROP TRIGGER IF EXISTS dw_management_statement_units_touch_updated_at ON public.dw_management_statement_units;
CREATE TRIGGER dw_management_statement_units_touch_updated_at BEFORE UPDATE ON public.dw_management_statement_units FOR EACH ROW EXECUTE FUNCTION public.dw_management_touch_updated_at();

-- This data contains owners' personal and financial information. It is not public API data.
ALTER TABLE public.dw_management_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dw_management_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dw_management_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dw_management_statement_units ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dw_management_projects, public.dw_management_owners, public.dw_management_statements, public.dw_management_statement_units FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.dw_management_projects, public.dw_management_owners, public.dw_management_statements, public.dw_management_statement_units TO service_role;
