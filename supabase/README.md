# Panduan Setup Database Supabase (Akun Baru / Terpisah)
## Smart Learning Hub — Portal Mahasiswa & Dosen

> **Pertanyaan Penting:** *Apakah akun Supabase yang berbeda bisa tersambung ke repositori GitHub yang sama?*  
> **Jawabannya: SANGAT BISA!**  
> Supabase dan GitHub adalah dua layanan independen. GitHub hanya menyimpan kode sumber aplikasi (*source code*), sedangkan Supabase menyediakan REST API & Database PostgreSQL. Koneksi aplikasi ke Supabase hanya menggunakan 2 baris kunci lingkungan (*Environment Variables*):
> 1. `VITE_SUPABASE_URL`
> 2. `VITE_SUPABASE_ANON_KEY`
>
> Proyek *My Journey* lama Anda dan proyek *Smart Learning Hub* ini tidak akan saling mengganggu meskipun menggunakan akun Supabase yang berbeda!

---

### Langkah-Langkah Membuat Database Supabase Baru:

1. **Daftar / Buat Akun Supabase Baru**:
   - Buka browser Anda: **[https://supabase.com](https://supabase.com)**
   - Masuk (*Log In*) atau Buat Akun (*Sign Up*) menggunakan email lain (berbeda dari akun My Journey Anda).

2. **Buat Proyek Baru (*New Project*)**:
   - Di dashboard Supabase, klik tombol **"New Project"**.
   - Masukkan informasi proyek:
     - **Name**: `Smart Learning Hub`
     - **Database Password**: Buat password yang kuat dan catat.
     - **Region**: Pilih yang terdekat dengan Indonesia, yaitu **Singapore (ap-southeast-1)** agar respon sangat cepat.
   - Klik **"Create new project"** dan tunggu sekitar 1-2 menit hingga proses inisialisasi database selesai.

3. **Jalankan Schema SQL Otomatis**:
   - Di menu sebelah kiri dashboard Supabase, klik ikon **SQL Editor** (ikon terminal `>_`).
   - Klik **"New Query"**.
   - Buka file [`supabase/schema.sql`](./schema.sql) dari proyek ini.
   - Salin seluruh isi file `supabase/schema.sql`, lalu tempel (*paste*) ke dalam SQL Editor Supabase.
   - Klik tombol hijau **"Run"** di pojok kanan bawah.
   - Database lengkap (Tabel Profil, 3 Mata Kuliah, 16 Pertemuan, Presensi QR, Tugas & Link Drive, Serta RPS OBE) akan langsung terbuat dalam 3 detik!

4. **Ambil Kunci API (*API Keys*)**:
   - Di menu samping kiri Supabase, klik ikon **Project Settings** (ikon roda gigi) &rarr; pilih **API**.
   - Salin dua nilai berikut:
     1. **Project URL**: contoh `https://xyzabcdefghijklmnop.supabase.co`
     2. **Project API Keys (anon / public)**: contoh `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

5. **Masukkan ke File `.env`**:
   - Di folder proyek `Smart-Learning-Hub-—-Portal-Mahasiswa`, buka file `.env` (atau buat jika belum ada):
     ```env
     VITE_SUPABASE_URL="https://xyzabcdefghijklmnop.supabase.co"
     VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     ```
   - Selesai! Aplikasi secara otomatis akan beralih dari mode *local prototype* ke sinkronisasi penuh database Supabase.
