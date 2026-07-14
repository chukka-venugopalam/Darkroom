import React, { useEffect, useRef, useState } from 'react';
import audioEngine from '../utils/AudioEngine';

export default function IntoTheLight({ isDaylightMode, onScrollIntersection }) {
  const sectionRef = useRef(null);
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formProgress, setFormProgress] = useState(isDaylightMode ? 1 : 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Signal that contact section is visible (changes dynamic light model to daylight warm)
            onScrollIntersection(true);
            
            // Slow reveal of the form details
            if (!isDaylightMode) {
              let p = 0;
              const interval = setInterval(() => {
                p += 0.05;
                if (p >= 1) {
                  setFormProgress(1);
                  clearInterval(interval);
                } else {
                  setFormProgress(p);
                }
              }, 40);
              return () => clearInterval(interval);
            }
          } else {
            onScrollIntersection(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [onScrollIntersection, isDaylightMode]);

  useEffect(() => {
    if (isDaylightMode) {
      setFormProgress(1);
    }
  }, [isDaylightMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleInputFocus = () => {
    audioEngine.triggerClick();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    audioEngine.triggerSplash();
    setIsSubmitted(true);
  };

  return (
    <section 
      ref={sectionRef} 
      className="darkroom-section contact-section" 
      id="contact-section"
    >
      <div className="daylight-warm-lamp" />
      
      <div className="section-label" style={{ zIndex: 2 }}>Contact / Connect</div>
      <h2 className="section-title" style={{ zIndex: 2 }}>Into the Light</h2>

      <div 
        className="contact-layout"
        style={{
          opacity: formProgress,
          transform: `translateY(${(1 - formProgress) * 20}px)`,
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Left Side: Dry Print Clip & Links */}
        <div className="contact-info">
          <div className="contact-quote">
            "Everything is developed. Everything is fixed. It is safe to bring it into the light."
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: '1.8',
            marginBottom: '2rem'
          }}>
            The red safelight recedes here, replaced by a warm white exposure light. Contact details are stable and fixed.
          </p>

          <ul className="contact-details-list">
            <li>
              <span>EMAIL: </span>
              <a href="mailto:artisan@darkroom.net" onFocus={handleInputFocus}>artisan@darkroom.net</a>
            </li>
            <li>
              <span>GITHUB: </span>
              <a href="https://github.com" target="_blank" rel="noreferrer" onFocus={handleInputFocus}>github.com/darkroom-artisan</a>
            </li>
            <li>
              <span>TWITTER: </span>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" onFocus={handleInputFocus}>@darkroom_artisan</a>
            </li>
            <li>
              <span>LOCATION: </span>
              <span style={{ color: 'var(--text-primary)' }}>PORTLAND, OR — 45.5152° N, 122.6784° W</span>
            </li>
          </ul>
        </div>

        {/* Right Side: Tactile Form */}
        <div>
          {isSubmitted ? (
            <div 
              className="contact-form" 
              style={{ 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '380px',
                textAlign: 'center'
              }}
            >
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                color: 'var(--red-safelight)',
                marginBottom: '1rem'
              }}>
                FIXED SUCCESSFULLY
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your message has been printed and hung to dry. We will read it under daylight soon.
              </p>
              <button 
                className="control-btn" 
                style={{ marginTop: '2rem' }}
                onClick={() => setIsSubmitted(false)}
              >
                Send Another Exposure
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="contact-name">Name</label>
                <input 
                  type="text" 
                  id="contact-name" 
                  name="name" 
                  required
                  value={formState.name}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  className="form-input"
                  placeholder="e.g. Silver Halide"
                  data-cursor="easel"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input 
                  type="email" 
                  id="contact-email" 
                  name="email" 
                  required
                  value={formState.email}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  className="form-input"
                  placeholder="e.g. halide@emulsion.com"
                  data-cursor="easel"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea 
                  id="contact-message" 
                  name="message" 
                  rows="4"
                  required
                  value={formState.message}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  className="form-input"
                  style={{ resize: 'none' }}
                  placeholder="Write details of the exposure..."
                  data-cursor="easel"
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                data-cursor="easel"
              >
                Expose Message
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
