(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const canvas = $('c');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

  const overlay = $('overlay');
  const titleEl = $('title');
  const msgEl = $('msg');
  const startBtn = $('start');

  const scoreEl = $('score');
  const bestEl = $('best');
  const sessionsEl = $('sessions');
  const timeEl = $('time');
  const muteBtn = $('mute');

  const crashOverlay = $('crash');
  const crashMsgEl = $('crashMsg');
  const reloadBtn = $('reload');

  if (!canvas || !ctx) {
    if (crashMsgEl) crashMsgEl.textContent = 'Canvas 2D context not available.';
    if (crashOverlay) crashOverlay.classList.remove('hidden');
    if (reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload());
    return;
  }

  const LS = 'mosaicledger.game15k.';
  const BUDGET = 60_000;

  const EMPTY = 254;
  const DEBT = 255;

  // Tiny palette: no images, procedural-only.
  const P = [
    '#22c55e',
    '#38bdf8',
    '#fb7185',
    '#f59e0b',
    '#a78bfa',
    '#2dd4bf',
    '#f472b6',
    '#e2e8f0',
  ];

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const readNum = (k, d) => {
    try {
      const raw = window.localStorage.getItem(LS + k);
      const n = raw == null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : d;
    } catch {
      return d;
    }
  };

  const writeNum = (k, v) => {
    try {
      window.localStorage.setItem(LS + k, String(v));
    } catch {
      // ignore
    }
  };

  const readBool = (k, d) => {
    try {
      const raw = window.localStorage.getItem(LS + k);
      if (raw === '1') return true;
      if (raw === '0') return false;
      return d;
    } catch {
      return d;
    }
  };

  const writeBool = (k, v) => {
    try {
      window.localStorage.setItem(LS + k, v ? '1' : '0');
    } catch {
      // ignore
    }
  };

  let best = readNum('best', 0);
  let sessions = readNum('sessions', 0);
  let muted = readBool('mute', false);

  bestEl.textContent = String(best);
  sessionsEl.textContent = String(sessions);

  function renderMute() {
    muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  }

  renderMute();

  // Deterministic RNG (Mulberry32).
  let seed = 0x1a2b3c4d;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const irnd = (n) => (rnd() * n) | 0;

  let ac = null;
  const tone = (freq, seconds, vol) => {
    if (muted) return;
    try {
      // WebAudio only; no audio files.
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!ac) ac = new Ctx();
      if (ac.state === 'suspended') ac.resume();

      const t0 = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t0);
      o.stop(t0 + seconds + 0.02);
    } catch {
      // ignore audio failures
    }
  };

  const GW = 10;
  const GH = 14;
  let grid = new Uint8Array(GW * GH);

  let running = false;
  let crashed = false;
  let raf = 0;

  let startAt = 0;
  let score = 0;
  let nextTile = 0;
  let cursor = 0;

  let ox = 0;
  let oy = 0;
  let s = 10;

  function reset() {
    grid.fill(EMPTY);
    score = 0;
    cursor = 0;
    seed = 0x1a2b3c4d; // deterministic sessions for tests.
    nextTile = rnd() < 0.18 ? DEBT : irnd(P.length);
    scoreEl.textContent = '0';
    timeEl.textContent = '60';
  }

  function computeLayout() {
    const hudH = $('hud').getBoundingClientRect().height;
    const pad = 14;
    const top = hudH + pad;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const availW = w - pad * 2;
    const availH = h - top - pad;

    s = Math.max(12, Math.floor(Math.min(availW / GW, availH / GH)));
    ox = Math.floor((w - s * GW) / 2);
    oy = Math.floor(top + (availH - s * GH) / 2);
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeLayout();
  }

  function drawDebt(x, y, w, h) {
    ctx.fillStyle = 'rgba(2,6,23,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    for (let i = -h; i < w; i += 7) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
  }

  function drawTile(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 1, y + 1, w - 2, 3);
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070c1b');
    bg.addColorStop(1, '#050913');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Soft glow behind grid.
    const glow = ctx.createRadialGradient(
      w / 2,
      oy + (s * GH) / 2,
      40,
      w / 2,
      oy + (s * GH) / 2,
      s * GH,
    );
    glow.addColorStop(0, 'rgba(56,189,248,0.13)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Grid background.
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(ox - 10, oy - 10, s * GW + 20, s * GH + 20);

    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const idx = j * GW + i;
        const x = ox + i * s;
        const y = oy + j * s;

        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, s - 1, s - 1);

        const v = grid[idx];
        if (v === EMPTY) continue;
        if (v === DEBT) {
          drawDebt(x + 2, y + 2, s - 4, s - 4);
        } else {
          drawTile(x + 2, y + 2, s - 4, s - 4, P[v] || '#94a3b8');
        }
      }
    }

    // Cursor highlight (last placed).
    const cx = cursor % GW;
    const cy = (cursor / GW) | 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + cx * s + 1, oy + cy * s + 1, s - 3, s - 3);

    // Next tile preview (bottom right).
    const px = ox + s * GW - 62;
    const py = oy + s * GH + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px, py, 52, 52);
    if (nextTile === DEBT) drawDebt(px + 8, py + 8, 36, 36);
    else drawTile(px + 8, py + 8, 36, 36, P[nextTile] || '#94a3b8');

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText('Next', px + 8, py - 6);
  }

  function findEmpty(startIdx) {
    for (let k = 0; k < grid.length; k++) {
      const t = (startIdx + k) % grid.length;
      if (grid[t] === EMPTY) return t;
    }
    return -1;
  }

  function place(cellIdx) {
    if (!running) return;
    const idx = grid[cellIdx] === EMPTY ? cellIdx : findEmpty(cellIdx + 1);
    if (idx < 0) return end('Grid full.');

    grid[idx] = nextTile;
    cursor = idx;

    let delta = 0;
    if (nextTile === DEBT) {
      delta = -3;
      tone(140, 0.09, 0.06);
    } else {
      delta = 1;
      const c = nextTile;
      const x = idx % GW;
      const y = (idx / GW) | 0;
      if (x > 0 && grid[idx - 1] === c) delta += 2;
      if (x < GW - 1 && grid[idx + 1] === c) delta += 2;
      if (y > 0 && grid[idx - GW] === c) delta += 2;
      if (y < GH - 1 && grid[idx + GW] === c) delta += 2;
      tone(640 + c * 28, 0.05, 0.05);
    }

    score = Math.max(0, score + delta);
    scoreEl.textContent = String(score);
    nextTile = rnd() < 0.18 ? DEBT : irnd(P.length);
  }

  function cellFromPoint(px, py) {
    const i = Math.floor((px - ox) / s);
    const j = Math.floor((py - oy) / s);
    if (i < 0 || i >= GW || j < 0 || j >= GH) return -1;
    return j * GW + i;
  }

  function tick(now) {
    const t = clamp(1 - (now - startAt) / BUDGET, 0, 1);
    const sec = Math.ceil(t * 60);
    timeEl.textContent = String(sec);
    if (t <= 0) return end('Time.');
    draw();
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    if (crashed) return;
    try {
      tick(now);
    } catch (e) {
      crash(e);
    }
  }

  function start() {
    if (crashed) return;

    sessions += 1;
    writeNum('sessions', sessions);
    sessionsEl.textContent = String(sessions);

    // Unlock audio on user gesture (iOS/Safari requirement).
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !ac) ac = new Ctx();
      if (ac && ac.state === 'suspended') ac.resume();
    } catch {
      // ignore
    }

    overlay.classList.add('hidden');
    running = true;
    startAt = performance.now();
    reset();
    resize();
    tone(880, 0.05, 0.05);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function end(reason) {
    running = false;
    cancelAnimationFrame(raf);

    if (score > best) {
      best = score;
      writeNum('best', best);
      bestEl.textContent = String(best);
    }

    titleEl.textContent = 'Game Over';
    msgEl.textContent = `Score: ${score}. ${reason || ''} Tap Start to play again.`;
    startBtn.textContent = 'Play again';
    overlay.classList.remove('hidden');
  }

  function crash(err) {
    crashed = true;
    running = false;
    cancelAnimationFrame(raf);

    crashMsgEl.textContent = String(err && err.stack ? err.stack : err);
    crashOverlay.classList.remove('hidden');
  }

  // Controls
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (!running) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const idx = cellFromPoint(e.clientX, e.clientY);
      if (idx >= 0) place(idx);
      e.preventDefault();
    },
    { passive: false },
  );

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'm' || e.key === 'M') {
        muted = !muted;
        writeBool('mute', muted);
        renderMute();
        return;
      }
      if (!running) return;
      const x = cursor % GW;
      const y = (cursor / GW) | 0;
      let nx = x;
      let ny = y;
      if (e.key === 'ArrowLeft') nx = x - 1;
      else if (e.key === 'ArrowRight') nx = x + 1;
      else if (e.key === 'ArrowUp') ny = y - 1;
      else if (e.key === 'ArrowDown') ny = y + 1;
      else if (e.key === 'Enter' || e.key === ' ') {
        place(cursor);
        e.preventDefault();
        return;
      } else {
        return;
      }
      cursor = clamp(ny, 0, GH - 1) * GW + clamp(nx, 0, GW - 1);
      tone(440, 0.02, 0.02);
      e.preventDefault();
    },
    { passive: false },
  );

  // UI wiring
  muteBtn.addEventListener('click', (e) => {
    muted = !muted;
    writeBool('mute', muted);
    renderMute();
    tone(520, 0.02, 0.02);
    e.preventDefault();
  });

  startBtn.addEventListener('click', () => start());
  reloadBtn.addEventListener('click', () => window.location.reload());

  window.addEventListener(
    'resize',
    () => {
      if (!running) return;
      resize();
    },
    { passive: true },
  );

  // Initial paint
  reset();
  resize();
  draw();
})();
