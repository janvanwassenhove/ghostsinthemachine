import Phaser from 'phaser';
import { processTransparency, queueGameAssets } from '../render/assets';

/**
 * Boot scene: loads any optional art dropped into src/assets/game/, generates
 * the procedural fallback textures, and hands off to the main menu.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    queueGameAssets(this.load);
  }

  create(): void {
    // Knock flat backgrounds out of any supplied sprite art (ghosts, rooms,
    // staff, logo) so they render as cut-outs rather than boxes.
    processTransparency(this);
    // Only generate the fallback ghost if the artist didn't provide a ghost.png.
    if (!this.textures.exists('ghost')) this.createGhostTexture();
    this.createHudIcons();
    this.scene.start('MainMenu');
  }

  /**
   * Monochrome phosphor-green line glyphs for the HUD, drawn to match the
   * terminal/CRT theme (no clashing multicolour emoji). 24×24 each.
   */
  private createHudIcons(): void {
    const GREEN = 0x7ee8a2;
    const mk = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(2, GREEN, 1);
      g.fillStyle(GREEN, 1);
      draw(g);
      g.generateTexture(key, 24, 24);
      g.destroy();
    };
    // money — coin with a bar
    mk('ic_money', (g) => { g.strokeCircle(12, 12, 8); g.lineBetween(12, 3, 12, 21); });
    // trust — two chain links
    mk('ic_trust', (g) => { g.strokeRoundedRect(3, 8, 11, 8, 4); g.strokeRoundedRect(10, 8, 11, 8, 4); });
    // debt — a little skull (technical debt gone sentient)
    mk('ic_debt', (g) => {
      g.strokeCircle(12, 10, 7);
      g.fillRect(8, 9, 2.5, 3); g.fillRect(13.5, 9, 2.5, 3);
      g.lineBetween(9, 17, 9, 20); g.lineBetween(12, 17, 12, 20); g.lineBetween(15, 17, 15, 20);
    });
    // stability — a gauge
    mk('ic_stability', (g) => {
      g.beginPath(); g.arc(12, 14, 8, Math.PI * 1.05, Math.PI * 1.95); g.strokePath();
      g.lineBetween(12, 14, 17, 9);
    });
    // coffee — a cup with steam
    mk('ic_coffee', (g) => {
      g.strokeRect(5, 10, 10, 9);
      g.beginPath(); g.arc(16, 14, 3, -Math.PI / 2, Math.PI / 2); g.strokePath();
      g.lineBetween(8, 7, 8, 4); g.lineBetween(11, 7, 11, 4);
    });
    // beans
    mk('ic_beans', (g) => {
      g.strokeEllipse(8, 12, 7, 10); g.strokeEllipse(15, 13, 7, 10);
    });
    // morale — smiley
    mk('ic_morale', (g) => {
      g.strokeCircle(12, 12, 8);
      g.fillCircle(9, 10, 1.3); g.fillCircle(15, 10, 1.3);
      g.beginPath(); g.arc(12, 12, 4.5, Math.PI * 0.15, Math.PI * 0.85); g.strokePath();
    });
    // day/clock
    mk('ic_day', (g) => {
      g.strokeCircle(12, 12, 8);
      g.lineBetween(12, 12, 12, 6); g.lineBetween(12, 12, 16, 12);
    });
    // objectives — a target
    mk('ic_obj', (g) => {
      g.strokeCircle(12, 12, 8); g.strokeCircle(12, 12, 4); g.fillCircle(12, 12, 1.5);
    });
    // play / pause / speed
    mk('ic_pause', (g) => { g.fillRect(7, 5, 4, 14); g.fillRect(13, 5, 4, 14); });
    mk('ic_play', (g) => { g.fillTriangle(7, 5, 7, 19, 19, 12); });
  }

  private createGhostTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Body: rounded top, wavy hem
    g.fillStyle(0x7ee8a2, 1);
    g.fillCircle(32, 28, 24);
    g.fillRect(8, 28, 48, 22);
    for (let i = 0; i < 4; i++) {
      g.fillCircle(14 + i * 12, 50, 6);
    }
    // Eyes: monitor-glow dark sockets
    g.fillStyle(0x101418, 1);
    g.fillCircle(24, 26, 5);
    g.fillCircle(40, 26, 5);
    g.generateTexture('ghost', 64, 60);
    g.destroy();
  }
}
