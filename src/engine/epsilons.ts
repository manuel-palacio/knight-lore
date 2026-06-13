// Centralized tolerance constants. PHYSICS_AND_COLLISION.md rule 5:
// no magic numbers in entity code.
export const EPS = {
  OVERLAP: 1e-4,
  GROUNDED_GAP: 1e-3,
  TRIGGER: 1e-3,
  STEP: 0.1, // step-up forgiveness: actor can climb cells up to 0.1m above their feet (covers FP rounding at apex)
} as const
