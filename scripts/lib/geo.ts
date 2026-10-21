export type Position = [number, number];
export type BBox = [number, number, number, number]; // minLng, minLat, maxLng, maxLat

/** FNV-1a 32bit → base36。路線・駅の短い安定IDに使う。 */
export function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function emptyBBox(): BBox {
  return [Infinity, Infinity, -Infinity, -Infinity];
}

export function extendBBox(b: BBox, p: Position): void {
  if (p[0] < b[0]) b[0] = p[0];
  if (p[1] < b[1]) b[1] = p[1];
  if (p[0] > b[2]) b[2] = p[0];
  if (p[1] > b[3]) b[3] = p[1];
}

export function bboxContains(b: BBox, p: Position): boolean {
  return p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
}

export function expandBBox(b: BBox, margin: number): BBox {
  return [b[0] - margin, b[1] - margin, b[2] + margin, b[3] + margin];
}

export function anyInside(coords: Position[], b: BBox): boolean {
  return coords.some((p) => bboxContains(b, p));
}

/** 折れ線の中点（長さベース）。駅のLineStringを点に落とすのに使う。 */
export function lineMidpoint(coords: Position[]): Position {
  if (coords.length === 0) throw new Error("empty line");
  if (coords.length === 1) return coords[0]!;
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!;
    const b = coords[i]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(l);
    total += l;
  }
  if (total === 0) return coords[0]!;
  let acc = 0;
  for (let i = 0; i < segLen.length; i++) {
    const l = segLen[i]!;
    if (acc + l >= total / 2) {
      const t = (total / 2 - acc) / l;
      const a = coords[i]!;
      const b = coords[i + 1]!;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    acc += l;
  }
  return coords[coords.length - 1]!;
}

/**
 * Douglas-Peucker。tolerance は度単位。経度は cos(緯度) で補正して
 * 東西方向が過剰に間引かれないようにする。
 */
export function simplifyLine(coords: Position[], tolerance: number): Position[] {
  if (coords.length <= 2 || tolerance <= 0) return coords;
  const lat0 = coords[0]![1];
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const tol2 = tolerance * tolerance;
  const keep = new Uint8Array(coords.length);
  keep[0] = 1;
  keep[coords.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, coords.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const a = coords[first]!;
    const b = coords[last]!;
    for (let i = first + 1; i < last; i++) {
      const d = segDist2(coords[i]!, a, b, kx);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol2 && idx > 0) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  const out: Position[] = [];
  for (let i = 0; i < coords.length; i++) if (keep[i]) out.push(coords[i]!);
  return out;
}

function segDist2(p: Position, a: Position, b: Position, kx: number): number {
  let x = a[0] * kx;
  let y = a[1];
  let dx = b[0] * kx - x;
  let dy = b[1] - y;
  const px = p[0] * kx;
  const py = p[1];
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0] * kx;
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}
