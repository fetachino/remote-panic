param([string]$OutputDirectory = (Join-Path $PSScriptRoot '..'))

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stage = Join-Path $root 'dist-webos'
$stageAbsolute = [System.IO.Path]::GetFullPath($stage)
if (-not $stageAbsolute.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing to clean a package staging path outside the project.'
}
if (Test-Path -LiteralPath $stageAbsolute) {
  Remove-Item -LiteralPath $stageAbsolute -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'index.html'), (Join-Path $root 'styles.css'), (Join-Path $root 'appinfo.json') -Destination $stage -Force
Copy-Item -LiteralPath (Join-Path $root 'src'), (Join-Path $root 'assets') -Destination $stage -Recurse -Force

if (-not (Get-Command ares-package -ErrorAction SilentlyContinue)) {
  throw 'LG webOS CLI is missing. Install it with: npm install -g @webos-tools/cli'
}

ares-package $stage --outdir $OutputDirectory
