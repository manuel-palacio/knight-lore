import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { Player } from '../../src/game/Player'
import { GameState } from '../../src/game/GameState'

const TILE = 2

function setupRoom() {
  const grid = new Grid(8, 8)
  const state = new GameState()
  const player = new Player()
  player.position.set(2, 0, 2)
  player.renderPosition.copy(player.position)
  return { grid, state, player }
}

function ctx(grid: Grid, state: GameState, input: { up?: boolean; down?: boolean; left?: boolean; right?: boolean; jump?: boolean; action?: boolean } = {}) {
  return {
    grid,
    state,
    tileSize: TILE,
    input: {
      isDown: (code: string) => {
        if (code === 'ArrowUp') return !!input.up
        if (code === 'ArrowDown') return !!input.down
        if (code === 'ArrowLeft') return !!input.left
        if (code === 'ArrowRight') return !!input.right
        return false
      },
      wasPressed: (code: string) => {
        if (code === 'Space') return !!input.jump
        if (code === 'KeyE') return !!input.action
        return false
      },
    },
    onLanded: () => {},
    onJumped: () => {},
  }
}

describe('Player movement', () => {
  it('moves north when ArrowUp held', () => {
    const { grid, state, player } = setupRoom()
    const startZ = player.position.z
    player.update(1 / 60, ctx(grid, state, { up: true }))
    expect(player.position.z).toBeLessThan(startZ)
  })

  it('blocks X-axis when wall is east of player', () => {
    const { grid, state, player } = setupRoom()
    grid.setSolid(2, 1, true)
    player.position.set(3, 0, 2)
    player.renderPosition.copy(player.position)
    for (let i = 0; i < 30; i++) {
      player.update(1 / 60, ctx(grid, state, { right: true }))
    }
    expect(player.position.x).toBeLessThan(4 - 0.4)
  })
})
