$ErrorActionPreference = 'Stop'
# Elevate only this explicit network setup. Preserve unrelated firewall policy.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $quoted = $PSCommandPath.Replace("'", "''")
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes("& '$quoted'"))
  try {
    $process = Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) -Verb RunAs -Wait -PassThru
    exit $process.ExitCode
  } catch { Write-Error 'Permesso non concesso. Apri SBLOCCA LA RETE quando puoi autorizzare il firewall.'; exit 1 }
}
try {
  $node = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../node/node.exe'))
  if (-not (Test-Path $node)) { throw 'Manca node.exe nel pacchetto.' }
  $rules = @(@{Name='NATPF Aplus HTTPS';Program=$node;Protocol='TCP';LocalPort=@('8443','8081')})
  $roots = @(${env:ProgramFiles(x86)},$env:ProgramFiles,$env:LOCALAPPDATA) | Where-Object { $_ }
  foreach ($browser in @(@('Edge','Microsoft/Edge/Application/msedge.exe'),@('Chrome','Google/Chrome/Application/chrome.exe'))) {
    $exe = $roots | ForEach-Object { Join-Path $_ $browser[1] } | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($exe) { $rules += @{Name=('NATPF Aplus ' + $browser[0]);Program=$exe;Protocol='UDP'} }
  }
  foreach ($rule in $rules) {
    Get-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule @rule -DisplayName $rule.Name -Direction Inbound -Action Allow -RemoteAddress LocalSubnet -Profile Any | Out-Null
  }
  Write-Host 'NATPF: HTTPS e WebRTC consentiti solo dalla sottorete locale.'
  $blocks = Get-NetFirewallRule -Enabled True -Direction Inbound -Action Block | Get-NetFirewallApplicationFilter | Where-Object { $_.Program -in $rules.Program }
  if ($blocks) { Write-Warning 'Una regola di blocco preesistente prevale sulle autorizzazioni. Chiedi al gestore del PC di verificarla.'; exit 2 }
  exit 0
} catch { Write-Error $_; exit 1 }
