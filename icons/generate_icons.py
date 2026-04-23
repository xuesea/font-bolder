#!/usr/bin/env python3
"""Generate Chrome extension icons from a deterministic vector-like drawing."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SIZES = (16, 32, 48, 128)
SCALE = 4


def clamp(value: float, low: int = 0, high: int = 255) -> int:
    return max(low, min(high, int(round(value))))


def mix(a: tuple[int, int, int, int], b: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(4))


def over(dst: tuple[int, int, int, int], src: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    alpha = src[3] / 255
    inv = 1 - alpha
    return (
        clamp(src[0] * alpha + dst[0] * inv),
        clamp(src[1] * alpha + dst[1] * inv),
        clamp(src[2] * alpha + dst[2] * inv),
        255,
    )


def inside_round_rect(x: float, y: float, left: float, top: float, right: float, bottom: float, radius: float) -> bool:
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def point_in_poly(x: float, y: float, points: tuple[tuple[float, float], ...]) -> bool:
    inside = False
    j = len(points) - 1
    for i, point in enumerate(points):
        xi, yi = point
        xj, yj = points[j]
        if (yi > y) != (yj > y):
            cross = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < cross:
                inside = not inside
        j = i
    return inside


def dist_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def inside_capsule(x: float, y: float, ax: float, ay: float, bx: float, by: float, width: float) -> bool:
    return dist_to_segment(x, y, ax, ay, bx, by) <= width / 2


def draw_pixel(x: float, y: float) -> tuple[int, int, int, int]:
    transparent = (0, 0, 0, 0)
    if not inside_round_rect(x, y, 0, 0, 128, 128, 28):
        return transparent

    color = (25, 36, 23, 255)
    if inside_round_rect(x, y, 10, 10, 118, 118, 24):
        color = mix((255, 245, 207, 255), (230, 196, 122, 255), (x + y) / 256)

    left_stem = ((37, 91), (58, 34), (70, 34), (51, 91))
    right_stem = ((58, 34), (72, 34), (93, 91), (78, 91))
    crossbar = ((55, 65), (73, 65), (77, 78), (51, 78))
    counter = ((62, 49), (66, 49), (70, 65), (59, 65))
    ink = mix((41, 56, 32, 255), (16, 23, 15, 255), y / 128)

    if point_in_poly(x, y, left_stem) or point_in_poly(x, y, right_stem) or point_in_poly(x, y, crossbar):
        color = ink
    if point_in_poly(x, y, counter):
        color = mix((255, 245, 207, 255), (230, 196, 122, 255), (x + y) / 256)

    if inside_capsule(x, y, 32, 96, 96, 96, 8):
        color = over(color, (16, 23, 15, 255))
    if inside_capsule(x, y, 32, 107, 80, 107, 6):
        color = over(color, (51, 73, 41, 224))

    return color


def write_png(path: Path, size: int, pixels: list[tuple[int, int, int, int]]) -> None:
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            row.extend(pixels[y * size + x])
        rows.append(bytes(row))

    raw = b''.join(rows)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack('>I', len(data))
            + kind
            + data
            + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    path.write_bytes(png)


def render(size: int) -> None:
    high = size * SCALE
    high_pixels = []
    for y in range(high):
        for x in range(high):
            high_pixels.append(draw_pixel((x + 0.5) * 128 / high, (y + 0.5) * 128 / high))

    pixels = []
    for y in range(size):
        for x in range(size):
            samples = [
                high_pixels[(y * SCALE + sy) * high + (x * SCALE + sx)]
                for sy in range(SCALE)
                for sx in range(SCALE)
            ]
            pixels.append(tuple(sum(sample[i] for sample in samples) // len(samples) for i in range(4)))

    write_png(ROOT / f'icon{size}.png', size, pixels)


def main() -> None:
    for size in SIZES:
        render(size)


if __name__ == '__main__':
    main()
