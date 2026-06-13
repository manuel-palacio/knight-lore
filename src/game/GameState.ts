export type Form = 'human' | 'werewolf'

export const HUMAN_DURATION = 20
export const WEREWOLF_DURATION = 20

export const TOTAL_DAYS = 40
export const STARTING_LIVES = 5
export const CURE_SEQUENCE = ['goblet', 'gem', 'wine-bottle', 'crystal-ball'] as const

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

  get wantedItem(): string | null {
    return CURE_SEQUENCE[this.cureProgress] ?? null
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
    if (this.cureProgress >= CURE_SEQUENCE.length) this.won = true
    return true
  }
}
