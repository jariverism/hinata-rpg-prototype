(() => {
  'use strict';

  function pointToChapterSix(button) {
    if (!button || button.dataset.chapter6Bound === '1') return;
    button.dataset.chapter6Bound = '1';
    button.textContent = '第6章へ進む';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      location.href = '../chapter6/';
    }, true);
  }

  function patchClearScreen() {
    const content = document.querySelector('#modalContent');
    if (!content) return;
    const text = content.textContent || '';
    if (!/第5章.*クリア|5章.*クリア/.test(text)) return;

    const buttons = [...content.querySelectorAll('button')];
    const next = buttons.find(button => /次章|進む|続ける/.test(button.textContent || ''));
    if (next) {
      pointToChapterSix(next);
      return;
    }

    if (content.querySelector('#continueToChapter6')) return;
    const wrapper = content.querySelector('.campaign-next,.modal-actions') || content;
    const button = document.createElement('button');
    button.id = 'continueToChapter6';
    button.textContent = '第6章へ進む';
    button.addEventListener('click', () => { location.href = '../chapter6/'; });
    wrapper.appendChild(button);
  }

  function offerResumeLink() {
    const campaign = window.HinataCampaign?.load();
    if (!campaign || campaign.completedChapter < 5) return;
    const menu = document.querySelector('#modalContent');
    if (!menu || menu.querySelector('#resumeChapter6')) return;
    if (!document.querySelector('#modal')?.open) return;
    const button = document.createElement('button');
    button.id = 'resumeChapter6';
    button.className = 'wide';
    button.textContent = '第6章へ進む';
    button.addEventListener('click', () => { location.href = '../chapter6/'; });
    menu.appendChild(button);
  }

  const observer = new MutationObserver(() => {
    patchClearScreen();
    offerResumeLink();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const content = document.querySelector('#modalContent');
    if (content) observer.observe(content, {childList:true, subtree:true, characterData:true});
    patchClearScreen();
    setInterval(patchClearScreen, 700);
  }, {once:true});
})();
