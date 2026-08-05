(() => {
  'use strict';

  const CAMPAIGN_KEY = 'hinata-senki-campaign-v2';
  const LEGACY_ROSTER_KEY = 'hinata-senki-campaign-roster-v1';

  function parse(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeUnit(unit) {
    const carried = clone(unit);
    carried.acted = false;
    carried.hp = carried.maxHp;
    delete carried.x;
    delete carried.y;
    delete carried.ai;
    delete carried.rescued;
    return carried;
  }

  function normalizeCampaign(data) {
    if (!data || !Array.isArray(data.units)) return null;
    data.checkpoints = data.checkpoints || {};
    if (!data.checkpoints[data.completedChapter]) {
      data.checkpoints[data.completedChapter] = data.units.map(normalizeUnit);
    }
    return data;
  }

  function load() {
    const campaign = normalizeCampaign(parse(CAMPAIGN_KEY));
    if (campaign) {
      localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));
      return campaign;
    }

    const legacy = parse(LEGACY_ROSTER_KEY);
    if (legacy && Array.isArray(legacy.units)) {
      const completedChapter = Number(legacy.chapter) || 1;
      const roster = legacy.units.map(normalizeUnit);
      const migrated = {
        version:2,
        completedChapter,
        currentChapter:completedChapter + 1,
        units:roster,
        checkpoints:{ [completedChapter]:roster },
        extra:{},
        updatedAt:Date.now()
      };
      localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(migrated));
      return migrated;
    }
    return null;
  }

  function saveRoster(completedChapter,units,extra={}) {
    const roster = units
      .filter(unit => unit && unit.faction === 'ally' && unit.hp > 0)
      .map(normalizeUnit);
    const previous = load();
    const checkpoints = clone(previous?.checkpoints || {});
    checkpoints[completedChapter] = clone(roster);

    const data = {
      version:2,
      completedChapter,
      currentChapter:completedChapter + 1,
      units:roster,
      checkpoints,
      extra:{ ...(previous?.extra || {}), ...extra },
      updatedAt:Date.now()
    };

    localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(data));
    localStorage.setItem(LEGACY_ROSTER_KEY,JSON.stringify({chapter:completedChapter,units:roster}));
    return data;
  }

  function loadRoster(requiredCompletedChapter=0) {
    const data = load();
    if (!data || data.completedChapter < requiredCompletedChapter) return null;
    const checkpoint = data.checkpoints?.[requiredCompletedChapter];
    return clone(checkpoint || data.units);
  }

  function pathFor(chapter) {
    if (chapter <= 1) return './';
    return `./chapter${chapter}/`;
  }

  function goToChapter(chapter,fromDepth=0) {
    const prefix = fromDepth > 0 ? '../'.repeat(fromDepth) : './';
    const target = chapter <= 1 ? prefix : `${prefix}chapter${chapter}/`;
    location.href = target;
  }

  function resetFrom(chapter) {
    const data = load();
    if (!data) return;
    const completedChapter = Math.max(0,chapter-1);
    const checkpoint = data.checkpoints?.[completedChapter];
    data.completedChapter = completedChapter;
    data.currentChapter = chapter;
    if (checkpoint) data.units = clone(checkpoint);
    Object.keys(data.checkpoints || {}).forEach(key => {
      if (Number(key) >= chapter) delete data.checkpoints[key];
    });
    data.updatedAt = Date.now();
    localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(data));
  }

  window.HinataCampaign = {
    key:CAMPAIGN_KEY,
    load,
    saveRoster,
    loadRoster,
    pathFor,
    goToChapter,
    resetFrom
  };
})();
