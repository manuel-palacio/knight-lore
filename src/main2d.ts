// Full 2D Filmation game. Reuses the entire simulation (RoomManager, rooms,
// Player, collision, quest) and renders it with IsoRenderer instead of Three.js.
// A throwaway THREE.Scene is handed to RoomManager during the pivot; the unused
// 3D groups it collects are removed in milestone M3.
import * as THREE from 'three'
import { Input } from './engine/Input'
import { GameLoop } from './engine/GameLoop'
import { AssetLoader } from './engine/AssetLoader'
import { GameState } from './game/GameState'
import { HUD } from './game/HUD'
import { Player } from './game/Player'
import { Pickup } from './game/Pickup'
import { PushBlock } from './game/PushBlock'
import { Cauldron } from './game/Cauldron'
import { Spike } from './game/SpikeGrid'
import { PatrolEnemy } from './game/PatrolEnemy'
import { GhostEnemy } from './game/GhostEnemy'
import { Category } from './engine/categories'
import { Room } from './game/Room'
import { RoomManager } from './game/RoomManager'
import { ROOM_BUILDERS, START_ROOM } from './scenes/rooms/index'
import { IsoRenderer, spriteDynamic, type Dynamic, type SpriteDraw } from './engine/IsoRenderer'
import { projectToScreen, isoDepth } from './engine/IsoProjection'

const PICKUP_RANGE = 1.6
const PICKUP_HEIGHT = 1.8
const PUSH_RANGE_MAX = 1.5
const PUSH_RANGE_MIN = 0.4
// The sabreman sheet concatenates several facings; frames 5-12 are the clean
// single-direction stride. Loop only those (mirror handles left/right).
const HUMAN_SHEET_FRAMES = 26
const HUMAN_WALK_START = 5
const HUMAN_WALK_COUNT = 8
const WOLF_WALK_FRAMES = 5
const WALK_FPS = 9
const TRANSFORM_DURATION = 0.9
const CHAR_SCALE = 0.3

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load ${url}`))
    img.src = url
  })
}

// Recolour a sprite sheet to a flat tint (keeps alpha) so both forms read as one
// bright silhouette — the ZX monochrome character look, regardless of the
// source capture's colour (the wolf was extracted from a green recording).
const CHARACTER_TINT = '#f3e6c0'
function tintImage(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const x = c.getContext('2d')!
  x.drawImage(img, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  return c
}

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app missing')

  const input = new Input()
  const state = new GameState()
  const loader = new AssetLoader()
  const hud = new HUD()
  const renderer = new IsoRenderer(container, 760, 560, 2)

  const human = tintImage(await loadImage('/sprites/sabreman-walk.png'), CHARACTER_TINT)
  const wolf = tintImage(await loadImage('/sprites/sabrewulf-walk.png'), CHARACTER_TINT)
  const itemImages = new Map<string, HTMLImageElement>()
  for (const id of ['goblet', 'gem', 'wine-bottle', 'crystal-ball']) {
    itemImages.set(id, await loadImage(`/sprites/items/${id}.png`))
  }

  const scene = new THREE.Scene() // throwaway sink for RoomManager's 3D groups
  const manager = new RoomManager(scene, ROOM_BUILDERS, loader, state)
  const player = new Player()
  let carriedPickup: Pickup | null = null
  let transitioning = false

  // Character visual state (2D): form lags state.form across a short flicker.
  let visualForm: 'human' | 'werewolf' = 'human'
  let transformElapsed = TRANSFORM_DURATION
  let transformTarget: 'human' | 'werewolf' = 'human'
  let walkPhase = 0
  let facingRight = true
  let charMoving = false
  let lastPos = { x: player.position.x, z: player.position.z }

  function activeRoom(): Room {
    const room = manager.active
    if (!room) throw new Error('no active room')
    return room
  }

  function placePlayerAtSpawn(room: Room): void {
    player.position.set(room.spawnX, 0, room.spawnZ)
    player.renderPosition.copy(player.position)
    player.state = 'grounded'
    lastPos = { x: player.position.x, z: player.position.z }
  }

  const startRoom = await manager.transitionTo(START_ROOM, 5, 5)
  placePlayerAtSpawn(startRoom)

  const intro = document.getElementById('intro')
  window.addEventListener('keydown', (e) => {
    if (intro && intro.style.display !== 'none') intro.style.display = 'none'
    if (e.code === 'KeyR' && (state.gameOver || state.won)) location.reload()
  })

  state.onTransformed = () => {
    transformElapsed = 0
    transformTarget = state.form
  }

  // Dev hooks for verification.
  ;(window as unknown as { __t: () => void }).__t = () => { state.toggleForm(); state.onTransformed(); state.transformTimer = 9999 }
  ;(window as unknown as { __dbg: () => unknown }).__dbg = () => ({
    walkPhase: Number(walkPhase.toFixed(2)),
    frame: HUMAN_WALK_START + (Math.floor(walkPhase) % HUMAN_WALK_COUNT),
    state: player.state,
    pos: { x: Number(player.position.x.toFixed(2)), z: Number(player.position.z.toFixed(2)) },
  })
  state.onTransformWhileCarrying = () => dropCarried()
  state.onLifeLost = () => placePlayerAtSpawn(activeRoom())

  function dropCarried(): void {
    if (!carriedPickup) return
    carriedPickup.collected = false
    carriedPickup.active = true
    carriedPickup.position.set(player.position.x, 0.4, player.position.z)
    carriedPickup.renderPosition.copy(carriedPickup.position)
    carriedPickup = null
    player.carrying = null
  }

  function tryPickupPass(room: Room): void {
    if (!input.wasPressed('KeyE')) return
    for (const e of room.entities) {
      if (!(e instanceof Pickup) || e.collected) continue
      const near =
        Math.hypot(e.position.x - player.position.x, e.position.z - player.position.z) < PICKUP_RANGE &&
        Math.abs(e.position.y - player.position.y) < PICKUP_HEIGHT
      if (!near) continue
      player.tryPickup({ id: e.id, position: e.position }, state, () => {
        e.collect()
        carriedPickup = e
      })
      return
    }
  }

  function tryDeliverPass(room: Room): boolean {
    if (!input.wasPressed('KeyE')) return false
    const cauldron = room.entities.find((e): e is Cauldron => e instanceof Cauldron)
    if (!cauldron || !cauldron.isInRange(player.position)) return false
    if (!state.deliverCureItem(player.carrying)) return false
    carriedPickup = null
    player.carrying = null
    return true
  }

  function touchesHazard(h: { position: THREE.Vector3; extents: THREE.Vector3 }): boolean {
    return (
      Math.abs(player.position.x - h.position.x) < (player.extents.x + h.extents.x) / 2 &&
      Math.abs(player.position.z - h.position.z) < (player.extents.z + h.extents.z) / 2 &&
      player.position.y - h.position.y < h.extents.y
    )
  }

  function hazardPass(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.HAZARD)) continue
      if (touchesHazard(e)) {
        state.loseLife()
        return
      }
    }
  }

  function exitPass(): void {
    if (transitioning) return
    const exit = manager.exitAt(player.position.x, player.position.z)
    if (!exit) return
    transitioning = true
    manager
      .transitionTo(exit.targetRoomId, exit.entryX, exit.entryZ)
      .then((room) => {
        placePlayerAtSpawn(room)
        transitioning = false
      })
      .catch((err) => {
        console.error(err)
        transitioning = false
      })
  }

  function tryPullPass(room: Room): boolean {
    if (!input.wasPressed('KeyE')) return false
    for (const e of room.entities) {
      if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
      const block = e as PushBlock
      const dx = block.position.x - player.position.x
      const dz = block.position.z - player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist > PUSH_RANGE_MAX || dist <= PUSH_RANGE_MIN) continue
      const dominantX = Math.abs(dx) > Math.abs(dz)
      const dir = dominantX ? (dx > 0 ? 'west' : 'east') : (dz > 0 ? 'north' : 'south')
      if (block.tryPush(dir, room.grid, room.tileSize)) return true
    }
    return false
  }

  function handlePushAttempt(room: Room): void {
    const px = (input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0)
    const pz = (input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('ArrowUp') ? 1 : 0)
    if (px === 0 && pz === 0) return
    for (const e of room.entities) {
      if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
      const block = e as PushBlock
      const dx = block.position.x - player.position.x
      const dz = block.position.z - player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist > PUSH_RANGE_MAX || dist <= PUSH_RANGE_MIN) continue
      const dominantX = Math.abs(dx) > Math.abs(dz)
      if (dominantX) {
        if (Math.sign(dx) !== px) continue
        block.tryPush(px > 0 ? 'east' : 'west', room.grid, room.tileSize)
      } else {
        if (Math.sign(dz) !== pz) continue
        block.tryPush(pz > 0 ? 'south' : 'north', room.grid, room.tileSize)
      }
    }
  }

  function resolveActorOverlap(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.ACTOR_BODY)) continue
      const dx = player.position.x - e.position.x
      const dz = player.position.z - e.position.z
      const overlapX = (player.extents.x + e.extents.x) / 2 - Math.abs(dx)
      const overlapZ = (player.extents.z + e.extents.z) / 2 - Math.abs(dz)
      if (overlapX <= 0 || overlapZ <= 0) continue
      if (overlapX < overlapZ) player.position.x += dx >= 0 ? overlapX : -overlapX
      else player.position.z += dz >= 0 ? overlapZ : -overlapZ
    }
  }

  function updateCharacter(dt: number): void {
    const vx = (player.position.x - lastPos.x) / dt
    const vz = (player.position.z - lastPos.z) / dt
    lastPos = { x: player.position.x, z: player.position.z }
    const moving = Math.hypot(vx, vz) > 0.1
    charMoving = moving && player.state === 'grounded'
    if (charMoving) walkPhase += dt * WALK_FPS
    const screenVx = vx - vz
    if (Math.abs(screenVx) > 0.05) facingRight = screenVx > 0
    if (transformElapsed < TRANSFORM_DURATION) {
      transformElapsed += dt
      if (transformElapsed >= TRANSFORM_DURATION) visualForm = transformTarget
    }
  }

  function characterDynamic(): Dynamic {
    // During the transform window, flicker between the two forms (a clean,
    // asset-free morph until authentic transform frames are wired in).
    const morphing = transformElapsed < TRANSFORM_DURATION
    const showWolf = morphing
      ? Math.floor(transformElapsed * 24) % 2 === 0
        ? transformTarget === 'werewolf'
        : transformTarget !== 'werewolf'
      : visualForm === 'werewolf'
    const sheet = showWolf ? wolf : human
    const sheetFrames = showWolf ? WOLF_WALK_FRAMES : HUMAN_SHEET_FRAMES
    const frameW = sheet.width / sheetFrames
    const idx = showWolf
      ? (charMoving ? Math.floor(walkPhase) % WOLF_WALK_FRAMES : 0)
      : HUMAN_WALK_START + (charMoving ? Math.floor(walkPhase) % HUMAN_WALK_COUNT : 0)
    const sprite: SpriteDraw = {
      image: sheet,
      frameX: idx * frameW,
      frameW,
      frameH: sheet.height,
      scale: CHAR_SCALE,
      flip: !facingRight,
      x: player.renderPosition.x,
      y: player.renderPosition.y,
      z: player.renderPosition.z,
    }
    return spriteDynamic(sprite)
  }

  function entityDynamics(room: Room): Dynamic[] {
    const out: Dynamic[] = []
    for (const e of room.entities) {
      if (e instanceof Pickup) {
        if (e.collected || !e.active) continue
        const img = itemImages.get(e.id)
        if (!img) continue
        out.push(
          spriteDynamic({
            image: img,
            frameX: 0,
            frameW: img.width,
            frameH: img.height,
            scale: 0.5,
            flip: false,
            x: e.renderPosition.x,
            y: e.renderPosition.y,
            z: e.renderPosition.z,
          }),
        )
      } else if (e instanceof Cauldron) {
        // Rests on a platform: lift to its real height and sort in front of it.
        const depth = isoDepth(e.position.x, e.position.y, e.position.z) + 6
        out.push(proceduralDynamic(e.position.x, e.position.y, e.position.z, drawCauldron, depth))
      } else if (e instanceof Spike) {
        out.push(proceduralDynamic(e.position.x, 0, e.position.z, drawSpikes))
      } else if (e instanceof PatrolEnemy || e instanceof GhostEnemy) {
        out.push(proceduralDynamic(e.position.x, 0, e.position.z, drawEnemy))
      }
    }
    return out
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()
    if (state.gameOver || state.won) {
      hud.render(state, player.carrying)
      return
    }
    if (transitioning) return
    const room = activeRoom()
    const ctx = { input, state, grid: room.grid, tileSize: room.tileSize, onLanded: () => {}, onJumped: () => {} }
    player.update(dt, ctx)
    room.update(dt, ctx)
    handlePushAttempt(room)
    resolveActorOverlap(room)
    if (!tryDeliverPass(room)) {
      const had = player.carrying !== null
      tryPickupPass(room)
      if (!had && player.carrying === null) tryPullPass(room)
    }
    hazardPass(room)
    exitPass()
    state.tickTransform(dt)
    updateCharacter(dt)
    hud.render(state, player.carrying)
  })

  loop.onRender(() => {
    const room = manager.active
    if (!room) return
    room.updateRenderPositions(0.5)
    player.updateRenderPosition(0.5)
    renderer.render(room, [...entityDynamics(room), characterDynamic()])
  })

  loop.start()
}

// --- Procedural entity drawing (room-tinted iso shapes) ---

type ProcDraw = (ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: { top: string; right: string; left: string; line: string }) => void

function proceduralDynamic(x: number, y: number, z: number, draw: ProcDraw, depth?: number): Dynamic {
  return {
    x,
    y,
    z,
    depth,
    draw: (ctx, cfg, shades) => {
      const p = projectToScreen(x, y, z, cfg)
      draw(ctx, p.sx, p.sy, shades)
    },
  }
}

function drawCauldron(ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: ProcShades): void {
  // Rounded pot body
  ctx.fillStyle = shades.left
  ctx.beginPath()
  ctx.ellipse(sx, sy - 13, 17, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  // Bright rim
  ctx.fillStyle = shades.top
  ctx.beginPath()
  ctx.ellipse(sx, sy - 24, 17, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  // Dark brew
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(sx, sy - 24, 12, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  // Steam spikes
  ctx.fillStyle = shades.top
  for (const dx of [-8, 0, 8]) {
    ctx.beginPath()
    ctx.moveTo(sx + dx - 3, sy - 26)
    ctx.lineTo(sx + dx, sy - 40)
    ctx.lineTo(sx + dx + 3, sy - 26)
    ctx.closePath()
    ctx.fill()
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: ProcShades): void {
  ctx.fillStyle = shades.top
  for (let i = -1; i <= 1; i++) {
    const x = sx + i * 8
    ctx.beginPath()
    ctx.moveTo(x - 4, sy)
    ctx.lineTo(x, sy - 14)
    ctx.lineTo(x + 4, sy)
    ctx.closePath()
    ctx.fill()
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, sx: number, sy: number, shades: ProcShades): void {
  ctx.fillStyle = shades.top
  ctx.beginPath()
  ctx.ellipse(sx, sy - 16, 12, 16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(sx - 4, sy - 20, 2, 0, Math.PI * 2)
  ctx.arc(sx + 4, sy - 20, 2, 0, Math.PI * 2)
  ctx.fill()
}

interface ProcShades { top: string; right: string; left: string; line: string }

main().catch((err) => console.error(err))
