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

describe('Player jump', () => {
  it('jump fires only from grounded state', () => {
    const { grid, state, player } = setupRoom()
    expect(player.state).toBe('grounded')
    let jumped = 0
    const c = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    player.update(1 / 60, c)
    expect(jumped).toBe(1)
    const c2 = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    player.update(1 / 60, c2)
    expect(jumped).toBe(1)
  })

  it('emits exactly one Landed event per landing', () => {
    const { grid, state, player } = setupRoom()
    let landed = 0
    const c = { ...ctx(grid, state, { jump: true }), onLanded: () => { landed++ } }
    player.update(1 / 60, c)
    for (let i = 0; i < 120; i++) {
      const c2 = { ...ctx(grid, state), onLanded: () => { landed++ } }
      player.update(1 / 60, c2)
      if (player.state === 'grounded') break
    }
    expect(player.state).toBe('grounded')
    expect(landed).toBe(1)
  })

  it('stepping off support starts falling on next tick', () => {
    const { grid, state, player } = setupRoom()
    grid.setSupport(1, 1, 1.6)
    player.position.set(2, 1.6, 2)
    player.state = 'grounded'
    const c = { ...ctx(grid, state, { right: true }) }
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60, c)
      if (player.state === 'airborne') break
    }
    expect(player.state).toBe('airborne')
  })
})

describe('Player pickup', () => {
  it('werewolf form rejects pickup attempt', () => {
    const { state, player } = setupRoom()
    state.toggleForm()
    expect(state.form).toBe('werewolf')
    const overlap = { id: 'goblet', position: player.position.clone() }
    let picked: string | null = null
    player.tryPickup(overlap, state, () => { picked = overlap.id })
    expect(picked).toBe(null)
    expect(player.carrying).toBe(null)
  })

  it('human form accepts pickup attempt', () => {
    const { state, player } = setupRoom()
    const overlap = { id: 'goblet', position: player.position.clone() }
    let picked: string | null = null
    player.tryPickup(overlap, state, () => { picked = overlap.id })
    expect(picked).toBe('goblet')
    expect(player.carrying).toBe('goblet')
    expect(state.hasItem('goblet')).toBe(true)
  })
})
