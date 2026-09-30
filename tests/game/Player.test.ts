import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { Player, STEP_LENGTH, TICKS_PER_STEP, JUMP_SPEED_PX } from '../../src/game/Player'
import { GameState } from '../../src/game/GameState'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import { Pickup, CHARM_HEIGHT } from '../../src/game/Pickup'
import { FloatingBlock } from '../../src/game/FloatingBlock'
import { blockFillsAt } from '../../src/game/BlockSolids'

const TILE = 2

function setupRoom() {
  const grid = new Grid(8, 8)
  const state = new GameState()
  const player = new Player()
  player.position.set(4, 0, 4)
  return { grid, state, player }
}

type Keys = { up?: boolean; left?: boolean; right?: boolean; jump?: boolean; space?: boolean; tapUp?: boolean; tapRight?: boolean }

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
        if (code === 'Space') return !!input.space
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

  it('held, turns once and then again every third frame of the original (0xC8F2)', () => {
    const { grid, state, player } = setupRoom()
    const facings: string[] = []
    for (let t = 0; t < 60; t++) {
      tick(player, ctx(grid, state, { right: true }))
      if (facings.at(-1) !== player.facing) facings.push(player.facing)
    }
    // Six turns in a second: a turn every 10 ticks, the nearest the step clock comes to 3 frames (9 ticks).
    expect(facings.length - 1).toBe(6)
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

// The original's jump (0xC948, 0xC95F, 0xC9C1, 0xC9AB): it sets off at 8
// pixels a frame upwards, losing 1 a frame while Space is held on the way up
// and 2 otherwise, and carries him forward at his walking pace.
describe('Player jump', () => {
  // Runs a jump to its landing; `held` keeps Space down throughout.
  function jump(held: boolean, grid = new Grid(8, 8), state = new GameState()) {
    const player = new Player()
    player.position.set(4, 0, 4)
    tick(player, ctx(grid, state, { jump: true, space: held }))
    let peak = 0
    for (let i = 0; i < 400 && player.state !== 'grounded'; i++) {
      tick(player, ctx(grid, state, { space: held }))
      peak = Math.max(peak, player.position.y)
    }
    return { player, peak }
  }

  it('jump fires only from grounded state', () => {
    const { grid, state, player } = setupRoom()
    let jumped = 0
    const c = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    tick(player, c)
    expect(jumped).toBe(1)
    tick(player, c)
    expect(jumped).toBe(1)
  })

  it('cannot jump with any of him past the room edge, under an arch (0xC87A)', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(8, 0, 0.3)
    player.facing = 'north'
    tick(player, ctx(grid, state, { jump: true }))
    expect(player.state).toBe('grounded')
    player.position.set(8, 0, 0.5)
    tick(player, ctx(grid, state, { jump: true }))
    expect(player.state).toBe('jumping')
  })

  it('falling fast, lands on the top of a block he passes in one frame, not inside it', () => {
    const { grid, state, player } = setupRoom()
    const block = new FloatingBlock(4, 4, 0, 2)
    const c = { ...ctx(grid, state), dynamicSupport: (x: number, z: number, y: number) => block.supportAt(x, z, y), dynamicSolid: (x: number, z: number, from: number, to: number) => blockFillsAt([block], x, z, from, to) }
    player.position.set(block.position.x, 5, block.position.z)
    player.state = 'airborne'
    tick(player, c, 400)
    expect(player.state).toBe('grounded')
    expect(player.position.y).toBe(1)
  })

  it('a jump carried into a doorway rises no further (0xC86D)', () => {
    const { grid, state, player } = setupRoom()
    grid.openDoorway('north')
    player.position.set(8, 0, 1.2)
    player.facing = 'north'
    tick(player, ctx(grid, state, { jump: true, space: true }))
    let peak = 0
    for (let i = 0; i < 200 && player.state !== 'grounded'; i++) {
      tick(player, ctx(grid, state, { space: true }))
      peak = Math.max(peak, player.position.y)
    }
    expect(peak).toBeLessThan(28 / 12)
  })

  it('with the key held he jumps again as soon as he lands (0xC948 reads it held)', () => {
    const { grid, state, player } = setupRoom()
    let jumped = 0
    const held = { ...ctx(grid, state, { space: true }), onJumped: () => { jumped++ } }
    for (let i = 0; i < 400; i++) tick(player, held)
    expect(jumped).toBeGreaterThan(2)
  })

  it('a tapped jump rises a block, 12 pixels: 6, 4 and 2 a frame', () => {
    expect(JUMP_SPEED_PX).toBe(8)
    expect(jump(false).peak).toBeCloseTo(1, 5)
  })

  it('a held jump rises 28 pixels, 7 down to 1 a frame: two blocks and a third', () => {
    expect(jump(true).peak).toBeCloseTo(28 / 12, 5)
  })

  it('carries him forward at his walking pace all the while, lands and says so', () => {
    const tapped = jump(false).player
    const held = jump(true).player
    expect(tapped.state).toBe('grounded')
    expect(tapped.position.z - 4).toBeGreaterThan(2)
    expect(held.position.z - 4).toBeGreaterThan(tapped.position.z - 4 + 2)
  })

  it('a held jump clears a one-tile spike bed from the back of the tile before it', () => {
    const fromBackOfTileBeforeToFarSideOfSpikes = 2 * TILE
    expect(jump(true).player.position.z - 4).toBeGreaterThan(fromBackOfTileBeforeToFarSideOfSpikes)
  })

  it('cannot steer or turn while airborne', () => {
    const { grid, state, player } = setupRoom()
    tick(player, ctx(grid, state, { jump: true }))
    const c = ctx(grid, state, { up: true, right: true })
    for (let i = 0; i < 200 && player.state !== 'grounded'; i++) tick(player, c)
    expect(player.facing).toBe('south')
    expect(player.position.x).toBe(4)
  })

  it('the wolf jumps as high as the man: they share the handler', () => {
    const wolf = new GameState()
    wolf.toggleForm()
    expect(jump(true, new Grid(8, 8), wolf).peak).toBeCloseTo(jump(true).peak, 5)
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

describe('Player at the edge of a block', () => {
  it('stays up on a block while any of him is over it, not dropping into it when his middle passes the edge', () => {
    const { grid, state, player } = setupRoom()
    grid.setSolid(1, 2, true)
    grid.setSupport(1, 2, 1)
    // On the block's east edge (x 2 to 4), his middle just past it, over the floor at x 4.3.
    player.position.set(4.3, 1, 5)
    const c = ctx(grid, state)
    step(player, c, 4)
    expect(player.position.y).toBe(1)
    expect(player.state).toBe('grounded')
  })
})

describe('Player against a floating block', () => {
  // A block hanging from level 1 to 2 in the cell ahead (x 4 to 6, z 6 to 8).
  const hanging = (x: number, z: number, from: number, to: number) => x > 4 && x < 6 && z > 6 && z < 8 && from < 2 && to > 1

  it('cannot walk into a block hanging at his chest', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(5, 0, 4)
    const c = { ...ctx(grid, state, { up: true }), dynamicSolid: hanging }
    step(player, c, 12)
    expect(player.position.z).toBeLessThan(6 - 0.4 + 1e-6)
  })

  it('stops rising when his head meets a block above him', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(5, 0, 7)
    // A row of blocks from level 2 to 3 along the way a jump carries him (south).
    const overhead = (x: number, z: number, from: number, to: number) => Math.abs(x - 5) < 1 && z > 6 && from < 3 && to > 2
    const c = { ...ctx(grid, state, { jump: true, space: true }), dynamicSolid: overhead }
    for (let i = 0; i < 40; i++) tick(player, c)
    expect(player.position.y + 1.6).toBeLessThanOrEqual(2 + 1e-6)
  })
})

describe('Player on dynamic supports', () => {
  const lift = (x: number, z: number, top: number) => (px: number, pz: number, _py: number) =>
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

  it('is blocked by two boxes side by side though the gap between them lines up with his middle', () => {
    // map-4--2's chests: 1.5 deep, a cell apart, half a unit of gap between them; the door is on the gap.
    const { grid, state, player } = setupRoom()
    player.position.set(1, 0, 4)
    player.facing = 'east'
    const chest = (cz: number) => (px: number, pz: number) => (Math.abs(px - 7) < 1.125 && Math.abs(pz - cz) < 0.75 ? 1 : null)
    const c = { ...ctx(grid, state, { up: true }), dynamicSupport: (px: number, pz: number) => chest(3)(px, pz) ?? chest(5)(px, pz) }
    step(player, c, 40)
    expect(player.position.x).toBeLessThan(7 - 1.125)
  })

  it('lands on a box with only the edge of his body over it', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(4.3, 3, 4)
    player.state = 'airborne'
    const box = (px: number, pz: number) => (px < 4 && Math.abs(pz - 4) < 1 ? 1 : null)
    const c = { ...ctx(grid, state), dynamicSupport: box }
    for (let i = 0; i < 200 && (player.state as string) !== 'grounded'; i++) tick(player, c)
    expect(player.position.y).toBe(1)
  })

  it('falls when the dynamic support moves away', () => {
    const { grid, state, player } = setupRoom()
    player.position.set(4, 1, 4)
    let gone = false
    const c = { ...ctx(grid, state), dynamicSupport: (px: number, pz: number, py: number) => (gone ? null : lift(4, 4, 1)(px, pz, py)) }
    step(player, c)
    expect(player.state as string).toBe('grounded')
    gone = true
    step(player, c)
    expect(player.state).toBe('airborne')
  })
})

describe('Player under a table', () => {
  it('walks freely under a support that only counts near its top', () => {
    const { grid, state, player } = setupRoom()
    const table = (px: number, pz: number, py: number) => (Math.abs(px - 4) <= 1 && Math.abs(pz - 6) <= 1 && py >= 1 ? 1.5 : null)
    const c = { ...ctx(grid, state, { up: true }), dynamicSupport: table }
    step(player, c, 8)
    expect(player.position.z).toBe(6)
    expect(player.position.y).toBe(0)
  })
})

describe('Player placed at a door', () => {
  it('stands on a block his footprint is partly over, not half inside it (map--4--2 from the south)', () => {
    const { grid, state, player } = setupRoom()
    grid.setSolid(1, 7, true)
    grid.setSupport(1, 7, 1)
    player.respawnAt(4, 15, 'north')
    player.standOnWhatIsUnder(ctx(grid, state))
    expect(player.position.y).toBe(1)
  })
})

describe('Player respawn', () => {
  it('lands at the given spot facing the given way', () => {
    const { player } = setupRoom()
    player.respawnAt(9, 1, 'north')
    expect(player.position.x).toBe(9)
    expect(player.position.z).toBe(1)
    expect(player.facing).toBe('north')
    expect(player.state).toBe('grounded')
  })
})

describe('Player pickup', () => {
  it('takes a charm', () => {
    const { player } = setupRoom()
    let picked = false
    player.tryPickup(new Pickup('goblet'), () => { picked = true })
    expect(picked).toBe(true)
    expect(player.carrying).toEqual(['goblet'])
  })

  it('carries three, and hands back the one carried longest to take a fourth', () => {
    const { player } = setupRoom()
    let letGo: Pickup | undefined
    for (const id of ['gem', 'boot', 'teacup', 'poison']) player.tryPickup(new Pickup(id), (l) => { letGo = l })
    expect(player.carrying).toEqual(['poison', 'teacup', 'boot'])
    expect(letGo?.id).toBe('gem')
  })
})

// The original's put-down (0xC0DD): the charm goes under his feet, he a block up.
describe('Player putting a charm down under his feet', () => {
  it('stands on it a block higher, carrying one less', () => {
    const { player } = setupRoom()
    for (const id of ['gem', 'boot', 'teacup']) player.tryPickup(new Pickup(id), () => {})
    expect(player.putDownUnderFoot(true)?.id).toBe('gem')
    expect(player.position.y).toBe(CHARM_HEIGHT)
    expect(player.carrying).toEqual(['teacup', 'boot'])
  })

  it('with the satchel\'s last slot empty, only shifts the satchel along (0xC0B2)', () => {
    const { player } = setupRoom()
    player.tryPickup(new Pickup('gem'), () => {})
    expect(player.putDownUnderFoot(true)).toBeUndefined()
    expect(player.satchelSlots).toEqual([null, 'gem', null])
    expect(player.position.y).toBe(0)
  })

  it('does not with something over his head, nor in the air', () => {
    const { player } = setupRoom()
    player.tryPickup(new Pickup('gem'), () => {})
    expect(player.putDownUnderFoot(false)).toBeUndefined()
    player.state = 'airborne'
    expect(player.putDownUnderFoot(true)).toBeUndefined()
    expect(player.position.y).toBe(0)
    expect(player.carrying).toEqual(['gem'])
  })
})

describe('Player and a charm as a stepping stone', () => {
  // A two-block-high block on the tile south of Sabreman, and a charm at his feet.
  function stage() {
    const { grid, state, player } = setupRoom()
    grid.setSolid(2, 3, true)
    grid.setSupport(2, 3, 2)
    const charm = new Pickup('boot')
    charm.position.set(4, 0.4, 4)
    const c = (keys: Keys = {}) => ({ ...ctx(grid, state, keys), dynamicSupport: (x: number, z: number, y: number) => charm.supportAt(x, z, y) })
    return { player, c }
  }

  function jumpForward(player: Player, c: (keys?: Keys) => ReturnType<typeof ctx>): void {
    tick(player, c({ up: true, jump: true }))
    for (let i = 0; i < 400 && player.state !== 'grounded'; i++) tick(player, c())
  }

  it('cannot get onto a two-high block with a tapped jump from the floor', () => {
    const { player, c } = stage()
    player.position.set(4, 0, 4.8) // just past the charm, so it is not in the way
    jumpForward(player, c)
    expect(player.position.y).toBe(0)
  })

  it('gets onto a two-high block with a held jump from the floor', () => {
    const { player, c } = stage()
    player.position.set(4, 0, 4.8)
    tick(player, c({ jump: true, space: true }))
    for (let i = 0; i < 400 && player.state !== 'grounded'; i++) tick(player, c({ space: true }))
    expect(player.position.y).toBe(2)
  })

  it('stands on a charm lying on the floor, and jumps from it onto the block', () => {
    const { player, c } = stage()
    player.position.set(4, CHARM_HEIGHT, 4)
    step(player, c())
    expect(player.state).toBe('grounded')
    expect(player.position.y).toBe(CHARM_HEIGHT)
    jumpForward(player, c)
    expect(player.position.y).toBe(2)
  })
})
