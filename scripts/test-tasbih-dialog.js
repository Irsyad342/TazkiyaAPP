/**
 * Uji dialog "Reset hitungan tasbih?" — tidak boleh terpotong lagi.
 * Langkah: buka Tasbih → tambah 3 hitungan → klik Reset → cek geometri dialog
 * (judul + deskripsi + tombol Batal & Reset semua di dalam viewport) →
 * uji Batal (hitungan tetap) → uji Reset (hitungan kembali 0 + toast) →
 * uji tema terang → tutup. 0 console error.
 */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Buka Tasbih Digital
  await page.getByRole("button", { name: /tasbih/i }).first().click();
  await page.waitForTimeout(800);

  // Tambah 3 hitungan
  await page.getByRole("button", { name: /tambah hitungan/i }).click();
  await page.getByRole("button", { name: /tambah hitungan/i }).click();
  await page.getByRole("button", { name: /tambah hitungan/i }).click();
  await page.waitForTimeout(400);
  const countShown = await page.locator('[aria-label*="Tambah hitungan"]').innerText();
  console.log("hitungan sebelum reset:", /3/.test(countShown) ? "3 OK" : JSON.stringify(countShown).slice(0, 40));

  // Klik Reset → dialog muncul
  await page.getByRole("button", { name: /reset/i }).first().click();
  await page.waitForTimeout(700);

  const dialog = page.locator('[data-slot="alert-dialog-content"]');
  const dialogVisible = await dialog.isVisible();
  const box = await dialog.boundingBox();
  const pos = await dialog.evaluate((el) => getComputedStyle(el).position);
  const inView = box && box.y >= 0 && box.y + box.height <= 860 && box.x >= 0 && box.x + box.width <= 420;

  const btnBatal = page.getByRole("button", { name: "Batal" });
  const btnReset = dialog.getByRole("button", { name: "Reset" }).last();
  const batalOk = await btnBatal.isVisible();
  const resetOk = await btnReset.isVisible();
  const batalBox = await btnBatal.boundingBox();
  const batalInView = batalBox && batalBox.y + batalBox.height <= 860;

  console.log(JSON.stringify({ dialogVisible, pos, box, inView, batalOk, resetOk, batalInView }, null, 1));
  await page.screenshot({ path: "tool-results/tasbih-reset-dialog.png" });

  // Batal → hitungan tetap 3
  await btnBatal.click();
  await page.waitForTimeout(500);
  const afterCancel = await page.locator('[aria-label*="Tambah hitungan"]').innerText();
  const cancelPreserved = /3/.test(afterCancel);
  console.log("setelah Batal hitungan tetap 3:", cancelPreserved);

  // Reset sungguhan → 0 + toast
  await page.getByRole("button", { name: /reset/i }).first().click();
  await page.waitForTimeout(500);
  await dialog.getByRole("button", { name: "Reset" }).last().click();
  await page.waitForTimeout(700);
  const afterReset = await page.locator('[aria-label*="Tambah hitungan"]').innerText();
  const resetWorks = /(^|\D)0(\D|$)/.test(afterReset);
  const toastText = await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => []);
  console.log("setelah Reset jadi 0:", resetWorks, "| toast:", JSON.stringify(toastText));

  // Tema terang — dialog tetap benar
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /tutup tasbih/i }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("tazkiya-store-v1") || "{}");
    raw.state = raw.state || {};
    raw.state.settings = { ...(raw.state.settings || {}), theme: "light" };
    localStorage.setItem("tazkiya-store-v1", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /tasbih/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /reset/i }).first().click();
  await page.waitForTimeout(600);
  const boxLight = await page.locator('[data-slot="alert-dialog-content"]').boundingBox();
  const lightInView = boxLight && boxLight.y >= 0 && boxLight.y + boxLight.height <= 860;
  console.log("tema terang dialog dalam viewport:", lightInView, JSON.stringify(boxLight));
  await page.screenshot({ path: "tool-results/tasbih-reset-dialog-light.png" });

  const pass = dialogVisible && pos === "fixed" && inView && batalOk && resetOk && batalInView &&
    cancelPreserved && resetWorks && lightInView && errors.length === 0;
  console.log(pass ? "\n✔ UJI DIALOG RESET LULUS" : "\n✘ GAGAL");
  console.log("errors:", errors.length ? errors.slice(0, 4) : "0");
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
