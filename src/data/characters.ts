export type CharacterId =
  | 'maeda' | 'yuuka' | 'suzu' | 'suzuka' | 'miku' | 'sarina' | 'yoshio' | 'shin' | 'yoko' | 'nanami'
  | 'tamaki' | 'rio' | 'kirari' | 'jumbo' | 'rei' | 'konoka' | 'wakabayashi' | 'kasuga' | 'gakubou';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  star?: string;
  portraitColor: number;
}

export const CHARACTER_DEFS: Record<CharacterId, CharacterDef> = {
  maeda: { id: 'maeda', name: 'マエダ', role: '主人公 / 短剣二刀流', star: '天魁星', portraitColor: 0x8ec9ff },
  yuuka: { id: 'yuuka', name: 'ユウカ', role: '宿星読解 / 祈り', star: '天機星', portraitColor: 0x70b8ff },
  suzu: { id: 'suzu', name: 'スズ', role: '静かな歌い手', star: '天英星', portraitColor: 0x99c4ff },
  suzuka: { id: 'suzuka', name: 'スズカ', role: '覚醒した音読み', star: '天英星', portraitColor: 0x62a8ff },
  miku: { id: 'miku', name: 'ミク', role: '後衛支援 / 境目返し', star: '天速星', portraitColor: 0x79d4c8 },
  sarina: { id: 'sarina', name: 'サリナ', role: '城内実務', star: '天立星', portraitColor: 0xd5b4ff },
  yoshio: { id: 'yoshio', name: 'ヨシオ', role: '守りの芯', star: '天孤星', portraitColor: 0x8a95b2 },
  shin: { id: 'shin', name: 'シン', role: '補給 / 港筋', star: '天捷星', portraitColor: 0xb2d0ff },
  yoko: { id: 'yoko', name: 'ヨーコ', role: '勢いと機転', star: '天巧星', portraitColor: 0xffb870 },
  nanami: { id: 'nanami', name: 'ナナミ', role: '宿と帳面', star: '天富星', portraitColor: 0xf7dd8a },
  tamaki: { id: 'tamaki', name: 'タマキ', role: '工房継承', star: '天究星', portraitColor: 0xdba887 },
  rio: { id: 'rio', name: 'リオ', role: '仕分け', star: '天退星', portraitColor: 0x8ce39a },
  kirari: { id: 'kirari', name: 'キラリ', role: '細工', star: '天異星', portraitColor: 0xffd180 },
  jumbo: { id: 'jumbo', name: 'ジャンボ', role: '厨房', star: '天寿星', portraitColor: 0xff9d7d },
  rei: { id: 'rei', name: 'レイ', role: '奏で巫女', star: '天琴星', portraitColor: 0x86e0ff },
  konoka: { id: 'konoka', name: 'コノカ', role: '裁縫 / 補修', star: '天微星', portraitColor: 0xa3f0cc },
  wakabayashi: { id: 'wakabayashi', name: 'ワカバヤシ', role: '大鳥居司令', portraitColor: 0xff7575 },
  kasuga: { id: 'kasuga', name: 'カスガ', role: '大鳥居司令', portraitColor: 0xff9a75 },
  gakubou: { id: 'gakubou', name: 'ガクボウ', role: '音の指揮者', portraitColor: 0xbd93ff }
};
