import DataTable, { Column } from '../components/DataTable';

interface Decoder {
  id: string;
  serial: string;
  type: string;
  model?: string | null;
  statut: string;
  pdv?: { name: string } | null;
}

const columns: Column<Decoder>[] = [
  { key: 'serial', header: 'N° série' },
  { key: 'type', header: 'Type' },
  { key: 'model', header: 'Modèle' },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '— (stock)' },
  { key: 'statut', header: 'Statut' },
];

export default function Decoders() {
  return <DataTable<Decoder> title="Décodeurs" endpoint="/decoders" columns={columns} searchable={false} />;
}
