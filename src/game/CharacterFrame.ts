import type { Facing } from './Facing'

// Filmation draws two views and mirrors them: a "front" strip (toward the
// camera, drawn facing east) and a "back" strip (away, drawn facing west).
// Both strips hold the original's four walk frames, played A B C D C B.
export type CharacterView = 'front' | 'back'
export type CharacterForm = 'human' | 'werewolf'

export interface CharacterFrame {
  view: CharacterView
  frame: number
  flip: boolean
}

const WALK_CYCLE: Record<CharacterForm, number[]> = {
  human: [0, 1, 2, 3, 2, 1],
  werewolf: [0, 1, 2, 3, 2, 1],
}

export const STRIP_CELLS: Record<CharacterForm, number> = { human: 4, werewolf: 4 }

const AIRBORNE_FRAME = 1

export function selectCharacterFrame(
  facing: Facing,
  stepsTaken: number,
  walking: boolean,
  airborne = false,
  form: CharacterForm = 'human',
): CharacterFrame {
  const cycle = WALK_CYCLE[form]
  const frame = airborne ? AIRBORNE_FRAME : walking ? cycle[stepsTaken % cycle.length]! : 0
  switch (facing) {
    case 'east': return { view: 'front', frame, flip: false }
    case 'south': return { view: 'front', frame, flip: true }
    case 'west': return { view: 'back', frame, flip: false }
    case 'north': return { view: 'back', frame, flip: true }
  }
}
