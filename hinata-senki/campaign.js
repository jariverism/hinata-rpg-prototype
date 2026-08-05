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

  function load() {
    const campaign = parse(CAMPAIGN_KEY);
    if (campaign && Array.isArray(campaign.units)) return campaign;

    const legacy = parse(LEGACY_ROSTER_KEY);
    if (legacy && Array.isArray(legacy.units)) {
      const migrated = {
        version:2,
        completedChapter:Number(legacy.chapter) || 1,
        currentChapter:(Number(legacy.chapter) || 1) + 1,
        units:legacy.units.map(normalizeUnit),
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

    const data = {
      version:2,
      completedChapter,
      currentChapter:completedChapter + 1,
      units:roster,
      extra:{ ...(load()?.extra || {}), ...extra },
      updatedAt:Date.now()
    };

    localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(data));
    localStorage.setItem(LEGACY_ROSTER_KEY,JSON.stringify({chapter:completedChapter,units:roster}));
    return data;
  }

  function loadRoster(requiredCompletedChapter=0) {
    const data = load();
    if (!data || data.completedChapter < requiredCompletedChapter) return null;
    return clone(data.units);
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
    if (data.completedChapter >= chapter) {
      data.completedChapter = Math.max(0,chapter-1);
      data.currentChapter = chapter;
      data.updatedAt = Date.now();
      localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(data));
    }
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
