param(
  [string]$KeyName = "turion_github_ed25519"
)
$ErrorActionPreference = "Stop"
$sshDir = Join-Path $HOME ".ssh"
$keyPath = Join-Path $sshDir $KeyName
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir | Out-Null }
if (-not (Test-Path $keyPath)) {
  ssh-keygen -t ed25519 -f $keyPath -N "" | Out-Null
}
if (-not (Test-Path "$keyPath.pub")) { Write-Output "PUBLIC_KEY_MISSING"; exit 0 }
$cfg = Join-Path $sshDir "config"
if (-not (Test-Path $cfg) -or -not (Select-String -Path $cfg -Pattern "Host github.com" -Quiet)) {
  Add-Content $cfg "Host github.com";
  Add-Content $cfg "  IdentityFile $keyPath";
  Add-Content $cfg "  IdentitiesOnly yes";
}
try { ssh-keyscan -t ed25519 github.com | Add-Content (Join-Path $sshDir "known_hosts") } catch {}
$fingerprint = (ssh-keygen -lf "$keyPath.pub" | ForEach-Object { $_.Split(" ")[1] })
$pub = Get-Content "$keyPath.pub" -Raw
Write-Output "PUBLIC_KEY: $pub"
Write-Output "FINGERPRINT: $fingerprint"
