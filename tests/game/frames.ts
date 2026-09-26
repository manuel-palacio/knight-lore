import { TICKS_PER_FRAME } from '../../src/engine/StepClock'
import { SIMULATION_DT } from '../../src/engine/GameLoop'
import type { UpdateContext } from '../../src/game/Entity'

interface Ticking {
  update(dt: number, ctx: UpdateContext): void
}

const ticksRun = new WeakMap<Ticking, number>()

// Runs something on the original's frame clock through whole frames: frame k
// falls on tick ceil(7.5 k), so the ticks it has had so far are remembered.
export function runFrames(thing: Ticking, frames: number, ctx: UpdateContext = {}): void {
  let ticks = ticksRun.get(thing) ?? 0
  const until = Math.ceil((Math.floor(ticks / TICKS_PER_FRAME) + frames) * TICKS_PER_FRAME)
  while (ticks < until) {
    thing.update(SIMULATION_DT, ctx)
    ticks++
  }
  ticksRun.set(thing, ticks)
}
