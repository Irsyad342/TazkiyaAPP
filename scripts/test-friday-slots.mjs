/**
 * Test logika slot salat per hari (Senin–Minggu) + mode alternatif.
 * Memakai node --experimental-strip-types (Node ≥ 22.6) — tanpa build.
 * Menjamin: SELALU 5 slot, tepat satu slot zuhur, label "Salat Jumat"
 * HANYA pada Jumat, dan Sabtu kembali ke Zuhur.
 */
import assert from "node:assert";
import { prayersForDate, prayerLabelForDate } from "../src/lib/tazkiya/friday.ts";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// 9–15 November 2026: Senin(9) Selasa(10) Rabu(11) Kamis(12) Jumat(13) Sabtu(14) Minggu(15)
const dates = [
  ["2026-11-09", 1],
  ["2026-11-10", 2],
  ["2026-11-11", 3],
  ["2026-11-12", 4],
  ["2026-11-13", 5],
  ["2026-11-14", 6],
  ["2026-11-15", 0],
];

for (const [key, dow] of dates) {
  const slots = prayersForDate(key);
  assert.equal(slots.length, 5, `${key}: harus 5 slot, dapat ${slots.length}`);
  const zuhurSlots = slots.filter((p) => p.id === "zuhur");
  assert.equal(zuhurSlots.length, 1, `${key}: tepat satu slot zuhur`);
  // Urutan slot tetap: subuh, (zuhur|jumat), asar, magrib, isya
  assert.deepEqual(
    slots.map((p) => p.id),
    ["subuh", "zuhur", "asar", "magrib", "isya"],
    `${key}: urutan slot berubah`
  );
  const expectJumat = dow === 5;
  assert.equal(
    slots[1].label === "Salat Jumat",
    expectJumat,
    `${key} (${DAYS[dow]}): slot 2 = ${slots[1].label}, harapan ${expectJumat ? "Salat Jumat" : "Zuhur"}`
  );
  // Label helper konsisten
  assert.equal(prayerLabelForDate("zuhur", key), expectJumat ? "Salat Jumat" : "Zuhur");
  // Mode alternatif: Jumat kembali berlabel Zuhur (satu slot tetap)
  const alt = prayersForDate(key, true);
  assert.equal(alt.length, 5);
  assert.equal(alt[1].label, expectJumat ? "Zuhur" : "Zuhur");
  console.log(`${DAYS[dow].padEnd(6)} ${key} → ${slots.map((p) => p.label).join(", ")}`);
}

// Lintas batas: Jumat → Sabtu otomatis kembali Zuhur (slot ke-2)
assert.equal(prayersForDate("2026-11-13")[1].label, "Salat Jumat");
assert.equal(prayersForDate("2026-11-14")[1].label, "Zuhur");

// Tanggal Jumat lain (2027) tetap benar — 2027-01-01 adalah Jumat
assert.equal(prayersForDate("2027-01-01")[1].label, "Salat Jumat");
assert.equal(prayersForDate("2027-01-02")[1].label, "Zuhur");

console.log("\nOK: 7 hari × (normal+alternatif) — selalu 5 slot, satu zuhur, Jumat = Salat Jumat, Sabtu = Zuhur.");
