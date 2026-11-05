"use client";

/**
 * Tazkiya v4 — Rizq & Amal sebagai personal habit tracker beraksen hijau.
 * Komposisi baru: ringkasan angka-besar + bar mingguan hijau dalam satu kartu
 * hero, chip target kebaikan, formulir catat amal dengan tombol tinta, daftar
 * hari ini & riwayat. Prinsip tetap: tanpa penilaian keimanan, tanpa
 * kompetisi, tanpa perhitungan keuangan.
 */

import { useMemo, useState } from "react";
import { Check, HandCoins, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { AMAL_KINDS, amalKindLabel, type AmalKind } from "@/lib/tazkiya/types";
import { DEFAULT_AMAL_GOALS } from "@/lib/tazkiya/types";
import { formatDayFull, lastNDays, relativeDayLabel, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, SectionHeader } from "./ui-bits";
import { SubPageHeader } from "./SubPageHeader";
import { cn } from "@/lib/utils";

const inputCls = "tz-field";

export function RizqAmalPage({ onBack }: { onBack: () => void }) {
  const today = todayKey();
  const amalEntries = useWorshipStore((s) => s.amalEntries);
  const amalGoals = useWorshipStore((s) => s.amalGoals);
  const addAmalEntry = useWorshipStore((s) => s.addAmalEntry);
  const deleteAmalEntry = useWorshipStore((s) => s.deleteAmalEntry);
  const addAmalGoal = useWorshipStore((s) => s.addAmalGoal);
  const deleteAmalGoal = useWorshipStore((s) => s.deleteAmalGoal);

  const [kind, setKind] = useState<AmalKind>("sedekah");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [managing, setManaging] = useState(false);

  const todayEntries = useMemo(() => amalEntries.filter((e) => e.date === today), [amalEntries, today]);

  const week = useMemo(() => lastNDays(7, today), [today]);
  const weekCounts = useMemo(() => week.map((k) => amalEntries.filter((e) => e.date === k).length), [week, amalEntries]);
  const weekTotal = weekCounts.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(1, ...weekCounts);

  const defaultIds = new Set(DEFAULT_AMAL_GOALS.map((g) => g.id));

  const submit = () => {
    if (!title.trim()) {
      toast.error("Tuliskan kebaikan yang ingin dicatat");
      return;
    }
    addAmalEntry(today, kind, title, note);
    setTitle("");
    setNote("");
    toast.success("Amal tercatat — sekecil apa pun, itu berarti");
  };

  return (
    <div className="space-y-6">
      <SubPageHeader title="Rizq & Amal" caption="Membangun kebiasaan baik dan mencatat amal harian" onBack={onBack} />

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
        <div className="space-y-6 lg:col-span-7">
          {/* ---------- Hero tracker: angka besar + bar mingguan ---------- */}
          <section aria-label="Ringkasan kebaikan" className="animate-tz-fade-up">
            <GlassCard className="p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tz-muted">Kebaikan hari ini</p>
                  <p className="tnum mt-1 font-display text-[46px] font-bold leading-none tracking-[-0.03em] text-tz-ink">
                    {todayEntries.length}
                    <span className="text-[16px] font-semibold text-tz-muted"> catatan</span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-tz-green">
                    <Sparkles size={13} />
                    {weekTotal > 0 ? `${weekTotal} kebaikan dalam 7 hari terakhir` : "Buka jalan dengan satu kebaikan kecil"}
                  </p>
                </div>
                <span aria-hidden className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-tz-green-soft">
                  <svg viewBox="0 0 32 32" className="h-9 w-9" fill="none">
                    <path d="M16 27V15" stroke="#5FBF7A" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="11" cy="12" r="5" fill="#5FBF7A" opacity="0.85" />
                    <circle cx="21.5" cy="9.5" r="3.6" fill="#A8D9B4" />
                    <circle cx="16" cy="27" r="2" fill="#5FBF7A" />
                  </svg>
                </span>
              </div>

              {/* Bar 7 hari */}
              <div className="mt-5 flex items-end justify-between gap-2 border-t border-tz-line pt-4" aria-hidden>
                {weekCounts.map((c, i) => (
                  <div key={week[i]} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="tnum text-[9.5px] font-bold text-tz-muted/80">{c > 0 ? c : ""}</span>
                    <div className="flex h-16 w-full items-end">
                      <div
                        className={cn("tz-bar-grow-x mx-auto w-full max-w-[24px] rounded-full", week[i] === today ? "bg-tz-lime" : "bg-tz-green")}
                        style={{ height: `${Math.max(c > 0 ? 10 : 3, (c / maxDay) * 100)}%`, opacity: c > 0 ? 1 : 0.3 }}
                      />
                    </div>
                    <span className={cn("text-[9.5px]", week[i] === today ? "font-bold text-tz-ink" : "text-tz-muted")}>
                      {weekdayShort(week[i])}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          {/* ---------- Target kebaikan ---------- */}
          <section aria-label="Target kebaikan harian" className="animate-tz-fade-up">
            <SectionHeader
              title="Target Kebaikan"
              caption="Pilih salah satu untuk dicatat cepat — bisa diatur sesuai preferensimu"
              action={
                <button
                  type="button"
                  aria-expanded={managing}
                  onClick={() => setManaging((v) => !v)}
                  className="tap flex shrink-0 items-center gap-1 rounded-full border border-tz-line-strong bg-tz-panel px-2.5 py-1 text-[10.5px] font-semibold text-tz-ink"
                >
                  {managing ? <X size={12} /> : null} {managing ? "Selesai" : "Atur"}
                </button>
              }
            />
            <GlassCard className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {amalGoals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const matched = AMAL_KINDS.find((k) => k.label.toLowerCase() === g.label.toLowerCase());
                      setKind(matched?.id ?? "lainnya");
                      setTitle(g.label);
                      toast.info(`Menulis catatan: ${g.label}`);
                    }}
                    className="tap rounded-full border border-tz-green/30 bg-tz-green-soft px-3 py-1.5 text-[11.5px] font-semibold text-tz-green transition-all hover:border-tz-green/60"
                  >
                    + {g.label}
                  </button>
                ))}
              </div>

              {managing ? (
                <div className="tz-fade-in mt-3 space-y-2.5 rounded-2xl bg-tz-panel-soft p-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted">Kelola target (hapus hanya di mode ini)</p>
                  <ul className="space-y-1.5">
                    {amalGoals.map((g) => (
                      <li key={g.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12px] text-tz-ink">{g.label}</span>
                        {!defaultIds.has(g.id) ? (
                          <ConfirmButton
                            label={`Hapus target ${g.label}`}
                            title={`Hapus target "${g.label}"?`}
                            description="Target kebaikan pribadi ini akan dihapus dari daftar. Catatan amal yang sudah ada tidak terpengaruh."
                            onConfirm={() => deleteAmalGoal(g.id)}
                            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
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
                      value={goalDraft}
                      maxLength={60}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      placeholder="Target kebaikan pribadi…"
                      aria-label="Target kebaikan pribadi baru"
                      className="tz-field flex-1 py-2 text-[12px]"
                    />
                    <button
                      type="button"
                      aria-label="Tambah target pribadi"
                      onClick={() => {
                        if (!goalDraft.trim()) return;
                        addAmalGoal(goalDraft);
                        setGoalDraft("");
                        toast.success("Target pribadi ditambahkan");
                      }}
                      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tz-ink text-tz-lime"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </section>

          {/* ---------- Catat amal ---------- */}
          <section aria-label="Catat amal kebaikan" className="animate-tz-fade-up">
            <SectionHeader title="Catat Amal Hari Ini" caption="Sedekah, bantuan, silaturahmi — semua sama berharganya" />
            <GlassCard className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wide text-tz-muted/90">Jenis kebaikan</p>
                <div className="flex flex-wrap gap-1.5">
                  {AMAL_KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      aria-pressed={kind === k.id}
                      onClick={() => setKind(k.id)}
                      className={cn(
                        "tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all",
                        kind === k.id
                          ? "border-tz-ink bg-tz-ink text-white"
                          : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-ink"
                      )}
                    >
                      {k.emoji} {k.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Apa kebaikan yang kamu lakukan hari ini?"
                aria-label="Keterangan amal"
                className={inputCls}
              />
              <textarea
                value={note}
                maxLength={240}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                aria-label="Catatan tambahan (opsional)"
                className={cn(inputCls, "resize-none")}
              />
              <button
                type="button"
                onClick={submit}
                className="tap flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-tz-ink font-display text-[14px] font-bold text-white"
              >
                <Check size={16} strokeWidth={3} className="text-tz-lime" /> Simpan Catatan
              </button>
              <p className="text-[10px] leading-relaxed text-tz-muted/80">
                Tidak ada penilaian atas jumlah atau nilai — setiap kebaikan dicatat setara, untuk kesadaranmu sendiri.
              </p>
            </GlassCard>
          </section>

          {/* ---------- Hari ini ---------- */}
          <section aria-label="Amal hari ini" className="animate-tz-fade-up">
            <SectionHeader title="Hari Ini" caption={`${todayEntries.length} kebaikan tercatat`} />
            {todayEntries.length === 0 ? (
              <EmptyState
                icon={<HandCoins size={18} />}
                title="Belum ada catatan hari ini"
                caption="Satu kebaikan kecil — menyapa, membantu, sedekah — sudah layak dicatat."
              />
            ) : (
              <div className="space-y-2">
                {todayEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-[1.1rem] border border-tz-line bg-tz-panel px-3 py-2.5">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tz-green-soft text-[14px]">
                      {AMAL_KINDS.find((k) => k.id === e.kind)?.emoji ?? "✨"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-tz-ink">{e.title}</span>
                      <span className="block text-[10.5px] text-tz-muted">
                        {amalKindLabel(e.kind)}
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                    </span>
                    <ConfirmButton
                      label="Hapus catatan amal"
                      title="Hapus catatan amal ini?"
                      description="Catatan kebaikan hari ini akan dihapus dari riwayat."
                      onConfirm={() => {
                        deleteAmalEntry(e.id);
                        toast.info("Catatan dihapus");
                      }}
                      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---------- Riwayat ---------- */}
        <section aria-label="Riwayat amal" className="animate-tz-fade-up mt-6 lg:col-span-5 lg:mt-0">
          <SectionHeader title="Riwayat Kebaikan" caption={`${amalEntries.length} catatan tersimpan`} />
          {amalEntries.length === 0 ? (
            <EmptyState icon={<HandCoins size={18} />} title="Riwayat masih kosong" caption="Catatan amal akan muncul di sini." />
          ) : (
            <GlassCard className="thin-scrollbar max-h-[36rem] overflow-y-auto">
              <ul className="divide-y divide-tz-line-soft">
                {amalEntries.slice(0, 30).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span aria-hidden className="text-[14px]">
                      {AMAL_KINDS.find((k) => k.id === e.kind)?.emoji ?? "✨"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-tz-ink/90">{e.title}</span>
                      <span className="block text-[10px] text-tz-muted">
                        {relativeDayLabel(e.date, today)} · {amalKindLabel(e.kind)}
                      </span>
                    </span>
                    <ConfirmButton
                      label="Hapus catatan"
                      title="Hapus catatan amal ini?"
                      description="Catatan kebaikan ini akan dihapus dari riwayat."
                      onConfirm={() => {
                        deleteAmalEntry(e.id);
                        toast.info("Catatan dihapus");
                      }}
                      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-[#E5484D]/10 hover:text-[#E5484D]"
                    >
                      <Trash2 size={13} />
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
          <p className="mt-4 text-center text-[10px] leading-relaxed text-tz-muted/60">
            Rizq &amp; Amal membantu membangun kebiasaan — bukan kompetisi, bukan pengukuran keimanan. {formatDayFull(today)}.
          </p>
        </section>
      </div>
    </div>
  );
}
