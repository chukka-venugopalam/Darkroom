export function initVideoHandlers(tile, videoSrc) {
  // If not Tier 1, video playback is disabled (poster frame only)
  if (tile.tier !== 1) return;

  const canvas = tile.canvas;
  
  const handleFixed = () => {
    canvas.removeEventListener('fixed', handleFixed);
    mountVideoPlayer(tile, videoSrc);
  };

  if (tile.isFixed) {
    mountVideoPlayer(tile, videoSrc);
  } else {
    canvas.addEventListener('fixed', handleFixed);
  }
}

function mountVideoPlayer(tile, videoSrc) {
  const container = tile.canvas.parentElement;
  
  // Avoid duplicate mounts
  if (container.querySelector('.video-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'video-wrapper';

  const playOverlay = document.createElement('div');
  playOverlay.className = 'video-play-overlay';
  playOverlay.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;

  const scrubBar = document.createElement('div');
  scrubBar.className = 'video-scrub-bar';
  
  const progress = document.createElement('div');
  progress.className = 'video-scrub-progress';
  scrubBar.appendChild(progress);

  // If it's a procedural simulation, we don't create a <video> element.
  // Instead, we paint directly to the existing tile canvas.
  if (videoSrc.startsWith('procedural:')) {
    const simType = videoSrc.split(':')[1];
    
    tile.simulationType = simType;
    tile.isPlaying = false;
    tile.simTime = 0;
    
    wrapper.appendChild(playOverlay);
    wrapper.appendChild(scrubBar);
    container.appendChild(wrapper);

    // Style wrapper and controls to overlay on original canvas
    wrapper.style.background = 'transparent';
    wrapper.style.pointerEvents = 'none';
    playOverlay.style.pointerEvents = 'auto';
    scrubBar.style.pointerEvents = 'auto';

    // Hook progress updater and immediate draw
    tile.updateScrubProgress = (fraction) => {
      progress.style.width = `${fraction * 100}%`;
    };

    tile.drawImmediate = () => {
      const isDaylight = document.body.classList.contains('daylight-mode');
      if (tile.simulationType === 'orbital-resonance') {
        drawOrbitalResonance(tile.ctx2d, tile.canvas.width, tile.canvas.height, tile.simTime, isDaylight);
      } else if (tile.simulationType === 'solar-corona') {
        drawSolarCorona(tile.ctx2d, tile.canvas.width, tile.canvas.height, tile.simTime, isDaylight);
      }
    };

    // Draw first frame
    tile.drawImmediate();

    // Play/Pause toggle
    playOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      tile.isPlaying = !tile.isPlaying;
      tile.lastInteraction = Date.now();
      
      if (tile.isPlaying) {
        playOverlay.classList.add('playing');
      } else {
        playOverlay.classList.remove('playing');
        tile.drawImmediate(); // redraw static
      }
    });

    // Pause on clicking canvas
    tile.canvas.addEventListener('click', (e) => {
      e.stopPropagation();
      if (tile.isPlaying) {
        tile.isPlaying = false;
        playOverlay.classList.remove('playing');
        tile.drawImmediate();
      }
    });

    // Setup unified touch scrubbing
    setupScrubBar(scrubBar, tile, true);

  } else {
    // Normal video tag player with missing-video fallback
    const video = document.createElement('video');
    video.src = videoSrc;
    video.loop = true;
    video.playsInline = true;
    video.muted = true;

    // Hide video until it successfully loads to prevent brief black/blank flash
    video.style.display = 'none';
    wrapper.style.background = 'transparent'; // Let canvas show until video loads
    wrapper.appendChild(video);
    container.appendChild(wrapper);

    let hasResponded = false;

    const handleLoadFailure = () => {
      if (hasResponded) return;
      hasResponded = true;

      video.style.display = 'none';
      wrapper.style.background = 'transparent';

      // Quiet darkroom archive style label stamp
      const label = document.createElement('div');
      label.className = 'video-fallback-label';
      label.textContent = 'NOT YET DEVELOPED';

      label.style.position = 'absolute';
      label.style.bottom = '15px';
      label.style.left = '15px';
      label.style.fontFamily = 'var(--font-mono)';
      label.style.fontSize = '0.7rem';
      label.style.color = 'var(--accent-red)';
      label.style.border = '1px dashed var(--border-color)';
      label.style.padding = '4px 8px';
      label.style.borderRadius = '3px';
      label.style.background = 'rgba(12, 10, 10, 0.85)';
      label.style.letterSpacing = '1px';
      label.style.textTransform = 'uppercase';

      wrapper.appendChild(label);
    };

    const handleLoadSuccess = () => {
      if (hasResponded) return;
      hasResponded = true;

      // Show video and play overlay/scrub bar
      video.style.display = 'block';
      wrapper.style.background = '#000';

      wrapper.appendChild(playOverlay);
      wrapper.appendChild(scrubBar);

      // Play video automatically on mount once confirmed loaded
      video.play()
        .then(() => {
          playOverlay.classList.add('playing');
        })
        .catch(err => {
          console.log('Autoplay blocked, showing play overlay:', err);
        });

      // Video interaction events
      playOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          video.play();
          playOverlay.classList.add('playing');
        } else {
          video.pause();
          playOverlay.classList.remove('playing');
        }
      });

      video.addEventListener('click', (e) => {
        e.stopPropagation();
        video.pause();
        playOverlay.classList.remove('playing');
      });

      video.addEventListener('timeupdate', () => {
        if (video.duration) {
          const pct = (video.currentTime / video.duration) * 100;
          progress.style.width = `${pct}%`;
        }
      });

      setupScrubBar(scrubBar, video, false);
    };

    video.addEventListener('loadedmetadata', handleLoadSuccess);
    video.addEventListener('canplay', handleLoadSuccess);
    video.addEventListener('error', handleLoadFailure);

    // Fallback if no event fires within 2.5 seconds
    setTimeout(() => {
      if (!hasResponded) {
        handleLoadFailure();
      }
    }, 2500);
  }
}

// Unified Pointer Event scrubbing supporting touch-drag and mouse-drag
function setupScrubBar(scrubBar, videoOrTile, isProcedural) {
  const progress = scrubBar.querySelector('.video-scrub-progress');
  let isScrubbing = false;

  const scrub = (e) => {
    const rect = scrubBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (width > 0) {
      const fraction = Math.max(0, Math.min(1, clickX / width));
      if (isProcedural) {
        videoOrTile.simTime = fraction * 30; // 30s loop
        videoOrTile.lastInteraction = Date.now();
        progress.style.width = `${fraction * 100}%`;
        if (videoOrTile.drawImmediate) {
          videoOrTile.drawImmediate();
        }
      } else {
        if (videoOrTile.duration) {
          videoOrTile.currentTime = fraction * videoOrTile.duration;
        }
      }
    }
  };

  scrubBar.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    isScrubbing = true;
    scrubBar.setPointerCapture(e.pointerId);
    scrub(e);
  });

  scrubBar.addEventListener('pointermove', (e) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    scrub(e);
  });

  const stopScrub = (e) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    isScrubbing = false;
    try {
      scrubBar.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  scrubBar.addEventListener('pointerup', stopScrub);
  scrubBar.addEventListener('pointercancel', stopScrub);
}

// Simulation Drawing: Keplerian Laplace Orbital Resonance (4:2:1 ratio)
export function drawOrbitalResonance(ctx, width, height, time, isDaylight) {
  const cx = width / 2;
  const cy = height / 2;
  
  // Fill background
  ctx.fillStyle = isDaylight ? '#f4f1ea' : '#0c0a0a';
  ctx.fillRect(0, 0, width, height);

  const r1 = 65;
  const r2 = 110;
  const r3 = 160;

  // Draw orbits
  ctx.strokeStyle = isDaylight ? 'rgba(74, 69, 63, 0.08)' : 'rgba(157, 147, 147, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.arc(cx, cy, r2, 0, Math.PI * 2);
  ctx.arc(cx, cy, r3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Resonance lines
  const steps = Math.floor(time * 30);
  ctx.strokeStyle = isDaylight ? 'rgba(143, 45, 45, 0.12)' : 'rgba(212, 175, 55, 0.12)';
  ctx.lineWidth = 0.5;
  
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i * 0.033;
    const th1 = t * 1.6;
    const th2 = t * 0.8;
    const th3 = t * 0.4;

    const px1 = cx + r1 * Math.cos(th1);
    const py1 = cy + r1 * Math.sin(th1);
    const px2 = cx + r2 * Math.cos(th2);
    const py2 = cy + r2 * Math.sin(th2);
    const px3 = cx + r3 * Math.cos(th3);
    const py3 = cy + r3 * Math.sin(th3);

    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.moveTo(px2, py2);
    ctx.lineTo(px3, py3);
  }
  ctx.stroke();

  // Current Moon Positions
  const th1 = time * 1.6;
  const th2 = time * 0.8;
  const th3 = time * 0.4;

  const px1 = cx + r1 * Math.cos(th1);
  const py1 = cy + r1 * Math.sin(th1);
  const px2 = cx + r2 * Math.cos(th2);
  const py2 = cy + r2 * Math.sin(th2);
  const px3 = cx + r3 * Math.cos(th3);
  const py3 = cy + r3 * Math.sin(th3);

  // Center Star
  ctx.fillStyle = isDaylight ? '#8f2d2d' : '#d4af37';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Moons
  ctx.fillStyle = isDaylight ? '#4a453f' : '#f2ebe1';
  ctx.beginPath();
  ctx.arc(px1, py1, 3.5, 0, Math.PI * 2);
  ctx.arc(px2, py2, 4.5, 0, Math.PI * 2);
  ctx.arc(px3, py3, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Simulation Drawing: Solar Corona Plasma Filaments
export function drawSolarCorona(ctx, width, height, time, isDaylight) {
  const cx = width / 2;
  const cy = height / 2;
  const sunR = 85;

  // Background
  ctx.fillStyle = isDaylight ? '#f4f1ea' : '#0c0a0a';
  ctx.fillRect(0, 0, width, height);

  // Rim glow
  const sunGlow = ctx.createRadialGradient(cx, cy, sunR, cx, cy, sunR + 40);
  if (isDaylight) {
    sunGlow.addColorStop(0, 'rgba(143, 45, 45, 0.15)');
    sunGlow.addColorStop(1, 'rgba(244, 241, 234, 0)');
  } else {
    sunGlow.addColorStop(0, 'rgba(199, 90, 40, 0.25)');
    sunGlow.addColorStop(1, 'rgba(12, 10, 10, 0)');
  }
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, sunR + 40, 0, Math.PI * 2);
  ctx.fill();

  // Create 12 loops
  const numLoops = 12;
  ctx.lineWidth = 1;
  
  for (let i = 0; i < numLoops; i++) {
    const baseAngle = (i / numLoops) * Math.PI * 2 + (i % 2) * 0.1;
    const span = 0.5 + (i % 3) * 0.2;
    const a1 = baseAngle - span / 2;
    const a2 = baseAngle + span / 2;
    const h = 30 + (i % 4) * 20;

    const P0 = { x: cx + sunR * Math.cos(a1), y: cy + sunR * Math.sin(a1) };
    const P2 = { x: cx + sunR * Math.cos(a2), y: cy + sunR * Math.sin(a2) };
    const am = (a1 + a2) / 2;
    const P1 = { x: cx + (sunR + h) * Math.cos(am), y: cy + (sunR + h) * Math.sin(am) };

    // Magnetic arc line
    ctx.strokeStyle = isDaylight ? 'rgba(143, 45, 45, 0.08)' : 'rgba(199, 90, 40, 0.12)';
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    ctx.quadraticCurveTo(P1.x, P1.y, P2.x, P2.y);
    ctx.stroke();

    // Plasma particles
    const numParticles = 2;
    for (let p = 0; p < numParticles; p++) {
      const speed = 0.15 + (i % 3) * 0.05;
      const phase = (time * speed + (p / numParticles) + (i * 0.7)) % 1.0;

      const omt = 1 - phase;
      const px = omt * omt * P0.x + 2 * omt * phase * P1.x + phase * phase * P2.x;
      const py = omt * omt * P0.y + 2 * omt * phase * P1.y + phase * phase * P2.y;

      const opacity = Math.sin(phase * Math.PI);
      ctx.fillStyle = isDaylight 
        ? `rgba(143, 45, 45, ${opacity * 0.6})`
        : `rgba(199, 90, 40, ${opacity * 0.75})`;
      
      ctx.beginPath();
      const size = 1.5 + (i % 2) * 1.0;
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sun Disk
  ctx.fillStyle = isDaylight ? '#e8e4db' : '#080606';
  ctx.strokeStyle = isDaylight ? '#4a453f' : '#1f1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sunspots
  const spots = [
    { r: 25, a: 0.5, sz: 3 },
    { r: 40, a: 2.1, sz: 2 },
    { r: 35, a: 4.5, sz: 4 },
  ];
  ctx.fillStyle = isDaylight ? 'rgba(74, 69, 63, 0.4)' : 'rgba(157, 147, 147, 0.2)';
  spots.forEach(spot => {
    const sx = cx + spot.r * Math.cos(spot.a + time * 0.02);
    const sy = cy + spot.r * Math.sin(spot.a + time * 0.02);
    ctx.beginPath();
    ctx.arc(sx, sy, spot.sz, 0, Math.PI * 2);
    ctx.fill();
  });
}
