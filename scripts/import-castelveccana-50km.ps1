param(
  [string]$CsvPath = "C:\Users\Vincenzo\Documents\Playground\data\palestre.csv",
  [double]$CenterLat = 45.9508626,
  [double]$CenterLon = 8.6692725,
  [int]$RadiusMeters = 50000
)

$ErrorActionPreference = 'Stop'

function Clean([object]$v) { if ($null -eq $v) { return '' }; return ([string]$v).Trim() }
function Norm([string]$s) { return ((Clean $s).ToLowerInvariant() -replace '\s+', ' ').Trim() }
function CsvEscape([string]$s) { if ($null -eq $s) { $s = '' }; if ($s.Contains(',') -or $s.Contains('"') -or $s.Contains("`n")) { return '"' + ($s -replace '"','""') + '"' }; return $s }

function DistanceKm([double]$lat1, [double]$lon1, [double]$lat2, [double]$lon2) {
  $R = 6371.0
  $dLat = ($lat2 - $lat1) * [math]::PI / 180.0
  $dLon = ($lon2 - $lon1) * [math]::PI / 180.0
  $a = [math]::Sin($dLat/2) * [math]::Sin($dLat/2) + [math]::Cos($lat1 * [math]::PI / 180.0) * [math]::Cos($lat2 * [math]::PI / 180.0) * [math]::Sin($dLon/2) * [math]::Sin($dLon/2)
  $c = 2.0 * [math]::Atan2([math]::Sqrt($a), [math]::Sqrt(1-$a))
  return $R * $c
}

function IsGymLikeName([string]$name) {
  $n = Norm $name
  if (-not $n) { return $false }
  return $n -match 'dojo|gym|palestra|box|judo|karate|kick|muay|mma|jiu|taekwondo|aikido|kung|wing|club|academy|arti marziali|difesa|scherma|fight|krav|budo'
}

function DisciplineFromText([string]$blob) {
  $all = Norm $blob
  $set = New-Object System.Collections.Generic.HashSet[string]
  if ($all -match 'muay') { [void]$set.Add('Muay Thai') }
  if ($all -match '(^|\W)k1($|\W)' -or $all -match 'k-1') { [void]$set.Add('K1') }
  if ($all -match 'kick') { [void]$set.Add('Kickboxe') }
  if ($all -match 'mma|mixed martial') { [void]$set.Add('MMA') }
  if ($all -match 'box|pugil') { [void]$set.Add('Boxe') }
  if ($all -match 'judo') { [void]$set.Add('Judo') }
  if ($all -match 'brazilian jiu|bjj|jiu') { [void]$set.Add('Jujitsu Brasiliano') }
  if ($all -match 'karate|kyokushin|shito|wa rei ryu') { [void]$set.Add('Karate') }
  if ($all -match 'taekwondo') { [void]$set.Add('Taekwondo') }
  if ($all -match 'aikido') { [void]$set.Add('Aikido') }
  if ($all -match 'wing chun') { [void]$set.Add('Wing Chun'); [void]$set.Add('Kung Fu') }
  if ($all -match 'kung fu|choy|shaolin') { [void]$set.Add('Kung Fu') }
  if ($all -match 'tai chi|taiji') { [void]$set.Add('Tai Chi') }
  if ($all -match 'scherma|fencing') { [void]$set.Add('Scherma') }
  if ($all -match 'chanbara') { [void]$set.Add('Chanbara') }
  if ($all -match 'difesa personale|self defense|self-defence|krav maga') { [void]$set.Add('Difesa Personale') }
  if ($set.Count -eq 0) { [void]$set.Add('MMA') }
  $order = @('Boxe','Kickboxe','Muay Thai','K1','MMA','Judo','Jujitsu Brasiliano','Karate','Taekwondo','Aikido','Kung Fu','Wing Chun','Tai Chi','Scherma','Chanbara','Difesa Personale')
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($d in $order) { if ($set.Contains($d)) { [void]$out.Add($d) } }
  return ($out -join ' | ')
}

function AddRecord($records, $byKey, [string]$name, [string]$disc, [string]$address, [double]$lat, [double]$lon) {
  if (-not (Clean $name)) { return $false }
  if (-not (IsGymLikeName $name)) { return $false }
  if (-not (Clean $address)) { $address = 'Indirizzo da verificare' }
  $key = (Norm $name) + '|' + (Norm $address)
  if ($byKey.Contains($key)) { return $false }
  [void]$byKey.Add($key)
  $records.Add([pscustomobject]@{
    'nome palestra' = (Clean $name)
    'discipline' = (Clean $disc)
    'indirizzo' = (Clean $address)
    'telefono' = ''
    'orari di apertura' = 'Orari da verificare'
    'pagina web' = ''
    'lat' = ([string]([math]::Round([double]$lat, 6)))
    'long' = ([string]([math]::Round([double]$lon, 6)))
  }) | Out-Null
  return $true
}

if (-not (Test-Path $CsvPath)) { throw "CSV non trovato: $CsvPath" }
$existing = Import-Csv -Path $CsvPath
$byKey = New-Object System.Collections.Generic.HashSet[string]
foreach ($r in $existing) { [void]$byKey.Add((Norm $r.'nome palestra') + '|' + (Norm $r.indirizzo)) }
$added = New-Object System.Collections.Generic.List[object]

$latDelta = [double]($RadiusMeters / 111000.0)
$lonDelta = [double]($RadiusMeters / (111000.0 * [math]::Cos($CenterLat * [math]::PI / 180.0)))
$minLon = [math]::Round($CenterLon - $lonDelta, 6)
$maxLon = [math]::Round($CenterLon + $lonDelta, 6)
$minLat = [math]::Round($CenterLat - $latDelta, 6)
$maxLat = [math]::Round($CenterLat + $latDelta, 6)
$viewbox = "$minLon,$maxLat,$maxLon,$minLat"

$cities = @('Castelveccana','Luino','Laveno-Mombello','Gavirate','Besozzo','Cittiglio','Varese','Malnate','Tradate','Sesto Calende','Somma Lombardo','Gallarate','Busto Arsizio','Legnano','Verbania','Stresa','Arona','Dormelletto','Novara','Como','Cantu','Erba','Mendrisio','Chiasso','Lugano')
$terms = @('boxing gym','kickboxing gym','muay thai gym','mma gym','judo dojo','karate dojo','jiu jitsu academy','brazilian jiu jitsu','taekwondo club','aikido dojo','wing chun school','kung fu academy','krav maga','difesa personale','arti marziali palestra')

foreach ($city in $cities) {
  foreach ($term in $terms) {
    $query = "$term $city"
    try {
      $u = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&countrycodes=it,ch&bounded=1&viewbox=$viewbox&q=$([uri]::EscapeDataString($query))"
      $items = Invoke-RestMethod -Method Get -Uri $u -TimeoutSec 60 -Headers @{ 'User-Agent'='GymFinderImporter/1.0 (vdauria94@gmail.com)' }
      foreach ($it in @($items)) {
        $name = Clean $it.name
        if (-not $name) { $name = Clean (($it.display_name -split ',')[0]) }
        if (-not $name) { continue }

        $cls = Norm $it.category; if (-not $cls) { $cls = Norm $it.class }
        $typ = Norm $it.type
        if ($cls -match 'boundary|place|highway|railway|waterway|landuse' -or $typ -match 'administrative|city|town|village|hamlet|suburb|neighbourhood|road|residential|primary|secondary') { continue }

        $lat = [double]$it.lat; $lon = [double]$it.lon
        if ((DistanceKm $CenterLat $CenterLon $lat $lon) -gt ($RadiusMeters / 1000.0)) { continue }

        $addr = Clean $it.display_name
        $disc = DisciplineFromText "$query $name $addr"
        [void](AddRecord $added $byKey $name $disc $addr $lat $lon)
      }
    } catch {
      continue
    }
    Start-Sleep -Milliseconds 700
  }
}

$merged = @($existing + $added) | Sort-Object 'nome palestra','indirizzo' -Unique
$headers = @('nome palestra','discipline','indirizzo','telefono','orari di apertura','pagina web','lat','long')
$out = New-Object System.Collections.Generic.List[string]
$out.Add(($headers -join ',')) | Out-Null
foreach ($r in $merged) {
  $vals = @(); foreach ($h in $headers) { $vals += (CsvEscape (Clean $r.$h)) }
  $out.Add(($vals -join ',')) | Out-Null
}
Set-Content -Path $CsvPath -Value $out -Encoding UTF8
"Import esteso (filtro qualità) completato. Nuove palestre: $($added.Count). Totale CSV: $($merged.Count)."
