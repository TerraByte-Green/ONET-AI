import Image from "next/image";

// Source is 454 x 638. Sizes are whole-number divisions so the pixel grid stays even.
const SIZES = {
  sm: { width: 38, height: 53 },   // 1/12: widget tab and mobile button
  md: { width: 114, height: 160 }, // 1/4: widget header, empty states
  lg: { width: 227, height: 319 }, // 1/2: home hero, 404
} as const;

/**
 * The TerraByte Green mascot (unnamed until the org picks a name).
 * Decorative by default; pass alt only when it carries meaning.
 */
export function Mascot({ size = "md", alt = "", className = "", preload = false }: {
  size?: keyof typeof SIZES;
  alt?: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src="/brand/mascot.png"
      alt={alt}
      {...SIZES[size]}
      unoptimized // resampling would blur the pixel art
      preload={preload}
      className={`tbg-mascot ${className}`}
    />
  );
}
