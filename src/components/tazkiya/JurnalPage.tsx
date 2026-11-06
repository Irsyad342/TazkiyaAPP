"use client";

/**
 * Tazkiya v4 — Jurnal Syukur sebagai aplikasi journaling premium.
 * A. Refleksi hari ini: tiga pertanyaan bernomor dalam kolom tulis yang
 *    lega + tombol simpan tinta.
 * B. Mood check-in: lingkaran besar terpilih lavender.
 * C. Hadis kutipan editorial dengan sumber kitab + nomor jelas.
 * D. Riwayat: daftar kartu kecil berisi pratinjau + edit + hapus (konfirmasi).
 * Logika simpan/muat/hapus, mood, dan hadis-per-mood tidak berubah.
 */

import { useMemo, useState } from "react";
import { Check, Heart, Lock, BookHeart, Share2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, type MoodId } from "@/lib/tazkiya/types";
import { hadithForMood } from "@/lib/tazkiya/hadith";
import { formatDayFull, relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, SectionHeader } from "./ui-bits";
import { SubPageHeader } from "./SubPageHeader";
import { MoodFace } from "./MoodFace";
import { cn } from "@/lib/utils";

/** Bagikan/salin kutipan ke perangkat (tanpa layanan eksternal). */
async function shareQuote(text: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Kutipan disalin ke clipboard");
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kutipan disalin ke clipboard");
    } catch {
      toast.error("Tidak dapat menyalin di perangkat ini");
    }
  }
}

export function JurnalPage({ onBack }: { onBack: () => void }) {
  const today = todayKey();
  const journal = useWorshipStore((s) => s.journal);
  const moods = useWorshipStore((s) => s.moods);
  const saveJournal = useWorshipStore((s) => s.saveJournal);
  const deleteJournal = useWorshipStore((s) => s.deleteJournal);
  const setMood = useWorshipStore((s) => s.setMood);

  const existing = journal[today];
  const [items, setItems] = useState<[string, string, string]>(existing?.items ?? ["", "", ""]);
  const [moodSel, setMoodSel] = useState<MoodId | undefined>(existing?.mood ?? moods[today]?.mood);
  const [hadithOffset, setHadithOffset] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(existing?.savedAt ?? null);

  const activeMood = moodSel ?? moods[today]?.mood;
  const hadith = useMemo(() => hadithForMood(activeMood, today, hadithOffset), [activeMood, today, hadithOffset]);

  const canSave = items.some((it) => it.trim().length > 0);

  const save = () => {
    if (!canSave) {
      toast.error("Tulis minimal satu hal yang kamu syukuri");
      return;
    }
    saveJournal(today, items, activeMood);
    setSavedAt(new Date().toISOString());
    toast.success("Jurnal syukur tersimpan, terima kasih sudah merenung hari ini");
  };

  const historyDates = useMemo(
    () => Object.keys(journal).filter((d) => d !== today).sort((a, b) => b.localeCompare(a)),
    [journal, today]
  );

  return (
    <div className="space-y-6">
      <SubPageHeader title="Jurnal Syukur" caption="Refleksi harian, tiga hal kecil yang layak disyukuri" onBack={onBack} />

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        {/* ---------- A. Refleksi hari ini ---------- */}
        <section aria-label="Jurnal hari ini" className="animate-tk-fade-up lg:col-span-7">
          <GlassCard className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-[19px] font-bold tracking-[-0.015em] text-tk-ink">
                Hal apa yang kamu syukuri hari ini?
              </p>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-tk-muted">
              Tulis dengan bebas. Sesederhana apa pun tetap berharga.
            </p>

            <div className="mt-5 space-y-3">
              {([0, 1, 2] as const).map((i) => (
                <div key={i} className="flex items-stretch gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "tnum mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] font-display text-[14px] font-bold transition-colors",
                      items[i]?.trim() ? "gs-ink-btn" : "bg-tk-lavender text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent"
                    )}
                  >
                    {items[i]?.trim() ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <textarea
                    value={items[i]}
                    maxLength={160}
                    rows={i === 0 ? 2 : 2}
                    onChange={(e) => {
                      const next = [...items] as [string, string, string];
                      next[i] = e.target.value;
                      setItems(next);
                    }}
                    placeholder={i === 0 ? "Hal pertama yang saya syukuri…" : i === 1 ? "Hal kedua yang saya syukuri…" : "Hal ketiga, yang kecil pun boleh…"}
                    aria-label={`Hal ${i + 1} yang disyukuri`}
                    className="tk-field flex-1 resize-none py-3 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className={cn(
                "tap gs-ink-btn mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full font-display text-[14.5px] font-bold transition-all",
                !canSave && "cursor-not-allowed opacity-40"
              )}
            >
              <BookHeart size={16} /> Simpan Jurnal
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-tk-muted/80">
              <Lock size={10} />
              {savedAt ? "Tersimpan hari ini, kamu bisa mengeditnya kapan saja." : "Privat, hanya kamu yang bisa membacanya."}
            </p>
          </GlassCard>
        </section>

        {/* ---------- B. Mood check-in ---------- */}
        <section aria-label="Mood check-in" className="animate-tk-fade-up mt-6 lg:col-span-5 lg:mt-0">
          <SectionHeader title="Mood Check-in" caption="Pilihanmu sepenuhnya milikmu" />
          <GlassCard className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map((mo) => {
                const active = activeMood === mo.id;
                return (
                  <button
                    key={mo.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Mood ${mo.label}`}
                    onClick={() => {
                      setMoodSel(mo.id);
                      setMood(today, mo.id);
                    }}
                    className="tap flex flex-col items-center gap-2 rounded-[1.2rem] px-1 py-3 transition-all"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex rounded-[25%] transition-all",
                        active && "shadow-[0_8px_18px_-8px_rgba(250,82,0,0.5)] ring-2 ring-tk-accent"
                      )}
                    >
                      <MoodFace id={mo.id} className="h-[52px] w-[52px]" />
                    </span>
                    <span className={cn("text-[10px] font-bold leading-tight", active ? "text-tk-ink" : "text-tk-muted")}>
                      {mo.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 border-t border-tk-line pt-2.5 text-[10px] leading-relaxed text-tk-muted/80">
              Mood membantu memilih pengingat yang sesuai, bukan penilaian atau diagnosis psikologis.
            </p>
          </GlassCard>
        </section>

        {/* ---------- C. Hadis editorial ---------- */}
        <section aria-label="Hadis untuk hatimu" className="animate-tk-fade-up mt-6 lg:col-span-5">
          <SectionHeader
            title="Hadith for Your Heart"
            caption={activeMood ? `Selaras dengan mood "${moodLabel(activeMood)}"` : "Pengingat untuk hatimu hari ini"}
          />
          <GlassCard className="p-5">
            <span aria-hidden className="pointer-events-none absolute right-4 top-1 font-display text-[52px] leading-none text-tk-lavender select-none">
              &rdquo;
            </span>
            <Chip className="relative border-tk-violet/25 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">{hadith.tag}</Chip>
            <p className="quran-arabic relative mt-3.5 text-right text-[21px] leading-[1.95] text-tk-ink">{hadith.arabic}</p>
            <p className="relative mt-3 text-[13px] leading-relaxed text-tk-ink/95">&ldquo;{hadith.text}&rdquo;</p>
            <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
              <Chip className="border-tk-violet/25 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">{hadith.source}</Chip>
              <Chip className="border-tk-line">Dinukil apa adanya</Chip>
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void shareQuote(`"${hadith.text}"\n(${hadith.source})`)}
                className="tap flex min-h-[40px] items-center gap-1.5 rounded-full gs-ink-btn px-4 text-[12px] font-bold"
              >
                <Share2 size={14} /> Simpan / Bagikan
              </button>
              <button
                type="button"
                onClick={() => setHadithOffset((o) => o + 1)}
                className="tap flex min-h-[40px] items-center gap-1.5 rounded-full border border-tk-line-strong bg-tk-panel px-4 text-[12px] font-semibold text-tk-ink"
              >
                <Sparkles size={14} className="text-tk-violet" /> Hadis lainnya
              </button>
            </div>
            <p className="relative mt-2.5 text-[10px] leading-relaxed text-tk-muted/80">
              Kutipan diambil dari koleksi riwayat masyhur dengan sumber tertulis. Tidak ada teks yang dihasilkan otomatis.
            </p>
          </GlassCard>
        </section>

        {/* ---------- D. Riwayat jurnal ---------- */}
        <section aria-label="Riwayat jurnal syukur" className="animate-tk-fade-up mt-6 lg:col-span-7">
          <SectionHeader title="Riwayat Jurnal" caption={`${historyDates.length} hari tercatat`} />
          {historyDates.length === 0 ? (
            <EmptyState
              icon={<BookHeart size={18} />}
              title="Riwayat masih kosong"
              caption="Jurnal yang kamu simpan akan muncul di sini dan tetap ada setelah logout-login."
            />
          ) : (
            <GlassCard className="thin-scrollbar max-h-[26rem] overflow-y-auto">
              <ul className="divide-y divide-tk-line-soft">
                {historyDates.map((d) => {
                  const e = journal[d];
                  return (
                    <li key={d} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 font-display text-[13px] font-bold text-tk-ink">
                          {relativeDayLabel(d, today)}
                          {e.mood ? (
                            <span aria-label={`Mood ${moodLabel(e.mood)}`} className="inline-flex h-6 w-6 items-center justify-center">
                              <MoodFace id={e.mood} className="h-5 w-5" />
                            </span>
                          ) : null}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Muulkan jurnal ${formatDayFull(d)} untuk diedit`}
                            onClick={() => {
                              setItems(e.items);
                              setMoodSel(e.mood);
                              setSavedAt(e.savedAt);
                              toast.info("Jurnal dimuat ke atas, ubah lalu simpan kembali");
                              // Konten aplikasi bergulir di dalam kontainer utama, bukan di window.
                              document.getElementById("konten-tazkiya")?.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="tap rounded-full border border-tk-line-strong bg-tk-panel px-2.5 py-1 text-[10px] font-semibold text-tk-ink"
                          >
                            Edit
                          </button>
                          <ConfirmButton
                            label={`Hapus jurnal ${formatDayFull(d)}`}
                            title={`Hapus jurnal ${relativeDayLabel(d, today)}?`}
                            description={`Jurnal syukur ${relativeDayLabel(d, today).toLowerCase()} akan dihapus permanen dari riwayat.`}
                            onConfirm={() => {
                              deleteJournal(d);
                              toast.info("Jurnal dihapus");
                            }}
                            className="tap flex h-9 w-9 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                          >
                            <Trash2 size={13} />
                          </ConfirmButton>
                        </div>
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {e.items.filter(Boolean).map((it, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-tk-ink/85">
                            <Heart size={10} className="mt-1 shrink-0 text-tk-violet dark:text-tk-accent" aria-hidden />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          )}
        </section>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10px] leading-relaxed text-tk-muted/60">
        <Lock size={10} />
        Jurnal tersimpan di perangkat &amp; akunmu, tidak dikirim ke layanan analisis mana pun.
      </p>
    </div>
  );
}
