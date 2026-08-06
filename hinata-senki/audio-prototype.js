(() => {
  'use strict';
  if (window.__hinataAudioV3Loading || window.HinataAudio) return;
  window.__hinataAudioV3Loading = true;
  const current = document.currentScript?.src || location.href;
  const script = document.createElement('script');
  script.src = new URL('./audio-prototype-v3.js?v=1',current).href;
  script.onload = () => { window.__hinataAudioV3Loading = false; };
  script.onerror = () => {
    window.__hinataAudioV3Loading = false;
    console.error('新しいBGMエンジンの読み込みに失敗しました');
  };
  document.body.appendChild(script);
})();
