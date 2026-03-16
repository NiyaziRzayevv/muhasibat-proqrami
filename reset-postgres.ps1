param(
  [string]$PgVersion = "16",
  [string]$ServiceName = "postgresql-x64-16",
  [string]$DataDir = "C:\\Program Files\\PostgreSQL\\16\\data",
  [string]$DbName = "smartqeyd",
  [string]$DbUser = "smartqeyd",
  [string]$EnvFile = "c:\\Users\\niyazi\\Desktop\\muhasibat proqrami\\server\\.env",
  [string]$LogPath = "c:\\Users\\niyazi\\Desktop\\muhasibat proqrami\\reset-postgres.log"
)

if ($LogPath -and $LogPath.Trim().Length -gt 0) {
  try {
    $logDir = Split-Path -Parent $LogPath
    if ($logDir -and !(Test-Path $logDir)) {
      New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
  } catch {
  }

  try {
    Start-Transcript -Path $LogPath -Force | Out-Null
  } catch {
  }
}

function Test-IsAdmin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Convert-SecureStringToPlainText([SecureString]$Secure) {
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
  }
}

function Escape-SqlLiteral([string]$Value) {
  if ($null -eq $Value) { return "" }
  return $Value -replace "'", "''"
}

function Set-DotEnvValue([string]$Path, [string]$Key, [string]$Value) {
  $line = "$Key=$Value"
  if (!(Test-Path $Path)) {
    Set-Content -Path $Path -Value $line -Encoding UTF8
    return
  }

  $content = Get-Content -Path $Path -Raw
  $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
  if ($content -match $pattern) {
    $updated = [regex]::Replace(
      $content,
      $pattern,
      [System.Text.RegularExpressions.MatchEvaluator]{ param($m) "$Key=$Value" }
    )
    Set-Content -Path $Path -Value $updated -Encoding UTF8
  } else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) {
      $content = $content + "`r`n"
    }
    $updated = $content + $line + "`r`n"
    Set-Content -Path $Path -Value $updated -Encoding UTF8
  }
}

if (-not (Test-IsAdmin)) {
  Write-Error "Administrator olaraq işə salın (Run as Administrator)."
  exit 1
}

$psqlPath = "C:\\Program Files\\PostgreSQL\\$PgVersion\\bin\\psql.exe"
if (!(Test-Path $psqlPath)) {
  $candidate = Get-ChildItem -Path "C:\\Program Files\\PostgreSQL" -Filter psql.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $candidate) {
    Write-Error "psql tapılmadı. PostgreSQL bin path yoxlayın."
    exit 1
  }
  $psqlPath = $candidate.FullName
}

if (!(Test-Path $DataDir)) {
  Write-Error "DataDir tapılmadı: $DataDir"
  exit 1
}

$hbaPath = Join-Path $DataDir "pg_hba.conf"
if (!(Test-Path $hbaPath)) {
  Write-Error "pg_hba.conf tapılmadı: $hbaPath"
  exit 1
}

$pgPassSecure = Read-Host "Yeni 'postgres' parolu" -AsSecureString
$dbPassSecure = Read-Host "Yeni '$DbUser' DB parolu" -AsSecureString

$pgPassPlain = Convert-SecureStringToPlainText $pgPassSecure
$dbPassPlain = Convert-SecureStringToPlainText $dbPassSecure

if ([string]::IsNullOrWhiteSpace($pgPassPlain) -or [string]::IsNullOrWhiteSpace($dbPassPlain)) {
  Write-Error "Parol boş ola bilməz."
  exit 1
}

$backupPath = "$hbaPath.bak.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $hbaPath -Destination $backupPath -Force

$trustBlock = @(
  "host    all             postgres        127.0.0.1/32            trust",
  "host    all             postgres        ::1/128                 trust"
)

try {
  $content = Get-Content -Path $hbaPath -Raw
  $lines = $content -split "`r?`n"

  $already = $false
  foreach ($l in $lines) {
    if ($l -match '^host\s+all\s+postgres\s+127\.0\.0\.1/32\s+trust\s*$') {
      $already = $true
      break
    }
  }

  if (-not $already) {
    $outLines = New-Object System.Collections.Generic.List[string]

    $inserted = $false
    for ($i = 0; $i -lt $lines.Length; $i++) {
      $outLines.Add($lines[$i]) | Out-Null
      if (-not $inserted -and $lines[$i] -match '^#\s*Authentication\s+Records\s*$') {
        $outLines.Add("") | Out-Null
        foreach ($t in $trustBlock) { $outLines.Add($t) | Out-Null }
        $outLines.Add("") | Out-Null
        $inserted = $true
      }
    }

    if (-not $inserted) {
      $outLines.Insert(0, "")
      foreach ($t in $trustBlock) { $outLines.Insert(0, $t) }
    }

    Set-Content -Path $hbaPath -Value ($outLines -join "`r`n") -Encoding ASCII
  }

  Restart-Service -Name $ServiceName -Force
  Start-Sleep -Seconds 2

  $pgPassSql = Escape-SqlLiteral $pgPassPlain
  $dbPassSql = Escape-SqlLiteral $dbPassPlain

  $env:PGPASSWORD = ""

  & $psqlPath -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD '$pgPassSql';"

  $env:PGPASSWORD = $pgPassPlain

  $createRole = "DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DbUser') THEN CREATE ROLE $DbUser LOGIN PASSWORD '$dbPassSql'; ELSE ALTER ROLE $DbUser WITH PASSWORD '$dbPassSql'; END IF; END$$;"
  & $psqlPath -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c $createRole

  $createDb = "DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DbName') THEN CREATE DATABASE $DbName OWNER $DbUser; END IF; END$$;"
  & $psqlPath -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c $createDb

  & $psqlPath -U postgres -h localhost -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"

  $dbUserEnc = [uri]::EscapeDataString($DbUser)
  $dbPassEnc = [uri]::EscapeDataString($dbPassPlain)
  $dbNameEnc = [uri]::EscapeDataString($DbName)
  $dbUrl = "postgresql://${dbUserEnc}:${dbPassEnc}@localhost:5432/${dbNameEnc}?schema=public"
  Set-DotEnvValue -Path $EnvFile -Key "DATABASE_URL" -Value $dbUrl

  $env:PGPASSWORD = $dbPassPlain
  & $psqlPath -U $DbUser -h localhost -d $DbName -v ON_ERROR_STOP=1 -c "SELECT 1;"

  Write-Host "OK: postgres parolu reset oldu, $DbUser/$DbName yaradıldı, DATABASE_URL yeniləndi." -ForegroundColor Green
} catch {
  Write-Error $_
  throw
} finally {
  try {
    Stop-Transcript | Out-Null
  } catch {
  }

  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

  if (Test-Path $backupPath) {
    Copy-Item -Path $backupPath -Destination $hbaPath -Force
    try {
      Restart-Service -Name $ServiceName -Force
    } catch {
      Write-Error $_
    }
  }
}
