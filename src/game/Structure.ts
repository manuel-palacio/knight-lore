import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const WALL_H = 5

// Procedural brick texture: oblong (2:1) staggered bricks rendered as
// filled magenta rectangles on black, matching the original Knight Lore
// Filmation engine. Canvas is tileable both axes — bottom row offset by
// half a brick, top/bottom seam aligns with row boundaries.
function makeBrickCanvasTexture(): THREE.CanvasTexture {
  const W = 256
  const H = 128
  const COLS = 8
  const ROWS = 8
  const bw = W / COLS
  const bh = H / ROWS
  const m = 1

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Black mortar background fills the gaps between bricks.
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  // Magenta brick fill (matches Knight Lore room palette in 1.png / 2.jpg).
  ctx.fillStyle = '#ff2bbe'

  for (let r = 0; r < ROWS; r++) {
    const y = r * bh
    const xOffset = (r % 2) * (bw / 2)
    // Draw with c=-1 and c=COLS so half-bricks at the offset row wrap into
    // the adjacent tile's matching half — no visible seam after tiling.
    for (let c = -1; c <= COLS; c++) {
      const x = c * bw + xOffset + m
      ctx.fillRect(x, y + m, bw - 2 * m, bh - 2 * m)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  return tex
}

export async function buildStructure(_loader: AssetLoader): Promise<THREE.Group> {
  const group = new THREE.Group()

  // Original Knight Lore look: floor is a featureless black void. Items,
  // characters, and walls pop against it. MeshBasicMaterial ignores lights
  // and the HDR environment so the surface stays pure black.
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, 0.3, 8 * TILE), floorMat)
  floor.position.set(8, -0.15, 8)
  group.add(floor)

  // Walls: filled magenta bricks on black mortar. MeshBasicMaterial keeps
  // the colours flat — no lighting, no shading interference. Repeat (3, 2)
  // on a 16m × 5m wall ⇒ 24 bricks across × 16 rows tall, matching the
  // density visible in the original game's screenshots.
  const brickTex = makeBrickCanvasTexture()
  brickTex.repeat.set(3, 2)
  const wallMat = new THREE.MeshBasicMaterial({ map: brickTex })

  // Knight Lore convention: render only the two BACK walls (north + west).
  // South + east are omitted so the player can see in. Collision still
  // works — Grid treats out-of-bounds cells as solid.
  const north = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, WALL_H, 0.3), wallMat)
  north.position.set(8, WALL_H / 2, 0)
  group.add(north)

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), wallMat)
  west.position.set(0, WALL_H / 2, 8)
  group.add(west)

  return group
}

export function buildLedgeMesh(material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
