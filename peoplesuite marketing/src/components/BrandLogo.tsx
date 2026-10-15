/**
 * Official Innovyx Tech Labs logo (trimmed from /logo.png).
 * logo-full.png = original colours; logo-full-white.png = black lettering swapped to white for dark backgrounds.
 */
export default function BrandLogo({ dark = false, className = "h-14" }: { dark?: boolean; className?: string }) {
  return (
    <img
      src={dark ? "/logo-full-white.png" : "/logo-full.png"}
      alt="Innovyx Tech Labs LLP"
      width={701}
      height={424}
      className={`${className} w-auto object-contain`}
    />
  );
}
