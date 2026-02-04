param(
  [string]$RepoUrl,
  [string]$TargetPath
)
$ErrorActionPreference = "Stop"
$base = "C:\\opt\\turion\\projects"
if (-not $RepoUrl -or -not $TargetPath) { Write-Output "USAGE: git_clone.ps1 <repo_ssh_url> <target_path>"; exit 1 }
if ($RepoUrl -notmatch '^git@github.com:') { Write-Output "INVALID_REPO"; exit 1 }
if (-not $TargetPath.StartsWith($base)) { Write-Output "INVALID_PATH"; exit 1 }
if (Test-Path (Join-Path $TargetPath ".git")) { Write-Output "ALREADY_EXISTS"; exit 0 }
New-Item -ItemType Directory -Path $base -Force | Out-Null
git clone $RepoUrl $TargetPath
