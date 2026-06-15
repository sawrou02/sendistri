import { Request } from 'express';

// ─── Role Enum ───────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN',
  PDV_OPERATOR = 'PDV_OPERATOR',
  ACCOUNTANT = 'ACCOUNTANT',
  LOGISTICS = 'LOGISTICS',
  COMMERCIAL = 'COMMERCIAL',
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: UserRole;
  pdvId?: string;
}

// ─── Request extensions ───────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]> | string[];
}

// ─── Role permissions map ────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER]: [
    'users',
    'pdvs',
    'encaissements',
    'versements',
    'subscribers',
    'decoders',
    'commissions',
    'audit',
    'dashboard',
    'objectifs',
    'localites',
    'reports',
  ],
  [UserRole.ADMIN]: [
    'pdvs',
    'encaissements',
    'versements',
    'subscribers',
    'decoders',
    'commissions',
    'audit',
    'dashboard',
    'objectifs',
    'localites',
    'reports',
  ],
  [UserRole.PDV_OPERATOR]: [
    'encaissements',
    'versements',
    'subscribers',
    'dashboard',
  ],
  [UserRole.ACCOUNTANT]: [
    'encaissements',
    'versements',
    'commissions',
    'dashboard',
    'reports',
  ],
  [UserRole.LOGISTICS]: ['decoders', 'dashboard'],
  [UserRole.COMMERCIAL]: [
    'pdvs',
    'subscribers',
    'objectifs',
    'commissions',
    'dashboard',
    'reports',
  ],
};

// ─── Misc types ───────────────────────────────────────────────────────────────

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export interface KPIData {
  encaissements_jour: number;
  abonnes_actifs: number;
  decodeurs_stock: number;
  objectif_mplus: {
    recrutes: number;
    cible: number;
    taux: number;
  };
  versements_en_attente: number;
  recent_encaissements: RecentEncaissement[];
}

export interface RecentEncaissement {
  id: string;
  pdv: string;
  montant: number;
  formule: string;
  mode_paiement: string;
  created_at: Date;
}
