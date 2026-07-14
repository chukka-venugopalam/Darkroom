export class CustomCursor {
  constructor() {
    this.cursorEl = document.getElementById('custom-cursor');
    this.lastX = 0;
    this.lastY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.dwellTimeout = null;
    this.activeDwellElement = null;

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

      // If dragging/moving on touch, clear dwell timer
      if (this.dwellTimeout) {
        clearTimeout(this.dwellTimeout);
        this.dwellTimeout = null;
      }
    });

    // Hover state controls for buttons/navigation
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('a, button, input, textarea, .tray-tag');
      const isDevelopable = e.target.closest('.canvas-container, .negative-canvas-wrapper, .hanging-card canvas');

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

      this.activeDwellElement = tile;
      this.dwellTimeout = setTimeout(() => {
        if (this.activeDwellElement === tile) {
          tile.dispatchEvent(new CustomEvent('dwell-trigger', { detail: { x: e.clientX, y: e.clientY } }));
        }
      }, 400);
    });

    document.addEventListener('pointerup', () => {
      clearTimeout(this.dwellTimeout);
      this.dwellTimeout = null;
      this.activeDwellElement = null;
    });
  }
}
