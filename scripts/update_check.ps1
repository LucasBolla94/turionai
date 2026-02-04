param([string]$RepoDir = "")
$ErrorActionPreference = "Stop"
if (-not $RepoDir) { $RepoDir = $env:TURION_REPO_DIR }
if (-not $RepoDir) { $RepoDir = "C:\\Users\\lucas\\Documents\\OpenTur" }
Set-Location $RepoDir
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Output "GIT_NOT_FOUND"
  exit 0
}
if (-not (Test-Path .git)) {
  Write-Output "NOT_A_GIT_REPO"
  exit 0
}
try {
  git remote get-url origin | Out-Null
} catch {
  Write-Output "NO_REMOTE"
  exit 0
}
try {
  git fetch origin --quiet
} catch {
  Write-Output "FETCH_FAILED"
  exit 0
}
$localHash = git rev-parse HEAD
$remoteHash = ""
try {
  $remoteHash = git rev-parse origin/main
} catch {
  $remoteHash = ""
}
if (-not $remoteHash) {
  Write-Output "NO_REMOTE_MAIN"
  exit 0
}
if ($localHash -eq $remoteHash) {
  Write-Output "UP_TO_DATE"
} else {
  Write-Output "UPDATE_AVAILABLE"
}
