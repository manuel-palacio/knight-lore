interface Cell {
  solid: boolean
  supportHeight: number
  occupant: unknown | null
}

export type Edge = 'north' | 'south' | 'east' | 'west'

export class Grid {
  readonly width: number
  readonly depth: number
  private cells: Cell[]
  // Cells beyond the edge he may walk into: a doorway's, the wall's thickness
  // under its arch, and how high its floor is (a raised doorway's sill).
  private readonly doorways = new Map<string, number>()

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

  // The two cells beyond the middle of an edge, either side of the doorway's
  // axis, their floor `height` blocks up.
  openDoorway(edge: Edge, height = 0): void {
    const midX = this.width / 2
    const midZ = this.depth / 2
    const cells = {
      north: [[midX - 1, -1], [midX, -1]],
      south: [[midX - 1, this.depth], [midX, this.depth]],
      west: [[-1, midZ - 1], [-1, midZ]],
      east: [[this.width, midZ - 1], [this.width, midZ]],
    }[edge]
    for (const [x, z] of cells) this.doorways.set(`${x},${z}`, height)
  }

  isSolid(x: number, z: number): boolean {
    // A raised doorway stands like a column: passed at its sill's height.
    if (!this.inBounds(x, z)) return (this.doorways.get(`${x},${z}`) ?? 1) > 0
    return this.cells[this.idx(x, z)]!.solid
  }

  setSolid(x: number, z: number, solid: boolean): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.solid = solid
  }

  supportHeight(x: number, z: number): number {
    if (!this.inBounds(x, z)) return this.doorways.get(`${x},${z}`) ?? 0
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
