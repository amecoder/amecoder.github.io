// Survivor-style profile game: hordes of errors, auto-firing language weapons, tech items and weapon evolutions.
(function () {
  'use strict';

  const C = window.CONTENT, SPR = window.SPRITES, AU = window.AUDIO, FX = window.FX, UI = window.UI, SCENE = window.SCENE;
  const LEVEL = C.levels[0];
  const STAGES = LEVEL.stages;
  const STAGE_TIME = 20;
  const WEAPON_MAX = 5, ITEM_MAX = 3, MOB_CAP = 520;
  const { STAGE_COLORS, KINDS, PICKUP_CHANCE, EVOLUTIONS } = window.GAME_CONFIG;
  const DEBUG = /[?&]debug\b/.test(location.search);

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let dpr = 1, scale = 2, viewW = 0, viewH = 0, vignette = null;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = Math.max(1.5, Math.min(3, Math.min(innerWidth, innerHeight) / 230));
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    viewW = innerWidth / scale; viewH = innerHeight / scale;
    vignette = ctx.createRadialGradient(innerWidth / 2, innerHeight / 2, Math.min(innerWidth, innerHeight) * 0.35,
      innerWidth / 2, innerHeight / 2, Math.max(innerWidth, innerHeight) * 0.75);
    vignette.addColorStop(0, '#0000'); vignette.addColorStop(1, '#000a');
  }
  addEventListener('resize', resize);
  resize();
  // ---------- state ----------
  const game = { mode: 'title', stageIdx: 0, t: 0, time: 0, bossSpawned: false, bossDead: false, spawnAcc: 0, nextHorde: 6,
    snapshot: null, kills: 0, playTime: 0, log: [], pendingLevels: 0 };
  let player = null, enemies = [], bullets = [], ebullets = [], gems = [], pickups = [], bolts = [], mines = [];

  function newPlayer() {
    return { x: 0, y: 0, r: 5, hp: 120, level: 1, xp: 0, xpNext: 5, weapons: {}, items: {}, evolved: {}, bonusDamage: 0,
      timers: {}, iframe: 0, shield: 0, shieldTimer: 0, face: { x: 1, y: 0 }, walk: 0 };
  }

  function stats() {
    const s = { maxHp: 120, speed: 78, fireRate: 1, magnet: 38, regen: 0, crit: 0.08, xp: 1, chain: 0, iframe: 0.5,
      shield: 0, cooldown: 1, projSpeed: 1, damage: 1 + player.bonusDamage };
    for (const [id, lv] of Object.entries(player.items)) {
      const it = C.items[id], a = it.amount * lv;
      switch (it.effect) {
        case 'maxHp': s.maxHp += a; break;
        case 'fireRate': s.fireRate += a; break;
        case 'magnet': s.magnet *= 1 + a; break;
        case 'regen': s.regen += a; break;
        case 'crit': s.crit += a; break;
        case 'xp': s.xp += a; break;
        case 'chain': s.chain += a; break;
        case 'speed': s.speed *= 1 + a; break;
        case 'iframe': s.iframe += a; break;
        case 'shield': s.shield += a; break;
        case 'cooldown': s.cooldown *= Math.max(0.4, 1 - a); break;
        case 'projSpeed': s.projSpeed += a; break;
        case 'damage': s.damage += a; break;
      }
    }
    return s;
  }
  // ---------- spatial grid ----------
  const CELL = 24;
  let grid = new Map();
  function buildGrid() {
    grid = new Map();
    for (const e of enemies) {
      if (e.dead) continue;
      const key = Math.floor(e.x / CELL) * 73856093 ^ Math.floor(e.y / CELL) * 19349663;
      let cell = grid.get(key);
      if (!cell) grid.set(key, (cell = []));
      cell.push(e);
    }
  }
  function near(x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = grid.get(cx * 73856093 ^ cy * 19349663);
        if (cell) for (const e of cell) if (!e.dead && fn(e) === false) return;
      }
    }
  }
  function nearest(x, y, maxDist) {
    let best = null, bd = maxDist * maxDist;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = ((e.x - x) ** 2 + (e.y - y) ** 2) * (e.boss ? 0.15 : 1);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  // ---------- weapons ----------
  function aim() {
    const t = nearest(player.x, player.y, 240);
    return t ? Math.atan2(t.y - player.y, t.x - player.x) : Math.atan2(player.face.y, player.face.x);
  }
  function shoot(angle, o, s) {
    const sp = o.speed * s.projSpeed;
    bullets.push({ x: player.x, y: player.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: o.r, dmg: o.dmg,
      pierce: o.pierce || 1, life: o.life || 1.4, color: o.color, homing: o.homing || 0, blast: o.blast || 0,
      split: o.split || 0, arc: o.arc || 0, kind: o.kind, hit: new Set() });
  }

  const WEAPONS = {
    php: { color: '#8f96ff', interval: 0.42, fire(lv, s) {
      const n = 1 + Math.floor(lv / 2), a = aim();
      for (let i = 0; i < n; i++) shoot(a + (i - (n - 1) / 2) * 0.14, { kind: 'bolt', speed: 200, r: 2.5, dmg: 12 + lv * 4, pierce: 3, color: this.color }, s);
    } },
    java: { color: '#ff9f43', interval: 1.0, fire(lv, s) {
      const n = lv >= 4 ? 2 : 1, a = aim();
      for (let i = 0; i < n; i++) shoot(a + i * Math.PI, { kind: 'orb', speed: 140, r: 5 + lv * 0.4, dmg: 30 + lv * 10, pierce: 99, life: 2.2, color: this.color }, s);
    } },
    kotlin: { color: '#b36bff', interval: 0.75, fire(lv, s) {
      const n = 3 + lv, a = aim(), spread = 1.2;
      for (let i = 0; i < n; i++) shoot(a - spread / 2 + (spread * i) / (n - 1), { kind: 'shard', speed: 175, r: 2.6, dmg: 10 + lv * 4, pierce: 2, color: this.color }, s);
    } },
    nodejs: { color: '#6be38b', interval: 0.11, fire(lv, s) {
      shoot(aim() + (Math.random() - 0.5) * 0.3, { kind: 'bolt', speed: 240, r: 1.8, dmg: 6 + lv * 2, life: 1, color: this.color }, s);
    } },
    python: { color: '#ffd23f', orbit: true },
    cpp: { color: '#ff6b6b', interval: 0.9, fire(lv) {
      if (mines.length >= 5 + lv) mines.shift();
      mines.push({ x: player.x + (Math.random() - 0.5) * 16, y: player.y + (Math.random() - 0.5) * 16, r: 24 + lv * 4, dmg: 34 + lv * 14, t: 0 });
    } },
    llm: { color: '#4fc3ff', interval: 0.95, fire(lv, s) {
      for (let i = 0; i < 1 + lv; i++) shoot(Math.random() * Math.PI * 2, { kind: 'missile', speed: 110, r: 3, dmg: 16 + lv * 5, life: 3, homing: 5, blast: 18, color: this.color }, s);
    } },
    strangler: { color: '#7dffb0', interval: 0.32, fire(lv, s) {
      const a = aim();
      for (let i = 0; i < 4; i++) shoot(a + (i - 1.5) * 0.12, { kind: 'bolt', speed: 220, r: 3, dmg: 34, pierce: 4, split: 3, color: this.color }, s);
    } },
    eventdriven: { color: '#e08bff', interval: 0.55, fire(lv, s) {
      const a = aim();
      for (let i = 0; i < 10; i++) shoot(a - 0.8 + (1.6 * i) / 9, { kind: 'shard', speed: 190, r: 3, dmg: 28, pierce: 3, arc: 3, color: this.color }, s);
    } },
    agent: { color: '#7fe7ff', interval: 0.6, fire(lv, s) {
      for (let i = 0; i < 8; i++) shoot((i / 8) * Math.PI * 2, { kind: 'missile', speed: 120, r: 4, dmg: 40, life: 3.2, homing: 6, blast: 34, color: this.color }, s);
    } },
  };
  const evoInfo = (id) => (C.evolutions && C.evolutions[id]) || { name: id, desc: '', story: '' };

  function updateWeapons(dt, s) {
    for (const [id, lv] of Object.entries(player.weapons)) {
      const w = WEAPONS[id];
      if (w.orbit) continue;
      player.timers[id] = (player.timers[id] || 0) - dt;
      if (player.timers[id] <= 0) { player.timers[id] = (w.interval * s.cooldown) / s.fireRate; w.fire(lv, s); AU.play('shoot'); }
    }
  }
  function orbs() {
    const lv = player && player.weapons.python;
    if (!lv) return [];
    const n = 2 + lv, rad = 28 + lv * 3, out = [];
    for (let i = 0; i < n; i++) {
      const a = game.time * 3.2 + (i * Math.PI * 2) / n;
      out.push({ x: player.x + Math.cos(a) * rad, y: player.y + Math.sin(a) * rad, r: 4.5, dmg: 12 + lv * 5 });
    }
    return out;
  }
  // ---------- spawning ----------
  const stageColor = () => STAGE_COLORS[game.stageIdx % STAGE_COLORS.length];
  const mobDefs = () => STAGES[game.stageIdx].mobs.map((m) => (typeof m === 'string' ? { name: m, kind: 'bug' } : m));

  function addMob(x, y, def) {
    const k = game.stageIdx, K = KINDS[def.kind] || KINDS.bug;
    const hp = K.hp(k) * (1 + (game.t / STAGE_TIME) * 0.6);
    enemies.push({ x, y, r: K.r, hp, maxHp: hp, spd: K.spd(k) * (0.85 + Math.random() * 0.3), dmg: K.dmg(k), xp: K.xp, kind: def.kind,
      name: def.name, showName: def.kind === 'tank' || Math.random() < 0.35, boss: false, color: stageColor(), kx: 0, ky: 0, hitCd: 0, flash: 0, w: K.w, h: K.h });
  }
  function ringPoint(margin) {
    const a = Math.random() * Math.PI * 2, d = Math.hypot(viewW, viewH) / 2 + margin;
    return { x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d, a };
  }
  function spawnMob() {
    const defs = mobDefs(), p = ringPoint(10);
    addMob(p.x, p.y, defs[Math.floor(Math.random() * defs.length)]);
  }
  function spawnHorde() {
    const defs = mobDefs(), def = defs[Math.floor(Math.random() * defs.length)];
    const n = 40 + game.stageIdx * 10, d = Math.hypot(viewW, viewH) / 2 + 14;
    for (let i = 0; i < n && enemies.length < MOB_CAP; i++) {
      const a = (i / n) * Math.PI * 2;
      addMob(player.x + Math.cos(a) * d, player.y + Math.sin(a) * d, def.kind === 'tank' ? defs[0] : def);
    }
    UI.toast(`${def.name} 대량 발생!`, '', 'warn');
  }
  function spawnBoss() {
    const st = STAGES[game.stageIdx], p = ringPoint(-30);
    const hp = 6500 + game.stageIdx * 5200;
    enemies.push({ x: p.x, y: p.y, r: 12, hp, maxHp: hp, spd: 30, dmg: 16 + game.stageIdx * 3, name: st.boss.name, boss: true, kind: 'boss',
      color: stageColor(), kx: 0, ky: 0, hitCd: 0, flash: 0, w: 32, h: 30, pattern: 0, patternT: 2.5, dashing: 0, tele: 0, tx: 0, ty: 0 });
    game.bossSpawned = true;
    // A stage can hand over a weapon late, e.g. switching from PHP to Java near the end of a job.
    if (st.lateWeapon && !player.weapons[st.lateWeapon]) {
      const w = C.weapons[st.lateWeapon];
      player.weapons[st.lateWeapon] = 1;
      setMode('play');
      UI.toast(w.name + '(으)로 전환', w.story, '');
      logGrowth('weapon', w.name + ' 획득', w.story);
    }
    AU.play('boss'); AU.setIntense(true);
    FX.slowMo(0.9); FX.addShake(6); FX.flash('#ff2a2a', 0.35);
    UI.toast('BOSS · ' + st.boss.name, '', 'warn');
  }
  // ---------- combat ----------
  function damage(e, base, s, opts) {
    if (e.dead) return;
    const crit = Math.random() < s.crit;
    const dmg = Math.round(base * s.damage * (crit ? 2 : 1));
    e.hp -= dmg; e.flash = 0.08;
    if (e.boss || crit || Math.random() < 0.25) FX.number(e.x, e.y - e.r - 2, dmg, crit);
    AU.play('hit');
    if (e.hp <= 0) kill(e, s, opts && opts.depth || 0);
  }

  function explode(x, y, radius, dmg, s, depth, color) {
    FX.ring(x, y, radius, color || '#fff', 0.3);
    near(x, y, radius, (o) => { if ((o.x - x) ** 2 + (o.y - y) ** 2 < (radius + o.r) ** 2) damage(o, dmg, s, { depth: depth + 1 }); });
  }

  function kill(e, s, depth) {
    e.dead = true;
    game.kills += 1;
    FX.burst(e.x, e.y, e.color, e.boss ? 90 : e.kind === 'tank' ? 16 : 8, e.boss ? 120 : 70);
    FX.burst(e.x, e.y, '#ffffff', e.boss ? 30 : 2, 50);
    AU.play('pop');
    if (e.kind === 'tank') FX.addShake(1.2);
    const n = e.boss ? 40 : 1;
    for (let i = 0; i < n; i++) {
      gems.push({ x: e.x + (e.boss ? (Math.random() - 0.5) * 50 : 0), y: e.y + (e.boss ? (Math.random() - 0.5) * 50 : 0), v: e.boss ? 3 : e.xp, pull: false });
    }
    if (!e.boss) {
      const m = e.kind === 'tank' ? 6 : 1;
      for (const [kind, p] of Object.entries(PICKUP_CHANCE)) {
        if (Math.random() < p * m) { pickups.push({ x: e.x, y: e.y, kind, t: 0 }); break; }
      }
    }
    if (s.chain > 0 && depth < 2) explode(e.x, e.y, 22, 10 * s.chain, s, depth, '#ffe9a8');
    if (e.boss) {
      game.bossDead = true;
      FX.slowMo(1.2); FX.addShake(8); FX.flash('#ffffff', 0.6); AU.play('clear');
      for (const o of enemies) if (!o.boss && !o.dead) { o.dead = true; FX.burst(o.x, o.y, o.color, 4, 60); }
      setTimeout(stageClear, 1300);
    }
  }

  function onBulletHit(b, e, s) {
    damage(e, b.dmg, s);
    const k = e.boss ? 0.15 : e.kind === 'tank' ? 0.5 : 1.4;
    e.kx += (b.vx / 60) * k; e.ky += (b.vy / 60) * k;
    if (b.blast) explode(b.x, b.y, b.blast, b.dmg * 0.6, s, 0, b.color);
    if (b.split) {
      const a = Math.atan2(b.vy, b.vx);
      for (let i = 0; i < b.split; i++) {
        bullets.push({ x: b.x, y: b.y, vx: Math.cos(a + (i - 1) * 0.6) * 170, vy: Math.sin(a + (i - 1) * 0.6) * 170, r: 2.2, dmg: b.dmg * 0.5,
          pierce: 2, life: 0.5, color: '#b36bff', homing: 0, blast: 0, split: 0, arc: 0, kind: 'shard', hit: new Set([e]) });
      }
    }
    if (b.arc) {
      let from = e, count = b.arc;
      const seen = new Set([e]);
      while (count-- > 0) {
        let next = null, bd = 60 * 60;
        near(from.x, from.y, 60, (o) => { const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2; if (!seen.has(o) && d < bd) { bd = d; next = o; } });
        if (!next) break;
        seen.add(next);
        bolts.push({ x1: from.x, y1: from.y, x2: next.x, y2: next.y, life: 0.12 });
        damage(next, b.dmg * 0.7, s);
        from = next;
      }
    }
  }

  function hurtPlayer(amount, s) {
    if (player.iframe > 0 || (DEBUG && api.god)) return;
    if (player.shield > 0) { player.shield = 0; FX.ring(player.x, player.y, 16, '#4fc3ff'); AU.play('pickup'); player.iframe = s.iframe; return; }
    player.hp -= amount; player.iframe = s.iframe;
    FX.addShake(3); FX.flash('#ff0000', 0.25); AU.play('hurt');
  }

  function usePickup(p, s) {
    AU.play('pickup');
    const info = (C.pickups && C.pickups[p.kind]) || { name: p.kind, desc: '' };
    UI.toast(info.name, info.desc, 'item');
    if (p.kind === 'heal') { player.hp = Math.min(s.maxHp, player.hp + s.maxHp * 0.35); FX.ring(player.x, player.y, 24, '#3fbf6a'); }
    if (p.kind === 'magnet') { for (const g of gems) g.pull = true; FX.ring(player.x, player.y, 60, '#4fc3ff', 0.5); }
    if (p.kind === 'bomb') {
      AU.play('bomb'); FX.flash('#fff3c0', 0.8); FX.addShake(8); FX.slowMo(0.4);
      for (const e of enemies) {
        if (e.dead || Math.abs(e.x - player.x) > viewW / 2 + 10 || Math.abs(e.y - player.y) > viewH / 2 + 10) continue;
        if (e.boss) damage(e, e.maxHp * 0.12 / s.damage, s); else kill(e, s, 2);
      }
    }
  }
  // ---------- boss ----------
  function updateBoss(e, dt) {
    e.patternT -= dt;
    if (e.tele > 0) {
      e.tele -= dt;
      if (e.tele <= 0) { e.dashing = 0.6; AU.play('dash'); }
      return 0;
    }
    if (e.dashing > 0) { e.dashing -= dt; return 4; }
    if (e.patternT <= 0) {
      const p = e.pattern++ % 3;
      e.patternT = 3.2 - Math.min(1.2, game.stageIdx * 0.15);
      if (p === 0) { e.tele = 0.7; e.tx = player.x; e.ty = player.y; }
      if (p === 1) {
        const n = 14 + game.stageIdx * 2, off = Math.random();
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, r: 3, life: 4, dmg: 10 + game.stageIdx * 2 });
        }
        FX.ring(e.x, e.y, 30, '#ff5d5d'); AU.play('dash');
      }
      if (p === 2) {
        const defs = mobDefs();
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; addMob(e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, defs[i % defs.length]); }
      }
    }
    return 1;
  }
  // ---------- flow ----------
  function logGrowth(kind, title, story) {
    game.log.push({ stage: STAGES[game.stageIdx].name, kind, title, story });
  }

  // `cleared` carries the previous stage's clear text so one panel covers both "clear" and "next stage".
  function startStage(idx, retry, cleared) {
    game.stageIdx = idx; game.t = 0; game.spawnAcc = 0; game.nextHorde = 6; game.bossSpawned = false; game.bossDead = false;
    enemies = []; bullets = []; ebullets = []; gems = []; pickups = []; bolts = []; mines = [];
    FX.reset();
    player.x = 0; player.y = 0; player.iframe = 1.2;
    AU.setStage(idx); AU.setIntense(false);
    const st = STAGES[idx];
    if (!retry) {
      const got = st.autoGrant === false ? null : st.unlock.weapons.find((w) => !player.weapons[w] && !Object.values(player.evolved).includes(w));
      if (got) { player.weapons[got] = 1; logGrowth('weapon', C.weapons[got].name + ' 획득', C.weapons[got].story); }
      game.snapshot = JSON.stringify({ weapons: player.weapons, items: player.items, evolved: player.evolved, level: player.level,
        xp: player.xp, xpNext: player.xpNext, bonusDamage: player.bonusDamage, logLen: game.log.length });
      const chips = [];
      if (got) chips.push(UI.chip(C.weapons[got].name + ' 획득', 'w'));
      st.unlock.weapons.filter((w) => w !== got).forEach((w) => chips.push(UI.chip(C.weapons[w].name + ' 해금', 'w')));
      st.unlock.items.forEach((i) => chips.push(UI.chip(C.items[i].name + ' 해금', C.items[i].category === 'exp' ? 'exp' : '')));
      const body = cleared
        ? [`<span class="cleared">✔ ${UI.esc(cleared.boss)} 처치</span> ${UI.esc(cleared.text)}`, `<b>다음:</b> ${UI.esc(st.intro)}`]
        : [UI.esc(st.intro)];
      const tag = cleared ? `STAGE ${idx} CLEAR → STAGE ${idx + 1}/${STAGES.length}` : `${LEVEL.title} · STAGE ${idx + 1}/${STAGES.length}`;
      setMode('story');
      UI.story(tag, st.name, body, chips, () => setMode('play'), cleared ? '다음 스테이지' : '시작');
    } else {
      setMode('play');
    }
    player.hp = stats().maxHp;
  }

  function stageClear() {
    if (game.mode === 'levelup' || game.mode === 'paused') { setTimeout(stageClear, 300); return; }
    if (game.mode !== 'play' || !game.bossDead) return;
    game.bossDead = false;
    const st = STAGES[game.stageIdx], next = game.stageIdx + 1;
    if (next < STAGES.length) { startStage(next, false, { boss: st.boss.name, text: st.clear }); return; }
    setMode('story');
    UI.story(`STAGE ${game.stageIdx + 1} CLEAR`, st.boss.name + ' 처치', [UI.esc(st.clear)], [], showEnding, '엔딩 보기');
  }

  function fmtTime(sec) { const m = Math.floor(sec / 60), s2 = Math.floor(sec % 60); return `${m}:${String(s2).padStart(2, '0')}`; }

  function showEnding() {
    setMode('ending');
    AU.stopMusic();
    UI.ending(C, { kills: game.kills, level: player.level, time: fmtTime(game.playTime) }, game.log,
      () => UI.profile(C, STAGES, game.log), () => { UI.hide('ending'); newGame(); });
  }

  function gameOver() { setMode('gameover'); UI.show('gameover'); }

  function retry() {
    const snap = JSON.parse(game.snapshot);
    game.log.length = snap.logLen;
    Object.assign(player, snap, { timers: {} });
    delete player.logLen;
    UI.hide('gameover');
    startStage(game.stageIdx, true);
  }

  function newGame() {
    AU.init(); AU.startMusic(0);
    player = newPlayer();
    Object.assign(game, { kills: 0, playTime: 0, log: [], pendingLevels: 0 });
    UI.hide('title');
    startStage(0);
  }
  // ---------- level up ----------
  function options() {
    const w = new Set(), it = new Set(), cur = STAGES[game.stageIdx].unlock;
    for (let i = 0; i <= game.stageIdx; i++) { STAGES[i].unlock.weapons.forEach((x) => w.add(x)); STAGES[i].unlock.items.forEach((x) => it.add(x)); }
    Object.keys(player.weapons).forEach((x) => { if (C.weapons[x]) w.add(x); });
    const evo = [], fresh = [], rest = [];
    for (const ev of EVOLUTIONS) {
      if (player.weapons[ev.from] >= WEAPON_MAX && ((ev.needWeapon && player.weapons[ev.needWeapon]) || (ev.needItem && player.items[ev.needItem]))) {
        const info = evoInfo(ev.id);
        evo.push({ kind: 'evolve', id: ev.id, from: ev.from, title: `${C.weapons[ev.from].name} → ${info.name}`, badge: 'EVOLVE', desc: info.desc, story: info.story });
      }
    }
    w.forEach((id) => {
      if (player.evolved[id]) return;
      const lv = player.weapons[id] || 0, d = C.weapons[id];
      if (lv >= WEAPON_MAX) return;
      const o = { kind: 'weapon', id, title: d.name, badge: lv ? `Lv ${lv} → ${lv + 1}` : 'NEW', desc: d.desc || d.mechanic, story: lv ? '' : d.story };
      (!lv && cur.weapons.includes(id) ? fresh : rest).push(o);
    });
    it.forEach((id) => {
      const lv = player.items[id] || 0, d = C.items[id];
      if (lv >= ITEM_MAX) return;
      const o = { kind: 'item', id, title: d.name, badge: lv ? `Lv ${lv} → ${lv + 1}` : d.category === 'exp' ? 'NEW 경험' : 'NEW', desc: d.desc || d.effect, story: '' };
      (!lv && cur.items.includes(id) ? fresh : rest).push(o);
    });
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const out = evo.concat(fresh.sort(() => Math.random() - 0.5).slice(0, 2), rest).slice(0, 3);
    const extra = (C.extras || {});
    if (out.length < 3) out.push({ kind: 'refactor', title: (extra.refactor && extra.refactor.name) || '리팩터링', badge: 'BONUS', desc: (extra.refactor && extra.refactor.desc) || '피해량 +8%' });
    if (out.length < 3) out.push({ kind: 'hotfix', title: (extra.hotfix && extra.hotfix.name) || '핫픽스', badge: 'BONUS', desc: (extra.hotfix && extra.hotfix.desc) || '체력 40% 회복' });
    return out;
  }

  function levelUp() {
    player.level += 1;
    player.xp -= player.xpNext;
    player.xpNext = Math.round(4 + player.level * 1.1 + Math.pow(player.level, 1.1));
    AU.play('levelup'); FX.ring(player.x, player.y, 40, '#ffd23f', 0.5); FX.flash('#ffd23f', 0.15);
    setMode('levelup');
    UI.levelup(player.level, options(), choose);
  }

  function choose(o) {
    const before = stats().maxHp;
    if (o.kind === 'weapon') {
      const lv = (player.weapons[o.id] || 0) + 1;
      player.weapons[o.id] = lv;
      if (lv === 1) { UI.toast(C.weapons[o.id].name + ' 획득', C.weapons[o.id].story); logGrowth('weapon', C.weapons[o.id].name + ' 획득', C.weapons[o.id].story); }
    } else if (o.kind === 'item') {
      const lv = (player.items[o.id] || 0) + 1;
      player.items[o.id] = lv;
      if (lv === 1) { const k = C.items[o.id].category === 'exp' ? 'exp' : 'item'; UI.toast(C.items[o.id].name, C.items[o.id].desc, k); logGrowth(k, C.items[o.id].name, C.items[o.id].desc); }
    } else if (o.kind === 'evolve') {
      delete player.weapons[o.from];
      player.evolved[o.id] = o.from;
      player.weapons[o.id] = WEAPON_MAX;
      const info = evoInfo(o.id);
      AU.play('evolve'); FX.flash('#c88bff', 0.5); FX.ring(player.x, player.y, 70, '#c88bff', 0.7);
      UI.toast('진화! ' + info.name, info.story, 'evo');
      logGrowth('evo', `${C.weapons[o.from].name} → ${info.name}`, info.story);
    } else if (o.kind === 'refactor') {
      player.bonusDamage += 0.08;
    } else if (o.kind === 'hotfix') {
      player.hp = Math.min(stats().maxHp, player.hp + stats().maxHp * 0.4);
    }
    const after = stats().maxHp;
    if (after > before) player.hp += after - before;
    setMode('play');
  }
  // ---------- modes & input ----------
  function setMode(m) {
    game.mode = m;
    UI.setPlaying(m);
    if (player && m !== 'title') {
      UI.loadout(
        Object.entries(player.weapons).map(([id, lv]) => ({ name: (WEAPONS[id] && C.weapons[id]) ? C.weapons[id].name : evoInfo(id).name, lv, evolved: !!player.evolved[id] })),
        Object.entries(player.items).map(([id, lv]) => ({ name: C.items[id].name, lv, exp: C.items[id].category === 'exp' })));
    }
  }
  function pause() { if (game.mode === 'play') { setMode('paused'); UI.show('paused'); } }
  function resume() { UI.hide('paused'); setMode('play'); }

  UI.$('heroIntro').textContent = C.hero.intro;
  UI.$('startBtn').addEventListener('click', newGame);
  UI.$('profileBtn').addEventListener('click', () => UI.profile(C, STAGES, []));
  UI.$('goProfileBtn').addEventListener('click', () => UI.profile(C, STAGES, game.log));
  UI.$('profileClose').addEventListener('click', () => UI.hide('profile'));
  UI.$('retryBtn').addEventListener('click', retry);
  UI.$('pauseBtn').addEventListener('click', pause);
  UI.$('resumeBtn').addEventListener('click', resume);
  UI.$('quitBtn').addEventListener('click', () => { UI.hide('paused'); AU.stopMusic(); setMode('title'); UI.show('title'); });
  const soundBtn = UI.$('soundBtn');
  const syncSound = () => { soundBtn.textContent = AU.muted ? '♪̸' : '♪'; soundBtn.style.opacity = AU.muted ? 0.5 : 1; };
  soundBtn.addEventListener('click', () => { AU.init(); AU.toggle(); syncSound(); });
  syncSound();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  const keys = new Set();
  addEventListener('keydown', (e) => {
    const k = UI.keyName(e);
    keys.add(k);
    if (k === 'p' || k === 'escape') { if (game.mode === 'play') pause(); else if (game.mode === 'paused') resume(); }
  });
  addEventListener('keyup', (e) => keys.delete(UI.keyName(e)));
  addEventListener('blur', () => keys.clear());

  const stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: null };
  canvas.addEventListener('pointerdown', (e) => {
    stick.active = true; stick.id = e.pointerId; stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => { if (stick.active && e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; } });
  const endStick = (e) => { if (e.pointerId === stick.id) stick.active = false; };
  canvas.addEventListener('pointerup', endStick);
  canvas.addEventListener('pointercancel', endStick);

  function moveVector() {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (stick.active) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy);
      if (d > 6) { x = dx / Math.max(d, 40); y = dy / Math.max(d, 40); }
    }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }
  // ---------- update ----------
  function update(dt) {
    const s = stats();
    game.t += dt; game.playTime += dt;

    const mv = moveVector();
    if (mv.x || mv.y) { player.face = mv; player.walk += dt * 10; }
    player.x += mv.x * s.speed * dt; player.y += mv.y * s.speed * dt;
    player.iframe = Math.max(0, player.iframe - dt);
    player.hp = Math.min(s.maxHp, player.hp + s.regen * dt);
    if (s.shield > 0 && player.shield < 1) {
      player.shieldTimer += dt;
      if (player.shieldTimer >= 9 / s.shield) { player.shield = 1; player.shieldTimer = 0; }
    }

    if (!game.bossSpawned) {
      if (game.t >= STAGE_TIME) spawnBoss();
      const rate = 11 + game.stageIdx * 1.6 + (game.t / STAGE_TIME) * 18;
      game.spawnAcc += rate * dt;
      while (game.spawnAcc >= 1) { if (enemies.length < MOB_CAP) spawnMob(); game.spawnAcc -= 1; }
      if (game.t >= game.nextHorde) { spawnHorde(); game.nextHorde += 10; }
    }

    buildGrid();
    updateWeapons(dt, s);

    for (const b of bullets) {
      if (b.homing) {
        const t = nearest(b.x, b.y, 170);
        if (t) {
          const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx);
          const diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
          const na = cur + Math.max(-b.homing * dt, Math.min(b.homing * dt, diff)), sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
        FX.trail(b.x, b.y, b.color);
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      near(b.x, b.y, b.r + 14, (e) => {
        if (b.pierce <= 0) return false;
        if (b.hit.has(e) || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 >= (e.r + b.r) ** 2) return;
        b.hit.add(e); b.pierce -= 1;
        onBulletHit(b, e, s);
      });
    }
    for (const o of orbs()) {
      near(o.x, o.y, o.r + 14, (e) => {
        if (e.hitCd > 0 || (e.x - o.x) ** 2 + (e.y - o.y) ** 2 >= (e.r + o.r) ** 2) return;
        e.hitCd = 0.35; damage(e, o.dmg, s);
        const d = Math.hypot(e.x - player.x, e.y - player.y) || 1;
        if (!e.boss) { e.kx += ((e.x - player.x) / d) * 2; e.ky += ((e.y - player.y) / d) * 2; }
      });
    }

    for (const e of enemies) {
      if (e.dead) continue;
      e.hitCd = Math.max(0, e.hitCd - dt); e.flash = Math.max(0, e.flash - dt);
      let mul = 1;
      if (e.boss) mul = updateBoss(e, dt);
      const tx = e.boss && (e.dashing > 0 || e.tele > 0) ? e.tx : player.x, ty = e.boss && (e.dashing > 0 || e.tele > 0) ? e.ty : player.y;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.spd * mul * dt + e.kx; e.y += (dy / d) * e.spd * mul * dt + e.ky;
      e.kx *= 0.78; e.ky *= 0.78;
      if ((player.x - e.x) ** 2 + (player.y - e.y) ** 2 < (e.r + player.r) ** 2) hurtPlayer(e.dmg, s);
    }
    // Light separation through the grid so hordes spread out instead of collapsing into one pixel.
    for (const a of enemies) {
      if (a.dead || a.boss) continue;
      let n = 0;
      near(a.x, a.y, a.r * 2, (b) => {
        if (b === a || n > 4) return;
        const dx = a.x - b.x, dy = a.y - b.y, min = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) { const d = Math.sqrt(d2), push = (min - d) * 0.5; a.x += (dx / d) * push; a.y += (dy / d) * push; n++; }
      });
    }

    for (const b of ebullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 < (b.r + player.r) ** 2) { hurtPlayer(b.dmg, s); b.life = 0; }
    }

    for (const g of gems) {
      const dx = player.x - g.x, dy = player.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (g.pull || d < s.magnet) { const sp = g.pull ? 320 : 190; g.x += (dx / d) * sp * dt; g.y += (dy / d) * sp * dt; }
      if (d < player.r + 4) { g.taken = true; player.xp += g.v * s.xp; AU.play('gem'); }
    }
    for (const p of pickups) {
      p.t += dt;
      if ((p.x - player.x) ** 2 + (p.y - player.y) ** 2 < 12 * 12) { p.taken = true; usePickup(p, s); }
    }
    for (const m of mines) {
      m.t += dt;
      if (m.t < 0.3) continue;
      near(m.x, m.y, 8, (e) => { if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 5) ** 2) { m.boom = true; return false; } });
      if (m.boom) { explode(m.x, m.y, m.r, m.dmg, s, 0, '#ff6b6b'); FX.burst(m.x, m.y, '#ffb36b', 14, 90); FX.addShake(0.8); AU.play('pop'); }
    }
    mines = mines.filter((m) => !m.boom && m.t < 10);
    for (const b of bolts) b.life -= dt;

    enemies = enemies.filter((e) => !e.dead && (e.boss || Math.abs(e.x - player.x) + Math.abs(e.y - player.y) < 900));
    bullets = bullets.filter((b) => b.life > 0 && b.pierce > 0);
    ebullets = ebullets.filter((b) => b.life > 0);
    gems = gems.filter((g) => !g.taken);
    if (gems.length > 700) gems.splice(0, gems.length - 700);
    pickups = pickups.filter((p) => !p.taken && p.t < 25);
    bolts = bolts.filter((b) => b.life > 0);

    UI.hud({ level: player.level, xpRatio: player.xp / player.xpNext, hpRatio: player.hp / s.maxHp, stage: game.stageIdx + 1, stages: STAGES.length,
      stageName: STAGES[game.stageIdx].name, time: game.bossSpawned ? 'BOSS' : Math.max(0, Math.ceil(STAGE_TIME - game.t)) + 's', kills: game.kills });
    if (player.hp <= 0) { gameOver(); return; }
    if (player.xp >= player.xpNext) levelUp();
  }
  // ---------- render ----------
  function drawBullet(b) {
    ctx.strokeStyle = b.color; ctx.fillStyle = b.color;
    if (b.kind === 'bolt') {
      ctx.lineWidth = b.r * 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    } else if (b.kind === 'shard') {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(b.r * 1.8, 0); ctx.lineTo(0, b.r); ctx.lineTo(-b.r * 1.4, 0); ctx.lineTo(0, -b.r); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0f1016'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = dpr * scale;

    if (!player || game.mode === 'title') { renderDemo(k); return; }

    const sh = FX.shakeOffset();
    const camX = player.x - viewW / 2 + sh.x, camY = player.y - viewH / 2 + sh.y;
    ctx.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    SCENE.drawGround(ctx, camX, camY, game.stageIdx, { w: viewW, h: viewH });

    for (const g of gems) {
      ctx.fillStyle = g.v >= 3 ? '#ffd23f' : g.v > 1 ? '#6be38b' : '#4fc3ff';
      ctx.fillRect(Math.round(g.x) - 1, Math.round(g.y) - 2, 2, 4); ctx.fillRect(Math.round(g.x) - 2, Math.round(g.y) - 1, 4, 2);
    }
    for (const p of pickups) {
      const bob = Math.sin(p.t * 5) * 1.5;
      ctx.fillStyle = '#0005'; ctx.fillRect(p.x - 4, p.y + 5, 8, 2);
      ctx.drawImage(SPR.pickup(p.kind), Math.round(p.x - 6), Math.round(p.y - 6 + bob), 12, 12);
    }

    // Boss dash telegraph
    for (const e of enemies) {
      if (e.boss && e.tele > 0) {
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(game.time * 30);
        ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = e.r * 1.6;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    for (const m of mines) {
      ctx.fillStyle = '#2a2d3a'; ctx.fillRect(Math.round(m.x) - 3, Math.round(m.y) - 2, 6, 4);
      ctx.fillStyle = Math.floor(game.time * 6 + m.x) % 2 ? '#ff4040' : '#5a1414'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 2);
    }
    ctx.fillStyle = '#0006';
    for (const e of enemies) ctx.fillRect(Math.round(e.x - e.w * 0.4), Math.round(e.y + e.h / 2 - 1), Math.round(e.w * 0.8), 2);
    ctx.fillRect(Math.round(player.x - 4), Math.round(player.y + 8), 8, 2);

    ctx.font = '600 5px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center';
    for (const e of enemies) {
      const wob = e.boss ? 0 : Math.sin(game.time * 12 + e.x) * 0.6;
      const ex = Math.round(e.x - e.w / 2), ey = Math.round(e.y - e.h / 2 + wob);
      ctx.drawImage(e.boss ? SPR.boss(e.color, false) : SPR.mob(e.kind, e.color, false), ex, ey, e.w, e.h);
      // Hit flash as a translucent white overlay so constantly-hit bosses stay readable.
      if (e.flash > 0) {
        ctx.globalAlpha = e.boss ? 0.35 : 0.8;
        ctx.drawImage(e.boss ? SPR.boss(e.color, true) : SPR.mob(e.kind, e.color, true), ex, ey, e.w, e.h);
        ctx.globalAlpha = 1;
      }
      if (e.showName && !e.boss) { ctx.fillStyle = '#ffffffc0'; ctx.fillText(e.name, e.x, e.y - e.h / 2 - 1.5); }
    }

    for (const b of ebullets) {
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd0d0'; ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }
    for (const b of bullets) drawBullet(b);
    for (const o of orbs()) {
      ctx.fillStyle = '#ffd23f55'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b6fd8'; ctx.fillRect(o.x - 2, o.y - 1, 2, 2);
    }
    ctx.strokeStyle = '#f2c8ff'; ctx.lineWidth = 1;
    for (const b of bolts) {
      ctx.globalAlpha = b.life / 0.12;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
      ctx.lineTo((b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 8, (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 8);
      ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (!(player.iframe > 0 && Math.floor(game.time * 20) % 2)) {
      ctx.save(); ctx.translate(Math.round(player.x), Math.round(player.y));
      if (player.face.x < 0) ctx.scale(-1, 1);
      ctx.drawImage(SPR.hero(Math.floor(player.walk) % 4), -6, -8, 12, 16);
      ctx.restore();
    }
    if (player.shield > 0) { ctx.strokeStyle = '#4fc3ffaa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(player.x, player.y, 11, 0, Math.PI * 2); ctx.stroke(); }
    ctx.font = '800 6px -apple-system, "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = '#000'; ctx.fillText(C.hero.name, player.x + 0.5, player.y - 10.5);
    ctx.fillStyle = '#fff'; ctx.fillText(C.hero.name, player.x, player.y - 11);

    FX.renderWorld(ctx);

    // Screen space overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, innerWidth, innerHeight);
    const boss = enemies.find((e) => e.boss);
    if (boss) {
      const w = Math.min(460, innerWidth - 40), x = (innerWidth - w) / 2, y = innerHeight - 104;
      ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, w + 6, 18);
      ctx.fillStyle = '#5a1414'; ctx.fillRect(x, y, w, 12);
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x, y, (w * Math.max(0, boss.hp)) / boss.maxHp, 12);
      ctx.fillStyle = '#fff'; ctx.font = '800 14px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BOSS · ' + boss.name, innerWidth / 2, y - 9);
    }
    FX.renderScreen(ctx, innerWidth, innerHeight);
    if (stick.active && game.mode === 'play') {
      ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 40, 0, Math.PI * 2); ctx.stroke();
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy), m = Math.min(d, 40) / (d || 1);
      ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.arc(stick.ox + dx * m, stick.oy + dy * m, 16, 0, Math.PI * 2); ctx.fill();
    }
  }

  function renderDemo(k) {
    SCENE.drawTitle(ctx, k, { w: viewW, h: viewH });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, innerWidth, innerHeight);
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.mode === 'play') { const dt = raw * FX.timeScale(); game.time += dt; update(dt); }
    FX.update(raw);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the URL.
  const api = { god: false };
  if (DEBUG) {
    Object.defineProperties(api, { player: { get: () => player }, enemies: { get: () => enemies }, bullets: { get: () => bullets } });
    Object.assign(api, {
      game, start: newGame, toBoss() { game.t = STAGE_TIME; },
      step: (n, dt) => { for (let i = 0; i < n; i++) if (game.mode === 'play') { game.time += dt; FX.update(dt); update(dt); } },
      killBoss() { const b = enemies.find((e) => e.boss); if (b) kill(b, stats(), 0); },
      continueStory() { UI.$('storyBtn').click(); },
      pickFirst() { const c = UI.$('cards').firstChild; if (c && UI.$('levelup').classList.contains('show')) c.click(); },
      stress(n) { for (let i = 0; i < n; i++) spawnMob(); },
      fx: FX,
    });
    window.__game = api;
  }
})();
