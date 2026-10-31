// Tuning values: stage palettes, mob archetypes, drop rates and weapon evolutions.
window.GAME_CONFIG = (function () {
  const STAGE_COLORS = ['#7bd389', '#6fa8ff', '#ffb35c', '#c38bff', '#ff7aa8', '#59d6c9', '#ff6b6b'];
  const GROUNDS = [
    ['#1c2620', '#202b24', '#2c3a30'], ['#1b2130', '#1f2637', '#2b3550'], ['#29231d', '#2f2821', '#41372c'], ['#241d30', '#2a2237', '#3a2f4d'],
    ['#2c1d26', '#33222c', '#47303d'], ['#192a29', '#1d302f', '#284443'], ['#2b1c1c', '#322121', '#462e2e'],
  ];
  const KINDS = {
    bug:  { r: 4.5, hp: (k) => 5 + k * 4,   spd: (k) => 26 + k * 2, dmg: (k) => 5 + k,     xp: 1, w: 10, h: 9 },
    fast: { r: 3.5, hp: (k) => 3 + k * 2,   spd: (k) => 50 + k * 3, dmg: (k) => 4 + k,     xp: 1, w: 8,  h: 7 },
    tank: { r: 6.5, hp: (k) => 30 + k * 18, spd: (k) => 17 + k,     dmg: (k) => 10 + k * 2, xp: 5, w: 12, h: 12 },
  };
  const PICKUP_CHANCE = { bomb: 0.0016, magnet: 0.002, heal: 0.0022 };
  // An evolution replaces its base weapon once the base is maxed and the partner is owned.
  const EVOLUTIONS = [
    { id: 'strangler', from: 'php', needWeapon: 'kotlin' },
    { id: 'eventdriven', from: 'kotlin', needItem: 'kafka' },
    { id: 'agent', from: 'llm', needItem: 'websocket' },
  ];
  return { STAGE_COLORS, GROUNDS, KINDS, PICKUP_CHANCE, EVOLUTIONS };
})();
