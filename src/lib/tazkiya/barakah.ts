/**
 * Tazkiya — Daily Barakah: pengingat & refleksi harian di Beranda.
 * Empat kategori pesan (niat baik, pengingat setelah Subuh, motivasi,
 * target kecil) dipilih deterministik per tanggal agar bervariasi tiap hari.
 *
 * Aturan konten: kalimat amanah tanpa atribusi riwayat palsu — hanya
 * mengutip sumber yang benar-benar dirujuk (mis. HR. Tirmidzi no. 586).
 */

export interface BarakahDay {
  /** Niat baik hari ini. */
  niat: string;
  /** Pengingat aktivitas setelah Subuh. */
  subuh: string;
  /** Motivasi singkat. */
  motivasi: string;
  /** Target kecil yang bisa dilakukan pengguna. */
  target: string;
}

const NIAT_BAIK: string[] = [
  "Hari ini aku berniat bekerja dan belajar sebagai amal yang bermanfaat.",
  "Aku berniat menjaga lisan: mengatakan yang baik atau diam.",
  "Aku berniat memperlakukan orang di sekitarku dengan lembut dan adil.",
  "Aku berniat menyelesaikan pekerjaan hari ini dengan amanah.",
  "Aku berniat memulai harimu dengan hati yang lapang dan memaafkan.",
  "Aku berniat melihat kebaikan hari ini lalu bersyukur atasnya.",
  "Aku berniat menghilangkan satu kesulitan dari orang lain hari ini.",
];

const SETELAH_SUBUH: string[] = [
  "Duduk sejenak berdzikir setelah Subuh, keutamaannya besar (HR. Tirmidzi no. 586).",
  "Baca Ayat Kursi dan tiga surah perlindungan setelah Subuh sebagai pemelihara harimu.",
  "Tulis satu rencana terbaik untuk hari ini sebelum kesibukan dimulai.",
  "Sempatkan sarat dan minum yang cukup, tubuh yang sehat membantu ibadah.",
  "Salamkan orang tua atau keluargamu di pagi hari, awali hari dengan silaturahmi.",
  "Istighfar tiga kali sebelum memulai aktivitas pagi.",
];

const MOTIVASI: string[] = [
  "Amalan yang paling dicintai Allah adalah yang paling berkesinambungan, meskipun sedikit. (HR. Bukhari & Muslim)",
  "Sedikit yang konsisten jauh lebih berharga daripada banyak yang hanya sesekali.",
  "Langkah kecil hari ini tetap berarti, pelan-pelan asal terus berjalan.",
  "Setiap ayat yang kamu baca hari ini adalah cahaya untuk esokmu.",
  "Jantung yang tenang diraih melalui zikir yang terjaga.",
  "Jangan menunggu sempurna untuk memulai; mulailah agar menjadi semakin baik.",
  "Ibadah hari ini adalah ikhtiar terbaik yang bisa kamu bawa pulang.",
];

const TARGET_KECIL: string[] = [
  "Baca satu halaman Al-Qur'an hari ini.",
  "Sedekahkan satu tindakan baik, walau sederhana.",
  "Istighfar 10 kali sebelum tidur nanti.",
  "Sampaikan satu apresiasi tulus kepada orang di sekitarmu.",
  "Tunaikan satu salat di masjid atau berjamaah hari ini.",
  "Tulis satu hal yang kamu syukuri di Jurnal Syukur.",
  "Bantu satu pekerjaan kecil di rumah tanpa diminta.",
];

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  return hash;
}

/** Empat pesan Daily Barakah untuk satu tanggal (stabil sepanjang hari). */
export function barakahOfTheDay(dateKey: string): BarakahDay {
  const h = hashKey(dateKey);
  return {
    niat: NIAT_BAIK[h % NIAT_BAIK.length],
    subuh: SETELAH_SUBUH[(h >> 2) % SETELAH_SUBUH.length],
    motivasi: MOTIVASI[(h >> 4) % MOTIVASI.length],
    target: TARGET_KECIL[(h >> 6) % TARGET_KECIL.length],
  };
}
