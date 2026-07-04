import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DEFEAT_LINES, VICTORY_LINES } from '../data/humour';
import { SCENARIOS, SCENARIO_BY_ID } from '../data/scenarios';
import type { Outcome } from '../sim/state';
import { button, label } from '../ui/widgets';

interface EndData {
  outcome: Outcome;
  scenarioId: string;
  sandbox: boolean;
}

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(data: EndData): void {
    const cx = GAME_WIDTH / 2;
    const o = data.outcome;

    const artKey = o.won ? 'art_victory' : 'art_defeat';
    if (this.textures.exists(artKey)) {
      this.add
        .image(cx, GAME_HEIGHT / 2, artKey)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(-1)
        .setAlpha(0.5);
    }
    const flavour = o.won
      ? VICTORY_LINES[Math.floor(Math.random() * VICTORY_LINES.length)]
      : DEFEAT_LINES[Math.floor(Math.random() * DEFEAT_LINES.length)];

    this.add
      .text(cx, 130, o.won ? 'CONTRACT FULFILLED' : 'CONTRACT TERMINATED', {
        fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold',
        color: o.won ? COLORS.ghostGreenCss : COLORS.danger,
      })
      .setOrigin(0.5);
    label(this, cx, 185, o.reason, '18px', COLORS.textPrimary).setOrigin(0.5);
    label(this, cx, 215, flavour, '15px', COLORS.textDim).setOrigin(0.5);

    if (o.won && !data.sandbox) {
      label(this, cx, 260, '★'.repeat(o.stars) + '☆'.repeat(3 - o.stars), '34px', '#e8d97e').setOrigin(0.5);
    }

    const s = o.stats;
    const statLines = [
      `Incidents resolved: ${s.resolved}    failed: ${s.failed}`,
      `Income: $${Math.round(s.income)}    Spent: $${Math.round(s.spent)}`,
      `Days on the contract: ${Math.max(1, s.daysPlayed)}`,
    ];
    label(this, cx, 330, statLines.join('\n'), '16px', COLORS.textPrimary)
      .setOrigin(0.5)
      .setAlign('center');

    let y = 440;
    if (!data.sandbox) {
      const idx = SCENARIOS.findIndex((sc) => sc.id === data.scenarioId);
      const next = idx >= 0 ? SCENARIOS[idx + 1] : undefined;
      if (o.won && next) {
        this.add.existing(button(this, cx, y, `Next: ${next.name}`, () => {
          this.scene.start('Game', { scenario: next });
        }, { w: 420, h: 46, fontSize: '17px' }));
        y += 58;
      }
      this.add.existing(button(this, cx, y, 'Retry scenario', () => {
        this.scene.start('Game', { scenario: SCENARIO_BY_ID[data.scenarioId] });
      }, { w: 420, h: 46, fontSize: '17px' }));
      y += 58;
    }
    this.add.existing(button(this, cx, y, 'Main menu', () => this.scene.start('MainMenu'), {
      w: 420, h: 46, fontSize: '17px',
    }));

    label(this, cx, GAME_HEIGHT - 30, 'NetherNet Solutions — "We answer the tickets nobody else can hear."', '13px', '#6f7d8f').setOrigin(0.5);
  }
}
