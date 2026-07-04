import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { hasSave, loadSettings } from '../sim/save';
import { Sound } from '../sound';
import { button } from '../ui/widgets';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    Sound.setEnabled(loadSettings().sound);
    const cx = GAME_WIDTH / 2;

    if (this.textures.exists('bg_menu')) {
      this.add
        .image(cx, GAME_HEIGHT / 2, 'bg_menu')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(-1);
    }

    this.addDriftingGhosts();

    let subtitleY = 150;
    if (this.textures.exists('logo_title')) {
      const logo = this.add.image(cx, 116, 'logo_title').setOrigin(0.5);
      // Always fit the wordmark within the screen, whatever the source size.
      const fit = Math.min((GAME_WIDTH * 0.62) / logo.width, 150 / logo.height, 1);
      logo.setScale(fit);
      subtitleY = 116 + logo.displayHeight / 2 + 6;
    } else {
      this.add
        .text(cx, 110, 'GHOSTS IN THE MACHINE', {
          fontFamily: FONT_FAMILY,
          fontSize: '56px',
          color: COLORS.ghostGreenCss,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      subtitleY = 160;
    }

    this.add
      .text(cx, subtitleY, 'a haunted IT management sim', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textDim,
        backgroundColor: '#0b0e12aa',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5);

    const save = hasSave();
    let y = 280;
    if (save) {
      this.add.existing(
        button(this, cx, y, 'Continue', () => this.scene.start('Game', { resume: save }), {
          w: 320, h: 54, fontSize: '22px', color: COLORS.ghostGreenCss,
        }),
      );
      y += 72;
    }
    this.add.existing(
      button(this, cx, y, 'Campaign', () => this.scene.start('LevelSelect'), { w: 320, h: 54, fontSize: '22px' }),
    );
    y += 72;
    this.add.existing(
      button(this, cx, y, 'Sandbox', () => this.scene.start('SandboxConfig'), { w: 320, h: 54, fontSize: '22px' }),
    );
    y += 72;
    this.add.existing(
      button(this, cx, y, 'Settings', () => this.scene.start('Settings'), { w: 320, h: 54, fontSize: '22px' }),
    );
    y += 72;
    this.add.existing(
      button(this, cx, y, 'About', () => this.scene.start('About'), { w: 320, h: 54, fontSize: '22px' }),
    );

    this.add
      .text(cx, GAME_HEIGHT - 40, 'v1.0 — an original game. All ghosts are fictional. Any resemblance to your production environment is coincidental.', {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
  }

  private addDriftingGhosts(): void {
    for (let i = 0; i < 6; i++) {
      const ghost = this.add
        .image(
          Phaser.Math.Between(80, GAME_WIDTH - 80),
          Phaser.Math.Between(80, GAME_HEIGHT - 80),
          'ghost',
        )
        .setAlpha(0.12)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      this.tweens.add({
        targets: ghost,
        y: ghost.y - Phaser.Math.Between(30, 80),
        x: ghost.x + Phaser.Math.Between(-40, 40),
        alpha: 0.05,
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
