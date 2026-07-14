import React, { useEffect, useState, useRef } from 'react';
import DevelopingPrint from './DevelopingPrint';

const PROJECTS_DATA = [
  {
    id: 'lenses',
    title: 'Lenses & Lathes',
    category: 'Print 01 / Craft',
    src: '/print1.png',
    year: '2026',
    desc: 'An exploration of analog precision. The cold metal casing of vintage camera glass meeting the warm grain of workshop benches. Exposed under safelight on silver-halide fiber paper.'
  },
  {
    id: 'brutalist',
    title: 'Graphic Monoliths',
    category: 'Print 02 / Forms',
    src: '/print2.png',
    year: '2025',
    desc: 'Brutalist structures captured in stark midday sunlight. Long, sharp geometric shadows slice across concrete curves. A study of pure form, grain texture, and high-contrast exposure.'
  },
  {
    id: 'forest',
    title: 'Misty Pines',
    category: 'Print 03 / Silhouettes',
    src: '/print3.png',
    year: '2026',
    desc: 'Misty woodland ridges developing in soft developer bath. The silent, layered depth of pine trees fading into early morning fog. Developed with a soft chemical bloom at the margins.'
  }
];

export default function TheLine({ isDaylightMode, onSelectProject }) {
  const [sways, setSways] = useState([0, 0, 0]);
  const velocities = useRef([0, 0, 0]);
  const angles = useRef([0, 0, 0]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const printRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Physics loop for clothesline swaying
    let animId;
    let time = 0;

    const physicsLoop = () => {
      time += 0.02;
      const updatedSways = angles.current.map((angle, idx) => {
        // Natural wind sway (ambient)
        const ambientForce = Math.sin(time * 1.5 + idx * 2) * 0.05;
        
        // Mouse draft sway
        let draftForce = 0;
        const printEl = printRefs[idx].current;
        if (printEl) {
          const rect = printEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const dx = mouseRef.current.x - centerX;
          const dy = mouseRef.current.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            // Stronger push when cursor moves close
            const intensity = (1 - dist / 200) * 0.3;
            // Sway direction based on cursor movement / position
            draftForce = Math.sin(time * 6) * intensity * (dx > 0 ? 1 : -1);
          }
        }

        // Spring physics: force = -k * x - c * v
        const k = 0.04; // Spring constant
        const c = 0.02; // Damping
        const force = -k * angle - c * velocities.current[idx] + ambientForce + draftForce;
        
        velocities.current[idx] += force;
        angles.current[idx] += velocities.current[idx];

        // Clamp angle
        angles.current[idx] = Math.max(-25, Math.min(25, angles.current[idx]));

        return angles.current[idx];
      });

      setSways(updatedSways);
      animId = requestAnimationFrame(physicsLoop);
    };

    animId = requestAnimationFrame(physicsLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handlePrintClick = (id) => {
    // Scroll to the selected project print section
    const el = document.getElementById(`project-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    if (onSelectProject) {
      onSelectProject(id);
    }
  };

  return (
    <section className="darkroom-section">
      <div className="section-label">Index / Gallery</div>
      <h2 className="section-title">The Clothesline</h2>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.2rem',
        maxWidth: '600px',
        color: 'var(--text-muted)',
        lineHeight: '1.6',
        marginBottom: '2rem'
      }}>
        Hanging above the trays, prints dry on a tension line. Swaying in the drafts of the room. Lingering near a print exposes it to development; clicking it pulls it down for inspect.
      </p>

      <div className="clothesline-container">
        <div className="clothesline-wire" />
        
        {PROJECTS_DATA.map((proj, idx) => (
          <div
            key={proj.id}
            ref={printRefs[idx]}
            className="hanging-print"
            style={{
              transform: `rotate(${sways[idx]}deg)`,
              transition: 'transform 0.05s ease-out'
            }}
            onClick={() => handlePrintClick(proj.id)}
          >
            <div className="peg" />
            <div className="hanging-paper" data-cursor="tongs">
              <DevelopingPrint
                src={proj.src}
                alt={proj.title}
                width={200}
                height={150}
                projectId={`line-thumb-${proj.id}`}
                isDaylightMode={isDaylightMode}
              />
              <div className="paper-caption">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {proj.category}
                </span>
                <div style={{ fontWeight: 600, fontSize: '12px', marginTop: '4px' }}>
                  {proj.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="murmur-prompt">
        "Give it time. The print is ready when it's ready."
      </div>
    </section>
  );
}

export { PROJECTS_DATA };
