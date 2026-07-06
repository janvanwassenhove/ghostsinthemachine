import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { SCENARIOS } from '../data/scenarios';
import { DIFFICULTIES, DIFFICULTY_BY_ID, withDifficulty } from '../data/difficulty';
import { loadProgress, loadSettings, saveSettings } from '../sim/save';
import { button, label } from '../ui/widgets';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const progress = loadProgress();
    const settings = loadSettings();
    const diffId = settings.difficulty ?? 'standard';

    label(this, cx, 44, 'CAMPAIGN', '36px', COLORS.ghostGreenCss).setOrigin(0.5);
    label(this, cx, 82, 'Seven contracts. Each more haunted than the last.', '14px', COLORS.textDim).setOrigin(0.5);

    const desc = this.add
      .text(cx, GAME_HEIGHT - 84, '', {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.textDim,
        align: 'center', wordWrap: { width: 900 },
      })
      .setOrigin(0.5);

    // --- Difficulty selector (applies to every contract; remembered in settings)
    label(this, cx, 112, 'DIFFICULTY', '12px', COLORS.textDim).setOrigin(0.5);
    DIFFICULTIES.forEach((d, i) => {
      const dx = cx + (i - 1) * 168;
      const selected = d.id === diffId;
      this.add.existing(button(this, dx, 140, d.name, () => {
        saveSettings({ ...settings, difficulty: d.id });
        this.scene.restart();
      }, { w: 156, h: 30, fontSize: '14px', color: selected ? COLORS.ghostGreenCss : COLORS.textDim }));
      if (selected) {
        const hl = this.add.graphics();
        hl.lineStyle(2, COLORS.ghostGreen, 1);
        hl.strokeRoundedRect(dx - 79, 140 - 17, 158, 34, 7);
      }
    });
    this.add.text(cx, 166, DIFFICULTY_BY_ID[diffId].blurb, {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: '#8a97a8',
      align: 'center', wordWrap: { width: 720 },
    }).setOrigin(0.5);

    // --- Contract list
    SCENARIOS.forEach((sc, i) => {
      const unlocked = i === 0 || (progress.stars[SCENARIOS[i - 1].id] ?? 0) > 0;
      const stars = progress.stars[sc.id] ?? 0;
      const starTxt = stars > 0 ? `  ${'★'.repeat(stars)}` : '';
      const y = 208 + i * 50;
      const bw = 620;
      const b = button(
        this, cx, y,
        `${i + 1}. ${sc.name}${starTxt}`,
        () => this.scene.start('Intro', { scenario: withDifficulty(sc, DIFFICULTY_BY_ID[diffId]) }),
        { w: bw, h: 42, fontSize: '17px', enabled: unlocked },
      );
      this.add.existing(b);
      const bg = b.list[0] as Phaser.GameObjects.Rectangle;
      if (unlocked) {
        bg.on('pointerover', () => desc.setText(`${sc.tagline}\n${sc.desc}`));
        bg.on('pointerout', () => desc.setText(''));
      } else {
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
    g.fillStyle(0x0b0f16, 0.85);
    g.lineStyle(1, COLORS.ghostGreen, 0.35);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    g.lineStyle(2, COLORS.ghostGreen, 0.9);
    g.beginPath();
    g.arc(0, -1, 5, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.fillStyle(COLORS.ghostGreen, 0.9);
    g.fillRoundedRect(-6, -2, 12, 10, 2);
    g.fillStyle(0x0b0f16, 1);
    g.fillCircle(0, 3, 1.6);
    return this.add.container(x, y, [g]);
  }
}
