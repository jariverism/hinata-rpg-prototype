(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const active = params.get('mode') === 'trial' || sessionStorage.getItem('hs-trial-active-v1') === '1';
  if (!active) return;

  document.documentElement.dataset.trialMode = 'chapter5';

  const style = document.createElement('style');
  style.textContent = `
    .trial-mode-banner{position:fixed;z-index:2400;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;padding:8px 10px;border:2px solid #d9c1ff;border-radius:8px;background:rgba(40,24,78,.96);color:#fff;font:700 12px/1.3 ui-monospace,"Hiragino Kaku Gothic ProN","Yu Gothic",monospace;box-shadow:0 5px 20px rgba(0,0,0,.45)}
    .trial-mode-banner button{min-height:34px;padding:5px 10px;border:2px solid #ffe08a;border-radius:5px;background:#754c99;color:#fff;font:inherit;font-size:12px;font-weight:900}
    @media(max-width:700px){.trial-mode-banner{right:max(10px,env(safe-area-inset-right));justify-content:space-between}}
  `;
  document.head.appendChild(style);

  function exitTrial() {
    location.href = '../';
  }

  function renderBanner() {
    if (document.querySelector('#chapter5TrialBanner')) return;
    const banner = document.createElement('aside');
    banner.id = 'chapter5TrialBanner';
    banner.className = 'trial-mode-banner';
    banner.innerHTML = '<span>第5章 試遊中</span><button type="button">試遊を終了</button>';
    banner.querySelector('button').addEventListener('click',exitTrial);
    document.body.appendChild(banner);
  }

  function guardContinuation() {
    document.querySelectorAll('button,a').forEach(element => {
      const text = (element.textContent || '').trim();
      if (!/次章へ|第6章へ/.test(text) || element.dataset.trialGuarded === '1') return;
      element.dataset.trialGuarded = '1';
      element.textContent = '試遊を終了';
      element.addEventListener('click',event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        exitTrial();
      },true);
    });
  }

  function start() {
    renderBanner();
    guardContinuation();
    new MutationObserver(guardContinuation).observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
