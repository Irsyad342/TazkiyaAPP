#!/usr/bin/env python3
"""Dokumen cloud QA untuk Weekly Reflection: data minggu 2–8 Nov 2026 penuh +
hari ini 9 Nov sebagian; jadwal realistis; zuhur sudah ditandai tampil agar
pengingat tidak mengganggu pengujian refleksi."""
import json, subprocess

def done(kind):
    return {"status": "done", "kind": kind, "savedAt": "2026-11-08T08:00:00+07:00"}

def miss(reason):
    return {"status": "missed", "reason": reason, "savedAt": "2026-11-08T08:00:00+07:00"}

P = ["subuh", "zuhur", "asar", "magrib", "isya"]

def log_for(date, prayers, extras, qp, qv, zk):
    return {
        "date": date,
        "prayers": {p: (p in prayers) for p in P},
        "extras": {e: (e in extras) for e in ["duha", "tahajud", "doa", "puasa", "sedekah"]},
        "quranPages": qp, "quranVerses": qv, "zikirCount": zk,
    }

pd = {
    "2026-11-02": {"subuh": done("berjamaah"), "zuhur": done("berjamaah"), "asar": done("mandiri"), "magrib": done("berjamaah"), "isya": done("berjamaah")},
    "2026-11-03": {"subuh": done("berjamaah"), "zuhur": done("mandiri"), "asar": miss("ketiduran"), "magrib": done("mandiri"), "isya": done("berjamaah")},
    "2026-11-04": {"subuh": done("mandiri"), "asar": done("mandiri"), "isya": done("mandiri")},
    "2026-11-05": {p: done("berjamaah") for p in P},
    "2026-11-06": {"zuhur": done("berjamaah"), "magrib": done("mandiri"), "isya": done("mandiri")},
    "2026-11-07": {"subuh": done("berjamaah"), "zuhur": done("mandiri"), "asar": done("mandiri")},
    "2026-11-08": {"subuh": done("berjamaah"), "magrib": done("berjamaah"), "isya": done("berjamaah")},
}
logs = {
    "2026-11-02": log_for("2026-11-02", P, ["duha"], 5, 12, 33),
    "2026-11-03": log_for("2026-11-03", ["subuh", "zuhur", "magrib", "isya"], ["sedekah"], 3, 7, 40),
    "2026-11-04": log_for("2026-11-04", ["subuh", "asar", "isya"], [], 0, 0, 0),
    "2026-11-05": log_for("2026-11-05", P, ["duha", "tahajud"], 4, 9, 60),
    "2026-11-06": log_for("2026-11-06", ["zuhur", "magrib", "isya"], [], 2, 5, 25),
    "2026-11-07": log_for("2026-11-07", ["subuh", "zuhur", "asar"], ["puasa"], 6, 14, 0),
    "2026-11-08": log_for("2026-11-08", ["subuh", "magrib", "isya"], ["sedekah", "duha"], 3, 8, 45),
    "2026-11-09": log_for("2026-11-09", ["subuh"], ["duha"], 1, 3, 20),
}

settings = {
    "name": "QA Refleksi", "quranTargetType": "halaman", "quranDailyTarget": 5,
    "quranTargetSurah": 1, "zikirTarget": 100, "trackedExtras": ["duha", "tahajud", "puasa", "sedekah"],
    "city": "Jakarta", "prayerMethod": "kemenag", "prayerTimesAuto": True,
    "remindersEnabled": False,
    "reminderTimes": {
        "subuh": {"enabled": True, "time": "04:20"}, "zuhur": {"enabled": True, "time": "11:58"},
        "asar": {"enabled": True, "time": "15:16"}, "magrib": {"enabled": True, "time": "17:54"},
        "isya": {"enabled": True, "time": "19:06"},
    },
    "animations": True, "vibration": True, "showArabic": True, "theme": "dark",
    "readerArabicSize": 28, "readerTransSize": 13, "readerLineHeight": 1.9,
    "readerShowTranslation": True, "quranReadMode": "terjemahan", "quranPageSound": True,
    "fullscreenReminder": True, "reminderNotify": False,
    "createdAt": "2026-11-01T00:00:00.000Z",
}

doc = {
    "v": 1, "settings": settings, "logs": logs, "prayerDetails": pd,
    "fridayZuhurAlt": {}, "bookmarks": [], "ayahBookmarks": [], "lastRead": None,
    "readingHistory": [], "deletedReadings": [],
    "tasbih": {"count": 0, "target": 100, "dhikr": "Subhanallah"},
    "qadaRecords": [],
    "journal": {
        "2026-11-02": {"date": "2026-11-02", "items": ["Sehat", "Keluarga", "Rezeki"], "savedAt": "2026-11-02T20:00:00+07:00"},
        "2026-11-04": {"date": "2026-11-04", "items": ["Hujan", "Kopi", "Istirahat"], "savedAt": "2026-11-04T20:00:00+07:00"},
        "2026-11-06": {"date": "2026-11-06", "items": ["Jumat berkah", "Teman", "Waktu"], "savedAt": "2026-11-06T20:00:00+07:00"},
        "2026-11-08": {"date": "2026-11-08", "items": ["Malam tenang", "Bacaan", "Doa"], "savedAt": "2026-11-08T20:00:00+07:00"},
    },
    "moods": {},
    "amalEntries": [
        {"id": "am-qa1", "date": "2026-11-03", "kind": "sedekah", "title": "Sedekah subuh", "savedAt": "2026-11-03T06:00:00+07:00"},
        {"id": "am-qa2", "date": "2026-11-05", "kind": "membantu", "title": "Bantu tetangga", "savedAt": "2026-11-05T16:00:00+07:00"},
        {"id": "am-qa3", "date": "2026-11-08", "kind": "berbagi-ilmu", "title": "Bagi materi kajian", "savedAt": "2026-11-08T10:00:00+07:00"},
    ],
    "amalGoals": [], 
    "zikirSessions": [
        {"id": "zk-qa1", "date": "2026-11-03", "count": 40, "dhikr": "Subhanallah", "slot": "harian", "savedAt": "2026-11-03T07:00:00+07:00"},
        {"id": "zk-qa2", "date": "2026-11-05", "count": 60, "dhikr": "Alhamdulillah", "slot": "pagi", "savedAt": "2026-11-05T07:00:00+07:00"},
        {"id": "zk-qa3", "date": "2026-11-08", "count": 45, "dhikr": "Astaghfirullah", "slot": "petang", "savedAt": "2026-11-08T18:00:00+07:00"},
    ],
    "dailyGoals": [], "goalDone": {},
    "weeklyReflections": {}, "reflectionViewed": {},
    # Zuhur sedang berjalan & sudah ditandai tampil → reminder tidak mengganggu QA refleksi.
    "reminderShown": {"zuhur": "2026-11-09"},
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
open("/tmp/qa-local.json", "w").write(json.dumps({"state": doc, "version": 0}))
print("local-seed ok")
