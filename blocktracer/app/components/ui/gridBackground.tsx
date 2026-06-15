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

// Extended world size (4x the viewport)
const WORLD_WIDTH = 16000;
const WORLD_HEIGHT = 16000;
const GRID_SIZE = 100;

export default function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [camera, setCamera] = useState<Camera>({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState<Camera>({ x: 0, y: 0, zoom: 1 });

  // Initialize the cursor glow effect
  const { getDotStyle } = useCursorGlow(
    canvasRef as RefObject<HTMLCanvasElement>,
    camera,
    GRID_SIZE,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    {
      radius: 3,           // Affects 3 grid points in each direction
      maxBrightness: 1.8,  // Up to 80% brighter
      dotSizeMultiplier: 2.5, // Dots get 2.5x larger near cursor
      fadeSpeed: 0.15      // Smooth fading
    }
  );

  // Clamp camera position within world bounds
  const clampCamera = useCallback((cam: Camera): Camera => {
    const viewportWidth = canvasRef.current?.width || 0;
    const viewportHeight = canvasRef.current?.height || 0;
    
    // Calculate the visible area in world coordinates
    const visibleWidth = viewportWidth / cam.zoom;
    const visibleHeight = viewportHeight / cam.zoom;
    
    // Clamp camera position so that the viewport stays within world bounds
    const minX = visibleWidth / 2;
    const maxX = WORLD_WIDTH - visibleWidth / 2;
    const minY = visibleHeight / 2;
    const maxY = WORLD_HEIGHT - visibleHeight / 2;
    
    return {
      x: Math.min(maxX, Math.max(minX, cam.x)),
      y: Math.min(maxY, Math.max(minY, cam.y)),
      zoom: cam.zoom
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    // Apply camera transform
    ctx.save();
    ctx.translate(viewportWidth / 2, viewportHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw glow effect background (slight illumination around cursor)
    drawGlowBackground(ctx);
    
    // Draw dots at grid intersections with glow effect
    drawGridDots(ctx);
    
    // Draw world boundary (optional visual indicator)
    drawBoundary(ctx);
    
    ctx.restore();
  }, [camera]);

  // Draw subtle background glow around cursor
  const drawGlowBackground = (ctx: CanvasRenderingContext2D) => {
    // This would require tracking cursor position and drawing radial gradients
    // For performance reasons, we'll skip this for now or implement it differently
    // You can add a radial gradient background effect if desired
  };

  // Draw dots at all grid intersections with glow effect
  const drawGridDots = (ctx: CanvasRenderingContext2D) => {
    const baseDotSize = Math.max(1, 2 / camera.zoom);
    const baseColor = '#3d3b3b';
    
    // Draw all grid dots
    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
      for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
        // Get enhanced style based on cursor proximity
        const { color, size } = getDotStyle(x, y, baseColor, baseDotSize);
        
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Draw world boundary (visual indicator of the limits)
  const drawBoundary = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.restore();
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setCameraStart({ ...camera });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    
    const newCamera = {
      x: cameraStart.x - dx / camera.zoom,
      y: cameraStart.y - dy / camera.zoom,
      zoom: camera.zoom
    };
    
    setCamera(clampCamera(newCamera));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = 0.95;
    let newZoom = e.deltaY > 0 
      ? camera.zoom * zoomFactor 
      : camera.zoom / zoomFactor;
    
    // Clamp zoom to reasonable limits
    newZoom = Math.min(5, Math.max(0.1, newZoom));
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = (e.clientX - rect.left) / camera.zoom;
      const mouseY = (e.clientY - rect.top) / camera.zoom;
      
      const newCamera = {
        x: camera.x + mouseX * (1 - newZoom / camera.zoom),
        y: camera.y + mouseY * (1 - newZoom / camera.zoom),
        zoom: newZoom
      };
      
      setCamera(clampCamera(newCamera));
    } else {
      setCamera(clampCamera({ ...camera, zoom: newZoom }));
    }
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        // Re-clamp camera after resize
        setCamera(prev => clampCamera(prev));
        draw();
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, clampCamera]);

  // Redraw when camera changes
  useEffect(() => {
    draw();
  }, [camera, draw, getDotStyle]);

  // Update cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = isPanning ? 'grabbing' : 'grab';
    }
  }, [isPanning]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Minimal debug info - remove if you want */}
      <div style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        background: 'rgba(90, 88, 88, 0.5)',
        color: '#333',
        padding: '4px 8px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 10,
        pointerEvents: 'none',
        zIndex: 100
      }}>
        {Math.floor(camera.x)}, {Math.floor(camera.y)} | {camera.zoom.toFixed(2)}x
      </div>
    </div>
  );
}