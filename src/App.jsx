import React, { useState, useEffect } from 'react';
import CustomCursor from './components/CustomCursor';
import TheLine, { PROJECTS_DATA } from './components/TheLine';
import ProjectPrint from './components/ProjectPrint';
import TheTrays from './components/TheTrays';
import ContactSheet from './components/ContactSheet';
import IntoTheLight from './components/IntoTheLight';
import audioEngine from './utils/AudioEngine';

function App() {
  const [isDaylightMode, setIsDaylightMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isContactActive, setIsContactActive] = useState(false);

  // Sync daylight-mode class on body
  useEffect(() => {
    document.body.classList.toggle('daylight-mode', isDaylightMode);
  }, [isDaylightMode]);

  // Handle prefers-reduced-motion to auto-switch daylight mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsDaylightMode(true);
    }
  }, []);

  // Sync mute state with AudioEngine
  useEffect(() => {
    audioEngine.setMute(isMuted);
  }, [isMuted]);

  // Wake up AudioEngine on first click or key down (safeguards browser autoplay policy)
  useEffect(() => {
    const handleFirstInteraction = () => {
      audioEngine.init();
      // Ensure mute state matches user choice
      audioEngine.setMute(isMuted);
      
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isMuted]);

  // Update dynamic light intensity based on active section
  useEffect(() => {
    // When in contact section (Into the Light), safelight bulb dims and white/warm daylight fades in
    const intensity = isContactActive ? 0.08 : 1.0;
    document.documentElement.style.setProperty('--light-intensity', intensity);
  }, [isContactActive]);

  const handleLightSwitch = () => {
    audioEngine.triggerClick();
    setIsDaylightMode(!isDaylightMode);
  };

  const handleAudioToggle = () => {
    audioEngine.triggerClick();
    setIsMuted(!isMuted);
  };

  const handleResetAll = () => {
    audioEngine.triggerSplash();
    // Clear localStorage values
    localStorage.removeItem('darkroom-project-portrait-about');
    PROJECTS_DATA.forEach(p => {
      localStorage.removeItem(`darkroom-project-line-thumb-${p.id}`);
      localStorage.removeItem(`darkroom-project-hero-${p.id}`);
    });
    // Force reload
    window.location.reload();
  };

  return (
    <div className={`darkroom-wrapper ${isDaylightMode ? 'daylight-mode' : ''}`}>
      {/* Safelight Lamp Bulb */}
      <div className="safelight-lamp">
        <div className="safelight-bulb" />
      </div>

      {/* Dynamic Red-Lit Ambient Overlay */}
      <div className="safelight-overlay" />

      {/* Custom Cursor System */}
      <CustomCursor isMuted={isMuted} />

      {/* Global Header */}
      <header className="darkroom-header">
        <a href="#" className="darkroom-logo" data-cursor="easel">
          Darkroom
          <span>Digital Print Studio</span>
        </a>

        <div className="darkroom-controls">
          <button 
            onClick={handleLightSwitch}
            className="control-btn"
            title={isDaylightMode ? "Activate Safelight (Develop Mode)" : "Turn on Room Light (Skip Reveals)"}
            data-cursor="easel"
          >
            {isDaylightMode ? (
              <>
                <span style={{ color: 'var(--red-safelight)' }}>●</span> Safelight Mode
              </>
            ) : (
              <>
                <span>☀</span> Daylight Mode
              </>
            )}
          </button>

          <button
            onClick={handleResetAll}
            className="control-btn"
            title="Clear fixed progress state"
            data-cursor="easel"
            style={{ fontSize: '0.75rem', opacity: 0.8 }}
          >
            ↺ Reset Studio
          </button>
        </div>
      </header>

      {/* Layout Content */}
      <main className="darkroom-layout">
        {/* Gallery Clothesline */}
        <TheLine isDaylightMode={isDaylightMode} />

        {/* Project Print Showcases */}
        {PROJECTS_DATA.map((project) => (
          <ProjectPrint 
            key={project.id} 
            project={project} 
            isDaylightMode={isDaylightMode} 
          />
        ))}

        {/* Skills Chemistry Trays */}
        <TheTrays isDaylightMode={isDaylightMode} />

        {/* About Contact Sheet */}
        <ContactSheet isDaylightMode={isDaylightMode} />

        {/* Contact form (Into the Light) */}
        <IntoTheLight 
          isDaylightMode={isDaylightMode} 
          onScrollIntersection={setIsContactActive} 
        />
      </main>

      {/* Bottom Floating Audio Bar */}
      <div 
        className={`darkroom-audio-bar ${!isMuted ? 'audio-active' : ''}`}
        onClick={handleAudioToggle}
        title="Toggle Ambient Safelight Ballast Hum & Chemistry Drips"
        data-cursor="easel"
      >
        <span className="audio-label">SOUND: {isMuted ? 'OFF' : 'ON'}</span>
        
        <div className="audio-toggle-switch">
          <div className="audio-toggle-knob" />
        </div>

        <div className="audio-active-waves">
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
        </div>
      </div>
    </div>
  );
}

export default App;
