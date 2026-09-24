"""Find solid block top faces on map.png: the upper half of a 30 px wide
isometric diamond (row widths 2, 6, ..., 30) filled with one colour."""
import numpy as np
from PIL import Image
import os
MAP = os.path.join(os.path.dirname(__file__), '..', '..', 'map.png')


def load(path=MAP):
    return np.array(Image.open(path).convert('RGB')).astype(int)


def colour_codes(img):
    return img[:, :, 0] // 200 * 4 + img[:, :, 1] // 200 * 2 + img[:, :, 2] // 200


def find_tops(img):
    return find_tops_in(colour_codes(img), (0, 0, img.shape[1], img.shape[0]))


def find_tops_in(code, box):
    """Top faces whose apex lies in box (x0, y0, x1, y1) of the colour codes."""
    x0, y0, x1, y1 = box
    y0, x0 = max(y0, 1), max(x0, 16)
    return [(x + x0 - 16, y + y0 - 1, c) for x, y, c in find_all_tops(code[y0 - 1:y1 + 10, x0 - 16:x1 + 17])
            if x0 <= x + x0 - 16 < x1 and y0 <= y + y0 - 1 < y1]


def find_all_tops(code):
    h, w = code.shape
    lit = code > 0
    hits = []
    ys, xs = np.nonzero(lit[1:-10, :-1] & lit[1:-10, 1:] & ~lit[:-11, :-1] & ~lit[:-11, 1:])
    for y, x in zip(ys + 1, xs):
        colour = code[y, x]
        if x < 16 or x + 17 >= w:
            continue
        if all(is_diamond_row(code[y + k], x - 2 * k, x + 2 + 2 * k, colour) for k in range(7)) \
                and (code[y + 7, x - 14: x + 16] == colour).all():
            hits.append((int(x), int(y), int(colour)))
    return hits


def is_diamond_row(row, start, end, colour):
    return (row[start:end] == colour).all() and row[start - 1] != colour and row[end] != colour


if __name__ == '__main__':
    for hit in find_tops(load()):
        print(*hit)
