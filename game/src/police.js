// The Palmera PD: wanted stars, police cars that chase and ram, and busts.
import { ROADS_X, ROADS_Y } from './config.js';
import { makeRng, pick, range, clamp, angleDiff, dist } from './random.js';
import { driveCar, makeCar } from './vehicles.js';
import { randomRoadPoint } from './world.js';

export const COP_MODEL = { name: 'Interceptor', color: '#1a1a22', top: 440, accel: 360, grip: 3.4 };

export function createPolice() {
  return {
    wanted: 0,
    heat: 0, // seconds since the last crime
    bustTimer: 0,
    bustProgress: 0,
    siren: 0,
    cars: [],
    spawnTimer: 0,
  };
}

// A crime raises the wanted level (max 5) and resets the heat clock.
export function commitCrime(police, stars, reason) {
  police.wanted = clamp(police.wanted + stars, 0, 5);
  police.heat = 0;
  return reason;
}

export function stepPolice(police, dt, rng, city, player, allCars, onBusted, now) {
  const p = police;
  p.heat += dt;
  p.siren = Math.max(0, p.siren - dt);

  // Wanted level cools off when the player lies low and no cop is near.
  if (p.wanted > 0 && p.heat > 14) {
    const nearCop = p.cars.some((c) => !c.dead && dist(c.x, c.y, player.x, player.y) < 320);
    if (!nearCop) {
      p.heat = 6; // next star drops after another quiet stretch
      p.wanted -= 1;
      if (p.wanted === 0) p.cars.forEach((c) => { c.dead = true; });
    }
  }

  // Spawn police cars to match the wanted level.
  const wantCount = p.wanted === 0 ? 0 : Math.min(1 + p.wanted, 5);
  p.spawnTimer -= dt;
  const live = p.cars.filter((c) => !c.dead).length;
  if (live < wantCount && p.spawnTimer <= 0) {
    p.spawnTimer = 1.2;
    const spot = randomRoadPoint(rng);
    // Spawn a little way from the player so they arrive with sirens, not on top of them.
    let tries = 0;
    while (dist(spot.x, spot.y, player.x, player.y) < 420 && tries < 8) {
      const s2 = randomRoadPoint(rng);
      spot.x = s2.x; spot.y = s2.y; tries += 1;
    }
    const cop = makeCar(spot.x, spot.y, Math.atan2(player.y - spot.y, player.x - spot.x), COP_MODEL, { cop: true });
    cop.color = '#20242e';
    p.cars.push(cop);
    allCars.push(cop);
    p.siren = 3;
  }

  // Chase: steer at the player, ram to stop them.
  for (const cop of p.cars) {
    if (cop.dead) continue;
    const d = dist(cop.x, cop.y, player.x, player.y);
    const wantAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
    // Predict where the player is heading so the chase cuts them off.
    const lead = player.inCar && player.car
      ? { x: player.x + Math.cos(player.car.angle) * player.car.speed * 0.35, y: player.y + Math.sin(player.car.angle) * player.car.speed * 0.35 }
      : { x: player.x, y: player.y };
    const aimAngle = Math.atan2(lead.y - cop.y, lead.x - cop.x);
    const turn = clamp(angleDiff(cop.angle, aimAngle) * 2.6, -1, 1);
    // Back up and re-aim when stuck against a wall or another car.
    let throttle = 1;
    if (Math.abs(angleDiff(cop.angle, aimAngle)) > 2.2) throttle = -0.7;
    if (d < 60 && player.inCar) throttle = 1; // keep ramming
    driveCar(cop, dt, turn, throttle, false, city);
    // Ram damage when the cop slams the player's car — at most once a second
    // per cop, so a chase wears the car down instead of shredding it instantly.
    if (player.inCar && player.car && d < 52 && Math.abs(cop.speed) > 120) {
      if (cop.ramAt === undefined || now - cop.ramAt > 0.9) {
        cop.ramAt = now;
        player.car.speed *= 0.7;
        cop.speed *= 0.6;
        player.carHealth = Math.max(0, (player.carHealth ?? 100) - 5);
      }
    }
  }

  // Bust: a cop stays on top of the player while they are slow or on foot.
  const playerSlow = !player.inCar || (player.car && Math.abs(player.car.speed) < 30);
  const touching = p.cars.some((c) => !c.dead && dist(c.x, c.y, player.x, player.y) < 46);
  if (p.wanted > 0 && touching && playerSlow) {
    p.bustProgress += dt;
    if (p.bustProgress > 1.6) {
      p.bustProgress = 0;
      onBusted();
    }
  } else {
    p.bustProgress = Math.max(0, p.bustProgress - dt * 2);
  }
}

// A cop shot or rammed hard goes down; the player earns heat for it.
export function shootCop(police, cop) {
  cop.dead = true;
  commitCrime(police, 1, 'Cop down');
}
