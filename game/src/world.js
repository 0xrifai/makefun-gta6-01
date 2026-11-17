// The city of Palmera Bay: roads, blocks, buildings, parks, trees and collision.
// The world is a regular road grid; each block between roads holds buildings or a park.
import { WORLD_W, WORLD_H, ROAD_W, BLOCK, ROADS_X, ROADS_Y, DISTRICTS } from './config.js';
import { makeRng, pick, range, rangeInt, clamp } from './random.js';

const BUILDING_COLORS = [
  '#d8b48f', '#c9a06a', '#b98d5f', '#e0c9a8', '#a8b8c9', '#8fa8b8',
  '#c98a7f', '#9fb8a0', '#d8c98f', '#b8a8c9', '#e8d8c0', '#7fa8c9',
];
const ROOF_COLORS = ['#8a6a4a', '#6a5a4a', '#5a7a8a', '#7a5a6a', '#4a6a5a', '#9a8a7a'];
const TREE_COLORS = ['#3f7a3a', '#4f8a3a', '#2f6a3a', '#5a9a3a'];

export function generateCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const parks = [];

  // Blocks are the rectangles between neighbouring road centre lines.
  for (let bx = 0; bx < ROADS_X.length - 1; bx += 1) {
    for (let by = 0; by < ROADS_Y.length - 1; by += 1) {
      const x0 = ROADS_X[bx] + ROAD_W / 2 + 14;
      const y0 = ROADS_Y[by] + ROAD_W / 2 + 14;
      const x1 = ROADS_X[bx + 1] - ROAD_W / 2 - 14;
      const y1 = ROADS_Y[by + 1] - ROAD_W / 2 - 14;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      // A few blocks are parks instead of buildings.
      if (rng() < 0.16) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const n = rangeInt(rng, 6, 11);
        for (let i = 0; i < n; i += 1) {
          trees.push({ x: range(rng, x0 + 20, x1 - 20), y: range(rng, y0 + 20, y1 - 20), r: range(rng, 10, 18), color: pick(rng, TREE_COLORS) });
        }
        continue;
      }
      // 1-4 buildings per block, laid out on a small inner grid.
      const cols = rng() < 0.5 ? 2 : 1;
      const rows = rng() < 0.5 ? 2 : 1;
      const bw = (x1 - x0) / cols, bh = (y1 - y0) / rows;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (rng() < 0.12) continue; // occasional empty lot with trees
          const pad = 10;
          const w = bw - pad * 2 - range(rng, 0, 26);
          const h = bh - pad * 2 - range(rng, 0, 26);
          const x = x0 + c * bw + pad + range(rng, 0, 14);
          const y = y0 + r * bh + pad + range(rng, 0, 14);
          buildings.push({
            x, y, w, h,
            color: pick(rng, BUILDING_COLORS),
            roof: pick(rng, ROOF_COLORS),
            height: rangeInt(rng, 1, 3),
            windows: rangeInt(rng, 2, 5),
          });
        }
      }
      // Street trees along the block edges.
      for (let i = 0; i < 3; i += 1) {
        trees.push({ x: range(rng, x0, x1), y: y0 - 6, r: range(rng, 9, 14), color: pick(rng, TREE_COLORS) });
        trees.push({ x: range(rng, x0, x1), y: y1 + 6, r: range(rng, 9, 14), color: pick(rng, TREE_COLORS) });
      }
    }
  }

  // The harbour: water along the east edge, with a wooden pier.
  const water = { x: 3080, y: 0, w: WORLD_W - 3080, h: WORLD_H };
  // The beach: sand along the south edge.
  const beach = { x: 0, y: 2280, w: WORLD_W, h: WORLD_H - 2280 };

  return { buildings, trees, parks, water, beach, districts: DISTRICTS };
}

export function isOnRoad(x, y) {
  const onX = ROADS_X.some((rx) => Math.abs(x - rx) < ROAD_W / 2);
  const onY = ROADS_Y.some((ry) => Math.abs(y - ry) < ROAD_W / 2);
  return onX || onY;
}

export function nearestRoadPoint(x, y) {
  let bx = ROADS_X[0], bd = Math.abs(x - bx);
  for (const rx of ROADS_X) if (Math.abs(x - rx) < bd) { bd = Math.abs(x - rx); bx = rx; }
  let by = ROADS_Y[0]; bd = Math.abs(y - by);
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < bd) { bd = Math.abs(y - ry); by = ry; }
  return { x: bx, y: by };
}

// Push a circle (x, y, r) out of every building it overlaps; returns true if it hit one.
export function collideBuildings(city, p, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(p.x, b.x, b.x + b.w);
    const cy = clamp(p.y, b.y, b.y + b.h);
    const dx = p.x - cx, dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.y = cy + (dy / d) * r;
      } else {
        p.y = b.y - r;
      }
    }
  }
  return hit;
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  }
  return null;
}

export function inWater(city, x, y) {
  return x > city.water.x && x < city.water.x + city.water.w;
}

export function randomRoadPoint(rng) {
  const rx = pick(rng, ROADS_X);
  const ry = pick(rng, ROADS_Y);
  // A point on a road: either on a vertical road at a random y, or a horizontal one at a random x.
  if (rng() < 0.5) return { x: rx + range(rng, -24, 24), y: range(rng, 60, WORLD_H - 60) };
  return { x: range(rng, 60, WORLD_W - 160), y: ry + range(rng, -24, 24) };
}

// A random sidewalk point (just off a road, inside a block edge) for pedestrians.
export function randomSidewalkPoint(rng) {
  const rx = pick(rng, ROADS_X);
  const ry = pick(rng, ROADS_Y);
  const side = rng() < 0.5 ? 1 : -1;
  if (rng() < 0.5) return { x: rx + side * (ROAD_W / 2 + 12), y: range(rng, 80, WORLD_H - 80) };
  return { x: range(rng, 80, WORLD_W - 200), y: ry + side * (ROAD_W / 2 + 12) };
}
