param(
  [string]$BaseUrl = "https://www.palestreinzona.it",
  [string]$CsvPath = "audit\archived-gyms.csv"
)

if (!(Test-Path $CsvPath)) {
  Write-Error "CSV non trovato: $CsvPath"
  exit 1
}

$rows = Import-Csv $CsvPath
$failures = @()
$skipped = @()

foreach ($row in $rows) {
  $slug = $row.slug

  if ([string]::IsNullOrWhiteSpace($slug)) {
    $skipped += $row
    continue
  }

  $url = "$BaseUrl/palestre/$slug"

  try {
    $response = curl.exe -I -L --max-time 20 $url 2>$null
    $statusLine = $response | Select-String -Pattern "^HTTP/" | Select-Object -Last 1
    $status = if ($statusLine) { ($statusLine.ToString() -split " ")[1] } else { "NO_STATUS" }

    if ($status -eq "404" -or $status -eq "410") {
      Write-Host "OK   $status  $slug"
    } else {
      Write-Host "FAIL $status  $slug"
      $failures += [pscustomobject]@{
        id = $row.id
        nome = if ($row.nome) { $row.nome } else { $row.name }
        slug = $slug
        status = $status
        url = $url
        deleted_at = $row.deleted_at
      }
    }
  } catch {
    Write-Host "ERR        $slug"
    $failures += [pscustomobject]@{
      id = $row.id
      nome = if ($row.nome) { $row.nome } else { $row.name }
      slug = $slug
      status = "ERROR"
      url = $url
      deleted_at = $row.deleted_at
    }
  }
}

if (!(Test-Path "audit")) {
  mkdir audit | Out-Null
}

$failures | Export-Csv "audit\archived-public-route-failures.csv" -NoTypeInformation -Encoding UTF8
$skipped | Export-Csv "audit\archived-public-route-skipped-no-slug.csv" -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Audit completato."
Write-Host "Archiviate controllate: $($rows.Count)"
Write-Host "Fallimenti pubblici: $($failures.Count)"
Write-Host "Saltate senza slug: $($skipped.Count)"
Write-Host ""
Write-Host "Report fallimenti: audit\archived-public-route-failures.csv"
Write-Host "Report senza slug: audit\archived-public-route-skipped-no-slug.csv"

if ($failures.Count -gt 0) {
  exit 1
}

exit 0