/**
 * Tazkiya — Asmaul Husna (99 nama Allah) + pemilihan nama harian.
 * - Daftar mengikuti urutan kanonik yang umum dipakai publikasi Indonesia
 *   (penomoran riwayat At-Tirmidzi): nama Arab, transliterasi Latin gaya
 *   Indonesia, dan arti ringkas baku.
 * - Nama "hari ini" = rotasi deterministik dari tanggal LOKAL pengguna
 *   (bukan acak, bukan berdasarkan refresh): dua panggilan pada hari yang
 *   sama selalu menghasilkan nama yang sama, berganti tepat saat ganti hari.
 * - Progres hafalan disimpan pada settings.asmaulHafalan (daftar nomor 1..99).
 */

export interface AsmaulHusnaEntry {
  /** Nomor urut 1..99. */
  n: number;
  /** Tulisan Arab (dengan article Al-/Asy-). */
  arab: string;
  /** Transliterasi Latin. */
  latin: string;
  /** Arti ringkas bahasa Indonesia. */
  arti: string;
}

export const ASMAUL_HUSNA: AsmaulHusnaEntry[] = [
  { n: 1, arab: "الرَّحْمَنُ", latin: "Ar-Rahman", arti: "Yang Maha Pengasih" },
  { n: 2, arab: "الرَّحِيمُ", latin: "Ar-Rahim", arti: "Yang Maha Penyayang" },
  { n: 3, arab: "الْمَلِكُ", latin: "Al-Malik", arti: "Yang Maha Merajai" },
  { n: 4, arab: "الْقُدُّوسُ", latin: "Al-Quddus", arti: "Yang Maha Suci" },
  { n: 5, arab: "السَّلَامُ", latin: "As-Salam", arti: "Yang Maha Memberi Keselamatan" },
  { n: 6, arab: "الْمُؤْمِنُ", latin: "Al-Mu'min", arti: "Yang Maha Memberi Keamanan" },
  { n: 7, arab: "الْمُهَيْمِنُ", latin: "Al-Muhaimin", arti: "Yang Maha Melindungi" },
  { n: 8, arab: "الْعَزِيزُ", latin: "Al-Aziz", arti: "Yang Maha Perkasa" },
  { n: 9, arab: "الْجَبَّارُ", latin: "Al-Jabbar", arti: "Yang Maha Memaksa" },
  { n: 10, arab: "الْمُتَكَبِّرُ", latin: "Al-Mutakabbir", arti: "Yang Maha Megah" },
  { n: 11, arab: "الْخَالِقُ", latin: "Al-Khaliq", arti: "Yang Maha Pencipta" },
  { n: 12, arab: "الْبَارِئُ", latin: "Al-Bari'", arti: "Yang Maha Menghasilkan" },
  { n: 13, arab: "الْمُصَوِّرُ", latin: "Al-Musawwir", arti: "Yang Maha Membentuk" },
  { n: 14, arab: "الْغَفَّارُ", latin: "Al-Ghaffar", arti: "Yang Maha Pengampun" },
  { n: 15, arab: "الْقَهَّارُ", latin: "Al-Qahhar", arti: "Yang Maha Menundukkan" },
  { n: 16, arab: "الْوَهَّابُ", latin: "Al-Wahhab", arti: "Yang Maha Pemberi Karunia" },
  { n: 17, arab: "الرَّزَّاقُ", latin: "Ar-Razzaq", arti: "Yang Maha Pemberi Rezeki" },
  { n: 18, arab: "الْفَتَّاحُ", latin: "Al-Fattah", arti: "Yang Maha Pembuka" },
  { n: 19, arab: "الْعَلِيمُ", latin: "Al-'Alim", arti: "Yang Maha Mengetahui" },
  { n: 20, arab: "الْقَابِضُ", latin: "Al-Qabid", arti: "Yang Maha Menyempitkan" },
  { n: 21, arab: "الْبَاسِطُ", latin: "Al-Basit", arti: "Yang Maha Melapangkan" },
  { n: 22, arab: "الْخَافِضُ", latin: "Al-Khafid", arti: "Yang Maha Merendahkan" },
  { n: 23, arab: "الرَّافِعُ", latin: "Ar-Rafi'", arti: "Yang Maha Meninggikan" },
  { n: 24, arab: "الْمُعِزُّ", latin: "Al-Mu'izz", arti: "Yang Maha Memberi Kemuliaan" },
  { n: 25, arab: "الْمُذِلُّ", latin: "Al-Mudhill", arti: "Yang Maha Memberi Kehinaan" },
  { n: 26, arab: "السَّمِيعُ", latin: "As-Sami'", arti: "Yang Maha Mendengar" },
  { n: 27, arab: "الْبَصِيرُ", latin: "Al-Basir", arti: "Yang Maha Melihat" },
  { n: 28, arab: "الْحَكَمُ", latin: "Al-Hakam", arti: "Yang Maha Menadili" },
  { n: 29, arab: "الْعَدْلُ", latin: "Al-'Adl", arti: "Yang Maha Adil" },
  { n: 30, arab: "اللَّطِيفُ", latin: "Al-Latif", arti: "Yang Maha Lembut" },
  { n: 31, arab: "الْخَبِيرُ", latin: "Al-Khabir", arti: "Yang Maha Mengetahui Hakikat" },
  { n: 32, arab: "الْحَلِيمُ", latin: "Al-Halim", arti: "Yang Maha Penyantun" },
  { n: 33, arab: "الْعَظِيمُ", latin: "Al-'Azim", arti: "Yang Maha Agung" },
  { n: 34, arab: "الْغَفُورُ", latin: "Al-Ghafur", arti: "Yang Maha Memaafkan" },
  { n: 35, arab: "الشَّكُورُ", latin: "Asy-Syakur", arti: "Yang Maha Membalas Amal" },
  { n: 36, arab: "الْعَلِيُّ", latin: "Al-'Aliyy", arti: "Yang Maha Tinggi" },
  { n: 37, arab: "الْكَبِيرُ", latin: "Al-Kabir", arti: "Yang Maha Besar" },
  { n: 38, arab: "الْحَفِيظُ", latin: "Al-Hafiz", arti: "Yang Maha Menjaga" },
  { n: 39, arab: "الْمُقِيتُ", latin: "Al-Muqit", arti: "Yang Maha Memberi Kecukupan" },
  { n: 40, arab: "الْحَسِيبُ", latin: "Al-Hasib", arti: "Yang Maha Memperhitungkan" },
  { n: 41, arab: "الْجَلِيلُ", latin: "Al-Jalil", arti: "Yang Maha Mulia" },
  { n: 42, arab: "الْكَرِيمُ", latin: "Al-Karim", arti: "Yang Maha Pemurah" },
  { n: 43, arab: "الرَّقِيبُ", latin: "Ar-Raqib", arti: "Yang Maha Mengawasi" },
  { n: 44, arab: "الْمُجِيبُ", latin: "Al-Mujib", arti: "Yang Maha Mengabulkan" },
  { n: 45, arab: "الْوَاسِعُ", latin: "Al-Wasi'", arti: "Yang Maha Luas" },
  { n: 46, arab: "الْحَكِيمُ", latin: "Al-Hakim", arti: "Yang Maha Bijaksana" },
  { n: 47, arab: "الْوَدُودُ", latin: "Al-Wadud", arti: "Yang Maha Mencintai" },
  { n: 48, arab: "الْمَجِيدُ", latin: "Al-Majid", arti: "Yang Maha Mahagung" },
  { n: 49, arab: "الْبَاعِثُ", latin: "Al-Ba'is", arti: "Yang Maha Membangkitkan" },
  { n: 50, arab: "الشَّهِيدُ", latin: "Asy-Syahid", arti: "Yang Maha Menyaksikan" },
  { n: 51, arab: "الْحَقُّ", latin: "Al-Haqq", arti: "Yang Maha Benar" },
  { n: 52, arab: "الْوَكِيلُ", latin: "Al-Wakil", arti: "Yang Maha Tempat Bersandar" },
  { n: 53, arab: "الْقَوِيُّ", latin: "Al-Qawiyy", arti: "Yang Maha Kuat" },
  { n: 54, arab: "الْمَتِينُ", latin: "Al-Matin", arti: "Yang Maha Kokoh" },
  { n: 55, arab: "الْوَلِيُّ", latin: "Al-Waliyy", arti: "Yang Maha Pelindung" },
  { n: 56, arab: "الْحَمِيدُ", latin: "Al-Hamid", arti: "Yang Maha Terpuji" },
  { n: 57, arab: "الْمُحْصِي", latin: "Al-Muhsi", arti: "Yang Maha Menghitung" },
  { n: 58, arab: "الْمُبْدِئُ", latin: "Al-Mubdi'", arti: "Yang Maha Memulai" },
  { n: 59, arab: "الْمُعِيدُ", latin: "Al-Mu'id", arti: "Yang Maha Mengembalikan" },
  { n: 60, arab: "الْمُحْيِي", latin: "Al-Muhyi", arti: "Yang Maha Menghidupkan" },
  { n: 61, arab: "الْمُمِيتُ", latin: "Al-Mumit", arti: "Yang Maha Mematikan" },
  { n: 62, arab: "الْحَيُّ", latin: "Al-Hayy", arti: "Yang Maha Hidup" },
  { n: 63, arab: "الْقَيُّومُ", latin: "Al-Qayyum", arti: "Yang Maha Berdiri Sendiri" },
  { n: 64, arab: "الْوَاجِدُ", latin: "Al-Wajid", arti: "Yang Maha Menemukan" },
  { n: 65, arab: "الْمَاجِدُ", latin: "Al-Majid", arti: "Yang Maha Berkemuliaan" },
  { n: 66, arab: "الْوَاحِدُ", latin: "Al-Wahid", arti: "Yang Maha Tunggal" },
  { n: 67, arab: "الْأَحَدُ", latin: "Al-Ahad", arti: "Yang Maha Esa" },
  { n: 68, arab: "الصَّمَدُ", latin: "As-Samad", arti: "Yang Maha Ditunggu Segala Sesuatu" },
  { n: 69, arab: "الْقَادِرُ", latin: "Al-Qadir", arti: "Yang Maha Menentukan" },
  { n: 70, arab: "الْمُقْتَدِرُ", latin: "Al-Muqtadir", arti: "Yang Maha Berkuasa" },
  { n: 71, arab: "الْمُقَدِّمُ", latin: "Al-Muqaddim", arti: "Yang Maha Mendahulukan" },
  { n: 72, arab: "الْمُؤَخِّرُ", latin: "Al-Mu'akhkhir", arti: "Yang Maha Mengakhirkan" },
  { n: 73, arab: "الْأَوَّلُ", latin: "Al-Awwal", arti: "Yang Maha Awal" },
  { n: 74, arab: "الْآخِرُ", latin: "Al-Akhir", arti: "Yang Maha Akhir" },
  { n: 75, arab: "الظَّاهِرُ", latin: "Az-Zzahir", arti: "Yang Maha Nyata" },
  { n: 76, arab: "الْبَاطِنُ", latin: "Al-Batin", arti: "Yang Maha Gaib" },
  { n: 77, arab: "الْوَالِي", latin: "Al-Wali", arti: "Yang Maha Penolong" },
  { n: 78, arab: "الْمُتَعَالِي", latin: "Al-Muta'ali", arti: "Yang Maha Meninggi" },
  { n: 79, arab: "الْبَرُّ", latin: "Al-Barr", arti: "Yang Maha Penderma" },
  { n: 80, arab: "التَّوَّابُ", latin: "At-Tawwab", arti: "Yang Maha Menerima Taubat" },
  { n: 81, arab: "الْمُنْتَقِمُ", latin: "Al-Muntaqim", arti: "Yang Maha Penuntut Balas" },
  { n: 82, arab: "الْعَفُوُّ", latin: "Al-'Afuww", arti: "Yang Maha Pemaaf" },
  { n: 83, arab: "الرَّؤُوفُ", latin: "Ar-Ra'uf", arti: "Yang Maha Pengasuh" },
  { n: 84, arab: "مَالِكُ الْمُلْكِ", latin: "Malikul-Mulk", arti: "Yang Maha Pemilik Kerajaan" },
  { n: 85, arab: "ذُو الْجَلَالِ وَالْإِكْرَامِ", latin: "Dzul-Jalali wal-Ikram", arti: "Yang Maha Memiliki Kebesaran dan Kemuliaan" },
  { n: 86, arab: "الْمُقْسِطُ", latin: "Al-Muqsit", arti: "Yang Maha Memberi Keadilan" },
  { n: 87, arab: "الْجَامِعُ", latin: "Al-Jami'", arti: "Yang Maha Mengumpulkan" },
  { n: 88, arab: "الْغَنِيُّ", latin: "Al-Ghaniyy", arti: "Yang Maha Kaya" },
  { n: 89, arab: "الْمُغْنِي", latin: "Al-Mughni", arti: "Yang Maha Memberi Kekayaan" },
  { n: 90, arab: "الْمَانِعُ", latin: "Al-Mani'", arti: "Yang Maha Mencegah" },
  { n: 91, arab: "الضَّارُّ", latin: "Ad-Darr", arti: "Yang Maha Memberi Derita" },
  { n: 92, arab: "النَّافِعُ", latin: "An-Nafi'", arti: "Yang Maha Memberi Manfaat" },
  { n: 93, arab: "النُّورُ", latin: "An-Nur", arti: "Yang Maha Bercahaya" },
  { n: 94, arab: "الْهَادِي", latin: "Al-Hadi", arti: "Yang Maha Pemberi Petunjuk" },
  { n: 95, arab: "الْبَدِيعُ", latin: "Al-Badi'", arti: "Yang Maha Pencipta Tanpa Contoh" },
  { n: 96, arab: "الْبَاقِي", latin: "Al-Baqi", arti: "Yang Maha Kekal" },
  { n: 97, arab: "الْوَارِثُ", latin: "Al-Warits", arti: "Yang Maha Pewaris" },
  { n: 98, arab: "الرَّشِيدُ", latin: "Ar-Rasyid", arti: "Yang Maha Pandai Mengurus" },
  { n: 99, arab: "الصَّبُورُ", latin: "As-Sabur", arti: "Yang Maha Sabar" },
];

/** Jumlah hari sejak epok berdasarkan tanggal LOKAL (bukan UTC) — sumber rotasi harian. */
function dayIndexFromKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const local = new Date(y, (m ?? 1) - 1, d ?? 1);
  const utc = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
  return Math.floor(utc / 86_400_000);
}

/**
 * Nama Asmaul Husna untuk `dateKey` ("YYYY-MM-DD" lokal). Deterministik:
 * konsisten sepanjang hari, berganti tepat saat tanggal lokal berganti,
 * dan sebaran merata 1..99 tanpa kehilangan nama.
 */
export function asmaulHusnaForDate(dateKey: string): AsmaulHusnaEntry {
  const idx = ((dayIndexFromKey(dateKey) % ASMAUL_HUSNA.length) + ASMAUL_HUSNA.length) % ASMAUL_HUSNA.length;
  return ASMAUL_HUSNA[idx];
}
