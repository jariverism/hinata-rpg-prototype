(() => {
  'use strict';

  const CAMPAIGN_KEY = 'hinata-senki-campaign-v2';
  const LEGACY_ROSTER_KEY = 'hinata-senki-campaign-roster-v1';
  const DEFAULT_GOLD = 3000;

  function parse(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeInventory(unit) {
    if (Array.isArray(unit.inventory)) {
      unit.inventory = unit.inventory
        .filter(item => item && item.id)
        .map(item => ({ id:item.id, uses:Number.isFinite(item.uses) ? item.uses : null }))
        .slice(0,5);
      return;
    }

    const inventory = [];
    if (unit.staves && typeof unit.staves === 'object') {
      Object.entries(unit.staves).forEach(([id,uses]) => {
        if (Number(uses) > 0) inventory.push({ id, uses:Number(uses) });
      });
    } else if (unit.weapon) {
      inventory.push({
        id:unit.weapon,
        uses:Number.isFinite(unit.weaponUses) ? unit.weaponUses : null
      });
    }
    if (Array.isArray(unit.items)) {
      unit.items.forEach(item => {
        if (item?.id && inventory.length < 5) inventory.push(clone(item));
      });
    }
    unit.inventory = inventory.slice(0,5);
  }

  function normalizeUnit(unit) {
    const carried = clone(unit);
    carried.acted = false;
    carried.hp = carried.maxHp;
    delete carried.x;
    delete carried.y;
    delete carried.ai;
    delete carried.rescued;
    delete carried.commander;
    normalizeInventory(carried);
    return carried;
  }

  function makeSnapshot(units,gold,convoy,flags,extra={}) {
    return {
      units:units.map(normalizeUnit),
      gold:Number.isFinite(gold) ? gold : DEFAULT_GOLD,
      convoy:clone(convoy || []),
      flags:clone(flags || {}),
      extra:clone(extra || {})
    };
  }

  function normalizeCampaign(data) {
    if (!data || !Array.isArray(data.units)) return null;
    data.version = 3;
    data.completedChapter = Number(data.completedChapter) || 0;
    data.currentChapter = Number(data.currentChapter) || data.completedChapter + 1;
    data.units = data.units.map(normalizeUnit);
    data.gold = Number.isFinite(data.gold)
      ? data.gold
      : Number.isFinite(data.extra?.gold) ? data.extra.gold : DEFAULT_GOLD;
    data.convoy = Array.isArray(data.convoy) ? data.convoy : [];
    data.flags = data.flags && typeof data.flags === 'object' ? data.flags : {};
    data.extra = data.extra && typeof data.extra === 'object' ? data.extra : {};
    data.checkpoints = data.checkpoints || {};
    data.snapshots = data.snapshots || {};

    Object.keys(data.checkpoints).forEach(key => {
      if (Array.isArray(data.checkpoints[key])) {
        data.checkpoints[key] = data.checkpoints[key].map(normalizeUnit);
      }
    });

    if (!data.checkpoints[data.completedChapter] && data.completedChapter > 0) {
      data.checkpoints[data.completedChapter] = clone(data.units);
    }
    if (!data.snapshots[data.completedChapter] && data.completedChapter > 0) {
      data.snapshots[data.completedChapter] = makeSnapshot(
        data.units,
        data.gold,
        data.convoy,
        data.flags,
        data.extra
      );
    }
    return data;
  }

  function persist(data,{touch=true}={}) {
    if (touch || !Number.isFinite(data.updatedAt)) data.updatedAt = Date.now();
    localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(data));
    localStorage.setItem(LEGACY_ROSTER_KEY,JSON.stringify({
      chapter:data.completedChapter,
      units:data.units
    }));
    return data;
  }

  function load() {
    const campaign = normalizeCampaign(parse(CAMPAIGN_KEY));
    if (campaign) return persist(campaign,{touch:false});

    const legacy = parse(LEGACY_ROSTER_KEY);
    if (legacy && Array.isArray(legacy.units)) {
      const completedChapter = Number(legacy.chapter) || 1;
      const roster = legacy.units.map(normalizeUnit);
      return persist({
        version:3,
        completedChapter,
        currentChapter:completedChapter + 1,
        units:roster,
        gold:DEFAULT_GOLD,
        convoy:[],
        flags:{},
        checkpoints:{ [completedChapter]:clone(roster) },
        snapshots:{
          [completedChapter]:makeSnapshot(roster,DEFAULT_GOLD,[],{}, {})
        },
        extra:{}
      });
    }
    return null;
  }

  function saveRoster(completedChapter,units,extra={}) {
    const roster = units
      .filter(unit => unit && unit.faction === 'ally' && unit.hp > 0)
      .map(normalizeUnit);
    const previous = load();
    const checkpoints = clone(previous?.checkpoints || {});
    const snapshots = clone(previous?.snapshots || {});
    const gold = Number.isFinite(extra.gold) ? extra.gold : (previous?.gold ?? DEFAULT_GOLD);
    const convoy = Array.isArray(extra.convoy) ? clone(extra.convoy) : clone(previous?.convoy || []);
    const flags = {
      ...(previous?.flags || {}),
      ...(extra.flags || {})
    };
    const storedExtra = {
      ...(previous?.extra || {}),
      ...(extra.extra || {}),
      ...Object.fromEntries(Object.entries(extra).filter(([key]) => !['gold','convoy','flags','extra'].includes(key)))
    };

    checkpoints[completedChapter] = clone(roster);
    snapshots[completedChapter] = makeSnapshot(roster,gold,convoy,flags,storedExtra);

    return persist({
      version:3,
      completedChapter,
      currentChapter:completedChapter + 1,
      units:roster,
      gold,
      convoy,
      flags,
      checkpoints,
      snapshots,
      extra:storedExtra
    });
  }

  function loadRoster(requiredCompletedChapter=0) {
    const data = load();
    if (!data || data.completedChapter < requiredCompletedChapter) return null;
    if (data.completedChapter === requiredCompletedChapter) return clone(data.units);
    const snapshot = data.snapshots?.[requiredCompletedChapter];
    return clone(snapshot?.units || data.checkpoints?.[requiredCompletedChapter] || data.units);
  }

  function loadProgressForChapter(chapter) {
    const required = Math.max(0,Number(chapter)-1);
    const data = load();
    if (!data || data.completedChapter < required) return null;
    const source = data.completedChapter === required
      ? {
          units:data.units,
          gold:data.gold,
          convoy:data.convoy,
          flags:data.flags,
          extra:data.extra
        }
      : (data.snapshots?.[required] || {
          units:data.checkpoints?.[required] || data.units,
          gold:data.gold,
          convoy:data.convoy,
          flags:data.flags,
          extra:data.extra
        });
    return clone({
      completedChapter:required,
      updatedAt:data.updatedAt,
      units:source.units || [],
      gold:Number.isFinite(source.gold) ? source.gold : DEFAULT_GOLD,
      convoy:source.convoy || [],
      flags:source.flags || {},
      extra:source.extra || {}
    });
  }

  function update(patch={}) {
    const data = load() || normalizeCampaign({
      version:3,
      completedChapter:0,
      currentChapter:1,
      units:[],
      gold:DEFAULT_GOLD,
      convoy:[],
      flags:{},
      checkpoints:{},
      snapshots:{},
      extra:{}
    });
    if (Number.isFinite(patch.gold)) data.gold = Math.max(0,Math.floor(patch.gold));
    if (Array.isArray(patch.convoy)) data.convoy = clone(patch.convoy);
    if (patch.flags) data.flags = { ...data.flags, ...clone(patch.flags) };
    if (patch.extra) data.extra = { ...data.extra, ...clone(patch.extra) };
    if (Array.isArray(patch.units)) data.units = patch.units.map(normalizeUnit);
    return persist(data);
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
    const snapshot = data.snapshots?.[completedChapter];
    data.completedChapter = completedChapter;
    data.currentChapter = chapter;
    if (snapshot) {
      data.units = clone(snapshot.units || []);
      data.gold = Number.isFinite(snapshot.gold) ? snapshot.gold : DEFAULT_GOLD;
      data.convoy = clone(snapshot.convoy || []);
      data.flags = clone(snapshot.flags || {});
      data.extra = clone(snapshot.extra || {});
    } else if (data.checkpoints?.[completedChapter]) {
      data.units = clone(data.checkpoints[completedChapter]);
    }
    Object.keys(data.checkpoints || {}).forEach(key => {
      if (Number(key) >= chapter) delete data.checkpoints[key];
    });
    Object.keys(data.snapshots || {}).forEach(key => {
      if (Number(key) >= chapter) delete data.snapshots[key];
    });
    persist(data);
  }

  window.HinataCampaign = {
    key:CAMPAIGN_KEY,
    defaultGold:DEFAULT_GOLD,
    load,
    saveRoster,
    loadRoster,
    loadProgressForChapter,
    update,
    pathFor,
    goToChapter,
    resetFrom
  };
})();
