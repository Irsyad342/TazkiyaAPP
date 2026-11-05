"use client";

/**
 * Tazkiya v4 — Zikir & Doa sebagai aplikasi tasbih digital.
 * Komposisi baru: piringan penghitung besar di tengah (cincin konsentris +
 * angka Outfit) sebagai pintu masuk tasbih; set zikir berupa kartu lipat
 * dengan tipografi Arab menonjol; riwayat sesi; tab Doa mempertahankan Doa
 * Hari Ini + kategori chip + kartu bacaan bersumber. Logika slot, sesi, dan
 * kategori tidak berubah.
 */

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, CircleDot, HandHeart, History, Sparkles } from "lucide-react";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { DAILY_DUAS, duaOfTheDay, type DailyDua } from "@/lib/tazkiya/duas";
import { DOA_HARIAN_IDS, DOA_KATEGORI, DOA_KOLEKSI, ZIKIR_SETS, type DoaItem, type ZikirSet } from "@/lib/tazkiya/zikir-doa";
import { relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import type { ZikirSlot } from "@/lib/tazkiya/types";
import { Chip, EmptyState, GlassCard, SectionHeader, SegmentedTabs } from "./ui-bits";
import { SubPageHeader } from "./SubPageHeader";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<ZikirSlot, string> = {
  pagi: "Zikir pagi",
  petang: "Zikir petang",
  "setelah-sholat": "Setelah salat",
  harian: "Zikir harian",
};

type Tab = "zikir" | "doa";

/** Satu set zikir yang bisa dilipat — item dengan teks Arab + transliterasi + arti + sumber. */
function ZikirSetCard({ set, onOpenTasbih }: { set: ZikirSet; onOpenTasbih: (slot: ZikirSlot) => void }) {
  const [open, setOpen] = useState(set.id === "zikir-pagi");
  return (
    <GlassCard className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">
          <Sparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[14px] font-bold text-tz-ink">{set.title}</span>
          <span className="block truncate text-[11px] text-tz-muted">{set.caption}</span>
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-tz-line-soft">
          <ul className="divide-y divide-tz-line-soft">
            {set.items.map((it) => (
              <li key={it.id} className="px-4 py-4">
                {it.name ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tz-violet dark:text-tz-accent">{it.name}</p> : null}
                {it.arabic ? <p className="quran-arabic mt-2 text-right text-[20px] leading-[1.95] text-tz-ink">{it.arabic}</p> : null}
                <p className="mt-2 text-[12px] font-semibold italic leading-relaxed text-tz-muted">{it.latin}</p>
                {it.meaning ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-tz-ink/90">{it.meaning}</p> : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {it.count ? <Chip className="border-tz-violet/25 bg-tz-lavender/60 text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">{it.count}</Chip> : null}
                  {it.source ? <Chip className="border-tz-line">{it.source}</Chip> : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-tz-line-soft p-3.5">
            <button
              type="button"
              onClick={() => onOpenTasbih(set.slot)}
              className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-tz-ink font-display text-[13px] font-bold text-white"
            >
              <CircleDot size={15} className="text-tz-lime" /> Buka tasbih — {set.title.toLowerCase()}
            </button>
            <p className="mt-1.5 text-center text-[9.5px] text-tz-muted/80">
              Hitungan yang disimpan akan tercatat sebagai {SLOT_LABEL[set.slot].toLowerCase()}.
            </p>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}

/** Kartu doa seragam untuk DAILY_DUAS & DOA_KOLEKSI. */
function DoaCard({ title, arabic, transliteration, meaning, source }: {
  title: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  source: string;
}) {
  return (
    <GlassCard className="p-4">
      <p className="font-display text-[13px] font-bold text-tz-ink">{title}</p>
      {arabic ? <p className="quran-arabic mt-2.5 text-right text-[20px] leading-[1.95] text-tz-ink">{arabic}</p> : null}
      {transliteration ? <p className="mt-2 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{transliteration}&rdquo;</p> : null}
      <p className="mt-1.5 text-[12px] leading-relaxed text-tz-ink/90">{meaning}</p>
      {source ? (
        <div className="mt-2.5">
          <Chip className="border-tz-line">{source}</Chip>
        </div>
      ) : null}
    </GlassCard>
  );
}

function duaToCard(d: DailyDua) {
  return { title: d.title, arabic: d.arabic, transliteration: d.transliteration, meaning: d.meaning, source: d.source };
}
function doaToCard(d: DoaItem) {
  return { title: `${d.title}${d.count ? ` · ${d.count}` : ""}`, arabic: d.arabic, transliteration: d.latin, meaning: d.meaning, source: d.source };
}

export function ZikirDoaPage({ onBack, onOpenTasbih }: { onBack: () => void; onOpenTasbih: (slot?: ZikirSlot) => void }) {
  const [tab, setTab] = useState<Tab>("zikir");
  const [cat, setCat] = useState<(typeof DOA_KATEGORI)[number]["id"]>("harian");

  const tasbih = useWorshipStore((s) => s.tasbih);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const today = todayKey();

  const doaList = useMemo(() => {
    if (cat === "harian") {
      return DOA_HARIAN_IDS.map((id) => DAILY_DUAS.find((d) => d.id === id)).filter((d): d is DailyDua => !!d).map(duaToCard);
    }
    return DOA_KOLEKSI.filter((d) => d.kategori === cat).map(doaToCard);
  }, [cat]);

  const dua = duaOfTheDay(today);
  const tasbihPct = Math.min(100, (tasbih.count / Math.max(1, tasbih.target)) * 100);

  return (
    <div className="space-y-5">
      <SubPageHeader title="Zikir & Doa" caption="Pengingat hati — pagi, petang, dan sepanjang hari" onBack={onBack} />

      {/* Tab garis editorial */}
      <SegmentedTabs
        ariaLabel="Bagian zikir dan doa"
        items={[
          { id: "zikir" as const, label: "Zikir", icon: CircleDot },
          { id: "doa" as const, label: "Doa", icon: HandHeart },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "zikir" ? (
        <div key="zikir" className="tz-fade-in lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="space-y-5 lg:col-span-5">
            {/* Piringan tasbih besar — pintu masuk utama */}
            <GlassCard className="p-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tz-muted">Tasbih Digital</p>
              <button
                type="button"
                onClick={() => onOpenTasbih("harian")}
                aria-label={`Buka tasbih — hitungan saat ini ${tasbih.count} dari ${tasbih.target}`}
                className="tap relative mx-auto mt-4 flex h-44 w-44 items-center justify-center rounded-full"
              >
                {/* cincin konsentris: trek, progres, piringan */}
                <span aria-hidden className="absolute inset-0 rounded-full border-[1.5px] border-tz-violet/30" />
                <span aria-hidden className="absolute inset-3 rounded-full border border-dashed border-tz-violet/35" />
                <svg aria-hidden viewBox="0 0 176 176" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="88" cy="88" r="82" fill="none" strokeWidth="6" className="stroke-tz-track" />
                  <circle
                    cx="88"
                    cy="88"
                    r="82"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="stroke-tz-lime"
                    strokeDasharray={`${(tasbihPct / 100) * 2 * Math.PI * 82} ${2 * Math.PI * 82}`}
                    style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                </svg>
                <span className="tz-tasbih-disc relative flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full">
                  <span className="tnum font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-tz-ink">
                    {tasbih.count.toLocaleString("id-ID")}
                  </span>
                  <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-tz-muted">
                    dari {tasbih.target.toLocaleString("id-ID")}
                  </span>
                </span>
                <span aria-hidden className="absolute bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-tz-lime" />
              </button>
              <p className="mt-4 truncate text-[13px] font-semibold text-tz-ink">{tasbih.dhikr}</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-tz-muted">
                Ketuk piringan untuk berzikir. Tombol “Simpan Harian” mencatat hitungan ke hari ini dan riwayat.
              </p>
            </GlassCard>

            {/* Riwayat zikir */}
            <section aria-label="Riwayat zikir">
              <SectionHeader title="Riwayat Zikir" caption={`${zikirSessions.length} sesi tercatat`} />
              {zikirSessions.length === 0 ? (
                <EmptyState
                  icon={<History size={18} />}
                  title="Belum ada sesi zikir"
                  caption="Buka tasbih, berzikir, lalu tekan Simpan Harian — sesi akan tercatat di sini."
                />
              ) : (
                <GlassCard className="thin-scrollbar max-h-80 overflow-y-auto">
                  <ul className="divide-y divide-tz-line-soft">
                    {zikirSessions.slice(0, 25).map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-tz-violet dark:bg-tz-accent/15 dark:text-tz-accent">
                          <CircleDot size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-tz-ink">
                            {s.count.toLocaleString("id-ID")}× {s.dhikr}
                          </span>
                          <span className="block text-[10px] text-tz-muted">
                            {SLOT_LABEL[s.slot] ?? "Zikir"} · {relativeDayLabel(s.date, today)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </section>
          </div>

          {/* Set zikir */}
          <section aria-label="Set zikir" className="mt-5 space-y-3 lg:col-span-7 lg:mt-0">
            <SectionHeader title="Set Zikir" caption="Bacaan masyhur dengan sumber — dilipat agar ringan di layar" />
            {ZIKIR_SETS.map((set) => (
              <ZikirSetCard key={set.id} set={set} onOpenTasbih={(slot) => onOpenTasbih(slot)} />
            ))}
          </section>
        </div>
      ) : (
        <div key="doa" className="tz-fade-in lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          {/* Doa Hari Ini — fitur lama dipertahankan & diintegrasikan */}
          <div className="lg:col-span-5">
            <SectionHeader title="Doa Hari Ini" caption={dua.title} />
            <GlassCard variant="violet" className="p-5">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-tz-violet dark:bg-white/10 dark:text-tz-accent">
                <BookOpen size={16} />
              </span>
              {dua.arabic ? <p className="quran-arabic mt-3.5 text-right text-[21px] leading-[1.95] text-tz-ink">{dua.arabic}</p> : null}
              {dua.transliteration ? <p className="mt-2.5 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p> : null}
              <p className="mt-2 text-[12px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
              {dua.source ? (
                <div className="mt-3">
                  <Chip className="border-tz-violet/25 bg-white/60 text-tz-violet dark:bg-white/10 dark:text-tz-accent">{dua.source}</Chip>
                </div>
              ) : null}
            </GlassCard>
          </div>

          {/* Kategori + daftar doa */}
          <div className="mt-5 lg:col-span-7 lg:mt-0">
            <SectionHeader title="Kumpulan Doa" caption={DOA_KATEGORI.find((k) => k.id === cat)?.caption} />
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Kategori doa">
              {DOA_KATEGORI.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={cat === k.id}
                  onClick={() => setCat(k.id)}
                  className={cn(
                    "tap shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
                    cat === k.id
                      ? "border-tz-ink bg-tz-ink text-white"
                      : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              {doaList.length === 0 ? (
                <p className="rounded-2xl border border-tz-line bg-tz-panel-soft px-4 py-5 text-center text-[12px] text-tz-muted sm:col-span-2">
                  Belum ada doa pada kategori ini.
                </p>
              ) : (
                doaList.map((d) => <DoaCard key={d.title} {...d} />)
              )}
            </div>

            <p className="mt-4 pb-1 text-center text-[10px] leading-relaxed text-tz-muted/60">
              Bacaan dikurasi dari Al-Qur&apos;an dan riwayat masyhur dengan sumber tertulis — tanpa teks karangan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
