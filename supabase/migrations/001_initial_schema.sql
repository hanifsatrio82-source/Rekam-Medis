-- Enable UUID extension


CREATE TABLE practice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_praktik TEXT NOT NULL DEFAULT 'Praktik Dokter',
  alamat TEXT, no_telepon TEXT,
  nama_dokter TEXT NOT NULL DEFAULT 'dr. Nama Dokter',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO practice_settings (nama_praktik, nama_dokter) VALUES ('Praktik Dokter Umum', 'dr. Nama Dokter');

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_rm TEXT UNIQUE NOT NULL, nama TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('LAKI_LAKI', 'PEREMPUAN')),
  tanggal_lahir DATE, penanggung_jawab TEXT, nik TEXT, no_hp TEXT, alamat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_patients_no_rm ON patients(no_rm);
CREATE INDEX idx_patients_nama ON patients(nama);
CREATE INDEX idx_patients_nik ON patients(nik);
CREATE INDEX idx_patients_no_hp ON patients(no_hp);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_kunjungan TEXT UNIQUE NOT NULL, no_antrean INTEGER NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'MENUNGGU_SKRINING'
    CHECK (status IN ('MENUNGGU_SKRINING','MENUNGGU_DOKTER','SEDANG_DIPERIKSA','MENUNGGU_OBAT','MENUNGGU_PEMBAYARAN','SELESAI','BATAL')),
  tanggal_kunjungan DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_tanggal ON visits(tanggal_kunjungan);
CREATE INDEX idx_visits_status ON visits(status);

CREATE TABLE screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  keluhan_utama TEXT NOT NULL, tb NUMERIC(5,1), bb NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL, nama TEXT NOT NULL, nama_en TEXT
);
CREATE INDEX idx_diagnoses_kode ON diagnoses(kode);
CREATE INDEX idx_diagnoses_nama ON diagnoses(nama);

CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  keluhan_utama TEXT, riwayat_penyakit_sekarang TEXT, catatan_subjektif TEXT,
  tekanan_darah TEXT, suhu NUMERIC(4,1), spo2 NUMERIC(4,1), hr INTEGER, rr INTEGER,
  tb NUMERIC(5,1), bb NUMERIC(5,1), catatan_pemeriksaan_fisik TEXT, edukasi TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  fee_id UUID, fee_snapshot_nama TEXT, fee_snapshot_tarif NUMERIC(12,0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visit_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  diagnosis_id UUID NOT NULL REFERENCES diagnoses(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(visit_id, diagnosis_id)
);
CREATE INDEX idx_visit_diagnoses_visit_id ON visit_diagnoses(visit_id);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL, bentuk_sediaan TEXT, kekuatan TEXT,
  satuan TEXT NOT NULL DEFAULT 'tablet',
  stok INTEGER NOT NULL DEFAULT 0, harga_beli NUMERIC(12,0) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(12,0) NOT NULL DEFAULT 0, minimum_stok INTEGER NOT NULL DEFAULT 10,
  is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medications_nama ON medications(nama);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'MENUNGGU' CHECK (status IN ('MENUNGGU','DISERAHKAN','SEBAGIAN')),
  catatan TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prescriptions_visit_id ON prescriptions(visit_id);

CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  jumlah INTEGER NOT NULL, aturan_pakai TEXT NOT NULL, catatan TEXT,
  is_tersedia BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE powders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  jumlah_bungkus INTEGER NOT NULL DEFAULT 1, aturan_pakai TEXT NOT NULL, catatan TEXT,
  version INTEGER NOT NULL DEFAULT 1, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE powder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  powder_id UUID NOT NULL REFERENCES powders(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  jumlah_tablet NUMERIC(6,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL, is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL, jenis TEXT, tarif NUMERIC(12,0) NOT NULL DEFAULT 0,
  is_aktif BOOLEAN NOT NULL DEFAULT TRUE, action_id UUID REFERENCES actions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visit_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id),
  fee_id UUID NOT NULL REFERENCES fees(id),
  fee_snapshot_nama TEXT NOT NULL, fee_snapshot_tarif NUMERIC(12,0) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_visit_actions_visit_id ON visit_actions(visit_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID UNIQUE NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  subtotal NUMERIC(12,0) NOT NULL DEFAULT 0,
  diskon_tipe TEXT CHECK (diskon_tipe IN ('NOMINAL','PERSENTASE')),
  diskon_nilai NUMERIC(12,2), diskon_nominal NUMERIC(12,0),
  total NUMERIC(12,0) NOT NULL DEFAULT 0, catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, user_email TEXT, jenis_aksi TEXT NOT NULL,
  tabel TEXT NOT NULL, record_id UUID, data_sebelum JSONB, data_sesudah JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_tabel ON audit_logs(tabel);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS
$$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_practice_settings BEFORE UPDATE ON practice_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_visits BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_screenings BEFORE UPDATE ON screenings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clinical_notes BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_medications BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prescriptions BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_powders BEFORE UPDATE ON powders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_actions BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fees BEFORE UPDATE ON fees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE practice_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE screenings DISABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_diagnoses DISABLE ROW LEVEL SECURITY;
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE powders DISABLE ROW LEVEL SECURITY;
ALTER TABLE powder_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

INSERT INTO actions (nama) VALUES ('Injeksi'),('Nebulisasi'),('Perawatan Luka'),('Pasang Infus'),('EKG');
INSERT INTO fees (nama, jenis, tarif) VALUES ('Pemeriksaan Dokter','Lite',50000),('Pemeriksaan Dokter','Medium',75000),('Pemeriksaan Dokter','Ultra',100000);
INSERT INTO fees (nama, tarif, action_id) SELECT 'Injeksi', 25000, id FROM actions WHERE nama = 'Injeksi';
INSERT INTO fees (nama, tarif, action_id) SELECT 'Nebulisasi', 35000, id FROM actions WHERE nama = 'Nebulisasi';
INSERT INTO fees (nama, tarif, action_id) SELECT 'Perawatan Luka', 40000, id FROM actions WHERE nama = 'Perawatan Luka';
INSERT INTO fees (nama, tarif, action_id) SELECT 'EKG', 50000, id FROM actions WHERE nama = 'EKG';
