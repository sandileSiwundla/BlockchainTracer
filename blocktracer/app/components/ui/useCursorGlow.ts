'use client';

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface CursorGlowOptions {
  radius?: number; // How many grid points in each direction to affect (default: 3)
  maxBrightness?: number; // Maximum brightness increase (default: 1.5)
  dotSizeMultiplier?: number; // How much larger dots get near cursor (default: 2)
  fadeSpeed?: number; // How fast the glow fades when cursor stops moving (default: 0.1)
}

interface GridPoint {
  x: number;
  y: number;
  intensity: number;
}

export function useCursorGlow(
  canvasRef: RefObject<HTMLCanvasElement>,
  camera: { x: number; y: number; zoom: number },
  gridSize: number = 100,
  worldWidth: number,
  worldHeight: number,
  options: CursorGlowOptions = {}
) {
  const {
    radius = 3,
    maxBrightness = 1.5,
    dotSizeMultiplier = 2,
    fadeSpeed = 0.1
  } = options;

  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number } | null>(null);
  const [glowIntensities, setGlowIntensities] = useState<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const canvasX = (screenX - rect.left) * (canvas.width / rect.width);
    const canvasY = (screenY - rect.top) * (canvas.height / rect.height);
    
    // Transform to world coordinates
    const worldX = camera.x + (canvasX - canvas.width / 2) / camera.zoom;
    const worldY = camera.y + (canvasY - canvas.height / 2) / camera.zoom;
    
    return { x: worldX, y: worldY };
  }, [canvasRef, camera]);

  // Track mouse movement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setMouseWorldPos(worldPos);
    };

    const handleMouseLeave = () => {
      setMouseWorldPos(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasRef, screenToWorld]);

  // Calculate glow intensities based on mouse position
  const updateGlowIntensities = useCallback(() => {
    if (!mouseWorldPos) {
      // Fade out all intensities when mouse leaves
      setGlowIntensities(prev => {
        const newMap = new Map();
        for (const [key, intensity] of prev.entries()) {
          const newIntensity = Math.max(0, intensity - fadeSpeed);
          if (newIntensity > 0) {
            newMap.set(key, newIntensity);
          }
        }
        return newMap;
      });
      return;
    }

    const newIntensities = new Map<string, number>();
    
    // Calculate which grid cells to affect
    const centerGridX = Math.round(mouseWorldPos.x / gridSize) * gridSize;
    const centerGridY = Math.round(mouseWorldPos.y / gridSize) * gridSize;
    
    const startX = Math.max(0, centerGridX - radius * gridSize);
    const endX = Math.min(worldWidth, centerGridX + radius * gridSize);
    const startY = Math.max(0, centerGridY - radius * gridSize);
    const endY = Math.min(worldHeight, centerGridY + radius * gridSize);
    
    // Calculate intensity for each grid point
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        // Calculate distance from cursor to grid point
        const dx = x - mouseWorldPos.x;
        const dy = y - mouseWorldPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Max distance for glow effect
        const maxDistance = radius * gridSize;
        
        // Intensity falls off with distance
        let intensity = 1 - Math.min(1, distance / maxDistance);
        intensity = Math.pow(intensity, 1.5); // Exponential falloff for smoother glow
        
        if (intensity > 0.05) {
          const key = `${x},${y}`;
          // Blend with existing intensity for smoother transitions
          const existingIntensity = glowIntensities.get(key) || 0;
          newIntensities.set(key, Math.max(existingIntensity, intensity));
        }
      }
    }
    
    // Fade out points that are no longer in range
    for (const [key, existingIntensity] of glowIntensities.entries()) {
      if (!newIntensities.has(key)) {
        const newIntensity = Math.max(0, existingIntensity - fadeSpeed);
        if (newIntensity > 0) {
          newIntensities.set(key, newIntensity);
        }
      }
    }
    
    setGlowIntensities(newIntensities);
  }, [mouseWorldPos, gridSize, radius, worldWidth, worldHeight, glowIntensities, fadeSpeed]);

  // Animation loop for smooth fading
  useEffect(() => {
    const animate = () => {
      updateGlowIntensities();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateGlowIntensities]);

  // Function to get dot color and size based on glow intensity
  const getDotStyle = useCallback((x: number, y: number, baseColor: string, baseSize: number) => {
    const key = `${x},${y}`;
    const intensity = glowIntensities.get(key) || 0;
    
    if (intensity === 0) {
      return { color: baseColor, size: baseSize };
    }
    
    // Calculate enhanced color (brighter)
    const brightness = 1 + (maxBrightness - 1) * intensity;
    const enhancedSize = baseSize * (1 + (dotSizeMultiplier - 1) * intensity);
    
    // You can customize the color enhancement here
    // For now, we'll just brighten the base color
    return { 
      color: `rgb(${Math.min(255, 61 * brightness)}, ${Math.min(255, 59 * brightness)}, ${Math.min(255, 59 * brightness)})`,
      size: enhancedSize 
    };
  }, [glowIntensities, maxBrightness, dotSizeMultiplier]);

  return { getDotStyle, mouseWorldPos, glowIntensities };
}