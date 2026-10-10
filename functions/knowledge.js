// ============================================================
// Basis pengetahuan untuk Asisten AI.
// ------------------------------------------------------------
// Semua teks di sini disuntikkan ke "system prompt" model DeepSeek.
// Isi bagian bertanda TODO sesuai data resmi asrama. Semakin lengkap,
// semakin "sempurna" jawaban AI. Jangan letakkan rahasia/kata sandi.
// ============================================================

module.exports = {
  // --- Topik yang diizinkan (di luar ini akan ditolak) ---
  TOPIK_DIIZINKAN: [
    "profil & sejarah Asrama IPB Sukasari",
    "fasilitas dan aturan tinggal asrama",
    "AD/ART dan tata tertib asrama",
    "kegiatan, piket, jam malam, absen malam",
    "poin penghuni (khusus pengguna aplikasi)",
    "SPA / iuran dan pembayarannya",
    "pendaftaran/oprec penghuni baru",
    "kontak dan alamat pengurus",
  ],

  // --- Kata/frasa yang langsung ditolak (pra-filter cepat) ---
  DENYLIST: [
    "cara membuat bom", "judi online", "slot gacor",
    "pinjol", "konten dewasa", "situs bokep",
  ],

  // --- Profil asrama (untuk /web & /app) ---
  ASRAMA_PROFIL: `
Asrama IPB Sukasari adalah asrama mahasiswa Institut Pertanian Bogor (IPB).
(TODO: isi alamat lengkap, jumlah kamar/kapasitas, jam operasional, fasilitas
umum seperti dapur, laundry, mushola, Wi-Fi, parkir, dll.)
Kontak pengurus: (TODO: nama + nomor WhatsApp/email resmi).
`.trim(),

  // --- AD/ART & tata tertib (ringkasan atau salinan) ---
  AD_ART: `
(TODO: tempelkan isi AD/ART dan tata tertib asrama di sini, atau ringkasan
pasal-pasal penting: hak & kewajiban penghuni, sanksi, denda, prosedur izin
pulang/menginap, aturan tamu, jam malam, dll.)
`.trim(),

  // --- Panduan pemakaian aplikasi internal /app ---
  APP_PANDUAN: `
Aplikasi internal (AsramaApp) dipakai penghuni untuk: lapor piket, jam malam,
absen malam, pengajuan/verifikasi SPA (pembayaran), dan melihat serta menerima
poin. Poin bisa bertambah/berkurang lewat "historyPoint" dan dihitung pada field
"point" di profil pengguna. (TODO: isi aturan poin: cara menambah/mengurangi,
ambang sanksi, dsb.)
`.trim(),
};
