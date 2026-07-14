export function initTrays() {
  const tags = document.querySelectorAll('.tray-tag');
  const trays = document.querySelectorAll('.tray');
  const resultText = document.getElementById('tray-result-text');

  let activeTag = null;

  // 1. Mouse Drag & Drop
  tags.forEach(tag => {
    tag.addEventListener('dragstart', (e) => {
      tag.classList.add('dragging');
      e.dataTransfer.setData('text/plain', tag.id);
      activeTag = tag;
    });

    tag.addEventListener('dragend', () => {
      tag.classList.remove('dragging');
      activeTag = null;
    });

    // Tap/Click interaction for unified touch support
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      tags.forEach(t => t.classList.remove('selected'));
      tag.classList.add('selected');
      activeTag = tag;
      
      resultText.textContent = `"${tag.textContent}" selected. Now click/tap one of the chemistry trays above to dip it.`;
      resultText.style.color = 'var(--accent-red)';
    });
  });

  trays.forEach(tray => {
    tray.addEventListener('dragover', (e) => {
      e.preventDefault();
      tray.classList.add('drag-over');
    });

    tray.addEventListener('dragleave', () => {
      tray.classList.remove('drag-over');
    });

    tray.addEventListener('drop', (e) => {
      e.preventDefault();
      tray.classList.remove('drag-over');
      
      const tagId = e.dataTransfer.getData('text/plain');
      const tag = document.getElementById(tagId);
      if (tag) {
        dipTag(tag, tray);
      }
    });

    // Click/Tap tray for mobile dipping path
    tray.addEventListener('click', () => {
      if (activeTag) {
        dipTag(activeTag, tray);
      } else {
        resultText.textContent = "Select a methodology card below first, then tap this tray to dip it.";
        resultText.style.color = 'var(--text-color)';
      }
    });
  });

  // Global click clears selected tag
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tray-tag') && !e.target.closest('.tray')) {
      tags.forEach(t => t.classList.remove('selected'));
      activeTag = null;
    }
  });

  function dipTag(tag, tray) {
    const stage = tray.getAttribute('data-tray'); // 'developer', 'stop', or 'fix'
    const descAttr = `data-description-${stage}`;
    const description = tag.getAttribute(descAttr);

    // Apply chemical splash effect in CSS
    const slot = tray.querySelector('.tray-content-slot');
    slot.textContent = tag.textContent;
    slot.style.color = 'var(--text-bright)';

    // Play liquid ripple pulse
    const liquid = tray.querySelector('.tray-liquid');
    liquid.style.animation = 'none';
    void liquid.offsetWidth; // trigger reflow
    liquid.style.animation = 'wave 3s infinite linear';
    liquid.style.opacity = '0.9';
    setTimeout(() => {
      liquid.style.opacity = '0.5';
    }, 2000);

    // Display result with typewriter feel
    resultText.style.opacity = '0';
    setTimeout(() => {
      resultText.textContent = description;
      resultText.style.color = 'var(--text-bright)';
      resultText.style.opacity = '1';
    }, 200);

    // Deselect tag after dipping
    tag.classList.remove('selected');
    activeTag = null;
  }
}
