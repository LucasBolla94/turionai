param()
$ErrorActionPreference = "Stop"
$out = ""
try {
  $out = ssh -T -o StrictHostKeyChecking=accept-new git@github.com 2>&1
} catch {
  $out = $_.Exception.Message
}
if ($out -match "successfully authenticated") {
  Write-Output "OK"
} else {
  Write-Output "ERROR"
  Write-Output $out
}
