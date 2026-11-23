"use client";
/* eslint-disable react-hooks/immutability -- per-frame imperative updates of three.js objects
   and the projected herb-tag DOM nodes (passed down as a ref container). */

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import { HERBS, LIEU } from "@/lib/catalog";
import { defaultFormula, formulaNo, pasteColor, type Formula } from "@/lib/formula";
import { useT } from "@/lib/i18n";
import { PaperTube, TUBE, NOZZLE_Y, type CapPose } from "../three/Tube";
import { FloatingPaste, pasteFloatCurve, type PastePhase } from "../three/Paste";
import { PaperBox } from "../three/Box";
import { HerbModel } from "../three/Herbs";
import { Toothbrush, ribbonFront, type BrushPhase } from "../three/Toothbrush";
import { Smile, PORTRAIT, type SmilePhase } from "../three/Smile";
import { useFormulaTextures } from "../three/textures";
import { TUBE_FIELDS_V } from "@/lib/label";

export type Progress = { target: number; current: number };

/*
 * The story, as scroll progress p ∈ [0, 1]:
 *   0.00  intro        paper tube floats beside the headline
 *   0.03  uncap        tube flips cap-up, the bamboo cap unscrews and floats off
 *   0.14  paste        paste is squeezed out and hangs in the air as a swirl
 *   0.19  herbs        12 botanicals emerge from the paste, camera orbits, tags appear
 *   0.37  return       herbs sink back in, paste is drawn back into the tube,
 *                      cap screws back on, tube flips upright
 *   0.49  label        camera closes in, the label types a customer's name + note
 *   0.58  box          kraft box rises around the tube (right of screen) and folds shut
 *   0.70  glide        the closed box floats over to the left, turning once to show its back
 *   0.735 unbox        lid pops, dust flaps open, tube lifts out, box sinks away
 *   0.765 squeeze      cap unscrews, paste is laid along a bamboo brush
 *   0.86  brush        a mouth-only crop of a photo flies in; the brush scrubs,
 *                      a little foam builds on the bristles, melts away when it stops
 *   0.935 smile        zoom out to the mouth picture, the whole photo appears,
 *                      ending on the printed portrait card
 */

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Key = [number, number];
/** eased interpolation between [progress, value] keyframes */
function track(keys: Key[], p: number) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    if (p <= p1) {
      const [p0, v0] = keys[i - 1];
      return lerp(v0, v1, ease(seg(p, p0, p1)));
    }
  }
  return keys[keys.length - 1][1];
}

/** world y of the label's "for / date / lieu" block while the tube stands upright */
const FIELDS_Y = -TUBE.length / 2 + TUBE_FIELDS_V * TUBE.length + 0.25;

const CAM: Record<"ang" | "radius" | "y" | "look" | "shift", Key[]> = {
  ang: [[0, 0], [0.2, 0], [0.42, TAU], [0.61, TAU], [0.66, TAU - 0.55], [0.7, TAU - 0.55], [0.735, TAU]],
  radius: [[0, 9.2], [0.04, 9.2], [0.14, 12.4], [0.38, 12.4], [0.46, 9.2], [0.485, 6.6], [0.5, 2.8], [0.555, 2.8], [0.575, 6.6], [0.61, 11.2], [0.72, 11.6], [0.77, 11.8], [0.86, 11.8], [0.895, 1.05], [0.935, 1.05], [0.955, 3.1], [0.99, 15.5], [1, 15.5]],
  y: [[0, 0.4], [0.18, 1.4], [0.3, -0.4], [0.42, 1.0], [0.46, 0.4], [0.485, 0.35], [0.5, FIELDS_Y + 0.05], [0.555, FIELDS_Y + 0.05], [0.575, 0.35], [0.62, 1.2], [0.72, 1.0], [0.78, 2.0], [0.86, 1.6], [0.895, 0.01], [0.935, 0.01], [0.955, 0.01], [0.99, PORTRAIT.cardCenterY], [1, PORTRAIT.cardCenterY]],
  look: [[0, -0.15], [0.46, 0], [0.485, 0.1], [0.5, FIELDS_Y], [0.555, FIELDS_Y], [0.575, 0.1], [0.6, -0.35], [0.78, -0.1], [0.86, -0.1], [0.895, -0.01], [0.935, -0.01], [0.955, 0], [0.99, PORTRAIT.cardCenterY], [1, PORTRAIT.cardCenterY]],
  // sideways framing on desktop so the product never sits under a text panel
  shift: [[0, -1.7], [0.19, -1.7], [0.24, 0], [0.44, 0], [0.485, -0.75], [0.5, -0.52], [0.555, -0.52], [0.575, -0.75], [0.6, -1.9], [0.7, -1.9], [0.735, 1.9], [0.755, 1.9], [0.785, -1.5], [0.85, -1.5], [0.895, 0], [0.935, 0], [0.955, 0], [0.99, -2.0], [1, -2.0]],
};

const SHOWCASE: Formula = (() => {
  const f = defaultFormula();
  f.name = "Forest Mint";
  f.tubeText = { forName: "YOU", note: "" };
  f.boxText = { title: "toothpaste · dentifrice", message: "peppermint, clove & neem — compounded by hand in Khon\u00a0Kaen" };
  return f;
})();
/** caption typed under the portrait in the finale (stable object: built once) */
const CAPTION = {
  title: `CUSTOMA — N°${formulaNo(SHOWCASE)} ${SHOWCASE.name.toUpperCase()}`,
  line: "for KHUN PRAEWA · after two minutes",
  lieu: LIEU,
};

/** The typewriter moment: erase "YOU", type a customer's name, then a note. */
function labelAt(p: number): Formula["tubeText"] {
  const NAME = "KHUN PRAEWA";
  const NOTE = "smile more";
  const steps = 3 + NAME.length + NOTE.length;
  const s = Math.floor(seg(p, 0.502, 0.553) * steps);
  const caret = s > 0 && s < steps ? "_" : "";
  if (s < 3) return { forName: "YOU".slice(0, 3 - s) + caret, note: "" };
  if (s < 3 + NAME.length) return { forName: NAME.slice(0, s - 3) + caret, note: "" };
  return { forName: NAME, note: NOTE.slice(0, s - 3 - NAME.length) + caret };
}

/* -------------------------------------------------------------------- */
/* Floating botanicals                                                   */
/* -------------------------------------------------------------------- */

type Floater = {
  herbIdx: number;
  labelled: boolean;
  target: THREE.Vector3;
  start: THREE.Vector3;
  scale: number;
  spin: THREE.Vector3;
  delay: number;
};

function useFloaters(): Floater[] {
  return useMemo(() => {
    const list: Floater[] = [];
    const extra = [0, 0, 3, 3, 1, 1, 4, 11, 5, 0, 3, 8, 1, 4];
    const order = [...HERBS.map((_, i) => i), ...extra];
    order.forEach((herbIdx, i) => {
      const labelled = i < HERBS.length;
      const a = i * 2.39996 + 0.6;
      const r = labelled ? 2.25 + (i % 3) * 0.45 : 2.9 + (i % 4) * 0.55;
      const y = labelled ? 1.7 - (i / (HERBS.length - 1)) * 3.5 : Math.sin(i * 1.3) * 2.1;
      list.push({
        herbIdx,
        labelled,
        target: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
        // they come out of (and go back into) the floating paste
        start: AIR_CURVE.getPointAt(0.25 + ((i * 0.37) % 1) * 0.7).add(PASTE_AT),
        scale: labelled ? 1.05 : 0.6 + (i % 3) * 0.15,
        spin: new THREE.Vector3(((i * 13) % 7) / 18 + 0.05, ((i * 7) % 5) / 12 + 0.08, ((i * 5) % 3) / 14),
        delay: (i % 9) * 0.006,
      });
    });
    return list;
  }, []);
}

type TagSlots = { current: (HTMLDivElement | null)[] };

function Botanical({ f, progress, tags }: { f: Floater; progress: Progress; tags: TagSlots }) {
  const ref = useRef<THREE.Group>(null);
  const herb = HERBS[f.herbIdx];
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const label = f.labelled ? tags.current[f.herbIdx] : null;
    const p = progress.current;
    const out = easeOut(seg(p, 0.19 + f.delay, 0.28 + f.delay));
    const back = ease(seg(p, 0.37 + f.delay * 0.5, 0.42));
    const k = out * (1 - back);
    const g = ref.current!;
    g.visible = k > 0.002;
    if (!g.visible) {
      if (label) label.style.opacity = "0";
      return;
    }
    const t = state.clock.elapsedTime;
    g.position.lerpVectors(f.start, f.target, k);
    g.position.y += Math.sin(t * 0.8 + f.herbIdx) * 0.06 * k;
    g.rotation.set(t * f.spin.x + f.herbIdx, t * f.spin.y, t * f.spin.z + f.herbIdx * 0.5);
    g.scale.setScalar(f.scale * k);
    if (label) {
      // Tags appear once the "twelve herbs" headline has made room, and only for
      // botanicals on the camera's side of the tube, to keep it legible.
      g.getWorldPosition(tmp);
      const facing = camDir.copy(tmp).normalize().dot(state.camera.position.clone().normalize());
      const vis = seg(k, 0.85, 1) * seg(p, 0.29, 0.31) * (1 - seg(p, 0.365, 0.385)) * seg(facing, 0.05, 0.45);
      label.style.opacity = String(vis);
      if (vis > 0) {
        tmp.project(state.camera);
        const x = (tmp.x * 0.5 + 0.5) * state.size.width + 14;
        const y = (-tmp.y * 0.5 + 0.5) * state.size.height + (1 - vis) * 10;
        label.style.transform = `translate3d(${x}px, ${y}px, 0) translateY(-50%)`;
      }
    }
  });
  return (
    <group ref={ref}>
      <HerbModel shape={herb.shape} color={herb.leaf} seed={f.herbIdx} />
    </group>
  );
}

/* -------------------------------------------------------------------- */
/* Camera                                                                */
/* -------------------------------------------------------------------- */

function Rig({ progress }: { progress: Progress }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const p = progress.current;
    const narrow = size.width < 768;
    const ang = track(CAM.ang, p);
    // Final framing fits the whole portrait card to the screen, whatever its
    // shape: far enough back for its height and width, pinned to the right so
    // the text panel sits over the photo's empty side.
    const T = Math.tan(THREE.MathUtils.degToRad(32 / 2));
    const aspect = size.width / Math.max(1, size.height);
    const fitR = Math.max(
      (PORTRAIT.cardHeight / 2) * 1.2 / T,
      PORTRAIT.cardWidth / 2 / (narrow ? 0.96 : 0.94) / (T * aspect),
    );
    const halfW = fitR * T * aspect;
    // right-aligned on narrower screens, a little right of centre on wide ones
    const fitShift = PORTRAIT.cardCenterX - Math.min(0.95 * halfW - PORTRAIT.cardWidth / 2, 0.38 * halfW);
    const fit = ease(seg(p, 0.955, 0.99));
    const END_R = CAM.radius[CAM.radius.length - 1][1];
    const END_SHIFT = CAM.shift[CAM.shift.length - 1][1];
    const radius = lerp(track(CAM.radius, p) * (narrow ? 1.55 : 1), track(CAM.radius, p) + fitR - END_R, fit);
    // parallax scales with distance, so close-ups don't swim
    const par = Math.min(1, radius / 9.2);
    const mx = state.pointer.x * 0.35 * par;
    const my = state.pointer.y * 0.25 * par;
    camera.position.set(Math.sin(ang) * radius + mx, track(CAM.y, p) + my, Math.cos(ang) * radius);
    // on phones the text sits at the bottom, so lift the scene above it
    const phoneLift = narrow ? -0.9 - (1 - seg(p, 0.03, 0.08)) * 0.5 : 0;
    look.set(0, track(CAM.look, p) + phoneLift, 0);
    camera.lookAt(look);
    if (!narrow) camera.translateX(track(CAM.shift, p) + (fitShift - END_SHIFT) * fit);
    else {
      // phones: card centred, near the top, above the text panel at the bottom
      const halfH = fitR * T;
      camera.translateX(PORTRAIT.cardCenterX * fit);
      camera.translateY(-(0.78 * halfH - PORTRAIT.cardHeight / 2 + phoneLift) * fit);
    }
  });
  return null;
}

/* -------------------------------------------------------------------- */
/* Director: tube, box, brush and smile                                  */
/* -------------------------------------------------------------------- */

const BRUSH_AT = new THREE.Vector3(0, -0.75, 0);
/** brush size while brushing (head ≈ 60% of the visible teeth) */
const BRUSH_SCALE = 0.17;
/** bristle-tip distance from the head's origin, and half the head length (brush units) */
const BRUSH_TIP = 0.42;
const BRUSH_HEAD_HALF = 1.0;
/** bristles point into the teeth, tilted this much up towards the gums */
const BRUSH_TILT = 0.35;
/** nozzle tip relative to the ribbon front: a little above and ahead of it, so
 *  the paste visibly leaves the nozzle and bends down into the ribbon */
const NOZZLE_ON_RIBBON = new THREE.Vector3(-0.12, 0.2, 0);
/** where the nozzle sits while the tube hangs upside down in the first act */
const PASTE_AT = new THREE.Vector3(0, 0.2, 0);
const AIR_CURVE = pasteFloatCurve();
const CAP_ON_POSE: CapPose = { lift: 0, spin: 0, drift: [0, 0, 0], tumble: 0 };

function Story({ progress }: { progress: Progress }) {
  const [tubeText, setTubeText] = useState(SHOWCASE.tubeText);
  const formula = useMemo(() => ({ ...SHOWCASE, tubeText }), [tubeText]);
  const tex = useFormulaTextures(formula);
  const paste = pasteColor(SHOWCASE);

  const tube = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Group>(null);
  const brushPhase = useMemo<BrushPhase>(
    () => ({ ribbon: 0, used: 0, flow: 0, nozzle: NOZZLE_ON_RIBBON.clone(), nozzleDir: new THREE.Vector3(0, -1, 0) }),
    [],
  );
  const smilePhase = useMemo<SmilePhase>(() => ({ appear: 0, foam: 0, brushX: 0, tipY: 0, headHalf: 0, brushing: 0, sparkle: 0, reveal: 0 }), []);
  const pastePhase = useMemo<PastePhase>(() => ({ grow: 0 }), []);
  const [anim, setAnim] = useState({ closed: 0, uncap: 0, squash: 0, cap: CAP_ON_POSE });

  const tmp = useMemo(
    () => ({ euler: new THREE.Euler(), nozzle: new THREE.Vector3(), target: new THREE.Vector3(), base: new THREE.Vector3() }),
    [],
  );

  useFrame((state) => {
    const p = progress.current;
    const t = state.clock.elapsedTime;

    /* ---- tube: flip, unscrew, squeeze into the air, then everything back ---- */
    const intro = 1 - seg(p, 0, 0.05);
    const flip = ease(seg(p, 0.03, 0.09)) * (1 - ease(seg(p, 0.468, 0.49)));
    const unscrew = ease(seg(p, 0.085, 0.12)) * (1 - ease(seg(p, 0.45, 0.468)));
    const drift = ease(seg(p, 0.115, 0.15)) * (1 - ease(seg(p, 0.432, 0.452)));
    const airPaste = ease(seg(p, 0.14, 0.24)) * (1 - ease(seg(p, 0.412, 0.442)));
    // one slow turn during the orbit, ending label-forward for the close-up
    const spin = ease(seg(p, 0.2, 0.46)) * TAU;
    const cap: CapPose = {
      lift: unscrew * 0.45,
      spin: -unscrew * TAU * 2.5,
      // tube is upside down here: local (-x, -y, z) reads as world (x, y, z)
      drift: [-1.5 * drift, -0.7 * drift, 0.7 * drift],
      tumble: drift,
    };
    pastePhase.grow = airPaste;

    /* ---- box ---- */
    const rise = ease(seg(p, 0.58, 0.64));
    // packed and closed on the right; glides left (0.70–0.735) while slowly
    // turning once round, so its back shows on the way; then opens fully again
    // (lid, then dust flaps) to let the tube out
    const closed = ease(seg(p, 0.64, 0.7)) - ease(seg(p, 0.735, 0.756));
    const glideSpin = ease(seg(p, 0.7, 0.735)) * TAU;
    const sink = ease(seg(p, 0.758, 0.798));
    const lift = ease(seg(p, 0.75, 0.776));

    /* ---- squeeze ---- */
    const pose = ease(seg(p, 0.765, 0.8));
    const uncap = ease(seg(p, 0.776, 0.802));
    const sq = seg(p, 0.8, 0.86);
    const exit = ease(seg(p, 0.86, 0.89));

    /* ---- brush + smile ---- */
    const enter = ease(seg(p, 0.765, 0.8));
    const toFace = ease(seg(p, 0.86, 0.885));
    const stroke = seg(p, 0.885, 0.93);
    const leave = ease(seg(p, 0.93, 0.955));

    // Tube: free-floating pose → squeeze pose over the brush
    const rotY = lerp(intro * Math.sin(t * 0.45) * 0.5 + spin, -0.35, pose);
    // squeeze pose: tube leans left (body up-left, nozzle pointing down-right
    // at the paste it has just laid) while it travels from the handle end of
    // the head towards the tip
    const rotZ = lerp(intro * Math.sin(t * 0.3) * 0.06 + flip * Math.PI, 0.6, pose) + exit * 0.8;
    tmp.base.set(0, intro * Math.sin(t * 0.9) * 0.08 + lerp(0.25, PASTE_AT.y - -NOZZLE_Y, flip) * (1 - rise) + lift * 4.8, 0);
    tmp.euler.set(0, rotY, rotZ);
    tmp.nozzle.set(0, NOZZLE_Y, 0).applyEuler(tmp.euler);
    // the nozzle sits right on the growing front of the ribbon, so the paste
    // comes straight out of the tip
    ribbonFront(sq, tmp.target);
    tmp.target.add(BRUSH_AT).add(NOZZLE_ON_RIBBON).sub(tmp.nozzle);
    const tb = tube.current!;
    tb.position.lerpVectors(tmp.base, tmp.target, pose);
    tb.position.y += exit * 7;
    // the packed tube turns with the box (a full turn, so nothing changes after)
    tb.rotation.set(0, rotY + glideSpin, rotZ);
    tb.visible = exit < 0.999;

    const bx = box.current!;
    bx.visible = rise > 0.001 && sink < 0.999;
    bx.position.y = -9 + rise * 8.7 - sink * 10;
    bx.rotation.y = (1 - rise) * -0.8 + glideSpin;

    // Brush: slides in under the nozzle, then turns to scrub the teeth
    const br = brush.current!;
    br.visible = enter > 0.001 && leave < 0.999;
    // Brushing like a person does: the brush lies along the teeth with the
    // handle out to the side, bristles angled 45° up towards the gumline, and
    // short back-and-forth strokes that work their way across the teeth.
    // Positions come from the photo's measured teeth, so the bristle tips land
    // on the upper teeth just under the gumline — where the foam appears.
    const tw = PORTRAIT.teethWidth;
    const on = Math.min(1, stroke * 6) * (1 - seg(stroke, 0.9, 1));
    const wiggle = Math.sin(stroke * TAU * 16);
    // head centred on the mouth, short strokes either side of it
    const brushX = wiggle * 0.06 * tw * on;
    // Seen from the front, a brush on the upper teeth shows the back of its
    // head lying over them, bristles pressed into the teeth (hidden) and tilted
    // a little up towards the gums. The head's centre sits on the upper teeth.
    const tipDepth = BRUSH_TIP * BRUSH_SCALE * Math.cos(BRUSH_TILT); // how far the tips reach into the scene
    const brushY = -PORTRAIT.teethHeight * 0.48 + Math.cos(stroke * TAU * 16) * 0.008 * tw * on;
    br.position.set(
      lerp(lerp(9, BRUSH_AT.x, enter), brushX, toFace) + leave * 3,
      lerp(BRUSH_AT.y, brushY, toFace) - leave * 0.6,
      lerp(BRUSH_AT.z, tipDepth + 0.004, toFace) + leave * 0.4,
    );
    // real head ≈ 60% of the visible teeth span
    br.scale.setScalar(lerp(1, BRUSH_SCALE, toFace));
    br.rotation.set((-Math.PI / 2 + BRUSH_TILT) * toFace, 0, wiggle * 0.02 * on);
    brushPhase.ribbon = sq;
    brushPhase.flow = seg(p, 0.796, 0.805) * (1 - exit);
    // nozzle points along the tube's local -y
    brushPhase.nozzleDir.set(0, -1, 0).applyEuler(tmp.euler);
    // the paste melts away as the brush heads to the teeth
    brushPhase.used = ease(seg(p, 0.866, 0.89));

    smilePhase.appear = ease(seg(p, 0.86, 0.89));
    // foam appears where the bristles have scrubbed, then is rinsed away as we pull back
    // zero before brushing starts (this also resets what counts as "scrubbed")
    // builds up gradually while brushing (a little at a time), then melts away
    // as soon as the strokes stop
    smilePhase.foam = seg(p, 0.886, 0.92) * (1 - ease(seg(p, 0.925, 0.94)));
    smilePhase.brushX = brushX;
    // bristle tips, seen from the front: just above the head (they tilt up to the gums)
    smilePhase.tipY = brushY + BRUSH_TIP * BRUSH_SCALE * Math.sin(BRUSH_TILT);
    smilePhase.headHalf = BRUSH_HEAD_HALF * BRUSH_SCALE;
    smilePhase.brushing = toFace > 0.98 && stroke > 0 && stroke < 1 ? 1 : 0;
    smilePhase.sparkle = seg(p, 0.955, 0.96);
    // after brushing: first zoom out to the mouth picture, then the whole photo appears around it
    smilePhase.reveal = ease(seg(p, 0.955, 0.975));

    // label typewriter — redraw the texture only when a letter changes
    const lt = labelAt(p);
    if (lt.forName !== tubeText.forName || lt.note !== tubeText.note) setTubeText(lt);

    // geometry-level props re-render only when they move
    // the body flattens while paste is out (in the air, then onto the brush)
    const squash = airPaste * 0.4 + sq * 0.7 * (1 - exit);
    if (
      Math.abs(closed - anim.closed) > 0.002 ||
      Math.abs(uncap - anim.uncap) > 0.002 ||
      Math.abs(squash - anim.squash) > 0.002 ||
      Math.abs(cap.lift - anim.cap.lift) > 0.002 ||
      Math.abs(cap.spin - anim.cap.spin) > 0.01 ||
      Math.abs(cap.tumble - anim.cap.tumble) > 0.002
    ) {
      setAnim({ closed, uncap, squash, cap });
    }
  });

  return (
    <group>
      <PaperTube
        ref={tube}
        texture={tex.tube}
        capTexture={tex.cap}
        liningColor={tex.liningColor}
        cap={anim.cap}
        uncap={anim.uncap}
        squash={anim.squash}
      />
      <PaperBox
        ref={box}
        shape="tuck"
        closed={anim.closed}
        front={tex.boxFront}
        wrap={tex.boxWrap}
        paper={tex.boxPaper}
        position={[0, -9, 0]}
      />
      <FloatingPaste color={paste} phase={pastePhase} position={PASTE_AT.toArray()} />
      <Toothbrush ref={brush} pasteColor={paste} phase={brushPhase} />
      <Smile phase={smilePhase} caption={CAPTION} />
    </group>
  );
}

/** Contact shadow for the product acts. It fades out while the box rises up
 *  through the floor and again while it sinks away after the unboxing
 *  (otherwise the tube's shadow is painted over the box); gone entirely for
 *  the brush/face acts. */
function Floor({ progress }: { progress: Progress }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = progress.current;
    // hidden whenever the box passes through the floor: rising (0.58–0.64)
    // and sinking away after the unboxing (0.735–0.785)
    const boxIn = Math.max(1 - seg(p, 0.55, 0.575), seg(p, 0.655, 0.685));
    const boxOut = Math.max(1 - seg(p, 0.73, 0.75), seg(p, 0.8, 0.82));
    const k = Math.min(boxIn, boxOut) * (1 - seg(p, 0.84, 0.86));
    const g = ref.current!;
    g.visible = k > 0.01;
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && "opacity" in m) {
        m.userData.base ??= m.opacity;
        m.opacity = m.userData.base * k;
      }
    });
  });
  return (
    <group ref={ref}>
      <ContactShadows position={[0, -TUBE.length / 2 - 1.1, 0]} opacity={0.32} scale={9} blur={2.6} far={4} color="#4a3f2c" />
    </group>
  );
}

/* -------------------------------------------------------------------- */

/** DOM layer for herb tags, positioned each frame by projecting the 3D botanicals. */
function TagLayer({ tags }: { tags: TagSlots }) {
  const { l } = useT();
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {HERBS.map((herb, i) => (
        <div
          key={herb.id}
          ref={(el) => {
            tags.current[i] = el;
          }}
          className="herb-tag absolute left-0 top-0"
          style={{ opacity: 0 }}
        >
          <span className="herb-tag-no">N°{String(herb.no).padStart(2, "0")}</span>
          <strong>{herb.name.en.toUpperCase()}</strong>
          <em>{herb.latin}</em>
          <span>{l(herb.benefit)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HeroScene({ progress }: { progress: Progress }) {
  const floaters = useFloaters();
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.4, 9.2], fov: 32, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={2.1} color="#fff6e6" />
        <directionalLight position={[-5, 2, -4]} intensity={0.7} color="#dfe9ff" />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[8, 3, 1]} color="#fff4e0" />
          <Lightformer form="rect" intensity={1.2} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} />
          <Lightformer form="ring" intensity={0.8} position={[5, -1, -3]} scale={3} color="#e8f0d8" />
        </Environment>

        <Rig progress={progress} />
        <Story progress={progress} />
        {floaters.map((f, i) => (
          <Botanical key={i} f={f} progress={progress} tags={tags} />
        ))}
        <Sparkles count={70} scale={[9, 6, 9]} size={2.2} speed={0.25} color="#b9a77a" opacity={0.55} />
        <Floor progress={progress} />
        <fog attach="fog" args={["#efebe3", 24, 50]} />
      </Canvas>
      <TagLayer tags={tags} />
    </>
  );
}
