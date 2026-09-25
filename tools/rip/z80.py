"""Load a 48K .z80 snapshot (version 2 or 3) into a 64K memory image.

usage: from z80 import load_memory; mem = load_memory('reference/KnightLore.z80')"""

PAGE_ADDRESS = {8: 0x4000, 4: 0x8000, 5: 0xC000}
PAGE_SIZE = 0x4000


def load_memory(path):
    data = open(path, 'rb').read()
    if data[6] or data[7]:
        raise ValueError('version 1 snapshots are not supported')
    extra = data[30] | data[31] << 8
    pos = 32 + extra
    memory = bytearray(0x10000)
    while pos < len(data):
        length = data[pos] | data[pos + 1] << 8
        page = data[pos + 2]
        pos += 3
        raw = data[pos:pos + PAGE_SIZE] if length == 0xFFFF else decompress(data[pos:pos + length])
        pos += PAGE_SIZE if length == 0xFFFF else length
        if page in PAGE_ADDRESS:
            memory[PAGE_ADDRESS[page]:PAGE_ADDRESS[page] + PAGE_SIZE] = raw[:PAGE_SIZE]
    return memory


def decompress(block):
    out = bytearray()
    i = 0
    while i < len(block):
        if block[i] == 0xED and i + 1 < len(block) and block[i + 1] == 0xED:
            out += bytes([block[i + 3]]) * block[i + 2]
            i += 4
        else:
            out.append(block[i])
            i += 1
    return out
