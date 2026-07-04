import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { button } from '../ui/widgets';

const CREATOR_URL = 'https://mityjohn.com/';

/** Humorous "about the haunting" + creator credit screen. */
export class AboutScene extends Phaser.Scene {
  constructor() {
    super('About');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    if (this.textures.exists('bg_menu')) {
      this.add.image(cx, GAME_HEIGHT / 2, 'bg_menu')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-1).setAlpha(0.5);
    }
    this.addDriftingGhosts();

    this.add.text(cx, 70, 'ABOUT', {
      fontFamily: FONT_FAMILY, fontSize: '38px', color: COLORS.ghostGreenCss, fontStyle: 'bold',
    }).setOrigin(0.5);

    // A tidy panel so the text reads over the busy background.
    const panelW = 820;
    const panelH = 430;
    const g = this.add.graphics();
    g.fillStyle(0x0b0f16, 0.82);
    g.lineStyle(1, COLORS.ghostGreen, 0.3);
    g.fillRoundedRect(cx - panelW / 2, 118, panelW, panelH, 12);
    g.strokeRoundedRect(cx - panelW / 2, 118, panelW, panelH, 12);

    const body = [
      'GHOSTS IN THE MACHINE',
      'A haunted IT management sim. Build rooms, hire the questionably qualified,',
      'and keep the tickets flowing while the tickets try to flow back.',
      '',
      'Every incident, room, disaster and staff quirk in this game is entirely',
      'fictional. Any resemblance to your production environment is, regrettably,',
      'a coincidence you will have to live with.',
      '',
      'Created by  JAN VAN WASSENHOVE',
      'Chief Exorcist of Undefined Behaviour, part-time necromancer of dead endpoints,',
      'and the only person who reads the logs after 2 AM.',
      '',
      'He builds things at the address below. Some of them are even on purpose.',
    ];
    this.add.text(cx, 150, body.join('\n'), {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.textPrimary,
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // Clickable creator link.
    const link = this.add.text(cx, 470, CREATOR_URL, {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: COLORS.ghostGreenCss, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    link.on('pointerover', () => link.setColor(COLORS.accentCss));
    link.on('pointerout', () => link.setColor(COLORS.ghostGreenCss));
    link.on('pointerdown', () => window.open(CREATOR_URL, '_blank', 'noopener,noreferrer'));
    this.add.text(cx, 498, '(opens in a new tab — the site is not haunted, probably)', {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5);

    this.add.existing(button(this, cx, GAME_HEIGHT - 40, 'Back [Esc]', () => this.scene.start('MainMenu'), { w: 220, h: 40 }));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }

  private addDriftingGhosts(): void {
    for (let i = 0; i < 5; i++) {
      const ghost = this.add
        .image(Phaser.Math.Between(60, GAME_WIDTH - 60), Phaser.Math.Between(80, GAME_HEIGHT - 80), 'ghost')
        .setAlpha(0.08)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.5));
      this.tweens.add({
        targets: ghost, y: ghost.y - Phaser.Math.Between(30, 80), alpha: 0.03,
        duration: Phaser.Math.Between(4000, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }
}
