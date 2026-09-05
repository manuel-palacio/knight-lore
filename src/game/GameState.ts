import { shuffled } from '../engine/Random'

export type Form = 'human' | 'werewolf'

export const HUMAN_DURATION = 20
export const WEREWOLF_DURATION = 20

export const TOTAL_DAYS = 40
export const DUSK_WARNING = 2
export const STARTING_LIVES = 5
// Every charm in the game. The cauldron asks for all of them, one at a time,
// in an order drawn at the start of each game like the original.
export const ALL_ITEMS = ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison', 'life'] as const
export type ItemId = (typeof ALL_ITEMS)[number]

export type GameOverReason = 'days' | 'lives'

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
  readonly cureSequence: ItemId[]

  constructor(seed: number = Math.floor(Math.random() * 0x7fffffff)) {
    this.cureSequence = shuffled(ALL_ITEMS, seed)
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

  get wantedItem(): string | null {
    return this.cureSequence[this.cureProgress] ?? null
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
