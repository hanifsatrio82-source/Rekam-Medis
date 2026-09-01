-- Tambah kolom kode ke fees
ALTER TABLE fees ADD COLUMN IF NOT EXISTS kode TEXT;
