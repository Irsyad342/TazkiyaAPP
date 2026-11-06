/**
 * SUIO v18 — data Panduan Salat Sunnah (rawatib) untuk halaman Sholat.
 *
 * Sumber rujukan konten (diperiksa, bukan karangan):
 * - Lafaz niat mengikuti pola baku yang diajarkan lembaga fikih, antara lain
 *   artikel "Panduan Lengkap Shalat Qobliyah dan Ba'diyah" (bankmuamalat.co.id)
 *   dan "Niat Shalat Sunnah Subuh" (baznas.go.id).
 * - Klasifikasi: rawatib muakkadah 12 rakaat versi Tirmidzi & An-Nasa'i
 *   (atau 10 rakaat versi Bukhari) — 2 sebelum Subuh, qabliyah Zuhur 2 atau 4,
 *   2 sesudah Zuhur, 2 sesudah Maghrib, 2 sesudah Isya. Qabliyah Asar dan
 *   qabliyah Magrib BUKAN rawatib muakkadah (ghairu muakkadah/boleh, tidak
 *   ditekankan) — dijelaskan proporsional di catatan tiap entri.
 * - Niat pada dasarnya berada di dalam hati; lafaz Arab adalah panduan
 *   pembelajaran, bukan syarat sah salat (dijelaskan pada catatan penutup).
 */

export type SunnahGuideVariant = {
  label: string;
  arab: string;
  translit: string;
  arti: string;
};

export type SunnahGuideEntry = {
  id: string;
  name: string;
  /** Angka rakaat untuk chip (mis. "2" atau "2/4"). */
  rakaatNum: string;
  /** Keterangan jumlah rakaat lengkap. */
  rakaat: string;
  timing: string;
  note: string;
  arab: string;
  translit: string;
  arti: string;
  /** Varian jumlah rakaat lain (khusus qabliyah Zuhur). */
  variant?: SunnahGuideVariant;
};

export const RAWATIB_MUAKKADAH: SunnahGuideEntry[] = [
  {
    id: "qabliyah-subuh",
    name: "Qabliyah Subuh",
    rakaatNum: "2",
    rakaat: "2 rakaat",
    timing: "Sebelum salat Subuh",
    note: "Termasuk rawatib muakkadah — sunnah yang ditekankan dan tidak pernah ditinggalkan Rasulullah ﷺ, termasuk saat berperang (H.R. Bukhari & Muslim).",
    arab: "أُصَلِّي قَبْلِيَّةَ الصُّبْحِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī qabliyyataṣ-ṣubḥi rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah qabliyah Subuh dua rakaat karena Allah Ta'ala.",
  },
  {
    id: "qabliyah-zuhur",
    name: "Qabliyah Zuhur",
    rakaatNum: "2/4",
    rakaat: "2 atau 4 rakaat",
    timing: "Setelah adzan Zuhur, sebelum salat Zuhur",
    note: "Termasuk rawatib muakkadah. Riwayat menyebut Nabi ﷺ mengamalkan dua rakaat, dan riwayat Aisyah ra. menyebut empat rakaat tidak pernah ditinggalkan; Ibnul Qayyim menuturkan dua rakaat saat di masjid dan empat rakaat saat di rumah. Kerjakan sesuai rujukan yang kamu ikuti.",
    arab: "أُصَلِّي قَبْلِيَّةَ الظُّهْرِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī qabliyyaẓ-ẓuhri rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah qabliyah Zuhur dua rakaat karena Allah Ta'ala.",
    variant: {
      label: "Varian 4 rakaat",
      arab: "أُصَلِّي قَبْلِيَّةَ الظُّهْرِ أَرْبَعَ رَكْعَاتٍ سُنَّةً لِلَّهِ تَعَالَى",
      translit: "Uṣallī qabliyyaẓ-ẓuhri arba'a rak'ātin sunnatan lillāhi ta'ālā",
      arti: "Aku niat salat sunnah qabliyah Zuhur empat rakaat karena Allah Ta'ala.",
    },
  },
  {
    id: "badiyah-zuhur",
    name: "Ba'diyah Zuhur",
    rakaatNum: "2",
    rakaat: "2 rakaat",
    timing: "Setelah salam salat Zuhur",
    note: "Termasuk rawatib muakkadah — sunnah sesudah Zuhur yang dijaga Rasulullah ﷺ.",
    arab: "أُصَلِّي بَعْدِيَّةَ الظُّهْرِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī ba'diyyaẓ-ẓuhri rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah ba'diyah Zuhur dua rakaat karena Allah Ta'ala.",
  },
  {
    id: "badiyah-magrib",
    name: "Ba'diyah Magrib",
    rakaatNum: "2",
    rakaat: "2 rakaat",
    timing: "Setelah salam salat Maghrib",
    note: "Termasuk rawatib muakkadah — sunnah sesudah Maghrib yang dianjurkan berterusan.",
    arab: "أُصَلِّي بَعْدِيَّةَ الْمَغْرِبِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī ba'diyyal-magribi rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah ba'diyah Maghrib dua rakaat karena Allah Ta'ala.",
  },
  {
    id: "badiyah-isya",
    name: "Ba'diyah Isya",
    rakaatNum: "2",
    rakaat: "2 rakaat",
    timing: "Setelah salam salat Isya",
    note: "Termasuk rawatib muakkadah. Sunnah ini dianjurkan dikerjakan duduk (dilaporkan dari Aisyah ra., H.R. Muslim), boleh juga berdiri.",
    arab: "أُصَلِّي بَعْدِيَّةَ الْعِشَاءِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī ba'diyyal-'isyā'i rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah ba'diyah Isya dua rakaat karena Allah Ta'ala.",
  },
];

export const SUNNAH_LAINNYA: SunnahGuideEntry[] = [
  {
    id: "qabliyah-asar",
    name: "Qabliyah Asar",
    rakaatNum: "2",
    rakaat: "2 rakaat (sebagian ulama: 4)",
    timing: "Sebelum salat Asar",
    note: "Bukan bagian dari rawatib muakkadah. Ada riwayat menganjurkan salat sebelum Asar (H.R. Tirmidzi); sebagian ulama menyunnankannya sebatas dua rakaat ringan, sebagian lain menganggapnya sunnah ghairu muakkadah (tidak ditekankan). Boleh diamalkan, tidak ditekankan.",
    arab: "أُصَلِّي قَبْلِيَّةَ الْعَصْرِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī qabliyyatal-'aṣri rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah qabliyah Asar dua rakaat karena Allah Ta'ala.",
  },
  {
    id: "qabliyah-magrib",
    name: "Qabliyah Magrib",
    rakaatNum: "2",
    rakaat: "2 rakaat, sesingkat mungkin",
    timing: "Sebelum salat Maghrib",
    note: "Tidak ada riwayat khusus yang menetapkan qabliyah Magrib sehingga bukan bagian dari rawatib muakkadah. Sebagian ulama membolehkan dua rakaat ringan berdasarkan hadis umum salat antara adzan dan iqamah; sebagian lain menahan diri dari menetapkannya sebagai sunnah Magrib.",
    arab: "أُصَلِّي قَبْلِيَّةَ الْمَغْرِبِ رَكْعَتَيْنِ سُنَّةً لِلَّهِ تَعَالَى",
    translit: "Uṣallī qabliyyatal-magribi rak'atayni sunnatan lillāhi ta'ālā",
    arti: "Aku niat salat sunnah qabliyah Maghrib dua rakaat karena Allah Ta'ala.",
  },
];

/** Catatan penutup section — ditempel di bawah daftar. */
export const SUNNAH_GUIDE_FOOTNOTE =
  "Niat pada dasarnya berada di dalam hati; lafaz Arab di atas adalah panduan pembelajaran, bukan syarat sah salat. Jumlah rawatib muakkadah diriwayatkan 10 rakaat (Bukhari) atau 12 rakaat (Tirmidzi & An-Nasa'i) — keduanya sahih dan tidak bertentangan.";
