(() => {
  'use strict';

  const SETTINGS_KEY = 'hinata-senki-audio-v1';
  const DEFAULTS = { enabled:true, bgm:true, sfx:true, volume:0.46 };
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  let settings = loadSettings();
  let context = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let noiseBuffer = null;
  let unlocked = false;
  let schedulerTimer = null;
  let currentTrack = '';
  let nextStepTime = 0;
  let stepIndex = 0;
  let lastPhase = '';
  let lastModalTitle = '';
  let dock = null;
  let eventTrack = '';
  let eventTrackUntil = 0;
  let eventTrackTimer = null;
  let resumeAfterVisibility = false;
  const recentLogSounds = new Map();
  let lastObservedLogText = '';

  const tracks = {
    dialogue: {
      tempo:96,
      stepsPerBeat:2,
      melody:[64,null,67,null,71,null,69,null,67,null,64,null,62,null,64,null,67,null,72,null,71,null,67,null,69,null,67,null,64,null,62,null],
      harmony:[55,null,null,null,59,null,null,null,57,null,null,null,52,null,null,null,55,null,null,null,60,null,null,null,59,null,null,null,55,null,null,null],
      bass:[48,null,null,null,43,null,null,null,45,null,null,null,48,null,null,null,48,null,null,null,45,null,null,null,43,null,null,null,48,null,null,null],
      drums:false,
      melodyGain:0.046,
      harmonyGain:0.020,
      bassGain:0.052
    },
    ally: {
      tempo:150,
      stepsPerBeat:4,
      melody:[72,74,76,79,76,74,72,69,71,72,74,76,79,81,79,76,74,76,77,81,77,76,74,72,69,71,72,76,74,71,72,74],
      harmony:[64,null,67,null,64,null,62,null,62,null,64,null,67,null,71,null,65,null,69,null,65,null,64,null,60,null,64,null,62,null,67,null],
      bass:[48,null,48,null,45,null,45,null,43,null,43,null,47,null,47,null,50,null,50,null,45,null,45,null,43,null,47,null,48,null,48,null],
      drums:'march',
      melodyGain:0.050,
      harmonyGain:0.021,
      bassGain:0.065
    },
    enemy: {
      tempo:146,
      stepsPerBeat:4,
      melody:[69,68,69,72,70,69,68,65,67,68,69,73,72,69,68,64,65,67,68,72,70,68,67,63,64,65,67,70,68,65,64,65],
      harmony:[60,null,59,null,60,null,56,null,58,null,60,null,64,null,63,null,56,null,58,null,60,null,59,null,55,null,56,null,58,null,55,null,56,null],
      bass:[45,null,45,null,41,null,41,null,43,null,43,null,40,null,40,null,44,null,44,null,41,null,41,null,43,null,40,null,41,null,41,null],
      drums:'assault',
      melodyGain:0.050,
      harmonyGain:0.021,
      bassGain:0.068
    },
    join: {
      tempo:132,
      stepsPerBeat:4,
      melody:[67,71,74,79,71,74,79,83,72,76,79,84,76,79,84,88,79,76,74,71,72,74,76,79,83,81,79,76,74,72,71,67],
      harmony:[59,null,62,null,59,null,62,null,64,null,67,null,64,null,67,null,71,null,67,null,64,null,67,null,71,null,69,null,67,null,62,null],
      bass:[43,null,43,null,47,null,47,null,48,null,48,null,52,null,52,null,55,null,55,null,48,null,48,null,50,null,50,null,43,null,43,null],
      drums:'celebration',
      melodyGain:0.054,
      harmonyGain:0.023,
      bassGain:0.060
    }
  };

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  }

  function ensureContext() {
    if (!AudioContextClass) return false;
    if (context) return true;
    context = new AudioContextClass();
    masterGain = context.createGain();
    bgmGain = context.createGain();
    sfxGain = context.createGain();
    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);
    applyVolumes(true);
    return true;
  }

  function applyVolumes(immediate=false) {
    if (!context || !masterGain) return;
    const now = context.currentTime;
    const ramp = immediate ? 0 : 0.08;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(settings.enabled ? settings.volume : 0,now,ramp || 0.001);
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setTargetAtTime(settings.bgm ? 0.30 : 0,now,ramp || 0.001);
    sfxGain.gain.cancelScheduledValues(now);
    sfxGain.gain.setTargetAtTime(settings.sfx ? 0.72 : 0,now,ramp || 0.001);
  }

  async function unlockAudio() {
    if (!settings.enabled || !ensureContext()) {
      updateDock();
      return false;
    }
    try {
      if (context.state !== 'running') await context.resume();
      unlocked = context.state === 'running';
      if (unlocked) {
        startTrack(desiredTrack(),true);
        playSfx('confirm');
      }
    } catch {
      unlocked = false;
    }
    updateDock();
    return unlocked;
  }

  function midiToFrequency(note) {
    return 440 * Math.pow(2,(note-69)/12);
  }

  function tone(note,time,duration,type,gainValue,destination=sfxGain,detune=0) {
    if (!context || !destination || note == null) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(midiToFrequency(note),time);
    osc.detune.setValueAtTime(detune,time);
    gain.gain.setValueAtTime(0.0001,time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,gainValue),time+0.009);
    gain.gain.setValueAtTime(Math.max(0.0002,gainValue*0.78),Math.max(time+0.012,time+duration*0.56));
    gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time+duration+0.02);
  }

  function makeNoiseBuffer() {
    if (!context) return null;
    if (noiseBuffer) return noiseBuffer;
    const length = Math.max(1,Math.floor(context.sampleRate*0.18));
    const buffer = context.createBuffer(1,length,context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index=0; index<length; index+=1) data[index] = Math.random()*2-1;
    noiseBuffer = buffer;
    return buffer;
  }

  function noise(time,duration,gainValue,highpass=700,destination=sfxGain) {
    if (!context || !destination) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = makeNoiseBuffer();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass,time);
    gain.gain.setValueAtTime(Math.max(0.0002,gainValue),time);
    gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(time);
    source.stop(time+duration+0.02);
  }

  function scheduleDrums(track,time,index,stepDuration) {
    if (!track.drums) return;
    const step = index % 16;
    if (step % 4 === 0) {
      tone(track.drums === 'assault' ? 34 : 36,time,Math.min(0.10,stepDuration*0.9),'sine',0.055,bgmGain);
      noise(time,Math.min(0.035,stepDuration*0.55),0.015,520,bgmGain);
    }
    if (step === 4 || step === 12) noise(time,Math.min(0.055,stepDuration*0.85),track.drums === 'assault' ? 0.034 : 0.028,1250,bgmGain);
    if (step % 2 === 1) noise(time,Math.min(0.022,stepDuration*0.45),0.010,3300,bgmGain);
    if (track.drums === 'celebration' && (step === 6 || step === 14)) tone(79,time,Math.min(0.05,stepDuration*0.7),'square',0.018,bgmGain);
  }

  function scheduleTrackStep(track,time,index) {
    const stepDuration = 60 / track.tempo / (track.stepsPerBeat || 2);
    const melody = track.melody[index % track.melody.length];
    const harmony = track.harmony[index % track.harmony.length];
    const bass = track.bass[index % track.bass.length];
    if (melody != null) tone(melody,time,stepDuration*0.88,'square',track.melodyGain || 0.05,bgmGain);
    if (harmony != null) tone(harmony,time,stepDuration*0.92,'square',track.harmonyGain || 0.022,bgmGain,5);
    if (bass != null) tone(bass,time,stepDuration*0.96,'triangle',track.bassGain || 0.064,bgmGain);
    scheduleDrums(track,time,index,stepDuration);
    return stepDuration;
  }

  function scheduler() {
    if (!context || !unlocked || !settings.enabled || !settings.bgm || !currentTrack) return;
    const track = tracks[currentTrack];
    if (!track) return;
    while (nextStepTime < context.currentTime + 0.18) {
      nextStepTime += scheduleTrackStep(track,nextStepTime,stepIndex);
      stepIndex += 1;
    }
  }

  function stopTrack() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
    currentTrack = '';
  }

  function startTrack(name,force=false) {
    if (!unlocked || !context || !settings.enabled || !settings.bgm) return;
    if (!force && currentTrack === name && schedulerTimer) return;
    stopTrack();
    if (!tracks[name]) return;
    currentTrack = name;
    stepIndex = 0;
    nextStepTime = context.currentTime + 0.045;
    scheduler();
    schedulerTimer = setInterval(scheduler,45);
  }

  function conversationVisible() {
    return Boolean(document.querySelector([
      '#storyOverlay:not([hidden])',
      '.story-overlay:not([hidden])',
      '#chapter1CharacterScene:not([hidden])',
      '#chapter1LoreOverlay:not([hidden])'
    ].join(',')));
  }

  function activeEventTrack() {
    if (eventTrack && performance.now() < eventTrackUntil) return eventTrack;
    if (eventTrack) {
      eventTrack = '';
      eventTrackUntil = 0;
    }
    return '';
  }

  function desiredTrack() {
    const temporary = activeEventTrack();
    if (temporary) return temporary;
    if (conversationVisible()) return 'dialogue';
    const phase = document.querySelector('#phaseLabel')?.textContent || '';
    return phase.includes('敵') ? 'enemy' : 'ally';
  }

  function syncTrack(force=false) {
    if (!unlocked || !settings.enabled || !settings.bgm) return;
    startTrack(desiredTrack(),force);
  }

  function playEventTrack(name,duration=4800) {
    if (!tracks[name]) return;
    eventTrack = name;
    eventTrackUntil = performance.now() + duration;
    if (eventTrackTimer) clearTimeout(eventTrackTimer);
    if (unlocked && settings.enabled && settings.bgm) startTrack(name,true);
    eventTrackTimer = setTimeout(() => {
      eventTrack = '';
      eventTrackUntil = 0;
      eventTrackTimer = null;
      syncTrack(true);
    },duration);
  }

  function playSfx(name) {
    if (!unlocked || !context || !settings.enabled || !settings.sfx) return;
    const time = context.currentTime + 0.012;
    switch (name) {
      case 'cursor':
        tone(76,time,0.045,'square',0.045);
        break;
      case 'confirm':
        tone(72,time,0.055,'square',0.055);
        tone(79,time+0.045,0.075,'square',0.05);
        break;
      case 'phase':
        tone(60,time,0.07,'square',0.055);
        tone(67,time+0.055,0.08,'square',0.052);
        tone(72,time+0.11,0.11,'square',0.06);
        break;
      case 'enemyPhase':
        tone(50,time,0.08,'sawtooth',0.045);
        tone(49,time+0.07,0.10,'sawtooth',0.052);
        break;
      case 'hit':
        noise(time,0.085,0.16,650);
        tone(42,time,0.10,'sawtooth',0.07);
        break;
      case 'critical':
        tone(84,time,0.05,'square',0.075);
        tone(88,time+0.045,0.06,'square',0.075);
        noise(time+0.08,0.14,0.20,500);
        tone(38,time+0.08,0.16,'sawtooth',0.09);
        break;
      case 'miss':
        noise(time,0.055,0.05,2600);
        tone(70,time,0.09,'triangle',0.035);
        break;
      case 'heal':
        [72,76,79,84].forEach((note,index)=>tone(note,time+index*0.065,0.15,'sine',0.052));
        break;
      case 'chest':
        [67,72,76,79].forEach((note,index)=>tone(note,time+index*0.07,0.12,'square',0.052));
        break;
      case 'door':
        tone(45,time,0.08,'square',0.055);
        noise(time+0.05,0.08,0.07,900);
        break;
      case 'level':
        [60,64,67,72,76].forEach((note,index)=>tone(note,time+index*0.07,0.17,'square',0.06));
        break;
      case 'join':
        [67,71,74,79,83].forEach((note,index)=>tone(note,time+index*0.075,0.20,index<3?'square':'triangle',0.06));
        break;
      case 'victory':
        stopTrack();
        [60,64,67,72,67,72,76,79].forEach((note,index)=>tone(note,time+index*0.095,0.22,index<4?'square':'triangle',0.065));
        setTimeout(()=>syncTrack(true),1450);
        break;
      default:
        break;
    }
  }

  function shouldHandleLog(text) {
    const now = performance.now();
    for (const [value,stamp] of recentLogSounds) if (now-stamp > 1800) recentLogSounds.delete(value);
    if (!text || recentLogSounds.has(text)) return false;
    recentLogSounds.set(text,now);
    return true;
  }

  function soundFromLog(text) {
    const value = String(text || '').trim();
    if (!shouldHandleLog(value)) return;
    if (/必殺/.test(value)) return playSfx('critical');
    if (/外れ|回避/.test(value)) return playSfx('miss');
    if (/ライブ|リライブ|回復|杖を使/.test(value)) return playSfx('heal');
    if (/宝箱/.test(value)) return playSfx('chest');
    if (/扉を開|開錠/.test(value)) return playSfx('door');
    if (/レベル\d+になった|LEVEL UP/.test(value)) return playSfx('level');
    if (/仲間になった|仲間に加わった|行動を共に|部隊へ合流|合流した/.test(value)) {
      playEventTrack('join',5200);
      return playSfx('join');
    }
    if (/制圧|章クリア|勝利/.test(value)) return playSfx('victory');
    if (/ダメージ|戦闘不能/.test(value)) return playSfx('hit');
  }

  function observeGame() {
    const phase = document.querySelector('#phaseLabel');
    if (phase) {
      lastPhase = phase.textContent;
      new MutationObserver(() => {
        const value = phase.textContent;
        if (value === lastPhase) return;
        lastPhase = value;
        if (value.includes('敵')) playSfx('enemyPhase');
        else if (value.includes('自')) playSfx('phase');
        syncTrack();
      }).observe(phase,{childList:true,subtree:true,characterData:true});
    }

    const log = document.querySelector('#battleLog');
    if (log) {
      const inspectNewestLog = () => {
        const entries = [...log.querySelectorAll('.log-entry')];
        const newestEntry = entries[entries.length-1];
        const newest = (newestEntry?.textContent || log.lastElementChild?.textContent || '').trim();
        if (!newest || newest === lastObservedLogText) return;
        lastObservedLogText = newest;
        soundFromLog(newest);
      };
      new MutationObserver(inspectNewestLog).observe(log,{childList:true,subtree:true,characterData:true});
      const initialEntries = [...log.querySelectorAll('.log-entry')];
      lastObservedLogText = (initialEntries[initialEntries.length-1]?.textContent || '').trim();
    }

    const bodyObserver = new MutationObserver(() => {
      syncTrack();
      const modalTitle = document.querySelector('#modal[open] #modalContent h2')?.textContent || '';
      if (modalTitle !== lastModalTitle) {
        lastModalTitle = modalTitle;
        if (/クリア|勝利/.test(modalTitle)) playSfx('victory');
      }
    });
    bodyObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});

    document.addEventListener('click',event => {
      const button = event.target.closest('button, a.icon-button');
      if (button && !button.closest('#audioDock')) playSfx('cursor');
    },true);
  }

  function createDock() {
    dock = document.createElement('aside');
    dock.id = 'audioDock';
    dock.className = 'audio-dock';
    dock.innerHTML = `
      <button type="button" id="audioMainButton" class="audio-main" aria-expanded="false">♪ タップで音楽</button>
      <button type="button" id="audioMenuButton" class="audio-menu-button" aria-label="音量設定">⚙</button>
      <div id="audioPanel" class="audio-panel" hidden>
        <strong>サウンド</strong>
        <label><input id="audioEnabled" type="checkbox"> 音声を使う</label>
        <label><input id="audioBgm" type="checkbox"> BGM</label>
        <label><input id="audioSfx" type="checkbox"> 効果音</label>
        <label class="audio-volume">音量<input id="audioVolume" type="range" min="0" max="1" step="0.05"></label>
        <small>戦場・敵軍・会話・合流で曲が切り替わります。</small>
      </div>`;
    document.body.appendChild(dock);

    const main = dock.querySelector('#audioMainButton');
    const menu = dock.querySelector('#audioMenuButton');
    const panel = dock.querySelector('#audioPanel');
    const enabled = dock.querySelector('#audioEnabled');
    const bgm = dock.querySelector('#audioBgm');
    const sfx = dock.querySelector('#audioSfx');
    const volume = dock.querySelector('#audioVolume');

    main.addEventListener('click',async event => {
      event.stopPropagation();
      if (!settings.enabled) {
        settings.enabled = true;
        saveSettings();
        await unlockAudio();
      } else if (!unlocked) {
        await unlockAudio();
      } else {
        settings.enabled = false;
        saveSettings();
        applyVolumes();
        stopTrack();
        updateDock();
      }
    });

    menu.addEventListener('click',event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      menu.setAttribute('aria-expanded',String(!panel.hidden));
    });

    enabled.addEventListener('change',async () => {
      settings.enabled = enabled.checked;
      saveSettings();
      if (settings.enabled) await unlockAudio();
      else {
        applyVolumes();
        stopTrack();
      }
      updateDock();
    });
    bgm.addEventListener('change',() => {
      settings.bgm = bgm.checked;
      saveSettings();
      applyVolumes();
      if (settings.bgm) startTrack(desiredTrack(),true); else stopTrack();
      updateDock();
    });
    sfx.addEventListener('change',() => {
      settings.sfx = sfx.checked;
      saveSettings();
      applyVolumes();
      updateDock();
    });
    volume.addEventListener('input',() => {
      settings.volume = Number(volume.value);
      saveSettings();
      applyVolumes();
    });

    document.addEventListener('click',event => {
      if (!dock.contains(event.target)) panel.hidden = true;
    });
    updateDock();
  }

  function updateDock() {
    if (!dock) return;
    const main = dock.querySelector('#audioMainButton');
    dock.querySelector('#audioEnabled').checked = settings.enabled;
    dock.querySelector('#audioBgm').checked = settings.bgm;
    dock.querySelector('#audioSfx').checked = settings.sfx;
    dock.querySelector('#audioVolume').value = String(settings.volume);
    if (!settings.enabled) main.textContent = '♪ 音楽OFF';
    else if (!unlocked) main.textContent = '♪ タップで音楽';
    else if (!settings.bgm && !settings.sfx) main.textContent = '♪ 音なし';
    else main.textContent = '♪ 音楽ON';
    main.classList.toggle('active',settings.enabled && unlocked);
  }

  async function firstGestureUnlock(event) {
    if (event?.target?.closest?.('#audioDock')) return;
    if (settings.enabled && !unlocked) {
      const ok = await unlockAudio();
      if (ok) {
        document.removeEventListener('pointerdown',firstGestureUnlock,true);
        document.removeEventListener('keydown',firstGestureUnlock,true);
      }
    }
  }

  async function handleVisibilityChange() {
    if (!context) return;
    if (document.hidden) {
      resumeAfterVisibility = unlocked && settings.enabled;
      await context.suspend().catch(()=>{});
      return;
    }
    if (!resumeAfterVisibility || !settings.enabled) return;
    try {
      await context.resume();
      unlocked = context.state === 'running';
      if (unlocked) syncTrack(true);
    } catch {
      unlocked = false;
    }
    updateDock();
  }

  function start() {
    createDock();
    observeGame();
    document.addEventListener('pointerdown',firstGestureUnlock,true);
    document.addEventListener('keydown',firstGestureUnlock,true);
    document.addEventListener('visibilitychange',handleVisibilityChange);
    window.HinataAudio = {
      unlock:unlockAudio,
      play:playSfx,
      startTrack,
      eventTrack:playEventTrack,
      sync:syncTrack,
      stop:stopTrack
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
