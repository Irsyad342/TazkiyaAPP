"use client";

/**
 * Tazkiya — Ilustrasi pemandangan "Waktu-Waktu Penting" (SVG prosedural, orisinal).
 * Empat scene satu gaya: MASJID sebagai elemen utama (kubah + dua menara, bentuk
 * identik di semua kartu) dikelilingi suasana waktunya — langit, bintang/bulan,
 * matahari, air/taman, atmosfer. Palet TETAP per suasana dan sengaja TIDAK memakai
 * token tema agar identik di semua tema aplikasi. Inline SVG: nol request jaringan,
 * tajam di semua DPR, ringan (±5 KB per scene). Semua id gradient DI-PREFIX per
 * scene agar tidak bentrok saat beberapa scene termount bersamaan.
 */

/* ---------- Bentuk masjid (dipakai bersama, warna via props) ---------- */

type MosqueProps = {
  wall: string;
  dome: string;
  trim: string;
  door: string;
  win: string;
  /** Cahaya lembut di belakang bangunan (jendela menyala saat malam). */
  glow?: { id: string; color: string; opacity: number; rx: number; ry: number };
};

function Mosque({ wall, dome, trim, door, win, glow }: MosqueProps) {
  return (
    <g>
      {glow ? (
        <ellipse cx="200" cy="150" rx={glow.rx} ry={glow.ry} fill={`url(#${glow.id})`} />
      ) : null}
      {/* menara kiri & kanan */}
      {[132, 254].map((x) => (
        <g key={x}>
          <rect x={x} y="106" width="14" height="70" fill={wall} rx="2" />
          <rect x={x - 3} y="120" width="20" height="7" fill={trim} rx="2" />
          <path d={`M${x} 106 Q${x + 7} 92 ${x + 14} 106 Z`} fill={dome} />
          <circle cx={x + 7} cy="90" r="2.6" fill={trim} />
          <rect x={x + 4} y="126" width="6" height="11" rx="3" fill={win} />
        </g>
      ))}
      {/* bangunan utama */}
      <rect x="152" y="138" width="96" height="38" fill={wall} rx="3" />
      <rect x="149" y="134" width="102" height="6" fill={trim} rx="2" />
      {/* kubah utama + finial */}
      <path d="M200 88 C 176 102 168 121 170 138 L 230 138 C 232 121 224 102 200 88 Z" fill={dome} />
      <rect x="198.4" y="76" width="3.2" height="12" fill={trim} />
      <circle cx="200" cy="74" r="3" fill={trim} />
      {/* pintu lengkung + jendela bangunan */}
      <path d="M192 176 L192 158 Q200 146 208 158 L208 176 Z" fill={door} />
      {[164, 228].map((x) => (
        <path key={x} d={`M${x} 170 L${x} 161 Q${x + 6} 154 ${x + 12} 161 L${x + 12} 170 Z`} fill={win} />
      ))}
    </g>
  );
}

/* ---------- Bintang & kilau air ---------- */

const star = ([cx, cy, r, o]: number[], i: number, fill: string) => (
  <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={o} />
);
const glint = ([x, y, w]: number[], i: number, fill: string, o: number) => (
  <rect key={i} x={x} y={y} width={w} height={2} rx={1} fill={fill} opacity={o} />
);

const IMSAK_STARS: number[][] = [
  [40, 34, 1.1, 0.9], [86, 20, 0.8, 0.6], [150, 44, 0.9, 0.7], [292, 24, 1.1, 0.85],
  [338, 52, 0.8, 0.55], [372, 26, 1, 0.8], [64, 78, 0.8, 0.5], [124, 92, 0.7, 0.45],
  [268, 74, 0.9, 0.6], [352, 96, 0.7, 0.4],
];
const TJ_STARS: number[][] = [
  [34, 30, 1.2, 0.95], [72, 58, 0.8, 0.6], [118, 24, 0.9, 0.75], [164, 52, 1.3, 0.95],
  [212, 30, 0.8, 0.6], [330, 108, 0.8, 0.5], [366, 76, 0.8, 0.55], [52, 108, 0.8, 0.5],
  [96, 132, 0.7, 0.4], [150, 104, 0.9, 0.6], [262, 128, 0.7, 0.4], [386, 24, 0.8, 0.6],
  [188, 84, 0.7, 0.45], [344, 34, 1, 0.8],
];
const WATER_GLINTS: number[][] = [[150, 234, 42], [166, 246, 24], [146, 258, 32], [178, 268, 20]];

const SCENE_ATTRS = {
  className: "wp-scene",
  viewBox: "0 0 400 280",
  preserveAspectRatio: "xMidYMid slice",
  "aria-hidden": true,
  focusable: false,
} as const;

/* ============ IMSAK — masjid di dini hari menjelang fajar ============ */
export function SceneImsak() {
  return (
    <svg {...SCENE_ATTRS}>
      <defs>
        <linearGradient id="i-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10163a" />
          <stop offset="0.55" stopColor="#2b3572" />
          <stop offset="0.82" stopColor="#5f58a0" />
          <stop offset="1" stopColor="#a48cc0" />
        </linearGradient>
        <linearGradient id="i-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a6cb0" />
          <stop offset="0.4" stopColor="#333a78" />
          <stop offset="1" stopColor="#181d44" />
        </linearGradient>
        <radialGradient id="i-moonlight">
          <stop offset="0" stopColor="#efe6ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#efe6ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="i-mosqueglow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <mask id="i-cut">
          <rect width="400" height="280" fill="#fff" />
          <circle cx="119" cy="58" r="16" fill="#000" />
        </mask>
      </defs>
      <rect width="400" height="280" fill="url(#i-sky)" />
      <g className="wp-tw">{IMSAK_STARS.map((s, i) => star(s, i, "#e9e7ff"))}</g>
      <circle cx="104" cy="64" r="34" fill="url(#i-moonlight)" className="wp-glow" />
      <g mask="url(#i-cut)">
        <circle cx="104" cy="64" r="19" fill="#f6efdc" />
      </g>
      {/* kabut fajar di horizon */}
      <ellipse cx="200" cy="174" rx="190" ry="10" fill="#c8a9d4" opacity="0.3" />
      {/* masjid dini hari: lampu lembut menyala */}
      <Mosque
        wall="#20265a"
        dome="#161c48"
        trim="#2e3570"
        door="#ffd98a"
        win="#ffca7a"
        glow={{ id: "i-mosqueglow", color: "#ffd98a", opacity: 0.35, rx: 86, ry: 30 }}
      />
      {/* danau + refleksi masjid */}
      <rect x="0" y="176" width="400" height="104" fill="url(#i-lake)" />
      <g transform="translate(0 352) scale(1 -1)" opacity="0.13">
        <Mosque wall="#161c48" dome="#10153a" trim="#20265a" door="#ffd98a" win="#ffca7a" />
      </g>
      <ellipse cx="200" cy="222" rx="170" ry="8" fill="#a18bc4" opacity="0.2" />
      <g>{WATER_GLINTS.map((g, i) => glint(g, i, "#d9cdf6", 0.5))}</g>
    </svg>
  );
}

/* ============ TERBIT — masjid dengan matahari terbit di horizon ============ */
export function SceneTerbit() {
  return (
    <svg {...SCENE_ATTRS}>
      <defs>
        <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5c493" />
          <stop offset="0.5" stopColor="#ffb489" />
          <stop offset="0.82" stopColor="#ff9a74" />
          <stop offset="1" stopColor="#ff8b6b" />
        </linearGradient>
        <radialGradient id="t-sunrise">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#ffd9a0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="t-yard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a05a62" />
          <stop offset="1" stopColor="#6b3a52" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#t-sky)" />
      {/* matahari baru muncul di horizon, tepat di belakang kubah */}
      <circle cx="200" cy="172" r="70" fill="url(#t-sunrise)" className="wp-glow" />
      <circle cx="200" cy="176" r="30" fill="#ffd98a" />
      {/* awan tipis hangat */}
      <g fill="#ffedd0" opacity="0.75">
        <ellipse cx="66" cy="54" rx="36" ry="8" />
        <ellipse cx="92" cy="46" rx="26" ry="7" />
        <ellipse cx="318" cy="42" rx="40" ry="8" />
        <ellipse cx="344" cy="34" rx="22" ry="6" />
        <ellipse cx="150" cy="82" rx="28" ry="6" opacity="0.6" />
        <ellipse cx="272" cy="94" rx="30" ry="6" opacity="0.5" />
      </g>
      {/* siluet masjid terhadap cahaya terbit */}
      <Mosque
        wall="#5c3a5e"
        dome="#4a2e52"
        trim="#7a4e6b"
        door="#ffd9a0"
        win="#ffc98a"
      />
      {/* halaman masjid + jalan setapak bercahaya */}
      <rect x="0" y="176" width="400" height="104" fill="url(#t-yard)" />
      <path d="M188 176 L212 176 L238 280 L164 280 Z" fill="#ffcf9a" opacity="0.42" />
      <g fill="#3f2745">
        <ellipse cx="52" cy="196" rx="26" ry="14" />
        <ellipse cx="352" cy="200" rx="30" ry="15" />
        <ellipse cx="84" cy="206" rx="18" ry="10" />
        <ellipse cx="322" cy="212" rx="20" ry="11" />
      </g>
      <rect x="176" y="240" width="48" height="2" rx="1" fill="#ffd9a0" opacity="0.35" />
      <rect x="168" y="258" width="64" height="2" rx="1" fill="#ffd9a0" opacity="0.25" />
    </svg>
  );
}

/* ============ DUHA — masjid & taman di pagi cerah ============ */
export function SceneDuha() {
  return (
    <svg {...SCENE_ATTRS}>
      <defs>
        <linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fc0ec" />
          <stop offset="0.55" stopColor="#a5dcf5" />
          <stop offset="1" stopColor="#dcf2fb" />
        </linearGradient>
        <radialGradient id="d-sunglow">
          <stop offset="0" stopColor="#fff7c8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ffefa8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffefa8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="d-yard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe8c8" />
          <stop offset="1" stopColor="#9fd0a8" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#d-sky)" />
      <circle cx="300" cy="66" r="62" fill="url(#d-sunglow)" className="wp-glow" />
      <circle cx="300" cy="66" r="23" fill="#fff3b0" />
      <circle cx="300" cy="66" r="33" fill="none" stroke="#fff6cc" strokeWidth="2" opacity="0.3" />
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="78" cy="52" rx="34" ry="8" />
        <ellipse cx="106" cy="44" rx="22" ry="6" />
        <ellipse cx="340" cy="118" rx="26" ry="6" opacity="0.6" />
        <ellipse cx="56" cy="112" rx="24" ry="6" opacity="0.55" />
      </g>
      {/* masjid terang dengan kubah emas */}
      <Mosque
        wall="#f8ecd0"
        dome="#e8b658"
        trim="#fff8e6"
        door="#8a5a34"
        win="#bfe0ea"
      />
      {/* taman & halaman masjid */}
      <rect x="0" y="176" width="400" height="104" fill="url(#d-yard)" />
      <path d="M186 176 L214 176 L242 280 L158 280 Z" fill="#f8ecd0" opacity="0.85" />
      <path d="M196 176 L204 176 L218 280 L182 280 Z" fill="#e4d2a8" opacity="0.6" />
      {/* pohon bulat + semak */}
      <g>
        <rect x="46" y="158" width="7" height="22" fill="#7a5a3a" />
        <circle cx="49" cy="142" r="22" fill="#5fa06a" />
        <circle cx="38" cy="150" r="14" fill="#4f8f5c" />
        <rect x="344" y="150" width="7" height="30" fill="#7a5a3a" />
        <circle cx="347" cy="134" r="24" fill="#5fa06a" />
        <circle cx="358" cy="146" r="14" fill="#4f8f5c" />
        <ellipse cx="96" cy="196" rx="18" ry="9" fill="#4f8f5c" />
        <ellipse cx="306" cy="198" rx="20" ry="10" fill="#4f8f5c" />
        <ellipse cx="60" cy="216" rx="14" ry="8" fill="#5fa06a" />
        <ellipse cx="340" cy="222" rx="16" ry="8" fill="#5fa06a" />
      </g>
      <ellipse cx="200" cy="180" rx="170" ry="6" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}

/* ============ TAHAJUD — masjid berlampu di malam yang dalam ============ */
export function SceneTahajud() {
  return (
    <svg {...SCENE_ATTRS}>
      <defs>
        <linearGradient id="j-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#130d38" />
          <stop offset="0.55" stopColor="#241c52" />
          <stop offset="0.85" stopColor="#3d2c6e" />
          <stop offset="1" stopColor="#544394" />
        </linearGradient>
        <radialGradient id="j-moonglow">
          <stop offset="0" stopColor="#cdbcff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#cdbcff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="j-mosqueglow">
          <stop offset="0" stopColor="#ffc978" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffc978" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="j-yard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1548" />
          <stop offset="1" stopColor="#0d0a28" />
        </linearGradient>
        <mask id="j-cut">
          <rect width="400" height="280" fill="#fff" />
          <circle cx="273" cy="46" r="15" fill="#000" />
        </mask>
      </defs>
      <rect width="400" height="280" fill="url(#j-sky)" />
      <g className="wp-tw">{TJ_STARS.map((s, i) => star(s, i, "#e4dcff"))}</g>
      <circle cx="262" cy="52" r="32" fill="url(#j-moonglow)" className="wp-glow" />
      <g mask="url(#j-cut)">
        <circle cx="262" cy="52" r="17" fill="#efe9ff" />
      </g>
      <ellipse cx="200" cy="176" rx="180" ry="9" fill="#6a5aa8" opacity="0.35" />
      {/* masjid berlampu hangat di malam dalam */}
      <Mosque
        wall="#191345"
        dome="#0f0b32"
        trim="#2a2060"
        door="#ffc978"
        win="#ffb95e"
        glow={{ id: "j-mosqueglow", color: "#ffc978", opacity: 0.45, rx: 96, ry: 34 }}
      />
      {/* plaza basah dengan pantulan cahaya */}
      <rect x="0" y="176" width="400" height="104" fill="url(#j-yard)" />
      <g transform="translate(0 352) scale(1 -1)" opacity="0.1">
        <Mosque wall="#191345" dome="#0f0b32" trim="#2a2060" door="#ffc978" win="#ffb95e" />
      </g>
      <g>
        <rect x="150" y="234" width="44" height="2" rx="1" fill="#b6e2f0" opacity="0.5" />
        <rect x="164" y="248" width="26" height="2" rx="1" fill="#b6e2f0" opacity="0.4" />
        <rect x="144" y="262" width="34" height="2" rx="1" fill="#b6e2f0" opacity="0.35" />
        <rect x="240" y="240" width="30" height="2" rx="1" fill="#ffc978" opacity="0.35" />
        <rect x="236" y="256" width="20" height="2" rx="1" fill="#ffc978" opacity="0.3" />
      </g>
      <ellipse cx="60" cy="206" rx="34" ry="8" fill="#3a2c74" opacity="0.5" />
      <ellipse cx="342" cy="210" rx="34" ry="8" fill="#3a2c74" opacity="0.5" />
    </svg>
  );
}
