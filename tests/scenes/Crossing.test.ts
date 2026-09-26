import { describe, it, expect } from 'vitest'
import { centreOf, guardTrack, safeToCross, safeUnderBall, shouldWalkOn, sightingBefore, walkerTrack, type Point, type Sighting } from '../e2e/support/crossing'
import { dangersOf, findFloorPath } from '../e2e/support/roomPath'
import type { RoomSpec } from '../../src/scenes/rooms/roomSpecs'

const room = (extra: Partial<RoomSpec>): RoomSpec => ({ id: 'test', tint: 'blue', exits: [], spawn: { x: 0, z: 0 }, ...extra })

describe('guardTrack', () => {
  const line = [{ x: 3, z: 9 }, { x: 13, z: 9 }]

  // A quarter unit a frame of the original's clock, a frame a step and a half.
  const stride = 0.25 / 1.5

  it('goes on the way the guard was seen moving, a sixth of a unit a step', () => {
    const track = guardTrack(line, { x: 5, z: 9 }, { x: 5.25, z: 9 }, 3)!
    track.forEach((p, i) => expect(p.x).toBeCloseTo(5.25 + i * stride, 9))
  })

  it('turns back at the end of its line', () => {
    const track = guardTrack(line, { x: 12.75, z: 9 }, { x: 13, z: 9 }, 2)!
    track.forEach((p, i) => expect(p.x).toBeCloseTo(13 - i * stride, 9))
  })

  it('cannot place a guard seen standing still', () => {
    expect(guardTrack(line, { x: 5, z: 9 }, { x: 5, z: 9 }, 3)).toBeNull()
  })
})

describe('safeToCross', () => {
  // A corridor crossed north to south through row 4, where a guard paces x 0..7.
  const spec = room({ pathGuards: [{ path: [{ x: 0, z: 4 }, { x: 7, z: 4 }] }] })
  const path = findFloorPath(spec, { x: 4, z: 1 }, { x: 4, z: 7 })
  const into = path.findIndex((c) => c.z === 4)
  const walker = walkerTrack(path, into - 1, dangersOf(spec))
  const route = spec.pathGuards![0]!.path.map(centreOf)

  it('waits while the guard comes his way, to be where he crosses as he crosses', () => {
    expect(safeToCross(walker, (n) => guardTrack(route, { x: 5.75, z: 9 }, { x: 6, z: 9 }, n))).toBe(false)
  })

  it('goes once the guard has passed and is walking away', () => {
    expect(safeToCross(walker, (n) => guardTrack(route, { x: 10.75, z: 9 }, { x: 11, z: 9 }, n))).toBe(true)
  })

  it('goes ahead of a guard still far enough off', () => {
    expect(safeToCross(walker, (n) => guardTrack(route, { x: 1.75, z: 9 }, { x: 2, z: 9 }, n))).toBe(true)
  })
})

describe('safeUnderBall', () => {
  // Walking north from (4,5) to (4,3) under a ball bouncing on (4,4), up to 32 pixels.
  const spec = room({ balls: [{ x: 4, z: 4, height: 0 }] })
  const path = [{ x: 4, z: 5, y: 0 }, { x: 4, z: 4, y: 0 }, { x: 4, z: 3, y: 0 }]
  const walker = walkerTrack(path, 0, dangersOf(spec))
  const ball = centreOf({ x: 4, z: 4 })

  it('goes while the ball has just begun to rise, to be under it once it is over his head', () => {
    expect(safeUnderBall(walker, ball, 16, 32)).toBe(true)
  })

  it('waits while the ball is near its top, since it will be coming down on him', () => {
    expect(safeUnderBall(walker, ball, 30, 32)).toBe(false)
  })

  it('waits while the ball is too low to be over his head by the time he reaches it', () => {
    expect(safeUnderBall(walker, ball, 0, 32)).toBe(false)
  })
})

describe('shouldWalkOn', () => {
  const me = { x: 5, z: 12 }
  const north = { x: 0, z: -1 }
  // Seen 250 ms (three steps) apart: a ghost drifting a third of a unit a step.
  const seen = (before: Point, now: Point): [Sighting, Sighting] => [{ at: 750, wanderers: [now] }, { at: 500, wanderers: [before] }]

  it('walks on while the ghost drifts away from where he is going', () => {
    const [now, before] = seen({ x: 5, z: 4 }, { x: 5, z: 3 })
    expect(shouldWalkOn(me, north, now, before)).toBe(true)
  })

  it('stands while walking on would bring him into a ghost crossing ahead of him', () => {
    const [now, before] = seen({ x: 1, z: 9 }, { x: 2, z: 9 })
    expect(shouldWalkOn(me, north, now, before)).toBe(false)
  })

  it('walks on out of the way of a ghost coming at where he stands', () => {
    const [now, before] = seen({ x: 5, z: 17 }, { x: 5, z: 16 })
    expect(shouldWalkOn(me, { x: 1, z: 0 }, now, before)).toBe(true)
  })

  it('judges drift from a sighting at least 150 ms old', () => {
    const sightings = [{ at: 0, wanderers: [] }, { at: 100, wanderers: [] }, { at: 180, wanderers: [] }]
    expect(sightingBefore(sightings, 260)!.at).toBe(100)
  })
})
