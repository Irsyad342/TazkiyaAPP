/* Ukur beban main-thread onboarding: rAF frame-time + longtask, 3.5 detik.
   Mulai: eval isi file ini. Berhenti + laporan: eval "window.__obStop()" */
(() => {
  window.__ob = { frames: [], longs: 0, longMs: 0 };
  const po = new PerformanceObserver((l) => {
    for (const e of l.getEntries()) { window.__ob.longs++; window.__ob.longMs += e.duration; }
  });
  po.observe({ entryTypes: ["longtask"] });
  let last = performance.now();
  const t0 = last;
  const tick = (t) => {
    window.__ob.frames.push(t - last);
    last = t;
    if (performance.now() - t0 < 3500) requestAnimationFrame(tick);
    else setTimeout(() => {
      const f = window.__ob.frames.slice(2);
      const avg = f.reduce((a, b) => a + b, 0) / f.length;
      const janky = f.filter((d) => d > 21).length;
      window.__obReport = {
        frames: f.length,
        avgMs: +avg.toFixed(1),
        p90: +f.slice().sort((a, b) => a - b)[Math.floor(f.length * 0.9)].toFixed(1),
        jankyPct: +((janky / f.length) * 100).toFixed(1),
        longtasks: window.__ob.longs,
        longMs: +window.__ob.longMs.toFixed(0),
      };
      po.disconnect();
      console.log("MEASURE_DONE");
    }, 30);
  };
  requestAnimationFrame(tick);
  return "started";
})()
