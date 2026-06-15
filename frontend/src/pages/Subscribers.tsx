import DataTable, { Column } from '../components/DataTable';

interface Subscriber {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  phone: string;
  formule: string;
  statut: string;
  pdv?: { name: string };
}

const columns: Column<Subscriber>[] = [
  { key: 'code', header: 'Code' },
  { key: 'nom', header: 'Nom', render: (r) => `${r.prenom} ${r.nom}` },
  { key: 'phone', header: 'Téléphone' },
  { key: 'formule', header: 'Formule' },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'statut', header: 'Statut' },
];

export default function Subscribers() {
  return <DataTable<Subscriber> title="Abonnés" endpoint="/subscribers" columns={columns} />;
}
