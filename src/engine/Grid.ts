interface Cell {
  solid: boolean
  supportHeight: number
  occupant: unknown | null
}

export class Grid {
  readonly width: number
  readonly depth: number
  private cells: Cell[]

  constructor(width: number, depth: number) {
    this.width = width
    this.depth = depth
    this.cells = []
    for (let i = 0; i < width * depth; i++) {
      this.cells.push({ solid: false, supportHeight: 0, occupant: null })
    }
  }

  private idx(x: number, z: number): number {
    return z * this.width + x
  }

  private inBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.width && z >= 0 && z < this.depth
  }

  isSolid(x: number, z: number): boolean {
    if (!this.inBounds(x, z)) return true
    return this.cells[this.idx(x, z)]!.solid
  }

  setSolid(x: number, z: number, solid: boolean): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.solid = solid
  }

  supportHeight(x: number, z: number): number {
    if (!this.inBounds(x, z)) return 0
    return this.cells[this.idx(x, z)]!.supportHeight
  }

  setSupport(x: number, z: number, height: number): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.supportHeight = height
  }

  occupant(x: number, z: number): unknown | null {
    if (!this.inBounds(x, z)) return null
    return this.cells[this.idx(x, z)]!.occupant
  }

  setOccupant(x: number, z: number, occ: unknown | null): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.occupant = occ
  }
}
