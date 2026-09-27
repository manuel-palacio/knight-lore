// On-screen buttons read as the keys they stand for. Each finger holds at
// most one button, the one under it: sliding a thumb from one button of the
// d-pad to the next lets go of the first and holds the second, and lifting
// it (or the touch being cancelled) lets go. Several fingers hold several
// buttons at once, so he can walk and hold Jump together.
export interface KeySink {
  hold(code: string): void
  release(code: string): void
}

export class TouchPad {
  private readonly held = new Map<number, string>()

  constructor(private readonly sink: KeySink) {}

  // A finger comes down on a button, or slides onto one (or off it, `code` undefined).
  touch(pointer: number, code: string | undefined): void {
    const was = this.held.get(pointer)
    if (was === code) return
    this.held.delete(pointer)
    if (was && !this.isHeldByAnother(was)) this.sink.release(was)
    if (!code) return
    if (!this.isHeldByAnother(code)) this.sink.hold(code)
    this.held.set(pointer, code)
  }

  lift(pointer: number): void {
    this.touch(pointer, undefined)
  }

  private isHeldByAnother(code: string): boolean {
    return [...this.held.values()].includes(code)
  }
}
