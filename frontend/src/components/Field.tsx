import { ReactNode } from 'react';

interface BaseProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}

const labelCls = 'mb-1.5 block text-[12px] font-bold uppercase tracking-[0.03em]';
const fieldCls = 'w-full rounded-[9px] px-3 py-2.5 text-[13.5px] outline-none transition-colors';
const fieldStyle: React.CSSProperties = { border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)' };

export function TextField({ label, name, value, onChange, required, type = 'text' }: BaseProps) {
  return (
    <label className="block">
      <span className={labelCls} style={{ color: 'var(--text-2)' }}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldCls}
        style={fieldStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
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
      <span className={labelCls} style={{ color: 'var(--text-2)' }}>{label}</span>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldCls} cursor-pointer`}
        style={fieldStyle}
      >
        <option value="">— Sélectionner —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
        className="rounded-[9px] px-4 py-2 text-sm font-semibold"
        style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface)' }}
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-[9px] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        style={{ background: 'var(--green)', boxShadow: '0 3px 10px rgba(14,138,79,0.25)' }}
      >
        {children ?? (submitting ? 'Enregistrement…' : 'Enregistrer')}
      </button>
    </div>
  );
}
