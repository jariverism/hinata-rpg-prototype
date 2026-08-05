(() => {
  'use strict';

  const P = window.HINATA_PORTRAIT_DATA || {};
  const BY_NAME = Object.freeze({
    '佐々木久美': P.kumi,
    '加藤史帆': P.toshi,
    '齊藤京子': P.kyoko,
    '井口眞緒': P.mao,
    '潮紗理菜': P.sarina,
    '河田陽菜': P.hina,
    '？？？': P.sarina
  });

  window.HINATA_PORTRAITS = BY_NAME;

  const css = `
.portrait-panel.character-portrait{border:0;background:transparent;box-shadow:5px 6px 0 rgba(0,0,0,.42)}
.portrait-panel.character-portrait::before,.portrait-panel.character-portrait::after{display:none}
.portrait-panel.character-portrait img{display:block;width:100%;height:100%;object-fit:cover;image-rendering:pixelated}
#unitCard::after{content:"";display:block;clear:both}
.unit-card-character-portrait{float:left;width:82px;height:82px;margin:0 10px 8px 0;object-fit:cover;border-radius:4px;box-shadow:0 0 0 2px #d8c078,0 0 0 4px #17120c,3px 4px 0 rgba(0,0,0,.34);image-rendering:pixelated}
@media(max-width:800px){.unit-card-character-portrait{width:72px;height:72px}}
`;

  function installStyles() {
    if (document.querySelector('#hinataPortraitStyles')) return;
    const style = document.createElement('style');
    style.id = 'hinataPortraitStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applyStoryPortraits() {
    document.querySelectorAll('.portrait-panel').forEach(panel => {
      const speaker = panel.dataset.speaker || '';
      const src = BY_NAME[speaker];
      if (!src) return;

      const old = panel.querySelector('img[data-character-portrait]');
      if (old && old.dataset.speaker === speaker) return;

      panel.innerHTML = '';
      panel.classList.add('has-image', 'character-portrait');

      const image = document.createElement('img');
      image.src = src;
      image.alt = '';
      image.decoding = 'async';
      image.dataset.characterPortrait = '1';
      image.dataset.speaker = speaker;
      panel.appendChild(image);
    });
  }

  function applyUnitCardPortrait() {
    const card = document.querySelector('#unitCard');
    if (!card || card.classList.contains('empty')) return;

    const name = card.querySelector('.unit-name h2, h2')?.textContent?.trim();
    const src = BY_NAME[name];
    if (!src) return;

    const old = card.querySelector('.unit-card-character-portrait');
    if (old && old.dataset.name === name) return;
    old?.remove();

    const image = document.createElement('img');
    image.className = 'unit-card-character-portrait';
    image.src = src;
    image.alt = `${name}の顔グラフィック`;
    image.decoding = 'async';
    image.dataset.name = name;
    card.prepend(image);
  }

  function refresh() {
    applyStoryPortraits();
    applyUnitCardPortrait();
  }

  function start() {
    installStyles();
    Object.values(P).forEach(src => {
      if (!src) return;
      const image = new Image();
      image.src = src;
    });

    refresh();
    new MutationObserver(refresh).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-speaker', 'class']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
