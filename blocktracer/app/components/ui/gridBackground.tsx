'use client';

import { useRef, useEffect, useState, useCallback, type RefObject } from 'react';
import { useCursorGlow } from './useCursorGlow';

interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const WORLD_WIDTH = 16000;
const WORLD_HEIGHT = 16000;
const GRID_SIZE = 60; // Tighter grid — more Stitch-like
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 8;

export default function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep camera in a ref as the source of truth so draw() always has latest value
  // without stale closures; useState drives re-renders only when needed for the HUD.
  const cameraRef = useRef<Camera>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const [cameraHUD, setCameraHUD] = useState<Camera>(cameraRef.current);

  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const cameraStartRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });

  const { getDotStyle, drawCursorSpotlight, setRedrawCallback } = useCursorGlow(
    canvasRef as RefObject<HTMLCanvasElement>,
    cameraRef as RefObject<Camera>,
    GRID_SIZE,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    {
      radius: 4,
      maxBrightness: 2.2,
      dotSizeMultiplier: 3.5,
      fadeSpeed: 0.06,
    }
  );

  const clampCamera = useCallback((cam: Camera): Camera => {
    const canvas = canvasRef.current;
    if (!canvas) return cam;
    const visW = canvas.width / cam.zoom;
    const visH = canvas.height / cam.zoom;
    return {
      x: Math.min(WORLD_WIDTH - visW / 2, Math.max(visW / 2, cam.x)),
      y: Math.min(WORLD_HEIGHT - visH / 2, Math.max(visH / 2, cam.y)),
      zoom: cam.zoom,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const camera = cameraRef.current;
    const vw = canvas.width;
    const vh = canvas.height;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, vw, vh);

    // ── Camera transform ────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // ── Cursor spotlight (drawn before dots so dots sit on top) ─────────────
    drawCursorSpotlight(ctx);

    // ── Viewport culling: only draw visible dots ────────────────────────────
    const halfW = vw / 2 / camera.zoom;
    const halfH = vh / 2 / camera.zoom;
    const visLeft   = camera.x - halfW;
    const visRight  = camera.x + halfW;
    const visTop    = camera.y - halfH;
    const visBottom = camera.y + halfH;

    const startX = Math.max(0, Math.floor(visLeft / GRID_SIZE) * GRID_SIZE);
    const endX   = Math.min(WORLD_WIDTH, Math.ceil(visRight / GRID_SIZE) * GRID_SIZE);
    const startY = Math.max(0, Math.floor(visTop / GRID_SIZE) * GRID_SIZE);
    const endY   = Math.min(WORLD_HEIGHT, Math.ceil(visBottom / GRID_SIZE) * GRID_SIZE);

    // Base dot size adapts to zoom so dots don't disappear when zoomed out
    const baseDotSize = Math.max(0.8, Math.min(2, 1.5 / camera.zoom));
    const baseColor = '#2a2835'; // slightly blue-tinted dark grey — more Stitch

    // ── Draw dots ───────────────────────────────────────────────────────────
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        const { color, size } = getDotStyle(x, y, baseColor, baseDotSize);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [getDotStyle, drawCursorSpotlight]);

  // Wire the glow hook's animation loop to call draw()
  useEffect(() => {
    setRedrawCallback(draw);
  }, [setRedrawCallback, draw]);

  // ── Panning ──────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    cameraStartRef.current = { ...cameraRef.current };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const zoom = cameraStartRef.current.zoom;
    const newCam = clampCamera({
      x: cameraStartRef.current.x - dx / zoom,
      y: cameraStartRef.current.y - dy / zoom,
      zoom,
    });
    cameraRef.current = newCam;
    setCameraHUD(newCam);
    draw();
  }, [clampCamera, draw]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // ── Zoom (zoom toward cursor) ────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const camera = cameraRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * factor));

      // Zoom toward the cursor position in world space
      const rect = canvas.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseCanvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

      // World position under cursor before zoom
      const worldX = camera.x + (mouseCanvasX - canvas.width / 2) / camera.zoom;
      const worldY = camera.y + (mouseCanvasY - canvas.height / 2) / camera.zoom;

      // Adjust camera so that same world point stays under cursor after zoom
      const newCam = clampCamera({
        x: worldX - (mouseCanvasX - canvas.width / 2) / newZoom,
        y: worldY - (mouseCanvasY - canvas.height / 2) / newZoom,
        zoom: newZoom,
      });
      cameraRef.current = newCam;
      setCameraHUD(newCam);
      draw();
    },
    [clampCamera, draw]
  );

  // ── Resize ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      cameraRef.current = clampCamera(cameraRef.current);
      draw();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampCamera, draw]);

  // ── Cursor style ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const update = () => {
      canvas.style.cursor = isPanningRef.current ? 'grabbing' : 'grab';
    };
    canvas.addEventListener('mousedown', update);
    canvas.addEventListener('mouseup', update);
    return () => {
      canvas.removeEventListener('mousedown', update);
      canvas.removeEventListener('mouseup', update);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#0a0a0f',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
      />

      {/* HUD */}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          left: 12,
          background: 'rgba(15, 12, 25, 0.7)',
          color: '#6b5fa0',
          padding: '4px 10px',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 10,
          pointerEvents: 'none',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(120, 80, 200, 0.2)',
          letterSpacing: '0.05em',
        }}
      >
        {Math.floor(cameraHUD.x)}, {Math.floor(cameraHUD.y)} &nbsp;|&nbsp; {cameraHUD.zoom.toFixed(2)}×
      </div>
    </div>
  );
}