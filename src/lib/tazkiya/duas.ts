/**
 * Tazkiya — Koleksi doa harian dengan sumber terverifikasi.
 *
 * Semua teks Arab, transliterasi, dan arti diambil dari ayat Al-Qur'an
 * atau hadis yang dirujuk secara eksplisit. Tidak ada doa buatan yang
 * diberi atribusi palsu. Pemilihan doa berdasarkan tanggal lokal sehingga
 * stabil sepanjang hari dan berganti saat tanggal berubah.
 */

export interface DailyDua {
  id: string;
  title: string; // tema doa dalam Bahasa Indonesia
  arabic: string; // teks Arab
  transliteration: string; // transliterasi latin
  meaning: string; // arti dalam Bahasa Indonesia
  source: string; // referensi: QS ... / HR. ...
}

export const DAILY_DUAS: DailyDua[] = [
  {
    id: "kebaikan-dunia-akhirat",
    title: "Memohon kebaikan dunia dan akhirat",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    transliteration:
      "Rabbanaa aatinaa fid-dunyaa hasanah, wa fil-aakhirati hasanah, wa qinaa 'adzaaban-naar",
    meaning:
      "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, serta lindungilah kami dari azab neraka.",
    source: "QS Al-Baqarah: 201",
  },
  {
    id: "ilmu-bermanfaat",
    title: "Memohon tambahan ilmu",
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidnii 'ilmaa",
    meaning: "Ya Tuhanku, tambahkanlah ilmu kepadaku.",
    source: "QS Thaha: 114",
  },
  {
    id: "kemudahan-urusan",
    title: "Memohon kelapangan dan kemudahan",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    transliteration: "Rabbisyrach lii sadrii wa yassir lii amrii",
    meaning: "Ya Tuhanku, lapangkanlah dadaku dan mudahkanlah urusanku.",
    source: "QS Thaha: 25–26 (doa Nabi Musa)",
  },
  {
    id: "ketenangan-hati",
    title: "Memohon hati yang tetap teguh",
    arabic:
      "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً ۚ إِنَّكَ أَنْتَ الْوَهَّابُ",
    transliteration:
      "Rabbanaa laa tuzig quluubanaa ba'da idz hadaitanaa wa hab lanaa mil ladunka rahmah, innaka antal wahhaab",
    meaning:
      "Ya Tuhan kami, janganlah Engkau biarkan hati kami menyimpang setelah Engkau memberi petunjuk, dan karuniauilah kami rahmat dari sisi Engkau. Sungguh, Engkau Maha Pemberi.",
    source: "QS Ali 'Imran: 8",
  },
  {
    id: "tawakal",
    title: "Berserah kepada Allah",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    transliteration: "Hasbunallahu wa ni'mal wakiil",
    meaning:
      "Cukuplah Allah sebagai penolong kami dan Dia adalah sebaik-baik pelindung.",
    source: "QS Ali 'Imran: 173",
  },
  {
    id: "keberkahan-rizki",
    title: "Memohon keberkahan rezeki",
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِي طَعَامِنَا وَأَطْعِمْنَا خَيْرًا مِنْهُ",
    transliteration: "Allahumma baarik lanaa fii ta'aaminaa wa ath'imnaa khairan minh",
    meaning:
      "Ya Allah, berkahilah makanan kami dan berilah kami makan yang lebih baik daripadanya.",
    source: "HR. Abu Dawud no. 3850",
  },
  {
    id: "rahmat-dan-rasyad",
    title: "Memohon rahmat dan petunjuk",
    arabic: "رَبَّنَا آتِنَا مِنْ لَدُنْكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
    transliteration:
      "Rabbanaa aatinaa mil ladunka rahmah wa hayyi' lanaa min amrinaa rasyadaa",
    meaning:
      "Ya Tuhan kami, berilah kami rahmat dari sisi Engkau dan siapkanlah untuk kami petunjuk kebaikan dalam urusan kami.",
    source: "QS Al-Kahfi: 10 (doa para pemuda gua)",
  },
  {
    id: "ampunan-orang-tua",
    title: "Memohon ampunan untuk diri dan orang tua",
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ",
    transliteration: "Rabbighfir lii wa liwaalidayya",
    meaning: "Ya Tuhanku, ampunilah aku dan kedua orang tuaku.",
    source: "QS Nuh: 28",
  },
  {
    id: "ampunan-kekhilafan",
    title: "Memohon tidak disiksa karena kelalaian",
    arabic: "رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا",
    transliteration: "Rabbanaa laa tu'aakhidznaa in nasiinaa aw akhtha'naa",
    meaning:
      "Ya Tuhan kami, janganlah Engkau hukum kami karena kelalaian kami atau kesalahan kami.",
    source: "QS Al-Baqarah: 286",
  },
  {
    id: "sayyidul-istighfar",
    title: "Sayyidul Istighfar — pemohon ampunan utama",
    arabic:
      "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration:
      "Allahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana 'abduka, wa ana 'alaa 'ahdika wa wa'dika mastatha'tu, a'uudzu bika min syarri maa shana'tu, abuu'u laka bini'matika 'alayya, wa abuu'u bidzanbii, faghfir lii, fa innahu laa yaghfirudz-dzunuuba illaa anta",
    meaning:
      "Ya Allah, Engkau Tuhanku, tidak ada tuhan selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu. Aku berusaha menetapi perjanjianku dengan-Mu sesuai kemampuanku. Aku berlindung kepada-Mu dari keburukan perbuatanku. Aku mengakui nikmat-Mu atasku dan mengakui dosaku, maka ampunilah aku. Sungguh, tidak ada yang mengampuni dosa selain Engkau.",
    source: "HR. Bukhari no. 6306",
  },
  {
    id: "zikir-syukur-ibadah",
    title: "Memohon bantuan dalam berzikir dan bersyukur",
    arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    transliteration:
      "Allahumma a'innii 'alaa dzikrika wa syukrika wa husni 'ibaadatik",
    meaning:
      "Ya Allah, tolonglah aku agar senantiasa mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.",
    source: "HR. Abu Dawud no. 1522",
  },
  {
    id: "perlindungan-cemas",
    title: "Perlindungan dari cemas dan kelemahan",
    arabic:
      "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
    transliteration:
      "Allahumma innii a'uudzu bika minal hammi wal hazan, wal 'ajzi wal kasal, wal bakhli wal jubn, wa dhala'id-dayni wa ghalabatir-rijaal",
    meaning:
      "Ya Allah, aku berlindung kepada-Mu dari kecemasan dan kesedihan, dari kelemahan dan kemalasan, dari kekikiran dan kepengecutan, dari beban utang dan tekanan manusia.",
    source: "HR. Bukhari no. 6369",
  },
  {
    id: "kesehatan",
    title: "Memohon kesehatan tubuh dan pancaindra",
    arabic:
      "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration:
      "Allahumma 'aafinii fii badanii, Allahumma 'aafinii fii sam'ii, Allahumma 'aafinii fii basharii, laa ilaaha illaa anta",
    meaning:
      "Ya Allah, sehatkanlah badanku, sehatkanlah pendengaranku, sehatkanlah penglihatanku. Tidak ada tuhan selain Engkau.",
    source: "HR. Abu Dawud no. 5090",
  },
  {
    id: "afiyah-dunia-akhirat",
    title: "Memohon ampunan dan keselamatan",
    arabic:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
    transliteration:
      "Allahumma innii as-alukal 'afwa wal 'aafiyata fid-dunyaa wal aakhirah",
    meaning:
      "Ya Allah, aku memohon kepada-Mu ampunan dan keselamatan (dari segala yang membahayakan) di dunia dan di akhirat.",
    source: "HR. Abu Dawud no. 1555",
  },
  {
    id: "perlindungan-pagi",
    title: "Perlindungan dengan nama Allah",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration:
      "Bismillahilladzi laa yadhurru ma'asmihi syai'un fil-ardhi wa laa fis-samaa', wa huwas-sami'ul-'aliim",
    meaning:
      "Dengan nama Allah yang bersama nama-Nya tidak ada sesuatu pun yang dapat membahayakan, baik di bumi maupun di langit. Dan Dia Maha Mendengar lagi Maha Mengetahui.",
    source: "HR. Abu Dawud no. 5088 & Tirmidzi",
  },
];

/** Fallback aman bila koleksi tidak tersedia — tanpa atribusi palsu. */
export const DUA_FALLBACK: DailyDua = {
  id: "fallback",
  title: "Doa hari ini",
  arabic: "",
  transliteration: "",
  meaning:
    "Mulailah harimu dengan memohon kebaikan di dunia dan di akhirat, serta jaga salatmu sebaik-baiknya.",
  source: "",
};

/** Hash deterministik dari kunci tanggal (stabil sepanjang hari). */
function hashDateKey(dateKeyStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateKeyStr.length; i++) {
    hash = (hash * 31 + dateKeyStr.charCodeAt(i)) % 100000;
  }
  return hash;
}

/**
 * Doa untuk satu tanggal lokal (YYYY-MM-DD): berganti saat tanggal berubah,
 * tetap sama ketika halaman dimuat ulang pada hari yang sama.
 */
export function duaOfTheDay(dateKeyStr: string): DailyDua {
  if (!DAILY_DUAS.length) return DUA_FALLBACK;
  return DAILY_DUAS[hashDateKey(dateKeyStr) % DAILY_DUAS.length];
}
