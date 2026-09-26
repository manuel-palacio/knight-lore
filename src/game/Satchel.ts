// What Sabreman carries: up to three charms, as the original's inventory
// holds (slots at 0x5BD8, filled at 0xC141). Picking up a fourth hands back
// the one carried longest, to lie where the new one was; putting down gives
// the one carried longest too.
export const SATCHEL_SIZE = 3

export class Satchel<T extends { id: string }> {
  private carried: T[] = []

  get ids(): string[] {
    return this.carried.map((c) => c.id)
  }

  get isEmpty(): boolean {
    return this.carried.length === 0
  }

  // Takes a charm; returns the one it had to let go of to make room, if any.
  take(charm: T): T | undefined {
    this.carried.push(charm)
    return this.carried.length > SATCHEL_SIZE ? this.carried.shift() : undefined
  }

  putDownOldest(): T | undefined {
    return this.carried.shift()
  }

  // Hands over a charm of this kind, for the cauldron.
  handOver(id: string): T | undefined {
    const at = this.carried.findIndex((c) => c.id === id)
    return at < 0 ? undefined : this.carried.splice(at, 1)[0]
  }

  empty(): T[] {
    const all = this.carried
    this.carried = []
    return all
  }
}
