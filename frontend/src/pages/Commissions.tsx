import DataTable, { Column } from '../components/DataTable';

interface Commission {
  id: string;
  periode: string;
  montant_base: string;
  montant_bonus: string;
  montant_total: string;
  statut: string;
  pdv?: { name: string };
}

const fmt = (n: string) => new Intl.NumberFormat('fr-FR').format(Number(n));

const columns: Column<Commission>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'periode', header: 'Période' },
  { key: 'montant_base', header: 'Base', align: 'right', render: (r) => `${fmt(r.montant_base)} F` },
  { key: 'montant_bonus', header: 'Bonus', align: 'right', render: (r) => `${fmt(r.montant_bonus)} F` },
  { key: 'montant_total', header: 'Total', align: 'right', render: (r) => `${fmt(r.montant_total)} F` },
  { key: 'statut', header: 'Statut' },
];

export default function Commissions() {
  return <DataTable<Commission> title="Commissions" endpoint="/commissions" columns={columns} searchable={false} />;
}
