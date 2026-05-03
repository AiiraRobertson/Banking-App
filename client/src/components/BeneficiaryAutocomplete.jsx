import { useState, useEffect, useRef } from 'react';
import { listBeneficiaries, touchBeneficiary, deleteBeneficiary } from '../services/beneficiaryService';

export default function BeneficiaryAutocomplete({
  value,
  onChange,
  onSelect,
  type,
  placeholder = 'Type name or account number...',
  required = false,
  autoFocus = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      listBeneficiaries({ q: value, type, limit: 8 })
        .then(res => setSuggestions(res.data.beneficiaries || []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [value, type]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (b) => {
    onSelect?.(b);
    setOpen(false);
    setHighlight(-1);
    try { await touchBeneficiary(b.id); } catch {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Remove this beneficiary?')) return;
    try {
      await deleteBeneficiary(id);
      setSuggestions(s => s.filter(b => b.id !== id));
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full px-3 py-2 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        autoComplete="off"
      />
      {open && value.length >= 1 && (
        <div className="absolute z-30 w-full mt-1 bg-surface border border-b-primary rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-t-muted">Searching...</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-xs text-t-muted">No saved beneficiaries match "{value}"</div>
          )}
          {suggestions.map((b, idx) => (
            <button
              type="button"
              key={b.id}
              onClick={() => handleSelect(b)}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 text-sm transition-colors ${
                highlight === idx ? 'bg-elevated' : 'hover:bg-hover'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-t-primary truncate">
                  {b.nickname || b.account_name}
                  {b.nickname && <span className="text-t-tertiary font-normal ml-1.5">· {b.account_name}</span>}
                </div>
                <div className="text-xs text-t-tertiary truncate">
                  <span className="font-mono">{b.account_number}</span>
                  {b.bank_name && <span> · {b.bank_name}</span>}
                  {b.bank_country && <span> · {b.bank_country}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.use_count > 0 && (
                  <span className="text-[10px] text-t-muted bg-elevated px-1.5 py-0.5 rounded">
                    {b.use_count}×
                  </span>
                )}
                <span
                  onClick={(e) => handleDelete(e, b.id)}
                  className="text-t-muted hover:text-red-500 cursor-pointer p-0.5"
                  title="Remove">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
