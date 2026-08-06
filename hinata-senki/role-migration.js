(() => {
  'use strict';

  const CAMPAIGN_KEY='hinata-senki-campaign-v2';
  const LEGACY_ROSTER_KEY='hinata-senki-campaign-roster-v1';
  const CHAPTER_KEYS=[
    'hinata-senki-chapter3-save-v1',
    'hinata-senki-chapter4-save-v1',
    'hinata-senki-chapter5-save-v1'
  ];

  function read(key){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    }catch{return null;}
  }

  function write(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch{}
  }

  function migrateUnit(unit){
    if(!unit||typeof unit!=='object')return false;
    if(unit.id!=='mao'&&unit.name!=='井口眞緒')return false;
    let changed=false;
    if(unit.className==='軍師'){
      unit.className='踊り子';
      changed=true;
    }
    if(!unit.dancer){unit.dancer=true;changed=true;}
    if(unit.faction==='ally'&&(!Number.isFinite(unit.move)||unit.move<5)){
      unit.move=5;
      changed=true;
    }
    return changed;
  }

  function migrateCollection(value){
    if(!Array.isArray(value))return false;
    return value.reduce((changed,unit)=>migrateUnit(unit)||changed,false);
  }

  function migrateCampaign(data){
    if(!data||typeof data!=='object')return false;
    let changed=migrateCollection(data.units);
    Object.values(data.checkpoints||{}).forEach(units=>{changed=migrateCollection(units)||changed;});
    Object.values(data.snapshots||{}).forEach(snapshot=>{
      if(snapshot)changed=migrateCollection(snapshot.units)||changed;
    });
    return changed;
  }

  const campaign=read(CAMPAIGN_KEY);
  if(migrateCampaign(campaign))write(CAMPAIGN_KEY,campaign);

  const legacy=read(LEGACY_ROSTER_KEY);
  if(legacy&&migrateCollection(legacy.units))write(LEGACY_ROSTER_KEY,legacy);

  CHAPTER_KEYS.forEach(key=>{
    const save=read(key);
    if(save&&migrateCollection(save.units))write(key,save);
  });
})();
