import { mulberry32 } from '../engine/Random'
import { TICKS_PER_FRAME } from '../engine/StepClock'
import { endSummary, type EndSummary } from './EndSummary'
import type { Facing } from './Facing'

export type Form = 'human' | 'werewolf'

// Day and night are the same length: every 8 frames the sun (or moon) moves
// a step along the scroll, 0xB0 to 0xE1, then the other rises (0xC397): 392
// frames, on the original's clock (FrameClock).
const HALF_DAY_FRAMES = (0xe1 - 0xb0) * 8
export const HUMAN_DURATION = (HALF_DAY_FRAMES * TICKS_PER_FRAME) / 60
export const WEREWOLF_DURATION = HUMAN_DURATION

const TOTAL_DAYS = 40
export const DUSK_WARNING = 5
const STARTING_LIVES = 5
// The seven kinds of charm. The cauldron asks for fourteen, each kind twice,
// one at a time, in an order drawn at the start of each game like the original.
export const CHARMS = ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison'] as const
export type Charm = (typeof CHARMS)[number]
// The cure, as the original asks for it (0xC27D), read round from a start
// chosen at the beginning of each game.
export const CURE_ORDER: readonly Charm[] = ['gem', 'poison', 'boot', 'goblet', 'teacup', 'wine-bottle', 'crystal-ball',
  'goblet', 'wine-bottle', 'gem', 'crystal-ball', 'poison', 'boot', 'teacup']
export const CURE_LENGTH = CURE_ORDER.length
// Everything that can lie on the floor: the charms and the extra life.
export const ALL_ITEMS = [...CHARMS, 'life'] as const
export type ItemId = (typeof ALL_ITEMS)[number]

// What lies at each of the castle's 32 charm spots (see charmSpots in the
// room specs): the kinds in graphic order from 0x60, dealt round the spots
// from one of eight starts chosen at the beginning of each game (0xC47E).
export const DEALT_ITEMS: readonly ItemId[] = ['gem', 'poison', 'boot', 'goblet', 'teacup', 'wine-bottle', 'crystal-ball', 'life']

export function itemAtSpot(spot: number, deal: number): ItemId {
  return DEALT_ITEMS[(deal + spot) % DEALT_ITEMS.length]!
}

export interface RoomEntry {
  x: number
  z: number
  facing: Facing
}

export type GameOverReason = 'days' | 'lives'

// Everything needed to pick a run back up. Carried items are not saved: the
// original made you put things down before a break too.
export interface SavedGame {
  form: Form
  transformTimer: number
  currentRoomId: string
  lives: number
  dayCount: number
  cureProgress: number
  cureSequence: Charm[]
  // Where the deal of charms round the castle started (see itemAtSpot).
  charmDeal: number
  // Where he came into the room, and which way he faced: he goes on from there.
  entry: RoomEntry
  // Spots whose charm was delivered or whose extra life was taken.
  usedSpots: number[]
  // Rooms he has been in, for the end screen's rating; missing in older saves.
  visitedRooms?: string[]
}

// Saves from earlier versions drew a different cure; continuing one would
// ask for charms the castle no longer holds.
export function isCompatibleSave(saved: { cureSequence: readonly string[]; charmDeal?: number; entry?: RoomEntry }): boolean {
  const charms: readonly string[] = CHARMS
  const cureOk = saved.cureSequence.length === CURE_LENGTH && saved.cureSequence.every((item) => charms.includes(item))
  return cureOk && typeof saved.charmDeal === 'number' && saved.entry !== undefined
}

export class GameState {
  form: Form = 'human'
  transformTimer: number = HUMAN_DURATION
  currentRoomId = 'the-hall'
  won = false

  lives = STARTING_LIVES
  dayCount = 1
  gameOver = false
  gameOverReason: GameOverReason | null = null
  cureProgress = 0
  readonly cureSequence: Charm[]
  charmDeal: number
  // Where he came into the current room (the middle of the start room at first).
  entry: RoomEntry = { x: 8, z: 8, facing: 'south' }
  // Spots whose charm is used up (delivered, or an extra life taken): rooms are built without it.
  readonly usedSpots: number[] = []
  // Rooms he has been in, as the original marks them in its bitmap at 0x5BE8.
  readonly visitedRooms = new Set<string>()

  constructor(seed: number = Math.floor(Math.random() * 0x7fffffff)) {
    const rand = mulberry32(seed)
    const start = Math.floor(rand() * CURE_ORDER.length)
    this.cureSequence = [...CURE_ORDER.slice(start), ...CURE_ORDER.slice(0, start)]
    this.charmDeal = Math.floor(rand() * DEALT_ITEMS.length)
  }

  serialize(): SavedGame {
    return {
      form: this.form,
      transformTimer: this.transformTimer,
      currentRoomId: this.currentRoomId,
      lives: this.lives,
      dayCount: this.dayCount,
      cureProgress: this.cureProgress,
      cureSequence: [...this.cureSequence],
      charmDeal: this.charmDeal,
      entry: { ...this.entry },
      usedSpots: [...this.usedSpots],
      visitedRooms: [...this.visitedRooms],
    }
  }

  static restore(saved: SavedGame): GameState {
    const state = new GameState()
    state.apply(saved)
    return state
  }

  // Load a save into this instance, keeping its wired callbacks.
  apply(saved: SavedGame): void {
    this.form = saved.form
    this.transformTimer = saved.transformTimer
    this.currentRoomId = saved.currentRoomId
    this.lives = saved.lives
    this.dayCount = saved.dayCount
    this.cureProgress = saved.cureProgress
    this.cureSequence.splice(0, this.cureSequence.length, ...saved.cureSequence)
    this.charmDeal = saved.charmDeal
    this.entry = { ...saved.entry }
    this.usedSpots.splice(0, this.usedSpots.length, ...saved.usedSpots)
    this.visitedRooms.clear()
    for (const id of saved.visitedRooms ?? [saved.currentRoomId]) this.visitedRooms.add(id)
  }

  // The end screen's summary of how it went (see EndSummary).
  get summary(): EndSummary {
    return endSummary({ days: Math.min(this.dayCount, TOTAL_DAYS), charms: this.cureProgress, roomsVisited: this.visitedRooms.size, won: this.won })
  }

  onTransformed: () => void = () => {}
  onLifeLost: () => void = () => {}

  toggleForm(): void {
    this.form = this.form === 'human' ? 'werewolf' : 'human'
    this.transformTimer = this.form === 'human' ? HUMAN_DURATION : WEREWOLF_DURATION
  }

  tickTransform(dt: number): void {
    this.transformTimer -= dt
    if (this.transformTimer <= 0) {
      this.toggleForm()
      this.onTransformed()
      if (this.form === 'human') {
        this.dayCount += 1
        if (this.dayCount > TOTAL_DAYS) {
          this.gameOver = true
          this.gameOverReason = 'days'
        }
      }
    }
  }

  // 0 at the start of the current form's spell, 1 when it is about to flip.
  get dayProgress(): number {
    const duration = this.form === 'human' ? HUMAN_DURATION : WEREWOLF_DURATION
    return Math.min(1, Math.max(0, 1 - this.transformTimer / duration))
  }

  get isDusk(): boolean {
    return this.transformTimer <= DUSK_WARNING
  }

  get wantedItem(): string | null {
    return this.cureSequence[this.cureProgress] ?? null
  }

  gainLife(): void {
    this.lives += 1
  }

  loseLife(): void {
    this.lives -= 1
    this.onLifeLost()
    if (this.lives <= 0) {
      this.gameOver = true
      this.gameOverReason = 'lives'
    }
  }

  // The cauldron takes a charm, man's or wolf's alike (0xC245): true when it
  // was the one wanted next, and the cure goes on.
  deliverCureItem(charm: string): boolean {
    if (charm !== this.wantedItem) return false
    this.cureProgress += 1
    if (this.cureProgress >= this.cureSequence.length) this.won = true
    return true
  }
}
