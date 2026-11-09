"use client";

/**
 * Tazkiya v7 — Beranda DIBANGUN ULANG mengikuti komposisi layar tengah
 * referensi task-planner premium, bukan menyusun ulang desain v6:
 * A. Header personal: avatar kiri, sapaan + nama di TENGAH, tombol lonceng
 *    bulat kanan (sheet pengingat salat — data nyata).
 * B. Bar pencarian kapsul: sheet pencarian nyata (aktivitas, surah, jurnal).
 * C. "Jadwal Anda" + dropdown bulan: pil tanggal BULAT pekan ini (hari ini
 *    ORANGE, hari ber-catatan titik hijau) — ketuk hari → DayDetailSheet;
 *    chevron bulan → kalender bulan nyata.
 * D. Trio kartu referensi: kartu PUTIH (periksa salat lima waktu) + kartu
 *    cincin gelap di bawahnya, dan kartu ORANGE (ibadah pendukung).
 * E. "Tugas Hari Ini": kartu abu terang dengan tombol cek gelap — logika
 *    target harian utuh (toggle, target otomatis, editor).
 * F. Mood check-in, Jelajahi aktivitas, Doa hari ini, Daily Barakah.
 * Semua logika data (store, jadwal salat, target) tidak berubah.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import type { PrayerId } from "@/lib/tazkiya/types";
import { formatGregorian, formatHijri, formatDayFull, todayKey } from "@/lib/tazkiya/dates";
import { resolvePrayerSchedule } from "@/lib/tazkiya/prayerTimes";
import { formatCountdown, goalStatuses, nextPrayerState } from "@/lib/tazkiya/goals";
import { notifyPermission, requestNotifyPermission } from "@/lib/tazkiya/reminder-trigger";
import { SURAH_LIST } from "@/lib/tazkiya/quran";
import { barakahOfTheDay } from "@/lib/tazkiya/barakah";
import { duaOfTheDay } from "@/lib/tazkiya/duas";
import { ConfirmButton } from "./ui-bits";
import { MoodSection } from "./MoodSection";
import { JelajahiAktivitas } from "./JelajahiAktivitas";
import { DayDetailSheet } from "./DayDetailSheet";
import { OrnamentDivider } from "./ornaments";
import type { SubPageId, TabId } from "./BottomNav";
import { cn } from "@/lib/utils";

const PRAYER_ORDER: { id: PrayerId; label: string }[] = [
  { id: "subuh", label: "Subuh" },
  { id: "zuhur", label: "Zuhur" },
  { id: "asar", label: "Asar" },
  { id: "magrib", label: "Magrib" },
  { id: "isya", label: "Isya" },
];

const DOW_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Tanggal & jam hari ini (YYYY-MM-DD lokal); diperbarui tiap 30 detik / saat tab aktif. */
function useToday(): string {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const update = () => {
      const key = todayKey();
      setToday((prev) => (prev === key ? prev : key));
    };
    const interval = window.setInterval(update, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  return today;
}

/* ---------------- C. Pil tanggal BULAT — gaya referensi ---------------- */

function CircleDateStrip({ today }: { today: string }) {
  const logs = useWorshipStore((s) => s.logs);
  const [selected, setSelected] = useState<string | null>(null);

  /** Senin-minggu pekan ini (kronologis). */
  const week = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // Senin = 0
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = Object.values(logs[key]?.prayers ?? {}).filter(Boolean).length;
      return { key, dayNum: d.getDate(), label: DOW_LABELS[i], count, isToday: key === today, isFuture: key > today };
    });
  }, [logs, today]);

  return (
    <section aria-label="Pilih tanggal pekan ini" className="animate-tk-fade-up">
      <div className="no-scrollbar flex items-stretch justify-between gap-1 overflow-x-auto" role="group">
        {week.map(({ key, dayNum, label, count, isToday, isFuture }) => (
          <button
            key={key}
            type="button"
            disabled={isFuture}
            aria-label={`${isToday ? "Hari ini" : "Tanggal"} ${key}${count > 0 ? `, ${count} salat tercatat` : ""}`}
            aria-pressed={isToday}
            onClick={() => !isFuture && setSelected(key)}
            className={cn(
              "tap flex aspect-square w-full max-w-[52px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
              isToday ? "bg-tk-violet" : "bg-tk-panel",
              isFuture ? "opacity-40" : "cursor-pointer"
            )}
          >
            <span className={cn("gs-display text-[17px] font-bold leading-none", isToday ? "text-white" : "text-tk-ink")}>
              {dayNum}
            </span>
            <span className={cn("text-[9.5px] font-medium leading-none", isToday ? "text-white/85" : "text-tk-muted")}>
              {label}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-[4px] w-[4px] rounded-full",
                isToday ? "bg-white/90" : count > 0 ? "bg-tk-green" : "bg-transparent"
              )}
            />
          </button>
        ))}
      </div>
      {selected ? <DayDetailSheet date={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

/* ---------------- Sheet dasar (pola bottom sheet DayDetailSheet) ---------------- */

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="glass-strong fixed! top-auto bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 translate-y-0 gap-3 overflow-y-auto rounded-t-[1.75rem] rounded-b-none border-x-0 border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_-12px_rgba(15,15,20,0.55)] duration-250 thin-scrollbar data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8"
      >
        <span aria-hidden className="mx-auto mb-0.5 block h-1 w-10 shrink-0 rounded-full bg-tk-line-strong/70" />
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-tk-ink">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- A. Sheet lonceng — pengingat salat (data nyata) ---------------- */

/** Baris saklar kecil untuk preferensi pengingat (pola saklar Tugas Hari Ini). */
function ReminderToggle({
  title,
  caption,
  checked,
  onChange,
  ariaLabel,
}: {
  title: string;
  caption: string;
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-tk-ink">{title}</span>
        <span className="mt-0.5 block text-[10.5px] leading-snug text-tk-muted">{caption}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        className={cn("tap relative h-5.5 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-tk-violet" : "bg-tk-track")}
      >
        <span
          aria-hidden
          className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-all", checked ? "left-[22px]" : "left-0.5")}
        />
      </button>
    </div>
  );
}

function ReminderSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const updateSettings = useWorshipStore((s) => s.updateSettings);

  const times = useMemo(() => resolvePrayerSchedule(settings, today), [settings, today]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const state = nextPrayerState(times, now);
  const nextLabel = PRAYER_ORDER.find((p) => p.id === state.next)?.label ?? state.next;

  return (
    <BottomSheet title="Pengingat Ibadah" onClose={onClose}>
      <div className="glass-hero rounded-[1.4rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Sholat Berikutnya</p>
          <span className="rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-bold text-white">
            {formatCountdown(state.secondsLeft)} lagi
          </span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <p className="gs-display text-[44px] font-bold leading-[0.9] text-white">{state.nextTime}</p>
          <p className="pb-1 text-[15px] font-bold text-white">
            {nextLabel}
            {state.tomorrow ? <span className="text-[11px] font-semibold text-white/75"> · besok</span> : null}
          </p>
        </div>
      </div>

      <ul className="mt-1">
        {PRAYER_ORDER.map(({ id, label }) => {
          const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
          const missed = prayerDetails[today]?.[id]?.status === "missed";
          return (
            <li key={id} className="flex items-center justify-between gap-3 border-b border-tk-line-soft py-2.5 last:border-0">
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 rounded-full",
                    done ? "bg-tk-green" : missed ? "bg-tk-rose" : "bg-tk-line-strong"
                  )}
                />
                <span className={cn("text-[13.5px]", done ? "font-semibold text-tk-ink" : "font-medium text-tk-ink/85")}>
                  {label}
                </span>
              </span>
              <span className={cn("tnum text-[12.5px] font-semibold", done ? "text-tk-green" : missed ? "text-tk-rose" : "text-tk-muted")}>
                {times[id].time}
                {done ? " · selesai" : missed ? " · terlewat" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Preferensi pengingat: layar penuh + notifikasi latar (izin sistem) */}
      <div className="mt-1 rounded-2xl bg-tk-panel-soft">
        <ReminderToggle
          title="Pengingat layar penuh"
          caption="Saat masuk waktu salat, tampilkan layar pengingat penuh di Beranda — sekali per waktunya."
          checked={settings.fullscreenReminder !== false}
          onChange={() => updateSettings({ fullscreenReminder: settings.fullscreenReminder === false })}
          ariaLabel="Aktifkan atau matikan pengingat layar penuh"
        />
        <div className="mx-3 border-t border-tk-line-soft" />
        <ReminderToggle
          title="Notifikasi saat di latar"
          caption="Pemberitahuan sistem ketika aplikasi tersembunyi. Memerlukan izin notifikasi perangkat."
          checked={settings.reminderNotify === true && notifyPermission() === "granted"}
          onChange={async () => {
            if (settings.reminderNotify === true) {
              updateSettings({ reminderNotify: false });
              return;
            }
            const result = await requestNotifyPermission();
            if (result === "granted") {
              updateSettings({ reminderNotify: true });
              toast.success("Notifikasi pengingat salat diaktifkan");
            } else if (result === "unsupported") {
              toast.info("Perangkat ini tidak mendukung notifikasi aplikasi web");
            } else {
              toast.info("Izin notifikasi belum diberikan — aktifkan di pengaturan peramban");
            }
          }}
          ariaLabel="Aktifkan atau matikan notifikasi pengingat saat aplikasi di latar"
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="tap mt-2 min-h-[42px] w-full rounded-full bg-tk-panel-strong px-4 text-sm font-bold text-tk-ink"
      >
        Tutup
      </button>
    </BottomSheet>
  );
}

/* ---------------- B. Sheet pencarian nyata: aktivitas, surah, jurnal ---------------- */

function SearchSheet({
  onClose,
  onNavigate,
  onOpenSubpage,
}: {
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const journal = useWorshipStore((s) => s.journal);
  const [q, setQ] = useState("");

  const activities: { label: string; sub: string; go: () => void }[] = useMemo(
    () => [
      { label: "Catat Salat", sub: "Halaman Sholat", go: () => onNavigate("sholat") },
      { label: "Baca Al-Qur'an", sub: "Halaman Al-Qur'an", go: () => onNavigate("quran") },
      { label: "Jurnal Syukur", sub: "Refleksi", go: () => onOpenSubpage("jurnal") },
      { label: "Zikir & Doa", sub: "Refleksi", go: () => onOpenSubpage("zikir-doa") },
      { label: "Tasbih Digital", sub: "Zikir & Doa", go: () => onOpenSubpage("zikir-doa") },
      { label: "Rizq & Amal", sub: "Refleksi", go: () => onOpenSubpage("rizq-amal") },
      { label: "Analitik Ibadah", sub: "Halaman Progress", go: () => onNavigate("progress") },
    ],
    [onNavigate, onOpenSubpage]
  );

  const needle = q.trim().toLowerCase();
  const acts = needle ? activities.filter((a) => a.label.toLowerCase().includes(needle)) : activities.slice(0, 4);
  const surahs = needle
    ? SURAH_LIST.filter(
        (s) => s.latin.toLowerCase().includes(needle) || String(s.number) === needle || s.meaning.toLowerCase().includes(needle)
      ).slice(0, 6)
    : [];
  const journals = needle
    ? Object.entries(journal)
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .filter(([, entry]) => entry.items.some((it) => it && it.toLowerCase().includes(needle)))
        .slice(0, 4)
    : [];
  const empty = needle && acts.length === 0 && surahs.length === 0 && journals.length === 0;

  const go = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <BottomSheet title="Cari" onClose={onClose}>
      <div className="flex items-center gap-2.5 rounded-full bg-tk-panel-strong px-4 py-3">
        <Search size={16} className="shrink-0 text-tk-muted" />
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari surah, aktivitas, catatan jurnal…"
          aria-label="Kata kunci pencarian"
          className="w-full bg-transparent text-[13.5px] text-tk-ink outline-none placeholder:text-tk-deep"
        />
      </div>

      <div className="tk-fade-in mt-2 max-h-[46vh] space-y-4 overflow-y-auto thin-scrollbar" role="list">
        {empty ? (
          <p className="rounded-2xl bg-tk-panel-soft p-4 text-center text-[12px] text-tk-muted">
            Tidak ada hasil untuk &ldquo;{q.trim()}&rdquo;. Coba kata lain.
          </p>
        ) : null}

        {acts.length > 0 ? (
          <section>
            <p className="gs-overline mb-1.5 px-1">Aktivitas</p>
            <ul>
              {acts.map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => go(a.go)}
                    className="tap flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-tk-panel-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-tk-ink">{a.label}</span>
                      <span className="block text-[10.5px] text-tk-muted">{a.sub}</span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-tk-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {surahs.length > 0 ? (
          <section>
            <p className="gs-overline mb-1.5 px-1">Surah Al-Qur&apos;an</p>
            <ul>
              {surahs.map((s) => (
                <li key={s.number}>
                  <button
                    type="button"
                    onClick={() => go(() => onNavigate("quran"))}
                    className="tap flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-tk-panel-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-tk-ink">
                        {s.number}. {s.latin}
                      </span>
                      <span className="block text-[10.5px] text-tk-muted">
                        {s.meaning} · {s.verses} ayat · {s.place}
                      </span>
                    </span>
                    <span className="quran-arabic shrink-0 text-[16px] text-tk-ink/85">{s.arabic}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {journals.length > 0 ? (
          <section>
            <p className="gs-overline mb-1.5 px-1">Catatan Jurnal</p>
            <ul>
              {journals.map(([date, entry]) => {
                const hit = entry.items.find((it) => it && it.toLowerCase().includes(needle)) ?? "";
                return (
                  <li key={date}>
                    <button
                      type="button"
                      onClick={() => go(() => onOpenSubpage("jurnal"))}
                      className="tap flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-tk-panel-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-tk-ink">{hit}</span>
                        <span className="block text-[10.5px] text-tk-muted">{formatDayFull(date)}</span>
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-tk-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/* ---------------- C. Sheet kalender bulan (dropdown "Juni ⌄") ---------------- */

function MonthSheet({
  today,
  onClose,
  onPickDay,
}: {
  today: string;
  onClose: () => void;
  onPickDay: (date: string) => void;
}) {
  const logs = useWorshipStore((s) => s.logs);
  const moods = useWorshipStore((s) => s.moods);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Senin = 0
    const arr: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(`${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return arr;
  }, [ym]);

  const shift = (delta: number) =>
    setYm(({ y, m }) => {
      const nm = m + delta;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });

  return (
    <BottomSheet title={`${MONTH_LABELS[ym.m]} ${ym.y}`} onClose={onClose}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => shift(-1)}
          className="tap flex h-9 w-9 items-center justify-center rounded-full bg-tk-panel-strong text-tk-ink"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-[13.5px] font-bold text-tk-ink">
          {MONTH_LABELS[ym.m]} {ym.y}
        </p>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => shift(1)}
          className="tap flex h-9 w-9 items-center justify-center rounded-full bg-tk-panel-strong text-tk-ink"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={`Kalender ${MONTH_LABELS[ym.m]} ${ym.y}`}>
        {DOW_LABELS.map((d) => (
          <span key={d} className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-tk-deep">
            {d}
          </span>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`pad-${i}`} aria-hidden />;
          const dayNum = Number(key.slice(-2));
          const isFuture = key > today;
          const isToday = key === today;
          const recorded =
            (!!logs[key] &&
              (Object.values(logs[key].prayers).some(Boolean) ||
                logs[key].quranPages > 0 ||
                logs[key].zikirCount > 0)) ||
            !!moods[key];
          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              aria-label={`Tanggal ${key}${recorded ? ", ada catatan" : ""}`}
              onClick={() => {
                onClose();
                onPickDay(key);
              }}
              className={cn(
                "tap mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-[12.5px] transition-colors",
                isToday ? "bg-tk-violet font-bold text-white" : "font-medium text-tk-ink/90",
                isFuture ? "opacity-35" : "cursor-pointer hover:bg-tk-panel-strong",
                recorded && !isToday && "bg-tk-panel-strong"
              )}
            >
              {dayNum}
              <span aria-hidden className={cn("h-[3px] w-[3px] rounded-full", recorded ? "bg-tk-green" : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10.5px] text-tk-deep">Titik hijau = ada catatan ibadah · ketuk tanggal untuk rincian</p>
    </BottomSheet>
  );
}

/* ---------------- D1. Kartu PUTIH — periksa salat lima waktu ---------------- */

function SalatCheckCard({ today, onNavigate }: { today: string; onNavigate: (tab: TabId) => void }) {
  const settings = useWorshipStore((s) => s.settings);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);

  const times = useMemo(() => resolvePrayerSchedule(settings, today), [settings, today]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(iv);
  }, []);
  const state = nextPrayerState(times, now);
  const nextLabel = PRAYER_ORDER.find((p) => p.id === state.next)?.label ?? state.next;

  return (
    <button
      type="button"
      onClick={() => onNavigate("sholat")}
      aria-label="Salat lima waktu, buka halaman Sholat"
      className="tap tk-card-white block w-full rounded-[1.4rem] p-4 text-left"
    >
      <p className="text-[13.5px] font-bold tracking-[-0.01em] text-[#17171B]">Salat Lima Waktu</p>
      <ul className="mt-2.5 space-y-2" role="group" aria-label="Status salat hari ini">
        {PRAYER_ORDER.map(({ id, label }) => {
          const done = prayerDetails[today]?.[id]?.status === "done" || logs[today]?.prayers?.[id];
          const missed = prayerDetails[today]?.[id]?.status === "missed";
          return (
            <li key={id} className="flex items-center gap-2.5">
              {/* Radio bulat gaya kartu putih referensi */}
              <span
                aria-hidden
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  done ? "border-[#17171B] bg-[#17171B]" : missed ? "border-[#FA5200]" : "border-[#D6D6DA]"
                )}
              >
                {done ? <Check size={10} strokeWidth={3.2} className="text-white" /> : null}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-[12px]", done ? "font-semibold text-[#17171B]" : "font-medium text-[#55555C]")}>
                {label}
                {missed ? " · terlewat" : ""}
              </span>
              <span className="tnum shrink-0 text-[10px] font-semibold text-[#9A9AA1]">{times[id].time}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-1 border-t border-[#ECECEE] pt-2.5 text-[10.5px] font-semibold text-[#8A8A91]">
        <Bell size={10} className="shrink-0" />
        Berikutnya · {nextLabel} {state.nextTime}
      </p>
    </button>
  );
}

/* ---------------- D2. Kartu cincin gelap — ringkasan target ---------------- */

function RingCard({ today, onNavigate }: { today: string; onNavigate: (tab: TabId) => void }) {
  const dailyGoals = useWorshipStore((s) => s.dailyGoals);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const goalDone = useWorshipStore((s) => s.goalDone);

  const statuses = useMemo(
    () =>
      goalStatuses(dailyGoals, today, {
        logs,
        prayerDetails,
        zikirSessions,
        amalEntries,
        goalDone,
        subuhOntime: null,
      }),
    [dailyGoals, today, logs, prayerDetails, zikirSessions, amalEntries, goalDone]
  );
  const done = statuses.filter((g) => g.done).length;
  const pct = statuses.length > 0 ? Math.round((done / statuses.length) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onNavigate("progress")}
      aria-label={`Target harian ${done} dari ${statuses.length} selesai, buka analitik`}
      className="tap glass block w-full rounded-[1.4rem] p-4 text-left"
    >
      <div className="flex items-center gap-3.5">
        <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: 64, height: 64 }}>
          <svg width={64} height={64} className="-rotate-90">
            <circle cx={32} cy={32} r={27} fill="none" strokeWidth={6} className="stroke-tk-line-strong" />
            <circle
              cx={32}
              cy={32}
              r={27}
              fill="none"
              strokeWidth={6}
              strokeLinecap="round"
              className="stroke-tk-violet"
              strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * 2 * Math.PI * 27} ${2 * Math.PI * 27}`}
              style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <span className="gs-display absolute inset-0 flex items-center justify-center text-[15px] font-bold text-tk-ink">{pct}%</span>
        </div>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold text-tk-ink">Target Harian</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-tk-muted">
            <span className="tnum font-bold text-tk-ink">
              {done}/{statuses.length}
            </span>{" "}
            selesai hari ini
          </span>        </span>
      </div>
    </button>
  );
}

/* ---------------- D3. Kartu ORANGE — ibadah pendukung ---------------- */

function KebaikanCard({
  today,
  onNavigate,
  onOpenSubpage,
}: {
  today: string;
  onNavigate: (tab: TabId) => void;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const log = useWorshipStore((s) => s.logs[today]);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const journal = useWorshipStore((s) => s.journal);

  const quran = log?.quranPages ?? 0;
  const zikir = log?.zikirCount ?? 0;
  const amal = amalEntries.filter((a) => a.date === today).length;
  const jurnal = journal[today]?.items.filter(Boolean).length ?? 0;

  const rows = [
    {
      label: "Al-Qur'an",
      value: `${quran}/${settings.quranDailyTarget} hlm`,
      caption: `Target ${settings.quranDailyTarget} halaman setiap hari`,
      done: quran >= settings.quranDailyTarget && settings.quranDailyTarget > 0,
      go: () => onNavigate("quran"),
    },
    {
      label: "Zikir & Doa",
      value: zikir.toLocaleString("id-ID"),
      caption: `Zikir harian, target ${settings.zikirTarget.toLocaleString("id-ID")} hitungan`,
      done: zikir >= settings.zikirTarget && settings.zikirTarget > 0,
      go: () => onOpenSubpage("zikir-doa"),
    },
    {
      label: "Amal",
      value: `${amal} amal`,
      caption: "Sedekah, bantu sesama, kebaikan kecil",
      done: amal > 0,
      go: () => onOpenSubpage("rizq-amal"),
    },
    {
      label: "Jurnal",
      value: jurnal > 0 ? `${jurnal} syukur` : "kosong",
      caption: "Tuliskan rasa syukur dan renungan hari ini",
      done: jurnal > 0,
      go: () => onOpenSubpage("jurnal"),
    },
  ];

  const doneCount = rows.filter((r) => r.done).length;
  const insight =
    doneCount === rows.length
      ? "Semua ibadah pendukung tercatat, luar biasa hari ini."
      : doneCount === 0
        ? "Mulai dari yang paling ringan, satu kebaikan pun berharga."
        : `${doneCount} dari ${rows.length} sudah tercatat, lanjutkan yang lain.`;

  return (
    <section aria-label="Ibadah pendukung hari ini" className="glass-hero flex h-full flex-col rounded-[1.4rem] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="whitespace-nowrap text-[12.5px] font-bold tracking-[-0.01em] text-white">Kebaikan Hari Ini</p>
        <span className="tnum shrink-0 rounded-full bg-white/18 px-2 py-0.5 text-[9px] font-bold text-white">
          {doneCount}/{rows.length}
        </span>
      </div>
      <ul className="mt-1 flex-1 divide-y divide-white/12" role="group">
        {rows.map(({ label, value, caption, done, go }) => (
          <li key={label}>
            <button
              type="button"
              onClick={go}
              aria-label={`${label}: ${value}, ${caption}. Ketuk untuk mencatat.`}
              className="tap flex w-full items-center gap-2.5 py-2.5 text-left"
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/45",
                  done && "border-white bg-white"
                )}
              >
                {done ? <Check size={10} strokeWidth={3.2} className="text-tk-violet" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-bold text-white">{label}</span>
                  <span className="tnum shrink-0 whitespace-nowrap text-[10px] font-bold text-white/90">{value}</span>
                </span>
                <span className="mt-px block truncate text-[10px] leading-snug text-white/70">{caption}</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-white/55" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 border-t border-white/20 pt-2.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-medium leading-snug text-white/90">
          <Sparkles size={11} className="shrink-0" aria-hidden />
          {insight}
        </p>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate("progress")}
            aria-label="Lihat perkembangan ibadah di halaman Progress"
            className="tap flex shrink-0 items-center gap-0.5 rounded-full bg-white/16 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-white/25"
          >
            Lihat perkembangan
            <ChevronRight size={11} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- E. Tugas Hari Ini — kartu abu terang gaya referensi ---------------- */

function TodayTasks({ today }: { today: string }) {
  const dailyGoals = useWorshipStore((s) => s.dailyGoals);
  const logs = useWorshipStore((s) => s.logs);
  const prayerDetails = useWorshipStore((s) => s.prayerDetails);
  const zikirSessions = useWorshipStore((s) => s.zikirSessions);
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const goalDone = useWorshipStore((s) => s.goalDone);
  const toggleGoalDone = useWorshipStore((s) => s.toggleGoalDone);
  const toggleDailyGoalEnabled = useWorshipStore((s) => s.toggleDailyGoalEnabled);
  const addDailyGoal = useWorshipStore((s) => s.addDailyGoal);
  const deleteDailyGoal = useWorshipStore((s) => s.deleteDailyGoal);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const statuses = useMemo(
    () =>
      goalStatuses(dailyGoals, today, {
        logs,
        prayerDetails,
        zikirSessions,
        amalEntries,
        goalDone,
        subuhOntime: null,
      }),
    [dailyGoals, today, logs, prayerDetails, zikirSessions, amalEntries, goalDone]
  );

  const doneCount = statuses.filter((s) => s.done).length;
  const visible = expanded ? statuses : statuses.slice(0, 3);

  return (
    <section aria-label="Tugas hari ini" className="animate-tk-fade-up">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Tugas Hari Ini</h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="tap flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-tk-accent"
        >
          {expanded ? "Tutup" : "Lihat semua"} {!expanded ? <ChevronRight size={14} /> : null}
        </button>
      </div>

      <ul className="space-y-2.5" role="group" aria-label="Daftar tugas harian">
        {visible.map(({ goal, done, auto }) => (
          <li
            key={goal.id}
            className={cn(
              "tk-card-light flex items-center gap-3 rounded-[1.15rem] px-4 py-3.5",
              done && "opacity-80"
            )}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={`Tugas: ${goal.label}, ${done ? "tercapai" : "belum tercapai"}`}
              onClick={() => {
                // Target otomatis yang sudah tercapai dari catatan nyata tidak
                // bisa "dibatalkan" lewat ketukan — beri penjelasan, jangan
                // biarkan tombol terasa mati.
                if (goal.auto && done) {
                  toast.info("Tugas ini tercapai otomatis dari catatan ibadahmu hari ini");
                  return;
                }
                toggleGoalDone(today, goal.id);
                if (!done && goal.auto === "amal-hari-ini") {
                  toast.success("MasyaAllah, satu kebaikan tercatat hari ini");
                }
              }}
              className={cn(
                "tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                done ? "bg-[#17171B] text-white" : "bg-[#17171B]/8 text-transparent hover:bg-[#17171B]/14"
              )}
            >
              <Check size={14} strokeWidth={3} />
            </button>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-[13px] leading-snug", done ? "font-semibold text-[#17171B] line-through opacity-60" : "font-semibold text-[#17171B]")}>
                {goal.label}
              </span>
              <span className={cn("mt-0.5 block text-[10.5px] font-medium", auto ? "text-[#8A8A91]" : "text-[#A4A4AA]")}>
                {auto ? "Otomatis dari catatan ibadahmu" : "Tugas pribadi"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {/* Editor target, logika utuh dari v6 */}
      {editing ? (
        <div className="tk-fade-in mt-3 space-y-2.5 rounded-[1.25rem] border border-tk-line bg-tk-panel-soft p-3.5">
          <p className="gs-overline">Atur tugas harian</p>
          <ul className="space-y-1">
            {dailyGoals.map((g) => (
              <li key={g.id} className="flex items-center gap-2.5 py-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={g.enabled}
                  onClick={() => toggleDailyGoalEnabled(g.id)}
                  className={cn("tap relative h-5 w-9 shrink-0 rounded-full transition-colors", g.enabled ? "bg-tk-violet" : "bg-tk-track")}
                  aria-label={`${g.enabled ? "Matikan" : "Aktifkan"} tugas ${g.label}`}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                      g.enabled ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
                <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", g.enabled ? "text-tk-ink" : "text-tk-muted line-through")}>
                  {g.label}
                </span>
                {g.custom ? (
                  <ConfirmButton
                    label={`Hapus tugas ${g.label}`}
                    title={`Hapus tugas "${g.label}"?`}
                    description="Tugas pribadi ini akan dihapus dari daftar. Catatan ibadah yang sudah ada tidak terpengaruh."
                    onConfirm={() => deleteDailyGoal(g.id)}
                    className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tk-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                  >
                    <Trash2 size={13} />
                  </ConfirmButton>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  addDailyGoal(draft);
                  setDraft("");
                }
              }}
              placeholder="Tambah tugas pribadi…"
              aria-label="Tambah tugas pribadi"
              className="tk-field flex-1 py-2 text-[12.5px]"
            />
            <button
              type="button"
              aria-label="Simpan tugas baru"
              onClick={() => {
                if (!draft.trim()) return;
                addDailyGoal(draft);
                setDraft("");
                toast.success("Tugas pribadi ditambahkan");
              }}
              className="tap gs-ink-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-relaxed text-tk-deep">
          {doneCount === statuses.length && statuses.length > 0
            ? "MasyaAllah, semua tugas hari ini tercapai, syukur itu dari Allah."
            : `Progress hari ini ${doneCount}/${statuses.length}, satu langkah kecil sudah berarti.`}
        </p>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          className="tap flex shrink-0 items-center gap-1 rounded-full bg-tk-panel px-3 py-1.5 text-[11px] font-bold text-tk-ink"
        >
          <Settings2 size={12} /> Atur
        </button>
      </div>
    </section>
  );
}

/* ---------------- F. Doa hari ini + Daily Barakah — compact ---------------- */

function DoaCompact() {
  const dua = duaOfTheDay(todayKey());
  return (
    <section aria-label="Doa hari ini" className="animate-tk-fade-up glass rounded-[1.4rem] p-4.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tk-accent">Doa Hari Ini</p>
      {dua.title ? <p className="mt-2 text-[14.5px] font-bold tracking-[-0.01em] text-tk-ink">{dua.title}</p> : null}
      {dua.arabic ? <p className="quran-arabic mt-3 text-right text-[22px] leading-[2] text-tk-ink">{dua.arabic}</p> : null}
      {dua.transliteration ? (
        <p className="mt-2.5 text-[12px] italic leading-relaxed text-tk-muted">&ldquo;{dua.transliteration}&rdquo;</p>
      ) : null}
      <p className="mt-2 text-[13px] leading-relaxed text-tk-ink/90">{dua.meaning}</p>
      {dua.source ? <p className="mt-3 text-[10.5px] font-semibold text-tk-accent">{dua.source}</p> : null}
    </section>
  );
}

function DailyBarakah() {
  const today = todayKey();
  const b = barakahOfTheDay(today);
  const rows = [
    { label: "Niat hari ini", text: b.niat },
    { label: "Setelah Subuh", text: b.subuh },
    { label: "Motivasi", text: b.motivasi },
    { label: "Target kecil", text: b.target },
  ];
  return (
    <section aria-label="Daily Barakah" className="animate-tk-fade-up relative">
      <div className="relative mb-1 flex items-end justify-between gap-3 px-0.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Daily Barakah</h2>
          <span aria-hidden className="quran-arabic text-[14px] leading-none text-tk-accent/85">
            بركة
          </span>
        </div>
      </div>
      <ol className="relative">
        {rows.map(({ label, text }, i) => (
          <li key={label} className={cn("flex items-start gap-4 py-3.5", i > 0 && "border-t border-tk-line-soft")}>
            {/* Chip nomor khatam: lapisan bintang luar + dalam = tepi rambut */}
            <span aria-hidden className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <span className="tk-octagram absolute inset-0 bg-tk-lav-deco" />
              <span className="tk-octagram absolute inset-[1.5px] bg-tk-lavender" />
              <span className="gs-display relative text-[11.5px] font-bold text-tk-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-tk-accent">{label}</span>
              <span className="mt-1.5 block text-[13.5px] leading-relaxed text-tk-ink/90">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <OrnamentDivider className="relative mt-1.5" />
    </section>
  );
}

/* ---------------- Beranda ---------------- */

export function HomePage({
  onNavigate,
  onOpenSubpage,
}: {
  onNavigate: (tab: TabId) => void;
  onOpenSubpage: (sub: SubPageId) => void;
}) {
  const settings = useWorshipStore((s) => s.settings);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) return "Selamat pagi";
    if (h >= 11 && h < 15) return "Selamat siang";
    if (h >= 15 && h < 18) return "Selamat sore";
    return "Selamat malam";
  })();

  const today = useToday();
  const now = new Date();
  const hijri = formatHijri(now);

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
      {/* ---------- A. Header: avatar / sapaan + nama / lonceng ---------- */}
      <header className="animate-tk-fade-up pt-1 lg:col-span-12">
        <div className="grid grid-cols-[52px_1fr_44px] items-center gap-3">
          <button type="button" aria-label="Buka profil" onClick={() => onNavigate("profil")} className="tap relative shrink-0">
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={`Foto profil ${settings.name}`}
                className="h-[52px] w-[52px] rounded-full object-cover ring-2 ring-tk-line-strong"
              />
            ) : (
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-tk-panel-strong text-[18px] font-bold text-tk-ink ring-2 ring-tk-line-strong">
                {settings.name.trim().charAt(0).toUpperCase() || "T"}
              </span>
            )}
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[12px] font-medium text-tk-muted">
              Assalamu&apos;alaikum, {greeting.toLowerCase()}
            </p>
            <h1 className="truncate text-[19px] font-bold leading-tight tracking-[-0.02em] text-tk-ink">
              {settings.name || "Sahabat SUIO"}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Buka pengingat ibadah"
            onClick={() => setReminderOpen(true)}
            className="tap flex h-[44px] w-[44px] items-center justify-center justify-self-end rounded-full bg-tk-panel-strong text-tk-ink"
          >
            <Bell size={19} strokeWidth={1.9} className="animate-tk-bell-swing" />
          </button>
        </div>
        <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium text-tk-muted">
          <span>{formatGregorian(now)}</span>
          {hijri ? (
            <>
              <span aria-hidden className="text-tk-line-strong">·</span>
              <span className="font-semibold text-tk-accent">{hijri}</span>
            </>
          ) : null}
        </p>
      </header>

      {/* ---------- B. Bar pencarian ---------- */}
      <div className="mt-4 lg:col-span-12">
        <button
          type="button"
          aria-label="Buka pencarian"
          onClick={() => setSearchOpen(true)}
          className="tap flex w-full items-center gap-3 rounded-full bg-tk-panel-strong px-4.5 py-3.5 text-left"
        >
          <Search size={17} className="shrink-0 text-tk-muted" />
          <span className="text-[13.5px] text-tk-deep">Cari surah, aktivitas, catatan…</span>
        </button>
      </div>

      {/* ---------- C. Jadwal Anda + dropdown bulan + pil bulat ---------- */}
      <div className="mt-6 lg:col-span-12">
        <div className="mb-3.5 flex items-center justify-between gap-3 px-0.5">
          <h2 className="text-[16.5px] font-bold tracking-[-0.015em] text-tk-ink">Jadwal Anda</h2>
          <button
            type="button"
            aria-label="Buka kalender bulan"
            aria-expanded={monthOpen}
            onClick={() => setMonthOpen(true)}
            className="tap flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-tk-ink"
          >
            {MONTH_LABELS[now.getMonth()]} <ChevronDown size={14} className="text-tk-muted" />
          </button>
        </div>
        <CircleDateStrip today={today} />
      </div>

      {/* ---------- D. Trio kartu: putih+cincin | orange ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:col-span-12">
        <div className="flex flex-col gap-3">
          <SalatCheckCard today={today} onNavigate={onNavigate} />
          <RingCard today={today} onNavigate={onNavigate} />
        </div>
        <KebaikanCard today={today} onNavigate={onNavigate} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- E. Tugas Hari Ini ---------- */}
      <div className="mt-8 lg:col-span-12">
        <TodayTasks today={today} />
      </div>

      {/* ---------- F. Mood check-in ---------- */}
      <div className="mt-8 lg:col-span-12">
        <MoodSection today={today} onOpenSubpage={onOpenSubpage} />
      </div>

      {/* ---------- G. Jelajahi aktivitas ---------- */}
      <div className="mt-8 lg:col-span-12">
        <JelajahiAktivitas today={today} onOpen={onOpenSubpage} />
      </div>

      {/* ---------- H. Doa hari ini ---------- */}
      <div className="mt-8 lg:col-span-12">
        <DoaCompact />
      </div>

      {/* ---------- I. Daily Barakah ---------- */}
      <div className="mt-8 lg:col-span-12">
        <DailyBarakah />
      </div>

      {/* ---------- Sheets ---------- */}
      {reminderOpen ? <ReminderSheet today={today} onClose={() => setReminderOpen(false)} /> : null}
      {searchOpen ? (
        <SearchSheet onClose={() => setSearchOpen(false)} onNavigate={onNavigate} onOpenSubpage={onOpenSubpage} />
      ) : null}
      {monthOpen ? (
        <MonthSheet
          today={today}
          onClose={() => setMonthOpen(false)}
          onPickDay={(key) => setPickedDay(key)}
        />
      ) : null}
      {pickedDay ? <DayDetailSheet date={pickedDay} onClose={() => setPickedDay(null)} /> : null}
    </div>
  );
}
