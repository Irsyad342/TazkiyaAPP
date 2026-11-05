"use client";

/**
 * Tazkiya v5 — Zikir & Doa sebagai minimalist digital tasbih.
 * KOMPOSISI BARU: penghitung lingkaran besar menjadi fokus visual halaman —
 * nama zikir, Arab (bila tersedia), cincin progres lavender dengan ujung
 * lime, angka Manrope raksasa, tombol hitung lingkaran besar dengan animasi
 * tekan, reset, pemilihan target, dan tombol layar penuh. Set zikir berupa
 * daftar lipat tipografis (Arab menonjol); riwayat sesi baris hairline;
 * tab Doa editorial. Logika slot, sesi, dan kategori tidak berubah.
 */

import { useMemo, useState } from "react";
import { ChevronDown, CircleDot, Expand, HandHeart, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { m } from "framer-motion";
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

/** Padanan Arab untuk preset tasbih yang masyhur (tampilan, bukan data baru). */
const PRESET_ARABIC: Record<string, { arabic: string; meaning: string }> = {
  Subhanallah: { arabic: "سُبْحَانَ اللهِ", meaning: "Mahasuci Allah" },
  "Alhamdulillah": { arabic: "اَلْحَمْدُ لِلّٰهِ", meaning: "Segala puji bagi Allah" },
  "Allahu Akbar": { arabic: "اَللهُ أَكْبَرُ", meaning: "Allah Mahabesar" },
  "Laa ilaaha illallah": { arabic: "لَا إِلٰهَ إِلَّا الله", meaning: "Tiada tuhan selain Allah" },
  "Astagfirullah": { arabic: "أَسْتَغْفِرُ اللهَ", meaning: "Aku memohon ampun kepada Allah" },
};

type Tab = "zikir" | "doa";

/* ================= Penghitung tasbih — fokus visual halaman ================= */

function TasbihCounter({ onOpenFull }: { onOpenFull: () => void }) {
  const tasbih = useWorshipStore((s) => s.tasbih);
  const tasbihAdd = useWorshipStore((s) => s.tasbihAdd);
  const tasbihMinus = useWorshipStore((s) => s.tasbihMinus);
  const tasbihReset = useWorshipStore((s) => s.tasbihReset);
  const tasbihSetTarget = useWorshipStore((s) => s.tasbihSetTarget);
  const commitZikirToDay = useWorshipStore((s) => s.commitZikirToDay);
  const vibration = useWorshipStore((s) => s.settings.vibration);
  const animations = useWorshipStore((s) => s.settings.animations);

  const pct = Math.min(100, Math.round((tasbih.count / Math.max(1, tasbih.target)) * 100));
  const reached = tasbih.count >= tasbih.target;
  const arabic = PRESET_ARABIC[tasbih.dhikr];

  const count = () => {
    tasbihAdd(1);
    if (vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        /* perangkat tidak mendukung */
      }
    }
    if (tasbih.count + 1 === tasbih.target) toast.success("Target tasbih tercapai! Barakallah");
  };

  /** Geometri cincin (viewBox 280). */
  const R = 128;
  const CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180);
  const tipX = 140 + R * Math.cos(angle);
  const tipY = 140 + R * Math.sin(angle);

  return (
    <section aria-label="Tasbih digital" className="animate-tz-fade-up flex flex-col items-center">
      {/* Nama zikir + Arab */}
      <div className="text-center">
        <p className="v5-overline">Tasbih Digital</p>
        <p className="mt-2.5 text-[19px] font-bold tracking-[-0.01em] text-tz-ink">{tasbih.dhikr}</p>
        {arabic ? (
          <>
            <p className="quran-arabic mt-3 text-[26px] leading-[1.7] text-tz-ink">{arabic.arabic}</p>
            <p className="mt-1 text-[12px] font-medium text-tz-muted">{arabic.meaning}</p>
          </>
        ) : null}
      </div>

      {/* Lingkaran hitung besar — ketuk untuk menambah */}
      <m.button
        type="button"
        onClick={count}
        whileTap={{ scale: 0.955 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        aria-label={`Tambah hitungan, saat ini ${tasbih.count}`}
        className={cn("relative mt-7 flex h-[248px] w-[248px] items-center justify-center rounded-full sm:h-[264px] sm:w-[264px]", reached && animations && "animate-tz-pulse")}
      >
        <svg aria-hidden viewBox="0 0 280 280" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="140" cy="140" r={R} fill="none" strokeWidth="7" className="stroke-tz-track" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-tz-violet"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        {/* titik lime di ujung busur — aksen tunggal */}
        {pct > 2 && pct < 100 ? (
          <span
            aria-hidden
            className="absolute h-3 w-3 rounded-full bg-tz-lime ring-4 ring-tz-lime/25"
            style={{
              left: `calc(${(tipX / 280) * 100}% - 6px)`,
              top: `calc(${(tipY / 280) * 100}% - 6px)`,
            }}
          />
        ) : null}
        {/* piringan putih */}
        <span aria-hidden className="tz-tasbih-disc absolute inset-[30px] rounded-full border border-tz-line" />
        <m.span key={tasbih.count} initial={{ scale: animations ? 0.94 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 550, damping: 24 }} className="relative flex flex-col items-center">
          <span className="v5-display text-[58px] font-extrabold leading-none text-tz-ink sm:text-[64px]">
            {tasbih.count.toLocaleString("id-ID")}
          </span>
          <span className="mt-1.5 text-[11.5px] font-medium text-tz-muted">
            dari {tasbih.target.toLocaleString("id-ID")} target
          </span>
          <span
            className={cn(
              "mt-2.5 rounded-full px-3 py-1 text-[10px] font-bold",
              reached ? "bg-tz-lime text-tz-lime-ink" : "bg-tz-lavender text-tz-violet"
            )}
          >
            {reached ? "Target tercapai" : `${pct}%`}
          </span>
        </m.span>
      </m.button>

      {/* Kontrol: kurangi · reset · simpan */}
      <div className="mt-6 flex items-center gap-2.5">
        <button
          type="button"
          onClick={tasbihMinus}
          aria-label="Kurangi satu hitungan"
          className="tap flex h-12 w-12 items-center justify-center rounded-full bg-tz-panel-soft text-tz-ink"
        >
          <span aria-hidden className="block h-[2px] w-[14px] rounded-full bg-current" />
        </button>
        <button
          type="button"
          onClick={() => {
            tasbihReset();
            toast.info("Hitungan tasbih direset");
          }}
          aria-label="Reset hitungan tasbih"
          className="tap flex h-12 w-12 items-center justify-center rounded-full bg-tz-panel-soft text-tz-muted"
        >
          <RotateCcw size={17} />
        </button>
        <button
          type="button"
          onClick={() => {
            const n = commitZikirToDay(todayKey(), "harian");
            if (n === 0) toast.error("Hitungan masih 0 — berzikir dulu ya");
            else toast.success(`${n.toLocaleString("id-ID")} zikir ditambahkan ke catatan harian`);
          }}
          className="tap flex h-12 items-center justify-center gap-2 rounded-full bg-tz-ink px-5 text-[13.5px] font-bold text-white"
        >
          Simpan Harian
        </button>
        <button
          type="button"
          onClick={onOpenFull}
          aria-label="Buka tasbih layar penuh"
          className="tap flex h-12 w-12 items-center justify-center rounded-full bg-tz-panel-soft text-tz-muted"
        >
          <Expand size={16} />
        </button>
      </div>

      {/* Pemilihan target */}
      <div className="mt-5 flex items-center gap-1.5" role="group" aria-label="Target hitungan">
        {[33, 100, 500, 1000].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => tasbihSetTarget(n)}
            className={cn(
              "tap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
              tasbih.target === n ? "bg-tz-ink text-white" : "bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[10.5px] leading-relaxed text-tz-muted/80">
        Ketuk lingkaran untuk berzikir · “Simpan Harian” mencatat ke riwayat
      </p>
    </section>
  );
}

/* ================= Set zikir — daftar lipat tipografis ================= */

function ZikirSetCard({ set, onOpenTasbih }: { set: ZikirSet; onOpenTasbih: (slot: ZikirSlot) => void }) {
  const [open, setOpen] = useState(set.id === "zikir-pagi");
  return (
    <div className="glass overflow-hidden rounded-[1.5rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-tz-ink">{set.title}</span>
          <span className="block truncate text-[11.5px] text-tz-muted">{set.caption}</span>
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-tz-muted/70 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-tz-line-soft">
          <ul className="divide-y divide-tz-line-soft">
            {set.items.map((it) => (
              <li key={it.id} className="px-4 py-4">
                {it.name ? <p className="v5-overline" style={{ color: "var(--color-tz-violet)" }}>{it.name}</p> : null}
                {it.arabic ? <p className="quran-arabic mt-2.5 text-right text-[21px] leading-[1.95] text-tz-ink">{it.arabic}</p> : null}
                <p className="mt-2.5 text-[12px] font-semibold italic leading-relaxed text-tz-muted">{it.latin}</p>
                {it.meaning ? <p className="mt-1.5 text-[12px] leading-relaxed text-tz-ink/90">{it.meaning}</p> : null}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {it.count ? <Chip className="bg-tz-lavender text-tz-violet">{it.count}</Chip> : null}
                  {it.source ? <Chip>{it.source}</Chip> : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-tz-line-soft p-3.5">
            <button
              type="button"
              onClick={() => onOpenTasbih(set.slot)}
              className="tap flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-tz-lavender text-[13px] font-bold text-tz-violet"
            >
              <CircleDot size={15} /> Buka tasbih — {set.title.toLowerCase()}
            </button>
            <p className="mt-1.5 text-center text-[9.5px] text-tz-muted/80">
              Hitungan yang disimpan akan tercatat sebagai {SLOT_LABEL[set.slot].toLowerCase()}.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ================= Doa — kartu editorial ================= */

function DoaCard({ title, arabic, transliteration, meaning, source }: {
  title: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  source: string;
}) {
  return (
    <div className="glass rounded-[1.5rem] p-4">
      <p className="text-[13.5px] font-bold text-tz-ink">{title}</p>
      {arabic ? <p className="quran-arabic mt-2.5 text-right text-[20px] leading-[1.95] text-tz-ink">{arabic}</p> : null}
      {transliteration ? <p className="mt-2 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{transliteration}&rdquo;</p> : null}
      <p className="mt-1.5 text-[12px] leading-relaxed text-tz-ink/90">{meaning}</p>
      {source ? (
        <div className="mt-2.5">
          <Chip>{source}</Chip>
        </div>
      ) : null}
    </div>
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
    <div className="space-y-6">
      <SubPageHeader title="Zikir & Doa" caption="Pengingat hati — pagi, petang, dan sepanjang hari" onBack={onBack} />

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
        <div key="zikir" className="tz-fade-in lg:grid lg:grid-cols-12 lg:gap-x-8">
          <div className="space-y-9 lg:col-span-5">
            {/* Penghitung — fokus visual */}
            <TasbihCounter onOpenFull={() => onOpenTasbih("harian")} />

            {/* Riwayat zikir */}
            <section aria-label="Riwayat zikir">
              <SectionHeader title="Riwayat Zikir" caption={`${zikirSessions.length} sesi tercatat`} />
              {zikirSessions.length === 0 ? (
                <EmptyState
                  icon={<History size={18} />}
                  title="Belum ada sesi zikir"
                  caption="Berzikir lewat penghitung di atas, lalu tekan Simpan Harian — sesi akan tercatat di sini."
                />
              ) : (
                <div className="glass thin-scrollbar max-h-80 overflow-y-auto rounded-[1.5rem]">
                  <ul className="divide-y divide-tz-line-soft">
                    {zikirSessions.slice(0, 25).map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tz-lavender text-tz-violet">
                          <CircleDot size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-tz-ink">
                            {s.count.toLocaleString("id-ID")}× {s.dhikr}
                          </span>
                          <span className="block text-[10.5px] text-tz-muted">
                            {SLOT_LABEL[s.slot] ?? "Zikir"} · {relativeDayLabel(s.date, today)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* Set zikir */}
          <section aria-label="Set zikir" className="mt-9 space-y-3 lg:col-span-7 lg:mt-0">
            <SectionHeader title="Set Zikir" caption="Bacaan masyhur dengan sumber — dilipat agar ringan di layar" />
            {ZIKIR_SETS.map((set) => (
              <ZikirSetCard key={set.id} set={set} onOpenTasbih={(slot) => onOpenTasbih(slot)} />
            ))}
          </section>
        </div>
      ) : (
        <div key="doa" className="tz-fade-in lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Doa Hari Ini — blok editorial lavender */}
          <div className="lg:col-span-5">
            <SectionHeader title="Doa Hari Ini" caption={dua.title} />
            <div className="rounded-[1.75rem] bg-tz-lavender p-5">
              {dua.arabic ? <p className="quran-arabic text-right text-[22px] leading-[1.95] text-tz-ink">{dua.arabic}</p> : null}
              {dua.transliteration ? <p className="mt-3 text-[11.5px] italic leading-relaxed text-tz-muted">&ldquo;{dua.transliteration}&rdquo;</p> : null}
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-tz-ink/95">{dua.meaning}</p>
              {dua.source ? <p className="mt-3 text-[11px] font-semibold text-tz-violet">{dua.source}</p> : null}
            </div>
          </div>

          {/* Kategori + daftar doa */}
          <div className="mt-9 lg:col-span-7 lg:mt-0">
            <SectionHeader title="Kumpulan Doa" caption={DOA_KATEGORI.find((k) => k.id === cat)?.caption} />
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Kategori doa">
              {DOA_KATEGORI.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={cat === k.id}
                  onClick={() => setCat(k.id)}
                  className={cn(
                    "tap shrink-0 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all",
                    cat === k.id ? "bg-tz-ink text-white" : "bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              {doaList.length === 0 ? (
                <p className="rounded-[1.5rem] bg-tz-panel-soft px-4 py-5 text-center text-[12.5px] text-tz-muted sm:col-span-2">
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
