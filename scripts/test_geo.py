"""Uji alur sukses GPS: izin diberikan + posisi Jakarta diperuntukkan."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(
        viewport={"width": 420, "height": 860},
        permissions=["geolocation"],
        geolocation={"latitude": -6.2, "longitude": 106.816666, "accuracy": 25},
        locale="id-ID",
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://localhost:3000", wait_until="networkidle")
    page.wait_for_timeout(1200)
    # Buka Profil
    page.get_by_role("button", name="Buka menu Profil").click()
    page.wait_for_timeout(700)
    # Scroll ke lokasi
    page.evaluate("document.getElementById('konten-tazkiya').scrollTop = 1650")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="Gunakan Lokasi Saat Ini").click()
    page.wait_for_timeout(5000)
    geo = page.evaluate("JSON.parse(localStorage.getItem('tazkiya-store-v1')).state.settings.geo ?? null")
    print("GEO:", json.dumps(geo, ensure_ascii=False))
    page.screenshot(path="tool-results/rev-geo-success.png")
    print("PAGE ERRORS:", errors or "none")
    browser.close()
