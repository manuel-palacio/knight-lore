// Fixed-timestep simulation + variable-rate render. Implements
// PHYSICS_AND_COLLISION.md § Fixed timestep.
const SIM_HZ = 60
const SIM_DT = 1 / SIM_HZ
const MAX_FRAME_DT = 0.25

type UpdateFn = (dt: number) => void
type RenderFn = () => void

export class GameLoop {
  private running = false
  private accumulator = 0
  private lastTime = 0
  private updateFns: UpdateFn[] = []
  private renderFns: RenderFn[] = []

  onUpdate(fn: UpdateFn): void {
    this.updateFns.push(fn)
  }

  onRender(fn: RenderFn): void {
    this.renderFns.push(fn)
  }

  start(): void {
    this.running = true
    this.lastTime = performance.now() / 1000
    requestAnimationFrame(this.frame)
  }

  stop(): void {
    this.running = false
  }

  private frame = (): void => {
    if (!this.running) return

    const now = performance.now() / 1000
    let frameDt = now - this.lastTime
    this.lastTime = now
    if (frameDt > MAX_FRAME_DT) frameDt = MAX_FRAME_DT

    this.accumulator += frameDt
    while (this.accumulator >= SIM_DT) {
      for (const fn of this.updateFns) fn(SIM_DT)
      this.accumulator -= SIM_DT
    }

    for (const fn of this.renderFns) fn()
    requestAnimationFrame(this.frame)
  }
}

export const SIMULATION_DT = SIM_DT
