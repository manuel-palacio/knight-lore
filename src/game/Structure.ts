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
  body: '#a07840',
  highlight: '#f0c878',
  shadow: '#503020',
  mortar: '#1a0e08',
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

export type WallSide = 'north' | 'south' | 'east' | 'west'

// Knight Lore brick: bright OUTLINE on black, not a filled brick. Each cell
// is mostly empty (so the mono pass paints it black like the void) with
// chunky 2-pixel borders drawn in the palette body colour. After the
// mono shader's luminance quantisation, the outlines snap to the room's
// tint at full brightness and the interiors snap to pure black — the
// "wireframe brick wall on a void" look from 1.png / 4.png / 5.png.
//
// Staggered rows like a real masonry course; the c=-1 / c=COLS bricks
// keep the half-brick wrap aligned at the texture seam.
export function makeBrickTexture(palette: BrickPalette = WALL_PALETTE): THREE.CanvasTexture {
  const W = 256
  const H = 128
  const COLS = 8
  const ROWS = 8
  const bw = W / COLS
  const bh = H / ROWS
  const stroke = 2 // outline thickness in canvas px

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Black background everywhere — bricks paint their outline on top.
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = palette.body
  for (let r = 0; r < ROWS; r++) {
    const y = r * bh
    const xOffset = (r % 2) * (bw / 2)
    for (let c = -1; c <= COLS; c++) {
      const x = c * bw + xOffset
      // Top edge of the brick
      ctx.fillRect(x, y, bw, stroke)
      // Bottom edge (also draws the gap to next row)
      ctx.fillRect(x, y + bh - stroke, bw, stroke)
      // Left edge
      ctx.fillRect(x, y, stroke, bh)
      // Right edge
      ctx.fillRect(x + bw - stroke, y, stroke, bh)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = TEXTURE_ANISOTROPY
  return tex
}

// Floor: thin tile-outline grid on black, like the brick walls. The mono
// shader paints the outlines in the room tint and the rest pure black,
// so the floor reads as "void with a faint grid" — the original game's
// stage feel, not a high-contrast chequer.
function makeFloorTexture(): THREE.CanvasTexture {
  const W = 256
  const H = 256
  const N = 8
  const cell = W / N
  const stroke = 2
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#a07840'
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = c * cell
      const y = r * cell
      ctx.fillRect(x, y, cell, stroke)
      ctx.fillRect(x, y, stroke, cell)
    }
  }
  // close the last row/col
  ctx.fillRect(0, H - stroke, W, stroke)
  ctx.fillRect(W - stroke, 0, stroke, H)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = TEXTURE_ANISOTROPY
  return tex
}

// Stone arch: two columns flanking a 2m-wide doorway with a half-torus
// crown. Solid-color stone material — at column scale (0.3m wide), tiling
// the brick texture would compress bricks unrecognizably.
export function buildArch(centerX: number, z: number): THREE.Group {
  const group = new THREE.Group()
  const colW = 0.35
  const colH = 3.2
  const archR = 1.05
  const archTube = 0.18
  const stoneMat = new THREE.MeshBasicMaterial({ color: WALL_PALETTE.highlight })

  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colW), stoneMat)
  leftCol.position.set(centerX - archR, colH / 2, z)
  group.add(leftCol)

  const rightCol = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colW), stoneMat)
  rightCol.position.set(centerX + archR, colH / 2, z)
  group.add(rightCol)

  const archTop = new THREE.Mesh(
    new THREE.TorusGeometry(archR, archTube, 8, 16, Math.PI),
    stoneMat,
  )
  archTop.position.set(centerX, colH, z)
  group.add(archTop)

  return group
}

// SOLID wall: full brick course at WALL_HEIGHT for every tile EXCEPT the
// arch tile (which is left open and gets a stone arch instead). Adds
// battlement caps along the top — alternating square teeth — for the
// Knight Lore castle silhouette.
const WALL_HEIGHT = 3.6
const ARCH_TILE = 4 // centre tile (cell 4) reserved for the doorway

function buildSolidWall(side: WallSide, hasExit: boolean): THREE.Group {
  const group = new THREE.Group()
  const tileCount = 8

  // Brick texture has 8 columns x 8 rows on its 256x128 canvas. We want
  // the outlines to be readable at the iso camera distance, so each visible
  // brick should be ~1m wide x ~0.5m tall in world space.
  // Slab is 2m wide x WALL_HEIGHT tall. 2 bricks wide => repeat.x = 0.25
  // (8 cols * 0.25 = 2). WALL_HEIGHT / 0.5 brick rows => repeat.y = (h/0.5)/8.
  const tex = makeBrickTexture(WALL_PALETTE)
  tex.repeat.set(0.25, WALL_HEIGHT / 4)
  const wallMat = new THREE.MeshBasicMaterial({ map: tex })
  const capMat = new THREE.MeshBasicMaterial({ color: WALL_PALETTE.highlight })

  for (let i = 0; i < tileCount; i++) {
    if (hasExit && i === ARCH_TILE) continue // open doorway
    const along = i * TILE + TILE / 2

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(TILE, WALL_HEIGHT, 0.5),
      wallMat,
    )
    if (side === 'north') slab.position.set(along, WALL_HEIGHT / 2, 0)
    else {
      slab.rotation.y = Math.PI / 2
      slab.position.set(0, WALL_HEIGHT / 2, along)
    }
    group.add(slab)

    // Battlement: a small tooth on top of every other tile.
    if (i % 2 === 0) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.55), capMat)
      if (side === 'north') tooth.position.set(along, WALL_HEIGHT + 0.22, 0)
      else {
        tooth.rotation.y = Math.PI / 2
        tooth.position.set(0, WALL_HEIGHT + 0.22, along)
      }
      group.add(tooth)
    }
  }

  return group
}

// Corner pillar at the NW corner — anchors the room visually so the camera
// sees a clear "front of the castle" silhouette.
function buildCornerPillar(): THREE.Mesh {
  const tex = makeBrickTexture(WALL_PALETTE)
  // Pillar is 0.8m wide — show 1 brick across, ~5 rows tall.
  tex.repeat.set(0.125, (WALL_HEIGHT + 0.5) / 4)
  const mat = new THREE.MeshBasicMaterial({ map: tex })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, WALL_HEIGHT + 0.5, 0.8), mat)
  mesh.position.set(0, (WALL_HEIGHT + 0.5) / 2, 0)
  return mesh
}

export interface ShellOptions {
  exits: WallSide[] // which sides have exits (controls wall openings + arches)
}

export async function buildStructure(_loader: AssetLoader, opts: ShellOptions = { exits: [] }): Promise<THREE.Group> {
  const group = new THREE.Group()

  // Floor: chequered stone tiles. Was a single dark slab; now a tiled
  // pattern that reads under the mono pass.
  const floorTex = makeFloorTexture()
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8 * TILE, 8 * TILE),
    new THREE.MeshBasicMaterial({ map: floorTex }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(8, 0, 8)
  group.add(floor)

  // North + west walls (the two visible from the iso camera).
  group.add(buildSolidWall('north', opts.exits.includes('north')))
  group.add(buildSolidWall('west', opts.exits.includes('west')))

  // Corner pillar at NW.
  group.add(buildCornerPillar())

  // Arches at any exits the camera can see (n/w). South/east exits — the
  // player walks off the front-facing edge so no arch needed.
  if (opts.exits.includes('north')) {
    group.add(buildArch(ARCH_TILE * TILE + TILE / 2, 0.25))
  }
  if (opts.exits.includes('west')) {
    const arch = buildArch(0, 0)
    arch.rotation.y = Math.PI / 2
    arch.position.set(0.25, 0, ARCH_TILE * TILE + TILE / 2)
    group.add(arch)
  }

  return group
}
