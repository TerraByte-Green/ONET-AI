import type { ReactNode } from "react";

/** Three-segment divider (Leaf Green, Sunshine Yellow, Sky Blue) under headings. */
export function Divider() {
  return (
    <div className="tbg-divider" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

/** Left-aligned page column with the standard gutters. */
export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-5xl px-4 md:px-8 ${className}`}>{children}</div>;
}

/** Page title + divider + optional intro line. */
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1>{title}</h1>
      <Divider />
      {children ? <div className="tbg-prose mt-4 text-lg">{children}</div> : null}
    </header>
  );
}

/** Section heading + divider. */
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 id={id}>{children}</h2>
      <Divider />
    </div>
  );
}

/** Yellow box, Leaf Green border, solid Earth Brown offset shadow. Once per page at most. */
export function ShadowBox({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`tbg-shadow-box ${className}`}>{children}</div>;
}

/** Yellow highlighter stroke under a key word. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="tbg-highlight">{children}</span>;
}

/**
 * Silkscreen label. Only NEW, ZONE n and n/m counters (web/DESIGN.md).
 * Text is a prop, not children: TypeScript widens JSX children to string, which would defeat the check.
 */
export type PixelLabelText = "NEW" | `ZONE ${string}` | `${number}/${number}`;

export function PixelLabel({ text, title }: { text: PixelLabelText; title?: string }) {
  return (
    <span className="tbg-pixel" title={title}>
      {text}
    </span>
  );
}

export const SCALES = {
  importance: { label: "Importance", min: 1, max: 5 },
  level: { label: "Level", min: 0, max: 7 },
  context: { label: "Context", min: 1, max: 5 },   // work context CX
  impact: { label: "Impact", min: -3, max: 3 },     // work styles WI
} as const;

export const PIN_COUNT = 20;

/** Filled pins for a score: scaled to the scale's range, rounded to the nearest pin. */
export function filledPins(value: number, min: number, max: number): number {
  const share = (value - min) / (max - min);
  return Math.min(PIN_COUNT, Math.max(0, Math.round(share * PIN_COUNT)));
}

/**
 * One row of 20 score pins with the value printed after it.
 * Screen readers get "Importance 4.1 out of 5" instead of the pins.
 * `name` replaces the scale word on the left (compare rows name the occupation).
 */
export function ScorePins({ scale, value, name }: { scale: keyof typeof SCALES; value: number; name?: string }) {
  const { label, min, max } = SCALES[scale];
  const filled = filledPins(value, min, max);
  const shown = value.toFixed(1);
  return (
    <div className="flex items-center gap-3">
      {name ? (
        <span className="w-40 shrink-0 truncate text-sm sm:w-56" title={name} aria-hidden="true">
          {name}
        </span>
      ) : (
        <span className="w-24 shrink-0 text-sm" aria-hidden="true">
          {label.toLowerCase()}
        </span>
      )}
      <span className="tbg-pins" aria-hidden="true">
        {Array.from({ length: PIN_COUNT }, (_, i) => (
          <span key={i} data-on={i < filled ? "" : undefined} />
        ))}
      </span>
      <span className="w-8 text-right tabular-nums font-medium" aria-hidden="true">
        {shown}
      </span>
      <span className="sr-only">
        {name ? `${name}: ` : ""}
        {label} {shown} out of {max}
      </span>
    </div>
  );
}
