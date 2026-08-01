const v18GaugeStamp=new WeakMap();
const v18RawAddGauge=v18AddGauge;
v18AddGauge=function(u,n){
 if(!u)return;
 const now=Date.now(),last=v18GaugeStamp.get(u);
 if(n===35&&last&&now-last<120)return;
 if(n===35)v18GaugeStamp.set(u,now);
 v18RawAddGauge(u,n);
};
