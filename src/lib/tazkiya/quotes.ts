/**
 * Tazkiya — Pesan motivasi harian.
 * Atribusi hanya dicantumkan untuk redaksi yang benar-benar dirujuk dari sumber;
 * sisanya merupakan kalimat motivasi umum tanpa atribusi palsu.
 */

export interface MotivationQuote {
  text: string;
  source?: string;
}

export const MOTIVATIONS: MotivationQuote[] = [
  {
    text: "Amalan yang paling dicintai Allah adalah yang paling berkesinambungan, meskipun sedikit.",
    source: "HR. Bukhari & Muslim",
  },
  { text: "Sedikit yang konsisten jauh lebih berharga daripada banyak yang hanya sesekali." },
  { text: "Mulailah dari yang kecil hari ini — langkah kecil yang istiqamah membawa perubahan besar." },
  { text: "Jaga Subuh-mu, insya Allah Allah menjaga harimu." },
  { text: "Setiap ayat yang kamu baca hari ini adalah cahaya untuk esokmu." },
  { text: "Jantung yang tenang diraih melalui zikir yang terjaga." },
  { text: "Jangan menunggu sempurna untuk memulai, mulailah agar menjadi semakin baik." },
  { text: "Ibadah hari ini adalah investasi terbaik untuk akhiratmu." },
];

export function motivationOfTheDay(dateKeyStr: string): MotivationQuote {
  let hash = 0;
  for (let i = 0; i < dateKeyStr.length; i++) {
    hash = (hash * 31 + dateKeyStr.charCodeAt(i)) % 100000;
  }
  return MOTIVATIONS[hash % MOTIVATIONS.length];
}
