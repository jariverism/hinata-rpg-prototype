(() => {
  'use strict';

  function patchChapterOneStory(source) {
    source = source
      .replace("        '城門の向こうへ脱出せよ。',", "        '北門の指揮官を退け、取り残された人々の退路を確保せよ。',")
      .replace("        '久美「まずはみんな、生きてここを出るよ！」'", "        '久美「一人の正解で進まない。みんなの判断をつないで北門を抜けるよ」'");

    const oldRecruit = [
      "    addLog('久美「紗理菜、一緒に来て。ここに残るより、助けられる人を増やそう」');",
      "    addLog('紗理菜「……うん。みんなを置いてはいけないから」');",
      "    addLog('潮紗理菜が仲間になった！');"
    ].join('\n');
    const newRecruit = [
      "    addLog('久美「紗理菜、治療院の人たちは？」');",
      "    addLog('紗理菜「裏道へ誘導しました。今度は私も一緒に行きます」');",
      "    addLog('潮紗理菜が仲間になった！');"
    ].join('\n');
    if (source.includes(oldRecruit)) source = source.replace(oldRecruit, newRecruit);

    const visitStart = source.indexOf('  function visitVillage(unit) {');
    const visitEnd = source.indexOf('  function showForecast(', visitStart);
    if (visitStart < 0 || visitEnd < 0) throw new Error('第1章の村訪問処理を特定できませんでした');
    const visitBlock = [
      "  function visitVillage(unit) {",
      "    state.villageVisited = true;",
      "    state.storyFlags = state.storyFlags || {};",
      "    state.storyFlags.villageEvacuated = true;",
      "    unit.hp = Math.min(unit.maxHp,unit.hp+10);",
      "    addLog(`${unit.name}は村の人々を裏道へ避難させ、負傷者用の薬を受け取った。`);",
      "    addLog('村人「北街道の牢獄砦から、救援の火が上がっています」');",
      "    toast('住民の避難を完了し、薬を受け取った');",
      "    finishAction(unit);",
      "  }",
      "",
      ""
    ].join('\n');
    source = source.slice(0, visitStart) + visitBlock + source.slice(visitEnd);
    return source;
  }

  function patchCampaignFeatures(source) {
    source = patchChapterOneStory(source);

    const waitBlock = "      if (x === pendingMove.x && y === pendingMove.y) {\n        showActions(selected);\n        return;\n      }";
    const directWaitBlock = "      if (x === pendingMove.x && y === pendingMove.y) {\n        finishAction(selected);\n        return;\n      }";
    if (!source.includes(waitBlock)) throw new Error('移動後待機処理を特定できませんでした');
    source = source.replace(waitBlock,directWaitBlock);

    const unitSelectionBlock = "    if (unit) {\n      if (unit.faction === 'ally' && !unit.acted) {\n        selectUnit(unit);";
    const stationaryActionBlock = "    if (unit && selected && unit.id === selected.id && selected.faction === 'ally' && !selected.acted) {\n      showActions(selected);\n      return;\n    }\n\n    if (unit) {\n      if (unit.faction === 'ally' && !unit.acted) {\n        selectUnit(unit);";
    if (!source.includes(unitSelectionBlock)) throw new Error('その場行動の選択処理を特定できませんでした');
    source = source.replace(unitSelectionBlock,stationaryActionBlock);

    const enemyBattleStart = source.indexOf('  async function battleEnemy(enemy,target) {');
    const enemyBattleEnd = source.indexOf('  function healForts() {',enemyBattleStart);
    if (enemyBattleStart < 0 || enemyBattleEnd < 0) throw new Error('敵フェイズ戦闘処理を特定できませんでした');
    const enemyBattle = [
      "  async function battleEnemy(enemy,target) {",
      "    let countered = false;",
      "    await strike(enemy,target,false);",
      "    if (target.hp > 0 && enemy.hp > 0 && canAttack(target,enemy)) {",
      "      countered = true;",
      "      await strike(target,enemy,false);",
      "    }",
      "    if (enemy.hp > 0 && target.hp > 0 && forecast(enemy,target).hits === 2) {",
      "      await strike(enemy,target,true);",
      "    }",
      "",
      "    if (target.hp <= 0) defeat(target,enemy);",
      "    if (enemy.hp <= 0) defeat(enemy,target);",
      "",
      "    if (countered && target.faction === 'ally' && target.hp > 0) {",
      "      await gainCombatExp(target,enemy);",
      "    }",
      "",
      "    render();",
      "    await sleep(260);",
      "  }",
      "",
      ""
    ].join('\n');
    source = source.slice(0,enemyBattleStart) + enemyBattle + source.slice(enemyBattleEnd);

    const clearStart = source.indexOf('  function seize() {');
    const clearEnd = source.indexOf('  function checkDefeat() {',clearStart);
    if (clearStart < 0 || clearEnd < 0) throw new Error('章クリア処理を特定できませんでした');
    const clearBlock = [
      "  function seize() {",
      "    state.cleared = true;",
      "    addLog('北門を突破した！');",
      "    const roster = state.units",
      "      .filter(unit => unit.faction === 'ally' && unit.hp > 0)",
      "      .map(unit => ({ ...unit, acted:false, hp:unit.maxHp }));",
      "    const storyFlags = state.storyFlags || {};",
      "    window.HinataCampaign?.saveRoster(1,roster,{",
      "      lastTurn:state.turn,",
      "      flags:{ chapter1VillageEvacuated:Boolean(storyFlags.villageEvacuated) },",
      "      extra:{ chapter1Reworked:true }",
      "    });",
      "    render();",
      "    save(true);",
      "    $('#modalContent').innerHTML = `",
      "      <h2>第1章クリア</h2>",
      "      <p>北門を突破しました。部隊の状態、経験値、装備、救援結果を保存しました。</p>",
      "      <div class=\"campaign-next\">",
      "        <button id=\"continueCampaign\">次章へ進む</button>",
      "        <button id=\"replayChapter\">この章をやり直す</button>",
      "      </div>",
      "    `;",
      "    $('#modal').showModal();",
      "    $('#continueCampaign').onclick = () => { location.href = './chapter2/'; };",
      "    $('#replayChapter').onclick = () => {",
      "      localStorage.removeItem(SAVE_KEY);",
      "      window.HinataCampaign?.resetFrom(1);",
      "      location.reload();",
      "    };",
      "  }",
      "",
      ""
    ].join('\n');
    source = source.slice(0,clearStart) + clearBlock + source.slice(clearEnd);
    return source;
  }

  function installCampaignPatch(loaderSource) {
    const helper = patchCampaignFeatures.toString().replace(/^  /gm,'    ').replace(/^function /,'  function ') + '\n\n';
    const storyHelper = patchChapterOneStory.toString().replace(/^  /gm,'    ').replace(/^function /,'  function ') + '\n\n';
    const marker = '  function patchGameSource(source) {';
    if (!loaderSource.includes(marker)) throw new Error('更新ローダーの構造を確認できませんでした');
    loaderSource = loaderSource.replace(marker,storyHelper + helper + marker);

    const oldReturn = '    return source.slice(0,gainStart) + patchedExperienceBlock() + source.slice(finishStart);';
    const newReturn = '    source = source.slice(0,gainStart) + patchedExperienceBlock() + source.slice(finishStart);\n    return patchCampaignFeatures(source);';
    if (!loaderSource.includes(oldReturn)) throw new Error('経験値更新処理を接続できませんでした');
    return loaderSource.replace(oldReturn,newReturn);
  }

  function readSave(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function offerCompletedSaveResume() {
    const saved = readSave('hinata-senki-save-v1');
    if (!saved?.cleared || !Array.isArray(saved.units)) return;

    const existing = window.HinataCampaign?.load();
    if (!existing || existing.completedChapter < 1) {
      window.HinataCampaign?.saveRoster(1,saved.units,{
        migratedFromLegacy:true,
        flags:{chapter1VillageEvacuated:Boolean(saved.storyFlags?.villageEvacuated)}
      });
    }

    const modal = document.querySelector('#modal');
    const content = document.querySelector('#modalContent');
    if (!modal || !content) return;
    content.innerHTML = `
      <h2>第1章クリア済み</h2>
      <p>以前のセーブデータをキャンペーン形式へ引き継ぎました。</p>
      <div class="campaign-next">
        <button id="continueLegacyCampaign">次章へ進む</button>
        <button id="restartLegacyChapter">この章を最初から</button>
      </div>`;
    if (!modal.open) modal.showModal();
    document.querySelector('#continueLegacyCampaign').onclick = () => { location.href='./chapter2/'; };
    document.querySelector('#restartLegacyChapter').onclick = () => {
      localStorage.removeItem('hinata-senki-save-v1');
      window.HinataCampaign?.resetFrom(1);
      location.reload();
    };
  }

  window.addEventListener('hinata-game-ready',offerCompletedSaveResume,{once:true});

  async function start() {
    try {
      const response = await fetch('./exp-level-loader.js?v=1');
      if (!response.ok) throw new Error(`loader ${response.status}`);
      const source = installCampaignPatch(await response.text());
      const url = URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => URL.revokeObjectURL(url);
      script.onerror = () => console.error('キャンペーン更新の起動に失敗しました');
      document.body.appendChild(script);
    } catch (error) {
      console.error(error);
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = '更新の読み込みに失敗しました。ページを再読み込みしてください。';
        toast.classList.add('show');
      }
    }
  }

  start();
})();
