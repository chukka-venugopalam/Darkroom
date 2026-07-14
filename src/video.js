export function initVideoHandlers(tile, videoSrc) {
  // If not Tier 1, video playback is disabled (poster frame only)
  if (tile.tier !== 1) return;

  const canvas = tile.canvas;
  
  const handleFixed = () => {
    canvas.removeEventListener('fixed', handleFixed);
    mountVideoPlayer(canvas.parentElement, videoSrc);
  };

  if (tile.isFixed) {
    mountVideoPlayer(canvas.parentElement, videoSrc);
  } else {
    canvas.addEventListener('fixed', handleFixed);
  }
}

function mountVideoPlayer(container, videoSrc) {
  // Avoid duplicate mounts
  if (container.querySelector('.video-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'video-wrapper';

  const video = document.createElement('video');
  video.src = videoSrc;
  video.loop = true;
  video.playsInline = true;
  video.muted = true; // Safe autoplay bypass if needed, user unmutes manually

  const playOverlay = document.createElement('div');
  playOverlay.className = 'video-play-overlay';
  playOverlay.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;

  const scrubBar = document.createElement('div');
  scrubBar.className = 'video-scrub-bar';
  
  const progress = document.createElement('div');
  progress.className = 'video-scrub-progress';
  scrubBar.appendChild(progress);

  wrapper.appendChild(video);
  wrapper.appendChild(playOverlay);
  wrapper.appendChild(scrubBar);
  container.appendChild(wrapper);

  // Video interaction events
  playOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) {
      video.play();
      playOverlay.classList.add('playing');
    } else {
      video.pause();
      playOverlay.classList.remove('playing');
    }
  });

  // Pause on clicking video area itself
  video.addEventListener('click', (e) => {
    e.stopPropagation();
    video.pause();
    playOverlay.classList.remove('playing');
  });

  // Track progress
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progress.style.width = `${pct}%`;
    }
  });

  // Scrub bar jumping
  scrubBar.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = scrubBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (video.duration && width > 0) {
      const fraction = clickX / width;
      video.currentTime = fraction * video.duration;
    }
  });
}
