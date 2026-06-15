import DataTable, { Column } from '../components/DataTable';

interface Versement {
  id: string;
  montant: number;
  banque: string;
  bordereau: string;
  statut: string;
  pdv?: { name: string };
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const columns: Column<Versement>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'banque', header: 'Banque' },
  { key: 'bordereau', header: 'Bordereau' },
  { key: 'montant', header: 'Montant', align: 'right', render: (r) => `${fmt(r.montant)} F` },
  { key: 'statut', header: 'Statut' },
];

export default function Versements() {
  return <DataTable<Versement> title="Versements" endpoint="/versements" columns={columns} searchable={false} />;
}
