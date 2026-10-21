/** Lepide mark (two rows of slanted bars) with wordmark. Colors come from tokens via CSS. */
export function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const bars = [0, 10, 20].flatMap(x => [4, 22].map(y => ({ x, y })));
  return (
    <span className={`brand-logo brand-logo--${size}`} role="img" aria-label="Lepide">
      <svg className="brand-logo__mark" viewBox="0 0 34 40" fill="currentColor" aria-hidden="true" focusable="false">
        {bars.map(({ x, y }) => (
          <polygon key={`${x}-${y}`} points={`${x + 6},${y} ${x + 14},${y} ${x + 8},${y + 14} ${x},${y + 14}`} />
        ))}
      </svg>
      <span className="brand-logo__word" aria-hidden="true">Lepide</span>
    </span>
  );
}
