// Room-change wipe: the screen goes black for a beat and input is ignored,
// like the original's redraw pause. If the next room is still loading when
// the beat ends, the wipe holds until it arrives.
export class Transition {
  private remaining = 0
  private waitingForRoom = false

  constructor(private readonly duration: number) {}

  get active(): boolean {
    return this.remaining > 0 || this.waitingForRoom
  }

  start(): void {
    this.remaining = this.duration
  }

  holdUntilLoaded(): void {
    this.waitingForRoom = true
  }

  loaded(): void {
    this.waitingForRoom = false
  }

  tick(dt: number): void {
    this.remaining = Math.max(0, this.remaining - dt)
  }
}
