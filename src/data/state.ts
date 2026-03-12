import type { CharacterId } from './characters';

export type FacilityId = 'inn' | 'well' | 'kitchen' | 'sewing' | 'workshop' | 'sorting' | 'training' | 'warroom';
export type LocationId = 'title' | 'hinata_castle' | 'workshop_town' | 'south_music_village' | 'banquet';

export interface WarTrophy {
  id: string;
  name: string;
  detail: string;
}

export interface SaveData {
  version: number;
  location: LocationId;
  objective: string;
  chapterStep: number;
  party: CharacterId[];
  facilities: FacilityId[];
  importantFlags: Record<string, boolean>;
  trophies: WarTrophy[];
  topics: string[];
  dialogLog: string[];
}

export const STORAGE_KEY = 'hinata-rpg-proto-save';

export const BASE_FACILITIES: FacilityId[] = ['inn', 'well', 'warroom'];

export const INITIAL_STATE: SaveData = {
  version: 1,
  location: 'title',
  objective: '日向城で仲間と準備を整える',
  chapterStep: 0,
  party: ['maeda', 'yuuka', 'miku', 'sarina', 'yoshio', 'shin', 'yoko', 'nanami'],
  facilities: [...BASE_FACILITIES],
  importantFlags: {
    oldCastleRestored: false,
    workshopTownDone: true,
    firstDefenseDone: false,
    southVillageDone: false,
    suzukaAwakened: false,
    reiJoined: false,
    konokaJoined: false,
    banquetStarted: false
  },
  trophies: [],
  topics: ['古城再生を進める'],
  dialogLog: []
};
