(() => {
  'use strict';
  const NativeBlob=window.Blob;
  const oldCourier="make('courier','敵伝令','令','剣士',13,4,7,20,8,12,14,5,4,7,'slimSword','escape',{important:true,lck:8})";
  const newCourier="make('courier','敵伝令','令','剣士',11,7,7,20,8,12,14,5,4,5,'slimSword','escape',{important:true,lck:8})";

  function BalancedBlob(parts=[],options={}){
    if(options?.type==='text/javascript'){
      const text=parts.map(part=>typeof part==='string'?part:'').join('');
      if(text.includes("const SAVE_KEY = 'hinata-senki-chapter5-save-v1';")&&text.includes(oldCourier)){
        return new NativeBlob([text.replace(oldCourier,newCourier)],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  BalancedBlob.prototype=NativeBlob.prototype;
  Object.setPrototypeOf(BalancedBlob,NativeBlob);
  window.Blob=BalancedBlob;
})();