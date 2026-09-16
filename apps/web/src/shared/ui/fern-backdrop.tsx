import { cn } from "@/shared/lib/utils";

/**
 * A single decorative fiddlehead-fern frond, line-art in the current text
 * color. Meant as one deliberate atmospheric touch behind the auth cards —
 * not reused as UI chrome elsewhere.
 */
export function FernBackdrop({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 460"
      className={cn("pointer-events-none text-primary/[0.16]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M60 440 C 78 360 58 300 82 240 C 106 180 150 150 176 108 C 202 66 196 40 222 24 C 236 16 250 18 258 26" />
      <path d="M85 400 L 34 372" />
      <path d="M92 372 L 42 356" />
      <path d="M100 344 L 48 334" />
      <path d="M112 314 L 62 308" />
      <path d="M126 286 L 78 274" />
      <path d="M142 258 L 98 240" />
      <path d="M160 230 L 120 208" />
      <path d="M178 202 L 142 176" />
      <path d="M195 176 L 164 146" />
      <path d="M210 150 L 184 118" />
      <path d="M222 124 L 202 94" />
      <path d="M232 100 L 216 74" />
      <circle cx="258" cy="26" r="14" />
    </svg>
  );
}
