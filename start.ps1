# SENDISTRI - Script de demarrage Windows (sans Docker)
# Usage : .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "         SENDISTRI - Demarrage                  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verifications prerequis
function Check-Command($cmd, $url) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERREUR : '$cmd' n'est pas installe. Installe-le depuis : $url" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK : $cmd detecte" -ForegroundColor Green
}

Check-Command "node" "https://nodejs.org"
Check-Command "npm"  "https://nodejs.org"

Write-Host ""

# ── PostgreSQL ───────────────────────────────────────────────────────────────

Write-Host "Verification de PostgreSQL..." -ForegroundColor Yellow

$pgInstalled = Get-Command "psql" -ErrorAction SilentlyContinue
if (-not $pgInstalled) {
    Write-Host "Installation de PostgreSQL via winget..." -ForegroundColor Yellow
    winget install --id PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
    $env:Path += ";C:\Program Files\PostgreSQL\16\bin"
    Write-Host "OK : PostgreSQL installe" -ForegroundColor Green
} else {
    Write-Host "OK : PostgreSQL detecte" -ForegroundColor Green
}

# Demarrer le service PostgreSQL
Write-Host "Demarrage du service PostgreSQL..." -ForegroundColor Yellow
Start-Service -Name "postgresql*" -ErrorAction SilentlyContinue
Start-Sleep 2

# Ajouter psql au PATH si besoin
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin"
)
foreach ($p in $pgPaths) {
    if (Test-Path $p) {
        $env:Path += ";$p"
        break
    }
}

# Creer user et base de donnees
Write-Host "Configuration de la base de donnees..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"

# Creer user sendistri
psql -U postgres -h localhost -c "CREATE USER sendistri WITH PASSWORD 'sendistri';" 2>&1 | Out-Null
# Creer la base
psql -U postgres -h localhost -c "CREATE DATABASE sendistri OWNER sendistri;" 2>&1 | Out-Null
Write-Host "OK : Base de donnees prete" -ForegroundColor Green

# ── Redis (optionnel) ────────────────────────────────────────────────────────

Write-Host "Verification de Redis..." -ForegroundColor Yellow
$redisInstalled = Get-Command "redis-server" -ErrorAction SilentlyContinue

if (-not $redisInstalled) {
    Write-Host "Installation de Redis via winget..." -ForegroundColor Yellow
    winget install --id Redis.Redis --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
    $env:Path += ";C:\Program Files\Redis"
}

# Demarrer Redis en arriere-plan
$redisProc = $null
if (Get-Command "redis-server" -ErrorAction SilentlyContinue) {
    Write-Host "Demarrage de Redis..." -ForegroundColor Yellow
    $redisProc = Start-Process -FilePath "redis-server" -PassThru -WindowStyle Hidden
    Start-Sleep 1
    Write-Host "OK : Redis demarre" -ForegroundColor Green
} else {
    Write-Host "ATTENTION : Redis non disponible, le cache sera desactive" -ForegroundColor Yellow
}

# ── Backend ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Installation des dependances backend..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

# Ecrire le .env avec les bons parametres
$envContent = @"
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://sendistri:sendistri@localhost:5432/sendistri
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=sendistri-access-secret-key-super-secure-32chars
JWT_REFRESH_SECRET=sendistri-refresh-secret-key-super-secure-32chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
"@
Set-Content ".env" $envContent
Write-Host "OK : Fichier .env configure" -ForegroundColor Green

npm install --silent

Write-Host "Deploiement du schema base de donnees..." -ForegroundColor Yellow
npx prisma db push --skip-generate 2>&1 | Out-Null
Write-Host "OK : Schema deploye" -ForegroundColor Green

# Creer le compte admin
$adminScript = @'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@sendistri.com' } });
  if (existing) { console.log('exists'); await prisma.$disconnect(); return; }
  const hash = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.create({ data: { email: 'admin@sendistri.com', password_hash: hash, role: 'SUPER', is_active: true } });
  console.log('created');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
'@

$result = node -e $adminScript
if ($result -eq "created") {
    Write-Host "OK : Compte admin cree (admin@sendistri.com / Admin1234!)" -ForegroundColor Green
} else {
    Write-Host "OK : Compte admin deja existant" -ForegroundColor Green
}

Write-Host "Demarrage du backend (port 4000)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

# Attendre que le backend reponde
Write-Host "Attente du backend..." -ForegroundColor Yellow
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
            -Method POST -ContentType "application/json" `
            -Body '{"email":"x","password":"x"}' `
            -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
        break
    } catch { Start-Sleep 1 }
}
Write-Host "OK : Backend pret sur http://localhost:4000" -ForegroundColor Green

# ── Frontend ─────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Installation des dependances frontend..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install --silent

Write-Host "Demarrage du frontend (port 5173)..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

Start-Sleep 3

# ── Resume ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "          SENDISTRI est pret !                  " -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Application  ->  http://localhost:5173        " -ForegroundColor Cyan
Write-Host "  API Backend  ->  http://localhost:4000        " -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Email        :  admin@sendistri.com           " -ForegroundColor Cyan
Write-Host "  Mot de passe :  Admin1234!                    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Ouvrir le navigateur
Start-Process "http://localhost:5173"

Write-Host "Appuie sur Entree pour arreter..." -ForegroundColor Yellow
Read-Host

# Arret
Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
if ($redisProc) { Stop-Process -Id $redisProc.Id -ErrorAction SilentlyContinue }
Write-Host "Arrete." -ForegroundColor Green
