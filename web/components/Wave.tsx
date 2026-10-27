import { useId } from "react";

/** Bottom edge of a Sky Blue band: wavy edge with a thin yellow-to-green swoosh. */
export function Wave() {
  const gradientId = useId();
  return (
    <svg
      className="block h-4 w-full md:h-6"
      viewBox="0 0 1440 32"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="tbg-wave-start" />
          <stop offset="1" className="tbg-wave-end" />
        </linearGradient>
      </defs>
      <path d="M0 0H1440V14C1080 30 720 2 360 18C200 25 80 20 0 14Z" className="fill-sky" />
      <path
        d="M0 14C80 20 200 25 360 18C720 2 1080 30 1440 14"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
