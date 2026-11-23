"use client";

import { forwardRef, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

// A paper toothpaste tube, built procedurally:
//  - body: round at the shoulder, gradually flattening into a crimped seal
//  - shoulder + neck + cap at the bottom (tube stands on its cap)
// u wraps around the body (u = 0.5 faces +Z), v runs cap → crimp.

// Real-world reference: body Ø ≈ 35 mm (0.84 units) → 1 unit ≈ 42 mm.
// Cap Ø ≈ 23 mm × 17 mm tall, threaded neck Ø ≈ 12 mm × 11 mm, nozzle Ø ≈ 8 mm.
export const TUBE = {
  length: 3.1,
  radius: 0.42,
  shoulder: 0.2,
  capH: 0.42,
  capR: 0.27,
  neckH: 0.26,
  neckR: 0.14,
  /** nozzle opening — the paste ribbon is about this thick */
  holeR: 0.095,
};
/** the shoulder ends in a flat ledge the cap sits on, a hair wider than the cap */
const LEDGE_R = TUBE.capR + 0.006;
/** cap bore: clears the neck + thread */
const BORE_R = TUBE.neckR + 0.035;
const BORE_DEPTH = TUBE.neckH + 0.04;

/** Threaded neck that stays on the tube when the cap is unscrewed: a short
 *  cylinder with a 2½-turn helical thread and an open nozzle at the tip. */
function buildThread() {
  const turns = 2.5;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const a = t * turns * Math.PI * 2;
    const y = -TUBE.shoulder - 0.04 - t * (TUBE.neckH - 0.1);
    pts.push(new THREE.Vector3(Math.cos(a) * TUBE.neckR, y, Math.sin(a) * TUBE.neckR));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.017, 6, false);
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** cross-section half-width (a, along X) and half-depth (b, along Z) at t ∈ [0,1] */
export function tubeSection(t: number) {
  const f = Math.pow(smooth(0.18, 1, t), 1.15);
  const r = TUBE.radius;
  return { a: r * (1 + 0.55 * f), b: Math.max(0.018, r * (1 - 0.96 * f)) };
}

export function buildTubeBody(uStart = 0, uEnd = 1, segU = 96, segV = 80) {
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const L = TUBE.length;
  for (let j = 0; j <= segV; j++) {
    const t = j / segV;
    const y = -L / 2 + t * L;
    const { a, b } = tubeSection(t);
    for (let i = 0; i <= segU; i++) {
      const u = uStart + (uEnd - uStart) * (i / segU);
      const th = (u - 0.5) * Math.PI * 2;
      pos.push(a * Math.sin(th), y, b * Math.cos(th));
      uv.push(u, t);
    }
  }
  const row = segU + 1;
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const p = j * row + i;
      idx.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
    }
  }
  geo.setIndex(idx);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function buildShoulder() {
  // lathe profile, bottom → top: neck base, flat ledge out to the cap's width,
  // then a rounded dome up to the full body radius (no gap anywhere)
  const r = TUBE.radius;
  const sh = TUBE.shoulder;
  const pts: THREE.Vector2[] = [new THREE.Vector2(TUBE.neckR, -sh)];
  const steps = 18;
  for (let i = steps; i >= 0; i--) {
    const ang = ((i / steps) * Math.PI) / 2;
    pts.push(new THREE.Vector2(LEDGE_R + (r - LEDGE_R) * Math.cos(ang) ** 0.7, -sh * Math.sin(ang)));
  }
  return new THREE.LatheGeometry(pts, 72);
}

function buildCap() {
  // y = 0 is the closed end, y = H the open end that sits on the shoulder ledge.
  // Hollow inside: a bore that the threaded neck screws into.
  const R = TUBE.capR;
  const H = TUBE.capH;
  const pts = [
    [0, 0],
    [R - 0.025, 0],
    [R, 0.025],
    [R, H - 0.015],
    [R - 0.012, H],
    [BORE_R, H],
    [BORE_R, H - BORE_DEPTH],
    [0, H - BORE_DEPTH],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 72);
}

/** fine vertical grip ribs around the cap (a separate instanced ring) */
function buildCapRibs() {
  const g = new THREE.BoxGeometry(0.012, TUBE.capH - 0.08, 0.016);
  return g;
}

const CAP_RIBS = Array.from({ length: 36 }, (_, i) => (i / 36) * Math.PI * 2);

/**
 * Squeezing flattens the body the way a real tube does: not at all where it
 * meets the round shoulder, increasingly toward the crimp. (Scaling the whole
 * body would make the shoulder joint visibly mismatch when seen from the side.)
 */
function applySquash(geo: THREE.BufferGeometry, base: Float32Array, squash: number) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const L = TUBE.length;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    const w = squash * smooth(0.04, 0.45, (y + L / 2) / L);
    pos.setXYZ(i, x * (1 + w * 0.12), y, z * (1 - w * 0.45));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export type CapPose = {
  /** distance unscrewed out along the tube axis */
  lift: number;
  /** rotation about the tube axis (radians) — unscrewing */
  spin: number;
  /** extra offset in tube-local space once it is off the thread */
  drift: [number, number, number];
  /** tumble while floating free */
  tumble: number;
};
export const CAP_ON: CapPose = { lift: 0, spin: 0, drift: [0, 0, 0], tumble: 0 };

/** local y of the nozzle opening (bottom of the shoulder) */
export const NOZZLE_Y = -(TUBE.length / 2 + TUBE.shoulder + TUBE.neckH);

type TubeProps = {
  texture: THREE.Texture;
  capTexture: THREE.Texture;
  liningColor: string;
  /** cap unscrewing / floating (hero) */
  cap?: CapPose;
  /** 0 = on, 1 = cap tossed away (squeeze scene) */
  uncap?: number;
  /** 0..1 flattens the body, as when squeezing */
  squash?: number;
} & ThreeElements["group"];

export const PaperTube = forwardRef<THREE.Group, TubeProps>(function PaperTube(
  { texture, capTexture, liningColor, cap = CAP_ON, uncap = 0, squash = 0, ...group },
  ref,
) {
  const geos = useMemo(
    () => ({
      full: buildTubeBody(0, 1),
      shoulder: buildShoulder(),
      cap: buildCap(),
      capRib: buildCapRibs(),
      neck: new THREE.CylinderGeometry(TUBE.neckR, TUBE.neckR, TUBE.neckH, 40, 1, true),
      thread: buildThread(),
      lip: new THREE.RingGeometry(TUBE.holeR, TUBE.neckR, 40),
      hole: new THREE.CircleGeometry(TUBE.holeR, 32),
      crimp: new THREE.BoxGeometry(tubeSection(1).a * 2 + 0.02, 0.14, 0.05),
    }),
    [],
  );
  const mats = useMemo(
    () => ({
      outer: new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, side: THREE.FrontSide }),
      inner: new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.BackSide }),
      cap: new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }),
      // moulded neck: same plant-based material as the lining, slightly glossy
      neck: new THREE.MeshStandardMaterial({ roughness: 0.4, color: "#e6e1d3", side: THREE.DoubleSide }),
      hole: new THREE.MeshBasicMaterial({ color: "#2a2620" }),
    }),
    [],
  );
  mats.outer.map = texture;
  mats.cap.map = capTexture;
  mats.inner.color.set(liningColor);
  mats.outer.needsUpdate = true;

  const L = TUBE.length;
  const [dx, dy, dz] = cap.drift;

  const basePos = useMemo(() => Float32Array.from(geos.full.attributes.position.array), [geos]);
  useLayoutEffect(() => {
    applySquash(geos.full, basePos, squash);
  }, [geos, basePos, squash]);

  return (
    <group ref={ref} {...group}>
      <mesh geometry={geos.full} material={mats.outer} castShadow receiveShadow />
      <mesh geometry={geos.full} material={mats.inner} />
      {/* crimp seal (already flat; widens a little with the squeeze) */}
      <mesh geometry={geos.crimp} material={mats.outer} position={[0, L / 2 + 0.02, 0]} scale={[1 + squash * 0.12, 1, 1]} />
      {/* shoulder + nozzle stay; the cap unscrews off the thread */}
      <group position={[0, -L / 2, 0]}>
        <mesh geometry={geos.shoulder} material={mats.cap} />
        <mesh geometry={geos.neck} material={mats.neck} position={[0, -TUBE.shoulder - TUBE.neckH / 2, 0]} />
        <mesh geometry={geos.thread} material={mats.neck} />
        <mesh geometry={geos.lip} material={mats.neck} position={[0, -TUBE.shoulder - TUBE.neckH, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geos.hole} material={mats.hole} position={[0, -TUBE.shoulder - TUBE.neckH + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <group
          position={[dx + uncap * 1.6, -cap.lift + dy - uncap * uncap * 3.2, dz + uncap * 0.8]}
          rotation={[cap.tumble * 0.9 + uncap * 1.4, cap.spin + uncap * 6, cap.tumble * 0.5 + uncap * 2.2]}
        >
          <group position={[0, -TUBE.shoulder - TUBE.capH, 0]} visible={uncap < 0.99}>
            <mesh geometry={geos.cap} material={mats.cap} castShadow />
            {CAP_RIBS.map((a) => (
              <mesh
                key={a}
                geometry={geos.capRib}
                material={mats.cap}
                position={[Math.cos(a) * TUBE.capR, TUBE.capH / 2, Math.sin(a) * TUBE.capR]}
                rotation={[0, -a, 0]}
              />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
});
