/**
 * Tazkiya — Metadata 114 surah Al-Qur'an.
 * Hanya metadata faktual (nama, arti, jumlah ayat, tempat turun).
 * CATATAN: Teks ayat TIDAK ditampilkan pada aplikasi ini karena tidak ada
 * sumber data teks yang terverifikasi — Tazkiya fokus sebagai pelacak bacaan.
 */

export interface SurahMeta {
  number: number;
  arabic: string;
  latin: string;
  meaning: string;
  verses: number;
  place: "Makkiyah" | "Madaniyah";
}

export const SURAHS: SurahMeta[] = [
  { number: 1, arabic: "الفاتحة", latin: "Al-Fatihah", meaning: "Pembukaan", verses: 7, place: "Makkiyah" },
  { number: 2, arabic: "البقرة", latin: "Al-Baqarah", meaning: "Sapi", verses: 286, place: "Madaniyah" },
  { number: 3, arabic: "آل عمران", latin: "Ali 'Imran", meaning: "Keluarga Imran", verses: 200, place: "Madaniyah" },
  { number: 4, arabic: "النساء", latin: "An-Nisa'", meaning: "Wanita", verses: 176, place: "Madaniyah" },
  { number: 5, arabic: "المائدة", latin: "Al-Ma'idah", meaning: "Jamuan (Makana)", verses: 120, place: "Madaniyah" },
  { number: 6, arabic: "الأنعام", latin: "Al-An'am", meaning: "Binatang Ternak", verses: 165, place: "Makkiyah" },
  { number: 7, arabic: "الأعراف", latin: "Al-A'raf", meaning: "Tempat Tertinggi", verses: 206, place: "Makkiyah" },
  { number: 8, arabic: "الأنفال", latin: "Al-Anfal", meaning: "Rampasan Perang", verses: 75, place: "Madaniyah" },
  { number: 9, arabic: "التوبة", latin: "At-Taubah", meaning: "Pengampunan", verses: 129, place: "Madaniyah" },
  { number: 10, arabic: "يونس", latin: "Yunus", meaning: "Nabi Yunus", verses: 109, place: "Makkiyah" },
  { number: 11, arabic: "هود", latin: "Hud", meaning: "Nabi Hud", verses: 123, place: "Makkiyah" },
  { number: 12, arabic: "يوسف", latin: "Yusuf", meaning: "Nabi Yusuf", verses: 111, place: "Makkiyah" },
  { number: 13, arabic: "الرعد", latin: "Ar-Ra'd", meaning: "Guntur", verses: 43, place: "Madaniyah" },
  { number: 14, arabic: "إبراهيم", latin: "Ibrahim", meaning: "Nabi Ibrahim", verses: 52, place: "Makkiyah" },
  { number: 15, arabic: "الحجر", latin: "Al-Hijr", meaning: "Gunung Hijr", verses: 99, place: "Makkiyah" },
  { number: 16, arabic: "النحل", latin: "An-Nahl", meaning: "Lebah", verses: 128, place: "Makkiyah" },
  { number: 17, arabic: "الإسراء", latin: "Al-Isra'", meaning: "Perjalanan Malam", verses: 111, place: "Makkiyah" },
  { number: 18, arabic: "الكهف", latin: "Al-Kahf", meaning: "Gua", verses: 110, place: "Makkiyah" },
  { number: 19, arabic: "مريم", latin: "Maryam", meaning: "Maryam", verses: 98, place: "Makkiyah" },
  { number: 20, arabic: "طه", latin: "Taha", meaning: "Taha", verses: 135, place: "Makkiyah" },
  { number: 21, arabic: "الأنبياء", latin: "Al-Anbiya'", meaning: "Nabi-Nabi", verses: 112, place: "Makkiyah" },
  { number: 22, arabic: "الحج", latin: "Al-Hajj", meaning: "Haji", verses: 78, place: "Madaniyah" },
  { number: 23, arabic: "المؤمنون", latin: "Al-Mu'minun", meaning: "Orang-orang Mukmin", verses: 118, place: "Makkiyah" },
  { number: 24, arabic: "النور", latin: "An-Nur", meaning: "Cahaya", verses: 64, place: "Madaniyah" },
  { number: 25, arabic: "الفرقان", latin: "Al-Furqan", meaning: "Pembeda", verses: 77, place: "Makkiyah" },
  { number: 26, arabic: "الشعراء", latin: "Asy-Syu'ara'", meaning: "Penyair", verses: 227, place: "Makkiyah" },
  { number: 27, arabic: "النمل", latin: "An-Naml", meaning: "Semut", verses: 93, place: "Makkiyah" },
  { number: 28, arabic: "القصص", latin: "Al-Qasas", meaning: "Kisah-Kisah", verses: 88, place: "Makkiyah" },
  { number: 29, arabic: "العنكبوت", latin: "Al-'Ankabut", meaning: "Laba-Laba", verses: 69, place: "Makkiyah" },
  { number: 30, arabic: "الروم", latin: "Ar-Rum", meaning: "Bangsa Romawi", verses: 60, place: "Makkiyah" },
  { number: 31, arabic: "لقمان", latin: "Luqman", meaning: "Luqman", verses: 34, place: "Makkiyah" },
  { number: 32, arabic: "السجدة", latin: "As-Sajdah", meaning: "Sujud", verses: 30, place: "Makkiyah" },
  { number: 33, arabic: "الأحزاب", latin: "Al-Ahzab", meaning: "Golongan Bersekutu", verses: 73, place: "Madaniyah" },
  { number: 34, arabic: "سبأ", latin: "Saba'", meaning: "Kaum Saba'", verses: 54, place: "Makkiyah" },
  { number: 35, arabic: "فاطر", latin: "Fatir", meaning: "Pencipta", verses: 45, place: "Makkiyah" },
  { number: 36, arabic: "يس", latin: "Yasin", meaning: "Yasin", verses: 83, place: "Makkiyah" },
  { number: 37, arabic: "الصافات", latin: "As-Saffat", meaning: "Barisan-Barisan", verses: 182, place: "Makkiyah" },
  { number: 38, arabic: "ص", latin: "Sad", meaning: "Sad", verses: 88, place: "Makkiyah" },
  { number: 39, arabic: "الزمر", latin: "Az-Zumar", meaning: "Rombongan-Rombongan", verses: 75, place: "Makkiyah" },
  { number: 40, arabic: "غافر", latin: "Ghafir", meaning: "Yang Maha Mengampuni", verses: 85, place: "Makkiyah" },
  { number: 41, arabic: "فصلت", latin: "Fussilat", meaning: "Yang Dijelaskan", verses: 54, place: "Makkiyah" },
  { number: 42, arabic: "الشورى", latin: "Asy-Syura", meaning: "Musyawarah", verses: 53, place: "Makkiyah" },
  { number: 43, arabic: "الزخرف", latin: "Az-Zukhruf", meaning: "Perhiasan", verses: 89, place: "Makkiyah" },
  { number: 44, arabic: "الدخان", latin: "Ad-Dukhan", meaning: "Kabut", verses: 59, place: "Makkiyah" },
  { number: 45, arabic: "الجاثية", latin: "Al-Jatsiyah", meaning: "Berlutut", verses: 37, place: "Makkiyah" },
  { number: 46, arabic: "الأحقاف", latin: "Al-Ahqaf", meaning: "Bukit-Bukit Pasir", verses: 35, place: "Makkiyah" },
  { number: 47, arabic: "محمد", latin: "Muhammad", meaning: "Nabi Muhammad", verses: 38, place: "Madaniyah" },
  { number: 48, arabic: "الفتح", latin: "Al-Fath", meaning: "Kemenangan", verses: 29, place: "Madaniyah" },
  { number: 49, arabic: "الحجرات", latin: "Al-Hujurat", meaning: "Kamar-Kamar", verses: 18, place: "Madaniyah" },
  { number: 50, arabic: "ق", latin: "Qaf", meaning: "Qaf", verses: 45, place: "Makkiyah" },
  { number: 51, arabic: "الذاريات", latin: "Az-Zariyat", meaning: "Angin yang Menerbangkan", verses: 60, place: "Makkiyah" },
  { number: 52, arabic: "الطور", latin: "At-Tur", meaning: "Bukit", verses: 49, place: "Makkiyah" },
  { number: 53, arabic: "النجم", latin: "An-Najm", meaning: "Bintang", verses: 62, place: "Makkiyah" },
  { number: 54, arabic: "القمر", latin: "Al-Qamar", meaning: "Bulan", verses: 55, place: "Makkiyah" },
  { number: 55, arabic: "الرحمن", latin: "Ar-Rahman", meaning: "Yang Maha Pengasih", verses: 78, place: "Madaniyah" },
  { number: 56, arabic: "الواقعة", latin: "Al-Waqi'ah", meaning: "Hari Kiamat", verses: 96, place: "Makkiyah" },
  { number: 57, arabic: "الحديد", latin: "Al-Hadid", meaning: "Besi", verses: 29, place: "Madaniyah" },
  { number: 58, arabic: "المجادلة", latin: "Al-Mujadilah", meaning: "Wanita yang Mengajukan Gugatan", verses: 22, place: "Madaniyah" },
  { number: 59, arabic: "الحشر", latin: "Al-Hasyr", meaning: "Pengusiran", verses: 24, place: "Madaniyah" },
  { number: 60, arabic: "الممتحنة", latin: "Al-Mumtahanah", meaning: "Wanita yang Diuji", verses: 13, place: "Madaniyah" },
  { number: 61, arabic: "الصف", latin: "As-Saff", meaning: "Satu Barisan", verses: 14, place: "Madaniyah" },
  { number: 62, arabic: "الجمعة", latin: "Al-Jumu'ah", meaning: "Hari Jumat", verses: 11, place: "Madaniyah" },
  { number: 63, arabic: "المنافقون", latin: "Al-Munafiqun", meaning: "Orang-Orang Munafik", verses: 11, place: "Madaniyah" },
  { number: 64, arabic: "التغابن", latin: "At-Tagabun", meaning: "Hari Perolehan", verses: 18, place: "Madaniyah" },
  { number: 65, arabic: "الطلاق", latin: "At-Talaq", meaning: "Talak", verses: 12, place: "Madaniyah" },
  { number: 66, arabic: "التحريم", latin: "At-Tahrim", meaning: "Mengharamkan", verses: 12, place: "Madaniyah" },
  { number: 67, arabic: "الملك", latin: "Al-Mulk", meaning: "Kerajaan", verses: 30, place: "Makkiyah" },
  { number: 68, arabic: "القلم", latin: "Al-Qalam", meaning: "Pena", verses: 52, place: "Makkiyah" },
  { number: 69, arabic: "الحاقة", latin: "Al-Haqqah", meaning: "Hari Kiamat", verses: 52, place: "Makkiyah" },
  { number: 70, arabic: "المعارج", latin: "Al-Ma'arij", meaning: "Tempat Naik", verses: 44, place: "Makkiyah" },
  { number: 71, arabic: "نوح", latin: "Nuh", meaning: "Nabi Nuh", verses: 28, place: "Makkiyah" },
  { number: 72, arabic: "الجن", latin: "Al-Jinn", meaning: "Jin", verses: 28, place: "Makkiyah" },
  { number: 73, arabic: "المزمل", latin: "Al-Muzzammil", meaning: "Yang Berselimut", verses: 20, place: "Makkiyah" },
  { number: 74, arabic: "المدثر", latin: "Al-Muddatsir", meaning: "Yang Berkemul", verses: 56, place: "Makkiyah" },
  { number: 75, arabic: "القيامة", latin: "Al-Qiyamah", meaning: "Kebangkitan", verses: 40, place: "Makkiyah" },
  { number: 76, arabic: "الإنسان", latin: "Al-Insan", meaning: "Manusia", verses: 31, place: "Madaniyah" },
  { number: 77, arabic: "المرسلات", latin: "Al-Mursalat", meaning: "Malaikat yang Diutus", verses: 50, place: "Makkiyah" },
  { number: 78, arabic: "النبأ", latin: "An-Naba'", meaning: "Berita Besar", verses: 40, place: "Makkiyah" },
  { number: 79, arabic: "النازعات", latin: "An-Nazi'at", meaning: "Malaikat yang Mencabut", verses: 46, place: "Makkiyah" },
  { number: 80, arabic: "عبس", latin: "'Abasa", meaning: "Ia Bermuka Masam", verses: 42, place: "Makkiyah" },
  { number: 81, arabic: "التكوير", latin: "At-Takwir", meaning: "Menggulung", verses: 29, place: "Makkiyah" },
  { number: 82, arabic: "الإنفطار", latin: "Al-Infitar", meaning: "Terbelah", verses: 19, place: "Makkiyah" },
  { number: 83, arabic: "المطففين", latin: "Al-Mutaffifin", meaning: "Orang-Orang yang Curang", verses: 36, place: "Makkiyah" },
  { number: 84, arabic: "الإنشقاق", latin: "Al-Insyiqaq", meaning: "Terbelah", verses: 25, place: "Makkiyah" },
  { number: 85, arabic: "البروج", latin: "Al-Buruj", meaning: "Gugusan Bintang", verses: 22, place: "Makkiyah" },
  { number: 86, arabic: "الطارق", latin: "At-Tariq", meaning: "Yang Datang di Malam Hari", verses: 17, place: "Makkiyah" },
  { number: 87, arabic: "الأعلى", latin: "Al-A'la", meaning: "Yang Maha Tinggi", verses: 19, place: "Makkiyah" },
  { number: 88, arabic: "الغاشية", latin: "Al-Gasyiyah", meaning: "Hari Kiamat", verses: 26, place: "Makkiyah" },
  { number: 89, arabic: "الفجر", latin: "Al-Fajr", meaning: "Fajar", verses: 30, place: "Makkiyah" },
  { number: 90, arabic: "البلد", latin: "Al-Balad", meaning: "Negeri", verses: 20, place: "Makkiyah" },
  { number: 91, arabic: "الشمس", latin: "Asy-Syams", meaning: "Matahari", verses: 15, place: "Makkiyah" },
  { number: 92, arabic: "الليل", latin: "Al-Lail", meaning: "Malam", verses: 21, place: "Makkiyah" },
  { number: 93, arabic: "الضحى", latin: "Ad-Duha", meaning: "Waktu Duha", verses: 11, place: "Makkiyah" },
  { number: 94, arabic: "الشرح", latin: "Asy-Syarh", meaning: "Melapangkan", verses: 8, place: "Makkiyah" },
  { number: 95, arabic: "التين", latin: "At-Tin", meaning: "Buah Tin", verses: 8, place: "Makkiyah" },
  { number: 96, arabic: "العلق", latin: "Al-'Alaq", meaning: "Segumpal Darah", verses: 19, place: "Makkiyah" },
  { number: 97, arabic: "القدر", latin: "Al-Qadr", meaning: "Kemuliaan", verses: 5, place: "Makkiyah" },
  { number: 98, arabic: "البينة", latin: "Al-Bayyinah", meaning: "Pembuktian", verses: 8, place: "Madaniyah" },
  { number: 99, arabic: "الزلزلة", latin: "Az-Zalzalah", meaning: "Kegoncangan", verses: 8, place: "Madaniyah" },
  { number: 100, arabic: "العاديات", latin: "Al-'Adiyat", meaning: "Kuda Perang", verses: 11, place: "Makkiyah" },
  { number: 101, arabic: "القارعة", latin: "Al-Qari'ah", meaning: "Hari Kiamat", verses: 11, place: "Makkiyah" },
  { number: 102, arabic: "التكاثر", latin: "At-Takatsur", meaning: "Bermegah-Megahan", verses: 8, place: "Makkiyah" },
  { number: 103, arabic: "العصر", latin: "Al-'Asr", meaning: "Masa (Waktu)", verses: 3, place: "Makkiyah" },
  { number: 104, arabic: "الهمزة", latin: "Al-Humazah", meaning: "Pencela", verses: 9, place: "Makkiyah" },
  { number: 105, arabic: "الفيل", latin: "Al-Fil", meaning: "Gajah", verses: 5, place: "Makkiyah" },
  { number: 106, arabic: "قريش", latin: "Quraisy", meaning: "Suku Quraisy", verses: 4, place: "Makkiyah" },
  { number: 107, arabic: "الماعون", latin: "Al-Ma'un", meaning: "Barangan Berguna", verses: 7, place: "Makkiyah" },
  { number: 108, arabic: "الكوثر", latin: "Al-Kausar", meaning: "Nikmat yang Berlimpah", verses: 3, place: "Makkiyah" },
  { number: 109, arabic: "الكافرون", latin: "Al-Kafirun", meaning: "Orang-Orang Kafir", verses: 6, place: "Makkiyah" },
  { number: 110, arabic: "النصر", latin: "An-Nasr", meaning: "Pertolongan", verses: 3, place: "Madaniyah" },
  { number: 111, arabic: "اللهب", latin: "Al-Lahab", meaning: "Gejolak Api", verses: 5, place: "Makkiyah" },
  { number: 112, arabic: "الإخلاص", latin: "Al-Ikhlas", meaning: "Ikhlas", verses: 4, place: "Makkiyah" },
  { number: 113, arabic: "الفلق", latin: "Al-Falaq", meaning: "Waktu Subuh", verses: 5, place: "Makkiyah" },
  { number: 114, arabic: "الناس", latin: "An-Nas", meaning: "Manusia", verses: 6, place: "Makkiyah" },
];

export function getSurah(n: number): SurahMeta | undefined {
  return SURAHS.find((s) => s.number === n);
}

export function surahLabel(n: number, showArabic: boolean = false): string {
  const s = getSurah(n);
  if (!s) return `Surah ${n}`;
  return showArabic ? `${s.arabic} — ${s.latin}` : s.latin;
}
