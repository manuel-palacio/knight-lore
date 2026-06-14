import * as THREE from 'three'
import type { IUniform } from 'three'

// Screen-space monochrome pass. Each pixel's luminance is multiplied by the
// active room's tint colour and snapped to a small number of steps — that
// gives the original Knight Lore "one bright colour on pure black" look,
// where the room only shows yellow OR cyan OR purple OR green, never a mix.
//
// uTint: the room's primary colour (RGB).
// uLevels: how many brightness steps the luminance gets quantised to
//   (3 = the ZX Spectrum's classic dark / mid / bright; 0 disables the
//   posterisation and just monochromes).
export const MonoTintShader: {
  uniforms: Record<string, IUniform>
  vertexShader: string
  fragmentShader: string
} = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: new THREE.Color(0xffd95a) },
    uLevels: { value: 6 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    uniform float uLevels;
    varying vec2 vUv;

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      // ITU-R BT.601 luma weights.
      float lum = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));
      // Quantise to N brightness bands so the room reads as flat fills,
      // not gradients. Disabled when uLevels <= 1.
      if (uLevels > 1.0) {
        lum = floor(lum * uLevels) / max(uLevels - 1.0, 1.0);
      }
      lum = clamp(lum, 0.0, 1.0);
      gl_FragColor = vec4(uTint * lum, 1.0);
    }
  `,
}
