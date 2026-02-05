$RepoDir = $env:TURION_REPO_DIR
if (-not $RepoDir) { $RepoDir = "C:\\Users\\lucas\\Documents\\OpenTur" }

$Expected = @(
  "git@github.com:LucasBolla94/turionai.git",
  "https://github.com/LucasBolla94/turionai",
  "https://github.com/LucasBolla94/turionai.git"
)
$EnvBackup = "$env:TEMP\\turion_env_backup"

Set-Location $RepoDir
$EnvPath = Join-Path $RepoDir ".env"
if (Test-Path $EnvPath) {
  Copy-Item $EnvPath $EnvBackup -Force
  Write-Output "Backup do .env salvo em $EnvBackup"
}

$RemoteUrl = git config --get remote.origin.url
if ($Expected -notcontains $RemoteUrl) {
  Write-Output "Remote inesperado: $RemoteUrl"
  exit 1
}

git diff --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Output "Repositorio com alterações locais. Abortando update."
  exit 1
}

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Output "Repositorio com alterações locais. Abortando update."
  exit 1
}

git fetch origin main
git merge --ff-only origin/main

if (Test-Path $EnvBackup) {
  if (-not (Test-Path $EnvPath)) {
    Copy-Item $EnvBackup $EnvPath -Force
    Write-Output ".env restaurado do backup."
  } else {
    $content = Get-Content $EnvPath -Raw
    if ($content -match '^XAI_API_KEY=$') {
      Copy-Item $EnvBackup $EnvPath -Force
      Write-Output ".env restaurado do backup (XAI_API_KEY vazio)."
    }
  }
}

Write-Output "Atualizacao aplicada."
