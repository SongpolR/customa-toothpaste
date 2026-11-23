"use client";
/* eslint-disable react-hooks/immutability -- three.js materials/textures are mutable GPU
   resources updated imperatively; the React Compiler is not enabled for this app. */

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { BOX_PAPERS, CAPS, TUBE_PAPERS, byId } from "@/lib/catalog";
import type { Formula } from "@/lib/formula";
import { BOX_TEX, drawBoxFront, drawPaper, drawTube, ensureLabelFont, paintPaper } from "@/lib/label";

function canvasTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

let fontReady: Promise<void> | null = null;
function useFontReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontReady ??= ensureLabelFont();
    let alive = true;
    fontReady.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** Live textures for a formula. Redraws when any label-relevant field changes. */
export function useFormulaTextures(f: Formula) {
  const fontOk = useFontReady();

  const canvases = useMemo(
    () => ({
      tube: document.createElement("canvas"),
      boxFront: document.createElement("canvas"),
      boxWrap: document.createElement("canvas"),
      boxPaper: document.createElement("canvas"),
      cap: document.createElement("canvas"),
    }),
    [],
  );
  const textures = useMemo(
    () => ({
      tube: canvasTexture(canvases.tube),
      boxFront: canvasTexture(canvases.boxFront),
      boxWrap: canvasTexture(canvases.boxWrap),
      boxPaper: canvasTexture(canvases.boxPaper),
      cap: canvasTexture(canvases.cap),
    }),
    [canvases],
  );

  const tubeKey = JSON.stringify([f.name, f.base, f.herbs, f.size, f.tubePaper, f.tubeText, fontOk]);
  const boxKey = JSON.stringify([f.name, f.base, f.herbs, f.size, f.boxPaper, f.boxText, f.boxShape, fontOk]);

  useEffect(() => {
    drawTube(canvases.tube, f);
    textures.tube.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tubeKey, canvases, textures]);

  useEffect(() => {
    drawBoxFront(canvases.boxFront, f);
    textures.boxFront.needsUpdate = true;
    // cylinder wrap: paper all around + front label in the middle
    const wrap = canvases.boxWrap;
    wrap.width = BOX_TEX.w * 3;
    wrap.height = BOX_TEX.h;
    const ctx = wrap.getContext("2d")!;
    paintPaper(ctx, wrap.width, wrap.height, byId(BOX_PAPERS, f.boxPaper) ?? BOX_PAPERS[0], 11);
    ctx.drawImage(canvases.boxFront, BOX_TEX.w, 0);
    textures.boxWrap.needsUpdate = true;
    drawPaper(canvases.boxPaper, f.boxPaper, "box");
    textures.boxPaper.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxKey, canvases, textures]);

  useEffect(() => {
    const cap = CAPS.find((c) => c.id === f.cap) ?? CAPS[0];
    const c = canvases.cap;
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    paintPaper(ctx, 256, 256, { id: "cap", name: { en: "", th: "" }, color: cap.color, fiber: cap.id === "cork" ? "#6d4a2a" : "#9b7442", price: 0 }, 5);
    if (cap.id === "bamboo") {
      // bamboo grain: vertical streaks
      for (let x = 0; x < 256; x += 3 + Math.random() * 6) {
        ctx.fillStyle = `rgba(120,80,30,${0.05 + Math.random() * 0.12})`;
        ctx.fillRect(x, 0, 1 + Math.random() * 1.5, 256);
      }
    }
    if (cap.id === "cork") {
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(70,40,15,${0.2 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    textures.cap.needsUpdate = true;
  }, [f.cap, canvases, textures]);

  useEffect(
    () => () => {
      Object.values(textures).forEach((t) => t.dispose());
    },
    [textures],
  );

  const tubePaper = byId(TUBE_PAPERS, f.tubePaper) ?? TUBE_PAPERS[0];
  return { ...textures, liningColor: tubePaper.id === "ink" ? "#2d2b29" : "#efe9dc" };
}
