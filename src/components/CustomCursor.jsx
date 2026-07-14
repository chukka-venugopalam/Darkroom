import React, { useEffect, useState, useRef } from 'react';
import audioEngine from '../utils/AudioEngine';

export default function CustomCursor({ isMuted }) {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [cursorType, setCursorType] = useState('easel'); // 'easel' | 'tongs' | 'tongs-grip'
  const [ripples, setRipples] = useState([]);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const cursorRef = useRef(null);
  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const velocity = useRef(0);
  const lastTime = useRef(Date.now());

  useEffect(() => {
    // Add custom cursor class to body to hide default pointer on desktop
    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e) => {
      targetPos.current = { x: e.clientX, y: e.clientY };

      // Update CSS variables for safelight illumination source
      document.documentElement.style.setProperty('--light-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--light-y', `${e.clientY}px`);

      // Detect cursor type based on hovered element
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element) {
        const checkCursor = (el) => {
          if (!el) return 'easel';
          if (el.getAttribute('data-cursor')) {
            return el.getAttribute('data-cursor');
          }
          if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.classList.contains('control-btn') || el.classList.contains('audio-toggle-switch')) {
            return 'easel';
          }
          if (el.classList.contains('developing-canvas') || el.classList.contains('hanging-paper') || el.classList.contains('tray') || el.classList.contains('film-frame')) {
            return 'tongs';
          }
          return checkCursor(el.parentElement);
        };
        
        const type = checkCursor(element);
        setCursorType(type);
      }

      // Calculate speed for ripple agitation intensity
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        velocity.current = dist / dt;

        // Emit ripples if moving fast over developable content
        if (velocity.current > 0.4 && cursorType === 'tongs') {
          const isOverWetArea = element && (
            element.classList.contains('developing-canvas') || 
            element.classList.contains('tray-fluid') ||
            element.closest('.tray') ||
            element.closest('.hanging-print')
          );

          if (isOverWetArea) {
            setRipples((prev) => [
              ...prev.slice(-10), // Limit total ripples in state
              { id: Math.random(), x: e.clientX, y: e.clientY }
            ]);
            // Play subtle wet agitation audio occasionally
            if (Math.random() < 0.1) {
              audioEngine.triggerDrip();
            }
          }
        }
      }

      lastMousePos.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;
    };

    const handleMouseDown = () => {
      if (cursorType === 'tongs') {
        setCursorType('tongs-grip');
        audioEngine.triggerClick();
      }
    };

    const handleMouseUp = () => {
      if (cursorType === 'tongs-grip') {
        setCursorType('tongs');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Smooth cursor interpolation loop
    let animId;
    const updateCursor = () => {
      // Linear interpolation (lerp)
      const ease = 0.16; // Lerp factor
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * ease;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0)`;
      }

      animId = requestAnimationFrame(updateCursor);
    };

    animId = requestAnimationFrame(updateCursor);

    // Ripple cleanup
    const rippleCleanup = setInterval(() => {
      setRipples((prev) => prev.slice(1));
    }, 800);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animId);
      clearInterval(rippleCleanup);
    };
  }, [cursorType]);

  return (
    <>
      <div ref={cursorRef} className="custom-cursor-container" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10000,
        willChange: 'transform'
      }}>
        {cursorType === 'easel' ? (
          <div className="custom-cursor-easel">
            <div className="easel-bracket bracket-tl" />
            <div className="easel-bracket bracket-tr" />
            <div className="easel-bracket bracket-bl" />
            <div className="easel-bracket bracket-br" />
          </div>
        ) : (
          <div className="custom-cursor-tongs">
            <svg 
              className="tongs-icon" 
              viewBox="0 0 24 24" 
              style={{
                transform: cursorType === 'tongs-grip' ? 'scale(0.85) rotate(-5deg)' : 'scale(1)'
              }}
            >
              {/* Tongs design: scissor-like tweezers used to pull prints from tray */}
              <path d="M5 21 C 5 21, 6 12, 10 10 M19 21 C 19 21, 18 12, 14 10" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="14" cy="10" r="1.5" />
              <path d="M10 10 L12 7 L14 10" />
              <path d="M12 7 L12 2" strokeWidth="2" />
            </svg>
          </div>
        )}
      </div>

      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="cursor-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </>
  );
}
