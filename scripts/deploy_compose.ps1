$Name = $args[0]
$Repo = $args[1]
$BaseDir = $env:TURION_PROJECTS_DIR

if (-not $BaseDir) { $BaseDir = "C:\\opt\\turion\\projects" }

if (-not $Name -or -not $Repo) {
  Write-Output "Uso: deploy_compose.ps1 <name> <repo_url>"
  exit 1
}

$TargetDir = Join-Path $BaseDir $Name

New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null

if (Test-Path (Join-Path $TargetDir ".git")) {
  Write-Output "Atualizando repo em $TargetDir"
  git -C $TargetDir pull
} else {
  Write-Output "Clonando $Repo em $TargetDir"
  git clone $Repo $TargetDir
}

$ComposeFile = Join-Path $TargetDir "docker-compose.yml"
$AltCompose = Join-Path $TargetDir "compose.yml"

if (Test-Path $ComposeFile) {
  Write-Output "Subindo docker compose em $TargetDir"
  docker compose -f $ComposeFile up -d
} elseif (Test-Path $AltCompose) {
  Write-Output "Subindo docker compose em $TargetDir"
  docker compose -f $AltCompose up -d
} else {
  Write-Output "Arquivo docker-compose.yml não encontrado."
  exit 1
}

Write-Output "Deploy finalizado."
