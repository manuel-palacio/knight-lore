import type { Facing } from './Player'

// Filmation draws two views and mirrors them: a "front" strip (toward the
// camera, drawn facing east) and a "back" strip (away, drawn facing west).
// Each strip is [stand, stride A, stride B]; the walk cycle ping-pongs.
export type CharacterView = 'front' | 'back'

export interface CharacterFrame {
  view: CharacterView
  frame: number
  flip: boolean
}

const WALK_CYCLE = [0, 1, 2, 1]

export function selectCharacterFrame(facing: Facing, stepsTaken: number, walking: boolean): CharacterFrame {
  const frame = walking ? WALK_CYCLE[stepsTaken % WALK_CYCLE.length] : 0
  switch (facing) {
    case 'east': return { view: 'front', frame, flip: false }
    case 'south': return { view: 'front', frame, flip: true }
    case 'west': return { view: 'back', frame, flip: false }
    case 'north': return { view: 'back', frame, flip: true }
  }
}
