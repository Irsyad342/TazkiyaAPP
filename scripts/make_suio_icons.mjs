/**
 * SUIO icon generator — membuat favicon SVG + 4 PNG PWA dari mark sujud.
 * Mark: kubah lengkung (punggung sujud) + titik kepala di garis tanah,
 * putih di atas tile oranye brand #FA5200. Maskable memakai full-bleed
 * dengan figur diperkecil ke zona aman 80%.
 * Jalankan: node scripts/make_suio_icons.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const FIGURE = `
  <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
    <path d="M150 360 L 396 360" stroke-width="26"/>
    <path d="M168 360 A 74 74 0 0 1 316 360" stroke-width="30"/>
  </g>
  <circle cx="368" cy="338" r="27" fill="#FFFFFF"/>
  <path d="M256 200 l14 26 26 14 -26 14 -14 26 -14 -26 -26 -14 26 -14 Z" fill="#FFD9BF" opacity="0.95"/>
`;

const TILE = (inner, rx = 116) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF7A38"/><stop offset="1" stop-color="#FA5200"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#t)"/>
  ${inner}
</svg>`;

// Maskable: full-bleed tanpa sudut bulat, figur diskalakan 0.8 ke pusat.
const MASKABLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF7A38"/><stop offset="1" stop-color="#FA5200"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#t)"/>
  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">${FIGURE}</g>
</svg>`;

const out = "public/icons";
mkdirSync(out, { recursive: true });

const tileSvg = TILE(FIGURE).replace(/\n\s*/g, "");
writeFileSync("src/app/icon.svg", tileSvg + "\n");

const jobs = [
  ["icon-192.png", TILE(FIGURE), 192],
  ["icon-512.png", TILE(FIGURE), 512],
  ["icon-maskable-192.png", MASKABLE, 192],
  ["icon-maskable-512.png", MASKABLE, 512],
];

for (const [name, svg, size] of jobs) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(`${out}/${name}`, buf);
  console.log("wrote", name, buf.length, "bytes");
}
console.log("done");
