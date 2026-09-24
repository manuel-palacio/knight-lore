import { shuffled } from '../engine/Random'

export type Form = 'human' | 'werewolf'

// A day is long enough to carry a charm from the far branches to the cauldron
// (about ten rooms); nights are shorter because the wolf can neither pick up
// nor deliver. Forty days come to about an hour of play.
export const HUMAN_DURATION = 60
export const WEREWOLF_DURATION = 30

export const TOTAL_DAYS = 40
export const DUSK_WARNING = 5
export const STARTING_LIVES = 5
// The seven kinds of charm. The cauldron asks for fourteen, each kind twice,
// one at a time, in an order drawn at the start of each game like the original.
export const CHARMS = ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison'] as const
export type Charm = (typeof CHARMS)[number]
export const CURE_LENGTH = CHARMS.length * 2
// Everything that can lie on the floor: the charms and the extra life.
export const ALL_ITEMS = [...CHARMS, 'life'] as const
export type ItemId = (typeof ALL_ITEMS)[number]

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
}

// Saves from earlier versions drew a different cure; continuing one would
// ask for charms the castle no longer holds.
export function isCompatibleSave(saved: { cureSequence: readonly string[] }): boolean {
  const charms: readonly string[] = CHARMS
  return saved.cureSequence.length === CURE_LENGTH && saved.cureSequence.every((item) => charms.includes(item))
}

export class GameState {
  inventory: string[] = []
  form: Form = 'human'
  transformTimer: number = HUMAN_DURATION
  currentRoomId = 'the-hall'
  won = false
  droppedItems: { id: string; x: number; z: number }[] = []

  lives = STARTING_LIVES
  dayCount = 1
  gameOver = false
  gameOverReason: GameOverReason | null = null
  cureProgress = 0
  readonly cureSequence: Charm[]

  constructor(seed: number = Math.floor(Math.random() * 0x7fffffff)) {
    this.cureSequence = shuffled([...CHARMS, ...CHARMS], seed)
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
  }

  onTransformed: () => void = () => {}
  onTransformWhileCarrying: (id: string) => void = () => {}
  onLifeLost: () => void = () => {}

  addItem(id: string): void {
    if (!this.inventory.includes(id)) this.inventory.push(id)
  }

  removeItem(id: string): void {
    this.inventory = this.inventory.filter((x) => x !== id)
  }

  hasItem(id: string): boolean {
    return this.inventory.includes(id)
  }

  toggleForm(): void {
    this.form = this.form === 'human' ? 'werewolf' : 'human'
    this.transformTimer = this.form === 'human' ? HUMAN_DURATION : WEREWOLF_DURATION
  }

  tickTransform(dt: number): void {
    this.transformTimer -= dt
    if (this.transformTimer <= 0) {
      if (this.form === 'human' && this.inventory.length > 0) {
        const id = this.inventory[0]!
        this.removeItem(id)
        this.onTransformWhileCarrying(id)
      }
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

  deliveredCount(item: string): number {
    return this.cureSequence.slice(0, this.cureProgress).filter((delivered) => delivered === item).length
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

  deliverCureItem(carrying: string | null): boolean {
    if (this.form !== 'human') return false
    if (carrying === null || carrying !== this.wantedItem) return false
    this.removeItem(carrying)
    this.cureProgress += 1
    if (this.cureProgress >= this.cureSequence.length) this.won = true
    return true
  }
}
