const assert=require('assert');
global.window=global;
global.document={querySelectorAll:()=>[],querySelector:()=>null};
global.setTimeout=(fn)=>{fn();return 1};
global.render=()=>true;global.beginGame=()=>true;global.beginBattle=()=>true;global.startScreen=()=>true;
global.HINATA_START=[{name:'佐々木久美',lead:1,war:2,int:3,pol:4,cha:5},{name:'加藤史帆',lead:5,war:4,int:3,pol:2,cha:1}];
global.V2458={FIFTH:[{name:'大野愛実',lead:1,war:1,int:1,pol:1,cha:1}]};
global.state={modeId:'kumi',officers:[
 {name:'佐々木久美',lead:10,war:10,int:10,pol:10,cha:10},
 {name:'河田陽菜',lead:68,war:55,int:96,pol:58,cha:78},
 {name:'髙橋未来虹',lead:1,war:1,int:1,pol:1,cha:1},
 {name:'大野愛実',lead:1,war:1,int:1,pol:1,cha:1}
],battle:null};
require('../v24_74_hinata_fixed_stats.js');
const api=global.V2474;assert(api,'v24.74 API missing');
assert.equal(api.count,46,'canonical table must cover all 46 listed Hinata members');
api.applyState();
const by=n=>state.officers.find(o=>o.name===n);
assert.deepEqual([by('佐々木久美').lead,by('佐々木久美').war,by('佐々木久美').int,by('佐々木久美').pol,by('佐々木久美').cha],[98,85,85,92,91]);
assert.deepEqual([by('河田陽菜').lead,by('河田陽菜').war,by('河田陽菜').int,by('河田陽菜').pol,by('河田陽菜').cha],[82,88,49,64,93]);
assert.deepEqual([by('髙橋未来虹').lead,by('髙橋未来虹').war,by('髙橋未来虹').int,by('髙橋未来虹').pol,by('髙橋未来虹').cha],[95,95,88,75,89]);
assert.deepEqual([by('大野愛実').lead,by('大野愛実').war,by('大野愛実').int,by('大野愛実').pol,by('大野愛実').cha],[97,90,84,84,99]);
// Simulate another random generation: canonicalization must produce exactly the same values.
Object.assign(by('河田陽菜'),{lead:92,war:92,int:62,pol:92,cha:98});
Object.assign(by('大野愛実'),{lead:12,war:13,int:14,pol:15,cha:16});
api.applyState();
assert.deepEqual([by('河田陽菜').lead,by('河田陽菜').war,by('河田陽菜').int,by('河田陽菜').pol,by('河田陽菜').cha],[82,88,49,64,93],'Kawata must be invariant across random seeds');
assert.deepEqual([by('大野愛実').lead,by('大野愛実').war,by('大野愛実').int,by('大野愛実').pol,by('大野愛実').cha],[97,90,84,84,99],'fifth generation must stay exact');
assert.deepEqual([HINATA_START[0].lead,HINATA_START[0].war,HINATA_START[0].int,HINATA_START[0].pol,HINATA_START[0].cha],[98,85,85,92,91],'start source must also be canonical');
console.log('Hinata fixed stat tests: PASS');
