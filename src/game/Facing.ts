export type Facing = 'north' | 'east' | 'south' | 'west'

// Clockwise as seen on screen in the isometric projection.
export const FACINGS_CLOCKWISE: Facing[] = ['north', 'east', 'south', 'west']

export const FACING_VECTOR: Record<Facing, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  east: { x: 1, z: 0 },
  south: { x: 0, z: 1 },
  west: { x: -1, z: 0 },
}

export function facingFromDelta(dx: number, dz: number): Facing {
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? 'east' : 'west'
  return dz >= 0 ? 'south' : 'north'
}
