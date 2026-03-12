import Phaser from 'phaser';
import { CHARACTER_DEFS } from '../data/characters';
import { TROPHIES } from '../data/content';
import { loadGame, saveGame } from '../systems/storage';

export class StoryScene extends Phaser.Scene {
  private state = loadGame();
  private text!: Phaser.GameObjects.Text;
  private mode!: 'postDefense' | 'awakening';

  constructor() { super('StoryScene'); }

  init(data: { mode: 'postDefense' | 'awakening' }): void {
    this.mode = data.mode;
  }

  create(): void {
    this.add.rectangle(480, 270, 960, 540, 0x111830);
    this.text = this.add.text(28, 28, '', { fontSize: '20px', color: '#e9f2ff', wordWrap: { width: 900 } });

    if (this.mode === 'postDefense') {
      this.postDefense();
      return;
    }
    this.awakening();
  }

  private postDefense(): void {
    this.text.setText([
      'ワカバヤシ: うわー！ もうちょいで勝てたのに！',
      'カスガ: 次はもっと整えてくるぞ！',
      'マエダ: 追うな。まず城を整える。',
      'サリナ: 宿、厨房、工房、仕分け、鍛錬場。導線を開けたよ。',
      'ユウカ: 南の村の石鳴りが強い。先にそっちを見よう。',
      '',
      'クリックで日向城へ戻る。'
    ]);
    this.input.once('pointerdown', () => this.scene.start('HubScene'));
  }

  private awakening(): void {
    const battleBtn = this.add.rectangle(230, 400, 380, 52, 0x294272).setInteractive({ useHandCursor: true });
    this.add.text(230, 400, '残響との簡易戦闘を開始', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
    const skipBtn = this.add.rectangle(660, 400, 280, 52, 0x3b2b52).setInteractive({ useHandCursor: true });
    this.add.text(660, 400, '会話だけ見る', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);

    this.text.setText([
      '南の村。乱れた音が水面を叩き、呼吸がずれる。',
      'マエダ: 二刀で拍を刻む。ユウカ、間を頼む。',
      'ユウカ: 石が応える。いま、合わせて。',
      'スズ: ...わたし、もう逃げない。',
      '',
      '戦闘で「双刃連舞」を使うと覚醒演出へ。'
    ]);

    battleBtn.on('pointerdown', () => this.runMiniBattle());
    skipBtn.on('pointerdown', () => this.finishAwakening());
  }

  private runMiniBattle(): void {
    let enemyHp = 70;
    let shield = true;
    const panel = this.add.rectangle(480, 250, 900, 190, 0x0d1022).setStrokeStyle(2, 0x6aa0ff);
    const log = this.add.text(46, 180, '敵: 音乱しの残響 HP70（共鳴障壁あり）', { fontSize: '18px', color: '#cff' });

    const addCmd = (x: number, label: string, fn: () => void) => {
      const b = this.add.rectangle(x, 300, 180, 40, 0x2a4f7a).setInteractive({ useHandCursor: true });
      this.add.text(x, 300, label, { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
      b.on('pointerdown', fn);
    };

    const update = (line: string) => {
      log.setText(`敵HP:${enemyHp} / 障壁:${shield ? '有' : '無'}\n${line}`);
      if (enemyHp <= 0) {
        panel.destroy();
        this.finishAwakening();
      }
    };

    addCmd(230, '双刃連舞', () => {
      const dmg = shield ? 8 : 26;
      enemyHp -= dmg;
      update(`マエダの二刀が${dmg}ダメージ。`);
    });
    addCmd(430, 'ユウカ支援', () => {
      shield = false;
      update('祈りで位相が整い、障壁がほどけた。');
    });
    addCmd(630, 'ミク観測', () => {
      enemyHp -= 10;
      update('境目返しで反響を逆流。10ダメージ。');
    });
    addCmd(830, '防御', () => update('呼吸を整えて様子を見る。'));
  }

  private finishAwakening(): void {
    this.state.importantFlags.southVillageDone = true;
    this.state.importantFlags.suzukaAwakened = true;
    this.state.importantFlags.reiJoined = true;
    this.state.importantFlags.konokaJoined = true;
    this.state.party.push('suzuka', 'rei', 'konoka', 'rio', 'kirari', 'jumbo', 'tamaki');
    this.state.party = Array.from(new Set(this.state.party));
    this.state.trophies = TROPHIES;
    this.state.location = 'hinata_castle';
    this.state.objective = '日向城へ帰還し、宴で次の動きを決める';

    const cast = [CHARACTER_DEFS.suzuka.name, CHARACTER_DEFS.rei.name, CHARACTER_DEFS.konoka.name].join(' / ');
    this.text.setText([
      'スズ: 聞こえる。もう、スズカって呼んで。',
      'レイ: 祭礼の拍、つないでいく。',
      'コノカ: みんなの装い、うちが整える。',
      `加入: ${cast}`,
      'ガクボウは村へ引き渡された。湖上側に音を使いたがる者がいると告げて。',
      '南西テントの戦利品を持って日向城へ帰る。',
      '',
      'クリックで帰還。'
    ]);
    saveGame(this.state);
    this.input.once('pointerdown', () => {
      this.state.location = 'banquet';
      this.state.importantFlags.banquetStarted = true;
      saveGame(this.state);
      this.scene.start('HubScene');
    });
  }
}
