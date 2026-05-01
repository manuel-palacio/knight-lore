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
