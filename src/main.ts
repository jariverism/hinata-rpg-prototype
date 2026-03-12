import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { BanquetScene } from './scenes/BanquetScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'app',
  backgroundColor: '#081322',
  pixelArt: true,
  scene: [TitleScene, HubScene, BanquetScene]
});
