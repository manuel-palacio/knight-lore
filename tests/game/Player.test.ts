import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { Player, STEP_LENGTH, TICKS_PER_STEP } from '../../src/game/Player'
import { GameState } from '../../src/game/GameState'
import { SIMULATION_DT } from '../../src/engine/GameLoop'

const TILE = 2

function setupRoom() {
  const grid = new Grid(8, 8)
  const state = new GameState()
  const player = new Player()
  player.position.set(4, 0, 4)
  return { grid, state, player }
}

type Keys = { up?: boolean; left?: boolean; right?: boolean; jump?: boolean; tapUp?: boolean; tapRight?: boolean }

function ctx(grid: Grid, state: GameState, input: Keys = {}) {
  return {
    grid,
    state,
    tileSize: TILE,
    input: {
      isDown: (code: string) => {
        if (code === 'ArrowUp') return !!input.up
        if (code === 'ArrowLeft') return !!input.left
        if (code === 'ArrowRight') return !!input.right
        return false
      },
      wasPressed: (code: string) => {
        if (code === 'Space') return !!input.jump
        if (code === 'ArrowUp') return !!input.tapUp
        if (code === 'ArrowRight') return !!input.tapRight
        return false
      },
    },
    onLanded: () => {},
    onJumped: () => {},
  }
}

function tick(player: Player, c: ReturnType<typeof ctx>, ticks = 1): void {
  for (let i = 0; i < ticks; i++) player.update(SIMULATION_DT, c)
}

function step(player: Player, c: ReturnType<typeof ctx>, steps = 1): void {
  tick(player, c, steps * TICKS_PER_STEP)
}

describe('Player facing', () => {
  it('starts facing south', () => {
    const { player } = setupRoom()
    expect(player.facing).toBe('south')
  })

  it('ArrowRight rotates clockwise on screen: south -> west', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { right: true }))
    expect(player.facing).toBe('west')
  })

  it('ArrowLeft rotates anticlockwise on screen: south -> east', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { left: true }))
    expect(player.facing).toBe('east')
  })

  it('rotates once per step, not once per simulation tick', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { right: true }), TICKS_PER_STEP - 1)
    expect(player.facing).toBe('south')
    tick(player, ctx(grid, state, { right: true }))
    expect(player.facing).toBe('west')
  })

  it('a tap released before the next step still turns once', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { tapRight: true }))
    step(player, ctx(grid, state))
    expect(player.facing).toBe('west')
    step(player, ctx(grid, state))
    expect(player.facing).toBe('west')
  })

  it('rotating does not move the player', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { right: true }), 4)
    expect(player.position.x).toBe(4)
    expect(player.position.z).toBe(4)
  })
})

describe('Player walking', () => {
  it('ArrowUp walks one fixed step in the facing direction per step', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { up: true }))
    expect(player.position.z).toBe(4 + STEP_LENGTH)
    expect(player.position.x).toBe(4)
  })

  it('a tap released before the next step still walks one step', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { tapUp: true }))
    step(player, ctx(grid, state), 2)
    expect(player.position.z).toBe(4 + STEP_LENGTH)
  })

  it('does not move between steps', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { up: true }), TICKS_PER_STEP - 1)
    expect(player.position.z).toBe(4)
  })

  it('walks along x after turning to face east', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { left: true }))
    step(player, ctx(grid, state, { up: true }), 2)
    expect(player.position.x).toBe(4 + 2 * STEP_LENGTH)
    expect(player.position.z).toBe(4)
  })

  it('counts steps taken so the walk cycle can advance per step', () => {
    const { grid, state, player } = setupRoom()
    step(player, ctx(grid, state, { up: true }), 3)
    expect(player.stepsTaken).toBe(3)
    step(player, ctx(grid, state, { right: true }))
    expect(player.stepsTaken).toBe(3)
  })

  it('is blocked by a solid cell ahead', () => {
    const { grid, state, player } = setupRoom()
    grid.setSolid(2, 3, true)
    step(player, ctx(grid, state, { up: true }), 20)
    expect(player.position.z).toBeLessThan(6 - 0.4)
  })
})

describe('Player jump', () => {
  it('jump fires only from grounded state', () => {
    const { grid, state, player } = setupRoom()
    let jumped = 0
    const c = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    tick(player, c)
    expect(jumped).toBe(1)
    tick(player, c)
    expect(jumped).toBe(1)
  })

  it('standing jump goes straight up and lands on the same spot', () => {
    const { grid, state, player } = setupRoom()
    let landed = 0
    tick(player, { ...ctx(grid, state, { jump: true }), onLanded: () => { landed++ } })
    const c = { ...ctx(grid, state), onLanded: () => { landed++ } }
    let peak = 0
    for (let i = 0; i < 200 && player.state !== 'grounded'; i++) {
      tick(player, c)
      peak = Math.max(peak, player.position.y)
    }
    expect(player.state).toBe('grounded')
    expect(landed).toBe(1)
    expect(peak).toBeGreaterThan(0.5)
    expect(player.position.x).toBe(4)
    expect(player.position.z).toBe(4)
  })

  it('walking jump carries forward a fixed distance', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { up: true, jump: true }))
    const c = ctx(grid, state)
    for (let i = 0; i < 200 && player.state !== 'grounded'; i++) tick(player, c)
    expect(player.state).toBe('grounded')
    expect(player.position.z).toBeGreaterThan(4 + STEP_LENGTH)
  })

  it('cannot steer or turn while airborne', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { jump: true }))
    const c = ctx(grid, state, { up: true, right: true })
    for (let i = 0; i < 200 && player.state !== 'grounded'; i++) tick(player, c)
    expect(player.facing).toBe('south')
    expect(player.position.x).toBe(4)
    expect(player.position.z).toBe(4)
  })

  it('stepping off support starts falling', () => {
    const { grid, state, player } = setupRoom()
    grid.setSupport(2, 2, 1.6)
    player.position.set(4, 1.6, 4)
    const c = ctx(grid, state, { up: true })
    for (let i = 0; i < 60 && (player.state as string) !== 'airborne'; i++) tick(player, c)
    expect(player.state).toBe('airborne')
  })
})

describe('Player on dynamic supports', () => {
  const lift = (x: number, z: number, top: number) => (px: number, pz: number) =>
    Math.abs(px - x) <= 1 && Math.abs(pz - z) <= 1 ? top : null

  it('lands on a dynamic support instead of falling to the floor', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(4, 3, 4)
    player.state = 'airborne'
    const c = { ...ctx(grid, state), dynamicSupport: lift(4, 4, 1) }
    for (let i = 0; i < 200 && (player.state as string) !== 'grounded'; i++) tick(player, c)
    expect(player.state as string).toBe('grounded')
    expect(player.position.y).toBe(1)
  })

  it('is blocked walking into a dynamic support higher than a step', () => {
    const { grid, state, player } = setupRoom()
    const c = { ...ctx(grid, state, { up: true }), dynamicSupport: lift(4, 6, 1) }
    step(player, c, 8)
    expect(player.position.z).toBeLessThan(5)
  })

  it('falls when the dynamic support moves away', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(4, 1, 4)
    let gone = false
    const c = { ...ctx(grid, state), dynamicSupport: (px: number, pz: number) => (gone ? null : lift(4, 4, 1)(px, pz)) }
    step(player, c)
    expect(player.state as string).toBe('grounded')
    gone = true
    step(player, c)
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
