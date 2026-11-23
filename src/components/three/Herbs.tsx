"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { HerbShape } from "@/lib/catalog";

// Procedural botanicals — no external models, so the page loads instantly.

function leafGeometry(length: number, width: number, serrated: boolean, curl = 0.25) {
  const shape = new THREE.Shape();
  const steps = 40;
  const edge = (s: number) => {
    let wv = Math.pow(Math.sin(Math.PI * s), 0.85) * width * (1 - 0.35 * s);
    if (serrated && s > 0.08 && s < 0.95) wv *= 1 + 0.09 * Math.abs(Math.sin(s * Math.PI * 14));
    return wv;
  };
  shape.moveTo(0, 0);
  for (let i = 1; i <= steps; i++) {
    const s = i / steps;
    shape.lineTo(edge(s), s * length);
  }
  for (let i = steps - 1; i >= 0; i--) {
    const s = i / steps;
    shape.lineTo(-edge(s), s * length);
  }
  const geo = new THREE.ShapeGeometry(shape, 8);
  // bend: cup across the width and arch along the length
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, (x * x) / (width * 1.6) + Math.sin((y / length) * Math.PI) * curl * 0.4 - (y / length) ** 2 * curl);
  }
  geo.translate(0, -length * 0.15, 0);
  geo.computeVertexNormals();
  return geo;
}

function rhizomeGeometry() {
  // knobbly turmeric/ginger root built from merged capsules
  const parts: THREE.BufferGeometry[] = [];
  const main = new THREE.CapsuleGeometry(0.13, 0.55, 6, 14);
  main.rotateZ(Math.PI / 2);
  parts.push(main);
  const knobs: [number, number, number, number][] = [
    [0.18, 0.16, 0.6, 0.09],
    [-0.12, 0.14, -0.5, 0.08],
    [0.32, -0.08, -0.4, 0.07],
  ];
  for (const [x, y, rot, r] of knobs) {
    const k = new THREE.CapsuleGeometry(r, 0.22, 6, 12);
    k.rotateZ(rot);
    k.translate(x, y, 0);
    parts.push(k);
  }
  return mergeGeometries(parts);
}

function mergeGeometries(parts: THREE.BufferGeometry[]) {
  // lightweight merge (all parts are indexed with position/normal/uv)
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  for (const g of parts) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    const index = g.index!;
    for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    offset += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

function useHerbGeos() {
  return useMemo(() => {
    const sliceShape = new THREE.Shape();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = 0.26 + Math.sin(a * 3) * 0.025 + Math.cos(a * 5) * 0.02;
      if (i === 0) sliceShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else sliceShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const bark = new THREE.CylinderGeometry(0.09, 0.09, 1.0, 20, 1, true, 0, Math.PI * 1.75);
    return {
      mint: leafGeometry(0.75, 0.26, true, 0.3),
      leaf: leafGeometry(0.95, 0.24, false, 0.35),
      neemLeaflet: leafGeometry(0.34, 0.06, true, 0.12),
      stem: new THREE.CylinderGeometry(0.012, 0.016, 1, 6),
      cloveStem: new THREE.CylinderGeometry(0.035, 0.05, 0.42, 8),
      cloveSepal: new THREE.ConeGeometry(0.035, 0.1, 6),
      cloveBud: new THREE.SphereGeometry(0.06, 12, 10),
      rhizome: rhizomeGeometry(),
      slice: new THREE.ExtrudeGeometry(sliceShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }),
      bark,
      barkInner: new THREE.CylinderGeometry(0.06, 0.06, 1.0, 20, 1, true, 0.4, Math.PI * 1.6),
      crystal: new THREE.BoxGeometry(0.09, 0.09, 0.09),
      stalk: new THREE.CylinderGeometry(0.045, 0.07, 1.1, 10),
      blade: leafGeometry(1.1, 0.05, false, 0.5),
      berry: new THREE.SphereGeometry(0.24, 24, 18),
      calyx: new THREE.SphereGeometry(0.09, 10, 8),
    };
  }, []);
}

export function HerbModel({ shape, color, seed = 0 }: { shape: HerbShape; color: string; seed?: number }) {
  const g = useHerbGeos();
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }),
    [color],
  );
  const accent = useMemo(() => {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({ color: c.clone().offsetHSL(0, -0.05, 0.12), roughness: 0.7, side: THREE.DoubleSide });
  }, [color]);
  const dark = useMemo(() => {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({ color: c.clone().offsetHSL(0, 0, -0.12), roughness: 0.8 });
  }, [color]);

  switch (shape) {
    case "mint":
      return (
        <group>
          <mesh geometry={g.mint} material={mat} />
          <mesh geometry={g.mint} material={accent} rotation={[0.2, 2.4, 0.5]} position={[0.05, -0.1, 0]} scale={0.8} />
          <mesh geometry={g.stem} material={dark} position={[0, -0.25, 0]} scale={[1, 0.4, 1]} />
        </group>
      );
    case "leaf":
      return (
        <group rotation={[0, 0, seed * 0.3]}>
          <mesh geometry={g.leaf} material={mat} />
          <mesh geometry={g.stem} material={dark} position={[0, -0.25, 0.02]} scale={[1, 0.25, 1]} />
        </group>
      );
    case "neem":
      return (
        <group>
          <mesh geometry={g.stem} material={dark} />
          {Array.from({ length: 8 }).map((_, i) => {
            const side = i % 2 === 0 ? 1 : -1;
            const y = -0.4 + i * 0.11;
            return (
              <mesh
                key={i}
                geometry={g.neemLeaflet}
                material={i % 3 === 0 ? accent : mat}
                position={[0, y, 0]}
                rotation={[0.2, 0, side * 1.05]}
              />
            );
          })}
        </group>
      );
    case "clove":
      return (
        <group>
          <mesh geometry={g.cloveStem} material={mat} />
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              geometry={g.cloveSepal}
              material={mat}
              position={[Math.cos((i * Math.PI) / 2) * 0.045, 0.24, Math.sin((i * Math.PI) / 2) * 0.045]}
              rotation={[Math.sin((i * Math.PI) / 2) * 0.5, 0, -Math.cos((i * Math.PI) / 2) * 0.5]}
            />
          ))}
          <mesh geometry={g.cloveBud} material={accent} position={[0, 0.28, 0]} />
        </group>
      );
    case "turmeric":
      return (
        <group>
          <mesh geometry={g.rhizome} material={mat} />
          <mesh geometry={g.slice} position={[0.1, -0.32, 0.12]} rotation={[0.4, 0.5, 0]} scale={0.7}>
            <meshStandardMaterial color="#f0a21a" roughness={0.45} />
          </mesh>
        </group>
      );
    case "slice":
      return (
        <group>
          <mesh geometry={g.slice} material={mat} />
          <mesh geometry={g.slice} position={[0.05, 0.02, -0.06]} scale={[0.82, 0.82, 1]}>
            <meshStandardMaterial color="#f5e7c4" roughness={0.5} />
          </mesh>
        </group>
      );
    case "cinnamon":
      return (
        <group rotation={[0, 0, 0.3]}>
          <mesh geometry={g.bark} material={mat} />
          <mesh geometry={g.barkInner} material={dark} />
        </group>
      );
    case "salt":
      return (
        <group>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh
              key={i}
              geometry={g.crystal}
              position={[Math.sin(i * 2.1) * 0.16, Math.cos(i * 1.7) * 0.14, Math.sin(i * 3.3) * 0.12]}
              rotation={[i, i * 0.7, i * 1.3]}
              scale={0.6 + ((i * 37) % 10) / 15}
            >
              <meshPhysicalMaterial color="#ffffff" roughness={0.15} transmission={0.6} thickness={0.2} />
            </mesh>
          ))}
        </group>
      );
    case "stalk":
      return (
        <group>
          <mesh geometry={g.stalk} material={mat} />
          <mesh geometry={g.blade} material={accent} position={[0, 0.4, 0]} rotation={[0, 0, 0.2]} />
          <mesh geometry={g.blade} material={mat} position={[0, 0.35, 0]} rotation={[0, 2, -0.25]} />
        </group>
      );
    case "berry":
      return (
        <group>
          <mesh geometry={g.berry} material={mat} />
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              geometry={g.calyx}
              position={[Math.cos(i * 1.57) * 0.08, 0.21, Math.sin(i * 1.57) * 0.08]}
              scale={[1, 0.35, 0.6]}
              rotation={[0, i * 1.57, 0.4]}
            >
              <meshStandardMaterial color="#4f6b2e" roughness={0.7} />
            </mesh>
          ))}
        </group>
      );
  }
}
