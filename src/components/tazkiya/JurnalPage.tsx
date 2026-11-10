"use client";

/**
 * Tazkiya v5 — "Jurnal Saya": pengalaman jurnal personal dengan EMPAT kategori.
 *
 * A. Header + banner (kartu hadis editorial existing — dipertahankan, kini
 *    diberi fade in, staggered reveal, float halus, dan parallax ringan).
 * B. Empat kategori: Refleksi Diri, Emosi & Penerimaan Diri, Syukur,
 *    Harapan & Ikhtiar — kartu dengan aksen berbeda (variasi terkontrol).
 * C. Kalender interaktif sebagai pusat riwayat (lihat JournalCalendar.tsx):
 *    indikator per kategori, ringkasan bulan, sheet detail tanggal, empty
 *    state "Mulai Menulis".
 * D. Form per kategori dengan pertanyaan panduan OPSIONAL, mood emoji
 *    (kategori Emosi), tanggal bebas (≤ hari ini), dan draf otomatis di
 *    localStorage.
 *
 * KESETIAAN DATA:
 * - Jurnal Syukur existing TIDAK diubah: struktur `journal`, saveJournal/
 *   deleteJournal, mood check-in, hadis-per-mood, riwayat + edit inline —
 *   semuanya dipindahkan utuh menjadi pengalaman kategori "Syukur".
 * - Tiga kategori baru disimpan di `journalX` (satu catatan per kategori per
 *   tanggal) dengan LWW sinkronisasi yang sama polanya (lihat store.ts).
 * - Edit selalu memperbarui catatan yang sama (upsert per kategori+tanggal),
 *   tidak ada duplikasi; hapus permanen lewat dialog konfirmasi existing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  BookHeart,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Heart,
  HeartHandshake,
  Lock,
  PenLine,
  Share2,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { MOODS, moodLabel, journalCatMeta, type JournalCat, type JournalXEntry, type MoodId } from "@/lib/tazkiya/types";
import { hadithForMood } from "@/lib/tazkiya/hadith";
import { formatDayFull, relativeDayLabel, todayKey } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, SectionHeader } from "./ui-bits";
import { SubPageHeader } from "./SubPageHeader";
import { MoodFace } from "./MoodFace";
import {
  CAT_DOT,
  CategoryPickSheet,
  DateDetailSheet,
  JournalCalendar,
  type DayNotes,
  type NoteCat,
  type SheetEntry,
} from "./JournalCalendar";
import { cn } from "@/lib/utils";

/* ---------- Navigasi internal ---------- */

type View =
  | { name: "home" }
  | { name: "syukur" }
  | { name: "form"; cat: Exclude<NoteCat, "syukur">; date: string; editDate?: string }
  | { name: "detail"; cat: NoteCat; date: string };

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

/* ---------- Draf otomatis (localStorage) ---------- */

const DRAFT_KEY = "tazkiya-jurnal-draft-v1";

interface DraftBody {
  title: string;
  text: string;
  answers: (string | undefined)[];
  mood?: MoodId;
  savedAt: string;
}

type DraftMap = Record<string, DraftBody>;

function loadDrafts(): DraftMap {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as DraftMap;
  } catch {
    return {};
  }
}

function writeDrafts(map: DraftMap): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
  } catch {
    /* kuota penuh / mode privat — draf hanya kenyamanan, boleh gagal senyap */
  }
}

/* ---------- Ikon & aksen kategori ---------- */

const CAT_META_EXT: Record<
  NoteCat,
  { label: string; short: string; desc: string; icon: typeof Compass; tint: string; ring: string }
> = {
  refleksi: {
    label: "Jurnal Refleksi Diri",
    short: "Refleksi Diri",
    desc: "Lihat kembali perjalananmu dan temukan pelajaran dari setiap pengalaman.",
    icon: Compass,
    tint: "#FF5A00",
    ring: "rgba(255,90,0,0.18)",
  },
  emosi: {
    label: "Jurnal Emosi & Penerimaan Diri",
    short: "Emosi & Penerimaan",
    desc: "Kenali perasaanmu dan beri ruang bagi dirimu untuk bertumbuh.",
    icon: HeartHandshake,
    tint: "#FFB38A",
    ring: "rgba(255,179,138,0.22)",
  },
  syukur: {
    label: "Jurnal Syukur",
    short: "Syukur",
    desc: "Catat hal-hal sederhana yang membuatmu bersyukur setiap hari.",
    icon: BookHeart,
    tint: "#E19A3C",
    ring: "rgba(225,154,60,0.2)",
  },
  harapan: {
    label: "Jurnal Harapan & Ikhtiar",
    short: "Harapan & Ikhtiar",
    desc: "Tuliskan harapan, doa, dan mulai wujudkan dengan ikhtiar terbaik.",
    icon: Sprout,
    tint: "#C2410C",
    ring: "rgba(194,65,12,0.2)",
  },
};

function timeLabelOf(e: { savedAt: string; updatedAt?: string }): string {
  const t = e.updatedAt ?? e.savedAt;
  if (!t) return "";
  const d = new Date(t);
  const edited = !!e.updatedAt;
  return `${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}${edited ? " · diedit" : ""}`;
}

/* ===================== Halaman Jurnal (orkestrator) ===================== */

export function JurnalPage({ onBack }: { onBack: () => void }) {
  const today = todayKey();
  const animationsOn = useWorshipStore((s) => s.settings.animations);
  const reduceMotion = useReducedMotion();
  const motionOK = animationsOn && !reduceMotion;

  const journal = useWorshipStore((s) => s.journal);
  const journalX = useWorshipStore((s) => s.journalX);
  const deleteJournal = useWorshipStore((s) => s.deleteJournal);
  const deleteJournalX = useWorshipStore((s) => s.deleteJournalX);

  const [view, setView] = useState<View>({ name: "home" });
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  /* Indeks catatan per tanggal untuk kalender: gabungan syukur + 3 kategori. */
  const notes: Record<string, DayNotes> = useMemo(() => {
    const out: Record<string, DayNotes> = {};
    const push = (d: string, c: NoteCat) => {
      (out[d] ??= { cats: [] }).cats.push(c);
    };
    for (const d of Object.keys(journal)) push(d, "syukur");
    for (const cat of ["refleksi", "emosi", "harapan"] as JournalCat[]) {
      for (const d of Object.keys(journalX[cat] ?? {})) push(d, cat);
    }
    for (const d of Object.keys(out)) out[d].cats.sort((a, b) => (a === b ? 0 : a === "refleksi" ? -1 : b === "refleksi" ? 1 : a === "emosi" ? -1 : b === "emosi" ? 1 : a === "syukur" ? -1 : 1));
    return out;
  }, [journal, journalX]);

  /* Entri sheet untuk tanggal terpilih (urut: refleksi → emosi → syukur → harapan). */
  const sheetEntries: SheetEntry[] = useMemo(() => {
    if (!sheetDate) return [];
    const out: SheetEntry[] = [];
    const order: NoteCat[] = ["refleksi", "emosi", "syukur", "harapan"];
    for (const cat of order) {
      if (cat === "syukur") {
        const e = journal[sheetDate];
        if (e) {
          out.push({
            cat,
            date: sheetDate,
            title: "Tiga hal yang saya syukuri",
            snippet: e.items.filter(Boolean).join(" · ").slice(0, 120) || "Jurnal syukur",
            timeLabel: timeLabelOf(e),
            mood: e.mood,
          });
        }
      } else {
        const e = journalX[cat]?.[sheetDate];
        if (e) {
          out.push({
            cat,
            date: sheetDate,
            title: e.title || journalCatMeta(cat).label,
            snippet: e.text.slice(0, 130) || "Catatan jurnal",
            timeLabel: timeLabelOf(e),
            mood: e.mood,
          });
        }
      }
    }
    return out;
  }, [sheetDate, journal, journalX]);

  const backOf = (v: View): (() => void) => {
    if (v.name === "home") return onBack;
    return () => setView({ name: "home" });
  };

  const exitSheet = () => setSheetDate(null);

  const handleRead = (e: SheetEntry) => {
    exitSheet();
    window.setTimeout(() => setView({ name: "detail", cat: e.cat, date: e.date }), 180);
  };

  const handleEdit = (e: SheetEntry) => {
    exitSheet();
    window.setTimeout(() => {
      if (e.cat === "syukur") setView({ name: "syukur" });
      else setView({ name: "form", cat: e.cat, date: e.date, editDate: e.date });
    }, 180);
  };

  const handleDelete = (e: SheetEntry) => {
    if (e.cat === "syukur") deleteJournal(e.date);
    else deleteJournalX(e.cat, e.date);
    exitSheet();
    toast.info(`Catatan ${CAT_META_EXT[e.cat].short} dihapus permanen`);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait" initial={false}>
        {view.name === "home" ? (
          <m.div
            key="home"
            initial={motionOK ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOK ? { opacity: 0, y: -10 } : { opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <SubPageHeader
              title="Jurnal Saya"
              caption="Ruang kecil untuk memahami diri, mensyukuri hari, dan terus bertumbuh."
              onBack={onBack}
            />
            <JournalBanner motionOK={motionOK} />
            <CategoryCards journal={journal} journalX={journalX} motionOK={motionOK} onOpen={(cat) => {
              if (cat === "syukur") {
                setView({ name: "syukur" });
                return;
              }
              // Sudah ada catatan kategori ini hari ini → langsung mode edit
              // (satu catatan per kategori per tanggal, tanpa duplikasi).
              const existing = journalX[cat]?.[today];
              setView({ name: "form", cat, date: today, editDate: existing ? today : undefined });
            }} />

            {/* ---------- D. Kalender riwayat ---------- */}
            <section aria-label="Kalender riwayat jurnal" className="animate-tk-fade-up">
              <SectionHeader title="Kalender Riwayat" caption="Pilih tanggal untuk membuka catatanmu" />
              <CalendarSection
                notes={notes}
                motionOK={motionOK}
                onSelect={(d) => setSheetDate(d)}
                onStartAt={(d) => setPickerDate(d)}
              />
            </section>
          </m.div>
        ) : view.name === "syukur" ? (
          <m.div
            key="syukur"
            initial={motionOK ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOK ? { opacity: 0, y: -10 } : { opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <SyukurJournal onBack={backOf(view)} />
          </m.div>
        ) : view.name === "form" ? (
          <m.div
            key={`form-${view.cat}-${view.editDate ?? view.date}`}
            initial={motionOK ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOK ? { opacity: 0, y: -10 } : { opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <JournalXForm
              cat={view.cat}
              date={view.date}
              editDate={view.editDate}
              motionOK={motionOK}
              onBack={backOf(view)}
            />
          </m.div>
        ) : (
          <m.div
            key={`detail-${view.cat}-${view.date}`}
            initial={motionOK ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOK ? { opacity: 0, y: -10 } : { opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <JournalDetail
              cat={view.cat}
              date={view.date}
              motionOK={motionOK}
              onBack={backOf(view)}
              onEdit={(cat, date) => {
                if (cat === "syukur") setView({ name: "syukur" });
                else setView({ name: "form", cat, date, editDate: date });
              }}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Sheet detail tanggal + pemilih kategori */}
      <AnimatePresence>
        {sheetDate ? (
          <DateDetailSheet
            date={sheetDate}
            entries={sheetEntries}
            motionOK={motionOK}
            onClose={exitSheet}
            onRead={handleRead}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStartWriting={() => {
              setPickerDate(sheetDate);
              exitSheet();
            }}
          />
        ) : null}
        {pickerDate ? (
          <CategoryPickSheet
            date={pickerDate}
            motionOK={motionOK}
            onClose={() => setPickerDate(null)}
            onPick={(cat) => {
              const d = pickerDate;
              setPickerDate(null);
              window.setTimeout(() => {
                if (cat === "syukur") setView({ name: "syukur" });
                else setView({ name: "form", cat, date: d });
              }, 160);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ===================== Banner (hadis editorial existing) ===================== */

function JournalBanner({ motionOK }: { motionOK: boolean }) {
  const today = todayKey();
  const moods = useWorshipStore((s) => s.moods);
  const activeMood = moods[today]?.mood;
  const hadith = useMemo(() => hadithForMood(activeMood, today, 0), [activeMood, today]);
  const { scrollY } = useScroll();
  const parY = useSpring(useTransform(scrollY, [0, 320], [0, -30]), { stiffness: 60, damping: 20 });
  const quoteY = useTransform(parY, (v) => v * 1.4);

  return (
    <section aria-label="Hadis untuk hatimu" className="animate-tk-fade-up">
      <m.div
        initial={motionOK ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassCard className={cn("overflow-hidden p-5", motionOK && "pr-float-soft")}>
          {/* Pendar dekoratif + parallax pada tanda kutip */}
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-tk-lavender/70 blur-2xl dark:bg-tk-accent/10" />
          <m.span
            aria-hidden
            style={motionOK ? { y: quoteY } : undefined}
            className="pointer-events-none absolute right-4 top-1 select-none font-display text-[52px] leading-none text-tk-lavender"
          >
            &rdquo;
          </m.span>
          <Chip className="relative border-tk-violet/25 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
            {hadith.tag}
          </Chip>
          <m.p
            initial={motionOK ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: motionOK ? 0.12 : 0 }}
            className="quran-arabic relative mt-3.5 text-right text-[21px] leading-[1.95] text-tk-ink"
          >
            {hadith.arabic}
          </m.p>
          <m.p
            initial={motionOK ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: motionOK ? 0.2 : 0 }}
            className="relative mt-3 text-[13px] leading-relaxed text-tk-ink/95"
          >
            &ldquo;{hadith.text}&rdquo;
          </m.p>
          <m.div
            initial={motionOK ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: motionOK ? 0.28 : 0 }}
            className="relative mt-3 flex flex-wrap items-center gap-1.5"
          >
            <Chip className="border-tk-violet/25 bg-tk-lavender/60 text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
              {hadith.source}
            </Chip>
            <Chip className="border-tk-line">Ruang refleksi jurnal</Chip>
            <button
              type="button"
              onClick={() => void shareQuote(`"${hadith.text}"\n(${hadith.source})`)}
              className="tap ml-auto flex h-8 items-center gap-1.5 rounded-full border border-tk-line-strong bg-tk-panel px-3 text-[10.5px] font-bold text-tk-ink"
            >
              <Share2 size={12} /> Bagikan
            </button>
          </m.div>
        </GlassCard>
      </m.div>
    </section>
  );
}

/* ===================== Kartu kategori ===================== */

function CategoryCards({
  journal,
  journalX,
  motionOK,
  onOpen,
}: {
  journal: Record<string, { items: [string, string, string] }>;
  journalX: Record<JournalCat, Record<string, JournalXEntry>>;
  motionOK: boolean;
  onOpen: (cat: NoteCat) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<NoteCat, number> = { refleksi: 0, emosi: 0, syukur: 0, harapan: 0 };
    c.syukur = Object.keys(journal).length;
    for (const cat of ["refleksi", "emosi", "harapan"] as JournalCat[]) c[cat] = Object.keys(journalX[cat] ?? {}).length;
    return c;
  }, [journal, journalX]);

  const order: NoteCat[] = ["refleksi", "emosi", "syukur", "harapan"];

  return (
    <section aria-label="Kategori jurnal" className="animate-tk-fade-up">
      <SectionHeader title="Mulai Menulis" caption="Empat ruang kecil untuk curahanmu" />
      <div className="grid grid-cols-2 gap-2.5">
        {order.map((cat, i) => {
          const meta = CAT_META_EXT[cat];
          const Icon = meta.icon;
          return (
            <m.button
              key={cat}
              type="button"
              onClick={() => onOpen(cat)}
              initial={motionOK ? { opacity: 0, y: 18, scale: 0.96 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22, delay: motionOK ? i * 0.07 : 0 }}
              whileTap={motionOK ? { y: -4, scale: 1.02 } : undefined}
              className="tap group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-tk-line bg-tk-panel p-4 text-left light:shadow-[0_12px_28px_-20px_rgba(23,23,26,0.3)] dark:shadow-[0_12px_28px_-20px_rgba(12,6,2,0.75)]"
            >
              {/* Aksen lembut berbeda per kartu (variasi terkontrol) */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-xl"
                style={{ background: meta.ring }}
              />
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[0.7rem]"
                style={{ background: `${meta.tint}1A`, color: meta.tint }}
              >
                <Icon size={16} strokeWidth={2.1} />
              </span>
              <span className="mt-2.5 font-display text-[13px] font-bold leading-tight tracking-[-0.01em] text-tk-ink">
                {meta.short}
              </span>
              <span className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-tk-muted">{meta.desc}</span>
              <span className="mt-2.5 flex items-center justify-between border-t border-tk-line-soft pt-2">
                <span className="tnum text-[9.5px] font-semibold text-tk-muted">{counts[cat]} catatan</span>
                <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: meta.tint }}>
                  <PenLine size={10.5} /> Tulis
                </span>
              </span>
            </m.button>
          );
        })}
      </div>
    </section>
  );
}

/* ===================== Bagian kalender ===================== */

function CalendarSection({
  notes,
  motionOK,
  onSelect,
  onStartAt,
}: {
  notes: Record<string, DayNotes>;
  motionOK: boolean;
  onSelect: (d: string) => void;
  onStartAt: (d: string) => void;
}) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const shift = (dir: -1 | 1) => {
    setCursor((c) => {
      const dt = new Date(c.y, c.m + dir, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });
    setSelected(null);
  };

  const goToday = () => {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
    onSelect(today);
  };

  return (
    <div className="space-y-3">
      <JournalCalendar
        year={cursor.y}
        month={cursor.m}
        notes={notes}
        selected={selected}
        motionOK={motionOK}
        onShift={shift}
        onToday={goToday}
        onSelect={(d) => {
          setSelected(d);
          onSelect(d);
        }}
      />
      <p className="text-center text-[10px] text-tk-muted/70">
        Ketuk tanggal untuk membuka catatan — indikator titik menandai hari yang punya cerita.
      </p>
    </div>
  );
}

/* ===================== Form kategori (refleksi/emosi/harapan) ===================== */

function JournalXForm({
  cat,
  date,
  editDate,
  motionOK,
  onBack,
}: {
  cat: Exclude<NoteCat, "syukur">;
  date: string;
  /** Tanggal entri yang sedang diedit (mode edit bila terisi). */
  editDate?: string;
  motionOK: boolean;
  onBack: () => void;
}) {
  const meta = journalCatMeta(cat);
  const ext = CAT_META_EXT[cat];
  const Icon = ext.icon;
  const saveJournalX = useWorshipStore((s) => s.saveJournalX);
  const existingEntry = useWorshipStore((s) => (editDate ? s.journalX[cat]?.[editDate] : undefined));

  const isEdit = !!editDate;
  const [dateVal, setDateVal] = useState(isEdit ? editDate : date);
  const [title, setTitle] = useState(existingEntry?.title ?? "");
  const [text, setText] = useState(existingEntry?.text ?? "");
  const [answers, setAnswers] = useState<(string | undefined)[]>(existingEntry?.answers ?? meta.questions.map(() => undefined));
  const [mood, setMood] = useState<MoodId | undefined>(existingEntry?.mood);
  const [guideOpen, setGuideOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [draftTick, setDraftTick] = useState(0);
  const restoredRef = useRef(false);

  /* Lanjutkan draf (hanya mode tulis baru; mode edit memuat entri asli). */
  useEffect(() => {
    if (isEdit || restoredRef.current) return;
    restoredRef.current = true;
    const d = loadDrafts()[`${cat}:${dateVal}`];
    if (d) {
      setTitle(d.title);
      setText(d.text);
      setAnswers(d.answers ?? meta.questions.map(() => undefined));
      setMood(d.mood);
      toast.info("Draf sebelumnya dilanjutkan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Draf tersimpan otomatis (debounce ringan) — hanya untuk tulisan baru. */
  useEffect(() => {
    if (isEdit || justSaved) return;
    const t = window.setTimeout(() => {
      const hasAny = title.trim() || text.trim() || answers.some((a) => a?.trim()) || mood;
      const map = loadDrafts();
      const key = `${cat}:${dateVal}`;
      if (hasAny) {
        map[key] = { title, text, answers, mood, savedAt: new Date().toISOString() };
        writeDrafts(map);
        setDraftTick((n) => n + 1);
      } else if (map[key]) {
        delete map[key];
        writeDrafts(map);
      }
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, text, answers, mood, dateVal, isEdit]);

  const todayStr = todayKey();
  const filled = text.trim().length > 0 || title.trim().length > 0 || answers.some((a) => a?.trim());
  /* Mode tulis baru: tanggal tujuan TIDAK boleh sudah punya catatan kategori
     ini (mencegah penimpaan/duplikasi). Mode edit: tanggal dikunci. */
  const targetHasEntry = !isEdit && !!useWorshipStore.getState().journalX[cat]?.[dateVal];

  const save = () => {
    if (!filled) {
      toast.error("Tulis sesuatu dulu ya — sedikit pun berarti");
      return;
    }
    if (targetHasEntry) {
      toast.error(`Sudah ada catatan ${ext.short} di tanggal itu. Buka lewat kalender untuk mengeditnya.`);
      return;
    }
    saveJournalX(cat, {
      date: dateVal,
      title: title.trim() || `${meta.label} — ${formatDayFull(dateVal)}`,
      text: text.trim(),
      answers: answers.some((a) => a?.trim()) ? answers : undefined,
      mood,
    });
    // Bersihkan draf tanggal terkait (juga draf tanggal lama bila tanggal diubah)
    const map = loadDrafts();
    delete map[`${cat}:${dateVal}`];
    delete map[`${cat}:${date}`];
    writeDrafts(map);
    setJustSaved(true);
    window.setTimeout(() => {
      toast.success(isEdit ? "Perubahan tersimpan" : `${ext.short} tersimpan`);
      onBack();
    }, 650);
  };

  const answeredCount = answers.filter((a) => a?.trim()).length;

  return (
    <div className="space-y-6">
      <SubPageHeader
        title={isEdit ? `Edit ${ext.short}` : ext.label}
        caption={ext.desc}
        onBack={onBack}
        action={
          <span className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem]" style={{ background: `${ext.tint}1A`, color: ext.tint }}>
              <Icon size={14} />
            </span>
          </span>
        }
      />

      <GlassCard className="p-5 sm:p-6">
        {/* Judul + tanggal */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="gs-overline mb-1.5 block">Judul jurnal</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder={`Contoh: ${meta.short} — hari yang mengajarkan…`}
              aria-label="Judul jurnal"
              className="tk-field w-full py-3 text-[13.5px] font-semibold"
            />
          </label>
          <label className="block">
            <span className="gs-overline mb-1.5 block">Tanggal</span>
            <input
              type="date"
              value={dateVal}
              max={todayStr}
              disabled={isEdit}
              onChange={(e) => setDateVal(e.target.value || dateVal)}
              aria-label="Tanggal jurnal"
              className={cn("tk-field w-full py-3 text-[13px] tnum sm:w-[150px]", isEdit && "opacity-60")}
            />
          </label>
        </div>

        {/* Mood — khusus kategori Emosi (emoji mood existing SUIO) */}
        {cat === "emosi" ? (
          <div className="mt-4 rounded-[1.1rem] border border-tk-line bg-tk-panel-soft p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold text-tk-ink">Bagaimana perasaanmu hari ini?</p>
              <span className="text-[10px] font-semibold text-tk-muted">{mood ? moodLabel(mood) : "Opsional"}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MOODS.map((mo) => {
                const active = mood === mo.id;
                return (
                  <button
                    key={mo.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Mood ${mo.label}`}
                    onClick={() => setMood(active ? undefined : mo.id)}
                    className={cn(
                      "tap rounded-[25%] p-0.5 transition-[box-shadow] duration-200",
                      active
                        ? "ring-2 ring-tk-accent light:shadow-[0_8px_16px_-8px_rgba(255,90,0,0.45)] dark:shadow-[0_8px_18px_-10px_rgba(255,90,0,0.4)]"
                        : "light:ring-1 light:ring-[#2a2320]/[0.08] dark:ring-1 dark:ring-white/[0.06]"
                    )}
                  >
                    <MoodFace id={mo.id} className="h-9 w-9" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Isi bebas */}
        <label className="mt-4 block">
          <span className="gs-overline mb-1.5 block">Tulisanmu</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Tulis dengan bebas — cerita, pikiran, atau curahan hatimu…"
            aria-label="Isi jurnal"
            className="tk-field w-full resize-none py-3 text-[13.5px] leading-[1.85]"
          />
        </label>

        {/* Pertanyaan panduan — opsional, bisa dilipat */}
        <div className="mt-3.5 overflow-hidden rounded-[1.1rem] border border-tk-line">
          <button
            type="button"
            aria-expanded={guideOpen}
            onClick={() => setGuideOpen((v) => !v)}
            className="tap flex w-full items-center justify-between gap-2 bg-tk-panel-soft px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-bold text-tk-ink">
              <Sparkles size={13} style={{ color: ext.tint }} />
              Pertanyaan panduan
              {answeredCount > 0 ? (
                <span className="tnum rounded-full px-2 py-0.5 text-[9.5px] font-bold" style={{ background: `${ext.tint}1A`, color: ext.tint }}>
                  {answeredCount}/{meta.questions.length}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-tk-muted">opsional</span>
              )}
            </span>
            <m.span animate={{ rotate: motionOK ? (guideOpen ? 180 : 0) : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown size={15} className="text-tk-muted" />
            </m.span>
          </button>
          <AnimatePresence initial={false}>
            {guideOpen ? (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 px-4 py-3.5">
                  <p className="text-[10.5px] leading-relaxed text-tk-muted">
                    Semua pertanyaan boleh dilewati — jawab hanya yang terasa penting. Jawabanmu tersimpan bersama tulisanmu.
                  </p>
                  {meta.questions.map((q, i) => (
                    <div key={i}>
                      <p className="mb-1 text-[11px] font-bold leading-snug text-tk-ink/90">
                        {i + 1}. {q}
                      </p>
                      <textarea
                        value={answers[i] ?? ""}
                        rows={2}
                        onChange={(e) => {
                          const next = [...answers];
                          next[i] = e.target.value || undefined;
                          setAnswers(next);
                        }}
                        aria-label={`Jawaban: ${q}`}
                        className="tk-field w-full resize-none py-2.5 text-[12px] leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Simpan */}
        <button
          type="button"
          onClick={save}
          disabled={!filled || justSaved}
          className={cn(
            "tap gs-ink-btn mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full font-display text-[14.5px] font-bold transition-all",
            (!filled || justSaved) && "cursor-not-allowed opacity-40"
          )}
        >
          {justSaved ? <Check size={16} /> : <PenLine size={15} />}
          {justSaved ? "Tersimpan" : isEdit ? "Simpan Perubahan" : "Simpan Jurnal"}
        </button>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-tk-muted/80">
          <Lock size={10} />
          {isEdit
            ? "Perubahan memperbarui catatan yang sama — tidak membuat salinan."
            : draftTick >= 0
              ? "Draf tersimpan otomatis di perangkat ini."
              : "Privat, hanya kamu yang bisa membacanya."}
        </p>
      </GlassCard>
    </div>
  );
}

/* ===================== Detail baca ===================== */

function JournalDetail({
  cat,
  date,
  motionOK,
  onBack,
  onEdit,
}: {
  cat: NoteCat;
  date: string;
  motionOK: boolean;
  onBack: () => void;
  onEdit: (cat: NoteCat, date: string) => void;
}) {
  const journal = useWorshipStore((s) => s.journal);
  const journalX = useWorshipStore((s) => s.journalX);
  const deleteJournal = useWorshipStore((s) => s.deleteJournal);
  const deleteJournalX = useWorshipStore((s) => s.deleteJournalX);
  const ext = CAT_META_EXT[cat];

  const isSyukur = cat === "syukur";
  const syukur = journal[date];
  const entry: JournalXEntry | undefined = isSyukur ? undefined : journalX[cat as Exclude<NoteCat, "syukur">]?.[date];

  if (isSyukur ? !syukur : !entry) {
    return (
      <div className="space-y-6">
        <SubPageHeader title={ext.label} onBack={onBack} />
        <EmptyState icon={<CalendarDays size={18} />} title="Catatan tidak ditemukan" caption="Mungkin sudah dihapus. Buka kalender untuk memilih tanggal lain." />
      </div>
    );
  }

  const title = isSyukur ? "Tiga hal yang saya syukuri" : entry!.title || ext.label;
  const created = isSyukur ? syukur!.savedAt : entry!.savedAt;
  const updated = isSyukur ? syukur!.updatedAt : entry!.updatedAt;
  const mood = isSyukur ? syukur!.mood : entry!.mood;

  const remove = () => {
    if (isSyukur) deleteJournal(date);
    else deleteJournalX(cat as Exclude<NoteCat, "syukur">, date);
    toast.info(`Catatan ${ext.short} dihapus permanen`);
    onBack();
  };

  return (
    <div className="space-y-6">
      <SubPageHeader
        title={ext.label}
        caption={formatDayFull(date)}
        onBack={onBack}
        action={
          <ConfirmButton
            label={`Hapus catatan ${ext.short} ${formatDayFull(date)}`}
            title={`Hapus catatan ini?`}
            description={`Catatan ${ext.short} tanggal ${formatDayFull(date)} akan dihapus permanen.`}
            onConfirm={remove}
            className="tap flex h-9 w-9 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
          >
            <Trash2 size={14} />
          </ConfirmButton>
        }
      />

      <m.article
        initial={motionOK ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassCard className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.06em]"
              style={{ background: `${ext.tint}1A`, color: ext.tint }}
            >
              <span className="block h-[6px] w-[6px] rounded-full" style={{ background: ext.tint }} aria-hidden />
              {ext.short}
            </span>
            <Chip className="border-tk-line tnum">{formatDayFull(date)}</Chip>
            <Chip className="border-tk-line tnum">{timeLabelOf({ savedAt: created, updatedAt: updated })}</Chip>
            {mood ? (
              <span aria-label={`Mood ${moodLabel(mood)}`} className="inline-flex h-7 w-7 items-center justify-center">
                <MoodFace id={mood} className="h-6 w-6" />
              </span>
            ) : null}
          </div>

          <h2 className="pr-serif mt-3.5 text-[24px] font-semibold leading-[1.25] tracking-[-0.01em] text-tk-ink">{title}</h2>

          {/* Isi: tipografi nyaman dibaca */}
          {isSyukur ? (
            <ul className="mt-4 space-y-3">
              {syukur!.items.filter(Boolean).map((it, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-[1rem] border border-tk-line bg-tk-panel-soft p-3.5">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-tk-lavender text-[11px] font-bold text-tk-violet dark:bg-tk-accent/15 dark:text-tk-accent">
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] leading-[1.8] text-tk-ink/95">{it}</span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.9] text-tk-ink/95">{entry!.text}</p>
              {entry!.answers?.some((a) => a?.trim()) ? (
                <div className="mt-5 space-y-3 border-t border-tk-line-soft pt-4">
                  <p className="gs-overline">Pertanyaan panduan</p>
                  {journalCatMeta(cat as Exclude<NoteCat, "syukur">).questions.map((q, i) => {
                    const a = entry!.answers?.[i];
                    if (!a?.trim()) return null;
                    return (
                      <div key={i} className="rounded-[1rem] border border-tk-line bg-tk-panel-soft p-3.5">
                        <p className="text-[11px] font-bold leading-snug text-tk-ink/90">{q}</p>
                        <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-[1.8] text-tk-ink/90">{a}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(cat, date)}
              className="tap gs-ink-btn flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-bold"
            >
              <PenLine size={14} /> {isSyukur ? "Edit di Jurnal Syukur" : "Edit Catatan"}
            </button>
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-tk-muted/80">
            <Lock size={10} /> Teks aslimu tidak pernah diubah saat diedit — kamu yang mengubahnya.
          </p>
        </GlassCard>
      </m.article>
    </div>
  );
}

/* ===================== Jurnal Syukur (pengalaman existing, utuh) ===================== */

function SyukurJournal({ onBack }: { onBack: () => void }) {
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
                              ? "ring-2 ring-tk-accent ring-offset-2 ring-offset-tk-panel light:shadow-[0_10px_22px_-8px_rgba(255,90,0,0.45)] dark:shadow-[0_10px_24px_-10px_rgba(217,75,10,0.45)]"
                              : "light:shadow-[0_6px_14px_-6px_rgba(119,113,109,0.42)] light:ring-1 light:ring-[#2a2320]/[0.06] dark:shadow-[0_10px_22px_-12px_rgba(12,6,2,0.6)] dark:ring-1 dark:ring-[#F5E8DC]/[0.07]"
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
