// Synthesized sound effects and a small chiptune sequencer (WebAudio, no audio files).
window.AUDIO = (function () {
  const KEY = 'profile-game-muted';
  let ac = null, master, sfx, music, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* storage unavailable */ }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
    music = ac.createGain(); music.gain.value = 0.32; music.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(out, { type = 'square', f = 440, f2 = null, at = 0, dur = 0.08, vol = 0.2 }) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(out, { at = 0, dur = 0.1, vol = 0.2, freq = 2000, q = 0.8 }) {
    const t = ac.currentTime + at;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.02);
  }

  // Per-sound rate limits keep hordes from turning into white noise.
  const last = {};
  const LIMIT = { shoot: 0.06, hit: 0.035, pop: 0.03, gem: 0.025, hurt: 0.25 };
  let gemPitch = 0, gemReset = 0;

  function play(name) {
    if (!ac || muted) return;
    const now = ac.currentTime;
    if (LIMIT[name] && last[name] && now - last[name] < LIMIT[name]) return;
    last[name] = now;
    switch (name) {
      case 'shoot': tone(sfx, { type: 'square', f: 880, f2: 520, dur: 0.05, vol: 0.025 }); break;
      case 'hit': noise(sfx, { dur: 0.04, vol: 0.06, freq: 3200 }); break;
      case 'pop':
        tone(sfx, { type: 'square', f: 300 + Math.random() * 200, f2: 60, dur: 0.09, vol: 0.06 });
        noise(sfx, { dur: 0.07, vol: 0.05, freq: 900 });
        break;
      case 'gem':
        if (now - gemReset > 0.6) gemPitch = 0;
        gemReset = now; gemPitch = Math.min(gemPitch + 1, 18);
        tone(sfx, { type: 'triangle', f: 660 * Math.pow(2, gemPitch / 24), dur: 0.06, vol: 0.05 });
        break;
      case 'hurt': tone(sfx, { type: 'sawtooth', f: 180, f2: 70, dur: 0.18, vol: 0.12 }); break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, i) => tone(sfx, { type: 'square', f, at: i * 0.06, dur: 0.12, vol: 0.08 }));
        break;
      case 'pickup': [880, 1320].forEach((f, i) => tone(sfx, { type: 'triangle', f, at: i * 0.07, dur: 0.12, vol: 0.1 })); break;
      case 'bomb':
        noise(sfx, { dur: 0.7, vol: 0.35, freq: 400, q: 0.4 });
        tone(sfx, { type: 'sine', f: 120, f2: 30, dur: 0.6, vol: 0.4 });
        break;
      case 'boss':
        [0, 0.25, 0.5].forEach((at) => tone(sfx, { type: 'sawtooth', f: 220, f2: 160, at, dur: 0.2, vol: 0.12 }));
        tone(sfx, { type: 'sine', f: 60, dur: 1.2, vol: 0.3 });
        break;
      case 'dash': noise(sfx, { dur: 0.25, vol: 0.12, freq: 600 }); break;
      case 'evolve':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(sfx, { type: 'square', f, at: i * 0.05, dur: 0.16, vol: 0.08 }));
        break;
      case 'clear':
        [523, 523, 784, 1046].forEach((f, i) => tone(sfx, { type: 'square', f, at: i * 0.11, dur: 0.18, vol: 0.09 }));
        break;
    }
  }

  // ---------- music ----------
  const SCALES = [
    [57, 60, 64, 65], [55, 58, 62, 63], [53, 57, 60, 62], [50, 53, 57, 58], [52, 55, 59, 60], [48, 51, 55, 58], [45, 48, 52, 55],
  ];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let seqTimer = null, step = 0, nextTime = 0, stageIdx = 0, intense = false;

  function scheduleStep(t) {
    const root = SCALES[stageIdx % SCALES.length];
    const bar = Math.floor(step / 16) % 4, s = step % 16;
    const chord = [0, 2, 3, 1][bar];
    const base = root[chord];
    if (s % 4 === 0) {
      tone(music, { type: 'triangle', f: midi(base - 12), at: t - ac.currentTime, dur: 0.22, vol: 0.22 });
    }
    if (s % 2 === 0) {
      const arp = [0, 3, 7, 12][(s / 2) % 4] + (bar % 2 ? 0 : 0);
      tone(music, { type: 'square', f: midi(base + 12 + arp), at: t - ac.currentTime, dur: 0.09, vol: intense ? 0.06 : 0.045 });
    }
    if (intense || s % 4 === 2) noise(music, { at: t - ac.currentTime, dur: 0.03, vol: intense ? 0.05 : 0.035, freq: 8000, q: 1 });
    if (s === 0 || s === 8) noise(music, { at: t - ac.currentTime, dur: 0.09, vol: 0.09, freq: 150, q: 0.6 });
  }

  function startMusic(idx) {
    if (!ac) return;
    stageIdx = idx; intense = false;
    if (seqTimer) return;
    step = 0; nextTime = ac.currentTime + 0.05;
    const stepDur = 60 / 138 / 4;
    seqTimer = setInterval(() => {
      while (nextTime < ac.currentTime + 0.12) { if (!muted) scheduleStep(nextTime); nextTime += stepDur; step++; }
    }, 25);
  }
  function stopMusic() { clearInterval(seqTimer); seqTimer = null; }

  return {
    init, play, startMusic, stopMusic,
    setStage(i) { stageIdx = i; intense = false; },
    setIntense(v) { intense = v; },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
  };
})();
