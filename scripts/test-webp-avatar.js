/**
 * Uji fitur konversi otomatis foto → WebP (Tazkiya).
 * Skenario:
 *  1. Buka Profil, snapshot settings (agar data uji dipulihkan).
 *  2. Unggah JPEG BESAR (3000x2000, non-persegi → uji crop tengah).
 *  3. Unggah PNG transparan kecil (uji jalur PNG).
 *  4. Validasi: data URL = image/webp, ukuran < 27 KB base64, avatar tampil.
 *  5. Pulihkan settings awal (tidak meninggalkan data uji).
 */
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const STORE_KEY = "tazkiya-store-v1";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Snapshot settings awal
  const prevSettings = await page.evaluate((k) => {
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    return raw.state?.settings ?? null;
  }, STORE_KEY);

  // Buka halaman Profil
  await page.getByRole("button", { name: /profil/i }).first().click();
  await page.waitForTimeout(800);

  const readAvatar = () =>
    page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k) || "{}")?.state?.settings ?? {};
      const a = s.avatarDataUrl ?? "";
      return { prefix: a.slice(0, 22), b64len: a.length, approxBytes: a ? Math.round((a.length - 22) * 3 / 4) : 0 };
    }, STORE_KEY);

  /** Buat File di dalam browser lalu set ke input[type=file]. */
  const upload = async (kind) => {
    await page.evaluate(async (kind) => {
      const c = document.createElement("canvas");
      if (kind === "big-jpeg") {
        c.width = 3000; c.height = 2000; // non-persegi → uji center-crop
        const x = c.getContext("2d");
        const g = x.createLinearGradient(0, 0, 3000, 2000);
        g.addColorStop(0, "#7C3AED"); g.addColorStop(0.5, "#E11D8F"); g.addColorStop(1, "#1E1B4B");
        x.fillStyle = g; x.fillRect(0, 0, 3000, 2000);
        x.fillStyle = "#fff"; x.font = "bold 300px sans-serif"; x.fillText("TAZKIYA", 700, 1100);
        for (let i = 0; i < 400; i++) { // noise agar JPEG besar
          x.fillStyle = `rgba(${(i * 37) % 255},${(i * 91) % 255},${(i * 53) % 255},0.35)`;
          x.fillRect((i * 197) % 2900, (i * 331) % 1900, 60, 60);
        }
      } else {
        c.width = 400; c.height = 400;
        const x = c.getContext("2d");
        x.strokeStyle = "#22D3EE"; x.lineWidth = 40; x.beginPath(); x.arc(200, 200, 160, 0, Math.PI * 2); x.stroke();
      }
      const blob = await new Promise((r) => c.toBlob(r, kind === "big-jpeg" ? "image/jpeg" : "image/png", 0.95));
      const file = new File([blob], kind === "big-jpeg" ? "besar.jpg" : "lingkaran.png", { type: blob.type });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('input[type="file"]');
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      window.__upBytes = file.size;
    }, kind);
  };

  console.log("== Uji 1: JPEG 3000x2000 ==");
  await upload("big-jpeg");
  await page.waitForTimeout(1500);
  const toast1 = await page.locator("[data-sonner-toast]").last().innerText().catch(() => "(toast tidak ditemukan)");
  const up1 = await page.evaluate(() => window.__upBytes);
  const a1 = await readAvatar();
  console.log("sumber:", (up1 / 1024).toFixed(1), "KB | toast:", JSON.stringify(toast1));
  console.log("hasil:", JSON.stringify(a1), "| KB:", (a1.approxBytes / 1024).toFixed(1));

  const imgVisible = await page.locator('img[alt*="Foto profil"]').first().isVisible().catch(() => false);
  console.log("avatar <img> tampil:", imgVisible);

  console.log("== Uji 2: PNG transparan ==");
  await upload("png");
  await page.waitForTimeout(1500);
  const toast2 = await page.locator("[data-sonner-toast]").last().innerText().catch(() => "(toast tidak ditemukan)");
  const a2 = await readAvatar();
  console.log("toast:", JSON.stringify(toast2), "| hasil:", JSON.stringify(a2));

  console.log("== Uji 3: bukan gambar (txt) ditolak ==");
  await page.evaluate(() => {
    const f = new File(["bukan gambar"], "x.txt", { type: "text/plain" });
    const dt = new DataTransfer(); dt.items.add(f);
    const input = document.querySelector('input[type="file"]');
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(1500);
  const toast3 = await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => []);
  console.log("semua toast:", JSON.stringify(toast3));

  const pass =
    a1.prefix.startsWith("data:image/webp") &&
    a1.approxBytes > 0 && a1.approxBytes < 27 * 1024 &&
    a2.prefix.startsWith("data:image/webp") &&
    imgVisible && /Gagal memproses/.test(toast3);

  console.log(pass ? "\n✔ SEMUA UJI LULUS" : "\n✘ ADA UJI GAGAL");
  console.log("errors:", errors.length ? errors.slice(0, 5) : "0");

  // Pulihkan settings awal (hapus jejak uji)
  await page.evaluate(({ k, prev }) => {
    if (!prev) { // belum pernah ada settings → kosongkan hanya avatar
      const raw = JSON.parse(localStorage.getItem(k) || "{}");
      if (raw.state?.settings) { delete raw.state.settings.avatarDataUrl; localStorage.setItem(k, JSON.stringify(raw)); }
      return;
    }
    const raw = JSON.parse(localStorage.getItem(k) || "{}");
    raw.state.settings = prev;
    localStorage.setItem(k, JSON.stringify(raw));
  }, { k: STORE_KEY, prev: prevSettings });
  await page.reload({ waitUntil: "networkidle" });
  const after = await page.evaluate((k) => !!JSON.parse(localStorage.getItem(k) || "{}")?.state?.settings?.avatarDataUrl, STORE_KEY);
  console.log("data uji dipulihkan (avatar kosong):", !after);

  await browser.close();
  process.exit(pass && errors.length === 0 ? 0 : 1);
})();
