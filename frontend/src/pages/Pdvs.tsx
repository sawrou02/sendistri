import DataTable, { Column } from '../components/DataTable';
import type { Pdv } from '../types';

const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    SUSPENDED: 'bg-red-100 text-sendistri-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Pdv>[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Nom' },
  { key: 'type', header: 'Type' },
  { key: 'region', header: 'Région' },
  { key: 'solde', header: 'Solde', align: 'right', render: (r) => `${fmt(r.solde)} F` },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

export default function Pdvs() {
  return <DataTable<Pdv> title="Points de vente" endpoint="/pdvs" columns={columns} />;
}
