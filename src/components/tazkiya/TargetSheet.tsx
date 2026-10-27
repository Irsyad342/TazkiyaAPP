"use client";

/**
 * Tazkiya — Halaman Target Ibadah (overlay layar penuh).
 * Minimalis dan dikelompokkan per jenis ibadah:
 *   A. Salat Wajib (tetap 5 waktu, dipantau lewat tracker)
 *   B. Bacaan Al-Qur'an (halaman / ayat / surah pilihan)
 *   C. Zikir & Tasbih Digital
 *   D. Ibadah Tambahan (opsional, dipilih pengguna)
 */

import { useState, type ReactNode } from "react";
import { BookOpen, ChevronLeft, CircleDot, MoonStar, Save, Target } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { EXTRAS, type ExtraId, type QuranTargetType } from "@/lib/tazkiya/types";
import { SURAHS } from "@/lib/tazkiya/surahs";
import { cn } from "@/lib/utils";

const UNIT_OPTIONS: { id: QuranTargetType; label: string }[] = [
  { id: "halaman", label: "Halaman" },
  { id: "ayat", label: "Ayat" },
  { id: "surah", label: "Surah" },
];

function SectionCard({
  icon,
  title,
  caption,
  children,
}: {
  icon: ReactNode;
  title: string;
  caption: string;
  children?: ReactNode;
}) {
  return (
    <section className="glass rounded-[1.35rem] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-tz-violet/25 bg-gradient-to-br from-tz-violet/22 to-tz-purple/12 text-tz-violet">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[14.5px] font-semibold text-tz-ink">{title}</h3>
          <p className="text-[10.5px] leading-snug text-tz-muted">{caption}</p>
        </div>
      </div>
      {children ? <div className="mt-3.5">{children}</div> : null}
    </section>
  );
}

/**
 * Komponen Ephemeral: parent me-mount hanya saat halaman dibuka, sehingga
 * draf terinisialisasi sekali dari store terkini — tanpa efek samping.
 */
export function TargetSheet({ onClose }: { onClose: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const updateSettings = useWorshipStore((s) => s.updateSettings);
  const setQuranTarget = useWorshipStore((s) => s.setQuranTarget);
  const setQuranTargetSurah = useWorshipStore((s) => s.setQuranTargetSurah);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);

  const initial = useWorshipStore.getState();
  const [unit, setUnit] = useState<QuranTargetType>(initial.settings.quranTargetType);
  const [quranDraft, setQuranDraft] = useState(String(initial.settings.quranDailyTarget));
  const [surahDraft, setSurahDraft] = useState(initial.settings.quranTargetSurah);
  const [zikirDraft, setZikirDraft] = useState(String(initial.settings.zikirTarget));
  const [tasbihDraft, setTasbihDraft] = useState(String(initial.tasbih.target));

  const saveQuran = () => {
    if (unit === "surah") {
      setQuranTargetSurah(surahDraft);
      updateSettings({ quranTargetType: "surah" });
      const meta = SURAHS.find((s) => s.number === surahDraft);
      toast.success(`Target bacaan: 1 surah per hari — ${meta?.latin ?? ""}`);
      return;
    }
    const n = parseInt(quranDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target harus berupa angka lebih dari 0");
      return;
    }
    setQuranTarget(unit, n);
    toast.success(`Target bacaan disimpan: ${n} ${unit === "halaman" ? "halaman" : "ayat"} per hari`);
  };

  const saveZikir = () => {
    const n = parseInt(zikirDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target zikir harus angka lebih dari 0");
      return;
    }
    updateSettings({ zikirTarget: n });
    toast.success(`Target zikir harian disimpan: ${n.toLocaleString("id-ID")}`);
  };

  const saveTasbih = () => {
    const n = parseInt(tasbihDraft, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Target tasbih harus angka lebih dari 0");
      return;
    }
    tasbihSetTarget(n);
    toast.success(`Target Tasbih Digital disimpan: ${n.toLocaleString("id-ID")} hitungan`);
  };

  const toggleTracked = (id: ExtraId, v: boolean) => {
    const cur = settings.trackedExtras ?? [];
    const next = v ? Array.from(new Set([...cur, id])) : cur.filter((e) => e !== id);
    updateSettings({ trackedExtras: next });
  };

  const saveBtn =
    "tap flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-tz-purple to-tz-violet px-4 text-[12.5px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(156,114,239,0.8)]";

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-tz-frame"
      role="dialog"
      aria-modal="true"
      aria-label="Target Ibadah"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 top-16 h-56 w-56 rounded-full bg-tz-purple/25 blur-3xl" />

      {/* ---------- Kepala ---------- */}
      <div className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Kembali ke Profil"
          onClick={onClose}
          className="tap glass flex h-10 w-10 items-center justify-center rounded-full text-tz-accent"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-gradient-violet">Target Ibadah</h2>
          <p className="text-[11px] text-tz-muted">Atur sasaran harian sesuai kemampuanmu</p>
        </div>
      </div>

      {/* ---------- Konten ---------- */}
      <div className="thin-scrollbar relative z-10 flex-1 space-y-3.5 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {/* A. Salat Wajib */}
        <SectionCard icon={<MoonStar size={17} />} title="Salat Wajib" caption="Target tetap — tidak perlu diatur">
          <p className="font-display text-[19px] font-bold text-tz-ink">5 waktu salat per hari</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["Subuh", fridayLabel(), "Asar", "Magrib", "Isya"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-tz-line bg-tz-panel-soft px-2.5 py-1 text-[11px] font-medium text-tz-muted"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-tz-muted">
            Progresnya dipantau otomatis melalui tracker salat di Beranda. Pada hari Jumat, slot Zuhur digantikan Salat
            Jumat, dan Salat Zuhur dapat dicatat sebagai alternatif bila tidak melaksanakannya.
          </p>
        </SectionCard>

        {/* B. Bacaan Al-Qur'an */}
        <SectionCard icon={<BookOpen size={17} />} title="Bacaan Al-Qur'an" caption="Pilih satuan dan jumlah target harian">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-tz-muted">Satuan target</p>
          <div className="glass-violet flex rounded-xl p-1" role="radiogroup" aria-label="Satuan target bacaan">
            {UNIT_OPTIONS.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={unit === u.id}
                onClick={() => setUnit(u.id)}
                className={cn(
                  "tap flex-1 rounded-lg py-1.5 text-[12px] font-semibold transition-all",
                  unit === u.id
                    ? "bg-gradient-to-r from-tz-purple to-tz-violet text-white shadow-[0_4px_12px_-4px_rgba(156,114,239,0.8)]"
                    : "text-tz-muted"
                )}
              >
                {u.label}
              </button>
            ))}
          </div>

          {unit === "surah" ? (
            <div className="mt-3">
              <label htmlFor="target-surah" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
                Surah pilihan
              </label>
              <select
                id="target-surah"
                value={surahDraft}
                onChange={(e) => setSurahDraft(parseInt(e.target.value, 10))}
                className="tz-field"
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.latin} — {s.verses} ayat
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] leading-relaxed text-tz-muted">
                Target: 1 surah pilihan per hari. Progres dihitung dari jumlah ayat yang benar-benar tercatat dibaca —
                membuka surah saja belum dihitung selesai.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <label htmlFor="target-quran" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
                Jumlah per hari
              </label>
              <div className="flex gap-2">
                <input
                  id="target-quran"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={quranDraft}
                  onChange={(e) => setQuranDraft(e.target.value)}
                  className="tz-field"
                  aria-label={`Target bacaan per hari dalam ${unit}`}
                />
                <button type="button" onClick={saveQuran} className={saveBtn}>
                  <Save size={14} /> Simpan
                </button>
              </div>
            </div>
          )}
          {unit === "surah" ? (
            <button type="button" onClick={saveQuran} className={cn(saveBtn, "mt-3 w-full")}>
              <Save size={14} /> Simpan Target Surah
            </button>
          ) : null}
        </SectionCard>

        {/* C. Zikir & Tasbih */}
        <SectionCard icon={<CircleDot size={17} />} title="Zikir & Tasbih" caption="Dua target terpisah, masing-masing dihitung sendiri">
          <label htmlFor="target-zikir" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
            Target zikir harian
          </label>
          <div className="flex gap-2">
            <input
              id="target-zikir"
              type="number"
              min={1}
              inputMode="numeric"
              value={zikirDraft}
              onChange={(e) => setZikirDraft(e.target.value)}
              className="tz-field"
            />
            <button type="button" onClick={saveZikir} className={saveBtn}>
              <Save size={14} /> Simpan
            </button>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-tz-muted">
            Dihitung dari zikir yang disimpan ke catatan harian lewat Tasbih Digital.
          </p>

          <label htmlFor="target-tasbih" className="mb-1.5 mt-3.5 block text-[11px] font-semibold uppercase tracking-wide text-tz-muted">
            Target Tasbih Digital
          </label>
          <div className="flex gap-2">
            <input
              id="target-tasbih"
              type="number"
              min={1}
              inputMode="numeric"
              value={tasbihDraft}
              onChange={(e) => setTasbihDraft(e.target.value)}
              className="tz-field"
            />
            <button type="button" onClick={saveTasbih} className={saveBtn}>
              <Save size={14} /> Simpan
            </button>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-tz-muted">
            Hitungan tasbih yang sudah disimpan ke catatan harian otomatis direset — tidak dihitung dua kali.
          </p>
        </SectionCard>

        {/* D. Ibadah Tambahan */}
        <SectionCard icon={<Target size={17} />} title="Ibadah Tambahan" caption="Opsional — pilih yang ingin dilacak">
          <div className="space-y-1">
            {EXTRAS.map((e) => {
              const active = (settings.trackedExtras ?? []).includes(e.id);
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-tz-ink">{e.label}</p>
                    <p className="text-[10.5px] text-tz-muted">{e.caption}</p>
                  </div>
                  <Switch
                    checked={active}
                    onCheckedChange={(v) => toggleTracked(e.id, v)}
                    aria-label={`Lacak ${e.label}`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-tz-muted">
            Aktivitas yang tidak dilacak tidak muncul di Beranda dan tidak dihitung dalam progres harian. Semua perubahan
            tersimpan otomatis.
          </p>
        </SectionCard>
      </div>
    </m.div>
  );
}

/** Label slot kedua mengikuti hari ini (Jumat → Salat Jumat). */
function fridayLabel(): string {
  return new Date().getDay() === 5 ? "Jumat" : "Zuhur";
}
