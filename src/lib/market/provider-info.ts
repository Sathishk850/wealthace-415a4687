// Client-safe provider info. Reads only VITE_ vars.

export function isTwelveDataConfigured(): boolean {
  return !!import.meta.env.VITE_TWELVE_DATA_ENABLED;
}
