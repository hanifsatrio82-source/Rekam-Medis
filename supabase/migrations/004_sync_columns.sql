-- ─── Migration 004: Sync schema dengan code ───────────────────────────────
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom kode ke actions (dipakai di form master tindakan)
ALTER TABLE actions ADD COLUMN IF NOT EXISTS kode TEXT;

-- 2. Rename fees.jenis → fees.jenis_tarif (code menggunakan jenis_tarif)
--    Gunakan IF EXISTS agar safe jika sudah di-rename sebelumnya
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fees' AND column_name = 'jenis'
  ) THEN
    ALTER TABLE fees RENAME COLUMN jenis TO jenis_tarif;
  END IF;
END$$;

-- 3. Tambah metode_pembayaran ke payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metode_pembayaran TEXT DEFAULT 'TUNAI';

-- 4. Tambah FK clinical_notes.fee_id → fees.id (saat ini tidak ada FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clinical_notes_fee_id_fkey'
  ) THEN
    ALTER TABLE clinical_notes
      ADD CONSTRAINT clinical_notes_fee_id_fkey
      FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 5. Tambah GIN trigram index untuk pencarian pasien (ilike %x%)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_patients_nama_trgm
  ON patients USING GIN (nama gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_no_rm_trgm
  ON patients USING GIN (no_rm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_no_hp_trgm
  ON patients USING GIN (no_hp gin_trgm_ops);

-- 6. Tambah GIN trigram index untuk pencarian diagnosa ICD-10 (ilike %x%)
CREATE INDEX IF NOT EXISTS idx_diagnoses_kode_trgm
  ON diagnoses USING GIN (kode gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_diagnoses_nama_trgm
  ON diagnoses USING GIN (nama gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_diagnoses_nama_en_trgm
  ON diagnoses USING GIN (nama_en gin_trgm_ops);

-- 7. Tambah index visits.created_at untuk query filter tanggal harian
CREATE INDEX IF NOT EXISTS idx_visits_created_at
  ON visits (created_at);

-- 8. Update VISIT_SELECT query: tambah metode_pembayaran ke payments select
--    (tidak ada SQL untuk ini — perubahan ada di api.ts VISIT_SELECT)
