// Visual feedback: particles, damage numbers, shock rings, screen shake and full-screen flashes.
window.FX = (function () {
  const MAX_PARTICLES = 900;
  let particles = [], floats = [], rings = [];
  let shake = 0, flash = 0, flashColor = '#fff', slow = 0;

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, max: 0.7,
        size: Math.random() < 0.3 ? 2 : 1, color });
    }
  }

  function trail(x, y, color) {
    if (particles.length < MAX_PARTICLES) particles.push({ x, y, vx: 0, vy: 0, life: 0.18, max: 0.18, size: 1, color });
  }

  function number(x, y, value, crit) {
    if (floats.length > 140) floats.shift();
    floats.push({ x: x + (Math.random() - 0.5) * 4, y, text: String(value), life: 0.55, max: 0.55, crit, vy: crit ? -34 : -22 });
  }

  function text(x, y, value, color) {
    floats.push({ x, y, text: value, life: 1.1, max: 1.1, color, vy: -16, big: true });
  }

  function ring(x, y, radius, color, life) {
    rings.push({ x, y, r: radius, life: life || 0.35, max: life || 0.35, color });
  }

  function update(dt) {
    shake = Math.max(0, shake - dt * 18);
    flash = Math.max(0, flash - dt * 3);
    slow = Math.max(0, slow - dt);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
    particles = particles.filter((p) => p.life > 0);
    for (const f of floats) { f.y += f.vy * dt; f.vy *= 0.92; f.life -= dt; }
    floats = floats.filter((f) => f.life > 0);
    for (const r of rings) r.life -= dt;
    rings = rings.filter((r) => r.life > 0);
  }

  function renderWorld(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    for (const r of rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color; ctx.lineWidth = 2 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.textAlign = 'center';
    for (const f of floats) {
      const k = f.life / f.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      if (f.big) {
        ctx.font = '800 8px -apple-system, "Apple SD Gothic Neo", sans-serif';
        ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 0.6, f.y + 0.6);
        ctx.fillStyle = f.color || '#fff'; ctx.fillText(f.text, f.x, f.y);
      } else {
        const pop = k > 0.8 ? 1 + (k - 0.8) * 2 : 1;
        ctx.font = `900 ${Math.round((f.crit ? 8 : 6) * pop)}px ui-monospace, Menlo, monospace`;
        ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 0.6, f.y + 0.6);
        ctx.fillStyle = f.crit ? '#ffd23f' : '#ffffff'; ctx.fillText(f.text, f.x, f.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function renderScreen(ctx, w, h) {
    if (flash > 0) {
      ctx.globalAlpha = Math.min(0.55, flash);
      ctx.fillStyle = flashColor; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  return {
    burst, trail, number, text, ring, update, renderWorld, renderScreen,
    reset() { particles = []; floats = []; rings = []; shake = 0; flash = 0; slow = 0; },
    addShake(v) { shake = Math.min(8, shake + v); },
    shakeOffset() { return shake > 0 ? { x: (Math.random() - 0.5) * shake, y: (Math.random() - 0.5) * shake } : { x: 0, y: 0 }; },
    flash(color, amount) { flashColor = color; flash = Math.max(flash, amount); },
    slowMo(sec) { slow = Math.max(slow, sec); },
    timeScale() { return slow > 0 ? 0.3 : 1; },
    get counts() { return { particles: particles.length, floats: floats.length }; },
  };
})();
