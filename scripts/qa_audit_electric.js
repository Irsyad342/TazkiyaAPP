// Audit computed style Electric Dream — jalankan via agent-browser eval.
// Mengembalikan JSON: nilai token ter-resolve + warna elemen kunci.
(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const root = getComputedStyle(document.documentElement);
  const tok = (n) => root.getPropertyValue(n).trim();
  const hero = document.querySelector(".glass-hero");
  const pill = [...document.querySelectorAll("nav a, nav button")].find((b) => {
    const c = cs(b);
    return c && c.backgroundColor && c.backgroundColor !== "rgba(0, 0, 0, 0)";
  });
  const badge = document.querySelector(".fr-badge");
  const overline = [...document.querySelectorAll("*")].find((e) => /Doa Hari Ini|Barakah|TUGAS|JADWAL/i.test(e.textContent || "") && e.children.length === 0);
  const ring = document.querySelector("svg circle[stroke]");
  const out = {
    dataset: document.documentElement.dataset.theme + "/" + document.documentElement.dataset.color,
    canvas: tok("--tk-shell-bg") || tok("--background"),
    brand: tok("--tk-brand"), brandSoft: tok("--tk-brand-soft"), accent: tok("--tk-accent"),
    neon: tok("--tk-neon"), lime: tok("--color-tk-lime"), limeInk: tok("--color-tk-lime-ink"),
    lavender: tok("--color-tk-lavender"), ink: tok("--color-tk-ink"),
    heroA: tok("--tk-hero-a"), heroB: tok("--tk-hero-b"), heroC: tok("--tk-hero-c"),
    progressA: tok("--tk-progress-a"),
    heroGradient: hero ? cs(hero).backgroundImage.slice(0, 140) : null,
    navPillBg: pill ? cs(pill).backgroundColor : null,
    badgeBg: badge ? cs(badge).backgroundColor : null,
    badgeColor: badge ? cs(badge).color : null,
    overlineColor: overline ? cs(overline).color : null,
    ringStroke: ring ? cs(ring).stroke : null,
  };
  return JSON.stringify(out);
})();
