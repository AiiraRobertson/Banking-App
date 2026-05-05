import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

const resourceGroups = [
  {
    heading: 'Company',
    links: [
      { to: '/mission', label: 'Our Mission', icon: '🎯', desc: 'Why Kapita exists' },
      { to: '/innovation', label: 'Innovation', icon: '🚀', desc: 'Tech that powers us' },
      { to: '/careers', label: 'Career Growth', icon: '🌱', desc: 'Join the team' },
      { to: '/investment', label: 'Investment Strategy', icon: '📈', desc: 'Portfolios & approach' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { to: '/faq', label: 'FAQ', icon: '❓', desc: 'Common questions' },
      { to: '/contact', label: 'Contact', icon: '✉️', desc: 'Get in touch' },
      { to: '/complaint', label: 'File a Complaint', icon: '⚠️', desc: 'We take it seriously' },
      { to: '/feedback', label: 'Send Feedback', icon: '💬', desc: 'Tell us what to improve' },
    ],
  },
  {
    heading: 'Legal & Trust',
    links: [
      { to: '/terms', label: 'Terms & Conditions', icon: '📜', desc: 'The agreement' },
      { to: '/policy', label: 'Privacy Policy', icon: '🔒', desc: 'How we handle data' },
      { to: '/reviews', label: 'Customer Reviews', icon: '⭐', desc: 'What customers say' },
    ],
  },
];

export default function ResourcesDropdown({ align = 'right', compact = false }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const panelAlign = align === 'left' ? 'left-0' : 'right-0';
  const btnPadding = compact ? 'px-2.5 py-1.5' : 'px-4 py-2';

  return (
    <div className="relative" ref={wrapperRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        onFocus={handleEnter}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 ${btnPadding} text-sm font-medium text-t-secondary hover:text-indigo-600 hover:bg-hover rounded-lg transition-colors duration-200`}>
        Resources
        <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`absolute ${panelAlign} top-full pt-3 w-[42rem] max-w-[calc(100vw-2rem)] z-50 transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className="bg-surface border border-b-secondary rounded-2xl shadow-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {resourceGroups.map(group => (
            <div key={group.heading}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-t-tertiary mb-2 px-2">{group.heading}</p>
              <div className="space-y-0.5">
                {group.links.map(link => (
                  <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-elevated transition-colors group/item">
                    <span className="text-lg shrink-0 mt-0.5">{link.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-t-primary group-hover/item:text-indigo-600 transition-colors">{link.label}</p>
                      <p className="text-xs text-t-tertiary truncate">{link.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
