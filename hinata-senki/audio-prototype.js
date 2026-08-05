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
  let lastLogText = '';
  let lastModalTitle = '';
  let dock = null;

  const tracks = {
    story: {
      tempo:82,
      melody:[64,null,67,null,69,null,67,null,64,null,62,null,60,null,62,null,64,null,67,null,71,null,69,null,67,null,64,null,62,null,60,null],
      harmony:[55,null,null,null,57,null,null,null,52,null,null,null,55,null,null,null,55,null,null,null,59,null,null,null,57,null,null,null,52,null,null,null],
      bass:[48,null,null,null,45,null,null,null,43,null,null,null,45,null,null,null,48,null,null,null,47,null,null,null,45,null,null,null,43,null,null,null],
      drums:false
    },
    ally: {
      tempo:116,
      melody:[72,null,76,74,72,null,69,null,67,69,72,null,71,null,69,null,72,null,76,79,76,null,74,null,72,74,76,null,71,null,72,null],
      harmony:[64,null,67,null,64,null,60,null,62,null,64,null,62,null,59,null,62,null,64,null,67,null,71,null,67,null,65,null,64,null,62,null,59,null,60,null],
      bass:[48,null,48,null,45,null,45,null,43,null,43,null,47,null,47,null,48,null,48,null,52,null,52,null,50,null,50,null,47,null,48,null,48,null],
      drums:true
    },
    enemy: {
      tempo:106,
      melody:[69,null,68,null,69,72,70,null,69,null,65,null,67,68,69,null,72,null,73,72,69,null,68,null,65,67,68,null,64,null,65,null],
      harmony:[60,null,59,null,60,null,62,null,60,null,56,null,58,null,60,null,63,null,64,null,60,null,59,null,56,null,58,null,55,null,56,null],
      bass:[45,null,45,null,41,null,41,null,43,null,43,null,40,null,40,null,45,null,45,null,44,null,44,null,41,null,43,null,40,null,41,null],
      drums:true
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
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,gainValue),time+0.012);
    gain.gain.setValueAtTime(Math.max(0.0002,gainValue*0.8),Math.max(time+0.014,time+duration*0.55));
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
    for (let i=0;i<length;i++) data[i] = Math.random()*2-1;
    noiseBuffer = buffer;
    return buffer;
  }

  function noise(time,duration,gainValue,highpass=700,destination=sfxGain) {
    if (!context || !sfxGain) return;
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

  function scheduleTrackStep(track,time,index) {
    const stepDuration = 60 / track.tempo / 2;
    const i = index % track.melody.length;
    const melody = track.melody[i];
    const harmony = track.harmony[i % track.harmony.length];
    const bass = track.bass[i % track.bass.length];
    if (melody != null) tone(melody,time,stepDuration*0.82,'square',0.055,bgmGain);
    if (harmony != null) tone(harmony,time,stepDuration*0.92,'square',0.025,bgmGain,5);
    if (bass != null) tone(bass,time,stepDuration*0.95,'triangle',0.072,bgmGain);
    if (track.drums) {
      if (i % 4 === 0) {
        tone(36,time,0.10,'sine',0.055,bgmGain);
        noise(time,0.035,0.018,500,bgmGain);
      } else if (i % 4 === 2) {
        noise(time,0.055,0.028,1300,bgmGain);
      } else {
        noise(time,0.018,0.010,3200,bgmGain);
      }
    }
    return stepDuration;
  }

  function scheduler() {
    if (!context || !unlocked || !settings.enabled || !settings.bgm || !currentTrack) return;
    const track = tracks[currentTrack];
    if (!track) return;
    while (nextStepTime < context.currentTime + 0.18) {
      const stepDuration = scheduleTrackStep(track,nextStepTime,stepIndex);
      nextStepTime += stepDuration;
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
    nextStepTime = context.currentTime + 0.06;
    scheduler();
    schedulerTimer = setInterval(scheduler,60);
  }

  function desiredTrack() {
    const story = document.querySelector('#storyOverlay:not([hidden]), .story-overlay:not([hidden])');
    if (story) return 'story';
    const phase = document.querySelector('#phaseLabel')?.textContent || '';
    return phase.includes('敵') ? 'enemy' : 'ally';
  }

  function syncTrack() {
    if (!unlocked || !settings.enabled || !settings.bgm) return;
    startTrack(desiredTrack());
  }

  function playSfx(name) {
    if (!unlocked || !context || !settings.enabled || !settings.sfx) return;
    const t = context.currentTime + 0.012;
    switch (name) {
      case 'cursor':
        tone(76,t,0.045,'square',0.045);
        break;
      case 'confirm':
        tone(72,t,0.055,'square',0.055);
        tone(79,t+0.045,0.075,'square',0.05);
        break;
      case 'phase':
        tone(60,t,0.08,'square',0.055);
        tone(67,t+0.07,0.09,'square',0.052);
        tone(72,t+0.14,0.13,'square',0.06);
        break;
      case 'enemyPhase':
        tone(50,t,0.10,'sawtooth',0.045);
        tone(49,t+0.09,0.12,'sawtooth',0.052);
        break;
      case 'hit':
        noise(t,0.085,0.16,650);
        tone(42,t,0.10,'sawtooth',0.07);
        break;
      case 'critical':
        tone(84,t,0.05,'square',0.075);
        tone(88,t+0.045,0.06,'square',0.075);
        noise(t+0.08,0.14,0.20,500);
        tone(38,t+0.08,0.16,'sawtooth',0.09);
        break;
      case 'miss':
        noise(t,0.055,0.05,2600);
        tone(70,t,0.09,'triangle',0.035);
        break;
      case 'heal':
        [72,76,79,84].forEach((note,index)=>tone(note,t+index*0.07,0.16,'sine',0.052));
        break;
      case 'chest':
        [67,72,76,79].forEach((note,index)=>tone(note,t+index*0.08,0.13,'square',0.052));
        break;
      case 'door':
        tone(45,t,0.08,'square',0.055);
        noise(t+0.05,0.08,0.07,900);
        break;
      case 'level':
        [60,64,67,72,76].forEach((note,index)=>tone(note,t+index*0.075,0.18,'square',0.06));
        break;
      case 'join':
        [67,71,74,79].forEach((note,index)=>tone(note,t+index*0.09,0.20,'triangle',0.06));
        break;
      case 'victory':
        stopTrack();
        [60,64,67,72,67,72,76,79].forEach((note,index)=>tone(note,t+index*0.105,0.24,index<4?'square':'triangle',0.065));
        setTimeout(()=>startTrack('story',true),1550);
        break;
      default:
        break;
    }
  }

  function soundFromLog(text) {
    if (!text || text === lastLogText) return;
    lastLogText = text;
    if (/必殺/.test(text)) return playSfx('critical');
    if (/外れ|回避/.test(text)) return playSfx('miss');
    if (/ライブ|リライブ|回復|杖を使/.test(text)) return playSfx('heal');
    if (/宝箱/.test(text)) return playSfx('chest');
    if (/扉を開|開錠/.test(text)) return playSfx('door');
    if (/レベル\d+になった|LEVEL UP/.test(text)) return playSfx('level');
    if (/仲間になった|行動を共に/.test(text)) return playSfx('join');
    if (/制圧|章クリア|勝利/.test(text)) return playSfx('victory');
    if (/ダメージ|戦闘不能/.test(text)) return playSfx('hit');
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
      new MutationObserver(records => {
        const added = [];
        records.forEach(record => record.addedNodes.forEach(node => added.push(node.textContent || '')));
        added.filter(Boolean).forEach(soundFromLog);
      }).observe(log,{childList:true,subtree:true});
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
        <strong>サウンド試作</strong>
        <label><input id="audioEnabled" type="checkbox"> 音声を使う</label>
        <label><input id="audioBgm" type="checkbox"> BGM</label>
        <label><input id="audioSfx" type="checkbox"> 効果音</label>
        <label class="audio-volume">音量<input id="audioVolume" type="range" min="0" max="1" step="0.05"></label>
        <small>iPhoneでは最初のタップ後に再生されます。</small>
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

  function start() {
    createDock();
    observeGame();
    document.addEventListener('pointerdown',firstGestureUnlock,true);
    document.addEventListener('keydown',firstGestureUnlock,true);
    document.addEventListener('visibilitychange',() => {
      if (!context) return;
      if (document.hidden) {
        context.suspend().catch(()=>{});
      } else if (settings.enabled) {
        unlocked = false;
        updateDock();
      }
    });
    window.HinataAudio = { unlock:unlockAudio, play:playSfx, startTrack, stop:stopTrack };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
