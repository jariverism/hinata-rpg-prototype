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
  let lastObservedLogText = '';
  const recentLogSounds = new Map();

  const E = (note,length=1,gain=1) => ({ note,length,gain });

  // 戦場曲は「速さ」ではなく、長い旋律と重い拍で緊張を作る。
  // 1ステップは八分音符。休符を多くし、各音を1〜3拍程度保持する。
  const tracks = {
    dialogue: {
      tempo:82,
      stepsPerBeat:2,
      melody:[E(64,3),null,null,null,E(67,2),null,E(69,3),null,null,null,E(67,2),null,E(64,4),null,null,null,E(62,2),null,E(64,3),null,null,null,E(67,2),null,E(69,4),null,null,null,null,null,null,null],
      harmony:[E(55,6,.7),null,null,null,null,null,null,null,E(57,6,.7),null,null,null,null,null,null,null,E(52,6,.7),null,null,null,null,null,null,null,E(55,6,.7),null,null,null,null,null,null,null],
      bass:[E(48,7,.8),null,null,null,null,null,null,null,E(45,7,.8),null,null,null,null,null,null,null,E(48,7,.8),null,null,null,null,null,null,null,E(43,7,.8),null,null,null,null,null,null,null],
      drums:false,
      melodyType:'sine', harmonyType:'triangle', bassType:'sine',
      melodyGain:0.043, harmonyGain:0.020, bassGain:0.047,
      lowpass:2600
    },
    ally: {
      tempo:116,
      stepsPerBeat:2,
      melody:[
        E(69,3),null,null,null,E(72,2),null,E(74,3),null,null,null,E(76,2),null,E(74,3),null,null,null,
        E(72,3),null,null,null,E(69,2),null,E(67,3),null,null,null,E(69,2),null,E(72,4),null,null,null,
        E(74,3),null,null,null,E(76,2),null,E(79,3),null,null,null,E(76,2),null,E(74,3),null,null,null,
        E(72,3),null,null,null,E(71,2),null,E(69,3),null,null,null,E(67,2),null,E(69,4),null,null,null
      ],
      harmony:[
        E(60,7,.72),null,null,null,null,null,null,null,E(62,7,.72),null,null,null,null,null,null,null,
        E(57,7,.72),null,null,null,null,null,null,null,E(60,7,.72),null,null,null,null,null,null,null,
        E(62,7,.72),null,null,null,null,null,null,null,E(64,7,.72),null,null,null,null,null,null,null,
        E(59,7,.72),null,null,null,null,null,null,null,E(60,7,.72),null,null,null,null,null,null,null
      ],
      bass:[
        E(45,7,.95),null,null,null,null,null,null,null,E(41,7,.95),null,null,null,null,null,null,null,
        E(43,7,.95),null,null,null,null,null,null,null,E(45,7,.95),null,null,null,null,null,null,null,
        E(46,7,.95),null,null,null,null,null,null,null,E(41,7,.95),null,null,null,null,null,null,null,
        E(43,7,.95),null,null,null,null,null,null,null,E(45,7,.95),null,null,null,null,null,null,null
      ],
      drums:'field',
      melodyType:'triangle', harmonyType:'sine', bassType:'triangle',
      melodyGain:0.050, harmonyGain:0.021, bassGain:0.063,
      lowpass:3300
    },
    enemy: {
      tempo:108,
      stepsPerBeat:2,
      melody:[
        E(64,3),null,null,null,E(67,2),null,E(68,3),null,null,null,E(67,2),null,E(64,3),null,null,null,
        E(62,3),null,null,null,E(64,2),null,E(65,3),null,null,null,E(64,2),null,E(61,4),null,null,null,
        E(65,3),null,null,null,E(68,2),null,E(70,3),null,null,null,E(68,2),null,E(65,3),null,null,null,
        E(64,3),null,null,null,E(62,2),null,E(61,3),null,null,null,E(59,2),null,E(61,4),null,null,null
      ],
      harmony:[
        E(56,7,.72),null,null,null,null,null,null,null,E(55,7,.72),null,null,null,null,null,null,null,
        E(53,7,.72),null,null,null,null,null,null,null,E(52,7,.72),null,null,null,null,null,null,null,
        E(57,7,.72),null,null,null,null,null,null,null,E(56,7,.72),null,null,null,null,null,null,null,
        E(52,7,.72),null,null,null,null,null,null,null,E(49,7,.72),null,null,null,null,null,null,null
      ],
      bass:[
        E(40,7,1),null,null,null,null,null,null,null,E(39,7,1),null,null,null,null,null,null,null,
        E(37,7,1),null,null,null,null,null,null,null,E(40,7,1),null,null,null,null,null,null,null,
        E(41,7,1),null,null,null,null,null,null,null,E(40,7,1),null,null,null,null,null,null,null,
        E(37,7,1),null,null,null,null,null,null,null,E(40,7,1),null,null,null,null,null,null,null
      ],
      drums:'ominous',
      melodyType:'triangle', harmonyType:'sine', bassType:'sawtooth',
      melodyGain:0.047, harmonyGain:0.020, bassGain:0.057,
      lowpass:2800
    },
    join: {
      tempo:104,
      stepsPerBeat:2,
      melody:[
        E(67,2),null,E(71,2),null,E(74,4),null,null,null,E(72,2),null,E(76,2),null,E(79,4),null,null,null,
        E(74,2),null,E(79,2),null,E(83,4),null,null,null,E(81,2),null,E(79,2),null,E(76,4),null,null,null
      ],
      harmony:[E(59,7,.8),null,null,null,null,null,null,null,E(64,7,.8),null,null,null,null,null,null,null,E(67,7,.8),null,null,null,null,null,null,null,E(64,7,.8),null,null,null,null,null,null,null],
      bass:[E(43,7,.9),null,null,null,null,null,null,null,E(48,7,.9),null,null,null,null,null,null,null,E(55,7,.9),null,null,null,null,null,null,null,E(48,7,.9),null,null,null,null,null,null,null],
      drums:'ceremony',
      melodyType:'triangle', harmonyType:'sine', bassType:'triangle',
      melodyGain:0.055, harmonyGain:0.024, bassGain:0.058,
      lowpass:3600
    }
  };

  function loadSettings() {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {}) }; }
    catch { return { ...DEFAULTS }; }
  }

  function saveSettings() { localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); }
  function midiToFrequency(note) { return 440 * Math.pow(2,(note-69)/12); }

  function ensureContext() {
    if (!AudioContextClass) return false;
    if (context) return true;
    context = new AudioContextClass();
    masterGain = context.createGain();
    bgmGain = context.createGain();
    sfxGain = context.createGain();
    bgmGain.connect(masterGain); sfxGain.connect(masterGain); masterGain.connect(context.destination);
    applyVolumes(true);
    return true;
  }

  function applyVolumes(immediate=false) {
    if (!context || !masterGain) return;
    const now=context.currentTime, ramp=immediate?0.001:0.10;
    masterGain.gain.cancelScheduledValues(now); masterGain.gain.setTargetAtTime(settings.enabled?settings.volume:0,now,ramp);
    bgmGain.gain.cancelScheduledValues(now); bgmGain.gain.setTargetAtTime(settings.bgm?0.29:0,now,ramp);
    sfxGain.gain.cancelScheduledValues(now); sfxGain.gain.setTargetAtTime(settings.sfx?0.72:0,now,ramp);
  }

  function tone(note,time,duration,type,gainValue,destination=sfxGain,detune=0,lowpass=6000) {
    if (!context || !destination || note == null) return;
    const osc=context.createOscillator(), filter=context.createBiquadFilter(), gain=context.createGain();
    osc.type=type; osc.frequency.setValueAtTime(midiToFrequency(note),time); osc.detune.setValueAtTime(detune,time);
    filter.type='lowpass'; filter.frequency.setValueAtTime(lowpass,time); filter.Q.setValueAtTime(.35,time);
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,gainValue),time+.018);
    gain.gain.setValueAtTime(Math.max(.0002,gainValue*.72),Math.max(time+.04,time+duration*.68));
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(filter); filter.connect(gain); gain.connect(destination); osc.start(time); osc.stop(time+duration+.04);
  }

  function warmTone(event,time,stepDuration,type,gainValue,lowpass) {
    if (!event) return;
    const duration=Math.max(.08,stepDuration*event.length*.94), gain=gainValue*(event.gain||1);
    tone(event.note,time,duration,type,gain,bgmGain,0,lowpass);
    if (type!=='sine') tone(event.note,time+.006,duration*.96,'sine',gain*.24,bgmGain,4,lowpass*.86);
  }

  function makeNoiseBuffer() {
    if (!context) return null;
    if (noiseBuffer) return noiseBuffer;
    const length=Math.max(1,Math.floor(context.sampleRate*.25)), buffer=context.createBuffer(1,length,context.sampleRate), data=buffer.getChannelData(0);
    for(let i=0;i<length;i+=1)data[i]=Math.random()*2-1;
    noiseBuffer=buffer; return buffer;
  }

  function noise(time,duration,gainValue,highpass=700,destination=sfxGain) {
    if (!context || !destination) return;
    const source=context.createBufferSource(), filter=context.createBiquadFilter(), gain=context.createGain();
    source.buffer=makeNoiseBuffer(); filter.type='highpass'; filter.frequency.setValueAtTime(highpass,time);
    gain.gain.setValueAtTime(Math.max(.0002,gainValue),time); gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination); source.start(time); source.stop(time+duration+.02);
  }

  function scheduleDrums(track,time,index,stepDuration) {
    if (!track.drums) return;
    const step=index%16;
    if (track.drums==='field') {
      if(step===0||step===8)tone(36,time,stepDuration*1.35,'sine',.047,bgmGain,0,900);
      if(step===6||step===14)noise(time,stepDuration*.62,.019,1100,bgmGain);
    } else if (track.drums==='ominous') {
      if(step===0)tone(32,time,stepDuration*1.65,'sine',.052,bgmGain,0,760);
      if(step===8)tone(34,time,stepDuration*1.25,'sine',.040,bgmGain,0,820);
      if(step===12)noise(time,stepDuration*.72,.017,850,bgmGain);
    } else if (track.drums==='ceremony') {
      if(step===0||step===8)tone(36,time,stepDuration*1.2,'sine',.047,bgmGain,0,900);
      if(step===4||step===12)noise(time,stepDuration*.55,.019,1250,bgmGain);
    }
  }

  function scheduleTrackStep(track,time,index) {
    const stepDuration=60/track.tempo/(track.stepsPerBeat||2), lowpass=track.lowpass||4000;
    warmTone(track.melody[index%track.melody.length],time,stepDuration,track.melodyType||'triangle',track.melodyGain||.05,lowpass);
    warmTone(track.harmony[index%track.harmony.length],time,stepDuration,track.harmonyType||'sine',track.harmonyGain||.021,lowpass*.78);
    warmTone(track.bass[index%track.bass.length],time,stepDuration,track.bassType||'triangle',track.bassGain||.06,lowpass*.5);
    scheduleDrums(track,time,index,stepDuration);
    return stepDuration;
  }

  function scheduler() {
    if (!context || !unlocked || !settings.enabled || !settings.bgm || !currentTrack) return;
    const track=tracks[currentTrack]; if(!track)return;
    while(nextStepTime<context.currentTime+.24){nextStepTime+=scheduleTrackStep(track,nextStepTime,stepIndex);stepIndex+=1;}
  }

  function stopTrack(){if(schedulerTimer)clearInterval(schedulerTimer);schedulerTimer=null;currentTrack='';}
  function startTrack(name,force=false){
    if(!unlocked||!context||!settings.enabled||!settings.bgm)return;
    if(!force&&currentTrack===name&&schedulerTimer)return;
    stopTrack(); if(!tracks[name])return; currentTrack=name; stepIndex=0; nextStepTime=context.currentTime+.06; scheduler(); schedulerTimer=setInterval(scheduler,60);
  }

  function conversationVisible(){return Boolean(document.querySelector('#storyOverlay:not([hidden]),.story-overlay:not([hidden]),#chapter1CharacterScene:not([hidden]),#chapter1LoreOverlay:not([hidden])'));}
  function activeEventTrack(){if(eventTrack&&performance.now()<eventTrackUntil)return eventTrack;if(eventTrack){eventTrack='';eventTrackUntil=0;}return '';}
  function desiredTrack(){const temporary=activeEventTrack();if(temporary)return temporary;if(conversationVisible())return'dialogue';const phase=document.querySelector('#phaseLabel')?.textContent||'';return phase.includes('敵')?'enemy':'ally';}
  function syncTrack(force=false){if(unlocked&&settings.enabled&&settings.bgm)startTrack(desiredTrack(),force);}
  function playEventTrack(name,duration=6200){
    if(!tracks[name])return; eventTrack=name; eventTrackUntil=performance.now()+duration;
    if(eventTrackTimer)clearTimeout(eventTrackTimer); if(unlocked&&settings.enabled&&settings.bgm)startTrack(name,true);
    eventTrackTimer=setTimeout(()=>{eventTrack='';eventTrackUntil=0;eventTrackTimer=null;syncTrack(true);},duration);
  }

  async function unlockAudio(){
    if(!settings.enabled||!ensureContext()){updateDock();return false;}
    try{if(context.state!=='running')await context.resume();unlocked=context.state==='running';if(unlocked){startTrack(desiredTrack(),true);playSfx('confirm');}}
    catch{unlocked=false;} updateDock(); return unlocked;
  }

  function playSfx(name){
    if(!unlocked||!context||!settings.enabled||!settings.sfx)return;const t=context.currentTime+.012;
    switch(name){
      case'cursor':tone(76,t,.05,'square',.042);break;
      case'confirm':tone(72,t,.07,'triangle',.052);tone(79,t+.06,.10,'triangle',.047);break;
      case'phase':tone(60,t,.09,'triangle',.052);tone(67,t+.08,.11,'triangle',.050);tone(72,t+.17,.15,'triangle',.055);break;
      case'enemyPhase':tone(48,t,.13,'sawtooth',.040);tone(43,t+.10,.18,'sawtooth',.046);break;
      case'hit':noise(t,.10,.15,650);tone(42,t,.12,'sawtooth',.065);break;
      case'critical':tone(84,t,.06,'square',.070);tone(88,t+.055,.07,'square',.070);noise(t+.10,.15,.19,500);break;
      case'miss':noise(t,.06,.045,2600);tone(70,t,.11,'triangle',.032);break;
      case'heal':[72,76,79,84].forEach((n,i)=>tone(n,t+i*.075,.18,'sine',.048));break;
      case'chest':[67,72,76,79].forEach((n,i)=>tone(n,t+i*.08,.15,'triangle',.050));break;
      case'door':tone(45,t,.10,'square',.050);noise(t+.07,.09,.065,900);break;
      case'level':[60,64,67,72,76].forEach((n,i)=>tone(n,t+i*.08,.20,'triangle',.055));break;
      case'join':[67,71,74,79,83].forEach((n,i)=>tone(n,t+i*.09,.24,i<3?'triangle':'sine',.058));break;
      case'victory':stopTrack();[60,64,67,72,67,72,76,79].forEach((n,i)=>tone(n,t+i*.11,.25,i<4?'triangle':'sine',.062));setTimeout(()=>syncTrack(true),1650);break;
      default:break;
    }
  }

  function shouldHandleLog(text){const now=performance.now();for(const[value,stamp]of recentLogSounds)if(now-stamp>1800)recentLogSounds.delete(value);if(!text||recentLogSounds.has(text))return false;recentLogSounds.set(text,now);return true;}
  function soundFromLog(text){
    const value=String(text||'').trim();if(!shouldHandleLog(value))return;
    if(/必殺/.test(value))return playSfx('critical');if(/外れ|回避/.test(value))return playSfx('miss');if(/ライブ|リライブ|回復|杖を使/.test(value))return playSfx('heal');
    if(/宝箱/.test(value))return playSfx('chest');if(/扉を開|開錠/.test(value))return playSfx('door');if(/レベル\d+になった|LEVEL UP/.test(value))return playSfx('level');
    if(/仲間になった|仲間に加わった|行動を共に|部隊へ合流|合流した/.test(value)){playEventTrack('join',6800);return playSfx('join');}
    if(/制圧|章クリア|勝利/.test(value))return playSfx('victory');if(/ダメージ|戦闘不能/.test(value))return playSfx('hit');
  }

  function observeGame(){
    const phase=document.querySelector('#phaseLabel');
    if(phase){lastPhase=phase.textContent;new MutationObserver(()=>{const value=phase.textContent;if(value===lastPhase)return;lastPhase=value;playSfx(value.includes('敵')?'enemyPhase':'phase');syncTrack();}).observe(phase,{childList:true,subtree:true,characterData:true});}
    const log=document.querySelector('#battleLog');
    if(log){const inspect=()=>{const entries=[...log.querySelectorAll('.log-entry')],newest=(entries.at(-1)?.textContent||log.lastElementChild?.textContent||'').trim();if(!newest||newest===lastObservedLogText)return;lastObservedLogText=newest;soundFromLog(newest);};new MutationObserver(inspect).observe(log,{childList:true,subtree:true,characterData:true});lastObservedLogText=([...log.querySelectorAll('.log-entry')].at(-1)?.textContent||'').trim();}
    new MutationObserver(()=>{syncTrack();const title=document.querySelector('#modal[open] #modalContent h2')?.textContent||'';if(title!==lastModalTitle){lastModalTitle=title;if(/クリア|勝利/.test(title))playSfx('victory');}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
    document.addEventListener('click',event=>{const button=event.target.closest('button,a.icon-button');if(button&&!button.closest('#audioDock'))playSfx('cursor');},true);
  }

  function createDock(){
    dock=document.createElement('aside');dock.id='audioDock';dock.className='audio-dock';dock.innerHTML=`
      <button type="button" id="audioMainButton" class="audio-main" aria-expanded="false">♪ タップで音楽</button>
      <button type="button" id="audioMenuButton" class="audio-menu-button" aria-label="音量設定">⚙</button>
      <div id="audioPanel" class="audio-panel" hidden>
        <strong>サウンド</strong>
        <label><input id="audioEnabled" type="checkbox"> 音声を使う</label>
        <label><input id="audioBgm" type="checkbox"> BGM</label>
        <label><input id="audioSfx" type="checkbox"> 効果音</label>
        <label class="audio-volume">音量<input id="audioVolume" type="range" min="0" max="1" step="0.05"></label>
        <small>戦場・敵軍・会話・合流で曲が切り替わります。</small>
      </div>`;document.body.appendChild(dock);
    const main=dock.querySelector('#audioMainButton'),menu=dock.querySelector('#audioMenuButton'),panel=dock.querySelector('#audioPanel'),enabled=dock.querySelector('#audioEnabled'),bgm=dock.querySelector('#audioBgm'),sfx=dock.querySelector('#audioSfx'),volume=dock.querySelector('#audioVolume');
    main.addEventListener('click',async event=>{event.stopPropagation();if(!settings.enabled){settings.enabled=true;saveSettings();await unlockAudio();}else if(!unlocked)await unlockAudio();else{settings.enabled=false;saveSettings();applyVolumes();stopTrack();updateDock();}});
    menu.addEventListener('click',event=>{event.stopPropagation();panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));});
    enabled.addEventListener('change',async()=>{settings.enabled=enabled.checked;saveSettings();if(settings.enabled)await unlockAudio();else{applyVolumes();stopTrack();}updateDock();});
    bgm.addEventListener('change',()=>{settings.bgm=bgm.checked;saveSettings();applyVolumes();if(settings.bgm)startTrack(desiredTrack(),true);else stopTrack();updateDock();});
    sfx.addEventListener('change',()=>{settings.sfx=sfx.checked;saveSettings();applyVolumes();updateDock();});
    volume.addEventListener('input',()=>{settings.volume=Number(volume.value);saveSettings();applyVolumes();});
    document.addEventListener('click',event=>{if(!dock.contains(event.target))panel.hidden=true;});updateDock();
  }

  function updateDock(){if(!dock)return;const main=dock.querySelector('#audioMainButton');dock.querySelector('#audioEnabled').checked=settings.enabled;dock.querySelector('#audioBgm').checked=settings.bgm;dock.querySelector('#audioSfx').checked=settings.sfx;dock.querySelector('#audioVolume').value=String(settings.volume);if(!settings.enabled)main.textContent='♪ 音楽OFF';else if(!unlocked)main.textContent='♪ タップで音楽';else if(!settings.bgm&&!settings.sfx)main.textContent='♪ 音なし';else main.textContent='♪ 音楽ON';main.classList.toggle('active',settings.enabled&&unlocked);}
  async function firstGestureUnlock(event){if(event?.target?.closest?.('#audioDock'))return;if(settings.enabled&&!unlocked){const ok=await unlockAudio();if(ok){document.removeEventListener('pointerdown',firstGestureUnlock,true);document.removeEventListener('keydown',firstGestureUnlock,true);}}}
  async function handleVisibilityChange(){if(!context)return;if(document.hidden){resumeAfterVisibility=unlocked&&settings.enabled;await context.suspend().catch(()=>{});return;}if(!resumeAfterVisibility||!settings.enabled)return;try{await context.resume();unlocked=context.state==='running';if(unlocked)syncTrack(true);}catch{unlocked=false;}updateDock();}
  function start(){createDock();observeGame();document.addEventListener('pointerdown',firstGestureUnlock,true);document.addEventListener('keydown',firstGestureUnlock,true);document.addEventListener('visibilitychange',handleVisibilityChange);window.HinataAudio={unlock:unlockAudio,play:playSfx,startTrack,eventTrack:playEventTrack,sync:syncTrack,stop:stopTrack};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
