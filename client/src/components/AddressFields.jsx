import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, STATES_BY_COUNTRY, POSTAL_API_COUNTRIES, lookupPostal } from '../utils/countryStates';

/**
 * Country-aware address fields. Picking the country drives:
 *  - state/region dropdown (from STATES_BY_COUNTRY when known, otherwise free text)
 *  - postal-code lookup (zippopotam.us) which auto-fills city + state
 *
 * Props:
 *   value: { country, address, city, state, zip_code }
 *   onChange: (next) => void
 *   showAddressLine: boolean (default true)
 *   countryLabel: string (defaults to "Country")
 *   inputClass: string applied to inputs/selects
 */
export default function AddressFields({
  value,
  onChange,
  showAddressLine = true,
  countryLabel = 'Country',
  inputClass = '',
  required = true,
}) {
  const v = value || {};
  const [lookupStatus, setLookupStatus] = useState('idle');
  const lastLookupRef = useRef('');

  const set = (patch) => onChange({ ...v, ...patch });

  const states = STATES_BY_COUNTRY[v.country] || [];
  const supportsPostal = v.country && POSTAL_API_COUNTRIES.has(v.country);

  useEffect(() => {
    if (!v.country || !v.zip_code) {
      setLookupStatus('idle');
      return;
    }
    if (!supportsPostal) {
      setLookupStatus('unsupported');
      return;
    }
    const key = `${v.country}|${v.zip_code.trim()}`;
    if (key === lastLookupRef.current) return;
    const handle = setTimeout(async () => {
      lastLookupRef.current = key;
      setLookupStatus('loading');
      const found = await lookupPostal(v.country, v.zip_code);
      if (!found) {
        setLookupStatus('not-found');
        return;
      }
      const patch = {};
      if (!v.city) patch.city = found.city;
      if (!v.state && (found.state || found.stateAbbr)) {
        const stateName = found.state || found.stateAbbr;
        if (states.length === 0 || states.includes(stateName)) {
          patch.state = stateName;
        } else if (found.stateAbbr && states.includes(found.stateAbbr)) {
          patch.state = found.stateAbbr;
        }
      }
      if (Object.keys(patch).length) set(patch);
      setLookupStatus('found');
    }, 500);
    return () => clearTimeout(handle);
  }, [v.country, v.zip_code]);

  const onCountry = (e) => {
    const country = e.target.value;
    set({ country, state: '' });
    lastLookupRef.current = '';
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-t-secondary mb-1">{countryLabel}</label>
        <select
          value={v.country || ''}
          onChange={onCountry}
          className={inputClass}
          required={required}
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      {showAddressLine && (
        <div>
          <label className="block text-sm font-medium text-t-secondary mb-1">Street Address</label>
          <input
            type="text"
            value={v.address || ''}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="123 Main Street"
            className={inputClass}
            required={required}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-t-secondary mb-1">
            Postal / ZIP Code
            {lookupStatus === 'loading' && (
              <span className="ml-2 text-xs text-indigo-600">looking up…</span>
            )}
            {lookupStatus === 'found' && (
              <span className="ml-2 text-xs text-green-600">✓ matched</span>
            )}
            {lookupStatus === 'not-found' && v.zip_code && (
              <span className="ml-2 text-xs text-amber-600">not found</span>
            )}
          </label>
          <input
            type="text"
            value={v.zip_code || ''}
            onChange={(e) => set({ zip_code: e.target.value })}
            disabled={!v.country}
            className={inputClass}
            required={required}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-t-secondary mb-1">City</label>
          <input
            type="text"
            value={v.city || ''}
            onChange={(e) => set({ city: e.target.value })}
            disabled={!v.country}
            placeholder={supportsPostal ? 'Auto-fills from postal code' : ''}
            className={inputClass}
            required={required}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-t-secondary mb-1">State / Region</label>
          {states.length > 0 ? (
            <select
              value={v.state || ''}
              onChange={(e) => set({ state: e.target.value })}
              className={inputClass}
              required={required}
            >
              <option value="">Select…</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={v.state || ''}
              onChange={(e) => set({ state: e.target.value })}
              disabled={!v.country}
              className={inputClass}
              required={required}
            />
          )}
        </div>
      </div>

      {v.country && !supportsPostal && (
        <p className="text-xs text-t-tertiary">
          Postal-code lookup isn't available for this country — please enter city and region manually.
        </p>
      )}
    </div>
  );
}
