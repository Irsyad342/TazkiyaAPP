/**
 * SUIO 3.9 — Daily Islamic Quotes.
 *
 * Kumpulan kutipan pendek (≤ ~100 karakter) yang berganti otomatis per
 * HARI LOKAL: rotasi deterministik dari tanggal (tanpa state) sehingga
 * kutipan konsisten sepanjang hari walau berpindah halaman atau membuka
 * ulang aplikasi, dan hari berbeda menghasilkan kutipan berbeda yang
 * tersebar merata di seluruh kumpulan.
 *
 * Aturan sumber:
 * - Ayat Al-Qur'an dan hadis hanya yang masyhur & terverifikasi, dengan
 *   atribusi yang benar (surat:ayat / nomor kitab hadis).
 * - Kutipan refleksi buatan TIDAK mengatasnamakan Nabi, sahabat, atau
 *   tokoh apa pun (tanpa baris `source`).
 */

export type QuoteTheme =
  | "istiqamah"
  | "sabar"
  | "syukur"
  | "tawakal"
  | "ikhtiar"
  | "memperbaiki diri"
  | "menjaga salat"
  | "menuntut ilmu"
  | "mendekat kepada Allah"
  | "doa";

export interface IslamicQuote {
  /** Teks kutipan — pendek dan utuh, tanpa atribusi di dalam teks. */
  text: string;
  /** Tema/kategori singkat untuk overline kartu. */
  theme: QuoteTheme;
  /** Referensi asli bila kutipan berasal dari ayat/hadis; kosong untuk refleksi buatan. */
  source?: string;
}

export const ISLAMIC_QUOTES: IslamicQuote[] = [
  /* ---------- Ayat Al-Qur'an (terjemahan masyhur) ---------- */
  {
    text: "Sesungguhnya bersama kesulitan ada kemudahan.",
    theme: "sabar",
    source: "Q.S. Asy-Syarh: 5–6",
  },
  {
    text: "Jangan berputus asa dari rahmat Allah; sesungguhnya Allah mengampuni dosa itu semuanya.",
    theme: "memperbaiki diri",
    source: "Q.S. Az-Zumar: 53",
  },
  {
    text: "Berdoalah kepada-Ku, niscaya akan Kuperkenankan bagimu.",
    theme: "doa",
    source: "Q.S. Ghafir: 60",
  },
  {
    text: "Bacalah dengan nama Tuhanmu yang menciptakan.",
    theme: "menuntut ilmu",
    source: "Q.S. Al-'Alaq: 1",
  },
  {
    text: "Jika engkau telah selesai, tetaplah bekerja keras dan niatkan hanya kepada Tuhanmu.",
    theme: "ikhtiar",
    source: "Q.S. Asy-Syarh: 7–8",
  },
  {
    text: "Dan Kami akan mengujimu dengan sedikit ketakutan, kelaparan, dan kekurangan harta.",
    theme: "sabar",
    source: "Q.S. Al-Baqarah: 155",
  },
  {
    text: "Dan Dia menemukanmu dalam keadaan bingung, lalu Dia memberi petunjuk.",
    theme: "mendekat kepada Allah",
    source: "Q.S. Ad-Duha: 7",
  },
  {
    text: "Ingatlah kepada-Ku, Aku pun akan ingat kepadamu.",
    theme: "mendekat kepada Allah",
    source: "Q.S. Al-Baqarah: 152",
  },
  {
    text: "Dan bersegeralah kamu kepada ampunan dari Tuhanmu.",
    theme: "istiqamah",
    source: "Q.S. Ali 'Imran: 133",
  },

  /* ---------- Hadis masyhur ---------- */
  {
    text: "Amal yang paling dicintai Allah adalah yang berkesinambungan, walaupun sedikit.",
    theme: "istiqamah",
    source: "HR. Bukhari 6464 & Muslim 783",
  },
  {
    text: "Orang yang kuat bukanlah yang pandai bergulat, melainkan yang mampu menguasai dirinya ketika marah.",
    theme: "memperbaiki diri",
    source: "HR. Bukhari 6114 & Muslim 2609",
  },
  {
    text: "Aku sesuai sangkaan hamba-Ku terhadap-Ku.",
    theme: "tawakal",
    source: "HR. Bukhari 7405 & Muslim 2675",
  },
  {
    text: "Sungguh, kejernihan jiwa dan ketenangan hati tercapai melalui zikir yang terjaga.",
    theme: "mendekat kepada Allah",
    source: "Terinspirasi Q.S. Ar-Ra'd: 28",
  },

  /* ---------- Refleksi buatan (tanpa atribusi tokoh) ---------- */
  {
    text: "Istiqamah bukan tentang tidak pernah jatuh, tetapi tentang terus kembali.",
    theme: "istiqamah",
  },
  {
    text: "Tidak semua doa dijawab dengan segera, tetapi tidak ada doa yang sia-sia.",
    theme: "doa",
  },
  {
    text: "Pelan-pelan memperbaiki diri, asalkan tidak berhenti melangkah.",
    theme: "memperbaiki diri",
  },
  {
    text: "Jangan tunggu menjadi sempurna untuk mulai mendekat kepada Allah.",
    theme: "mendekat kepada Allah",
  },
  {
    text: "Apa yang kamu usahakan hari ini, serahkan hasilnya kepada Allah.",
    theme: "tawakal",
  },
  {
    text: "Satu langkah kecil menuju kebaikan tetap lebih baik daripada diam.",
    theme: "istiqamah",
  },
  {
    text: "Sabar bukan menahan luka, melainkan menjaga hati tetap tenang dan berharap.",
    theme: "sabar",
  },
  {
    text: "Syukur membuat yang sedikit terasa cukup, dan yang cukup terasa berharga.",
    theme: "syukur",
  },
  {
    text: "Bersegeralah mencatat salatmu; ia adalah jangkar hari yang panjang.",
    theme: "menjaga salat",
  },
  {
    text: "Waktu terbaik berzikir adalah ketika hati mulai ingin berpaling dari ingatan.",
    theme: "mendekat kepada Allah",
  },
  {
    text: "Usahakanlah dengan bersungguh-sungguh, lalu pasrahkan dengan lapang dada.",
    theme: "ikhtiar",
  },
  {
    text: "Ilmu yang satu dihafal hari ini lebih berharga daripada seribu rencana yang tertunda.",
    theme: "menuntut ilmu",
  },
  {
    text: "Jika hari ini terasa berat, bersedekallah sedikit; hati akan ikut ringan.",
    theme: "syukur",
  },
  {
    text: "Kegagalan ibadah hari ini bukan akhir; malam adalah pintu untuk kembali.",
    theme: "memperbaiki diri",
  },
  {
    text: "Jaga salat lima waktu, dan ia akan menjagamu di waktu yang lain.",
    theme: "menjaga salat",
  },
  {
    text: "Tidak perlu terburu-buru mengubah semuanya; mulailah dari satu kebiasaan yang kecil.",
    theme: "istiqamah",
  },
  {
    text: "Tawakal adalah berikhtiar dengan tangan penuh dan hati yang tenang.",
    theme: "tawakal",
  },
  {
    text: "Doa yang tertunda bukan doa yang ditolak; ia sedang disiapkan di waktu yang lebih baik.",
    theme: "doa",
  },
  {
    text: "Mulailah hari dengan nama Allah, dan hari itu tidak akan pernah kosong.",
    theme: "mendekat kepada Allah",
  },
  {
    text: "Bandingkan dirimu dengan dirimu kemarin, bukan dengan ibadah orang lain.",
    theme: "memperbaiki diri",
  },
  {
    text: "Bekal terbaik untuk esok adalah salat yang kamu jaga hari ini.",
    theme: "menjaga salat",
  },
  {
    text: "Hati yang bersyukur selalu menemukan alasan untuk tetap melangkah.",
    theme: "syukur",
  },
  {
    text: "Perlahan itu bukan lambat; ia cara istiqamah menjaga api agar tidak padam.",
    theme: "istiqamah",
  },
  {
    text: "Setiap ayat yang kamu baca hari ini adalah cahaya untuk esokmu.",
    theme: "menuntut ilmu",
  },
];

/** Panjang kumpulan — untuk pengujian sebaran rotasi. */
export const QUOTES_COUNT = ISLAMIC_QUOTES.length;

/**
 * Rotasi deterministik per tanggal lokal (format "YYYY-MM-DD" — kunci hari
 * yang sama dipakai seluruh aplikasi, sehingga kutipan konsisten antar
 * halaman, antar sesi, dan tidak berubah di tengah hari).
 * Kombinasi seed tanggal × golden-ratio hash menyebarkan kutipan secara
 * merata: hari berurutan jarang jatuh pada kutipan yang sama.
 */
export function quoteForDate(isoDate: string): IslamicQuote {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  const y = m ? parseInt(m[1], 10) : 0;
  const mo = m ? parseInt(m[2], 10) : 1;
  const d = m ? parseInt(m[3], 10) : 1;
  let h = (y * 372 + mo * 31 + d) >>> 0;
  h = (h * 2654435761) >>> 0; /* Knuth multiplicative hash */
  /* XOR pada JS menghasilkan int32 bertanda — paksa kembali unsigned agar
     hasil modulo selalu indeks valid (0..length-1). */
  h = (h ^ (h >>> 13)) >>> 0;
  return ISLAMIC_QUOTES[h % ISLAMIC_QUOTES.length];
}

/* ---------- API legacy (tetap kompatibel bila ada pemakai lama) ---------- */

export interface MotivationQuote {
  text: string;
  source?: string;
}

export const MOTIVATIONS: MotivationQuote[] = ISLAMIC_QUOTES.map((q) => ({
  text: q.text,
  ...(q.source ? { source: q.source } : {}),
}));

export function motivationOfTheDay(dateKeyStr: string): MotivationQuote {
  const q = quoteForDate(dateKeyStr);
  return { text: q.text, ...(q.source ? { source: q.source } : {}) };
}
