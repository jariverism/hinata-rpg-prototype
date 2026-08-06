(() => {
  'use strict';

  const NativeBlob=window.Blob;

  function patchRoleSource(source){
    if(!source.includes("id:'mao'")||!source.includes('function showActions'))return source;

    source=source.replace(
      /mao:\{maxHp:\.75,str:\.45,mag:\.35,skl:\.50,spd:\.55,lck:\.65,def:\.30,res:\.45\}/g,
      'mao:{maxHp:.75,str:.25,mag:.10,skl:.35,spd:.30,lck:.80,def:.20,res:.50}'
    );
    source=source.replace(/(id:'mao'[^\n}]*className:)'軍師'/g,"$1'踊り子'");
    source=source.replace(/('軍師':'策')/g,"$1,'踊り子':'舞'");
    source=source.replace(/('軍師':\['sword'\],)/g,"$1\n    '踊り子':['sword'],");

    if(!source.includes('function encouragementTargets(unit)')){
      const actionStart=source.indexOf('  function showActions(unit){');
      if(actionStart>=0){
        const functions=`  function encouragementTargets(unit){
    if(unit.className!=='踊り子'||unit.faction!=='ally')return[];
    return state.units.filter(target=>target.faction==='ally'&&target.id!==unit.id&&target.hp>0&&target.acted&&dist(unit,target)===1);
  }
  function chooseEncouragement(unit,targets){
    $('#modalContent').innerHTML='<h2>応援する仲間</h2><div id="encourageList" class="modal-actions"></div><div class="modal-actions"><button id="encourageCancel">戻る</button></div>';
    targets.forEach(target=>{
      const button=document.createElement('button');
      button.textContent=target.name;
      button.onclick=()=>{$('#modal').close();encourage(unit,target);};
      $('#encourageList').appendChild(button);
    });
    $('#encourageCancel').onclick=()=>$('#modal').close();
    if(!$('#modal').open)$('#modal').showModal();
  }
  function encourage(unit,target){
    target.acted=false;
    addLog(\`${unit.name}の応援で${target.name}が再び行動できる。\`);
    toast(\`${target.name}が再行動\`);
    finishAction(unit);
  }

`;
        source=source.slice(0,actionStart)+functions+source.slice(actionStart);
      }
    }

    source=source.replace(
      "healTargets=getHealTargets(unit),partner=adjacentAllies(unit)[0]",
      "healTargets=getHealTargets(unit),encourageTargets=encouragementTargets(unit),partner=adjacentAllies(unit)[0]"
    );
    source=source.replace(
      "if(healTargets.length)addAction('杖',()=>showStaffMenu(unit));",
      "if(healTargets.length)addAction('杖',()=>showStaffMenu(unit));if(encourageTargets.length)addAction('応援',()=>chooseEncouragement(unit,encourageTargets));"
    );
    source=source.replace(
      "if(healTargets.length)addAction('杖',()=>chooseHealTarget(unit,healTargets));",
      "if(healTargets.length)addAction('杖',()=>chooseHealTarget(unit,healTargets));if(encourageTargets.length)addAction('応援',()=>chooseEncouragement(unit,encourageTargets));"
    );
    return source;
  }

  function PatchedBlob(parts=[],options={}){
    if(options?.type==='text/javascript'){
      const text=parts.map(part=>typeof part==='string'?part:'').join('');
      if(text.includes('hinata-senki-chapter4-save-v1')||text.includes('hinata-senki-chapter5-save-v1')){
        const patched=patchRoleSource(text);
        return new NativeBlob([patched],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  PatchedBlob.prototype=NativeBlob.prototype;
  Object.setPrototypeOf(PatchedBlob,NativeBlob);
  window.Blob=PatchedBlob;
})();
