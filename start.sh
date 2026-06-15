#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        SENDISTRI — Démarrage         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Vérifications prérequis ──────────────────────────────────────────────────

check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ '$1' n'est pas installé. Installe-le depuis : $2${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ $1 détecté${NC}"
}

check_command node   "https://nodejs.org"
check_command npm    "https://nodejs.org"
check_command docker "https://www.docker.com/products/docker-desktop"
check_command git    "https://git-scm.com"

echo ""

# ── Docker ───────────────────────────────────────────────────────────────────

echo -e "${YELLOW}▶ Démarrage PostgreSQL + Redis via Docker...${NC}"
docker compose up -d postgres redis

echo -e "${YELLOW}  Attente de PostgreSQL...${NC}"
until docker compose exec -T postgres pg_isready -U sendistri -d sendistri &>/dev/null; do
  sleep 1
done
echo -e "${GREEN}✓ PostgreSQL prêt${NC}"

# ── Backend ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}▶ Installation des dépendances backend...${NC}"
cd backend

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Fichier .env créé depuis .env.example${NC}"
  echo -e "${YELLOW}  → Tu peux modifier backend/.env pour changer les secrets JWT${NC}"
fi

npm install --silent

echo -e "${YELLOW}▶ Déploiement du schéma base de données...${NC}"
npx prisma db push --skip-generate &>/dev/null
echo -e "${GREEN}✓ Schéma déployé${NC}"

# Créer le compte admin si inexistant
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@sendistri.com' } });
  if (existing) { console.log('skip'); await prisma.\$disconnect(); return; }
  const hash = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.create({ data: { email: 'admin@sendistri.com', password_hash: hash, role: 'SUPER', is_active: true } });
  console.log('created');
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
" | grep -q "created" && echo -e "${GREEN}✓ Compte admin créé${NC}" || echo -e "${GREEN}✓ Compte admin déjà existant${NC}"

echo -e "${YELLOW}▶ Démarrage du backend (port 4000)...${NC}"
npm run dev &
BACKEND_PID=$!

echo -e "${YELLOW}  Attente du backend...${NC}"
for i in $(seq 1 20); do
  if curl -s http://localhost:4000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"x","password":"x"}' &>/dev/null; then
    break
  fi
  sleep 1
done
echo -e "${GREEN}✓ Backend prêt sur http://localhost:4000${NC}"

# ── Frontend ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}▶ Installation des dépendances frontend...${NC}"
cd ../frontend
npm install --silent

echo -e "${YELLOW}▶ Démarrage du frontend (port 5173)...${NC}"
npm run dev &
FRONTEND_PID=$!

sleep 3

# ── Résumé ───────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║            SENDISTRI est prêt !                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  🌐  Application  →  http://localhost:5173        ║"
echo "║  ⚙️   API Backend  →  http://localhost:4000        ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  📧  Email    :  admin@sendistri.com              ║"
echo "║  🔑  Mot de passe :  Admin1234!                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}  Appuie sur Ctrl+C pour arrêter l'application.${NC}"
echo ""

# Ouvrir le navigateur automatiquement selon l'OS
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173 &>/dev/null &   # Linux
elif command -v open &>/dev/null; then
  open http://localhost:5173 &>/dev/null &         # macOS
elif command -v start &>/dev/null; then
  start http://localhost:5173 &>/dev/null &        # Windows Git Bash
fi

# Attendre Ctrl+C
trap "echo ''; echo -e '${YELLOW}Arrêt en cours...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop postgres redis; echo -e '${GREEN}Arrêté.${NC}'; exit 0" INT
wait
