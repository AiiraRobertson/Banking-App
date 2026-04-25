import { validatePassword } from '../../utils/passwordValidation';

export default function PasswordRequirements({ password, mode = 'checklist' }) {
  if (mode === 'hint') {
    return (
      <p className="text-xs text-gray-400 mt-1.5">
        Password requires: 8+ chars, uppercase, lowercase, number, special character (!@#$%^&*)
      </p>
    );
  }

  const results = validatePassword(password);

  return (
    <div className="mt-2 space-y-1">
      {results.map(req => (
        <div key={req.id} className="flex items-center gap-1.5 text-xs">
          {password.length === 0 ? (
            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0" />
          ) : req.met ? (
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 inline-block shrink-0" />
          )}
          <span className={password.length > 0 && req.met ? 'text-green-600' : 'text-gray-500'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}
