import { FrameClock } from '../engine/StepClock'

// The stars Sabreman dissolves into when he loses a life, and comes back out
// of where he came into the room. Dying, the graphic steps from 0x70 (set at
// 0xBF21) to 0x77 every frame (handler 0xBF2B), and at 0x77 he is gone
// (0xBF3F); coming back, from 0x78 (the snapshot at 0xCAE8) to 0x7F every
// other frame (0xBEFE), and at 0x7F he is back (0xBF11). Each step sounds
// (see effects.ts). The graphics draw six sprites of stars, thin to thick
// (0x8164 to 0x840E): the strip's cells.
export type SparklePhase = 'idle' | 'dissolving' | 'rematerialising'

export type SparkleEvent = { kind: 'step'; graphic: number } | { kind: 'dissolved' } | { kind: 'rematerialised' }

const DISSOLVE_FROM = 0x70
const DISSOLVE_TO = 0x77
const REMATERIALISE_FROM = 0x78
const REMATERIALISE_TO = 0x7f
const STAR_CELLS: Record<number, number> = {
  0x70: 5, 0x71: 4, 0x72: 5, 0x73: 4, 0x74: 3, 0x75: 2, 0x76: 1, 0x77: 0,
  0x78: 0, 0x79: 1, 0x7a: 2, 0x7b: 3, 0x7c: 4, 0x7d: 5, 0x7e: 4, 0x7f: 5,
}

export class Sparkle {
  phase: SparklePhase = 'idle'
  graphic = 0
  private clock = new FrameClock()
  private frames = 0

  get starCell(): number {
    return STAR_CELLS[this.graphic] ?? 0
  }

  dissolve(): void {
    this.begin('dissolving', DISSOLVE_FROM)
  }

  rematerialise(): void {
    this.begin('rematerialising', REMATERIALISE_FROM)
  }

  // A tick of the game: on a frame of the original's clock, a step, or the end.
  update(): SparkleEvent | null {
    if (this.phase === 'idle' || !this.clock.tick()) return null
    this.frames++
    return this.phase === 'dissolving' ? this.dissolveOnAFrame() : this.rematerialiseOnAFrame()
  }

  private begin(phase: SparklePhase, graphic: number): void {
    this.phase = phase
    this.graphic = graphic
    this.clock = new FrameClock()
    this.frames = 0
  }

  private dissolveOnAFrame(): SparkleEvent {
    if (this.graphic === DISSOLVE_TO) return this.end('dissolved')
    return { kind: 'step', graphic: ++this.graphic }
  }

  private rematerialiseOnAFrame(): SparkleEvent | null {
    if (this.graphic === REMATERIALISE_TO) return this.end('rematerialised')
    if (this.frames % 2 === 0) return null
    return { kind: 'step', graphic: ++this.graphic }
  }

  private end(kind: 'dissolved' | 'rematerialised'): SparkleEvent {
    this.phase = 'idle'
    return { kind }
  }
}
