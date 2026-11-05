"use client";

/**
 * Tazkiya — Jurnal Syukur (halaman tersendiri dari Beranda).
 * A. Today's Shukr: tiga hal yang disyukuri + tombol simpan.
 * B. Mood check-in: pilihan perasaan oleh pengguna (bukan diagnosis).
 * C. Hadith for Your Heart: hadis dengan sumber kitab + nomor yang jelas —
 *    tidak ada teks buatan; dapat disalin/dibagikan dan diganti.
 * D. Privasi: data hanya di perangkat & akun pengguna; riwayat bisa
 *    diedit dan dihapus; tetap ada setelah logout-login.
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
    toast.success("Jurnal syukur tersimpan — terima kasih sudah merenung hari ini");
  };

  const historyDates = useMemo(
    () => Object.keys(journal).filter((d) => d !== today).sort((a, b) => b.localeCompare(a)),
    [journal, today]
  );

  return (
    <div className="space-y-6">
      <SubPageHeader title="Jurnal Syukur" caption="Refleksi harian — tiga hal kecil yang layak disyukuri" onBack={onBack} />

      {/* ---------- A. Today's Shukr ---------- */}
      <section aria-label="Jurnal hari ini" className="animate-tz-fade-up">
        <GlassCard className="p-5">
          <p className="font-display text-[17px] font-extrabold leading-snug text-tz-ink">
            Hal apa yang kamu syukuri hari ini?
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-tz-muted">
            Tulis dengan bebas. Sesederhana apa pun tetap berharga.
          </p>

          <div className="mt-4 space-y-2.5">
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold",
                    items[i]?.trim() ? "bg-tz-lime text-tz-lime-ink" : "bg-tz-panel-soft text-tz-muted"
                  )}
                >
                  {items[i]?.trim() ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <input
                  type="text"
                  value={items[i]}
                  maxLength={160}
                  onChange={(e) => {
                    const next = [...items] as [string, string, string];
                    next[i] = e.target.value;
                    setItems(next);
                  }}
                  placeholder={i === 0 ? "Hal pertama yang saya syukuri…" : i === 1 ? "Hal kedua yang saya syukuri…" : "Hal ketiga — yang kecil pun boleh…"}
                  aria-label={`Hal ${i + 1} yang disyukuri`}
                  className="tz-field flex-1"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={cn(
              "tap mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-all",
              canSave ? "tz-btn-ink" : "cursor-not-allowed bg-tz-panel-soft text-tz-muted opacity-60"
            )}
          >
            <BookHeart size={16} /> Simpan Jurnal
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-tz-muted/85">
            <Lock size={10} />
            {savedAt ? `Tersimpan hari ini — kamu bisa mengeditnya kapan saja.` : "Privat — hanya kamu yang bisa membacanya."}
          </p>
        </GlassCard>
      </section>

      {/* ---------- B. Mood check-in ---------- */}
      <section aria-label="Mood check-in" className="animate-tz-fade-up">
        <SectionHeader title="Mood Check-in" caption="Bagaimana perasaanmu hari ini? Pilihanmu sepenuhnya milikmu" />
        <GlassCard className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const active = activeMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Mood ${m.label}`}
                  onClick={() => {
                    setMoodSel(m.id);
                    setMood(today, m.id);
                  }}
                  className={cn(
                    "tap flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-all",
                    active
                      ? "border-tz-violet/50 bg-tz-violet/[0.08]"
                      : "border-tz-line bg-tz-panel-soft/50 hover:border-tz-line-strong"
                  )}
                >
                  <span aria-hidden className="text-[22px] leading-none">
                    {m.emoji}
                  </span>
                  <span className={cn("text-[10px] font-bold leading-tight", active ? "text-tz-ink" : "text-tz-muted")}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[10px] leading-relaxed text-tz-muted/85">
            Mood membantu memilih pengingat yang sesuai — bukan penilaian atau diagnosis psikologis.
          </p>
        </GlassCard>
      </section>

      {/* ---------- C. Hadith for Your Heart ---------- */}
      <section aria-label="Hadis untuk hatimu" className="animate-tz-fade-up">
        <SectionHeader
          title="Hadith for Your Heart"
          caption={activeMood ? `Pengingat yang selaras dengan mood "${moodLabel(activeMood)}"` : "Pengingat untuk hatimu hari ini"}
        />
        <GlassCard variant="violet" className="p-5">
          <Chip className="bg-tz-panel font-bold text-tz-accent">{hadith.tag}</Chip>
          <p className="quran-arabic mt-3.5 text-right text-[21px] leading-[1.95] text-tz-ink">{hadith.arabic}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-tz-ink/95">&ldquo;{hadith.text}&rdquo;</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip className="bg-tz-panel font-bold text-tz-accent">{hadith.source}</Chip>
            <Chip>Dinukil apa adanya</Chip>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void shareQuote(`"${hadith.text}"\n— ${hadith.source}`)}
              className="tap tz-btn-ink flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold"
            >
              <Share2 size={14} /> Simpan / Bagikan
            </button>
            <button
              type="button"
              onClick={() => setHadithOffset((o) => o + 1)}
              className="tap flex min-h-[40px] items-center gap-1.5 rounded-full border border-tz-line bg-tz-panel px-3.5 text-[12px] font-bold text-tz-accent"
            >
              <Sparkles size={14} /> Lihat hadis lainnya
            </button>
          </div>
          <p className="mt-2.5 text-[10px] leading-relaxed text-tz-muted/85">
            Kutipan diambil dari koleksi riwayat masyhur dengan sumber tertulis. Tidak ada teks yang dihasilkan otomatis.
          </p>
        </GlassCard>
      </section>

      {/* ---------- D. Riwayat jurnal ---------- */}
      <section aria-label="Riwayat jurnal syukur" className="animate-tz-fade-up">
        <SectionHeader title="Riwayat Jurnal" caption={`${historyDates.length} hari tercatat`} />
        {historyDates.length === 0 ? (
          <EmptyState
            icon={<BookHeart size={18} />}
            title="Riwayat masih kosong"
            caption="Jurnal yang kamu simpan akan muncul di sini dan tetap ada setelah logout-login."
          />
        ) : (
          <GlassCard className="thin-scrollbar max-h-[26rem] overflow-y-auto">
            <ul className="divide-y divide-tz-line-soft">
              {historyDates.map((d) => {
                const e = journal[d];
                return (
                  <li key={d} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-extrabold text-tz-ink">{relativeDayLabel(d, today)}</p>
                      <div className="flex items-center gap-1.5">
                        {e.mood ? (
                          <span aria-label={`Mood ${moodLabel(e.mood)}`} className="text-[14px]">
                            {MOODS.find((m) => m.id === e.mood)?.emoji}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Muulkan jurnal ${formatDayFull(d)} untuk diedit`}
                          onClick={() => {
                            setItems(e.items);
                            setMoodSel(e.mood);
                            setSavedAt(e.savedAt);
                            toast.info("Jurnal dimuat ke atas — ubah lalu simpan kembali");
                            // Konten aplikasi bergulir di dalam bingkai, bukan di window.
                            document.getElementById("konten-tazkiya")?.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="tap rounded-lg bg-tz-panel-soft px-2 py-1 text-[10px] font-bold text-tz-accent"
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
                          className="tap flex h-9 w-9 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-500"
                        >
                          <Trash2 size={13} />
                        </ConfirmButton>
                      </div>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {e.items.filter(Boolean).map((it, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-tz-ink/85">
                          <Heart size={10} className="mt-1 shrink-0 text-tz-violet/80" aria-hidden />
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

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10px] leading-relaxed text-tz-muted/70">
        <Lock size={10} />
        Jurnal tersimpan di perangkat &amp; akunmu — tidak dikirim ke layanan analisis mana pun.
      </p>
    </div>
  );
}
