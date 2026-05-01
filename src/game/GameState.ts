export type Form = 'human' | 'werewolf'

export const HUMAN_DURATION = 20
export const WEREWOLF_DURATION = 20

export class GameState {
  inventory: string[] = []
  form: Form = 'human'
  transformTimer: number = HUMAN_DURATION
  currentRoomId = 'the-hall'
  won = false

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
}
