// Sound, all synthesized with WebAudio — no audio files, no network.
// Engine hum, two-tone sirens, gunshots, pickups and a small sun-soaked music loop.
export function createAudio() {
  const audio = {
    ctx: null, muted: false, musicTimer: 0, musicStep: 0,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    started: false,
  };

  function ensure() {
    if (audio.ctx) return audio.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
      // Engine: a low sawtooth whose pitch follows speed.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const engineFilter = audio.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      audio.engineOsc.connect(engineFilter).connect(audio.engineGain).connect(audio.ctx.destination);
      audio.engineOsc.start();
      // Siren: two alternating tones.
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'triangle';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain).connect(audio.ctx.destination);
      audio.sirenOsc.start();
      audio.started = true;
    } catch {
      audio.ctx = null;
    }
    return audio.ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audio.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!audio.ctx || audio.muted) return;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buf;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = audio.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(audio.ctx.destination);
    src.start();
  }

  audio.unlock = function unlock() {
    ensure();
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.ctx) {
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      if (audio.sirenGain) audio.sirenGain.gain.value = 0;
    }
    return audio.muted;
  };

  // Called every frame: engine pitch from speed, siren wail from wanted level.
  audio.frame = function frame(speed, wanted, dt) {
    if (!audio.ctx || audio.muted || !audio.started) return;
    if (audio.engineGain) {
      const target = speed > 4 ? 0.028 + Math.min(0.05, Math.abs(speed) / 9000) : 0;
      audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.08);
      audio.engineOsc.frequency.setTargetAtTime(52 + Math.abs(speed) * 0.42, audio.ctx.currentTime, 0.08);
    }
    if (audio.sirenGain) {
      const target = wanted > 0 ? 0.035 : 0;
      audio.sirenGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.2);
      const phase = (audio.ctx.currentTime % 0.9) < 0.45 ? 720 : 960;
      audio.sirenOsc.frequency.setTargetAtTime(phase, audio.ctx.currentTime, 0.05);
    }
    // A lazy bass-and-keys loop: two chords, one bar each.
    audio.musicTimer -= dt;
    if (audio.musicTimer <= 0) {
      audio.musicTimer = 0.42;
      const chords = [[110, 164.8, 220], [98, 146.8, 196]];
      const chord = chords[Math.floor(audio.musicStep / 4) % 2];
      const note = chord[audio.musicStep % 3];
      tone(note, 0.4, 'sine', 0.045);
      if (audio.musicStep % 4 === 0) tone(chord[0] / 2, 0.5, 'triangle', 0.06);
      if (audio.musicStep % 8 === 6) tone(chord[2] * 2, 0.18, 'sine', 0.03);
      audio.musicStep += 1;
    }
  };

  audio.shot = function shot() { noise(0.16, 0.5, 2400); tone(180, 0.1, 'square', 0.16, 0, 60); };
  audio.thud = function thud() { noise(0.1, 0.35, 500); };
  audio.swish = function swish() { noise(0.08, 0.12, 1800); };
  audio.pickup = function pickup() { tone(660, 0.12, 'sine', 0.2); tone(990, 0.2, 'sine', 0.2, 0.1); };
  audio.blip = function blip() { tone(520, 0.09, 'sine', 0.18); };
  audio.crash = function crash() { noise(0.3, 0.5, 900); tone(90, 0.25, 'sawtooth', 0.2, 0, 40); };
  audio.jingle = function jingle() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.2, i * 0.11));
  };
  audio.fail = function fail() {
    [330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.16));
  };
  audio.sirenBlip = function sirenBlip() { tone(880, 0.18, 'triangle', 0.14, 0, 660); };

  return audio;
}
