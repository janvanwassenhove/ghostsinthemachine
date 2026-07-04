import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../config';
import { Sound } from '../sound';

export interface ButtonOpts {
  w?: number;
  h?: number;
  fontSize?: string;
  enabled?: boolean;
  color?: string;
}

/** A simple rectangle button. Returns a container so panels can position it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.w ?? 200;
  const h = opts.h ?? 34;
  const enabled = opts.enabled ?? true;
  const bg = scene.add
    .rectangle(0, 0, w, h, COLORS.panel)
    .setStrokeStyle(1, COLORS.ghostGreen, enabled ? 0.8 : 0.25);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_FAMILY,
      fontSize: opts.fontSize ?? '15px',
      color: enabled ? (opts.color ?? COLORS.textPrimary) : COLORS.textDim,
    })
    .setOrigin(0.5);
  const c = scene.add.container(x, y, [bg, txt]);
  c.setSize(w, h);
  if (enabled) {
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => bg.setFillStyle(0x232b36))
      .on('pointerout', () => bg.setFillStyle(COLORS.panel))
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev?: { stopPropagation?: () => void }) => {
        ev?.stopPropagation?.();
        Sound.unlock();
        Sound.click();
        onClick();
      });
  }
  return c;
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = '14px',
  color: string = COLORS.textPrimary,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: size, color });
}

/** Toast manager: stacked fading messages, bottom-left of the given scene. */
export class Toasts {
  private scene: Phaser.Scene;
  private items: Phaser.GameObjects.Text[] = [];
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  push(msg: string, color: string): void {
    const t = this.scene.add
      .text(this.x, this.y, msg, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color,
        backgroundColor: '#10141be0',
        padding: { x: 8, y: 4 },
        wordWrap: { width: 560 },
      })
      .setDepth(1000);
    this.items.unshift(t);
    while (this.items.length > 5) {
      this.items.pop()!.destroy();
    }
    this.reflow();
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: 5200,
      duration: 700,
      onComplete: () => {
        t.destroy();
        this.items = this.items.filter((i) => i !== t);
        this.reflow();
      },
    });
  }

  private reflow(): void {
    let y = this.y;
    for (const t of this.items) {
      y -= t.height + 4;
      t.setY(y);
    }
  }
}
