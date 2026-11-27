"use client";

/**
 * Tazkiya — Scene interior masjid LOW-POLY PROSEDURAL (tur masjid virtual).
 * TIDAK memakai asset/texture eksternal: seluruh bentuk (dinding, karpet,
 * mihrab lengkung, jendela malam, lampu gantung, sajadah, mimbar) dibangkitkan
 * dari geometri dasar three.js dan diwarnai dari token tema SUIO saat mount.
 *
 * Interaksi: geser = melihat sekeliling (yaw/pitch dengan damping); ketuk dua
 * kali = menghadap arah kibla dari koordinat tersimpan; reset via handle.
 *
 * Performa & kebersihan:
 * - Loop render berhenti saat tab tersembunyi (visibilitychange) dan saat
 *   unmount; geometry/material/texture + WebGL context dibersihkan (dispose).
 * - Pixel ratio dibatasi 2; dua PointLight + Hemisphere — tanpa bayangan.
 * - TANPA auto-motion (menghormati reduced-motion) — hanya bergerak dari input.
 * - WebGL gagal dibuat → onFail() → halaman menampilkan fallback.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export interface MasjidSceneHandle {
  reset: () => void;
  faceQibla: () => void;
}

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/** Teksur gradien malam 4×64 px untuk jendela (dibuat lokal, sangat kecil). */
function nightWindowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, cssVar("--tk-brand-soft", "#f0b27a"));
  g.addColorStop(0.55, cssVar("--tk-canvas-bg", "#292522"));
  g.addColorStop(1, cssVar("--tk-canvas-bg", "#292522"));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}

/** Bentuk lengkung runcing (mihrab/jendela) sebagai Shape 2D. */
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

const MasjidScene = forwardRef<
  MasjidSceneHandle,
  { onFail: () => void; qiblaYaw: number | null }
>(function MasjidScene({ onFail, qiblaYaw }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const yawT = useRef(0);
  const pitchT = useRef(0);
  const qiblaRef = useRef(0);

  useEffect(() => {
    qiblaRef.current = qiblaYaw ?? 0;
  }, [qiblaYaw]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      yawT.current = 0;
      pitchT.current = 0;
    },
    faceQibla: () => {
      yawT.current = qiblaRef.current;
    },
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

    const bg = new THREE.Color(cssVar("--tk-canvas-bg", "#f7f5f2"));
    const scene = new THREE.Scene();
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 10, 26);

    const camera = new THREE.PerspectiveCamera(72, host.clientWidth / host.clientHeight, 0.1, 60);
    camera.position.set(0, 1.5, 3.6);
    camera.rotation.order = "YXZ";

    /* ---------- Cahaya hangat, tanpa bayangan ---------- */
    scene.add(new THREE.HemisphereLight(0xfff2e0, 0x5a4a3a, 1.05));
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const lampGlow = new THREE.PointLight(0xffd9a8, 14, 13, 1.8);
    lampGlow.position.set(0, 3.4, -2.6);
    scene.add(lampGlow);
    const lampGlow2 = new THREE.PointLight(0xffd9a8, 8, 11, 1.8);
    lampGlow2.position.set(0, 3.4, 1.4);
    scene.add(lampGlow2);

    /* ---------- Palet dari token tema SUIO ---------- */
    const wallColor = new THREE.Color(cssVar("--tk-panel", "#ffffff")).multiplyScalar(0.94);
    const floorColor = new THREE.Color(cssVar("--tk-brand-deep", "#b4622d")).multiplyScalar(0.62);
    const softColor = new THREE.Color(cssVar("--tk-panel-soft", "#efe9e2"));
    const accent = new THREE.Color(cssVar("--tk-brand", "#e8802f"));

    const disposables: Array<{ dispose: () => void }> = [];

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshLambertMaterial({ color: floorColor }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshLambertMaterial({ color: softColor.clone().multiplyScalar(0.72) })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.3;
    scene.add(ceiling);

    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const mkWall = (x: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.3), wallMat);
      m.position.set(x, 2.15, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    mkWall(0, -6.5, 0); // dinding mihrab
    mkWall(0, 6.5, Math.PI);
    mkWall(-6.5, 0, Math.PI / 2);
    mkWall(6.5, 0, -Math.PI / 2);

    /* ---------- Mihrab: ceruk gelap + bingkai aksen ---------- */
    const nicheGeo = new THREE.ShapeGeometry(archShape(1.5, 2.3, 0.55));
    const niche = new THREE.Mesh(nicheGeo, new THREE.MeshBasicMaterial({ color: bg.clone().multiplyScalar(0.55) }));
    niche.position.set(0, 0.02, -6.47);
    scene.add(niche);

    const frameGeo = new THREE.ShapeGeometry(archShape(1.74, 2.56, 0.62));
    const frame = new THREE.Mesh(frameGeo, new THREE.MeshLambertMaterial({ color: accent, side: THREE.DoubleSide }));
    frame.position.set(0, 0.02, -6.48);
    scene.add(frame);

    /* ---------- Jendela malam di dinding samping (bingkai di belakang kaca) ---------- */
    const winTex = nightWindowTexture();
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, side: THREE.DoubleSide });
    const winFrameGeo = new THREE.ShapeGeometry(archShape(1.22, 1.92, 0.47));
    const winFrameMat = new THREE.MeshLambertMaterial({ color: accent, side: THREE.DoubleSide });
    for (const side of [-1, 1] as const) {
      for (const z of [-2.6, 1.2]) {
        const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(1.05, 1.7, 0.4)), winMat);
        win.position.set(side * 6.47, 1.5, z);
        win.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        scene.add(win);
        const fr = new THREE.Mesh(winFrameGeo, winFrameMat);
        fr.position.set(side * 6.5, 1.5, z);
        fr.rotation.y = win.rotation.y;
        scene.add(fr);
      }
    }
    disposables.push(winTex);

    /* ---------- Lampu gantung ---------- */
    const cordMat = new THREE.MeshBasicMaterial({ color: 0x3a3230 });
    const shadeMat = new THREE.MeshLambertMaterial({ color: accent });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6bd });
    for (const z of [-3.4, -0.6, 2.2]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1), cordMat);
      cord.position.set(0, 3.75, z);
      scene.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 12, 1, true), shadeMat);
      shade.position.set(0, 3.16, z);
      scene.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), bulbMat);
      bulb.position.set(0, 3.05, z);
      scene.add(bulb);
    }

    /* ---------- Sajadah grid (instanced, satu draw call) ---------- */
    const rugGeo = new THREE.BoxGeometry(0.58, 0.016, 0.95);
    const rugMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(cssVar("--tk-panel-strong", "#f6efe6")) });
    const COLS = 5;
    const ROWS = 4;
    const rugs = new THREE.InstancedMesh(rugGeo, rugMat, COLS * ROWS);
    const m4 = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        m4.setPosition((c - (COLS - 1) / 2) * 0.95, 0.012, -0.4 - r * 1.15);
        rugs.setMatrixAt(i++, m4);
      }
    }
    scene.add(rugs);

    /* ---------- Mimbar dua anak tangga di samping mihrab ---------- */
    const stepMat = new THREE.MeshLambertMaterial({ color: accent.clone().multiplyScalar(0.85) });
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.5), stepMat);
    step1.position.set(1.45, 0.11, -5.5);
    scene.add(step1);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42), stepMat);
    step2.position.set(1.45, 0.21, -5.85);
    scene.add(step2);

    /* ---------- Interaksi: geser + ketuk dua kali ---------- */
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastTap = 0;
    let moved = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      yawT.current -= dx * 0.005;
      pitchT.current = Math.max(-0.55, Math.min(0.5, pitchT.current - dy * 0.0035));
    };
    const onUp = () => {
      dragging = false;
      if (moved < 8) {
        const now = Date.now();
        if (now - lastTap < 320) yawT.current = qiblaRef.current;
        lastTap = now;
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    /* ---------- Loop render: berhenti saat tab tersembunyi ---------- */
    let raf = 0;
    let visible = document.visibilityState === "visible";
    const yaw = { v: 0 };
    const pitch = { v: 0 };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      yaw.v += (yawT.current - yaw.v) * 0.1;
      pitch.v += (pitchT.current - pitch.v) * 0.1;
      camera.rotation.y = yaw.v;
      camera.rotation.x = pitch.v;
      renderer.render(scene, camera);
    };
    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);

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
      ro.disconnect();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
});

export default MasjidScene;
