"use client";
/* eslint-disable react-hooks/immutability -- three.js objects updated imperatively per frame */

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { BOX_PAPERS } from "@/lib/catalog";
import { labelFamily, paintPaper } from "@/lib/label";

// The finale: a real photograph of a smile, printed on a paper card.
// The camera starts tight on the teeth while the brush works across them;
// a little fluffy foam builds up at the bristle tips and a few
// soap bubbles float off. Once brushing is done it pulls back to the whole
// photo with a typed caption.
//
// Photo: stock portrait supplied for the demo. Served from /public so WebGL can use it.

export type SmilePhase = {
  appear: number;
  /** 0..1 overall amount of foam (rinsed away at the end) */
  foam: number;
  /** world x of the brush head centre */
  brushX: number;
  /** world y of the bristle tips (where the foam sits) */
  tipY: number;
  /** half length of the brush head in world units */
  headHalf: number;
  /** 0..1 brushing activity (strokes on) */
  brushing: number;
  sparkle: number;
  /** 0 = only the mouth crop is shown as a picture, 1 = the whole photo + card */
  reveal: number;
};

export const PHOTO = {
  url: "/images/smile-bow.jpg",
  credit: "photograph: stock",
  aspect: 1024 / 1536, // width / height
  /** centre of the visible teeth in uv (from left, from bottom) */
  mouth: [0.4683, 0.5265] as [number, number],
  /** visible teeth span as a fraction of photo width */
  teethWidth: 0.159,
  /** visible teeth height as a fraction of photo height */
  teethHeight: 0.0228,
};

/** the opening picture: a crop around the mouth (world units, centred on the teeth) */
export const CROP = { w: 1.6, h: 0.9 };

// World layout: the teeth centre sits at the origin.
const PH = 6;
const PW = PH * PHOTO.aspect;
const PX = -(PHOTO.mouth[0] - 0.5) * PW;
const PY = -(PHOTO.mouth[1] - 0.5) * PH;
const M_SIDE = 0.28;
const M_TOP = 0.28;
const M_BOTTOM = 0.95;
const CW = PW + M_SIDE * 2;
const CH = PH + M_TOP + M_BOTTOM;
const CX = PX;
const CY = PY - (M_BOTTOM - M_TOP) / 2;

/** layout facts the camera and brush need (world units, teeth centre = origin) */
export const PORTRAIT = {
  cardCenterX: CX,
  cardCenterY: CY,
  cardWidth: CW,
  cardHeight: CH,
  teethWidth: PW * PHOTO.teethWidth,
  teethHeight: PH * PHOTO.teethHeight,
  /** upper gumline (top edge of the visible upper teeth) */
  gumY: (PH * PHOTO.teethHeight) / 2,
};

function cardCanvas(caption: { title: string; line: string; lieu: string }) {
  const S = 220; // px per world unit
  const c = document.createElement("canvas");
  c.width = Math.round(CW * S);
  c.height = Math.round(CH * S);
  const ctx = c.getContext("2d")!;
  paintPaper(ctx, c.width, c.height, BOX_PAPERS.find((p) => p.id === "washi")!, 17);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(M_SIDE * S + 4, M_TOP * S + 6, PW * S, PH * S);
  const fam = labelFamily();
  const x = M_SIDE * S;
  let y = (M_TOP + PH) * S + 78;
  ctx.fillStyle = "#1d1c1a";
  ctx.font = `600 34px ${fam}`;
  ctx.fillText(caption.title, x, y);
  y += 48;
  ctx.font = `400 27px ${fam}`;
  ctx.fillText(caption.line, x, y);
  ctx.globalAlpha = 0.55;
  ctx.font = `400 19px ${fam}`;
  ctx.fillText(PHOTO.credit, x, CH * S - 36);
  ctx.textAlign = "right";
  ctx.fillText(caption.lieu, c.width - x, CH * S - 36);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Foam: a few small, fluffy puffs right at the bristle tips. They ride  */
/* along with the brush and build up a little as it scrubs, plus a       */
/* handful of soap bubbles floating off.                                 */
/* ------------------------------------------------------------------ */

/** u: cloud position along the head (-1..1); dx/y/z: ball offset (world); at: foam level it appears at */
type Puff = { u: number; dx: number; y: number; z: number; s: number; at: number };
type Soap = { u: number; s: number; drift: number; speed: number };

const backOut = (t: number) => {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Five little clouds spread along the brush head, each a small dome of round
 * balls. They pop up one after another as brushing goes on.
 */
function foamLayout(tw: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const puffs: Puff[] = [];
  const clouds = 5;
  const order = [2, 0, 4, 1, 3]; // which cloud appears when
  for (let i = 0; i < clouds; i++) {
    const cu = (i / (clouds - 1) - 0.5) * 1.6 + (rnd() - 0.5) * 0.12;
    const R = tw * (0.015 + rnd() * 0.012);
    const at = order.indexOf(i) / clouds;
    const n = 7 + Math.floor(rnd() * 5);
    for (let k = 0; k < n; k++) {
      const d = Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      puffs.push({
        u: cu,
        dx: Math.cos(a) * d * R * 1.3,
        y: Math.sin(a) * d * R * 0.6 + R * 0.25,
        z: (1 - d) * R * 0.5,
        s: R * (0.62 - d * 0.3) * (0.85 + rnd() * 0.3),
        at,
      });
    }
  }
  const soaps: Soap[] = [];
  for (let i = 0; i < 4; i++) {
    soaps.push({
      u: (rnd() - 0.5) * 1.6,
      s: tw * (0.008 + rnd() * 0.01),
      drift: (rnd() - 0.5) * tw * 0.1,
      speed: 0.6 + rnd() * 0.8,
    });
  }
  return { puffs, soaps };
}

const PHOTO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The photo, exactly as shot. While reveal = 0 only the mouth crop is drawn,
// as a picture of its own; the rest of the photo fades in with reveal.
const PHOTO_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float ready;
  uniform float opacity;
  uniform float reveal;
  uniform vec2 cropCenter;
  uniform vec2 cropHalf;
  varying vec2 vUv;
  void main() {
    vec2 d = abs(vUv - cropCenter);
    float inCrop = step(d.x, cropHalf.x) * step(d.y, cropHalf.y);
    float a = opacity * mix(inCrop, 1.0, reveal);
    if (a <= 0.001) discard;
    vec3 c = mix(vec3(0.937, 0.914, 0.863), texture2D(map, vUv).rgb, ready);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }
`;

export function Smile({ phase, caption }: { phase: SmilePhase; caption: { title: string; line: string; lieu: string } }) {
  const root = useRef<THREE.Group>(null);
  const puffMesh = useRef<THREE.InstancedMesh>(null);
  const soapMesh = useRef<THREE.InstancedMesh>(null);
  const sparkle = useRef<THREE.Group>(null);

  const cardTex = useMemo(() => cardCanvas(caption), [caption]);
  const cardMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, transparent: true, opacity: 0 }), []);
  cardMat.map = cardTex;

  const photoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PHOTO_VERT,
        fragmentShader: PHOTO_FRAG,
        transparent: true,
        uniforms: {
          map: { value: null },
          ready: { value: 0 },
          opacity: { value: 0 },
          reveal: { value: 0 },
          cropCenter: { value: new THREE.Vector2(...PHOTO.mouth) },
          cropHalf: { value: new THREE.Vector2(CROP.w / 2 / PW, CROP.h / 2 / PH) },
        },
      }),
    [],
  );
  useEffect(() => {
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().load(PHOTO.url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      tex = t;
      photoMat.uniforms.map.value = t;
      photoMat.uniforms.ready.value = 1;
    });
    return () => tex?.dispose();
  }, [photoMat]);

  useEffect(() => () => cardTex.dispose(), [cardTex]);

  const { puffs, soaps } = useMemo(() => foamLayout(PORTRAIT.teethWidth), []);
  const balls = puffs;
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 20, 16), []);
  // soft and matte, lit mostly from within so it reads as fluffy white (never grey)
  const puffMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 1,
        emissive: "#fbfbfa",
        emissiveIntensity: 0.82,
      }),
    [],
  );
  // little soap bubbles: clear in the middle, a soft white rim and a highlight
  const soapMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main() {
            float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
            float rim = pow(f, 2.4);
            float spec = pow(max(dot(normalize(vN), normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 60.0);
            vec3 tint = mix(vec3(1.0), vec3(0.85, 0.95, 1.0), f);
            gl_FragColor = vec4(tint, clamp(rim * 0.85 + spec * 0.9, 0.0, 0.95));
          }`,
      }),
    [],
  );

  useLayoutEffect(() => {
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < balls.length; i++) puffMesh.current!.setMatrixAt(i, m);
    for (let i = 0; i < soaps.length; i++) soapMesh.current!.setMatrixAt(i, m);
    puffMesh.current!.instanceMatrix.needsUpdate = true;
    soapMesh.current!.instanceMatrix.needsUpdate = true;
  }, [balls, soaps]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  useFrame((state) => {
    const a = phase.appear;
    root.current!.visible = a > 0.001;
    photoMat.uniforms.opacity.value = a;
    photoMat.uniforms.reveal.value = phase.reveal;
    cardMat.opacity = a * phase.reveal;
    sparkle.current!.visible = phase.sparkle > 0.5;

    const tw = PORTRAIT.teethWidth;
    const t = state.clock.elapsedTime;
    const hh = phase.headHalf;
    // clouds pop up one by one as the foam builds (phase.foam 0 → 1), ride with the brush
    balls.forEach((p, i) => {
      const k = backOut(Math.min(1, Math.max(0, (phase.foam * 1.15 - p.at) * 4)));
      const br = Math.sin(t * 2.2 + p.u * 9 + p.dx * 60) * 0.05 * k;
      const s = p.s * k;
      m4.makeScale(s * (1 + br), s * (1 - br), s * 0.85).setPosition(
        phase.brushX + p.u * hh + p.dx,
        // centred on the visible row of bristles above the head
        phase.tipY + 0.022 + p.y,
        // in front of the bristles (the head lies at z ≈ 0.07)
        0.09 + p.z + s * 0.55,
      );
      puffMesh.current!.setMatrixAt(i, m4);
    });
    puffMesh.current!.instanceMatrix.needsUpdate = true;

    soaps.forEach((b, i) => {
      const started = Math.min(1, phase.foam * 2);
      const life = (t * 0.25 * b.speed + i * 0.37) % 1;
      const s = b.s * started * Math.sin(Math.min(1, life * 1.4) * Math.PI);
      m4.makeScale(s, s, s).setPosition(
        phase.brushX + b.u * hh + Math.sin(t + i) * b.drift * life,
        phase.tipY + 0.03 + life * tw * 0.22,
        0.1 + life * 0.05,
      );
      soapMesh.current!.setMatrixAt(i, m4);
    });
    soapMesh.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh material={cardMat} position={[CX, CY, -0.012]}>
        <planeGeometry args={[CW, CH]} />
      </mesh>
      <mesh material={photoMat} position={[PX, PY, 0]}>
        <planeGeometry args={[PW, PH]} />
      </mesh>
      <instancedMesh ref={puffMesh} args={[sphere, puffMat, balls.length]} />
      <instancedMesh ref={soapMesh} args={[sphere, soapMat, soaps.length]} renderOrder={11} />
      <group ref={sparkle}>
        <Sparkles
          count={12}
          scale={[PORTRAIT.teethWidth, PORTRAIT.teethHeight * 1.2, 0.04]}
          position={[0, 0, 0.04]}
          size={3}
          speed={0.6}
          color="#ffffff"
        />
      </group>
    </group>
  );
}
