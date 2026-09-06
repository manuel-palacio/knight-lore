import { describe, it, expect } from 'vitest'
import { hazardHunts } from '../../src/game/Hazards'
import { GhostEnemy } from '../../src/game/GhostEnemy'
import { PathGuard } from '../../src/game/PathGuard'
import { Spike } from '../../src/game/SpikeGrid'

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
