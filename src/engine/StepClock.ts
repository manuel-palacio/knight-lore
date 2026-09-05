// Filmation's coarse action clock. The simulation ticks at 60Hz but actors
// only act every TICKS_PER_STEP ticks, moving STEP_LENGTH world units, so
// everything stays on one lattice and moves with the same cadence.
export const TICKS_PER_STEP = 5
export const STEP_LENGTH = 0.25

export class StepClock {
  private ticks = 0

  tick(): boolean {
    this.ticks++
    return this.ticks % TICKS_PER_STEP === 0
  }
}
