// The 9 collision categories mandated by PHYSICS_AND_COLLISION.md.
// Every entity declares one or more. Behavior dispatches on category pairs.
export enum Category {
  SOLID_WORLD = 'SOLID_WORLD',
  SOLID_DYNAMIC = 'SOLID_DYNAMIC',
  ACTOR_BODY = 'ACTOR_BODY',
  SUPPORT_SURFACE = 'SUPPORT_SURFACE',
  HAZARD = 'HAZARD',
  PICKUP_TRIGGER = 'PICKUP_TRIGGER',
  INTERACTION_TRIGGER = 'INTERACTION_TRIGGER',
  EXIT_TRIGGER = 'EXIT_TRIGGER',
  DECORATIVE = 'DECORATIVE',
}
