-- 009: tambah role 'god' (kontrol penuh) ke CHECK constraint profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('god','owner','admin','dokter','staff','kasir','farmasi'));

-- Aktifkan semua akun yang sudah ada jadi role god (penuh kendali)
UPDATE profiles SET role = 'god', updated_at = NOW() WHERE is_active = TRUE;
