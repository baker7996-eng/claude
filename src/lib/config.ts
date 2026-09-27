const DEFAULT_ENTRY_ID = 66992;

// Your FPL Draft team id: the number after /entry/ in
// https://draft.premierleague.com/entry/<id>/event/<gw>
// Override with FPL_ENTRY_ID; a blank or invalid value falls back to the default.
const fromEnv = Number(process.env.FPL_ENTRY_ID);
export const ENTRY_ID =
  Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_ENTRY_ID;
