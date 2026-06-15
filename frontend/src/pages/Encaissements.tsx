import DataTable, { Column } from '../components/DataTable';

interface Encaissement {
  id: string;
  type: string;
  formule: string;
  montant: number;
  mode_paiement: string;
  statut: string;
  pdv?: { name: string };
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const columns: Column<Encaissement>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'type', header: 'Type' },
  { key: 'formule', header: 'Formule' },
  { key: 'mode_paiement', header: 'Mode' },
  { key: 'montant', header: 'Montant', align: 'right', render: (r) => `${fmt(r.montant)} F` },
  { key: 'statut', header: 'Statut' },
];

export default function Encaissements() {
  return <DataTable<Encaissement> title="Encaissements" endpoint="/encaissements" columns={columns} searchable={false} />;
}
