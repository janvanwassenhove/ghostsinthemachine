import Phaser from 'phaser';

/**
 * Optional art pipeline.
 *
 * Any `*.png` an artist drops into `src/assets/game/` is enumerated at build
 * time by Vite's `import.meta.glob`, so ONLY files that actually exist are
 * loaded — missing art produces no 404s and the game falls back to its
 * procedural graphics. The texture key is the filename without extension,
 * e.g. `ghost_code.png` -> texture key `ghost_code`.
 *
 * After adding new files, restart `npm run dev` (or rebuild) so Vite re-scans
 * the folder.
 */
const files = import.meta.glob('../assets/game/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const manifest: { key: string; url: string }[] = Object.entries(files).map(
  ([path, url]) => {
    const file = path.split('/').pop() ?? path;
    return { key: file.replace(/\.png$/i, ''), url };
  },
);

/** Queue every discovered asset onto a scene's loader (call from preload). */
export function queueGameAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { key, url } of manifest) {
    if (!loader.textureManager.exists(key)) loader.image(key, url);
  }
}

/** How many custom art files were found (handy for debugging). */
export const CUSTOM_ASSET_COUNT = manifest.length;

/**
 * Full-frame art that is meant to stay opaque (backgrounds, floor tile).
 * Everything else (ghosts, room icons, staff tokens, the title logo) is a
 * sprite that needs its flat background knocked out to transparency.
 */
const OPAQUE_KEYS = new Set(['tile_floor', 'bg_menu', 'art_victory', 'art_defeat']);

/**
 * Generated art often ships on a flat white or dark backdrop instead of real
 * transparency. This removes that backdrop for sprite assets via an edge
 * flood-fill: only background-coloured pixels *connected to the border* become
 * transparent, so interior detail (eyes, outlines) is preserved. Runs once at
 * boot and leaves the source files on disk untouched.
 */
export function processTransparency(scene: Phaser.Scene): void {
  for (const { key } of manifest) {
    // Room floor-plans fill the whole room and stay opaque, like backgrounds.
    if (OPAQUE_KEYS.has(key) || key.startsWith('roomplan_') || !scene.textures.exists(key)) continue;
    const source = scene.textures.get(key).getSourceImage();
    if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) continue;
    const maxDim = key === 'logo_title' ? 768 : 384;
    const canvas = knockoutBackground(source, maxDim);
    if (!canvas) continue; // already transparent — leave as loaded
    scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  }
}

/**
 * Returns a canvas with the flat border background made transparent, or null
 * if the image already has meaningful transparency (nothing to do).
 */
function knockoutBackground(
  src: HTMLImageElement | HTMLCanvasElement,
  maxDim: number,
): HTMLCanvasElement | null {
  const sw = src.width;
  const sh = src.height;
  if (!sw || !sh) return null;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  // If the corners are already transparent, the artist supplied a real alpha
  // channel — don't touch it.
  const cornerAlpha = [
    px[3],
    px[(w - 1) * 4 + 3],
    px[(h - 1) * w * 4 + 3],
    px[((h - 1) * w + (w - 1)) * 4 + 3],
  ];
  if (cornerAlpha.every((a) => a < 16)) return null;

  // Background colour = average of the four corners.
  const corner = (x: number, y: number): [number, number, number] => {
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  const cs = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
  const bg = [0, 1, 2].map((k) => (cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4);

  const tol2 = 62 * 62; // squared RGB distance tolerance
  const isBg = (i: number): boolean => {
    const dr = px[i] - bg[0];
    const dg = px[i + 1] - bg[1];
    const db = px[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const consider = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    if (isBg(p * 4)) {
      visited[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    consider(x, 0);
    consider(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    consider(0, y);
    consider(w - 1, y);
  }
  while (stack.length > 0) {
    const p = stack.pop()!;
    px[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    consider(x + 1, y);
    consider(x - 1, y);
    consider(x, y + 1);
    consider(x, y - 1);
  }

  // De-fringe: fade the halo of near-background pixels left along the cut edge
  // so the sprite outline reads cleanly instead of with a bright rim.
  const transparent = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= w || y >= h || px[(y * w + x) * 4 + 3] === 0;
  const inner = 62; // fully solid beyond this distance from bg
  const outer = 88; // fully faded within this distance
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] === 0) continue;
      if (transparent(x + 1, y) || transparent(x - 1, y) || transparent(x, y + 1) || transparent(x, y - 1)) {
        const dr = px[i] - bg[0];
        const dg = px[i + 1] - bg[1];
        const db = px[i + 2] - bg[2];
        const d = Math.sqrt(dr * dr + dg * dg + db * db);
        if (d < outer) {
          const t = Math.max(0, Math.min(1, (d - inner) / (outer - inner)));
          px[i + 3] = Math.round(px[i + 3] * t);
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}
