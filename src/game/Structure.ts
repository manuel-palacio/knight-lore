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

// Knight Lore brick: bright OUTLINE on black with a horizontal interior
// stripe (per 0.png — each brick has visible internal lines). Used for
// SINGLE-brick meshes; texture is sized so one brick = one canvas tile.
export function makeBrickTexture(palette: BrickPalette = WALL_PALETTE): THREE.CanvasTexture {
  const W = 128
  const H = 64
  const stroke = 4

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = palette.body
  // Outline rectangle around the whole brick
  ctx.fillRect(0, 0, W, stroke)
  ctx.fillRect(0, H - stroke, W, stroke)
  ctx.fillRect(0, 0, stroke, H)
  ctx.fillRect(W - stroke, 0, stroke, H)

  // Two interior horizontal lines (gives the brick a "stacked thirds" look
  // matching the visible stripes inside each brick in 0.png).
  const lineThickness = 2
  ctx.fillRect(stroke, H / 3, W - 2 * stroke, lineThickness)
  ctx.fillRect(stroke, (2 * H) / 3, W - 2 * stroke, lineThickness)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
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

// BRICK WALL: per 0.png, walls are stacks of individual brick meshes with
// staggered rows. Each brick is a small textured box. The wall as a whole
// reads as "scattered stacked bricks on a void" rather than a smooth slab.
//
// Dimensions are configurable per room — different scenes vary wall
// height, brick density, gaps. Defaults match the original castle look.
const BRICK_W = 1.0       // brick width along the wall axis
const BRICK_H = 0.5       // brick height
const BRICK_D = 0.45      // brick depth (into the wall slab)
const WALL_HEIGHT = 3.6
const ARCH_TILE = 4

// Shared materials/geometry across all bricks — keeps draw count flat
// and the bricks visually identical.
const sharedBrickGeom = new THREE.BoxGeometry(BRICK_W, BRICK_H, BRICK_D)

function brickMaterial(palette: BrickPalette): THREE.MeshBasicMaterial {
  const tex = makeBrickTexture(palette)
  return new THREE.MeshBasicMaterial({ map: tex })
}

export interface WallOptions {
  height?: number          // wall height in metres (default 3.6)
  bricksAlong?: number     // number of brick columns along the wall (default 16)
  palette?: BrickPalette   // brick palette (default WALL_PALETTE)
  hasExit?: boolean        // punch a 2-brick-wide gap at the centre for a doorway
  battlement?: boolean     // jagged tops with offset cap bricks (default true)
}

function buildBrickWall(side: WallSide, opts: WallOptions = {}): THREE.Group {
  const group = new THREE.Group()
  const height = opts.height ?? WALL_HEIGHT
  const bricksAlong = opts.bricksAlong ?? 16
  const palette = opts.palette ?? WALL_PALETTE
  const hasExit = opts.hasExit ?? false
  const battlement = opts.battlement ?? true

  const rows = Math.max(1, Math.floor(height / BRICK_H))
  const mat = brickMaterial(palette)

  // Doorway gap: centre 2 brick columns for the arch
  const doorMin = Math.floor(bricksAlong / 2) - 1
  const doorMax = doorMin + 2
  const doorHeight = Math.min(rows, 6) // open up to 6 rows above the door

  for (let r = 0; r < rows; r++) {
    const y = r * BRICK_H + BRICK_H / 2
    const offset = (r % 2) * (BRICK_W / 2) // masonry stagger
    for (let c = 0; c < bricksAlong; c++) {
      // doorway: skip bricks where the arch sits
      if (hasExit && c >= doorMin && c < doorMax && r < doorHeight) continue
      // small ruined feel — drop a brick every now and then on top rows
      if (r === rows - 1 && (c + r) % 4 === 1) continue

      const along = c * BRICK_W + offset + BRICK_W / 2
      // skip bricks that fall outside the wall (the stagger can push them past)
      if (along > bricksAlong * BRICK_W - 0.05) continue

      const brick = new THREE.Mesh(sharedBrickGeom, mat)
      if (side === 'north') {
        brick.position.set(along, y, BRICK_D / 2)
      } else {
        brick.position.set(BRICK_D / 2, y, along)
      }
      group.add(brick)
    }
  }

  // Battlements: chunky tooth bricks above the top course on every other column.
  if (battlement) {
    for (let c = 1; c < bricksAlong; c += 2) {
      if (hasExit && c >= doorMin && c < doorMax) continue
      const along = c * BRICK_W
      const tooth = new THREE.Mesh(sharedBrickGeom, mat)
      tooth.scale.set(0.9, 0.9, 1.0)
      if (side === 'north') tooth.position.set(along, rows * BRICK_H + BRICK_H / 2, BRICK_D / 2)
      else tooth.position.set(BRICK_D / 2, rows * BRICK_H + BRICK_H / 2, along)
      group.add(tooth)
    }
  }

  return group
}

// Corner pillar — a column of stacked bricks taller than the walls.
function buildCornerPillar(palette: BrickPalette = WALL_PALETTE): THREE.Group {
  const group = new THREE.Group()
  const mat = brickMaterial(palette)
  const rows = Math.floor((WALL_HEIGHT + 0.8) / BRICK_H)
  for (let r = 0; r < rows; r++) {
    const brick = new THREE.Mesh(sharedBrickGeom, mat)
    brick.scale.set(0.8, 1, 0.8)
    brick.position.set(BRICK_D / 2, r * BRICK_H + BRICK_H / 2, BRICK_D / 2)
    group.add(brick)
  }
  return group
}

export interface ShellOptions {
  exits: WallSide[]      // which sides have exits (gaps + arches)
  wall?: WallOptions     // per-room wall styling (height, palette, density, battlements)
  cornerPillar?: boolean // NW corner pillar (default true). Disable for ruin look.
}

export async function buildStructure(_loader: AssetLoader, opts: ShellOptions = { exits: [] }): Promise<THREE.Group> {
  const group = new THREE.Group()

  // Pure-black void floor — no grid. Plane still kept so things above the
  // floor (player, items, blocks) z-sort correctly against the room walls.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8 * TILE, 8 * TILE),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(8, 0, 8)
  group.add(floor)

  const wallOpts = opts.wall ?? {}
  group.add(buildBrickWall('north', { ...wallOpts, hasExit: opts.exits.includes('north') }))
  group.add(buildBrickWall('west', { ...wallOpts, hasExit: opts.exits.includes('west') }))

  if (opts.cornerPillar ?? true) {
    group.add(buildCornerPillar(wallOpts.palette))
  }

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
