import type { Note } from './Beeper'
import { toOriginalPixels, type Place, type RoomCells } from './OriginalPixels'
import { TICKS_PER_FRAME } from './StepClock'

// The original's sound effects, played on its beeper routine (0xB4ED): one
// square-wave cycle, the speaker on for B turns of a djnz loop and off for B
// more (B = 0 turns 256 times). At the Spectrum's 3.5 MHz a cycle takes about
// 26·B + 82 T-states, counting the loop that calls it. Each effect below
// replays its routine's loop, a run of cycles at one pitch making one note.
const CPU_HZ = 3_500_000
const T_STATES_A_TURN = 26
const T_STATES_A_CYCLE = 82

function silence(seconds: number): Note {
  return { frequency: 0, duration: seconds }
}

function cycles(b: number, count = 1): Note {
  const period = (T_STATES_A_TURN * (b === 0 ? 256 : b) + T_STATES_A_CYCLE) / CPU_HZ
  return { frequency: 1 / period, duration: period * count }
}

// Jump (0xB441, called as he takes off at 0xC964): 32 cycles, one each at
// the counter 32 down to 1 turned five bits right.
export const JUMP_EFFECT: Note[] = Array.from({ length: 32 }, (_, i) => {
  const c = 32 - i
  return cycles(((c >> 5) | (c << 3)) & 0xff)
})

// Pick up or put down (0xB4A3, called from the E key's routine at 0xC041):
// 16 cycles at pitch 0x80.
export const PICK_UP_EFFECT: Note[] = [cycles(0x80, 0x10)]

// The charms' graphic numbers (0x60 onward); dropped into the cauldron each
// is given bit 3 (0xC0D4).
const CHARM_GRAPHICS: Record<string, number> = {
  gem: 0x60, poison: 0x61, boot: 0x62, goblet: 0x63, teacup: 0x64, 'wine-bottle': 0x65, 'crystal-ball': 0x66,
}

// A pause between the delivery's flashes (0xC2C0): 0x2000 turns of a 26
// T-state loop, and the attribute pass before it (0xC2A7) about 56,000 more.
const DELIVERY_PAUSE = (0x2000 * 26 + 56_000) / CPU_HZ
const DELIVERY_FLASHES = 16

// Delivery (0xC2A5, called at 0xC258 as a charm goes into the cauldron):
// sixteen times, the screen's colours step round and the routine at 0xB403
// plays two cycles at each of the ROM's bytes, as many as the charm's
// graphic, complemented, has in its low five bits.
export function deliveryEffect(charm: string): Note[] {
  const burst = romBurst((CHARM_GRAPHICS[charm] ?? 0x60) | 0x08)
  return Array.from({ length: DELIVERY_FLASHES }, () => [...burst, silence(DELIVERY_PAUSE)]).flat()
}

// The seizure (0xB472, called every fourth frame of it at 0xC34F): a sweep of
// single cycles, pitch (c xor 0x55) + c for c counting down from 16, 24, 32
// or 40, as the pose drawn that frame (graphics 0x5C-0x5F) has it.
export const SEIZURE_BEAT = (4 * TICKS_PER_FRAME) / 60 // four of the original's frames
export function seizureEffect(poses: number[]): Note[] {
  return poses.flatMap((pose) => {
    const count = ((pose & 3) << 3) + 0x10
    const sweep = Array.from({ length: count }, (_, i) => {
      const c = count - i
      return cycles(((c ^ 0x55) + c) & 0xff)
    })
    const played = sweep.reduce((t, n) => t + n.duration, 0)
    return [...sweep, silence(Math.max(0, SEIZURE_BEAT - played))]
  })
}

// A table or a chest on the move (0xB467, from 0xC232 each frame one has
// moved): six cycles at a pitch from its place, x + y + z complemented and
// rotated left twice, so it glides as the box slides.
export function pushEffect(at: Place, room: RoomCells): Note[] {
  const px = toOriginalPixels(at, room)
  return [cycles(rotateLeftTwice(~Math.round(px.x + px.y + px.z) & 0xff), 6)]
}

// Coming back (0xB419, from 0xBF0B at each step of the stars, as the graphic
// goes from 0x79 to 0x7F): single cycles for c counting down from the graphic
// rotated left twice, low five bits, with bits 0 and 1 set; each at c rotated
// left twice.
export function rematerialiseEffect(graphic: number): Note[] {
  const count = (rotateLeftTwice(graphic) & 0x1f) | 0x03
  return Array.from({ length: count }, (_, i) => cycles(rotateLeftTwice(count - i)))
}

// The pitches the routine at 0xB403 plays (for a delivery and for losing a life): the Spectrum 48K ROM's bytes from
// 0x1234, where it reads them (the ROM is not part of the game's snapshot).
const ROM_FROM_0X1234 = [
  0xfb, 0x21, 0xb6, 0x5c, 0x22, 0x4f, 0x5c, 0x11, 0xaf, 0x15, 0x01, 0x15, 0x00, 0xeb, 0xed, 0xb0,
  0xeb, 0x2b, 0x22, 0x57, 0x5c, 0x23, 0x22, 0x53, 0x5c, 0x22, 0x4b, 0x5c, 0x36, 0x80, 0x23, 0x22,
]

// Losing a life (0xB403, from 0xBF31 at each step of the stars, as the
// graphic goes from 0x70 to 0x77): two cycles at each of the ROM's bytes, as
// many as the graphic, complemented, has in its low five bits.
export function dissolveEffect(graphic: number): Note[] {
  return romBurst(graphic)
}

// The routine at 0xB403 for a graphic: two cycles at each of the ROM's bytes,
// as many as the graphic, complemented, has in its low five bits.
function romBurst(graphic: number): Note[] {
  return ROM_FROM_0X1234.slice(0, ~graphic & 0x1f).map((b) => cycles(b, 2))
}

function rotateLeftTwice(value: number): number {
  return ((value << 2) | (value >> 6)) & 0xff
}
