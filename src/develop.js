export let webglAvailable = true;
import { drawOrbitalResonance, drawSolarCorona } from './video.js';

// WebGL shaders
const vsSource = `
  attribute vec2 position;
  varying vec2 v_texcoord;
  void main() {
    v_texcoord = position * 0.5 + 0.5;
    v_texcoord.y = 1.0 - v_texcoord.y; // Flip Y for WebGL texture coordinate mapping
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fsSource = `
  precision mediump float;
  varying vec2 v_texcoord;
  
  uniform sampler2D u_photo;
  uniform sampler2D u_exposure_map;
  uniform float u_time;
  uniform float u_tier;
  uniform float u_bloom_pulse;
  uniform vec2 u_ripple_origin;
  uniform float u_ripple_strength;

  // Simple pseudo-random hash for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // 1. Liquid ripple distortion
    vec2 tc = v_texcoord;
    if (u_ripple_strength > 0.0) {
      vec2 dir = tc - u_ripple_origin;
      float dist = length(dir);
      if (dist < 0.3) {
        float wave = sin(dist * 50.0 - u_time * 8.0) * 0.015 * u_ripple_strength * (1.0 - dist/0.3);
        tc += normalize(dir) * wave;
      }
    }

    // Bindings & Colors
    vec4 photo_color = texture2D(u_photo, tc);
    float exp_val = texture2D(u_exposure_map, tc).r;

    // Luminance calculation
    float lum = dot(photo_color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Paper base tone (warm cream / off-white)
    vec3 paper_color = vec3(0.95, 0.94, 0.91);

    // 2. Grain generation
    float noise = hash(tc * 600.0 + sin(u_time));
    float grain = (noise - 0.5) * 0.11 * (1.0 - exp_val * 0.85);

    // 3. Progressive Reveal Threshold logic
    // Shadows develop first (lum is low), highlights last (lum is high)
    float threshold = lum * 0.72 + (hash(tc * 200.0) - 0.5) * 0.12;
    float dev_factor = clamp((exp_val - threshold) / 0.12, 0.0, 1.0);

    vec3 final_rgb;

    if (u_tier == 1.0) {
      // Tier 1 - Prints: develop to full color
      vec3 developed_color = photo_color.rgb;
      
      // Early negative inversion beat (around exp 0.08 to 0.22)
      if (exp_val > 0.05 && exp_val < 0.25) {
        vec3 neg_color = vec3(1.0) - photo_color.rgb;
        neg_color = mix(neg_color, vec3(0.0, 0.65, 0.85), 0.35); // Cyan-orange film cast
        float neg_mix = sin((exp_val - 0.05) / 0.2 * 3.14159);
        developed_color = mix(developed_color, neg_color, neg_mix);
      }

      // Base transition
      final_rgb = mix(paper_color, developed_color, dev_factor);

      // Chemical bloom at light/shadow border as it reaches fixation (exp 0.85 to 1.0)
      if (exp_val > 0.82) {
        float bloom_factor = sin((exp_val - 0.82) / 0.18 * 3.14159) * u_bloom_pulse * 0.25;
        vec3 bloom_color = vec3(1.0, 0.2, 0.0) * (1.0 - lum); // warm red flare
        final_rgb += bloom_color * bloom_factor;
      }
    } 
    else if (u_tier == 2.0) {
      // Tier 2 - Contact Sheets: Capped at desaturated midtones (no color)
      float capped_dev = dev_factor * 0.75;
      final_rgb = mix(paper_color, vec3(lum), capped_dev);
    } 
    else {
      // Tier 3 - Negatives: Capped at high-contrast dark shadows
      float capped_dev = dev_factor * 0.45;
      final_rgb = mix(paper_color, vec3(lum * 0.35), capped_dev);
    }

    // Apply grain
    final_rgb = clamp(final_rgb + grain, 0.0, 1.0);

    gl_FragColor = vec4(final_rgb, 1.0);
  }
`;

class WebGLRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true });

    if (!this.gl) {
      webglAvailable = false;
      return;
    }

    this.program = this.initProgram();
    this.initBuffers();
    this.textures = new Map(); // Cache photo textures
  }

  initProgram() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader compilation error, switching to CSS fallback.');
      webglAvailable = false;
      return null;
    }
    return program;
  }

  initBuffers() {
    const gl = this.gl;
    if (!this.program) return;
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
  }

  getTexture(imageSrc) {
    if (this.textures.has(imageSrc)) {
      return this.textures.get(imageSrc);
    }
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Placeholder pixel before load
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([240, 238, 230, 255]));

    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = imageSrc;

    this.textures.set(imageSrc, texture);
    return texture;
  }

  render(tile, time) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.viewport(0, 0, 1024, 1024);

    // Bind original photo texture
    const photoTex = this.getTexture(tile.imageSrc);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, photoTex);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_photo'), 0);

    // Upload & bind exposure map texture
    const exposureTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, exposureTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile.exposureCanvas);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_exposure_map'), 1);

    // Uniforms
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), time);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_tier'), tile.tier);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_bloom_pulse'), tile.bloomPulse || 0.0);
    
    // Ripple calculations
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_ripple_strength'), tile.rippleStrength || 0.0);
    gl.uniform2f(
      gl.getUniformLocation(this.program, 'u_ripple_origin'), 
      tile.rippleX || 0.5, 
      tile.rippleY || 0.5
    );

    // Render quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Clean up exposure map texture reference to prevent GPU memory bloat
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(exposureTex);
  }
}

// Single central renderer instance
let renderer = null;

// Registry of all active developable tiles
export const tiles = new Map();
// Render Priority Queue
const renderQueue = [];

export function registerTile(id, element, imageSrc, tier) {
  if (tiles.has(id)) return;

  const canvas = element.querySelector('canvas');
  if (!canvas) return;

  // Dynamically inject developable class for unified cursor tracking
  canvas.classList.add('developable-tile');

  const ctx2d = canvas.getContext('2d');

  // Offscreen canvas for mapping local exposure values
  const exposureCanvas = document.createElement('canvas');
  exposureCanvas.width = 128;
  exposureCanvas.height = 128;
  const exposureCtx = exposureCanvas.getContext('2d');
  exposureCtx.fillStyle = '#000000';
  exposureCtx.fillRect(0, 0, 128, 128);

  const baseId = id.replace(/^line-/, '');
  const savedState = localStorage.getItem(`darkroom_exposure_${baseId}`);
  
  // Capping rules
  const cap = tier === 1 ? 1.0 : (tier === 2 ? 0.75 : 0.45);
  
  // Robust localStorage parsing (defend against non-numeric string values like 'fixed')
  let currentAmbientExposure = 0.0;
  if (savedState) {
    if (savedState === 'fixed') {
      currentAmbientExposure = cap;
    } else {
      const parsed = parseFloat(savedState);
      currentAmbientExposure = isNaN(parsed) ? 0.0 : parsed;
    }
  }
  
  let isFixed = false;
  if (currentAmbientExposure >= cap) {
    currentAmbientExposure = cap;
    isFixed = true;
    // Fill exposure canvas with cap value
    const hex = Math.floor(cap * 255).toString(16).padStart(2, '0');
    exposureCtx.fillStyle = `#${hex}${hex}${hex}`;
    exposureCtx.fillRect(0, 0, 128, 128);
  }

  const tileData = {
    id,
    canvas,
    ctx2d,
    exposureCanvas,
    exposureCtx,
    imageSrc,
    tier,
    expVal: currentAmbientExposure,
    isFixed,
    cap,
    lastInteraction: 0,
    isHovered: false,
    rippleX: 0.5,
    rippleY: 0.5,
    rippleStrength: 0.0,
    bloomPulse: 0.0
  };

  tiles.set(id, tileData);

  canvas.addEventListener('pointerenter', () => {
    tileData.isHovered = true;
    tileData.lastInteraction = Date.now();
  });

  canvas.addEventListener('pointerleave', () => {
    tileData.isHovered = false;
  });

  // Hook Pointer Events to draw local exposure (agitation)
  canvas.addEventListener('pointermove', (e) => {
    tileData.lastInteraction = Date.now();
    if (tileData.isFixed) return;
    
    // Relative coordinates
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 128;
    const y = (e.clientY - rect.top) / rect.height * 128;

    // Draw agitation footprint on exposure map
    const grad = exposureCtx.createRadialGradient(x, y, 0, x, y, 20);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    exposureCtx.fillStyle = grad;
    exposureCtx.beginPath();
    exposureCtx.arc(x, y, 20, 0, Math.PI * 2);
    exposureCtx.fill();

    // Trigger ripple
    tileData.rippleX = (e.clientX - rect.left) / rect.width;
    tileData.rippleY = (e.clientY - rect.top) / rect.height;
    tileData.rippleStrength = 1.0;

    queueRender(id, 1); // Agitation is Priority 1 (High)
  });

  // Unified Dwell Handler
  element.addEventListener('dwell-trigger', (e) => {
    if (tileData.isFixed) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.detail.x - rect.left) / rect.width * 128;
    const y = (e.detail.y - rect.top) / rect.height * 128;

    // Stronger brush for sustained dwell
    const grad = exposureCtx.createRadialGradient(x, y, 0, x, y, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    exposureCtx.fillStyle = grad;
    exposureCtx.beginPath();
    exposureCtx.arc(x, y, 32, 0, Math.PI * 2);
    exposureCtx.fill();

    queueRender(id, 1);
  });

  // Run initial drawing frame
  queueRender(id, 3);
}

export function queueRender(tileId, priority) {
  // Check if tile is in queue; if so, update priority if higher
  const existing = renderQueue.find(item => item.tileId === tileId);
  if (existing) {
    if (priority < existing.priority) {
      existing.priority = priority; // 1 is higher priority than 3
    }
  } else {
    renderQueue.push({ tileId, priority });
  }
}

// Global renderer clock
let startTime = Date.now();

export function initDevelopEngine() {
  renderer = new WebGLRenderer();
  
  if (!webglAvailable) {
    // Initial draw for fallback path
    tiles.forEach((tile) => updateCSSFallback(tile));
    return;
  }

  // Active loop scheduler ticking at 60fps
  let lastFrameTime = performance.now();

  const tick = () => {
    const now = performance.now();
    const deltaTime = Math.min(0.1, (now - lastFrameTime) / 1000.0);
    lastFrameTime = now;

    // Update playing simulations
    tiles.forEach((tile) => {
      if (tile.isFixed && tile.simulationType && tile.isPlaying) {
        // Active conditions: viewport, and (hovered or interacted recently)
        const rect = tile.canvas.getBoundingClientRect();
        const inViewport = rect.bottom >= 0 && rect.top <= window.innerHeight;
        const isHovered = tile.isHovered;
        const isRecentInteraction = (Date.now() - tile.lastInteraction) < 8000;

        if (inViewport && (isHovered || isRecentInteraction)) {
          tile.simTime = (tile.simTime || 0) + deltaTime;
          if (tile.simTime >= 30) {
            tile.simTime = 0; // loop
          }
          
          if (tile.updateScrubProgress) {
            tile.updateScrubProgress(tile.simTime / 30);
          }

          queueRender(tile.id, 2);
        }
      }
    });

    const time = (Date.now() - startTime) / 1000.0;

    // Process at most 1 render request per frame
    if (renderQueue.length > 0) {
      // Sort render queue (Priority 1 first, then 2, then 3)
      renderQueue.sort((a, b) => a.priority - b.priority);
      const { tileId } = renderQueue.shift();

      const tile = tiles.get(tileId);
      if (tile) {
        if (tile.isFixed && tile.simulationType) {
          const isDaylight = document.body.classList.contains('daylight-mode');
          if (tile.simulationType === 'orbital-resonance') {
            drawOrbitalResonance(tile.ctx2d, tile.canvas.width, tile.canvas.height, tile.simTime, isDaylight);
          } else if (tile.simulationType === 'solar-corona') {
            drawSolarCorona(tile.ctx2d, tile.canvas.width, tile.canvas.height, tile.simTime, isDaylight);
          }
        } else {
          // Evaluate overall exposure level by analyzing exposure map pixels
          updateExposureMetrics(tile);

          // Render shader offscreen and paint local 2D canvas
          renderer.render(tile, time);
          tile.ctx2d.drawImage(renderer.canvas, 0, 0, tile.canvas.width, tile.canvas.height);

          // Ripple dampening
          if (tile.rippleStrength > 0.01) {
            tile.rippleStrength *= 0.92;
            queueRender(tileId, 2); // Queue dynamic updates as Priority 2 (Bloom/Anim)
          } else {
            tile.rippleStrength = 0.0;
          }

          // Chemical bloom updates
          if (tile.tier === 1 && tile.expVal > 0.8 && !tile.isFixed) {
            tile.bloomPulse = Math.sin(time * 12.0) * 0.5 + 0.5;
            queueRender(tileId, 2);
          }
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Setup the separate ambient decay loop ticking every 5 seconds
  setInterval(tickAmbientDecay, 5000);
}

function updateExposureMetrics(tile) {
  const ctx = tile.exposureCtx;
  const imgData = ctx.getImageData(0, 0, 128, 128).data;
  
  // Calculate average luminance of the exposure map
  let sum = 0;
  for (let i = 0; i < imgData.length; i += 4) {
    sum += imgData[i]; // Grayscale map, R channel represents level
  }
  const avg = sum / (128 * 128 * 255);
  tile.expVal = avg;

  // Fixation trigger
  if (tile.expVal >= tile.cap - 0.025 && !tile.isFixed) {
    tile.isFixed = true;
    tile.expVal = tile.cap;
    tile.bloomPulse = 0.0;
    
    // Fill map fully with white or cap value to stabilize
    const val = Math.floor(tile.cap * 255);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(0, 0, 128, 128);

    const baseId = tile.id.replace(/^line-/, '');
    localStorage.setItem(`darkroom_exposure_${baseId}`, tile.cap.toString());

    // Dispatch completion event for video/UI elements
    tile.canvas.dispatchEvent(new CustomEvent('fixed', { detail: { id: tile.id } }));

    // Run one final fixed render
    if (webglAvailable) {
      renderer.render(tile, 0);
      tile.ctx2d.drawImage(renderer.canvas, 0, 0, tile.canvas.width, tile.canvas.height);
    } else {
      updateCSSFallback(tile);
    }
  }
}

function tickAmbientDecay() {
  const activeDaylight = document.body.classList.contains('daylight-mode');
  if (activeDaylight) return; // Disable decay under daylight

  tiles.forEach((tile) => {
    if (tile.isFixed) return;

    // Decay conditions: not fixed and no pointer interaction within last 8 seconds
    const elapsed = Date.now() - tile.lastInteraction;
    if (elapsed > 8000) {
      const ctx = tile.exposureCtx;
      
      // Ambient exposure growth (patience rewards)
      // Dwell time: even without moving, standard exposure grows slowly (0.015 per tick)
      let growthAmount = 0.012;
      
      // Decay: if completely abandoned (not hovered at all for a long time, e.g. 15s),
      // we slowly decay its local exposure map back to black, but ONLY pre-fix!
      let decayAmount = 0.0;
      if (elapsed > 15000) {
        growthAmount = 0.0;
        decayAmount = 0.04; // decay rate
      }

      if (growthAmount > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
        ctx.fillRect(0, 0, 128, 128);
        queueRender(tile.id, 3);
      } else if (decayAmount > 0) {
        // Darken canvas slightly to decay exposure map
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, 128, 128);
        queueRender(tile.id, 3);
      }
    }
  });
}

// Fallback CSS path
function updateCSSFallback(tile) {
  const canvas = tile.canvas;
  const container = canvas.parentElement;
  
  if (tile.isFixed) {
    canvas.style.filter = tile.tier === 1 ? 'none' : 'grayscale(100%)';
    canvas.style.opacity = '1.0';
    
    // Draw original image straight onto canvas in fallback
    const img = new Image();
    img.onload = () => {
      tile.ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = tile.imageSrc;
  } else {
    // Progressive CSS filters representing stages
    const blurAmount = Math.max(0, 20 - tile.expVal * 25);
    const opacityAmount = Math.min(1.0, tile.expVal * 1.5 + 0.1);
    
    canvas.style.filter = `blur(${blurAmount}px) grayscale(100%)`;
    canvas.style.opacity = opacityAmount.toString();
    
    const img = new Image();
    img.onload = () => {
      tile.ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = tile.imageSrc;
  }
}

// Force instant fill when daylight is activated
export function forceCompleteDevelopment() {
  tiles.forEach((tile) => {
    tile.isFixed = true;
    tile.expVal = tile.cap;
    tile.bloomPulse = 0.0;

    const val = Math.floor(tile.cap * 255);
    const ctx = tile.exposureCtx;
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(0, 0, 128, 128);

    if (webglAvailable && renderer) {
      renderer.render(tile, 0);
      tile.ctx2d.drawImage(renderer.canvas, 0, 0, tile.canvas.width, tile.canvas.height);
    } else {
      updateCSSFallback(tile);
    }
    
    // Dispatch fixed event for videos
    tile.canvas.dispatchEvent(new CustomEvent('fixed', { detail: { id: tile.id } }));
  });
}
