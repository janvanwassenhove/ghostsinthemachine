# Remove the inner white fills from the title logo.
#
# The exported wordmark sits on white and has white pixels filling the letters
# and the ghost's face. Against the game's dark background those read as ugly
# white blobs. This makes bright, low-saturation (whitish) pixels transparent
# with a soft ramp, so the saturated green art survives while the whites drop
# out — everywhere, not just the border.
#
# Idempotent: the untouched original is backed up once to _dark_originals/ and
# every run re-renders from it.
#
# Usage:  pwsh ./scripts/logo-transparent.ps1

Add-Type -AssemblyName System.Drawing

$dir = (Resolve-Path (Join-Path $PSScriptRoot '..\src\assets\game')).Path
$backupDir = Join-Path $dir '_dark_originals'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$target = Join-Path $dir 'logo_title.png'
$backup = Join-Path $backupDir 'logo_title.prewhite.png'
if (-not (Test-Path $target)) { throw "logo_title.png not found" }
if (-not (Test-Path $backup)) { Copy-Item $target $backup }  # keep original once

$bmp = [System.Drawing.Bitmap]::FromFile($backup)   # always render from original
$w = $bmp.Width; $h = $bmp.Height
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$len = $data.Stride * $h
$buf = New-Object byte[] $len
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $len)

$dropped = 0
for ($p = 0; $p -lt $len; $p += 4) {
  # Format32bppArgb little-endian byte order is B, G, R, A.
  $b = $buf[$p]; $g = $buf[$p + 1]; $r = $buf[$p + 2]; $a = $buf[$p + 3]
  if ($a -eq 0) { continue }
  $max = [Math]::Max($r, [Math]::Max($g, $b))
  $min = [Math]::Min($r, [Math]::Min($g, $b))
  $sat = if ($max -eq 0) { 0.0 } else { ($max - $min) / [double]$max }
  if ($max -gt 170 -and $sat -lt 0.30) {
    $bright = [Math]::Min(1.0, ($max - 170) / 85.0)   # 170..255 -> 0..1
    $desat  = [Math]::Min(1.0, (0.30 - $sat) / 0.30)  # sat 0.30..0 -> 0..1
    $strength = $bright * $desat
    $newA = [int]($a * (1.0 - $strength))
    if ($newA -lt $a) { $buf[$p + 3] = [byte]$newA; if ($newA -eq 0) { $dropped++ } }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $len)
$bmp.UnlockBits($data)
$bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"logo_title.png: made $dropped pixels fully transparent (whites removed). Original in _dark_originals/logo_title.prewhite.png."
