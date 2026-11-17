// Screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot that follows the road grid, so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { STEP, PLACES, ROADS_X, ROADS_Y } from './config.js';
import { clamp, angleDiff, dist } from './random.js';
import { makeCar } from './vehicles.js';
import { startMission } from './missions.js';
import { nearestRoadPoint } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { stepGame, stepWorld } from './main.js';

// A route along the road grid: the nearest intersection, then a Manhattan path
// of intersections to the target's nearest intersection, then the target itself.
function roadRoute(G, tx, ty) {
  const P = G.player;
  const near = nearestRoadPoint(P.x, P.y);
  const tNear = nearestRoadPoint(tx, ty);
  return [
    { x: near.x, y: near.y },
    { x: tNear.x, y: near.y },
    { x: tNear.x, y: tNear.y },
    // End on the road by the destination, never inside a building: the
    // mission markers sit on block edges, and a car cannot reach them.
    { x: tNear.x, y: tNear.y },
  ];
}

// The autopilot's current waypoint on its route; rebuilds the route when the
// destination changes.
function waypoint(G, tx, ty) {
  if (!G.route || G.route.tx !== tx || G.route.ty !== ty) {
    G.route = { tx, ty, pts: roadRoute(G, tx, ty), i: 0 };
  }
  const route = G.route;
  while (route.i < route.pts.length - 1 && dist(G.player.x, G.player.y, route.pts[route.i].x, route.pts[route.i].y) < 80) {
    route.i += 1;
  }
  return route.pts[Math.min(route.i, route.pts.length - 1)];
}

// Steer a car toward the route's current waypoint.
function driveToward(G, tx, ty) {
  const P = G.player;
  const car = P.car;
  if (!car) return;
  // Cruise on to a new random spot once the destination is reached, so the
  // car never orbits the final waypoint in circles.
  if (!G.autoDest) G.autoDest = { x: tx, y: ty };
  const wp = waypoint(G, G.autoDest.x, G.autoDest.y);
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  const diff = angleDiff(car.angle, want);
  const steer = clamp(diff * 2.4, -1, 1);
  const d = dist(car.x, car.y, wp.x, wp.y);
  if (dist(car.x, car.y, G.autoDest.x, G.autoDest.y) < 90) {
    const rx = ROADS_X[Math.floor(G.rng() * ROADS_X.length)];
    const ry = ROADS_Y[Math.floor(G.rng() * ROADS_Y.length)];
    G.autoDest = { x: rx, y: ry };
    G.route = null;
  }
  // Stuck recovery: if the car grinds against a corner, reverse out of it.
  if (!G.autoState) G.autoState = { stuck: 0, reversing: 0 };
  const st = G.autoState;
  if (st.reversing > 0) {
    st.reversing -= STEP;
    G.input.keys = new Set(['s', steer > 0 ? 'a' : 'd']);
    G.input.mouseDown = false;
    return;
  }
  if (Math.abs(car.speed) < 20) st.stuck += STEP;
  else st.stuck = 0;
  if (st.stuck > 1.2) {
    st.stuck = 0;
    st.reversing = 0.9;
    G.input.keys = new Set(['s']);
    G.input.mouseDown = false;
    return;
  }
  const keys = new Set();
  // Coast through sharp turns near the waypoint instead of powering into the corner.
  if (!(d < 170 && Math.abs(diff) > 0.5)) keys.add('w');
  if (steer < -0.15) keys.add('a');
  if (steer > 0.15) keys.add('d');
  G.input.keys = keys;
  G.input.mouseDown = false;
}

// Walk toward the route's current waypoint on foot.
function walkToward(G, tx, ty) {
  const P = G.player;
  const wp = waypoint(G, tx, ty);
  const dx = wp.x - P.x, dy = wp.y - P.y;
  const keys = new Set();
  if (dx > 12) keys.add('d');
  if (dx < -12) keys.add('a');
  if (dy > 12) keys.add('s');
  if (dy < -12) keys.add('w');
  G.input.keys = keys;
  G.input.mouseDown = false;
}

function putPlayerInCar(G, x, y, angle) {
  const parked = G.cars.find((c) => c.parked && !c.dead);
  const car = parked || makeCar(x, y, angle, { name: 'Comet', color: '#3f7fc9', top: 380, accel: 300, grip: 2.9 });
  if (!G.cars.includes(car)) G.cars.push(car);
  car.x = x; car.y = y; car.angle = angle;
  car.parked = false; car.traffic = false; car.speed = 0;
  G.player.inCar = true;
  G.player.car = car;
  G.player.carHealth = 100;
  G.player.x = x; G.player.y = y;
  return car;
}

function simulate(G, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (G.autopilot) G.autopilot(G, STEP);
    stepGame(G, STEP);
    // stepGame only advances the world on the play screen; the title scene
    // advances it directly so the traffic moves behind the title.
    if (G.screen === SCREEN_TITLE) stepWorld(G, STEP);
  }
}

/**
 * Set `G` to the named scene and install the autopilot that keeps it moving.
 * Returns the screen the game should draw.
 */
export function stageShot(name, G) {
  G.cash = 1250;
  G.player.health = 100;
  if (name === 'start') {
    G.screen = SCREEN_TITLE;
    G.camera.x = G.player.x - G.canvasW / 2;
    G.camera.y = G.player.y - G.canvasH / 2;
    simulate(G, 6);
    return SCREEN_TITLE;
  }

  G.screen = SCREEN_PLAY;
  startMission(G.missions, name === 'mission' ? 1 : name === 'chase' ? 2 : 0);

  if (name === 'drive') {
    putPlayerInCar(G, 600, 2200, -Math.PI / 2);
    // The car is already obtained: the mission's steal step is behind us.
    G.missions.step = 1;
    G.autopilot = (g) => driveToward(g, PLACES.garage.x, PLACES.garage.y);
    simulate(G, 6);
    return SCREEN_PLAY;
  }

  if (name === 'chase') {
    putPlayerInCar(G, 1800, 2200, Math.PI);
    G.missions.step = 1; // past the tip-off: the chase is already on
    G.police.wanted = 3;
    G.police.heat = 0;
    G.autopilot = (g) => driveToward(g, PLACES.airfield.x, PLACES.airfield.y);
    simulate(G, 9);
    return SCREEN_PLAY;
  }

  // mission: on foot at the docks, crate marker ahead, a patrol car passing.
  G.player.inCar = false;
  G.player.car = null;
  G.player.x = PLACES.docks.x - 900;
  G.player.y = PLACES.docks.y + 40;
  G.player.angle = 0;
  G.missions.step = 1; // the collect step: walk into the marker
  G.police.wanted = 1;
  G.autopilot = (g) => walkToward(g, PLACES.docks.x, PLACES.docks.y);
  simulate(G, 1.5);
  return SCREEN_PLAY;
}
