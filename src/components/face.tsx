export type Mood = "happy" | "neutral" | "sad";

// A distinct colour and hairstyle per manager, picked from their team id.
const SKINS = ["#f2c7a5", "#d9a47e", "#b67b56", "#8d5a3b", "#f5d6bd", "#c98f6b"];
const HAIR = ["#2b1d14", "#6b3e1f", "#d8b04a", "#111111", "#8a4b2a", "#3a3a3a"];
const SHIRTS = ["#c6ff3d", "#56c2ff", "#ff8a3d", "#ff4d5e", "#b58cff", "#ffd23d"];

/**
 * Animated cartoon manager. Happy bounces with rosy cheeks, neutral sways and
 * blinks, sad droops with a falling tear. Animations respect reduced motion.
 */
export function Face({
  seed,
  mood,
  size = 56,
  label,
}: {
  seed: number;
  mood: Mood;
  size?: number;
  label?: string;
}) {
  const skin = SKINS[seed % SKINS.length];
  const hair = HAIR[Math.floor(seed / 7) % HAIR.length];
  const shirt = SHIRTS[Math.floor(seed / 3) % SHIRTS.length];
  const style = seed % 3;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `${mood} face`}
      className={`face face-${mood}`}
    >
      <g className="face-body">
        {/* shirt */}
        <path d="M14 64 C14 52 22 47 32 47 C42 47 50 52 50 64 Z" fill={shirt} />
        {/* head */}
        <circle cx="32" cy="30" r="17" fill={skin} />
        {/* hair: three styles */}
        {style === 0 && <path d="M15 28 C15 14 24 11 32 11 C42 11 49 16 49 28 C45 20 38 18 32 19 C25 19 19 21 15 28 Z" fill={hair} />}
        {style === 1 && <path d="M16 25 C17 13 27 10 34 11 C44 12 49 19 48 26 L44 20 L38 23 L32 18 L26 23 L20 19 Z" fill={hair} />}
        {style === 2 && <path d="M15 30 C13 16 22 10 32 10 C43 10 51 16 49 30 C48 24 46 21 44 20 C40 23 26 23 20 20 C18 22 16 25 15 30 Z" fill={hair} />}

        {/* eyes */}
        {mood === "happy" ? (
          <g stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round">
            <path d="M22 29 Q25 25.5 28 29" />
            <path d="M36 29 Q39 25.5 42 29" />
          </g>
        ) : (
          <g className="face-eyes" fill="#1a1a1a">
            <ellipse cx="25" cy="29" rx="2.2" ry="2.6" />
            <ellipse cx="39" cy="29" rx="2.2" ry="2.6" />
          </g>
        )}

        {/* brows */}
        {mood === "sad" && (
          <g stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 24 L28 22" />
            <path d="M43 24 L36 22" />
          </g>
        )}

        {/* cheeks and mouth */}
        {mood === "happy" && (
          <>
            <circle cx="21" cy="35" r="3" fill="#ff7a8a" opacity="0.55" />
            <circle cx="43" cy="35" r="3" fill="#ff7a8a" opacity="0.55" />
            <path d="M24 36 Q32 45 40 36 Z" fill="#7a1f2b" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
          </>
        )}
        {mood === "neutral" && <path d="M26 38.5 H38" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />}
        {mood === "sad" && (
          <>
            <path d="M25 41 Q32 34.5 39 41" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path className="face-tear" d="M41.5 32 Q43.5 35.5 41.5 37 Q39.5 35.5 41.5 32 Z" fill="#56c2ff" />
          </>
        )}
      </g>
    </svg>
  );
}
