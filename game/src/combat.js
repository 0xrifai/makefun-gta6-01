// Combat on foot: pistol shots, punches, bullets and hit sparks.
import { dist, clamp } from './random.js';
import { hurtPed } from './pedestrians.js';

export function createCombat() {
  return {
    bullets: [],
    cooldown: 0,
    punchCooldown: 0,
    muzzle: 0,
  };
}

export function shoot(combat, G) {
  if (combat.cooldown > 0) return;
  combat.cooldown = 0.28;
  combat.muzzle = 0.08;
  const P = G.player;
  const angle = P.aimAngle;
  combat.bullets.push({
    x: P.x + Math.cos(angle) * 22,
    y: P.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    life: 0.6,
  });
  G.audio.shot();
  G.particles.push({ x: P.x + Math.cos(angle) * 26, y: P.y + Math.sin(angle) * 26, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#ffd94a', size: 7, kind: 'flash' });
  // A gunshot is a crime, and it scares everyone nearby.
  G.police.wanted = clamp(G.police.wanted + 0, 0, 5);
  if (G.police.wanted < 1) G.police.wanted = 1;
  G.police.heat = 0;
  G.danger = { x: P.x, y: P.y };
}

export function punch(combat, G) {
  if (combat.punchCooldown > 0) return;
  combat.punchCooldown = 0.45;
  const P = G.player;
  const reach = 46;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    const d = dist(P.x, P.y, ped.x, ped.y);
    if (d < reach) {
      const res = hurtPed(ped, 50);
      G.audio.thud();
      G.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: -30, life: 0.4, max: 0.4, color: '#ffffff', size: 5, kind: 'ring' });
      if (res === 'killed') {
        G.police.wanted = clamp(G.police.wanted + 1, 0, 5);
        G.police.heat = 0;
      }
      return;
    }
  }
  // A swing at the air still makes a sound.
  G.audio.swish();
}

export function stepBullets(combat, dt, G) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.punchCooldown = Math.max(0, combat.punchCooldown - dt);
  combat.muzzle = Math.max(0, combat.muzzle - dt);
  for (const b of combat.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // Hit a pedestrian.
    for (const ped of G.peds) {
      if (ped.dead) continue;
      if (dist(b.x, b.y, ped.x, ped.y) < 14) {
        b.life = 0;
        const res = hurtPed(ped, 34);
        G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ff5a4a', size: 6, kind: 'flash' });
        if (res === 'killed') {
          G.police.wanted = clamp(G.police.wanted + 1, 0, 5);
          G.police.heat = 0;
        }
        break;
      }
    }
    if (b.life <= 0) continue;
    // Hit a police car.
    for (const cop of G.police.cars) {
      if (cop.dead) continue;
      if (dist(b.x, b.y, cop.x, cop.y) < 26) {
        b.life = 0;
        cop.speed *= 0.85;
        G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffd94a', size: 6, kind: 'flash' });
        break;
      }
    }
    if (b.life <= 0) continue;
    // Hit a traffic car (it swerves and its driver bails out angry — counted as a hit).
    for (const car of G.cars) {
      if (car.dead || car.cop) continue;
      if (dist(b.x, b.y, car.x, car.y) < 26) {
        b.life = 0;
        car.speed *= 0.8;
        G.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ffd94a', size: 6, kind: 'flash' });
        break;
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
}
