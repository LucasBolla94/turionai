$RepoDir = $env:TURION_REPO_DIR
if (-not $RepoDir) { $RepoDir = "C:\\Users\\lucas\\Documents\\OpenTur" }

$Expected = @(
  "git@github.com:LucasBolla94/turionai.git",
  "https://github.com/LucasBolla94/turionai",
  "https://github.com/LucasBolla94/turionai.git"
)

Set-Location $RepoDir

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

Write-Output "Atualizacao aplicada."
