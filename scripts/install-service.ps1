# Instala el POS como servicio de Windows con NSSM (blueprint Step 15).
# Requisitos: haber corrido `pnpm build` y tener nssm en el PATH
# (https://nssm.cc — o pasar -RutaNssm "C:\herramientas\nssm.exe").
# Ejecutar como Administrador:  .\scripts\install-service.ps1

param(
  [string]$NombreServicio = "PizzeriaBarbosa",
  [int]$Puerto = 3000,
  [string]$RutaNssm = "nssm",
  # Por defecto el servicio queda en arranque MANUAL (para instancias que
  # comparten puerto con otra y no deben pelearlo tras un reinicio). Pasar
  # -InicioAutomatico una vez que esta instancia quede en producción final.
  [switch]$InicioAutomatico
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$standalone = Join-Path $raiz ".next\standalone"

# Verificaciones previas
try { $nssm = (Get-Command $RutaNssm).Source } catch {
  throw "No se encontró nssm. Descárgalo de https://nssm.cc y agrégalo al PATH o usa -RutaNssm."
}
$node = (Get-Command node).Source
if (-not (Test-Path (Join-Path $standalone "server.js"))) {
  throw "No existe .next\standalone\server.js: corre 'pnpm build' primero."
}
if (-not (Test-Path (Join-Path $raiz ".env"))) {
  throw "Falta el archivo .env con las credenciales de la sucursal."
}

# El build standalone necesita los estáticos y el .env junto a server.js
Write-Host "Copiando estáticos y .env al build standalone..."
Copy-Item (Join-Path $raiz ".next\static") (Join-Path $standalone ".next\static") -Recurse -Force
if (Test-Path (Join-Path $raiz "public")) {
  Copy-Item (Join-Path $raiz "public") (Join-Path $standalone "public") -Recurse -Force
}
Copy-Item (Join-Path $raiz ".env") (Join-Path $standalone ".env") -Force

# Carpeta de logs del servicio
$logs = Join-Path $raiz "logs"
New-Item -ItemType Directory -Force $logs | Out-Null

# Reinstalar el servicio si ya existía
if (Get-Service $NombreServicio -ErrorAction SilentlyContinue) {
  Write-Host "El servicio ya existe: deteniéndolo y reinstalando..."
  & $nssm stop $NombreServicio | Out-Null
  & $nssm remove $NombreServicio confirm | Out-Null
}

Write-Host "Registrando el servicio '$NombreServicio' (puerto $Puerto)..."
& $nssm install $NombreServicio $node "server.js"
& $nssm set $NombreServicio AppDirectory $standalone
& $nssm set $NombreServicio AppEnvironmentExtra "PORT=$Puerto" "HOSTNAME=0.0.0.0" "NODE_ENV=production"
& $nssm set $NombreServicio AppStdout (Join-Path $logs "servicio.log")
& $nssm set $NombreServicio AppStderr (Join-Path $logs "servicio-error.log")
& $nssm set $NombreServicio AppRotateFiles 1
& $nssm set $NombreServicio AppRotateBytes 10485760
$tipoInicio = if ($InicioAutomatico) { "SERVICE_AUTO_START" } else { "SERVICE_DEMAND_START" }
& $nssm set $NombreServicio Start $tipoInicio
$descripcion = if ($InicioAutomatico) {
  "POS Pizzeria Barbosa (Next.js): inicia con Windows"
} else {
  "POS Pizzeria Barbosa (Next.js): arranque manual (puerto compartido con otra instancia)"
}
& $nssm set $NombreServicio Description $descripcion
& $nssm start $NombreServicio

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
  Select-Object -First 1).IPAddress
Write-Host ""
if ($InicioAutomatico) {
  Write-Host "Listo. El POS quedó como servicio de Windows con inicio automático."
} else {
  Write-Host "Listo. El POS quedó como servicio de Windows en arranque MANUAL."
  Write-Host "  Tras un reinicio de la PC no arranca solo: usa Start-Service $NombreServicio."
  Write-Host "  Para pasarlo a automático en el go-live final: nssm set $NombreServicio Start SERVICE_AUTO_START"
}
Write-Host "  Local:   http://localhost:$Puerto"
if ($ip) { Write-Host "  En LAN:  http://${ip}:$Puerto" }
Write-Host "  Logs:    $logs"
