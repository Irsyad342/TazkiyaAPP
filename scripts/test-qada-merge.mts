/* Uji murni logika mergeDocs: catatan qada yang dihapus + tombstone TIDAK boleh hidup kembali. */
import { mergeDocs } from "../src/lib/sync/merge.ts";
import type { CloudDoc } from "../src/lib/sync/doc.ts";

const rec = { id: "qd-1", prayer: "subuh" as const, missedDate: "2026-11-10", createdAt: "2026-11-18T10:00:00Z" };
const cloud: CloudDoc = { v: 1, qadaRecords: [rec] };                     // akun masih memuat catatan lama
const local: CloudDoc = { v: 1, qadaRecords: [], deletedQada: [{ id: "qd-1", deletedAt: "2026-11-19T12:00:00Z" }] }; // perangkat menghapus

const m1 = mergeDocs(local, cloud, { settingsFrom: "local" });
const m2 = mergeDocs(local, m1, { settingsFrom: "local" });               // gabung ulang (idempoten)
console.log("m1 qada:", JSON.stringify(m1.qadaRecords), "tombstones:", m1.deletedQada?.length);
console.log("m2 qada:", JSON.stringify(m2.qadaRecords), "tombstones:", m2.deletedQada?.length);
if (m1.qadaRecords.length !== 0 || m2.qadaRecords.length !== 0) { console.error("FAIL: qada hidup kembali"); process.exit(1); }
// Tanpa tombstone (perangkat lama belum mengenal deletedQada): union tetap ada (perilaku lama utk data lawas) — informatif saja.
const m3 = mergeDocs({ v: 1, qadaRecords: [rec] }, { v: 1, qadaRecords: [rec] }, { settingsFrom: "local" });
console.log("tanpa tombstone qada:", m3.qadaRecords.length, "(dua sisi masih memuat)");
console.log("PASS");
