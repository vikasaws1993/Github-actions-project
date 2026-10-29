-- ============================================================================
-- Migration 001: Add Localized JSONB and Canonical Code Columns
-- Non-destructive schema additions for ArogyaMitra Multilingual Master Data
-- ============================================================================

-- 1. Districts Master Table
-- Adds canonical alpha code (e.g. 'MH-PUN') and localized names JSONB ({ en, mr, hi })
-- Preserves existing LGD district_code (e.g. '490') unchanged
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_districts_code ON public.districts(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_districts_names_gin ON public.districts USING gin (names);

-- 2. Talukas Master Table
-- Adds canonical alpha code (e.g. 'MH-PUN-HAV') and localized names JSONB ({ en, mr, hi })
-- Preserves existing LGD subdistrict_code (e.g. '4201') and district_code FK unchanged
ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS code VARCHAR(30);
ALTER TABLE public.talukas ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_talukas_code ON public.talukas(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_talukas_names_gin ON public.talukas USING gin (names);

-- 3. Healthcare Schemes Master Table
-- Adds multilingual names, subtitles, and descriptions JSONB
-- Preserves existing scheme_code ('PMJAY', 'MJPJAY', etc.) and name strings
ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS subtitles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.schemes ADD COLUMN IF NOT EXISTS descriptions JSONB DEFAULT '{}'::jsonb;

-- 4. Hospitals Master Table
-- Adds multilingual names JSONB
-- Preserves existing hospital_number, registration_number, district_id UUID, taluka_id UUID
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS names JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_hospitals_names_gin ON public.hospitals USING gin (names);

-- 5. Citizens Table
-- Ensures district_id and taluka_id UUID foreign keys exist and are properly indexed
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL;
ALTER TABLE public.citizens ADD COLUMN IF NOT EXISTS taluka_id UUID REFERENCES public.talukas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_citizens_district_id ON public.citizens(district_id) WHERE district_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_citizens_taluka_id ON public.citizens(taluka_id) WHERE taluka_id IS NOT NULL;

-- 6. Applications Table
-- Ensures district_id and taluka_id references can be captured
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS taluka_id UUID REFERENCES public.talukas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_district_id ON public.applications(district_id) WHERE district_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_taluka_id ON public.applications(taluka_id) WHERE taluka_id IS NOT NULL;
