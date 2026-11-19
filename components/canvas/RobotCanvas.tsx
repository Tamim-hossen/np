'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { RobotHead } from './RobotHead';

export default function RobotCanvas() {
  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0.1, 5.4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 8, 6]} intensity={1.3} castShadow />
        <directionalLight position={[-6, 4, -2]} intensity={0.5} color="#93c5fd" />
        <pointLight position={[0, 3, 3]} intensity={0.6} color="#60a5fa" />
        <Suspense fallback={null}>
          <RobotHead />
        </Suspense>
      </Canvas>
    </div>
  );
}
