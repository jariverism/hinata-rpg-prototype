(() => {
  'use strict';

  const nameToKey = {
    '佐々木久美':'kumi','加藤史帆':'toshi','齊藤京子':'kyoko','井口眞緒':'mao',
    '潮紗理菜':'sarina','河田陽菜':'hina','濱岸ひより':'hiyori','山口陽世':'haruyo',
    '宮田愛萌':'manamo','髙橋未来虹':'mikuni','高橋未来虹':'mikuni','森本茉莉':'marii',
    '渡邉美穂':'miho','柿崎芽実':'memi'
  };
  const nonPeople = new Set(['ナレーション','作戦','戦況','説明','章題']);
  let scheduled = false;

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
    }[character]));
  }

  function hash(value) {
    let result = 0;
    for (const character of String(value)) result = ((result << 5) - result + character.charCodeAt(0)) | 0;
    return Math.abs(result);
  }

  function fallbackPortrait(name) {
    const seed = hash(name);
    const hair = ['#2a1d1d','#34261f','#1d2231','#3a2928'][seed % 4];
    const cloak = ['#536c91','#4f755e','#755b83','#7b624b'][seed % 4];
    const initial = escapeXml(String(name || '人').slice(0,1));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192" shape-rendering="crispEdges">
      <rect width="192" height="192" fill="#071b58"/>
      <rect x="5" y="5" width="182" height="182" rx="4" fill="none" stroke="#d6b65d" stroke-width="7"/>
      <rect x="13" y="13" width="166" height="166" rx="2" fill="none" stroke="#5c3a12" stroke-width="3"/>
      <circle cx="96" cy="75" r="47" fill="${hair}"/>
      <ellipse cx="96" cy="83" rx="35" ry="43" fill="#edc39e"/>
      <path d="M60 67 Q70 27 101 30 Q138 34 139 76 Q120 56 95 52 Q76 54 60 67" fill="${hair}"/>
      <rect x="76" y="80" width="8" height="5" fill="#33231f"/><rect x="109" y="80" width="8" height="5" fill="#33231f"/>
      <rect x="92" y="95" width="8" height="4" fill="#c48771"/><rect x="82" y="108" width="28" height="4" fill="#a75d5d"/>
      <path d="M40 184 Q47 129 96 125 Q145 129 152 184" fill="${cloak}"/>
      <path d="M73 129 L96 151 L119 129" fill="#f0e5c9"/>
      <circle cx="157" cy="157" r="20" fill="#0b317d" stroke="#d6b65d" stroke-width="4"/>
      <text x="157" y="166" text-anchor="middle" font-size="24" font-family="serif" font-weight="700" fill="#fff2ae">${initial}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function portraitFor(name) {
    const direct = window.HINATA_PORTRAITS?.[name];
    if (direct) return direct;
    const key = nameToKey[name];
    const stored = key ? window.HINATA_PORTRAIT_DATA?.[key] : '';
    return stored || fallbackPortrait(name);
  }

  function isPerson(name) {
    return Boolean(name && !nonPeople.has(name));
  }

  function ensureImage(container,name,className='dialogue-guard-image') {
    let image = container.querySelector(`img.${className}`) || container.querySelector('img');
    if (!image) {
      image = document.createElement('img');
      image.className = className;
      container.prepend(image);
    } else {
      image.classList.add(className);
    }
    const source = portraitFor(name);
    if (image.getAttribute('src') !== source) image.setAttribute('src',source);
    image.alt = `${name}の顔グラフィック`;
    image.hidden = false;
    return image;
  }

  function refreshStandardSpeech() {
    document.querySelectorAll('.speech').forEach(speech => {
      const name = speech.querySelector('.speaker')?.textContent?.trim();
      if (!isPerson(name)) return;
      let portrait = speech.querySelector('.portrait');
      if (!portrait) {
        portrait = document.createElement('div');
        portrait.className = 'portrait dialogue-guard-portrait';
        speech.prepend(portrait);
      }
      ensureImage(portrait,name);
      speech.classList.add('dialogue-has-face');
      if (speech.classList.contains('narration')) speech.classList.add('dialogue-face-forced');
    });
  }

  function refreshChapterOneIntro() {
    const speaker = document.querySelector('#chapter1LoreSpeaker');
    const panel = document.querySelector('#chapter1LoreOverlay .narration-window');
    if (!speaker || !panel) return;
    const name = speaker.textContent.trim();
    let image = panel.querySelector('.dialogue-inline-face');
    if (!isPerson(name)) {
      panel.classList.remove('dialogue-inline-layout');
      if (image) image.hidden = true;
      return;
    }
    if (!image) {
      image = document.createElement('img');
      image.className = 'dialogue-inline-face';
      panel.prepend(image);
    }
    ensureImage(panel,name,'dialogue-inline-face');
    panel.classList.add('dialogue-inline-layout');
  }

  function refreshChapterOneScenes() {
    const speaker = document.querySelector('#chapter1CharacterSpeaker');
    const body = document.querySelector('#chapter1CharacterScene .scene-body');
    if (!speaker || !body) return;
    const name = speaker.textContent.trim();
    let image = body.querySelector('.dialogue-inline-face');
    if (!isPerson(name)) {
      body.classList.remove('dialogue-inline-layout');
      if (image) image.hidden = true;
      return;
    }
    if (!image) {
      image = document.createElement('img');
      image.className = 'dialogue-inline-face';
      body.prepend(image);
    }
    ensureImage(body,name,'dialogue-inline-face');
    body.classList.add('dialogue-inline-layout');
  }

  function refreshSpeechCards() {
    document.querySelectorAll('.speech-card').forEach(card => {
      const name = card.querySelector('.speech-name,.speaker')?.textContent?.trim();
      if (!isPerson(name)) return;
      ensureImage(card,name,'dialogue-card-face');
      card.classList.add('dialogue-card-has-face');
    });
  }

  function refresh() {
    scheduled = false;
    refreshStandardSpeech();
    refreshChapterOneIntro();
    refreshChapterOneScenes();
    refreshSpeechCards();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  const style = document.createElement('style');
  style.id = 'dialogueFaceGuardStyles';
  style.textContent = `
    .speech.dialogue-face-forced{display:grid!important;grid-template-columns:150px minmax(0,1fr)!important;gap:0!important;width:min(760px,92%)!important;min-height:155px!important;left:3%!important;top:10%!important}
    .speech.dialogue-face-forced .speech-box{min-height:132px!important}
    .dialogue-guard-image,.dialogue-inline-face,.dialogue-card-face{object-fit:cover;background:#071b58;image-rendering:pixelated}
    .dialogue-inline-layout{display:grid!important;grid-template-columns:clamp(82px,20vw,132px) minmax(0,1fr)!important;grid-template-rows:auto 1fr!important;column-gap:16px!important;align-items:center!important}
    .dialogue-inline-layout>.dialogue-inline-face{grid-column:1;grid-row:1/3;width:100%;aspect-ratio:1;border:4px solid #d3ba69;border-radius:7px;box-shadow:0 0 0 3px #241a0c}
    .dialogue-inline-layout>.speech-name,.dialogue-inline-layout>.scene-speaker{grid-column:2;grid-row:1;margin-top:0}
    .dialogue-inline-layout>.speech-text,.dialogue-inline-layout>.scene-text{grid-column:2;grid-row:2}
    .speech-card.dialogue-card-has-face{display:grid!important;grid-template-columns:92px minmax(0,1fr)!important;gap:14px!important;align-items:center!important}
    .speech-card.dialogue-card-has-face>.dialogue-card-face{width:92px;height:92px;border:3px solid #d3ba69;border-radius:8px;grid-row:1/4}
    @media(max-width:560px){
      .speech.dialogue-face-forced{grid-template-columns:92px minmax(0,1fr)!important;min-height:112px!important}
      .speech.dialogue-face-forced .portrait{width:92px;height:92px}
      .dialogue-inline-layout{grid-template-columns:74px minmax(0,1fr)!important;column-gap:10px!important}
      .speech-card.dialogue-card-has-face{grid-template-columns:68px minmax(0,1fr)!important;gap:10px!important}
      .speech-card.dialogue-card-has-face>.dialogue-card-face{width:68px;height:68px}
    }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(scheduleRefresh);
  const start = () => {
    if (document.body) observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','hidden']});
    scheduleRefresh();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('hinata-game-ready',scheduleRefresh);
  window.addEventListener('load',scheduleRefresh);
})();
