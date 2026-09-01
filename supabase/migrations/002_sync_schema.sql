-- ─────────────────────────────────────────────────────────────────────────────
-- 002_sync_schema.sql
-- Sinkronisasi schema dengan perubahan aplikasi yang telah dilakukan
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tambah kolom alergi ke patients
--    (digunakan di rekam-medis untuk badge peringatan alergi)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS alergi TEXT;

-- 2. Fix FK visits.patient_id — tambah ON DELETE CASCADE
--    Sebelumnya tidak ada CASCADE sehingga hapus pasien gagal dengan error 409
--    jika pasien masih memiliki riwayat kunjungan
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_patient_id_fkey;

ALTER TABLE visits
  ADD CONSTRAINT visits_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES patients(id)
    ON DELETE CASCADE;

-- 3. Pastikan payments kolom sudah sesuai dengan yang digunakan aplikasi
--    (diskon_tipe, diskon_nilai, diskon_nominal, subtotal, total)
--    Schema 001 sudah benar — tidak perlu perubahan

-- 4. Pastikan clinical_notes kolom sudah lengkap
--    (tekanan_darah TEXT, hr INTEGER, rr INTEGER, spo2 NUMERIC, suhu NUMERIC,
--     tb NUMERIC, bb NUMERIC, catatan_subjektif TEXT, catatan_pemeriksaan_fisik TEXT,
--     edukasi TEXT, keluhan_utama TEXT)
--    Schema 001 sudah benar — tidak perlu perubahan
