/**
 * ResponsiveTable Component
 * Automatically converts between table layout (desktop) and card layout (mobile)
 * Usage:
 *   <ResponsiveTable
 *     columns={[{ key: 'name', label: 'Name' }, { key: 'amount', label: 'Amount' }]}
 *     data={[{ id: 1, name: 'John', amount: '$100' }]}
 *     rowRenderer={(row) => <tr>...</tr>}  // Optional: for custom table rows
 *     cardRenderer={(row) => <div>...</div>}  // Optional: for custom card layout
 *   />
 */

export default function ResponsiveTable({
  columns = [],
  data = [],
  rowRenderer,
  cardRenderer,
  loading = false,
  emptyMessage = 'No data found',
  className = ''
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="p-8 text-center text-t-muted text-sm">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto bg-surface rounded-xl shadow-sm border border-b-secondary">
        <table className={`w-full ${className}`}>
          <thead className="bg-elevated">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 lg:px-6 py-3 text-left text-xs font-medium text-t-tertiary uppercase ${
                    col.className || ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-b-secondary">
            {data.map((row, idx) =>
              rowRenderer ? (
                rowRenderer(row, idx)
              ) : (
                <tr key={row.id || idx} className="hover:bg-hover transition-colors">
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 lg:px-6 py-4 text-sm text-t-secondary ${col.cellClassName || ''}`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (visible only on mobile) */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) =>
          cardRenderer ? (
            cardRenderer(row, idx)
          ) : (
            <div
              key={row.id || idx}
              className="bg-surface rounded-lg shadow-sm border border-b-secondary p-4 space-y-2"
            >
              {columns.map(col => (
                <div key={col.key} className="flex justify-between items-start gap-2 text-sm">
                  <span className="font-medium text-t-secondary">{col.label}:</span>
                  <span className={`text-right text-t-primary ${col.cellClassName || ''}`}>
                    {row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
