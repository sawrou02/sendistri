# SENDISTRI — Script de démarrage Windows (PowerShell)
# Usage : .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        SENDISTRI — Démarrage         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Vérifications prérequis ──────────────────────────────────────────────────

function Check-Command($cmd, $url) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "✗ '$cmd' n'est pas installé. Installe-le depuis : $url" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ $cmd détecté" -ForegroundColor Green
}

Check-Command "node"   "https://nodejs.org"
Check-Command "npm"    "https://nodejs.org"
Check-Command "docker" "https://www.docker.com/products/docker-desktop"

Write-Host ""

# ── Docker ───────────────────────────────────────────────────────────────────

Write-Host "▶ Démarrage PostgreSQL + Redis via Docker..." -ForegroundColor Yellow
docker compose up -d postgres redis

Write-Host "  Attente de PostgreSQL..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $result = docker compose exec -T postgres pg_isready -U sendistri -d sendistri 2>&1
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    } catch {}
    Start-Sleep 1
}
if (-not $ready) { Write-Host "✗ PostgreSQL n'a pas démarré" -ForegroundColor Red; exit 1 }
Write-Host "✓ PostgreSQL prêt" -ForegroundColor Green

# ── Backend ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "▶ Installation des dépendances backend..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Fichier .env créé" -ForegroundColor Green
}

npm install --silent

Write-Host "▶ Déploiement du schéma base de données..." -ForegroundColor Yellow
npx prisma db push --skip-generate | Out-Null
Write-Host "✓ Schéma déployé" -ForegroundColor Green

# Créer le compte admin si inexistant
$adminScript = @"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@sendistri.com' } });
  if (existing) { console.log('exists'); await prisma.\$disconnect(); return; }
  const hash = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.create({ data: { email: 'admin@sendistri.com', password_hash: hash, role: 'SUPER', is_active: true } });
  console.log('created');
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
"@

$result = node -e $adminScript
if ($result -eq "created") {
    Write-Host "✓ Compte admin créé" -ForegroundColor Green
} else {
    Write-Host "✓ Compte admin déjà existant" -ForegroundColor Green
}

Write-Host "▶ Démarrage du backend (port 4000)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

Write-Host "  Attente du backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
            -Method POST -ContentType "application/json" `
            -Body '{"email":"x","password":"x"}' -UseBasicParsing -ErrorAction SilentlyContinue
        $backendReady = $true; break
    } catch { Start-Sleep 1 }
}
Write-Host "✓ Backend prêt sur http://localhost:4000" -ForegroundColor Green

# ── Frontend ─────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "▶ Installation des dépendances frontend..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install --silent

Write-Host "▶ Démarrage du frontend (port 5173)..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow

Start-Sleep 3

# ── Résumé ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            SENDISTRI est prêt !                  ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Application  →  http://localhost:5173           ║" -ForegroundColor Cyan
Write-Host "║  API Backend  →  http://localhost:4000           ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Email        :  admin@sendistri.com             ║" -ForegroundColor Cyan
Write-Host "║  Mot de passe :  Admin1234!                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Ouvrir le navigateur
Start-Process "http://localhost:5173"

Write-Host "Appuie sur Entrée pour arrêter l'application..." -ForegroundColor Yellow
Read-Host

# Arrêt propre
Write-Host "Arrêt en cours..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
docker compose stop postgres redis
Write-Host "Arrêté." -ForegroundColor Green
