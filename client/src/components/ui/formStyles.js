/**
 * Shared form-control styling.
 *
 * `inputClass` is the canonical class string for text inputs / selects / textareas,
 * matching the pattern already used in LoginPage. Apply it to plain elements or pass
 * it to <PasswordInput className={inputClass} />.
 *
 * Note: the `text-xs sm:text-sm` here only affects sizing at ≥640px — index.css forces
 * a 16px floor below 640px to prevent iOS Safari auto-zoom on focus.
 */
export const inputClass =
  'w-full px-3 py-2.5 border border-b-input rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs sm:text-sm hover:border-indigo-300';

export const labelClass = 'block text-xs sm:text-sm font-medium text-t-secondary mb-1.5';
