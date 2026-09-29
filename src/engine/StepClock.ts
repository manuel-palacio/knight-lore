// Filmation's coarse action clock. The simulation ticks at 60Hz but actors
// only act every TICKS_PER_STEP ticks, moving STEP_LENGTH world units, so
// everything stays on one lattice and moves with the same cadence.
export const TICKS_PER_STEP = 2
export const STEP_LENGTH = 0.25

export class StepClock {
  private ticks = 0

  tick(): boolean {
    this.ticks++
    return this.ticks % TICKS_PER_STEP === 0
  }
}

// The original's own clock, for everything ripped frame by frame. It moves
// Sabreman three pixels a frame where he walks two a step here, so one of its
// frames lasts a step and a half. Walking across an empty room in the
// original (reference/recording.mov) he goes about 60 pixels a second: twenty
// frames, three ticks each. Each thing keeps the original's pixels per frame,
// and keeps its pace against Sabreman.
export const TICKS_PER_FRAME = (TICKS_PER_STEP * 3) / 2

export class FrameClock {
  private ticks = 0

  tick(): boolean {
    this.ticks++
    return Math.floor(this.ticks / TICKS_PER_FRAME) > Math.floor((this.ticks - 1) / TICKS_PER_FRAME)
  }
}
