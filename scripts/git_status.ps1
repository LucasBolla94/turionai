param(
  [string]$RepoDir = "C:\\app"
)
$ErrorActionPreference = "Stop"
Set-Location $RepoDir
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Output "GIT_NOT_FOUND"
  exit 0
}
if (-not (Test-Path .git)) {
  Write-Output "NOT_A_GIT_REPO"
  exit 0
}
$remote = ""
try {
  $remote = git remote get-url origin
} catch {
  $remote = ""
}
if (-not $remote) {
  Write-Output "NO_REMOTE"
  exit 0
}
Write-Output "CONNECTED $remote"
