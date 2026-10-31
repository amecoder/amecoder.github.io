// Career Run: a side-scrolling platformer where each course is one job, cleared by reaching the deploy flag.
(function () {
  'use strict';

  const C = window.CONTENT, LV = window.RUN_LEVELS, SPR = window.SPRITES, AU = window.AUDIO, FX = window.FX, UI = window.UI, RUI = window.RUN_UI;
  const STAGES = C.levels[0].stages;
  const T = 16;
  const P = { acc: 900, air: 620, fric: 1100, max: 128, jump: 420, grav: 1000, maxFall: 430, cut: 130 };
  const SOLID = new Set(['#', 'B', '?', 'b', 'k', 'X', 'x', 'R', '>']);
  const DEBUG = /[?&]debug\b/.test(location.search);
  const RUN_TEXT = (C.run && C.run.signs) || {};
  // Course index where each weapon is picked up; a replayed course only keeps weapons from earlier courses.
  const WEAPON_COURSE = { java: 1, kotlin: 7, llm: 8 };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let dpr = 1, scale = 2, viewW = 0, viewH = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = Math.max(1.2, Math.min(3.2, Math.min(innerHeight / 250, innerWidth / 300)));
    canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
    viewW = innerWidth / scale; viewH = innerHeight / scale;
  }
  addEventListener('resize', resize);
  resize();

  // ---------- state ----------
  let save = RUI.load();
  const S = { mode: 'map', sel: Math.min(save.cleared.length, STAGES.length - 1), idx: 0, lv: null, time: 0, clock: 0 };
  let pl, enemies, powers, shots, waves, crumbling, cam = { x: 0, y: 0 };

  function stageOf(i) { return STAGES[i]; }
  function tile(x, y) { const col = S.lv.grid[x]; return col ? col[y] || '.' : '.'; }
  function setTile(x, y, ch) { if (S.lv.grid[x]) S.lv.grid[x][y] = ch; }
  function solidAt(x, y) {
    if (x < 0 || x >= S.lv.w) return true; // level edges act as walls
    const ch = tile(x, y);
    if (SOLID.has(ch)) return true;
    if (ch === 'D') return !S.doorOpen;
    if (ch === 'W') return S.arenaLocked;
    return false;
  }

  function startCourse(i) {
    document.getElementById('credits').classList.remove('show');
    S.idx = i; S.lv = LV.build(stageOf(i).id); S.time = 0; S.commits = 0; S.doorOpen = false; S.nextSwitch = 0;
    S.arenaLocked = false; S.bossDead = false; S.icons = [false, false, false].map((_, k) => !!(save.icons[S.lv.id] || [])[k]);
    const g = S.lv.g;
    S.cp = { x: 3 * T, y: (g - 1) * T };
    const owned = (save.weapons || []).filter((w) => WEAPON_COURSE[w] < i).sort((a, b) => WEAPON_COURSE[b] - WEAPON_COURSE[a]);
    pl = { x: S.cp.x, y: S.cp.y, w: 10, h: 14, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jumpBuf: 0, hearts: 3, inv: 0,
      shield: false, speedT: 0, magnetT: 0, chainT: 0, boostT: 0, shootCd: 0, walk: 0, weapon: owned[0] || null, onPad: null };
    enemies = []; powers = []; shots = []; waves = []; crumbling = new Map();
    for (const e of S.lv.ents) {
      if (e.type === 'enemy') enemies.push(makeEnemy(e.kind, e.x * T, e.y * T));
      if (e.type === 'boss') S.boss = { x: e.x * T, y: e.y * T - 14, w: 28, h: 28, vx: 0, vy: 0, hp: i >= 5 ? 4 : 3, max: i >= 5 ? 4 : 3,
        inv: 0, t: 2, act: 0, charge: 0, tele: 0, ground: false, arenaX0: e.arenaX0 * T, arenaX1: e.arenaX1 * T, flash: 0 };
      e.done = false; e.on = false;
    }
    S.flag = S.lv.ents.find((e) => e.type === 'flag');
    FX.reset();
    AU.init(); AU.startMusic(i); AU.setStage(i); AU.setIntense(false);
    const st = stageOf(i);
    S.mode = 'story';
    UI.story(`커리어 런 · COURSE ${i + 1}/${STAGES.length}`, st.name, [UI.esc(st.intro), `<span class="muted">${UI.esc(signText('start'))}</span>`],
      S.lv.icons.map((n, k) => UI.chip(n + (S.icons[k] ? ' ✔' : ''), S.icons[k] ? 'exp' : '')), () => { S.mode = 'play'; }, '출발');
  }

  function signText(key) {
    const own = RUN_TEXT[S.lv.id] && RUN_TEXT[S.lv.id][key];
    return own || '';
  }

  function makeEnemy(kind, x, y) {
    const def = { bug: { w: 10, h: 9, sp: 28, hp: 1 }, fast: { w: 8, h: 7, sp: 62, hp: 1 }, tank: { w: 12, h: 12, sp: 18, hp: 2 } }[kind] || { w: 10, h: 9, sp: 28, hp: 1 };
    const mobs = stageOf(S.idx).mobs.filter((m) => typeof m !== 'string' && m.kind === kind);
    const name = (mobs[Math.floor(Math.random() * mobs.length)] || stageOf(S.idx).mobs[0]).name || '';
    return { kind, name, x, y: y - def.h, w: def.w, h: def.h, vx: -def.sp, sp: def.sp, vy: 0, hp: def.hp, dead: false, flash: 0 };
  }

  // ---------- physics ----------
  function overlapTiles(o, fn) {
    const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 0.01) / T);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) fn(x, y);
  }

  // Moves a body with tile collision; returns { hitX, hitHead, landed, under: [tile chars below] }.
  function move(o, dt, oneWay) {
    const res = { hitX: false, hitHead: null, landed: false };
    o.x += o.vx * dt;
    overlapTiles(o, (x, y) => {
      if (!solidAt(x, y)) return;
      if (o.vx > 0) o.x = x * T - o.w; else if (o.vx < 0) o.x = (x + 1) * T;
      res.hitX = true;
    });
    if (res.hitX) o.vx = 0;
    const prevBottom = o.y + o.h;
    o.y += o.vy * dt;
    o.ground = false;
    overlapTiles(o, (x, y) => {
      const ch = tile(x, y);
      const solid = solidAt(x, y);
      const plat = oneWay && ch === '=' && o.vy >= 0 && prevBottom <= y * T + 0.5;
      if (!solid && !plat) return;
      if (o.vy > 0) { o.y = y * T - o.h; o.vy = 0; o.ground = true; res.landed = true; }
      else if (o.vy < 0 && solid) { o.y = (y + 1) * T; o.vy = 0; res.hitHead = { x, y }; }
    });
    return res;
  }

  function standingTiles(o) {
    const y = Math.floor((o.y + o.h + 1) / T), out = [];
    for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 0.01) / T); x++) out.push({ x, y, ch: tile(x, y) });
    return out;
  }

  // ---------- player ----------
  const keys = new Set(), touch = {};
  let jumpPressed = false;
  const down = (k) => keys.has(k) || touch[k];
  function input() {
    const left = down('arrowleft') || down('a') || touch.left, right = down('arrowright') || down('d') || touch.right;
    const jump = down(' ') || down('arrowup') || down('w') || down('z') || touch.jump;
    const shoot = down('x') || down('j') || down('k') || touch.shoot;
    return { dir: (right ? 1 : 0) - (left ? 1 : 0), jump, shoot };
  }

  function updatePlayer(dt, inp) {
    const max = P.max * (pl.speedT > 0 ? 1.45 : 1);
    if (pl.boostT > 0) {
      pl.boostT -= dt; pl.vx = pl.face * 285;
      if (Math.random() < 0.6) FX.trail(pl.x + pl.w / 2, pl.y + pl.h - 2, '#ffd23f');
    } else if (inp.dir) {
      pl.face = inp.dir;
      pl.vx += inp.dir * (pl.ground ? P.acc : P.air) * dt;
      pl.vx = Math.max(-max, Math.min(max, pl.vx));
      pl.walk += dt * 10;
    } else if (pl.ground) {
      const f = P.fric * dt;
      pl.vx = Math.abs(pl.vx) <= f ? 0 : pl.vx - Math.sign(pl.vx) * f;
    }
    // Jump with coyote time and input buffer; releasing early cuts the jump short.
    if (inp.jump && !jumpPressed) pl.jumpBuf = 0.12;
    jumpPressed = inp.jump;
    pl.jumpBuf -= dt; pl.coyote -= dt;
    if (pl.jumpBuf > 0 && (pl.ground || pl.coyote > 0 || pl.onPad)) {
      pl.vy = -P.jump; pl.jumpBuf = 0; pl.coyote = 0; pl.onPad = null; AU.play('jump');
    }
    if (!inp.jump && pl.vy < -P.cut) pl.vy = -P.cut;
    pl.vy = Math.min(P.maxFall, pl.vy + P.grav * dt);

    const res = move(pl, dt, true);
    if (pl.ground) pl.coyote = 0.08;
    if (res.hitHead) bumpBlock(res.hitHead.x, res.hitHead.y);
    ridePads();

    if (pl.ground) {
      for (const t of standingTiles(pl)) {
        if (t.ch === 'R' && pl.boostT <= 0) { pl.boostT = 0.9; AU.play('dash'); FX.flash('#ffd23f', 0.1); }
        if (t.ch === '>') pl.x += 55 * dt;
        if ((t.ch === 'X' || t.ch === 'x') && !crumbling.has(t.x + ',' + t.y)) crumbling.set(t.x + ',' + t.y, { x: t.x, y: t.y, t: 0.4 });
      }
    }
    // Commits (coins), with a magnet power pulling from further away.
    const reach = pl.magnetT > 0 ? 4 : 0;
    for (let x = Math.floor(pl.x / T) - reach; x <= Math.floor((pl.x + pl.w) / T) + reach; x++) {
      for (let y = Math.floor(pl.y / T) - reach; y <= Math.floor((pl.y + pl.h) / T) + reach; y++) {
        if (tile(x, y) === 'c') { setTile(x, y, '.'); S.commits++; AU.play('gem'); FX.burst(x * T + 8, y * T + 8, '#ffd23f', 3, 40); }
      }
    }
    pl.inv = Math.max(0, pl.inv - dt); pl.speedT -= dt; pl.magnetT -= dt; pl.chainT -= dt;
    pl.shootCd -= dt;
    if (inp.shoot && pl.weapon && pl.shootCd <= 0) fire();
    if (pl.y > S.lv.h * T + 40) die();
  }

  function ridePads() {
    pl.onPad = null;
    for (const e of S.lv.ents) {
      if (e.type !== 'pulse') continue;
      const py = padY(e), px = e.x * T, w = e.w * T;
      if (pl.vy >= 0 && pl.x + pl.w > px && pl.x < px + w && pl.y + pl.h >= py - 2 && pl.y + pl.h <= py + 8) {
        pl.y = py - pl.h; pl.vy = 0; pl.ground = true; pl.onPad = e; pl.coyote = 0.08;
      }
    }
  }
  function padY(e) { return (e.y + Math.sin(S.clock * 2.2 + e.phase) * e.amp) * T; }

  function bumpBlock(x, y) {
    const ch = tile(x, y);
    if (ch === '?') {
      setTile(x, y, 'b');
      const id = S.lv.q[x + ',' + y];
      if (id === 'coins') { S.commits += 8; AU.play('gem'); FX.burst(x * T + 8, y * T, '#ffd23f', 16, 80); FX.text(x * T + 8, y * T - 4, '캐시 히트 +8', '#ffd23f'); }
      else if (id) powers.push({ id, x: x * T + 3, y: y * T - 12, w: 10, h: 10, vy: -60, t: 0 });
      AU.play('pickup');
    } else if (ch === 'B') {
      FX.burst(x * T + 8, y * T + 14, '#c28a5a', 4, 50);
    }
  }

  function fire() {
    const w = pl.weapon, x = pl.x + pl.w / 2, y = pl.y + 6;
    if (w === 'java') { shots.push({ x, y, vx: pl.face * 260, vy: 0, life: 0.7, pierce: 3, dmg: 0.34, color: '#ff9f43', r: 3 }); pl.shootCd = 0.32; }
    if (w === 'kotlin') { for (const a of [-0.22, 0, 0.22]) shots.push({ x, y, vx: pl.face * 240 * Math.cos(a), vy: 240 * Math.sin(a), life: 0.6, pierce: 1, dmg: 0.25, color: '#b36bff', r: 2.5 }); pl.shootCd = 0.3; }
    if (w === 'llm') { for (const a of [-0.4, 0.4]) shots.push({ x, y, vx: pl.face * 170, vy: 170 * Math.sin(a), life: 1.4, pierce: 1, dmg: 0.4, color: '#4fc3ff', r: 3, homing: true }); pl.shootCd = 0.34; }
    AU.play('shoot');
  }

  function hurt() {
    if (pl.inv > 0 || (DEBUG && api.god)) return;
    if (pl.shield) { pl.shield = false; pl.inv = 1; FX.ring(pl.x + 5, pl.y + 7, 18, '#4fc3ff'); AU.play('pickup'); return; }
    pl.hearts -= 1; pl.inv = 1.2; FX.addShake(3); FX.flash('#ff0000', 0.25); AU.play('hurt');
    pl.vy = -200; pl.vx = -pl.face * 120;
    if (pl.hearts <= 0) die();
  }

  function die() {
    FX.burst(pl.x, pl.y, '#ff5d5d', 20, 90); AU.play('hurt');
    Object.assign(pl, { x: S.cp.x, y: S.cp.y, vx: 0, vy: 0, hearts: 3, inv: 1.5, boostT: 0 });
    if (S.arenaLocked && !S.bossDead) { S.arenaLocked = false; resetBoss(); }
  }
  function resetBoss() {
    const e = S.lv.ents.find((o) => o.type === 'boss'), b = S.boss;
    Object.assign(b, { x: e.x * T, y: e.y * T - 14, vx: 0, vy: 0, hp: b.max, inv: 0, t: 2, charge: 0, tele: 0 });
    waves = [];
  }

  // ---------- powers & pickups ----------
  function powerKind(id) {
    const it = C.items[id];
    if (!it) return 'speed';
    if (['shield', 'iframe', 'maxHp', 'regen'].includes(it.effect)) return 'shield';
    if (['magnet', 'xp'].includes(it.effect)) return 'magnet';
    if (['damage', 'crit', 'chain'].includes(it.effect)) return 'chain';
    return 'speed';
  }
  const POWER_LABEL = { speed: '속도 업', shield: '보호막', magnet: '커밋 자석', chain: '연쇄 밟기' };

  function takePower(p) {
    const kind = powerKind(p.id), it = C.items[p.id];
    if (kind === 'speed') pl.speedT = 15;
    if (kind === 'shield') pl.shield = true;
    if (kind === 'magnet') pl.magnetT = 15;
    if (kind === 'chain') pl.chainT = 15;
    AU.play('pickup'); FX.ring(pl.x + 5, pl.y + 7, 22, '#ffd23f');
    UI.toast(`${it ? it.name : p.id} · ${POWER_LABEL[kind]}`, it ? it.desc : '', it && it.category === 'exp' ? 'exp' : 'item');
  }

  function updateEntities(dt) {
    for (const e of S.lv.ents) {
      if (e.done) continue;
      const ex = e.x * T, ey = e.y * T;
      const near = Math.abs(pl.x - ex) < 14 && Math.abs(pl.y + pl.h - (ey + T)) < 20;
      if (e.type === 'icon' && Math.abs(pl.x + 5 - (ex + 8)) < 12 && Math.abs(pl.y + 7 - (ey + 8)) < 14) {
        e.done = true; S.icons[e.idx] = true; AU.play('levelup'); FX.burst(ex + 8, ey + 8, '#6be38b', 18, 80);
        UI.toast(`기술 아이콘 · ${S.lv.icons[e.idx]}`, `${S.icons.filter(Boolean).length}/3 수집`, 'exp');
      }
      if (e.type === 'weapon' && near) {
        e.done = true; pl.weapon = e.weapon;
        save.weapons = [...new Set([...(save.weapons || []), e.weapon])]; RUI.save(save);
        const w = C.weapons[e.weapon];
        AU.play('evolve'); FX.flash('#c88bff', 0.35);
        UI.toast(`${w.name} 획득 · B / X 키로 발사`, w.story, 'evo');
      }
      if (e.type === 'checkpoint' && near && !e.on) {
        e.on = true; S.cp = { x: ex, y: ey - 2 }; AU.play('pickup'); UI.toast('체크포인트', '', 'item');
      }
      if (e.type === 'switch' && !e.on && near && pl.vy >= 0) pressSwitch(e);
      // Reaching or passing the flag after the boss falls counts, so the player never has to walk back.
      if (e.type === 'flag' && S.bossDead && pl.x + pl.w > ex) { e.done = true; clearCourse(); return; }
    }
    for (const p of powers) {
      p.t += dt; p.vy = Math.min(200, p.vy + 500 * dt); p.y += p.vy * dt;
      const gy = Math.floor((p.y + p.h) / T);
      if (solidAt(Math.floor((p.x + 5) / T), gy)) { p.y = gy * T - p.h; p.vy = 0; }
      if (Math.abs(p.x - pl.x) < 12 && Math.abs(p.y - pl.y) < 14) { p.done = true; takePower(p); }
    }
    powers = powers.filter((p) => !p.done && p.y < S.lv.h * T);
    for (const [k, c] of crumbling) {
      c.t -= dt;
      if (c.t <= 0) {
        const ch = tile(c.x, c.y);
        setTile(c.x, c.y, ch === 'X' ? 'k' : '.');
        FX.burst(c.x * T + 8, c.y * T + 8, ch === 'X' ? '#b36bff' : '#c28a5a', 8, 60);
        crumbling.delete(k);
      }
    }
  }

  function pressSwitch(e) {
    const all = S.lv.ents.filter((o) => o.type === 'switch');
    if (e.order === S.nextSwitch) {
      e.on = true; S.nextSwitch++; AU.play('pickup'); FX.ring(e.x * T + 8, e.y * T + 8, 16, '#ff7aa8');
      if (S.nextSwitch === all.length) { S.doorOpen = true; AU.play('levelup'); UI.toast('문이 열렸습니다', all.map((o) => o.label).join(' → '), 'exp'); }
    } else {
      all.forEach((o) => { o.on = false; }); S.nextSwitch = 0; AU.play('hurt');
      UI.toast('순서가 틀렸습니다', all.map((o) => o.label).join(' → ') + ' 순서로 눌러 주세요', 'warn');
    }
  }

  // ---------- enemies & boss ----------
  function updateEnemies(dt) {
    for (const e of enemies) {
      if (e.dead || Math.abs(e.x - pl.x) > viewW) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.vy = Math.min(P.maxFall, e.vy + P.grav * dt);
      // Turn at walls and ledges so errors patrol their platform.
      const ahead = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / T), footY = Math.floor((e.y + e.h + 2) / T);
      if (e.ground && !solidAt(ahead, footY) && tile(ahead, footY) !== '=') e.vx = -e.vx;
      const dir = Math.sign(e.vx) || -1;
      const r = move(e, dt, true);
      if (r.hitX) e.vx = -dir * e.sp;
      if (e.y > S.lv.h * T + 40) e.dead = true;
      if (overlap(pl, e)) {
        if (pl.vy > 40 && pl.y + pl.h - e.y < 9) stomp(e);
        else hurt();
      }
    }
    enemies = enemies.filter((e) => !e.dead);
  }

  function stomp(e) {
    pl.vy = -280; AU.play('pop'); FX.burst(e.x + e.w / 2, e.y + e.h / 2, '#fff', 8, 70);
    hitEnemy(e, 1);
    if (pl.chainT > 0) {
      FX.ring(e.x + e.w / 2, e.y + e.h, 50, '#ffe9a8');
      for (const o of enemies) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 60) hitEnemy(o, 2);
    }
  }
  function hitEnemy(e, dmg) {
    e.hp -= dmg; e.flash = 0.1;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; FX.burst(e.x + e.w / 2, e.y + e.h / 2, stageColor(), 10, 80); FX.text(e.x + e.w / 2, e.y - 4, e.name, '#fff');
    }
  }
  const stageColor = () => LV.THEMES[S.lv.id].top;

  function updateBoss(dt) {
    const b = S.boss;
    if (!b || S.bossDead) return;
    if (!S.arenaLocked && pl.x > b.arenaX0 + T * 2) {
      S.arenaLocked = true; AU.play('boss'); AU.setIntense(true); FX.slowMo(0.6); FX.addShake(5);
      UI.toast('BOSS · ' + stageOf(S.idx).boss.name, '머리를 밟거나 무기로 공격하세요', 'warn');
    }
    if (!S.arenaLocked) return;
    b.inv = Math.max(0, b.inv - dt); b.flash = Math.max(0, b.flash - dt); b.t -= dt;
    if (b.tele > 0) { b.tele -= dt; if (b.tele <= 0) { b.charge = 1; b.vx = Math.sign(pl.x - b.x) * 175; AU.play('dash'); } }
    else if (b.charge > 0) { b.charge -= dt; }
    else {
      b.vx = Math.sign(pl.x - b.x) * (40 + S.idx * 4);
      if (b.t <= 0 && b.ground) {
        b.act++;
        b.t = Math.max(1.3, 2.4 - S.idx * 0.1);
        if (b.act % 3 === 0) { b.tele = 0.6; b.vx = 0; }
        else { b.vy = -380; b.vx = Math.sign(pl.x - b.x) * 90; b.jumping = true; }
      }
    }
    b.vy = Math.min(P.maxFall, b.vy + P.grav * dt);
    const r = move(b, dt, false);
    if (r.hitX && b.charge > 0) { b.charge = 0; FX.addShake(3); }
    if (r.landed && b.jumping) {
      b.jumping = false; FX.addShake(2.5); AU.play('bomb');
      // Landing shockwave runs along the floor both ways; jump over it.
      waves.push({ x: b.x + b.w / 2, y: b.y + b.h - 8, vx: 150, life: 1.6 }, { x: b.x + b.w / 2, y: b.y + b.h - 8, vx: -150, life: 1.6 });
    }
    b.x = Math.max(b.arenaX0 + T, Math.min(b.arenaX1 - b.w, b.x));
    if (overlap(pl, b)) {
      if (pl.vy > 40 && pl.y + pl.h - b.y < 12 && b.inv <= 0) { pl.vy = -340; damageBoss(1); }
      else if (b.inv <= 0 || b.charge > 0) hurt();
    }
  }

  function damageBoss(d) {
    const b = S.boss;
    if (b.inv > 0 && d >= 1) return;
    b.hp -= d; b.flash = 0.12; if (d >= 1) b.inv = 1;
    AU.play('pop'); FX.burst(b.x + 14, b.y + 6, '#fff', 10, 90);
    if (b.hp <= 0) {
      S.bossDead = true; S.arenaLocked = false; AU.play('clear'); AU.setIntense(false);
      FX.slowMo(1); FX.flash('#fff', 0.6); FX.addShake(8); FX.burst(b.x + 14, b.y + 14, stageColor(), 90, 140);
      UI.toast(stageOf(S.idx).boss.name + ' 처치!', '깃발까지 가면 배포 완료', 'exp');
    }
  }

  function updateShots(dt) {
    for (const s of shots) {
      if (s.homing) {
        const t = enemies.concat(S.arenaLocked ? [S.boss] : []).reduce((best, e) => {
          const d = Math.hypot(e.x - s.x, e.y - s.y); return d < (best ? best.d : 140) ? { e, d } : best;
        }, null);
        if (t) { const a = Math.atan2(t.e.y + 6 - s.y, t.e.x + 6 - s.x), sp = Math.hypot(s.vx, s.vy); s.vx += (Math.cos(a) * sp - s.vx) * 0.12; s.vy += (Math.sin(a) * sp - s.vy) * 0.12; }
        FX.trail(s.x, s.y, s.color);
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (solidAt(Math.floor(s.x / T), Math.floor(s.y / T))) s.life = 0;
      for (const e of enemies) if (!e.dead && s.pierce > 0 && pointIn(s, e)) { s.pierce--; hitEnemy(e, 1); }
      if (S.arenaLocked && !S.bossDead && s.pierce > 0 && pointIn(s, S.boss)) { s.pierce = 0; damageBoss(s.dmg); }
    }
    shots = shots.filter((s) => s.life > 0 && s.pierce > 0);
    for (const w of waves) {
      w.x += w.vx * dt; w.life -= dt;
      if (Math.abs(w.x - (pl.x + 5)) < 8 && pl.y + pl.h > w.y) hurt();
    }
    waves = waves.filter((w) => w.life > 0);
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pointIn = (s, e) => s.x > e.x - 2 && s.x < e.x + e.w + 2 && s.y > e.y - 2 && s.y < e.y + e.h + 2;

  // ---------- flow ----------
  function clearCourse() {
    S.mode = 'story';
    const st = stageOf(S.idx), id = S.lv.id;
    if (!save.cleared.includes(id)) save.cleared.push(id);
    save.icons[id] = S.icons.map((v, k) => v || !!(save.icons[id] || [])[k]);
    save.best[id] = Math.min(save.best[id] || 1e9, Math.round(S.time));
    RUI.save(save);
    AU.play('clear');
    const last = S.idx === STAGES.length - 1;
    UI.story(`COURSE ${S.idx + 1} CLEAR · 배포 완료`, st.name,
      [UI.esc(st.clear), `<span class="muted">커밋 ${S.commits} · 기술 아이콘 ${S.icons.filter(Boolean).length}/3 · ${Math.round(S.time)}초</span>`],
      S.lv.icons.map((n, k) => UI.chip(n + (S.icons[k] ? ' ✔' : ' ·'), S.icons[k] ? 'exp' : '')),
      () => {
        AU.stopMusic();
        if (last) { S.mode = 'credits'; RUI.credits(C, STAGES, save, () => { S.mode = 'map'; }); return; }
        S.sel = Math.min(S.idx + 1, STAGES.length - 1); S.mode = 'map';
      }, last ? '엔딩 크레딧' : '월드맵으로');
  }

  function openNode(i) {
    const open = i === 0 || save.cleared.includes(STAGES[i - 1].id);
    if (!open) { UI.toast('아직 잠긴 코스입니다', '앞 코스를 먼저 클리어해 주세요', 'warn'); return; }
    startCourse(i);
  }

  // ---------- update & render ----------
  function update(dt) {
    S.time += dt; S.clock += dt;
    const zone = S.lv.ents.find((e) => e.type === 'ffwd' && pl.x > e.x0 * T && pl.x < e.x1 * T);
    S.ffwd = !!zone;
    const inp = input();
    updatePlayer(dt, inp);
    updateEntities(dt);
    if (S.mode !== 'play') return;
    updateEnemies(dt);
    updateBoss(dt);
    updateShots(dt);
    const tx = pl.x - viewW * 0.4, ty = pl.y - viewH * 0.55;
    cam.x += (Math.max(0, Math.min(S.lv.w * T - viewW, tx)) - cam.x) * Math.min(1, dt * 8);
    const maxY = S.lv.h * T - viewH;
    cam.y = maxY < 0 ? maxY : cam.y + (Math.max(0, Math.min(maxY, ty)) - cam.y) * Math.min(1, dt * 6);
  }

  function drawTiles() {
    const th = S.lv.theme;
    const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(S.lv.w - 1, Math.floor((cam.x + viewW) / T) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(S.lv.h - 1, Math.floor((cam.y + viewH) / T) + 1);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const ch = tile(x, y), px = x * T, py = y * T;
        if (ch === '.') continue;
        if (ch === '#') {
          const top = tile(x, y - 1) !== '#';
          ctx.fillStyle = th.ground; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#0002'; ctx.fillRect(px + ((x * 7 + y * 3) % 12), py + ((x * 5 + y) % 12), 2, 2);
          if (top) { ctx.fillStyle = th.top; ctx.fillRect(px, py, T, 4); ctx.fillStyle = '#fff3'; ctx.fillRect(px, py, T, 1); }
        } else if (ch === 'B' || ch === 'b' || ch === '?') {
          ctx.fillStyle = ch === '?' ? '#e8a82a' : ch === 'b' ? '#6b5a4a' : th.brick;
          ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#0004'; ctx.fillRect(px, py + T - 2, T, 2); ctx.fillRect(px + T - 2, py, 2, T);
          if (ch === 'B') { ctx.fillRect(px, py + 7, T, 1); ctx.fillRect(px + 8, py, 1, 7); ctx.fillRect(px + 4, py + 8, 1, 8); }
          if (ch === '?') { ctx.fillStyle = '#fff'; ctx.font = '900 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('?', px + 8, py + 12 + Math.sin(S.clock * 6) * 0.8); }
        } else if (ch === '=') {
          ctx.fillStyle = th.top; ctx.fillRect(px, py, T, 4); ctx.fillStyle = '#0005'; ctx.fillRect(px, py + 4, T, 2);
        } else if (ch === 'c') {
          const w = Math.abs(Math.sin(S.clock * 4 + x)) * 6 + 1;
          ctx.fillStyle = '#ffd23f'; ctx.fillRect(px + 8 - w / 2, py + 4, w, 8); ctx.fillStyle = '#fff8'; ctx.fillRect(px + 8 - w / 2, py + 4, 1, 8);
        } else if (ch === 'R') {
          ctx.fillStyle = th.ground; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = (Math.floor(S.clock * 12) + x) % 2 ? '#ffd23f' : '#ff9f43'; ctx.fillRect(px, py, T, 4);
          ctx.fillStyle = '#000'; ctx.font = '900 6px monospace'; ctx.textAlign = 'center'; ctx.fillText('»', px + 8, py + 10);
        } else if (ch === '>') {
          ctx.fillStyle = '#2a2d3a'; ctx.fillRect(px, py, T, T);
          ctx.fillStyle = '#6a6f88'; for (let k = 0; k < 4; k++) ctx.fillRect(px + ((k * 4 + S.clock * 30) % T), py + 1, 2, 3);
          ctx.fillStyle = th.top; ctx.fillRect(px, py + 5, T, 1);
        } else if (ch === 'X' || ch === 'x' || ch === 'k') {
          const shake = crumbling.has(x + ',' + y) ? (Math.random() - 0.5) * 2 : 0;
          ctx.fillStyle = ch === 'k' ? '#7f52ff' : '#8892bf'; ctx.fillRect(px + shake, py, T, T);
          ctx.fillStyle = '#fff'; ctx.font = '800 5px ui-monospace, monospace'; ctx.textAlign = 'center';
          ctx.fillText(ch === 'k' ? 'KT' : 'PHP', px + 8 + shake, py + 10);
        } else if (ch === 'D' && !S.doorOpen) {
          ctx.fillStyle = '#5a2a3a'; ctx.fillRect(px + 2, py, T - 4, T); ctx.fillStyle = '#ff7aa8'; ctx.fillRect(px + 6, py + 6, 4, 4);
        } else if (ch === 'W' && S.arenaLocked) {
          ctx.fillStyle = '#ff2a2a55'; ctx.fillRect(px + 4, py, 8, T);
        }
      }
    }
  }

  function drawBackground() {
    const th = S.lv.theme;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, innerWidth, innerHeight);
    const k = dpr * scale;
    // Far skyline with parallax.
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = th.far;
    const off = cam.x * 0.3, base = viewH - (S.lv.h * T - (S.lv.g + 1) * T) - (cam.y < 0 ? cam.y : 0) * 0;
    for (let i = -1; i < viewW / 40 + 2; i++) {
      const n = Math.floor(off / 40) + i, hgt = 30 + ((n * 7919) % 50);
      ctx.fillRect(i * 40 - (off % 40), base - hgt - 40, 34, hgt + 60);
    }
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (S.mode === 'map' || S.mode === 'credits' || !S.lv) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mapPos = RUI.drawMap(ctx, innerWidth, innerHeight, STAGES, save, S.sel, performance.now() / 1000);
      return;
    }
    drawBackground();
    const k = dpr * scale, sh = FX.shakeOffset();
    ctx.setTransform(k, 0, 0, k, -(cam.x + sh.x) * k, -(cam.y + sh.y) * k);
    drawTiles();
    drawEntities();
    FX.renderWorld(ctx);
    drawHud();
  }

  function drawEntities() {
    ctx.textAlign = 'center';
    for (const e of S.lv.ents) {
      const ex = e.x * T, ey = e.y * T;
      if (e.type === 'icon' && !e.done) {
        const bob = Math.sin(S.clock * 4 + e.x) * 2, label = S.lv.icons[e.idx];
        ctx.font = '800 6px -apple-system, "Apple SD Gothic Neo", sans-serif';
        const w = Math.max(18, ctx.measureText(label).width + 6);
        ctx.fillStyle = '#6be38b'; ctx.fillRect(ex + 8 - w / 2, ey + 2 + bob, w, 11);
        ctx.fillStyle = '#0b2a14'; ctx.fillText(label, ex + 8, ey + 10 + bob);
      }
      if (e.type === 'weapon' && !e.done) {
        ctx.fillStyle = '#c88bff'; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(S.clock * 6); ctx.beginPath(); ctx.arc(ex + 8, ey + 8, 10, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = '900 7px ui-monospace, monospace'; ctx.fillText(C.weapons[e.weapon].name, ex + 8, ey + 10);
      }
      if (e.type === 'checkpoint') {
        ctx.fillStyle = '#ddd'; ctx.fillRect(ex + 7, ey - 12, 2, 28);
        ctx.fillStyle = e.on ? '#6be38b' : '#888'; ctx.fillRect(ex + 9, ey - 12, 9, 6);
      }
      if (e.type === 'switch') {
        ctx.fillStyle = e.on ? '#6be38b' : '#ff7aa8'; ctx.fillRect(ex + 2, ey + (e.on ? 12 : 9), 12, e.on ? 4 : 7);
        ctx.fillStyle = '#fff'; ctx.font = '800 6px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(`${e.order + 1}.${e.label}`, ex + 8, ey + 4);
      }
      if (e.type === 'pulse') {
        const y = padY(e);
        ctx.fillStyle = '#ff6b6b'; ctx.fillRect(ex, y, e.w * T, 5);
        ctx.fillStyle = '#ffd0d0'; for (let i = 0; i < e.w * 4; i++) ctx.fillRect(ex + i * 4, y - 1 - Math.abs(Math.sin(S.clock * 8 + i)) * 3, 2, 1);
      }
      if (e.type === 'flag') {
        ctx.fillStyle = '#ddd'; ctx.fillRect(ex + 7, ey - 56, 3, 72);
        if (S.bossDead) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(ex + 10, ey - 56 + Math.sin(S.clock * 4) * 2, 18, 11); ctx.fillStyle = '#000'; ctx.font = '900 5px monospace'; ctx.fillText('DEPLOY', ex + 19, ey - 49); }
      }
      if (e.type === 'sign') drawSign(e, ex, ey);
      if (e.type === 'ffwd' && S.ffwd) { /* tint drawn in HUD */ }
    }
    for (const p of powers) {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#000'; ctx.font = '900 7px monospace'; ctx.fillText('★', p.x + 5, p.y + 8);
    }
    for (const e of enemies) {
      ctx.fillStyle = '#0005'; ctx.fillRect(e.x, e.y + e.h, e.w, 2);
      ctx.drawImage(SPR.mob(e.kind, stageColor(), e.flash > 0), Math.round(e.x), Math.round(e.y), e.w, e.h);
      if (Math.abs(e.x - pl.x) < 90) { ctx.fillStyle = '#ffffffc0'; ctx.font = '600 5px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(e.name, e.x + e.w / 2, e.y - 2); }
    }
    const b = S.boss;
    if (b && !S.bossDead) {
      if (b.tele > 0) { ctx.fillStyle = '#ff2a2a55'; ctx.fillRect(Math.min(b.x, pl.x), b.y + 10, Math.abs(pl.x - b.x) + 10, 10); }
      ctx.drawImage(SPR.boss(stageColor(), b.flash > 0), Math.round(b.x), Math.round(b.y), b.w, b.h);
      ctx.fillStyle = '#ffd23f'; ctx.font = '800 6px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillText(stageOf(S.idx).boss.name, b.x + b.w / 2, b.y - 3);
    }
    for (const w of waves) { ctx.fillStyle = '#ff5d5d'; ctx.fillRect(w.x - 4, w.y, 8, 8); ctx.fillStyle = '#ffd0d0'; ctx.fillRect(w.x - 1, w.y + 2, 2, 4); }
    for (const s of shots) { ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    if (!(pl.inv > 0 && Math.floor(S.clock * 20) % 2)) {
      ctx.save(); ctx.translate(Math.round(pl.x + pl.w / 2), Math.round(pl.y));
      if (pl.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(SPR.hero(pl.ground ? Math.floor(pl.walk) % 4 : 1), -6, -2, 12, 16);
      ctx.restore();
      if (pl.shield) { ctx.strokeStyle = '#4fc3ffaa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pl.x + 5, pl.y + 7, 11, 0, 7); ctx.stroke(); }
    }
  }

  function drawSign(e, ex, ey) {
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(ex + 6, ey + 4, 3, 12); ctx.fillStyle = '#c8a26a'; ctx.fillRect(ex, ey - 2, 16, 8);
    ctx.fillStyle = '#3a2a1a'; ctx.font = '900 6px monospace'; ctx.fillText('!', ex + 8, ey + 4);
    const text = signText(e.key);
    if (!text || Math.abs(pl.x - ex) > 70) return;
    ctx.font = '600 6px -apple-system, "Apple SD Gothic Neo", sans-serif';
    const lines = wrap(text, 120), w = 128, h = lines.length * 8 + 6, bx = ex + 8 - w / 2, by = ey - 10 - h;
    ctx.fillStyle = '#000c'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, ex + 8, by + 9 + i * 8));
  }
  function wrap(text, max) {
    const out = []; let line = '';
    for (const word of text.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > max && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function drawHud() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.ffwd) { ctx.fillStyle = '#ff2a2a14'; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.fillStyle = '#ff6b6b'; ctx.font = '900 18px monospace'; ctx.textAlign = 'right'; ctx.fillText('▶▶ x1.6', innerWidth - 16, 70); }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000a'; ctx.fillRect(10, 10, Math.min(360, innerWidth - 20), 44);
    ctx.font = '800 13px -apple-system, "Apple SD Gothic Neo", sans-serif'; ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${S.idx + 1}. ${stageOf(S.idx).name}`, 18, 28);
    ctx.fillStyle = '#ff5d5d'; ctx.fillText('♥'.repeat(Math.max(0, pl.hearts)) + '♡'.repeat(Math.max(0, 3 - pl.hearts)), 18, 46);
    ctx.fillStyle = '#fff'; ctx.font = '700 12px ui-monospace, Menlo, monospace';
    const icons = S.icons.map((v) => (v ? '■' : '□')).join('');
    ctx.fillText(`커밋 ${S.commits}  아이콘 ${icons}  ${pl.weapon ? C.weapons[pl.weapon].name : ''}`, 76, 46);
    const flags = [pl.speedT > 0 && '속도', pl.magnetT > 0 && '자석', pl.chainT > 0 && '연쇄', pl.shield && '보호막'].filter(Boolean).join(' · ');
    if (flags) { ctx.fillStyle = '#6be38b'; ctx.fillText(flags, 18, 70); }
    if (S.arenaLocked && S.boss && !S.bossDead) {
      const w = Math.min(320, innerWidth - 40), x = (innerWidth - w) / 2, y = innerHeight - (RUI.coarse ? 120 : 40);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, w + 6, 14);
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x, y, (w * Math.max(0, S.boss.hp)) / S.boss.max, 8);
    }
    RUI.drawButtons(ctx, innerWidth, innerHeight, touch);
  }

  // ---------- input wiring ----------
  let mapPos = [];
  addEventListener('keydown', (e) => {
    const k = UI.keyName(e);
    keys.add(k);
    if (S.mode === 'map') {
      const max = Math.min(save.cleared.length, STAGES.length - 1);
      if (k === 'arrowright' || k === 'arrowdown') S.sel = Math.min(max, S.sel + 1);
      if (k === 'arrowleft' || k === 'arrowup') S.sel = Math.max(0, S.sel - 1);
      if (k === 'enter' || k === ' ') openNode(S.sel);
    } else if (k === 'escape' && S.mode === 'play') { AU.stopMusic(); S.mode = 'map'; }
    // Stop page scrolling only while playing, so Space/Enter still press focused buttons in panels.
    if (S.mode === 'play' && [' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(UI.keyName(e)));
  addEventListener('blur', () => keys.clear());
  const ptrs = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    AU.init();
    if (S.mode === 'map') { const i = RUI.hitNode(mapPos, e.clientX, e.clientY); if (i >= 0) { S.sel = Math.min(i, save.cleared.length); openNode(i); } return; }
    const id = RUI.buttonAt(innerWidth, innerHeight, e.clientX, e.clientY);
    if (id) { ptrs.set(e.pointerId, id); touch[id] = true; canvas.setPointerCapture(e.pointerId); }
  });
  const release = (e) => { const id = ptrs.get(e.pointerId); if (id) { touch[id] = false; ptrs.delete(e.pointerId); } };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  document.getElementById('mapBtn').addEventListener('click', () => { AU.stopMusic(); UI.hide('story'); S.mode = 'map'; });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('커리어 런 진행 기록을 지울까요?')) return;
    save = { cleared: [], icons: {}, weapons: [], best: {} }; RUI.save(save); S.sel = 0; S.mode = 'map';
  });

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const raw = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    // In debug runs a test bot can take over stepping; the real-time loop then only renders.
    if (S.mode === 'play' && !(DEBUG && api.manual)) {
      const dt = raw * FX.timeScale() * (S.ffwd ? 1.6 : 1);
      update(dt / 2); if (S.mode === 'play') update(dt / 2);
    }
    FX.update(raw);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the URL.
  const api = { god: false, manual: false };
  if (DEBUG) {
    Object.defineProperties(api, { pl: { get: () => pl }, enemies: { get: () => enemies }, S: { get: () => S }, save: { get: () => save } });
    Object.assign(api, {
      start: startCourse, continueStory() { document.getElementById('storyBtn').click(); },
      step(n, dt, inp) { for (let i = 0; i < n && S.mode === 'play'; i++) { Object.assign(touch, inp || {}); update(dt); } },
      touch,
    });
    window.__run = api;
  }
})();
