#!/usr/bin/env python3
"""Bangun dokumen cloud QA + seed lokal untuk pengujian tema reminder.
Pemakaian: qa-reminder-round.py <asar|magrib|isya|zuhur|subuh>"""
import json, subprocess, sys

THEME = sys.argv[1]
# Jadwal uji: target = 00:0N (current), semua sebelumnya lewat, berikutnya 23:59
order = ["subuh", "zuhur", "asar", "magrib", "isya"]
idx = order.index(THEME)
times = {}
for i, p in enumerate(order):
    if i < idx:
        times[p] = {"enabled": True, "time": f"00:0{i+1}"}
    elif i == idx:
        times[p] = {"enabled": True, "time": f"00:{idx+1:02d}0"}  # 00:10 dst
    else:
        times[p] = {"enabled": True, "time": "23:59"}

settings = {
    "name": "QA Refleksi", "quranTargetType": "halaman", "quranDailyTarget": 5,
    "quranTargetSurah": 1, "zikirTarget": 100, "trackedExtras": ["duha", "tahajud", "puasa", "sedekah"],
    "city": "Jakarta", "prayerMethod": "kemenag", "prayerTimesAuto": True,
    "remindersEnabled": False, "reminderTimes": times,
    "animations": True, "vibration": True, "showArabic": True, "theme": "dark",
    "readerArabicSize": 28, "readerTransSize": 13, "readerLineHeight": 1.9,
    "readerShowTranslation": True, "quranReadMode": "terjemahan", "quranPageSound": True,
    "fullscreenReminder": True, "reminderNotify": False,
    "createdAt": "2026-11-01T00:00:00.000Z",
}

doc = {
    "v": 1, "settings": settings,
    "logs": {}, "prayerDetails": {}, "fridayZuhurAlt": {},
    "bookmarks": [], "ayahBookmarks": [], "lastRead": None,
    "readingHistory": [], "deletedReadings": [],
    "tasbih": {"count": 0, "target": 100, "dhikr": "Subhanallah"},
    "qadaRecords": [], "journal": {}, "moods": {}, "amalEntries": [], "amalGoals": [],
    "zikirSessions": [], "dailyGoals": [], "goalDone": {},
    "weeklyReflections": {}, "reflectionViewed": {}, "reminderShown": {},
}

sess = json.load(open("/tmp/qa-session.json"))
API = "https://ujapagwhhvpskvyitxbn.supabase.co/rest/v1/user_data"
KEY = "sb_publishable_tt_lOE_VNGdGny-Yuh7H5w_M3KdUe3z"
UID = "9ef99136-2075-44f1-af3a-140c16fe8dae"
r = subprocess.run([
    "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "PATCH",
    f"{API}?user_id=eq.{UID}",
    "-H", f"apikey: {KEY}", "-H", f"Authorization: Bearer {sess['access_token']}",
    "-H", "Content-Type: application/json", "-H", "Prefer: resolution=merge-duplicated",
    "--data-binary", json.dumps({"data": doc}),
], capture_output=True, text=True)
print("cloud-patch:", r.stdout)

# Tulis seed lokal untuk eval browser
local = {"state": doc, "version": 0}
open("/tmp/qa-local.json", "w").write(json.dumps(local))
print("local-seed: /tmp/qa-local.json")
