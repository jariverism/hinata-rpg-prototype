import Phaser from 'phaser';
import { loadGame, resetGame, saveGame } from '../systems/storage';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.add.rectangle(480, 270, 960, 540, 0x0d1a33).setStrokeStyle(4, 0x3f78b5);
    this.add.text(480, 95, '日向坂RPG\nプロトタイプ', {
      fontSize: '40px',
      color: '#d9ecff',
      align: 'center'
    }).setOrigin(0.5);
    this.add.text(480, 172, '音・灯り・約束で支える古城', {
      fontSize: '18px',
      color: '#8ec9ff'
    }).setOrigin(0.5);

    const makeBtn = (y: number, label: string, fn: () => void) => {
      const btn = this.add.rectangle(480, y, 360, 54, 0x123059).setInteractive({ useHandCursor: true });
      this.add.text(480, y, label, { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
      btn.on('pointerdown', fn);
    };

    makeBtn(270, 'はじめる', () => {
      const state = resetGame();
      state.location = 'hinata_castle';
      state.objective = '日向城で仲間と話し、宴の準備を進める';
      saveGame(state);
      this.scene.start('HubScene');
    });

    makeBtn(345, 'つづきから', () => {
      const state = loadGame();
      if (state.location === 'banquet') {
        this.scene.start('BanquetScene');
      } else {
        this.scene.start('HubScene');
      }
    });

    makeBtn(420, 'セーブ初期化', () => {
      resetGame();
      this.scene.restart();
    });
  }
}
