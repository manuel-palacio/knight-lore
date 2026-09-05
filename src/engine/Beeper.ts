// ZX-style beeper: square-wave blips from a note table, no samples. The
// AudioContext is created lazily because browsers require a user gesture.

export interface Note {
  frequency: number
  duration: number
}

export type SoundName = 'step' | 'jump' | 'land' | 'pickup' | 'drop' | 'deliver' | 'transform' | 'hurt' | 'door' | 'win' | 'wrong' | 'day'

const note = (frequency: number, duration: number): Note => ({ frequency, duration })

export const SOUNDS: Record<SoundName, Note[]> = {
  step: [note(180, 0.02)],
  jump: [note(300, 0.04), note(450, 0.04), note(600, 0.05)],
  land: [note(220, 0.05)],
  pickup: [note(660, 0.05), note(880, 0.05), note(1320, 0.08)],
  drop: [note(440, 0.05), note(330, 0.06)],
  deliver: [note(523, 0.08), note(659, 0.08), note(784, 0.08), note(1047, 0.16)],
  transform: [note(200, 0.1), note(260, 0.1), note(200, 0.1), note(320, 0.1), note(200, 0.1), note(400, 0.12)],
  hurt: [note(160, 0.08), note(120, 0.12)],
  door: [note(392, 0.05), note(523, 0.07)],
  wrong: [note(220, 0.06), note(180, 0.1)],
  day: [note(784, 0.08), note(1047, 0.16)],
  win: [note(523, 0.12), note(659, 0.12), note(784, 0.12), note(1047, 0.12), note(784, 0.12), note(1047, 0.3)],
}

export class Beeper {
  private context: AudioContext | null = null

  play(name: SoundName): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    let at = ctx.currentTime
    for (const n of SOUNDS[name]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = n.frequency
      gain.gain.value = 0.06
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + n.duration)
      at += n.duration
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null
    if (!this.context) this.context = new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }
}
