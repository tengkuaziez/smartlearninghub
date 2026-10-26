# Panduan Penyiapan Google Apps Script API (Drive & Spreadsheet)
## Smart Learning Hub — Portal Mahasiswa & Dosen

File `Code.gs` di folder ini bertindak sebagai jembatan *serverless* antara web aplikasi **Smart Learning Hub** dengan akun Google Anda:
1. **Google Drive**: Menyimpan berkas tugas mahasiswa, materi dosen, dan bukti izin/sakit langsung ke folder Google Drive pribadi dosen tanpa membebani kuota database Supabase.
2. **Google Spreadsheet**: Mencadangkan seluruh data kelas (Rekap Presensi 16 Pertemuan, Nilai Tugas, Daftar Mahasiswa) menjadi spreadsheet resmi yang siap diolah/dicetak.

---

### Langkah-Langkah Pemasangan (Hanya Butuh 3 Menit):

1. **Buka Google Apps Script**:
   - Buka browser Anda dan kunjungi: **[https://script.google.com](https://script.google.com)**
   - Pastikan Anda *login* dengan akun Google tempat Anda ingin menyimpan file Drive dan Spreadsheet tersebut.

2. **Buat Proyek Baru**:
   - Klik tombol **"+ Proyek Baru"** (*New Project*).
   - Di bagian kiri atas, ganti judul proyek dari *Untitled project* menjadi: `Smart Learning Hub API`.

3. **Salin Kode**:
   - Buka file [`google-apps-script/Code.gs`](./Code.gs) di proyek ini.
   - Hapus semua kode bawaan di editor Google Apps Script (`function myFunction() { ... }`).
   - Tempel (*paste*) seluruh isi file `Code.gs`.
   - Tekan tombol **Save** (ikon disket) atau `Ctrl + S`.

4. **Terapkan Sebagai Web App (Deploy)**:
   - Di pojok kanan atas, klik tombol biru **Terapkan** (*Deploy*) &rarr; pilih **Penerapan baru** (*New deployment*).
   - Klik ikon gerigi (roda gigi) di sebelah *Pilih jenis* (*Select type*) &rarr; pilih **Aplikasi web** (*Web app*).
   - Isi form konfigurasi berikut:
     - **Deskripsi**: `Smart Learning Hub Drive & Sheets v1`
     - **Jalankan sebagai (*Execute as*)**: **Saya (*Me - email@gmail.com*)**
     - **Siapa yang memiliki akses (*Who has access*)**: **Siapa saja (*Anyone*)** &larr; *Sangat penting agar portal web mahasiswa dapat mengunggah berkas tanpa popup login Google.*
   - Klik tombol **Terapkan** (*Deploy*).

5. **Otorisasi Izin Google**:
   - Google akan menampilkan jendela izin akses:
     - Klik **Tinjau Izin** (*Authorize access*).
     - Pilih akun Google Anda.
     - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Lanjutan (*Advanced*)** di bagian bawah, lalu klik **Buka Smart Learning Hub API (tidak aman) / *Go to Smart Learning Hub API (unsafe)***.
     - Klik **Izinkan (*Allow*)**.

6. **Salin URL Web App**:
   - Setelah selesai, Google akan memberikan **URL Aplikasi Web** (berakhiran `/exec`), contoh:
     ```
     https://script.google.com/macros/s/AKfycbx...panjang.../exec
     ```
   - Salin URL tersebut.

7. **Gunakan di Aplikasi Smart Learning Hub**:
   - Anda bisa langsung menempelkannya di portal Smart Learning Hub pada tombol **"Integrasi Google Drive & Backup"** di Dashboard Dosen, ATAU
   - Masukkan ke file `.env` di komputer Anda:
     ```env
     VITE_GAS_API_URL="https://script.google.com/macros/s/AKfycbx.../exec"
     ```

Selesai! Sekarang semua upload mahasiswa akan langsung masuk ke Google Drive dosen di folder `SmartLearningHub_Uploads` dan backup dapat dilakukan dengan 1 klik ke Google Spreadsheet.
