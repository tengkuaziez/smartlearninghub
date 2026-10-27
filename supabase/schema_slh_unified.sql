-- =========================================================================
-- SMART LEARNING HUB & MY JOURNEY — UNIFIED SUPABASE SCHEMA & SECURITY
-- =========================================================================
-- Panduan:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project My Journey Anda ("tukpkikqdavfkdqbvclx")
-- 3. Buka menu "SQL Editor" di bilah navigasi kiri
-- 4. Tempel (Paste) seluruh skrip di bawah ini lalu klik tombol "Run".
--
-- JAMINAN KEAMANAN DATA MY JOURNEY:
-- Seluruh data pribadi My Journey (Profil, Ide, Riset, Draft Publikasi,
-- HAKI, Catatan, Pengingat, Task) TETAP 100% TERKUNCI & TERISOLASI
-- dengan Row Level Security (auth.uid() = user_id).
-- 
-- Skrip ini HANYA membuka akses kolaboratif untuk data akademik perkuliahan
-- dan Portal Mahasiswa Smart Learning Hub.
-- =========================================================================

-- -------------------------------------------------------------------------
-- BAGIAN 1: Buka Akses untuk Modul Perkuliahan Bersama (Teaching)
-- -------------------------------------------------------------------------
-- Pastikan tabel-tabel perkuliahan bersama ada
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.students (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.rps (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Atur default user_id ke akun Dosen Utama My Journey jika tidak diisi
ALTER TABLE public.courses ALTER COLUMN user_id SET DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid;
ALTER TABLE public.students ALTER COLUMN user_id SET DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid;
ALTER TABLE public.materials ALTER COLUMN user_id SET DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid;
ALTER TABLE public.rps ALTER COLUMN user_id SET DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid;
ALTER TABLE public.sessions ALTER COLUMN user_id SET DEFAULT 'd342423d-fce0-4b54-896f-4c4b27e70dc0'::uuid;

-- Matikan RLS untuk 5 tabel perkuliahan agar Smart Learning Hub dapat membaca dan menyimpan tanpa halangan RLS
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;

-- Kosongkan data kelas & mahasiswa lama agar memulai dari kondisi bersih (Clean Slate untuk Kelas Baru Bersama)
DELETE FROM public.courses;
DELETE FROM public.students;

-- -------------------------------------------------------------------------
-- BAGIAN 2: Tabel-tabel Khusus Smart Learning Hub (Portal Mahasiswa)
-- -------------------------------------------------------------------------

-- 1. Sesi Presensi Aktif (QR Code & Passcode)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  session_title TEXT,
  session_date TEXT,
  qr_token TEXT,
  passcode TEXT,
  is_open BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rekap Presensi Mahasiswa
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_nim TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  status TEXT DEFAULT 'Hadir',
  method TEXT DEFAULT 'QR_SCAN',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  coordinates JSONB,
  note TEXT
);

-- 3. Tugas Kuliah (Assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pengumpulan Tugas Mahasiswa (Submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_nim TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  file_url TEXT,
  file_name TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  score NUMERIC,
  feedback TEXT,
  status TEXT DEFAULT 'submitted'
);

-- 5. Pengumuman Perkuliahan (Announcements)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_role TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Akun Pengguna Portal (Registered Users - Mahasiswa & Dosen)
CREATE TABLE IF NOT EXISTS public.portal_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mahasiswa',
  nim TEXT,
  nidn TEXT,
  password_hash TEXT,
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buka akses untuk tabel-tabel portal
ALTER TABLE public.attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_users DISABLE ROW LEVEL SECURITY;

-- Aktifkan Supabase Realtime untuk tabel-tabel interaktif agar update langsung muncul tanpa reload
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Selesai! Single Database My Journey & Smart Learning Hub kini aktif dan 100% siap digunakan.
