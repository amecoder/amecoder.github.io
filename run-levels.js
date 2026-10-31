// Career Run course builder: each course is assembled from small chunks into a tile grid.
// Tiles: '#' ground, 'B' brick, '?' question block, 'b' used block, 'c' commit coin, '=' one-way platform,
// 'R' pipeline rail (speed boost), '>' conveyor, 'X'/'x' crumbling tiles, 'k' Kotlin tile, 'D' door, 'W' arena wall.
window.RUN_LEVELS = (function () {
  const THEMES = {
    live:     { sky: ['#1d2b4f', '#3b5a8f'], ground: '#4a7a4f', top: '#7bd389', brick: '#8a5a3a', far: '#28406b' },
    vod:      { sky: ['#140f26', '#3a2d5c'], ground: '#3a3f5c', top: '#6fa8ff', brick: '#5b4a8a', far: '#2a2348' },
    hr:       { sky: ['#2a1e14', '#6b4a2a'], ground: '#6b5a3a', top: '#ffb35c', brick: '#8a4a2a', far: '#4a3420' },
    webtoon:  { sky: ['#1b1430', '#5a3a7a'], ground: '#4a3a6a', top: '#c38bff', brick: '#6a3a8a', far: '#2e2148' },
    lang:     { sky: ['#1e2a1a', '#5a6a2a'], ground: '#5a5a2a', top: '#f2d16b', brick: '#8a7a2a', far: '#3a4220' },
    talent:   { sky: ['#2a1420', '#7a3a5a'], ground: '#6a3a4a', top: '#ff7aa8', brick: '#8a3a5a', far: '#4a2034' },
    health:   { sky: ['#122a1a', '#3a7a4a'], ground: '#3a6a4a', top: '#8fe0a0', brick: '#2a7a4a', far: '#1e4a2c' },
    brand:    { sky: ['#0f2427', '#2a5a5c'], ground: '#2a4a4c', top: '#59d6c9', brick: '#5a6a7a', far: '#183a3c' },
    ai:       { sky: ['#1a0f14', '#5a1e2a'], ground: '#4a2a32', top: '#ff6b6b', brick: '#7a3a3a', far: '#3a1a22' },
  };

  function builder(h) {
    const b = { h, g: h - 3, grid: [], ents: [], q: {}, crumble: [] };
    b.ensure = (x) => { while (b.grid.length <= x) b.grid.push(new Array(h).fill('.')); };
    b.put = (x, y, ch) => { b.ensure(x); if (y >= 0 && y < h) b.grid[x][y] = ch; };
    b.get = (x, y) => (b.grid[x] && b.grid[x][y]) || '.';
    b.x = () => b.grid.length;
    b.fill = (x, top) => { for (let y = top; y < h; y++) b.put(x, y, '#'); };
    b.ent = (e) => b.ents.push(e);
    return b;
  }

  // ---------- chunks ----------
  function flat(b, n, o = {}) {
    const x0 = b.x(), top = o.top == null ? b.g : o.top;
    for (let i = 0; i < n; i++) b.fill(x0 + i, top);
    (o.enemies || []).forEach((k, i) => b.ent({ type: 'enemy', kind: k, x: x0 + 3 + Math.floor(((i + 1) * (n - 4)) / ((o.enemies.length || 1) + 1)), y: top - 1 }));
    if (o.coins) for (let i = 2; i < n - 2; i += 2) b.put(x0 + i, top - 2, 'c');
    return x0;
  }
  function gap(b, n) { const x0 = b.x(); for (let i = 0; i < n; i++) b.ensure(x0 + i); return x0; }
  function qrow(b, x, y, powers, bricks = 2) {
    for (let i = -bricks; i < powers.length + bricks; i++) {
      const xi = x + i;
      if (i >= 0 && i < powers.length) { b.put(xi, y, '?'); b.q[xi + ',' + y] = powers[i]; } else b.put(xi, y, 'B');
    }
  }
  // The tallest step is 3 tiles wide so a running jump up the stairs can still land before a following gap.
  function stairs(b, steps, dir, o = {}) {
    const x0 = b.x();
    let x = x0;
    for (let i = 0; i < steps; i++) {
      const hgt = dir > 0 ? i + 1 : steps - i, wide = hgt === steps ? 3 : 2;
      for (let k = 0; k < wide; k++) b.fill(x + k, b.g - hgt + 1);
      if (o.coins) b.put(x, b.g - hgt - 1, 'c');
      x += wide;
    }
    return x0;
  }
  function floating(b, n, y, coins) {
    const x0 = b.x();
    for (let i = 0; i < n; i++) { b.ensure(x0 + i); b.put(x0 + i, y, '='); if (coins) b.put(x0 + i, y - 1, 'c'); }
    return x0;
  }
  function islandHop(b, count, coins) {
    for (let i = 0; i < count; i++) {
      gap(b, 3);
      const y = b.g - 2 - (i % 2) * 2;
      floating(b, 4, y, coins);
    }
    gap(b, 3);
  }
  function rail(b, n) { const x0 = flat(b, n); for (let i = 1; i < n - 1; i++) b.put(x0 + i, b.g, 'R'); return x0; }
  function conveyor(b, n, enemies) { const x0 = flat(b, n, { enemies }); for (let i = 0; i < n; i++) b.put(x0 + i, b.g, '>'); return x0; }
  // 'X' crumbles into a Kotlin tile (Strangler Fig); 'x' crumbles away for good.
  function crumbleBridge(b, n, ch = 'X') {
    const x0 = b.x();
    for (let i = 0; i < n; i++) { b.ensure(x0 + i); b.put(x0 + i, b.g, ch); }
    return x0;
  }
  function sign(b, x, key, text) { b.ent({ type: 'sign', x, y: b.g - 1, key, text }); }
  function icon(b, x, y, idx) { b.ent({ type: 'icon', x, y, idx }); }
  function checkpoint(b) { const x = b.x(); flat(b, 4); b.ent({ type: 'checkpoint', x: x + 2, y: b.g - 1 }); }
  function arena(b) {
    const x0 = b.x();
    flat(b, 26);
    for (let y = b.g - 9; y < b.g; y++) { b.put(x0, y, 'W'); b.put(x0 + 25, y, 'W'); }
    b.ent({ type: 'boss', x: x0 + 18, y: b.g - 2, arenaX0: x0, arenaX1: x0 + 25 });
    b.ent({ type: 'flag', x: x0 + 23, y: b.g - 1 });
    flat(b, 6);
    return x0;
  }
  function pulsePads(b, count) {
    for (let i = 0; i < count; i++) {
      gap(b, 2);
      const x = b.x();
      gap(b, 5);
      b.ent({ type: 'pulse', x, y: b.g - 1, w: 5, amp: 1.3, phase: i * 0.9 });
    }
    gap(b, 2);
  }
  function tower(b, levels) {
    // Comic-panel climb: zigzag one-way panels upward, then a long walkway and a drop back down.
    const x0 = b.x();
    flat(b, 26);
    for (let i = 0; i < levels; i++) {
      const y = b.g - 3 - i * 3, x = x0 + (i % 2 ? 13 : 7);
      for (let k = 0; k < 9; k++) { b.put(x + k, y, '='); if (k % 2) b.put(x + k, y - 1, 'c'); }
    }
    // A last ledge reaches the walkway wall so the top panel connects to the high road.
    for (let k = 21; k < 26; k++) b.put(x0 + k, b.g - 3 - (levels - 1) * 3, '=');
    return { x0, topY: b.g - 3 - (levels - 1) * 3 };
  }
  function switchGate(b, labels) {
    const x0 = flat(b, 22);
    labels.forEach((label, i) => b.ent({ type: 'switch', x: x0 + 3 + i * 5, y: b.g - 1, order: i, label }));
    for (let y = b.g - 6; y < b.g; y++) b.put(x0 + 19, y, 'D');
    return x0;
  }

  // ---------- courses ----------
  // Each course: themed chunks + 3 hidden tech icons + a boss arena. Height in tiles.
  const COURSES = {
    live(b) {
      flat(b, 16, { coins: true });
      sign(b, 4, 'start', '');
      qrow(b, 10, b.g - 4, ['mysql']);
      flat(b, 12, { enemies: ['bug', 'bug'] });
      stairs(b, 4, 1, { coins: true }); gap(b, 3); stairs(b, 4, -1);
      icon(b, b.x() - 4, b.g - 6, 0);
      flat(b, 14, { enemies: ['fast', 'bug'], coins: true });
      qrow(b, b.x() - 8, b.g - 4, ['memcached'], 1);
      checkpoint(b);
      // Concurrent-user graph: rising steps that spike before the boss.
      sign(b, b.x() + 1, 'graph', '');
      stairs(b, 6, 1, { coins: true });
      icon(b, b.x() - 1, b.g - 9, 1);
      gap(b, 3); flat(b, 10, { top: b.g - 3, enemies: ['tank'] });
      gap(b, 3); flat(b, 10, { enemies: ['bug', 'fast'] });
      islandHop(b, 2, true);
      icon(b, b.x() - 5, b.g - 6, 2);
      flat(b, 8);
      arena(b);
    },
    vod(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      conveyor(b, 18, ['bug', 'fast']);
      icon(b, b.x() - 4, b.g - 4, 0);
      gap(b, 3); flat(b, 10, { enemies: ['bug'] });
      qrow(b, b.x() - 6, b.g - 4, ['elasticsearch', 'aws']);
      islandHop(b, 2, true);
      checkpoint(b);
      // Late switch from PHP to Java: the Java power sits at the turning point.
      sign(b, b.x() + 1, 'java', '');
      flat(b, 10);
      b.ent({ type: 'weapon', x: b.x() - 5, y: b.g - 1, weapon: 'java' });
      icon(b, b.x() - 2, b.g - 6, 1);
      conveyor(b, 16, ['tank', 'bug', 'fast']);
      gap(b, 3); flat(b, 12, { enemies: ['bug', 'bug'], coins: true });
      qrow(b, b.x() - 7, b.g - 4, ['drm']);
      icon(b, b.x() - 3, b.g - 7, 2);
      arena(b);
    },
    hr(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      // Cache hits: a row of question blocks that keep paying out commits.
      flat(b, 16, { enemies: ['bug', 'fast'] });
      sign(b, b.x() - 15, 'cache', '');
      qrow(b, b.x() - 12, b.g - 4, ['coins', 'redis', 'coins'], 1);
      icon(b, b.x() - 3, b.g - 7, 0);
      islandHop(b, 3, true);
      flat(b, 12, { enemies: ['tank'] });
      qrow(b, b.x() - 6, b.g - 4, ['zend']);
      checkpoint(b);
      stairs(b, 3, 1); gap(b, 4); stairs(b, 3, -1);
      icon(b, b.x() - 9, b.g - 7, 1);
      flat(b, 14, { enemies: ['fast', 'fast', 'bug'], coins: true });
      rail(b, 14);
      icon(b, b.x() - 4, b.g - 5, 2);
      gap(b, 4); flat(b, 6);
      arena(b);
    },
    webtoon(b) {
      flat(b, 10, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 7, b.g - 4, ['nginx']);
      flat(b, 8, { enemies: ['bug'] });
      sign(b, b.x() + 1, 'climb', '');
      const t = tower(b, 6);
      icon(b, t.x0 + 20, t.topY - 2, 0);
      b.ent({ type: 'enemy', kind: 'bug', x: t.x0 + 10, y: b.g - 1 });
      flat(b, 4, { top: t.topY + 1 });
      for (let i = 0; i < 18; i++) { b.put(b.x() - 1, t.topY + 1, '#'); flat(b, 1, { top: t.topY + 1 }); }
      b.ent({ type: 'enemy', kind: 'fast', x: b.x() - 8, y: t.topY });
      qrow(b, b.x() - 12, t.topY - 3, ['sphinx']);
      icon(b, b.x() - 3, t.topY - 2, 1);
      stairs(b, 6, -1);
      checkpoint(b);
      flat(b, 14, { enemies: ['tank', 'bug'], coins: true });
      qrow(b, b.x() - 8, b.g - 4, ['elk']);
      islandHop(b, 2, false);
      icon(b, b.x() - 5, b.g - 6, 2);
      flat(b, 6);
      arena(b);
    },
    lang(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 8, b.g - 4, ['oracle']);
      flat(b, 16, { enemies: ['bug', 'fast', 'bug'] });
      icon(b, b.x() - 6, b.g - 7, 0);
      // Enrollment rush: a wave of fast errors on a long conveyor.
      sign(b, b.x() + 1, 'rush', '');
      conveyor(b, 20, ['fast', 'fast', 'fast', 'tank']);
      checkpoint(b);
      islandHop(b, 3, true);
      icon(b, b.x() - 6, b.g - 7, 1);
      flat(b, 12, { enemies: ['tank'] });
      qrow(b, b.x() - 7, b.g - 4, ['refund']);
      stairs(b, 4, 1, { coins: true }); gap(b, 3); stairs(b, 4, -1);
      icon(b, b.x() - 8, b.g - 8, 2);
      flat(b, 6);
      arena(b);
    },
    talent(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 8, b.g - 4, ['pg']);
      flat(b, 12, { enemies: ['bug', 'fast'] });
      icon(b, b.x() - 4, b.g - 7, 0);
      // Payment → settlement → tax: switches must be pressed in order to open the gate.
      sign(b, b.x() + 1, 'switch', '');
      switchGate(b, ['결제', '정산', '세금']);
      checkpoint(b);
      flat(b, 14, { enemies: ['tank', 'bug'], coins: true });
      qrow(b, b.x() - 8, b.g - 4, ['settlement']);
      islandHop(b, 2, true);
      icon(b, b.x() - 5, b.g - 6, 1);
      rail(b, 12);
      gap(b, 4); flat(b, 10, { enemies: ['fast', 'fast'] });
      icon(b, b.x() - 5, b.g - 5, 2);
      arena(b);
    },
    health(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 8, b.g - 4, ['mvp']);
      flat(b, 14, { enemies: ['fast', 'bug'] });
      icon(b, b.x() - 6, b.g - 7, 0);
      // The business closes: the bridge collapses, and the lesson waits below.
      sign(b, b.x() + 1, 'collapse', '');
      flat(b, 4);
      const x = crumbleBridge(b, 14, 'x');
      for (let i = 0; i < 14; i++) b.fill(x + i, b.h - 1);
      icon(b, x + 7, b.h - 2, 1);
      stairs(b, 3, 1);
      checkpoint(b);
      flat(b, 14, { enemies: ['tank', 'fast'], coins: true });
      islandHop(b, 2, true);
      icon(b, b.x() - 5, b.g - 6, 2);
      flat(b, 6);
      arena(b);
    },
    brand(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 8, b.g - 4, ['kafka', 'dynamodb']);
      flat(b, 14, { enemies: ['bug', 'tank'] });
      b.ent({ type: 'weapon', x: b.x() - 4, y: b.g - 1, weapon: 'kotlin' });
      icon(b, b.x() - 8, b.g - 7, 0);
      // Strangler Fig: PHP tiles crumble one by one and Kotlin tiles take their place.
      sign(b, b.x() + 1, 'strangler', '');
      flat(b, 3);
      crumbleBridge(b, 22);
      icon(b, b.x() - 11, b.g - 4, 1);
      flat(b, 4);
      checkpoint(b);
      conveyor(b, 14, ['fast', 'bug', 'fast']);
      qrow(b, b.x() - 8, b.g - 4, ['docker', 'iac']);
      islandHop(b, 2, true);
      rail(b, 12);
      flat(b, 10, { enemies: ['tank', 'tank'] });
      icon(b, b.x() - 4, b.g - 6, 2);
      arena(b);
    },
    ai(b) {
      flat(b, 12, { coins: true });
      sign(b, 3, 'start', '');
      qrow(b, 8, b.g - 4, ['websocket', 'gpu']);
      flat(b, 12, { enemies: ['bug', 'fast'] });
      b.ent({ type: 'weapon', x: b.x() - 3, y: b.g - 1, weapon: 'llm' });
      icon(b, b.x() - 7, b.g - 7, 0);
      // Voice-wave pads bob to the beat.
      sign(b, b.x() + 1, 'wave', '');
      pulsePads(b, 4);
      icon(b, b.x() - 10, b.g - 8, 1);
      flat(b, 4);
      checkpoint(b);
      // Fast-forward zone: the playback speed doubles here.
      sign(b, b.x() + 1, 'ffwd', '');
      const x = flat(b, 30, { enemies: ['fast', 'bug', 'fast', 'tank'], coins: true });
      b.ent({ type: 'ffwd', x0: x + 2, x1: x + 28 });
      qrow(b, b.x() - 10, b.g - 4, ['security', 'dmn']);
      islandHop(b, 2, true);
      icon(b, b.x() - 5, b.g - 6, 2);
      arena(b);
    },
  };

  // Tech icons collected in each course (names come from the player's actual stack per job).
  const ICONS = {
    live: ['PHP', 'MySQL', 'Memcached'], vod: ['Elasticsearch', 'C++', 'Java'], hr: ['Zend', 'Redis', 'CRM 자동화'],
    webtoon: ['Nginx', 'Sphinx', 'ELK'], lang: ['Java Spring', 'Oracle', '환불 규정'], talent: ['PG 연동', '정산', '세금 계산'],
    health: ['풀스택', '고객 수요 검증', 'MVP'], brand: ['Kotlin', 'Kafka', 'DynamoDB'], ai: ['LLM', 'WebSocket', 'DMN'],
  };

  function build(id) {
    const h = id === 'webtoon' ? 34 : 16;
    const b = builder(h);
    COURSES[id](b);
    const grid = b.grid;
    // Pad the end so the camera never shows outside the level.
    for (let i = 0; i < 12; i++) b.fill(b.x(), b.g);
    return { id, w: grid.length, h, g: b.g, grid, ents: b.ents, q: b.q, theme: THEMES[id], icons: ICONS[id] };
  }

  return { build, ids: Object.keys(COURSES), THEMES };
})();
