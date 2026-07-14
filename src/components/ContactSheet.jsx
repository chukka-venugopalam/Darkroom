import React, { useState } from 'react';
import DevelopingPrint from './DevelopingPrint';

const ABOUT_FRAGMENTS = [
  {
    id: 'frame-1',
    num: '01A',
    title: 'The Artisan',
    text: 'A digital craftsman focused on physical, patient, and tactile web interfaces. Believing that code is as much a medium of craft as wood, glass, or silver halide.'
  },
  {
    id: 'frame-2',
    num: '02A',
    isImage: true,
    title: 'The Printmaker',
    src: '/portrait.png'
  },
  {
    id: 'frame-3',
    num: '03A',
    title: 'The Discipline',
    text: 'Rejecting the rush of instant payoff. Resisting the 200ms snap-to-clarity in favor of organic, incremental reveals. The longer you stay, the more you see.'
  },
  {
    id: 'frame-4',
    num: '04A',
    title: 'The Chemistry',
    text: 'Combining vanilla CSS controls, procedural canvas pixel mathematics, and real-time synthesized audio waves to create physical sensory depth.'
  },
  {
    id: 'frame-5',
    num: '05A',
    title: 'The Philosophy',
    text: 'In an industry obsessed with optimization metrics and lightning speeds, there is space for reflection. A digital darkroom for crafting lasting digital prints.'
  },
  {
    id: 'frame-6',
    num: '06A',
    title: 'The Contact',
    text: 'Every section here is an exposed print in development. Submerge tags, agitate the liquid, and stay under the safelight to unlock the full picture.'
  }
];

function FilmFrame({ frame, isDaylightMode }) {
  const [progress, setProgress] = useState(isDaylightMode ? 1.0 : 0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isDaylightMode) {
      setProgress(1.0);
      return;
    }

    if (isHovered) {
      // Dwell timer increases progress
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1.0) {
            clearInterval(timerRef.current);
            return 1.0;
          }
          return prev + 0.04;
        });
      }, 50);
    } else {
      // Decay progress slowly when mouse leaves
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 0.02;
        });
      }, 50);
    }

    return () => clearInterval(timerRef.current);
  }, [isHovered, isDaylightMode]);

  const p = progress;

  // Compute colors based on progress simulating negative -> positive development
  // 0% progress: dark negative style (black background, dull red text)
  // 100% progress: parchment positive paper card style
  const paperR = isDaylightMode ? 255 : 229;
  const paperG = isDaylightMode ? 255 : 222;
  const paperB = isDaylightMode ? 255 : 201;

  const bgR = Math.round(5 * (1 - p) + paperR * p);
  const bgG = Math.round(2 * (1 - p) + paperG * p);
  const bgB = Math.round(2 * (1 - p) + paperB * p);

  // Text color blends from dull red to dark grey/black
  const textR = Math.round(140 * (1 - p) + 26 * p);
  const textG = Math.round(20 * (1 - p) + 26 * p);
  const textB = Math.round(20 * (1 - p) + 20 * p);

  const textStyle = {
    color: `rgb(${textR}, ${textG}, ${textB})`,
    opacity: 0.3 + 0.7 * p,
    transition: 'opacity 0.2s'
  };

  return (
    <div 
      className="film-frame"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: `rgb(${bgR}, ${bgG}, ${bgB})`,
        borderColor: p > 0.8 ? 'var(--red-safelight)' : '#1f0808',
        boxShadow: p > 0.8 ? '0 0 15px var(--red-safelight-glow)' : 'none'
      }}
    >
      <div className="frame-number">
        <span>KODAK 5063 TX</span>
        <span>{frame.num}</span>
      </div>

      <div className="frame-content">
        {frame.isImage ? (
          <div style={{ transform: 'scale(0.95)', marginTop: '5px' }}>
            <DevelopingPrint
              src={frame.src}
              alt={frame.title}
              width={180}
              height={200}
              projectId="portrait-about"
              isDaylightMode={isDaylightMode}
            />
          </div>
        ) : (
          <>
            <h3 className="frame-title" style={{ ...textStyle, fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
              {frame.title}
            </h3>
            <p className="frame-text" style={{ 
              ...textStyle, 
              fontFamily: p > 0.6 ? 'var(--font-sans)' : 'var(--font-mono)',
              fontSize: p > 0.6 ? '0.85rem' : '0.7rem',
              letterSpacing: p > 0.6 ? 'normal' : '0.05em'
            }}>
              {frame.text}
            </p>
          </>
        )}
      </div>

      <div className="frame-number" style={{ justifyContent: 'center' }}>
        <span>▲ {frame.num.replace('A', '')}</span>
      </div>
    </div>
  );
}

export default function ContactSheet({ isDaylightMode }) {
  return (
    <section className="darkroom-section" id="about-section">
      <div className="section-label">Bio / Philosophy</div>
      <h2 className="section-title">The Contact Sheet</h2>
      
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1.2rem',
        maxWidth: '650px',
        color: 'var(--text-muted)',
        lineHeight: '1.6',
        marginBottom: '2.5rem'
      }}>
        A grid of film negative clips. Hovering and dwelling on any frame exposes it to the light, reversing the silver halides to reveal the underlying details in positive contrast.
      </p>

      <div className="contact-sheet">
        <div className="contact-sheet-header">
          <span>BATCH: #7709-B</span>
          <span>DATE: JULY 13, 2026</span>
          <span>ASA 400</span>
        </div>

        {/* Sprocket Holes (Top) */}
        <div className="sprockets">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`sprocket-top-${i}`} className="sprocket-hole" />
          ))}
        </div>

        {/* Frame Items */}
        {ABOUT_FRAGMENTS.map((frame) => (
          <FilmFrame 
            key={frame.id} 
            frame={frame} 
            isDaylightMode={isDaylightMode} 
          />
        ))}

        {/* Sprocket Holes (Bottom) */}
        <div className="sprockets" style={{ marginBottom: 0, marginTop: '1.5rem' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`sprocket-bot-${i}`} className="sprocket-hole" />
          ))}
        </div>
      </div>
    </section>
  );
}
