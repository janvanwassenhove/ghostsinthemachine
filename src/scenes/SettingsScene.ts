import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { loadSettings, resetAllProgress, saveSettings } from '../sim/save';
import { Sound } from '../sound';
import { button, label } from '../ui/widgets';

export class SettingsScene extends Phaser.Scene {
  private confirmReset = false;

  constructor() {
    super('Settings');
  }

  create(): void {
    this.confirmReset = false;
    const cx = GAME_WIDTH / 2;
    const settings = loadSettings();
    label(this, cx, 80, 'SETTINGS', '38px', COLORS.ghostGreenCss).setOrigin(0.5);

    const toggle = (y: number, name: string, get: () => boolean, set: (v: boolean) => void) => {
      label(this, cx - 260, y - 8, name, '17px', COLORS.textPrimary);
      const b = button(this, cx + 160, y, get() ? 'On' : 'Off', () => {
        set(!get());
        saveSettings(settings);
        (b.list[1] as Phaser.GameObjects.Text).setText(get() ? 'On' : 'Off');
      }, { w: 200, h: 40, fontSize: '15px' });
      this.add.existing(b);
    };

    toggle(170, 'Sound effects', () => settings.sound, (v) => { settings.sound = v; Sound.setEnabled(v); if (v) Sound.click(); });
    toggle(226, 'Office chatter ticker', () => settings.chatter, (v) => { settings.chatter = v; });
    toggle(282, 'Autosave (daily + on tab switch)', () => settings.autosave, (v) => { settings.autosave = v; });

    label(this, cx - 260, 330, 'Default game speed', '17px', COLORS.textPrimary);
    const sp = button(this, cx + 160, 338, `${settings.defaultSpeed}×`, () => {
      settings.defaultSpeed = settings.defaultSpeed === 1 ? 2 : 1;
      saveSettings(settings);
      (sp.list[1] as Phaser.GameObjects.Text).setText(`${settings.defaultSpeed}×`);
    }, { w: 200, h: 40, fontSize: '15px' });
    this.add.existing(sp);

    const reset = button(this, cx, 420, 'Reset all progress & saves', () => {
      if (!this.confirmReset) {
        this.confirmReset = true;
        (reset.list[1] as Phaser.GameObjects.Text).setText('Are you sure? Click again.').setColor(COLORS.danger);
        return;
      }
      resetAllProgress();
      this.confirmReset = false;
      (reset.list[1] as Phaser.GameObjects.Text).setText('Progress erased. The ghosts remember, though.').setColor(COLORS.textDim);
    }, { w: 420, h: 44, fontSize: '15px', color: COLORS.danger });
    this.add.existing(reset);

    this.add.existing(button(this, cx, GAME_HEIGHT - 60, 'Back [Esc]', () => this.scene.start('MainMenu'), { w: 200, h: 40 }));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MainMenu'));
  }
}
