# SENDISTRI — Backend API

API REST sécurisée pour l'ERP SENDISTRI (distribution canal TV).

## Stack
- Node.js + TypeScript + Express
- Prisma ORM (PostgreSQL)
- Redis (rate limiting)
- JWT (access + refresh tokens rotatifs)
- Zod (validation), Winston (logs), Helmet (sécurité)

## Démarrage

```bash
npm install
cp .env.example .env          # puis éditer les secrets
npx prisma generate
npx prisma migrate dev        # crée le schéma
npx prisma db seed            # données de démo + comptes
npm run dev                   # http://localhost:3001
```

Vérifier : `GET /health` → `{ "status": "ok" }`

## Scripts
| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur en mode watch |
| `npm run build` | Compilation TypeScript → `dist/` |
| `npm start` | Lance la version compilée |
| `npm run prisma:migrate` | Migration de la base |
| `npm run prisma:seed` | Seed des données de démo |

## Comptes de démo (après seed)
| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@sendistri.com | `Admin@1234!` | SUPER |
| gestionnaire@sendistri.com | `Admin@1234!` | ADMIN |
| comptable@sendistri.com | `Admin@1234!` | ACCOUNTANT |
| pdv1@sendistri.com | `Admin@1234!` | PDV_OPERATOR |

> ⚠️ Changer ces mots de passe en production.

## Sécurité
- JWT access (15 min) + refresh token rotatif (7 j) en cookie `httpOnly` / `secure` / `sameSite`
- Rate limiting : global (100/15 min) + strict sur `/auth/login` (5/15 min)
- Helmet (CSP strict, HSTS), CORS restreint, body limité à 10 kb
- Validation Zod sur toutes les entrées
- Isolation par PDV : un opérateur n'accède qu'aux données de son point de vente
- Audit log de chaque requête mutante (utilisateur, IP, ressource)
- Mots de passe hashés bcrypt, jamais loggés

## API (`/api/v1`)
`auth` · `users` · `pdvs` · `subscribers` · `encaissements` · `versements` · `decoders` · `dashboard` · `commissions`
