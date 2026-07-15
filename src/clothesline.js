import { registerTile } from './develop.js';

export function initClothesline(items) {
  const container = document.getElementById('clothesline-items');
  if (!container) return;

  // Filter Tier 1 & Tier 2 items for the clothesline
  const lineItems = items.filter(item => item.tier === 1 || item.tier === 2).slice(0, 4);

  // Horizontal spacing
  const pointsX = [220, 520, 820, 1120];

  container.innerHTML = '';

  const cardsData = [];

  lineItems.forEach((item, idx) => {
    const x = pointsX[idx];
    
    // Parabolic sag calculation: y = 50 + 260 * t * (1 - t) where t = x / 1400
    const t = x / 1400;
    const y = 50 + 260 * t * (1 - t);

    // Create hanging card frame
    const element = document.createElement('div');
    element.className = 'hanging-item';
    element.style.left = `${(x / 1400) * 100}%`;
    element.style.top = `${y}px`;
    element.setAttribute('data-id', item.id);

    // Dynamic sizing based on tier
    const cardWidth = item.tier === 1 ? '190px' : '150px';

    element.innerHTML = `
      <div class="hanging-card" style="width: ${cardWidth};">
        <div class="canvas-container">
          <canvas width="300" height="225"></canvas>
        </div>
        <div class="hanging-card-title">${item.title}</div>
      </div>
    `;

    container.appendChild(element);

    // Register with Progressive Development Engine
    registerTile('line-' + item.id, element, item.image, item.tier);

    // Click to scroll to the gallery card showcase
    element.addEventListener('click', () => {
      const galleryItem = document.querySelector(`#gallery-section [data-id="${item.id}"]`);
      if (galleryItem) {
        galleryItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Sway parameters
    cardsData.push({
      element,
      centerX: x,
      sway: 0,
      velocity: 0,
      basePhase: Math.random() * 10
    });
  });

  // Track mouse coordinates for sway physics
  let mouseX = 0;
  let lastMouseX = 0;
  let mouseVelX = 0;

  document.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;
    
    // Normalize mouse X relative to clothesline coordinates (0 to 1400)
    mouseX = (e.clientX - rect.left) / rect.width * 1400;
    mouseVelX = mouseX - lastMouseX;
    lastMouseX = mouseX;

    // Disturbed air check: if mouse moves past a card, apply momentum sway
    cardsData.forEach(card => {
      const dist = Math.abs(mouseX - card.centerX);
      if (dist < 100 && Math.abs(mouseVelX) > 2) {
        // Transfer velocity to card sway (limited push)
        const force = Math.max(-15, Math.min(15, mouseVelX * 0.4));
        card.velocity += force;
      }
    });
  });

  // Clothesline animation loop (mass-spring-damper sway)
  const loop = () => {
    const time = Date.now() / 1000;
    
    // Ignore physics on mobile where items are stacked horizontally via flex row
    const isMobile = window.innerWidth <= 768;

    cardsData.forEach(card => {
      if (isMobile) {
        card.element.style.transform = 'none';
        return;
      }

      // Spring formula: Accel = -k * Position - c * Velocity
      const k = 0.08;  // spring stiffness
      const c = 0.04;  // damping coefficient
      
      const accel = -k * card.sway - c * card.velocity;
      card.velocity += accel;
      card.sway += card.velocity;

      // Gentle ambient breeze rotation
      const ambient = Math.sin(time * 2.0 + card.basePhase) * 1.5;

      const totalAngle = card.sway + ambient;
      card.element.style.transform = `rotate(${totalAngle}deg)`;
    });

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
