// What colour each thing is drawn in. The original draws everything in a
// room in the room's one ink (faithful, the default). The map's colours
// (map.png) draw what hurts him red and what he takes, the cauldron and
// Sabreman himself white; walls, blocks, boxes and spikes stay the room's.
export type InkKind = 'room' | 'danger' | 'light'

const DANGER = 0xea3323
const LIGHT = 0xffffff
const SETTING = 'knight-lore.colours'

export class Palette {
  private coloured: boolean

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = browserStorage()) {
    this.coloured = this.read() === 'map'
  }

  get mapColours(): boolean {
    return this.coloured
  }

  toggle(): void {
    this.coloured = !this.coloured
    try {
      this.storage?.setItem(SETTING, this.coloured ? 'map' : 'faithful')
    } catch {
      // Not remembered (private window): the choice holds for this visit.
    }
  }

  ink(kind: InkKind, roomTint: number): number {
    if (!this.coloured || kind === 'room') return roomTint
    return kind === 'danger' ? DANGER : LIGHT
  }

  // Every ink the room is drawn in (see snapToInks).
  inks(roomTint: number): number[] {
    return this.coloured ? [roomTint, DANGER, LIGHT] : [roomTint]
  }

  private read(): string | null {
    try {
      return this.storage?.getItem(SETTING) ?? null
    } catch {
      return null
    }
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
