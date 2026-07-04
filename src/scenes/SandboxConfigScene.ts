import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeSandbox } from '../data/scenarios';
import { button, label } from '../ui/widgets';

interface Option<T> {
  name: string;
  values: { label: string; value: T }[];
  index: number;
}

export class SandboxConfigScene extends Phaser.Scene {
  constructor() {
    super('SandboxConfig');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    label(this, cx, 70, 'SANDBOX', '38px', COLORS.ghostGreenCss).setOrigin(0.5);
    label(this, cx, 112, 'Configure your haunting.', '15px', COLORS.textDim).setOrigin(0.5);

    const money: Option<number> = {
      name: 'Starting money', index: 1,
      values: [
        { label: 'Shoestring ($900)', value: 900 },
        { label: 'Comfortable ($2000)', value: 2000 },
        { label: 'Venture-cursed ($5000)', value: 5000 },
      ],
    };
    const disasters: Option<number> = {
      name: 'Disasters', index: 1,
      values: [
        { label: 'Off', value: 0 },
        { label: 'Occasional', value: 0.7 },
        { label: 'Frequent', value: 1.4 },
        { label: 'Biblical', value: 2.2 },
      ],
    };
    const audits: Option<boolean> = {
      name: 'Audits', index: 0,
      values: [
        { label: 'Off', value: false },
        { label: 'Every 3 days', value: true },
      ],
    };
    const mutation: Option<number> = {
      name: 'Incident mutation', index: 1,
      values: [
        { label: 'Off', value: 0 },
        { label: 'Rare', value: 0.002 },
        { label: 'Unsettling', value: 0.006 },
      ],
    };
    const fail: Option<boolean> = {
      name: 'Fail conditions', index: 0,
      values: [
        { label: 'Off (pure sandbox)', value: false },
        { label: 'On (bankruptcy & trust)', value: true },
      ],
    };

    const options = [money, disasters, audits, mutation, fail] as Option<unknown>[];
    options.forEach((opt, i) => {
      const yy = 180 + i * 62;
      label(this, cx - 290, yy - 8, opt.name, '17px', COLORS.textPrimary);
      const b = button(this, cx + 150, yy, opt.values[opt.index].label, () => {
        opt.index = (opt.index + 1) % opt.values.length;
        const txt = b.list[1] as Phaser.GameObjects.Text;
        txt.setText(opt.values[opt.index].label);
      }, { w: 320, h: 40, fontSize: '15px' });
      this.add.existing(b);
    });

    this.add.existing(button(this, cx, 540, 'Begin the haunting', () => {
      this.scene.start('Game', {
        scenario: makeSandbox({
          money: money.values[money.index].value,
          disasterFreq: disasters.values[disasters.index].value,
          audits: audits.values[audits.index].value,
          mutation: mutation.values[mutation.index].value,
          failEnabled: fail.values[fail.index].value,
        }),
      });
    }, { w: 380, h: 50, fontSize: '19px', color: COLORS.ghostGreenCss }));

    this.add.existing(button(this, cx, GAME_HEIGHT - 50, 'Back [Esc]', () => this.scene.start('MainMenu'), { w: 200, h: 36 }));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }
}
