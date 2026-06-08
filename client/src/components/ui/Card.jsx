/**
 * Card — the standard surface panel used across pages.
 * Replaces the repeated `bg-surface rounded-xl shadow-sm border border-b-secondary p-6`
 * with responsive padding that tightens on mobile.
 *
 * Usage:
 *   <Card>...</Card>
 *   <Card padding="p-0">...</Card>        // override padding (e.g. for tables)
 *   <Card as="section" className="...">    // change element / add classes
 */
export default function Card({
  children,
  padding = 'p-4 sm:p-5 lg:p-6',
  className = '',
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={`bg-surface rounded-xl shadow-sm border border-b-secondary ${padding} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
