import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listBeneficiaries,
  updateBeneficiary,
  deleteBeneficiary,
} from '../services/beneficiaryService';

const TYPE_LABEL = {
  internal: { label: 'Internal', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  external: { label: 'External', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  wire: { label: 'Wire', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export default function BeneficiariesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (typeFilter) params.type = typeFilter;
      const { data } = await listBeneficiaries(params);
      setItems(data.beneficiaries || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, typeFilter]);

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditValue(b.nickname || '');
  };

  const saveEdit = async (id) => {
    try {
      await updateBeneficiary(id, { nickname: editValue });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update nickname');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBeneficiary(id);
      setConfirmId(null);
      setItems((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  const sendTransfer = (b) => {
    const route = b.type === 'wire' ? '/wire-transfer' : '/transfer';
    navigate(route, { state: { beneficiary: b } });
  };

  return (
    <div className="bg-3d min-h-full p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-t-primary">Saved Beneficiaries</h1>
            <p className="text-sm text-t-tertiary mt-1">
              People and accounts you've sent money to. Click any to start a new transfer.
            </p>
          </div>
        </div>

        <div className="card-3d rounded-2xl p-4 sm:p-6 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-t-tertiary mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, account number, bank, or nickname"
                className="w-full px-3 py-2 border border-b-input rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-t-tertiary mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-b-input rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">All</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="wire">Wire</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-t-tertiary py-12">Loading beneficiaries…</div>
        ) : items.length === 0 ? (
          <div className="card-3d rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-t-primary mb-1">No beneficiaries yet</h3>
            <p className="text-sm text-t-tertiary mb-4">
              When you send a transfer, you can save the recipient for next time.
            </p>
            <button
              onClick={() => navigate('/transfer')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Make a transfer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((b) => {
              const meta = TYPE_LABEL[b.type] || TYPE_LABEL.internal;
              const isEditing = editingId === b.id;
              const isConfirming = confirmId === b.id;
              return (
                <div key={b.id} className="card-3d rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Nickname"
                            className="flex-1 px-2 py-1 border border-b-input rounded text-sm"
                            autoFocus
                            maxLength={50}
                          />
                          <button
                            onClick={() => saveEdit(b.id)}
                            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 text-t-tertiary hover:text-t-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-t-primary truncate">
                              {b.nickname || b.account_name}
                            </h3>
                            <button
                              onClick={() => startEdit(b)}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                              title="Edit nickname"
                            >
                              ✎
                            </button>
                          </div>
                          {b.nickname && (
                            <p className="text-xs text-t-tertiary truncate">{b.account_name}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="text-sm text-t-secondary space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-t-tertiary">Account</span>
                      <span className="font-mono">•••• {String(b.account_number).slice(-4)}</span>
                    </div>
                    {b.bank_name && (
                      <div className="flex justify-between gap-2">
                        <span className="text-t-tertiary">Bank</span>
                        <span className="truncate max-w-[60%] text-right">{b.bank_name}</span>
                      </div>
                    )}
                    {b.bank_country && (
                      <div className="flex justify-between gap-2">
                        <span className="text-t-tertiary">Country</span>
                        <span>{b.bank_country}</span>
                      </div>
                    )}
                    {b.swift_code && (
                      <div className="flex justify-between gap-2">
                        <span className="text-t-tertiary">SWIFT</span>
                        <span className="font-mono">{b.swift_code}</span>
                      </div>
                    )}
                    {b.iban && (
                      <div className="flex justify-between gap-2">
                        <span className="text-t-tertiary">IBAN</span>
                        <span className="font-mono truncate max-w-[60%] text-right">{b.iban}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 pt-1 text-xs text-t-tertiary border-t border-b-secondary">
                      <span>Used {b.use_count || 0}×</span>
                      {b.last_used_at && (
                        <span>Last: {new Date(b.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                      <span className="text-xs text-red-700">Delete this beneficiary?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs px-2 py-1 text-t-tertiary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendTransfer(b)}
                        className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                      >
                        Send transfer
                      </button>
                      <button
                        onClick={() => setConfirmId(b.id)}
                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
