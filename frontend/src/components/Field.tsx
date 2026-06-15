import { ReactNode } from 'react';

interface BaseProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}

export function TextField({ label, name, value, onChange, required, type = 'text' }: BaseProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sendistri-green"
      />
    </label>
  );
}

interface SelectProps extends Omit<BaseProps, 'type'> {
  options: { value: string; label: string }[];
}

export function SelectField({ label, name, value, onChange, required, options }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sendistri-green"
      >
        <option value="">— Sélectionner —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormActions({ onCancel, submitting, children }: { onCancel: () => void; submitting?: boolean; children?: ReactNode }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {children ?? (submitting ? 'Enregistrement…' : 'Enregistrer')}
      </button>
    </div>
  );
}
