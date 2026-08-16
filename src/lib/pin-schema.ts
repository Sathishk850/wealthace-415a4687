import { z } from "zod";

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 5;

const WEAK_PINS = new Set([
  "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
  "1234","2345","3456","4567","5678","6789","0123",
  "9876","8765","7654","6543","5432","4321","3210",
]);

export function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.has(pin)) return true;
  const digits = pin.split("").map((d) => parseInt(d, 10));
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return asc || desc;
}

export const strongPinSchema = pinSchema.refine((p) => !isWeakPin(p), {
  message: "PIN is too easy to guess. Avoid sequences (1234) or repeats (1111).",
});
