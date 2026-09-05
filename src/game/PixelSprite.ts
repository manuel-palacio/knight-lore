import * as THREE from 'three'

export interface SpriteSheetConfig {
  url: string
  frameCount: number      // horizontal frames in the strip
  worldHeight: number     // sprite height in world metres
}

// Billboard pixel-art sprite. THREE.Sprite always faces the camera,
// including the ortho iso camera — no manual quaternion alignment needed.
//
// Material is SpriteMaterial with NEAREST filtering and alpha test, so
// the white-on-transparent texture stays crisp. The screen-space mono
// shader downstream tints the white pixels to the active room hue.
//
// Sprite scale is set so pixels stay square: height matches worldHeight,
// width derived from the per-cell aspect ratio of the sheet.
export class PixelSprite {
  readonly sprite: THREE.Sprite
  private readonly tex: THREE.Texture
  private readonly cellU: number
  readonly frameCount: number

  constructor(cfg: SpriteSheetConfig, loader?: THREE.TextureLoader) {
    this.frameCount = cfg.frameCount
    this.cellU = 1 / cfg.frameCount

    // In headless test envs (no DOM), DataTexture stands in for the loaded
    // image. The visual output isn't being inspected — only the layer
    // visibility and frame index logic are tested.
    const hasDom = typeof document !== 'undefined'
    if (hasDom) {
      const tl = loader ?? new THREE.TextureLoader()
      this.tex = tl.load(cfg.url, (tex) => {
        const img = tex.image as { width?: number; height?: number } | undefined
        if (!img || !img.width || !img.height) return
        const cellW = img.width / cfg.frameCount
        const cellH = img.height
        const aspect = cellW / cellH
        this.sprite.scale.set(cfg.worldHeight * aspect, cfg.worldHeight, 1)
        this.sprite.center.set(0.5, 0)
      })
    } else {
      // 1×1 transparent placeholder texture for the test env
      this.tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
    }
    this.tex.magFilter = THREE.NearestFilter
    this.tex.minFilter = THREE.NearestFilter
    this.tex.colorSpace = THREE.SRGBColorSpace
    this.tex.wrapS = THREE.RepeatWrapping
    this.tex.wrapT = THREE.ClampToEdgeWrapping
    this.tex.repeat.set(this.cellU, 1)
    this.tex.offset.set(0, 0)

    // Use a 50%-gray base colour so the sprite's luminance stays BELOW
    // the bloom pass's 0.85 threshold — no soft halo on the pixel art.
    // The mono shader still picks up the gray as a mid-band tint, so the
    // sprite reads clearly in the room's colour.
    const mat = new THREE.SpriteMaterial({
      map: this.tex,
      color: 0x808080,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false,
    })
    this.sprite = new THREE.Sprite(mat)
    this.sprite.scale.set(cfg.worldHeight, cfg.worldHeight, 1)
    this.sprite.center.set(0.5, 0)
  }

  setFrame(i: number): void {
    const idx = Math.max(0, Math.min(this.frameCount - 1, Math.floor(i)))
    this.tex.offset.x = idx * this.cellU
  }

  dispose(): void {
    const material = this.sprite.material as THREE.Material
    material.dispose()
    this.tex.dispose()
  }
}
