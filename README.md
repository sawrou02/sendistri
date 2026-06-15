# SENDISTRI — ERP de distribution Canal

Logiciel de gestion pour un distributeur Canal+ : points de vente, abonnés,
encaissements, versements, parc de décodeurs et commissions.

## Architecture

```
sendistri/
├── backend/     API REST sécurisée (Node + TypeScript + Express + Prisma + PostgreSQL)
└── frontend/    SPA (React + TypeScript + Vite + Tailwind)
```

## Démarrage rapide

### Backend
```bash
cd backend
npm install
cp .env.example .env        # configurer secrets / DB
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev                 # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → :3001)
```

## Sécurité

Logiciel pensé pour un usage professionnel sensible :

- **Authentification** : JWT access (15 min) + refresh token rotatif (7 j)
  en cookie `httpOnly`/`secure`/`sameSite`. Le token d'accès reste en mémoire
  côté client (pas de `localStorage`) pour limiter l'exposition au XSS.
- **RBAC** : 6 rôles (SUPER, ADMIN, PDV_OPERATOR, ACCOUNTANT, LOGISTICS, COMMERCIAL).
- **Isolation par PDV** : un opérateur n'accède qu'aux données de son point de vente.
- **Rate limiting** : global + strict sur `/auth/login`.
- **Audit log** : chaque requête mutante est tracée (utilisateur, IP, ressource).
- **Durcissement** : Helmet (CSP, HSTS), CORS restreint, validation Zod, body ≤ 10 kb.

## Comptes de démo

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@sendistri.com | `Admin@1234!` | SUPER |
| gestionnaire@sendistri.com | `Admin@1234!` | ADMIN |
| comptable@sendistri.com | `Admin@1234!` | ACCOUNTANT |
| pdv1@sendistri.com | `Admin@1234!` | PDV_OPERATOR |

> ⚠️ À changer impérativement en production.

## CI

GitHub Actions (`.github/workflows/ci.yml`) : typecheck, build et audit de
sécurité du backend et du frontend à chaque push / PR.
