// Cars: player driving physics and the traffic AI that fills the streets.
import { ROADS_X, ROADS_Y, CAR_MODELS, WORLD_W, WORLD_H } from './config.js';
import { makeRng, pick, range, clamp, angleDiff, dist } from './random.js';
import { collideBuildings, randomRoadPoint, pointInBuilding } from './world.js';

let nextId = 1;

export function makeCar(x, y, angle, model, opts = {}) {
  return {
    id: nextId += 1,
    x, y, angle,
    speed: 0, // signed forward speed, px/s
    model,
    color: opts.color ?? model.color,
    traffic: !!opts.traffic,
    cop: !!opts.cop,
    parked: !!opts.parked,
    target: null, // traffic: next intersection {x, y}
    wait: 0,
    honk: 0,
    skid: 0,
    crashed: 0,
    dead: false,
  };
}

// Spawn the traffic and parked cars that fill the city at the start.
export function spawnTraffic(rng, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(rng);
    const model = pick(rng, CAR_MODELS);
    const car = makeCar(p.x, p.y, pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), model, { traffic: true });
    car.target = pickNextIntersection(rng, car);
    cars.push(car);
  }
  // Parked cars along the roads for the player to steal.
  for (let i = 0; i < 14; i += 1) {
    const p = randomRoadPoint(rng);
    const model = pick(rng, CAR_MODELS);
    const angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    const parked = makeCar(p.x, p.y, angle, model, { parked: true });
    // Nudge parked cars to the road edge so they read as parked.
    parked.x += Math.cos(angle + Math.PI / 2) * 30;
    parked.y += Math.sin(angle + Math.PI / 2) * 30;
    cars.push(parked);
  }
  return cars;
}

function pickNextIntersection(rng, car) {
  // Intersections adjacent to the car's current road: pick a random one.
  const nearX = ROADS_X.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a);
  const nearY = ROADS_Y.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a);
  const options = [];
  for (const ry of ROADS_Y) options.push({ x: nearX, y: ry });
  for (const rx of ROADS_X) options.push({ x: rx, y: nearY });
  const t = pick(rng, options);
  if (dist(t.x, t.y, car.x, car.y) < 120) return pickNextIntersection(rng, car);
  return t;
}

// One step of arcade driving physics for any car.
// steer: -1..1, throttle: -1..1 (reverse is negative), handbrake: bool.
export function driveCar(car, dt, steer, throttle, handbrake, city) {
  const m = car.model;
  const forwardX = Math.cos(car.angle), forwardY = Math.sin(car.angle);
  const forwardSpeed = car.speed;
  const targetTop = m.top * (throttle < 0 ? 0.45 : 1);
  let accel = 0;
  if (throttle > 0) accel = m.accel * throttle;
  else if (throttle < 0) accel = forwardSpeed > 5 ? -m.accel * 1.6 : -m.accel * 0.7;
  car.speed = clamp(car.speed + accel * dt, -targetTop, m.top);
  // Rolling drag and handbrake.
  const drag = handbrake ? 3.2 : 0.55;
  car.speed -= car.speed * drag * dt;
  if (Math.abs(car.speed) < 2 && throttle === 0) car.speed = 0;
  // Steering: stronger at speed, weaker in reverse, less grip while handbraking.
  const steerRate = m.grip * clamp(Math.abs(car.speed) / 120, 0, 1) * (handbrake ? 1.7 : 1);
  car.angle += steer * steerRate * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  car.x = clamp(nx, 30, WORLD_W - 30);
  car.y = clamp(ny, 30, WORLD_H - 30);
  // Buildings stop the car with a thud.
  const p = { x: car.x, y: car.y };
  if (collideBuildings(city, p, 20)) {
    const impact = Math.abs(car.speed);
    car.x = p.x; car.y = p.y;
    if (impact > 140) { car.crashed = 1; car.speed *= -0.25; }
    else car.speed *= 0.4;
  }
  if (Math.abs(car.speed) > 240 && handbrake) car.skid = Math.max(car.skid, 0.4);
  car.skid = Math.max(0, car.skid - dt);
  car.crashed = Math.max(0, car.crashed - dt);
  return { moved: dist(before.x, before.y, car.x, car.y) };
}

// Traffic AI: drive along the road grid toward the target intersection.
export function stepTraffic(car, dt, rng, city, allCars, player) {
  if (car.parked || car.cop) return;
  if (car.wait > 0) { car.wait -= dt; return; }
  if (!car.target) car.target = pickNextIntersection(rng, car);
  const t = car.target;
  const d = dist(car.x, car.y, t.x, t.y);
  if (d < 26) {
    car.target = pickNextIntersection(rng, car);
    if (rng() < 0.25) car.wait = range(rng, 0.4, 1.4); // pause at the junction
    return;
  }
  // Drive axis-aligned: head along the longer axis first.
  const dx = t.x - car.x, dy = t.y - car.y;
  const wantAngle = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  const turn = clamp(angleDiff(car.angle, wantAngle) * 2.2, -1, 1);
  // Slow down for a car ahead on the same heading.
  let throttle = 0.85;
  for (const other of allCars) {
    if (other === car || other.dead) continue;
    const od = dist(car.x, car.y, other.x, other.y);
    if (od < 70 && Math.abs(angleDiff(car.angle, Math.atan2(other.y - car.y, other.x - car.x))) < 0.5) {
      throttle = 0.1;
      break;
    }
  }
  // Slow for the player standing in the road.
  if (player && !player.inCar) {
    const pd = dist(car.x, car.y, player.x, player.y);
    if (pd < 70 && Math.abs(angleDiff(car.angle, Math.atan2(player.y - car.y, player.x - car.x))) < 0.6) throttle = 0;
  }
  driveCar(car, dt, turn, throttle, false, city);
}

// Car drawing helpers shared by the renderer.
export function carCorners(car) {
  const hw = 22, hh = 11;
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  return [
    { x: car.x + c * hw - s * hh, y: car.y + s * hw + c * hh },
    { x: car.x + c * hw + s * hh, y: car.y + s * hw - c * hh },
    { x: car.x - c * hw + s * hh, y: car.y - s * hw - c * hh },
    { x: car.x - c * hw - s * hh, y: car.y - s * hw + c * hh },
  ];
}
