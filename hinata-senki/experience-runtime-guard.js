(() => {
  'use strict';

  const NativeBlob = window.Blob;

  function insertSupportExperience(source) {
    if (!source.includes('\n  async function useStaff(healer,target,staffId)')) return source;
    if (!source.includes('\n  function gainExp(unit,amount)') && !source.includes('\n  async function gainExp(unit,amount)')) return source;

    const staffStart = source.indexOf('\n  async function useStaff(healer,target,staffId)');
    const staffEnd = source.indexOf('\n  function ',staffStart + 4);
    const asyncStaffEnd = source.indexOf('\n  async function ',staffStart + 4);
    const candidates = [staffEnd,asyncStaffEnd].filter(index => index > staffStart);
    const end = candidates.length ? Math.min(...candidates) : source.length;
    let staffBlock = source.slice(staffStart,end);

    const replacements = [
      '    await gainExp(healer,staff.exp);',
      '    gainExp(healer,staff.exp);',
      '    await gainExp(healer, staff.exp);',
      '    gainExp(healer, staff.exp);'
    ];
    const found = replacements.find(value => staffBlock.includes(value));
    if (!found) return source;

    staffBlock = staffBlock.replace(found,'    await gainStaffExp(healer,staff,Math.max(0,target.hp-before));');
    source = source.slice(0,staffStart) + staffBlock + source.slice(end);

    if (source.includes('\n  async function gainStaffExp(')) return source;
    const helper = `
  function staffExpAmount(staff,effectiveHeal) {
    const base = Number(staff?.exp) || 10;
    return Math.max(8,Math.min(25,base + Math.floor(Math.max(0,effectiveHeal)/5)));
  }

  async function gainStaffExp(healer,staff,effectiveHeal) {
    const amount = staffExpAmount(staff,effectiveHeal);
    addLog(\`${'${healer.name}'}は回復で経験値を${'${amount}'}獲得した。\`);
    await gainExp(healer,amount);
  }

`;
    const markerCandidates = [
      source.indexOf('\n  function combatExpAmount('),
      source.indexOf('\n  async function gainCombatExp('),
      source.indexOf('\n  function growthRates('),
      source.indexOf('\n  function gainExp(unit,amount)'),
      source.indexOf('\n  async function gainExp(unit,amount)')
    ].filter(index => index >= 0);
    if (!markerCandidates.length) return source;
    const marker = Math.min(...markerCandidates);
    return source.slice(0,marker) + helper + source.slice(marker);
  }

  function ExperiencePatchedBlob(parts = [],options = {}) {
    if (options?.type === 'text/javascript') {
      const text = parts.map(part => typeof part === 'string' ? part : '').join('');
      if (text.includes('async function useStaff(healer,target,staffId)')) {
        return new NativeBlob([insertSupportExperience(text)],options);
      }
    }
    return new NativeBlob(parts,options);
  }

  ExperiencePatchedBlob.prototype = NativeBlob.prototype;
  Object.setPrototypeOf(ExperiencePatchedBlob,NativeBlob);
  window.Blob = ExperiencePatchedBlob;
})();
