const NOTES = Object.freeze({
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
});

const SONGS = Object.freeze({
  title: {
    tempo: 290,
    lead: ["C4", null, "G4", "E4", "A4", null, "G4", null, "F4", "E4", "D4", null, "G4", null, null, null],
    bass: ["C3", null, null, null, "A3", null, null, null, "F3", null, null, null, "G3", null, null, null],
  },
  field: {
    tempo: 220,
    lead: ["C4", "E4", "G4", "A4", "G4", "E4", "D4", "E4", "F4", "A4", "G4", "E4", "D4", "G4", "C5", null],
    bass: ["C3", null, "G3", null, "A3", null, "E3", null, "F3", null, "C3", null, "G3", null, "G3", null],
  },
  town: {
    tempo: 260,
    lead: ["E4", "G4", "C5", null, "B4", "A4", "G4", null, "F4", "A4", "D5", null, "C5", "B4", "G4", null],
    bass: ["C3", null, "E3", null, "G3", null, "E3", null, "F3", null, "A3", null, "G3", null, "G3", null],
  },
  cave: {
    tempo: 340,
    lead: ["C4", null, "D4", null, "E4", "D4", null, null, "A3", null, "C4", null, "B3", null, null, null],
    bass: ["C3", null, null, "C3", null, null, "G3", null, "A3", null, null, "A3", null, "G3", null, null],
  },
  battle: {
    tempo: 155,
    lead: ["E4", "G4", "A4", "E4", "D4", "E4", "G4", "B4", "A4", "G4", "E4", "D4", "F4", "A4", "G4", "D4"],
    bass: ["A3", null, "A3", null, "F3", null, "G3", null, "A3", null, "C3", null, "F3", null, "G3", null],
  },
  boss: {
    tempo: 175,
    lead: ["C4", "D4", "E4", "G4", "F4", "E4", "D4", "B3", "C4", "E4", "G4", "B4", "A4", "G4", "F4", "D4"],
    bass: ["C3", "C3", null, "G3", "A3", "A3", null, "E3", "F3", "F3", null, "C3", "G3", "G3", null, "G3"],
  },
  clear: {
    tempo: 280,
    lead: ["C4", "E4", "G4", "C5", "E5", null, "D5", "C5", "G4", "A4", "C5", "E5", "D5", "G5", null, null],
    bass: ["C3", null, "E3", null, "F3", null, "G3", null, "A3", null, "F3", null, "G3", null, "C3", null],
  },
});

export class AudioEngine {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.context = null;
    this.master = null;
    this.current = null;
    this.timer = null;
    this.step = 0;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    this.updateVolume();
  }

  updateVolume() {
    if (!this.master) return;
    const settings = this.getSettings();
    this.master.gain.value = Math.max(0, settings.master * settings.bgm * 0.11);
  }

  tone(frequency, duration, type = "square", volume = 1, destination = this.master) {
    if (!this.context || !frequency || !destination) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }

  play(name) {
    if (this.current === name) return;
    this.stop();
    this.current = name;
    this.step = 0;
    if (!this.context || !SONGS[name]) return;
    const song = SONGS[name];
    const tick = () => {
      if (this.current !== name) return;
      this.updateVolume();
      const settings = this.getSettings();
      if (settings.master > 0 && settings.bgm > 0) {
        const lead = song.lead[this.step % song.lead.length];
        const bass = song.bass[this.step % song.bass.length];
        if (lead) this.tone(NOTES[lead], song.tempo / 1120, "square", 0.5);
        if (bass) this.tone(NOTES[bass], song.tempo / 800, "triangle", 0.75);
      }
      this.step += 1;
    };
    tick();
    this.timer = window.setInterval(tick, song.tempo);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  sfx(name = "ok") {
    this.unlock();
    if (!this.context) return;
    const settings = this.getSettings();
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, settings.master * settings.sfx * 0.13);
    gain.connect(this.context.destination);
    const sounds = {
      ok: [620, 0.055, "square"],
      cancel: [280, 0.07, "square"],
      no: [155, 0.12, "sawtooth"],
      hit: [95, 0.11, "sawtooth"],
      magic: [760, 0.18, "sine"],
      heal: [980, 0.22, "triangle"],
      chest: [660, 0.28, "square"],
      save: [520, 0.3, "triangle"],
      win: [880, 0.42, "triangle"],
      step: [110, 0.025, "square"],
    };
    const [frequency, duration, type] = sounds[name] || sounds.ok;
    this.tone(frequency, duration, type, 0.8, gain);
    if (name === "chest" || name === "win")
      window.setTimeout(
        () => this.tone(frequency * 1.5, duration * 0.7, type, 0.65, gain),
        90,
      );
  }
}
