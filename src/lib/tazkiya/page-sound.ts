/**
 * Tazkiya — Efek suara balik halaman mushaf.
 * Suara "swish" kertas DISINTESIS dengan Web Audio (noise + bandpass sweep +
 * envelope dua gelombang) — tanpa berkas audio eksternal: ringan, bebas
 * lisensi, dan tetap berfungsi penuh saat offline.
 * - AudioContext dibuat malas HANYA saat dipanggil dari gestur pengguna
 *   (kebijakan autoplay browser seluler aman).
 * - Hanya ada satu sumber bunyi aktif; suara baru menghentikan yang lama
 *   sehingga tidak menumpuk.
 * - Kegagalan apa pun (API tak tersedia / diblokir) diabaikan diam-diam:
 *   animasi halaman tetap berjalan normal.
 */

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let rendering: Promise<AudioBuffer | null> | null = null;
let current: AudioBufferSourceNode | null = null;

type AudioCtor = new () => AudioContext;
type OfflineCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext;

function ensureContext(): AudioContext | null {
  try {
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Render sekali saja: noise → bandpass sweep 500→2600→700 Hz + envelope. */
function getBuffer(c: AudioContext): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer);
  if (rendering) return rendering;
  rendering = (async () => {
    try {
      const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor };
      const OAC = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
      if (!OAC) return null;
      const sr = c.sampleRate;
      const dur = 0.34;
      const oc = new OAC(1, Math.ceil(dur * sr), sr);
      const nb = oc.createBuffer(1, Math.ceil(dur * sr), sr);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const noise = oc.createBufferSource();
      noise.buffer = nb;
      const bp = oc.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.85;
      const t = oc.currentTime;
      bp.frequency.setValueAtTime(480, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.15);
      bp.frequency.exponentialRampToValueAtTime(720, t + dur);
      const g = oc.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.85, t + 0.06); // lembar terangkat
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.19); // lembar jatuh
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      noise.connect(bp);
      bp.connect(g);
      g.connect(oc.destination);
      noise.start(t);
      noise.stop(t + dur);
      const rendered = await oc.startRendering();
      buffer = rendered;
      return rendered;
    } catch {
      return null;
    } finally {
      rendering = null;
    }
  })();
  return rendering;
}

/**
 * Mainkan suara balik halaman sekali. Dipanggil HANYA setelah pengguna
 * berhasil membalik halaman (gestur/tombol) — tidak pernah otomatis.
 */
export function playPageFlip(volume = 0.22): void {
  try {
    const c = ensureContext();
    if (!c) return;
    void getBuffer(c).then((buf) => {
      if (!buf || !ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      // Hentikan suara sebelumnya agar tidak bertumpuk.
      if (current) {
        try {
          current.stop();
        } catch {
          /* sudah berhenti */
        }
        try {
          current.disconnect();
        } catch {
          /* abaikan */
        }
        current = null;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0.05, Math.min(0.5, volume));
      src.connect(gain);
      gain.connect(ctx.destination);
      src.onended = () => {
        try {
          src.disconnect();
          gain.disconnect();
        } catch {
          /* abaikan */
        }
        if (current === src) current = null;
      };
      current = src;
      src.start();
    });
  } catch {
    /* audio gagal — animasi tetap jalan */
  }
}
