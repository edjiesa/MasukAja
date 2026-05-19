# MasukAja - Password Manager 🔐

MasukAja adalah aplikasi pengelola kata sandi (Password Manager) berbasis web yang aman dan modern. Aplikasi ini dibangun menggunakan Node.js (Express), PostgreSQL, dan antarmuka Dark-Mode Premium menggunakan Tailwind CSS. 

## ✨ Fitur Utama
- **Keamanan Data**: Semua kata sandi master di-hash menggunakan algoritma `bcrypt` (Salt Rounds: 10).
- **Auto-Login (Remember Me)**: Sesi login yang persisten hingga 30 hari menggunakan cookie yang aman.
- **Manajemen Sandi**: Tambah dan hapus kata sandi aplikasi/website Anda di dalam *Vault* yang terenkripsi.
- **Generator Sandi**: Fitur pembuat kata sandi acak yang sangat kuat dengan sekali klik.
- **Lupa Password via Email**: Fitur reset password yang aman menggunakan token sekali pakai yang dikirimkan ke email pendaftaran.
- **UI/UX Modern**: Desain *Glassmorphism* dengan tema gelap (Dark Mode) bawaan untuk kenyamanan mata.

## 🚀 Teknologi yang Digunakan
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (menggunakan modul `pg`)
- **Autentikasi & Sesi**: `express-session`, `cookie-parser`, `bcryptjs`
- **Frontend / View Engine**: EJS, Tailwind CSS, Alpine.js (opsional)

---

## 💻 Cara Menjalankan di Komputer Lokal (Localhost)

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/edjiesa/MasukAja.git
   cd MasukAja
   ```
2. **Instal Dependensi**:
   ```bash
   npm install
   ```
3. **Konfigurasi Database**:
   - Buat file `.env` di folder utama aplikasi.
   - Isi dengan konfigurasi berikut (sesuaikan dengan PostgreSQL lokal Anda):
     ```env
     PORT=3000
     SESSION_SECRET=kunci_rahasia_super_aman_123!
     PGUSER=postgres
     PGHOST=localhost
     PGPASSWORD=password_postgres_anda
     PGDATABASE=password_manager
     PGPORT=5432
     BASE_URI=

     # Konfigurasi SMTP untuk Pengiriman Email Lupa Password
     SMTP_HOST=smtp.nama_host_anda.com
     SMTP_PORT=587
     SMTP_USER=email@domainanda.com
     SMTP_PASS=password_email_anda
     SMTP_FROM="MasukAja <email@domainanda.com>"
     ```
     *(Catatan: Biarkan `BASE_URI` kosong jika Anda menjalankan aplikasi di localhost root `/`)*
4. **Inisialisasi Database**:
   - Jalankan perintah berikut untuk membuat tabel secara otomatis (pastikan database `password_manager` sudah Anda buat secara manual di PostgreSQL):
     ```bash
     node scripts/init-db.js
     ```
5. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses di `http://localhost:3000`.

---

## 🌐 Cara Deploy / Upload Aplikasi ke cPanel

Untuk mengunggah dan menjalankan aplikasi Node.js ini di hosting cPanel, ikuti langkah-langkah berikut:

### Langkah 1: Persiapan Database PostgreSQL di cPanel
1. Login ke akun cPanel Anda.
2. Cari menu **PostgreSQL Databases**.
3. Buat database baru (misalnya `namahost_password_manager`).
4. Buat user PostgreSQL baru dan berikan **kata sandi yang kuat**.
5. Tambahkan user tersebut ke database yang baru saja dibuat dengan **All Privileges**.

### Langkah 2: Upload File ke cPanel (File Manager)
1. Buka **File Manager** di cPanel.
2. Jangan letakkan file langsung di folder `public_html`. Buat folder baru di luar `public_html`, contoh: `masukaja_app`.
3. Kompres folder proyek dari komputer Anda menjadi bentuk `.zip` **(PENTING: Jangan sertakan folder `node_modules` di dalam ZIP)**.
4. Upload file ZIP tersebut ke folder `masukaja_app` di cPanel, lalu klik **Extract**.

### Langkah 3: Setup Node.js App di cPanel
1. Kembali ke beranda cPanel, cari menu **Setup Node.js App**.
2. Klik tombol **Create Application**.
3. Isi konfigurasi berikut:
   - **Node.js version**: Pilih versi terbaru (misal: 18.x atau 20.x).
   - **Application mode**: Pilih `Production`.
   - **Application root**: Masukkan nama folder yang Anda buat tadi (`masukaja_app`).
   - **Application URL**: Pilih domain atau subdomain Anda.
   - **Application startup file**: Masukkan `server.js`.
4. Klik **Create**.

### Langkah 4: Konfigurasi Environment (`.env`)
1. Buka kembali folder `masukaja_app` melalui **File Manager** cPanel.
2. Buat file baru bernama `.env`.
3. Isi dengan konfigurasi database cPanel Anda:
   ```env
   PORT=3000
   SESSION_SECRET=ganti_dengan_kunci_acak_yang_panjang
   PGUSER=namahost_userdbanda
   PGHOST=127.0.0.1
   PGPASSWORD=password_database_cpanel_anda
   PGDATABASE=namahost_password_manager
   PGPORT=5432
   BASE_URI=/masukaja_app

   # Konfigurasi SMTP (Gunakan Akun Email cPanel Anda)
   SMTP_HOST=mail.domainanda.com
   SMTP_PORT=587
   SMTP_USER=email@domainanda.com
   SMTP_PASS=password_email_anda
   SMTP_FROM="MasukAja <email@domainanda.com>"
   ```
*(Catatan: cPanel biasanya menggunakan `127.0.0.1` untuk host database. Ubah nilai `BASE_URI` sesuai dengan nama sub-folder atau path URL tempat aplikasi Anda diakses. Misalnya, jika diakses melalui `domain.com/MasukAja`, isi dengan `BASE_URI=/MasukAja`. Jika di root domain, biarkan kosong `BASE_URI=`. Untuk SMTP, Anda dapat membuat akun email di fitur **Email Accounts** cPanel Anda dan menggunakan detailnya di atas)*

### Langkah 5: Instalasi NPM dan Inisialisasi Database
1. Kembali ke halaman **Setup Node.js App**.
2. Scroll ke bawah dan klik tombol **Run NPM Install** untuk menginstal semua dependensi dari `package.json`.
3. Buka menu **Terminal** di cPanel, lalu navigasi ke folder aplikasi Anda (misal: `cd /home/user/nodevenv/masukaja_app/22/`).
4. Jika ini adalah instalasi **baru**, jalankan: `node scripts/init-db.js` untuk membuat tabel. 
5. Jika ini adalah **update** dari versi sebelumnya, jalankan: `node scripts/update-db.js` untuk menambahkan kolom email tanpa menghapus data lama. *(Catatan: Jangan gunakan `npm run init-db` di cPanel untuk menghindari batasan memori yang menyebabkan `core dumped`)*.

### Langkah 6: Restart Aplikasi
1. Kembali ke halaman **Setup Node.js App**.
2. Klik tombol **Restart** atau **Restart Application**.
3. Buka domain/subdomain Anda di browser. Aplikasi MasukAja sudah berhasil online! 🎉
