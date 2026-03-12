import type { FacilityId, WarTrophy } from './state';

export const FACILITY_LABELS: Record<FacilityId, string> = {
  inn: '宿',
  well: '井戸',
  kitchen: '厨房',
  sewing: '裁縫部屋',
  workshop: '工房 / 細工',
  sorting: '仕分け',
  training: '鍛錬場',
  warroom: '食堂兼軍議室'
};

export const TROPHIES: WarTrophy[] = [
  { id: 'score_bundle', name: '譜面束', detail: '南西テントで押収。歌と指揮の癖が記されている。' },
  { id: 'crescent_card', name: '欠けた月の指揮札', detail: '欠けた円の印。号令の優先順位が刻まれている。' },
  { id: 'noise_metal', name: '音を乱す金属片', detail: '音程をわずかに濁らせる細工が施されている。' },
  { id: 'blue_shard', name: '青い石に似た欠片', detail: 'ユウカの石と似るが、光り方が不安定。' }
];

export const NEXT_TOPICS = [
  '翌朝に大鳥居が再襲来する兆し',
  '食費増大と資金不足への対処',
  '交易線と自給の立ち上げ'
];
