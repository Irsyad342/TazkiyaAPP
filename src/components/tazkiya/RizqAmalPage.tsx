"use client";

/**
 * Tazkiya — Rizq & Amal (halaman tersendiri dari menu Lainnya).
 * Target kebaikan harian (default + pribadi), catatan amal/sedekah,
 * riwayat kegiatan kebaikan, dan ringkasan mingguan.
 * Prinsip: tanpa penilaian keimanan, tanpa kompetisi, tanpa perhitungan
 * keuangan — nilai kebaikan tidak diukur dari jumlah uang.
 */

import { useMemo, useState } from "react";
import { Check, HandCoins, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useWorshipStore } from "@/lib/tazkiya/store";
import { AMAL_KINDS, amalKindLabel, type AmalKind } from "@/lib/tazkiya/types";
import { DEFAULT_AMAL_GOALS } from "@/lib/tazkiya/types";
import { formatDayFull, lastNDays, relativeDayLabel, todayKey, weekdayShort } from "@/lib/tazkiya/dates";
import { Chip, ConfirmButton, EmptyState, GlassCard, ProgressBar, SectionHeader } from "./ui-bits";
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
              className="tap flex shrink-0 items-center gap-1 rounded-full border border-tz-violet/25 bg-tz-violet/10 px-2.5 py-1 text-[10.5px] font-semibold text-tz-accent"
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
                className="tap rounded-full border border-tz-violet/30 bg-tz-violet/10 px-3 py-1.5 text-[11.5px] font-semibold text-tz-accent transition-all hover:bg-tz-violet/18"
              >
                + {g.label}
              </button>
            ))}
          </div>

          {managing ? (
            <div className="tz-fade-in mt-3 space-y-2.5 rounded-xl border border-tz-line bg-tz-panel-soft p-3">
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
                        className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
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
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-tz-purple to-tz-violet text-white"
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
        <GlassCard className="space-y-3 p-4">
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
                      ? "border-tz-violet/60 bg-tz-violet text-white shadow-[0_4px_14px_-6px_rgba(85,51,154,0.9)]"
                      : "border-tz-line bg-tz-panel-soft text-tz-muted hover:text-tz-accent"
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
            className="tap flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-tz-purple to-tz-violet text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(85,51,154,0.9)]"
          >
            <Check size={16} strokeWidth={3} /> Simpan Catatan
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
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-tz-line bg-tz-panel-soft px-3 py-2.5">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-tz-violet/25 bg-tz-violet/12 text-[14px]">
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
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </ConfirmButton>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Ringkasan mingguan ---------- */}
      <section aria-label="Ringkasan mingguan" className="animate-tz-fade-up">
        <SectionHeader title="Ringkasan Mingguan" caption="7 hari terakhir — tanpa menghakimi hari yang kosong" />
        <GlassCard className="p-4">
          <div className="flex items-end justify-between gap-2" aria-hidden>
            {weekCounts.map((c, i) => (
              <div key={week[i]} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[9.5px] font-semibold tabular-nums text-tz-muted/80">{c > 0 ? c : ""}</span>
                <div className="flex h-20 w-full items-end">
                  <div
                    className="tz-bar-grow-x mx-auto w-full max-w-[22px] rounded-full bg-gradient-to-t from-tz-purple to-tz-violet"
                    style={{ height: `${Math.max(c > 0 ? 10 : 2, (c / maxDay) * 100)}%`, opacity: c > 0 ? 1 : 0.35 }}
                  />
                </div>
                <span className={cn("text-[9.5px]", week[i] === today ? "font-bold text-tz-accent" : "text-tz-muted")}>
                  {weekdayShort(week[i])}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-tz-ink">
            <Sparkles size={13} className="text-tz-violet" />
            {weekTotal > 0 ? `${weekTotal} kebaikan dalam 7 hari terakhir` : "Belum ada catatan minggu ini — buka jalan dengan satu kebaikan kecil"}
          </p>
        </GlassCard>
      </section>

      {/* ---------- Riwayat ---------- */}
      <section aria-label="Riwayat amal" className="animate-tz-fade-up">
        <SectionHeader title="Riwayat Kebaikan" caption={`${amalEntries.length} catatan tersimpan`} />
        {amalEntries.length === 0 ? (
          <EmptyState icon={<HandCoins size={18} />} title="Riwayat masih kosong" caption="Catatan amal akan muncul di sini." />
        ) : (
          <GlassCard className="thin-scrollbar max-h-96 overflow-y-auto">
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
                    className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tz-muted/70 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </section>

      <p className="pb-1 text-center text-[10px] leading-relaxed text-tz-muted/60">
        Rizq &amp; Amal membantu membangun kebiasaan — bukan kompetisi, bukan pengukuran keimanan. {formatDayFull(today)}.
      </p>
    </div>
  );
}
