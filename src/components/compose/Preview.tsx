"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, OrbitControls } from "@react-three/drei";
import type { Formula } from "@/lib/formula";
import { PaperTube, TUBE } from "../three/Tube";
import { PaperBox } from "../three/Box";
import { useFormulaTextures } from "../three/textures";

export type View = "tube" | "box" | "both";

function Products({ f, view, boxOpen }: { f: Formula; view: View; boxOpen: boolean }) {
  const tex = useFormulaTextures(f);
  const tube = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const [closed, setClosed] = useState(1);
  const closedRef = useRef(1);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    const tubeX = view === "both" ? -1.25 : 0;
    const boxX = view === "both" ? 1.25 : 0;
    const tubeS = view === "box" ? 0.0001 : 1;
    const boxS = view === "tube" ? 0.0001 : 1;
    if (tube.current) {
      tube.current.position.x += (tubeX - tube.current.position.x) * k;
      const s = tube.current.scale.x + (tubeS - tube.current.scale.x) * k;
      tube.current.scale.setScalar(s);
      tube.current.visible = s > 0.01;
    }
    if (box.current) {
      box.current.position.x += (boxX - box.current.position.x) * k;
      const s = box.current.scale.x + (boxS - box.current.scale.x) * k;
      box.current.scale.setScalar(s);
      box.current.visible = s > 0.01;
    }
    const target = boxOpen ? 0 : 1;
    const next = closedRef.current + (target - closedRef.current) * (1 - Math.exp(-dt * 3));
    if (Math.abs(next - closedRef.current) > 0.001) {
      closedRef.current = next;
      setClosed(next);
    }
  });

  return (
    <>
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
        <PaperTube
          ref={tube}
          texture={tex.tube}
          capTexture={tex.cap}
          liningColor={tex.liningColor}
          position={[0, 0.35, 0]}
        />
      </Float>
      <PaperBox
        ref={box}
        shape={f.boxShape}
        closed={closed}
        front={tex.boxFront}
        wrap={tex.boxWrap}
        paper={tex.boxPaper}
        position={[0, 0, 0]}
        rotation={[0, -0.35, 0]}
      />
    </>
  );
}

export default function Preview({ f, view, boxOpen }: { f: Formula; view: View; boxOpen: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 9.5], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 6]} intensity={2} color="#fff6e6" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 5]} scale={[8, 3, 1]} color="#fff4e0" />
        <Lightformer form="rect" intensity={1} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>
      <Products f={f} view={view} boxOpen={boxOpen} />
      <ContactShadows position={[0, -TUBE.length / 2 - 0.85, 0]} opacity={0.35} scale={10} blur={2.4} far={4} color="#4a3f2c" />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={14}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate
        autoRotateSpeed={0.6}
        makeDefault
      />
    </Canvas>
  );
}
