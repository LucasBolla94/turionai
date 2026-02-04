$Name = $args[0]
$Lines = $args[1]
$BaseDir = $env:TURION_PROJECTS_DIR

if (-not $BaseDir) { $BaseDir = "C:\\opt\\turion\\projects" }

if (-not $Name) {
  Write-Output "Uso: logs_compose.ps1 <name> [lines]"
  exit 1
}

if (-not $Lines) { $Lines = "200" }

$TargetDir = Join-Path $BaseDir $Name
$ComposeFile = Join-Path $TargetDir "docker-compose.yml"
$AltCompose = Join-Path $TargetDir "compose.yml"

if (Test-Path $ComposeFile) {
  docker compose -f $ComposeFile logs --tail $Lines
  exit 0
}

if (Test-Path $AltCompose) {
  docker compose -f $AltCompose logs --tail $Lines
  exit 0
}

Write-Output "Arquivo docker-compose.yml não encontrado."
exit 1
