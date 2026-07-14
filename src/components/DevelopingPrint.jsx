import React, { useEffect, useRef, useState } from 'react';
import audioEngine from '../utils/AudioEngine';

export default function DevelopingPrint({ 
  src, 
  alt = 'Photographic Print',
  width = 600, 
  height = 450,
  projectId = 'print-default',
  isDaylightMode = false,
  onDevelopedComplete = null
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDeveloped, setIsDeveloped] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Animation & interactive states stored in refs for 60fps canvas loop
  const progressRef = useRef(0);
  const imageLoadedRef = useRef(false);
  const imgRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const isHoveredRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const ripplesRef = useRef([]); // Array of { x, y, time, amplitude }
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`darkroom-project-${projectId}`);
    if (savedState === 'fixed' || isDaylightMode) {
      progressRef.current = 1.0;
      setIsDeveloped(true);
      setCurrentProgress(1.0);
    }
  }, [projectId, isDaylightMode]);

  // Handle daylight mode changes instantly
  useEffect(() => {
    if (isDaylightMode) {
      progressRef.current = 1.0;
      setIsDeveloped(true);
      setCurrentProgress(1.0);
    }
  }, [isDaylightMode]);

  // Load the target image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      imageLoadedRef.current = true;

      // Setup offscreen canvas to extract pixel data
      const offscreen = document.createElement('canvas');
      offscreen.width = width / 2; // Scale down for faster pixel processing
      offscreen.height = height / 2;
      const oCtx = offscreen.getContext('2d');
      oCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);
      offscreenCanvasRef.current = offscreen;
    };
  }, [src, width, height]);

  // Render loop
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Paper fiber noise (generated once and tiled or procedural)
    const generateNoise = (w, h) => {
      const noiseData = [];
      for (let i = 0; i < w * h; i++) {
        noiseData.push(Math.random());
      }
      return noiseData;
    };
    
    const noiseWidth = 150;
    const noiseHeight = 150;
    const noiseBuffer = generateNoise(noiseWidth, noiseHeight);

    const updateAndDraw = () => {
      if (!canvas || !imageLoadedRef.current || !imgRef.current || !offscreenCanvasRef.current) {
        animId = requestAnimationFrame(updateAndDraw);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const oCanvas = offscreenCanvasRef.current;
      const oCtx = oCanvas.getContext('2d');
      const oW = oCanvas.width;
      const oH = oCanvas.height;

      // 1. Calculate development progress state
      if (isDaylightMode) {
        progressRef.current = 1.0;
      } else {
        if (progressRef.current < 1.0) {
          if (isHoveredRef.current) {
            // Ambient dwell reveal (patience)
            progressRef.current = Math.min(1.0, progressRef.current + 0.0006);

            // Agitation-based reveal (rubbing / mouse movement speed)
            const dx = mousePosRef.current.x - lastMousePosRef.current.x;
            const dy = mousePosRef.current.y - lastMousePosRef.current.y;
            const speed = Math.sqrt(dx * dx + dy * dy);
            
            if (speed > 0.5) {
              progressRef.current = Math.min(1.0, progressRef.current + (speed * 0.0004));
              
              // Add a physical ripple in chemistry tray at cursor
              if (Math.random() < 0.1) {
                const rect = canvas.getBoundingClientRect();
                const rx = ((mousePosRef.current.x - rect.left) / rect.width) * oW;
                const ry = ((mousePosRef.current.y - rect.top) / rect.height) * oH;
                
                ripplesRef.current.push({
                  x: rx,
                  y: ry,
                  time: 0,
                  amplitude: speed * 1.5
                });
              }
            }
          } else {
            // Decay back to blank paper if unattended and not yet finished (impermanence)
            progressRef.current = Math.max(0.0, progressRef.current - 0.0002);
          }
        }
      }

      // Track completion
      if (progressRef.current >= 1.0 && !isDeveloped) {
        setIsDeveloped(true);
        localStorage.setItem(`darkroom-project-${projectId}`, 'fixed');
        audioEngine.triggerSplash(); // Satisfying final chemical submerge splash
        if (onDevelopedComplete) {
          onDevelopedComplete();
        }
      }

      setCurrentProgress(progressRef.current);
      lastMousePosRef.current = { ...mousePosRef.current };

      // 2. Read pixels from offscreen canvas
      const imgData = oCtx.getImageData(0, 0, oW, oH);
      const pixels = imgData.data;

      // 3. Create main output buffer
      const outData = ctx.createImageData(oW, oH);
      const outPixels = outData.data;

      // Chemistry tray fluid color characteristics
      const paperR = isDaylightMode ? 255 : 229;
      const paperG = isDaylightMode ? 255 : 222;
      const paperB = isDaylightMode ? 255 : 201;

      const p = progressRef.current;
      const showNegativeFlash = p > 0.12 && p < 0.22 && !isDaylightMode;

      // 4. Update chemical liquid ripples
      ripplesRef.current.forEach((r, idx) => {
        r.time += 1;
        r.amplitude *= 0.95; // Dampening
      });
      ripplesRef.current = ripplesRef.current.filter(r => r.amplitude > 0.05);

      // 5. Draw pixels with developer threshold math
      for (let y = 0; y < oH; y++) {
        for (let x = 0; x < oW; x++) {
          const idx = (y * oW + x) * 4;
          
          // Apply liquid ripple displacement offset
          let sx = x;
          let sy = y;
          ripplesRef.current.forEach(r => {
            const dx = x - r.x;
            const dy = y - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40 && dist > 0) {
              const offset = Math.sin(dist * 0.4 - r.time * 0.2) * r.amplitude * 0.5;
              sx += (dx / dist) * offset;
              sy += (dy / dist) * offset;
            }
          });

          // Bounds safety clamp
          const clampedSx = Math.max(0, Math.min(oW - 1, Math.round(sx)));
          const clampedSy = Math.max(0, Math.min(oH - 1, Math.round(sy)));
          const sIdx = (clampedSy * oW + clampedSx) * 4;

          const rVal = pixels[sIdx];
          const gVal = pixels[sIdx + 1];
          const bVal = pixels[sIdx + 2];

          // Compute pixel brightness (Luminance)
          const lum = (0.299 * rVal + 0.587 * gVal + 0.114 * bVal) / 255;

          // Tile procedural grain noise
          const noiseIdx = (clampedSy % noiseHeight) * noiseWidth + (clampedSx % noiseWidth);
          const noise = noiseBuffer[noiseIdx];

          // Luminance threshold calculation
          // Shadows appear first (low luminance). highlights appear last (high luminance).
          const threshold = p * 1.35; // Multiply by > 1.0 to ensure highlights fully develop

          if (lum * (1.0 - 0.28 * noise) < threshold) {
            // Revealed state
            const revealFactor = Math.min(1.0, (threshold - lum) * 3);

            if (showNegativeFlash) {
              // Solarization / negative print flash
              outPixels[idx] = (255 - rVal) * revealFactor + paperR * (1 - revealFactor);
              outPixels[idx + 1] = (255 - gVal) * 0.7 * revealFactor + paperG * (1 - revealFactor);
              outPixels[idx + 2] = (255 - bVal) * 0.5 * revealFactor + paperB * (1 - revealFactor);
              outPixels[idx + 3] = 255;
            } else {
              // Developed print state: warm black & white transitioning to color
              const greyVal = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
              
              // Color bleeds in during the final stage of development
              let finalR = greyVal;
              let finalG = greyVal;
              let finalB = greyVal;

              if (p > 0.8) {
                const colorMix = (p - 0.8) / 0.2;
                finalR = rVal * colorMix + greyVal * (1 - colorMix);
                finalG = gVal * colorMix + greyVal * (1 - colorMix);
                finalB = bVal * colorMix + greyVal * (1 - colorMix);
              }

              // Warm silver gelatin wash cast (toned)
              const toneR = finalR * 0.95;
              const toneG = finalG * 0.88;
              const toneB = finalB * 0.80;

              outPixels[idx] = toneR * revealFactor + paperR * (1 - revealFactor);
              outPixels[idx + 1] = toneG * revealFactor + paperG * (1 - revealFactor);
              outPixels[idx + 2] = toneB * revealFactor + paperB * (1 - revealFactor);
              outPixels[idx + 3] = 255;
            }
          } else {
            // Paper base color with raw grain texture
            const grainAmount = 0.05 * (1.0 - p); // Grain settles as it fixes
            const paperGrain = (noise - 0.5) * grainAmount * 255;
            
            outPixels[idx] = Math.max(0, Math.min(255, paperR + paperGrain));
            outPixels[idx + 1] = Math.max(0, Math.min(255, paperG + paperGrain));
            outPixels[idx + 2] = Math.max(0, Math.min(255, paperB + paperGrain));
            outPixels[idx + 3] = 255;
          }
        }
      }

      // Draw the computed image frame back to screen
      // First clear canvas and draw paper card border shadow
      ctx.clearRect(0, 0, w, h);

      // Create an offscreen canvas to scale back up smoothly
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = oW;
      tempCanvas.height = oH;
      tempCanvas.getContext('2d').putImageData(outData, 0, 0);

      // Draw onto visible canvas with bilinear smoothing (gives beautiful chemical bleed)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tempCanvas, 0, 0, w, h);

      // 6. Chemical Bloom Overlay Pass
      if (p > 0.82 && p < 1.0 && !isDaylightMode) {
        const bloomIntensity = Math.sin((p - 0.82) * Math.PI / 0.18) * 0.25;
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'blur(16px)';
        ctx.globalAlpha = bloomIntensity;
        ctx.fillStyle = '#ff7b00'; // warm orange chemical burn
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
      }

      // 7. Glossy Sheen Animating once on Fix (Progress 0.98 -> 1.0)
      if (p >= 0.96 && p <= 1.0) {
        const sheenProgress = (p - 0.96) / 0.04; // 0.0 to 1.0
        const sheenX = sheenProgress * w * 1.5 - (w * 0.5);

        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const gradient = ctx.createLinearGradient(sheenX, 0, sheenX + 80, h);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      animId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isDaylightMode, isDeveloped, projectId, onDevelopedComplete, width, height]);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleReset = (e) => {
    e.stopPropagation();
    progressRef.current = 0;
    setIsDeveloped(false);
    setCurrentProgress(0);
    localStorage.removeItem(`darkroom-project-${projectId}`);
  };

  return (
    <div 
      ref={containerRef}
      className="developing-print-container" 
      style={{
        width: `${width}px`,
        position: 'relative',
        display: 'inline-block'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="developing-canvas"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
          borderRadius: '2px',
          backgroundColor: isDaylightMode ? '#ffffff' : '#e5dec9',
          transition: 'background-color 0.8s ease'
        }}
        data-cursor="tongs"
      />
      
      {/* Small developing state badge shown at bottom of print card */}
      {!isDaylightMode && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '15px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: isDeveloped ? '#39a939' : '#b32424',
          opacity: 0.6,
          pointerEvents: 'none',
          letterSpacing: '0.1em'
        }}>
          {isDeveloped ? 'FIXED' : `DEVELOPING: ${Math.round(currentProgress * 100)}%`}
        </div>
      )}

      {/* Manual Reset button shown if developed in safelight mode */}
      {isDeveloped && !isDaylightMode && (
        <button 
          onClick={handleReset}
          className="control-btn"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '2px 8px',
            fontSize: '9px',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            backgroundColor: 'rgba(7,7,7,0.85)',
          }}
          title="Expose New Paper"
        >
          RE-EXPOSE
        </button>
      )}

      {/* Show re-expose button on hover */}
      <style>{`
        .developing-print-container:hover button {
          opacity: 0.8 !important;
        }
        .developing-print-container:hover button:hover {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
