"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";

/**
 * Toothpaste ribbon swept along a curve (round nozzle: smooth, faint striations). Vertices are ordered along the
 * curve, so `growPaste(geo, g)` reveals it from the nozzle outwards (and hides
 * it again in reverse, as if sucked back into the tube).
 */
export function buildPasteGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  {
    steps = 160,
    radius = 0.11,
    radial = 36,
    ridges = 12,
    ridge = 0.025,
    twist = 0,
    taper = 0.12,
    taperStart = 0,
    wobble = 0.05,
    /** extra radius multiplier along the curve, e.g. narrower inside a nozzle */
    radiusAt = undefined as ((t: number) => number) | undefined,
  } = {},
) {
  const frames = curve.computeFrenetFrames(steps, false);
  const pos: number[] = [];
  const idx: number[] = [];
  const P = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    // round off the tip like a real squeezed ribbon
    const end =
      (t > 1 - taper ? Math.pow((1 - t) / taper, 0.55) : 1) *
      (taperStart > 0 && t < taperStart ? Math.pow(t / taperStart, 0.5) : 1);
    // uneven squeeze pressure → soft bulges along the ribbon
    const pressure = 1 + wobble * (Math.sin(t * 23) * 0.6 + Math.sin(t * 9.7 + 1.3) * 0.4);
    const r = radius * Math.max(0.05, end) * pressure * (radiusAt ? radiusAt(t) : 1);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const rr = r * (1 + ridge * Math.cos(ridges * (a + t * twist)));
      v.copy(P)
        .addScaledVector(N, Math.cos(a) * rr)
        .addScaledVector(B, Math.sin(a) * rr);
      pos.push(v.x, v.y, v.z);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.userData = { steps, radial, radius, taper };
  return geo;
}

/** Show the first `g` (0..1) of the ribbon. */
export function growPaste(geo: THREE.BufferGeometry, g: number) {
  const { steps, radial } = geo.userData as { steps: number; radial: number };
  geo.setDrawRange(0, Math.floor(steps * Math.min(1, Math.max(0, g))) * radial * 6);
}

export function pasteMaterial() {
  return new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.75, clearcoatRoughness: 0.22, side: THREE.DoubleSide });
}

/**
 * Path of the floating ribbon: it leaves the nozzle straight, then winds upward
 * in a loose, widening spiral, as if weightless. The ribbon itself stays a plain
 * squeezed ribbon — only its path coils.
 */
export function pasteFloatCurve() {
  const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.35, 0)];
  const n = 48;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const a = t * Math.PI * 2 * 2; // two turns
    const r = 0.08 + 0.5 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5);
    pts.push(new THREE.Vector3(Math.cos(a) * r - 0.08, 0.5 + t * 1.75, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

/** A ribbon of paste hanging in the air out of the nozzle. */

export type PastePhase = { grow: number };

/** Floating paste anchored at its local origin (put that at the nozzle). */
export function FloatingPaste({ color, phase, ...group }: { color: string; phase: PastePhase } & ThreeElements["group"]) {
  const curve = useMemo(() => pasteFloatCurve(), []);
  const geo = useMemo(() => buildPasteGeometry(curve, { steps: 260, radius: 0.1, wobble: 0.06 }), [curve]);
  const mat = useMemo(() => pasteMaterial(), []);
  mat.color.set(color);
  const root = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Mesh>(null);
  const tipPos = useMemo(() => new THREE.Vector3(), []);
  const last = useRef(-1);

  useFrame((state) => {
    const g = phase.grow;
    const r = root.current!;
    r.visible = g > 0.003;
    if (!r.visible) return;
    // the coil turns slowly about the nozzle axis, so it reads as a weightless spiral
    const t = state.clock.elapsedTime;
    r.rotation.y = t * 0.35;
    r.rotation.z = Math.sin(t * 0.5) * 0.03;
    if (Math.abs(g - last.current) > 0.001) {
      last.current = g;
      growPaste(geo, g);
      // rounded front while it is still coming out
      curve.getPointAt(Math.min(1, g), tipPos);
      tip.current!.position.copy(tipPos);
      const { taper, radius } = geo.userData as { taper: number; radius: number };
      const end = g > 1 - taper ? Math.pow((1 - g) / taper, 0.55) : 1;
      tip.current!.scale.setScalar(radius * Math.max(0.05, end) * 1.08);
      tip.current!.visible = g < 0.985;
    }
  });

  return (
    <group {...group}>
      <group ref={root}>
        <mesh geometry={geo} material={mat} />
        <mesh ref={tip} material={mat}>
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
      </group>
    </group>
  );
}
