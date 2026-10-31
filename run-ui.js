// Career Run screens that are not the course itself: progress save, world map, credits and touch buttons.
window.RUN_UI = (function () {
  const KEY = 'career-run-v1';

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && Array.isArray(s.cleared)) return s;
    } catch (e) { /* storage unavailable or corrupt; start fresh */ }
    return { cleared: [], icons: {}, weapons: [], best: {} };
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
  }

  // ---------- world map ----------
  // Nodes sit on a winding path; positions are fractions of the map area so it scales to any screen.
  function nodePositions(n, w, h) {
    const cols = 3, rowsN = Math.ceil(n / cols);
    const spanW = Math.min(w - 140, 760), spanH = Math.min(h - 230, rowsN * 170);
    const left = (w - spanW) / 2, right = left + spanW, top = 120 + Math.max(0, (h - 230 - spanH) / 2), bottom = top + spanH;
    const out = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols), col = i % cols, rows = Math.ceil(n / cols);
      const c = row % 2 ? cols - 1 - col : col;
      const x = left + (cols === 1 ? 0.5 : c / (cols - 1)) * (right - left);
      const y = top + (rows === 1 ? 0.5 : row / (rows - 1)) * (bottom - top);
      out.push({ x, y });
    }
    return out;
  }

  function drawMap(ctx, w, h, stages, save, sel, t) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#16213e'); g.addColorStop(1, '#0f3443');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // ocean sparkle
    ctx.fillStyle = '#ffffff10';
    for (let i = 0; i < 80; i++) {
      const x = (i * 97 + t * 8) % w, y = (i * 53) % h;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
    const pos = nodePositions(stages.length, w, h);
    ctx.strokeStyle = '#e8d8a8'; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
    ctx.beginPath(); pos.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    pos.forEach((p, i) => {
      const st = stages[i], cleared = save.cleared.includes(st.id), open = i === 0 || save.cleared.includes(stages[i - 1].id);
      const theme = window.RUN_LEVELS.THEMES[st.id];
      ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 18, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = open ? theme.top : '#444a5c';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = open ? theme.ground : '#2e3240';
      ctx.fillRect(p.x - 30, p.y + 8, 60, 8);
      if (cleared) {
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x + 10, p.y - 22, 2, 26);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(p.x + 12, p.y - 22, 12, 8);
      }
      if (!open) { ctx.fillStyle = '#ffffffaa'; ctx.font = '700 14px sans-serif'; ctx.fillText('🔒', p.x, p.y + 4); }
      ctx.font = '800 12px -apple-system, "Apple SD Gothic Neo", sans-serif';
      ctx.fillStyle = '#000'; ctx.fillText(`${i + 1}. ${st.name}`, p.x + 1, p.y + 37);
      ctx.fillStyle = i === sel ? '#ffd23f' : open ? '#fff' : '#8a8fa3'; ctx.fillText(`${i + 1}. ${st.name}`, p.x, p.y + 36);
      const got = (save.icons[st.id] || []).filter(Boolean).length;
      if (open) { ctx.font = '700 10px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#cfd3e0'; ctx.fillText(`아이콘 ${got}/3`, p.x, p.y + 50); }
    });
    const p = pos[sel];
    const hero = window.SPRITES.hero(Math.floor(t * 6) % 4);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(hero, Math.round(p.x - 12), Math.round(p.y - 30 + Math.sin(t * 5) * 2), 24, 32);
    ctx.textAlign = 'left';
    ctx.font = `900 ${w < 480 ? 17 : 22}px -apple-system, "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = '#000'; ctx.fillText('커리어 런 · 월드맵', 18, 42);
    ctx.fillStyle = '#ffd23f'; ctx.fillText('커리어 런 · 월드맵', 16, 40);
    ctx.font = '600 13px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillStyle = '#cfd3e0';
    ctx.fillText('← → 로 고르고 Enter(또는 섬을 터치)로 출발', 16, 64);
    return pos;
  }

  function hitNode(pos, x, y) {
    return pos.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 40);
  }

  // ---------- credits ----------
  function credits(C, stages, save, onDone) {
    const el = document.getElementById('credits');
    const totalIcons = stages.reduce((a, st) => a + (save.icons[st.id] || []).filter(Boolean).length, 0);
    const esc = window.UI.esc;
    const rows = stages.map((st, i) => `<div class="cr-stage"><h3>${i + 1}. ${esc(st.name)}</h3><p>${esc(st.intro)}</p><p class="muted">${esc(st.clear)}</p></div>`).join('');
    el.querySelector('.roll').innerHTML = `<h1>커리어 런</h1><p class="muted">STAFF ROLL</p>${rows}`
      + `<div class="cr-stage"><h3>모은 기술 아이콘 ${totalIcons}/${stages.length * 3}</h3><p>${esc(C.levels[0].ending.text)}</p></div>`
      + '<p class="cr-contact"><a href="mailto:moonhou@naver.com">moonhou@naver.com</a> · <a href="https://github.com/amecoder" target="_blank" rel="noopener">github.com/amecoder</a> · <a href="https://semu.ai.kr" target="_blank" rel="noopener">semu.ai.kr</a></p>'
      + '<h2>THANK YOU FOR PLAYING</h2>';
    el.classList.add('show');
    const roll = el.querySelector('.roll');
    roll.style.animation = 'none'; void roll.offsetHeight; roll.style.animation = '';
    document.getElementById('creditsClose').onclick = () => { el.classList.remove('show'); onDone(); };
  }

  // ---------- touch buttons ----------
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  function buttons(w, h) {
    const r = 34, pad = 18, y = h - pad - r;
    return [
      { id: 'left', x: pad + r, y, r, label: '◀' },
      { id: 'right', x: pad + r * 3 + 12, y, r, label: '▶' },
      { id: 'shoot', x: w - pad - r * 3 - 12, y, r, label: 'B' },
      { id: 'jump', x: w - pad - r, y: y - 10, r: r + 6, label: 'A' },
    ];
  }
  function drawButtons(ctx, w, h, held) {
    if (!coarse) return;
    ctx.textAlign = 'center'; ctx.font = '900 18px sans-serif';
    for (const b of buttons(w, h)) {
      ctx.fillStyle = held[b.id] ? '#ffffff55' : '#ffffff22';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(b.label, b.x, b.y + 6);
    }
  }
  function buttonAt(w, h, x, y) {
    const b = buttons(w, h).find((o) => Math.hypot(o.x - x, o.y - y) < o.r + 8);
    return b ? b.id : null;
  }

  return { load, save, drawMap, hitNode, nodePositions, credits, drawButtons, buttonAt, coarse };
})();
