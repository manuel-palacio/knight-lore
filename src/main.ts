// Knight Lore: the Filmation simulation drawn by IsoRenderer onto a canvas.
import { Input } from './engine/Input'
import { GameLoop } from './engine/GameLoop'
import { GameState } from './game/GameState'
import { HUD } from './game/HUD'
import { Player } from './game/Player'
import { Pickup } from './game/Pickup'
import { PushBlock } from './game/PushBlock'
import { Cauldron } from './game/Cauldron'
import { Spike } from './game/SpikeGrid'
import { PatrolEnemy } from './game/PatrolEnemy'
import { GhostEnemy } from './game/GhostEnemy'
import { MovingPlatform } from './game/MovingPlatform'
import { PathGuard } from './game/PathGuard'
import { Category } from './engine/categories'
import { Room } from './game/Room'
import { RoomManager } from './game/RoomManager'
import { ROOM_BUILDERS, START_ROOM } from './scenes/rooms/index'
import { IsoRenderer, spriteDynamic, boxDynamic, type Dynamic, type SpriteDraw } from './engine/IsoRenderer'
import { selectCharacterFrame, STRIP_CELLS } from './game/CharacterFrame'
import { PushGauge } from './game/PushGauge'
import { Beeper } from './engine/Beeper'
import { projectToScreen, isoDepth } from './engine/IsoProjection'

const PICKUP_RANGE = 1.6
const PICKUP_HEIGHT = 1.8
const PUSH_RANGE_MAX = 1.5
const PUSH_RANGE_MIN = 0.4
const PUSH_STEPS_PER_TILE = 4
// Character strips are native ZX resolution, 24x36 cells per pose, drawn at
// 1:1 canvas pixels so the sprite stays crisp. Cells per form: STRIP_CELLS.
const TRANSFORM_FRAMES = 11
const TRANSFORM_DURATION = 2.2 // 11 morph stages at the original's ~0.2s each
const CHAR_SCALE = 1

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
  const hud = new HUD()
  const renderer = new IsoRenderer(container, 760, 560, 2)

  const transformStrip = tintImage(await loadImage('/sprites/sabreman-transform.png'), CHARACTER_TINT)
  const strips = {
    human: {
      front: tintImage(await loadImage('/sprites/sabreman-front.png'), CHARACTER_TINT),
      back: tintImage(await loadImage('/sprites/sabreman-back.png'), CHARACTER_TINT),
    },
    werewolf: {
      front: tintImage(await loadImage('/sprites/sabrewulf-front.png'), CHARACTER_TINT),
      back: tintImage(await loadImage('/sprites/sabrewulf-back.png'), CHARACTER_TINT),
    },
  }
  const setPieces = {
    cauldron: tintImage(await loadImage('/sprites/cauldron.png'), CHARACTER_TINT),
    ghost: tintImage(await loadImage('/sprites/ghost.png'), CHARACTER_TINT),
    guard: tintImage(await loadImage('/sprites/guard.png'), CHARACTER_TINT),
  }
  const itemImages = new Map<string, HTMLImageElement>()
  for (const id of ['goblet', 'gem', 'wine-bottle', 'crystal-ball']) {
    itemImages.set(id, await loadImage(`/sprites/items/${id}.png`))
  }

  const manager = new RoomManager(ROOM_BUILDERS, state)
  const player = new Player()
  const pushGauge = new PushGauge(PUSH_STEPS_PER_TILE)
  const beeper = new Beeper()
  let lastStepCount = 0
  let carriedPickup: Pickup | null = null
  let transitioning = false

  // Character visual state (2D): form lags state.form across a short flicker.
  let visualForm: 'human' | 'werewolf' = 'human'
  let transformElapsed = TRANSFORM_DURATION
  let transformTarget: 'human' | 'werewolf' = 'human'
  let charMoving = false

  function activeRoom(): Room {
    const room = manager.active
    if (!room) throw new Error('no active room')
    return room
  }

  function placePlayerAtSpawn(room: Room): void {
    player.position.set(room.spawnX, 0, room.spawnZ)
    player.state = 'grounded'
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
    beeper.play('transform')
    if (state.form === 'human') beeper.play('day')
  }

  // Dev hooks for verification.
  ;(window as unknown as { __t: () => void }).__t = () => { state.toggleForm(); state.onTransformed(); state.transformTimer = 9999 }
  ;(window as unknown as { __timer: (seconds: number) => void }).__timer = (seconds) => { state.transformTimer = seconds }
  ;(window as unknown as { __room: (id: string) => void }).__room = (id) => {
    transitioning = true
    manager.transitionTo(id, 5, 5).then((room) => { placePlayerAtSpawn(room); transitioning = false })
  }
  ;(window as unknown as { __pos: (x: number, y: number, z: number) => void }).__pos = (x, y, z) => {
    player.position.set(x, y, z)
  }
  ;(window as unknown as { __dbg: () => unknown }).__dbg = () => ({
    steps: player.stepsTaken,
    frame: selectCharacterFrame(player.facing, player.stepsTaken, charMoving, player.state !== 'grounded', visualForm),
    form: visualForm,
    state: player.state,
    facing: player.facing,
    pos: { x: Number(player.position.x.toFixed(2)), y: Number(player.position.y.toFixed(2)), z: Number(player.position.z.toFixed(2)) },
    platforms: activeRoom().entities.filter((e) => e instanceof MovingPlatform).map((e) => ({ x: e.position.x, z: e.position.z })),
  })
  state.onTransformWhileCarrying = () => {
    dropCarried()
    beeper.play('drop')
    hud.flashCarrySlot()
  }
  state.onLifeLost = () => placePlayerAtSpawn(activeRoom())

  function dropCarried(): void {
    if (!carriedPickup) return
    carriedPickup.collected = false
    carriedPickup.active = true
    carriedPickup.position.set(player.position.x, 0.4, player.position.z)
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
        beeper.play('pickup')
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
    if (!state.deliverCureItem(player.carrying)) {
      if (player.carrying) beeper.play('wrong')
      return false
    }
    beeper.play(state.won ? 'win' : 'deliver')
    carriedPickup = null
    player.carrying = null
    return true
  }

  function touchesHazard(h: { position: { x: number; y: number; z: number }; extents: { x: number; y: number; z: number } }): boolean {
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
        beeper.play('hurt')
        return
      }
    }
  }

  function exitPass(): void {
    if (transitioning) return
    const exit = manager.exitAt(player.position.x, player.position.z)
    if (!exit) return
    transitioning = true
    beeper.play('door')
    manager
      .transitionTo(exit.targetRoomId, exit.entryX, exit.entryZ)
      .then((room) => {
        placePlayerAtSpawn(room)
        player.facing = exit.direction
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

  // The gauge charges once per step walked into the block, not per tick, so
  // blocks feel heavy: four steps of shoving before a tile of movement.
  function handlePushAttempt(room: Room, stepped: boolean): void {
    if (!input.isDown('ArrowUp') || player.state !== 'grounded') {
      pushGauge.release()
      return
    }
    if (!stepped) return
    const px = player.facing === 'east' ? 1 : player.facing === 'west' ? -1 : 0
    const pz = player.facing === 'south' ? 1 : player.facing === 'north' ? -1 : 0
    for (const e of room.entities) {
      if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
      const block = e as PushBlock
      const dx = block.position.x - player.position.x
      const dz = block.position.z - player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist > PUSH_RANGE_MAX || dist <= PUSH_RANGE_MIN) continue
      const dominantX = Math.abs(dx) > Math.abs(dz)
      if (dominantX ? Math.sign(dx) !== px : Math.sign(dz) !== pz) continue
      if (!pushGauge.press()) return
      const dir = dominantX ? (px > 0 ? 'east' : 'west') : (pz > 0 ? 'south' : 'north')
      if (block.tryPush(dir, room.grid, room.tileSize)) beeper.play('drop')
      return
    }
    pushGauge.release()
  }

  function dynamicSupportAt(room: Room, x: number, z: number): number | null {
    let best: number | null = null
    for (const e of room.entities) {
      if (!(e instanceof MovingPlatform)) continue
      const h = e.supportAt(x, z)
      if (h !== null && (best === null || h > best)) best = h
    }
    return best
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
    charMoving = input.isDown('ArrowUp') && player.state === 'grounded'
    if (transformElapsed < TRANSFORM_DURATION) {
      transformElapsed += dt
      if (transformElapsed >= TRANSFORM_DURATION) visualForm = transformTarget
    }
  }

  function morphing(): boolean {
    return transformElapsed < TRANSFORM_DURATION
  }

  // The morph strip was captured facing west; mirror it for the east-ish facings.
  function transformSprite(): SpriteDraw {
    const progress = transformElapsed / TRANSFORM_DURATION
    const stage = Math.min(TRANSFORM_FRAMES - 1, Math.floor(progress * TRANSFORM_FRAMES))
    const frame = transformTarget === 'werewolf' ? stage : TRANSFORM_FRAMES - 1 - stage
    const frameW = transformStrip.width / TRANSFORM_FRAMES
    return {
      image: transformStrip,
      frameX: frame * frameW,
      frameW,
      frameH: transformStrip.height,
      scale: CHAR_SCALE,
      flip: player.facing === 'north' || player.facing === 'east',
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    }
  }

  function characterDynamic(): Dynamic {
    if (morphing()) return spriteDynamic(transformSprite())
    const selected = selectCharacterFrame(player.facing, player.stepsTaken, charMoving, player.state !== 'grounded', visualForm)
    const sheet = strips[visualForm][selected.view]
    const frameW = sheet.width / STRIP_CELLS[visualForm]
    const sprite: SpriteDraw = {
      image: sheet,
      frameX: selected.frame * frameW,
      frameW,
      frameH: sheet.height,
      scale: CHAR_SCALE,
      flip: selected.flip,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
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
            x: e.position.x,
            y: e.position.y + e.bobOffset,
            z: e.position.z,
          }),
        )
      } else if (e instanceof Cauldron) {
        // Rests on a platform: lift to its real height and sort in front of it.
        const depth = isoDepth(e.position.x, e.position.y, e.position.z) + 6
        out.push({ ...setPieceSprite(setPieces.cauldron, e.position.x, e.position.y, e.position.z), depth })
      } else if (e instanceof Spike) {
        out.push(spikeDynamic(e.position.x, e.position.z))
      } else if (e instanceof GhostEnemy) {
        out.push(setPieceSprite(setPieces.ghost, e.position.x, e.position.y, e.position.z))
      } else if (e instanceof PatrolEnemy) {
        out.push(setPieceSprite(setPieces.guard, e.position.x, 0, e.position.z))
      } else if (e instanceof PathGuard) {
        const flip = e.facing === 'south' || e.facing === 'west'
        out.push(setPieceSprite(setPieces.guard, e.position.x, 0, e.position.z, flip))
      } else if (e instanceof MovingPlatform) {
        const half = e.extents.x / 2
        out.push(boxDynamic({ x0: e.position.x - half, x1: e.position.x + half, z0: e.position.z - half, z1: e.position.z + half, y0: 0, y1: e.height }))
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
    const ctx = {
      input,
      state,
      grid: room.grid,
      tileSize: room.tileSize,
      playerPosition: player.position,
      dynamicSupport: (x: number, z: number) => dynamicSupportAt(room, x, z),
      onLanded: () => beeper.play('land'),
      onJumped: () => beeper.play('jump'),
    }
    if (!morphing()) player.update(dt, ctx)
    const stepped = player.stepsTaken !== lastStepCount
    if (stepped) {
      lastStepCount = player.stepsTaken
      beeper.play('step')
    }
    room.update(dt, ctx)
    handlePushAttempt(room, stepped)
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
    renderer.render(room, [...entityDynamics(room), characterDynamic()])
    if (state.isDusk && !morphing()) drawDusk()
  })

  // The last seconds before a transform: the room flickers dark, as a warning.
  function drawDusk(): void {
    const ctx = renderer.canvas.getContext('2d')
    if (!ctx) return
    const flicker = Math.floor(performance.now() / 120) % 2 === 0
    ctx.fillStyle = flicker ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height)
  }

  loop.start()
}

// --- Set-piece drawing ---

function setPieceSprite(image: HTMLCanvasElement, x: number, y: number, z: number, flip = false): Dynamic {
  return spriteDynamic({ image, frameX: 0, frameW: image.width, frameH: image.height, scale: 1, flip, x, y, z })
}

// A bed of thin needles across the tile, like the original's spike pits:
// 1px verticals of varied height on a fixed pseudo-random spread per tile.
const NEEDLES = 32

function spikeDynamic(x: number, z: number): Dynamic {
  return {
    x,
    y: 0,
    z,
    draw: (ctx, cfg, shades) => {
      ctx.strokeStyle = shades.top
      ctx.lineWidth = 1
      let seed = Math.floor(x * 7 + z * 13)
      const next = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
      const half = cfg.tile / 2
      for (let i = 0; i < NEEDLES; i++) {
        const px = x - half + 0.15 * cfg.tile + next() * 0.7 * cfg.tile
        const pz = z - half + 0.15 * cfg.tile + next() * 0.7 * cfg.tile
        const base = projectToScreen(px, 0, pz, cfg)
        const height = 6 + Math.floor(next() * 12)
        const sx = Math.round(base.sx) + 0.5
        const sy = Math.round(base.sy)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx, sy - height)
        ctx.stroke()
      }
    },
  }
}

main().catch((err) => console.error(err))
