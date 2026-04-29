import { useState, useEffect } from 'react';
import { getNotifications, markRead, markAllRead } from '../services/notificationService';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo } from '../utils/formatDate';

const typeIcons = {
  transaction: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  security: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
};

const typeColors = {
  transaction: 'bg-blue-50 text-blue-600',
  alert: 'bg-yellow-50 text-yellow-600',
  info: 'bg-indigo-50 text-indigo-600',
  security: 'bg-green-50 text-green-600'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useNotifications();

  const fetchNotifications = () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filter === 'unread') params.unread_only = true;
    if (filter !== 'all' && filter !== 'unread') params.type = filter;

    getNotifications(params)
      .then(res => { setNotifications(res.data.notifications); setPagination(res.data.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, [page, filter]);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    refreshCount();
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(ns => ns.map(n => ({ ...n, is_read: 1 })));
    refreshCount();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-t-primary">Notifications</h1>
          <p className="text-t-tertiary">Stay updated on your account activity</p>
        </div>
        <button onClick={handleMarkAllRead} className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
          Mark All Read
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'transaction', 'alert', 'info', 'security'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-elevated text-t-secondary hover:bg-hover'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : notifications.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-sm border border-b-secondary p-12 text-center text-t-muted">No notifications</div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`bg-surface rounded-xl shadow-sm border p-4 flex items-start gap-4 cursor-pointer transition-colors ${
                n.is_read ? 'border-b-secondary' : 'border-l-4 border-l-indigo-500 border-b-secondary bg-indigo-50/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${typeColors[n.type]}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeIcons[n.type]} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${n.is_read ? 'text-t-secondary' : 'text-t-primary'}`}>{n.title}</h3>
                  <span className="text-xs text-t-muted whitespace-nowrap">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-t-tertiary mt-0.5">{n.message}</p>
              </div>
              {!n.is_read && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shrink-0 mt-1.5"></div>}
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Prev</button>
          <span className="text-sm text-t-tertiary">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 text-sm border border-b-input rounded-lg disabled:opacity-50 hover:bg-hover">Next</button>
        </div>
      )}
    </div>
  );
}
