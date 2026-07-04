import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ROOM_BY_ID } from '../data/rooms';
import { ROLE_BY_ID } from '../data/roles';
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
    this.textObj = this.add.text(cx, 300, '', {
      fontFamily: FONT_FAMILY, fontSize: '22px', color: COLORS.textPrimary,
      align: 'center', wordWrap: { width: 860 }, lineSpacing: 8,
    }).setOrigin(0.5);

    // What this contract teaches you: the newly-unlocked rooms & staff, drawn
    // in the same icon style as the in-game build/hire panels.
    this.showUnlocks();

    this.captionObj = this.add.text(cx, GAME_HEIGHT - 100, '', {
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

  /** Showcase the rooms & staff this contract unlocks, in the in-game icon style. */
  private showUnlocks(): void {
    const cx = GAME_WIDTH / 2;
    const rooms = (this.scenario.unlockRooms ?? []).filter((id) => ROOM_BY_ID[id]);
    const roles = (this.scenario.unlockRoles ?? []).filter((id) => ROLE_BY_ID[id]);

    if (rooms.length === 0 && roles.length === 0) {
      this.add.text(cx, 470, '✦ Every room and every hire is now at your disposal. ✦', {
        fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.ghostGreenCss,
      }).setOrigin(0.5);
      return;
    }

    this.add.text(cx, 400, 'NEW THIS CONTRACT — rooms & staff you can now use', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: COLORS.ghostGreenCss, fontStyle: 'bold',
    }).setOrigin(0.5);

    const roomSpacing = 92;
    const roomStart = cx - ((rooms.length - 1) * roomSpacing) / 2;
    rooms.forEach((id, i) => this.roomChip(roomStart + i * roomSpacing, 452, id));

    const roleSpacing = 92;
    const roleStart = cx - ((roles.length - 1) * roleSpacing) / 2;
    roles.forEach((id, i) => this.roleChip(roleStart + i * roleSpacing, 552, id));
  }

  /** A build-menu-style room tile: panel chip + art (or colour swatch) + short name. */
  private roomChip(x: number, y: number, id: string): void {
    const def = ROOM_BY_ID[id];
    const s = 52;
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.92);
    g.lineStyle(1, COLORS.ghostGreen, 0.8);
    g.fillRoundedRect(x - s / 2, y - s / 2, s, s, 6);
    g.strokeRoundedRect(x - s / 2, y - s / 2, s, s, 6);
    if (this.textures.exists(`room_${id}`)) {
      this.add.image(x, y, `room_${id}`).setDisplaySize(s - 10, s - 10);
    } else {
      this.add.rectangle(x, y, s - 16, s - 20, def.color, 0.9);
      this.add.text(x, y, def.short, {
        fontFamily: FONT_FAMILY, fontSize: '8px', color: '#0b0f16', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add.text(x, y + s / 2 + 8, def.short, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.textDim,
    }).setOrigin(0.5);
  }

  /** A hire-panel-style staff token: avatar (or initials disc) + role name. */
  private roleChip(x: number, y: number, id: string): void {
    const role = ROLE_BY_ID[id];
    const r = 24;
    if (this.textures.exists(`staff_${id}`)) {
      this.add.image(x, y, `staff_${id}`).setDisplaySize(r * 2, r * 2);
    } else {
      const g = this.add.graphics();
      g.fillStyle(role.color, 1);
      g.lineStyle(2, COLORS.ghostGreen, 0.6);
      g.fillCircle(x, y, r);
      g.strokeCircle(x, y, r);
      this.add.text(x, y, role.initials, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: '#0b0f16', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add.text(x, y + r + 8, role.name, {
      fontFamily: FONT_FAMILY, fontSize: '10px', color: COLORS.textDim,
      align: 'center', wordWrap: { width: 88 },
    }).setOrigin(0.5, 0);
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
