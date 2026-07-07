# Actualiza el POS de la sucursal: código, dependencias, migraciones y build,
# y reinicia el servicio. Ejecutar como Administrador desde la raíz del repo:
#   .\scripts\update.ps1

param(
  [string]$NombreServicio = "PizzeriaBarbosa",
  [string]$RutaNssm = "nssm"
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

try { $nssm = (Get-Command $RutaNssm).Source } catch {
  throw "No se encontró nssm. Usa -RutaNssm si no está en el PATH."
}

Write-Host "1/5 Descargando cambios (git pull)..."
git pull

Write-Host "2/5 Instalando dependencias..."
pnpm install --frozen-lockfile

Write-Host "3/5 Aplicando migraciones (DIRECT_URL)..."
pnpm prisma migrate deploy

Write-Host "4/5 Compilando build de producción..."
pnpm build

$standalone = Join-Path $raiz ".next\standalone"
Copy-Item (Join-Path $raiz ".next\static") (Join-Path $standalone ".next\static") -Recurse -Force
if (Test-Path (Join-Path $raiz "public")) {
  Copy-Item (Join-Path $raiz "public") (Join-Path $standalone "public") -Recurse -Force
}
Copy-Item (Join-Path $raiz ".env") (Join-Path $standalone ".env") -Force

Write-Host "5/5 Reiniciando el servicio '$NombreServicio'..."
& $nssm restart $NombreServicio

Write-Host "Actualización completa."
