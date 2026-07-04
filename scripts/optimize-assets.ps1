# Optimize game art in src/assets/game.
#
# Downscales oversized PNGs (generated art is often 1000px+ but renders tiny)
# and re-encodes them, cutting the bundle dramatically. Full-resolution
# originals are backed up once to src/assets/game/_originals/ (gitignored), so
# this is safe to re-run and never loses source art.
#
# Usage:  pwsh ./scripts/optimize-assets.ps1
#
# Targets (longest edge, px): backgrounds/end-art 1280, title logo 900,
# everything else (sprites, tile, icons) 256.

Add-Type -AssemblyName System.Drawing

$dir = (Resolve-Path (Join-Path $PSScriptRoot '..\src\assets\game')).Path
$backup = Join-Path $dir '_originals'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

function Get-Target([string]$name) {
  if ($name -like 'bg_*' -or $name -like 'art_*') { return 1280 }
  if ($name -eq 'logo_title.png') { return 900 }
  if ($name -like 'roomplan_*') { return 384 }  # fills a whole room, needs more detail
  return 256
}

$before = 0; $after = 0; $changed = 0
Get-ChildItem $dir -Filter *.png | ForEach-Object {
  $before += $_.Length
  $img = [System.Drawing.Bitmap]::FromFile($_.FullName)
  $maxDim = [Math]::Max($img.Width, $img.Height)
  $target = Get-Target $_.Name
  if ($maxDim -le $target) {
    $img.Dispose()
    $after += $_.Length
    return
  }
  $bpath = Join-Path $backup $_.Name
  if (-not (Test-Path $bpath)) { Copy-Item $_.FullName $bpath }

  $scale = $target / $maxDim
  $nw = [int][Math]::Round($img.Width * $scale)
  $nh = [int][Math]::Round($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap $nw, $nh
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.DrawImage($img, 0, 0, $nw, $nh)
  $gfx.Dispose(); $img.Dispose()
  $bmp.Save($_.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $changed++
  $after += (Get-Item $_.FullName).Length
  "  {0,-32} -> {1}x{2}" -f $_.Name, $nw, $nh
}
"Optimized $changed file(s). Total {0:N1} MB -> {1:N1} MB" -f ($before / 1MB), ($after / 1MB)