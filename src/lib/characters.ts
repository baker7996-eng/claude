// Cartoon character notes for each manager, taken from photos the owner
// supplied. Only these descriptions are kept; the photos are not stored.
// Keyed by FPL entry id.
export interface Character {
  name: string;
  club: string; // the Premier League team they support (their kit)
  skin: string;
  hair: { colour: string; style: "short-quiff" | "short" | "buzz" | "long" | "bald" | "curly" };
  facialHair?: "none" | "stubble" | "beard" | "moustache";
  glasses?: "none" | "sunglasses" | "specs";
}

export const CHARACTERS: Record<number, Character> = {
  66992: {
    name: "Edward",
    club: "Man Utd",
    skin: "#f0c4a4",
    hair: { colour: "#3b2416", style: "curly" },
    facialHair: "beard",
    glasses: "specs",
  },
  299994: {
    name: "Tom",
    club: "Leeds United",
    skin: "#f3cdb0",
    hair: { colour: "#3a2517", style: "short" },
    facialHair: "none",
    glasses: "none",
  },
  313590: {
    name: "Frank",
    club: "Man City",
    skin: "#f2c9ae",
    hair: { colour: "#8a6a4a", style: "short-quiff" },
    facialHair: "none",
    glasses: "none",
  },
  157513: {
    name: "Lewis",
    club: "Man City",
    skin: "#e2b48f",
    hair: { colour: "#2a1a10", style: "short" },
    facialHair: "beard",
    glasses: "none",
  },
  78782: {
    name: "Bruce",
    club: "Leeds United",
    skin: "#f1c9a8",
    hair: { colour: "#b8864e", style: "short-quiff" },
    facialHair: "none",
    glasses: "sunglasses",
  },
};
