import Phaser from 'phaser';
import { CHARACTER_DEFS } from '../data/characters';
import { NEXT_TOPICS } from '../data/content';
import { loadGame, saveGame } from '../systems/storage';

const CHOICES: Array<{ id: string; label: string; line: string; speaker: keyof typeof CHARACTER_DEFS }> = [
  {
    id: 'loot',
    label: '戦利品を調べる',
    speaker: 'sarina',
    line: 'サリナ: 譜面束と指揮札、青い欠片。軍議で順に開いて、流れを整理しよう。'
  },
  {
    id: 'rei',
    label: 'レイと話す',
    speaker: 'rei',
    line: 'レイ: 石の音はまだ濁ってる。けど、祭礼の拍を重ねれば道は見える。'
  },
  {
    id: 'konoka',
    label: 'コノカと話す',
    speaker: 'konoka',
    line: 'コノカ: 装備のほつれは今夜で全部縫い直す。動きやすさ、明日は上げるで。'
  },
  {
    id: 'suzuka',
    label: 'スズカと話す',
    speaker: 'suzuka',
    line: 'スズカ: 次は受けるだけじゃない。こっちからリズムを取りに行く。'
  },
  {
    id: 'feast',
    label: '宴をもう少し見る',
    speaker: 'jumbo',
    line: 'ジャンボ: まずは食って笑う！ 明日に備えるのも戦いのうちだ。'
  }
];

export class BanquetScene extends Phaser.Scene {
  constructor() {
    super('BanquetScene');
  }

  create(): void {
    const state = loadGame();
    state.location = 'banquet';
    state.importantFlags.banquetStarted = true;
    state.objective = '宴で仲間と話し、次の動きを決める';
    saveGame(state);

    this.add.rectangle(480, 270, 960, 540, 0x191238);
    this.add.text(30, 20, '日向城・宴', { fontSize: '28px', color: '#f5eeff' });
    this.add.text(30, 58, '次の行動を選ぶ（5択）', { fontSize: '18px', color: '#baabff' });

    const panel = this.add.rectangle(680, 280, 520, 440, 0x0f1020).setStrokeStyle(2, 0x7b7ce9);
    const portrait = this.add.rectangle(500, 175, 84, 84, 0x6b6b9a).setStrokeStyle(2, 0xe8dcff);
    const name = this.add.text(560, 140, '---', { fontSize: '20px', color: '#f1e8ff' });
    const line = this.add.text(540, 182, '仲間に声をかけて、次の流れを決めよう。', {
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: 330 }
    });

    CHOICES.forEach((choice, i) => {
      const y = 120 + i * 72;
      const btn = this.add.rectangle(220, y, 340, 50, 0x31316f).setInteractive({ useHandCursor: true });
      this.add.text(220, y, choice.label, { fontSize: '22px', color: '#fff' }).setOrigin(0.5);
      btn.on('pointerdown', () => {
        const def = CHARACTER_DEFS[choice.speaker];
        portrait.setFillStyle(def.portraitColor);
        name.setText(def.name);
        line.setText(`${choice.line}\n\n→ 続きは次回拡張（翌朝の再襲来と軍議へ）`);

        state.topics = NEXT_TOPICS;
        state.dialogLog.push(choice.line);
        state.dialogLog = state.dialogLog.slice(-80);
        saveGame(state);
      });
    });

    this.add.text(30, 486, 'Esc: 日向城へ戻る', { fontSize: '16px', color: '#d6d6ff' });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('HubScene'));
  }
}
