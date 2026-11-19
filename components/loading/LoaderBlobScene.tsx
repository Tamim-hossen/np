'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { OrganicBlob } from '@/components/canvas/OrganicBlob';

// --- Tweakables -------------------------------------------------------------
const BASE_RADIUS = 0.17;  // radius at max size
const MIN_SCALE = 0.25;    // smallest size, as a fraction of max
const MAX_SCALE = 1;       // largest size
const GAP = 0.1;           // spacing between blob edges (world units)
const PULSE_SPEED = 7;     // higher = faster (one full cycle = 2π / speed s)
const PULSE_STAGGER = 0.7; // phase delay between neighbours (bigger = more wave)
// -----------------------------------------------------------------------------

const BLOB_TYPES = [
  'bottomMain',
  'topRight',
  'droplet',
  'droplet',
  'droplet',
] as const;

function PulsingBlob({
  index,
  x,
  blobType,
}: {
  index: number;
  x: number;
  blobType: (typeof BLOB_TYPES)[number];
}) {
  const groupRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // cos so blob 0 starts at max; each next blob lags behind = travelling wave
    const wave =
      (Math.cos(clock.elapsedTime * PULSE_SPEED - index * PULSE_STAGGER) + 1) / 2;
    const eased = wave * wave * (3 - 2 * wave);
    groupRef.current.scale.setScalar(
      MIN_SCALE + (MAX_SCALE - MIN_SCALE) * eased,
    );
  });

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      <OrganicBlob
        radius={BASE_RADIUS}
        position={[0, 0, 0]}
        blobType={blobType}
        color="#fefefe"
        adaptToSectionColors={false}
      />
    </group>
  );
}

function LoaderScene() {
  const { viewport } = useThree();

  // Any blob can reach max size, so every blob gets a full-size slot.
  const { xs, fit } = useMemo(() => {
    const n = BLOB_TYPES.length;
    const pitch = BASE_RADIUS * 2 * MAX_SCALE + GAP;
    const width = (n - 1) * pitch;
    return {
      xs: BLOB_TYPES.map((_, i) => i * pitch - width / 2),
      fit: width + BASE_RADIUS * 2 * MAX_SCALE,
    };
  }, []);

  const groupScale = Math.min(1, (viewport.width * 0.8) / fit);

  return (
    <>
      <ambientLight intensity={1.15} color="#ffffff" />
      <directionalLight position={[6, 8, 4]} intensity={2.4} color="#ffffff" />
      <pointLight position={[0, 0, 2]} intensity={1.4} color="#ffffff" distance={5} />
      <group scale={groupScale}>
        {xs.map((x, index) => (
          <PulsingBlob key={index} index={index} x={x} blobType={BLOB_TYPES[index]} />
        ))}
      </group>
    </>
  );
}

export default function LoaderBlobScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.5], fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      className="h-full w-full"
    >
      <LoaderScene />
    </Canvas>
  );
}