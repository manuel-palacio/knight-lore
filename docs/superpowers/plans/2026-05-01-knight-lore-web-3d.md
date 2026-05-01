# Knight Lore Web 3D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the vertical-slice MVP defined in `docs/superpowers/specs/2026-05-01-knight-lore-web-3d-design.md` — a single playable room ("The Hall, redux") in three.js + TypeScript, exercising every core mechanic (movement, jump, push, block-as-step, pickup with form-gated carry, werewolf transformation, patrol enemy avoidance, win condition).

**Architecture:** Plain three.js (no engine framework, no ECS, no physics library). Custom fixed-timestep game loop. Entities as plain TS classes with `update(dt, ctx)`. Logical grid-quantized simulation positions; visual-only render-position interpolation. Hand-painted (toon) hero meshes against PBR structural environment. Authored GLBs from Tripo + Mixamo for characters/props; CC0 PBR from Poly Haven for tileable surfaces.

**Tech Stack:** three.js, Vite, TypeScript, Vitest, pnpm. Tripo3D + Mixamo (assets, manual). Poly Haven (textures, manual).

**Reference:** Spec at `docs/superpowers/specs/2026-05-01-knight-lore-web-3d-design.md`. Art direction at `docs/ART_DIRECTION.md`, `docs/VISUAL_DO_NOTS.md`, `docs/PHYSICS_AND_COLLISION.md`, `docs/ROOM_CHALLENGES.md`.

---

## File structure (post-implementation)

```
knight-lore/
├── docs/                             ← unchanged
├── public/
│   └── favicon.svg
├── assets/
│   ├── models/
│   │   ├── knight.glb
│   │   ├── werewolf.glb
│   │   ├── push_block.glb
│   │   ├── goblet.glb
│   │   ├── door.glb
│   │   └── chained_cauldron.glb
│   ├── textures/
│   │   ├── stone_wall_diffuse.jpg
│   │   ├── stone_wall_normal.jpg
│   │   ├── stone_wall_roughness.jpg
│   │   ├── stone_floor_diffuse.jpg
│   │   ├── stone_floor_normal.jpg
│   │   ├── stone_floor_roughness.jpg
│   │   └── castle_dungeon.hdr
│   └── _source/                      ← raw Tripo outputs, dated
├── src/
│   ├── main.ts                       ← entry point, wires GameLoop + Room + GameState
│   ├── engine/
│   │   ├── epsilons.ts               ← named tolerance constants
│   │   ├── categories.ts             ← Category enum
│   │   ├── Grid.ts                   ← logical grid + cell queries
│   │   ├── Collision.ts              ← swept AABB with axis tracking
│   │   ├── GameLoop.ts               ← fixed-timestep simulation + render loop
│   │   ├── Input.ts                  ← keyboard state, isDown / wasPressed
│   │   ├── AssetLoader.ts            ← GLTFLoader + TextureLoader wrapper, cache
│   │   ├── Renderer.ts               ← three.js Scene + WebGLRenderer + ortho camera
│   │   ├── EventBus.ts               ← tiny pub/sub
│   │   └── DebugOverlay.ts           ← wireframe collision shapes, toggle key
│   ├── game/
│   │   ├── Entity.ts                 ← base class for all entities
│   │   ├── GameState.ts              ← inventory, form, transformTimer
│   │   ├── Player.ts                 ← knight/werewolf controller
│   │   ├── PushBlock.ts              ← dynamic + support
│   │   ├── StaticBlock.ts            ← world solid + support (for ledge)
│   │   ├── Pickup.ts                 ← carryable
│   │   ├── Door.ts                   ← opens-when state
│   │   ├── PatrolEnemy.ts            ← linear back-and-forth
│   │   ├── SetPiece.ts               ← decorative-only
│   │   ├── Room.ts                   ← composes entities + grid + lights
│   │   ├── HUD.ts                    ← DOM overlay
│   │   ├── Materials.ts              ← MeshToonMaterial setup for heroes
│   │   └── ParticleBurst.ts          ← transformation effect
│   ├── scenes/
│   │   └── TheHall.ts                ← MVP room build function
│   └── types.d.ts                    ← shared types
├── tests/
│   ├── engine/
│   │   ├── Grid.test.ts
│   │   └── Collision.test.ts
│   └── game/
│       ├── Player.test.ts
│       ├── PushBlock.test.ts
│       ├── Werewolf.test.ts
│       └── GameState.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .gitignore
├── README.md
└── docs/
    └── STYLE_ANCHOR.md               ← reference image + prompt fragment
```

---

# PHASE 0 — Repo migration & bootstrap

## Task 1: Preserve legacy code on a branch

**Files:** None modified. Branch operation only.

- [ ] **Step 1: Verify current commit and branch**

```bash
git status
git log -1 --oneline
```

Expected: clean working tree on `main`, latest commit somewhere around `f8ac6ad` or later.

- [ ] **Step 2: Create and push legacy branch**

```bash
git branch legacy-android
git push -u origin legacy-android
```

Expected: branch created and pushed.

- [ ] **Step 3: Verify**

```bash
git branch -a | grep legacy-android
```

Expected: shows both `legacy-android` and `remotes/origin/legacy-android`.

---

## Task 2: Remove Kotlin/Android scaffolding

**Files:**
- Delete: `app/`, `core/`, `data/`, `desktop/`, `domain/`, `feature-debug/`, `input/`, `render/`, `build/`, `build-logic/`, `config/`, `tools/`, `gradle/`, `.gradle/`, `.kotlin/`, `.idea/`
- Delete: `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradlew`, `gradlew.bat`, `local.properties`
- Keep: `docs/`, `README.md`, `.gitignore`, `.git/`, `.github/` (we'll modify CI), `1.png`

- [ ] **Step 1: Remove directories**

```bash
git rm -rf app core data desktop domain feature-debug input render build build-logic config tools gradle
rm -rf .gradle .kotlin .idea
```

- [ ] **Step 2: Remove top-level build files**

```bash
git rm -f build.gradle.kts settings.gradle.kts gradle.properties gradlew gradlew.bat local.properties
```

- [ ] **Step 3: Verify only intended files remain**

```bash
ls -la
```

Expected output (top-level): `docs/`, `README.md`, `.gitignore`, `.github/`, `1.png`, `.git/` only. No Gradle artifacts.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Kotlin/Android scaffolding ahead of three.js rewrite"
```

---

## Task 3: Bootstrap Vite + three.js + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `.gitignore` additions

- [ ] **Step 1: Initialize package.json**

```bash
pnpm init
```

- [ ] **Step 2: Replace generated package.json**

Overwrite `package.json` with:

```json
{
  "name": "knight-lore",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests --ext .ts",
    "lint:no-render-pos": "! grep -rn 'renderPosition' src --include='*.ts' | grep -v 'src/engine/Renderer.ts' | grep -v 'src/game/Entity.ts'"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.55.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm install
```

Expected: install completes, `pnpm-lock.yaml` created, `node_modules/` populated.

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
})
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 7: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Knight Lore</title>
    <style>
      body { margin: 0; overflow: hidden; background: #000; font-family: 'Courier New', monospace; }
      #app { width: 100vw; height: 100vh; }
      #hud { position: fixed; top: 12px; left: 12px; color: #ffefc4; font-size: 14px; pointer-events: none; }
      #hud div { margin-bottom: 4px; }
      #win { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); color: #ffefc4; font-size: 48px; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <div id="hud">
      <div id="hud-form"></div>
      <div id="hud-timer"></div>
      <div id="hud-carry"></div>
    </div>
    <div id="win">YOU WIN</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 8: Create stub `src/main.ts`**

```ts
console.log('Knight Lore — placeholder. Real wiring lands in Task 28.')
```

- [ ] **Step 9: Create directory layout**

```bash
mkdir -p public assets/models assets/textures assets/_source src/engine src/game src/scenes tests/engine tests/game
```

- [ ] **Step 10: Update `.gitignore`**

Append to `.gitignore`:

```
node_modules/
dist/
.vite/
*.log
.DS_Store
```

- [ ] **Step 11: Verify dev server starts**

```bash
pnpm dev
```

Expected: server starts on port 5173, browser opens, console shows the placeholder log.

Stop the server (Ctrl+C).

- [ ] **Step 12: Verify tests run**

```bash
pnpm test
```

Expected: vitest reports "no test files found" cleanly (not an error).

- [ ] **Step 13: Verify build**

```bash
pnpm build
```

Expected: `dist/` directory created with bundled output.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: initialize Vite + three.js + TypeScript scaffolding"
```

---

## Task 4: Configure ESLint + GitHub Actions CI

**Files:**
- Create: `.eslintrc.cjs`, `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
```

- [ ] **Step 2: Run lint to verify config**

```bash
pnpm lint
```

Expected: no errors (no source files yet to lint).

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm lint:no-render-pos
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.cjs .github/workflows/ci.yml
git commit -m "chore: add eslint + GitHub Actions CI"
```

---

# PHASE 1 — Engine core (TDD)

## Task 5: Epsilons and collision categories

**Files:**
- Create: `src/engine/epsilons.ts`, `src/engine/categories.ts`

- [ ] **Step 1: Create `src/engine/epsilons.ts`**

```ts
// Centralized tolerance constants. PHYSICS_AND_COLLISION.md rule 5:
// no magic numbers in entity code.
export const EPS = {
  OVERLAP: 1e-4,
  GROUNDED_GAP: 1e-3,
  TRIGGER: 1e-3,
} as const
```

- [ ] **Step 2: Create `src/engine/categories.ts`**

```ts
// The 9 collision categories mandated by PHYSICS_AND_COLLISION.md.
// Every entity declares one or more. Behavior dispatches on category pairs.
export enum Category {
  SOLID_WORLD = 'SOLID_WORLD',
  SOLID_DYNAMIC = 'SOLID_DYNAMIC',
  ACTOR_BODY = 'ACTOR_BODY',
  SUPPORT_SURFACE = 'SUPPORT_SURFACE',
  HAZARD = 'HAZARD',
  PICKUP_TRIGGER = 'PICKUP_TRIGGER',
  INTERACTION_TRIGGER = 'INTERACTION_TRIGGER',
  EXIT_TRIGGER = 'EXIT_TRIGGER',
  DECORATIVE = 'DECORATIVE',
}

export function isSolid(c: Category): boolean {
  return c === Category.SOLID_WORLD || c === Category.SOLID_DYNAMIC
}

export function isTrigger(c: Category): boolean {
  return (
    c === Category.PICKUP_TRIGGER ||
    c === Category.INTERACTION_TRIGGER ||
    c === Category.EXIT_TRIGGER
  )
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/engine/epsilons.ts src/engine/categories.ts
git commit -m "feat(engine): add epsilon constants and collision categories"
```

---

## Task 6: Grid class (TDD)

**Files:**
- Create: `src/engine/Grid.ts`, `tests/engine/Grid.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/engine/Grid.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'

describe('Grid', () => {
  it('initializes an empty W×D grid with all cells passable', () => {
    const g = new Grid(8, 8)
    expect(g.width).toBe(8)
    expect(g.depth).toBe(8)
    expect(g.isSolid(0, 0)).toBe(false)
    expect(g.isSolid(7, 7)).toBe(false)
  })

  it('marks cells as solid', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 3, true)
    expect(g.isSolid(2, 3)).toBe(true)
    expect(g.isSolid(2, 2)).toBe(false)
  })

  it('tracks support surface separately from solid', () => {
    const g = new Grid(4, 4)
    g.setSupport(1, 1, 1.6)
    expect(g.supportHeight(1, 1)).toBe(1.6)
    expect(g.supportHeight(0, 0)).toBe(0) // floor by default
  })

  it('out-of-bounds cells are treated as solid (room walls)', () => {
    const g = new Grid(4, 4)
    expect(g.isSolid(-1, 0)).toBe(true)
    expect(g.isSolid(0, -1)).toBe(true)
    expect(g.isSolid(4, 0)).toBe(true)
    expect(g.isSolid(0, 4)).toBe(true)
  })

  it('clears occupant', () => {
    const g = new Grid(4, 4)
    const obj = { id: 'block' }
    g.setOccupant(2, 2, obj)
    expect(g.occupant(2, 2)).toBe(obj)
    g.setOccupant(2, 2, null)
    expect(g.occupant(2, 2)).toBe(null)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/engine/Grid.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/engine/Grid.ts`**

```ts
interface Cell {
  solid: boolean
  supportHeight: number  // 0 = floor; >0 = top of a static block
  occupant: unknown | null
}

export class Grid {
  readonly width: number
  readonly depth: number
  private cells: Cell[]

  constructor(width: number, depth: number) {
    this.width = width
    this.depth = depth
    this.cells = []
    for (let i = 0; i < width * depth; i++) {
      this.cells.push({ solid: false, supportHeight: 0, occupant: null })
    }
  }

  private idx(x: number, z: number): number {
    return z * this.width + x
  }

  private inBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.width && z >= 0 && z < this.depth
  }

  isSolid(x: number, z: number): boolean {
    if (!this.inBounds(x, z)) return true
    return this.cells[this.idx(x, z)]!.solid
  }

  setSolid(x: number, z: number, solid: boolean): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.solid = solid
  }

  supportHeight(x: number, z: number): number {
    if (!this.inBounds(x, z)) return 0
    return this.cells[this.idx(x, z)]!.supportHeight
  }

  setSupport(x: number, z: number, height: number): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.supportHeight = height
  }

  occupant(x: number, z: number): unknown | null {
    if (!this.inBounds(x, z)) return null
    return this.cells[this.idx(x, z)]!.occupant
  }

  setOccupant(x: number, z: number, occ: unknown | null): void {
    if (!this.inBounds(x, z)) return
    this.cells[this.idx(x, z)]!.occupant = occ
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/engine/Grid.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Grid.ts tests/engine/Grid.test.ts
git commit -m "feat(engine): add Grid with solid/support/occupant cells (TDD)"
```

---

## Task 7: AABB swept collision (TDD)

**Files:**
- Create: `src/engine/Collision.ts`, `tests/engine/Collision.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/engine/Collision.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { resolveHorizontal, type AABB } from '../../src/engine/Collision'

function aabb(x: number, z: number, w = 0.8, d = 0.8): AABB {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }
}

describe('Collision.resolveHorizontal', () => {
  it('blocks X-axis movement when target tile is solid (X only)', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 1, true)
    const start = { x: 1, z: 1 }
    const end = { x: 2.5, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(true)
    expect(r.blockedZ).toBe(false)
    expect(r.x).toBeLessThan(2.5)
    expect(r.z).toBe(1)
  })

  it('blocks Z-axis movement when target tile is solid (Z only)', () => {
    const g = new Grid(4, 4)
    g.setSolid(1, 2, true)
    const start = { x: 1, z: 1 }
    const end = { x: 1, z: 2.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(false)
    expect(r.blockedZ).toBe(true)
    expect(r.x).toBe(1)
    expect(r.z).toBeLessThan(2.5)
  })

  it('handles diagonal into corner: both axes resolve, no slip-through', () => {
    const g = new Grid(4, 4)
    g.setSolid(2, 2, true)
    const start = { x: 1, z: 1 }
    const end = { x: 2.5, z: 2.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(true)
    expect(r.blockedZ).toBe(true)
    expect(r.x).toBeLessThan(2)
    expect(r.z).toBeLessThan(2)
  })

  it('high-speed motion does not tunnel through solid (swept resolution)', () => {
    const g = new Grid(8, 8)
    g.setSolid(3, 1, true)
    const start = { x: 1, z: 1 }
    const end = { x: 7, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(true)
    expect(r.x).toBeLessThan(3)
  })

  it('passes through non-solid cells unchanged', () => {
    const g = new Grid(4, 4)
    const start = { x: 1, z: 1 }
    const end = { x: 1.5, z: 1.5 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(false)
    expect(r.blockedZ).toBe(false)
    expect(r.x).toBe(1.5)
    expect(r.z).toBe(1.5)
  })

  it('treats out-of-bounds as solid (room walls)', () => {
    const g = new Grid(4, 4)
    const start = { x: 0.5, z: 1 }
    const end = { x: -1, z: 1 }
    const r = resolveHorizontal(start, end, aabb(end.x, end.z), g, 2)
    expect(r.blockedX).toBe(true)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/engine/Collision.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/engine/Collision.ts`**

```ts
import { Grid } from './Grid'
import { EPS } from './epsilons'

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Vec2 {
  x: number
  z: number
}

export interface CollisionResult {
  x: number
  z: number
  blockedX: boolean
  blockedZ: boolean
}

function worldToCell(worldX: number, tileSize: number): number {
  return Math.floor(worldX / tileSize)
}

// Resolves horizontal movement against the grid's solid cells with axis tracking.
// Implements PHYSICS_AND_COLLISION.md § Axis Resolution.
export function resolveHorizontal(
  start: Vec2,
  end: Vec2,
  shape: AABB,
  grid: Grid,
  tileSize: number,
): CollisionResult {
  const halfW = (shape.maxX - shape.minX) / 2
  const halfD = (shape.maxZ - shape.minZ) / 2

  let resolvedX = end.x
  let blockedX = false

  if (end.x !== start.x) {
    const movingPositive = end.x > start.x
    const leadingEdge = movingPositive ? end.x + halfW : end.x - halfW
    const leadingCell = worldToCell(leadingEdge, tileSize)

    const minCellZ = worldToCell(start.z - halfD + EPS.OVERLAP, tileSize)
    const maxCellZ = worldToCell(start.z + halfD - EPS.OVERLAP, tileSize)

    for (let cz = minCellZ; cz <= maxCellZ; cz++) {
      const startCell = worldToCell(
        movingPositive ? start.x + halfW : start.x - halfW,
        tileSize,
      )
      const step = movingPositive ? 1 : -1
      for (
        let cx = startCell + step;
        movingPositive ? cx <= leadingCell : cx >= leadingCell;
        cx += step
      ) {
        if (grid.isSolid(cx, cz)) {
          resolvedX = movingPositive
            ? cx * tileSize - halfW - EPS.OVERLAP
            : (cx + 1) * tileSize + halfW + EPS.OVERLAP
          blockedX = true
          break
        }
      }
      if (blockedX) break
    }
  }

  let resolvedZ = end.z
  let blockedZ = false

  if (end.z !== start.z) {
    const movingPositive = end.z > start.z
    const leadingEdge = movingPositive ? end.z + halfD : end.z - halfD
    const leadingCell = worldToCell(leadingEdge, tileSize)

    const minCellX = worldToCell(resolvedX - halfW + EPS.OVERLAP, tileSize)
    const maxCellX = worldToCell(resolvedX + halfW - EPS.OVERLAP, tileSize)

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      const startCell = worldToCell(
        movingPositive ? start.z + halfD : start.z - halfD,
        tileSize,
      )
      const step = movingPositive ? 1 : -1
      for (
        let cz = startCell + step;
        movingPositive ? cz <= leadingCell : cz >= leadingCell;
        cz += step
      ) {
        if (grid.isSolid(cx, cz)) {
          resolvedZ = movingPositive
            ? cz * tileSize - halfD - EPS.OVERLAP
            : (cz + 1) * tileSize + halfD + EPS.OVERLAP
          blockedZ = true
          break
        }
      }
      if (blockedZ) break
    }
  }

  return { x: resolvedX, z: resolvedZ, blockedX, blockedZ }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/engine/Collision.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/Collision.ts tests/engine/Collision.test.ts
git commit -m "feat(engine): add swept AABB collision with axis tracking (TDD)"
```

---

## Task 8: GameLoop (fixed-timestep)

**Files:**
- Create: `src/engine/GameLoop.ts`

- [ ] **Step 1: Create `src/engine/GameLoop.ts`**

```ts
// Fixed-timestep simulation + variable-rate render. Implements
// PHYSICS_AND_COLLISION.md § Fixed timestep.
const SIM_HZ = 60
const SIM_DT = 1 / SIM_HZ
const MAX_FRAME_DT = 0.25

type UpdateFn = (dt: number) => void
type RenderFn = () => void

export class GameLoop {
  private running = false
  private accumulator = 0
  private lastTime = 0
  private updateFns: UpdateFn[] = []
  private renderFns: RenderFn[] = []

  onUpdate(fn: UpdateFn): void {
    this.updateFns.push(fn)
  }

  onRender(fn: RenderFn): void {
    this.renderFns.push(fn)
  }

  start(): void {
    this.running = true
    this.lastTime = performance.now() / 1000
    requestAnimationFrame(this.frame)
  }

  stop(): void {
    this.running = false
  }

  private frame = (): void => {
    if (!this.running) return

    const now = performance.now() / 1000
    let frameDt = now - this.lastTime
    this.lastTime = now
    if (frameDt > MAX_FRAME_DT) frameDt = MAX_FRAME_DT

    this.accumulator += frameDt
    while (this.accumulator >= SIM_DT) {
      for (const fn of this.updateFns) fn(SIM_DT)
      this.accumulator -= SIM_DT
    }

    for (const fn of this.renderFns) fn()
    requestAnimationFrame(this.frame)
  }
}

export const SIMULATION_DT = SIM_DT
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/engine/GameLoop.ts
git commit -m "feat(engine): fixed-timestep GameLoop"
```

---

## Task 9: Input manager

**Files:**
- Create: `src/engine/Input.ts`

- [ ] **Step 1: Create `src/engine/Input.ts`**

```ts
// Keyboard input. isDown(key) returns true while held. wasPressed(key)
// returns true exactly once per press (half-edge), useful for action keys.
// Call update() once per simulation tick to advance the wasPressed window.
export class Input {
  private down = new Set<string>()
  private pressedThisTick = new Set<string>()
  private pressedQueued = new Set<string>()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.down.has(e.code)) {
      this.pressedQueued.add(e.code)
    }
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code)
  }

  update(): void {
    this.pressedThisTick = this.pressedQueued
    this.pressedQueued = new Set()
  }

  isDown(code: string): boolean {
    return this.down.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressedThisTick.has(code)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/Input.ts
git commit -m "feat(engine): keyboard Input with wasPressed half-edge"
```

---

## Task 10: AssetLoader

**Files:**
- Create: `src/engine/AssetLoader.ts`

- [ ] **Step 1: Create `src/engine/AssetLoader.ts`**

```ts
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export interface LoadedModel {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
}

export class AssetLoader {
  private gltf = new GLTFLoader()
  private texLoader = new THREE.TextureLoader()
  private rgbeLoader = new RGBELoader()
  private modelCache = new Map<string, LoadedModel>()
  private texCache = new Map<string, THREE.Texture>()
  private hdrCache = new Map<string, THREE.DataTexture>()

  async loadModel(url: string): Promise<LoadedModel> {
    const cached = this.modelCache.get(url)
    if (cached) return cached
    const gltf = await this.gltf.loadAsync(url)
    const result: LoadedModel = { scene: gltf.scene, animations: gltf.animations }
    this.modelCache.set(url, result)
    return result
  }

  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.texCache.get(url)
    if (cached) return cached
    const tex = await this.texLoader.loadAsync(url)
    tex.colorSpace = THREE.SRGBColorSpace
    this.texCache.set(url, tex)
    return tex
  }

  async loadDataTexture(url: string): Promise<THREE.Texture> {
    const cached = this.texCache.get(url)
    if (cached) return cached
    const tex = await this.texLoader.loadAsync(url)
    this.texCache.set(url, tex)
    return tex
  }

  async loadHDR(url: string): Promise<THREE.DataTexture> {
    const cached = this.hdrCache.get(url)
    if (cached) return cached
    const tex = await this.rgbeLoader.loadAsync(url)
    tex.mapping = THREE.EquirectangularReflectionMapping
    this.hdrCache.set(url, tex)
    return tex
  }

  async loadAll(modelUrls: string[], textureUrls: string[]): Promise<void> {
    await Promise.all([
      ...modelUrls.map((u) => this.loadModel(u)),
      ...textureUrls.map((u) => this.loadTexture(u)),
    ])
  }

  cloneModel(url: string): THREE.Group {
    const cached = this.modelCache.get(url)
    if (!cached) throw new Error(`Model not loaded: ${url}`)
    return cached.scene.clone(true)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/AssetLoader.ts
git commit -m "feat(engine): AssetLoader with model/texture/HDR caching"
```

---

## Task 11: Renderer (isometric camera)

**Files:**
- Create: `src/engine/Renderer.ts`

- [ ] **Step 1: Create `src/engine/Renderer.ts`**

```ts
import * as THREE from 'three'

// Owns WebGLRenderer, Scene, and the locked isometric OrthographicCamera.
// Honors ART_DIRECTION § fixed-camera demands by never moving the camera.
const CAMERA_DISTANCE = 30
const CAMERA_HEIGHT = 22
const VIEW_SIZE = 12

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.OrthographicCamera
  readonly webgl: THREE.WebGLRenderer

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0810)

    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect,
      VIEW_SIZE * aspect,
      VIEW_SIZE,
      -VIEW_SIZE,
      0.1,
      200,
    )
    this.camera.position.set(CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_DISTANCE)
    this.camera.lookAt(8, 0, 8)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.outputColorSpace = THREE.SRGBColorSpace
    this.webgl.shadowMap.enabled = true
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.webgl.domElement)

    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    const aspect = window.innerWidth / window.innerHeight
    this.camera.left = -VIEW_SIZE * aspect
    this.camera.right = VIEW_SIZE * aspect
    this.camera.top = VIEW_SIZE
    this.camera.bottom = -VIEW_SIZE
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(window.innerWidth, window.innerHeight)
  }

  render(): void {
    this.webgl.render(this.scene, this.camera)
  }

  setEnvironment(hdr: THREE.Texture): void {
    this.scene.environment = hdr
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/Renderer.ts
git commit -m "feat(engine): Renderer with locked isometric ortho camera"
```

---

# PHASE 2 — Foundation

## Task 12: Entity base class

**Files:**
- Create: `src/game/Entity.ts`

- [ ] **Step 1: Create `src/game/Entity.ts`**

```ts
import * as THREE from 'three'
import { Category } from '../engine/categories'

export interface UpdateContext {
  [key: string]: unknown
}

// PHYSICS_AND_COLLISION.md § Coordinate model:
//   position: authoritative simulation state, integer-grid + height
//   renderPosition: visual-only, lerped, NEVER read by gameplay logic
// Linter rule (pnpm lint:no-render-pos) enforces renderPosition appears
// only in this file and Renderer.ts.
export abstract class Entity {
  position = new THREE.Vector3()
  renderPosition = new THREE.Vector3()
  categories: Category[] = []
  object3D: THREE.Object3D | null = null
  extents = new THREE.Vector3(1, 1, 1)
  active = true

  abstract update(dt: number, ctx: UpdateContext): void

  hasCategory(c: Category): boolean {
    return this.categories.includes(c)
  }

  updateRenderPosition(alpha = 0.18): void {
    this.renderPosition.lerp(this.position, alpha)
    if (this.object3D) {
      this.object3D.position.copy(this.renderPosition)
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Entity.ts
git commit -m "feat(game): Entity base class with logical/render position split"
```

---

## Task 13: GameState (TDD)

**Files:**
- Create: `src/game/GameState.ts`, `tests/game/GameState.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/game/GameState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GameState } from '../../src/game/GameState'

describe('GameState', () => {
  it('starts as human with full timer and empty inventory', () => {
    const s = new GameState()
    expect(s.form).toBe('human')
    expect(s.transformTimer).toBe(20)
    expect(s.inventory).toEqual([])
    expect(s.won).toBe(false)
  })

  it('inventory.has() returns true after add', () => {
    const s = new GameState()
    s.addItem('goblet')
    expect(s.hasItem('goblet')).toBe(true)
  })

  it('inventory persists across simulated transformations', () => {
    const s = new GameState()
    s.addItem('goblet')
    s.toggleForm()
    expect(s.form).toBe('werewolf')
    expect(s.hasItem('goblet')).toBe(true)
    s.toggleForm()
    expect(s.hasItem('goblet')).toBe(true)
  })

  it('toggleForm resets timer based on new form', () => {
    const s = new GameState()
    s.toggleForm()
    expect(s.form).toBe('werewolf')
    expect(s.transformTimer).toBe(20)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/GameState.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/game/GameState.ts`**

```ts
export type Form = 'human' | 'werewolf'

export const HUMAN_DURATION = 20
export const WEREWOLF_DURATION = 20

export class GameState {
  inventory: string[] = []
  form: Form = 'human'
  transformTimer: number = HUMAN_DURATION
  currentRoomId = 'the-hall'
  won = false

  addItem(id: string): void {
    if (!this.inventory.includes(id)) this.inventory.push(id)
  }

  removeItem(id: string): void {
    this.inventory = this.inventory.filter((x) => x !== id)
  }

  hasItem(id: string): boolean {
    return this.inventory.includes(id)
  }

  toggleForm(): void {
    this.form = this.form === 'human' ? 'werewolf' : 'human'
    this.transformTimer = this.form === 'human' ? HUMAN_DURATION : WEREWOLF_DURATION
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/game/GameState.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/GameState.ts tests/game/GameState.test.ts
git commit -m "feat(game): GameState with inventory, form, transform timer (TDD)"
```

---

## Task 14: EventBus

**Files:**
- Create: `src/engine/EventBus.ts`

- [ ] **Step 1: Create `src/engine/EventBus.ts`**

```ts
type Handler<T> = (payload: T) => void

export class EventBus {
  private handlers = new Map<string, Handler<unknown>[]>()

  on<T = unknown>(event: string, handler: Handler<T>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler as Handler<unknown>)
  }

  off<T = unknown>(event: string, handler: Handler<T>): void {
    const list = this.handlers.get(event)
    if (!list) return
    this.handlers.set(
      event,
      list.filter((h) => h !== (handler as Handler<unknown>)),
    )
  }

  emit<T = unknown>(event: string, payload: T): void {
    const list = this.handlers.get(event)
    if (!list) return
    for (const h of list) h(payload)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/EventBus.ts
git commit -m "feat(engine): tiny EventBus"
```

---

# PHASE 3 — Player (TDD)

## Task 15: Player movement

**Files:**
- Create: `src/game/Player.ts`, `tests/game/Player.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/game/Player.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { Player } from '../../src/game/Player'
import { GameState } from '../../src/game/GameState'

const TILE = 2

function setupRoom() {
  const grid = new Grid(8, 8)
  const state = new GameState()
  const player = new Player()
  player.position.set(2, 0, 2)
  player.renderPosition.copy(player.position)
  return { grid, state, player }
}

function ctx(grid: Grid, state: GameState, input: { up?: boolean; down?: boolean; left?: boolean; right?: boolean; jump?: boolean; action?: boolean } = {}) {
  return {
    grid,
    state,
    tileSize: TILE,
    input: {
      isDown: (code: string) => {
        if (code === 'ArrowUp') return !!input.up
        if (code === 'ArrowDown') return !!input.down
        if (code === 'ArrowLeft') return !!input.left
        if (code === 'ArrowRight') return !!input.right
        return false
      },
      wasPressed: (code: string) => {
        if (code === 'Space') return !!input.jump
        if (code === 'KeyE') return !!input.action
        return false
      },
    },
    onLanded: () => {},
    onJumped: () => {},
  }
}

describe('Player movement', () => {
  it('moves north when ArrowUp held', () => {
    const { grid, state, player } = setupRoom()
    const startZ = player.position.z
    player.update(1 / 60, ctx(grid, state, { up: true }))
    expect(player.position.z).toBeLessThan(startZ)
  })

  it('blocks X-axis when wall is east of player', () => {
    const { grid, state, player } = setupRoom()
    grid.setSolid(2, 1, true)
    player.position.set(3, 0, 2)
    player.renderPosition.copy(player.position)
    for (let i = 0; i < 30; i++) {
      player.update(1 / 60, ctx(grid, state, { right: true }))
    }
    expect(player.position.x).toBeLessThan(4 - 0.4)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/Player.test.ts
```

Expected: FAIL — Player not found.

- [ ] **Step 3: Implement `src/game/Player.ts`** (movement only — jump and pickup come next)

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'

const PLAYER_SPEED = 4

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  carrying: string | null = null

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PlayerCtx

    let dx = 0
    let dz = 0
    if (ctx.input.isDown('ArrowUp')) dz -= 1
    if (ctx.input.isDown('ArrowDown')) dz += 1
    if (ctx.input.isDown('ArrowLeft')) dx -= 1
    if (ctx.input.isDown('ArrowRight')) dx += 1
    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx = (dx / len) * PLAYER_SPEED * dt
      dz = (dz / len) * PLAYER_SPEED * dt
    }

    const r = resolveHorizontal(
      { x: this.position.x, z: this.position.z },
      { x: this.position.x + dx, z: this.position.z + dz },
      this.aabb(this.position.x + dx, this.position.z + dz),
      ctx.grid,
      ctx.tileSize,
    )
    this.position.x = r.x
    this.position.z = r.z
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/game/Player.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/Player.ts tests/game/Player.test.ts
git commit -m "feat(game): Player horizontal movement with axis-tracked collision (TDD)"
```

---

## Task 16: Player jump with grounded state

**Files:**
- Modify: `src/game/Player.ts`, `tests/game/Player.test.ts`

- [ ] **Step 1: Add failing tests for jump**

Append to `tests/game/Player.test.ts`:

```ts
describe('Player jump', () => {
  it('jump fires only from grounded state', () => {
    const { grid, state, player } = setupRoom()
    expect(player.state).toBe('grounded')
    let jumped = 0
    const c = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    player.update(1 / 60, c)
    expect(jumped).toBe(1)
    const c2 = { ...ctx(grid, state, { jump: true }), onJumped: () => { jumped++ } }
    player.update(1 / 60, c2)
    expect(jumped).toBe(1)
  })

  it('emits exactly one Landed event per landing', () => {
    const { grid, state, player } = setupRoom()
    let landed = 0
    const c = { ...ctx(grid, state, { jump: true }), onLanded: () => { landed++ } }
    player.update(1 / 60, c)
    for (let i = 0; i < 120; i++) {
      const c2 = { ...ctx(grid, state), onLanded: () => { landed++ } }
      player.update(1 / 60, c2)
      if (player.state === 'grounded') break
    }
    expect(player.state).toBe('grounded')
    expect(landed).toBe(1)
  })

  it('stepping off support starts falling on next tick', () => {
    const { grid, state, player } = setupRoom()
    grid.setSupport(1, 1, 1.6)
    player.position.set(2, 1.6, 2)
    player.state = 'grounded'
    const c = { ...ctx(grid, state, { right: true }) }
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60, c)
      if (player.state === 'airborne') break
    }
    expect(player.state).toBe('airborne')
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/Player.test.ts
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Replace `src/game/Player.ts` with full version (movement + jump)**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import { resolveHorizontal, type AABB } from '../engine/Collision'
import type { Grid } from '../engine/Grid'
import type { GameState } from './GameState'
import * as THREE from 'three'

const PLAYER_SPEED = 4
const JUMP_HEIGHT = 1.0
const JUMP_DURATION = 0.5
const FALL_SPEED = 6

export interface PlayerCtx extends UpdateContext {
  grid: Grid
  state: GameState
  tileSize: number
  input: { isDown: (code: string) => boolean; wasPressed: (code: string) => boolean }
  onLanded: () => void
  onJumped: () => void
}

export class Player extends Entity {
  state: 'grounded' | 'airborne' | 'jumping' = 'grounded'
  jumpProgress = 0
  jumpStartY = 0
  carrying: string | null = null

  constructor() {
    super()
    this.categories = [Category.ACTOR_BODY]
    this.extents.set(0.8, 1.6, 0.8)
  }

  private aabb(x: number, z: number): AABB {
    const hw = this.extents.x / 2
    const hd = this.extents.z / 2
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
  }

  private supportAt(x: number, z: number, grid: Grid, tileSize: number): number {
    const cx = Math.floor(x / tileSize)
    const cz = Math.floor(z / tileSize)
    return grid.supportHeight(cx, cz)
  }

  update(dt: number, ctxRaw: UpdateContext): void {
    const ctx = ctxRaw as PlayerCtx

    let dx = 0
    let dz = 0
    if (ctx.input.isDown('ArrowUp')) dz -= 1
    if (ctx.input.isDown('ArrowDown')) dz += 1
    if (ctx.input.isDown('ArrowLeft')) dx -= 1
    if (ctx.input.isDown('ArrowRight')) dx += 1
    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx = (dx / len) * PLAYER_SPEED * dt
      dz = (dz / len) * PLAYER_SPEED * dt
    }

    const r = resolveHorizontal(
      { x: this.position.x, z: this.position.z },
      { x: this.position.x + dx, z: this.position.z + dz },
      this.aabb(this.position.x + dx, this.position.z + dz),
      ctx.grid,
      ctx.tileSize,
    )
    this.position.x = r.x
    this.position.z = r.z

    if (this.state === 'grounded' && ctx.input.wasPressed('Space')) {
      this.state = 'jumping'
      this.jumpProgress = 0
      this.jumpStartY = this.position.y
      ctx.onJumped()
    }

    const supportY = this.supportAt(this.position.x, this.position.z, ctx.grid, ctx.tileSize)

    if (this.state === 'jumping') {
      this.jumpProgress += dt / JUMP_DURATION
      if (this.jumpProgress >= 1) {
        this.state = 'airborne'
        this.position.y = this.jumpStartY
      } else {
        this.position.y = this.jumpStartY + Math.sin(this.jumpProgress * Math.PI) * JUMP_HEIGHT
      }
    } else if (this.state === 'airborne') {
      this.position.y -= FALL_SPEED * dt
      if (this.position.y <= supportY) {
        this.position.y = supportY
        this.state = 'grounded'
        ctx.onLanded()
      }
    } else {
      if (this.position.y > supportY + 1e-3) {
        this.state = 'airborne'
      }
    }
  }

  tryPickup(item: { id: string; position: THREE.Vector3 }, state: GameState, onSuccess: () => void): void {
    if (state.form !== 'human') return
    if (this.carrying) return
    this.carrying = item.id
    state.addItem(item.id)
    onSuccess()
  }

  dropCarried(state: GameState, onDrop: (id: string, pos: THREE.Vector3) => void): void {
    if (!this.carrying) return
    const id = this.carrying
    this.carrying = null
    state.removeItem(id)
    onDrop(id, this.position.clone())
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/game/Player.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/Player.ts tests/game/Player.test.ts
git commit -m "feat(game): Player jump with explicit grounded state (TDD)"
```

---

## Task 17: Player pickup/drop with form gating

**Files:**
- Modify: `tests/game/Player.test.ts`

- [ ] **Step 1: Add tests for pickup**

Append to `tests/game/Player.test.ts`:

```ts
import * as THREE from 'three'

describe('Player pickup', () => {
  it('werewolf form rejects pickup attempt', () => {
    const { state, player } = setupRoom()
    state.toggleForm()
    expect(state.form).toBe('werewolf')
    const overlap = { id: 'goblet', position: player.position.clone() }
    let picked: string | null = null
    player.tryPickup(overlap, state, () => { picked = overlap.id })
    expect(picked).toBe(null)
    expect(player.carrying).toBe(null)
  })

  it('human form accepts pickup attempt', () => {
    const { state, player } = setupRoom()
    const overlap = { id: 'goblet', position: player.position.clone() }
    let picked: string | null = null
    player.tryPickup(overlap, state, () => { picked = overlap.id })
    expect(picked).toBe('goblet')
    expect(player.carrying).toBe('goblet')
    expect(state.hasItem('goblet')).toBe(true)
  })
})
```

(`tryPickup` was already added in Task 16's Player.ts replacement.)

- [ ] **Step 2: Run tests**

```bash
pnpm test tests/game/Player.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/game/Player.test.ts
git commit -m "test(game): Player pickup/drop form-gating (TDD)"
```

---

# PHASE 4 — Other entities (TDD)

## Task 18: PushBlock

**Files:**
- Create: `src/game/PushBlock.ts`, `tests/game/PushBlock.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/game/PushBlock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Grid } from '../../src/engine/Grid'
import { PushBlock } from '../../src/game/PushBlock'
import { Category } from '../../src/engine/categories'

const TILE = 2

describe('PushBlock', () => {
  it('declares both SOLID_DYNAMIC and SUPPORT_SURFACE categories', () => {
    const b = new PushBlock(3, 3)
    expect(b.hasCategory(Category.SOLID_DYNAMIC)).toBe(true)
    expect(b.hasCategory(Category.SUPPORT_SURFACE)).toBe(true)
  })

  it('push succeeds when target tile is empty floor', () => {
    const grid = new Grid(8, 8)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    const ok = b.tryPush('east', grid, TILE)
    expect(ok).toBe(true)
    expect(b.gridX).toBe(4)
    expect(b.gridZ).toBe(3)
    expect(grid.occupant(3, 3)).toBe(null)
    expect(grid.occupant(4, 3)).toBe(b)
    expect(grid.isSolid(4, 3)).toBe(true)
    expect(grid.supportHeight(4, 3)).toBeGreaterThan(0)
  })

  it('push fails when target tile is solid wall', () => {
    const grid = new Grid(8, 8)
    grid.setSolid(4, 3, true)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    const ok = b.tryPush('east', grid, TILE)
    expect(ok).toBe(false)
    expect(b.gridX).toBe(3)
  })

  it('push fails when target tile holds another block', () => {
    const grid = new Grid(8, 8)
    const a = new PushBlock(3, 3)
    a.placeOnGrid(grid, TILE)
    const b = new PushBlock(4, 3)
    b.placeOnGrid(grid, TILE)
    const ok = a.tryPush('east', grid, TILE)
    expect(ok).toBe(false)
    expect(a.gridX).toBe(3)
  })

  it('block top is SUPPORT_SURFACE while at rest', () => {
    const grid = new Grid(8, 8)
    const b = new PushBlock(3, 3)
    b.placeOnGrid(grid, TILE)
    expect(b.moving).toBe(false)
    expect(grid.supportHeight(3, 3)).toBe(1.6)
    b.tryPush('east', grid, TILE)
    expect(b.moving).toBe(false)
    expect(grid.supportHeight(4, 3)).toBe(1.6)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/PushBlock.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/game/PushBlock.ts`**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Grid } from '../engine/Grid'

const BLOCK_HEIGHT = 1.6

export type PushDir = 'north' | 'south' | 'east' | 'west'

export class PushBlock extends Entity {
  gridX: number
  gridZ: number
  moving = false

  constructor(gridX: number, gridZ: number) {
    super()
    this.categories = [Category.SOLID_DYNAMIC, Category.SUPPORT_SURFACE]
    this.extents.set(1.6, 1.6, 1.6)
    this.gridX = gridX
    this.gridZ = gridZ
  }

  placeOnGrid(grid: Grid, tileSize: number): void {
    grid.setSolid(this.gridX, this.gridZ, true)
    grid.setSupport(this.gridX, this.gridZ, BLOCK_HEIGHT)
    grid.setOccupant(this.gridX, this.gridZ, this)
    this.position.set(
      this.gridX * tileSize + tileSize / 2,
      0,
      this.gridZ * tileSize + tileSize / 2,
    )
    this.renderPosition.copy(this.position)
  }

  tryPush(dir: PushDir, grid: Grid, tileSize: number): boolean {
    const [dx, dz] = dir === 'east' ? [1, 0]
      : dir === 'west' ? [-1, 0]
      : dir === 'south' ? [0, 1]
      : [0, -1]
    const tx = this.gridX + dx
    const tz = this.gridZ + dz

    if (grid.isSolid(tx, tz)) return false
    if (grid.occupant(tx, tz) !== null) return false

    grid.setSolid(this.gridX, this.gridZ, false)
    grid.setSupport(this.gridX, this.gridZ, 0)
    grid.setOccupant(this.gridX, this.gridZ, null)

    this.gridX = tx
    this.gridZ = tz
    grid.setSolid(tx, tz, true)
    grid.setSupport(tx, tz, BLOCK_HEIGHT)
    grid.setOccupant(tx, tz, this)
    this.position.set(tx * tileSize + tileSize / 2, 0, tz * tileSize + tileSize / 2)
    return true
  }

  update(_dt: number, _ctx: UpdateContext): void {
    // No per-tick logic in MVP; pushes are atomic via tryPush().
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/game/PushBlock.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/PushBlock.ts tests/game/PushBlock.test.ts
git commit -m "feat(game): PushBlock with dual category and atomic push (TDD)"
```

---

## Task 19: StaticBlock and Pickup

**Files:**
- Create: `src/game/StaticBlock.ts`, `src/game/Pickup.ts`

- [ ] **Step 1: Create `src/game/StaticBlock.ts`**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'
import type { Grid } from '../engine/Grid'

export class StaticBlock extends Entity {
  readonly gridX: number
  readonly gridZ: number
  readonly height: number

  constructor(gridX: number, gridZ: number, height: number) {
    super()
    this.categories = [Category.SOLID_WORLD, Category.SUPPORT_SURFACE]
    this.gridX = gridX
    this.gridZ = gridZ
    this.height = height
    this.extents.set(2, height, 2)
  }

  placeOnGrid(grid: Grid, tileSize: number): void {
    grid.setSolid(this.gridX, this.gridZ, true)
    grid.setSupport(this.gridX, this.gridZ, this.height)
    grid.setOccupant(this.gridX, this.gridZ, this)
    this.position.set(
      this.gridX * tileSize + tileSize / 2,
      0,
      this.gridZ * tileSize + tileSize / 2,
    )
    this.renderPosition.copy(this.position)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    // static
  }
}
```

- [ ] **Step 2: Create `src/game/Pickup.ts`**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

export class Pickup extends Entity {
  readonly id: string
  collected = false

  constructor(id: string) {
    super()
    this.id = id
    this.categories = [Category.PICKUP_TRIGGER]
    this.extents.set(0.6, 0.6, 0.6)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (this.collected) this.active = false
  }

  collect(): void {
    this.collected = true
  }
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/game/StaticBlock.ts src/game/Pickup.ts
git commit -m "feat(game): StaticBlock and Pickup entities"
```

---

## Task 20: Door

**Files:**
- Create: `src/game/Door.ts`. Modify `tests/game/GameState.test.ts`.

- [ ] **Step 1: Add failing test for door**

Append to `tests/game/GameState.test.ts`:

```ts
import { Door } from '../../src/game/Door'

describe('Door', () => {
  it('opens exactly once when condition becomes true', () => {
    const state = new GameState()
    const door = new Door('south', () => state.hasItem('goblet'))
    let openedCount = 0
    door.onOpen = () => { openedCount++ }

    door.update(1 / 60, { state })
    expect(door.open).toBe(false)
    expect(openedCount).toBe(0)

    state.addItem('goblet')
    door.update(1 / 60, { state })
    expect(door.open).toBe(true)
    expect(openedCount).toBe(1)

    door.update(1 / 60, { state })
    expect(openedCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/GameState.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/game/Door.ts`**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

export class Door extends Entity {
  readonly side: 'north' | 'south' | 'east' | 'west'
  readonly opensWhen: () => boolean
  open = false
  onOpen: () => void = () => {}

  constructor(side: 'north' | 'south' | 'east' | 'west', opensWhen: () => boolean) {
    super()
    this.side = side
    this.opensWhen = opensWhen
    this.categories = [Category.SOLID_WORLD]
    this.extents.set(2, 2.4, 0.2)
  }

  update(_dt: number, _ctx: UpdateContext): void {
    if (!this.open && this.opensWhen()) {
      this.open = true
      this.categories = [Category.DECORATIVE]
      this.onOpen()
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test tests/game/GameState.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/Door.ts tests/game/GameState.test.ts
git commit -m "feat(game): Door with opens-when state (TDD)"
```

---

## Task 21: PatrolEnemy

**Files:**
- Create: `src/game/PatrolEnemy.ts`

- [ ] **Step 1: Create `src/game/PatrolEnemy.ts`**

```ts
import { Entity, type UpdateContext } from './Entity'
import { Category } from '../engine/categories'

const PATROL_SPEED = 1.6

export class PatrolEnemy extends Entity {
  private a: { x: number; z: number }
  private b: { x: number; z: number }
  private dir: 1 | -1 = 1

  constructor(a: { x: number; z: number }, b: { x: number; z: number }) {
    super()
    this.categories = [Category.ACTOR_BODY, Category.HAZARD]
    this.extents.set(0.8, 1.6, 0.8)
    this.a = a
    this.b = b
    this.position.set(a.x, 0, a.z)
    this.renderPosition.copy(this.position)
  }

  update(dt: number, _ctx: UpdateContext): void {
    const target = this.dir === 1 ? this.b : this.a
    const dx = target.x - this.position.x
    const dz = target.z - this.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) {
      this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1
      return
    }
    this.position.x += (dx / dist) * PATROL_SPEED * dt
    this.position.z += (dz / dist) * PATROL_SPEED * dt
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/game/PatrolEnemy.ts
git commit -m "feat(game): PatrolEnemy with linear back-and-forth"
```

---

## Task 22: Werewolf state and transformation

**Files:**
- Create: `tests/game/Werewolf.test.ts`. Modify `src/game/GameState.ts`.

- [ ] **Step 1: Write failing tests**

`tests/game/Werewolf.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { GameState, HUMAN_DURATION, WEREWOLF_DURATION } from '../../src/game/GameState'

describe('Werewolf transformation', () => {
  it('transforms when timer reaches zero', () => {
    const s = new GameState()
    let transformed = 0
    s.onTransformed = () => { transformed++ }
    s.tickTransform(HUMAN_DURATION + 0.001)
    expect(s.form).toBe('werewolf')
    expect(transformed).toBe(1)
    expect(s.transformTimer).toBe(WEREWOLF_DURATION)
  })

  it('emits PlayerTransformed exactly once per transformation', () => {
    const s = new GameState()
    let count = 0
    s.onTransformed = () => { count++ }
    for (let i = 0; i < 1200; i++) s.tickTransform(1 / 60)
    expect(s.form).toBe('werewolf')
    expect(count).toBe(1)
  })

  it('transforming while carrying drops the item', () => {
    const s = new GameState()
    s.addItem('goblet')
    let dropped: string | null = null
    s.onTransformWhileCarrying = (id: string) => { dropped = id }
    s.tickTransform(HUMAN_DURATION + 0.001)
    expect(dropped).toBe('goblet')
    expect(s.hasItem('goblet')).toBe(false)
  })
})
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm test tests/game/Werewolf.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Replace `src/game/GameState.ts` with extended version**

```ts
export type Form = 'human' | 'werewolf'

export const HUMAN_DURATION = 20
export const WEREWOLF_DURATION = 20

export class GameState {
  inventory: string[] = []
  form: Form = 'human'
  transformTimer: number = HUMAN_DURATION
  currentRoomId = 'the-hall'
  won = false
  droppedItems: { id: string; x: number; z: number }[] = []

  onTransformed: () => void = () => {}
  onTransformWhileCarrying: (id: string) => void = () => {}

  addItem(id: string): void {
    if (!this.inventory.includes(id)) this.inventory.push(id)
  }

  removeItem(id: string): void {
    this.inventory = this.inventory.filter((x) => x !== id)
  }

  hasItem(id: string): boolean {
    return this.inventory.includes(id)
  }

  toggleForm(): void {
    this.form = this.form === 'human' ? 'werewolf' : 'human'
    this.transformTimer = this.form === 'human' ? HUMAN_DURATION : WEREWOLF_DURATION
  }

  tickTransform(dt: number): void {
    this.transformTimer -= dt
    if (this.transformTimer <= 0) {
      if (this.form === 'human' && this.inventory.length > 0) {
        const id = this.inventory[0]!
        this.removeItem(id)
        this.onTransformWhileCarrying(id)
      }
      this.toggleForm()
      this.onTransformed()
    }
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/GameState.ts tests/game/Werewolf.test.ts
git commit -m "feat(game): werewolf transformation with α-asymmetry drop (TDD)"
```

---

# PHASE 5 — Scene assembly

## Task 23: Room class

**Files:**
- Create: `src/game/Room.ts`

- [ ] **Step 1: Create `src/game/Room.ts`**

```ts
import * as THREE from 'three'
import { Entity, type UpdateContext } from './Entity'
import { Grid } from '../engine/Grid'

const TILE_SIZE = 2

export class Room {
  readonly id: string
  readonly grid: Grid
  readonly entities: Entity[] = []
  readonly lights: THREE.Light[] = []
  readonly group: THREE.Group
  spawnX = 0
  spawnZ = 0

  constructor(id: string, width: number, depth: number) {
    this.id = id
    this.grid = new Grid(width, depth)
    this.group = new THREE.Group()
  }

  add(e: Entity): void {
    this.entities.push(e)
    if (e.object3D) this.group.add(e.object3D)
  }

  addLight(light: THREE.Light): void {
    this.lights.push(light)
    this.group.add(light)
  }

  setSpawn(x: number, z: number): void {
    this.spawnX = x
    this.spawnZ = z
  }

  update(dt: number, sharedCtx: UpdateContext): void {
    const ctx = { ...sharedCtx, grid: this.grid, tileSize: TILE_SIZE }
    for (const e of this.entities) {
      if (e.active) e.update(dt, ctx)
    }
  }

  updateRenderPositions(alpha = 0.18): void {
    for (const e of this.entities) e.updateRenderPosition(alpha)
  }

  get tileSize(): number {
    return TILE_SIZE
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Room.ts
git commit -m "feat(game): Room composes entities, grid, and lights"
```

---

## Task 24: Lighting setup

**Files:**
- Create: `src/game/Lighting.ts`

- [ ] **Step 1: Create `src/game/Lighting.ts`**

```ts
import * as THREE from 'three'

// Theatrical lighting per ART_DIRECTION § Lighting and spec §9.
export function buildHallLights(): THREE.Object3D[] {
  const moon = new THREE.SpotLight(0x7090c0, 1.2, 30, Math.PI / 8, 0.4, 1)
  moon.position.set(11, 16, 11)
  moon.target.position.set(11, 0, 11)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)

  const torch = new THREE.PointLight(0xff8030, 1.0, 8, 2)
  torch.position.set(0.4, 2.2, 8)

  const ambient = new THREE.AmbientLight(0xffffff, 0.08)

  return [moon, moon.target, torch, ambient]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Lighting.ts
git commit -m "feat(game): theatrical 3-light setup for The Hall"
```

---

## Task 25: Procedural geometry

**Files:**
- Create: `src/game/Structure.ts`

- [ ] **Step 1: Create `src/game/Structure.ts`**

```ts
import * as THREE from 'three'
import type { AssetLoader } from '../engine/AssetLoader'

const TILE = 2
const WALL_H = 3

export async function buildStructure(loader: AssetLoader): Promise<THREE.Group> {
  const group = new THREE.Group()

  const floorDiffuse = await loader.loadTexture('/assets/textures/stone_floor_diffuse.jpg')
  const floorNormal = await loader.loadDataTexture('/assets/textures/stone_floor_normal.jpg')
  const floorRough = await loader.loadDataTexture('/assets/textures/stone_floor_roughness.jpg')
  for (const t of [floorDiffuse, floorNormal, floorRough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 8)
  }
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorDiffuse,
    normalMap: floorNormal,
    roughnessMap: floorRough,
  })
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, 0.3, 8 * TILE), floorMat)
  floor.position.set(8, -0.15, 8)
  floor.receiveShadow = true
  group.add(floor)

  const wallDiffuse = await loader.loadTexture('/assets/textures/stone_wall_diffuse.jpg')
  const wallNormal = await loader.loadDataTexture('/assets/textures/stone_wall_normal.jpg')
  const wallRough = await loader.loadDataTexture('/assets/textures/stone_wall_roughness.jpg')
  for (const t of [wallDiffuse, wallNormal, wallRough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 1.5)
  }
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallDiffuse,
    normalMap: wallNormal,
    roughnessMap: wallRough,
  })

  const north = new THREE.Mesh(new THREE.BoxGeometry(8 * TILE, WALL_H, 0.3), wallMat)
  north.position.set(8, WALL_H / 2, 0)
  north.receiveShadow = true
  north.castShadow = true
  group.add(north)

  // South wall split for door gap (door at grid x=4, world x=9, gap = 1 tile = 2m)
  const southLeft = new THREE.Mesh(new THREE.BoxGeometry(4 * TILE, WALL_H, 0.3), wallMat)
  southLeft.position.set(4, WALL_H / 2, 16)
  southLeft.receiveShadow = true
  southLeft.castShadow = true
  group.add(southLeft)

  const southRight = new THREE.Mesh(new THREE.BoxGeometry(3 * TILE, WALL_H, 0.3), wallMat)
  southRight.position.set(8 + 3, WALL_H / 2, 16)
  southRight.receiveShadow = true
  southRight.castShadow = true
  group.add(southRight)

  const east = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), wallMat)
  east.position.set(16, WALL_H / 2, 8)
  east.receiveShadow = true
  east.castShadow = true
  group.add(east)

  const west = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_H, 8 * TILE), wallMat)
  west.position.set(0, WALL_H / 2, 8)
  west.receiveShadow = true
  west.castShadow = true
  group.add(west)

  return group
}

export function buildLedgeMesh(material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Structure.ts
git commit -m "feat(game): procedural floor/walls/ledge geometry"
```

---

## Task 26: Materials helper + TheHall scene

**Files:**
- Create: `src/game/Materials.ts`, `src/scenes/TheHall.ts`

- [ ] **Step 1: Create `src/game/Materials.ts`**

```ts
import * as THREE from 'three'

// Hero material per spec §6.6: MeshToonMaterial with 3-step ramp.
// NEVER PBR for hero meshes (rule 9).
export function makeToonMaterial(color: THREE.ColorRepresentation = 0xc0a070): THREE.MeshToonMaterial {
  const ramp = new Uint8Array([60, 60, 60, 255, 160, 160, 160, 255, 240, 240, 240, 255])
  const gradient = new THREE.DataTexture(ramp, 3, 1, THREE.RGBAFormat)
  gradient.needsUpdate = true
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient })
}

export function makeStoneMaterial(color = 0x6e6358): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 })
}
```

- [ ] **Step 2: Create `src/scenes/TheHall.ts`**

```ts
import * as THREE from 'three'
import { Room } from '../game/Room'
import { Player } from '../game/Player'
import { PushBlock } from '../game/PushBlock'
import { StaticBlock } from '../game/StaticBlock'
import { Pickup } from '../game/Pickup'
import { Door } from '../game/Door'
import { PatrolEnemy } from '../game/PatrolEnemy'
import { Entity } from '../game/Entity'
import { Category } from '../engine/categories'
import { buildStructure, buildLedgeMesh } from '../game/Structure'
import { buildHallLights } from '../game/Lighting'
import { makeStoneMaterial, makeToonMaterial } from '../game/Materials'
import type { AssetLoader } from '../engine/AssetLoader'
import type { GameState } from '../game/GameState'

const TILE = 2

export interface HallBuild {
  room: Room
  player: Player
  enemy: PatrolEnemy
  door: Door
  goblet: Pickup
}

class StaticVisual extends Entity {
  constructor(mesh: THREE.Object3D) {
    super()
    this.categories = [Category.DECORATIVE]
    this.object3D = mesh
  }
  update(): void {}
}

export async function buildTheHall(
  scene: THREE.Scene,
  loader: AssetLoader,
  state: GameState,
): Promise<HallBuild> {
  const room = new Room('the-hall', 8, 8)

  const structure = await buildStructure(loader)
  room.group.add(structure)

  for (const l of buildHallLights()) room.group.add(l)

  // Static raised ledge at grid (5,5), height 2m
  const ledge = new StaticBlock(5, 5, 2)
  const ledgeMesh = buildLedgeMesh(makeStoneMaterial(0x877a68))
  ledgeMesh.position.set(5 * TILE + TILE / 2, 1, 5 * TILE + TILE / 2)
  room.group.add(ledgeMesh)
  ledge.placeOnGrid(room.grid, TILE)
  room.add(ledge)

  // Push-block at grid (3,5)
  const block = new PushBlock(3, 5)
  const blockMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    makeToonMaterial(0x9b6a3a),
  )
  blockMesh.castShadow = true
  blockMesh.receiveShadow = true
  block.object3D = blockMesh
  block.placeOnGrid(room.grid, TILE)
  blockMesh.position.copy(block.position)
  blockMesh.position.y = 0.8
  room.group.add(blockMesh)
  room.add(block)

  // Goblet on top of ledge
  const goblet = new Pickup('goblet')
  const gobletMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.1, 0.4, 12),
    makeToonMaterial(0xd4af37),
  )
  gobletMesh.castShadow = true
  goblet.object3D = gobletMesh
  goblet.position.set(5 * TILE + TILE / 2, 2.2, 5 * TILE + TILE / 2)
  goblet.renderPosition.copy(goblet.position)
  gobletMesh.position.copy(goblet.position)
  room.group.add(gobletMesh)
  room.add(goblet)

  // Door at south
  const door = new Door('south', () => state.hasItem('goblet'))
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2.4, 0.2),
    makeStoneMaterial(0x3a2818),
  )
  doorMesh.castShadow = true
  door.object3D = doorMesh
  door.position.set(4 * TILE + TILE / 2, 1.2, 8 * TILE - 0.1)
  door.renderPosition.copy(door.position)
  doorMesh.position.copy(door.position)
  room.group.add(doorMesh)
  door.onOpen = () => {
    doorMesh.rotation.y = -Math.PI / 2
    doorMesh.position.x -= 1
    doorMesh.position.z += 1
  }
  room.add(door)

  // Decorative cauldron set-piece at grid (1,1)
  const cauldronMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    makeToonMaterial(0x2d2620),
  )
  cauldronMesh.position.set(1 * TILE + TILE / 2, 0.5, 1 * TILE + TILE / 2)
  cauldronMesh.castShadow = true
  room.group.add(cauldronMesh)
  room.add(new StaticVisual(cauldronMesh))

  // Patrol enemy along world z=9 between x=5..13
  const enemy = new PatrolEnemy({ x: 5, z: 9 }, { x: 13, z: 9 })
  const enemyMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
    makeToonMaterial(0x884444),
  )
  enemyMesh.castShadow = true
  enemy.object3D = enemyMesh
  enemyMesh.position.copy(enemy.position)
  enemyMesh.position.y = 0.9
  room.group.add(enemyMesh)
  room.add(enemy)

  // Player spawn at grid (1,3)
  const player = new Player()
  const playerMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 1.0, 4, 8),
    makeToonMaterial(0x6080d0),
  )
  playerMesh.castShadow = true
  player.object3D = playerMesh
  player.position.set(1 * TILE + TILE / 2, 0, 3 * TILE + TILE / 2)
  player.renderPosition.copy(player.position)
  playerMesh.position.copy(player.position)
  playerMesh.position.y = 0.8
  room.group.add(playerMesh)
  room.add(player)
  room.setSpawn(player.position.x, player.position.z)

  scene.add(room.group)
  return { room, player, enemy, door, goblet }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/game/Materials.ts src/scenes/TheHall.ts
git commit -m "feat(scenes): build TheHall with placeholder hero meshes"
```

---

## Task 27: HUD and win state

**Files:**
- Create: `src/game/HUD.ts`

- [ ] **Step 1: Create `src/game/HUD.ts`**

```ts
import type { GameState } from './GameState'

// DOM HUD using safe textContent updates (no innerHTML).
export class HUD {
  private formEl: HTMLElement
  private timerEl: HTMLElement
  private carryEl: HTMLElement
  private winEl: HTMLElement

  constructor() {
    const form = document.getElementById('hud-form')
    const timer = document.getElementById('hud-timer')
    const carry = document.getElementById('hud-carry')
    const win = document.getElementById('win')
    if (!form || !timer || !carry || !win) {
      throw new Error('HUD elements missing from index.html')
    }
    this.formEl = form
    this.timerEl = timer
    this.carryEl = carry
    this.winEl = win
  }

  render(state: GameState, carrying: string | null): void {
    const t = Math.max(0, state.transformTimer).toFixed(1)
    const formColor = state.form === 'human' ? '#ffefc4' : '#ff8060'

    this.formEl.textContent = `FORM: ${state.form.toUpperCase()}`
    this.formEl.style.color = formColor
    this.timerEl.textContent = `NEXT: ${t}s`
    this.carryEl.textContent = `CARRY: ${carrying ?? '—'}`

    this.winEl.style.display = state.won ? 'flex' : 'none'
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/HUD.ts
git commit -m "feat(game): minimal DOM HUD using textContent (no innerHTML)"
```

---

## Task 28: Wire main.ts

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import * as THREE from 'three'
import { Renderer } from './engine/Renderer'
import { GameLoop } from './engine/GameLoop'
import { Input } from './engine/Input'
import { AssetLoader } from './engine/AssetLoader'
import { buildTheHall, type HallBuild } from './scenes/TheHall'
import { GameState } from './game/GameState'
import { HUD } from './game/HUD'
import { Category } from './engine/categories'
import { Player } from './game/Player'
import { PushBlock } from './game/PushBlock'
import { Room } from './game/Room'

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app missing')

  const renderer = new Renderer(container)
  const input = new Input()
  const loader = new AssetLoader()
  const state = new GameState()
  const hud = new HUD()

  try {
    const hdr = await loader.loadHDR('/assets/textures/castle_dungeon.hdr')
    renderer.setEnvironment(hdr)
  } catch {
    console.warn('HDR not present; skipping environment reflection')
  }

  const build: HallBuild = await buildTheHall(renderer.scene, loader, state)
  const { room, player, enemy, door, goblet } = build

  state.onTransformWhileCarrying = (id) => {
    if (id === 'goblet') {
      goblet.collected = false
      if (goblet.object3D && player.object3D) {
        player.object3D.remove(goblet.object3D)
        goblet.object3D.position.copy(player.position)
        goblet.object3D.position.y = 0.5
        renderer.scene.add(goblet.object3D)
      }
      goblet.position.copy(player.position)
      goblet.position.y = 0.5
    }
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()

    room.update(dt, {
      input,
      state,
      onLanded: () => {},
      onJumped: () => {},
    })

    handlePushAttempt(player, room)

    if (overlapsActor(player.position, enemy.position)) {
      player.position.x = room.spawnX
      player.position.z = room.spawnZ
      player.position.y = 0
      player.state = 'grounded'
    }

    if (
      !goblet.collected &&
      Math.hypot(goblet.position.x - player.position.x, goblet.position.z - player.position.z) < 1.0 &&
      Math.abs(goblet.position.y - player.position.y) < 1.5 &&
      input.wasPressed('KeyE')
    ) {
      player.tryPickup(
        { id: goblet.id, position: goblet.position },
        state,
        () => {
          goblet.collect()
          if (goblet.object3D && player.object3D) {
            player.object3D.add(goblet.object3D)
            goblet.object3D.position.set(0, 1.2, 0)
          }
        },
      )
    }

    state.tickTransform(dt)

    if (door.open && player.position.z > 15.5) {
      state.won = true
    }

    hud.render(state, player.carrying)
  })

  loop.onRender(() => {
    room.updateRenderPositions(0.18)
    renderer.render()
  })

  loop.start()
}

function handlePushAttempt(player: Player, room: Room): void {
  for (const e of room.entities) {
    if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
    const block = e as PushBlock
    const dx = block.position.x - player.position.x
    const dz = block.position.z - player.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1.4 && dist > 0.4) {
      let dir: 'east' | 'west' | 'north' | 'south'
      if (Math.abs(dx) > Math.abs(dz)) {
        dir = dx > 0 ? 'east' : 'west'
      } else {
        dir = dz > 0 ? 'south' : 'north'
      }
      block.tryPush(dir, room.grid, room.tileSize)
    }
  }
}

function overlapsActor(a: THREE.Vector3, b: THREE.Vector3): boolean {
  return (
    Math.abs(a.x - b.x) < 0.9 &&
    Math.abs(a.z - b.z) < 0.9 &&
    Math.abs(a.y - b.y) < 1.5
  )
}

main().catch((err) => {
  console.error(err)
})
```

- [ ] **Step 2: Run dev server and verify scene appears**

```bash
pnpm dev
```

Expected: room renders with placeholder geometry. Move with arrow keys, jump with space, push block by walking into it, jump on block, jump on ledge, press E near goblet to pick up, walk through door = win.

Stop the server.

- [ ] **Step 3: Run tests and lint checks**

```bash
pnpm test
pnpm lint
pnpm lint:no-render-pos
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire main.ts with push, pickup, transform, win flow"
```

---

# PHASE 6 — Asset integration & polish

## Task 29: Style anchor doc

**Files:**
- Create: `docs/STYLE_ANCHOR.md`

- [ ] **Step 1: Create `docs/STYLE_ANCHOR.md`**

```markdown
# Style Anchor — Knight Lore Web 3D

Every AI-generated 3D mesh and texture must cite this document.

## Reference image

Pin one reference image here:
- `1.png` (the existing repo reference, if visually relevant), or
- A curated Tripo3D output you love, or
- A Knight Lore screenshot for spirit reference

## Prompt fragment

Paste this verbatim into every Tripo prompt:

> stylized low-poly 3D model, hand-painted texture, warm muted palette,
> slight cel-shaded edges, fairy-tale storybook feel, fits in a haunted
> castle diorama, asymmetric silhouette, weighted/burdened pose

## Rules

1. Every generation cites this fragment verbatim. Don't paraphrase.
2. If a generation visually drifts from the anchor, regenerate. Don't accept "close enough".
3. When the anchor evolves, update this doc and re-evaluate all assets generated against it.
```

- [ ] **Step 2: Commit**

```bash
git add docs/STYLE_ANCHOR.md
git commit -m "docs: add style anchor for AI asset generation"
```

---

## Task 30: Source Poly Haven textures + HDRI (manual)

**This task is a manual download.** No code change.

- [ ] **Step 1: Download stone wall material**

Visit https://polyhaven.com/textures, search "castle wall" or "stone wall". Download 2K JPG: diffuse, normal, roughness.

Save as:
- `assets/textures/stone_wall_diffuse.jpg`
- `assets/textures/stone_wall_normal.jpg`
- `assets/textures/stone_wall_roughness.jpg`

- [ ] **Step 2: Download stone floor material**

Save as:
- `assets/textures/stone_floor_diffuse.jpg`
- `assets/textures/stone_floor_normal.jpg`
- `assets/textures/stone_floor_roughness.jpg`

- [ ] **Step 3: Download HDRI**

Visit https://polyhaven.com/hdris. Pick a dim castle/dungeon mood. Download 2K HDR.

Save as `assets/textures/castle_dungeon.hdr`.

- [ ] **Step 4: Verify dev server loads them**

```bash
pnpm dev
```

Expected: walls and floor have proper textures, no console warnings about missing assets.

- [ ] **Step 5: Commit**

```bash
git add assets/textures/
git commit -m "assets: add Poly Haven stone wall/floor textures and HDRI"
```

---

## Task 31: Generate Tripo+Mixamo characters (manual)

**Manual asset generation.** Pre-committed fallback: Quaternius CC0 if Tripo+Mixamo fails after timebox.

- [ ] **Step 1: Generate knight in Tripo3D**

Visit https://tripo3d.ai. Cite the style anchor in your prompt:

> [paste fragment from docs/STYLE_ANCHOR.md] knight with stooped weighted posture, oversized helm, asymmetric tabard, ragged hem, no weapon, T-pose for rigging

Inspect against silhouette test (mentally render in flat black). If generic upright mannequin → regenerate. **Timebox: 3 attempts. If none work, fall back to Quaternius.**

Download GLB to `assets/_source/knight_2026-05-01_v1.glb`.

- [ ] **Step 2: Cleanup in Blender**

Apply scale to 0.8 × 1.6 × 0.8 metres. Recentre origin at base. Decimate to ~3-5k tris. Export as `assets/_source/knight_cleaned.glb`.

- [ ] **Step 3: Mixamo auto-rig**

Visit https://mixamo.com. Upload `knight_cleaned.glb`. Place rig markers. Add animations: idle (burdened), walking, jump, pick-up. Use "Pack with skin" download mode.

If Mixamo deforms badly → **timebox 30 minutes**, then fall back to Quaternius.

- [ ] **Step 4: Convert FBX → GLB**

In Blender: import the FBX, ensure animations preserved, export as GLB. Save to `assets/models/knight.glb`.

- [ ] **Step 5: Repeat for werewolf**

Tripo prompt:

> [paste fragment] werewolf, hunched silhouette, long forearms, oversized claw mass, snout/head wedge, predatory but tragic, T-pose for rigging

Werewolf is the highest-risk asset. Be willing to fall back to Quaternius or buy Synty Polygon Fantasy ($15) if Tripo + Mixamo don't deliver.

Save as `assets/models/werewolf.glb`.

- [ ] **Step 6: Commit**

```bash
git add assets/_source/ assets/models/knight.glb assets/models/werewolf.glb
git commit -m "assets: knight and werewolf models with Mixamo animations"
```

---

## Task 32: Generate Tripo props (manual)

- [ ] **Step 1: Generate the four props**

Each in Tripo with the style anchor:
- `push_block.glb` — "stone block, weathered, square edges"
- `goblet.glb` — "ornate goblet with dramatic cup silhouette, tarnished gold"
- `door.glb` — "heavy wooden castle door with iron bands"
- `chained_cauldron.glb` — "bulbous iron cauldron suspended on chains, dark, ominous"

Inspect each against silhouette and style anchor. Regenerate as needed.

- [ ] **Step 2: Cleanup in Blender**

Apply scale per spec §6.2. Recentre origins. Export as GLB to `assets/models/`.

- [ ] **Step 3: Commit**

```bash
git add assets/_source/ assets/models/push_block.glb assets/models/goblet.glb assets/models/door.glb assets/models/chained_cauldron.glb
git commit -m "assets: prop GLBs (push_block, goblet, door, chained_cauldron)"
```

---

## Task 33: Replace placeholder meshes with real GLBs

**Files:**
- Modify: `src/scenes/TheHall.ts`

- [ ] **Step 1: Add a `applyToonToHero` helper at top of `TheHall.ts`**

After the imports, add:

```ts
function applyToonToHero(group: THREE.Object3D): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const oldMat = obj.material as THREE.MeshStandardMaterial
      const color = oldMat?.color?.getHex() ?? 0xffffff
      const newMat = makeToonMaterial(color)
      if (oldMat?.map) newMat.map = oldMat.map
      obj.material = newMat
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
}
```

- [ ] **Step 2: Pre-load GLBs in `buildTheHall`**

At the top of `buildTheHall`, before placing entities, add:

```ts
await loader.loadAll(
  [
    '/assets/models/knight.glb',
    '/assets/models/werewolf.glb',
    '/assets/models/push_block.glb',
    '/assets/models/goblet.glb',
    '/assets/models/door.glb',
    '/assets/models/chained_cauldron.glb',
  ],
  [],
)
```

- [ ] **Step 3: Replace placeholder meshes**

For the push-block:

```ts
// Was:
//   const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(...), makeToonMaterial(0x9b6a3a))
// Now:
const blockMesh = loader.cloneModel('/assets/models/push_block.glb')
applyToonToHero(blockMesh)
```

Repeat the pattern for: `goblet` (`/assets/models/goblet.glb`), `door` (`/assets/models/door.glb`), `cauldronMesh` (`/assets/models/chained_cauldron.glb`), `playerMesh` (`/assets/models/knight.glb`).

Preserve all positioning and scaling logic — only swap the mesh creation.

- [ ] **Step 4: Run dev server and verify**

```bash
pnpm dev
```

Expected: real meshes appear in place of placeholders. All gameplay unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/TheHall.ts
git commit -m "feat(scenes): load real GLBs in place of placeholder geometry"
```

---

## Task 34: Werewolf mesh swap on transformation

**Files:**
- Modify: `src/scenes/TheHall.ts`, `src/main.ts`

- [ ] **Step 1: In TheHall.ts, pre-load and parent werewolf to player**

Inside `buildTheHall`, after the player mesh is set up:

```ts
const werewolfMesh = loader.cloneModel('/assets/models/werewolf.glb')
applyToonToHero(werewolfMesh)
werewolfMesh.visible = false
player.object3D!.add(werewolfMesh)
const knightMesh = playerMesh
```

Update the return type and value to expose a swap function:

```ts
export interface HallBuild {
  room: Room
  player: Player
  enemy: PatrolEnemy
  door: Door
  goblet: Pickup
  swapForm: (form: 'human' | 'werewolf') => void
}

// at end of buildTheHall:
return {
  room, player, enemy, door, goblet,
  swapForm: (form: 'human' | 'werewolf') => {
    knightMesh.visible = form === 'human'
    werewolfMesh.visible = form === 'werewolf'
  },
}
```

- [ ] **Step 2: Hook it up in `main.ts`**

After `const build = await buildTheHall(...)`:

```ts
state.onTransformed = () => build.swapForm(state.form)
```

- [ ] **Step 3: Verify**

```bash
pnpm dev
```

Wait 20s → mesh swaps. Pick up goblet, wait 20s → goblet drops, werewolf appears.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/TheHall.ts src/main.ts
git commit -m "feat: werewolf mesh swap on form transformation"
```

---

## Task 35: Particle burst for transformation

**Files:**
- Create: `src/game/ParticleBurst.ts`. Modify `src/scenes/TheHall.ts`, `src/main.ts`.

- [ ] **Step 1: Create `src/game/ParticleBurst.ts`**

```ts
import * as THREE from 'three'

const PARTICLE_COUNT = 40

export class ParticleBurst {
  readonly mesh: THREE.Points
  private velocities: Float32Array
  private lifetime = 0
  private active = false

  constructor() {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xff8030,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
    this.mesh = new THREE.Points(geom, mat)
    this.mesh.visible = false
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)
  }

  burst(at: THREE.Vector3): void {
    this.active = true
    this.lifetime = 0
    this.mesh.visible = true
    const positions = (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = at.x
      positions[i * 3 + 1] = at.y + 1
      positions[i * 3 + 2] = at.z
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3
      const speed = 1 + Math.random() * 2
      this.velocities[i * 3 + 0] = Math.cos(angle) * speed
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 3
      this.velocities[i * 3 + 2] = Math.sin(angle) * speed
    }
    ;(this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  update(dt: number): void {
    if (!this.active) return
    this.lifetime += dt
    const positions = (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt
      positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt
      positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt
      this.velocities[i * 3 + 1] -= 6 * dt
    }
    ;(this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    if (this.lifetime > 1.0) {
      this.active = false
      this.mesh.visible = false
    }
  }
}
```

- [ ] **Step 2: Wire into TheHall.ts**

Add to `HallBuild`:

```ts
import { ParticleBurst } from '../game/ParticleBurst'
// ...
export interface HallBuild {
  room: Room
  player: Player
  enemy: PatrolEnemy
  door: Door
  goblet: Pickup
  swapForm: (form: 'human' | 'werewolf') => void
  burst: ParticleBurst
}
```

In `buildTheHall`, add a particle burst:

```ts
const burst = new ParticleBurst()
room.group.add(burst.mesh)
```

Return it: `return { ..., burst }`.

- [ ] **Step 3: Trigger it in `main.ts`**

Replace `state.onTransformed`:

```ts
state.onTransformed = () => {
  build.swapForm(state.form)
  build.burst.burst(player.position)
}
```

In the update callback, also call `build.burst.update(dt)`.

- [ ] **Step 4: Verify**

```bash
pnpm dev
```

Expected: at 20s mark, particles burst from player position as the mesh swaps.

- [ ] **Step 5: Commit**

```bash
git add src/game/ParticleBurst.ts src/scenes/TheHall.ts src/main.ts
git commit -m "feat(game): particle burst on transformation"
```

---

## Task 36: Debug overlay

**Files:**
- Create: `src/engine/DebugOverlay.ts`. Modify `src/main.ts`.

- [ ] **Step 1: Create `src/engine/DebugOverlay.ts`**

```ts
import * as THREE from 'three'
import type { Room } from '../game/Room'
import { Category } from './categories'

export class DebugOverlay {
  visible = false
  private group: THREE.Group

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group()
    this.group.visible = false
    scene.add(this.group)
  }

  toggle(): void {
    this.visible = !this.visible
    this.group.visible = this.visible
  }

  refresh(room: Room): void {
    this.group.clear()
    if (!this.visible) return

    for (const e of room.entities) {
      const color =
        e.hasCategory(Category.SOLID_WORLD) ? 0xff0000 :
        e.hasCategory(Category.SOLID_DYNAMIC) ? 0xff8800 :
        e.hasCategory(Category.PICKUP_TRIGGER) ? 0x00ff00 :
        e.hasCategory(Category.HAZARD) ? 0xff00ff :
        e.hasCategory(Category.SUPPORT_SURFACE) ? 0x0088ff :
        0xaaaaaa

      const helper = new THREE.Box3Helper(
        new THREE.Box3(
          new THREE.Vector3(
            e.position.x - e.extents.x / 2,
            e.position.y,
            e.position.z - e.extents.z / 2,
          ),
          new THREE.Vector3(
            e.position.x + e.extents.x / 2,
            e.position.y + e.extents.y,
            e.position.z + e.extents.z / 2,
          ),
        ),
        new THREE.Color(color),
      )
      this.group.add(helper)
    }
  }
}
```

- [ ] **Step 2: Wire into main.ts**

```ts
import { DebugOverlay } from './engine/DebugOverlay'

// In main(), after renderer:
const debug = new DebugOverlay(renderer.scene)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyD') debug.toggle()
})

// In the render callback, before render():
loop.onRender(() => {
  room.updateRenderPositions(0.18)
  debug.refresh(room)
  renderer.render()
})
```

- [ ] **Step 3: Verify**

```bash
pnpm dev
```

Press D. Expected: wireframe boxes around every entity, color-coded by category.

- [ ] **Step 4: Commit**

```bash
git add src/engine/DebugOverlay.ts src/main.ts
git commit -m "feat(engine): debug overlay toggle for collision shapes"
```

---

# PHASE 7 — Verification

## Task 37: End-to-end playthrough

**Files:** None.

- [ ] **Step 1: Run dev server and play through the slice**

```bash
pnpm dev
```

Verify each Definition-of-Done item from spec §13:

1. Browser shows The Hall rendered with moonbeam + torch + ambient lighting.
2. Arrow keys move knight on grid with smooth render interpolation.
3. Space jumps with parabola; landing emits a single event.
4. Walking into push-block initiates push if legal.
5. Jumping onto stationary push-block places knight on top; jumping again reaches static ledge.
6. Pressing E on ledge with goblet at player tile picks it up; HUD shows "carrying: goblet".
7. Door is closed at start; opens automatically once goblet held.
8. Walking through open door = win state ("YOU WIN").
9. 20s timer transforms human → werewolf and back; mesh swaps; particle burst.
10. Transforming while carrying drops goblet at current position.
11. Werewolf form cannot pick up.
12. Patrol enemy contact respawns player at spawn point.
13. All unit tests pass: `pnpm test`.
14. `pnpm build` produces deployable bundle.
15. Compliance check (Task 38).

If any item fails, fix before declaring done.

- [ ] **Step 2: Try to break it**

- Push block off ledge edge → should not crash
- Transform mid-jump → goblet drops, mesh swaps cleanly
- Hold goblet, transform, return to human → goblet on floor, can re-pick up
- Walk into enemy → respawn at spawn

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
pnpm build
pnpm lint
pnpm lint:no-render-pos
```

Expected: all pass.

---

## Task 38: Doc compliance review

**Files:** None modified — review-only. May create `docs/POLISH_DEBT.md`.

- [ ] **Step 1: Walk through `docs/ART_DIRECTION.md` § Review Checklist**

For the running game, answer each question. Document any "no" in `docs/POLISH_DEBT.md`.

- [ ] **Step 2: Walk through `docs/VISUAL_DO_NOTS.md` § Quick Smell Tests**

Same — document drift in `docs/POLISH_DEBT.md`.

- [ ] **Step 3: Walk through `docs/PHYSICS_AND_COLLISION.md` § Review Checklist**

Verify all 10 items. Test-covered already.

- [ ] **Step 4: Commit polish-debt file if created**

```bash
git add docs/POLISH_DEBT.md
git commit -m "docs: post-MVP polish-debt list from compliance review"
```

- [ ] **Step 5: Tag the slice**

```bash
git tag -a mvp-vertical-slice -m "Vertical slice MVP — single playable room"
git push origin mvp-vertical-slice
```

---

# Notes

- **Frequent commits:** every task ends with a commit. Don't batch.
- **CI runs on every PR** via `.github/workflows/ci.yml`.
- **Asset tasks (30, 31, 32) are manual** — they don't fit strict TDD-with-code. The plan is honest about this. Until they're done, use placeholder geometry from the earlier tasks (Task 26 sets up working placeholders).
- **Polish-debt is documented, not hidden.** Spec §14 already acknowledges transformation animation and character silhouette quality may be below ART_DIRECTION's bar. Task 38 documents anything else that emerges.
- **Definition of Done** is the spec's §13 list. Task 37 walks through it explicitly.
