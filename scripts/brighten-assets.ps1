# Brighten the room icons, room floor-plans, and the floor tile.
#
# The generated art was exported very underexposed (room plans averaged
# luminance ~14 with 90-100% near-black pixels). This applies a levels/gamma
# curve per asset class to bring them to "dark but readable", always sourcing
# from the untouched backup so it is safe to re-run (idempotent).
#
# Full-resolution dark originals are backed up to src/assets/game/_dark_originals/
# (gitignored, not loaded by the game).
#
# Usage:  pwsh ./scripts/brighten-assets.ps1

Add-Type -AssemblyName System.Drawing

$dir = (Resolve-Path (Join-Path $PSScriptRoot '..\src\assets\game')).Path
$backup = Join-Path $dir '_dark_originals'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

function Get-Curve([string]$name) {
  # The Grounds art (garden plots) is far darker than the other rooms, so it
  # needs a much stronger lift to read as an icon in the build menu / on the map.
  if ($name -match 'bean_plantation|oak_grove|server_farm') {
    if ($name -like 'roomplan_*') { return @(2.6, 1.25, 8) }
    return @(2.3, 1.4, 12)   # room_ icons: strong lift so they show in the menu
  }
  if ($name -like 'roomplan_*') { return @(2.1, 1.10, 5) }   # interiors: strong lift
  if ($name -like 'room_*')     { return @(1.5, 1.06, 3) }   # room icons: mild lift
  if ($name -like 'staff_*')    { return @(1.5, 1.06, 3) }   # staff portraits: mild lift
  if ($name -eq 'tile_floor.png') { return @(1.65, 1.05, 4) }
  return $null
}

function Brighten([string]$src, [string]$dst, [double]$gamma, [double]$gain, [double]$lift) {
  $bmp = [System.Drawing.Bitmap]::FromFile($src)
  $w = $bmp.Width; $h = $bmp.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $len = $data.Stride * $h
  $buf = New-Object byte[] $len
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $len)
  $lut = New-Object int[] 256
  for ($i = 0; $i -lt 256; $i++) {
    $v = [Math]::Pow($i / 255.0, 1.0 / $gamma) * 255.0 * $gain + $lift
    if ($v -lt 0) { $v = 0 }; if ($v -gt 255) { $v = 255 }
    $lut[$i] = [int]$v
  }
  for ($p = 0; $p -lt $len; $p += 4) {
    $buf[$p]     = $lut[$buf[$p]]
    $buf[$p + 1] = $lut[$buf[$p + 1]]
    $buf[$p + 2] = $lut[$buf[$p + 2]]
  }
  [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $len)
  $bmp.UnlockBits($data)
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$count = 0
Get-ChildItem $dir -Filter *.png | ForEach-Object {
  $curve = Get-Curve $_.Name
  if ($null -eq $curve) { return }
  $bpath = Join-Path $backup $_.Name
  if (-not (Test-Path $bpath)) { Copy-Item $_.FullName $bpath }  # keep the dark original once
  Brighten $bpath $_.FullName $curve[0] $curve[1] $curve[2]      # always render from the original
  $count++
}
"Brightened $count assets (room_*, roomplan_*, tile_floor). Originals in _dark_originals/."