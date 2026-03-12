import Phaser from 'phaser';
import { FACILITY_LABELS } from '../data/content';
import type { SaveData } from '../data/state';
import { loadGame, saveGame } from '../systems/storage';

interface Spot {
  x: number;
  y: number;
  label: string;
  run: () => void;
}

export class HubScene extends Phaser.Scene {
  private state!: SaveData;
  private player!: Phaser.GameObjects.Rectangle;
  private infoText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private spots: Spot[] = [];
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('HubScene');
  }

  create(): void {
    this.state = loadGame();
    if (this.state.location === 'title') {
      this.state.location = 'hinata_castle';
      saveGame(this.state);
    }

    this.keys = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.renderArea();
    this.player = this.add.rectangle(160, 180, 16, 16, 0x8ec9ff).setStrokeStyle(1, 0xffffff);
    this.infoText = this.add.text(16, 12, '', { fontSize: '14px', color: '#b9e1ff' });
    this.speakerText = this.add.text(24, 398, '会話', { fontSize: '16px', color: '#9bd1ff' }).setDepth(4);
    this.dialogText = this.add.text(24, 424, '', {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 910 }
    }).setDepth(4);

    this.updateSpots();
    this.refreshInfo();
    this.say('サリナ', '日向城の導線は確保済み。必要なら宴で次の動きを決めよう。');
  }

  update(): void {
    const speed = 2;
    if (this.keys.left?.isDown) this.player.x -= speed;
    if (this.keys.right?.isDown) this.player.x += speed;
    if (this.keys.up?.isDown) this.player.y -= speed;
    if (this.keys.down?.isDown) this.player.y += speed;
    this.player.x = Phaser.Math.Clamp(this.player.x, 8, 952);
    this.player.y = Phaser.Math.Clamp(this.player.y, 8, 392);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const near = this.spots.find((s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y) < 46);
      if (near) near.run();
    }
  }

  private renderArea(): void {
    this.add.rectangle(480, 270, 960, 540, 0x102542).setStrokeStyle(2, 0x6fb6ff);
    this.add.rectangle(480, 452, 960, 176, 0x0a1527).setStrokeStyle(2, 0x4a78aa);
  }

  private updateSpots(): void {
    this.spots = [];
    this.children.getAll().filter((c) => c.name === 'spot').forEach((c) => c.destroy());

    this.addSpot(260, 170, 'ユウカ', () => {
      const line = this.state.trophies.some((t) => t.id === 'blue_shard')
        ? '欠片は似てるけど別の響き。まだ決めつけないほうがいい。'
        : '青い石の揺れが大きい。港側の気配が近い。';
      this.say('ユウカ', line);
    });

    this.addSpot(450, 120, '施設掲示板', () => {
      const facilities = this.state.facilities.map((f) => FACILITY_LABELS[f]).join(' / ');
      this.say('掲示板', `解放施設: ${facilities}`);
    });

    this.addSpot(640, 220, '会話ログ確認', () => {
      const latest = this.state.dialogLog.slice(-3).join('\n');
      this.say('ログ', latest || 'まだ会話ログはありません。');
    });

    this.addSpot(810, 160, '宴の間', () => {
      this.state.location = 'banquet';
      saveGame(this.state);
      this.scene.start('BanquetScene');
    });
  }

  private addSpot(x: number, y: number, label: string, run: () => void): void {
    const marker = this.add.rectangle(x, y, 22, 22, 0x2f7ac4).setStrokeStyle(2, 0xb8e2ff);
    marker.name = 'spot';
    this.add.text(x, y - 22, label, { fontSize: '12px', color: '#dcefff' }).setOrigin(0.5).setName('spot');
    this.spots.push({ x, y, label, run });
  }

  private refreshInfo(): void {
    const joined = this.state.party.length;
    const objective = this.state.objective;
    const flags = Object.entries(this.state.importantFlags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');

    this.infoText.setText([
      `現在地: 日向城`,
      `目的: ${objective}`,
      `加入人数: ${joined}`,
      `重要フラグ: ${flags || 'なし'}`,
      '操作: 矢印キー移動 / Spaceで調べる'
    ]);
  }

  private say(speaker: string, line: string): void {
    this.speakerText.setText(speaker);
    this.dialogText.setText(line);
    this.state.dialogLog.push(`${speaker}: ${line}`);
    this.state.dialogLog = this.state.dialogLog.slice(-80);
    saveGame(this.state);
  }
}
