(() => {
  'use strict';

  const SCRIPT_SEQUENCE = [
    './portraits/kumi.js?v=1',
    './portraits/toshi.js?v=1',
    './portraits/kyoko.js?v=1',
    './portraits/mao.js?v=1',
    './portraits/sarina.js?v=1',
    './portraits/hina.js?v=1',
    './ui-story-patch.js?v=3',
    './portrait-assets.js?v=1'
  ];

  const LEVEL_UP_CSS = `
.level-up-overlay{position:fixed;inset:0;z-index:1400;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:rgba(2,7,17,.78);backdrop-filter:blur(2px)}
.level-up-overlay[hidden]{display:none}
.level-up-panel{width:min(680px,96vw);overflow:hidden;border:4px solid #cfb96f;border-radius:8px;background:linear-gradient(180deg,#0b2868,#071844 72%);color:#fff;box-shadow:0 0 0 3px #21190e,0 18px 60px rgba(0,0,0,.65),inset 0 0 0 3px #294994;font-family:ui-monospace,"Hiragino Kaku Gothic ProN","Yu Gothic",monospace;image-rendering:pixelated}
.level-up-title{padding:9px 14px;border-bottom:2px solid #cfb96f;background:linear-gradient(90deg,#4c2315,#9e5a24,#4c2315);font-size:clamp(20px,5vw,31px);font-weight:900;text-align:center;letter-spacing:.12em;text-shadow:2px 2px 0 #2a100a}
.level-up-main{display:grid;grid-template-columns:clamp(116px,28vw,190px) minmax(0,1fr);gap:15px;padding:15px}
.level-up-profile{display:flex;flex-direction:column;gap:9px;align-items:center}
.level-up-portrait{width:100%;aspect-ratio:1;object-fit:cover;border:3px solid #e0c775;background:#082167;box-shadow:0 0 0 2px #24190c;image-rendering:pixelated}
.level-up-unit-name{font-size:clamp(14px,3.4vw,19px);font-weight:900;text-align:center;color:#ffe799}
.level-up-class{font-size:12px;color:#bdc9e8;text-align:center}
.level-up-level{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:7px;border:2px solid #d0b76c;background:#102e6e;font-weight:900}
.level-up-level strong{font-size:25px;color:#fff39c}
.level-up-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-content:start}
.level-up-stat{position:relative;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px;min-height:44px;padding:7px 9px;border:2px solid #6e82b8;background:#0a225a;box-shadow:inset 0 0 0 1px #1f3f83;opacity:.76;transition:transform .18s ease,background .18s ease,border-color .18s ease,opacity .18s ease}
.level-up-stat .label{font-weight:800;color:#d7e0f7}.level-up-stat .before{color:#aab8d9}.level-up-stat .after{min-width:27px;font-size:19px;font-weight:900;text-align:right;color:#fff}
.level-up-stat .gain{position:absolute;right:5px;top:-12px;display:none;padding:1px 5px;border:1px solid #513609;background:#ffe578;color:#402900;font-size:12px;font-weight:900;box-shadow:2px 2px 0 rgba(0,0,0,.45)}
.level-up-stat.raised{opacity:1;transform:scale(1.04);border-color:#ffe46d;background:#17438a;box-shadow:0 0 13px rgba(255,226,87,.62),inset 0 0 0 2px #3d68b4}.level-up-stat.raised .after{color:#fff7a6}.level-up-stat.raised .gain{display:block;animation:levelGainPop .42s steps(3,end)}.level-up-stat.no-gain{opacity:.62}
.level-up-message{min-height:28px;padding:0 16px 10px;color:#fff3b2;font-weight:800;text-align:center}.level-up-actions{display:flex;justify-content:center;padding:10px 14px max(13px,env(safe-area-inset-bottom));border-top:1px solid rgba(222,199,117,.55);background:rgba(3,10,29,.55)}
.level-up-confirm{min-width:150px;min-height:44px;border:2px solid #d8c078;background:#173d82;color:#fff;font:inherit;font-weight:900;box-shadow:inset 0 0 0 2px #315da7}.level-up-confirm:disabled{opacity:.35}
@keyframes levelGainPop{0%{transform:translateY(9px) scale(.5)}60%{transform:translateY(-3px) scale(1.18)}100%{transform:none}}
@media(max-width:540px){.level-up-main{grid-template-columns:102px minmax(0,1fr);gap:9px;padding:10px}.level-up-stats{gap:5px}.level-up-stat{min-height:38px;padding:5px 6px;font-size:12px}.level-up-stat .after{font-size:16px}.level-up-title{padding:6px 10px}.level-up-unit-name{font-size:12px}.level-up-class{font-size:10px}.level-up-level{padding:5px;font-size:11px}.level-up-level strong{font-size:21px}}
`;

  function installLevelStyles() {
    if (document.querySelector('#levelUpStyles')) return;
    const style = document.createElement('style');
    style.id = 'levelUpStyles';
    style.textContent = LEVEL_UP_CSS;
    document.head.appendChild(style);
  }

  function loadScript(src) {
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`読み込み失敗: ${src}`));
      document.body.appendChild(script);
    });
  }

  function patchedExperienceBlock() {
    return [
      "  function combatExpAmount(unit,enemy) {",
      "    const levelDifference = (enemy.lv || 1) - (unit.lv || 1);",
      "    if (enemy.hp <= 0) {",
      "      if (enemy.boss) return 100;",
      "      return Math.max(15,Math.min(80,40 + levelDifference*8));",
      "    }",
      "    return Math.max(5,Math.min(18,10 + levelDifference*2));",
      "  }",
      "",
      "  async function gainCombatExp(unit,enemy) {",
      "    const amount = combatExpAmount(unit,enemy);",
      "    addLog(`${unit.name}は経験値を${amount}獲得した。`);",
      "    await gainExp(unit,amount);",
      "  }",
      "",
      "  function growthRates(unit) {",
      "    if (unit.className === 'シスター') return { maxHp:.55, str:.10, mag:.70, skl:.55, spd:.55, lck:.75, def:.20, res:.60 };",
      "    if (unit.className === 'ソシアルナイト') return { maxHp:.75, str:.55, mag:.08, skl:.55, spd:.55, lck:.50, def:.45, res:.25 };",
      "    return { maxHp:.80, str:.55, mag:.12, skl:.60, spd:.55, lck:.55, def:.40, res:.25 };",
      "  }",
      "",
      "  async function gainExp(unit,amount) {",
      "    unit.exp = (unit.exp || 0) + amount;",
      "    addLog(`EXP ${Math.min(unit.exp,99)}/100`);",
      "    while (unit.exp >= 100) {",
      "      unit.exp -= 100;",
      "      const oldLevel = unit.lv;",
      "      const before = { maxHp:unit.maxHp, str:unit.str, mag:unit.mag, skl:unit.skl, spd:unit.spd, lck:unit.lck, def:unit.def, res:unit.res };",
      "      unit.lv += 1;",
      "      const gains = {};",
      "      Object.entries(growthRates(unit)).forEach(([statName,rate]) => {",
      "        if (Math.random() < rate) {",
      "          unit[statName] += 1;",
      "          if (statName === 'maxHp') unit.hp += 1;",
      "          gains[statName] = 1;",
      "        }",
      "      });",
      "      addLog(`${unit.name}はレベル${unit.lv}になった！`);",
      "      render();",
      "      await showLevelUp(unit,oldLevel,before,gains);",
      "    }",
      "  }",
      "",
      "  function ensureLevelUpOverlay() {",
      "    let overlay = document.querySelector('#levelUpOverlay');",
      "    if (overlay) return overlay;",
      "    overlay = document.createElement('section');",
      "    overlay.id = 'levelUpOverlay';",
      "    overlay.className = 'level-up-overlay';",
      "    overlay.hidden = true;",
      "    overlay.innerHTML = `<div class=\"level-up-panel\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"levelUpTitle\"><div class=\"level-up-title\" id=\"levelUpTitle\">LEVEL UP!</div><div class=\"level-up-main\"><div class=\"level-up-profile\"><img class=\"level-up-portrait\" id=\"levelUpPortrait\" alt=\"\"><div class=\"level-up-unit-name\" id=\"levelUpName\"></div><div class=\"level-up-class\" id=\"levelUpClass\"></div><div class=\"level-up-level\"><span>LV</span><b id=\"levelUpOld\"></b><span>→</span><strong id=\"levelUpNew\"></strong></div></div><div class=\"level-up-stats\" id=\"levelUpStats\"></div></div><div class=\"level-up-message\" id=\"levelUpMessage\"></div><div class=\"level-up-actions\"><button class=\"level-up-confirm\" id=\"levelUpConfirm\" disabled>確認</button></div></div>`;",
      "    document.body.appendChild(overlay);",
      "    return overlay;",
      "  }",
      "",
      "  async function showLevelUp(unit,oldLevel,before,gains) {",
      "    const overlay = ensureLevelUpOverlay();",
      "    const labels = { maxHp:'HP', str:'力', mag:'魔力', skl:'技', spd:'速さ', lck:'幸運', def:'守備', res:'魔防' };",
      "    const order = ['maxHp','str','mag','skl','spd','lck','def','res'];",
      "    const portrait = window.HINATA_PORTRAITS?.[unit.name] || '';",
      "    const portraitElement = overlay.querySelector('#levelUpPortrait');",
      "    portraitElement.src = portrait;",
      "    portraitElement.style.visibility = portrait ? 'visible' : 'hidden';",
      "    overlay.querySelector('#levelUpName').textContent = unit.name;",
      "    overlay.querySelector('#levelUpClass').textContent = unit.className;",
      "    overlay.querySelector('#levelUpOld').textContent = oldLevel;",
      "    overlay.querySelector('#levelUpNew').textContent = unit.lv;",
      "    overlay.querySelector('#levelUpMessage').textContent = '能力値を確認してください';",
      "    const stats = overlay.querySelector('#levelUpStats');",
      "    stats.innerHTML = order.map(statName => `<div class=\"level-up-stat ${gains[statName] ? 'pending' : 'no-gain'}\" data-stat=\"${statName}\"><span class=\"label\">${labels[statName]}</span><span class=\"before\">${before[statName]}</span><span class=\"after\">${unit[statName]}</span><span class=\"gain\">+1</span></div>`).join('');",
      "    const confirm = overlay.querySelector('#levelUpConfirm');",
      "    confirm.disabled = true;",
      "    overlay.hidden = false;",
      "    const raisedStats = order.filter(statName => gains[statName]);",
      "    if (!raisedStats.length) {",
      "      overlay.querySelector('#levelUpMessage').textContent = '能力上昇なし';",
      "      await sleep(550);",
      "    } else {",
      "      for (const statName of raisedStats) {",
      "        await sleep(330);",
      "        stats.querySelector(`[data-stat=\"${statName}\"]`)?.classList.add('raised');",
      "      }",
      "      overlay.querySelector('#levelUpMessage').textContent = `${raisedStats.length}項目の能力が上昇した！`;",
      "      await sleep(250);",
      "    }",
      "    confirm.disabled = false;",
      "    await new Promise(resolve => {",
      "      const close = () => { confirm.removeEventListener('click',close); overlay.hidden = true; resolve(); };",
      "      confirm.addEventListener('click',close);",
      "    });",
      "  }",
      "",
      ""
    ].join('\n');
  }

  function patchGameSource(source) {
    const oldStaffExp = '    gainExp(healer,staff.exp);';
    if (!source.includes(oldStaffExp)) throw new Error('杖経験値処理を特定できませんでした');
    source = source.replace(oldStaffExp,'    await gainExp(healer,staff.exp);');

    const oldBattleExp = "    if (attacker.faction === 'ally' && attacker.hp > 0) {\n      gainExp(attacker,defender.hp <= 0 ? 35 : Math.max(1,Math.floor((defenderStartHp-defender.hp)/2)));\n    }";
    const newBattleExp = "    if (attacker.faction === 'ally' && attacker.hp > 0) {\n      await gainCombatExp(attacker,defender);\n    }";
    if (!source.includes(oldBattleExp)) throw new Error('戦闘経験値処理を特定できませんでした');
    source = source.replace(oldBattleExp,newBattleExp);

    const gainStart = source.indexOf('  function gainExp(unit,amount) {');
    const finishStart = source.indexOf('  function finishAction(unit) {',gainStart);
    if (gainStart < 0 || finishStart < 0) throw new Error('レベルアップ処理を特定できませんでした');
    return source.slice(0,gainStart) + patchedExperienceBlock() + source.slice(finishStart);
  }

  async function start() {
    installLevelStyles();
    try {
      const response = await fetch('./game.js?v=2');
      if (!response.ok) throw new Error(`game.js ${response.status}`);
      const original = await response.text();
      const patched = patchGameSource(original);
      const blobUrl = URL.createObjectURL(new Blob([patched],{ type:'text/javascript' }));
      await loadScript(blobUrl);
      URL.revokeObjectURL(blobUrl);
      for (const src of SCRIPT_SEQUENCE) await loadScript(src);
      window.dispatchEvent(new CustomEvent('hinata-game-ready'));
    } catch (error) {
      console.error(error);
      const toast = document.querySelector('#toast');
      if (toast) {
        toast.textContent = 'ゲーム更新の読み込みに失敗しました。再読み込みしてください。';
        toast.classList.add('show');
      }
    }
  }

  start();
})();
