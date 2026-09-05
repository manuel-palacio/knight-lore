// Blocks have weight: the player must keep walking into one for a few
// steps before it shifts a tile, then charge up again for the next tile.
export class PushGauge {
  private charge = 0

  constructor(private readonly stepsPerTile: number) {}

  press(): boolean {
    this.charge++
    if (this.charge < this.stepsPerTile) return false
    this.charge = 0
    return true
  }

  release(): void {
    this.charge = 0
  }
}
