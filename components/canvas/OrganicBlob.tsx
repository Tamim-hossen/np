'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { scrollRef } from '@/hooks/useScrollProgress';
import { isLargeMouseViewport } from '@/lib/large-mouse';
import * as THREE from 'three';

export const caseStudiesScreenBounds = { top: 0, bottom: 0 };
export const reviewsScreenBounds = { top: 0, bottom: 0 };
export const contactScreenBounds = { top: 0, bottom: 0 };

export interface OrganicBlobProps {
  radius: number;
  position: [number, number, number];
  blobType: 'topRight' | 'bottomMain' | 'droplet';
  color?: THREE.ColorRepresentation;
  stretch?: [number, number, number];
  adaptToSectionColors?: boolean;
}

interface ActiveRipple {
  origin: THREE.Vector3;
  startTime: number;
}

/* -------------------------------------------------------------------------- */
/*  Liquid scroll effect — tuning                                             */
/* -------------------------------------------------------------------------- */

// How strongly each part of the effect shows (fractions of the blob radius)
const LIQUID = {
  stretch: 0.14, // vertical stretch / squash while scrolling (volume preserving)
  tail: 0.24, // teardrop tail that trails behind the motion
  sway: 0.12, // top and bottom lag sideways against each other
  wave: 0.06, // slow surface wave that keeps sloshing after you stop
  ripple: 0.045, // faster, finer surface shimmer while moving
  scrollSpeedForMax: 1200, // px/s of scrolling that counts as "full" intensity
};

// Spring per blob: k = stiffness, c = damping (damping ratio is ~0.45, so it overshoots
// like jelly), gain = how reactive it is. The droplet is lightest, so it reacts most.
const LIQUID_SPRING = {
  bottomMain: { k: 36, c: 5.5, gain: 0.9 },
  topRight: { k: 44, c: 6.0, gain: 1.0 },
  droplet: { k: 60, c: 6.5, gain: 1.3 },
} as const;

// Second, softer spring that trails the first one: this is the lazy slosh after scrolling stops
const SLOSH_K = 20;
const SLOSH_C = 2.4;

function isInteractivePointerTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('a, button, input, select, textarea, [role="button"], [data-lenis-prevent]') !==
      null
  );
}

export function OrganicBlob({
  radius,
  position,
  blobType,
  color = '#fefefe',
  stretch = [1, 1, 1],
  adaptToSectionColors = true,
}: OrganicBlobProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const proxyRef = useRef<THREE.Mesh>(null);
  const darkSectionUniforms = useRef({
    top: { value: 0 },
    bottom: { value: 0 },
    reviewsTop: { value: 0 },
    reviewsBottom: { value: 0 },
    contactTop: { value: 0 },
    contactBottom: { value: 0 },
    color: { value: new THREE.Color('#3b3b3b') },
  });

  // Cutting tracking refs
  const isCutting = useRef(false);
  const cutPointerType = useRef<string | null>(null);
  const cutIntensity = useRef(0);
  const targetCutLocal = useRef(new THREE.Vector3());
  const currentCut = useRef(new THREE.Vector3());
  const wasDeformed = useRef(false);

  // Click ripple wave tracking
  const ripples = useRef<ActiveRipple[]>([]);

  // Keep latest R3F clock time in sync so pointer events can use it
  const clockTime = useRef(0);
  const wasBackgroundPaused = useRef(false);
  const frozenBackgroundTime = useRef(0);
  const backgroundTimeOffset = useRef(0);
  const previousScrollY = useRef(scrollRef.scrollY);
  const scrollVelocity = useRef(0);

  // Liquid spring state: `liquid` follows the scroll velocity with overshoot,
  // `slosh` follows `liquid` more lazily.
  const liquid = useRef({ p: 0, v: 0 });
  const slosh = useRef({ p: 0, v: 0 });

  // Reused for per-frame hover checks (scroll can move blob out from under cursor)
  const hoverRaycaster = useRef(new THREE.Raycaster());
  const hoverNdc = useRef(new THREE.Vector2());

  // Generate base undeformed organic shape
  const baseGeometry = useMemo(() => {
    const segments = blobType === 'droplet' ? 32 : 38;
    const geom = new THREE.SphereGeometry(radius, segments, segments);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      dir.copy(v).normalize();

      let displacement = 1.0;

      if (blobType === 'topRight') {
        const fold =
          Math.sin(dir.x * 1.6 + 0.3) * 0.15 +
          Math.cos(dir.y * 2.0 - 0.2) * 0.11 +
          Math.sin(dir.z * 2.2) * 0.07;
        displacement = 1.0 + fold;
      } else if (blobType === 'bottomMain') {
        const mound1 = Math.sin(dir.x * 1.4 - 0.3) * 0.14;
        const mound2 = Math.cos(dir.y * 1.6 + 0.2) * 0.11;
        const mound3 = Math.sin((dir.x + dir.z) * 1.8) * 0.08;
        displacement = 1.0 + mound1 + mound2 + mound3;
      } else {
        const drop =
          dir.y * 0.12 +
          Math.sin(dir.x * 2.2) * 0.08 +
          Math.cos(dir.z * 2.0) * 0.06;
        displacement = 1.0 + drop;
      }

      v.copy(dir)
        .multiplyScalar(radius * displacement)
        .multiply(new THREE.Vector3(...stretch));

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geom.computeVertexNormals();
    return geom;
  }, [radius, blobType, stretch]);

  // Clone geometry for the visible deforming mesh
  const visibleGeometry = useMemo(() => {
    return baseGeometry.clone();
  }, [baseGeometry]);

  // Original base positions array for deformation calculations
  const basePositions = useMemo(() => {
    return (baseGeometry.attributes.position.clone().array as Float32Array).slice();
  }, [baseGeometry]);

  // Morph amplitude scales per blobType — droplet wobbles more (smaller mass)
  const morphScale = useMemo(() => {
    if (blobType === 'bottomMain') return { s1: 0.042, s2: 0.026, s3: 0.014 };
    if (blobType === 'topRight')   return { s1: 0.048, s2: 0.030, s3: 0.016 };
    return /* droplet */           { s1: 0.060, s2: 0.038, s3: 0.020 };
  }, [blobType]);

  // Trigger circular wave ripple on click
  const triggerRipple = (worldPoint: THREE.Vector3, currentTime: number) => {
    if (!meshRef.current) return;
    meshRef.current.updateWorldMatrix(true, false);
    const localOrigin = new THREE.Vector3();
    meshRef.current.worldToLocal(localOrigin.copy(worldPoint));
    ripples.current.push({
      origin: localOrigin,
      startTime: currentTime,
    });
    // Keep max 4 concurrent ripples
    if (ripples.current.length > 4) {
      ripples.current.shift();
    }
  };

  // Reset cursor on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
    };
  }, []);

  // Frame update: cutting slice trench + outward fluid ripple propagation
  // eslint-disable-next-line react-hooks/immutability -- R3F mutates Three.js objects in its frame loop.
  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    darkSectionUniforms.current.top.value = adaptToSectionColors
      ? caseStudiesScreenBounds.top
      : 0;
    darkSectionUniforms.current.bottom.value = adaptToSectionColors
      ? caseStudiesScreenBounds.bottom
      : 0;
    darkSectionUniforms.current.reviewsTop.value = adaptToSectionColors
      ? reviewsScreenBounds.top
      : 0;
    darkSectionUniforms.current.reviewsBottom.value = adaptToSectionColors
      ? reviewsScreenBounds.bottom
      : 0;
    darkSectionUniforms.current.contactTop.value = adaptToSectionColors
      ? contactScreenBounds.top
      : 0;
    darkSectionUniforms.current.contactBottom.value = adaptToSectionColors
      ? contactScreenBounds.bottom
      : 0;

    const elapsedTime = state.clock.elapsedTime;
    const backgroundPaused = scrollRef.backgroundScrollPaused;
    if (backgroundPaused && !wasBackgroundPaused.current) {
      frozenBackgroundTime.current = elapsedTime - backgroundTimeOffset.current;
    } else if (!backgroundPaused && wasBackgroundPaused.current) {
      backgroundTimeOffset.current =
        elapsedTime - frozenBackgroundTime.current;
    }
    wasBackgroundPaused.current = backgroundPaused;

    // Keep the world position fixed while allowing pointer-driven interaction.
    groupRef.current.position.set(...position);
    groupRef.current.scale.set(1, 1, 1);
    groupRef.current.rotation.set(0, 0, 0);

    // Keep meshes centered at group local origin
    meshRef.current.position.set(0, 0, 0);
    meshRef.current.scale.set(1, 1, 1);
    meshRef.current.rotation.set(0, 0, 0);

    // Frustum / viewport visibility culling:
    // Skip heavy vertex loops and normal computation for off-screen blobs
    groupRef.current.updateWorldMatrix(true, false);
    const worldY = groupRef.current.matrixWorld.elements[13];
    const cameraY = state.camera.position.y;
    const isVisible = Math.abs(worldY - cameraY) <= 6.2 + radius;

    const currentScrollY = scrollRef.scrollY;
    const scrollDelta = currentScrollY - previousScrollY.current;
    previousScrollY.current = currentScrollY;

    if (!isVisible) {
      if (meshRef.current.visible) {
        meshRef.current.visible = false;
      }
      return;
    }

    if (!meshRef.current.visible) {
      meshRef.current.visible = true;
    }

    const animationTime = backgroundPaused
      ? frozenBackgroundTime.current
      : elapsedTime - backgroundTimeOffset.current;
    clockTime.current = elapsedTime;

    // Scroll speed, normalised to -1..1 (positive = scrolling down)
    const targetScrollVelocity = backgroundPaused
      ? 0
      : THREE.MathUtils.clamp(
          scrollDelta / Math.max(delta * LIQUID.scrollSpeedForMax, 1),
          -1,
          1
        );
    scrollVelocity.current = THREE.MathUtils.damp(
      scrollVelocity.current,
      targetScrollVelocity,
      10,
      delta
    );

    // Two chained under-damped springs. The first overshoots and wobbles like jelly,
    // the second trails behind it so the surface keeps sloshing after scrolling stops.
    const spring = LIQUID_SPRING[blobType];
    const stepDt = Math.min(delta, 1 / 30) / 2; // two sub-steps keep it stable on slow frames
    const drive = scrollVelocity.current * spring.gain;
    const lq = liquid.current;
    const sl = slosh.current;
    for (let s = 0; s < 2; s++) {
      lq.v += (spring.k * (drive - lq.p) - spring.c * lq.v) * stepDt;
      lq.p += lq.v * stepDt;
      sl.v += (SLOSH_K * (lq.p - sl.p) - SLOSH_C * sl.v) * stepDt;
      sl.p += sl.v * stepDt;
    }
    // Snap to rest so we stop doing work when nothing is moving
    if (Math.abs(lq.p) < 0.0015 && Math.abs(lq.v) < 0.003) {
      lq.p = 0;
      lq.v = 0;
    }
    if (Math.abs(sl.p) < 0.0015 && Math.abs(sl.v) < 0.003) {
      sl.p = 0;
      sl.v = 0;
    }

    const L = lq.p; // fast response, + = scrolling down
    const S = sl.p; // lazy slosh
    const liquidActive = L !== 0 || S !== 0;

    // Volume-preserving stretch: taller means narrower
    const stretchAmount = LIQUID.stretch * Math.abs(L) + 0.05 * Math.abs(S);
    const scaleY = 1 + stretchAmount;
    const scaleXZ = 1 / Math.sqrt(scaleY);

    // Scroll moves blobs without firing pointerleave — re-test hover each frame
    if (
      isCutting.current &&
      cutPointerType.current !== 'touch' &&
      !isLargeMouseViewport()
    ) {
      isCutting.current = false;
      cutPointerType.current = null;
      if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
    }

    if (isCutting.current && proxyRef.current) {
      proxyRef.current.updateWorldMatrix(true, false);
      hoverNdc.current.set(state.pointer.x, state.pointer.y);
      hoverRaycaster.current.setFromCamera(hoverNdc.current, state.camera);
      const hits = hoverRaycaster.current.intersectObject(proxyRef.current, false);

      if (hits.length === 0) {
        isCutting.current = false;
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
      } else if (meshRef.current) {
        meshRef.current.updateWorldMatrix(true, false);
        meshRef.current.worldToLocal(targetCutLocal.current.copy(hits[0].point));
      }
    }

    // Filter out finished ripples older than 1.4s
    ripples.current = ripples.current.filter(
      (r) => elapsedTime - r.startTime < 1.4
    );

    const targetIntensity = isCutting.current ? 1.0 : 0.0;
    cutIntensity.current = THREE.MathUtils.damp(
      cutIntensity.current,
      targetIntensity,
      isCutting.current ? 12 : 5,
      delta
    );

    // Smoothly track cut coordinates
    currentCut.current.lerp(targetCutLocal.current, 0.45);

    const hasActiveRipples = ripples.current.length > 0;
    const hasCutting = cutIntensity.current > 0.003;

    // Ambient morph animation — 3 slow temporal layers
    const t1 = animationTime * 0.22; // very slow
    const t2 = animationTime * 0.40; // medium
    const t3 = animationTime * 0.68; // still smooth but a bit snappier

    // Apply incision deformation + ripples + ambient morph to vertices
    wasDeformed.current = true;
    {
      const posAttr = visibleGeometry.attributes.position;
      const currentArray = posAttr.array as Float32Array;
      const cutPos = currentCut.current;
      const cutRadius = radius * 0.82;
      const maxIncision = radius * 0.55;
      const intensity = cutIntensity.current;
      const cutRadiusSq = cutRadius * cutRadius;

      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        const bx = basePositions[idx];
        const by = basePositions[idx + 1];
        const bz = basePositions[idx + 2];

        // 1. Knife cutting slice trench
        let trench = 0;
        let lipBulge = 0;

        if (hasCutting) {
          const dx = bx - cutPos.x;
          const dy = by - cutPos.y;
          const dz = bz - cutPos.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < cutRadiusSq) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / cutRadius;
            trench = Math.pow(factor, 1.8) * maxIncision * intensity;
            lipBulge = Math.sin(factor * Math.PI) * (maxIncision * 0.16) * intensity;
          }
        }

        // 2. Click ripple propagation outward from click points
        let totalRippleWave = 0;

        if (hasActiveRipples) {
          for (let r = 0; r < ripples.current.length; r++) {
            const rip = ripples.current[r];
            const age = elapsedTime - rip.startTime;
            if (age <= 0) continue;

            const speed = radius * 3.6; // Fluid wave speed
            const waveFront = age * speed;

            const rdx = bx - rip.origin.x;
            const rdy = by - rip.origin.y;
            const rdz = bz - rip.origin.z;
            const rDist = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz);

            const diff = rDist - waveFront;
            const waveWidth = radius * 0.48;

            if (Math.abs(diff) < waveWidth) {
              const windowEnvelope = Math.cos((diff / waveWidth) * (Math.PI / 2));
              const decay = Math.exp(-age * 2.6);
              // Circular wave displacement
              const waveHeight =
                Math.sin(diff * 14) *
                windowEnvelope *
                windowEnvelope *
                (radius * 0.22) *
                decay;
              totalRippleWave += waveHeight;
            }
          }
        }

        // 3. Ambient organic morph — spatially-coherent waves driven by vertex direction
        const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        const nx = bx / len;
        const ny = by / len;
        const nz = bz / len;

        // Low spatial frequencies (1.5–2.4) = only large-scale shape changes
        const morphDisp =
          Math.sin(t1 + nx * 1.8 + ny * 1.5) * morphScale.s1 * radius +
          Math.sin(t2 + ny * 2.1 + nz * 1.7) * morphScale.s2 * radius +
          Math.sin(t3 + nz * 1.6 + nx * 2.4) * morphScale.s3 * radius;

        // 4. Liquid scroll response (water-droplet inertia)
        let liquidNormal = 0;
        let liquidX = 0;
        let liquidY = 0;

        if (liquidActive) {
          // Teardrop tail: the side facing away from the motion is dragged out and trails behind.
          // Scrolling down pulls the bottom out below the blob, scrolling up pulls the top out above it.
          const tailFacing = L > 0 ? -ny : ny;
          const tail = tailFacing > 0 ? Math.pow(tailFacing, 1.5) : 0;
          liquidY = -L * LIQUID.tail * radius * tail;

          // Top and bottom lag sideways against each other as the slosh swings
          liquidX = S * LIQUID.sway * radius * ny;

          // Surface waves: a slow standing wave that sloshes with S (it keeps going and
          // reverses after you stop, like jelly settling), plus a finer travelling shimmer.
          liquidNormal =
            radius *
            (LIQUID.wave * S * Math.sin(ny * 4.2 + nx * 1.6 - S * 2.0) +
              LIQUID.ripple * L * Math.sin(ny * 7.0 - nz * 1.4 - S * 3.0));
        }

        const netNormalDisplacement =
          -trench + lipBulge + totalRippleWave + morphDisp + liquidNormal;

        // eslint-disable-next-line react-hooks/immutability -- Update the GPU vertex buffer for this frame.
        currentArray[idx] = bx * scaleXZ + nx * netNormalDisplacement + liquidX;
        currentArray[idx + 1] = by * scaleY + ny * netNormalDisplacement + liquidY;
        currentArray[idx + 2] = bz * scaleXZ + nz * netNormalDisplacement;
      }

      posAttr.needsUpdate = true;
      visibleGeometry.computeVertexNormals();
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Visible rendering mesh with physical porcelain material and dynamic trench & ripple deformation */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        geometry={visibleGeometry}
        raycast={() => null} // Disable raycasting on deforming geometry to prevent glitching/jitter
      >
        <meshPhysicalMaterial
          color={color}
          roughness={0.24}
          metalness={0.02}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
          transmission={0}
          ior={1.38}
          specularIntensity={0.9}
          specularColor="#ffffff"
          attenuationColor="#ffffff"
          attenuationDistance={2.5}
          onBeforeCompile={(shader) => {
            shader.uniforms.uDarkSectionTop = darkSectionUniforms.current.top;
            shader.uniforms.uDarkSectionBottom = darkSectionUniforms.current.bottom;
            shader.uniforms.uReviewsSectionTop = darkSectionUniforms.current.reviewsTop;
            shader.uniforms.uReviewsSectionBottom = darkSectionUniforms.current.reviewsBottom;
            shader.uniforms.uContactSectionTop = darkSectionUniforms.current.contactTop;
            shader.uniforms.uContactSectionBottom = darkSectionUniforms.current.contactBottom;
            shader.uniforms.uDarkEnvironmentColor = darkSectionUniforms.current.color;
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `#include <common>
              uniform float uDarkSectionTop;
              uniform float uDarkSectionBottom;
              uniform float uReviewsSectionTop;
              uniform float uReviewsSectionBottom;
              uniform float uContactSectionTop;
              uniform float uContactSectionBottom;
              uniform vec3 uDarkEnvironmentColor;`,
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              `#include <color_fragment>
              float caseStudiesMask = step(uDarkSectionBottom, gl_FragCoord.y) *
                step(gl_FragCoord.y, uDarkSectionTop);
              float reviewsMask = step(uReviewsSectionBottom, gl_FragCoord.y) *
                step(gl_FragCoord.y, uReviewsSectionTop);
              float contactMask = step(uContactSectionBottom, gl_FragCoord.y) *
                step(gl_FragCoord.y, uContactSectionTop);
              float darkSectionMask = max(max(caseStudiesMask, reviewsMask), contactMask);
              diffuseColor.rgb = mix(diffuseColor.rgb, uDarkEnvironmentColor, darkSectionMask);`,
            );
          }}
          customProgramCacheKey={() => 'organic-blob-dark-section-v3'}
        />
      </mesh>

      {/* 2. Invisible exact-shape proxy mesh capturing pointer move, enter, leave, and click ripples */}
      <mesh
        ref={proxyRef}
        position={[0, 0, 0]}
        geometry={baseGeometry}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.pointerType !== 'touch' && !isLargeMouseViewport()) return;
          if (isInteractivePointerTarget(e.nativeEvent.target)) return;
          // Use R3F clock time to stay in sync with the animation loop
          triggerRipple(e.point, clockTime.current);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          if (e.pointerType !== 'touch' && !isLargeMouseViewport()) return;
          if (isInteractivePointerTarget(e.nativeEvent.target)) return;
          isCutting.current = true;
          cutPointerType.current = e.pointerType;
          if (meshRef.current) {
            meshRef.current.updateWorldMatrix(true, false);
            meshRef.current.worldToLocal(targetCutLocal.current.copy(e.point));
            currentCut.current.copy(targetCutLocal.current);
          }
          if (typeof document !== 'undefined') document.body.style.cursor = 'crosshair';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.pointerType !== 'touch' && !isLargeMouseViewport()) return;
          if (isInteractivePointerTarget(e.nativeEvent.target)) {
            isCutting.current = false;
            cutPointerType.current = null;
            if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
            return;
          }
          isCutting.current = true;
          cutPointerType.current = e.pointerType;
          if (meshRef.current) {
            meshRef.current.updateWorldMatrix(true, false);
            meshRef.current.worldToLocal(targetCutLocal.current.copy(e.point));
          }
        }}
        onPointerLeave={() => {
          isCutting.current = false;
          cutPointerType.current = null;
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}