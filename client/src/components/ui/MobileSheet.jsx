/**
 * MobileSheet Component
 * Bottom-sheet style modal for mobile, centered modal for desktop
 * Usage:
 *   <MobileSheet isOpen={open} onClose={handleClose} title="Confirm Action">
 *     <p>Are you sure?</p>
 *     <button onClick={handleClose}>Cancel</button>
 *     <button onClick={handleConfirm}>Confirm</button>
 *   </MobileSheet>
 */

import { useEffect } from 'react';

export default function MobileSheet({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  closeButton = true,
  footerActions = null,
  maxHeight = 'max-h-[80vh]'
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:bg-black/50"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center pointer-events-none">
        {/* Mobile Bottom Sheet */}
        <div
          className={`lg:hidden w-full pointer-events-auto rounded-t-2xl bg-surface shadow-2xl ${maxHeight} overflow-y-auto transform transition-all duration-300 ease-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle Bar */}
          <div className="sticky top-0 flex justify-center py-2 bg-surface rounded-t-2xl">
            <div className="w-12 h-1 bg-b-secondary rounded-full" />
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 pb-safe">
            {title && (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-t-primary">{title}</h2>
                  {subtitle && <p className="text-sm text-t-tertiary mt-1">{subtitle}</p>}
                </div>
                {closeButton && (
                  <button
                    onClick={onClose}
                    className="text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {children && <div className="text-sm text-t-secondary">{children}</div>}

            {/* Footer Actions */}
            {footerActions && (
              <div className="flex flex-col gap-2 pt-4 border-t border-b-secondary">
                {footerActions}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Centered Modal */}
        <div
          className="hidden lg:flex lg:pointer-events-auto w-full max-w-md flex-col gap-0 rounded-xl bg-surface shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-6 border-b border-b-secondary">
            <div>
              <h2 className="text-xl font-semibold text-t-primary">{title}</h2>
              {subtitle && <p className="text-sm text-t-tertiary mt-1">{subtitle}</p>}
            </div>
            {closeButton && (
              <button
                onClick={onClose}
                className="text-t-tertiary hover:text-t-primary transition-colors shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
            {children}
          </div>

          {/* Footer Actions */}
          {footerActions && (
            <div className="flex flex-col gap-3 p-6 border-t border-b-secondary">
              {footerActions}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
