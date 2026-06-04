/**
 * ResponsiveGrid Component
 * Automatically adjusts columns based on screen size
 * Replaces manual breakpoint classes
 */

export default function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
  className = ''
}) {
  const gapClass = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  }[gap] || `gap-${gap}`;

  const colsClass = [
    `grid-cols-${columns.mobile || 1}`,
    `sm:grid-cols-${columns.tablet || 2}`,
    `lg:grid-cols-${columns.desktop || 3}`,
  ].join(' ');

  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}
