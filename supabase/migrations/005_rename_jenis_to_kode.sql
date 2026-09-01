-- Rename fees.jenis_tarif → fees.kode
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fees' AND column_name = 'jenis_tarif'
  ) THEN
    ALTER TABLE fees RENAME COLUMN jenis_tarif TO kode;
  END IF;
END$$;