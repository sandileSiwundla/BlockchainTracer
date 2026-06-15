'use client';

import { useEffect, useCallback, useRef, RefObject } from 'react';

interface CursorGlowOptions {
  radius?: number;
  maxBrightness?: number;
  dotSizeMultiplier?: number;
  fadeSpeed?: number;
}

export function useCursorGlow(
  canvasRef: RefObject<HTMLCanvasElement>,
  cameraRef: RefObject<{ x: number; y: number; zoom: number }>,
  gridSize: number = 100,
  worldWidth: number,
  worldHeight: number,
  options: CursorGlowOptions = {}
) {
  const {
    radius = 4,
    maxBrightness = 2.2,
    dotSizeMultiplier = 3.5,
    fadeSpeed = 0.06,
  } = options;

  // All state lives in refs — zero React re-renders from this hook
  const mouseWorldPosRef = useRef<{ x: number; y: number } | null>(null);
  const glowIntensitiesRef = useRef<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const onRedrawRef = useRef<(() => void) | null>(null);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      const camera = cameraRef.current;
      if (!canvas || !camera) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const canvasX = (screenX - rect.left) * (canvas.width / rect.width);
      const canvasY = (screenY - rect.top) * (canvas.height / rect.height);

      return {
        x: camera.x + (canvasX - canvas.width / 2) / camera.zoom,
        y: camera.y + (canvasY - canvas.height / 2) / camera.zoom,
      };
    },
    [canvasRef, cameraRef]
  );

  // Register a callback so the canvas can trigger redraws
  const setRedrawCallback = useCallback((cb: () => void) => {
    onRedrawRef.current = cb;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseWorldPosRef.current = screenToWorld(e.clientX, e.clientY);
    };
    const handleMouseLeave = () => {
      mouseWorldPosRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, screenToWorld]);

  // Animation loop — updates intensities then triggers canvas redraw
  useEffect(() => {
    const animate = () => {
      const mousePos = mouseWorldPosRef.current;
      const intensities = glowIntensitiesRef.current;
      const newIntensities = new Map<string, number>();

      if (mousePos) {
        const centerGridX = Math.round(mousePos.x / gridSize) * gridSize;
        const centerGridY = Math.round(mousePos.y / gridSize) * gridSize;
        const startX = Math.max(0, centerGridX - radius * gridSize);
        const endX = Math.min(worldWidth, centerGridX + radius * gridSize);
        const startY = Math.max(0, centerGridY - radius * gridSize);
        const endY = Math.min(worldHeight, centerGridY + radius * gridSize);
        const maxDistance = radius * gridSize;

        for (let x = startX; x <= endX; x += gridSize) {
          for (let y = startY; y <= endY; y += gridSize) {
            const dx = x - mousePos.x;
            const dy = y - mousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let intensity = 1 - Math.min(1, distance / maxDistance);
            intensity = Math.pow(intensity, 1.8);

            if (intensity > 0.02) {
              const key = `${x},${y}`;
              const existing = intensities.get(key) || 0;
              // Lerp toward target intensity for smooth approach
              newIntensities.set(key, existing + (intensity - existing) * 0.25);
            }
          }
        }
      }

      // Fade out points no longer in range
      for (const [key, existing] of intensities.entries()) {
        if (!newIntensities.has(key)) {
          const next = existing - fadeSpeed;
          if (next > 0) newIntensities.set(key, next);
        }
      }

      glowIntensitiesRef.current = newIntensities;
      onRedrawRef.current?.();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gridSize, radius, worldWidth, worldHeight, fadeSpeed]);

  /**
   * Called per-dot during canvas draw. Returns color + size.
   * Produces a blue → purple → pink gradient shift based on intensity.
   */
  const getDotStyle = useCallback(
    (x: number, y: number, baseColor: string, baseSize: number) => {
      const key = `${x},${y}`;
      const intensity = glowIntensitiesRef.current.get(key) || 0;

      if (intensity < 0.02) return { color: baseColor, size: baseSize };

      // Stitch-like: cool blue → violet → pink
      const r = Math.round(60 + 195 * intensity);   // 60 → 255
      const g = Math.round(20 + 20 * (1 - intensity)); // barely changes
      const b = Math.round(180 + 75 * (1 - intensity * 0.6)); // 180 → bright

      const alpha = 0.3 + 0.7 * intensity;
      const size = baseSize * (1 + (dotSizeMultiplier - 1) * intensity);

      return {
        color: `rgba(${r},${g},${b},${alpha})`,
        size,
      };
    },
    [dotSizeMultiplier]
  );

  /** Draw a radial spotlight glow under the cursor (call before drawing dots) */
  const drawCursorSpotlight = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const mousePos = mouseWorldPosRef.current;
      if (!mousePos) return;
      const camera = cameraRef.current;
      if (!camera) return;

      const spotRadius = radius * gridSize * 1.1;
      const gradient = ctx.createRadialGradient(
        mousePos.x, mousePos.y, 0,
        mousePos.x, mousePos.y, spotRadius
      );
      gradient.addColorStop(0, 'rgba(100, 60, 220, 0.10)');
      gradient.addColorStop(0.4, 'rgba(180, 60, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, spotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [cameraRef, radius, gridSize]
  );

  return { getDotStyle, drawCursorSpotlight, setRedrawCallback, mouseWorldPosRef };
}