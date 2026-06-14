#!/usr/bin/env bash
# Extract Sabreman / Sabrewulf sprites from a coalesced GIF frame folder.
#
# Knight Lore frames are one-colour ZX renders (magenta walls + magenta
# character), so colour-based isolation doesn't work and the character
# rarely moves during a transform sequence so frame-differencing also
# fails. Simplest reliable approach: crop a fixed window known to contain
# only the character. We pre-trim the room to a small box that's empty
# except for Sabreman / Sabrewulf in every frame.
#
# Usage: ./extract-sprite.sh <frames-folder> <output-sheet.png> \
#           <crop W>x<crop H>+<x>+<y> [<fps-stride>]
set -euo pipefail

FRAMES_DIR="${1:-reference/gif2-wulf}"
OUT_SHEET="${2:-public/sprites/sabreman-strip.png}"
CROP_GEOM="${3:-80x100+220+290}"  # default: gif2 character window
STRIDE="${4:-1}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$(dirname "$OUT_SHEET")"

# Step A: crop the character window from every Nth frame and recolour
# the (any-magenta) character pixels to WHITE on TRANSPARENT — black
# pixels become alpha=0 so the sprite has no background fill. The
# runtime mono shader will tint the white wherever it needs.
echo "Cropping ${CROP_GEOM} from frames…"
KEPT=()
i=0
for src in "$FRAMES_DIR"/f-*.png; do
  if (( i % STRIDE == 0 )); then
    out="$WORK_DIR/k-$(printf '%04d' "$i").png"
    magick "$src" -crop "$CROP_GEOM" +repage \
                  -fuzz 35% -transparent black \
                  -fill white +opaque transparent \
                  -trim +repage "$out" 2>/dev/null
    if [[ -s "$out" ]]; then
      w=$(magick identify -format '%w' "$out")
      if (( w > 3 )); then
        KEPT+=("$out")
      fi
    fi
  fi
  ((i++))
done
echo "Kept ${#KEPT[@]} frames."

if [[ ${#KEPT[@]} -eq 0 ]]; then
  echo "ERROR: no frames extracted. Check the CROP_GEOM." >&2
  exit 1
fi

# Step B: pad each frame to the max cell size, gravity south (feet aligned)
MAX_W=0
MAX_H=0
for f in "${KEPT[@]}"; do
  w=$(magick identify -format '%w' "$f")
  h=$(magick identify -format '%h' "$f")
  (( w > MAX_W )) && MAX_W=$w
  (( h > MAX_H )) && MAX_H=$h
done
echo "Sprite cell: ${MAX_W}x${MAX_H}"

PADDED=()
for f in "${KEPT[@]}"; do
  out="${f%.png}-pad.png"
  magick "$f" -background transparent -gravity south \
              -extent "${MAX_W}x${MAX_H}" "$out"
  PADDED+=("$out")
done

# Step C: append horizontally into the final strip
magick "${PADDED[@]}" +append "$OUT_SHEET"
echo "Wrote $OUT_SHEET ($(magick identify -format '%wx%h' "$OUT_SHEET"))"
echo "Frame count: ${#KEPT[@]}, cell: ${MAX_W}x${MAX_H}"
