// What Sabreman carries: three slots, as the original's inventory (0x5BDC,
// 0x5BE0, 0x5BE4, drawn left to right at 0xBF56). A charm picked up goes
// into the first and the others shift along (0xC12B); what was in the last
// is let go of, to lie where the new one was (0xC164). E puts down what is in
// the last slot; with the last slot empty it only shifts them along (0xC0B2),
// so a charm carried alone takes three presses to come down.
export const SATCHEL_SIZE = 3

export class Satchel<T extends { id: string }> {
  private slots: (T | undefined)[] = Array.from({ length: SATCHEL_SIZE }, () => undefined)

  // The slots left to right, null where empty.
  get slotIds(): (string | null)[] {
    return this.slots.map((c) => c?.id ?? null)
  }

  // What he carries, newest first.
  get ids(): string[] {
    return this.slots.filter((c): c is T => c !== undefined).map((c) => c.id)
  }

  get isEmpty(): boolean {
    return this.slots.every((c) => c === undefined)
  }

  // What E would put down now: the last slot's charm, if any.
  get nextDown(): T | undefined {
    return this.slots[SATCHEL_SIZE - 1]
  }

  // Takes a charm; returns the one it had to let go of to make room, if any.
  take(charm: T): T | undefined {
    return this.shiftIn(charm)
  }

  // Empties the last slot, shifting the others along; returns what was in it.
  putDown(): T | undefined {
    return this.shiftIn(undefined)
  }

  private shiftIn(charm: T | undefined): T | undefined {
    const last = this.nextDown
    this.slots = [charm, ...this.slots.slice(0, -1)]
    return last
  }
}
