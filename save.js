(function(global){
  'use strict';
  var KEYS={meta:'hinata_loop_meta',run:'hinata_loop_run',ending:'hinata_ending',screen:'hinata_screen',member:'hinata_sel'};
  function parse(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
  function remove(key){try{localStorage.removeItem(key);}catch(e){}}
  global.HinataSave={
    keys:KEYS,
    loadMeta:function(){return parse(KEYS.meta,{});},
    saveMeta:function(v){return write(KEYS.meta,v);},
    loadRun:function(){return parse(KEYS.run,null);},
    saveRun:function(v){if(v===null){remove(KEYS.run);return true;}return write(KEYS.run,v);},
    loadEnding:function(){return parse(KEYS.ending,null);},
    saveEnding:function(v){if(v===null){remove(KEYS.ending);return true;}return write(KEYS.ending,v);},
    loadScreen:function(){try{return localStorage.getItem(KEYS.screen)||'home';}catch(e){return 'home';}},
    saveScreen:function(v){try{localStorage.setItem(KEYS.screen,v);}catch(e){}},
    loadMember:function(){try{return Number(localStorage.getItem(KEYS.member))||3;}catch(e){return 3;}},
    saveMember:function(v){try{localStorage.setItem(KEYS.member,String(v));}catch(e){}}
  };
})(window);