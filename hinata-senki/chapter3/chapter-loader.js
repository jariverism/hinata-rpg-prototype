(() => {
  'use strict';

  function patchSource(source) {
    const oldWeapon = "    slimSword:{name:'細身の剣',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30},\n    ironLance:";
    const newWeapon = "    slimSword:{name:'細身の剣',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30},\n    dagger:{name:'鋼の短剣',type:'sword',might:4,hit:95,crit:5,weight:2,range:[1],uses:35},\n    ironLance:";
    if (!source.includes(oldWeapon)) throw new Error('第3章の武器定義を特定できませんでした');
    source = source.replace(oldWeapon,newWeapon);

    const oldFreshHeader = "    return {\n      turn:1,";
    const newFreshHeader = "    return {\n      sourceCampaignUpdatedAt:window.HinataCampaign?.load()?.updatedAt || 0,\n      turn:1,";
    if (!source.includes(oldFreshHeader)) throw new Error('第3章の初期状態を特定できませんでした');
    source = source.replace(oldFreshHeader,newFreshHeader);

    const oldMigrate = "  function migrate(saved) {\n    if (!saved?.units) return null;";
    const newMigrate = "  function migrate(saved) {\n    if (!saved?.units) return null;\n    const sourceStamp=window.HinataCampaign?.load()?.updatedAt || 0;\n    if (!saved.cleared && saved.sourceCampaignUpdatedAt!==sourceStamp) return null;";
    if (!source.includes(oldMigrate)) throw new Error('第3章のセーブ移行処理を特定できませんでした');
    source = source.replace(oldMigrate,newMigrate);

    const oldIntro = "    if (!sessionStorage.getItem('hinata-senki-ch3-intro')) {\n      sessionStorage.setItem('hinata-senki-ch3-intro','1');";
    const newIntro = "    const introKey=`hinata-senki-ch3-intro-${state.sourceCampaignUpdatedAt || 0}`;\n    if (!sessionStorage.getItem(introKey)) {\n      sessionStorage.setItem(introKey,'1');";
    if (!source.includes(oldIntro)) throw new Error('第3章導入処理を特定できませんでした');
    source = source.replace(oldIntro,newIntro);

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
