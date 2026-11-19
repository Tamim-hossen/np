'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import {
  OrganicBlob,
  caseStudiesScreenBounds,
  contactScreenBounds,
  reviewsScreenBounds,
} from './OrganicBlob';
import { scrollRef } from '@/hooks/useScrollProgress';
import { isLargeMouseViewport } from '@/lib/large-mouse';

gsap.registerPlugin(ScrollTrigger);

// World units traveled per viewport of scroll at 1:1 section tracking
const STEP_PER_SECTION = 4.2;
// Far-plane speed — same scroll clock as the page, less distance = deeper layer
const PARALLAX_SPEED = 0.716;
// Push the blob world slightly back so FG/BG read as two panel depths
const LAYER_DEPTH_Z = -1.35;
const LAYER_SCALE = 0.92;

function getPageScrollExcludingPins(scrollY: number) {
  return ScrollTrigger.getAll().reduce((pageScroll, trigger) => {
    if (!trigger.pin || !Number.isFinite(trigger.start) || !Number.isFinite(trigger.end)) {
      return pageScroll;
    }

    const pinDuration = Math.max(trigger.end - trigger.start, 0);
    const pinScroll = THREE.MathUtils.clamp(
      scrollY - trigger.start,
      0,
      pinDuration
    );

    return pageScroll - pinScroll;
  }, scrollY);
}

const SECTION_BLOB_LAYOUTS = [
  [
    {
      radius: 1.05,
      x: 3.2,
      yOffset: 0.2,
      z: -0.2,
      blobType: 'bottomMain' as const,
      stretch: [1.18, 0.92, 1.08] as [number, number, number],
    },
    {
      radius: 0.34,
      x: -3.8,
      yOffset: -0.6,
      z: 0.4,
      blobType: 'droplet' as const,
      stretch: [1.08, 0.95, 1] as [number, number, number],
    },
    {
      radius: 0.65,
      x: 1.6,
      yOffset: -1.6,
      z: -0.9,
      blobType: 'topRight' as const,
      stretch: [1, 1.12, 0.92] as [number, number, number],
    },
  ],
  [
    {
      radius: 1.22,
      x: -2.9,
      yOffset: 0.4,
      z: -0.6,
      blobType: 'bottomMain' as const,
      stretch: [1.22, 0.94, 1.04] as [number, number, number],
    },
    {
      radius: 0.28,
      x: 4,
      yOffset: -0.4,
      z: 0.3,
      blobType: 'droplet' as const,
      stretch: [1.05, 1, 0.95] as [number, number, number],
    },
    {
      radius: 0.78,
      x: 2.8,
      yOffset: -1.4,
      z: 0.2,
      blobType: 'topRight' as const,
      stretch: [1.14, 0.9, 1.06] as [number, number, number],
    },
  ],
  [
    {
      radius: 1.16,
      x: 0.2,
      yOffset: 0.2,
      z: 0.6,
      blobType: 'bottomMain' as const,
      stretch: [1.2, 0.96, 1.05] as [number, number, number],
    },
    {
      radius: 0.34,
      x: -3.5,
      yOffset: 0.6,
      z: 0.3,
      blobType: 'droplet' as const,
      stretch: [1, 1.05, 0.95] as [number, number, number],
    },
    {
      radius: 0.44,
      x: 3.6,
      yOffset: -1.2,
      z: 0.4,
      blobType: 'droplet' as const,
      stretch: [1.06, 0.94, 1] as [number, number, number],
    },
  ],
];

// Camera controller with subtle cursor parallax
function ParallaxCamera() {
  useFrame((state, delta) => {
    const pointerEnabled = isLargeMouseViewport();
    const targetX = pointerEnabled ? state.pointer.x * 0.22 : 0;
    const targetY = pointerEnabled ? state.pointer.y * 0.16 : 0;
    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetX,
      3.5,
      delta
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetY,
      3.5,
      delta
    );
  });
  return null;
}

const sectionMetrics = {
  section4: { docTop: 0, height: 0, found: false },
  section6: { docTop: 0, height: 0, found: false },
  section8: { docTop: 0, height: 0, found: false },
};

function updateSectionMetrics() {
  if (typeof window === 'undefined') return;
  const scrollY = window.scrollY || 0;
  const s4 = document.getElementById('section-4');
  if (s4) {
    const r = s4.getBoundingClientRect();
    sectionMetrics.section4 = { docTop: r.top + scrollY, height: r.height, found: true };
  } else {
    sectionMetrics.section4.found = false;
  }
  const s6 = document.getElementById('section-6');
  if (s6) {
    const r = s6.getBoundingClientRect();
    sectionMetrics.section6 = { docTop: r.top + scrollY, height: r.height, found: true };
  } else {
    sectionMetrics.section6.found = false;
  }
  const s8 = document.getElementById('section-8');
  if (s8) {
    const r = s8.getBoundingClientRect();
    sectionMetrics.section8 = { docTop: r.top + scrollY, height: r.height, found: true };
  } else {
    sectionMetrics.section8.found = false;
  }
}

function CaseStudiesBackdrop() {
  const backdropRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const backdrop = backdropRef.current;
    const camera = state.camera;
    const metric = sectionMetrics.section4;
    if (!metric.found) {
      caseStudiesScreenBounds.top = 0;
      caseStudiesScreenBounds.bottom = 0;
      if (backdrop) backdrop.visible = false;
      return;
    }

    const boundsTop = metric.docTop - scrollRef.scrollY;
    const boundsBottom = boundsTop + metric.height;
    const boundsHeight = metric.height;

    const drawingBufferHeight = state.gl.domElement.height;
    const pixelRatio = drawingBufferHeight / Math.max(window.innerHeight, 1);
    caseStudiesScreenBounds.bottom = THREE.MathUtils.clamp(
      (window.innerHeight - boundsBottom) * pixelRatio,
      0,
      drawingBufferHeight,
    );
    caseStudiesScreenBounds.top = THREE.MathUtils.clamp(
      (window.innerHeight - boundsTop) * pixelRatio,
      0,
      drawingBufferHeight,
    );

    if (!backdrop || !(camera instanceof THREE.PerspectiveCamera)) {
      if (backdrop) backdrop.visible = false;
      return;
    }

    if (boundsHeight <= 0 || boundsBottom <= 0 || boundsTop >= window.innerHeight) {
      backdrop.visible = false;
      return;
    }

    const depth = 3.2;
    const worldHeight =
      2 *
      (camera.position.z + depth) *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldPerPixel = worldHeight / Math.max(window.innerHeight, 1);
    const sectionCenter = (boundsTop + boundsBottom) / 2;

    backdrop.visible = true;
    backdrop.position.set(
      camera.position.x,
      camera.position.y + (window.innerHeight / 2 - sectionCenter) * worldPerPixel,
      -depth,
    );
    backdrop.scale.set(
      window.innerWidth * worldPerPixel,
      boundsHeight * worldPerPixel,
      1,
    );
  });

  return (
    <mesh ref={backdropRef} visible={false} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#080b10" depthWrite={false} />
    </mesh>
  );
}

function ReviewsBackdrop() {
  const backdropRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const backdrop = backdropRef.current;
    const camera = state.camera;
    const metric = sectionMetrics.section6;
    if (!metric.found) {
      reviewsScreenBounds.top = 0;
      reviewsScreenBounds.bottom = 0;
      if (backdrop) backdrop.visible = false;
      return;
    }

    const boundsTop = metric.docTop - scrollRef.scrollY;
    const boundsBottom = boundsTop + metric.height;
    const boundsHeight = metric.height;

    const drawingBufferHeight = state.gl.domElement.height;
    const pixelRatio = drawingBufferHeight / Math.max(window.innerHeight, 1);
    reviewsScreenBounds.bottom = THREE.MathUtils.clamp(
      (window.innerHeight - boundsBottom) * pixelRatio,
      0,
      drawingBufferHeight,
    );
    reviewsScreenBounds.top = THREE.MathUtils.clamp(
      (window.innerHeight - boundsTop) * pixelRatio,
      0,
      drawingBufferHeight,
    );

    if (!backdrop || !(camera instanceof THREE.PerspectiveCamera)) {
      if (backdrop) backdrop.visible = false;
      return;
    }

    if (boundsHeight <= 0 || boundsBottom <= 0 || boundsTop >= window.innerHeight) {
      backdrop.visible = false;
      return;
    }

    const depth = 3.2;
    const worldHeight =
      2 *
      (camera.position.z + depth) *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldPerPixel = worldHeight / Math.max(window.innerHeight, 1);
    const sectionCenter = (boundsTop + boundsBottom) / 2;

    backdrop.visible = true;
    backdrop.position.set(
      camera.position.x,
      camera.position.y + (window.innerHeight / 2 - sectionCenter) * worldPerPixel,
      -depth,
    );
    backdrop.scale.set(
      window.innerWidth * worldPerPixel,
      boundsHeight * worldPerPixel,
      1,
    );
  });

  return (
    <mesh ref={backdropRef} visible={false} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#080b10" depthWrite={false} />
    </mesh>
  );
}

function ContactBackdrop() {
  const backdropRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const backdrop = backdropRef.current;
    const camera = state.camera;
    const metric = sectionMetrics.section8;
    if (!metric.found) {
      contactScreenBounds.top = 0;
      contactScreenBounds.bottom = 0;
      if (backdrop) backdrop.visible = false;
      return;
    }

    const boundsTop = metric.docTop - scrollRef.scrollY;
    const boundsBottom = boundsTop + metric.height;
    const boundsHeight = metric.height;

    const drawingBufferHeight = state.gl.domElement.height;
    const pixelRatio = drawingBufferHeight / Math.max(window.innerHeight, 1);
    contactScreenBounds.bottom = THREE.MathUtils.clamp(
      (window.innerHeight - boundsBottom) * pixelRatio,
      0,
      drawingBufferHeight,
    );
    contactScreenBounds.top = THREE.MathUtils.clamp(
      (window.innerHeight - boundsTop) * pixelRatio,
      0,
      drawingBufferHeight,
    );

    if (!backdrop || !(camera instanceof THREE.PerspectiveCamera)) {
      if (backdrop) backdrop.visible = false;
      return;
    }

    if (boundsHeight <= 0 || boundsBottom <= 0 || boundsTop >= window.innerHeight) {
      backdrop.visible = false;
      return;
    }

    const depth = 3.2;
    const worldHeight =
      2 *
      (camera.position.z + depth) *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const worldPerPixel = worldHeight / Math.max(window.innerHeight, 1);
    const sectionCenter = (boundsTop + boundsBottom) / 2;

    backdrop.visible = true;
    backdrop.position.set(
      camera.position.x,
      camera.position.y + (window.innerHeight / 2 - sectionCenter) * worldPerPixel,
      -depth,
    );
    backdrop.scale.set(
      window.innerWidth * worldPerPixel,
      boundsHeight * worldPerPixel,
      1,
    );
  });

  return (
    <mesh ref={backdropRef} visible={false} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#080b10" depthWrite={false} />
    </mesh>
  );
}

// Far 3D panel layer — driven by the same Lenis scroll value as the foreground.
// No extra damp/easing (that causes stagger). Depth = slower travel only.
function ParallaxWorldLayer({
  blobColor,
}: {
  blobColor: THREE.ColorRepresentation;
}) {
  const layerRef = useRef<THREE.Group>(null);
  const [sectionCount, setSectionCount] = useState(1);

  useEffect(() => {
    const updateSectionCount = () => {
      const viewportHeight = Math.max(window.innerHeight, 1);
      const pageRowCount = Math.ceil(
        document.documentElement.scrollHeight / viewportHeight
      ) + 1;
      const count = Math.max(
        document.querySelectorAll('[data-section], section[id]').length,
        pageRowCount,
        1
      );
      setSectionCount((prev) => (count !== prev ? count : prev));
      updateSectionMetrics();
    };

    updateSectionCount();
    ScrollTrigger.addEventListener('refresh', updateSectionMetrics);
    window.addEventListener('site-loader:complete', updateSectionMetrics);
    const observer = new MutationObserver(updateSectionCount);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-section', 'id'],
    });
    const resizeObserver = new ResizeObserver(updateSectionCount);
    resizeObserver.observe(document.body);
    window.addEventListener('resize', updateSectionCount);

    return () => {
      ScrollTrigger.removeEventListener('refresh', updateSectionMetrics);
      window.removeEventListener('site-loader:complete', updateSectionMetrics);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSectionCount);
    };
  }, []);

  // Priority -1 so layer moves before blob hover raycasts this frame
  useFrame(() => {
    if (!layerRef.current || typeof window === 'undefined') return;

    const scrollY = getPageScrollExcludingPins(scrollRef.scrollY);
    const windowH = Math.max(window.innerHeight || 900, 1);

    layerRef.current.position.y =
      (scrollY / windowH) * STEP_PER_SECTION * PARALLAX_SPEED;
    layerRef.current.position.z = LAYER_DEPTH_Z;
    layerRef.current.scale.setScalar(LAYER_SCALE);
  }, -1);

  return (
    <group ref={layerRef}>
      {/* Studio Lighting that travels with the parallax layer for consistent rim highlights */}
      <pointLight
        position={[3.4, 1.2, 1.2]}
        intensity={2.8}
        color="#ffffff"
        distance={5.0}
      />
      <pointLight
        position={[-4.5, -2.6, 1.2]}
        intensity={3.0}
        color="#ffffff"
        distance={4.0}
      />
      <pointLight
        position={[-1.8, -2.6, 1.5]}
        intensity={2.6}
        color="#ffffff"
        distance={5.5}
      />

      {/* Additional local rim lights along the scroll corridor */}
      <pointLight
        position={[3.2, -4.2, 1.0]}
        intensity={2.5}
        color="#ffffff"
        distance={5.0}
      />
      <pointLight
        position={[-3.5, -8.0, 1.2]}
        intensity={2.6}
        color="#ffffff"
        distance={5.5}
      />
      <pointLight
        position={[0.2, -12.4, 1.4]}
        intensity={2.8}
        color="#ffffff"
        distance={5.0}
      />

      {/* ======================================================== */}
      {/* 1. HERO SECTION BLOBS (Initial viewport positions)      */}
      {/* Kept at exact fixed positions and configured color       */}
      {/* ======================================================== */}
      {/* Blob 1: Large Bottom Fluid Blob */}
      <OrganicBlob
        radius={1.18}
        position={[-0.85, -1.82, 0.6]}
        blobType="bottomMain"
        color={blobColor}
        stretch={[1.24, 0.95, 1.05]}
      />

      {/* Blob 2: Top-Right Fluid Blob */}
      <OrganicBlob
        radius={0.88}
        position={[3.7, 2.05, 0.4]}
        blobType="topRight"
        color={blobColor}
        stretch={[1.2, 0.92, 0.85]}
      />

      {/* Blob 3: Small Bottom-Left Droplet */}
      <OrganicBlob
        radius={0.26}
        position={[-4.4, -2.1, 0.3]}
        blobType="droplet"
        color={blobColor}
        stretch={[1.05, 0.95, 1.0]}
      />

      {Array.from({ length: Math.max(sectionCount - 1, 0) }, (_, index) => {
        const sectionIndex = index + 1;
        const layout =
          SECTION_BLOB_LAYOUTS[index % SECTION_BLOB_LAYOUTS.length];
        const sectionY = -STEP_PER_SECTION * sectionIndex;

        return layout.map((blob, blobIndex) => (
          <OrganicBlob
            key={`section-${sectionIndex}-blob-${blobIndex}`}
            radius={blob.radius}
            position={[blob.x, sectionY + blob.yOffset, blob.z]}
            blobType={blob.blobType}
            color={blobColor}
            stretch={blob.stretch}
          />
        ));
      })}
    </group>
  );
}

function SceneContent({
  blobColor,
}: {
  blobColor: THREE.ColorRepresentation;
}) {
  return (
    <>
      <ParallaxCamera />
      <CaseStudiesBackdrop />
      <ReviewsBackdrop />
      <ContactBackdrop />

      {/* Global Ambient & Key Directional Lighting */}
      <directionalLight position={[6, 8, 4]} intensity={2.4} color="#ffffff" />
      <ambientLight intensity={1.15} color="#ffffff" />
      <directionalLight position={[-6, -6, 2.5]} intensity={2.8} color="#ffffff" />
      <directionalLight position={[2, -4, 1.5]} intensity={1.0} color="#ffffff" />

      {/* 3D Parallax World Layer containing all site blobs */}
      <ParallaxWorldLayer blobColor={blobColor} />
    </>
  );
}

export default function BackgroundCanvas({
  blobColor = '#fefefe',
  className,
}: {
  blobColor?: THREE.ColorRepresentation;
  className?: string;
}) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [eventSource, setEventSource] = useState<HTMLElement>();

  useEffect(() => {
    setEventSource(
      canvasWrapperRef.current?.closest('main') ?? document.body,
    );
  }, []);

  return (
    <div
      ref={canvasWrapperRef}
      data-background-canvas
      className={`fixed inset-0 h-full w-full ${className ?? 'pointer-events-auto z-0'}`}
    >
      <Canvas
        eventSource={eventSource}
        eventPrefix="client"
        camera={{ position: [0, 0, 8.5], fov: 38 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full pointer-events-auto"
      >
        <Suspense fallback={null}>
          <SceneContent blobColor={blobColor} />
        </Suspense>
      </Canvas>
    </div>
  );
}
