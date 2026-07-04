import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { ScenarioDef } from '../data/types';
import { button } from '../ui/widgets';

interface IntroData {
  scenario: ScenarioDef;
}

/**
 * A short, absurd "cold open" played after picking a contract and before the
 * game itself. It is a procedural cutscene: animated text panels over the menu
 * backdrop with drifting ghosts and a per-panel vignette — no video files, no
 * external images, so it works offline and respects the project's art rules.
 */
export class IntroScene extends Phaser.Scene {
  private scenario!: ScenarioDef;
  private panels: string[] = [];
  private index = 0;
  private textObj!: Phaser.GameObjects.Text;
  private captionObj!: Phaser.GameObjects.Text;
  private advancing = false;

  constructor() {
    super('Intro');
  }

  create(data: IntroData): void {
    this.scenario = data.scenario;
    this.panels = introPanels(this.scenario);
    this.index = 0;
    this.advancing = false;

    const cx = GAME_WIDTH / 2;

    if (this.textures.exists('bg_menu')) {
      this.add.image(cx, GAME_HEIGHT / 2, 'bg_menu')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-2).setAlpha(0.45);
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05070a, 0.55).setOrigin(0, 0).setDepth(-1);
    this.addDriftingGhosts();

    // Contract nameplate, like an old case file header.
    this.add.text(cx, 74, 'INCOMING CONTRACT', {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.textDim,
    }).setOrigin(0.5);
    this.add.text(cx, 104, this.scenario.name.toUpperCase(), {
      fontFamily: FONT_FAMILY, fontSize: '28px', color: COLORS.ghostGreenCss, fontStyle: 'bold',
      align: 'center', wordWrap: { width: 1000 },
    }).setOrigin(0.5);

    // The animated story line.
    this.textObj = this.add.text(cx, GAME_HEIGHT / 2, '', {
      fontFamily: FONT_FAMILY, fontSize: '22px', color: COLORS.textPrimary,
      align: 'center', wordWrap: { width: 860 }, lineSpacing: 8,
    }).setOrigin(0.5);

    this.captionObj = this.add.text(cx, GAME_HEIGHT - 132, '', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textDim,
    }).setOrigin(0.5);

    // Controls.
    this.add.existing(button(this, cx - 96, GAME_HEIGHT - 60, '▶ Next [Space]', () => this.next(), { w: 170, h: 40 }));
    this.add.existing(button(this, cx + 96, GAME_HEIGHT - 60, 'Skip ⏩', () => this.startGame(), { w: 150, h: 40, color: COLORS.textDim }));

    this.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.input.keyboard?.on('keydown-ENTER', () => this.next());
    this.input.keyboard?.on('keydown-ESC', () => this.startGame());

    this.showPanel();
  }

  private showPanel(): void {
    this.captionObj.setText(`${this.index + 1} / ${this.panels.length}`);
    this.textObj.setText(this.panels[this.index]);
    this.textObj.setAlpha(0).setScale(0.98);
    this.tweens.add({
      targets: this.textObj, alpha: 1, scale: 1, duration: 420, ease: 'Quad.easeOut',
    });
  }

  private next(): void {
    if (this.advancing) return;
    if (this.index >= this.panels.length - 1) {
      this.startGame();
      return;
    }
    this.advancing = true;
    this.tweens.add({
      targets: this.textObj, alpha: 0, scale: 0.98, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => { this.index++; this.advancing = false; this.showPanel(); },
    });
  }

  private startGame(): void {
    this.scene.start('Game', { scenario: this.scenario });
  }

  private addDriftingGhosts(): void {
    for (let i = 0; i < 7; i++) {
      const ghost = this.add
        .image(Phaser.Math.Between(60, GAME_WIDTH - 60), Phaser.Math.Between(80, GAME_HEIGHT - 80), 'ghost')
        .setAlpha(0.1).setDepth(-1)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.6));
      this.tweens.add({
        targets: ghost, y: ghost.y - Phaser.Math.Between(40, 90),
        x: ghost.x + Phaser.Math.Between(-50, 50), alpha: 0.04,
        duration: Phaser.Math.Between(4000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }
}

/** Per-scenario cold-open, with a generic fallback for anything without one. */
function introPanels(sc: ScenarioDef): string[] {
  if (sc.intro && sc.intro.length > 0) return sc.intro;
  return [
    'A new contract lands on your desk.\nIt is slightly warm, and it is humming.',
    `"${sc.tagline}"`,
    'You did not apply for this job.\nThe job applied for you.',
    'Hire the willing. Build the rooms.\nKeep the lights on — literally, they keep going off.',
  ];
}
