// Pedestrians: ordinary people of Palmera Bay walking the sidewalks, fleeing gunfire.
import { PED_NAMES, WORLD_W, WORLD_H } from './config.js';
import { pick, range, rangeInt, dist, clamp } from './random.js';
import { randomSidewalkPoint, collideBuildings } from './world.js';

const SHIRTS = ['#e05a5a', '#5a8ae0', '#5ac98a', '#e0c95a', '#a05ae0', '#e08a5a', '#5ac9c9', '#c95a8a'];
const PANTS = ['#3a3a4a', '#4a3a2a', '#2a4a3a', '#5a5a6a'];

export function spawnPedestrians(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomSidewalkPoint(rng);
    peds.push({
      x: p.x, y: p.y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 26, 52),
      name: pick(rng, PED_NAMES),
      shirt: pick(rng, SHIRTS),
      pants: pick(rng, PANTS),
      target: null,
      flee: 0,
      scared: 0,
      bob: range(rng, 0, Math.PI * 2),
      dead: false,
      hitFlash: 0,
      hp: 100,
    });
  }
  return peds;
}

export function stepPedestrians(peds, dt, rng, city, danger) {
  for (const p of peds) {
    if (p.dead) continue;
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.scared = Math.max(0, p.scared - dt);
    // Flee from a nearby danger (gunshot, speeding car).
    if (danger && dist(p.x, p.y, danger.x, danger.y) < 260) {
      p.flee = 1.6;
      p.scared = 2;
    }
    let speed = p.speed;
    if (p.flee > 0) {
      p.flee -= dt;
      speed = p.speed * 3.4;
      if (danger) p.angle = Math.atan2(p.y - danger.y, p.x - danger.x);
    } else {
      if (!p.target || dist(p.x, p.y, p.target.x, p.target.y) < 18) {
        p.target = randomSidewalkPoint(rng);
      }
      const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      let diff = want - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    }
    const nx = p.x + Math.cos(p.angle) * speed * dt;
    const ny = p.y + Math.sin(p.angle) * speed * dt;
    const pos = { x: clamp(nx, 30, WORLD_W - 30), y: clamp(ny, 30, WORLD_H - 30) };
    collideBuildings(city, pos, 10);
    p.x = pos.x; p.y = pos.y;
    p.bob += dt * (speed / 14);
  }
}

// A pedestrian hit by a bullet: returns 'killed' when they go down.
export function hurtPed(ped, dmg) {
  ped.hp -= dmg;
  ped.hitFlash = 0.25;
  ped.scared = 3;
  ped.flee = 2;
  if (ped.hp <= 0) {
    ped.dead = true;
    return 'killed';
  }
  return 'hit';
}
