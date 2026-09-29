// The order to draw a room in, back to front, as the original sorts its
// objects: whatever lies wholly behind another (less x or less z: the camera
// looks from +x, +z) or wholly below it is drawn first. Where the boxes
// overlap, the depth number (see isoDepth) decides. A single number cannot
// do it alone: he stands on a block's back half with his middle behind the
// block's, yet must be drawn after it.
export interface Box {
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
}

export interface Boxed {
  box: Box
  depth: number
}

const TOUCHING = 1e-6

export function drawOrder<T extends Boxed>(items: T[]): T[] {
  const byDepth = [...items].sort((a, b) => a.depth - b.depth)
  const behind = byDepth.map(() => 0)
  const after: number[][] = byDepth.map(() => [])
  for (let i = 0; i < byDepth.length; i++) {
    for (let j = i + 1; j < byDepth.length; j++) {
      if (whollyBehind(byDepth[i]!.box, byDepth[j]!.box)) link(i, j)
      else if (whollyBehind(byDepth[j]!.box, byDepth[i]!.box)) link(j, i)
    }
  }
  function link(first: number, then: number): void {
    after[first]!.push(then)
    behind[then]!++
  }
  return drawnInTurn(byDepth, behind, after)
}

// Repeatedly the frontmost-in-depth-order item nothing undrawn lies behind;
// should the boxes ever tangle into a cycle, the depth order breaks it.
function drawnInTurn<T>(byDepth: T[], behind: number[], after: number[][]): T[] {
  const drawn = byDepth.map(() => false)
  const out: T[] = []
  while (out.length < byDepth.length) {
    let next = behind.findIndex((n, i) => n === 0 && !drawn[i])
    if (next < 0) next = drawn.indexOf(false)
    drawn[next] = true
    out.push(byDepth[next]!)
    for (const then of after[next]!) behind[then]!--
  }
  return out
}

function whollyBehind(a: Box, b: Box): boolean {
  return a.x1 <= b.x0 + TOUCHING || a.z1 <= b.z0 + TOUCHING || a.y1 <= b.y0 + TOUCHING
}
