import Phaser from 'phaser';
import { loadGame, saveGame } from '../systems/storage';
import { resolveWarTurn, type WarCommand, type WarState } from '../systems/war';

const ENEMY_PATTERN: WarCommand[] = ['tactics', 'charge', 'arrows', 'charge', 'tactics'];

export class WarScene extends Phaser.Scene {
  private war!: WarState;
  private turn = 0;
  private ui!: Phaser.GameObjects.Text;
  private log!: Phaser.GameObjects.Text;
  private state = loadGame();

  constructor() { super('WarScene'); }

  create(): void {
    const allyMax = this.state.party.length * 10;
    this.war = { allyPower: allyMax, enemyPower: 120, allyMax, enemyOptions: ['charge', 'arrows', 'tactics', 'other'], logs: [] };

    this.add.rectangle(480, 270, 960, 540, 0x1f0b17);
    this.add.text(26, 20, '初防衛戦 - 敵司令官 ワカバヤシ＆カスガ', { fontSize: '24px', color: '#ffd2d2' });
    this.ui = this.add.text(26, 62, '', { fontSize: '18px', color: '#ffffff' });
    this.log = this.add.text(26, 320, '', { fontSize: '16px', color: '#f4e7ff', wordWrap: { width: 900 } });

    const commands: Array<{ label: string; cmd: WarCommand }> = [
      { label: '突撃', cmd: 'charge' },
      { label: '弓矢', cmd: 'arrows' },
      { label: '策略', cmd: 'tactics' },
      { label: 'その他', cmd: 'other' }
    ];

    commands.forEach((c, i) => {
      const btn = this.add.rectangle(120 + i * 150, 140, 130, 44, 0x6a2947).setInteractive({ useHandCursor: true });
      this.add.text(btn.x, btn.y, c.label, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
      btn.on('pointerdown', () => this.playTurn(c.cmd));
    });

    this.makeSkillButton(760, 120, 'ユウカの祈り', () => {
      if (this.war.enemyOptions.length > 1) this.war.enemyOptions.pop();
      this.war.logs.push('ユウカの祈りで敵の選択肢がひとつ閉じた。');
      this.refresh();
    });
    this.makeSkillButton(760, 180, 'ジャンボの食事休憩', () => {
      this.war.allyPower = Math.min(this.war.allyMax, this.war.allyPower + Math.floor(this.war.allyMax * 0.25));
      this.war.logs.push('温かい汁で士気回復。味方戦力を回復。');
      this.refresh();
    });
    this.makeSkillButton(760, 240, 'タマキラリオの工作', () => {
      if (Math.random() < 0.3) {
        this.war.logs.push('工作は空振り。敵に読まれた。');
      } else {
        this.war.enemyPower = Math.max(0, this.war.enemyPower - Math.ceil(this.war.enemyPower * 0.1));
        this.war.logs.push('留め具崩し成功。敵戦力を削った。');
      }
      this.refresh();
    });
    this.makeSkillButton(760, 300, 'ミクの境目返し', () => {
      if (this.war.allyPower <= this.war.enemyPower) {
        this.war.allyPower = Math.min(this.war.allyMax, this.war.allyPower + 15);
        this.war.logs.push('境目返し発動。押し返して15回復。');
      } else {
        this.war.logs.push('境目返しは今じゃない。機を待つ。');
      }
      this.refresh();
    });
    this.makeSkillButton(760, 360, 'スズカ特技（枠）', () => this.war.logs.push('スズカ特技は次回解放予定。'));
    this.makeSkillButton(760, 420, 'ミレイ特技（枠）', () => this.war.logs.push('ミレイ特技は次回解放予定。'));

    this.refresh();
  }

  private makeSkillButton(x: number, y: number, label: string, action: () => void): void {
    const btn = this.add.rectangle(x, y, 320, 40, 0x2f234f).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '14px', color: '#dbd8ff' }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      action();
      this.refresh();
    });
  }

  private playTurn(ally: WarCommand): void {
    const enemy = this.war.enemyOptions[this.turn % this.war.enemyOptions.length] ?? ENEMY_PATTERN[this.turn % ENEMY_PATTERN.length];
    this.turn += 1;
    this.war.logs.push(`味方:${ally} / 敵:${enemy}`);
    this.war = resolveWarTurn(this.war, ally, enemy);
    this.refresh();

    if (this.war.allyPower <= 0 || this.war.enemyPower <= 0) {
      const win = this.war.enemyPower <= 0;
      this.time.delayedCall(600, () => this.finish(win));
    }
  }

  private finish(win: boolean): void {
    if (win) {
      this.state.importantFlags.firstDefenseDone = true;
      this.state.objective = '南の音楽家の村へ向かい、音の乱れを止める';
      this.state.facilities.push('kitchen', 'workshop', 'sorting', 'training', 'sewing');
      this.state.facilities = Array.from(new Set(this.state.facilities));
      saveGame(this.state);
      this.scene.start('StoryScene', { mode: 'postDefense' });
    } else {
      this.war.logs.push('撤退。体勢を立て直して再挑戦。');
      this.refresh();
      this.time.delayedCall(1200, () => this.scene.start('HubScene'));
    }
  }

  private refresh(): void {
    this.ui.setText([
      `味方戦力: ${this.war.allyPower} / ${this.war.allyMax}`,
      `敵戦力: ${this.war.enemyPower}`,
      `敵選択肢: ${this.war.enemyOptions.join(', ')}`
    ]);
    this.log.setText(this.war.logs.slice(-8).join('\n'));
  }
}
