// v24.42 compatibility shim — legacy permanent keep lock disabled
(()=>{
const V39=window.V2439||{};
// Commander start placement is handled by v24.65. Do not override render or enemyAct here:
// the defending commander must be free to move after battle start.
window.V2442={
 enforceDefendingCommanderAtKeep(){return null},
 disabledPermanentKeepLock:true
};
})();
