// Pixel sprites as string maps. Each char is a palette key; '.' is transparent.
// Every sprite also has a white "flash" variant used for hit feedback.
window.SPRITES = (function () {
  const HERO_BASE = [
    '....hhhh....',
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..skkskkss..',
    '..swkswkss..',
    '..ssssssss..',
    '...ssmmss...',
    '...bbllbb...',
    '..bbbbbbbb..',
    '.sbbbbbbbbs.',
    '.s.bbbbbb.s.',
    '...pppppp...',
  ];
  const HERO_LEGS = [
    ['...pp..pp...', '...pp..pp...', '..oo....oo..'],
    ['...pp...pp..', '..pp....pp..', '..oo.....oo.'],
    ['...pp..pp...', '...pp..pp...', '..oo....oo..'],
    ['..pp...pp...', '..pp....pp..', '.oo.....oo..'],
  ];
  const HERO_PAL = { h: '#26262c', s: '#f1c49a', k: '#15151a', w: '#9fd3ff', m: '#c0705a', b: '#3d6fd8', l: '#e9eef8', p: '#2f3442', o: '#111318' };

  const MOBS = {
    bug: [
      '.a......a.',
      '..a....a..',
      '..cccccc..',
      '.cwecwecc.',
      '.cccccccc.',
      'cccddddccc',
      'c.cccccc.c',
      '..c.cc.c..',
      '.c..cc..c.',
    ],
    fast: [
      '...cc...',
      '..cccc..',
      '.cwecwe.',
      '.cccccc.',
      'cccccccc',
      'cc.cc.cc',
      'c..c..c.',
    ],
    tank: [
      '..dddddddd..',
      '.dccccccccd.',
      'dccccccccccd',
      'dcwwccccwwcd',
      'dcweccccwecd',
      'dccccccccccd',
      'dccddddddccd',
      'dccdrrrrdccd',
      'dccccccccccd',
      '.dccccccccd.',
      '..dd....dd..',
      '..dd....dd..',
    ],
  };

  const BOSS = [
    '...y..y..y......',
    '...yy.yy.yy.....',
    '...yyyyyyyy.....',
    '..cccccccccc....',
    '.cccccccccccc...',
    'cccwwcccccwwcc..',
    'cccwrcccccwrcc..',
    'cccccccccccccc..',
    'cccccccccccccc..',
    'cccdddddddddcc..',
    'ccccdcdcdcdccc..',
    '.cccccccccccc...',
    '.cccccccccccc...',
    '..cc..cc..cc....',
    '..cc..cc..cc....',
  ];

  const PICKUPS = {
    bomb: ['..ffff..', '.frrrrf.', 'frryyrrf', 'fryyyyrf', 'fryyyyrf', 'frryyrrf', '.frrrrf.', '..ffff..'],
    magnet: ['.bb..bb.', '.bb..bb.', '.bb..bb.', '.bb..bb.', '.bbbbbb.', '..bbbb..', '.ww..ww.', '.ww..ww.'],
    heal: ['..gggg..', '..gwwg..', 'gggwwggg', 'gwwwwwwg', 'gwwwwwwg', 'gggwwggg', '..gwwg..', '..gggg..'],
  };
  const PICKUP_PAL = { f: '#2b1b12', r: '#ff5d3a', y: '#ffe066', b: '#4fc3ff', w: '#ffffff', g: '#3fbf6a' };

  function render(map, palette, flash) {
    const h = map.length, w = map[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = map[y][x];
        if (k === '.' || !palette[k]) continue;
        g.fillStyle = flash ? '#ffffff' : palette[k];
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, v + amt));
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }

  const cache = new Map();
  function cached(key, make) {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  }

  return {
    shade,
    hero(frame) {
      return cached('hero' + frame, () => render(HERO_BASE.concat(HERO_LEGS[frame % HERO_LEGS.length]), HERO_PAL, false));
    },
    mob(kind, color, flash) {
      return cached(`mob${kind}${color}${flash ? 1 : 0}`, () =>
        render(MOBS[kind] || MOBS.bug, { c: color, a: shade(color, -40), e: '#111', w: '#fff', d: shade(color, -70), r: '#ff4040' }, flash));
    },
    boss(color, flash) {
      return cached(`boss${color}${flash ? 1 : 0}`, () =>
        render(BOSS, { c: color, e: '#111', w: '#fff', r: '#ff2a2a', d: shade(color, -70), y: '#ffd23f' }, flash));
    },
    pickup(kind) {
      return cached('pk' + kind, () => render(PICKUPS[kind], PICKUP_PAL, false));
    },
  };
})();
