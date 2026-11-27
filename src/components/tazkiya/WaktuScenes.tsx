"use client";

/**
 * Tazkiya — Ilustrasi pemandangan "Waktu-Waktu Penting" (SVG prosedural, orisinal).
 * Empat scene satu gaya (landscape berlapis: langit, pegunungan, air, awan, bintang,
 * atmosfer) dengan palet TETAP per suasana waktu — sengaja TIDAK memakai token tema
 * agar identik di semua tema aplikasi. Inline SVG: nol request jaringan, tajam di
 * semua DPR, ringan (±4 KB per scene). Semua id gradient DI-PREFIX per scene agar
 * tidak bentrok saat beberapa scene termount bersamaan.
 */



const SCENE_ATTRS = {
  className: "wp-scene",
  viewBox: "0 0 400 280",
  preserveAspectRatio: "xMidYMid slice",
  "aria-hidden": true,
  focusable: false,
} as const;

/* Bintang kecil: [cx, cy, r, opacity] */
const star = ([cx, cy, r, o]: number[], i: number, fill: string) => (
  <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={o} />
);

/* Kilau air: [x, y, w] — garis tipis memantul */
const glint = ([x, y, w]: number[], i: number, fill: string, o: number) => (
  <rect key={i} x={x} y={y} width={w} height={2} rx={1} fill={fill} opacity={o} />
);

/* ============ IMSAK — dini hari menjelang fajar ============ */
const IMSAK_STARS: number[][] = [
  [40, 34, 1.1, 0.9], [86, 20, 0.8, 0.6], [150, 44, 0.9, 0.7], [206, 26, 1.2, 0.9],
  [258, 52, 0.8, 0.55], [305, 30, 1, 0.8], [344, 66, 0.8, 0.5], [368, 22, 1.1, 0.85],
  [64, 78, 0.8, 0.5], [124, 92, 0.7, 0.45], [232, 88, 0.9, 0.6], [286, 104, 0.7, 0.4],
];
const IMSAK_GLINTS: number[][] = [[150, 232, 44], [162, 244, 24], [144, 256, 34], [170, 266, 20]];

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
        <mask id="i-cut">
          <rect width="400" height="280" fill="#fff" />
          <circle cx="121" cy="56" r="17" fill="#000" />
        </mask>
      </defs>
      <rect width="400" height="280" fill="url(#i-sky)" />
      <g className="wp-tw">{IMSAK_STARS.map((s, i) => star(s, i, "#e9e7ff"))}</g>
      <circle cx="106" cy="62" r="34" fill="url(#i-moonlight)" className="wp-glow" />
      <g mask="url(#i-cut)">
        <circle cx="106" cy="62" r="19" fill="#f6efdc" />
      </g>
      {/* puncak jauh tersinari fajar */}
      <path d="M0 172 L46 136 L92 164 L148 120 L204 160 L256 128 L312 166 L358 142 L400 168 V280 H0 Z" fill="#5a568f" opacity="0.9" />
      <ellipse cx="200" cy="172" rx="150" ry="7" fill="#c8a9d4" opacity="0.28" />
      <path d="M0 198 L64 152 L120 188 L178 140 L242 184 L302 148 L354 184 L400 160 V280 H0 Z" fill="#252c60" />
      <ellipse cx="130" cy="196" rx="110" ry="9" fill="#cbbbe0" opacity="0.1" />
      <path d="M0 228 L72 192 L142 222 L212 188 L282 220 L342 198 L400 222 V280 H0 Z" fill="#111634" />
      <rect x="0" y="216" width="400" height="64" fill="url(#i-lake)" />
      <ellipse cx="200" cy="222" rx="180" ry="8" fill="#a18bc4" opacity="0.2" />
      <ellipse cx="106" cy="248" rx="26" ry="34" fill="#cfc0f0" opacity="0.16" />
      <g>{IMSAK_GLINTS.map((g, i) => glint(g, i, "#d9cdf6", 0.5))}</g>
    </svg>
  );
}

/* ============ TERBIT — matahari muncul dari balik pegunungan ============ */
const TERBIT_GLINTS: number[][] = [[196, 230, 48], [208, 242, 28], [186, 252, 36], [214, 264, 22]];

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
        <linearGradient id="t-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7b088" />
          <stop offset="0.45" stopColor="#e0876e" />
          <stop offset="1" stopColor="#a05a62" />
        </linearGradient>
        <radialGradient id="t-sunrise">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#ffd9a0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="280" fill="url(#t-sky)" />
      <circle cx="210" cy="168" r="64" fill="url(#t-sunrise)" className="wp-glow" />
      <circle cx="210" cy="170" r="24" fill="#ffd98a" />
      {/* awan tipis */}
      <g fill="#ffedd0" opacity="0.75">
        <ellipse cx="72" cy="58" rx="36" ry="8" />
        <ellipse cx="98" cy="50" rx="26" ry="7" />
        <ellipse cx="300" cy="44" rx="42" ry="8" />
        <ellipse cx="332" cy="36" rx="24" ry="6" />
        <ellipse cx="180" cy="84" rx="30" ry="6" opacity="0.6" />
      </g>
      <path d="M0 172 L46 136 L92 164 L148 120 L204 160 L256 128 L312 166 L358 142 L400 168 V280 H0 Z" fill="#7c86ad" />
      <ellipse cx="200" cy="170" rx="160" ry="8" fill="#ffe1b0" opacity="0.35" />
      <path d="M0 198 L64 152 L120 188 L178 140 L242 184 L302 148 L354 184 L400 160 V280 H0 Z" fill="#8a5f7d" />
      <ellipse cx="120" cy="196" rx="120" ry="9" fill="#ffd9c0" opacity="0.18" />
      <path d="M0 228 L72 192 L142 222 L212 188 L282 220 L342 198 L400 222 V280 H0 Z" fill="#55416b" />
      <rect x="0" y="216" width="400" height="64" fill="url(#t-lake)" />
      <ellipse cx="210" cy="228" rx="60" ry="10" fill="#ffdf9e" opacity="0.4" />
      <g>{TERBIT_GLINTS.map((g, i) => glint(g, i, "#ffe3a8", 0.6))}</g>
    </svg>
  );
}

/* ============ DUHA — pagi cerah penuh energi ============ */
const DUHA_GLINTS: number[][] = [[176, 236, 30], [206, 248, 22], [160, 260, 26], [214, 268, 18]];

export function SceneDuha() {
  return (
    <svg {...SCENE_ATTRS}>
      <defs>
        <linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fc0ec" />
          <stop offset="0.55" stopColor="#a5dcf5" />
          <stop offset="1" stopColor="#dcf2fb" />
        </linearGradient>
        <linearGradient id="d-riv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd8cf" />
          <stop offset="1" stopColor="#3aa8a4" />
        </linearGradient>
        <radialGradient id="d-sunglow">
          <stop offset="0" stopColor="#fff7c8" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ffefa8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffefa8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="280" fill="url(#d-sky)" />
      <circle cx="296" cy="72" r="66" fill="url(#d-sunglow)" className="wp-glow" />
      <circle cx="296" cy="72" r="23" fill="#fff3b0" />
      <circle cx="296" cy="72" r="33" fill="none" stroke="#fff6cc" strokeWidth="2" opacity="0.3" />
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="90" cy="56" rx="34" ry="8" />
        <ellipse cx="118" cy="48" rx="22" ry="6" />
        <ellipse cx="330" cy="120" rx="28" ry="6" opacity="0.6" />
        <ellipse cx="60" cy="110" rx="26" ry="6" opacity="0.55" />
      </g>
      {/* lembah hijau berlapis */}
      <path d="M0 176 L46 140 L92 168 L148 126 L204 164 L256 132 L312 170 L358 146 L400 172 V280 H0 Z" fill="#8fb7a0" />
      <path d="M0 200 L64 154 L120 190 L178 142 L242 186 L302 150 L354 186 L400 162 V280 H0 Z" fill="#4f8f68" />
      <ellipse cx="130" cy="198" rx="120" ry="9" fill="#ffffff" opacity="0.22" />
      <path d="M0 230 L72 194 L142 224 L212 190 L282 222 L342 200 L400 224 V280 H0 Z" fill="#2f6e4e" />
      {/* sungai berkelok dari lembah */}
      <path d="M186 192 C176 216 210 226 194 248 C182 264 198 274 192 280 L238 280 C250 262 230 248 246 230 C260 214 228 206 234 192 Z" fill="url(#d-riv)" />
      <g>{DUHA_GLINTS.map((g, i) => glint(g, i, "#ffffff", 0.55))}</g>
    </svg>
  );
}

/* ============ TAHAJUD — malam yang dalam dan hening ============ */
const TJ_STARS: number[][] = [
  [34, 30, 1.2, 0.95], [72, 58, 0.8, 0.6], [118, 24, 0.9, 0.75], [164, 52, 1.3, 0.95],
  [212, 30, 0.8, 0.6], [246, 66, 0.9, 0.7], [290, 108, 0.8, 0.5], [330, 40, 1.1, 0.85],
  [366, 76, 0.8, 0.55], [52, 108, 0.8, 0.5], [96, 132, 0.7, 0.4], [150, 104, 0.9, 0.6],
  [262, 140, 0.7, 0.4], [352, 128, 0.9, 0.55], [188, 84, 0.7, 0.45], [386, 24, 0.8, 0.6],
];
const TJ_GLINTS: number[][] = [[182, 234, 40], [194, 246, 24], [172, 258, 30], [206, 268, 20]];

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
        <linearGradient id="j-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3c8a" />
          <stop offset="0.45" stopColor="#221a4e" />
          <stop offset="1" stopColor="#120d33" />
        </linearGradient>
        <radialGradient id="j-moonglow">
          <stop offset="0" stopColor="#cdbcff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#cdbcff" stopOpacity="0" />
        </radialGradient>
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
      <ellipse cx="200" cy="176" rx="170" ry="8" fill="#6a5aa8" opacity="0.4" />
      <path d="M0 174 L46 138 L92 166 L148 122 L204 162 L256 130 L312 168 L358 144 L400 170 V280 H0 Z" fill="#3b2f6e" opacity="0.95" />
      <path d="M0 200 L64 154 L120 190 L178 142 L242 186 L302 150 L354 186 L400 160 V280 H0 Z" fill="#1a1444" />
      {/* hutan pinus gelap di punggungan dekat */}
      <g fill="#0b0826">
        <path d="M36 206 l7 14 h-14 Z" /><path d="M56 210 l8 16 h-16 Z" /><path d="M78 204 l6 13 h-12 Z" />
        <path d="M318 202 l7 15 h-14 Z" /><path d="M340 208 l8 16 h-16 Z" /><path d="M364 202 l6 13 h-12 Z" />
      </g>
      <path d="M0 228 L72 192 L142 222 L212 188 L282 220 L342 198 L400 222 V280 H0 Z" fill="#0e0a2e" />
      <rect x="0" y="218" width="400" height="62" fill="url(#j-lake)" />
      <ellipse cx="262" cy="244" rx="24" ry="32" fill="#a8dcec" opacity="0.14" />
      <g>{TJ_GLINTS.map((g, i) => glint(g, i, "#b6e2f0", 0.5))}</g>
    </svg>
  );
}
