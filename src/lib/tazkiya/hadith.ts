/**
 * Tazkiya — Koleksi hadis untuk "Hadith for Your Heart" (Jurnal Syukur)
 * dan pengingat qada. SEMUA entri adalah hadis masyhur yang diriwayatkan
 * oleh kitab kutubut-tis'ah dengan nomor riwayat eksplisit.
 *
 * Aturan mutlak berdasarkan permintaan pengguna:
 * - TIDAK ada hadis buatan/karangan; hanya teks yang diriwayatkan luas.
 * - Setiap entri wajib membawa sumber (kitab + nomor).
 * - Terjemahan merangkum makna riwayat tanpa mengubah isi hadis.
 * - Bila keterangan kekuatan riwayat diragukan, sumber tetap dicantumkan
 *   apa adanya (nama kitab & nomor) tanpa klaim tambahan.
 */

import type { MoodId } from "./types";

export interface Hadith {
  id: string;
  /** Label tema kartu, mis. "UNTUK HATI YANG BERSYUKUR". */
  tag: string;
  arabic: string;
  /** Terjemahan makna dalam Bahasa Indonesia. */
  text: string;
  /** Sumber eksplisit: kitab + nomor riwayat. */
  source: string;
  /** Mood yang paling relevan — dipakai untuk penyaringan lembut. */
  moods: MoodId[];
}

export const HADITHS: Hadith[] = [
  {
    id: "niyat",
    tag: "Untuk memurnikan niat",
    arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    text: "Sesungguhnya setiap amal itu tergantung pada niatnya, dan setiap orang hanya mendapatkan apa yang ia niatkan.",
    source: "HR. Bukhari no. 1",
    moods: ["campur-aduk", "tenang"],
  },
  {
    id: "syukur-manusia",
    tag: "Untuk hati yang bersyukur",
    arabic: "مَنْ لَا يَشْكُرُ النَّاسَ لَا يَشْكُرُ اللَّهَ",
    text: "Barangsiapa tidak bersyukur kepada manusia, maka ia pun tidak bersyukur kepada Allah.",
    source: "HR. Tirmidzi no. 1955",
    moods: ["bersyukur", "bahagia"],
  },
  {
    id: "mukmin-kuat",
    tag: "Untuk hari yang melelahkan",
    arabic:
      "الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ، وَفِي كُلٍّ خَيْرٌ، احْرِصْ عَلَى مَا يَنْفَعُكَ، وَاسْتَعِنْ بِاللَّهِ وَلَا تَعْجِزْ",
    text: "Mukmin yang kuat lebih baik dan lebih dicintai Allah daripada mukmin yang lemah. Pada setiap hal ada kebaikan — bersemangatlah untuk hal yang bermanfaat bagimu, mohonlah pertolongan kepada Allah, dan jangan engkau lemah.",
    source: "HR. Muslim no. 2664",
    moods: ["lelah", "campur-aduk"],
  },
  {
    id: "ajib-mukmin",
    tag: "Untuk hati yang sedang diuji",
    arabic:
      "عَجَبًا لِأَمْرِ الْمُؤْمِنِ، إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ: إِنْ أَصَابَتْهُ سَرَّاءُ شَكَرَ فَكَانَ خَيْرًا لَهُ، وَإِنْ أَصَابَتْهُ ضَرَّاءُ صَبَرَ فَكَانَ خَيْرًا لَهُ",
    text: "Sungguh menakjubkan urusan orang mukmin; seluruh urusannya baik baginya. Jika mendapat kesenangan ia bersyukur, itu baik baginya. Jika ditimpa kesusahan ia bersabar, itu pun baik baginya.",
    source: "HR. Muslim no. 2999",
    moods: ["sedih", "cemas", "campur-aduk"],
  },
  {
    id: "tanam-sedekah",
    tag: "Untuk pengingat kebaikan",
    arabic:
      "مَا مِنْ مُسْلِمٍ يَغْرِسُ غَرْسًا أَوْ يَزْرَعُ زَرْعًا فَيَأْكُلُ مِنْهُ طَيْرٌ أَوْ إِنْسَانٌ أَوْ بَهِيمَةٌ إِلَّا كَانَ لَهُ بِهِ صَدَقَةٌ",
    text: "Tidaklah seorang muslim menanam pohon atau menabur benih lalu dimakan burung, manusia, atau hewan, kecuali hal itu menjadi sedekah baginya.",
    source: "HR. Bukhari no. 2320 & Muslim no. 1552",
    moods: ["bahagia", "bersyukur"],
  },
  {
    id: "sedekah-tak-berkurang",
    tag: "Untuk hati yang khawatir rezekinya",
    arabic: "وَالصَّدَقَةُ لَا تَنْقُصُ مَالًا",
    text: "Dan sedekah tidaklah mengurangi harta.",
    source: "HR. Muslim no. 2588",
    moods: ["cemas", "campur-aduk"],
  },
  {
    id: "dela-khair",
    tag: "Untuk semangat berbagi",
    arabic: "مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ",
    text: "Barangsiapa menunjukkan kepada suatu kebaikan, maka baginya pahala seperti pahala orang yang mengerjakannya.",
    source: "HR. Muslim no. 1893",
    moods: ["bahagia", "bersyukur"],
  },
  {
    id: "jangan-remeh-kebaikan",
    tag: "Untuk langkah kecil yang tulus",
    arabic:
      "وَلَا تَحْقِرَنَّ مِنَ الْمَعْرُوفِ شَيْئًا، وَلَوْ أَنْ تَلْقَى أَخَاكَ بِوَجْهٍ طَلْقٍ",
    text: "Janganlah engkau meremehkan kebaikan apa pun, walaupun hanya bertemu saudaramu dengan wajah yang ceria.",
    source: "HR. Tirmidzi no. 1952",
    moods: ["lelah", "tenang"],
  },
  {
    id: "dua-nikmat",
    tag: "Untuk menghargai waktu",
    arabic: "نِعْمَتَانِ مَغْبُونٌ فِيهِمَا كَثِيرٌ مِنَ النَّاسِ: الصِّحَّةُ وَالْفَرَاغُ",
    text: "Ada dua nikmat yang banyak manusia tertipu di dalamnya: kesehatan dan waktu luang.",
    source: "HR. Bukhari no. 6412",
    moods: ["campur-aduk", "tenang"],
  },
  {
    id: "lihat-ke-bawah",
    tag: "Untuk hati yang merasa kurang",
    arabic:
      "انْظُرْ إِلَى مَنْ أَسْفَلَ مِنْكُمْ وَلَا تَنْظُرْ إِلَى مَنْ هُوَ فَوْقَكُمْ، فَإِنَّهُ أَجْدَرُ أَلَّا تَزْدَرُوا نِعْمَةَ اللَّهِ",
    text: "Lihatlah orang yang berada di bawah kalian dan janganlah melihat orang yang di atas kalian, agar kalian tidak meremehkan nikmat Allah atas diri kalian.",
    source: "HR. Muslim no. 2963",
    moods: ["bersyukur", "cemas"],
  },
  {
    id: "allah-lihat-hati",
    tag: "Untuk ketenangan hati",
    arabic:
      "إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ",
    text: "Sesungguhnya Allah tidak melihat bentuk dan penampilan kalian, tetapi Allah melihat hati dan amal kalian.",
    source: "HR. Muslim no. 2564",
    moods: ["tenang", "campur-aduk"],
  },
  {
    id: "shabr-diya",
    tag: "Untuk hati yang lelah",
    arabic: "وَالصَّبْرُ ضِيَاءٌ",
    text: "Dan kesabaran itu cahaya.",
    source: "HR. Muslim no. 223",
    moods: ["sedih", "lelah", "cemas"],
  },
  {
    id: "istighfar-ruang",
    tag: "Untuk kesempitan hati",
    arabic:
      "مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ هَمٍّ فَرَجًا، وَمِنْ كُلِّ ضِيقٍ مَخْرَجًا، وَرَزَقَهُ مِنْ حَيْثُ لَا يَحْتَسِبُ",
    text: "Barangsiapa membiasakan istighfar, Allah akan memberinya jalan keluar dari setiap kesempitan dan setiap kesulitan, serta memberinya rezeki dari arah yang tidak disangka-sangka.",
    source: "HR. Abu Dawud no. 1518",
    moods: ["cemas", "sedih", "campur-aduk"],
  },
  {
    id: "subuh-dzikir",
    tag: "Untuk pagi yang penuh berkah",
    arabic:
      "مَنْ صَلَّى الصُّبْحَ فِي جَمَاعَةٍ، ثُمَّ قَعَدَ يَذْكُرُ اللَّهَ حَتَّى تَطْلُعَ الشَّمْسُ، ثُمَّ صَلَّى رَكْعَتَيْنِ، كَانَتْ لَهُ كَأَجْرِ حَجَّةٍ وَعُمْرَةٍ",
    text: "Barangsiapa salat Subuh berjamaah, lalu duduk berzikir kepada Allah hingga matahari terbit, kemudian salat dua rakaat, maka baginya (pahala) seperti haji dan umarah.",
    source: "HR. Tirmidzi no. 586",
    moods: ["tenang", "bahagia"],
  },
  {
    id: "lupa-shalat",
    tag: "Untuk yang ingin memperbaiki",
    arabic: "مَنْ نَسِيَ صَلَاةً فَلْيُصَلِّ إِذَا ذَكَرَهَا، لَا كَفَارَةَ لَهَا إِلَّا ذَلِكَ",
    text: "Barangsiapa lupa suatu salat, maka hendaklah ia salat ketika ia mengingatnya; tidak ada penebus untuknya selain itu.",
    source: "HR. Bukhari no. 597 & Muslim no. 684",
    moods: ["campur-aduk", "cemas"],
  },
];

/** Hanya entri dengan sumber riwayat eksplisit — basis kartu "Hadith for Your Heart". */
export const VERIFIED_HADITHS: Hadith[] = HADITHS;

/**
 * Hadis untuk mood tertentu pada satu tanggal.
 * Penentuan deterministik per (mood, tanggal) agar stabil sepanjang hari;
 * `offset` dipakai tombol "Lihat hadis lainnya" untuk berpindah antar-entri.
 */
export function hadithForMood(mood: MoodId | undefined, dateKey: string, offset = 0): Hadith {
  const pool = mood ? VERIFIED_HADITHS.filter((h) => h.moods.includes(mood)) : [];
  const list = pool.length > 0 ? pool : VERIFIED_HADITHS;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) % 100000;
  return list[(hash + offset) % list.length];
}

/** Hadis pengingat qada (dipakai saat pengguna menandai salat terlewat). */
export const HADITH_QADA: Hadith = {
  id: "lupa-shalat",
  tag: "Untuk salat yang terlewat",
  arabic: "مَنْ نَسِيَ صَلَاةً فَلْيُصَلِّ إِذَا ذَكَرَهَا، لَا كَفَارَةَ لَهَا إِلَّا ذَلِكَ",
  text: "Barangsiapa lupa suatu salat, maka hendaklah ia salat ketika ia mengingatnya; tidak ada penebus untuknya selain itu.",
  source: "HR. Bukhari no. 597 & Muslim no. 684",
  moods: [],
};
