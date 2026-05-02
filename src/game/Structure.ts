import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const WALL_H = 5

// Procedural brick texture in the Retroworks Knight Lore Remake style:
// warm dark-brown stones with a top-edge highlight and bottom-edge shadow
// (NW lighting convention) against near-black mortar. Bricks are oblong
// 2:1, staggered courses, tileable both axes — odd rows offset by half a
// brick and the c=-1 / c=COLS bricks ensure the half-brick wrap matches
// the adjacent tile.
const BRICK_BODY = '#4a3a28'
const BRICK_HIGHLIGHT = '#7a5d3d'
const BRICK_SHADOW = '#2a1f15'
const BRICK_MORTAR = '#0a0808'

function makeBrickCanvasTexture(): THREE.CanvasTexture {
  const W = 256
  const H = 128
  const COLS = 8
  const ROWS = 8
  const bw = W / COLS
  const bh = H / ROWS
  const m = 1
  const edge = 2

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = BRICK_MORTAR
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < ROWS; r++) {
    const y = r * bh
    const xOffset = (r % 2) * (bw / 2)
    for (let c = -1; c <= COLS; c++) {
      const x = c * bw + xOffset + m
      const innerW = bw - 2 * m
      const innerH = bh - 2 * m
      // Body
      ctx.fillStyle = BRICK_BODY
      ctx.fillRect(x, y + m, innerW, innerH)
      // Top edge highlight
      ctx.fillStyle = BRICK_HIGHLIGHT
      ctx.fillRect(x, y + m, innerW, edge)
      // Bottom edge shadow
      ctx.fillStyle = BRICK_SHADOW
      ctx.fillRect(x, y + m + innerH - edge, innerW, edge)
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

  // Walls: warm-brown shaded bricks (Retroworks Remake style) on near-black
  // mortar. MeshBasicMaterial keeps colours flat — no lighting, no shading
  // interference; the per-brick highlight/shadow IS the depth cue. Repeat
  // (3, 2) on a 16m × 5m wall ⇒ 24 bricks across × 16 rows tall.
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
