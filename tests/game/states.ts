import { GameState } from '../../src/game/GameState'

export function night(): GameState {
  const state = new GameState(1)
  state.toggleForm()
  return state
}
