import { inputClass, labelClass } from './formStyles';

/**
 * FormInput — labeled input with the shared responsive styling.
 * For inputs without a label, just use the exported `inputClass` directly.
 *
 * Usage:
 *   <FormInput label="Amount" type="number" value={x} onChange={...} />
 *   <FormInput label="Note" hint="Optional" placeholder="..." />
 */
export default function FormInput({ label, hint, error, className = '', id, ...props }) {
  const inputId = id || (label ? `fi-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div>
      {label && <label htmlFor={inputId} className={labelClass}>{label}</label>}
      <input id={inputId} className={`${inputClass} ${className}`} {...props} />
      {error
        ? <p className="text-xs text-red-600 mt-1">{error}</p>
        : hint && <p className="text-xs text-t-muted mt-1">{hint}</p>}
    </div>
  );
}
