export type Role =
  | 'SUPER'
  | 'ADMIN'
  | 'PDV_OPERATOR'
  | 'ACCOUNTANT'
  | 'LOGISTICS'
  | 'COMMERCIAL';

export interface User {
  id: string;
  email: string;
  role: Role;
  pdvId?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Kpis {
  encaissements_jour: { montant: number; count: number };
  abonnes_actifs: number;
  decodeurs_stock: number;
  versements_en_attente: { montant: number; count: number };
  objectif_recrutement: { recrutes: number; cible: number; taux: number };
  recent_encaissements: RecentEncaissement[];
}

export interface RecentEncaissement {
  id: string;
  montant: number;
  formule: string;
  mode_paiement: string;
  created_at: string;
  pdv?: { name: string; code: string };
}

export interface Pdv {
  id: string;
  code: string;
  name: string;
  type: 'PDV' | 'PARTNER';
  secteur: string;
  region: string;
  phone?: string | null;
  email?: string | null;
  caution: string;
  solde: string;
  statut: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
