import { describe, it, expect } from 'vitest'
import { hazardHunts, touchesHazard } from '../../src/game/Hazards'
import { GhostEnemy } from '../../src/game/GhostEnemy'
import { PathGuard } from '../../src/game/PathGuard'
import { Spike } from '../../src/game/SpikeGrid'
import { Portcullis } from '../../src/game/Portcullis'

describe('hazardHunts', () => {
  it('ghosts leave the man alone and hunt the wolf', () => {
    const ghost = new GhostEnemy(4, 4)
    expect(hazardHunts(ghost, 'human')).toBe(false)
    expect(hazardHunts(ghost, 'werewolf')).toBe(true)
  })

  it('guards and spikes hurt both forms', () => {
    const guard = new PathGuard([{ x: 1, z: 1 }, { x: 5, z: 1 }])
    const spike = new Spike(2, 2, 2)
    for (const form of ['human', 'werewolf'] as const) {
      expect(hazardHunts(guard, form)).toBe(true)
      expect(hazardHunts(spike, form)).toBe(true)
    }
  })
})

describe('touchesHazard', () => {
  const body = (x: number, y: number, z: number) => ({ position: { x, y, z }, extents: { x: 0.8, y: 1.6, z: 0.8 } })
  const spike = new Spike(2, 2, 2) // tile spans 4..6, centre 5

  it('spikes hurt only feet over the spike tile, so brushing the edge of a bed is safe', () => {
    expect(touchesHazard(body(5, 0, 5), spike)).toBe(true)
    expect(touchesHazard(body(3.8, 0, 5), spike)).toBe(false)
  })

  it('a jump carries Sabreman over a spike bed: every frame of the arc above the ground clears the teeth', () => {
    const lowestJumpFrame = Math.sin(Math.PI / 6) * 1.0
    expect(touchesHazard(body(5, lowestJumpFrame, 5), spike)).toBe(false)
    expect(touchesHazard(body(5, 0.3, 5), spike)).toBe(true)
  })

  it('other hazards hurt on any overlap of the bodies', () => {
    const guard = new PathGuard([{ x: 5, z: 5 }, { x: 9, z: 5 }])
    expect(touchesHazard(body(guard.position.x + 0.7, 0, guard.position.z), guard)).toBe(true)
  })

  it('a falling portcullis hurts only once its bottom edge comes down to Sabreman', () => {
    const gate = new Portcullis({ x: 0, z: 2 }, { x: 7, z: 2 }, 2)
    gate.position.y = 2.4
    expect(touchesHazard(body(5, 0, 5), gate)).toBe(false)
    gate.position.y = 1.0
    expect(touchesHazard(body(5, 0, 5), gate)).toBe(true)
  })
})
