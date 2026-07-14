import React, { useState, useEffect, useRef } from 'react';
import audioEngine from '../utils/AudioEngine';

const SKILLS_LIST = [
  { id: 'react', name: 'React & State Architecture' },
  { id: 'canvas', name: 'HTML5 Canvas & Pixels' },
  { id: 'node', name: 'Node.js & Backend Systems' },
  { id: 'perf', name: 'Performance Optimization' },
  { id: 'ux', name: 'Tactile Interface Design' }
];

const TRAY_COPY = {
  developer: {
    title: 'Developer Bath',
    desc: 'The initial chemical bath where latent ideas build up value. Copy tone: exploratory, raw, and exploratory.',
    skills: {
      react: 'React & State: Sketching component trees, hooking states, and mapping reactive flows. It starts in raw code structure, watching elements organize.',
      canvas: 'Canvas & Pixels: Working with low-level raw image data buffers, raster graphics, and scheduling requestAnimationFrame rendering loops.',
      node: 'Node.js Backend: Early database schemas, raw HTTP socket listeners, modeling endpoints before locking down API boundaries.',
      perf: 'Performance: Profiling frame budgets, capturing flame graphs, finding bottleneck render trees before optimizations are frozen.',
      ux: 'Tactile UX: Rapid prototyping, testing micro-animations, drafting layout boundaries, and exploring cursor displacement mechanics.'
    }
  },
  stop: {
    title: 'Stop Bath',
    desc: 'An acidic wash that halts developer actions instantly. The phase of pause, review, and reflection.',
    skills: {
      react: 'React & State: Stepping back to refactor, auditing unnecessary re-renders, linting hooks, and freezing state interfaces.',
      canvas: 'Canvas & Pixels: Auditing garbage collection, caching static offscreen canvases, and checking memory allocations on draw calls.',
      node: 'Node.js Backend: Unit testing endpoints, mocking database states, writing validation schemas, and establishing crash safeguards.',
      perf: 'Performance: Setting up performance budgets, verifying layout shifts, and removing heavy dependencies from the production bundle.',
      ux: 'Tactile UX: Checking WCAG colors, auditing prefers-reduced-motion fallbacks, and ensuring screen-reader labels are descriptive.'
    }
  },
  fix: {
    title: 'Fixer Bath',
    desc: 'The final bath that renders the image stable and permanent, making it safe to pull into daylight.',
    skills: {
      react: 'React & State: Bundled, tree-shaken, and shipped. Stable React interfaces running production builds, cached and rendered with SSR/hydration.',
      canvas: 'Canvas & Pixels: Final graphics fixed onto high-density canvases, serving high-DPI screens without fuzzy interpolation.',
      node: 'Node.js Backend: Hardened database tables, SSL keys, edge routing, auto-scaling clusters, and live production error logs.',
      perf: 'Performance: 100/100 Core Web Vitals, fully optimized assets, Brotli-compressed assets, and fluid 60fps scrolling animations.',
      ux: 'Tactile UX: A finalized, sensory digital experience. Fully responsive, highly interactive, and fixed into localStorage state.'
    }
  }
};

// Sub-component for an interactive liquid tray
function ChemicalTray({ id, label, isActive, onDropTag, onSelectTray, selectedTag }) {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    const drawFluid = () => {
      const w = canvas.width;
      const h = canvas.height;
      time += 0.04;

      ctx.clearRect(0, 0, w, h);

      // Draw background fluid color
      // Safelight mode uses red tones; Daylight uses cream/grey tones
      const isDaylight = document.body.classList.contains('daylight-mode');
      
      const r = isDaylight ? 220 : 35;
      const g = isDaylight ? 218 : 6;
      const b = isDaylight ? 210 : 6;
      const alpha = isDaylight ? 0.08 : 0.25;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(0, 0, w, h);

      // Shimmer wave
      ctx.fillStyle = isDaylight ? 'rgba(168, 32, 32, 0.02)' : 'rgba(255, 26, 26, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 10) {
        const yOffset = Math.sin(x * 0.05 + time) * 6 + Math.cos(x * 0.02 + time * 0.5) * 4;
        ctx.lineTo(x, h/2 + 20 + yOffset);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Draw active ripples
      ripplesRef.current.forEach((rip) => {
        rip.radius += 2.2;
        rip.alpha *= 0.94; // Fade out

        ctx.strokeStyle = isDaylight 
          ? `rgba(168, 32, 32, ${rip.alpha})`
          : `rgba(255, 26, 26, ${rip.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Filter out faded ripples
      ripplesRef.current = ripplesRef.current.filter(rip => rip.alpha > 0.01);

      animId = requestAnimationFrame(drawFluid);
    };

    drawFluid();

    return () => cancelAnimationFrame(animId);
  }, []);

  const triggerTrayRipple = (x, y) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 2,
      alpha: 0.8
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const tagId = e.dataTransfer.getData('text/plain');
    if (tagId) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      
      triggerTrayRipple(dropX, dropY);
      audioEngine.triggerSplash();
      onDropTag(tagId, id);
    }
  };

  const handleTrayClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    triggerTrayRipple(clickX, clickY);
    
    if (selectedTag) {
      // If a tag is currently clicked/active, "submerge" it
      audioEngine.triggerSplash();
      onDropTag(selectedTag, id);
    } else {
      onSelectTray(id);
    }
  };

  return (
    <div className="tray-wrapper" onClick={handleTrayClick}>
      <div className="tray-label">{label}</div>
      <div 
        className={`tray ${isActive ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-cursor="tongs"
      >
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={234} 
          style={{ width: '100%', height: '100%', display: 'block' }} 
        />
        <div className="tray-fluid" />
        
        {/* Subtle tray overlay detail */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--text-muted)',
          opacity: 0.5,
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          AGITATE TRYS
        </div>
      </div>
    </div>
  );
}

export default function TheTrays({ isDaylightMode }) {
  const [selectedTag, setSelectedTag] = useState(null);
  const [activeTray, setActiveTray] = useState('developer');
  const [activeExplainText, setActiveExplainText] = useState(
    'Pick up a skill tag below and dip it into the trays to see how it develops, stops, or fixes.'
  );

  const handleTagDragStart = (e, tagId) => {
    e.dataTransfer.setData('text/plain', tagId);
    setSelectedTag(tagId);
    audioEngine.triggerClick();
  };

  const handleTagClick = (tagId) => {
    audioEngine.triggerClick();
    if (selectedTag === tagId) {
      setSelectedTag(null); // Deselect
    } else {
      setSelectedTag(tagId);
    }
  };

  const handleDropTag = (tagId, trayId) => {
    setSelectedTag(null);
    setActiveTray(trayId);

    const skill = SKILLS_LIST.find(s => s.id === tagId);
    if (skill && TRAY_COPY[trayId].skills[tagId]) {
      setActiveExplainText(
        `[${TRAY_COPY[trayId].title} / ${skill.name}]: ${TRAY_COPY[trayId].skills[tagId]}`
      );
    }
  };

  const handleSelectTray = (trayId) => {
    setActiveTray(trayId);
    if (selectedTag) {
      handleDropTag(selectedTag, trayId);
    } else {
      setActiveExplainText(
        `[${TRAY_COPY[trayId].title}]: ${TRAY_COPY[trayId].desc}`
      );
    }
  };

  return (
    <section className="darkroom-section" id="trays-section">
      <div className="section-label">Process / Skills</div>
      <h2 className="section-title">The Chemistry Trays</h2>
      
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.2rem',
        maxWidth: '650px',
        color: 'var(--text-muted)',
        lineHeight: '1.6',
        marginBottom: '2.5rem'
      }}>
        Concepts develop, stop, and fix. Drag the skill tags below directly into the liquid trays, or click a tag followed by a tray to submerge it. Watch the chemistry react.
      </p>

      <div className="trays-grid">
        <ChemicalTray 
          id="developer"
          label="Developer" 
          isActive={activeTray === 'developer'} 
          onDropTag={handleDropTag}
          onSelectTray={handleSelectTray}
          selectedTag={selectedTag}
        />
        <ChemicalTray 
          id="stop"
          label="Stop Bath" 
          isActive={activeTray === 'stop'} 
          onDropTag={handleDropTag}
          onSelectTray={handleSelectTray}
          selectedTag={selectedTag}
        />
        <ChemicalTray 
          id="fix"
          label="Fixer" 
          isActive={activeTray === 'fix'} 
          onDropTag={handleDropTag}
          onSelectTray={handleSelectTray}
          selectedTag={selectedTag}
        />
      </div>

      <div className="skills-container">
        {SKILLS_LIST.map((skill) => (
          <div
            key={skill.id}
            draggable
            onDragStart={(e) => handleTagDragStart(e, skill.id)}
            onClick={() => handleTagClick(skill.id)}
            className={`skill-tag ${selectedTag === skill.id ? 'active' : ''}`}
            data-cursor="tongs"
            style={{
              cursor: selectedTag === skill.id ? 'grabbing' : 'grab'
            }}
          >
            {skill.name}
          </div>
        ))}
      </div>

      <div className="tray-info-box">
        {activeExplainText}
      </div>
    </section>
  );
}
