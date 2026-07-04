import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BAL } from '../data/balance';
import { CATEGORY_COLORS, INCIDENT_BY_ID } from '../data/incidents';
import { DISASTER_BY_ID } from '../data/disasters';
import { CONVERSATIONS, GHOST_THOUGHTS, OFFICE_CHATTER, STAFF_THOUGHTS } from '../data/humour';
import { ROLE_BY_ID } from '../data/roles';
import { ROOMS, ROOM_BY_ID, repairCost, upgradeCost } from '../data/rooms';
import type { RoomDef, ScenarioDef } from '../data/types';
import { ROOM_CATEGORIES } from '../data/types';
import { GRID_H, GRID_W, ENTRANCE, buildingEntrances, doorOutside, doorSideOf, inRects, roomAt } from '../sim/grid';
import { Sim } from '../sim/sim';
import type { IncidentState, RoomState, StaffState } from '../sim/state';
import { loadGame, loadSettings, recordResult, saveGame, clearSaves } from '../sim/save';
import { Sound } from '../sound';
import { Toasts, button, label } from '../ui/widgets';

const TILE = BAL.grid.tile;
const GX = 8; // grid pixel origin
const GY = 72;
const PANEL_X = GX + GRID_W * TILE + 8; // right panel
const PANEL_W = GAME_WIDTH - PANEL_X - 8;

type PanelMode = 'info' | 'build' | 'hire' | 'roster' | 'room' | 'staff';

/** Room types a given staff role can be assigned to (their specialty rooms). */
function roomsForRole(roleId: string): RoomDef[] {
  return ROOMS.filter((r) => r.roles.includes(roleId));
}

/** Mix a colour toward white by `amt` (0..1) — used to brighten room accents. */
function lighten(color: number, amt: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const up = (c: number) => Math.min(255, Math.round(c + (255 - c) * amt));
  return (up(r) << 16) | (up(g) << 8) | up(b);
}

interface GameData {
  scenario?: ScenarioDef;
  resume?: 'auto' | 'manual';
}

export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private speed = 1;
  private paused = false;
  private panelMode: PanelMode = 'info';
  private selectedRoom: number | null = null;
  private selectedStaff: number | null = null;
  private buildDef: string | null = null;
  private buildRot = 0; // preferred door side while placing (0 bottom,1 left,2 top,3 right)
  private dragStart: { x: number; y: number } | null = null;
  private dragEnd: { x: number; y: number } | null = null;

  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private toasts!: Toasts;
  private panel!: Phaser.GameObjects.Container;
  private panelTimer = 0;
  private panelScroll = 0;
  private panelMaxScroll = 0;
  private panelScrollHint?: Phaser.GameObjects.Text;
  private roomLayer!: Phaser.GameObjects.Container;
  private roomVisuals = new Map<number, {
    border: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
    isPlan: boolean;
    status: Phaser.GameObjects.Text;
  }>();
  private roomsSignature = '';
  private incidentSprites = new Map<number, Phaser.GameObjects.Image>();
  private staffSprites = new Map<number, Phaser.GameObjects.Arc | Phaser.GameObjects.Image>();
  private thoughts: { c: Phaser.GameObjects.Container; target: Phaser.GameObjects.Image | Phaser.GameObjects.Arc; ttl: number }[] = [];
  private thoughtTimer = 3;
  private queueLaneCache = new Map<number, { x: number; y: number }[]>();
  private preview!: Phaser.GameObjects.Graphics;
  private buildHint!: Phaser.GameObjects.Text;
  private world!: Phaser.GameObjects.Container;
  private zoom = 1;
  private panning = false;
  private panPointer = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };
  private pauseBtn!: Phaser.GameObjects.Container;
  private speed1Btn!: Phaser.GameObjects.Container;
  private speed2Btn!: Phaser.GameObjects.Container;
  private tooltip!: Phaser.GameObjects.Text;
  private objectivesText!: Phaser.GameObjects.Text;
  private objectivesTitle!: Phaser.GameObjects.Text;
  private objectivesBg!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;
  private chatterText!: Phaser.GameObjects.Text;
  private disasterChips!: Phaser.GameObjects.Container;
  private menuOverlay: Phaser.GameObjects.Container | null = null;
  private lastDay = 1;
  private chatterTimer = 0;
  private settings = loadSettings();
  private onVisibility = () => {
    if (document.hidden && this.settings.autosave && this.sim && !this.sim.outcome) {
      saveGame(this.sim, 'auto');
    }
  };

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.settings = loadSettings();
    Sound.setEnabled(this.settings.sound);
    this.speed = this.settings.defaultSpeed;
    this.paused = false;
    this.thoughts = [];
    this.thoughtTimer = 3;
    this.panelMode = 'info';
    this.selectedRoom = null;
    this.selectedStaff = null;
    this.buildDef = null;
    this.dragStart = null;
    this.roomVisuals.clear();
    this.roomsSignature = '';
    this.incidentSprites.clear();
    this.staffSprites.clear();
    this.menuOverlay = null;

    if (data.resume) {
      const loaded = loadGame(data.resume);
      if (!loaded) {
        this.scene.start('MainMenu');
        return;
      }
      this.sim = loaded;
    } else if (data.scenario) {
      this.sim = new Sim(data.scenario, (Date.now() % 100000) + 7);
    } else {
      this.scene.start('MainMenu');
      return;
    }
    this.lastDay = this.sim.state.day;

    // Everything in the play area lives in `world`, which we scale/pan for zoom.
    this.zoom = 1;
    this.panning = false;
    this.world = this.add.container(0, 0).setDepth(2);
    this.panel = this.add.container(PANEL_X, GY).setDepth(20);
    this.drawStatic();
    this.roomLayer = this.add.container(0, 0);
    this.preview = this.add.graphics().setDepth(10);
    this.buildHint = this.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: '#ffd7d7',
        backgroundColor: '#10141bdd', padding: { x: 5, y: 3 },
      })
      .setDepth(12)
      .setVisible(false);
    this.roomLayer.setDepth(2);
    this.world.add([this.roomLayer, this.preview, this.buildHint]);
    // Clip the world to the play area so zoomed/panned content can't spill over
    // the HUD or the side panel.
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(GX, GY, GRID_W * TILE, GRID_H * TILE);
    this.world.setMask(maskShape.createGeometryMask());
    this.toasts = new Toasts(this, GX + 4, GY + GRID_H * TILE - 6);
    this.tooltip = this.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textPrimary,
        backgroundColor: '#10141bf0', padding: { x: 8, y: 6 }, wordWrap: { width: 320 },
      })
      .setDepth(1200).setVisible(false);
    // Objectives live behind a compact hover chip so they don't cover the floor.
    const chipBg = this.add
      .rectangle(GX + 6, GY + 6, 150, 24, 0x10141b, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.ghostGreen, 0.7)
      .setDepth(26);
    this.add.image(GX + 18, GY + 18, 'ic_obj').setDisplaySize(15, 15).setDepth(27);
    this.add
      .text(GX + 30, GY + 11, 'Objectives', { fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.ghostGreenCss })
      .setDepth(27);
    this.objectivesBg = this.add
      .rectangle(GX + 6, GY + 34, 360, 60, 0x0d1017, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.ghostGreen, 0.7)
      .setDepth(26)
      .setVisible(false);
    this.objectivesTitle = this.add
      .text(GX + 14, GY + 40, '', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.ghostGreenCss, fontStyle: 'bold',
      })
      .setDepth(27).setVisible(false);
    this.objectivesText = this.add
      .text(GX + 14, GY + 60, '', { fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.textPrimary })
      .setDepth(27).setVisible(false);
    chipBg.setInteractive()
      .on('pointerover', () => this.showObjectives(true))
      .on('pointerout', () => this.showObjectives(false));
    this.disasterChips = this.add.container(GX + 6, GY + 40).setDepth(25);
    // Contextual "what to do now" banner across the top of the play area.
    this.hintText = this.add
      .text(GX + (GRID_W * TILE) / 2 + 60, GY + 10, '', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: '#ffcf7a',
        backgroundColor: '#1c1305e0', padding: { x: 10, y: 5 }, align: 'center', wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0)
      .setDepth(28)
      .setVisible(false);
    this.rebuildPanel();

    this.setupInput();
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
    this.chatterTimer = 4;
  }

  // ------------------------------------------------------------- static frame

  private drawStatic(): void {
    // HUD bar
    this.add.rectangle(0, 0, GAME_WIDTH, 64, 0x10141b).setOrigin(0, 0).setDepth(30);
    this.add.rectangle(0, 64, GAME_WIDTH, 2, COLORS.ghostGreen, 0.5).setOrigin(0, 0).setDepth(30);
    // Each stat is a themed icon + value, laid out on a tidy two-row grid.
    const stat = (key: string, icon: string, x: number, y: number, size = '15px', tip?: string) => {
      const img = this.add.image(x + 9, y + 9, icon).setDisplaySize(18, 18).setDepth(31);
      this.hudTexts[key] = this.add
        .text(x + 22, y, '', { fontFamily: FONT_FAMILY, fontSize: size, color: COLORS.textPrimary })
        .setDepth(31);
      if (tip) {
        img.setInteractive({ useHandCursor: false });
        img.on('pointerover', () => {
          this.tooltip
            .setText(tip)
            .setPosition(Math.min(x, GAME_WIDTH - 340), 62)
            .setVisible(true);
        });
        img.on('pointerout', () => this.tooltip.setVisible(false));
      }
    };
    stat('money', 'ic_money', 12, 8, '16px',
      'Money — cash on hand.\nPays salaries, builds and repairs. Stay in the red too long and you go bankrupt.');
    stat('trust', 'ic_trust', 160, 8, '15px',
      'Client trust (0–100).\nResolving tickets raises it and boosts payouts; failed or abandoned tickets drop it. If it falls below the contract’s limit, you lose.');
    stat('debt', 'ic_debt', 280, 8, '15px',
      'Technical debt (0–100).\nPiles up from failed tickets, mutations and demolitions. It drags down stability — and at 100 a forced Great Refactoring erupts.');
    stat('stability', 'ic_stability', 400, 8, '15px',
      'System stability (0–100).\nHealth of your haunted infrastructure. Lowered by debt, broken or possessed rooms, disasters and empty coffee. Low stability means more breakdowns and hauntings.');
    stat('clock', 'ic_day', 540, 8, '15px',
      'Day & time.\nEach new day pays salaries and checks your objectives.');
    stat('coffee', 'ic_coffee', 12, 36, '15px',
      'Coffee — staff drink a cup on their break to refill energy.\nA Coffee Reactor brews beans into coffee. No reactor = staff can never recharge and burn out.');
    stat('beans', 'ic_beans', 160, 36, '15px',
      'Beans — raw stock for the Coffee Reactor.\nBuy with ＋Beans ($80), the reactor brews them into coffee, tired staff drink it to recover.');
    stat('morale', 'ic_morale', 280, 36, '15px',
      'Staff morale — average across your team (0–100).\nLow morale slows work; if it stays low, staff resign.');
    this.hudTexts.speedLabel = this.add
      .text(400, 36, '', { fontFamily: FONT_FAMILY, fontSize: '15px', color: COLORS.textDim })
      .setDepth(31);

    // Grouped control panels behind the top-right clusters for a tidier bar.
    const groupPanel = (x: number, w: number) => {
      const g = this.add.graphics().setDepth(30.4);
      g.fillStyle(0x0b0f16, 0.6);
      g.lineStyle(1, COLORS.ghostGreen, 0.28);
      g.fillRoundedRect(x, 6, w, 52, 8);
      g.strokeRoundedRect(x, 6, w, 52, 8);
    };
    groupPanel(748, 224); // playback cluster
    groupPanel(984, 236); // beans + menu cluster

    // Playback controls (top-right)
    this.pauseBtn = button(this, 820, 22, '❚❚ Pause', () => this.togglePause(), { w: 116, h: 26, fontSize: '13px' }).setDepth(31);
    this.add.existing(this.pauseBtn);
    this.speed1Btn = button(this, 898, 22, '1×', () => { this.speed = 1; this.paused = false; }, { w: 40, h: 26, fontSize: '13px' }).setDepth(31);
    this.speed2Btn = button(this, 942, 22, '2×', () => { this.speed = 2; this.paused = false; }, { w: 40, h: 26, fontSize: '13px' }).setDepth(31);
    this.add.existing(this.speed1Btn);
    this.add.existing(this.speed2Btn);
    this.add
      .text(860, 46, 'Space · 1 · 2 · Esc', { fontFamily: FONT_FAMILY, fontSize: '11px', color: '#6b7a8c' })
      .setOrigin(0.5, 0.5)
      .setDepth(31);
    this.add.existing(
      button(this, 1050, 22, '＋ Beans  $80', () => this.action(this.sim.buyBeans()), { w: 118, h: 26, fontSize: '12px' }).setDepth(31),
    );
    this.add.existing(
      button(this, 1158, 22, '☰ Menu', () => this.toggleMenu(), { w: 90, h: 26, fontSize: '13px' }).setDepth(31),
    );
    this.add
      .text(1104, 46, 'buy coffee beans · pause menu', { fontFamily: FONT_FAMILY, fontSize: '10px', color: '#6b7a8c' })
      .setOrigin(0.5, 0.5)
      .setDepth(31);

    const GW = GRID_W * TILE;
    const GH = GRID_H * TILE;
    const intX = GX + TILE; // interior (the office) starts after the exterior column
    const intW = GW - TILE;

    // --- Exterior: the dark loading bay outside the building where ghosts arrive
    const exterior = this.add
      .rectangle(GX, GY, TILE, GH, 0x090b10)
      .setOrigin(0, 0)
      .setDepth(0);
    this.world.add(exterior);
    // faint hazard hatching so the exterior reads as "outside / dock"
    const dock = this.add.graphics().setDepth(0.1);
    dock.lineStyle(2, 0x2a2f1a, 0.6);
    for (let i = -GRID_H; i < GRID_H; i++) {
      dock.lineBetween(GX, GY + (i + 1) * TILE, GX + TILE, GY + i * TILE);
    }
    this.world.add(dock);

    // Helper: lay the lit office floor (tiles + wash) over a pixel rectangle.
    const layFloor = (rx: number, ry: number, rw: number, rh: number, baseDepth: number): void => {
      const back = this.add.rectangle(rx, ry, rw, rh, 0x2b3646).setOrigin(0, 0).setDepth(baseDepth);
      this.world.add(back);
      if (this.textures.exists('tile_floor')) {
        const floor = this.add.tileSprite(rx, ry, rw, rh, 'tile_floor')
          .setOrigin(0, 0).setDepth(baseDepth + 0.05).setAlpha(0.95);
        const src = this.textures.get('tile_floor').getSourceImage();
        floor.tileScaleX = TILE / src.width;
        floor.tileScaleY = TILE / src.height;
        const wash = this.add.rectangle(rx, ry, rw, rh, 0x5a6a80)
          .setOrigin(0, 0).setDepth(baseDepth + 0.3).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0.28);
        this.world.add([floor, wash]);
      }
    };

    const T = 5;
    const wallCol = 0x6f8299;
    const building = this.sim.state.scenario.building;

    if (building) {
      // --- The grounds (garden): a mossy backdrop fills the whole interior…
      const garden = this.add.rectangle(intX, GY, intW, GH, 0x24331d).setOrigin(0, 0).setDepth(0);
      this.world.add(garden);
      const turf = this.add.graphics().setDepth(0.1);
      turf.lineStyle(1, 0x35492a, 0.5);
      for (let y = 0; y < GRID_H; y++) {
        turf.lineBetween(intX, GY + y * TILE + TILE * 0.62, GX + GW, GY + y * TILE + TILE * 0.62);
      }
      this.world.add(turf);
      // A walkway of paved tiles runs from the entrance to the building, so the
      // arriving ghosts have a path to queue along (they follow it in the sim).
      const leftX = Math.min(...building.map((r) => r.x));
      const walkRow = ENTRANCE.y;
      const onWalkway = (x: number, y: number) => y === walkRow && x >= 1 && x < leftX;
      const path = this.add.graphics().setDepth(0.14);
      for (let x = 1; x < leftX; x++) {
        const px = GX + x * TILE;
        const py = GY + walkRow * TILE;
        path.fillStyle(0x4a4034, 1); path.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        path.fillStyle(0x5b4f40, 1); path.fillRect(px + 4, py + 6, TILE - 8, 4);
        path.fillRect(px + 4, py + TILE - 12, TILE - 8, 4);
      }
      this.world.add(path);

      // …dotted with little shrubs so the open ground reads as a garden.
      const flora = this.add.graphics().setDepth(0.12);
      for (let gx = 1; gx < GRID_W; gx++) {
        for (let gy = 0; gy < GRID_H; gy++) {
          if (inRects(building, gx, gy) || onWalkway(gx, gy) || (gx * 7 + gy * 13) % 5 !== 0) continue;
          const px = GX + gx * TILE + TILE / 2;
          const py = GY + gy * TILE + TILE / 2;
          flora.fillStyle(0x3f6b32, 0.7); flora.fillCircle(px - 4, py + 3, 3);
          flora.fillStyle(0x4e7a3a, 0.7); flora.fillCircle(px + 3, py - 1, 4);
        }
      }
      this.world.add(flora);

      // --- Building floor: only the footprint rectangles are lit office floor.
      for (const r of building) {
        layFloor(GX + r.x * TILE, GY + r.y * TILE, r.w * TILE, r.h * TILE, 0.2);
      }
    } else {
      // No footprint (sandbox): the whole interior is office floor.
      layFloor(intX, GY, intW, GH, 0);
    }

    // Interior grid lines (over both floor and grounds).
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, 0x46586e, 0.5);
    for (let x = 1; x <= GRID_W; x++) {
      g.lineBetween(GX + x * TILE, GY, GX + x * TILE, GY + GH);
    }
    for (let y = 0; y <= GRID_H; y++) {
      g.lineBetween(intX, GY + y * TILE, GX + GW, GY + y * TILE);
    }
    this.world.add(g);

    // --- Walls
    const walls = this.add.graphics().setDepth(1.5);
    if (building) {
      // A foundation skirting around the OUTER edge of the footprint only, so
      // adjacent wings read as one connected building (no fake wall across the
      // junction where two rectangles meet). Drawn per tile-edge on the union
      // boundary, thin so doorways don't look like tall walls.
      walls.fillStyle(wallCol, 0.9);
      const S = 3;
      const isB = (x: number, y: number) => inRects(building, x, y);
      for (let x = 0; x < GRID_W; x++) {
        for (let y = 0; y < GRID_H; y++) {
          if (!isB(x, y)) continue;
          const px = GX + x * TILE, py = GY + y * TILE;
          if (!isB(x, y - 1)) walls.fillRect(px - S, py - S, TILE + 2 * S, S); // top
          if (!isB(x, y + 1)) walls.fillRect(px - S, py + TILE, TILE + 2 * S, S); // bottom
          if (!isB(x - 1, y)) walls.fillRect(px - S, py, S, TILE); // left
          if (!isB(x + 1, y)) walls.fillRect(px + TILE, py, S, TILE); // right
        }
      }
      // Cut a doorway in the foundation at each wing's entrance (matches the
      // sim's wall collision — ghosts may only cross here).
      for (const e of buildingEntrances(building)) {
        const ix = GX + e.ix * TILE, iy = GY + e.iy * TILE;
        const horizontal = e.oy !== e.iy; // door on the top/bottom edge
        walls.fillStyle(0x2b3646, 1); // building-floor colour: reads as an opening
        walls.fillStyle(lighten(wallCol, 0.3), 1);
        if (e.ox < e.ix) { // left edge
          walls.fillStyle(0x2b3646, 1); walls.fillRect(ix - S, iy + 5, S, TILE - 10);
          walls.fillStyle(lighten(wallCol, 0.3), 1);
          walls.fillRect(ix - S, iy + 2, S + 3, 3); walls.fillRect(ix - S, iy + TILE - 5, S + 3, 3);
        } else if (e.ox > e.ix) { // right edge
          walls.fillStyle(0x2b3646, 1); walls.fillRect(ix + TILE, iy + 5, S, TILE - 10);
          walls.fillStyle(lighten(wallCol, 0.3), 1);
          walls.fillRect(ix + TILE - 3, iy + 2, S + 3, 3); walls.fillRect(ix + TILE - 3, iy + TILE - 5, S + 3, 3);
        } else if (horizontal && e.oy < e.iy) { // top edge
          walls.fillStyle(0x2b3646, 1); walls.fillRect(ix + 5, iy - S, TILE - 10, S);
          walls.fillStyle(lighten(wallCol, 0.3), 1);
          walls.fillRect(ix + 2, iy - S, 3, S + 3); walls.fillRect(ix + TILE - 5, iy - S, 3, S + 3);
        } else { // bottom edge
          walls.fillStyle(0x2b3646, 1); walls.fillRect(ix + 5, iy + TILE, TILE - 10, S);
          walls.fillStyle(lighten(wallCol, 0.3), 1);
          walls.fillRect(ix + 2, iy + TILE - 3, 3, S + 3); walls.fillRect(ix + TILE - 5, iy + TILE - 3, 3, S + 3);
        }
      }
    } else {
      // A frame around the office with an entrance gap on the left.
      walls.fillStyle(wallCol, 1);
      walls.fillRect(intX - T, GY - T, intW + 2 * T, T); // top
      walls.fillRect(GX + GW, GY - T, T, GH + 2 * T); // right
      walls.fillRect(intX - T, GY + GH, intW + 2 * T, T); // bottom
      const gapTop = ENTRANCE.y * TILE;
      walls.fillRect(intX - T, GY - T, T, gapTop + T);
      walls.fillRect(intX - T, GY + gapTop + TILE, T, GH - gapTop - TILE + T);
      walls.fillStyle(lighten(wallCol, 0.25), 1);
      walls.fillRect(intX - T, GY + gapTop - 3, T + 4, 3);
      walls.fillRect(intX - T, GY + gapTop + TILE, T + 4, 3);
    }
    this.world.add(walls);

    // Entrance marker: a little drifting ghost (menu-style) that shows where
    // incidents arrive, with an arrow into the building.
    const entGhost = this.add
      .image(GX + TILE / 2, GY + ENTRANCE.y * TILE + TILE / 2, 'ghost')
      .setDisplaySize(26, 24)
      .setTint(0x8fe6a8)
      .setAlpha(0.9)
      .setDepth(3);
    this.world.add(entGhost);
    this.tweens.add({
      targets: entGhost,
      y: entGhost.y - 5,
      alpha: 0.65,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const entArrow = this.add
      .text(intX - 3, GY + ENTRANCE.y * TILE + TILE / 2, '→', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: COLORS.ghostGreenCss,
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.world.add(entArrow);

    // Right panel background + mode tabs
    this.add
      .rectangle(PANEL_X - 4, GY - 4, PANEL_W + 8, GRID_H * TILE + 8, 0x10141b)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x2a3340)
      .setDepth(19);
    // Clip scrolling panel content to the area below the tab row.
    const maskTop = GY + 32;
    const maskShape = this.add.graphics().setVisible(false);
    maskShape.fillRect(PANEL_X - 4, maskTop, PANEL_W + 8, GY - 4 + GRID_H * TILE + 8 - maskTop);
    this.panel.setMask(maskShape.createGeometryMask());
    // Fixed scroll affordance, shown only when the active panel overflows.
    this.panelScrollHint = this.add
      .text(PANEL_X + PANEL_W - 2, GY - 4 + GRID_H * TILE - 2, '⇕ scroll for more', {
        fontFamily: FONT_FAMILY, fontSize: '10px', color: '#7ea0b8',
        backgroundColor: '#10141bcc', padding: { x: 4, y: 2 },
      })
      .setOrigin(1, 1).setDepth(22).setVisible(false);
    const tabs: { id: PanelMode; lbl: string }[] = [
      { id: 'info', lbl: 'Info' },
      { id: 'build', lbl: 'Build' },
      { id: 'hire', lbl: 'Hire' },
      { id: 'roster', lbl: 'Staff' },
    ];
    tabs.forEach((t, i) => {
      this.add.existing(
        button(this, PANEL_X + 38 + i * 74, GY + 14, t.lbl, () => {
          this.panelMode = t.id;
          this.buildDef = null;
          this.panelScroll = 0;
          this.rebuildPanel();
        }, { w: 68, h: 26, fontSize: '13px' }).setDepth(21),
      );
    });

    // Chatter bar
    this.chatterText = this.add
      .text(GX, GAME_HEIGHT - 24, '', { fontFamily: FONT_FAMILY, fontSize: '13px', color: '#6f7d8f' })
      .setDepth(30);
  }

  // ------------------------------------------------------------------- input

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => {
        if (this.buildDef) {
          this.buildDef = null;
          this.preview.clear();
          this.rebuildPanel();
        } else {
          this.toggleMenu();
        }
      });
      kb.on('keydown-SPACE', () => this.togglePause());
      kb.on('keydown-ONE', () => { this.speed = 1; this.paused = false; });
      kb.on('keydown-TWO', () => { this.speed = 2; this.paused = false; });
      // R rotates the door side of the room being placed.
      kb.on('keydown-R', () => { if (this.buildDef) this.buildRot = (this.buildRot + 1) % 4; });
    }

    // Mouse-wheel zoom over the play area, anchored on the cursor.
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.menuOverlay) return;
      // Over the right panel: scroll the (possibly overflowing) content instead.
      if (p.x >= PANEL_X - 8 && p.y > 64) {
        if (this.panelMaxScroll <= 0) return;
        this.panelScroll = Phaser.Math.Clamp(this.panelScroll + dy * 0.5, 0, this.panelMaxScroll);
        this.panel.y = GY - this.panelScroll;
        return;
      }
      if (p.x >= PANEL_X - 8 || p.y <= 64) return;
      const old = this.zoom;
      const next = Phaser.Math.Clamp(old * (dy > 0 ? 0.88 : 1.14), 1, 2.6);
      if (next === old) return;
      const lx = (p.x - this.world.x) / old;
      const ly = (p.y - this.world.y) / old;
      this.zoom = next;
      this.world.setScale(next);
      this.world.x = p.x - lx * next;
      this.world.y = p.y - ly * next;
      this.clampWorld();
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.menuOverlay || this.sim.outcome) return;
      // Right-button drag pans the play area; also cancels any pending build.
      if (p.rightButtonDown()) {
        if (p.x < PANEL_X - 8 && p.y > 64) {
          this.panning = true;
          this.panPointer = { x: p.x, y: p.y };
          this.panOrigin = { x: this.world.x, y: this.world.y };
        }
        this.buildDef = null;
        this.preview.clear();
        this.rebuildPanel();
        return;
      }
      const t = this.pointerTile(p);
      if (!t) return;
      if (this.buildDef) {
        this.dragStart = t;
        this.dragEnd = t;
      } else {
        const room = roomAt(this.sim.state.rooms, t.x, t.y);
        // Staff under cursor takes priority
        const st = this.staffAtPointer(p);
        if (st) {
          this.selectedStaff = st.id;
          this.panelMode = 'staff';
        } else if (room) {
          this.selectedRoom = room.id;
          this.panelMode = 'room';
        }
        this.rebuildPanel();
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.panning) {
        this.world.x = this.panOrigin.x + (p.x - this.panPointer.x);
        this.world.y = this.panOrigin.y + (p.y - this.panPointer.y);
        this.clampWorld();
        return;
      }
      if (this.buildDef && this.dragStart) {
        const t = this.pointerTile(p);
        if (t) this.dragEnd = t;
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button === 2 || this.panning) { this.panning = false; return; }
      if (this.buildDef && this.dragStart && this.dragEnd) {
        const r = this.dragRect();
        const err = this.sim.buildRoom(this.buildDef, r.x, r.y, r.w, r.h, this.buildRot);
        if (err) {
          this.toasts.push(`Cannot build: ${err}`, COLORS.danger);
        }
      }
      this.dragStart = null;
      this.dragEnd = null;
      this.preview.clear();
    });
  }

  /** Convert a screen pointer to a point in the (zoomed/panned) world space. */
  private toWorld(p: { x: number; y: number }): { x: number; y: number } {
    return { x: (p.x - this.world.x) / this.zoom, y: (p.y - this.world.y) / this.zoom };
  }

  private pointerTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.toWorld(p);
    const x = Math.floor((w.x - GX) / TILE);
    const y = Math.floor((w.y - GY) / TILE);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
    return { x, y };
  }

  private staffAtPointer(p: Phaser.Input.Pointer): StaffState | null {
    const w = this.toWorld(p);
    for (const st of this.sim.state.staff) {
      const sx = GX + st.x * TILE;
      const sy = GY + st.y * TILE;
      if (Math.hypot(w.x - sx, w.y - sy) < 14) return st;
    }
    return null;
  }

  /** Keep the grid filling the play area (no gaps) after a zoom/pan change. */
  private clampWorld(): void {
    const gw = GRID_W * TILE;
    const gh = GRID_H * TILE;
    this.world.x = Phaser.Math.Clamp(this.world.x, (GX + gw) * (1 - this.zoom), GX * (1 - this.zoom));
    this.world.y = Phaser.Math.Clamp(this.world.y, (GY + gh) * (1 - this.zoom), GY * (1 - this.zoom));
  }

  private dragRect(): { x: number; y: number; w: number; h: number } {
    const a = this.dragStart!;
    const b = this.dragEnd!;
    const def = ROOM_BY_ID[this.buildDef!];
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.max(Math.abs(a.x - b.x) + 1, def.minW);
    const h = Math.max(Math.abs(a.y - b.y) + 1, def.minH);
    return { x, y, w, h };
  }

  private togglePause(): void {
    this.paused = !this.paused;
  }

  private action(err: string | null): void {
    if (err) this.toasts.push(err, COLORS.danger);
    this.rebuildPanel();
  }

  // -------------------------------------------------------------------- menu

  private toggleMenu(): void {
    if (this.menuOverlay) {
      this.menuOverlay.destroy();
      this.menuOverlay = null;
      return;
    }
    const c = this.add.container(0, 0).setDepth(2000);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0, 0)
      .setInteractive()); // block clicks behind
    const cx = GAME_WIDTH / 2;
    c.add(label(this, cx, 200, 'PAUSED', '32px', COLORS.ghostGreenCss).setOrigin(0.5));
    c.add(button(this, cx, 280, 'Resume', () => this.toggleMenu(), { w: 260, h: 44, fontSize: '18px' }));
    c.add(button(this, cx, 340, 'Save game', () => {
      const ok = saveGame(this.sim, 'manual');
      this.toasts.push(ok ? 'Game saved.' : 'Save failed (storage unavailable).', ok ? COLORS.ghostGreenCss : COLORS.danger);
      this.toggleMenu();
    }, { w: 260, h: 44, fontSize: '18px' }));
    c.add(button(this, cx, 400, 'Save & exit to menu', () => {
      saveGame(this.sim, 'manual');
      this.scene.start('MainMenu');
    }, { w: 260, h: 44, fontSize: '18px' }));
    c.add(button(this, cx, 460, 'Exit without saving', () => this.scene.start('MainMenu'), { w: 260, h: 44, fontSize: '18px' }));
    this.menuOverlay = c;
  }

  // ------------------------------------------------------------------ update

  update(_time: number, deltaMs: number): void {
    if (!this.sim) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (!this.paused && !this.menuOverlay && !this.sim.outcome) {
      this.sim.tick(dt * this.speed);
    }

    // Drain sim events into toasts (and a matching sound cue).
    for (const ev of this.sim.events) {
      const color =
        ev.kind === 'good' ? COLORS.ghostGreenCss :
        ev.kind === 'bad' ? COLORS.danger :
        ev.kind === 'disaster' ? '#ffb347' : '#9db4c8';
      this.toasts.push(ev.msg, color);
      if (ev.kind === 'good') Sound.resolve();
      else if (ev.kind === 'bad') Sound.fail();
      else if (ev.kind === 'disaster') Sound.disaster();
    }
    this.sim.events.length = 0;

    // Autosave + chime on day change
    if (this.sim.state.day !== this.lastDay) {
      this.lastDay = this.sim.state.day;
      Sound.day();
      if (this.settings.autosave && !this.sim.outcome) saveGame(this.sim, 'auto');
    }

    this.syncRooms();
    this.syncIncidents(dt);
    this.syncStaff(dt);
    this.updateThoughts(dt);
    this.world.sort('depth'); // keep floor < rooms < ghosts < staff < preview
    this.updateHud();
    this.updateBuildPreview();
    this.updateDisasterChips();
    this.updateHint();
    this.updateChatter(dt);

    // Periodic refresh for live values, but never rebuild under the cursor —
    // destroying a button mid-click would swallow the input.
    this.panelTimer -= dt;
    if (this.panelTimer <= 0 && this.input.activePointer.x < PANEL_X - 8) {
      this.panelTimer = 0.8;
      this.rebuildPanel();
    }

    if (this.sim.outcome) {
      const o = this.sim.outcome;
      const sc = this.sim.state.scenario;
      if (o.won && !sc.sandbox) recordResult(sc.id, o.stars);
      clearSaves();
      this.scene.start('End', { outcome: o, scenarioId: sc.id, sandbox: !!sc.sandbox });
    }
  }

  // -------------------------------------------------------------- rendering

  private syncRooms(): void {
    const sig = this.sim.state.rooms.map((r) => `${r.id}:${r.level}:${r.door.x},${r.door.y}`).join(',');
    if (sig !== this.roomsSignature) {
      this.roomsSignature = sig;
      this.roomLayer.removeAll(true);
      this.roomVisuals.clear();
      for (const room of this.sim.state.rooms) {
        const def = ROOM_BY_ID[room.def];
        const cx = GX + (room.x + room.w / 2) * TILE;
        const px = GX + room.x * TILE + 1;
        const py = GY + room.y * TILE + 1;
        const pw = room.w * TILE - 2;
        const ph = room.h * TILE - 2;
        // A top-down room floor-plan fills the whole footprint when supplied;
        // staff and ghosts (higher depth) walk on top of it. Otherwise the
        // room is a plain tinted box.
        const planKey = `roomplan_${room.def}`;
        const hasPlan = this.textures.exists(planKey);
        // Dark base panel (bottom of the stack) so the room reads as a distinct
        // dark space against the lit office floor.
        const base = this.add
          .rectangle(px, py, pw, ph, 0x0b0f16, 0.92)
          .setOrigin(0, 0);
        // Contain-fit the plan (no stretching) so it reads at any room size.
        let plan: Phaser.GameObjects.Image | null = null;
        let tint: Phaser.GameObjects.Rectangle | null = null;
        if (hasPlan) {
          plan = this.add.image(px + pw / 2, py + ph / 2, planKey);
          const scale = Math.min(pw / plan.width, ph / plan.height);
          plan.setScale(scale);
          // Rotate the interior so it "faces" the door side — a visual cue of
          // the room's orientation.
          plan.setAngle(doorSideOf(room) * 90);
        } else {
          tint = this.add.rectangle(px, py, pw, ph, def.color, 0.5).setOrigin(0, 0);
        }
        const border = this.add
          .rectangle(px, py, pw, ph, 0x000000, 0)
          .setOrigin(0, 0)
          .setStrokeStyle(3, lighten(def.color, 0.6), 1);
        // Label pinned to the bottom edge so it never hides furniture/staff.
        const nameY = GY + (room.y + room.h) * TILE - 11;
        const name = this.add
          .text(cx, nameY, `${def.short}${room.level > 1 ? ' ★'.repeat(room.level - 1) : ''}`, {
            fontFamily: FONT_FAMILY, fontSize: '13px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
          })
          .setOrigin(0.5);
        const status = this.add
          .text(cx, GY + room.y * TILE + 10, '', {
            fontFamily: FONT_FAMILY, fontSize: '11px', color: '#ffd7d7',
            stroke: '#000000', strokeThickness: 4,
          })
          .setOrigin(0.5);
        const parts: Phaser.GameObjects.GameObject[] = [base];
        if (plan) parts.push(plan);
        if (tint) parts.push(tint);
        parts.push(border, ...this.makeDoorway(room, def.color), name, status);
        this.roomLayer.add(parts);
        this.roomVisuals.set(room.id, { border, fill: plan ?? tint ?? base, isPlan: hasPlan, status });
      }
    }
    // Per-frame status refresh
    for (const room of this.sim.state.rooms) {
      const vis = this.roomVisuals.get(room.id);
      if (!vis) continue;
      const flags: string[] = [];
      if (room.broken) flags.push('BROKEN');
      if (room.possessed) flags.push('POSSESSED');
      if (!room.broken && !room.possessed && room.condition < 30) flags.push('worn');
      vis.status.setText(flags.join(' '));
      const def = ROOM_BY_ID[room.def];
      const selected = this.selectedRoom === room.id && this.panelMode === 'room';
      const dim = room.broken || room.possessed;
      // Rooms needing attention pulse amber/red so the player's eye is drawn.
      const needsHelp = room.broken || room.possessed ||
        (ROOM_BY_ID[room.def].service && room.queue.length >= this.sim.queueCap(room));
      const borderCol = selected ? 0xffffff
        : needsHelp ? (Math.sin(this.time.now / 180) > 0 ? 0xff5a5a : 0xffb040)
        : lighten(def.color, 0.55);
      vis.border.setStrokeStyle(selected || needsHelp ? 4 : 3, borderCol, 1);
      if (vis.isPlan) {
        (vis.fill as Phaser.GameObjects.Image).setTint(dim ? 0x777777 : 0xffffff);
      } else {
        (vis.fill as Phaser.GameObjects.Rectangle).setFillStyle(def.color, dim ? 0.25 : 0.5);
      }
    }
  }

  /** A clean doorway: a gap cut in the wall, two posts, and a floor threshold. */
  private makeDoorway(r: RoomState, color: number): Phaser.GameObjects.GameObject[] {
    const out = doorOutside(r);
    const dirx = out.x - r.door.x;
    const diry = out.y - r.door.y;
    const horiz = diry !== 0; // door on top/bottom edge -> opening runs horizontally
    const ex = GX + (r.door.x + 0.5 + dirx * 0.5) * TILE;
    const ey = GY + (r.door.y + 0.5 + diry * 0.5) * TILE;
    const along = TILE * 0.62;
    const objs: Phaser.GameObjects.GameObject[] = [];
    // Cut the wall: cover the border segment with the corridor colour.
    objs.push(this.add.rectangle(ex, ey, horiz ? along : 6, horiz ? 6 : along, 0x0e1218).setOrigin(0.5));
    // Posts either side of the opening.
    if (horiz) {
      objs.push(this.add.rectangle(ex - along / 2, ey, 3, 8, color).setOrigin(0.5));
      objs.push(this.add.rectangle(ex + along / 2, ey, 3, 8, color).setOrigin(0.5));
    } else {
      objs.push(this.add.rectangle(ex, ey - along / 2, 8, 3, color).setOrigin(0.5));
      objs.push(this.add.rectangle(ex, ey + along / 2, 8, 3, color).setOrigin(0.5));
    }
    // Threshold mat just inside the door tile.
    objs.push(
      this.add
        .rectangle(GX + (r.door.x + 0.5) * TILE, GY + (r.door.y + 0.5) * TILE, TILE * 0.5, TILE * 0.5, 0x1a2230, 0.5)
        .setStrokeStyle(1, color, 0.7),
    );
    return objs;
  }

  /**
   * A queue "lane" of corridor tiles snaking outward from a room's door — so
   * queued ghosts line up on the floor and never overlap neighbouring rooms.
   * Cached per frame (queues are short and rebuilt each render pass).
   */
  private queueLane(room: RoomState): { x: number; y: number }[] {
    const cached = this.queueLaneCache.get(room.id);
    if (cached) return cached;
    const rooms = this.sim.state.rooms;
    const cap = this.sim.queueCap(room) + 1;
    const walkable = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && !roomAt(rooms, x, y);
    const out = doorOutside(room);
    const key = (x: number, y: number) => `${x},${y}`;
    const used = new Set<string>([key(out.x, out.y)]);
    const lane: { x: number; y: number }[] = [out];
    let cur = out;
    let dir = { x: out.x - room.door.x, y: out.y - room.door.y };
    while (lane.length < cap) {
      // Prefer continuing straight, then turning (keeps a tidy line, bends around rooms).
      const turns = [dir, { x: -dir.y, y: dir.x }, { x: dir.y, y: -dir.x }];
      let moved = false;
      for (const d of turns) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        if (walkable(nx, ny) && !used.has(key(nx, ny))) {
          cur = { x: nx, y: ny };
          dir = d;
          lane.push(cur);
          used.add(key(nx, ny));
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }
    this.queueLaneCache.set(room.id, lane);
    return lane;
  }

  private incidentTargetPos(inc: IncidentState): { x: number; y: number } {
    if (inc.phase === 'queued' && inc.target !== null) {
      const room = this.sim.room(inc.target);
      if (room) {
        const idx = Math.max(0, room.queue.indexOf(inc.id));
        const lane = this.queueLane(room);
        const p = lane[Math.min(idx, lane.length - 1)];
        return { x: p.x + 0.5, y: p.y + 0.5 };
      }
    }
    if (inc.phase === 'inService' && inc.target !== null) {
      const room = this.sim.room(inc.target);
      if (room) return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
    }
    return { x: inc.x, y: inc.y };
  }

  private syncIncidents(dt: number): void {
    this.queueLaneCache.clear();
    const seen = new Set<number>();
    for (const inc of this.sim.state.incidents) {
      seen.add(inc.id);
      let spr = this.incidentSprites.get(inc.id);
      if (!spr) {
        spr = this.add
          .image(GX + inc.x * TILE, GY + inc.y * TILE, 'ghost')
          .setDepth(5)
          .setInteractive({ useHandCursor: true });
        spr.on('pointerover', () => this.showIncidentTooltip(inc.id));
        spr.on('pointerout', () => this.tooltip.setVisible(false));
        this.world.add(spr);
        this.incidentSprites.set(inc.id, spr);
        if (!this.paused) Sound.spawn();
      }
      const def = INCIDENT_BY_ID[inc.def];
      // Use a per-category ghost sprite if one was supplied, else tint the
      // procedural fallback by category colour.
      const gkey = `ghost_${def.category}`;
      const custom = this.textures.exists(gkey);
      const wantKey = custom ? gkey : 'ghost';
      if (spr.texture.key !== wantKey) spr.setTexture(wantKey);
      spr.setTint(custom ? 0xffffff : (CATEGORY_COLORS[def.category] ?? 0xffffff));
      const size = (custom ? 34 : 26) + inc.severity * 5;
      spr.setDisplaySize(size, size);
      const pos = this.incidentTargetPos(inc);
      let tx = GX + pos.x * TILE;
      let ty = GY + pos.y * TILE;
      // While entering a room for service, head to the doorway first so the
      // ghost passes through the door rather than clipping a wall.
      if (inc.phase === 'inService' && inc.target !== null) {
        const room = this.sim.room(inc.target);
        if (room) {
          const insideX = spr.x > GX + room.x * TILE && spr.x < GX + (room.x + room.w) * TILE;
          const insideY = spr.y > GY + room.y * TILE && spr.y < GY + (room.y + room.h) * TILE;
          if (!(insideX && insideY)) {
            tx = GX + (room.door.x + 0.5) * TILE;
            ty = GY + (room.door.y + 0.5) * TILE;
          }
        }
      }
      const f = Math.min(1, dt * 8);
      spr.x += (tx - spr.x) * f;
      spr.y += (ty - spr.y) * f;
      const frac = inc.patience / inc.maxPatience;
      spr.setAlpha(frac < 0.3 ? 0.5 + 0.4 * Math.sin(this.time.now / 90) : 0.9);
    }
    for (const [id, spr] of this.incidentSprites) {
      if (!seen.has(id)) {
        spr.destroy();
        this.incidentSprites.delete(id);
      }
    }
  }

  private syncStaff(dt: number): void {
    const seen = new Set<number>();
    for (const st of this.sim.state.staff) {
      seen.add(st.id);
      let dot = this.staffSprites.get(st.id);
      if (!dot) {
        const rkey = `staff_${st.role}`;
        if (this.textures.exists(rkey)) {
          dot = this.add.image(GX + st.x * TILE, GY + st.y * TILE, rkey)
            .setDepth(6)
            .setInteractive({ useHandCursor: true });
          dot.setDisplaySize(30, 30);
        } else {
          dot = this.add.circle(GX + st.x * TILE, GY + st.y * TILE, 9, ROLE_BY_ID[st.role].color)
            .setStrokeStyle(2, 0xffffff, 0.8)
            .setDepth(6)
            .setInteractive({ useHandCursor: true });
        }
        dot.on('pointerover', () => this.showStaffTooltip(st.id));
        dot.on('pointerout', () => this.tooltip.setVisible(false));
        this.world.add(dot);
        this.staffSprites.set(st.id, dot);
      }
      const tx = GX + st.x * TILE;
      const ty = GY + st.y * TILE;
      const f = Math.min(1, dt * 10);
      dot.x += (tx - dot.x) * f;
      dot.y += (ty - dot.y) * f;
      dot.setAlpha(st.activity === 'break' ? 0.6 : 1);
      if (dot instanceof Phaser.GameObjects.Arc) {
        dot.setStrokeStyle(2, st.energy < 25 ? 0xff6666 : 0xffffff, 0.9);
      } else {
        dot.setTint(st.energy < 25 ? 0xffbbbb : 0xffffff);
      }
    }
    for (const [id, dot] of this.staffSprites) {
      if (!seen.has(id)) {
        dot.destroy();
        this.staffSprites.delete(id);
      }
    }
  }

  private showIncidentTooltip(id: number): void {
    const inc = this.sim.incidentById(id);
    if (!inc) return;
    const def = INCIDENT_BY_ID[inc.def];
    const chain = inc.chain.map((c) => ROOM_BY_ID[c]?.short ?? c).join(' → ');
    this.tooltip
      .setText(
        `"${inc.title}"\n${def.name} — severity ${inc.severity}${inc.haunt ? ` — haunt ${'👻'.repeat(inc.haunt)}` : ''}\n` +
        `Patience ${Math.max(0, Math.round((inc.patience / inc.maxPatience) * 100))}%  Bounty ~$${inc.bounty}\nNeeds: ${chain || 'leaving'}`,
      )
      .setPosition(Math.min(this.input.activePointer.x + 14, GAME_WIDTH - 340), this.input.activePointer.y + 10)
      .setVisible(true);
  }

  private showStaffTooltip(id: number): void {
    const st = this.sim.staffById(id);
    if (!st) return;
    const role = ROLE_BY_ID[st.role];
    this.tooltip
      .setText(
        `${st.name}\n${role.name} — skill ${st.skill.toFixed(1)}\n` +
        `Energy ${Math.round(st.energy)}  Morale ${Math.round(st.morale)}  $${st.salary}/day\n` +
        `Quirk: ${st.quirk}\nNow: ${st.activity}`,
      )
      .setPosition(Math.min(this.input.activePointer.x + 14, GAME_WIDTH - 340), this.input.activePointer.y + 10)
      .setVisible(true);
  }

  private updateHud(): void {
    const s = this.sim.state;
    const h = this.hudTexts;
    h.money.setText(`$${Math.round(s.money)}`).setColor(s.money < 0 ? COLORS.danger : '#e8d97e');
    h.trust.setText(`${Math.round(s.trust)}`).setColor(s.trust < 25 ? COLORS.danger : COLORS.textPrimary);
    h.debt.setText(`${Math.round(s.debt)}`).setColor(s.debt > 75 ? COLORS.danger : COLORS.textPrimary);
    const stab = Math.round(this.sim.stability());
    h.stability.setText(`${stab}`).setColor(stab < 30 ? COLORS.danger : COLORS.textPrimary);
    const noReactor = s.staff.length > 0 && !s.rooms.some((r) => r.def === 'coffee_reactor');
    const coffeeCrit = s.staff.length > 0 && (s.coffee === 0 || noReactor);
    h.coffee
      .setText(noReactor ? 'no reactor!' : `${s.coffee}/${this.sim.coffeeCap()}`)
      .setColor(coffeeCrit ? COLORS.danger : COLORS.textPrimary)
      .setAlpha(coffeeCrit ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 260)) : 1);
    h.beans.setText(`${s.beans}`).setColor(s.beans === 0 ? '#c99' : COLORS.textPrimary);
    h.morale.setText(`${Math.round(this.sim.avgMorale())}`);
    const hour = Math.floor(s.timeOfDay * 24);
    const min = Math.floor((s.timeOfDay * 24 - hour) * 60);
    h.clock.setText(`Day ${s.day}  ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    h.speedLabel.setText(this.paused ? 'PAUSED' : `${this.speed}× speed`);

    // Playback button state
    (this.pauseBtn.list[1] as Phaser.GameObjects.Text).setText(this.paused ? '▶ Play' : '❚❚ Pause');
    const hi = (btn: Phaser.GameObjects.Container, on: boolean) => {
      (btn.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(on ? 0x24463a : COLORS.panel);
      (btn.list[1] as Phaser.GameObjects.Text).setColor(on ? COLORS.ghostGreenCss : COLORS.textPrimary);
    };
    hi(this.speed1Btn, !this.paused && this.speed === 1);
    hi(this.speed2Btn, !this.paused && this.speed === 2);

    // Objectives box: scenario name as the header, one line per goal with a
    // clear done/pending marker and live progress.
    const lines = this.sim.objectiveLines();
    this.objectivesTitle.setText(s.scenario.name.toUpperCase());
    if (lines.length > 0) {
      const done = lines.filter((l) => l.done).length;
      const body = lines
        .map((l) => `${l.done ? '✔' : '○'} ${l.label}   ${l.progress}`)
        .join('\n');
      this.objectivesText.setText(`${body}\n\nCompleted ${done}/${lines.length} objectives`);
    } else {
      this.objectivesText.setText('Sandbox — no objectives.\nBuild, hire, survive, enjoy the haunting.');
    }
    this.objectivesBg.setSize(
      Math.max(360, this.objectivesText.width + 20),
      this.objectivesText.height + 34,
    );

    // Low-stability glitch: jitter the HUD clock, diegetic warning
    if (stab < 25 && Math.random() < 0.1) {
      h.clock.setX(588 + Math.random() * 4);
    } else {
      h.clock.setX(590);
    }
  }

  // ----------------------------------------------------------- thought bubbles

  private updateThoughts(dt: number): void {
    // Reposition & expire live bubbles (they follow their entity's head).
    for (let i = this.thoughts.length - 1; i >= 0; i--) {
      const t = this.thoughts[i];
      const spr = t.target;
      if (!spr.active) { t.c.destroy(); this.thoughts.splice(i, 1); continue; }
      t.c.setPosition(spr.x, spr.y - spr.displayHeight * 0.55);
      t.ttl -= dt;
      if (t.ttl < 0.6) t.c.setAlpha(Math.max(0, t.ttl / 0.6));
      if (t.ttl <= 0) { t.c.destroy(); this.thoughts.splice(i, 1); }
    }
    // Spawn on a relaxed cadence, capped so it never gets busy.
    this.thoughtTimer -= dt;
    if (this.thoughtTimer <= 0) {
      this.thoughtTimer = Phaser.Math.FloatBetween(3.5, 6);
      if (this.thoughts.length < 3 && !this.paused) this.maybeSpawnThought();
    }
  }

  /** Prefer a staff↔ghost conversation when one is being served; else a solo thought. */
  private maybeSpawnThought(): void {
    const room = this.sim.state.rooms.find(
      (r) => r.serving !== null && this.sim.presentStaff(r).length > 0,
    );
    if (room && room.serving && Math.random() < 0.65) {
      const ghost = this.incidentSprites.get(room.serving.incident);
      const st = this.sim.presentStaff(room)[0];
      const staffSpr = st ? this.staffSprites.get(st.id) : undefined;
      if (ghost && staffSpr) { this.startConversation(staffSpr, ghost); return; }
    }
    this.spawnThought();
  }

  private startConversation(
    staffSpr: Phaser.GameObjects.Image | Phaser.GameObjects.Arc,
    ghostSpr: Phaser.GameObjects.Image,
  ): void {
    const convo = Phaser.Utils.Array.GetRandom(CONVERSATIONS);
    convo.forEach((lineObj, i) => {
      this.time.delayedCall(i * 1750, () => {
        const spr = lineObj.who === 'staff' ? staffSpr : ghostSpr;
        if (spr && spr.active) {
          this.showBubble(spr, lineObj.text, lineObj.who === 'staff' ? 0xffe6a0 : 0xbfe8ff, 1.9);
        }
      });
    });
    // Hold off random thoughts until the exchange finishes.
    this.thoughtTimer = convo.length * 1.75 + 1.5;
  }

  private spawnThought(): void {
    const useStaff = this.sim.state.staff.length > 0 && Math.random() < 0.5;
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Arc | undefined;
    let msg: string | undefined;
    let accent = 0xbfe8ff;

    if (useStaff) {
      const st = Phaser.Utils.Array.GetRandom(this.sim.state.staff) as StaffState;
      sprite = this.staffSprites.get(st.id);
      const bucket = st.energy < 25 ? 'tired'
        : st.morale < 45 ? 'grumpy'
        : st.activity === 'break' ? 'break'
        : (st.activity === 'working' || st.activity === 'training') ? 'working'
        : 'generic';
      msg = Phaser.Utils.Array.GetRandom(STAFF_THOUGHTS[bucket]);
      accent = 0xffe6a0;
    } else if (this.sim.state.incidents.length > 0) {
      const inc = Phaser.Utils.Array.GetRandom(this.sim.state.incidents) as IncidentState;
      sprite = this.incidentSprites.get(inc.id);
      const bucket = inc.escalations > 0 ? 'escalating'
        : inc.phase === 'stuck' ? 'stuck'
        : inc.phase === 'queued' ? 'queued'
        : 'generic';
      msg = Phaser.Utils.Array.GetRandom(GHOST_THOUGHTS[bucket]);
    }
    if (sprite && msg) this.showBubble(sprite, msg, accent, 3.6);
  }

  /** Render a thought/speech bubble above a sprite, tracked so it can follow & fade. */
  private showBubble(
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Arc,
    msg: string, accent: number, ttl: number,
  ): void {
    if (this.thoughts.length >= 3) return;
    const txt = this.add.text(0, 0, msg, {
      fontFamily: FONT_FAMILY, fontSize: '11px', color: '#e6f0f5',
      align: 'center', wordWrap: { width: 150 },
    }).setOrigin(0.5, 0.5);
    const w = Math.ceil(txt.width) + 14;
    const h = Math.ceil(txt.height) + 10;
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0c1119, 0.94);
    gfx.lineStyle(1.5, accent, 0.85);
    gfx.fillRoundedRect(-w / 2, -h - 7, w, h, 5);
    gfx.strokeRoundedRect(-w / 2, -h - 7, w, h, 5);
    gfx.fillStyle(0x0c1119, 0.94);
    gfx.fillTriangle(-5, -8, 5, -8, 0, 0);
    txt.setPosition(0, -7 - h / 2);
    const c = this.add.container(sprite.x, sprite.y - sprite.displayHeight * 0.55, [gfx, txt]).setDepth(8);
    this.world.add(c);
    this.thoughts.push({ c, target: sprite, ttl });
  }

  private showObjectives(show: boolean): void {
    this.objectivesBg.setVisible(show);
    this.objectivesTitle.setVisible(show);
    this.objectivesText.setVisible(show);
  }

  /** Popover for a Build-menu tile: name, price, size and description. */
  private showBuildTip(def: RoomDef, tileY: number): void {
    const staff = def.roles.length > 0
      ? `\nStaffed by: ${def.roles.map((r) => ROLE_BY_ID[r].name).join(', ')}`
      : '';
    this.tooltip
      .setText(`${def.name}\n$${def.cost}  ·  min ${def.minW}×${def.minH}\n${def.desc}${staff}`)
      .setPosition(PANEL_X - 332, Math.min(GY + tileY, GAME_HEIGHT - 130))
      .setVisible(true);
  }

  private updateBuildPreview(): void {
    this.preview.clear();
    this.buildHint.setVisible(false);
    if (!this.buildDef) return;
    const def = ROOM_BY_ID[this.buildDef];
    let rect: { x: number; y: number; w: number; h: number } | null = null;
    if (this.dragStart && this.dragEnd) {
      rect = this.dragRect();
    } else {
      const p = this.input.activePointer;
      const t = this.pointerTile(p);
      if (t) rect = { x: t.x, y: t.y, w: def.minW, h: def.minH };
    }
    if (!rect) return;
    // Full validation (bounds, overlap, door, and door reachability) so the
    // preview shows red — with a reason — if the room would be walled off.
    const reason = this.sim.canPlace(def.id, rect.x, rect.y, rect.w, rect.h, this.buildRot);
    const affordable = this.sim.state.money >= def.cost;
    const valid = affordable && !reason;
    const col = valid ? 0x44cc66 : 0xcc4444;
    const rx = GX + rect.x * TILE;
    const ry = GY + rect.y * TILE;
    const rw = rect.w * TILE;
    const rh = rect.h * TILE;
    this.preview.fillStyle(col, 0.3);
    this.preview.fillRect(rx, ry, rw, rh);
    this.preview.lineStyle(2, col, 1);
    this.preview.strokeRect(rx, ry, rw, rh);
    // Door indicator on the preferred (rotated) side.
    this.preview.fillStyle(0xffe27a, 0.9);
    const dw = TILE * 0.55;
    if (this.buildRot === 0) this.preview.fillRect(rx + rw / 2 - dw / 2, ry + rh - 4, dw, 6);
    else if (this.buildRot === 1) this.preview.fillRect(rx - 2, ry + rh / 2 - dw / 2, 6, dw);
    else if (this.buildRot === 2) this.preview.fillRect(rx + rw / 2 - dw / 2, ry - 2, dw, 6);
    else this.preview.fillRect(rx + rw - 4, ry + rh / 2 - dw / 2, 6, dw);
    const hint = !affordable ? 'Not enough money' : reason;
    if (hint) {
      this.buildHint
        .setText(hint)
        .setPosition(GX + rect.x * TILE, GY + rect.y * TILE - 20)
        .setVisible(true);
    } else {
      this.buildHint.setVisible(false);
    }
  }

  private updateDisasterChips(): void {
    this.disasterChips.removeAll(true);
    this.sim.state.disasters.forEach((d, i) => {
      const def = DISASTER_BY_ID[d.def];
      const secs = Math.ceil(d.remaining);
      const lbl = def.fixCost > 0
        ? `⚡ ${def.name} · ${secs}s · click: pay $${def.fixCost}`
        : `⚡ ${def.name} · ${secs}s · passes on its own`;
      const b = button(this, 175, i * 32, lbl, () => {
        if (def.fixCost > 0) this.action(this.sim.endDisaster(i));
      }, { w: 350, h: 28, fontSize: '12px', color: '#ffb347' });
      this.disasterChips.add(b);
    });
  }

  /** Surface the single most useful next action, so play never feels opaque. */
  private updateHint(): void {
    const s = this.sim.state;
    let msg = '';
    if (s.rooms.length === 0) {
      msg = '▸ Open the Build tab and place a Ticket Triage Desk — every ghost checks in there first.';
    } else if (!s.rooms.some((r) => r.def === 'triage')) {
      msg = '▸ Build a Ticket Triage Desk (Build tab) — tickets can\'t be handled without it.';
    } else {
      const broken = s.rooms.find((r) => r.broken);
      const disaster = s.disasters.find((d) => DISASTER_BY_ID[d.def].fixCost > 0);
      const noRoom = s.incidents.find((i) => i.phase === 'stuck' && !s.rooms.some((r) => r.def === i.chain[0]));
      const unstaffed = s.rooms.find(
        (r) => ROOM_BY_ID[r.def].service && r.queue.length > 0 && this.sim.presentStaff(r).length === 0,
      );
      const noReactor = s.staff.length > 0 && !s.rooms.some((r) => r.def === 'coffee_reactor');
      const tired = s.staff.some((st) => st.energy < 25);
      if (broken) msg = `▸ ${ROOM_BY_ID[broken.def].name} broke down — click it and press Repair.`;
      else if (disaster) msg = '▸ A disaster is active — click the ⚡ chip to pay it off, or wait it out.';
      else if (noRoom) msg = `▸ A ${INCIDENT_BY_ID[noRoom.def].name} has nowhere to go — build a ${ROOM_BY_ID[noRoom.chain[0]]?.name ?? 'matching room'}.`;
      else if (unstaffed) msg = `▸ ${ROOM_BY_ID[unstaffed.def].name} has a queue but no staff — click it and assign someone.`;
      else if (noReactor) msg = '⚠ No Coffee Reactor — build one so staff can recharge on breaks, or they burn out.';
      else if (s.coffee === 0 && (tired || s.staff.length > 0)) msg = '⚠ Coffee is out — buy ＋Beans (top bar); the reactor brews them so tired staff recover.';
      else if (tired && s.beans === 0) msg = '▸ Staff are low on energy and beans are empty — buy ＋Beans to keep coffee flowing.';
      else if (s.staff.length === 0) msg = '▸ Hire someone (Hire tab), then click a room to put them to work.';
    }
    this.hintText.setText(msg).setVisible(!!msg);
  }

  private updateChatter(dt: number): void {
    this.chatterTimer -= dt;
    if (this.chatterTimer <= 0) {
      this.chatterTimer = 14;
      if (this.settings.chatter) {
        const line = OFFICE_CHATTER[Math.floor(Math.random() * OFFICE_CHATTER.length)];
        this.chatterText.setText(`📟 ${line}`);
      } else {
        this.chatterText.setText('');
      }
    }
  }

  // ------------------------------------------------------------------ panels

  private rebuildPanel(): void {
    if (!this.panel) return;
    this.panel.removeAll(true);
    const add = (obj: Phaser.GameObjects.GameObject) => this.panel.add(obj);
    const W = PANEL_W;
    let y = 36;

    const title = (t: string) => {
      add(label(this, 8, y, t, '16px', COLORS.ghostGreenCss));
      y += 26;
    };
    const line = (
      t: string, color: string = COLORS.textPrimary, size = '13px',
      x = 8, wrapW = W - 16,
    ) => {
      const l = label(this, x, y, t, size, color);
      l.setWordWrapWidth(wrapW);
      add(l);
      y += l.height + 4;
    };
    const btn = (t: string, cb: () => void, enabled = true, color?: string) => {
      add(button(this, W / 2, y + 15, t, cb, { w: W - 20, h: 28, fontSize: '13px', enabled, color }));
      y += 34;
    };
    // Draws a room/staff icon at (x, cy) if the custom art exists.
    const icon = (key: string, cy: number, size = 22, x = 22) => {
      if (this.textures.exists(key)) {
        add(this.add.image(x, cy, key).setDisplaySize(size, size));
      }
    };

    switch (this.panelMode) {
      case 'info': {
        title(this.sim.state.scenario.name);
        line(this.sim.state.scenario.desc, COLORS.textDim);
        y += 6;
        line('How to play:', COLORS.ghostGreenCss);
        line('• Build a Ticket Triage Desk first — every incident goes there before treatment.', COLORS.textDim);
        line('• Build treatment rooms, hire matching staff (Hire tab), click a room to assign them.', COLORS.textDim);
        line('• Keep coffee stocked, debt low, and clients happy.', COLORS.textDim);
        line('• Hover ghosts and staff for details.', COLORS.textDim);
        break;
      }
      case 'build': {
        if (this.buildDef) {
          const def = ROOM_BY_ID[this.buildDef];
          title(`Place: ${def.name}`);
          if (this.textures.exists(`room_${def.id}`)) {
            add(this.add.image(W / 2, y + 34, `room_${def.id}`).setDisplaySize(64, 64));
            y += 72;
          }
          line(`$${def.cost}   ·   min ${def.minW}×${def.minH}`, '#e8d97e', '14px');
          line(def.desc, COLORS.textDim, '12px');
          line('Drag on the office floor to place it.', '#9db4c8', '12px');
          line('Press R to rotate the door (yellow marker). Right-click / Esc to cancel.', '#9db4c8', '12px');
          btn('Cancel', () => { this.buildDef = null; this.rebuildPanel(); });
        } else {
          title('Build a room');
          line('Pick a room, then drag on the floor to place it. Hover for details.', COLORS.textDim, '12px');
          const cols = 4;
          const pad = 6;
          const tileW = Math.floor((W - pad * (cols + 1)) / cols);
          const tileH = tileW - 4;
          const tile = (def: RoomDef, tx: number, ty: number): void => {
            const afford = this.sim.state.money >= def.cost;
            const bg = this.add
              .rectangle(tx, ty, tileW, tileH, COLORS.panel, 0.92)
              .setOrigin(0, 0)
              .setStrokeStyle(1, afford ? COLORS.ghostGreen : 0x44505f, afford ? 0.8 : 0.4);
            add(bg);
            if (this.textures.exists(`room_${def.id}`)) {
              const img = this.add
                .image(tx + tileW / 2, ty + tileH / 2 - 4, `room_${def.id}`)
                .setDisplaySize(tileW - 14, tileW - 14);
              if (!afford) img.setAlpha(0.4);
              add(img);
            } else {
              // Procedural placeholder until custom art ships: a coloured chip + short name.
              const chip = this.add.rectangle(tx + tileW / 2, ty + tileH / 2 - 6, tileW - 18, tileH - 22, def.color, 0.85);
              if (!afford) chip.setAlpha(0.4);
              add(chip);
              add(this.add.text(tx + tileW / 2, ty + tileH / 2 - 6, def.short, {
                fontFamily: FONT_FAMILY, fontSize: '9px', color: '#0b0f16', fontStyle: 'bold',
              }).setOrigin(0.5));
            }
            const badge = this.add
              .text(tx + tileW - 3, ty + tileH - 2, `$${def.cost}`, {
                fontFamily: FONT_FAMILY, fontSize: '10px',
                color: afford ? '#e8d97e' : '#a08', backgroundColor: '#0b0f16dd', padding: { x: 3, y: 1 },
              })
              .setOrigin(1, 1);
            add(badge);
            bg.setInteractive({ useHandCursor: afford })
              .on('pointerover', () => { bg.setFillStyle(0x243040); this.showBuildTip(def, ty); })
              .on('pointerout', () => { bg.setFillStyle(COLORS.panel); this.tooltip.setVisible(false); })
              .on('pointerdown', () => { if (afford) { this.buildDef = def.id; this.buildRot = 0; this.tooltip.setVisible(false); this.rebuildPanel(); } });
          };
          let anyLocked = false;
          for (const cat of ROOM_CATEGORIES) {
            const defs = ROOMS.filter((d) => d.category === cat.id && this.sim.roomAvailable(d.id));
            anyLocked = anyLocked || ROOMS.some((d) => d.category === cat.id && !this.sim.roomAvailable(d.id));
            if (defs.length === 0) continue;
            y += 4;
            line(cat.label.toUpperCase(), COLORS.ghostGreenCss, '11px');
            const gridTop = y;
            defs.forEach((def, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              tile(def, pad + col * (tileW + pad), gridTop + row * (tileH + pad));
            });
            y = gridTop + Math.ceil(defs.length / cols) * (tileH + pad) + pad;
          }
          if (anyLocked) {
            y += 2;
            line('🔒 More rooms unlock as you take on later contracts.', '#8a97a8', '11px');
          }
        }
        break;
      }
      case 'hire': {
        title('Candidates');
        this.sim.state.candidates.forEach((c, i) => {
          const rowY = y;
          const role = ROLE_BY_ID[c.role];
          const hasArt = this.textures.exists(`staff_${c.role}`);
          const tx = hasArt ? 52 : 8;
          const tw = W - tx - 12;
          line(`${c.name}`, COLORS.textPrimary, '14px', tx, tw);
          line(`${role.name} — skill ${'★'.repeat(c.skill)}${'·'.repeat(5 - c.skill)} — $${c.salary}/day`, COLORS.textDim, '12px', tx, tw);
          line(`Works in: ${roomsForRole(c.role).map((r) => r.short).join(' · ')}`, COLORS.ghostGreenCss, '12px', tx, tw);
          line(`(${c.quirk})`, '#8a97a8', '12px', tx, tw);
          if (hasArt) add(this.add.image(28, rowY + 20, `staff_${c.role}`).setDisplaySize(42, 42));
          add(button(this, W / 2, y + 13, 'Hire', () => this.action(this.sim.hire(i)), {
            w: W - 20, h: 24, fontSize: '12px', enabled: this.sim.state.money >= c.salary,
          }));
          y += 34;
        });
        line('Pool refreshes daily.', '#8a97a8', '12px');
        break;
      }
      case 'roster': {
        title(`Staff (${this.sim.state.staff.length})`);
        if (this.sim.state.staff.length === 0) line('Nobody yet. Try the Hire tab.', COLORS.textDim);
        for (const st of this.sim.state.staff) {
          const room = this.sim.room(st.room);
          const where = room ? ROOM_BY_ID[room.def].short : st.activity;
          add(button(this, W / 2 + 12, y + 12,
            `${st.name} [${ROLE_BY_ID[st.role].initials}] E${Math.round(st.energy)} M${Math.round(st.morale)} — ${where}`,
            () => { this.selectedStaff = st.id; this.panelMode = 'staff'; this.rebuildPanel(); },
            { w: W - 44, h: 24, fontSize: '11px' }));
          icon(`staff_${st.role}`, y + 12, 22, 15);
          y += 27;
        }
        break;
      }
      case 'room': {
        const room = this.sim.room(this.selectedRoom);
        if (!room) { this.panelMode = 'info'; this.rebuildPanel(); return; }
        const def = ROOM_BY_ID[room.def];
        title(def.name);
        icon(`room_${room.def}`, 42, 48, W - 34);
        line(def.desc, COLORS.textDim, '12px');
        line(`Level ${room.level}/${BAL.maxRoomLevel}   Condition ${Math.max(0, Math.round(room.condition))}%` +
          `${room.broken ? '  BROKEN' : ''}${room.possessed ? '  POSSESSED' : ''}`,
          room.broken || room.possessed ? COLORS.danger : COLORS.textPrimary);
        if (def.service) {
          line(`Queue ${room.queue.length}/${this.sim.queueCap(room)}` +
            (room.serving ? ` — serving (${Math.ceil(room.serving.remaining)}s)` : ''), COLORS.textPrimary);
        }
        y += 4;
        line('Staff here:', COLORS.ghostGreenCss);
        if (room.staff.length === 0) line('— none —', COLORS.textDim, '12px');
        for (const sid of room.staff) {
          const st = this.sim.staffById(sid);
          if (!st) continue;
          add(button(this, W / 2, y + 12, `✕ ${st.name} [${ROLE_BY_ID[st.role].initials}]`,
            () => { this.sim.unassign(sid); this.rebuildPanel(); },
            { w: W - 20, h: 24, fontSize: '12px' }));
          y += 27;
        }
        const assignable = this.sim.state.staff.filter(
          (s) => s.room !== room.id &&
            (def.roles.length === 0 || def.roles.includes(s.role)),
        );
        if (assignable.length > 0) {
          line('Assign:', COLORS.ghostGreenCss);
          for (const st of assignable.slice(0, 5)) {
            add(button(this, W / 2, y + 12, `+ ${st.name} [${ROLE_BY_ID[st.role].initials}]`,
              () => this.action(this.sim.assign(st.id, room.id)),
              { w: W - 20, h: 24, fontSize: '12px' }));
            y += 27;
          }
        } else if (def.roles.length > 0) {
          line(`Works here: ${def.roles.map((r) => ROLE_BY_ID[r].name).join(', ')}`, '#8a97a8', '12px');
        }
        y += 6;
        btn('Rotate door ↻', () => this.action(this.sim.rotateRoom(room.id)));
        if (room.level < BAL.maxRoomLevel) {
          btn(`Upgrade ($${upgradeCost(def, room.level)})`, () => this.action(this.sim.upgradeRoom(room.id)),
            this.sim.state.money >= upgradeCost(def, room.level));
        }
        if (room.broken || room.condition < 100) {
          btn(`Repair ($${repairCost(def)})`, () => this.action(this.sim.repairRoom(room.id)),
            this.sim.state.money >= repairCost(def));
        }
        btn('Demolish (50% refund, +debt)', () => {
          this.sim.demolishRoom(room.id);
          this.selectedRoom = null;
          this.panelMode = 'info';
          this.rebuildPanel();
        }, true, COLORS.danger);
        break;
      }
      case 'staff': {
        const st = this.sim.state.staff.find((x) => x.id === this.selectedStaff);
        if (!st) { this.panelMode = 'roster'; this.rebuildPanel(); return; }
        const role = ROLE_BY_ID[st.role];
        title(st.name);
        icon(`staff_${st.role}`, 42, 48, W - 34);
        line(`${role.name} — skill ${st.skill.toFixed(1)}/5`, COLORS.textPrimary);
        line(role.desc, COLORS.textDim, '12px');
        line(`Energy ${Math.round(st.energy)}   Morale ${Math.round(st.morale)}   $${st.salary}/day`, COLORS.textPrimary);
        line(`Quirk: ${st.quirk}`, '#8a97a8', '12px');
        line(`Works in: ${roomsForRole(st.role).map((r) => r.short).join(' · ')}`, COLORS.ghostGreenCss, '12px');
        const room = this.sim.room(st.room);
        line(`Currently: ${st.activity}${room ? ` @ ${ROOM_BY_ID[room.def].name}` : ''}`, COLORS.textDim, '12px');
        y += 6;
        line('Send to:', COLORS.ghostGreenCss);
        const options = this.sim.state.rooms.filter((r) => {
          const d = ROOM_BY_ID[r.def];
          return (d.roles.length === 0 || d.roles.includes(st.role)) && r.id !== st.room;
        });
        if (options.length === 0) line('No compatible rooms built.', COLORS.textDim, '12px');
        for (const r of options.slice(0, 8)) {
          add(button(this, W / 2, y + 12, ROOM_BY_ID[r.def].name,
            () => this.action(this.sim.assign(st.id, r.id)),
            { w: W - 20, h: 24, fontSize: '12px' }));
          y += 27;
        }
        if (st.room !== null) {
          btn('Unassign', () => { this.sim.unassign(st.id); this.rebuildPanel(); });
        }
        btn('Fire', () => { this.sim.fire(st.id); this.panelMode = 'roster'; this.rebuildPanel(); }, true, COLORS.danger);
        break;
      }
    }
    // Clamp and apply the scroll offset so long lists (Hire, Build) stay reachable.
    this.panelMaxScroll = Math.max(0, y - (GRID_H * TILE - 8));
    this.panelScroll = Math.max(0, Math.min(this.panelScroll, this.panelMaxScroll));
    this.panel.y = GY - this.panelScroll;
    this.panelScrollHint?.setVisible(this.panelMaxScroll > 0);
  }
}
