$json = Get-Content -LiteralPath '.\audit.json' -Raw | ConvertFrom-Json
$json.advisories.PSObject.Properties | ForEach-Object {
  $a = $_.Value
  [PSCustomObject]@{
    Id = $a.id
    Module = $a.module_name
    Severity = $a.severity
    Vulnerable = $a.vulnerable_versions
    Patched = $a.patched_versions
    Recommendation = $a.recommendation
    Paths = ($a.findings | ForEach-Object { $_.paths }) -join '; '
  }
} | Sort-Object Module, Id | Format-Table -AutoSize
