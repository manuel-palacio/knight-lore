// What a column of the room's blocks looks like, level by level: runs of
// plain block (the block sprite, graphic 7) between the levels that are
// drawn as themselves (a hedge, graphic 6; a gargoyle, graphic 22).
export type DecorKind = 'hedge' | 'gargoyle'
export type Look = 'block' | DecorKind

export interface Segment {
  bottom: number
  top: number
  look: Look
}

export function columnSegments(height: number, decorAt: (level: number) => DecorKind | undefined): Segment[] {
  const segments: Segment[] = []
  for (let level = 0; level < height; level++) {
    const look: Look = decorAt(level) ?? 'block'
    const last = segments.at(-1)
    if (last && look === 'block' && last.look === 'block') last.top = level + 1
    else segments.push({ bottom: level, top: level + 1, look })
  }
  return segments
}
