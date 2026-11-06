"use client";

/**
 * Tazkiya v4 — Jurnal Syukur sebagai aplikasi journaling premium.
 * A. Refleksi hari ini: tiga pertanyaan bernomor dalam kolom tulis yang
 *    lega + tombol simpan tinta.
 * B. Mood check-in: lingkaran besar terpilih lavender.
 * C. Hadis kutipan editorial dengan sumber kitab + nomor jelas.
 * D. Riwayat: daftar kartu kecil berisi pratinjau + edit (teks & mood) + hapus (konfirmasi).
 * Logika simpan/muat/hapus dan hadis-per-mood tidak berubah.
 */

import { useMemo, useState } from "react";
import { Check, Heart, Lock, BookHeart, Share2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { m, useReducedMotion } from "framer-motion";
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
  const [justSavedToday, setJustSavedToday] = useState(false);

  /* Editing inline di riwayat: satu jurnal tertentu dibuka sebagai panel
     ekspand pada posisinya — form "hari ini" di atas TIDAK tersentuh, jadi
     menyimpan hasil edit tidak pernah menimpa jurnal hari ini dan posisi
     scroll pengguna tetap. */
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<[string, string, string]>(["", "", ""]);
  const [editMood, setEditMood] = useState<MoodId | undefined>(undefined);

  const activeMood = moodSel ?? moods[today]?.mood;
  const hadith = useMemo(() => hadithForMood(activeMood, today, hadithOffset), [activeMood, today, hadithOffset]);
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  const canSave = items.some((it) => it.trim().length > 0);
  const canSaveEdit = editDraft.some((it) => it.trim().length > 0);

  const save = () => {
    if (!canSave) {
      toast.error("Tulis minimal satu hal yang kamu syukuri");
      return;
    }
    try {
      saveJournal(today, items, activeMood);
      setSavedAt(new Date().toISOString());
      setJustSavedToday(true);
      window.setTimeout(() => setJustSavedToday(false), 1600);
      toast.success("Jurnal syukur tersimpan, terima kasih sudah merenung hari ini");
    } catch {
      toast.error("Gagal menyimpan jurnal. Periksa koneksi lalu coba lagi.");
    }
  };

  const saveEdit = (d: string, mood: MoodId | undefined) => {
    if (!canSaveEdit) {
      toast.error("Tulis minimal satu hal yang kamu syukuri");
      return;
    }
    try {
      saveJournal(d, editDraft, mood);
      setEditingDate(null);
      toast.success("Perubahan jurnal tersimpan");
    } catch {
      toast.error("Gagal menyimpan perubahan. Coba lagi.");
    }
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
              {justSavedToday ? <Check size={16} /> : <BookHeart size={16} />}
              {justSavedToday ? "Tersimpan" : "Simpan Jurnal"}
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
            <div role="radiogroup" aria-label="Pilih mood hari ini" className="flex flex-col gap-2.5">
              {/* Baris 4 + 3 simetris di tengah — selaras dengan mood check-in Beranda; item 70px agar pas di kartu */}
              {[MOODS.slice(0, 4), MOODS.slice(4)].map((row, r) => (
                <div key={r} className="flex items-start justify-center gap-1">
                  {row.map((mo, i) => {
                    const active = activeMood === mo.id;
                    const order = r * 4 + i;
                    return (
                      <m.button
                        key={mo.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`Mood ${mo.label}`}
                        onClick={() => {
                          setMoodSel(mo.id);
                          setMood(today, mo.id);
                        }}
                        initial={motionOK ? { opacity: 0, scale: 0.55, y: 8 } : false}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 24, delay: motionOK ? order * 0.05 : 0 }}
                        whileTap={motionOK ? { scale: 0.88 } : undefined}
                        className="tap flex w-[70px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-2"
                      >
                        <m.span
                          aria-hidden
                          animate={{ scale: motionOK && active ? 1.08 : 1 }}
                          transition={{ type: "spring", stiffness: 420, damping: 20 }}
                          className={cn(
                            "flex rounded-[25%] transition-[box-shadow] duration-300",
                            active
                              ? "ring-2 ring-tk-accent ring-offset-2 ring-offset-tk-panel light:shadow-[0_10px_22px_-8px_rgba(255,90,0,0.45)] dark:shadow-[0_10px_24px_-10px_rgba(255,90,0,0.4)]"
                              : "light:shadow-[0_6px_14px_-6px_rgba(119,113,109,0.42)] light:ring-1 light:ring-[#2a2320]/[0.06] dark:shadow-[0_8px_18px_-10px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-white/[0.05]"
                          )}
                        >
                          <MoodFace id={mo.id} className="h-14 w-14" />
                        </m.span>
                        <span className={cn("whitespace-nowrap text-[10.5px] leading-none", active ? "font-bold text-tk-ink" : "font-medium text-tk-muted")}>
                          {mo.label}
                        </span>
                      </m.button>
                    );
                  })}
                </div>
              ))}
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
                  const editing = editingDate === d;
                  return (
                    <li key={d} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-2 font-display text-[13px] font-bold text-tk-ink">
                          <span className="truncate">{relativeDayLabel(d, today)}</span>
                          {e.savedAt ? (
                            <span className="tnum shrink-0 text-[10px] font-medium text-tk-muted">
                              {new Date(e.savedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : null}
                          {e.mood ? (
                            <span aria-label={`Mood ${moodLabel(e.mood)}`} className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                              <MoodFace id={e.mood} className="h-5 w-5" />
                            </span>
                          ) : null}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            aria-expanded={editing}
                            aria-label={`Edit jurnal ${formatDayFull(d)} langsung di riwayat`}
                            onClick={() => {
                              if (editing) {
                                setEditingDate(null);
                                return;
                              }
                              setEditingDate(d);
                              setEditDraft(e.items);
                              setEditMood(e.mood);
                            }}
                            className={cn(
                              "tap rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                              editing
                                ? "border-tk-violet bg-tk-lavender text-tk-violet dark:border-tk-accent dark:bg-tk-accent/15 dark:text-tk-accent"
                                : "border-tk-line-strong bg-tk-panel text-tk-ink"
                            )}
                          >
                            {editing ? "Tutup" : "Edit"}
                          </button>
                          <ConfirmButton
                            label={`Hapus jurnal ${formatDayFull(d)}`}
                            title={`Hapus jurnal ${relativeDayLabel(d, today)}?`}
                            description={`Jurnal syukur ${relativeDayLabel(d, today).toLowerCase()} akan dihapus permanen dari riwayat.`}
                            onConfirm={() => {
                              if (editing) setEditingDate(null);
                              deleteJournal(d);
                              toast.info("Jurnal dihapus");
                            }}
                            className="tap flex h-9 w-9 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                          >
                            <Trash2 size={13} />
                          </ConfirmButton>
                        </div>
                      </div>

                      {editing ? (
                        /* Panel edit inline pada posisi jurnal — teks + mood dapat diganti, tanpa scroll ke atas. */
                        <div className="mt-3 rounded-[1.1rem] border border-tk-line bg-tk-panel-soft p-3">
                          {([0, 1, 2] as const).map((i) => (
                            <textarea
                              key={i}
                              value={editDraft[i]}
                              maxLength={160}
                              rows={2}
                              onChange={(ev) => {
                                const next = [...editDraft] as [string, string, string];
                                next[i] = ev.target.value;
                                setEditDraft(next);
                              }}
                              placeholder={i === 0 ? "Hal pertama yang saya syukuri…" : i === 1 ? "Hal kedua yang saya syukuri…" : "Hal ketiga, yang kecil pun boleh…"}
                              aria-label={`Edit hal ${i + 1} jurnal ${formatDayFull(d)}`}
                              className="tk-field mb-2 flex-1 resize-none py-2.5 text-[12px] leading-relaxed last:mb-0"
                            />
                          ))}

                          {/* Mood jurnal ini ikut dapat diganti saat edit — bukan hanya teksnya. */}
                          <div className="mt-1 border-t border-tk-line-soft pt-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10.5px] font-bold text-tk-ink">Mood jurnal ini</p>
                              <span className="text-[10px] font-semibold text-tk-muted">
                                {editMood ? moodLabel(editMood) : "Tanpa mood"}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {MOODS.map((mo) => {
                                const active = editMood === mo.id;
                                return (
                                  <button
                                    key={mo.id}
                                    type="button"
                                    aria-pressed={active}
                                    aria-label={`Mood ${mo.label}`}
                                    onClick={() => setEditMood(mo.id)}
                                    className={cn(
                                      "tap rounded-[25%] p-0.5 transition-[box-shadow] duration-200",
                                      active
                                        ? "ring-2 ring-tk-accent light:shadow-[0_8px_16px_-8px_rgba(255,90,0,0.45)] dark:shadow-[0_8px_18px_-10px_rgba(255,90,0,0.4)]"
                                        : "light:ring-1 light:ring-[#2a2320]/[0.08] dark:ring-1 dark:ring-white/[0.06]"
                                    )}
                                  >
                                    <MoodFace id={mo.id} className="h-8 w-8" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingDate(null)}
                              className="tap flex h-9 items-center justify-center rounded-full border border-tk-line-strong bg-tk-panel px-3.5 text-[11.5px] font-semibold text-tk-ink"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(d, editMood)}
                              disabled={!canSaveEdit}
                              className={cn(
                                "tap gs-ink-btn flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[11.5px] font-bold transition-all",
                                !canSaveEdit && "cursor-not-allowed opacity-40"
                              )}
                            >
                              <Check size={13} strokeWidth={3} /> Simpan Perubahan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ul className="mt-1.5 space-y-0.5">
                          {e.items.filter(Boolean).map((it, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-tk-ink/85">
                              <Heart size={10} className="mt-1 shrink-0 text-tk-violet dark:text-tk-accent" aria-hidden />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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
