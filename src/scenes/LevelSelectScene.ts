import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { SCENARIOS } from '../data/scenarios';
import { loadProgress } from '../sim/save';
import { button, label } from '../ui/widgets';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const progress = loadProgress();
    label(this, cx, 60, 'CAMPAIGN', '38px', COLORS.ghostGreenCss).setOrigin(0.5);
    label(this, cx, 100, 'Seven contracts. Each more haunted than the last.', '15px', COLORS.textDim).setOrigin(0.5);

    const desc = this.add
      .text(cx, GAME_HEIGHT - 84, '', {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textDim,
        align: 'center', wordWrap: { width: 900 },
      })
      .setOrigin(0.5);

    SCENARIOS.forEach((sc, i) => {
      const unlocked = i === 0 || (progress.stars[SCENARIOS[i - 1].id] ?? 0) > 0;
      const stars = progress.stars[sc.id] ?? 0;
      const starTxt = stars > 0 ? `  ${'★'.repeat(stars)}` : '';
      const y = 150 + i * 58;
      const bw = 620;
      const b = button(
        this, cx, y,
        `${i + 1}. ${sc.name}${starTxt}`,
        () => this.scene.start('Intro', { scenario: sc }),
        { w: bw, h: 46, fontSize: '17px', enabled: unlocked },
      );
      this.add.existing(b);
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      if (unlocked) {
        bg.on('pointerover', () => desc.setText(`${sc.tagline}\n${sc.desc}`));
        bg.on('pointerout', () => desc.setText(''));
      } else {
        // Locked: a padlock badge in the menu's own green style, with a hint.
        this.add.existing(this.lockBadge(cx + bw / 2 - 26, y));
        bg.setInteractive({ useHandCursor: false })
          .on('pointerover', () => desc.setText(`🔒 Locked — earn at least one ★ on "${SCENARIOS[i - 1].name}" to unlock this contract.`))
          .on('pointerout', () => desc.setText(''));
      }
    });

    this.add.existing(button(this, cx, GAME_HEIGHT - 34, 'Back [Esc]', () => this.scene.start('MainMenu'), { w: 200, h: 36 }));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }

  /** A small procedural padlock chip styled like the rest of the menu. */
  private lockBadge(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    const w = 34, h = 30;
    // chip background
    g.fillStyle(0x0b0f16, 0.85);
    g.lineStyle(1, COLORS.ghostGreen, 0.35);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    // shackle
    g.lineStyle(2, COLORS.ghostGreen, 0.9);
    g.beginPath();
    g.arc(0, -1, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    // body
    g.fillStyle(COLORS.ghostGreen, 0.9);
    g.fillRoundedRect(-6, -2, 12, 10, 2);
    g.fillStyle(0x0b0f16, 1);
    g.fillCircle(0, 3, 1.6);
    return this.add.container(x, y, [g]);
  }
}
