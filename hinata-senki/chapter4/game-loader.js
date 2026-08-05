(() => {
  'use strict';

  function patchLegacyItems(source) {
    const oldItem = "    slimSword:{name:'細身の剣',kind:'weapon',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30,price:480},\n    steelSword:";
    const newItem = "    slimSword:{name:'細身の剣',kind:'weapon',type:'sword',might:3,hit:100,crit:5,weight:2,range:[1],uses:30,price:480},\n    dagger:{name:'鋼の短剣',kind:'weapon',type:'sword',might:4,hit:95,crit:5,weight:2,range:[1],uses:35,price:700},\n    steelSword:";
    if (!source.includes(oldItem)) throw new Error('短剣の追加位置を特定できませんでした');
    return source.replace(oldItem,newItem);
  }

  function patchEquipment(source) {
    const syncStart = source.indexOf('  function syncEquipped(unit){');
    const syncEnd = source.indexOf('  function currentEntry(unit)',syncStart);
    if (syncStart < 0 || syncEnd < 0) throw new Error('装備同期処理を特定できませんでした');

    const replacement = `  const classWeaponTypes={
    'ロード':['sword'],
    'ソシアルナイト':['sword','lance'],
    'シスター':['staff'],
    '盗賊':['sword'],
    '軍師':['sword'],
    '剣士':['sword'],
    '戦士':['axe'],
    '兵士':['lance'],
    '弓兵':['bow'],
    '重装兵':['lance']
  };
  function canEquip(unit,entry){
    const def=items[entry?.id];
    if(!def||!['weapon','staff'].includes(def.kind))return false;
    return (classWeaponTypes[unit.className]||[]).includes(def.type);
  }
  function syncEquipped(unit){
    let equipped=unit.inventory?.[unit.equippedIndex];
    if(!canEquip(unit,equipped)){
      const index=unit.inventory?.findIndex(entry=>canEquip(unit,entry))??-1;
      unit.equippedIndex=index>=0?index:0;
    }
    equipped=unit.inventory?.[unit.equippedIndex];
    if(canEquip(unit,equipped)){
      unit.weapon=equipped.id;
      unit.weaponUses=equipped.uses;
      if(items[equipped.id].kind==='staff'){
        unit.staves=unit.staves||{};
        unit.staves[equipped.id]=equipped.uses;
      }
    }else{
      unit.weapon=null;
      unit.weaponUses=0;
    }
  }
`;
    return source.slice(0,syncStart)+replacement+source.slice(syncEnd);
  }

  function patchActions(source) {
    const old = "if(partner)addAction('交換',()=>chooseTradePartner(unit));if(itemIndex>=0&&unit.hp<unit.maxHp)addAction('道具',()=>useHealingItem(unit,itemIndex));";
    const next = "if(unit.inventory.some((entry,index)=>canEquip(unit,entry)&&index!==unit.equippedIndex))addAction('装備',()=>showEquipMenu(unit));if(partner)addAction('交換',()=>chooseTradePartner(unit));if(itemIndex>=0&&unit.hp<unit.maxHp)addAction('道具',()=>useHealingItem(unit,itemIndex));";
    if (!source.includes(old)) throw new Error('行動メニューの装備挿入位置を特定できませんでした');
    source = source.replace(old,next);

    const oldStaffAction = "if(healTargets.length)addAction('杖',()=>chooseHealTarget(unit,healTargets));";
    const newStaffAction = "if(healTargets.length)addAction('杖',()=>showStaffMenu(unit));";
    if (!source.includes(oldStaffAction)) throw new Error('杖行動を特定できませんでした');
    return source.replace(oldStaffAction,newStaffAction);
  }

  function patchStaffAndEquipMenus(source) {
    const healStart = source.indexOf('  function getHealTargets(unit){');
    const healEnd = source.indexOf('  function adjacentAllies(unit)',healStart);
    if (healStart < 0 || healEnd < 0) throw new Error('回復対象処理を特定できませんでした');

    const healBlock = `  function availableStaffEntries(unit){
    ensureInventory(unit);
    return unit.inventory
      .map((entry,index)=>({entry,index,def:items[entry.id]}))
      .filter(record=>record.def?.kind==='staff'&&record.entry.uses>0&&canEquip(unit,record.entry));
  }
  function getHealTargets(unit,staffDef=null){
    const staffs=staffDef?[staffDef]:availableStaffEntries(unit).map(record=>record.def);
    if(!staffs.length)return[];
    return state.units.filter(target=>
      target.faction==='ally'&&target.id!==unit.id&&target.hp>0&&target.hp<target.maxHp&&
      staffs.some(staff=>staff.range.includes(dist(unit,target)))
    );
  }
`;
    source = source.slice(0,healStart)+healBlock+source.slice(healEnd);

    const actionStart = source.indexOf('  function showActions(unit){');
    if (actionStart < 0) throw new Error('行動メニュー位置を特定できませんでした');
    const equipBlock = `  function showEquipMenu(unit){
    const candidates=unit.inventory.map((entry,index)=>({entry,index})).filter(record=>canEquip(unit,record.entry));
    $('#modalContent').innerHTML=\`<h2>装備変更</h2><div id="equipList" class="inventory-list"></div><div class="modal-actions"><button id="equipCancel">戻る</button></div>\`;
    candidates.forEach(({entry,index})=>{
      const row=document.createElement('div');
      row.className=\`inventory-row \${index===unit.equippedIndex?'equipped':''}\`;
      row.innerHTML=\`<span>\${itemLabel(entry)}<small>\${index===unit.equippedIndex?'装備中':''}</small></span>\`;
      const button=document.createElement('button');
      button.textContent=index===unit.equippedIndex?'装備中':'装備';
      button.disabled=index===unit.equippedIndex;
      button.onclick=()=>{
        unit.equippedIndex=index;
        syncEquipped(unit);
        addLog(\`\${unit.name}は\${items[entry.id].name}を装備した。\`);
        $('#modal').close();
        showActions(unit);
        render();
        save(true);
      };
      row.appendChild(button);
      $('#equipList').appendChild(row);
    });
    $('#equipCancel').onclick=()=>$('#modal').close();
    if(!$('#modal').open)$('#modal').showModal();
  }

`;
    source = source.slice(0,actionStart)+equipBlock+source.slice(actionStart);

    const staffStart = source.indexOf('  function chooseHealTarget(healer,targets){');
    const staffEnd = source.indexOf('  async function playAllyTalk',staffStart);
    if (staffStart < 0 || staffEnd < 0) throw new Error('杖選択処理を特定できませんでした');

    const staffBlock = `  function showStaffMenu(healer){
    const staffs=availableStaffEntries(healer);
    if(!staffs.length)return toast('使える杖がありません');
    $('#modalContent').innerHTML='<h2>杖を選ぶ</h2><div id="staffList" class="modal-actions"></div><div class="modal-actions"><button id="staffCancel">戻る</button></div>';
    staffs.forEach(({entry,index,def})=>{
      const targets=getHealTargets(healer,def);
      const button=document.createElement('button');
      button.textContent=\`\${def.name} \${entry.uses}/\${def.uses}\`;
      button.disabled=!targets.length;
      button.onclick=()=>chooseHealTarget(healer,index,targets);
      $('#staffList').appendChild(button);
    });
    $('#staffCancel').onclick=()=>$('#modal').close();
    if(!$('#modal').open)$('#modal').showModal();
  }

  function chooseHealTarget(healer,staffIndex,targets){
    const staff=items[healer.inventory[staffIndex].id];
    $('#modalContent').innerHTML=\`<h2>\${staff.name}</h2><div id="healList" class="modal-actions"></div><div class="modal-actions"><button id="healBack">杖選択へ</button></div>\`;
    targets.forEach(target=>{
      const amount=Math.min(target.maxHp-target.hp,staff.heal+healer.mag),button=document.createElement('button');
      button.textContent=\`\${target.name}　HP \${target.hp}/\${target.maxHp}　＋\${amount}\`;
      button.onclick=()=>{$('#modal').close();useStaff(healer,target,staffIndex);};
      $('#healList').appendChild(button);
    });
    $('#healBack').onclick=()=>showStaffMenu(healer);
  }

  async function useStaff(healer,target,staffIndex){
    if(busy)return;
    busy=true;
    const entry=healer.inventory[staffIndex],staff=items[entry.id],before=target.hp;
    healer.equippedIndex=staffIndex;
    syncEquipped(healer);
    target.hp=Math.min(target.maxHp,target.hp+staff.heal+healer.mag);
    entry.uses-=1;
    if(entry.uses<=0)healer.inventory.splice(staffIndex,1);
    ensureInventory(healer);
    addLog(\`\${healer.name}は\${staff.name}を使った。\${target.name}のHP \${before}→\${target.hp}\`);
    render();
    await animateHeal(target);
    await gainExp(healer,staff.exp);
    busy=false;
    finishAction(healer);
  }

`;
    return source.slice(0,staffStart)+staffBlock+source.slice(staffEnd);
  }

  async function start() {
    try {
      const response=await fetch('./game.js?v=2');
      if(!response.ok)throw new Error(`game.js ${response.status}`);
      let source=await response.text();
      source=patchLegacyItems(source);
      source=patchEquipment(source);
      source=patchActions(source);
      source=patchStaffAndEquipMenus(source);
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      const script=document.createElement('script');
      script.src=url;
      script.onload=()=>URL.revokeObjectURL(url);
      script.onerror=()=>console.error('第4章の更新読み込みに失敗しました');
      document.body.appendChild(script);
    } catch(error) {
      console.error(error);
      const toast=document.querySelector('#toast');
      if(toast){toast.textContent='更新の読み込みに失敗しました。再読み込みしてください。';toast.classList.add('show');}
    }
  }

  start();
})();
