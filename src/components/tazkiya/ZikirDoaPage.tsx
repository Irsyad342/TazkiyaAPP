"use client";

/**
 * Tazkiya — Zikir & Doa (halaman tersendiri dari Beranda).
 * Tab Zikir: tasbih digital (dengan slot zikir), set zikir pagi/petang/
 * setelah salat/harian dengan teks bersumber, dan riwayat sesi zikir.
 * Tab Doa: Doa Hari Ini (fitur lama, diintegrasi) + kategori doa dengan
 * sumber terverifikasi.
 */

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, CircleDot, HandHeart, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { DAILY_DUAS, duaOfTheDay, type DailyDua } from "@/lib/tazkiya/duas";
import { DOA_HARIAN_IDS, DOA_KATEGORI, DOA_KOLEKSI, ZIKIR_SETS, type DoaItem, type ZikirSet } from "@/lib/tazkiya/zikir-doa";
import { relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import type { ZikirSlot } from "@/lib/tazkiya/types";
import { Chip, EmptyState, GlassCard, SectionHeader } from "./ui-bits";
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
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tz-violet/12 text-tz-violet">
          <Sparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-tz-ink">{set.title}</span>
          <span className="block truncate text-[11px] text-tz-muted">{set.caption}</span>
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-tz-line-soft">
          <ul className="divide-y divide-tz-line-soft">
            {set.items.map((it) => (
              <li key={it.id} className="px-4 py-3.5">
                {it.name ? <p className="text-[11px] font-extrabold uppercase tracking-wide text-tz-accent">{it.name}</p> : null}
                {it.arabic ? <p className="quran-arabic mt-1.5 text-right text-[19px] leading-[1.95] text-tz-ink">{it.arabic}</p> : null}
                <p className="mt-1.5 text-[12px] font-semibold italic leading-relaxed text-tz-muted">{it.latin}</p>
                {it.meaning ? <p className="mt-1 text-[11.5px] leading-relaxed text-tz-ink/90">{it.meaning}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {it.count ? <Chip className="bg-tz-lime/40 font-bold text-tz-lime-ink">{it.count}</Chip> : null}
                  {it.source ? <Chip>{it.source}</Chip> : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-tz-line-soft p-3.5">
            <button
              type="button"
              onClick={() => onOpenTasbih(set.slot)}
              className="tap tz-btn-ink flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full text-[12.5px] font-bold"
            >
              <CircleDot size={15} /> Buka tasbih — {set.title.toLowerCase()}
            </button>
            <p className="mt-1.5 text-center text-[9.5px] text-tz-muted/85">
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
      <p className="text-[13px] font-extrabold text-tz-ink">{title}</p>
      {arabic ? <p className="quran-arabic mt-2.5 text-right text-[19px] leading-[1.95] text-tz-ink">{arabic}</p> : null}
      {transliteration ? <p className="mt-1.5 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{transliteration}&rdquo;</p> : null}
      <p className="mt-1.5 text-[12px] leading-relaxed text-tz-ink/90">{meaning}</p>
      {source ? (
        <div className="mt-2.5">
          <Chip className="bg-tz-violet/12 font-bold text-tz-accent">{source}</Chip>
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

  return (
    <div className="space-y-5">
      <SubPageHeader title="Zikir & Doa" caption="Pengingat hati — pagi, petang, dan sepanjang hari" onBack={onBack} />

      {/* Tab */}
      <div className="grid grid-cols-2 gap-1.5 rounded-full border border-tz-line bg-tz-panel-soft p-1.5" role="tablist" aria-label="Bagian zikir dan doa">
        {(
          [
            { id: "zikir" as const, label: "Zikir", icon: CircleDot },
            { id: "doa" as const, label: "Doa", icon: HandHeart },
          ]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "tap flex min-h-[40px] items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition-all",
              tab === id ? "tz-btn-ink" : "text-tz-muted hover:text-tz-accent"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "zikir" ? (
        <div key="zikir" className="tz-fade-in space-y-5">
          {/* Tasbih digital */}
          <GlassCard className="tap cursor-pointer p-5" onClick={() => onOpenTasbih("harian")}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-tz-muted">Tasbih Digital</p>
                <p className="mt-1 truncate text-[13px] font-bold text-tz-ink">{tasbih.dhikr}</p>
                <p className="mt-0.5 text-[11px] text-tz-muted">
                  {tasbih.count.toLocaleString("id-ID")} / {tasbih.target.toLocaleString("id-ID")} hitungan
                </p>
              </div>
              <span
                aria-hidden
                className="tz-stat flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tz-lime text-[17px] text-tz-lime-ink"
              >
                {tasbih.count}
              </span>
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-tz-muted/90">
              Ketuk kartu untuk berzikir. Tombol “Simpan Harian” di dalam tasbih mencatat hitungan ke hari ini dan riwayat.
            </p>
          </GlassCard>

          {/* Set zikir */}
          <section aria-label="Set zikir" className="space-y-3">
            <SectionHeader title="Set Zikir" caption="Bacaan masyhur dengan sumber — dilipat agar ringan di layar" />
            {ZIKIR_SETS.map((set) => (
              <ZikirSetCard key={set.id} set={set} onOpenTasbih={(slot) => onOpenTasbih(slot)} />
            ))}
          </section>

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
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tz-violet/12 text-tz-violet">
                        <CircleDot size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-tz-ink">
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
      ) : (
        <div key="doa" className="tz-fade-in space-y-5">
          {/* Doa Hari Ini — fitur lama dipertahankan & diintegrasikan */}
          <GlassCard variant="violet" className="p-5">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-tz-violet/12 text-tz-violet">
                <BookOpen size={16} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[15px] font-extrabold text-tz-ink">Doa Hari Ini</p>
                <p className="text-[10.5px] text-tz-muted">{dua.title}</p>
              </div>
            </div>
            {dua.arabic ? <p className="quran-arabic mt-3.5 text-right text-[21px] leading-[1.95] text-tz-ink">{dua.arabic}</p> : null}
            {dua.transliteration ? <p className="mt-2 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p> : null}
            <p className="mt-2 text-[12px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
            {dua.source ? (
              <div className="mt-3">
                <Chip className="bg-tz-panel font-bold text-tz-accent">{dua.source}</Chip>
              </div>
            ) : null}
          </GlassCard>

          {/* Kategori */}
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Kategori doa">
            {DOA_KATEGORI.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={cat === k.id}
                onClick={() => setCat(k.id)}
                className={cn(
                  "tap shrink-0 rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold transition-all",
                  cat === k.id
                    ? "border-transparent bg-tz-ink text-white"
                    : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-accent"
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="px-1 text-[10.5px] text-tz-muted">{DOA_KATEGORI.find((k) => k.id === cat)?.caption}</p>

          <div className="space-y-3">
            {doaList.length === 0 ? (
              <p className="rounded-2xl bg-tz-panel-soft px-4 py-5 text-center text-[12px] text-tz-muted">
                Belum ada doa pada kategori ini.
              </p>
            ) : (
              doaList.map((d) => <DoaCard key={d.title} {...d} />)
            )}
          </div>

          <p className="pb-1 text-center text-[10px] leading-relaxed text-tz-muted/70">
            Bacaan dikurasi dari Al-Qur&apos;an dan riwayat masyhur dengan sumber tertulis — tanpa teks karangan.
          </p>
        </div>
      )}
    </div>
  );
}
