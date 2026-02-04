param(
  [string]$RepoPath
)
$ErrorActionPreference = "Stop"
$base = "C:\\opt\\turion\\projects"
if (-not $RepoPath) { Write-Output "USAGE: git_pull.ps1 <repo_path>"; exit 1 }
if (-not $RepoPath.StartsWith($base)) { Write-Output "INVALID_PATH"; exit 1 }
if (-not (Test-Path (Join-Path $RepoPath ".git"))) { Write-Output "NOT_A_REPO"; exit 1 }
git -C $RepoPath pull
