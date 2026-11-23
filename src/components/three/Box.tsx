"use client";
/* eslint-disable react-hooks/immutability -- three.js materials/textures are mutable GPU
   resources updated imperatively; the React Compiler is not enabled for this app. */

import { forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import type { BoxShape } from "@/lib/catalog";
import { ensureLabelFont, labelFamily } from "@/lib/label";

export const BOX = { w: 1.5, h: 4.15, d: 1.0, t: 0.016 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

type BoxProps = {
  shape: BoxShape;
  /** 0 = fully open, 1 = closed */
  closed?: number;
  front: THREE.Texture;
  wrap: THREE.Texture;
  paper: THREE.Texture;
} & ThreeElements["group"];

export const PaperBox = forwardRef<THREE.Group, BoxProps>(function PaperBox(
  { shape, closed = 1, front, wrap, paper, ...group },
  ref,
) {
  const mats = useMemo(
    () => ({
      paper: new THREE.MeshStandardMaterial({ roughness: 0.92 }),
      label: new THREE.MeshStandardMaterial({ roughness: 0.88 }),
      wrap: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      inside: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide }),
      shade: new THREE.MeshStandardMaterial({ roughness: 1, color: "#e4dccb", emissive: "#2a241a", emissiveIntensity: 0.35 }),
      // back wall: plain board with a blind-embossed CUSTOMA
      back: new THREE.MeshStandardMaterial({ roughness: 0.92, bumpMap: embossMap(), bumpScale: 6 }),
    }),
    [],
  );
  mats.paper.map = paper;
  mats.label.map = front;
  mats.back.map = paper;
  mats.wrap.map = wrap;
  mats.inside.map = paper;
  mats.inside.color.set("#cfc6b5");
  Object.values(mats).forEach((m) => (m.needsUpdate = true));

  return (
    <group ref={ref} {...group}>
      {shape === "tuck" && <Tuck closed={closed} mats={mats} />}
      {shape === "sleeve" && <Sleeve closed={closed} mats={mats} />}
      {shape === "cylinder" && <Cylinder closed={closed} mats={mats} />}
    </group>
  );
});

type Mats = {
  paper: THREE.MeshStandardMaterial;
  label: THREE.MeshStandardMaterial;
  wrap: THREE.MeshStandardMaterial;
  inside: THREE.MeshStandardMaterial;
  shade: THREE.MeshStandardMaterial;
  back: THREE.MeshStandardMaterial;
};

function useBoxGeos() {
  const { w, h, d, t } = BOX;
  return useMemo(
    () => ({
      fb: new THREE.BoxGeometry(w, h, t),
      side: new THREE.BoxGeometry(t, h, d),
      flat: new THREE.BoxGeometry(w, t, d),
      // dust flaps span the full inside depth, minus a slot at the front for the tongue
      dust: new THREE.BoxGeometry(d * 0.42, t, d - t * 3.5),
      // lid covers the box's outer footprint; the tongue runs the full length of
      // the lid's front edge (its ends tuck into the side walls' thickness)
      lid: new THREE.BoxGeometry(w + t, t, d),
      tongue: new THREE.BoxGeometry(w + t - 0.004, t, 0.3),
    }),
    [w, h, d, t],
  );
}

/**
 * Height map for the back wall: "CUSTOMA" blind-embossed (pressed up from
 * behind, no ink), running top to bottom like a book spine, tucked into the
 * bottom-left corner. Soft edges so the light rolls over the raised letters
 * like real pressed board.
 */
function embossMap() {
  const W = 600;
  const H = Math.round((W * BOX.h) / BOX.w);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  const draw = () => {
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const margin = W * 0.08;
    let size = W * 0.26;
    const spacing = () => size * 0.16;
    const setFont = () => {
      ctx.font = `600 ${Math.round(size)}px ${labelFamily()}`;
      ctx.letterSpacing = `${Math.round(spacing())}px`;
    };
    setFont();
    // never longer than ~90% of the wall
    const maxLen = H - margin * 2;
    const len = ctx.measureText("CUSTOMA").width - spacing();
    if (len > maxLen) {
      size *= maxLen / len;
      setFont();
    }
    const capH = size * 0.72;
    ctx.save();
    // rotate 90° clockwise: text reads top → bottom, letter tops face right
    ctx.translate(margin + capH / 2, H - margin);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.filter = "blur(3px)";
    ctx.fillText("CUSTOMA", 0, 0);
    ctx.restore();
    tex.needsUpdate = true;
  };
  draw();
  void ensureLabelFont().then(draw);
  return tex;
}

/* Tuck-end box -------------------------------------------------------- */

function Tuck({ closed, mats }: { closed: number; mats: Mats }) {
  const { w, h, d, t } = BOX;
  const g = useBoxGeos();
  // Real tuck-end sequence: dust flaps fold in, then the lid swings down and
  // the tongue slides in behind the front wall — friction holds it, no glue.
  // Opening runs the same steps backwards (lid first, then the dust flaps).
  const c1 = ease(closed / 0.35);
  const c2 = ease((closed - 0.4) / 0.6);
  // inner faces use the lighter unprinted side of the board, so looking into the
  // open box doesn't read as a dark shadow under the tube
  const frontMats = useMemo(
    () => [mats.paper, mats.paper, mats.paper, mats.paper, mats.label, mats.shade],
    [mats],
  );
  const backMats = useMemo(
    () => [mats.paper, mats.paper, mats.paper, mats.paper, mats.shade, mats.back],
    [mats],
  );
  const leftMats = useMemo(
    () => [mats.shade, mats.paper, mats.paper, mats.paper, mats.paper, mats.paper],
    [mats],
  );
  const rightMats = useMemo(
    () => [mats.paper, mats.shade, mats.paper, mats.paper, mats.paper, mats.paper],
    [mats],
  );
  const bottomMats = useMemo(
    () => [mats.paper, mats.paper, mats.shade, mats.paper, mats.paper, mats.paper],
    [mats],
  );
  const open = Math.PI / 2 + 0.45;
  // lid lift above horizontal (0 = closed)
  const phi = (1 - c2) * (Math.PI / 2 + 0.5);
  // Tongue angle relative to the lid, driven by how far the lid is open:
  //  - wide open: relaxed, only slightly bent along its crease
  //  - last ~45° of closing: held pointing straight down, so its tip always
  //    stays behind the front wall, then it slides in
  const PHI_HOLD = 0.75;
  const tongueAngle =
    phi <= PHI_HOLD
      ? Math.PI / 2 + phi
      : THREE.MathUtils.lerp(Math.PI / 2 + PHI_HOLD, 0.3, ease((phi - PHI_HOLD) / (Math.PI / 2 + 0.5 - PHI_HOLD)));
  return (
    <group>
      <mesh geometry={g.flat} material={bottomMats} position={[0, -h / 2, 0]} castShadow />
      <mesh geometry={g.fb} material={frontMats} position={[0, 0, d / 2]} castShadow receiveShadow />
      <mesh geometry={g.fb} material={backMats} position={[0, 0, -d / 2]} castShadow />
      <mesh geometry={g.side} material={leftMats} position={[-w / 2, 0, 0]} castShadow />
      <mesh geometry={g.side} material={rightMats} position={[w / 2, 0, 0]} castShadow />
      {/* dust flaps */}
      {/* dust flaps sit just below the rim so the closed lid rests flush on the walls */}
      <group position={[-w / 2, h / 2 - t / 2, 0]} rotation={[0, 0, (1 - c1) * open]}>
        <mesh geometry={g.dust} material={mats.paper} position={[d * 0.21, 0, -t * 1.25]} />
      </group>
      <group position={[w / 2, h / 2 - t / 2, 0]} rotation={[0, 0, -(1 - c1) * open]}>
        <mesh geometry={g.dust} material={mats.paper} position={[-d * 0.21, 0, -t * 1.25]} />
      </group>
      {/* lid: hinged on the back wall's outer top corner, so it stays flush when
          open and rests on the dust flaps when closed */}
      <group position={[0, h / 2, -d / 2 - t / 2]} rotation={[-phi, 0, 0]}>
        {/* lid runs from the back wall's outer face to the front wall's inner face */}
        <mesh geometry={g.lid} material={mats.paper} position={[0, t / 2, d / 2]} castShadow />
        {/* tongue creases right at the lid's front edge (pivot on the top corner,
            so when folded down its thickness sits inside the front wall) */}
        <group position={[0, t, d]} rotation={[tongueAngle, 0, 0]}>
          <mesh geometry={g.tongue} material={mats.paper} position={[0, -t / 2, 0.15]} />
        </group>
      </group>
    </group>
  );
}

/* Slide sleeve -------------------------------------------------------- */

function Sleeve({ closed, mats }: { closed: number; mats: Mats }) {
  const { w, h, d, t } = BOX;
  const g = useBoxGeos();
  const inner = useMemo(() => new THREE.BoxGeometry(w - 0.06, h - 0.02, d - 0.06), [w, h, d]);
  const frontMats = useMemo(
    () => [mats.paper, mats.paper, mats.paper, mats.paper, mats.label, mats.shade],
    [mats],
  );
  const sleeveBack = useMemo(
    () => [mats.paper, mats.paper, mats.paper, mats.paper, mats.paper, mats.back],
    [mats],
  );
  const slide = (1 - ease(closed)) * h * 0.58;
  return (
    <group>
      {/* drawer */}
      <mesh geometry={inner} material={mats.shade} position={[0, slide, 0]} castShadow />
      {/* sleeve */}
      <mesh geometry={g.fb} material={frontMats} position={[0, 0, d / 2]} castShadow />
      <mesh geometry={g.fb} material={sleeveBack} position={[0, 0, -d / 2]} castShadow />
      <mesh geometry={g.side} material={mats.paper} position={[-w / 2, 0, 0]} castShadow />
      <mesh geometry={g.side} material={mats.paper} position={[w / 2, 0, 0]} castShadow />
      {/* thumb notch ribbon */}
      <mesh position={[0, h / 2 - 0.02 + slide, d / 2 - 0.05]}>
        <boxGeometry args={[0.18, 0.5, t]} />
        <meshStandardMaterial color="#7d6a4f" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* Paper cylinder ------------------------------------------------------ */

function Cylinder({ closed, mats }: { closed: number; mats: Mats }) {
  const { h } = BOX;
  const R = 0.8;
  const geos = useMemo(
    () => ({
      body: new THREE.CylinderGeometry(R, R, h - 0.3, 72, 1, true, Math.PI, Math.PI * 2),
      bottom: new THREE.CircleGeometry(R, 72),
      lid: new THREE.CylinderGeometry(R + 0.025, R + 0.025, 0.7, 72, 1, false),
    }),
    [h],
  );
  const c = ease(closed);
  const lidY = h / 2 - 0.35 + (1 - c) * 1.1;
  return (
    <group>
      <mesh geometry={geos.body} material={mats.wrap} position={[0, -0.15, 0]} castShadow />
      <mesh geometry={geos.body} material={mats.inside} position={[0, -0.15, 0]} />
      <mesh geometry={geos.bottom} material={mats.paper} rotation={[Math.PI / 2, 0, 0]} position={[0, -h / 2, 0]} />
      <mesh
        geometry={geos.lid}
        material={mats.paper}
        position={[(1 - c) * 0.5, lidY, 0]}
        rotation={[0, 0, -(1 - c) * 0.35]}
        castShadow
      />
    </group>
  );
}
