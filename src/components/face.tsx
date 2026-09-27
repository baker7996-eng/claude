import { CHARACTERS, type Character } from "@/lib/characters";

export type Mood = "happy" | "neutral" | "sad";

// Club kits: shirt colour(s) and collar trim.
const KITS: Record<string, { base: string; stripe?: string; trim: string; trim2?: string }> = {
  "Man Utd": { base: "#da291c", trim: "#ffffff" },
  "Leeds United": { base: "#f7f7f2", trim: "#1d428a", trim2: "#ffcd00" },
  "Man City": { base: "#6cabdd", trim: "#1c2c5b" },
  "Sheffield Wednesday": { base: "#ffffff", stripe: "#0a4ba0", trim: "#0a4ba0" },
};

// Fallback look for anyone without character notes.
const SKINS = ["#f2c7a5", "#d9a47e", "#b67b56", "#8d5a3b", "#f5d6bd", "#c98f6b"];
const HAIRS = ["#2b1d14", "#6b3e1f", "#d8b04a", "#111111", "#8a4b2a", "#3a3a3a"];
const SHIRTS = ["#c6ff3d", "#56c2ff", "#ff8a3d", "#ff4d5e", "#b58cff", "#ffd23d"];

function fallback(seed: number): Character {
  return {
    name: "",
    club: "",
    skin: SKINS[seed % SKINS.length],
    hair: { colour: HAIRS[Math.floor(seed / 7) % HAIRS.length], style: "short" },
  };
}

/**
 * Animated cartoon of a manager, in their club's kit, drawn from the notes in
 * src/lib/characters.ts. Happy bounces with rosy cheeks, neutral sways and
 * blinks, sad droops with a falling tear. Animations respect reduced motion.
 */
export function Face({
  seed,
  mood,
  size = 56,
  label,
}: {
  seed: number; // the manager's FPL entry id
  mood: Mood;
  size?: number;
  label?: string;
}) {
  const c = CHARACTERS[seed] ?? fallback(seed);
  const kit = KITS[c.club] ?? { base: SHIRTS[Math.floor(seed / 3) % SHIRTS.length], trim: "#141a17" };
  const clip = `shirt-${seed}`;
  const shades = c.glasses === "sunglasses";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `${c.name || "Manager"}, ${mood}`}
      className={`face face-${mood}`}
    >
      <g className="face-body">
        {/* shirt, with stripes for striped kits and a trimmed collar */}
        <clipPath id={clip}>
          <path d="M12 64 C12 52 21 46.5 32 46.5 C43 46.5 52 52 52 64 Z" />
        </clipPath>
        <path d="M12 64 C12 52 21 46.5 32 46.5 C43 46.5 52 52 52 64 Z" fill={kit.base} stroke="#0b0f0d" strokeOpacity="0.25" />
        {kit.stripe && (
          <g clipPath={`url(#${clip})`} fill={kit.stripe}>
            {[14, 22, 30, 38, 46].map((x) => (
              <rect key={x} x={x} y="44" width="4" height="22" />
            ))}
          </g>
        )}
        <path d="M25 47.5 L32 55 L39 47.5" fill="none" stroke={kit.trim} strokeWidth="2.4" strokeLinejoin="round" />
        {kit.trim2 && <path d="M27 48.6 L32 53.6 L37 48.6" fill="none" stroke={kit.trim2} strokeWidth="1.1" strokeLinejoin="round" />}

        {/* neck, ears, head */}
        <rect x="28" y="42" width="8" height="7" rx="2" fill={c.skin} />
        <circle cx="15.5" cy="31" r="3.2" fill={c.skin} />
        <circle cx="48.5" cy="31" r="3.2" fill={c.skin} />
        <circle cx="32" cy="30" r="16.5" fill={c.skin} />

        {/* beard or stubble, under the mouth */}
        {(c.facialHair === "beard" || c.facialHair === "stubble") && (
          <path
            d="M16.5 31 C17 42 24 47 32 47 C40 47 47 42 47.5 31 C45 36 42 38.5 38.5 38.5 C36 36.5 28 36.5 25.5 38.5 C22 38.5 19 36 16.5 31 Z"
            fill={c.hair.colour}
            opacity={c.facialHair === "beard" ? 0.85 : 0.3}
          />
        )}

        <Hair style={c.hair.style} colour={c.hair.colour} />

        {/* eyes (hidden behind sunglasses) */}
        {!shades &&
          (mood === "happy" ? (
            <g stroke="#1a1a1a" strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M22.5 29.5 Q25 26 27.5 29.5" />
              <path d="M36.5 29.5 Q39 26 41.5 29.5" />
            </g>
          ) : (
            <g className="face-eyes" fill="#1a1a1a">
              <ellipse cx="25" cy="29.5" rx="2.1" ry="2.5" />
              <ellipse cx="39" cy="29.5" rx="2.1" ry="2.5" />
            </g>
          ))}

        {/* brows */}
        {mood === "sad" ? (
          <g stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 23.5 L28 21.8" />
            <path d="M43 23.5 L36 21.8" />
          </g>
        ) : (
          <g stroke={c.hair.colour} strokeWidth="1.8" strokeLinecap="round" opacity="0.9">
            <path d="M21.5 23 Q25 21.2 28.5 22.6" />
            <path d="M35.5 22.6 Q39 21.2 42.5 23" />
          </g>
        )}

        {/* glasses */}
        {c.glasses === "specs" && (
          <g fill="none" stroke="#5f7384" strokeWidth="1.6">
            <circle cx="25" cy="29.5" r="5" />
            <circle cx="39" cy="29.5" r="5" />
            <path d="M30 29 Q32 27.8 34 29" />
          </g>
        )}
        {shades && (
          <g>
            <rect x="19" y="25.5" width="11.5" height="8" rx="3.2" fill="#15191c" />
            <rect x="33.5" y="25.5" width="11.5" height="8" rx="3.2" fill="#15191c" />
            <path d="M30.5 28.5 H33.5" stroke="#15191c" strokeWidth="1.6" />
            <path d="M21 27.5 L24 27.5" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M35.5 27.5 L38.5 27.5" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}

        {/* cheeks and mouth */}
        {mood === "happy" && (
          <>
            <circle cx="20.5" cy="36" r="2.8" fill="#ff7a8a" opacity="0.45" />
            <circle cx="43.5" cy="36" r="2.8" fill="#ff7a8a" opacity="0.45" />
            <path d="M24.5 37 Q32 45.5 39.5 37 Z" fill="#7a1f2b" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M26.5 38.2 H37.5" stroke="#ffffff" strokeWidth="1.6" />
          </>
        )}
        {mood === "neutral" && <path d="M27 39.5 Q32 40.8 37 39.5" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />}
        {mood === "sad" && (
          <>
            <path d="M25.5 42 Q32 35.5 38.5 42" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path className="face-tear" d="M42 34 Q44 37.5 42 39 Q40 37.5 42 34 Z" fill="#56c2ff" />
          </>
        )}
      </g>
    </svg>
  );
}

function Hair({ style, colour }: { style: Character["hair"]["style"]; colour: string }) {
  switch (style) {
    case "curly":
      return (
        <g fill={colour}>
          <path d="M15.5 30 C14 18 22 11.5 32 11.5 C42 11.5 50 18 48.5 30 C46.5 23 43 20.5 38 20 C33 21.5 27 21.5 23 20 C19.5 21.5 17 25 15.5 30 Z" />
          {[
            [17, 22, 4.2], [21.5, 16.5, 4.6], [27.5, 13, 4.8], [34, 12.2, 4.8], [40.5, 14.2, 4.6],
            [45.5, 19.5, 4.3], [47.5, 25.5, 3.4], [16, 27, 3.2], [24.5, 18.5, 3.6], [31, 17.5, 3.6], [38, 18.3, 3.6],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "short-quiff":
      return (
        <path
          d="M15.8 29 C15 18 21 12.5 30 12 C33 8.5 40 7.5 45 11 C47.5 13 49 17.5 48.2 28 C47 22 44.5 20 41 19.5 C36 20.5 27 20.5 22 20.8 C19 22 17 25 15.8 29 Z"
          fill={colour}
        />
      );
    case "buzz":
      return <path d="M16 27 C16 17 23 13 32 13 C41 13 48 17 48 27 C44 21 38 19.5 32 19.5 C26 19.5 20 21 16 27 Z" fill={colour} opacity="0.8" />;
    default:
      // short, slightly messy crop with a fringe
      return (
        <path
          d="M15.5 29 C14.5 17 22 11.5 32 11.5 C42 11.5 49.5 17 48.5 29 C47.5 23.5 45 21 42 20.5 L39 22.5 L36 19.8 L32.5 22.3 L29 19.8 L25.5 22.3 L22.5 20.3 C19 21.5 16.8 24.5 15.5 29 Z"
          fill={colour}
        />
      );
  }
}
