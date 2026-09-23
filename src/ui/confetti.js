/**
 * Full-page confetti burst + short fanfare for level celebrations.
 */

/**
 * Launch a confetti animation.
 *
 * Args:
 *     durationMs: how long to run (default 4000)
 * Returns:
 *     { stop: () => void }
 */
export function launchConfetti(durationMs = 4000) {
  if (typeof document === 'undefined') return { stop() {} };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { stop() {} };
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return { stop() {} };
  }

  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#5ee0a0', '#7aa2ff', '#ff8c1a', '#f0b429', '#f07178', '#e8eef2'];
  const pieces = Array.from({ length: 90 }, () => spawn());

  function spawn(fromTop = true) {
    return {
      x: Math.random() * window.innerWidth,
      y: fromTop ? -12 - Math.random() * 80 : Math.random() * window.innerHeight,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 1.6 + Math.random() * 2.8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[(Math.random() * colors.length) | 0],
    };
  }

  const start = performance.now();
  let raf = 0;
  let stopped = false;

  const tick = (now) => {
    if (stopped) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > window.innerHeight + 20) {
        Object.assign(p, spawn(true));
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (now - start < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      stop();
    }
  };

  function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    canvas.remove();
  }

  raf = requestAnimationFrame(tick);
  return { stop };
}

/**
 * Play a short synthetic fanfare (Web Audio), silent on failure.
 */
export function playFanfare() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      const t0 = ac.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.04, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
    setTimeout(() => ac.close(), 800);
  } catch {
    // audio blocked — fine
  }
}
