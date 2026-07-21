export class CustomCursor {
  constructor() {
    this.cursorEl = document.getElementById('custom-cursor');
    this.lastX = 0;
    this.lastY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.dwellTimeout = null;
    this.activeDwellElement = null;

    // Create dynamic pulsing ring for touch dwell
    this.dwellRingEl = document.createElement('div');
    this.dwellRingEl.id = 'dwell-ring';
    this.dwellRingEl.className = 'dwell-ring';
    document.body.appendChild(this.dwellRingEl);

    this.dwellHoldInterval = null;
    this.dwellStartX = 0;
    this.dwellStartY = 0;

    if (!this.cursorEl) return;
    this.init();
  }

  init() {
    // Smooth trailing follow
    const updatePosition = () => {
      this.lastX += (this.currentX - this.lastX) * 0.15;
      this.lastY += (this.currentY - this.lastY) * 0.15;
      this.cursorEl.style.transform = `translate3d(${this.lastX}px, ${this.lastY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(updatePosition);
    };
    requestAnimationFrame(updatePosition);

    const stopDwell = () => {
      if (this.dwellTimeout) {
        clearTimeout(this.dwellTimeout);
        this.dwellTimeout = null;
      }
      if (this.dwellHoldInterval) {
        clearInterval(this.dwellHoldInterval);
        this.dwellHoldInterval = null;
      }
      this.dwellRingEl.classList.remove('active');
      this.activeDwellElement = null;
    };

    document.addEventListener('pointermove', (e) => {
      this.currentX = e.clientX;
      this.currentY = e.clientY;
      
      // Dynamic lighting offset calculation
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dx = (e.clientX - width / 2) / (width / 2);
      const dy = (e.clientY - height / 2) / (height / 2);
      document.documentElement.style.setProperty('--shadow-offset-x', `${dx * 12}px`);
      document.documentElement.style.setProperty('--shadow-offset-y', `${dy * 12}px`);

      if (this.dwellTimeout || this.dwellHoldInterval) {
        // If they drag significantly (> 10px), stop the dwell timer
        const distance = Math.hypot(e.clientX - this.dwellStartX, e.clientY - this.dwellStartY);
        if (distance > 10) {
          stopDwell();
        }
      }
    });

    // Hover state controls for buttons/navigation
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('a, button, input, textarea, .tray-tag');
      const isDevelopable = e.target.closest('.developable-tile');

      if (target) {
        this.cursorEl.className = 'crop-cursor hover-mode';
      } else if (isDevelopable) {
        this.cursorEl.className = 'tongs-cursor tongs-mode';
      } else {
        this.cursorEl.className = 'crop-cursor';
      }
    });

    // Handle touch/pointer dwell (>400ms hold without movement)
    document.addEventListener('pointerdown', (e) => {
      const tile = e.target.closest('[data-id]');
      if (!tile) return;

      const isDevelopable = e.target.closest('.developable-tile') || e.target.classList.contains('developable-tile');
      if (!isDevelopable) return;

      this.activeDwellElement = tile;
      this.dwellStartX = e.clientX;
      this.dwellStartY = e.clientY;

      this.dwellTimeout = setTimeout(() => {
        if (this.activeDwellElement === tile) {
          // Show pulsing ring at pointer coordinates
          this.dwellRingEl.style.left = `${e.clientX}px`;
          this.dwellRingEl.style.top = `${e.clientY}px`;
          this.dwellRingEl.classList.add('active');

          // Trigger continuous dwell agitation (desktop: slower, mobile: faster)
          this.dwellHoldInterval = setInterval(() => {
            tile.dispatchEvent(new CustomEvent('dwell-hold', { detail: { x: e.clientX, y: e.clientY } }));
          }, 50);
        }
      }, 400);
    });

    document.addEventListener('pointerup', stopDwell);
    document.addEventListener('pointercancel', stopDwell);
  }
}
