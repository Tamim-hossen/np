'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function BackgroundElements() {
  const meshRef = useRef<THREE.Mesh>(null);
  const secondMeshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
    if (secondMeshRef.current) {
      secondMeshRef.current.rotation.x -= delta * 0.15;
      secondMeshRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      {/* Temporary subtle wireframe mesh to confirm background canvas rendering */}
      <mesh ref={meshRef} position={[-4, 2, -2]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial wireframe color="#d1d5db" />
      </mesh>
      <mesh ref={secondMeshRef} position={[4.5, -3, -3]}>
        <octahedronGeometry args={[1.2]} />
        <meshStandardMaterial wireframe color="#e5e7eb" />
      </mesh>
    </>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="w-full h-full"
    >
      <BackgroundElements />
    </Canvas>
  );
}
