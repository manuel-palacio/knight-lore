// Centralized tolerance constants. PHYSICS_AND_COLLISION.md rule 5:
// no magic numbers in entity code.
export const EPS = {
  OVERLAP: 1e-4,
  GROUNDED_GAP: 1e-3,
  TRIGGER: 1e-3,
  STEP: 0.1,
} as const
