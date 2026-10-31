// DOM overlays: story panels, level-up cards, toasts, HUD and the profile/growth-log views.
window.UI = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CONTACT = '<a href="mailto:moonhou@naver.com">moonhou@naver.com</a> · '
    + '<a href="https://github.com/amecoder" target="_blank" rel="noopener">github.com/amecoder</a> · '
    + '<a href="https://semu.ai.kr" target="_blank" rel="noopener">semu.ai.kr</a>';

  function show(id) { $(id).classList.add('show'); }
  function hide(id) { $(id).classList.remove('show'); }
  function chip(text, cls) { return `<span class="chip ${cls || ''}">${esc(text)}</span>`; }

  let storyCb = null;
  function story(tag, title, paragraphs, chips, cb, btnText) {
    $('storyTag').textContent = tag;
    $('storyTitle').textContent = title;
    $('storyBody').innerHTML = paragraphs.filter(Boolean).map((p) => `<p>${p}</p>`).join('');
    $('storyUnlocks').innerHTML = (chips || []).join('');
    $('storyBtn').textContent = btnText || '계속';
    storyCb = cb;
    show('story');
    setTimeout(() => $('storyBtn').focus(), 50);
  }
  $('storyBtn').addEventListener('click', () => { hide('story'); const cb = storyCb; storyCb = null; if (cb) cb(); });

  let pickCb = null;
  function levelup(level, options, onPick) {
    $('levelupTitle').textContent = `LV ${level} · 하나를 고르세요`;
    const box = $('cards');
    box.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'card' + (o.badge === 'EVOLVE' ? ' evolve' : '');
      b.innerHTML = `<div class="top"><span class="key">${i + 1}</span><span class="t">${esc(o.title)}</span>`
        + `<span class="badge ${o.badge === 'NEW' ? 'new' : o.badge === 'EVOLVE' ? 'evo' : ''}">${esc(o.badge)}</span></div>`
        + `<div class="d">${esc(o.desc)}</div>` + (o.story ? `<div class="s">${esc(o.story)}</div>` : '');
      b.addEventListener('click', () => pick(i));
      box.appendChild(b);
    });
    pickCb = (i) => onPick(options[i]);
    show('levelup');
    setTimeout(() => box.firstChild && box.firstChild.focus(), 50);
  }
  function pick(i) {
    if (!pickCb || !$('levelup').classList.contains('show')) return;
    const cb = pickCb; pickCb = null;
    hide('levelup');
    cb(i);
  }
  // Physical key names via e.code so WASD/Z/X/P keep working while a Korean IME is active
  // (e.key would report 'ㅁ', 'ㅇ', 'ㅈ' instead of 'a', 'd', 'w').
  function keyName(e) {
    const c = e.code || '';
    if (c.startsWith('Key')) return c.slice(3).toLowerCase();
    if (c.startsWith('Digit')) return c.slice(5);
    if (c.startsWith('Numpad') && /\d$/.test(c)) return c.slice(-1);
    if (c === 'Space') return ' ';
    if (c.startsWith('Arrow') || c === 'Escape' || c === 'Enter' || c === 'NumpadEnter') return c === 'NumpadEnter' ? 'enter' : c.toLowerCase();
    return (e.key || '').toLowerCase();
  }
  addEventListener('keydown', (e) => { const k = keyName(e); if (['1', '2', '3'].includes(k)) pick(Number(k) - 1); });

  // Toasts: non-blocking growth messages at the top of the screen.
  const queue = [];
  let toastBusy = false;
  function toast(title, body, kind) {
    queue.push({ title, body, kind });
    // Fast level-ups can pile up toasts; keep only the newest two so messages stay current.
    if (queue.length > 2) queue.splice(0, queue.length - 2);
    if (!toastBusy) nextToast();
  }
  function nextToast() {
    const t = queue.shift();
    const el = $('toast');
    if (!t) { toastBusy = false; return; }
    toastBusy = true;
    el.className = 'toast show ' + (t.kind || '');
    el.innerHTML = `<b>${esc(t.title)}</b>${t.body ? `<span>${esc(t.body)}</span>` : ''}`;
    setTimeout(() => { el.className = 'toast ' + (t.kind || ''); setTimeout(nextToast, 200); }, t.body ? 2600 : 1400);
  }

  function hud(h) {
    $('lvText').textContent = 'LV ' + h.level;
    $('xpBar').firstChild.style.width = Math.min(100, h.xpRatio * 100) + '%';
    $('hpBar').firstChild.style.width = Math.max(0, h.hpRatio * 100) + '%';
    $('stageText').innerHTML = `STAGE ${h.stage}/${h.stages} · <b>${esc(h.stageName)}</b>`;
    $('timeText').textContent = h.time;
    $('killText').textContent = h.kills.toLocaleString() + ' 처치';
  }

  function loadout(weapons, items) {
    $('loadout').innerHTML = weapons.map((w) => chip(`${w.name} ${w.lv}`, w.evolved ? 'evo' : 'w'))
      .concat(items.map((it) => chip(`${it.name} ${it.lv}`, it.exp ? 'exp' : ''))).join('');
  }

  function setPlaying(mode) {
    const on = mode !== 'title';
    $('hud').style.display = on ? 'block' : 'none';
    $('loadout').style.display = on ? 'flex' : 'none';
    $('pauseBtn').style.display = mode === 'play' ? 'block' : 'none';
  }

  function growthHtml(log) {
    if (!log.length) return '';
    return '<div class="growth">' + log.map((g) =>
      `<div class="g"><span class="when">${esc(g.stage)}</span><span class="what ${g.kind}">${esc(g.title)}</span>`
      + (g.story ? `<span class="why">${esc(g.story)}</span>` : '') + '</div>').join('') + '</div>';
  }

  function profile(C, stages, log) {
    const parts = [`<p>${esc(C.hero.intro)}</p>`];
    if (log && log.length) parts.push('<h3 class="sub">이번 판의 성장 기록</h3>' + growthHtml(log));
    stages.forEach((st, i) => {
      parts.push(`<div class="stage-item"><h3>STAGE ${i + 1} · ${esc(st.name)}</h3><p>${esc(st.intro)}</p>`
        + `<p class="muted"><b>${esc(st.boss.name)}</b> — ${esc(st.clear)}</p>`
        + `<div class="unlocks">${st.unlock.weapons.map((w) => chip(C.weapons[w].name, 'w')).concat(st.unlock.items.map((x) => chip(C.items[x].name))).join('')}</div></div>`);
    });
    parts.push(`<div class="stage-item"><p>${esc(C.levels[0].ending.text)}</p><p>${CONTACT}</p></div>`);
    $('profileBody').innerHTML = parts.join('');
    show('profile');
  }

  function ending(C, stats, log, onProfile, onRestart) {
    $('endingBody').innerHTML = `<p>${esc(C.levels[0].ending.text)}</p>`
      + `<div class="stats"><div><b>${stats.kills.toLocaleString()}</b><span>처치</span></div><div><b>LV ${stats.level}</b><span>도달 레벨</span></div>`
      + `<div><b>${stats.time}</b><span>플레이 시간</span></div></div>`
      + '<h3 class="sub">성장 기록</h3>' + growthHtml(log) + `<p class="contact">${CONTACT}</p>`;
    $('endingProfile').onclick = onProfile;
    $('endingRestart').onclick = onRestart;
    show('ending');
  }

  return { $, show, hide, chip, story, levelup, toast, hud, loadout, setPlaying, profile, ending, esc, keyName };
})();
