param(
  [string]$InputXlsx = "C:\Users\Vincenzo\Downloads\Arti Marziali Lugano Ale.xlsx",
  [string]$OutputCsv = "C:\Users\Vincenzo\Documents\Playground\data\palestre.csv"
)

$ErrorActionPreference = 'Stop'

function Fix-Text([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return '' }
  $t = ($s -replace '\s+', ' ').Trim()
  $t = $t.Replace('Win Chung', 'Wing Chun')
  $t = $t.Replace('Win Chun', 'Wing Chun')
  $t = $t.Replace('XiÃ o', 'Xiao')
  $t = $t.Replace('XuÃ© XiÃ o', 'Xue Xiao')
  $t = $t.Replace('XuÃ© XiÃ o', 'Xue Xiao')
  $t = $t.Replace('â€“', '-')
  return $t
}

function Normalize-Website([string]$site) {
  $s = Fix-Text $site
  if (-not $s -or $s -eq 'Non disponibile') { return '' }
  if ($s -match '^(http|https)://') { return $s }
  if ($s -match '^www\.') { return "https://$s" }
  return $s
}

function Normalize-Phone([string]$phone) {
  $p = Fix-Text $phone
  if (-not $p -or $p -eq 'Non disponibile') { return '' }
  return $p
}

function Day-Label([string]$key) {
  $k = $key.ToLowerInvariant()
  switch ($k) {
    'lunedi' { return 'Lun' }
    'lunedì' { return 'Lun' }
    'martedi' { return 'Mar' }
    'martedì' { return 'Mar' }
    'mercoledi' { return 'Mer' }
    'mercoledì' { return 'Mer' }
    'giovedi' { return 'Gio' }
    'giovedì' { return 'Gio' }
    'venerdi' { return 'Ven' }
    'venerdì' { return 'Ven' }
    'sabato' { return 'Sab' }
    'domenica' { return 'Dom' }
    default { return $null }
  }
}

function Normalize-DayKey([string]$key) {
  $k = (Fix-Text $key).ToLowerInvariant()
  $k = $k.Replace('Ã¬', 'i').Replace('Ã', '')
  $k = $k.Replace('ì', 'i')
  return $k
}

function Normalize-Hours([string]$hours) {
  $h = Fix-Text $hours
  if (-not $h -or $h -eq 'Non disponibile' -or $h -eq '{}') { return 'Orari da verificare' }

  if ($h.StartsWith('{') -and $h.EndsWith('}')) {
    $json = $h
    $json = $json.Replace('giovedÃ¬', 'giovedi').Replace('lunedÃ¬', 'lunedi').Replace('martedÃ¬', 'martedi').Replace('mercoledÃ¬', 'mercoledi').Replace('venerdÃ¬', 'venerdi')

    try {
      $obj = $json | ConvertFrom-Json
      $ordered = @('lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica')
      $parts = New-Object System.Collections.Generic.List[string]

      foreach ($d in $ordered) {
        $label = Day-Label $d
        $slots = @()
        foreach ($p in $obj.PSObject.Properties) {
          if ((Normalize-DayKey $p.Name) -eq $d) {
            $value = $p.Value
            if ($value -is [System.Array]) {
              foreach ($v in $value) { $slots += (Fix-Text ([string]$v)) }
            } elseif ($null -ne $value) {
              $slots += (Fix-Text ([string]$value))
            }
          }
        }

        if ($slots.Count -eq 0) {
          $parts.Add("$label chiuso")
        } else {
          $joined = ($slots -join ', ').ToLowerInvariant()
          if ($joined -match 'chiuso') {
            $parts.Add("$label chiuso")
          } else {
            $parts.Add("$label $($slots -join ', ')")
          }
        }
      }

      if ($parts.Count -gt 0) { return ($parts -join ' | ') }
    } catch {
      return 'Orari da verificare'
    }
  }

  return $h
}

function Add-Disc($set, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  [void]$set.Add($value)
}

function Normalize-Disciplines([string]$rawDisc, [string]$name, [string]$website) {
  $source = (Fix-Text "$rawDisc $name $website").ToLowerInvariant()
  $set = New-Object System.Collections.Generic.HashSet[string]

  if ($source -match 'muay') { Add-Disc $set 'Muay Thai' }
  if ($source -match '(^|\W)k1($|\W)' -or $source -match 'k-1') { Add-Disc $set 'K1' }
  if ($source -match 'kick') { Add-Disc $set 'Kickboxe' }
  if ($source -match 'mma' -or $source -match 'fighting') { Add-Disc $set 'MMA' }
  if ($source -match 'box') { Add-Disc $set 'Boxe' }
  if ($source -match 'judo') { Add-Disc $set 'Judo' }
  if ($source -match 'jiu' -or $source -match 'bjj' -or $source -match 'kimura' -or $source -match 'mangrove') { Add-Disc $set 'JiuJitsu Brasiliano' }
  if ($source -match 'karate' -or $source -match 'wa rei ryu' -or $source -match 'shito-ryu' -or $source -match 'kyokushin') { Add-Disc $set 'Karate' }
  if ($source -match 'taekwondo') { Add-Disc $set 'Taekwondo' }
  if ($source -match 'aikido') { Add-Disc $set 'Aikido' }
  if ($source -match 'wing chun' -or $source -match 'choy lay fut' -or $source -match 'kung fu') { Add-Disc $set 'Kung Fu' }
  if ($source -match 'wing chun') { Add-Disc $set 'Wing Chun' }
  if ($source -match 'tai chi' -or $source -match 'taiji') { Add-Disc $set 'Tai Chi' }
  if ($source -match 'scherma' -or $source -match 'fencing') { Add-Disc $set 'Scherma' }
  if ($source -match 'chanbara') { Add-Disc $set 'Chanbara' }
  if ($source -match 'difesa personale') { Add-Disc $set 'Difesa Personale' }

  if ($set.Count -eq 0) {
    $nameN = (Fix-Text $name).ToLowerInvariant()
    if ($nameN -match 'iacma') { Add-Disc $set 'Kung Fu'; Add-Disc $set 'Tai Chi' }
    elseif ($nameN -match 'fight') { Add-Disc $set 'MMA'; Add-Disc $set 'Kickboxe' }
    elseif ($nameN -match 'dragon') { Add-Disc $set 'Kung Fu' }
    elseif ($nameN -match 'cavallaro') { Add-Disc $set 'Karate' }
    elseif ($nameN -match 'equalarmor') { Add-Disc $set 'Difesa Personale' }
    else { Add-Disc $set 'MMA' }
  }

  $order = @('Boxe','Kickboxe','Muay Thai','K1','MMA','Judo','JiuJitsu Brasiliano','Karate','Taekwondo','Aikido','Kung Fu','Wing Chun','Tai Chi','Scherma','Chanbara','Difesa Personale')
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($d in $order) { if ($set.Contains($d)) { $out.Add($d) } }
  return ($out -join ' | ')
}

if (-not (Test-Path $InputXlsx)) { throw "File non trovato: $InputXlsx" }

$tempRoot = Join-Path $env:TEMP ("lugano_xlsx_" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot | Out-Null
$zipPath = Join-Path $tempRoot 'source.zip'
Copy-Item -Path $InputXlsx -Destination $zipPath -Force
Expand-Archive -Path $zipPath -DestinationPath $tempRoot -Force

[xml]$shared = Get-Content -Path (Join-Path $tempRoot 'xl\sharedStrings.xml') -Raw
[xml]$sheet = Get-Content -Path (Join-Path $tempRoot 'xl\worksheets\sheet1.xml') -Raw

$strings = @()
foreach ($si in $shared.sst.si) {
  if ($si.t) { $strings += [string]$si.t; continue }
  if ($si.r) {
    $acc = ''
    foreach ($r in $si.r) { $acc += [string]$r.t }
    $strings += $acc
    continue
  }
  $strings += ''
}

function Cell-Value($cell) {
  if ($null -eq $cell) { return '' }
  $t = [string]$cell.t
  $v = [string]$cell.v
  if ($t -eq 's') {
    $idx = 0
    [void][int]::TryParse($v, [ref]$idx)
    if ($idx -ge 0 -and $idx -lt $strings.Count) { return [string]$strings[$idx] }
    return ''
  }
  return $v
}

$result = @()
$seen = New-Object System.Collections.Generic.HashSet[string]

foreach ($row in $sheet.worksheet.sheetData.row) {
  $r = [int]$row.r
  if ($r -le 1) { continue }

  $cells = @{}
  foreach ($c in $row.c) {
    $ref = [string]$c.r
    if (-not $ref) { continue }
    $col = ($ref -replace '\d','')
    $cells[$col] = Cell-Value $c
  }

  $name = Fix-Text $cells['A']
  if (-not $name) { continue }

  $rawDisc = Fix-Text $cells['B']
  $address = Fix-Text $cells['C']
  if (-not $address) { continue }

  $phone = Normalize-Phone $cells['D']
  $hours = Normalize-Hours $cells['E']
  $website = Normalize-Website $cells['G']
  $lat = Fix-Text $cells['J']
  $lng = Fix-Text $cells['K']
  $disc = Normalize-Disciplines $rawDisc $name $website

  switch -Regex ($name.ToLowerInvariant()) {
    'old school fighting' { $disc = 'MMA | Kickboxe | K1'; break }
    '^fight academy ticino$' { $disc = 'MMA | Kickboxe | Muay Thai'; break }
    '^sb academy$' { $disc = 'Kickboxe | Muay Thai | MMA'; break }
    'aa special training' { $disc = 'Kickboxe | MMA'; break }
    'wing chun xu' { $disc = 'Kung Fu | Wing Chun' ; $name = 'Wing Chun Xue Xiao'; break }
  }

  $key = ("$name|$address").ToLowerInvariant()
  if ($seen.Contains($key)) { continue }
  [void]$seen.Add($key)

  $result += [pscustomobject]@{
    'nome palestra' = $name
    'discipline' = $disc
    'indirizzo' = $address
    'telefono' = $phone
    'orari di apertura' = $hours
    'pagina web' = $website
    'lat' = $lat
    'long' = $lng
  }
}

$result | Sort-Object 'nome palestra' | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
Remove-Item -Path $tempRoot -Recurse -Force
"Import completato: $($result.Count) palestre -> $OutputCsv"





