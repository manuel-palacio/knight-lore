import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const WALL_H = 5

export interface BrickPalette {
  body: string
  highlight: string
  shadow: string
  mortar: string
}

export const WALL_PALETTE: BrickPalette = {
  body: '#4a3a28',
  highlight: '#7a5d3d',
  shadow: '#2a1f15',
  mortar: '#0a0808',
}

export const SANDSTONE_PALETTE: BrickPalette = {
  body: '#a87650',
  highlight: '#d4a070',
  shadow: '#603810',
  mortar: '#1a0e0a',
}

export const AMBER_BLOCK_PALETTE: BrickPalette = {
  body: '#8b5a2b',
  highlight: '#c08050',
  shadow: '#5a3010',
  mortar: '#10080a',
}

// Procedural shaded brick (oblong 2:1, staggered, NW lighting). Tileable
// both axes — odd rows offset by half a brick; c=-1 / c=COLS bricks ensure
// the half-brick wrap aligns at the seam. Each call builds a fresh canvas
// and Texture so callers can set their own repeat without sharing state.
export function makeBrickTexture(palette: BrickPalette = WALL_PALETTE): THREE.CanvasTexture {
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

  ctx.fillStyle = palette.mortar
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < ROWS; r++) {
    const y = r * bh
    const xOffset = (r % 2) * (bw / 2)
    for (let c = -1; c <= COLS; c++) {
      const x = c * bw + xOffset + m
      const innerW = bw - 2 * m
      const innerH = bh - 2 * m
      ctx.fillStyle = palette.body
      ctx.fillRect(x, y + m, innerW, innerH)
      ctx.fillStyle = palette.highlight
      ctx.fillRect(x, y + m, innerW, edge)
      ctx.fillStyle = palette.shadow
      ctx.fillRect(x, y + m + innerH - edge, innerW, edge)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  // Match the renderer's sRGB output expectation. Without this the painted
  // pixels are treated as linear and gamma-corrected on output, brightening
  // every colour by ~2x — turns dark brown into pale tan.
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Procedural square stone-tile floor (no stagger, NW lighting). Reuses the
// BrickPalette interface — the SANDSTONE_PALETTE gives the warm 3.png look,
// but any palette works. Each call is a fresh canvas + texture so callers
// can set their own repeat without sharing state.
export function makeFloorTexture(palette: BrickPalette = SANDSTONE_PALETTE): THREE.CanvasTexture {
  const W = 256
  const H = 256
  const COLS = 8
  const ROWS = 8
  const tw = W / COLS
  const th = H / ROWS
  const m = 1
  const edge = 1

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = palette.mortar
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * tw + m
      const y = r * th + m
      const w = tw - 2 * m
      const h = th - 2 * m
      ctx.fillStyle = palette.body
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = palette.highlight
      ctx.fillRect(x, y, w, edge)
      ctx.fillStyle = palette.shadow
      ctx.fillRect(x, y + h - edge, w, edge)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Stone arch: two columns flanking a 2m-wide doorway with a half-torus
// crown. Solid-color stone material — at column scale (0.3m wide), tiling
// the brick texture would compress bricks unrecognizably.
export function buildArch(centerX: number, z: number): THREE.Group {
  const group = new THREE.Group()
  const colW = 0.3
  const colH = 3
  const archR = 1
  const archTube = 0.15
  const stoneMat = new THREE.MeshBasicMaterial({ color: WALL_PALETTE.body })

  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colW), stoneMat)
  leftCol.position.set(centerX - archR, colH / 2, z)
  group.add(leftCol)

  const rightCol = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colW), stoneMat)
  rightCol.position.set(centerX + archR, colH / 2, z)
  group.add(rightCol)

  // Default torus is in XY plane (axis along Z) — already aligned with the
  // south wall plane. Arc 0..PI traces the upper semicircle.
  const archTop = new THREE.Mesh(
    new THREE.TorusGeometry(archR, archTube, 8, 16, Math.PI),
    stoneMat,
  )
  archTop.position.set(centerX, colH, z)
  group.add(archTop)

  return group
}

// Wall torch: dark bracket + bright flame cone. Pairs visually with the
// warm PointLight in Lighting.ts so the eye sees what's casting the glow.
export function buildTorch(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group()

  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.3, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x2a1a10 }),
  )
  bracket.position.set(x, y, z)
  group.add(bracket)

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.4, 6),
    new THREE.MeshBasicMaterial({ color: 0xff9040 }),
  )
  flame.position.set(x, y + 0.3, z)
  group.add(flame)

  return group
}

export async function buildStructure(_loader: AssetLoader): Promise<THREE.Group> {
  const group = new THREE.Group()

  // Sandstone tiled floor (3.png reference). Repeat (2, 2) on a 16m × 16m
  // floor ⇒ 16 tiles across, ~1m per tile — chunky paving stones that read
  // clearly at our orthographic camera distance.
  const floorTex = makeFloorTexture(SANDSTONE_PALETTE)
  floorTex.repeat.set(2, 2)
  const floorMat = new THREE.MeshBasicMaterial({ map: floorTex })
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, 0.3, 8 * TILE), floorMat)
  floor.position.set(8, -0.15, 8)
  group.add(floor)

  // Walls: warm-brown shaded bricks (Retroworks Remake palette).
  const wallTex = makeBrickTexture(WALL_PALETTE)
  wallTex.repeat.set(3, 2)
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex })

  // Render only the two BACK walls (north + west). Collision still works:
  // Grid treats out-of-bounds cells as solid regardless of visible mesh.
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
