(() => {
  'use strict';

  function patchSource(source) {
    const selectionBlock = "    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    const stationaryActionBlock = "    if (clicked && selected && clicked.id===selected.id && selected.faction==='ally' && !selected.acted) {\n      showActions(selected);\n      return;\n    }\n\n    if (clicked) {\n      if (clicked.faction==='ally' && !clicked.acted) selectUnit(clicked);";
    if (!source.includes(selectionBlock)) throw new Error('その場行動の選択処理を特定できませんでした');
    source = source.replace(selectionBlock,stationaryActionBlock);

    const oldClearMarkup = "<div class=\"campaign-next\"><button id=\"replayChapter\">この章をやり直す</button></div><p class=\"campaign-note\">次の章が追加されたときは、この保存データからそのまま続行します。</p>";
    const newClearMarkup = "<div class=\"campaign-next\"><button id=\"continueCampaign\">第4章へ進む</button><button id=\"replayChapter\">この章をやり直す</button></div><p class=\"campaign-note\">今クリアした部隊、経験値、装備、耐久をそのまま第4章へ引き継ぎます。</p>";
    if (!source.includes(oldClearMarkup)) throw new Error('第3章クリア画面を特定できませんでした');
    source = source.replace(oldClearMarkup,newClearMarkup);

    const oldReplayHook = "    $('#replayChapter').onclick=()=>{ localStorage.removeItem(SAVE_KEY); window.HinataCampaign?.resetFrom(3); location.reload(); };";
    const newReplayHook = "    $('#continueCampaign').onclick=()=>{ location.href='../chapter4/'; };\n    $('#replayChapter').onclick=()=>{ localStorage.removeItem(SAVE_KEY); window.HinataCampaign?.resetFrom(3); location.reload(); };";
    if (!source.includes(oldReplayHook)) throw new Error('第3章クリア操作を特定できませんでした');
    return source.replace(oldReplayHook,newReplayHook);
  }

  async function start() {
    try {
      const response = await fetch('./game.js?v=2');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const patched = patchSource(await response.text());
      const url = URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => console.error('第3章の更新読み込みに失敗しました');
      document.body.appendChild(script);
    } catch (error) {
      console.error(error);
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent='更新の読み込みに失敗しました。再読み込みしてください。';
        toast.classList.add('show');
      }
    }
  }

  start();
})();
