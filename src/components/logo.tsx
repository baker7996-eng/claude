/** The league crest: a shield with a football whose one lit panel has no friends. */
export function Crest({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="8 4 48 56" className={className} aria-hidden>
      <path
        d="M32 6 L53 13 V31 C53 44 44 53 32 58 C20 53 11 44 11 31 V13 Z"
        fill="#141a17"
        stroke="#c6ff3d"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="13.5" fill="#0b0f0d" stroke="#eef3ef" strokeWidth="2.2" />
      <path d="M32 25.2 L38.5 29.9 L36 37.5 H28 L25.5 29.9 Z" fill="#c6ff3d" />
      <path
        d="M32 25.2 V18.5 M38.5 29.9 L44.8 27.8 M36 37.5 L39.9 42.9 M28 37.5 L24.1 42.9 M25.5 29.9 L19.2 27.8"
        stroke="#eef3ef"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
