/**
 * Generator ikon PWA Tazkiya — bulan sabit + mushaf terbuka.
 * Digambar programatik (tanpa dependensi) lalu di-encode sebagai PNG asli.
 * Pemakaian: node scripts/generate-pwa-icons.mjs
 */
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "icons");

// ---- Palet Tazkiya (sumber: src/app/globals.css) ----
const BG = [23, 19, 33]; // #171321
const CRESCENT = [216, 197, 255]; // #d8c5ff  (tz-lavender)
const COVER = [156, 114, 239]; // #9c72ef  (primary)
const PAGE = [245, 241, 245]; // #f5f1f5
const TEXTLINE = [179, 156, 224]; // #b39ce0

// ---- Geometri pada kanvas desain 512x512, sumbu Y ke bawah ----
const C = { x: 256, y: 270 }; // titik skala komposisi

function scalePt(p, g) {
  return { x: C.x + (p.x - C.x) * g, y: C.y + (p.y - C.y) * g };
}

function circle(c, r, g) {
  return { c: scalePt(c, g), r: r * g };
}

// Sabit tanduk ke atas: lingkaran besar dikurangi lingkaran kecil di atasnya.
const CRESC_OUTER = { x: 256, y: 168 };
const CRESC_INNER = { x: 256, y: 128 };
const CRESC_R_OUT = 96;
const CRESC_R_IN = 79;

// Sampul mushaf (heksagon lebar, simetris).
const COVER_POLY = [
  { x: 256, y: 336 },
  { x: 102, y: 312 },
  { x: 102, y: 406 },
  { x: 256, y: 430 },
  { x: 410, y: 406 },
  { x: 410, y: 312 },
];

// Dua halaman terbuka, celah 12px di tengah sebagai tulang buku.
const PAGE_L = [
  { x: 250, y: 344 },
  { x: 110, y: 316 },
  { x: 110, y: 396 },
  { x: 250, y: 424 },
];
const PAGE_R = [
  { x: 262, y: 344 },
  { x: 402, y: 316 },
  { x: 402, y: 396 },
  { x: 262, y: 424 },
];

// Baris "tulisan" di halaman, mengikuti kemiringan halaman (bilinear).
function pageLine(page, v1, v2) {
  const [TL, TR, BR, BL] = page;
  const P = (u, v) => ({
    x: (1 - u) * (1 - v) * TL.x + u * (1 - v) * TR.x + v * (1 - u) * BL.x + u * v * BR.x,
    y: (1 - u) * (1 - v) * TL.y + u * (1 - v) * TR.y + v * (1 - u) * BL.y + u * v * BR.y,
  });
  const u1 = 0.18, u2 = 0.82;
  return [P(u1, v1), P(u2, v1), P(u2, v2), P(u1, v2)];
}

const TEXT_POLYS = [
  pageLine(PAGE_L, 0.3, 0.38),
  pageLine(PAGE_L, 0.55, 0.63),
  pageLine(PAGE_R, 0.3, 0.38),
  pageLine(PAGE_R, 0.55, 0.63),
];

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inCircle(px, py, c) {
  const dx = px - c.c.x, dy = py - c.c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

/** Render satu varian ikon. g = faktor skala glyph (1.0 biasa, 0.84 maskable). */
function render(size, g, ss) {
  const canvas = size * ss;
  const k = canvas / 512;
  const outer = circle(CRESC_OUTER, CRESC_R_OUT, g);
  const inner = circle(CRESC_INNER, CRESC_R_IN, g);
  const cover = COVER_POLY.map((p) => scalePt(p, g));
  const pageL = PAGE_L.map((p) => scalePt(p, g));
  const pageR = PAGE_R.map((p) => scalePt(p, g));
  const text = TEXT_POLYS.map((poly) => poly.map((p) => scalePt(p, g)));

  const raw = Buffer.alloc(canvas * canvas * 4);
  let rgb = BG;
  for (let y = 0; y < canvas; y++) {
    const dy = (y + 0.5) / k;
    for (let x = 0; x < canvas; x++) {
      const dx = (x + 0.5) / k;
      rgb = BG;
      if (inCircle(dx, dy, outer) && !inCircle(dx, dy, inner)) rgb = CRESCENT;
      else {
        let onText = false;
        for (const t of text) {
          if (inPolygon(dx, dy, t)) { onText = true; break; }
        }
        if (onText) rgb = TEXTLINE;
        else if (inPolygon(dx, dy, pageL) || inPolygon(dx, dy, pageR)) rgb = PAGE;
        else if (inPolygon(dx, dy, cover)) rgb = COVER;
      }
      const o = (y * canvas + x) * 4;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; raw[o + 3] = 255;
    }
  }

  // Downsampling box ss×ss (anti-alias).
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g2 = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const o = ((y * ss + sy) * canvas + x * ss + sx) * 4;
          r += raw[o]; g2 += raw[o + 1]; b += raw[o + 2];
        }
      }
      const n = ss * ss;
      const o2 = (y * size + x) * 4;
      out[o2] = Math.round(r / n); out[o2 + 1] = Math.round(g2 / n); out[o2 + 2] = Math.round(b / n); out[o2 + 3] = 255;
    }
  }
  return out;
}

// ---- Encoder PNG minimal (RGBA 8-bit, tanpa interlace) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  { file: "icon-192.png", size: 192, g: 1.0 },
  { file: "icon-512.png", size: 512, g: 1.0 },
  { file: "icon-maskable-192.png", size: 192, g: 0.84 },
  { file: "icon-maskable-512.png", size: 512, g: 0.84 },
];
for (const t of targets) {
  const ss = 4;
  const px = render(t.size, t.g, ss);
  const png = encodePng(px, t.size);
  writeFileSync(join(OUT_DIR, t.file), png);
  console.log(`${t.file}: ${t.size}x${t.size}, ${png.length} bytes`);
}
console.log("Selesai.");
