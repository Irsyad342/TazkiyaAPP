"""Uji saklar lokasi otomatis + cek TargetSheet tanpa Doa Harian + tema terang."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(
        viewport={"width": 420, "height": 860},
        permissions=["geolocation"],
        geolocation={"latitude": -6.914444, "longitude": 107.609811, "accuracy": 18},  # Bandung
        locale="id-ID",
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://localhost:3000", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.get_by_role("button", name="Buka menu Profil").click()
    page.wait_for_timeout(700)
    page.evaluate("document.getElementById('konten-tazkiya').scrollTop = 1650")
    page.wait_for_timeout(300)
    # Aktifkan lokasi otomatis
    page.get_by_role("switch", name="Perbarui lokasi otomatis").click()
    page.wait_for_timeout(5000)
    geo = page.evaluate("JSON.parse(localStorage.getItem('tazkiya-store-v1')).state.settings.geo ?? null")
    print("AUTO ON:", json.dumps({k: geo.get(k) for k in ("auto", "lat", "label")}, ensure_ascii=False))
    page.screenshot(path="tool-results/rev-geo-auto-on.png")
    # Matikan lagi
    page.get_by_role("switch", name="Perbarui lokasi otomatis").click()
    page.wait_for_timeout(800)
    geo2 = page.evaluate("JSON.parse(localStorage.getItem('tazkiya-store-v1')).state.settings.geo ?? null")
    print("AUTO OFF:", json.dumps({k: geo2.get(k) for k in ("auto", "label")}, ensure_ascii=False))
    # TargetSheet: pastikan Doa Harian tidak ada
    page.evaluate("document.getElementById('konten-tazkiya').scrollTop = 0")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Buka halaman Target Ibadah").click()
    page.wait_for_timeout(900)
    body = page.evaluate("document.body.innerText")
    print("TargetSheet Doa Harian ada?", "Doa Harian" in body)
    print("TargetSheet Duha ada?", "Salat Duha" in body)
    page.screenshot(path="tool-results/rev-target-sheet.png")
    # Tutup target sheet (tombol tutup/X)
    for name in ["Tutup", "Kembali", "X"]:
        try:
            page.get_by_role("button", name=name, exact=True).click(timeout=1500)
            break
        except Exception:
            continue
    page.wait_for_timeout(500)
    # Tema terang
    page.evaluate("document.getElementById('konten-tazkiya').scrollTop = 2100")
    page.wait_for_timeout(200)
    try:
        page.get_by_role("radio", name="Terang Lavender bersih").click(timeout=2000)
    except Exception as e:
        print("tema err", e)
    page.wait_for_timeout(600)
    page.screenshot(path="tool-results/rev-loc-light.png")
    print("PAGE ERRORS:", errors or "none")
    browser.close()
