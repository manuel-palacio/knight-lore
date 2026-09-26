import type { Facing } from './Facing'

// Filmation draws two views and mirrors them: a "front" strip (toward the
// camera, drawn facing east) and a "back" strip (away, drawn facing west).
// Both forms have the original's four frames per view, body over legs
// (tools/rip/characters.py), walked 0 1 2 3 2 1 as its animation table does.
export type CharacterView = 'front' | 'back'
export type CharacterForm = 'human' | 'werewolf'

export interface CharacterFrame {
  view: CharacterView
  frame: number
  flip: boolean
}

const WALK_CYCLE = [0, 1, 2, 3, 2, 1]
// The feet-together pose of each form's strip.
const STANDING_FRAME: Record<CharacterForm, number> = { human: 2, werewolf: 1 }
const AIRBORNE_FRAME = 0

export const STRIP_CELLS: Record<CharacterForm, number> = { human: 4, werewolf: 4 }

export function selectCharacterFrame(
  facing: Facing,
  stepsTaken: number,
  walking: boolean,
  airborne = false,
  form: CharacterForm = 'human',
): CharacterFrame {
  const frame = airborne ? AIRBORNE_FRAME : walking ? WALK_CYCLE[stepsTaken % WALK_CYCLE.length]! : STANDING_FRAME[form]
  switch (facing) {
    case 'east': return { view: 'front', frame, flip: false }
    case 'south': return { view: 'front', frame, flip: true }
    case 'west': return { view: 'back', frame, flip: false }
    case 'north': return { view: 'back', frame, flip: true }
  }
}
