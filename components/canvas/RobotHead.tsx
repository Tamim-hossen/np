'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

export function RobotHead() {
  const groupRef = useRef<THREE.Group>(null);

  // Smooth mouse tracking and subtle floating idle motion
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Mouse coordinates are normalized between -1 and 1
    const targetRotY = state.pointer.x * 0.45;
    const targetRotX = -state.pointer.y * 0.35;

    // Smooth dampening towards target rotation
    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetRotY,
      4.5,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetRotX,
      4.5,
      delta
    );

    // Natural subtle hovering animation
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Root animated robot head group */}
      <group ref={groupRef}>
        {/* Main Head: Sleek off-white rounded box / squircle */}
        <RoundedBox
          args={[2.4, 2.2, 1.8]}
          radius={0.2}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#f1f5f9"
            roughness={0.25}
            metalness={0.12}
          />
        </RoundedBox>

        {/* Antenna System */}
        <group position={[0, 1.1, 0]}>
          {/* Base Mount Ring */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.06, 32]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* Slim Metallic Stem */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.6, 24]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>

          {/* Emissive Glowing Sphere Tip */}
          <mesh position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.15, 32, 32]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={2.0}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Side Ear Components */}
        {/* Left Ear */}
        <group position={[-1.22, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.12, 32]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.22, 0.03, 16, 32]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>

        {/* Right Ear */}
        <group position={[1.22, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.12, 32]} />
            <meshStandardMaterial
              color="#334155"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.22, 0.03, 16, 32]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>

        {/* Face Screen Inset Frame & Glass Backing */}
        <mesh position={[0, 0, 0.91]}>
          <planeGeometry args={[1.96, 1.5]} />
          <meshStandardMaterial
            color="#050505"
            roughness={0.15}
            metalness={0.8}
          />
        </mesh>

        <mesh position={[0, 0, 0.915]}>
          <planeGeometry args={[1.9, 1.44]} />
          <meshBasicMaterial color="#0c0d0e" />
        </mesh>

        {/* CMD Terminal Interface via Drei HTML */}
        <Html
          transform
          occlude
          position={[0, 0, 0.925]}
          distanceFactor={2.35}
          className="select-none pointer-events-auto"
        >
          <div className="w-[280px] h-[195px] bg-[#0c0d0e] rounded-xl overflow-hidden border border-neutral-800 shadow-2xl flex flex-col font-mono text-[11px] text-left">
            {/* Terminal Window Bar */}
            <div className="h-7 bg-[#14161a] px-3 flex items-center justify-between border-b border-neutral-800/90">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shadow-sm" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block shadow-sm" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block shadow-sm" />
              </div>
              <span className="text-[10px] text-neutral-400 font-mono tracking-wider">
                bash: 3d-core
              </span>
              <span className="w-6" />
            </div>

            {/* Terminal Screen Content */}
            <div className="p-3.5 flex-1 flex flex-col justify-between text-neutral-300">
              <div className="space-y-1.5">
                <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>&gt; system.init()</span>
                </div>
                <div className="text-cyan-400">
                  &gt; status:{' '}
                  <span className="text-emerald-400 font-semibold">
                    online [100%]
                  </span>
                </div>
                <div className="text-neutral-400">
                  &gt; kernel: r3f.v9 + three.js
                </div>
                <div className="text-neutral-200 flex items-center">
                  <span>&gt; awaiting_input</span>
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse" />
                </div>
              </div>

              {/* Sub-status bar */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  FPS: 60
                </span>
                <span>LATENCY: 8ms</span>
                <span>MODE: INTERACTIVE</span>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* Grounded Soft Contact Shadow */}
      <ContactShadows
        position={[0, -1.6, 0]}
        opacity={0.4}
        scale={5}
        blur={2}
        far={4}
      />
    </group>
  );
}
