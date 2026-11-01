/**
 * Tazkiya — Konten Zikir & Doa dengan sumber terverifikasi.
 *
 * Aturan mutlak berdasarkan permintaan pengguna:
 * - Bacaan hanya diambil dari Al-Qur'an dan riwayat yang dirujuk eksplisit.
 * - Setiap bacaan membawa sumber (QS / kitab + nomor) bila tersedia.
 * - Teks Arab pendek yang masyhur ditulis lengkap; bacaan panjang yang
 *   berisiko salah tulis dituliskan namanya + transliterasi + arti + sumber.
 * - TIDAK ada bacaan karangan yang diberi atribusi palsu.
 */

import type { ZikirSlot } from "./types";

/* ------------------------------ ZIKIR ------------------------------ */

export interface ZikirItem {
  id: string;
  /** Nama bacaan bila teks Arab tidak ditampilkan penuh. */
  name?: string;
  arabic?: string;
  latin: string;
  meaning?: string;
  /** Ulangan yang dianjurkan, mis. "3×", "100×". */
  count?: string;
  source?: string;
}

export interface ZikirSet {
  id: string;
  slot: ZikirSlot;
  title: string;
  caption: string;
  items: ZikirItem[];
}

const AYAT_KURSI: ZikirItem = {
  id: "ayat-kursi",
  name: "Ayat Kursi",
  arabic:
    "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
  latin: "Allahu laa ilaaha illaa huwal-hayyul-qayyuum…",
  meaning:
    "Allah, tidak ada tuhan selain Dia, Yang Maha Hidup lagi terus-menerus mengurus (makhluk-Nya). Dia tidak mengantuk dan tidak tidur… (QS Al-Baqarah: 255)",
  count: "1×",
  source: "QS Al-Baqarah: 255",
};

const TIGA_MUAWWIDZAT: ZikirItem = {
  id: "muawwidzat",
  name: "Al-Ikhlas, Al-Falaq, An-Nas",
  latin: "Qul huwallaahu ahad … · Qul a'uudzu birabbil-falaq … · Qul a'uudzu birabbin-naas …",
  meaning: "Tiga surah perlindungan — masing-masing dibaca tiga kali pada pagi dan petang.",
  count: "3× setiap surah",
  source: "HR. Abu Dawud no. 5082 & Tirmidzi no. 3575",
};

const PAGI_PETANG_CORE: ZikirItem[] = [
  AYAT_KURSI,
  TIGA_MUAWWIDZAT,
  {
    id: "bismillah-laa-yadhurru",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    latin: "Bismillaahilladzi laa yadhurru ma'asmihi syai'un fil-ardhi wa laa fis-samaa', wa huwas-sami'ul-'aliim",
    meaning:
      "Dengan nama Allah yang bersama nama-Nya tidak ada sesuatu pun yang membahayakan, baik di bumi maupun di langit. Dan Dia Maha Mendengar lagi Maha Mengetahui.",
    count: "3×",
    source: "HR. Abu Dawud no. 5088 & Tirmidzi no. 3388",
  },
  {
    id: "radhitu-billah",
    arabic:
      "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    latin: "Radhiitu billaahi rabbaa, wa bil-islaami diinaa, wa bi-Muhammadin ﷺ nabiyyaa",
    meaning: "Aku ridha Allah sebagai Tuhanku, Islam sebagai agamaku, dan Muhammad ﷺ sebagai nabiku.",
    count: "3×",
    source: "HR. Abu Dawud no. 5072 & Tirmidzi no. 3389",
  },
  {
    id: "hasbiyallah",
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    latin: "Hasbiyallaahu laa ilaaha illaa huwa 'alayhi tawakkaltu wa huwa rabbul-'arsyil-'azhiim",
    meaning: "Cukuplah Allah bagiku, tidak ada tuhan selain Dia. Kepada-Nya aku bertawakal, dan Dia adalah Tuhan pemilik 'Arsy yang agung.",
    count: "7×",
    source: "HR. Abu Dawud no. 5081 & Ibnus-Sunni",
  },
  {
    id: "allahumma-aafini",
    arabic:
      "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ",
    latin: "Allahumma 'aafinii fii badanii, Allahumma 'aafinii fii sam'ii, Allahumma 'aafinii fii basharii, laa ilaaha illaa anta",
    meaning: "Ya Allah, sehatkanlah badanku, pendengaranku, dan penglihatanku. Tidak ada tuhan selain Engkau.",
    count: "3×",
    source: "HR. Abu Dawud no. 5090",
  },
  {
    id: "sayyidul-istighfar",
    name: "Sayyidul Istighfar",
    latin: "Allahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduka…",
    meaning:
      "Ya Allah, Engkau Tuhanku, tidak ada tuhan selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu… (teks penuh tersedia di kartu Doa Hari Ini).",
    count: "1×",
    source: "HR. Bukhari no. 6306",
  },
  {
    id: "laa-ilaaha-100x",
    arabic:
      "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul-mulku wa lahul-hamdu wa huwa 'alaa kulli syai'in qadiir",
    meaning: "Tidak ada tuhan selain Allah semata, tiada sekutu bagi-Nya. Milik-Nya kerajaan dan pujian, dan Dia Maha Kuasa atas segala sesuatu.",
    count: "10× atau 100×",
    source: "HR. Bukhari no. 3293 & Muslim no. 2691",
  },
  {
    id: "subhanallah-100x",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    latin: "Subhaanallaahi wa bihamdih",
    meaning: "Maha Suci Allah dan segala pujian bagi-Nya.",
    count: "100×",
    source: "HR. Muslim no. 2691",
  },
];

export const ZIKIR_SETS: ZikirSet[] = [
  {
    id: "zikir-pagi",
    slot: "pagi",
    title: "Zikir Pagi",
    caption: "Dibaca setelah Subuh hingga terbit matahari",
    items: PAGI_PETANG_CORE,
  },
  {
    id: "zikir-petang",
    slot: "petang",
    title: "Zikir Petang",
    caption: "Dibaca setelah Asar hingga terbenam matahari",
    items: PAGI_PETANG_CORE,
  },
  {
    id: "zikir-setelah-sholat",
    slot: "setelah-sholat",
    title: "Zikir Setelah Salat",
    caption: "Sembahyang sunah & zikir setiap selesai salat fardu",
    items: [
      {
        id: "istighfar-3x",
        arabic: "أَسْتَغْفِرُ اللَّهَ",
        latin: "Astaghfirullaah",
        meaning: "Aku memohon ampun kepada Allah.",
        count: "3×",
        source: "HR. Muslim no. 591",
      },
      {
        id: "allahumma-antas-salam",
        arabic:
          "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        latin: "Allahumma antas-salaamu wa minkas-salaam, tabaarakta yaa dzal-jalaali wal-ikraam",
        meaning: "Ya Allah, Engkau Sumber Kesejahteraan, dan dari Engkau kesejahteraan itu. Maha Berkah Engkau, Wahai Pemilik Keagungan dan Kemuliaan.",
        source: "HR. Muslim no. 591",
      },
      {
        id: "tasbih-33",
        arabic: "سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ",
        latin: "Subhaanallaah (33×) · Alhamdulillaah (33×) · Allahu Akbar (33×)",
        meaning: "Maha Suci Allah · Segala pujian bagi Allah · Allah Maha Besar.",
        count: "33× masing-masing",
        source: "HR. Muslim no. 596",
      },
      {
        id: "tahlil-setelah-sholat",
        arabic:
          "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
        latin: "Laa ilaaha illallaahu wahdahu laa syariika lah… (teks lengkap)",
        meaning:
          "Tidak ada tuhan selain Allah semata… tidak ada yang dapat menahan apa yang Engkau berikan, dan tidak ada yang dapat memberi apa yang Engkau tahan.",
        count: "1× setelah 33×3",
        source: "HR. Muslim no. 596",
      },
      {
        id: "ayat-kursi-badai-salat",
        name: "Ayat Kursi",
        latin: "Allahu laa ilaaha illaa huwal-hayyul-qayyuum…",
        meaning: "QS Al-Baqarah: 255 — dibaca setelah setiap salat fardu.",
        count: "1×",
        source: "HR. An-Nasa'i (Sunan al-Kubra) no. 9928 — dinilai sahih oleh al-Albani",
      },
      {
        id: "muawwidzat-badai-salat",
        name: "Al-Ikhlas, Al-Falaq, An-Nas",
        latin: "Qul huwallaahu ahad… · Qul a'uudzu birabbil-falaq… · Qul a'uudzu birabbin-naas…",
        meaning: "Tiga surah terakhir — dibaca setelah setiap salat fardu.",
        count: "1× masing-masing",
        source: "HR. Abu Dawud no. 1523 & An-Nasa'i no. 1337",
      },
      {
        id: "allahumma-a-inni",
        arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        latin: "Allahumma a'innii 'alaa dzikrika wa syukrika wa husni 'ibaadatik",
        meaning: "Ya Allah, tolonglah aku agar senantiasa mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.",
        source: "HR. Abu Dawud no. 1522",
      },
    ],
  },
  {
    id: "zikir-harian",
    slot: "harian",
    title: "Zikir Harian",
    caption: "Dibaca kapan saja sepanjang hari",
    items: [
      {
        id: "istighfar-harian",
        arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
        latin: "Astaghfirullaaha wa atuubu ilayh",
        meaning: "Aku memohon ampun kepada Allah dan bertaubat kepada-Nya.",
        count: "Bebas",
        source: "HR. Bukhari no. 6307",
      },
      {
        id: "tahlil-harian",
        arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ",
        latin: "Laa ilaaha illallaah",
        meaning: "Tidak ada tuhan selain Allah.",
        count: "Bebas",
        source: "HR. Bukhari no. 6401 & Muslim no. 213",
      },
      {
        id: "salawat-harian",
        arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
        latin: "Allahumma shalli 'alaa Muhammadin wa 'alaa aali Muhammad",
        meaning: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad.",
        count: "Bebas",
        source: "HR. Bukhari no. 3370",
      },
      {
        id: "hawqalah",
        arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        latin: "Laa haula wa laa quwwata illaa billaah",
        meaning: "Tidak ada daya dan kekuatan kecuali dengan pertolongan Allah.",
        count: "Bebas",
        source: "HR. Bukhari no. 4205 & Muslim no. 2704",
      },
      {
        id: "tahmid-keseharian",
        arabic: "الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ",
        latin: "Alhamdulillaahi 'alaa kulli haal",
        meaning: "Segala pujian bagi Allah dalam setiap keadaan.",
        count: "Bebas",
        source: "Doa masyhur tanpa nomor riwayat khusus — tanpa klaim hadis",
      },
    ],
  },
];

/* ------------------------------ DOA ------------------------------ */

export type DoaKategori = "harian" | "setelah-sholat" | "pagi-petang" | "aktivitas";

export const DOA_KATEGORI: { id: DoaKategori; label: string; caption: string }[] = [
  { id: "harian", label: "Doa Harian", caption: "Doa pilihan untuk keseharian" },
  { id: "setelah-sholat", label: "Setelah Salat", caption: "Dzikir & doa pasca salat fardu" },
  { id: "pagi-petang", label: "Pagi & Petang", caption: "Benteng harian pagi dan petang" },
  { id: "aktivitas", label: "Aktivitas Harian", caption: "Bangun, makan, perjalanan, dan lainnya" },
];

export interface DoaItem {
  id: string;
  title: string;
  arabic: string;
  latin: string;
  meaning: string;
  source: string;
  kategori: DoaKategori;
  /** Ulangan yang dianjurkan bila ada, mis. "7×". */
  count?: string;
}

export const DOA_KOLEKSI: DoaItem[] = [
  {
    id: "bangun-tidur",
    title: "Saat bangun tidur",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    latin: "Alhamdulillaahilladzi ahyaanaa ba'da maa amaatanaa wa ilayhin-nusyuur",
    meaning: "Segala pujian bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan.",
    source: "HR. Bukhari no. 6312",
    kategori: "aktivitas",
  },
  {
    id: "sebelum-tidur",
    title: "Sebelum tidur",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    latin: "Bismika Allaahumma amuutu wa ahyaa",
    meaning: "Dengan nama-Mu ya Allah, aku mati dan aku hidup.",
    source: "HR. Bukhari no. 6324",
    kategori: "aktivitas",
  },
  {
    id: "sebelum-makan",
    title: "Sebelum makan",
    arabic: "بِسْمِ اللَّهِ",
    latin: "Bismillaah — dan bila terlupa: Bismillaahi awwalahuu wa aakhirah",
    meaning: "Dengan nama Allah; dan bila terlupa di awal: dengan nama Allah pada awalnya dan akhirnya.",
    source: "HR. Abu Dawud no. 3767 & Tirmidzi no. 1858",
    kategori: "aktivitas",
  },
  {
    id: "keluar-rumah",
    title: "Saat keluar rumah",
    arabic: "بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    latin: "Bismillaah, tawakkaltu 'alallaah, wa laa haula wa laa quwwata illaa billaah",
    meaning: "Dengan nama Allah, aku bertawakal kepada Allah, dan tidak ada daya serta kekuatan kecuali dengan pertolongan Allah.",
    source: "HR. Abu Dawud no. 5095 & Tirmidzi no. 3426",
    kategori: "aktivitas",
  },
  {
    id: "masuk-rumah",
    title: "Saat masuk rumah",
    arabic: "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى رَبِّنَا تَوَكَّلْنَا",
    latin: "Bismillaahi walajnaa wa bismillaahi kharajnaa wa 'alaa rabbinaa tawakkalnaa",
    meaning: "Dengan nama Allah kami masuk, dengan nama Allah kami keluar, dan kepada Tuhan kami bertawakal.",
    source: "HR. Abu Dawud no. 5096",
    kategori: "aktivitas",
  },
  {
    id: "naik-kendaraan",
    title: "Saat naik kendaraan",
    arabic:
      "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ",
    latin: "Subhaanalladzi sakhkhara lanaa haadzaa wa maa kunnaa lahuu muqriniin, wa innaa ilaa rabbinaa lamunqalibuun",
    meaning: "Maha Suci Dia yang menundukkan (kendaraan) ini bagi kami, padahal kami tidak mampu menguasainya. Dan sungguh hanya kepada Tuhan kami kami akan kembali.",
    source: "QS Az-Zukhruf: 13–14 · HR. Muslim no. 1342",
    kategori: "aktivitas",
  },
  {
    id: "masuk-masjid",
    title: "Masuk masjid",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    latin: "Allahummaf-tach lii abwaaba rahmatik",
    meaning: "Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu.",
    source: "HR. Muslim no. 713",
    kategori: "aktivitas",
  },
  {
    id: "keluar-masjid",
    title: "Keluar masjid",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    latin: "Allahumma innii as-aluka min fadhlik",
    meaning: "Ya Allah, aku memohon kepada-Mu sebagian karunia-Mu.",
    source: "HR. Muslim no. 713",
    kategori: "aktivitas",
  },
  {
    id: "doa-orang-sakit",
    title: "Menengok orang sakit",
    arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
    latin: "As-alullaahal-'azhiima rabbal-'arsyil-'azhiimi an yasyfiyak",
    meaning: "Aku memohon kepada Allah Yang Maha Agung, Tuhan pemilik 'Arsy yang agung, agar Dia menyembuhkanmu.",
    count: "7×",
    source: "HR. Abu Dawud no. 3106 & Tirmidzi no. 2083",
    kategori: "aktivitas",
  },
  {
    id: "pagi-amsayna",
    title: "Pagi & petang",
    arabic:
      "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    latin: "Allahumma bika asbahnaa wa bika amsaynaa, wa bika nahyaa wa bika namuutu, wa ilaykan-nusyuur",
    meaning: "Ya Allah, dengan pertolongan-Mu kami memasuki pagi dan petang, dengan-Mu kami hidup dan mati, dan kepada-Mu tempat kembali.",
    source: "HR. Tirmidzi no. 3391 & Abu Dawud no. 5071",
    kategori: "pagi-petang",
  },
  {
    id: "uwazu-bikalimat",
    title: "Perlindungan pagi & petang",
    arabic:
      "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    latin: "A'uudzu bikalimaatillaahit-taammaati min syarri maa khalaq",
    meaning: "Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari keburukan makhluk yang Dia ciptakan.",
    source: "HR. Muslim no. 2708 & Tirmidzi no. 3604",
    kategori: "pagi-petang",
  },
  {
    id: "setelah-adzan",
    title: "Setelah azan",
    arabic:
      "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
    latin: "Allahumma rabba haadzihid-da'watit-taammah wash-shalaatil-qaaimah, aati Muhammadanil-wasiilata wal-fadhiilah, wab'ats-hu maqaaman mahmuudan alladzi wa'adtah",
    meaning: "Ya Allah, Tuhan pemilik seruan yang sempurna dan salat yang tetap, berilah Muhammad wasilah dan keutamaan, serta bangkitkanlah ia ke tempat yang terpuji yang telah Engkau janjikan.",
    source: "HR. Bukhari no. 614",
    kategori: "setelah-sholat",
  },
  {
    id: "baada-salat-laa-ilaaha",
    title: "Setelah salat (tahlil)",
    arabic:
      "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    latin: "Laa ilaaha illallaahu wahdahu laa syariika lah, lahul-mulku wa lahul-hamdu wa huwa 'alaa kulli syai'in qadiir",
    meaning: "Tidak ada tuhan selain Allah semata, tiada sekutu bagi-Nya. Milik-Nya kerajaan dan pujian, dan Dia Maha Kuasa atas segala sesuatu.",
    source: "HR. Muslim no. 596",
    kategori: "setelah-sholat",
  },
  {
    id: "allahumma-ajirni",
    title: "Perlindungan dari siksa neraka",
    arabic: "اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ",
    latin: "Allahummajirnii minan-naar",
    meaning: "Ya Allah, selamatkanlah aku dari api neraka.",
    count: "7× setelah salat Subuh & Magrib",
    source: "HR. Abu Dawud no. 1520 — riwayat dhaif-menengah, tanpa klaim sahih",
    kategori: "setelah-sholat",
  },
];

/** Doa harian untuk kategori "harian": hasil kurasi dari koleksi yang sudah ada. */
export const DOA_HARIAN_IDS = ["perlindungan-cemas", "kesehatan", "afiyah-dunia-akhirat", "kebaikan-dunia-akhirat", "tawakal", "sayyidul-istighfar", "zikir-syukur-ibadah", "ilmu-bermanfaat"] as const;
