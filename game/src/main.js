// Palmera Bay — the game itself: state, the loop, the player on foot and in a car,
// entering and stealing cars, health, busts, saves, and the screen state machine.
import { WORLD_W, WORLD_H, PLAYER_SPAWN, STEP, MISSIONS, PLACES } from './config.js';
import { makeRng, clamp, dist, angleDiff } from './random.js';
import { generateCity, collideBuildings, isOnRoad } from './world.js';
import { createInput, isDown, wasPressed, endFrame } from './input.js';
import { makeCar, spawnTraffic, driveCar, stepTraffic } from './vehicles.js';
import { spawnPedestrians, stepPedestrians } from './pedestrians.js';
import { createPolice, commitCrime, stepPolice } from './police.js';
import { createMissions, startMission, stepMissions, startFare } from './missions.js';
import { createCombat, shoot, punch, stepBullets } from './combat.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { drawHUD } from './hud.js';
import {
  createCamera, updateCamera, render,
  drawTitle, drawPause, drawBusted, drawWasted,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_BUSTED, SCREEN_WASTED,
} from './render.js';

const SAVE_KEY = 'palmera-bay-save-v1';

export function createGame(canvas, opts = {}) {
  const seed = opts.seed ?? 20261117;
  const rng = makeRng(seed);
  const city = generateCity(seed);
  const G = {
    rng,
    city,
    time: 0,
    screen: SCREEN_TITLE,
    camera: createCamera(),
    input: createInput(canvas),
    audio: createAudio(),
    police: createPolice(),
    missions: createMissions(),
    combat: createCombat(),
    cars: [],
    peds: [],
    particles: [],
    danger: null,
    cash: 0,
    toast: null,
    save: null,
    canvasW: 1280,
    canvasH: 800,
    player: {
      x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y,
      angle: -Math.PI / 2, aimAngle: 0,
      health: 100, speed: 0, bob: 0,
      inCar: false, car: null, carHealth: 100,
    },
    shotMode: opts.shot ?? null,
  };

  G.cars = spawnTraffic(rng, city, 16);
  G.peds = spawnPedestrians(rng, 26);
  // A car parked on the road just south of the spawn so the first mission is fair.
  const starterCar = makeCar(PLAYER_SPAWN.x, PLAYER_SPAWN.y + 80, Math.PI / 2, { name: 'Pinto', color: '#c94f43', top: 330, accel: 260, grip: 2.6 }, { parked: true });
  G.cars.push(starterCar);
  G.camera.x = PLAYER_SPAWN.x - canvas.width / 2;
  G.camera.y = PLAYER_SPAWN.y - canvas.height / 2;

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) G.save = JSON.parse(raw);
  } catch { G.save = null; }

  G.saveGame = function saveGame() {
    const P = G.player;
    const data = {
      cash: G.cash,
      missionIndex: G.missions.index,
      done: G.missions.done,
      x: P.x, y: P.y, health: P.health,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
    G.save = data;
  };

  G.loadSave = function loadSave() {
    const s = G.save;
    if (!s) return;
    G.cash = s.cash ?? 0;
    G.missions.done = s.done ?? [];
    G.missions.index = Math.min(s.missionIndex ?? 0, MISSIONS.length - 1);
    G.player.x = s.x ?? PLAYER_SPAWN.x;
    G.player.y = s.y ?? PLAYER_SPAWN.y;
    G.player.health = s.health ?? 100;
    if (G.missions.index < MISSIONS.length) startMission(G.missions, G.missions.index);
    G.toast = { text: 'Save loaded — welcome back to Palmera Bay', t: 4 };
  };

  G.showToast = function showToast(text) {
    G.toast = { text, t: 3.5 };
  };

  G.busted = function busted() {
    G.cash = Math.max(0, G.cash - 200);
    G.police.wanted = 0;
    G.police.cars.forEach((c) => { c.dead = true; });
    G.police.bustProgress = 0;
    if (G.player.inCar) G.player.car = null;
    G.player.inCar = false;
    G.player.x = PLACES.station.x;
    G.player.y = PLACES.station.y + 80;
    G.player.health = 100;
    G.screen = SCREEN_BUSTED;
    G.audio.fail();
    G.saveGame();
  };

  G.wasted = function wasted() {
    G.cash = Math.max(0, G.cash - 150);
    G.police.wanted = 0;
    G.police.cars.forEach((c) => { c.dead = true; });
    if (G.player.inCar) G.player.car = null;
    G.player.inCar = false;
    G.player.x = PLACES.hospital.x;
    G.player.y = PLACES.hospital.y + 80;
    G.player.health = 100;
    G.screen = SCREEN_WASTED;
    G.audio.fail();
    G.saveGame();
  };

  return G;
}

function nearestCar(G, maxDist) {
  const P = G.player;
  let best = null, bestD = maxDist;
  for (const car of G.cars) {
    if (car.dead || car.cop) continue;
    const d = dist(P.x, P.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(G, car) {
  const P = G.player;
  P.inCar = true;
  P.car = car;
  P.carHealth = 100;
  car.traffic = false;
  if (car.parked) {
    car.parked = false;
    commitCrime(G.police, 1, 'Grand theft auto');
    G.showToast('Car stolen! The PD is on its way — +1 ★');
    G.audio.sirenBlip();
  } else {
    G.showToast(`${car.model.name} — yours now. Drive!`);
  }
  G.audio.blip();
}

function exitCar(G) {
  const P = G.player;
  const car = P.car;
  P.inCar = false;
  P.car = null;
  if (!car) return;
  const side = Math.cos(car.angle + Math.PI / 2);
  const sideY = Math.sin(car.angle + Math.PI / 2);
  P.x = car.x + side * 30;
  P.y = car.y + sideY * 30;
  P.angle = car.angle;
  car.speed = 0;
}

function stepPlayerOnFoot(G, dt) {
  const P = G.player;
  const input = G.input;
  let mx = 0, my = 0;
  if (isDown(input, 'w', 'ArrowUp')) my -= 1;
  if (isDown(input, 's', 'ArrowDown')) my += 1;
  if (isDown(input, 'a', 'ArrowLeft')) mx -= 1;
  if (isDown(input, 'd', 'ArrowRight')) mx += 1;
  const sprint = isDown(input, 'Shift');
  const speed = sprint ? 265 : 170;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len; my /= len;
    P.angle = Math.atan2(my, mx);
    const pos = { x: P.x + mx * speed * dt, y: P.y + my * speed * dt };
    pos.x = clamp(pos.x, 24, WORLD_W - 24);
    pos.y = clamp(pos.y, 24, WORLD_H - 24);
    collideBuildings(G.city, pos, 11);
    P.x = pos.x; P.y = pos.y;
    P.bob += dt * 11;
  }
  // Aim at the mouse.
  const wx = G.camera.x + input.mouseX;
  const wy = G.camera.y + input.mouseY;
  P.aimAngle = Math.atan2(wy - P.y, wx - P.x);
  if (input.mouseDown) shoot(G.combat, G);
  if (wasPressed(input, ' ')) punch(G.combat, G);
  if (wasPressed(input, 'e')) {
    const car = nearestCar(G, 56);
    if (car) enterCar(G, car);
  }
  // Run over by traffic: it hurts, but a car can only hit you once a second.
  for (const car of G.cars) {
    if (car.dead || car.parked) continue;
    if (Math.abs(car.speed) > 60 && dist(P.x, P.y, car.x, car.y) < 26 && G.time - (P.hurtAt ?? -10) > 1) {
      P.hurtAt = G.time;
      P.health -= 18;
      G.audio.thud();
    }
  }
  if (P.health <= 0) G.wasted();
}

function stepPlayerInCar(G, dt) {
  const P = G.player;
  const input = G.input;
  const car = P.car;
  const steer = (isDown(input, 'a', 'ArrowLeft') ? -1 : 0) + (isDown(input, 'd', 'ArrowRight') ? 1 : 0);
  const throttle = (isDown(input, 'w', 'ArrowUp') ? 1 : 0) + (isDown(input, 's', 'ArrowDown') ? -1 : 0);
  const handbrake = isDown(input, ' ');
  const beforeSpeed = car.speed;
  driveCar(car, dt, steer, throttle, handbrake, G.city);
  P.x = car.x; P.y = car.y;
  P.angle = car.angle;
  // Crash sparks and sound.
  if (car.crashed > 0.9 && Math.abs(beforeSpeed) > 160) {
    G.audio.crash();
    P.carHealth -= 6;
    for (let i = 0; i < 8; i += 1) {
      G.particles.push({
        x: car.x + Math.cos(car.angle) * 24, y: car.y + Math.sin(car.angle) * 24,
        vx: (G.rng() - 0.5) * 160, vy: (G.rng() - 0.5) * 160,
        life: 0.5, max: 0.5, color: '#ffd94a', size: 3, kind: 'dot',
      });
    }
  }
  // Skid smoke.
  if (car.skid > 0 && Math.random() < 0.5) {
    G.particles.push({
      x: car.x - Math.cos(car.angle) * 22, y: car.y - Math.sin(car.angle) * 22,
      vx: 0, vy: -12, life: 0.6, max: 0.6, color: '#9a9a9a', size: 5, kind: 'dot',
    });
  }
  // Running over a pedestrian: a crime, and it costs health of the conscience — and a star.
  for (const ped of G.peds) {
    if (ped.dead) continue;
    if (dist(P.x, P.y, ped.x, ped.y) < 24 && Math.abs(car.speed) > 80) {
      ped.dead = true;
      ped.hp = 0;
      commitCrime(G.police, 1, 'Hit and run');
      G.showToast('You hit a pedestrian! +1 ★');
      G.danger = { x: P.x, y: P.y };
      G.audio.thud();
    }
  }
  // The car is wrecked: it stops and the player is on foot again.
  if (P.carHealth <= 0) {
    G.showToast('Your car is wrecked!');
    car.dead = true;
    exitCar(G);
    P.health = Math.max(10, P.health - 10);
  }
  if (wasPressed(input, 'e')) exitCar(G);
}

export function stepWorld(G, dt) {
  const P = G.player;
  // Traffic and pedestrians.
  for (const car of G.cars) {
    if (car.dead || car === P.car) continue;
    stepTraffic(car, dt, G.rng, G.city, G.cars, P);
  }
  stepPedestrians(G.peds, dt, G.rng, G.city, G.danger);
  G.danger = null;
  // Police.
  stepPolice(G.police, dt, G.rng, G.city, P, G.cars, () => G.busted(), G.time);
  // Combat.
  stepBullets(G.combat, dt, G);
  // Missions.
  stepMissions(G.missions, dt, G);
  // Particles.
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  // Toast timer.
  if (G.toast) {
    G.toast.t -= dt;
    if (G.toast.t <= 0) G.toast = null;
  }
  // Passive health regen out of trouble.
  if (G.police.wanted === 0 && P.health < 100) P.health = Math.min(100, P.health + 2 * dt);
}

export function stepGame(G, dt) {
  G.time += dt;
  if (G.screen === SCREEN_PLAY) {
    const P = G.player;
    if (G.autopilot) G.autopilot(G, dt);
    if (P.inCar) stepPlayerInCar(G, dt);
    else stepPlayerOnFoot(G, dt);
    stepWorld(G, dt);
    // Taxi fare key.
    if (wasPressed(G.input, 't') && G.missions.index >= MISSIONS.length && !G.missions.fare) {
      startFare(G.missions, G);
    }
    // Pause.
    if (wasPressed(G.input, 'p') || wasPressed(G.input, 'Escape')) {
      G.screen = SCREEN_PAUSE;
      G.saveGame();
    }
    if (wasPressed(G.input, 'm')) G.audio.toggleMute();
    // Camera follows the player.
    updateCamera(G.camera, P.x, P.y, G.canvasW, G.canvasH, dt);
    // Audio follows the drive.
    const speed = P.inCar && P.car ? P.car.speed : 0;
    G.audio.frame(speed, G.police.wanted, dt);
  }
  endFrame(G.input);
}

export function drawGame(ctx, G, W, H) {
  G.canvasW = W; G.canvasH = H;
  if (G.screen === SCREEN_TITLE) drawTitle(ctx, G, W, H);
  else if (G.screen === SCREEN_PAUSE) drawPause(ctx, G, W, H);
  else if (G.screen === SCREEN_BUSTED) drawBusted(ctx, G, W, H);
  else if (G.screen === SCREEN_WASTED) drawWasted(ctx, G, W, H);
  else {
    render(ctx, G, W, H);
    drawHUD(ctx, G, W, H);
  }
}

// ---- Boot: wire the canvas, the loop and the title-screen keys. ----
export function boot(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  if (params.get('seed')) opts.seed = Number(params.get('seed')) || 20261117;
  const G = createGame(canvas, opts);
  let W = canvas.width, H = canvas.height;

  // Size the canvas first: the screenshot scenes simulate the world before the
  // first frame, and the camera needs real dimensions to follow the player.
  resize();
  window.addEventListener('resize', resize);

  // Screenshot mode: stage a deterministic scene (?shot=start|drive|chase|mission).
  const shot = params.get('shot');
  if (shot) {
    G.shotMode = shot;
    stageShot(shot, G);
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    G.canvasW = W; G.canvasH = H;
  }

  // Title / end-screen keys.
  window.addEventListener('keydown', (e) => {
    if (G.screen === SCREEN_TITLE && (e.key === 'Enter' || e.key === ' ')) {
      G.audio.unlock();
      if (G.save) G.loadSave();
      else startMission(G.missions, 0);
      G.screen = SCREEN_PLAY;
    } else if (G.screen === SCREEN_TITLE && (e.key === 'n' || e.key === 'N')) {
      G.audio.unlock();
      G.save = null;
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      G.cash = 0;
      startMission(G.missions, 0);
      G.screen = SCREEN_PLAY;
    } else if ((G.screen === SCREEN_BUSTED || G.screen === SCREEN_WASTED) && e.key === 'Enter') {
      G.screen = SCREEN_PLAY;
    } else if (G.screen === SCREEN_PAUSE && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
      G.screen = SCREEN_PLAY;
      // The same key press must not pause the game again on the next frame:
      // the loop also watches for 'p', so consume it here.
      G.input.pressed.clear();
    }
  });
  canvas.addEventListener('mousedown', () => G.audio.unlock());

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dtReal = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dtReal;
    while (acc >= STEP) {
      stepGame(G, STEP);
      acc -= STEP;
    }
    drawGame(ctx, G, W, H);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return G;
}
