export type WarCommand = 'charge' | 'arrows' | 'tactics' | 'other';

const ADVANTAGE: Record<WarCommand, WarCommand> = {
  charge: 'arrows',
  arrows: 'tactics',
  tactics: 'charge',
  other: 'other'
};

export interface WarState {
  allyPower: number;
  enemyPower: number;
  allyMax: number;
  enemyOptions: WarCommand[];
  logs: string[];
}

export function resolveWarTurn(state: WarState, ally: WarCommand, enemy: WarCommand): WarState {
  const next = { ...state, logs: [...state.logs] };
  if (ally === enemy || ally === 'other' || enemy === 'other') {
    next.allyPower = Math.max(0, next.allyPower - 10);
    next.enemyPower = Math.max(0, next.enemyPower - 10);
    next.logs.push('ぶつかり合い、双方が消耗した。');
    return next;
  }

  if (ADVANTAGE[ally] === enemy) {
    next.enemyPower = Math.max(0, next.enemyPower - 30);
    next.logs.push('相性を突いて敵陣を押し返した。');
  } else {
    next.allyPower = Math.max(0, next.allyPower - 30);
    next.logs.push('読み負けて陣形が崩れた。');
  }
  return next;
}
