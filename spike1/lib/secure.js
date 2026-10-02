import crypto from "node:crypto";

// Timing-safe secret comparison. Hashing first keeps lengths equal, so neither the
// content nor the length of the secret leaks through response timing.
// Empty expected secret = always false (fail closed).
export function safeEqual(got, want) {
  if (!want || !got) return false;
  const h = (s) => crypto.createHash("sha256").update(String(s)).digest();
  return crypto.timingSafeEqual(h(got), h(want));
}
