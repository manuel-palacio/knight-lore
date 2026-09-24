"""Find every door arch on map.png by template matching, independent of any
lattice. Prints: kind x y score, where (x, y) is the arch's position given as
the origin of the room whose west (or north) wall holds it."""
import numpy as np
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter
from tops import load, colour_codes
from doors import arch_masks, outline, WEST_BOX, NORTH_BOX

THRESHOLD = 0.80


def match(lit, template):
    """arch_score_at for every position of the map at once."""
    t = template.astype(float)
    care = outline(template).astype(float)
    hits_lit = fftconvolve(lit, t[::-1, ::-1], mode='valid')
    hits_dark = fftconvolve(1 - lit, ((1 - t) * care)[::-1, ::-1], mode='valid')
    return (hits_lit + hits_dark) / care.sum()


def find_arches(code):
    lit = (code > 0).astype(float)
    found = []
    for kind, box in (('west', WEST_BOX), ('north', NORTH_BOX)):
        score = match(lit, arch_masks(code)[kind])
        peaks = (score == maximum_filter(score, size=15)) & (score > THRESHOLD)
        for y, x in zip(*np.nonzero(peaks)):
            found.append((kind, int(x - box[0]), int(y - box[1]), float(score[y, x])))
    return found


if __name__ == '__main__':
    for kind, x, y, s in find_arches(colour_codes(load())):
        print(kind, x, y, f'{s:.3f}')
