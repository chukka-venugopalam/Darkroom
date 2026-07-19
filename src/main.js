import contentData from './content.json';
import { CustomCursor } from './cursor.js';
import { 
  registerTile, 
  initDevelopEngine, 
  forceCompleteDevelopment, 
  tiles,
  webglAvailable
} from './develop.js';
import { initVideoHandlers } from './video.js';
import { initClothesline } from './clothesline.js';
import { initTrays } from './trays.js';

// Web Audio API Synthesizer for ambient sound
let audioCtx = null;
let humOsc = null;
let buzzOsc = null;
let humGain = null;
let dripTimer = null;

function initAmbientAudio() {
  if (audioCtx) return;
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // 60Hz fundamental hum
  humOsc = audioCtx.createOscillator();
  humOsc.type = 'sine';
  humOsc.frequency.setValueAtTime(60, audioCtx.currentTime);

  // 120Hz secondary buzz harmonic
  buzzOsc = audioCtx.createOscillator();
  buzzOsc.type = 'triangle';
  buzzOsc.frequency.setValueAtTime(120, audioCtx.currentTime);
  
  const buzzGain = audioCtx.createGain();
  buzzGain.gain.setValueAtTime(0.005, audioCtx.currentTime);

  // Low pass filter to make the hum warm and muffled
  const lpFilter = audioCtx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(150, audioCtx.currentTime);

  humGain = audioCtx.createGain();
  humGain.gain.setValueAtTime(0.015, audioCtx.currentTime);

  humOsc.connect(lpFilter);
  buzzOsc.connect(buzzGain);
  buzzGain.connect(lpFilter);
  lpFilter.connect(humGain);
  humGain.connect(audioCtx.destination);

  humOsc.start();
  buzzOsc.start();

  // Procedural drip sound
  const playDrip = () => {
    if (audioCtx.state === 'suspended') return;
    
    const dripOsc = audioCtx.createOscillator();
    const dripGain = audioCtx.createGain();
    
    dripOsc.type = 'sine';
    // Frequency sweep down to simulate a dripping impact
    dripOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
    dripOsc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.12);
    
    dripGain.gain.setValueAtTime(0.008, audioCtx.currentTime);
    dripGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    
    dripOsc.connect(dripGain);
    dripGain.connect(audioCtx.destination);
    
    dripOsc.start();
    dripOsc.stop(audioCtx.currentTime + 0.15);

    // Schedule next drip randomly
    dripTimer = setTimeout(playDrip, Math.random() * 5000 + 4000);
  };
  playDrip();
}

function toggleAudio() {
  const btn = document.getElementById('audio-toggle');
  if (!audioCtx) {
    initAmbientAudio();
    btn.classList.add('active');
  } else if (audioCtx.state === 'running') {
    audioCtx.suspend();
    btn.classList.remove('active');
  } else {
    audioCtx.resume();
    btn.classList.add('active');
  }
}

// Populate sections DOM
function populateGallery() {
  const natureGrid = document.getElementById('gallery-grid-nature');
  const spaceGrid = document.getElementById('gallery-grid-space');
  if (!natureGrid || !spaceGrid) return;

  const naturePrints = [
    'phyllotaxis-bloom',
    'fractal-branching',
    'cymatics',
    'radiolaria-architecture'
  ];
  const spacePrints = [
    'spiral-galaxy',
    'orbital-resonance',
    'crater-topology',
    'nebula-filament',
    'solar-corona'
  ];

  const prints = contentData.filter(item => item.tier === 1);
  const natureData = prints.filter(item => naturePrints.includes(item.id));
  const spaceData = prints.filter(item => spacePrints.includes(item.id));

  const renderCard = (item) => `
    <div class="tile-frame" data-id="${item.id}" data-medium="${item.medium}">
      <div class="canvas-container">
        <canvas width="400" height="300"></canvas>
      </div>
      <div class="tile-details">
        <div class="tile-meta">
          <span>Tier 1: Print</span>
          <span>${item.date}</span>
        </div>
        <div class="tile-title">${item.title}</div>
        <div class="tile-caption">${item.caption}</div>
      </div>
    </div>
  `;

  natureGrid.innerHTML = natureData.map(renderCard).join('');
  spaceGrid.innerHTML = spaceData.map(renderCard).join('');

  prints.forEach(item => {
    const container = naturePrints.includes(item.id) ? natureGrid : spaceGrid;
    const el = container.querySelector(`[data-id="${item.id}"]`);
    if (el) {
      registerTile(item.id, el, item.image, item.tier);
      if (item.medium === 'video' && item.video) {
        const tile = tiles.get(item.id);
        initVideoHandlers(tile, item.video);
      }
    }
  });
}

function populateContactSheets() {
  const timeline = document.getElementById('contact-sheets-timeline');
  if (!timeline) return;

  const sheets = contentData.filter(item => item.tier === 2);
  timeline.innerHTML = sheets.map(item => `
    <div class="timeline-item" data-id="${item.id}">
      <div class="tile-frame">
        <div class="canvas-container">
          <canvas width="300" height="225"></canvas>
        </div>
      </div>
      <div class="timeline-content">
        <div class="tile-meta">Tier 2: Contact Sheet // ${item.date}</div>
        <h3>${item.title}</h3>
        <p class="timeline-description">${item.caption}</p>
      </div>
    </div>
  `).join('');

  sheets.forEach(item => {
    const el = timeline.querySelector(`[data-id="${item.id}"]`);
    registerTile(item.id, el, item.image, item.tier);
  });
}

function populateNegatives() {
  const list = document.getElementById('negatives-list');
  if (!list) return;

  const negatives = contentData.filter(item => item.tier === 3);
  list.innerHTML = negatives.map(item => `
    <div class="negative-frame" data-id="${item.id}">
      <div class="negative-canvas-wrapper">
        <canvas width="320" height="224"></canvas>
      </div>
      <div class="negative-caption-wrap">
        <div class="tile-meta">Tier 3: Neg // ${item.date}</div>
        <div class="tile-title">${item.title}</div>
        <div class="tile-caption">${item.caption}</div>
        <div class="negative-reason">Clipped: ${item.reason}</div>
      </div>
    </div>
  `).join('');

  negatives.forEach(item => {
    const el = list.querySelector(`[data-id="${item.id}"]`);
    registerTile(item.id, el, item.image, item.tier);
  });
}

// Setup site light-switch daylight toggle
function initLightSwitch() {
  const btn = document.getElementById('light-switch');
  if (!btn) return;

  const toggleDaylight = (forceState) => {
    const isDay = forceState !== undefined ? forceState : !document.body.classList.contains('daylight-mode');
    
    if (isDay) {
      document.body.classList.add('daylight-mode');
      document.body.classList.remove('safelight-mode');
      btn.setAttribute('aria-pressed', 'true');
      forceCompleteDevelopment();
    } else {
      document.body.classList.remove('daylight-mode');
      document.body.classList.add('safelight-mode');
      btn.setAttribute('aria-pressed', 'false');
      
      // Reload development state mapping
      tiles.forEach(tile => {
        tile.isFixed = false;
        const baseId = tile.id.replace(/^line-/, '');
        const saved = localStorage.getItem(`darkroom_exposure_${baseId}`);
        let savedVal = 0.0;
        if (saved) {
          if (saved === 'fixed') {
            savedVal = tile.cap;
          } else {
            const parsed = parseFloat(saved);
            savedVal = isNaN(parsed) ? 0.0 : parsed;
          }
        }
        tile.expVal = savedVal;
        
        // Re-draw exposure canvas state
        const ctx = tile.exposureCtx;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 128);
        if (savedVal > 0) {
          const hex = Math.floor(savedVal * 255).toString(16).padStart(2, '0');
          ctx.fillStyle = `#${hex}${hex}${hex}`;
          ctx.fillRect(0, 0, 128, 128);
        }
        
        // Retrigger draw
        if (!webglAvailable) {
          const img = new Image();
          img.onload = () => tile.ctx2d.drawImage(img, 0, 0, tile.canvas.width, tile.canvas.height);
          img.src = tile.imageSrc;
        }
      });
    }
  };

  btn.addEventListener('click', () => toggleDaylight());

  // Respect system reduced-motion profile automatically
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    toggleDaylight(true);
  }
}

// Navigation scroll active styling & daylight trigger for contact section
function initScrollObserver() {
  const sections = document.querySelectorAll('.scroll-section');
  const navLinks = document.querySelectorAll('nav a');
  const contactSection = document.getElementById('into-the-light-section');

  const options = {
    root: null,
    threshold: 0.3
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        
        // Sync active nav item
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });

        // "Into the Light" scroll behavior - automatically turn on daylight
        if (id === 'into-the-light-section') {
          document.body.classList.add('daylight-mode');
          document.body.classList.remove('safelight-mode');
          forceCompleteDevelopment();
        } else if (!document.getElementById('light-switch').classList.contains('active') && 
                   document.getElementById('light-switch').getAttribute('aria-pressed') !== 'true') {
          // If we scroll up and daylight switch is NOT actively forced by click
          document.body.classList.remove('daylight-mode');
          document.body.classList.add('safelight-mode');
        }
      }
    });
  }, options);

  sections.forEach(section => observer.observe(section));
}

// Filter grid items
function initGalleryFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.grid-layout .tile-frame');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      items.forEach(item => {
        const medium = item.getAttribute('data-medium');
        if (filter === 'all' || medium === filter) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// Technical Log Toggle
function initTechLog() {
  const btn = document.getElementById('tech-log-toggle');
  const log = document.getElementById('tech-log');
  if (!btn || !log) return;

  btn.addEventListener('click', () => {
    const isHidden = log.classList.contains('hidden');
    if (isHidden) {
      log.classList.remove('hidden');
      btn.textContent = 'Hide Technical Log';
    } else {
      log.classList.add('hidden');
      btn.textContent = 'Show Technical Log';
    }
  });
}

// Contact form submit mock
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.submit-btn');
    btn.textContent = 'Exposed Successfully ✔';
    btn.style.background = '#28a745';
    btn.disabled = true;

    setTimeout(() => {
      form.reset();
      btn.textContent = 'Expose Project';
      btn.style.background = 'var(--accent-red)';
      btn.disabled = false;
    }, 4000);
  });
}

// Init everything
window.addEventListener('DOMContentLoaded', () => {
  new CustomCursor();
  
  // Scaffolding content lists
  initClothesline(contentData);
  populateGallery();
  populateContactSheets();
  populateNegatives();
  
  // Connect modules
  initDevelopEngine();
  initTrays();
  initLightSwitch();
  initScrollObserver();
  initGalleryFilters();
  initTechLog();
  initContactForm();

  document.getElementById('audio-toggle').addEventListener('click', toggleAudio);
});
