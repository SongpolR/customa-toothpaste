"use client";

import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { buildPasteGeometry, growPaste, pasteMaterial } from "./Paste";
import { labelFamily } from "@/lib/label";

// Organic bamboo toothbrush: flat, softly rounded handle with natural grain, a
// bamboo node and a laser-engraved logo; a slim neck; an oval head with
// charcoal bristles trimmed to a gentle wave. Head spans x ∈ [-1.05, 1.0];
// the handle runs off towards +x. Local +y is "bristles up".

export const BRUSH = {
  /** paste ribbon spans x ∈ [-head, head] on top of the bristles */
  head: 0.88,
};

export type BrushPhase = {
  /** 0..1 how much ribbon is laid, starting at the handle end */
  ribbon: number;
  /** 0..1 paste used up while brushing */
  used: number;
  /** 0..1 paste flowing out of the nozzle into the ribbon (0 = no bridge) */
  flow: number;
  /** nozzle tip relative to the ribbon front, in brush-local space */
  nozzle: THREE.Vector3;
  /** unit direction the nozzle points (paste leaves along this) */
  nozzleDir: THREE.Vector3;
};

const TOP = 0.08; // top surface of the head
const PASTE_R = 0.11;

/** Bristle length along the head: a gentle wave, slightly taller at the tip. */
function bristleLength(x: number) {
  const tip = THREE.MathUtils.smoothstep(-x, 0.55, 0.75) * 0.04;
  return 0.34 + 0.03 * Math.sin(((x + 0.93) / 0.103) * 0.9) + tip;
}
/** y of the bristle tops on the centre rows */
const bristleTop = (x: number) => TOP - 0.01 + bristleLength(x);

/** Ribbon path: from the handle end of the head towards the tip, resting on the
 *  bristle tops (sunk in a little, as soft paste does). */
const RIBBON = new THREE.CatmullRomCurve3(
  Array.from({ length: 61 }, (_, i) => {
    const x = BRUSH.head - (i / 60) * BRUSH.head * 2;
    return new THREE.Vector3(x, bristleTop(x) + PASTE_R * 0.75, 0.03 * Math.sin(x * 6));
  }),
);

/** Where the ribbon's growing front is — the tube's nozzle follows this point. */
export function ribbonFront(g: number, out = new THREE.Vector3()) {
  return RIBBON.getPointAt(Math.min(1, Math.max(0, g)), out);
}

/* ------------------------------------------------------------------ */

const OUTLINE: [number, number][] = [
  [-1.06, 0],
  [-1.0, 0.12],
  [-0.85, 0.2],
  [-0.5, 0.245],
  [0, 0.25],
  [0.5, 0.22],
  [0.85, 0.16],
  [1.15, 0.115],
  [1.5, 0.13],
  [2.2, 0.175],
  [3.2, 0.2],
  [4.25, 0.2],
  [4.5, 0.15],
  [4.6, 0],
];

function halfWidth(x: number) {
  for (let i = 1; i < OUTLINE.length; i++) {
    const [x1, w1] = OUTLINE[i];
    if (x <= x1) {
      const [x0, w0] = OUTLINE[i - 1];
      return w0 + ((w1 - w0) * (x - x0)) / (x1 - x0);
    }
  }
  return 0;
}

function buildBody() {
  const top = new THREE.SplineCurve(OUTLINE.map(([x, w]) => new THREE.Vector2(x, w))).getPoints(140);
  const shape = new THREE.Shape();
  top.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
  [...top].reverse().forEach((p) => shape.lineTo(p.x, -p.y));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 24,
  });
  // shape lies in XY and extrudes along +Z → turn it so thickness is vertical
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, TOP - 0.13, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Bamboo grain along the length, one node, and an engraved logo. */
function bambooTexture() {
  const W = 2048;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#d9b77f");
  grad.addColorStop(0.5, "#e6c995");
  grad.addColorStop(1, "#d4b07a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const y = rand() * H;
    ctx.strokeStyle = `rgba(${120 + rand() * 40},${80 + rand() * 30},${40},${0.08 + rand() * 0.18})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 1.5);
    ctx.stroke();
  }
  // world x → u : x ∈ [-1.1, 4.7]
  const u = (x: number) => ((x + 1.1) / 5.8) * W;
  // bamboo node on the handle
  ctx.fillStyle = "rgba(110,70,30,0.35)";
  // node sits where the neck meets the handle, clear of the engraving
  ctx.fillRect(u(1.8), 0, 6, H);
  ctx.fillStyle = "rgba(255,240,210,0.35)";
  ctx.fillRect(u(1.8) + 6, 0, 4, H);
  ctx.fillStyle = "rgba(110,70,30,0.2)";
  ctx.fillRect(u(1.8) + 12, 0, 3, H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // ExtrudeGeometry top/bottom UVs are raw shape coords (x, width)
  tex.repeat.set(1 / 5.8, 1 / 0.6);
  tex.offset.set(1.1 / 5.8, 0.3 / 0.6);
  return tex;
}

/**
 * Laser-engraved logo as its own decal (one on top of the handle, one on the
 * underside), each oriented to read correctly from where it is seen. Putting it
 * in the shared wood texture made the underside copy read mirrored/upside down.
 */
function logoTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 210;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(88,54,24,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // spread the letters over the whole decal width, like a laser-etched handle
  const word = "CUSTOMA";
  ctx.font = `600 150px ${labelFamily()}`;
  const step = (c.width - 160) / (word.length - 1);
  [...word].forEach((ch, i) => ctx.fillText(ch, 80 + i * step, c.height / 2 + 6));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
/** runs along most of the flat handle (x ≈ 2.0 … 4.3) */
const LOGO = { x: 3.15, w: 2.3, h: 0.24 };

/** Tuft layout on the oval head, trimmed to a gentle wave with a taller tip. */
function tuftLayout() {
  const tufts: { x: number; z: number; h: number }[] = [];
  for (let col = 0; col < 19; col++) {
    const x = -0.93 + col * 0.103;
    const hw = halfWidth(x) - 0.05;
    for (const z of [-0.16, -0.08, 0, 0.08, 0.16]) {
      if (Math.abs(z) > hw) continue;
      const h = bristleLength(x) - Math.abs(z) * 0.12;
      tufts.push({ x, z, h });
    }
  }
  return tufts;
}

type Props = {
  pasteColor: string;
  phase: BrushPhase;
} & ThreeElements["group"];

export const Toothbrush = forwardRef<THREE.Group, Props>(function Toothbrush({ pasteColor, phase, ...group }, ref) {
  const bristles = useRef<THREE.InstancedMesh>(null);
  const ribbonMesh = useRef<THREE.Mesh>(null);
  const tufts = useMemo(() => tuftLayout(), []);

  const geos = useMemo(
    () => ({
      body: buildBody(),
      // both ends rounded: where the squeeze started and where it stopped
      ribbon: buildPasteGeometry(RIBBON, { steps: 200, radius: PASTE_R, taper: 0.1, taperStart: 0.05, wobble: 0 }),
      tuft: new THREE.CylinderGeometry(0.038, 0.034, 1, 8).translate(0, 0.5, 0),
    }),
    [],
  );

  const mats = useMemo(
    () => ({
      bamboo: new THREE.MeshStandardMaterial({ roughness: 0.55, map: bambooTexture() }),
      bristle: new THREE.MeshStandardMaterial({ roughness: 0.75, color: "#2a2826" }),
      paste: Object.assign(pasteMaterial(), { transparent: true }),
      logo: new THREE.MeshBasicMaterial({
        map: logoTexture(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    }),
    [],
  );
  mats.paste.color.set(pasteColor);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    tufts.forEach((tf, i) => {
      m.makeScale(1, tf.h, 1).setPosition(tf.x, TOP - 0.01, tf.z);
      bristles.current!.setMatrixAt(i, m);
    });
    bristles.current!.instanceMatrix.needsUpdate = true;
    // re-run if the instanced mesh is recreated (e.g. after a hot reload)
  }, [geos, tufts]);

  // While squeezing, the laid ribbon and the paste still coming out of the
  // nozzle are ONE mesh swept along one path (laid part → bend → into the
  // nozzle). Two overlapping meshes always leave a visible intersection seam;
  // a single sweep has none. When the squeeze ends the static ribbon takes over.
  const live = useRef<THREE.Mesh>(null);
  const liveKey = useRef("");
  const tmp = useMemo(
    () => ({
      a: new THREE.Vector3(),
      a2: new THREE.Vector3(),
      b2: new THREE.Vector3(),
      b: new THREE.Vector3(),
      tan: new THREE.Vector3(),
    }),
    [],
  );
  const ribbonLen = useMemo(() => RIBBON.getLength(), []);

  const last = useRef(-1);
  useFrame(() => {
    const g = Math.min(1, Math.max(0, phase.ribbon));
    const used = Math.min(1, Math.max(0, phase.used));
    // while brushing, the paste simply melts away (fades out). The material is
    // always "transparent" — flipping that flag at runtime left a stale shader
    // (paste turned dark after scrolling back up).
    mats.paste.opacity = 1 - used;
    // the stream thins and snaps off as the squeeze finishes
    const k = phase.flow * (1 - THREE.MathUtils.smoothstep(g, 0.9, 1));
    const squeezing = k > 0.02 && g > 0.002 && g < 0.995;

    const lv = live.current!;
    lv.visible = squeezing;
    ribbonMesh.current!.visible = !squeezing && g > 0.005 && used < 0.98;

    if (!squeezing) {
      if (Math.abs(g - last.current) > 0.002) {
        last.current = g;
        growPaste(geos.ribbon, g);
      }
      return;
    }

    const key = `${g.toFixed(3)}|${k.toFixed(2)}|${phase.nozzle.toArray().map((v) => v.toFixed(3))}|${phase.nozzleDir.toArray().map((v) => v.toFixed(3))}`;
    if (key === liveKey.current) return;
    liveKey.current = key;

    const { a, a2, b2, b, tan } = tmp;
    // laid part: samples of the ribbon path up to the front
    const pts: THREE.Vector3[] = [];
    const n = Math.max(2, Math.round(g * 90));
    for (let i = 0; i <= n; i++) pts.push(RIBBON.getPointAt((g * i) / n));
    // stream: continue straight on from the front, bend up into the nozzle
    ribbonFront(g, a);
    RIBBON.getTangentAt(g, tan);
    a2.copy(a).addScaledVector(tan, 0.14);
    b.copy(a).add(phase.nozzle).addScaledVector(phase.nozzleDir, -0.06); // ends inside the nozzle
    b2.copy(a).add(phase.nozzle).addScaledVector(phase.nozzleDir, 0.16);
    const stream = new THREE.CubicBezierCurve3(a, a2, b2, b);
    for (let i = 1; i <= 16; i++) pts.push(stream.getPoint(i / 16));
    const path = new THREE.CatmullRomCurve3(pts, false, "centripetal");

    const laid = ribbonLen * g;
    const total = laid + stream.getLength();
    const thin = 0.4 + 0.6 * k;
    lv.geometry.dispose();
    lv.geometry = buildPasteGeometry(path, {
      steps: 60 + Math.round(g * 150),
      radius: PASTE_R,
      radial: 36,
      taper: 0.0001,
      wobble: 0,
      radiusAt: (t) => {
        const s = t * total;
        // rounded start (same as the static ribbon's taperStart)
        let r = s < 0.09 ? Math.sqrt(Math.max(s, 0.0001) / 0.09) : 1;
        if (s > laid) {
          const u = (s - laid) / (total - laid);
          r *= THREE.MathUtils.lerp(1, thin, THREE.MathUtils.smoothstep(u, 0, 0.35));
          // as wide as the nozzle hole where it goes in
          r *= THREE.MathUtils.lerp(1, 0.86, THREE.MathUtils.smoothstep(u, 0.55, 0.95));
        }
        return r;
      },
    });
  });

  return (
    <group ref={ref} {...group}>
      <mesh geometry={geos.body} material={mats.bamboo} castShadow />
      {/* engraved logo: top face (reads from above/front), underside (reads in the brushing shot) */}
      <mesh material={mats.logo} position={[LOGO.x, TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LOGO.w, LOGO.h]} />
      </mesh>
      <mesh material={mats.logo} position={[LOGO.x, -TOP - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LOGO.w, LOGO.h]} />
      </mesh>
      <instancedMesh ref={bristles} args={[geos.tuft, mats.bristle, tufts.length]} />
      <mesh ref={ribbonMesh} geometry={geos.ribbon} material={mats.paste} />
      <mesh ref={live} material={mats.paste} visible={false} />
    </group>
  );
});
