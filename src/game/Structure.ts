import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const TEXTURE_ANISOTROPY = 16

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
  // sRGB so painted pixels match canvas colours (canvas treated as linear
  // by default → gamma-corrected on output → brightened ~2x).
  tex.colorSpace = THREE.SRGBColorSpace
  // Anisotropic filtering preserves brick detail at the 45° isometric
  // angle. 16x is the common GPU max; three.js silently clamps to the
  // device's actual capability.
  tex.anisotropy = TEXTURE_ANISOTROPY
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
  const stoneMat = new THREE.MeshBasicMaterial({ color: WALL_PALETTE.highlight })

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

// Hand-authored fragment heights per wall tile (0 = gap). Tiles 2 and 6
// stay tall on both walls — they carry the torch brackets (Torch.ts
// TORCH_POSITIONS). Two different rhythms so the walls don't mirror.
const NORTH_HEIGHTS = [3.4, 2.2, 4.6, 1.4, 0, 2.6, 4.2, 1.8]
const WEST_HEIGHTS = [2.4, 4.4, 4.8, 1.0, 2.0, 0, 4.0, 2.8]

// Ruin wall: one brick fragment per tile with jagged varied heights and
// gaps, plus rubble caps on the tall pieces — the original game's rooms
// are broken silhouettes against black, not solid slabs.
function buildRuinWall(heights: number[], axis: 'north' | 'west'): THREE.Group {
  const group = new THREE.Group()
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i]!
    if (h <= 0) continue
    const along = i * TILE + TILE / 2

    const tex = makeBrickTexture(WALL_PALETTE)
    tex.repeat.set(1, h / 1.25)
    // MeshBasicMaterial: paint at full brightness regardless of lights.
    // Mono post-pass picks up the brick highlights/shadows from the texture
    // alone, matching the ZX Spectrum "no shading, just paint" style.
    const mat = new THREE.MeshBasicMaterial({ map: tex })

    const fragment = new THREE.Mesh(new THREE.BoxGeometry(TILE, h, 0.5), mat)
    if (axis === 'north') fragment.position.set(along, h / 2, 0)
    else {
      fragment.rotation.y = Math.PI / 2
      fragment.position.set(0, h / 2, along)
    }
    group.add(fragment)

    // rubble cap: an offset half-brick on top breaks the box outline
    if (h >= 3) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), mat)
      const offset = i % 2 === 0 ? -0.4 : 0.35
      if (axis === 'north') cap.position.set(along + offset, h + 0.25, 0)
      else {
        cap.rotation.y = Math.PI / 2
        cap.position.set(0, h + 0.25, along + offset)
      }
      group.add(cap)
    }
  }
  return group
}

export async function buildStructure(_loader: AssetLoader): Promise<THREE.Group> {
  const group = new THREE.Group()

  // No floor mesh, no shadows — Knight Lore rooms are stages in a void.
  // Architecture renders with MeshBasicMaterial (full-bright) and the mono
  // post-pass paints the rest black.

  group.add(buildRuinWall(NORTH_HEIGHTS, 'north'))
  group.add(buildRuinWall(WEST_HEIGHTS, 'west'))

  // Broken arch standing in the north wall's gap (tile 4) — silhouette
  // landmark per the reference screenshots.
  group.add(buildArch(4 * TILE + TILE / 2, 0.25))

  return group
}

export function buildLedgeMesh(material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
