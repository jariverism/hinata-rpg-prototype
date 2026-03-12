import { INITIAL_STATE, STORAGE_KEY, type SaveData } from '../data/state';

export function loadGame(): SaveData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(INITIAL_STATE);
  try {
    const parsed = JSON.parse(raw) as SaveData;
    return { ...structuredClone(INITIAL_STATE), ...parsed };
  } catch {
    return structuredClone(INITIAL_STATE);
  }
}

export function saveGame(state: SaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetGame(): SaveData {
  const next = structuredClone(INITIAL_STATE);
  saveGame(next);
  return next;
}
