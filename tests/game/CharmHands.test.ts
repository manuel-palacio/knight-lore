import { describe, it, expect } from 'vitest'
import { CharmHands } from '../../src/game/CharmHands'
import { Cauldron } from '../../src/game/Cauldron'
import { GameState } from '../../src/game/GameState'
import { Pickup } from '../../src/game/Pickup'
import { Player } from '../../src/game/Player'
import { Room } from '../../src/game/Room'
import { SinkingCharm } from '../../src/game/SinkingCharm'
import type { Beeper } from '../../src/engine/Beeper'
import { runFrames } from './frames'

const quiet = { play: () => {}, playEffect: () => {} } as unknown as Beeper

function setUp(options: { cauldron?: boolean } = {}) {
  const room = new Room('test', 8, 8)
  if (options.cauldron) room.add(new Cauldron(8, 8))
  const state = new GameState(1)
  const player = new Player()
  player.position.set(3, 0, 3)
  return { room, state, player, hands: new CharmHands(player, state, quiet) }
}

const onFloor = (room: Room) => room.entities.filter((e) => e instanceof Pickup)

// Puts down the one charm he carries: the satchel shifts it along twice first.
function putDownAlone(hands: CharmHands, room: Room): void {
  for (let press = 0; press < 3; press++) hands.use(room)
}

function laid(room: Room, id: string, x: number): Pickup {
  const charm = new Pickup(id)
  charm.dropAt(x, 0.4, 13)
  room.add(charm)
  return charm
}

describe('CharmHands', () => {
  it('puts nothing down where two charms already lie (0xC081: two object slots)', () => {
    const { room, player, hands } = setUp()
    laid(room, 'gem', 13)
    laid(room, 'boot', 9)
    player.tryPickup(new Pickup('teacup'), () => {})
    putDownAlone(hands, room)
    expect(player.carrying).toEqual(['teacup'])
    expect(onFloor(room)).toHaveLength(2)
  })

  it('puts one down where only one lies', () => {
    const { room, player, hands } = setUp()
    laid(room, 'gem', 13)
    player.tryPickup(new Pickup('teacup'), () => {})
    putDownAlone(hands, room)
    expect(player.carrying).toEqual([])
    expect(onFloor(room)).toHaveLength(2)
  })

  it('by the cauldron, one charm on the floor fills it (its second slot is the sparkle)', () => {
    const { room, player, hands } = setUp({ cauldron: true })
    laid(room, 'gem', 13)
    player.tryPickup(new Pickup('teacup'), () => {})
    putDownAlone(hands, room)
    expect(player.carrying).toEqual(['teacup'])
  })

  it('put down up on the cauldron, the wanted charm glides in, sinks, and brews the cure; he stands meanwhile', () => {
    const { room, state, player, hands } = setUp({ cauldron: true })
    const wanted = state.wantedItem!
    player.position.set(7, 2, 7)
    player.tryPickup(new Pickup(wanted), () => {})
    putDownAlone(hands, room)
    const sinking = room.entities.find((e): e is SinkingCharm => e instanceof SinkingCharm)!
    expect(sinking.charm.id).toBe(wanted)
    expect(hands.delivering(room)).toBe(true)
    runFrames(room, 60)
    hands.settleDeliveries(room)
    expect(hands.delivering(room)).toBe(false)
    expect(state.cureProgress).toBe(1)
  })

  it('a wrong charm put into the cauldron is lost, and the cure does not go on (0xC265)', () => {
    const { room, state, player, hands } = setUp({ cauldron: true })
    const wrong = state.cureSequence.find((c) => c !== state.wantedItem)!
    const charm = new Pickup(wrong, 7)
    player.position.set(7, 2, 7)
    player.tryPickup(charm, () => {})
    putDownAlone(hands, room)
    runFrames(room, 60)
    hands.settleDeliveries(room)
    expect(state.cureProgress).toBe(0)
    expect(room.entities.some((e) => e instanceof SinkingCharm || e instanceof Pickup)).toBe(false)
    expect(state.usedSpots).toContain(7)
  })
})

describe('SinkingCharm', () => {
  it('glides a pixel a frame along each axis to the middle, then sinks to the floor', () => {
    const charm = new Pickup('gem')
    charm.dropAt(7, 2.4, 8)
    const sinking = new SinkingCharm(charm, { x: 8, z: 8 })
    runFrames(sinking, 1)
    expect(sinking.position.x).toBeCloseTo(7 + 1 / 8, 9)
    expect(sinking.position.z).toBe(8)
    runFrames(sinking, 7)
    expect(sinking.position.x).toBe(8)
    runFrames(sinking, 20)
    expect(sinking.sunk).toBe(true)
    expect(sinking.position.y).toBe(0)
  })
})
