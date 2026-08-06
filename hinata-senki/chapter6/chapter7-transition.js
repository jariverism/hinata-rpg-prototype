(() => {
  'use strict';

  const SAVE_KEY = 'hinata-senki-chapter6-save-v1';

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function campaignCompleted() {
    return Number(window.HinataCampaign?.load()?.completedChapter || 0) >= 6;
  }

  function addContinueButton() {
    const content = document.querySelector('#modalContent');
    if (!content || content.querySelector('#continueChapter7')) return;
    const heading = content.querySelector('h2')?.textContent || '';
    if (!heading.includes('第6章クリア')) return;
    const actions = content.querySelector('.campaign-next, .modal-actions') || content;
    const button = document.createElement('button');
    button.id = 'continueChapter7';
    button.textContent = '次章へ進む';
    button.addEventListener('click', () => { location.href = '../chapter7/'; });
    actions.prepend(button);
  }

  function offerCompletedResume() {
    const saved = readSave();
    if (!saved?.cleared && !campaignCompleted()) return;
    const modal = document.querySelector('#modal');
    const content = document.querySelector('#modalContent');
    if (!modal || !content || modal.open) return;
    content.innerHTML = `
      <h2>第6章クリア済み</h2>
      <p>保存された部隊で次章から再開できます。</p>
      <div class="campaign-next">
        <button id="resumeChapter7">次章へ進む</button>
        <button id="replayChapter6Transition">この章を再確認する</button>
      </div>`;
    modal.showModal();
    document.querySelector('#resumeChapter7').onclick = () => { location.href = '../chapter7/'; };
    document.querySelector('#replayChapter6Transition').onclick = () => modal.close();
  }

  const observer = new MutationObserver(addContinueButton);
  window.addEventListener('DOMContentLoaded', () => {
    const content = document.querySelector('#modalContent');
    if (content) observer.observe(content, { childList:true, subtree:true });
    setTimeout(offerCompletedResume, 500);
  }, { once:true });
})();
