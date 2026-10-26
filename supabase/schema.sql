-- =========================================================================
-- SMART LEARNING HUB — SUPABASE DATABASE SCHEMA
-- Standar Database Perguruan Tinggi (Tim Dosen Berdua & Portal Mahasiswa)
-- =========================================================================

-- Aktifkan ekstensi UUID
create extension if not exists "uuid-ossp";

-- 1. TABEL PROFIL PENGGUNA (DOSEN & MAHASISWA)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  role text not null check (role in ('dosen', 'mahasiswa')),
  name text not null,
  nim text, -- Khusus Mahasiswa
  department text default 'Teknik Informatika',
  avatar_url text,
  registered_at timestamptz default now()
);

-- 2. TABEL MATA KULIAH / KELAS
create table if not exists public.courses (
  id text primary key,
  code text unique not null,
  title text not null,
  description text,
  semester text not null,
  academic_year text not null,
  schedule_day text,
  schedule_time text,
  room text,
  total_meetings integer default 16,
  completed_meetings integer default 0,
  teacher_name text not null,
  teacher_email text not null,
  secondary_teacher_name text,
  secondary_teacher_email text,
  cover_gradient text,
  created_at timestamptz default now()
);

-- 3. TABEL DAFTAR MAHASISWA TERDAFTAR PER KELAS (WHITELIST ROSTER)
create table if not exists public.course_roster (
  id uuid default uuid_generate_v4() primary key,
  course_id text references public.courses(id) on delete cascade,
  student_email text not null,
  enrolled_at timestamptz default now(),
  unique(course_id, student_email)
);

-- 4. TABEL 16 PERTEMUAN KULIAH
create table if not exists public.meetings (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  meeting_number integer not null,
  title text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  room text,
  is_online boolean default false,
  video_url text,
  is_completed boolean default false,
  study_guide text,
  created_at timestamptz default now()
);

-- 5. TABEL MATERI PEMBELAJARAN
create table if not exists public.materials (
  id text primary key,
  meeting_id text references public.meetings(id) on delete cascade,
  title text not null,
  type text check (type in ('pdf', 'heyzine', 'youtube', 'drive', 'link')),
  url text not null,
  file_size_mb numeric,
  created_at timestamptz default now()
);

-- 6. TABEL SESI PRESENSI QR DOSEN
create table if not exists public.attendance_sessions (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  meeting_id text references public.meetings(id) on delete cascade,
  qr_code_token text not null,
  is_open boolean default false,
  opened_at timestamptz,
  expires_at timestamptz,
  unique(course_id, meeting_id)
);

-- 7. TABEL REKAM PRESENSI KEHADIRAN MAHASISWA
create table if not exists public.attendance_records (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  meeting_id text references public.meetings(id) on delete cascade,
  student_id text not null,
  student_email text not null,
  student_name text,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  check_in_time timestamptz default now(),
  check_in_method text check (check_in_method in ('qr_scanner', 'manual_dosen', 'form_izin')),
  proof_file_url text, -- Link Google Drive surat sakit/izin
  notes text,
  unique(course_id, meeting_id, student_email)
);

-- 8. TABEL TUGAS KULIAH
create table if not exists public.assignments (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  meeting_id text references public.meetings(id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz not null,
  max_grade integer default 100,
  allowed_formats text[] default array['.pdf', '.zip'],
  max_file_size_mb integer default 10,
  late_penalty_policy text,
  created_at timestamptz default now()
);

-- 9. TABEL PENGUMPULAN TUGAS (DENGAN TAUTAN GOOGLE DRIVE)
create table if not exists public.assignment_submissions (
  id text primary key,
  assignment_id text references public.assignments(id) on delete cascade,
  student_id text not null,
  student_name text,
  student_email text not null,
  submitted_at timestamptz default now(),
  status text not null,
  file_name text,
  file_size_bytes bigint,
  file_url text, -- Link Google Drive langsung
  drive_file_id text,
  text_response text,
  grade numeric,
  feedback text,
  graded_at timestamptz,
  is_late boolean default false,
  unique(assignment_id, student_email)
);

-- 10. TABEL PENGUMUMAN KELAS
create table if not exists public.announcements (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  title text not null,
  content text not null,
  author_name text not null,
  author_role text not null,
  date timestamptz default now()
);

-- 11. TABEL RPS (RENCANA PEMBELAJARAN SEMESTER - OBE)
create table if not exists public.course_rps (
  course_id text primary key references public.courses(id) on delete cascade,
  description text,
  cpl jsonb,
  cpmk jsonb,
  study_materials text[],
  assessment_weights jsonb,
  references_primary text[],
  references_supporting text[],
  tools_software text[],
  updated_at timestamptz default now()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_roster enable row level security;
alter table public.meetings enable row level security;
alter table public.materials enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.course_rps enable row level security;

-- Kebijakan Akses: Membaca data publik akademik
create policy "Allow read access for authenticated and anon users" on public.courses for select using (true);
create policy "Allow read meetings" on public.meetings for select using (true);
create policy "Allow read materials" on public.materials for select using (true);
create policy "Allow read assignments" on public.assignments for select using (true);
create policy "Allow read announcements" on public.announcements for select using (true);
create policy "Allow read rps" on public.course_rps for select using (true);

-- Presensi & Submisi: Mahasiswa & Dosen
create policy "Allow read attendance records" on public.attendance_records for select using (true);
create policy "Allow insert attendance records" on public.attendance_records for insert with check (true);
create policy "Allow update attendance records" on public.attendance_records for update using (true);

create policy "Allow read submissions" on public.assignment_submissions for select using (true);
create policy "Allow submit assignment" on public.assignment_submissions for insert with check (true);
create policy "Allow update submission" on public.assignment_submissions for update using (true);
