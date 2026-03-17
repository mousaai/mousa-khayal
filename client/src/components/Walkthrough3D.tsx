/**
 * Walkthrough3D.tsx
 * Design: Parametric Minimalism — dark bg, warm architectural lighting
 * Building: C-shape footprint on 25×43m plot
 * Features: Cinematic tour, FPS walkthrough, multiple viewpoints
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ─── Building Constants ───────────────────────────────────────────────────────
const PLOT_W = 25;
const PLOT_D = 43;
const SETBACK_FRONT = 5;
const SETBACK_BACK = 2;
const FLOOR_H = 3.2;
const FLOORS = 3;
const WING_W = 8;
const BACK_BAR_D = 6;
const BLD_D = PLOT_D - SETBACK_FRONT - SETBACK_BACK; // 36m
const BLD_Z0 = SETBACK_FRONT;
const VOID_W = PLOT_W - 2 * WING_W; // 9m
const VOID_D = BLD_D - BACK_BAR_D;   // 30m
const TOTAL_H = FLOORS * FLOOR_H;    // 9.6m

type CameraMode = "cinematic" | "free" | "top" | "front" | "side";

export default function Walkthrough3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const frameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0.3);
  const pitchRef = useRef(-0.2);
  const lockedRef = useRef(false);
  const cinematicTRef = useRef(0);
  const cinematicPathRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const lookAtPathRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const [mode, setMode] = useState<CameraMode>("cinematic");
  const [fps, setFps] = useState(0);
  const [showHelp, setShowHelp] = useState(true);
  const fpsRef = useRef({ t: 0, n: 0 });
  const modeRef = useRef<CameraMode>("cinematic");

  const switchMode = useCallback((m: CameraMode) => {
    modeRef.current = m;
    setMode(m);
    const cam = cameraRef.current;
    if (!cam) return;
    if (m === "top") {
      cam.position.set(PLOT_W / 2, 65, PLOT_D / 2);
      yawRef.current = 0; pitchRef.current = -Math.PI / 2 + 0.01;
    } else if (m === "front") {
      cam.position.set(PLOT_W / 2, FLOOR_H * 1.5, -18);
      yawRef.current = 0; pitchRef.current = 0;
    } else if (m === "side") {
      cam.position.set(-18, FLOOR_H * 1.5, PLOT_D / 2);
      yawRef.current = Math.PI / 2; pitchRef.current = 0;
    } else if (m === "free") {
      cam.position.set(PLOT_W / 2, 2, -3);
      yawRef.current = 0; pitchRef.current = 0;
    } else if (m === "cinematic") {
      cinematicTRef.current = 0;
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current!;

    // ─── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x0a0c14);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0c14, 0.009);
    sceneRef.current = scene;

    // ─── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 0.1, 600
    );
    camera.position.set(PLOT_W / 2, 35, -25);
    cameraRef.current = camera;

    // ─── Sky ──────────────────────────────────────────────────────────────────
    const skyGeo = new THREE.SphereGeometry(400, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0d1525,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // ─── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x253050, 1.2));

    const sun = new THREE.DirectionalLight(0xfff0d0, 3.5);
    sun.position.set(40, 60, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4070c0, 0.8);
    fill.position.set(-30, 30, 40);
    scene.add(fill);

    scene.add(new THREE.HemisphereLight(0x3060a0, 0x201808, 0.5));

    // Warm point lights for architectural drama
    const warmLight1 = new THREE.PointLight(0xff9040, 2, 20);
    warmLight1.position.set(WING_W / 2, 1, BLD_Z0 + 3);
    scene.add(warmLight1);

    const warmLight2 = new THREE.PointLight(0xff9040, 2, 20);
    warmLight2.position.set(PLOT_W - WING_W / 2, 1, BLD_Z0 + 3);
    scene.add(warmLight2);

    // Courtyard light
    const courtLight = new THREE.PointLight(0x60a0ff, 1.5, 30);
    courtLight.position.set(WING_W + VOID_W / 2, 3, BLD_Z0 + VOID_D / 2);
    scene.add(courtLight);

    // ─── Materials ────────────────────────────────────────────────────────────
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xd4c8b0,
      roughness: 0.82,
      metalness: 0.04,
    });
    const concreteAccentMat = new THREE.MeshStandardMaterial({
      color: 0x8a8070,
      roughness: 0.7,
      metalness: 0.1,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x90b8d8,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.7,
      transparent: true,
      opacity: 0.4,
      reflectivity: 0.8,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.9,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2820,
      roughness: 0.95,
    });
    const pavingMat = new THREE.MeshStandardMaterial({
      color: 0x9a9080,
      roughness: 0.8,
    });
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2a5018,
      roughness: 1.0,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x706858,
      roughness: 0.7,
    });
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.98,
    });

    // ─── Ground ───────────────────────────────────────────────────────────────
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), roadMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(PLOT_W / 2, -0.02, PLOT_D / 2);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Plot
    const plotMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLOT_W, PLOT_D), groundMat);
    plotMesh.rotation.x = -Math.PI / 2;
    plotMesh.position.set(PLOT_W / 2, 0, PLOT_D / 2);
    plotMesh.receiveShadow = true;
    scene.add(plotMesh);

    // Front setback paving
    const frontPave = new THREE.Mesh(new THREE.PlaneGeometry(PLOT_W, SETBACK_FRONT), pavingMat);
    frontPave.rotation.x = -Math.PI / 2;
    frontPave.position.set(PLOT_W / 2, 0.01, SETBACK_FRONT / 2);
    frontPave.receiveShadow = true;
    scene.add(frontPave);

    // Back garden
    const backGarden = new THREE.Mesh(new THREE.PlaneGeometry(PLOT_W, SETBACK_BACK), grassMat);
    backGarden.rotation.x = -Math.PI / 2;
    backGarden.position.set(PLOT_W / 2, 0.01, PLOT_D - SETBACK_BACK / 2);
    backGarden.receiveShadow = true;
    scene.add(backGarden);

    // Courtyard grass
    const courtGrass = new THREE.Mesh(new THREE.PlaneGeometry(VOID_W, VOID_D), grassMat);
    courtGrass.rotation.x = -Math.PI / 2;
    courtGrass.position.set(WING_W + VOID_W / 2, 0.01, BLD_Z0 + VOID_D / 2);
    courtGrass.receiveShadow = true;
    scene.add(courtGrass);

    // ─── Building — C-shape (3 boxes) ─────────────────────────────────────────
    function box(
      x: number, z: number, w: number, d: number, h: number,
      mat: THREE.Material
    ) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x + w / 2, h / 2, z + d / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    }

    // Left wing
    box(0, BLD_Z0, WING_W, BLD_D, TOTAL_H, concreteMat);
    // Right wing
    box(PLOT_W - WING_W, BLD_Z0, WING_W, BLD_D, TOTAL_H, concreteMat);
    // Back bar
    box(WING_W, BLD_Z0 + BLD_D - BACK_BAR_D, VOID_W, BACK_BAR_D, TOTAL_H, concreteMat);

    // ─── Floor bands ──────────────────────────────────────────────────────────
    for (let f = 1; f < FLOORS; f++) {
      const y = f * FLOOR_H;
      const bh = 0.18;
      // Left wing band
      const lw = new THREE.Mesh(new THREE.BoxGeometry(WING_W + 0.04, bh, BLD_D + 0.04), concreteAccentMat);
      lw.position.set(WING_W / 2, y, BLD_Z0 + BLD_D / 2);
      scene.add(lw);
      // Right wing band
      const rw = lw.clone();
      rw.position.set(PLOT_W - WING_W / 2, y, BLD_Z0 + BLD_D / 2);
      scene.add(rw);
      // Back bar band
      const bb = new THREE.Mesh(new THREE.BoxGeometry(VOID_W + 0.04, bh, BACK_BAR_D + 0.04), concreteAccentMat);
      bb.position.set(WING_W + VOID_W / 2, y, BLD_Z0 + BLD_D - BACK_BAR_D / 2);
      scene.add(bb);
    }

    // ─── Roof parapets ────────────────────────────────────────────────────────
    function parapet(x: number, z: number, w: number, d: number) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), roofMat);
      m.position.set(x + w / 2, TOTAL_H + 0.3, z + d / 2);
      m.castShadow = true;
      scene.add(m);
    }
    parapet(0, BLD_Z0, WING_W, BLD_D);
    parapet(PLOT_W - WING_W, BLD_Z0, WING_W, BLD_D);
    parapet(WING_W, BLD_Z0 + BLD_D - BACK_BAR_D, VOID_W, BACK_BAR_D);

    // Roof slabs
    function roofSlab(x: number, z: number, w: number, d: number) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), roofMat);
      m.position.set(x + w / 2, TOTAL_H + 0.125, z + d / 2);
      m.receiveShadow = true;
      scene.add(m);
    }
    roofSlab(0, BLD_Z0, WING_W, BLD_D);
    roofSlab(PLOT_W - WING_W, BLD_Z0, WING_W, BLD_D);
    roofSlab(WING_W, BLD_Z0 + BLD_D - BACK_BAR_D, VOID_W, BACK_BAR_D);

    // ─── Windows ──────────────────────────────────────────────────────────────
    function addWindowRow(
      startX: number, startZ: number,
      axis: "x" | "z", length: number,
      count: number, floors: number
    ) {
      const wW = 1.6, wH = 1.5, wD = 0.08, sill = 0.85;
      for (let f = 0; f < floors; f++) {
        const y = f * FLOOR_H + sill + wH / 2;
        for (let i = 0; i < count; i++) {
          const t = (i + 1) / (count + 1);
          const frameG = new THREE.BoxGeometry(
            axis === "z" ? wW + 0.12 : wD + 0.12,
            wH + 0.12,
            axis === "x" ? wW + 0.12 : wD + 0.12
          );
          const fm = new THREE.Mesh(frameG, frameMat);
          const glassG = new THREE.BoxGeometry(
            axis === "z" ? wW : wD,
            wH,
            axis === "x" ? wW : wD
          );
          const gm = new THREE.Mesh(glassG, glassMat);
          const px = axis === "z" ? startX + t * length : startX;
          const pz = axis === "x" ? startZ + t * length : startZ;
          fm.position.set(px, y, pz);
          gm.position.set(px, y, pz);
          fm.castShadow = true;
          scene.add(fm);
          scene.add(gm);
        }
      }
    }

    // Front facade (facing street)
    addWindowRow(0, BLD_Z0, "z", WING_W, 2, FLOORS);
    addWindowRow(PLOT_W - WING_W, BLD_Z0, "z", WING_W, 2, FLOORS);
    // Courtyard inner faces
    addWindowRow(WING_W, BLD_Z0, "x", VOID_D, 5, FLOORS);
    addWindowRow(PLOT_W - WING_W, BLD_Z0, "x", VOID_D, 5, FLOORS);
    // Back bar courtyard face
    addWindowRow(WING_W, BLD_Z0 + BLD_D - BACK_BAR_D, "z", VOID_W, 3, FLOORS);
    // Outer side faces
    addWindowRow(0, BLD_Z0, "x", BLD_D, 4, FLOORS);
    addWindowRow(PLOT_W, BLD_Z0, "x", BLD_D, 4, FLOORS);

    // ─── Entrance canopies ────────────────────────────────────────────────────
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.95 });
    function canopy(x: number, z: number, w: number) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 2.5), canopyMat);
      m.position.set(x, FLOOR_H * 0.72, z);
      m.castShadow = true;
      scene.add(m);
      // Support columns
      for (let i = 0; i < 2; i++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, FLOOR_H * 0.72, 8), canopyMat);
        col.position.set(x - w / 2 + w * (i / 1) * 0.8 + w * 0.1, FLOOR_H * 0.36, z - 1);
        scene.add(col);
      }
    }
    canopy(WING_W / 2, BLD_Z0 - 1.25, WING_W * 0.7);
    canopy(PLOT_W - WING_W / 2, BLD_Z0 - 1.25, WING_W * 0.7);

    // ─── Boundary wall ────────────────────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x706050, roughness: 0.9 });
    // Front boundary wall
    const fw = new THREE.Mesh(new THREE.BoxGeometry(PLOT_W, 1.2, 0.2), wallMat);
    fw.position.set(PLOT_W / 2, 0.6, 0.1);
    fw.castShadow = true;
    scene.add(fw);
    // Side walls
    const sw1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, PLOT_D), wallMat);
    sw1.position.set(0.1, 0.6, PLOT_D / 2);
    sw1.castShadow = true;
    scene.add(sw1);
    const sw2 = sw1.clone();
    sw2.position.set(PLOT_W - 0.1, 0.6, PLOT_D / 2);
    scene.add(sw2);

    // Gate opening in front wall
    const gatePost1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.4), wallMat);
    gatePost1.position.set(WING_W / 2 - 1.5, 0.9, 0.2);
    scene.add(gatePost1);
    const gatePost2 = gatePost1.clone();
    gatePost2.position.set(WING_W / 2 + 1.5, 0.9, 0.2);
    scene.add(gatePost2);
    const gatePost3 = gatePost1.clone();
    gatePost3.position.set(PLOT_W - WING_W / 2 - 1.5, 0.9, 0.2);
    scene.add(gatePost3);
    const gatePost4 = gatePost1.clone();
    gatePost4.position.set(PLOT_W - WING_W / 2 + 1.5, 0.9, 0.2);
    scene.add(gatePost4);

    // ─── Driveway ─────────────────────────────────────────────────────────────
    const driveMat = new THREE.MeshStandardMaterial({ color: 0x3a3830, roughness: 0.9 });
    const drive1 = new THREE.Mesh(new THREE.PlaneGeometry(3, SETBACK_FRONT), driveMat);
    drive1.rotation.x = -Math.PI / 2;
    drive1.position.set(WING_W / 2, 0.015, SETBACK_FRONT / 2);
    scene.add(drive1);
    const drive2 = drive1.clone();
    drive2.position.set(PLOT_W - WING_W / 2, 0.015, SETBACK_FRONT / 2);
    scene.add(drive2);

    // ─── Trees ────────────────────────────────────────────────────────────────
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 1.0 });
    const leafColors = [0x2d5a1e, 0x3a6b25, 0x234d18];

    function tree(x: number, z: number, h = 4.5) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColors[Math.floor(Math.random() * 3)],
        roughness: 1.0,
      });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.38, 7), trunkMat);
      trunk.position.set(x, h * 0.19, z);
      trunk.castShadow = true;
      scene.add(trunk);
      // Multi-layer canopy
      for (let i = 0; i < 3; i++) {
        const r = h * (0.28 - i * 0.04);
        const canopyMesh = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMat);
        canopyMesh.position.set(
          x + (Math.random() - 0.5) * 0.4,
          h * (0.45 + i * 0.15),
          z + (Math.random() - 0.5) * 0.4
        );
        canopyMesh.castShadow = true;
        scene.add(canopyMesh);
      }
    }

    // Front garden
    tree(2.5, 1.5, 4);
    tree(7, 2.5, 5);
    tree(13, 1.8, 4.5);
    tree(19, 2.2, 4.2);
    tree(22.5, 1.5, 3.8);

    // Courtyard
    tree(WING_W + VOID_W * 0.2, BLD_Z0 + VOID_D * 0.25, 5.5);
    tree(WING_W + VOID_W * 0.8, BLD_Z0 + VOID_D * 0.65, 5);
    tree(WING_W + VOID_W * 0.5, BLD_Z0 + VOID_D * 0.45, 4.5);

    // Side trees
    tree(-3, 10, 5);
    tree(-3, 22, 4.5);
    tree(PLOT_W + 3, 15, 5);

    // ─── Street elements ──────────────────────────────────────────────────────
    // Sidewalk
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x888070, roughness: 0.85 });
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(PLOT_W + 10, 4), sidewalkMat);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(PLOT_W / 2, 0.005, -2);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);

    // Street lamp posts
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const lampLight1 = new THREE.PointLight(0xffd080, 3, 15);
    lampLight1.position.set(-3, 5, -2);
    scene.add(lampLight1);
    const lampPost1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), lampMat);
    lampPost1.position.set(-3, 2.5, -2);
    scene.add(lampPost1);

    const lampLight2 = new THREE.PointLight(0xffd080, 3, 15);
    lampLight2.position.set(PLOT_W + 3, 5, -2);
    scene.add(lampLight2);
    const lampPost2 = lampPost1.clone();
    lampPost2.position.set(PLOT_W + 3, 2.5, -2);
    scene.add(lampPost2);

    // ─── Plot boundary lines ──────────────────────────────────────────────────
    const boundMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 });
    const bpts = [
      new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(PLOT_W, 0.08, 0),
      new THREE.Vector3(PLOT_W, 0.08, PLOT_D), new THREE.Vector3(0, 0.08, PLOT_D),
      new THREE.Vector3(0, 0.08, 0),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bpts), boundMat));

    // Setback lines
    const sbMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.4 });
    const sbFront = [
      new THREE.Vector3(0, 0.08, SETBACK_FRONT),
      new THREE.Vector3(PLOT_W, 0.08, SETBACK_FRONT),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbFront), sbMat));
    const sbBack = [
      new THREE.Vector3(0, 0.08, PLOT_D - SETBACK_BACK),
      new THREE.Vector3(PLOT_W, 0.08, PLOT_D - SETBACK_BACK),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbBack), sbMat));

    // ─── Dimension labels ─────────────────────────────────────────────────────
    function label(text: string, x: number, y: number, z: number, scale = 1) {
      const c = document.createElement("canvas");
      c.width = 320; c.height = 72;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 320, 72);
      ctx.fillStyle = "rgba(8,12,24,0.85)";
      ctx.roundRect(3, 3, 314, 66, 10);
      ctx.fill();
      ctx.strokeStyle = "#4488ff";
      ctx.lineWidth = 1.5;
      ctx.roundRect(3, 3, 314, 66, 10);
      ctx.stroke();
      ctx.fillStyle = "#88ccff";
      ctx.font = "bold 30px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 160, 36);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.position.set(x, y, z);
      sp.scale.set(6 * scale, 1.35 * scale, 1);
      scene.add(sp);
    }

    label("25 م عرض", PLOT_W / 2, 0.6, -4.5);
    label("43 م عمق", -6, 0.6, PLOT_D / 2);
    label("ارتداد أمامي 5م", PLOT_W / 2, 0.6, SETBACK_FRONT / 2, 0.9);
    label("ارتداد خلفي 2م", PLOT_W / 2, 0.6, PLOT_D - 1, 0.9);
    label(`H = ${TOTAL_H}م`, -7, TOTAL_H / 2, BLD_Z0 + BLD_D / 2, 0.85);
    label("فناء داخلي", WING_W + VOID_W / 2, 0.6, BLD_Z0 + VOID_D / 2, 0.85);

    // ─── Cinematic paths ──────────────────────────────────────────────────────
    cinematicPathRef.current = new THREE.CatmullRomCurve3([
      new THREE.Vector3(PLOT_W / 2, 40, -30),
      new THREE.Vector3(PLOT_W / 2, 22, -12),
      new THREE.Vector3(PLOT_W / 2, 10, 0),
      new THREE.Vector3(4, 4, 2),
      new THREE.Vector3(2, 2.5, 12),
      new THREE.Vector3(2, 2.5, BLD_Z0 + BLD_D * 0.5),
      new THREE.Vector3(WING_W + VOID_W / 2, 2.5, BLD_Z0 + 4),
      new THREE.Vector3(WING_W + VOID_W / 2, 3, BLD_Z0 + VOID_D * 0.5),
      new THREE.Vector3(WING_W + VOID_W / 2, 4, BLD_Z0 + VOID_D - 2),
      new THREE.Vector3(PLOT_W - 2, 3, BLD_Z0 + BLD_D * 0.6),
      new THREE.Vector3(PLOT_W + 8, 6, PLOT_D / 2),
      new THREE.Vector3(PLOT_W + 12, 18, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 50, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 40, -30),
    ], true);

    lookAtPathRef.current = new THREE.CatmullRomCurve3([
      new THREE.Vector3(PLOT_W / 2, 0, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 0, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 2, BLD_Z0),
      new THREE.Vector3(WING_W / 2, 2, BLD_Z0 + 5),
      new THREE.Vector3(WING_W / 2, 2, BLD_Z0 + 15),
      new THREE.Vector3(WING_W / 2, 2, BLD_Z0 + 25),
      new THREE.Vector3(WING_W + VOID_W / 2, 2, BLD_Z0 + VOID_D / 2),
      new THREE.Vector3(WING_W + VOID_W / 2, 3, BLD_Z0 + VOID_D),
      new THREE.Vector3(WING_W + VOID_W / 2, 3, BLD_Z0 + VOID_D),
      new THREE.Vector3(PLOT_W / 2, 3, BLD_Z0 + BLD_D / 2),
      new THREE.Vector3(PLOT_W / 2, 5, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 8, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 0, PLOT_D / 2),
      new THREE.Vector3(PLOT_W / 2, 0, PLOT_D / 2),
    ], true);

    // ─── Animation loop ───────────────────────────────────────────────────────
    let last = performance.now();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      fpsRef.current.n++;
      if (now - fpsRef.current.t > 600) {
        setFps(Math.round(fpsRef.current.n / ((now - fpsRef.current.t) / 1000)));
        fpsRef.current = { t: now, n: 0 };
      }

      const cam = cameraRef.current!;
      const currentMode = modeRef.current;

      if (currentMode === "cinematic") {
        cinematicTRef.current = (cinematicTRef.current + 0.00045) % 1;
        const t = cinematicTRef.current;
        const pos = cinematicPathRef.current!.getPoint(t);
        const look = lookAtPathRef.current!.getPoint(t);
        cam.position.copy(pos);
        cam.lookAt(look);
      } else {
        // FPS controls
        const spd = (keysRef.current.has("ShiftLeft") || keysRef.current.has("ShiftRight")) ? 14 : 6;
        const fwd = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
        const rgt = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));

        if (keysRef.current.has("KeyW") || keysRef.current.has("ArrowUp")) cam.position.addScaledVector(fwd, spd * dt);
        if (keysRef.current.has("KeyS") || keysRef.current.has("ArrowDown")) cam.position.addScaledVector(fwd, -spd * dt);
        if (keysRef.current.has("KeyA") || keysRef.current.has("ArrowLeft")) cam.position.addScaledVector(rgt, -spd * dt);
        if (keysRef.current.has("KeyD") || keysRef.current.has("ArrowRight")) cam.position.addScaledVector(rgt, spd * dt);
        if (keysRef.current.has("Space") || keysRef.current.has("KeyQ")) cam.position.y += spd * dt;
        if (keysRef.current.has("ControlLeft") || keysRef.current.has("KeyE")) cam.position.y -= spd * dt;
        cam.position.y = Math.max(0.4, cam.position.y);

        cam.quaternion.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ"));
      }

      // Animate warm lights
      const t2 = now * 0.001;
      warmLight1.intensity = 2 + Math.sin(t2 * 0.7) * 0.3;
      warmLight2.intensity = 2 + Math.sin(t2 * 0.9 + 1) * 0.3;

      renderer.render(scene, cam);
    };

    animate();

    // ─── Event handlers ───────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Escape") document.exitPointerLock();
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      yawRef.current -= e.movementX * 0.0022;
      pitchRef.current = Math.max(-1.4, Math.min(1.4, pitchRef.current - e.movementY * 0.0022));
    };
    const onPLChange = () => { lockedRef.current = document.pointerLockElement === container; };
    const onClick = () => {
      if (modeRef.current === "free") container.requestPointerLock();
    };
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPLChange);
    container.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPLChange);
      container.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  return (
    <div className="relative w-full h-full bg-[#0a0c14]">
      {/* Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-300/90 font-mono text-xs tracking-[0.2em] uppercase">
            Tashkila House · نموذج معماري ثلاثي الأبعاد
          </span>
        </div>
        <span className="text-blue-500/50 font-mono text-xs">{fps} fps</span>
      </div>

      {/* Info panel */}
      <div className="absolute top-12 left-5 bg-[#080c18]/80 backdrop-blur-md border border-blue-500/15 rounded-xl p-4 pointer-events-none">
        <div className="text-blue-400 font-mono text-xs font-bold mb-3 tracking-widest uppercase">مواصفات المبنى</div>
        <div className="space-y-1.5 text-xs font-mono">
          {[
            ["مساحة الأرض", "25 × 43 م"],
            ["الارتداد الأمامي", "5 م"],
            ["الارتداد الخلفي", "2 م"],
            ["شكل المبنى", "C من الأعلى"],
            ["عدد الطوابق", "3 طوابق"],
            ["ارتفاع الطابق", "3.2 م"],
            ["الارتفاع الكلي", "9.6 م"],
            ["الجناح الجانبي", "8 م عرض"],
            ["الفناء الداخلي", "9 × 30 م"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6">
              <span className="text-blue-300/50">{k}</span>
              <span className="text-blue-200">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-12 right-5 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-[#080c18]/80 backdrop-blur-md border border-blue-500/15 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-5 bg-gradient-to-t from-transparent to-red-400 absolute top-1.5" />
            <div className="w-px h-5 bg-gradient-to-b from-transparent to-blue-400 absolute bottom-1.5" />
          </div>
          <div className="text-[9px] font-mono text-blue-300/60 absolute top-1">N</div>
          <div className="text-[9px] font-mono text-blue-300/40 absolute bottom-1">S</div>
          <div className="text-[9px] font-mono text-blue-300/40 absolute left-1">W</div>
          <div className="text-[9px] font-mono text-blue-300/40 absolute right-1">E</div>
        </div>
      </div>

      {/* Mode buttons */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        {([
          ["cinematic", "🎬", "سينمائي"],
          ["free", "🚶", "تجوال حر"],
          ["top", "🗺️", "مسقط"],
          ["front", "🏠", "واجهة"],
          ["side", "📐", "جانبي"],
        ] as [CameraMode, string, string][]).map(([m, icon, label]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 border flex items-center gap-1.5 ${
              mode === m
                ? "bg-blue-500/25 border-blue-400/60 text-blue-100 shadow-md shadow-blue-500/20"
                : "bg-[#080c18]/70 border-blue-500/15 text-blue-400/50 hover:border-blue-400/40 hover:text-blue-300"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="absolute bottom-16 right-5 bg-[#080c18]/85 backdrop-blur-md border border-blue-500/15 rounded-xl p-4 text-xs font-mono pointer-events-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-blue-300 font-bold text-xs tracking-widest uppercase">تحكم التجوال الحر</span>
            <button onClick={() => setShowHelp(false)} className="text-blue-500/40 hover:text-blue-300 ml-4 text-base leading-none">×</button>
          </div>
          <div className="space-y-1.5 text-blue-300/50">
            <div className="flex gap-3"><span className="text-blue-400/70 w-24">W A S D</span><span>تحرك</span></div>
            <div className="flex gap-3"><span className="text-blue-400/70 w-24">الفأرة</span><span>انظر حولك</span></div>
            <div className="flex gap-3"><span className="text-blue-400/70 w-24">Space / Q</span><span>ارتفع</span></div>
            <div className="flex gap-3"><span className="text-blue-400/70 w-24">Ctrl / E</span><span>انخفض</span></div>
            <div className="flex gap-3"><span className="text-blue-400/70 w-24">Shift</span><span>تسريع</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/10 text-blue-400/40">
            انقر على الشاشة لتفعيل التجوال
          </div>
        </div>
      )}

      {/* Free mode lock hint */}
      {mode === "free" && !lockedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#080c18]/75 backdrop-blur-sm border border-blue-400/30 rounded-2xl px-8 py-5 text-center">
            <div className="text-blue-300 font-mono text-base mb-1">انقر للدخول في وضع التجوال</div>
            <div className="text-blue-400/40 font-mono text-xs">اضغط Esc للخروج</div>
          </div>
        </div>
      )}
    </div>
  );
}
