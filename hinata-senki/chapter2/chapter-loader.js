(() => {
  'use strict';

  function patchSource(source) {
    const oldCarry = "    const defaults = defaultAllies();\n    const saved = safeParse(PROLOGUE_SAVE_KEY);";
    const newCarry = "    const defaults = defaultAllies();\n    const campaignUnits = window.HinataCampaign?.loadRoster(1);\n    const saved = campaignUnits ? { units:campaignUnits } : safeParse(PROLOGUE_SAVE_KEY);";
    if (!source.includes(oldCarry)) throw new Error('部隊引継ぎ処理を特定できませんでした');
    source = source.replace(oldCarry,newCarry);

    const oldWait = "      if (x === pendingMove.x && y === pendingMove.y) {\n        showActions(selected);\n        return;\n      }";
    const newWait = "      if (x === pendingMove.x && y === pendingMove.y) {\n        finishAction(selected);\n        return;\n      }";
    if (!source.includes(oldWait)) throw new Error('待機操作を特定できませんでした');
    source = source.replace(oldWait,newWait);

    const clearStart = source.indexOf('  function clearChapter() {');
    const clearEnd = source.indexOf('  function checkDefeat() {',clearStart);
    if (clearStart < 0 || clearEnd < 0) throw new Error('章クリア処理を特定できませんでした');

    const replacement = [
      "  function clearChapter() {",
      "    state.cleared=true;",
      "    const roster=state.units",
      "      .filter(unit => unit.faction==='ally'&&unit.hp>0)",
      "      .map(unit => ({...unit,acted:false,hp:unit.maxHp}));",
      "    localStorage.setItem(ROSTER_KEY,JSON.stringify({chapter:2,units:roster}));",
      "    window.HinataCampaign?.saveRoster(2,roster,{ turn2:state.turn });",
      "    save(true);",
      "    $('#modalContent').innerHTML=`",
      "      <h2>第2章クリア</h2>",
      "      <p>部隊の状態、経験値、装備、所持品を保存しました。</p>",
      "      <p>戦績　ターン ${state.turn}</p>",
      "      <div class=\"campaign-next\">",
      "        <button id=\"continueCampaign\">次章へ進む</button>",
      "        <button id=\"replayChapter\">この章をやり直す</button>",
      "      </div>`;",
      "    $('#modal').showModal();",
      "    $('#continueCampaign').onclick=() => { location.href='../chapter3/'; };",
      "    $('#replayChapter').onclick=() => {",
      "      localStorage.removeItem(SAVE_KEY);",
      "      window.HinataCampaign?.resetFrom(2);",
      "      location.reload();",
      "    };",
      "  }",
      "",
      ""
    ].join('\n');

    return source.slice(0,clearStart) + replacement + source.slice(clearEnd);
  }

  function readSave(key) {
    try {
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    } catch {
      return null;
    }
  }

  function offerCompletedSaveResume() {
    const saved=readSave('hinata-senki-chapter2-save-v1');
    if (!saved?.cleared||!Array.isArray(saved.units)) return;
    const existing=window.HinataCampaign?.load();
    if (!existing||existing.completedChapter<2) {
      window.HinataCampaign?.saveRoster(2,saved.units,{migratedFromLegacy:true});
    }
    const modal=document.querySelector('#modal');
    const content=document.querySelector('#modalContent');
    if (!modal||!content) return;
    content.innerHTML=`
      <h2>第2章クリア済み</h2>
      <p>以前のセーブデータをキャンペーン形式へ引き継ぎました。</p>
      <div class="campaign-next">
        <button id="continueLegacyCampaign">次章へ進む</button>
        <button id="restartLegacyChapter">この章を最初から</button>
      </div>`;
    if (!modal.open) modal.showModal();
    document.querySelector('#continueLegacyCampaign').onclick=()=>{location.href='../chapter3/';};
    document.querySelector('#restartLegacyChapter').onclick=()=>{
      localStorage.removeItem('hinata-senki-chapter2-save-v1');
      window.HinataCampaign?.resetFrom(2);
      location.reload();
    };
  }

  async function start() {
    try {
      const response = await fetch('./game.js?v=1');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const patched = patchSource(await response.text());
      const url = URL.createObjectURL(new Blob([patched],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        URL.revokeObjectURL(url);
        setTimeout(offerCompletedSaveResume,0);
      };
      script.onerror = () => console.error('第2章の更新読み込みに失敗しました');
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
