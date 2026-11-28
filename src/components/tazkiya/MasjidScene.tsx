"use client";

/**
 * Tazkiya — Tur Masjid Virtual v2: SINEMATIK + ATMOSFER WAKTU LOKAL.
 *
 * Arsitektur tetap three.js vanilla prosedural (satu-satunya engine 3D — tanpa
 * engine kedua) dengan pola yang sama seperti v1: dynamic import ssr:false,
 * pixelRatio ≤2, loop berhenti saat tab tersembunyi, dispose menyeluruh,
 * fallback WebGL jujur, reduced-motion dihormati.
 *
 * Yang baru di v2 (tanpa mengubah perilaku waktu/jadwal aplikasi):
 * - EKSTERIOR masjid (plaza, fasad + bukaan pintu nyata, kubah, dua menara)
 *   sebagai panggung pembuka; tombol "Masuk Masjid" memicu cinematic dolly.
 * - CINEMATIC ENTRY: approach → menembus ambang pintu (bukan menembus dinding;
 *   dinding selatan punya bukaan arch sungguhan) → interior reveal → serah ke
 *   eksplorasi. Easing easeInOutCubic per tahap; durasi versi singkat (±40%)
 *   bila pengguna pernah menonton (localStorage); tombol Skip Intro.
 * - INTERIOR KAYA: mihrab ceruk 3D berbingkai emas, area imam + mimbar + rehal,
 *   karpet saf bersajadah instanced menghadap mihrab, kubah interior + pilar,
 *   jendela arch besar dengan panorama luar (canvas texture) + jendela kisi,
 *   chandelier & lampu dinding, rak mushaf, kursi salat lansia, rak sandal,
 *   medallion kaligrafi, blob shadow lembut.
 * - ATMOSFER WAKTU LOKAL (independen tema aplikasi — 0 token tema dipakai):
 *   dini hari / subuh / pagi / siang / sore / magrib / malam, interpolasi
 *   kontinu antar keyframe jam; sun DirectionalLight berpindah posisi; jendela
 *   menggambar langit matahari/bulan; lampu interior naik saat gelap. Dihitung
 *   sekali saat mount + diperbarui tiap 30 dtk hanya bila jam bergeser — tanpa
 *   re-render React.
 * - EFEK TERUKUR: debu halus (off saat reduced-motion), shaft cahaya jendela
 *   additive tipis mengikuti intensitas matahari, bintang di langit malam.
 * - EKSPLORASI: geser yaw/pitch damping (tetap), pinch/wheel zoom FOV 50–78,
 *   ketuk dua kali/kibla tetap, kamera tidak berjalan — mustahil menembus dinding.
 *
 * QA: prop timeOverride (jam 0–24 float) hanya dari query ?qa-time= — produksi
 * selalu memakai jam lokal sungguhan.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export interface MasjidSceneHandle {
  reset: () => void;
  faceQibla: () => void;
  playIntro: () => void;
  skipIntro: () => void;
}

/* ================= ATMOSFER WAKTU (independen tema) ================= */

type Atmos = {
  /** langit luar atas/bawah untuk panorama jendela + scene background luar */
  skyTop: number;
  skyMid: number;
  skyLow: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  ambColor: number;
  ambI: number;
  sunColor: number;
  sunI: number;
  /** posisi matahari/bulan (arah cahaya) */
  sunPos: [number, number, number];
  /** 0–1 seberapa menyala lampu interior */
  lampI: number;
  /** opasitas bintang di langit luar */
  stars: number;
  /** bentuk langit: "moon" | "sun" | "sunset" */
  skyKind: "moon" | "sun" | "sunset";
  fogColor: number;
};

const KEYS: Array<[number, Atmos]> = [
  // dini hari — biru gelap, moonlight, lampu lembut
  [0, { skyTop: 0x0c1330, skyMid: 0x182454, skyLow: 0x2a3a74, hemiSky: 0x33406e, hemiGround: 0x1a1626, hemiI: 0.5, ambColor: 0x2e3a66, ambI: 0.4, sunColor: 0x7c92d8, sunI: 0.24, sunPos: [6, 7, -2], lampI: 1, stars: 0.9, skyKind: "moon", fogColor: 0x101a3c }],
  // menjelang subuh — lavender, fajar tipis
  [5.5, { skyTop: 0x2a2f63, skyMid: 0x6a5a8e, skyLow: 0xc08a94, hemiSky: 0x8a7aa8, hemiGround: 0x3a2f42, hemiI: 0.68, ambColor: 0x8a7ea8, ambI: 0.44, sunColor: 0xffb98a, sunI: 0.34, sunPos: [8, 2.6, 6], lampI: 0.85, stars: 0.3, skyKind: "sunset", fogColor: 0x4a4470 }],
  // pagi — golden soft, segar
  [8, { skyTop: 0x6fb0dc, skyMid: 0xa8d4ec, skyLow: 0xe8f2f8, hemiSky: 0xcfe4f5, hemiGround: 0x8a7a64, hemiI: 0.95, ambColor: 0xfff1dc, ambI: 0.5, sunColor: 0xffd9a0, sunI: 1.0, sunPos: [7, 5.5, 5], lampI: 0.25, stars: 0, skyKind: "sun", fogColor: 0xb8d8ea }],
  // siang — terang alami, tidak overexposed
  [12, { skyTop: 0x5fa8e0, skyMid: 0x9cccf0, skyLow: 0xe6f2fa, hemiSky: 0xeaf3fb, hemiGround: 0x9c8a72, hemiI: 1.08, ambColor: 0xf5f2ea, ambI: 0.56, sunColor: 0xfff2dd, sunI: 1.12, sunPos: [1.5, 10, 2.5], lampI: 0.12, stars: 0, skyKind: "sun", fogColor: 0xcfe4f2 }],
  // sore — golden hour
  [16, { skyTop: 0x6a9cd0, skyMid: 0xc4b488, skyLow: 0xf2d8a8, hemiSky: 0xf2dab0, hemiGround: 0x8a7258, hemiI: 0.92, ambColor: 0xffe2b8, ambI: 0.5, sunColor: 0xffc26e, sunI: 1.0, sunPos: [8.5, 3.2, 6], lampI: 0.32, stars: 0, skyKind: "sun", fogColor: 0xe2c8a0 }],
  // magrib / sunset — orange muted pink, lampu mulai
  [18, { skyTop: 0x3a4480, skyMid: 0xa86478, skyLow: 0xe89a7a, hemiSky: 0xe8a888, hemiGround: 0x4a3a4a, hemiI: 0.72, ambColor: 0xd8a088, ambI: 0.44, sunColor: 0xffa06a, sunI: 0.5, sunPos: [9, 1.4, 5], lampI: 0.72, stars: 0.15, skyKind: "sunset", fogColor: 0x7a6288 }],
  // malam — midnight blue luar, interior golden warm
  [20, { skyTop: 0x0e1533, skyMid: 0x1a2654, skyLow: 0x2c3c74, hemiSky: 0x384470, hemiGround: 0x1a1626, hemiI: 0.5, ambColor: 0x323e6c, ambI: 0.38, sunColor: 0x8093d0, sunI: 0.2, sunPos: [5, 8, 3], lampI: 1, stars: 0.9, skyKind: "moon", fogColor: 0x141c40 }],
];
KEYS.push([24, KEYS[KEYS.length - 1][1]]);

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function mixC(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(mix(ar, br, t)) << 16) | (Math.round(mix(ag, bg, t)) << 8) | Math.round(mix(ab, bb, t));
}
/** Atmosfer kontinu untuk jam float — tidak ada lompatan antar rentang. */
function atmosAt(h: number): Atmos {
  const hh = ((h % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] < hh) i++;
  const [h0, a0] = KEYS[i];
  const [h1, a1] = KEYS[i + 1];
  const t = Math.max(0, Math.min(1, (hh - h0) / Math.max(0.01, h1 - h0)));
  const e = t * t * (3 - 2 * t); // smoothstep — lembut di sambungan
  return {
    skyTop: mixC(a0.skyTop, a1.skyTop, e),
    skyMid: mixC(a0.skyMid, a1.skyMid, e),
    skyLow: mixC(a0.skyLow, a1.skyLow, e),
    hemiSky: mixC(a0.hemiSky, a1.hemiSky, e),
    hemiGround: mixC(a0.hemiGround, a1.hemiGround, e),
    hemiI: mix(a0.hemiI, a1.hemiI, e),
    ambColor: mixC(a0.ambColor, a1.ambColor, e),
    ambI: mix(a0.ambI, a1.ambI, e),
    sunColor: mixC(a0.sunColor, a1.sunColor, e),
    sunI: mix(a0.sunI, a1.sunI, e),
    sunPos: [mix(a0.sunPos[0], a1.sunPos[0], e), mix(a0.sunPos[1], a1.sunPos[1], e), mix(a0.sunPos[2], a1.sunPos[2], e)],
    lampI: mix(a0.lampI, a1.lampI, e),
    stars: mix(a0.stars, a1.stars, e),
    skyKind: e < 0.5 ? a0.skyKind : a1.skyKind,
    fogColor: mixC(a0.fogColor, a1.fogColor, e),
  };
}

/* ================= TEKSTUR CANVAS (jendela & kaligrafi) ================= */

/** Panorama luar di jendela arch — langit + matahari/bulan + siluet kota. */
function windowTexture(a: Atmos): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const col = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, col(a.skyTop));
  g.addColorStop(0.55, col(a.skyMid));
  g.addColorStop(1, col(a.skyLow));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 128);
  if (a.skyKind === "sun") {
    ctx.fillStyle = "rgba(255,244,205,0.95)";
    ctx.beginPath();
    ctx.arc(48, 44, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,205,0.25)";
    ctx.beginPath();
    ctx.arc(48, 44, 19, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.skyKind === "moon") {
    ctx.fillStyle = "rgba(230,236,255,0.9)";
    ctx.beginPath();
    ctx.arc(52, 40, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col(a.skyTop);
    ctx.beginPath();
    ctx.arc(48, 36, 8, 0, Math.PI * 2);
    ctx.fill();
    for (const [sx, sy, r] of [[14, 18, 1.2], [74, 24, 1.5], [26, 52, 1], [80, 62, 1.1]] as Array<[number, number, number]>) {
      ctx.fillStyle = "rgba(226,232,255,0.8)";
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "rgba(255,214,160,0.85)";
    ctx.beginPath();
    ctx.arc(48, 92, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  // siluet kota + bukit gelap
  ctx.fillStyle = "rgba(22,28,56,0.82)";
  for (const [bx, bw, bh] of [[2, 16, 18], [20, 12, 26], [34, 18, 15], [54, 14, 30], [70, 12, 20], [84, 12, 24]] as Array<[number, number, number]>) {
    ctx.fillRect(bx, 128 - 26 - bh, bw, bh + 26);
  }
  ctx.fillStyle = "rgba(18,24,48,0.9)";
  ctx.fillRect(0, 116, 96, 12);
  return new THREE.CanvasTexture(c);
}

/** Medallion kaligrafi dekoratif (Allah / Muhammad) — canvas 128, font serif. */
function medallionTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2e3a72";
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8a752";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(216,167,82,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f2e3c4";
  ctx.font = "44px 'Noto Naskh Arabic', 'Scheherazade New', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 66);
  return new THREE.CanvasTexture(c);
}

/* ================= BENTUK BANTU ================= */

function archShape(w: number, h: number, tip: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - tip);
  s.quadraticCurveTo(-w / 2, h - tip * 0.15, 0, h);
  s.quadraticCurveTo(w / 2, h - tip * 0.15, w / 2, h - tip);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ================= KOMPONEN SCENE ================= */

export type TourStage = "exterior" | "intro" | "explore";

const MasjidScene = forwardRef<
  MasjidSceneHandle,
  { onFail: () => void; qiblaYaw: number | null; timeOverride?: number; onStage?: (s: TourStage) => void }
>(function MasjidScene({ onFail, qiblaYaw, timeOverride, onStage }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const yawT = useRef(0);
  const pitchT = useRef(0);
  const qiblaRef = useRef(0);
  const fovT = useRef(62);
  const apiRef = useRef<{ playIntro: () => void; skipIntro: () => void } | null>(null);
  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;

  useEffect(() => {
    qiblaRef.current = qiblaYaw ?? 0;
  }, [qiblaYaw]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      yawT.current = 0;
      pitchT.current = 0;
      fovT.current = 72;
    },
    faceQibla: () => {
      yawT.current = qiblaRef.current;
      pitchT.current = 0;
    },
    playIntro: () => apiRef.current?.playIntro(),
    skipIntro: () => apiRef.current?.skipIntro(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      onFail();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const atmos0 = atmosAt(timeOverride ?? new Date().getHours() + new Date().getMinutes() / 60);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(atmos0.skyMid);
    scene.fog = new THREE.Fog(atmos0.fogColor, 9, 30);

    const camera = new THREE.PerspectiveCamera(62, host.clientWidth / host.clientHeight, 0.1, 80);
    camera.rotation.order = "YXZ";
    camera.position.set(0, 1.6, 13.5);

    /* ---------- Cahaya (dikendalikan atmosfer) ---------- */
    const hemi = new THREE.HemisphereLight(atmos0.hemiSky, atmos0.hemiGround, atmos0.hemiI);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(atmos0.ambColor, atmos0.ambI);
    scene.add(amb);
    const sun = new THREE.DirectionalLight(atmos0.sunColor, atmos0.sunI);
    sun.position.set(...atmos0.sunPos);
    scene.add(sun);
    // lampu interior hangat: chandelier utama + sekunder (tanpa bayangan)
    const lampMain = new THREE.PointLight(0xffd9a8, 14 * atmos0.lampI, 14, 1.7);
    lampMain.position.set(0, 3.55, 0);
    scene.add(lampMain);
    const lampNiche = new THREE.PointLight(0xffc98a, 7 * atmos0.lampI, 9, 1.8);
    lampNiche.position.set(0, 2.4, -5.6);
    scene.add(lampNiche);
    const lampEntry = new THREE.PointLight(0xffd9a8, 6 * atmos0.lampI, 10, 1.8);
    lampEntry.position.set(0, 3.3, 4.6);
    scene.add(lampEntry);

    /* ---------- Palet scene (TETAP — bukan token tema) ---------- */
    const C = {
      wall: 0xe6dcc8,
      wallLow: 0xd8ccb4,
      ceiling: 0xe2d8c4,
      domeIn: 0xd9c9a8,
      gold: 0xd8a752,
      goldSoft: 0xe4bd78,
      carpet: 0x7a74b8,
      carpetDark: 0x6a64a4,
      rug: 0xf2e3b8,
      rugBorder: 0xc9a86a,
      niche: 0x2e3a72,
      nicheDark: 0x232c5c,
      marble: 0xd9c9a8,
      marbleDark: 0xbfae8e,
      wood: 0xa8784a,
      woodDark: 0x8a5f3a,
      night: 0x232c5c,
      skyCity: 0x1a2140,
      chair: 0x9a8670,
      book: 0x4a7a5e,
    };
    const disposables: Array<{ dispose: () => void }> = [];
    const lambert = (color: number, opts?: Partial<THREE.MeshLambertMaterialParameters>) =>
      new THREE.MeshLambertMaterial({ color, ...opts });
    const basic = (color: number, opts?: Partial<THREE.MeshBasicMaterialParameters>) =>
      new THREE.MeshBasicMaterial({ color, ...opts });

    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
      return m;
    };
    const addPlane = (w: number, h: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0, rx = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0, "YXZ");
      scene.add(m);
      return m;
    };

    /* ---------- Ground: plaza luar + karpet interior ---------- */
    const groundMat = lambert(C.marble);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 34), groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // plaza terang di depan masjid (z > 6.5), halus berbeda dari lantai dalam
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), lambert(0xc4b896));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.006, 16);
    scene.add(plaza);
    // karpet utama ruang salat (menghadap mihrab -Z)
    const carpet = addPlane(10.6, 11.4, 0, 0.012, -0.2, lambert(C.carpet));
    carpet.rotation.x = -Math.PI / 2;
    const carpetSide = addPlane(10.6, 0.5, 0, 0.012, 5.6, lambert(C.carpetDark));
    carpetSide.rotation.x = -Math.PI / 2;

    /* ---------- Dinding: utara (mihrab), selatan (pintu berbukaan), timur, barat ---------- */
    const wallMat = lambert(C.wall);
    const H = 4.3;
    // utara & timur/barat: utuh
    addPlane(13, H, 0, H / 2, -6.5, wallMat);
    addPlane(13, H, -6.5, H / 2, 0, wallMat, Math.PI / 2);
    addPlane(13, H, 6.5, H / 2, 0, wallMat, -Math.PI / 2);
    // selatan: bukaan pintu (lebar 2.3, tinggi 2.7) — kamera lewat di sini
    const sWallW = (13 - 2.3) / 2;
    addPlane(sWallW, H, -(2.3 / 2 + sWallW / 2), H / 2, 6.5, wallMat, Math.PI);
    addPlane(sWallW, H, 2.3 / 2 + sWallW / 2, H / 2, 6.5, wallMat, Math.PI);
    const lintelW = 2.3;
    const lintelH = H - 2.7;
    addPlane(lintelW, lintelH, 0, 2.7 + lintelH / 2, 6.5, wallMat, Math.PI);
    // skirting dinding (band bawah)
    const skirting = lambert(C.wallLow);
    addBox(13, 0.22, 0.06, 0, 0.11, -6.44, skirting);
    addBox(0.06, 0.22, 13, -6.44, 0.11, 0, skirting);
    addBox(0.06, 0.22, 13, 6.44, 0.11, 0, skirting);
    addBox(12.9, 0.22, 0.06, 0, 0.11, 6.44, skirting, 0);
    // dinding eksterior depan (fasad) — tebal, dengan BUKAAN pintu (kamera lewat di sini)
    const fasadMat = lambert(0xdccfb2);
    addBox(sWallW, H, 0.5, -(2.3 / 2 + sWallW / 2), H / 2, 6.9, fasadMat);
    addBox(sWallW, H, 0.5, 2.3 / 2 + sWallW / 2, H / 2, 6.9, fasadMat);
    addBox(lintelW, lintelH, 0.5, 0, 2.7 + lintelH / 2, 6.9, fasadMat);

    /* ---------- Fasad eksterior: kubah, menara, pilar pintu ---------- */
    // volume bangunan (terlihat dari luar)
    addBox(10.4, 1.1, 13.6, 0, H + 0.55, 0, lambert(0xd2c4a4)); // parapet massa atap
    const extDome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x2e4a78));
    extDome.position.set(0, H + 1.1, -1);
    scene.add(extDome);
    const finialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), basic(C.gold));
    finialBase.position.set(0, H + 3.6, -1);
    scene.add(finialBase);
    const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), basic(C.gold));
    finialBall.position.set(0, H + 3.95, -1);
    scene.add(finialBall);
    // dua menara
    for (const side of [-1, 1] as const) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 7.4, 12), lambert(0xdccfb2));
      shaft.position.set(side * 4.9, 3.7, 6.6);
      scene.add(shaft);
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 12), lambert(0xc9b894));
      balcony.position.set(side * 4.9, 6.1, 6.6);
      scene.add(balcony);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x2e4a78));
      cap.position.set(side * 4.9, 7.4, 6.6);
      scene.add(cap);
      const spire = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), basic(C.gold));
      spire.position.set(side * 4.9, 8.15, 6.6);
      scene.add(spire);
    }
    // pilar pintu + lintel arch fasad
    const doorFrameMat = lambert(C.gold);
    // bingkai arch pintu: RING dengan lubang (bukan plane penuh — jalur kamera bebas)
    const doorRingShape = archShape(2.62, 3.06, 0.72);
    doorRingShape.holes.push(archShape(2.34, 2.86, 0.66));
    const doorArch = new THREE.Mesh(new THREE.ShapeGeometry(doorRingShape), doorFrameMat);
    doorArch.position.set(0, 0.02, 7.17);
    scene.add(doorArch);
    // daun pintu terbuka (dua plane miring) — celah nyata untuk kamera
    const leafMat = lambert(0x8a5f3a, { side: THREE.DoubleSide });
    const leafL = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.5), leafMat);
    leafL.position.set(-0.85, 1.27, 6.9);
    leafL.rotation.y = Math.PI * 0.38;
    scene.add(leafL);
    const leafR = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.5), leafMat);
    leafR.position.set(0.85, 1.27, 6.9);
    leafR.rotation.y = -Math.PI * 0.38;
    scene.add(leafR);
    // lampu dinding fasad luar
    for (const side of [-1, 1] as const) {
      const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), basic(0xffe6bd));
      sconce.position.set(side * 2.6, 2.9, 7.3);
      scene.add(sconce);
    }

    /* ---------- Mihrab ceruk 3D + bingkai + pintu mihrab ---------- */
    const nicheOuter = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.86, 2.62, 0.62)), lambert(C.niche));
    nicheOuter.position.set(0, 0.02, -6.4);
    scene.add(nicheOuter);
    const nicheIn = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.5, 2.3, 0.55)), basic(C.nicheDark));
    nicheIn.position.set(0, 0.02, -6.38);
    scene.add(nicheIn);
    const nicheGlow = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.08, 1.76, 0.44)), basic(0x3a4684));
    nicheGlow.position.set(0, 0.02, -6.36);
    scene.add(nicheGlow);
    const mihrabFrame = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.1, 2.9, 0.7)), lambert(C.gold));
    mihrabFrame.position.set(0, 0.02, -6.42);
    scene.add(mihrabFrame);
    // platform mihrab
    addBox(2.1, 0.14, 0.9, 0, 0.07, -5.9, lambert(C.marbleDark));
    // area imam: karpet solo
    const imamRug = addBox(0.66, 0.02, 1.05, 0, 0.03, -5.0, lambert(C.rug));
    imamRug.position.set(0, 0.025, -4.9);

    /* ---------- Mimbar (minbar) khatib kanan mihrab ---------- */
    const minbarMat = lambert(C.wood);
    addBox(0.8, 0.3, 0.55, 1.62, 0.15, -5.72, minbarMat);
    addBox(0.66, 0.34, 0.5, 1.62, 0.47, -5.8, minbarMat);
    addBox(0.6, 0.62, 0.08, 1.62, 0.92, -5.98, lambert(C.woodDark));
    addBox(0.66, 0.1, 0.3, 1.62, 0.56, -5.62, lambert(C.woodDark));
    // rehal + mushaf terbuka di depan mihrab (kiri)
    const rehalLeg = (x: number, z: number, ry: number) => {
      const leg = addBox(0.5, 0.055, 0.07, x, 0.14, z, lambert(C.woodDark), ry);
      leg.rotation.z = 0;
      return leg;
    };
    rehalLeg(1.1, -4.55, Math.PI / 4);
    rehalLeg(1.1, -4.55, -Math.PI / 4);
    const mushafL = addBox(0.16, 0.02, 0.24, 1.08, 0.175, -4.55, lambert(C.book), Math.PI / 4);
    mushafL.rotation.x = -0.3;
    const mushafR = addBox(0.16, 0.02, 0.24, 1.13, 0.175, -4.5, lambert(C.book), Math.PI / 4);
    mushafR.rotation.x = 0.3;

    /* ---------- Jendela besar arch (panorama canvas) + kisi mihrab ---------- */
    const winTex = windowTexture(atmos0);
    disposables.push(winTex);
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, side: THREE.DoubleSide });
    const winFrameMat = lambert(C.gold);
    // dua jendela besar per dinding samping (seperti referensi)
    const bigWinGeo = new THREE.ShapeGeometry(archShape(1.5, 2.3, 0.55));
    for (const side of [-1, 1] as const) {
      for (const z of [-3.1, 1.4]) {
        const win = new THREE.Mesh(bigWinGeo, winMat);
        win.position.set(side * 6.48, 1.62, z);
        win.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        scene.add(win);
        const fr = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.72, 2.56, 0.62)), winFrameMat);
        fr.position.set(side * 6.5, 1.62, z);
        fr.rotation.y = win.rotation.y;
        scene.add(fr);
        // mullion (pembatas kaca)
        const mull = addBox(0.03, 2.2, 0.045, side * 6.47, 1.62, z, lambert(C.goldSoft));
        mull.rotation.y = win.rotation.y;
        const mullH = addBox(0.03, 0.045, 1.3, side * 6.47, 1.5, z, lambert(C.goldSoft));
        mullH.rotation.y = win.rotation.y;
        // sill
        addBox(0.14, 0.1, 1.6, side * 6.42, 0.47, z, lambert(C.marbleDark));
      }
    }
    // jendela kisi ornamen di dinding mihrab (kiri-kanan mihrab)
    const latticeTex = (() => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#2e3a72";
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = "#d8a752";
      ctx.lineWidth = 5;
      for (let i = -64; i < 128; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 64, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i + 64, 0);
        ctx.lineTo(i, 64);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(c);
    })();
    disposables.push(latticeTex);
    const latticeMat = new THREE.MeshBasicMaterial({ map: latticeTex, side: THREE.DoubleSide });
    const latticeGeo = new THREE.ShapeGeometry(archShape(1.34, 2.1, 0.5));
    for (const side of [-1, 1] as const) {
      const lat = new THREE.Mesh(latticeGeo, latticeMat);
      lat.position.set(side * 3.1, 1.5, -6.44);
      scene.add(lat);
      const lfr = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.52, 2.32, 0.56)), winFrameMat);
      lfr.position.set(side * 3.1, 1.5, -6.45);
      scene.add(lfr);
    }

    /* ---------- Kubah interior + pilar + band dinding ---------- */
    const domeIn = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.6), lambert(C.domeIn));
    domeIn.position.set(0, H, 0);
    scene.add(domeIn);
    const domeRing = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.09, 8, 40), lambert(C.gold));
    domeRing.rotation.x = Math.PI / 2;
    domeRing.position.set(0, H + 0.02, 0);
    scene.add(domeRing);
    // band trim di dinding (garis emas lembut keliling)
    const bandMat = lambert(C.goldSoft);
    addBox(13, 0.08, 0.05, 0, 3.1, -6.46, bandMat);
    addBox(0.05, 0.08, 13, -6.46, 3.1, 0, bandMat);
    addBox(0.05, 0.08, 13, 6.46, 3.1, 0, bandMat);
    // empat pilar (mendukung tepi kubah)
    const pilMat = lambert(0xe2d8c4);
    for (const [px, pz] of [[3.4, -3.4], [-3.4, -3.4], [3.4, 2.4], [-3.4, 2.4]] as Array<[number, number]>) {
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, H, 12), pilMat);
      pil.position.set(px, H / 2, pz);
      scene.add(pil);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.72), lambert(C.goldSoft));
      cap.position.set(px, H - 0.08, pz);
      scene.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), lambert(C.marbleDark));
      base.position.set(px, 0.07, pz);
      scene.add(base);
      // blob shadow lembut di lantai
      const blob = new THREE.Mesh(new THREE.CircleGeometry(0.52, 16), basic(0x000000, { transparent: true, opacity: 0.14 }));
      blob.rotation.x = -Math.PI / 2;
      blob.position.set(px, 0.02, pz);
      scene.add(blob);
    }

    /* ---------- Medallion kaligrafi (dinding mihrab & samping) ---------- */
    const medAllah = medallionTexture("اللّٰه");
    const medMuhammad = medallionTexture("مُحَمَّد");
    disposables.push(medAllah, medMuhammad);
    const medMatA = new THREE.MeshBasicMaterial({ map: medAllah, side: THREE.DoubleSide });
    const medMatM = new THREE.MeshBasicMaterial({ map: medMuhammad, side: THREE.DoubleSide });
    const medGeo = new THREE.CircleGeometry(0.42, 24);
    const mA = new THREE.Mesh(medGeo, medMatA);
    mA.position.set(-1.35, 3.62, -6.44);
    scene.add(mA);
    const mM = new THREE.Mesh(medGeo, medMatM);
    mM.position.set(1.35, 3.62, -6.44);
    scene.add(mM);
    for (const side of [-1, 1] as const) {
      const m = new THREE.Mesh(medGeo, side === -1 ? medMatM : medMatA);
      m.position.set(side * 6.44, 3.62, 4.3);
      m.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(m);
    }

    /* ---------- Chandelier utama + lampu kecil + lampu dinding ---------- */
    const cordMat = basic(0x3a3230);
    const goldMat = lambert(C.gold);
    const bulbMat = basic(0xffe6bd);
    // chandelier utama (bola besar + ring + 6 bola kecil, ala referensi)
    const chCore = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), goldMat);
    chCore.position.set(0, 3.3, 0);
    scene.add(chCore);
    const chInner = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bulbMat);
    chInner.position.set(0, 3.24, 0);
    scene.add(chInner);
    const chRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 24), goldMat);
    chRing.rotation.x = Math.PI / 2;
    chRing.position.set(0, 3.3, 0);
    scene.add(chRing);
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bulbMat);
      orb.position.set(Math.cos(ang) * 0.62, 3.3, Math.sin(ang) * 0.62);
      scene.add(orb);
    }
    const mainCord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.0, 6), cordMat);
    mainCord.position.set(0, 3.8, 0);
    scene.add(mainCord);
    // lampu gantung sekunder di jalur tengah
    for (const z of [-3.6, 3.4]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), cordMat);
      cord.position.set(0, 3.85, z);
      scene.add(cord);
      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), goldMat);
      shade.position.set(0, 3.3, z);
      scene.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bulbMat);
      bulb.position.set(0, 3.26, z);
      scene.add(bulb);
    }
    // sconce dinding (setengah bola emas + titik terang) antara jendela
    const wallLamps: THREE.Mesh[] = [];
    for (const side of [-1, 1] as const) {
      for (const z of [-1.1, 3.6]) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
        s.position.set(side * 6.4, 2.6, z);
        s.rotation.z = side * -Math.PI / 2;
        scene.add(s);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), bulbMat);
        dot.position.set(side * 6.33, 2.62, z);
        scene.add(dot);
        wallLamps.push(dot);
      }
    }

    /* ---------- Karpet saf instanced + garis saf ---------- */
    const rugGeo = new THREE.BoxGeometry(0.6, 0.018, 0.98);
    const rugMat = lambert(C.rug);
    const rugBorder = new THREE.BoxGeometry(0.66, 0.014, 1.04);
    const rugBMat = lambert(C.rugBorder);
    const COLS = 7;
    const ROWS = 5;
    const rugs = new THREE.InstancedMesh(rugGeo, rugMat, COLS * ROWS);
    const rugsB = new THREE.InstancedMesh(rugBorder, rugBMat, COLS * ROWS);
    const m4 = new THREE.Matrix4();
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c - (COLS - 1) / 2) * 1.05;
        const z = -1.7 - r * 1.2;
        m4.setPosition(x, 0.022, z);
        rugs.setMatrixAt(idx, m4);
        m4.setPosition(x, 0.019, z);
        rugsB.setMatrixAt(idx, m4);
        idx++;
      }
    }
    scene.add(rugs);
    scene.add(rugsB);

    /* ---------- Rak mushaf, rak sandal, kursi salat lansia ---------- */
    // rak mushaf di dinding timur dekat mihrab
    addBox(1.5, 0.06, 0.4, 6.2, 1.05, -4.6, lambert(C.woodDark), Math.PI / 2);
    addBox(1.5, 0.06, 0.4, 6.2, 1.45, -4.6, lambert(C.woodDark), Math.PI / 2);
    addBox(0.06, 0.5, 0.4, 6.42, 1.25, -4.6, lambert(C.wood), Math.PI / 2);
    for (let b = 0; b < 4; b++) {
      addBox(0.05, 0.22, 0.3, 6.12, 1.2, -5.05 + b * 0.22, lambert(C.book), 0);
    }
    // rak sandal dekat pintu masuk (dalam, sisi kiri)
    addBox(1.3, 0.07, 0.42, -4.9, 0.18, 5.9, lambert(0x8a7648));
    addBox(1.3, 0.07, 0.42, -4.9, 0.42, 5.9, lambert(0x8a7648));
    addBox(0.07, 0.44, 0.42, -4.28, 0.22, 5.9, lambert(0x8a7648));
    addBox(0.07, 0.44, 0.42, -5.52, 0.22, 5.9, lambert(0x8a7648));
    for (let s = 0; s < 3; s++) {
      addBox(0.26, 0.05, 0.34, -4.7 + s * 0.5, 0.455, 5.9, lambert(0x5a4a3a));
    }
    // kursi salat lansia di sisi belakang kanan (di luar jalur saf)
    const chairMat = lambert(C.chair);
    for (let k = 0; k < 3; k++) {
      const cx = 4.6;
      const cz = 4.9 - k * 0.95;
      addBox(0.5, 0.06, 0.5, cx, 0.46, cz, chairMat);
      addBox(0.5, 0.55, 0.06, cx, 0.75, cz + 0.24, chairMat);
      for (const [ox, oz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as Array<[number, number]>) {
        addBox(0.05, 0.46, 0.05, cx + ox, 0.23, cz + oz, lambert(C.woodDark));
      }
    }
    // placeholder rak mushaf kiri belakang: meja kecil
    addBox(1.0, 0.5, 0.6, -5.9, 0.25, 2.2, lambert(C.wood));
    addBox(0.36, 0.05, 0.5, -5.9, 0.53, 2.2, lambert(C.woodDark));

    /* ---------- Bintang langit luar + debu interior + shaft cahaya ---------- */
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let starsMat: THREE.PointsMaterial | null = null;
    {
      const starPos: number[] = [];
      for (let i = 0; i < 130; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI * 0.42;
        const r = 26;
        starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7 + 4, r * Math.sin(ph) * Math.sin(th));
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      starsMat = new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.09, transparent: true, opacity: 0.9, fog: false });
      const stars = new THREE.Points(starGeo, starsMat);
      stars.position.y = 2;
      scene.add(stars);
      disposables.push(starGeo, starsMat);
    }
    let dust: THREE.Points | null = null;
    if (!reducedMotion) {
      const dustPos: number[] = [];
      for (let i = 0; i < 110; i++) {
        dustPos.push((Math.random() - 0.5) * 11, Math.random() * 3.6 + 0.3, (Math.random() - 0.5) * 11);
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xfff2d8, size: 0.045, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust);
      disposables.push(dustGeo, dustMat);
    }
    // shaft cahaya jendela (plane additive tipis, mengikuti sunI)
    const shaftMats: THREE.MeshBasicMaterial[] = [];
    for (const side of [-1, 1] as const) {
      for (const z of [-3.1, 1.4]) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffe8c0, transparent: true, opacity: 0.07,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.6), mat);
        shaft.position.set(side * 5.6, 1.9, z);
        shaft.rotation.y = side === 1 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5;
        scene.add(shaft);
        shaftMats.push(mat);
      }
    }

    /* ---------- Aplikasi atmosfer ke objek ---------- */
    const bgColor = scene.background as THREE.Color;
    const fogColor = scene.fog!.color;
    const applyAtmos = (a: Atmos, indoorK: number) => {
      hemi.color.setHex(a.hemiSky);
      hemi.groundColor.setHex(a.hemiGround);
      hemi.intensity = a.hemiI * (1 - 0.25 * indoorK);
      amb.color.setHex(a.ambColor);
      amb.intensity = a.ambI * (1 - 0.2 * indoorK) + 0.18 * indoorK;
      sun.color.setHex(a.sunColor);
      sun.intensity = a.sunI * (1 - 0.85 * indoorK);
      sun.position.set(...a.sunPos);
      lampMain.intensity = 14 * a.lampI * (0.75 + 0.25 * indoorK);
      lampNiche.intensity = 7 * a.lampI;
      lampEntry.intensity = 6 * a.lampI;
      const outsideK = 1 - indoorK;
      bgColor.setHex(mixC(a.skyMid, a.fogColor, indoorK));
      fogColor.setHex(mixC(a.fogColor, 0x242c48, indoorK));
      if (starsMat) starsMat.opacity = a.stars * outsideK;
      for (const m of shaftMats) m.opacity = Math.min(0.11, a.sunI * 0.09) * outsideK;
    };
    // panorama jendela dibuat ulang hanya saat rentang waktu bergeser jauh
    let lastWinKey = Math.floor((timeOverride ?? new Date().getHours()) / 3);
    const refreshWindows = (a: Atmos) => {
      const nt = windowTexture(a);
      winMat.map?.dispose();
      winMat.map = nt;
      winMat.needsUpdate = true;
      disposables.push(nt);
    };

    /* ---------- Timeline cinematic masuk ---------- */
    const seen = (() => {
      try {
        return localStorage.getItem("tazkiya-tour-intro") === "seen";
      } catch {
        return false;
      }
    })();
    // durasi: versi singkat bila pengguna pernah menonton intro
    const D = seen ? { approach: 1.1, threshold: 0.8, reveal: 1.0, settle: 0.35 } : { approach: 2.6, threshold: 1.3, reveal: 1.7, settle: 0.5 };
    const P_EXT = { x: 0, y: 1.6, z: 13.5, fov: 62, yaw: 0, pitch: -0.02 };
    const P_DOOR = { x: 0, y: 1.56, z: 5.35, fov: 67, yaw: 0, pitch: -0.01 };
    const P_IN = { x: 0, y: 1.52, z: 3.0, fov: 70, yaw: -0.04, pitch: 0 };
    const P_HOME = { x: 0, y: 1.5, z: 2.3, fov: 72, yaw: 0, pitch: 0 };
    type Stage = "exterior" | "intro" | "explore";
    let stage: Stage = "exterior";
    let t0 = 0;
    const phases: Array<{ dur: number; from: typeof P_EXT; to: typeof P_EXT; kIn: [number, number] }> = [
      { dur: D.approach, from: P_EXT, to: P_DOOR, kIn: [0, 0.06] },
      { dur: D.threshold, from: P_DOOR, to: P_IN, kIn: [0, 1] },
      { dur: D.reveal, from: P_IN, to: P_HOME, kIn: [1, 1] },
      { dur: D.settle, from: P_HOME, to: P_HOME, kIn: [1, 1] },
    ];
    let phaseIdx = 0;
    let phaseStart = 0;
    const camTmp = { x: 0, y: 0, z: 0, fov: 62, yaw: 0, pitch: 0 };
    const lerpCam = (a: typeof P_EXT, b: typeof P_EXT, t: number) => {
      camTmp.x = mix(a.x, b.x, t);
      camTmp.y = mix(a.y, b.y, t);
      camTmp.z = mix(a.z, b.z, t);
      camTmp.fov = mix(a.fov, b.fov, t);
      camTmp.yaw = mix(a.yaw, b.yaw, t);
      camTmp.pitch = mix(a.pitch, b.pitch, t);
    };
    const applyCam = (k: number) => {
      camera.position.set(camTmp.x, camTmp.y, camTmp.z);
      camera.fov = camTmp.fov;
      camera.updateProjectionMatrix();
      camera.rotation.set(camTmp.pitch, camTmp.yaw, 0);
      indoorK = k;
    };
    let indoorK = 0;

    const playIntro = () => {
      if (stage === "intro") return;
      stage = "intro";
      onStageRef.current?.("intro");
      phaseIdx = 0;
      phaseStart = performance.now();
      yawT.current = 0;
      pitchT.current = 0;
      fovT.current = P_EXT.fov;
    };
    const skipIntro = () => {
      if (stage === "explore") return;
      stage = "explore";
      onStageRef.current?.("explore");
      applyCam(1);
      camera.position.set(P_HOME.x, P_HOME.y, P_HOME.z);
      camera.fov = P_HOME.fov;
      camera.updateProjectionMatrix();
      camera.rotation.set(0, 0, 0);
      yaw.v = yawT.current = 0;
      pitch.v = pitchT.current = 0;
      fov.v = fovT.current = P_HOME.fov;
      try {
        localStorage.setItem("tazkiya-tour-intro", "seen");
      } catch {
        /* abaikan */
      }
    };
    apiRef.current = { playIntro, skipIntro };

    /* ---------- Interaksi: geser + ketuk dua kali + pinch/wheel zoom ---------- */
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastTap = 0;
    let moved = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchBase = 0;
    const el = renderer.domElement;
    const interactive = () => stage === "explore";
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!interactive()) return;
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinchBase = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!dragging || !interactive()) return;
      if (pointers.size === 2 && pinchBase > 0) {
        const [p1, p2] = [...pointers.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        fovT.current = Math.max(50, Math.min(78, fovT.current - (d - pinchBase) * 0.12));
        pinchBase = d;
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yawT.current -= dx * 0.005;
      pitchT.current = Math.max(-0.55, Math.min(0.5, pitchT.current - dy * 0.0035));
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchBase = 0;
      if (!dragging) return;
      dragging = false;
      if (moved < 8 && interactive()) {
        const now = Date.now();
        if (now - lastTap < 320) yawT.current = qiblaRef.current;
        lastTap = now;
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!interactive()) return;
      e.preventDefault();
      fovT.current = Math.max(50, Math.min(78, fovT.current + e.deltaY * 0.02));
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    /* ---------- Loop render ---------- */
    let raf = 0;
    let visible = document.visibilityState === "visible";
    const yaw = { v: 0 };
    const pitch = { v: 0 };
    const fov = { v: P_EXT.fov };
    let lastAtmosCheck = performance.now();
    let clockOverrideH: number | null = timeOverride ?? null;
    let curAtmos = atmos0;
    const tick = (nowMs: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      if (stage === "intro") {
        if (phaseIdx < phases.length) {
          const ph = phases[phaseIdx];
          const t = Math.min(1, (nowMs - phaseStart) / (ph.dur * 1000));
          lerpCam(ph.from, ph.to, easeInOut(t));
          const kk = mix(ph.kIn[0], ph.kIn[1], easeInOut(t));
          applyCam(kk);
          // transisi cahaya eksterior→interor mengikuti tiap frame intro
          applyAtmos(curAtmos, indoorK);
          if (t >= 1) {
            phaseIdx++;
            phaseStart = nowMs;
            if (phaseIdx === phases.length) {
              stage = "explore";
              onStageRef.current?.("explore");
              fovT.current = P_HOME.fov;
              yaw.v = yawT.current = 0;
              pitch.v = pitchT.current = 0;
              fov.v = P_HOME.fov;
              try {
                localStorage.setItem("tazkiya-tour-intro", "seen");
              } catch {
                /* abaikan */
              }
            }
          }
        }
      } else if (stage === "explore") {
        yaw.v += (yawT.current - yaw.v) * 0.1;
        pitch.v += (pitchT.current - pitch.v) * 0.1;
        fov.v += (fovT.current - fov.v) * 0.12;
        camera.rotation.set(pitch.v, yaw.v, 0);
        camera.fov = fov.v;
        camera.updateProjectionMatrix();
        indoorK = 1;
      } else {
        // exterior idle: kamera diam bernafas halus (kecuali reduced-motion)
        if (!reducedMotion) {
          const b = Math.sin(nowMs * 0.0006) * 0.012;
          camera.position.set(P_EXT.x, P_EXT.y + b, P_EXT.z);
        } else {
          camera.position.set(P_EXT.x, P_EXT.y, P_EXT.z);
        }
        camera.rotation.set(P_EXT.pitch, P_EXT.yaw, 0);
        camera.fov = P_EXT.fov;
        camera.updateProjectionMatrix();
        indoorK = 0;
      }
      // atmosfer: periksa tiap 30 dtk — perbarui hanya bila jam bergeser
      if (nowMs - lastAtmosCheck > 30_000) {
        lastAtmosCheck = nowMs;
        const h = clockOverrideH ?? new Date().getHours() + new Date().getMinutes() / 60;
        const key = Math.floor(h / 3);
        curAtmos = atmosAt(h);
        applyAtmos(curAtmos, indoorK);
        if (key !== lastWinKey) {
          lastWinKey = key;
          refreshWindows(curAtmos);
        }
      } else if (!lastAppliedAtmosRef.current) {
        lastAppliedAtmosRef.current = true;
        applyAtmos(curAtmos, indoorK);
      }
      // debu halus (drift lambat naik — 110 titik, murah)
      if (dust) {
        const pos = dust.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + 0.0011;
          if (y > 3.9) y = 0.3;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    const lastAppliedAtmosRef = { current: false };

    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);
    onStageRef.current?.("exterior");

    const ro = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
      winMat.map?.dispose();
      latticeMat.map?.dispose();
      disposables.forEach((d) => d.dispose());
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [timeOverride]);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
});

export default MasjidScene;
